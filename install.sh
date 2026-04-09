#!/bin/bash
set -e

ORG_NAME="System-B15"

echo -e "\033[1;36m=========================================\033[0m"
echo -e "\033[1;36m      Madash Linux Bootstrapper          \033[0m"
echo -e "\033[1;36m=========================================\033[0m"

# 1. Validate Prerequisites
if ! command -v docker &> /dev/null; then
    echo -e "\033[1;31m[ERROR] Docker is not installed.\033[0m"
    exit 1
fi

if ! command -v python3 &> /dev/null || ! command -v pip3 &> /dev/null; then
    echo -e "\033[1;31m[ERROR] python3 and pip3 are required to run the setup wizard.\033[0m"
    exit 1
fi

# 2. Environment Configuration (setup.py)
if [ ! -f ".env" ]; then
    echo -e "\n\033[1;33m[WAIT] Initializing environment configuration wizard...\033[0m"
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt --quiet
    python3 setup.py
    deactivate
    echo -e "\033[1;32m[OK] Environment configured.\033[0m"
else
    echo -e "\n\033[1;32m[OK] Existing .env found. Skipping configuration wizard.\033[0m"
fi

# 3. Image Resolution (Offline vs Online)
echo -e "\n\033[1;33m[WAIT] Resolving Docker images...\033[0m"
if ls images/*.tar 1> /dev/null 2>&1; then
    echo -e "\033[1;34m>> Offline bundle detected. Loading local image archives...\033[0m"
    for img in images/*.tar; do
        echo "   Loading $img..."
        docker load -i "$img"
    done
else
    echo -e "\033[1;34m>> No local images found. Pulling latest from GHCR...\033[0m"
    docker compose pull
fi

# 4. Boot Application
echo -e "\n\033[1;33m[WAIT] Starting Madash services...\033[0m"
docker compose up -d

echo -e "\n\033[1;32m=========================================\033[0m"
echo -e "\033[1;32m 🎉 Madash Installation Complete! 🎉 \033[0m"
echo -e "\033[1;32m=========================================\033[0m"
echo -e "Access the application at: http://localhost"
echo -e "To stop the system, run: docker compose down"