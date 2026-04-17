#!/usr/bin/env bash
# Deploy ToolAccess kiosk to a Raspberry Pi 5 running Pi OS (bookworm).
# Run as root: sudo bash deploy/install.sh
set -euo pipefail

INSTALL_DIR=/opt/toolaccess
ASSETS_DIR=/opt/toolaccess/flutter_assets
SECRETS_FILE=/etc/toolaccess/secrets.env

echo "=== ToolAccess flutterpi installer ==="

# --- 1. Install system dependencies ---
apt-get update -q
apt-get install -y --no-install-recommends \
    python3 python3-venv \
    libgl1 libgles2 libdrm2 libgbm1 libegl1 \
    libinput10 libxkbcommon0

# --- 2. Install flutter-pi ---
if ! command -v flutter-pi &>/dev/null; then
    echo "Installing flutter-pi..."
    apt-get install -y --no-install-recommends \
        cmake pkg-config libglib2.0-dev libdrm-dev libgbm-dev \
        libsystemd-dev libegl-dev libgles-dev libinput-dev \
        libxkbcommon-dev libudev-dev
    tmp=$(mktemp -d)
    git clone --depth 1 https://github.com/ardera/flutter-pi.git "$tmp/flutter-pi"
    cmake -S "$tmp/flutter-pi" -B "$tmp/build" -DCMAKE_BUILD_TYPE=Release
    cmake --build "$tmp/build" -j"$(nproc)"
    install -m755 "$tmp/build/flutter-pi" /usr/local/bin/flutter-pi
    rm -rf "$tmp"
fi

# --- 3. Copy application files ---
mkdir -p "$INSTALL_DIR/UserPortal"
rsync -a --delete \
    --exclude node_modules \
    --exclude flutter_ui \
    UserPortal/ "$INSTALL_DIR/UserPortal/"

python3 -m venv /opt/toolaccess/venv
/opt/toolaccess/venv/bin/pip install -r "$INSTALL_DIR/UserPortal/requirements.txt" --quiet

# --- 4. Copy Flutter asset bundle ---
# Build on your dev machine first: npm run build:bundle
# Then rsync build/flutter_assets here, or run this script from the repo root.
if [ -d "UserPortal/flutter_ui/build/flutter_assets" ]; then
    rsync -a --delete UserPortal/flutter_ui/build/flutter_assets/ "$ASSETS_DIR/"
    echo "Flutter assets deployed to $ASSETS_DIR"
else
    echo "WARNING: flutter_assets not found. Run 'npm run build:bundle' first."
    echo "         Then re-run this script, or manually copy flutter_assets to $ASSETS_DIR"
fi

# --- 5. Secrets file ---
mkdir -p /etc/toolaccess
if [ ! -f "$SECRETS_FILE" ]; then
    cat > "$SECRETS_FILE" <<'EOF'
# ToolAccess secrets — set KIOSK_SECRET to match the main server config
KIOSK_SECRET=dev-kiosk-secret
EOF
    chmod 600 "$SECRETS_FILE"
    echo "Created $SECRETS_FILE — edit it to set the correct KIOSK_SECRET."
fi

# --- 6. Install and enable systemd services ---
cp deploy/toolaccess-kiosk-server.service /etc/systemd/system/
cp deploy/toolaccess-kiosk.service        /etc/systemd/system/
systemctl daemon-reload
systemctl enable toolaccess-kiosk-server toolaccess-kiosk
systemctl restart toolaccess-kiosk-server toolaccess-kiosk

echo ""
echo "=== Done ==="
echo "Services status:"
systemctl status toolaccess-kiosk-server --no-pager -l || true
systemctl status toolaccess-kiosk        --no-pager -l || true
