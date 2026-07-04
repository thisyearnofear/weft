#!/usr/bin/env bash
# End-to-end sealed-ballot demo on Sepolia.
#
# Creates a confidential milestone with a short deadline, stakes ETH, waits for
# the deadline, casts three encrypted verifier ballots, publicly decrypts the
# sealed result, confirms it onchain, and releases capital.
#
# Prereqs: scripts/deploy_fhe_sepolia.sh has run; WEFT_MILESTONE_CONFIDENTIAL
# set in .env.fhe.local; deployer + verifiers funded.
set -euo pipefail

cd "$(dirname "$0")/.."
set -a; source .env.fhe.local; set +a

CAST="${CAST:-$HOME/.foundry/bin/cast}"
RPC="$SEPOLIA_RPC_URL"
CONTRACT="$WEFT_MILESTONE_CONFIDENTIAL"
DEADLINE_SECS="${DEADLINE_SECS:-180}"
STAKE_ETH="${STAKE_ETH:-0.02ether}"

ZERO32=0x0000000000000000000000000000000000000000000000000000000000000000

# ── 1. Create confidential milestone ─────────────────────────────────────────
PROJECT_ID=$($CAST keccak "zama-sealed-ballot-demo-$RANDOM")
DEADLINE=$(( $(date +%s) + DEADLINE_SECS ))
METADATA=$($CAST keccak "Sealed-ballot verification demo for the Zama Developer Program")
HASH=$($CAST keccak "$($CAST abi-encode --packed 'f(bytes32,bytes32,uint64,bytes32)' "$PROJECT_ID" "$ZERO32" "$DEADLINE" "$METADATA")")

echo "── Milestone hash: $HASH (deadline in ${DEADLINE_SECS}s)"
$CAST send "$CONTRACT" \
  "createMilestone(bytes32,bytes32,bytes32,uint64,bytes32,(address,uint16)[])" \
  "$HASH" "$PROJECT_ID" "$ZERO32" "$DEADLINE" "$METADATA" "[($DEPLOYER_ADDRESS,10000)]" \
  --private-key "$DEPLOYER_KEY" --rpc-url "$RPC" > /dev/null
echo "created ✓"

# ── 2. Stake ─────────────────────────────────────────────────────────────────
$CAST send "$CONTRACT" "stake(bytes32)" "$HASH" --value "$STAKE_ETH" \
  --private-key "$DEPLOYER_KEY" --rpc-url "$RPC" > /dev/null
echo "staked $STAKE_ETH ✓"

# ── 3. Wait for deadline (sealed ballots open after it passes) ───────────────
NOW=$(date +%s)
WAIT=$(( DEADLINE - NOW + 15 ))
echo "── Waiting ${WAIT}s for the deadline to pass..."
sleep "$WAIT"

# ── 4. Three encrypted ballots ───────────────────────────────────────────────
EVIDENCE=$($CAST keccak "evidence-bundle-$HASH")
for KEY in "$VERIFIER_1_KEY" "$VERIFIER_2_KEY" "$VERIFIER_3_KEY"; do
  echo "── Encrypting + submitting sealed ballot..."
  node agent/scripts/fhe_encrypt_vote.mjs \
    --rpc-url "$RPC" --private-key "$KEY" --contract "$CONTRACT" \
    --milestone-hash "$HASH" --did-complete true --evidence-root "$EVIDENCE"
done

# ── 5. Publicly decrypt the sealed result ────────────────────────────────────
echo "── Decrypting sealed result via Zama relayer..."
RESULT=$(node agent/scripts/fhe_decrypt_result.mjs \
  --rpc-url "$RPC" --contract "$CONTRACT" --milestone-hash "$HASH")
echo "$RESULT"
VERIFIED=$(echo "$RESULT" | python3 -c "import json,sys; print(str(json.load(sys.stdin)['verified']).lower())")

# ── 6. Confirm result onchain + release ──────────────────────────────────────
$CAST send "$CONTRACT" "confirmResult(bytes32,bool)" "$HASH" "$VERIFIED" \
  --private-key "$DEPLOYER_KEY" --rpc-url "$RPC" > /dev/null
echo "result confirmed onchain: verified=$VERIFIED ✓"

if [ "$VERIFIED" = "true" ]; then
  $CAST send "$CONTRACT" "release(bytes32)" "$HASH" \
    --private-key "$DEPLOYER_KEY" --rpc-url "$RPC" > /dev/null
  echo "capital released ✓"
fi

echo
echo "Demo milestone: $HASH"
echo "View: https://weft.thisyearnofear.com/project/$HASH?confidential=1"
echo "Contract: https://sepolia.etherscan.io/address/$CONTRACT"
