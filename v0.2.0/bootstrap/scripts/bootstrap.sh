#!/usr/bin/env bash

# Production Kubernetes Bootstrap
# One script to rule them all - beautifully simple, brilliantly works

# Safer prologue
set -Eeuo pipefail

# Debug if requested
if [[ "${DEBUG:-}" == "true" ]]; then set -x; fi

# ============================================================================
# CONFIGURATION
# ============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
readonly KUBESPRAY_DIR="${SCRIPT_DIR}/../kubespray"
readonly ANSIBLE_DIR="${SCRIPT_DIR}/../ansible"

# Default configuration - can be overridden by command line args
INVENTORY="${INVENTORY:-production}"
LOG_DIR="${LOG_DIR:-${SCRIPT_DIR}/logs}"
CONFIG_FILE="${CONFIG_FILE:-}"
ANSIBLE_OPTS="${ANSIBLE_OPTS:-}"
VERBOSE=""
DEBUG="${DEBUG:-false}"

# LOG_FILE will be set after parsing arguments

# Colors
readonly RED='\033[0;31m' GREEN='\033[0;32m' YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m' CYAN='\033[0;36m' NC='\033[0m'

# ============================================================================
# UTILITIES
# ============================================================================

fail() {
    printf "${RED}[ERROR]${NC} %s\n" "$1" >&2
    [[ -f "$LOG_FILE" ]] && echo "[$(date -u '+%Y-%m-%d %H:%M:%S')] [ERROR]: $1" >>"$LOG_FILE"
    exit "${2:-1}"
}

# SSH connection helper function
# Usage: ssh_run_command <host> <command>
ssh_run_command() {
    local host="$1"
    local command="$2"
    local inventory_path="$ANSIBLE_DIR/inventory/${INVENTORY}.yml"

    # Extract SSH credentials from Ansible inventory
    local ssh_user ssh_key ssh_pass
    ssh_user=$(python3 -c "
import yaml
with open('$inventory_path', 'r') as f:
    inventory = yaml.safe_load(f)
print(inventory.get('all', {}).get('vars', {}).get('ansible_user', 'root'))
" 2>/dev/null)

    ssh_key=$(python3 -c "
import yaml
with open('$inventory_path', 'r') as f:
    inventory = yaml.safe_load(f)
key_file = inventory.get('all', {}).get('vars', {}).get('ansible_ssh_private_key_file', '')
print(key_file)
" 2>/dev/null)

    # Build SSH command with proper options
    local ssh_opts="-o ConnectTimeout=10 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR"

    if [[ -n "$ssh_key" && -f "$ssh_key" ]]; then
        ssh_opts="$ssh_opts -i $ssh_key"
    fi

    # Execute SSH command
    if [[ -n "$ssh_user" ]]; then
        ssh $ssh_opts "${ssh_user}@${host}" "$command"
    else
        ssh $ssh_opts "$host" "$command"
    fi
}

# Get master host from inventory
get_master_host() {
    local inventory_path="$ANSIBLE_DIR/inventory/${INVENTORY}.yml"

    # Debug: Check if file exists
    if [[ ! -f "$inventory_path" ]]; then
        echo "ERROR: Inventory file not found: $inventory_path" >&2
        return 1
    fi

    python3 -c "
import yaml
import sys
try:
    with open('$inventory_path', 'r') as f:
        inventory = yaml.safe_load(f)

    masters = inventory.get('all', {}).get('children', {}).get('masters', {}).get('hosts', {})
    if masters:
        # Get the first master and its ansible_host if available
        master_name = list(masters.keys())[0]
        master_config = masters[master_name]
        if isinstance(master_config, dict) and 'ansible_host' in master_config:
            print(master_config['ansible_host'])
        else:
            print(master_name)
    else:
        print('ERROR: No masters found in inventory', file=sys.stderr)
        sys.exit(1)
except Exception as e:
    print(f'ERROR: Failed to parse inventory: {e}', file=sys.stderr)
    sys.exit(1)
" 2>/dev/null
}

log() {
    local level="${1^^}" msg="$2"
    local timestamp="$(date -u '+%Y-%m-%d %H:%M:%S')"

    declare -A colors=([ERROR]="$RED" [WARN]="$YELLOW" [INFO]="$BLUE" [SUCCESS]="$GREEN")

    printf "${CYAN}%s${NC} ${colors[$level]:-}[%s]${NC} %s\n" "$timestamp" "$level" "$msg"

    # Ensure log directory exists
    mkdir -p "$(dirname "$LOG_FILE")"
    echo "[$timestamp] [$level]: $msg" >>"$LOG_FILE"
}

separator() {
    local line="=================================================================="
    printf "${CYAN}%s${NC}\n" "$line"
    echo "$line" >>"$LOG_FILE"
}

check_tools() {
    log info "Checking prerequisites..."
    local missing=()

    for tool in ansible-playbook kubectl helm; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            missing+=("$tool")
        else
            log success "$tool found"
        fi
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        fail "Missing tools: ${missing[*]}"
    fi
}

run_playbook() {
    local playbook="$1" description="$2"
    local playbook_path="$ANSIBLE_DIR/playbooks/$playbook"
    local inventory_path="$ANSIBLE_DIR/inventory/${INVENTORY}.yml"

    log info "Running: $description"

    [[ ! -f "$playbook_path" ]] && fail "Playbook not found: $playbook_path"
    [[ ! -f "$inventory_path" ]] && fail "Inventory not found: $inventory_path"

    # Build ansible command with options
    local ansible_cmd="ansible-playbook -i \"$inventory_path\""
    [[ -n "$VERBOSE" ]] && ansible_cmd="$ansible_cmd $VERBOSE"
    [[ -n "$ANSIBLE_OPTS" ]] && ansible_cmd="$ansible_cmd $ANSIBLE_OPTS"
    [[ -n "$CONFIG_FILE" ]] && ansible_cmd="$ansible_cmd --extra-vars @\"$CONFIG_FILE\""
    ansible_cmd="$ansible_cmd \"$playbook_path\""

    log info "Command: $ansible_cmd"

    if ! eval "$ansible_cmd" 2>&1 | tee -a "$LOG_FILE"; then
        fail "Playbook failed: $playbook"
    fi

    log success "Completed: $description"
}

wait_for_cluster() {
    log info "Waiting for Kubernetes API to be accessible..."

    local max_attempts=20 attempt=1

    # Get master host using helper function
    local master_host
    master_host=$(get_master_host)

    if [[ -z "$master_host" ]]; then
        fail "Could not find master host in inventory"
    fi

    log info "Checking Kubernetes API accessibility on master node: $master_host"

    while [[ $attempt -le $max_attempts ]]; do
        # Only check if Kubernetes API is accessible - don't care about node readiness yet
        if ssh_run_command "$master_host" "kubectl get nodes >/dev/null 2>&1"; then
            # Get total node count to verify cluster is functional
            local total_nodes
            total_nodes=$(ssh_run_command "$master_host" "
                kubectl get nodes --no-headers 2>/dev/null | wc -l || echo '0'
            " 2>/dev/null)

            if [[ -n "$total_nodes" && "$total_nodes" -gt 0 ]]; then
                log success "Kubernetes API accessible on $master_host: $total_nodes nodes detected"
                log info "Note: Nodes may be NotReady - this is expected before CNI deployment"
                return 0
            else
                log info "API accessible but no nodes detected (attempt $attempt/$max_attempts)"
            fi
        else
            log info "Kubernetes API not accessible yet on $master_host (attempt $attempt/$max_attempts)"
        fi

        sleep 15
        ((attempt++))
    done

    fail "Kubernetes API failed to become accessible on master node: $master_host"
}

reset_cluster() {
    log warn "Performing deep reset..."
    separator

    # Reset Kubespray
    if [[ -f "$KUBESPRAY_DIR/reset.yml" ]]; then
        log info "Running Kubespray reset..."
        cd "$KUBESPRAY_DIR"
        # Build reset command with options
        local reset_cmd="ansible-playbook -i \"inventory/$INVENTORY/inventory.ini\" reset.yml --become --become-user=root"
        [[ -n "$VERBOSE" ]] && reset_cmd="$reset_cmd $VERBOSE"
        [[ -n "$ANSIBLE_OPTS" ]] && reset_cmd="$reset_cmd $ANSIBLE_OPTS"

        if eval "$reset_cmd"; then
            log success "Kubespray reset completed"
        else
            log warn "Kubespray reset had issues (this is often normal)"
        fi
    fi

    # Clean up local kubeconfig
    [[ -f "$HOME/.kube/config" ]] && {
        log info "Backing up and removing kubeconfig..."
        mv "$HOME/.kube/config" "$HOME/.kube/config.backup.$(date +%s)" 2>/dev/null || true
    }

    log success "Deep reset completed"
    exit 0
}

# ============================================================================
# MAIN PHASES
# ============================================================================

phase_1_deploy_cluster() {
    log info "🚀 PHASE 1: Deploying Kubernetes cluster"
    separator

    cd "$KUBESPRAY_DIR"
    local inventory_file="inventory/$INVENTORY/inventory.ini"

    [[ ! -f "$inventory_file" ]] && fail "Inventory not found: $inventory_file"

    log info "Running Kubespray cluster deployment..."

    # Build kubespray command with options
    local kubespray_cmd="ansible-playbook -i \"$inventory_file\" cluster.yml --become --become-user=root"
    [[ -n "$VERBOSE" ]] && kubespray_cmd="$kubespray_cmd $VERBOSE"
    [[ -n "$ANSIBLE_OPTS" ]] && kubespray_cmd="$kubespray_cmd $ANSIBLE_OPTS"
    [[ -n "$CONFIG_FILE" ]] && kubespray_cmd="$kubespray_cmd --extra-vars @\"$CONFIG_FILE\""

    log info "Command: $kubespray_cmd"

    if ! eval "$kubespray_cmd" 2>&1 | tee -a "$LOG_FILE"; then
        fail "Kubespray cluster deployment failed"
    fi

    log success "✅ Kubernetes cluster deployed"
}

phase_2_deploy_infrastructure() {
    log info "🏗️  PHASE 2: Deploying infrastructure"
    separator

    wait_for_cluster
    run_playbook "post-install-infrastructure.yml" "Critical infrastructure (CNI, Ingress, Cert-Manager, Storage, Vault)"

    log success "✅ Infrastructure deployed"
}

phase_3_deploy_argocd() {
    log info "🎯 PHASE 3: Deploying ArgoCD"
    separator

    run_playbook "bootstrap-argocd-production.yml" "ArgoCD with SSL and self-management"

    log success "✅ ArgoCD deployed"
}

phase_4_deploy_apps() {
    log info "📦 PHASE 4: Deploying infrastructure applications"
    separator

    run_playbook "deploy-infrastructure-apps.yml" "Infrastructure apps via GitOps with Helm charts"

    log success "✅ Infrastructure applications deployed"
}

show_access_info() {
    log info "🔗 ACCESS INFORMATION:"

    if kubectl get ingress argocd-server-ingress -n argocd >/dev/null 2>&1; then
        local host
        host=$(kubectl get ingress argocd-server-ingress -n argocd -o jsonpath='{.spec.rules[0].host}')
        log info "• ArgoCD: https://$host"
    else
        local ip
        ip=$(kubectl get nodes -o wide | grep control-plane | head -1 | awk '{print $6}')
        log info "• ArgoCD: http://$ip:30080"
    fi

    log info "• Username: admin"
    log info "• Password: kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d"
    separator
}

# ============================================================================
# MAIN
# ============================================================================

usage() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Deploy a production-grade Kubernetes cluster

OPTIONS:
    --reset                 Perform deep cluster reset
    -s, --start N          Start from phase N (1-4)
    -i, --inventory NAME   Use inventory NAME (default: pn-production)
    -v, --verbose          Enable verbose Ansible output
    -y, --yes              Skip confirmations
    -d, --debug            Enable debug mode
    -e, --extra-vars VARS  Pass extra variables to Ansible
    -c, --config FILE      Use config file for extra variables
    -l, --log-dir DIR      Log directory (default: ./logs)
    -h, --help             Show this help

PHASES:
    1. Deploy cluster      - Kubespray naked cluster
    2. Deploy infrastructure - CNI, Ingress, Cert-Manager, Storage, Vault
    3. Deploy ArgoCD      - Production ArgoCD with SSL
    4. Deploy applications - GitOps apps with sync waves

EXAMPLES:
    $(basename "$0")                           # Full deployment
    $(basename "$0") --reset                   # Deep reset
    $(basename "$0") -s 2                      # Start from infrastructure
    $(basename "$0") -i staging -v             # Use staging inventory with verbose
    $(basename "$0") -c config.yml -d          # Use config file with debug
    $(basename "$0") -e "cluster_name=prod"    # Pass extra variables

EOF
}

main() {
    local start_phase=1 skip_confirm=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
        --reset) reset_cluster ;;
        -s | --start)
            start_phase="$2"
            shift 2
            ;;
        -i | --inventory)
            INVENTORY="$2"
            shift 2
            ;;
        -v | --verbose)
            VERBOSE="-v"
            shift
            ;;
        -y | --yes)
            skip_confirm=true
            shift
            ;;
        -d | --debug)
            export DEBUG=true
            set -x
            shift
            ;;
        -e | --extra-vars)
            ANSIBLE_OPTS="$ANSIBLE_OPTS --extra-vars '$2'"
            shift 2
            ;;
        -c | --config)
            CONFIG_FILE="$2"
            shift 2
            ;;
        -l | --log-dir)
            LOG_DIR="$2"
            shift 2
            ;;
        -h | --help)
            usage
            exit 0
            ;;
        *) fail "Unknown option: $1. Use -h for help." ;;
        esac
    done

    # Validation
    [[ ! "$start_phase" =~ ^[1-4]$ ]] && fail "Invalid phase: $start_phase. Must be 1-4"
    [[ -n "$CONFIG_FILE" && ! -f "$CONFIG_FILE" ]] && fail "Config file not found: $CONFIG_FILE"

    # Set log file after LOG_DIR is finalized
    readonly LOG_FILE="${LOG_DIR}/bootstrap-$(date -u '+%Y%m%d_%H%M%S').log"

    # Create log directory
    mkdir -p "$LOG_DIR"

    # Initialize
    log info "🎯 Production Kubernetes Bootstrap"
    log info "Inventory: $INVENTORY"
    log info "Start phase: $start_phase"
    log info "Log directory: $LOG_DIR"
    log info "Log file: $LOG_FILE"
    [[ -n "$CONFIG_FILE" ]] && log info "Config file: $CONFIG_FILE"
    [[ -n "$VERBOSE" ]] && log info "Verbose mode: enabled"
    [[ "$DEBUG" == "true" ]] && log info "Debug mode: enabled"
    separator

    check_tools

    # Confirmation
    if [[ "$skip_confirm" != "true" ]]; then
        echo -n "Proceed with deployment? (y/N) "
        read -r reply
        [[ ! "$reply" =~ ^[Yy]$ ]] && {
            log info "Cancelled"
            exit 0
        }
    fi

    # Execute phases
    local start_time="$(date +%s)"

    [[ $start_phase -le 1 ]] && phase_1_deploy_cluster
    [[ $start_phase -le 2 ]] && phase_2_deploy_infrastructure
    [[ $start_phase -le 3 ]] && phase_3_deploy_argocd
    [[ $start_phase -le 4 ]] && phase_4_deploy_apps

    # Success
    local duration=$(($(date +%s) - start_time))

    separator
    log success "🎉 DEPLOYMENT COMPLETE!"
    log info "Duration: $((duration / 60))m $((duration % 60))s"
    separator

    show_access_info

    log info "📝 NEXT STEPS:"
    log info "1. Access ArgoCD and verify applications"
    log info "2. Initialize Vault: kubectl exec vault-0 -n vault -- vault operator init"
    log info "3. Deploy your applications via GitOps"
    separator

    log success "Your production cluster is ready! 🚀"
}

# Error handling
trap 'fail "Script failed at line $LINENO"' ERR

# Execute
main "$@"
