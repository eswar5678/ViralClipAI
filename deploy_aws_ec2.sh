#!/usr/bin/env bash
# ==============================================================================
# ViralClip AI - Automated AWS EC2 One-Command Deployment Script
# Tested on Ubuntu 22.04 / 24.04 LTS (AWS Free Tier Eligible)
# ==============================================================================

set -e

echo "===================================================================="
echo "  🚀 Starting ViralClip AI Automated AWS EC2 Setup & Deployment"
echo "===================================================================="

# 1. Update OS packages & Install Docker (Detects Amazon Linux, Ubuntu, Debian, CentOS)
echo "[1/5] Detecting Linux distribution and installing packages..."
if command -v dnf &> /dev/null; then
    echo "Detected Amazon Linux / RHEL (dnf)..."
    sudo dnf update -y
    sudo dnf install -y docker git curl
elif command -v yum &> /dev/null; then
    echo "Detected Amazon Linux / CentOS (yum)..."
    sudo yum update -y
    sudo yum install -y docker git curl
elif command -v apt-get &> /dev/null; then
    echo "Detected Ubuntu / Debian (apt)..."
    sudo apt-get update -y
    sudo apt-get install -y docker.io git curl
else
    echo "⚠️ Unknown package manager. Attempting to proceed..."
fi

sudo systemctl enable --now docker
sudo usermod -aG docker "$USER" || true

# 2. Configure 4GB Swap Space (Crucial for EC2 Free Tier t2.micro/t3.micro)
# Without swap, FFmpeg rendering will trigger the Linux OOM Killer on 1GB RAM.
if [ ! -f /swapfile ]; then
    echo "[2/5] Configuring 4GB Swap Space for smooth FFmpeg video rendering..."
    sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✅ 4GB Swap memory enabled successfully."
else
    echo "[2/5] Swap space already exists. Skipping."
fi

# 3. Prepare directories
echo "[3/5] Creating persistent data directories..."
mkdir -p backend/data/uploads backend/data/clips backend/data/temp

# 4. Build Docker Image
echo "[4/5] Building ViralClip AI Docker container (Frontend + Backend + FFmpeg)..."
sudo docker build -t viralclip-ai .

# 5. Stop any existing container and run new one on Port 80
echo "[5/5] Launching ViralClip AI container on Port 80 (HTTP)..."
sudo docker stop viralclip 2>/dev/null || true
sudo docker rm viralclip 2>/dev/null || true

# Prompt for Gemini API Key if not set
GEMINI_KEY="${GEMINI_API_KEY:-}"
if [ -z "$GEMINI_KEY" ]; then
    read -rp "👉 Enter your Gemini API Key (or press Enter to skip and set in UI later): " user_key
    GEMINI_KEY="$user_key"
fi

sudo docker run -d \
  --name viralclip \
  --restart always \
  -p 80:8000 \
  -v "$(pwd)/backend/data:/app/backend/data" \
  -e GEMINI_API_KEY="$GEMINI_KEY" \
  -e PORT=8000 \
  -e HOST=0.0.0.0 \
  viralclip-ai

PUBLIC_IP=$(curl -s https://ifconfig.me || curl -s http://checkip.amazonaws.com || echo "<YOUR-EC2-PUBLIC-IP>")

echo ""
echo "===================================================================="
echo "  🎉 DEPLOYMENT COMPLETE! VIRALCLIP AI IS LIVE ON AWS!"
echo "===================================================================="
echo ""
echo "👉 Open in your web browser:"
echo "   http://${PUBLIC_IP}"
echo ""
echo "💡 Tip: Make sure your EC2 Security Group allows Inbound HTTP (Port 80)!"
echo "===================================================================="
