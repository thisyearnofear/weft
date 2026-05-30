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

# Ensure Kimi key is available to Hermes
export KIMI_API_KEY="${KIMI_API_KEY}"
export ETH_RPC_URL="${ETH_RPC_URL}"
export WEFT_CONTRACT_ADDRESS="${WEFT_CONTRACT_ADDRESS}"
export VERIFIER_REGISTRY_ADDRESS="${VERIFIER_REGISTRY_ADDRESS}"
export WEFT_ENS_PARENT="${WEFT_ENS_PARENT:-thisyearnofear.eth}"
export ZERO_G_INDEXER_RPC="${ZERO_G_INDEXER_RPC}"
export FAL_KEY="${FAL_KEY}"
export KEEPERHUB_API_KEY="${KEEPERHUB_API_KEY}"

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
echo "   Kimi:      $([ -n "$KIMI_API_KEY" ] && echo "✓ configured" || echo "✗ missing")"
echo "   fal.ai:    $([ -n "$FAL_KEY" ] && echo "✓ configured" || echo "✗ missing")"
echo ""
echo "   Try: 'tell me the story of the Weft Protocol'"
echo "   Try: 'verify milestone 0x516975...'"
echo "   Try: 'what is the status of weft.thisyearnofear.eth?'"
echo ""

hermes
