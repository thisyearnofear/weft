#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# register-verifier.sh — Register a Hermes verifier node in VerifierRegistry.
# Env vars (set in .env or export before running):
#   DEPLOYER_KEY          — owner private key (required)
#   ETH_RPC_URL           — RPC endpoint    (default: http://127.0.0.1:8545)
#   VERIFIER_REGISTRY     — VerifierRegistry address (required)
#   VERIFIER_ADDRESS      — address to register (required)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load .env if it exists
if [[ -f "${SCRIPT_DIR}/.env" ]]; then
  # shellcheck source=/dev/null
  set -a; source "${SCRIPT_DIR}/.env"; set +a
fi

RPC_URL="${ETH_RPC_URL:-http://127.0.0.1:8545}"
DEPLOYER_KEY="${DEPLOYER_KEY:-}"
REGISTRY="${VERIFIER_REGISTRY:-}"
VERIFIER="${VERIFIER_ADDRESS:-}"

# Load deployed addresses if not set
if [[ -z "$REGISTRY" ]] && [[ -f "${SCRIPT_DIR}/deployed-addresses.json" ]]; then
  REGISTRY=$(grep -oP '"registry":"[^"]*"' "${SCRIPT_DIR}/deployed-addresses.json" | head -1 | cut -d'"' -f4)
fi

if [[ -z "$DEPLOYER_KEY" ]] || [[ -z "$REGISTRY" ]] || [[ -z "$VERIFIER" ]]; then
  echo "Error: Missing required vars. Set DEPLOYER_KEY, VERIFIER_REGISTRY (or run deploy.sh first), and VERIFIER_ADDRESS" >&2
  exit 1
fi

echo "Registering verifier ${VERIFIER} in VerifierRegistry at ${REGISTRY}..."

cast send "${REGISTRY}" \
  "addVerifier(address)" "${VERIFIER}" \
  --rpc-url "${RPC_URL}" \
  --private-key "${DEPLOYER_KEY}" \
  --legacy

echo "Done."