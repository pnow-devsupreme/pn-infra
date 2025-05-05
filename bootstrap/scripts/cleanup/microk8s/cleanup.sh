#!/bin/bash

# Microk8s Complete Cleanup Script
# Run this script with sudo for complete cleanup

set -e  # Exit on error

# ANSI color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Microk8s cleanup process...${NC}"

# Function to check if we're running with sudo
check_sudo() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}Please run this script with sudo privileges.${NC}"
        exit 1
    fi
}

# Function to safely remove directories/files
safe_remove() {
    if [ -e "$1" ]; then
        echo -e "${YELLOW}Removing $1${NC}"
        rm -rf "$1"
    fi
}

# Function to remove snap-related Microk8s remnants
remove_snap_microk8s() {
    echo -e "${YELLOW}Removing any remaining snap microk8s packages...${NC}"
    snap remove --purge microk8s 2>/dev/null || true
    
    # Remove snap data directories
    safe_remove "/var/snap/microk8s"
    safe_remove "/snap/microk8s"
    
    # Remove cached archives
    safe_remove "/var/lib/snapd/cache/microk8s"
}

# Function to clean up systemd and services
cleanup_systemd() {
    echo -e "${YELLOW}Cleaning up systemd services...${NC}"
    systemctl stop snap.microk8s.daemon-containerd 2>/dev/null || true
    systemctl stop snap.microk8s.daemon-kubelet 2>/dev/null || true
    systemctl stop snap.microk8s.daemon-apiserver 2>/dev/null || true
    systemctl stop snap.microk8s.daemon-scheduler 2>/dev/null || true
    systemctl stop snap.microk8s.daemon-controller-manager 2>/dev/null || true
    systemctl stop snap.microk8s.daemon-proxy 2>/dev/null || true
    systemctl stop snap.microk8s.daemon-etcd 2>/dev/null || true
    
    # Disable services
    systemctl disable snap.microk8s.daemon-containerd 2>/dev/null || true
    systemctl disable snap.microk8s.daemon-kubelet 2>/dev/null || true
    systemctl disable snap.microk8s.daemon-apiserver 2>/dev/null || true
    systemctl disable snap.microk8s.daemon-scheduler 2>/dev/null || true
    systemctl disable snap.microk8s.daemon-controller-manager 2>/dev/null || true
    systemctl disable snap.microk8s.daemon-proxy 2>/dev/null || true
    systemctl disable snap.microk8s.daemon-etcd 2>/dev/null || true
    
    # Remove systemd service files
    rm -f /etc/systemd/system/snap.microk8s.* 2>/dev/null || true
    
    # Reload systemd daemon
    systemctl daemon-reload
}

# Function to clean up network interfaces and configurations
# Function to clean up network interfaces and configurations
cleanup_network() {
    echo -e "${YELLOW}Cleaning up network interfaces and configurations...${NC}"
    
    # Remove CNI interfaces
    if ip link show cni0 &>/dev/null; then
        ip link delete cni0
    fi
    
    if ip link show flannel.1 &>/dev/null; then
        ip link delete flannel.1
    fi
    
    if ip link show calico1 &>/dev/null; then
        ip link delete calico1
    fi
    
    # Clean up iptables rules
    echo -e "${YELLOW}Cleaning up iptables rules...${NC}"
    iptables -F -t nat 2>/dev/null || true
    iptables -X -t nat 2>/dev/null || true
    iptables -F -t mangle 2>/dev/null || true
    iptables -X -t mangle 2>/dev/null || true
    iptables -F 2>/dev/null || true
    iptables -X 2>/dev/null || true
    
    # Restore basic iptables rules for essential connectivity
    echo -e "${YELLOW}Restoring basic connectivity rules...${NC}"
    # Set default policies
    iptables -P INPUT ACCEPT
    iptables -P FORWARD ACCEPT
    iptables -P OUTPUT ACCEPT
    
    # Allow established connections
    iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
    
    # Allow loopback
    iptables -A INPUT -i lo -j ACCEPT
    
    # Allow SSH (port 22)
    iptables -A INPUT -p tcp --dport 22 -j ACCEPT
    
    # Allow HTTP (port 80)
    iptables -A INPUT -p tcp --dport 80 -j ACCEPT
    
    # Allow HTTPS (port 443)
    iptables -A INPUT -p tcp --dport 443 -j ACCEPT
    
    # Allow ICMP (ping)
    iptables -A INPUT -p icmp -j ACCEPT
    
    # Set a reasonable default policy
    # Comment out if you want totally open access
    # iptables -P INPUT DROP
    
    echo -e "${GREEN}Basic network connectivity restored.${NC}"
}

# Clean up user configuration
cleanup_user_config() {
    echo -e "${YELLOW}Cleaning up user configuration...${NC}"
    safe_remove "$HOME/.kube"
    safe_remove "$HOME/.microk8s"
    safe_remove "/home/$SUDO_USER/.kube" 2>/dev/null || true
    safe_remove "/home/$SUDO_USER/.microk8s" 2>/dev/null || true
}

# Clean up remaining directories and files
cleanup_remaining_files() {
    echo -e "${YELLOW}Cleaning up remaining directories and files...${NC}"
    
    # MicroK8s specific directories
    safe_remove "/var/lib/microk8s"
    safe_remove "/var/lib/containerd"
    safe_remove "/var/lib/calico"
    safe_remove "/var/lib/rook"
    safe_remove "/var/lib/etcd"
    safe_remove "/var/run/calico"
    safe_remove "/var/run/flannel"
    safe_remove "/etc/cni"
    safe_remove "/etc/calico"
    safe_remove "/etc/microk8s"
    safe_remove "/opt/cni/bin"
    
    # Remove any remaining CNI configuration
    safe_remove "/etc/cni/net.d"
}

# Clean up Docker remnants if any
cleanup_docker_remnants() {
    echo -e "${YELLOW}Cleaning up Docker remnants if any...${NC}"
    
    # If Docker is installed, try to remove Microk8s related containers and images
    if command -v docker &>/dev/null; then
        echo -e "${YELLOW}Docker found, attempting to clean up Microk8s containers...${NC}"
        docker ps -a | grep -i "k8s" | awk '{print $1}' | xargs -r docker rm -f
        docker images | grep -i "k8s" | awk '{print $3}' | xargs -r docker rmi -f
    fi
    
    # Clean up containerd data
    safe_remove "/var/lib/containerd"
}

# Check that we're running as sudo
check_sudo

# Main cleanup process
echo -e "${YELLOW}Starting comprehensive Microk8s cleanup...${NC}"

# Execute cleanup functions
remove_snap_microk8s
cleanup_systemd
cleanup_network
cleanup_user_config
cleanup_remaining_files
cleanup_docker_remnants

echo -e "${GREEN}Microk8s cleanup completed successfully!${NC}"
echo -e "${YELLOW}You may want to reboot your system to ensure all changes take effect.${NC}"

# Suggest reboot
read -p "Would you like to reboot now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}System will reboot in 10 seconds.${NC}"
    echo -e "${YELLOW}Press Ctrl+C to cancel the reboot.${NC}"
    
    # Countdown timer with ability to cancel
    for i in {10..1}; do
        echo -ne "${YELLOW}Rebooting in $i seconds...\r${NC}"
        sleep 1
    done
    
    echo -e "\n${YELLOW}Rebooting now!${NC}"
    reboot
fi