#!/bin/bash
set -e
echo "==== 1. Updating System & Installing Utilities ===="
apt update && apt install -y curl ufw htop

echo "==== 2. Installing Docker ===="
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
fi

echo "==== 3. Installing Docker Compose ===="
if ! command -v docker-compose &> /dev/null; then
    apt install -y docker-compose
fi

echo "==== 4. Setting up 4GB Swap ===="
if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
fi

echo "==== 5. Configuring Firewall ===="
ufw allow 22/tcp
ufw allow 4000/tcp
ufw allow 8001/tcp
echo "y" | ufw enable

echo "==== Setup Complete! ===="
