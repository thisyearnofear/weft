#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# Safe production deploy for Weft on snel-bot (backend only).
# The frontend lives on Vercel (weft.persidian.com) — this script deploys the
# status API (:9010, behind nginx at api.weft.persidian.com) and the AXL peer
# node (:9002). Preserves ecosystem.config.js, agent/.axl/, and venv/.
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
PUBLIC_URL="${WEFT_PUBLIC_URL:-https://weft.persidian.com}"
API_URL="${WEFT_API_URL:-https://api.weft.persidian.com}"
API_KEY="${WEFT_STATUS_API_KEY:-}"

if [[ "${1:-}" == "--remote" ]]; then
  REMOTE_DIR="${WEFT_DEPLOY_REMOTE_DIR:-/opt/weft}"
  BRANCH="${WEFT_DEPLOY_BRANCH:-main}"
  BACKUP="/tmp/weft-deploy-backup-$$"
  mkdir -p "$BACKUP"

  echo "▶ Backup server-local files"
  for f in ecosystem.config.js; do
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
  [[ -f "$BACKUP/ecosystem.config.js" ]] && cp -a "$BACKUP/ecosystem.config.js" .
  [[ -d "$BACKUP/agent/.axl" ]] && mkdir -p agent && cp -a "$BACKUP/agent/.axl" agent/
  rm -rf "$BACKUP"

  echo "▶ Python venv (status API)"
  if [[ ! -x "$REMOTE_DIR/venv/bin/python3" ]]; then
    python3 -m venv "$REMOTE_DIR/venv"
  fi

  echo "▶ AXL persistent config"
  bash "$REMOTE_DIR/scripts/weft_axl_bootstrap.sh"

  echo "▶ PM2 restart Weft processes (backend only — frontend is on Vercel)"
  cd "$REMOTE_DIR"
  if [[ -f ecosystem.config.js ]]; then
    pm2 startOrRestart ecosystem.config.js --only weft-api,weft-axl
  else
    pm2 restart weft-api weft-axl
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
  curl -sf -o /dev/null "http://127.0.0.1:9010/demo" && echo "  status API :9010 OK"
  curl -sf "http://127.0.0.1:9002/topology" | grep -q our_public_key && echo "  AXL :9002 OK"

  echo "✅ Remote deploy finished at $(git -C "$REMOTE_DIR" rev-parse --short HEAD)"
  exit 0
fi

echo "▶ Deploying Weft backend to $SERVER ($REMOTE_DIR, branch $BRANCH)"
ssh "$SERVER" "WEFT_DEPLOY_REMOTE_DIR='$REMOTE_DIR' WEFT_DEPLOY_BRANCH='$BRANCH' bash -s -- --remote" < "$0"

echo "▶ Public health checks"
# Status API must answer through nginx only with the shared-secret header.
code="$(curl -s -o /dev/null -w '%{http_code}' "${API_URL}/health" || echo 000)"
echo "  ${API_URL}/health (no key) → HTTP ${code}"
[[ "$code" == "403" || "$code" == "401" ]] || echo "  ⚠ expected 401/403 without x-weft-key — check nginx auth"

if [[ -n "$API_KEY" ]]; then
  code="$(curl -s -o /dev/null -w '%{http_code}' -H "x-weft-key: ${API_KEY}" "${API_URL}/demo" || echo 000)"
  echo "  ${API_URL}/demo (with key) → HTTP ${code}"
  [[ "$code" == "200" ]] || { echo "❌ Status API health check failed"; exit 1; }
else
  echo "  (set WEFT_STATUS_API_KEY to verify the authed path)"
fi

# Frontend is deployed by Vercel — these check the public site end to end.
for path in / /api/status/demo; do
  code="$(curl -s -o /dev/null -w '%{http_code}' "${PUBLIC_URL}${path}" || echo 000)"
  echo "  ${PUBLIC_URL}${path} → HTTP ${code}"
done

echo "✅ Deploy complete: $PUBLIC_URL"
