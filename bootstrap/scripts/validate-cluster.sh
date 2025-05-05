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
MASTER_HOST=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -i|--inventory)
      INVENTORY="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo "Validate the Kubernetes cluster setup"
      echo ""
      echo "Options:"
      echo "  -i, --inventory INVENTORY  Specify the inventory file to use (default: production)"
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

# Get the first master node from inventory
MASTER_HOST=$(grep -A1 "masters:" "${INVENTORY_FILE}" | grep -oP '(?<=\s{8})[^:]+(?=:)' | head -1)

if [ -z "${MASTER_HOST}" ]; then
  echo -e "${RED}Error: Could not find master node in inventory${NC}"
  exit 1
fi

echo -e "${BLUE}=== Starting cluster validation ===${NC}"
echo -e "${BLUE}Using inventory: ${INVENTORY_FILE}${NC}"
echo -e "${BLUE}Master node: ${MASTER_HOST}${NC}"

# Step 1: Check node status
echo -e "${GREEN}Step 1: Checking node status...${NC}"
ansible ${MASTER_HOST} -i "${INVENTORY_FILE}" -m shell -a "microk8s kubectl get nodes -o wide"

# Step 2: Check pod status
echo -e "${GREEN}Step 2: Checking pod status...${NC}"
ansible ${MASTER_HOST} -i "${INVENTORY_FILE}" -m shell -a "microk8s kubectl get pods -A"

# Step 3: Check MetalLB status
echo -e "${GREEN}Step 3: Checking MetalLB status...${NC}"
ansible ${MASTER_HOST} -i "${INVENTORY_FILE}" -m shell -a "microk8s kubectl get pods -n metallb-system"

# Step 4: Check ArgoCD status
echo -e "${GREEN}Step 4: Checking ArgoCD status...${NC}"
ansible ${MASTER_HOST} -i "${INVENTORY_FILE}" -m shell -a "microk8s kubectl get pods -n argocd"

# Step 5: Get ArgoCD LoadBalancer IP
echo -e "${GREEN}Step 5: Checking ArgoCD service...${NC}"
ansible ${MASTER_HOST} -i "${INVENTORY_FILE}" -m shell -a "microk8s kubectl get svc argocd-server -n argocd"

echo -e "${GREEN}=== Cluster validation completed ===${NC}"
exit 0
