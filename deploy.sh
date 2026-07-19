#!/bin/bash
set -e

# ─── PumpBoard VPS Deploy Script ───
# Run as root on a fresh Ubuntu/Debian VPS
# Usage: bash deploy.sh

DOMAIN="api.pumpboard.dev"
REPO_URL="https://github.com/$(git remote get-url origin 2>/dev/null | sed 's|.*github.com[:/]||;s|\.git$||' || echo 'YOUR_USERNAME/pumpboard')"
APP_DIR="/opt/pumpboard"

echo "══════════════════════════════════════"
echo "  PumpBoard Backend Deploy"
echo "  Domain: $DOMAIN"
echo "══════════════════════════════════════"

# ── 1. Install Docker ──
if ! command -v docker &>/dev/null; then
    echo "→ Installing Docker..."
    curl -fsSL https://get.docker.com | sh
else
    echo "✓ Docker already installed"
fi

# ── 2. Install Caddy ──
if ! command -v caddy &>/dev/null; then
    echo "→ Installing Caddy..."
    apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
    apt-get update
    apt-get install -y caddy
else
    echo "✓ Caddy already installed"
fi

# ── 3. Firewall ──
if command -v ufw &>/dev/null; then
    echo "→ Configuring firewall..."
    ufw allow 22/tcp   # SSH
    ufw allow 80/tcp   # HTTP (Caddy redirect)
    ufw allow 443/tcp  # HTTPS (Caddy)
    ufw --force enable
    echo "✓ Firewall configured (22, 80, 443 open)"
fi

# ── 4. Clone / update repo ──
if [ -d "$APP_DIR" ]; then
    echo "→ Updating existing repo..."
    cd "$APP_DIR"
    git pull
else
    echo "→ Cloning repo..."
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# ── 5. Backend env ──
if [ ! -f backend/.env ]; then
    echo "→ Creating backend/.env..."
    GENERATED_KEY=$(openssl rand -hex 16)
    cat > backend/.env <<EOF
GITHUB_TOKEN=
CORS_ORIGINS=https://pumpboard.dev,https://www.pumpboard.dev
ADMIN_KEY=$GENERATED_KEY
EOF
    echo "✓ Generated ADMIN_KEY: $GENERATED_KEY"
    echo "  ⚠  Save this key! You'll need it for the admin panel."
else
    echo "✓ backend/.env already exists"
fi

# ── 6. Launch containers ──
echo "→ Building and starting containers..."
docker compose up -d --build

# ── 7. Configure Caddy ──
echo "→ Configuring Caddy for $DOMAIN..."
cat > /etc/caddy/Caddyfile <<EOF
$DOMAIN {
    reverse_proxy localhost:8001
}
EOF
systemctl restart caddy

# ── 8. Verify ──
echo ""
echo "→ Waiting for services to start..."
sleep 3

if curl -sf http://localhost:8001/api/developers > /dev/null; then
    echo "✓ Backend is healthy"
else
    echo "⚠  Backend not responding yet — check: docker compose logs -f backend"
fi

echo ""
echo "══════════════════════════════════════"
echo "  ✅ Deployment complete!"
echo ""
echo "  API:   https://$DOMAIN"
echo "  Admin: https://$DOMAIN/admin"
echo ""
echo "  Next steps:"
echo "  1. Point DNS A record: $DOMAIN → 161.97.149.200"
echo "  2. Set Vercel env var:"
echo "     NEXT_PUBLIC_API_URL=https://$DOMAIN"
echo "  3. Redeploy on Vercel"
echo "══════════════════════════════════════"
