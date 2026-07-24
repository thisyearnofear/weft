#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# Safe production deploy for Weft on snel-bot (weft.thisyearnofear.com).
# Preserves frontend/.env.local, ecosystem.config.js, agent/.axl/, and venv/.
# Never runs git clean.
#
# Usage (from repo root on your laptop):
#   ./scripts/deploy-snel-bot.sh
#
# Optional:
#   WEFT_DEPLOY_HOST=snel-bot WEFT_DEPLOY_BRANCH=main ./scripts/deploy-snel-bot.sh
#
set -euo pipefail

SERVER="${WEFT_DEPLOY_HOST:-snel-bot}"
REMOTE_DIR="${WEFT_DEPLOY_REMOTE_DIR:-/opt/weft}"
BRANCH="${WEFT_DEPLOY_BRANCH:-main}"
PUBLIC_URL="${WEFT_PUBLIC_URL:-https://weft.thisyearnofear.com}"

if [[ "${1:-}" == "--remote" ]]; then
  REMOTE_DIR="${WEFT_DEPLOY_REMOTE_DIR:-/opt/weft}"
  BRANCH="${WEFT_DEPLOY_BRANCH:-main}"
  PUBLIC_URL="${WEFT_PUBLIC_URL:-https://weft.thisyearnofear.com}"
  BACKUP="/tmp/weft-deploy-backup-$$"
  mkdir -p "$BACKUP"

  echo "▶ Backup server-local files"
  for f in frontend/.env.local ecosystem.config.js; do
    if [[ -f "$REMOTE_DIR/$f" ]]; then
      mkdir -p "$BACKUP/$(dirname "$f")"
      cp -a "$REMOTE_DIR/$f" "$BACKUP/$f"
    fi
  done
  if [[ -d "$REMOTE_DIR/agent/.axl" ]]; then
    mkdir -p "$BACKUP/agent"
    cp -a "$REMOTE_DIR/agent/.axl" "$BACKUP/agent/"
  fi

  echo "▶ Pull $BRANCH (no git clean)"
  cd "$REMOTE_DIR"
  git fetch origin "$BRANCH"
  git reset --hard "origin/$BRANCH"

  echo "▶ Restore server-local files"
  [[ -f "$BACKUP/frontend/.env.local" ]] && cp -a "$BACKUP/frontend/.env.local" frontend/.env.local
  [[ -f "$BACKUP/ecosystem.config.js" ]] && cp -a "$BACKUP/ecosystem.config.js" .
  [[ -d "$BACKUP/agent/.axl" ]] && mkdir -p agent && cp -a "$BACKUP/agent/.axl" agent/
  rm -rf "$BACKUP"

  echo "▶ Python venv (status API)"
  if [[ ! -x "$REMOTE_DIR/venv/bin/python3" ]]; then
    python3 -m venv "$REMOTE_DIR/venv"
  fi

  echo "▶ AXL persistent config"
  bash "$REMOTE_DIR/scripts/weft_axl_bootstrap.sh"

  echo "▶ Frontend build"
  cd "$REMOTE_DIR/frontend"
  npm ci
  npm run build

  echo "▶ PM2 restart Weft processes"
  cd "$REMOTE_DIR"
  if [[ -f ecosystem.config.js ]]; then
    pm2 startOrRestart ecosystem.config.js --only weft-frontend,weft-api,weft-axl
  else
    pm2 restart weft-frontend weft-api weft-axl
  fi
  pm2 save

  echo "▶ Remove orphan axl processes (non-PM2 duplicates)"
  PM2_PID="$(pm2 pid weft-axl 2>/dev/null || true)"
  for pid in $(pgrep -x axl 2>/dev/null || true); do
    if [[ -n "$PM2_PID" && "$pid" != "$PM2_PID" ]]; then
      kill "$pid" 2>/dev/null || true
    fi
  done

  echo "▶ Local health checks"
  sleep 4
  curl -sf -o /dev/null "http://127.0.0.1:3010/" && echo "  frontend :3010 OK"
  curl -sf -o /dev/null "http://127.0.0.1:9010/demo" && echo "  status API :9010 OK"
  curl -sf "http://127.0.0.1:9002/topology" | grep -q our_public_key && echo "  AXL :9002 OK"

  echo "✅ Remote deploy finished at $(git -C "$REMOTE_DIR" rev-parse --short HEAD)"
  exit 0
fi

echo "▶ Deploying Weft to $SERVER ($REMOTE_DIR, branch $BRANCH)"
ssh "$SERVER" "WEFT_DEPLOY_REMOTE_DIR='$REMOTE_DIR' WEFT_DEPLOY_BRANCH='$BRANCH' WEFT_PUBLIC_URL='$PUBLIC_URL' bash -s -- --remote" < "$0"

echo "▶ Public health checks"
for path in / /observability /confidential /api/status/demo /api/observability; do
  code="$(curl -s -o /dev/null -w '%{http_code}' "${PUBLIC_URL}${path}" || echo 000)"
  echo "  ${path} → HTTP ${code}"
  if [[ "$path" == "/api/status/demo" && "$code" != "200" ]]; then
    echo "❌ Status API health check failed"
    exit 1
  fi
done

echo "✅ Deploy complete: $PUBLIC_URL"
