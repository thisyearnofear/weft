#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# deploy.sh — Deploy WeftMilestone + VerifierRegistry to the target chain.
# Env vars (set in .env or export before running):
#   DEPLOYER_KEY     — deployer private key (required)
#   OWNER_ADDRESS    — owner address     (default: deployer)
#   ETH_RPC_URL     — RPC endpoint    (default: http://127.0.0.1:8545)
#   CHAIN_ID        — chain guard     (optional, skips if set)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_FILE="${SCRIPT_DIR}/deployed-addresses.json"

# Load .env if it exists
if [[ -f "${SCRIPT_DIR}/.env" ]]; then
  # shellcheck source=/dev/null
  set -a; source "${SCRIPT_DIR}/.env"; set +a
fi

RPC_URL="${ETH_RPC_URL:-http://127.0.0.1:8545}"
DEPLOYER_KEY="${DEPLOYER_KEY:-}"
OWNER_ADDRESS="${OWNER_ADDRESS:-}"
CHAIN_ID="${CHAIN_ID:-}"

if [[ -z "$DEPLOYER_KEY" ]]; then
  echo "Error: DEPLOYER_KEY env var is required" >&2
  exit 1
fi

echo "Deploying to ${RPC_URL}..."
echo "Chain ID: ${CHAIN_ID:-any}"

# Run the Foundry deployment script.
# The script emits a JSON blob via the DeployedWeft event.
# Parse it from the broadcast logs.
OUTPUT=$(cd "${SCRIPT_DIR}/../contracts" && \
  forge script script/Deploy.s.sol \
  --rpc-url "$RPC_URL" \
  --private-key "$DEPLOYER_KEY" \
  --broadcast 2>&1 || true)

echo "$OUTPUT"

# Extract deployed addresses from the forge script output.
WEFT_ADDRESS=$(echo "$OUTPUT" | grep -oP '"weft":"[^"]*"' | head -1 | cut -d'"' -f4)
REGISTRY_ADDRESS=$(echo "$OUTPUT" | grep -oP '"registry":"[^"]*"' | head -1 | cut -d'"' -f4)

if [[ -z "$WEFT_ADDRESS" ]] || [[ -z "$REGISTRY_ADDRESS" ]]; then
  echo "Error: Failed to parse deployed addresses from output" >&2
  echo "$OUTPUT" >&2
  exit 1
fi

# Write to gitignored addresses file
cat > "${OUT_FILE}" <<EOF
{
  "chainId": "${CHAIN_ID:-}",
  "weft": "${WEFT_ADDRESS}",
  "registry": "${REGISTRY_ADDRESS}",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo ""
echo "Deployed:"
echo "  WEFT_CONTRACT_ADDRESS=${WEFT_ADDRESS}"
echo "  VERIFIER_REGISTRY_ADDRESS=${REGISTRY_ADDRESS}"
echo "  Addresses written to ${OUT_FILE}"