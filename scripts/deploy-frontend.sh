#!/usr/bin/env bash
# Deploy Weft frontend to the VPS.
# Builds locally, rsyncs source, builds on server, restarts PM2.
set -euo pipefail

SERVER="snel-bot"
REMOTE_DIR="/opt/weft"
FRONTEND_DIR="$REMOTE_DIR/frontend"

echo "▶ Building frontend locally to verify it compiles..."
cd "$(dirname "$0")/../frontend"
npm run build 2>&1 | tail -5

echo "▶ Syncing frontend source to server..."
rsync -avz --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .env.local \
  ./ "$SERVER:$FRONTEND_DIR/"

echo "▶ Syncing new backend files (explorer API, etc)..."
rsync -avz \
  --exclude node_modules \
  --exclude .next \
  --exclude venv \
  --exclude .git \
  --exclude agent/.attestations \
  --exclude agent/.inbox \
  ../ "$SERVER:$REMOTE_DIR/" 2>/dev/null || true

echo "▶ Installing dependencies on server..."
ssh "$SERVER" "cd $FRONTEND_DIR && npm install --legacy-peer-deps 2>&1 | tail -3"

echo "▶ Building on server..."
ssh "$SERVER" "cd $FRONTEND_DIR && npm run build 2>&1 | tail -10"

echo "▶ Restarting weft-frontend..."
ssh "$SERVER" "pm2 restart weft-frontend 2>&1"

echo "✅ Deploy complete. Check https://weft.thisyearnofear.com"
