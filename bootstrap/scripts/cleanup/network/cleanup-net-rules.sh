#!/bin/bash
# Script to safely flush iptables and establish basic rules

# First, create a backup of current rules in case something goes wrong
BACKUP_DIR="/opt/firewall_backups/$(date +%Y-%m-%d-%H-%M-%S)"
mkdir -p $BACKUP_DIR
iptables-save > $BACKUP_DIR/iptables.rules.bak
ip6tables-save > $BACKUP_DIR/ip6tables.rules.bak
echo "Backup created at $BACKUP_DIR"

# For safety, this makes sure we don't get locked out by accepting SSH connections
# before making any changes
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Flush all existing rules and delete custom chains
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X
iptables -t raw -F
iptables -t raw -X

# Set default chain policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow loopback traffic
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Allow established and related connections
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow SSH (port 22)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTP (port 80)
iptables -A INPUT -p tcp --dport 80 -j ACCEPT

# Allow HTTPS (port 443)
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Optional: Allow ping (ICMP)
iptables -A INPUT -p icmp --icmp-type echo-request -j ACCEPT

# Save the new ruleset
iptables-save > /etc/iptables/rules.v4

echo "iptables rules have been flushed and basic rules restored."
echo "SSH (22), HTTP (80), and HTTPS (443) are now allowed."
