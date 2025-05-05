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
      echo "Complete reset of all nodes and Ansible state"
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

echo -e "${BLUE}=== Starting complete reset process ===${NC}"
echo -e "${BLUE}Using inventory: ${INVENTORY_FILE}${NC}"
echo -e "${RED}WARNING: This will completely reset all nodes and remove MicroK8s!${NC}"
echo -e "${RED}This is a destructive operation and cannot be undone!${NC}"
echo -e "${RED}Are you absolutely sure you want to continue? (y/n)${NC}"
read -p "" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${GREEN}Reset aborted.${NC}"
  exit 0
fi

# Clear Ansible fact cache
echo -e "${GREEN}Clearing Ansible fact cache...${NC}"
mkdir -p ~/.ansible/facts
rm -rf ~/.ansible/facts/*

# Run the reset playbook
echo -e "${GREEN}Running full reset playbook...${NC}"
ansible-playbook ${VERBOSE} -i "${INVENTORY_FILE}" "${ANSIBLE_DIR}/playbooks/full-reset.yml" --ask-become-pass

echo -e "${GREEN}=== Complete reset completed ===${NC}"
echo -e "${YELLOW}All nodes have been completely reset to a clean state.${NC}"
echo -e "${YELLOW}You can now start the bootstrap process from the beginning.${NC}"

exit 0