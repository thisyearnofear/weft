#!/usr/bin/env bash
# Launch Hermes Agent with Weft environment
# Usage: bash scripts/hermes_weft.sh

set -a
_ENV_DIR="$(dirname "$0")"
if [ -f "$_ENV_DIR/.env.local" ]; then
  source "$_ENV_DIR/.env.local"
elif [ -f "$_ENV_DIR/.env" ]; then
  source "$_ENV_DIR/.env"
elif [ -f "$_ENV_DIR/../.env.local" ]; then
  source "$_ENV_DIR/../.env.local"
fi
set +a

# Export WEFT_ROOT so skills don't rely on hardcoded paths
WEFT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export WEFT_ROOT

# Ensure Hermes loads Weft's config (including OKX skills external_dirs).
# We symlink ~/.hermes/config.yaml -> agent/hermes.config.yml so edits in
# the repo are picked up automatically. A backup is made if a real config file
# already exists (symlinks are simply replaced).
HERMES_DIR="${HOME}/.hermes"
HERMES_CONFIG="${HERMES_DIR}/config.yaml"
WEFT_HERMES_CONFIG="${WEFT_ROOT}/agent/hermes.config.yml"
if [ -f "$WEFT_HERMES_CONFIG" ]; then
  mkdir -p "$HERMES_DIR"
  CURRENT_TARGET=""
  if [ -L "$HERMES_CONFIG" ]; then
    CURRENT_TARGET="$(readlink "$HERMES_CONFIG")"
  fi
  if [ "$CURRENT_TARGET" = "$WEFT_HERMES_CONFIG" ]; then
    echo " Weft Hermes config already linked"
  else
    if [ -e "$HERMES_CONFIG" ]; then
      if [ ! -L "$HERMES_CONFIG" ]; then
        BACKUP_PATH="$HERMES_CONFIG.weft-backup.$(date +%s)"
        cp "$HERMES_CONFIG" "$BACKUP_PATH"
        echo "🛡️  Backed up existing Hermes config to $BACKUP_PATH"
      else
        OLD_TARGET="$(readlink "$HERMES_CONFIG")"
        if [ "$OLD_TARGET" != "$WEFT_HERMES_CONFIG" ]; then
          BACKUP_PATH="$HERMES_CONFIG.weft-backup.$(date +%s).symlink-target"
          printf '%s\n' "$OLD_TARGET" > "$BACKUP_PATH"
          echo "🛡️  Recorded previous Hermes config symlink target in $BACKUP_PATH"
        fi
      fi
    fi
    ln -sf "$WEFT_HERMES_CONFIG" "$HERMES_CONFIG"
    echo "🧩 Linked Weft Hermes config: $HERMES_CONFIG -> $WEFT_HERMES_CONFIG"
  fi
fi

# Ensure Hermes is available
if ! command -v hermes >/dev/null 2>&1; then
  echo "❌ hermes command not found. Please install the Hermes Agent CLI first." >&2
  exit 1
fi

# Ensure Kimi key is available to Hermes
export KIMI_API_KEY="${KIMI_API_KEY}"
export ETH_RPC_URL="${ETH_RPC_URL}"
export WEFT_CONTRACT_ADDRESS="${WEFT_CONTRACT_ADDRESS}"
export VERIFIER_REGISTRY_ADDRESS="${VERIFIER_REGISTRY_ADDRESS}"
export WEFT_ENS_PARENT="${WEFT_ENS_PARENT:-thisyearnofear.eth}"
export ZERO_G_INDEXER_RPC="${ZERO_G_INDEXER_RPC}"
export FAL_KEY="${FAL_KEY}"
export KEEPERHUB_API_KEY="${KEEPERHUB_API_KEY}"

# Autonomous spend loop (Stripe Skills) + pluggable LLM backend (Nemotron/Kimi/Nous)
export STRIPE_SKILLS_KEY="${STRIPE_SKILLS_KEY}"
export LLM_BACKEND="${LLM_BACKEND:-kimi}"
export NVIDIA_API_KEY="${NVIDIA_API_KEY}"
export NEMOCLAW_GUARD="${NEMOCLAW_GUARD}"
export NOUS_API_KEY="${NOUS_API_KEY}"

# Daemon uses PRIVATE_KEY — alias from VERIFIER_PRIVATE_KEY if set
export PRIVATE_KEY="${VERIFIER_PRIVATE_KEY:-$PRIVATE_KEY}"
export VERIFIER_ADDRESS="${VERIFIER_ADDRESS}"

# KeeperHubRelayer contract for automated capital release
export KEEPERHUB_RELAYER_ADDRESS="${KEEPERHUB_RELAYER_ADDRESS:-0x5EB72B6576581c38fa44BdFa6EcDFe8C13a1fB9c}"

# Change to weft root so relative paths work in skills
cd "$(dirname "$0")/.."

echo "🧵 Starting Weft Hermes Agent..."
echo "   Contract:  $WEFT_CONTRACT_ADDRESS"
echo "   ENS:       weft.thisyearnofear.eth"
echo "   LLM:       ${LLM_BACKEND} ($([ -n "${NVIDIA_API_KEY}" ] && echo "Nemotron ✓" || [ -n "${KIMI_API_KEY}" ] && echo "Kimi ✓" || echo "✗ missing"))"
echo "   fal.ai:    $([ -n "$FAL_KEY" ] && echo "✓ configured" || echo "✗ missing")"
echo "   Stripe:    $([ -n "$STRIPE_SKILLS_KEY" ] && echo "✓ spend loop active" || echo "✗ spend loop inactive")"
echo ""
echo "   Try: 'tell me the story of the Weft Protocol'"
echo "   Try: 'verify milestone 0x516975...'"
echo "   Try: 'show me the agent''s books'"
echo "   Try: 'what is the status of weft.thisyearnofear.eth?'"
echo ""

hermes
