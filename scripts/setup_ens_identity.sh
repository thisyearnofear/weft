#!/usr/bin/env bash
# setup_ens_identity.sh
# Sets ENS text records on weft.thisyearnofear.eth to establish Weft's onchain identity.
#
# Usage:
#   export ETH_RPC_URL="https://eth.llamarpc.com"   # Ethereum mainnet
#   export PRIVATE_KEY="0x..."                        # key controlling thisyearnofear.eth
#   bash scripts/setup_ens_identity.sh
#
# Optional overrides:
#   ENS_NAME=weft.thisyearnofear.eth   (default)
#   ENS_RESOLVER=0x231052B08c198b0822486Eb1B6e2F238f7CF528E  (ENS Public Resolver)

set -euo pipefail

ENS_NAME="${ENS_NAME:-weft.thisyearnofear.eth}"
ENS_RESOLVER="${ENS_RESOLVER:-0xF29100983E058B709F3D539b0c765937B804AC15}"
RPC_URL="${ETH_RPC_URL:-}"
PRIVATE_KEY="${PRIVATE_KEY:-}"

if [[ -z "$RPC_URL" || -z "$PRIVATE_KEY" ]]; then
  echo "ERROR: ETH_RPC_URL and PRIVATE_KEY must be set (Ethereum mainnet)"
  echo "  export ETH_RPC_URL='https://eth.llamarpc.com'"
  echo "  export PRIVATE_KEY='0x...'"
  exit 1
fi

echo "=== Setting ENS text records on $ENS_NAME ==="
echo "    Resolver: $ENS_RESOLVER"
echo "    RPC:      $RPC_URL"
echo ""

# Compute namehash for the ENS name
NODE=$(cast namehash "$ENS_NAME")
echo "    Namehash: $NODE"
echo ""

set_text() {
  local key="$1"
  local value="$2"
  echo -n "  Setting $key ... "
  local calldata
  calldata=$(cast calldata "setText(bytes32,string,string)" "$NODE" "$key" "$value")
  local tx
  tx=$(cast send \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    "$ENS_RESOLVER" \
    "$calldata" \
    --json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('transactionHash','(no hash)'))" 2>/dev/null || echo "FAILED")
  echo "$tx"
}

# --- Protocol identity records ---
set_text "url"         "https://weft.thisyearnofear.com"
set_text "description" "Weft — trustless milestone verification for onchain builders. Raw evidence threads woven into verified fabric."
set_text "com.github"  "thisyearnofear/weft"
set_text "com.twitter" "thisyearnofear"

# --- Weft protocol records ---
set_text "weft.role"              "protocol"
set_text "weft.version"          "1.0.0"
set_text "weft.contract.0g"      "0xcc768d56b0053b1b2df5391dde989be3f859474c"
set_text "weft.subnames.parent"  "thisyearnofear.eth"
set_text "weft.subnames.pattern" "<project>.thisyearnofear.eth"
set_text "weft.tagline"          "Technology provides the warp. Liberal arts provide the weft."

echo ""
echo "=== Done! ==="
echo ""
echo "Verify at: https://app.ens.domains/$ENS_NAME"
echo "Frontend:  https://weft.thisyearnofear.com/builder/$ENS_NAME"
echo ""
echo "Next steps:"
echo "  1. Set WEFT_ENS_PARENT=thisyearnofear.eth on your verifier daemon"
echo "  2. Verified builders will receive <project>.thisyearnofear.eth subnames"
echo "  3. Subnames are readable at https://weft.thisyearnofear.com/builder/<project>.thisyearnofear.eth"
