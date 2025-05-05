#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ANSIBLE_DIR="${SCRIPT_DIR}/../ansible"

# Default values
INVENTORY="production"
VERBOSE=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -i|--inventory)
      INVENTORY="$2"
      shift 2
      ;;
    -v|--verbose)
      VERBOSE="-v"
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo "Bootstrap a Kubernetes cluster with MicroK8s and ArgoCD"
      echo ""
      echo "Options:"
      echo "  -i, --inventory INVENTORY  Specify the inventory file to use (default: production)"
      echo "  -v, --verbose              Enable verbose output"
      echo "  -h, --help                 Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

INVENTORY_FILE="${ANSIBLE_DIR}/inventory/${INVENTORY}.yml"

# Check if inventory file exists
if [ ! -f "${INVENTORY_FILE}" ]; then
  echo -e "${RED}Error: Inventory file ${INVENTORY_FILE} not found${NC}"
  exit 1
fi

echo -e "${BLUE}=== Starting cluster bootstrap process ===${NC}"
echo -e "${BLUE}Using inventory: ${INVENTORY_FILE}${NC}"

# Step 1: Prepare nodes
echo -e "${GREEN}Step 1: Preparing nodes...${NC}"
ansible-playbook ${VERBOSE} -i "${INVENTORY_FILE}" "${ANSIBLE_DIR}/playbooks/prepare-nodes.yml"

# Step 2: Deploy MicroK8s
echo -e "${GREEN}Step 2: Deploying MicroK8s...${NC}"
ansible-playbook ${VERBOSE} -i "${INVENTORY_FILE}" "${ANSIBLE_DIR}/playbooks/deploy-microk8s.yml"

# Step 3: Bootstrap ArgoCD
echo -e "${GREEN}Step 3: Bootstrapping ArgoCD...${NC}"
ansible-playbook ${VERBOSE} -i "${INVENTORY_FILE}" "${ANSIBLE_DIR}/playbooks/bootstrap-argocd.yml"

echo -e "${GREEN}=== Cluster bootstrap completed successfully ===${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Apply the root application manifest to start GitOps"
echo -e "2. Set up DNS for ArgoCD UI"
echo -e "3. Configure NGINX Ingress and cert-manager through ArgoCD"

exit 0
