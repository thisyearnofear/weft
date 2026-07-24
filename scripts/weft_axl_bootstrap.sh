#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Ensure persistent AXL node config exists under agent/.axl/ (never commit keys).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AXL_DIR="${AXL_DIR:-$ROOT/agent/.axl}"
AXL_PORT="${AXL_PORT:-9002}"
AXL_BRIDGE="${AXL_BRIDGE_ADDR:-127.0.0.1}"

mkdir -p "$AXL_DIR"
KEY="$AXL_DIR/private.pem"
CFG="$AXL_DIR/node-config.json"

if [[ ! -f "$KEY" ]]; then
  openssl genpkey -algorithm ed25519 -out "$KEY" 2>/dev/null
  chmod 600 "$KEY"
  echo "Created AXL identity key: $KEY"
else
  echo "AXL identity key already present: $KEY"
fi

if [[ ! -f "$CFG" ]]; then
  cat > "$CFG" <<EOF
{
  "PrivateKeyPath": "$KEY",
  "api_port": $AXL_PORT,
  "bridge_addr": "$AXL_BRIDGE",
  "Peers": [
    "tls://34.46.48.224:9001",
    "tls://136.111.135.206:9001"
  ],
  "Listen": []
}
EOF
  echo "Created AXL config: $CFG (port $AXL_PORT)"
else
  echo "AXL config already present: $CFG (unchanged)"
fi
