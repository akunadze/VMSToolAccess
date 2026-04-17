#!/usr/bin/env bash
# Deploy ToolAccess kiosk to a Raspberry Pi 5 running Pi OS (bookworm).
# Run as root: sudo bash deploy/install.sh
set -euo pipefail

INSTALL_DIR=/opt/toolaccess-kiosk
ASSETS_DIR=/opt/toolaccess-kiosk/flutter_assets
SECRETS_FILE=/etc/toolaccess-kiosk/secrets.env

echo "=== ToolAccess Kiosk deploy ==="

# --- 1. Copy application files ---
mkdir -p "$INSTALL_DIR/UserPortal"
rsync -a --delete \
    --exclude __pycache__ \
    --exclude '*.pyc' \
    --exclude flutter_ui \
    UserPortal/ "$INSTALL_DIR/UserPortal/"

python3 -m venv /opt/toolaccess-kiosk/venv
/opt/toolaccess-kiosk/venv/bin/pip install -r "$INSTALL_DIR/UserPortal/requirements.txt" --quiet

# --- 2. Secrets file ---
mkdir -p /etc/toolaccess-kiosk
if [ ! -f "$SECRETS_FILE" ]; then
    cat > "$SECRETS_FILE" <<'EOF'
# ToolAccess secrets — set KIOSK_SECRET to match the main server config
KIOSK_SECRET=dev-kiosk-secret
TOOLACCESS_SERVER=localhost
EOF
    chmod 600 "$SECRETS_FILE"
    echo "Created $SECRETS_FILE — edit it to set the correct KIOSK_SECRET."
fi

# --- 3. Install and enable systemd services ---
cp UserPortal/deploy/toolaccess-kiosk-server.service /etc/systemd/system/
cp UserPortal/deploy/toolaccess-kiosk.service  /etc/systemd/system/
systemctl daemon-reload
systemctl enable toolaccess-kiosk-server toolaccess-kiosk
systemctl restart toolaccess-kiosk-server toolaccess-kiosk

echo ""
echo "=== Done ==="
echo "Services status:"
systemctl status toolaccess-kiosk-server --no-pager -l || true
systemctl status toolaccess-kiosk  --no-pager -l || true
