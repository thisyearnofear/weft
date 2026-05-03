#!/usr/bin/env bash
# Launch Hermes Agent with Weft environment
# Usage: bash scripts/hermes_weft.sh

set -a
source "$(dirname "$0")/.env"
set +a

# Ensure Kimi key is available to Hermes
export KIMI_API_KEY="${KIMI_API_KEY}"
export ETH_RPC_URL="${ETH_RPC_URL}"
export WEFT_CONTRACT_ADDRESS="${WEFT_CONTRACT_ADDRESS}"
export VERIFIER_REGISTRY_ADDRESS="${VERIFIER_REGISTRY_ADDRESS}"
export WEFT_ENS_PARENT="${WEFT_ENS_PARENT:-thisyearnofear.eth}"
export ZERO_G_INDEXER_RPC="${ZERO_G_INDEXER_RPC}"
export FAL_KEY="${FAL_KEY}"
export KEEPERHUB_API_KEY="${KEEPERHUB_API_KEY}"

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
