#!/usr/bin/env bash
set -euo pipefail

# Weft MVP: collect deterministic attestation + submit onchain verdict.
#
# Required env:
#   RPC_URL
#   PRIVATE_KEY
#   WEFT_MILESTONE_ADDRESS
#   MILESTONE_HASH
#   CONTRACT_ADDRESS
#
# Optional env:
#   MEASUREMENT_WINDOW_SECONDS (default 604800)
#   UNIQUE_CALLER_THRESHOLD (default 100)
#   NODE_ADDRESS (default 0x000..0)
#   OUT_DIR (default agent/.attestations/<milestoneHash>/<unix>)
#   DRY_RUN=1 (skip cast send)
#   PUBLISH_0G=1 (attempt to write attestation to 0G; uses ZERO_G_INDEXER_URL/ZERO_G_STREAM_ID)

: "${RPC_URL:?missing RPC_URL}"
: "${PRIVATE_KEY:?missing PRIVATE_KEY}"
: "${WEFT_MILESTONE_ADDRESS:?missing WEFT_MILESTONE_ADDRESS}"
: "${MILESTONE_HASH:?missing MILESTONE_HASH}"
: "${CONTRACT_ADDRESS:?missing CONTRACT_ADDRESS}"

MEASUREMENT_WINDOW_SECONDS="${MEASUREMENT_WINDOW_SECONDS:-604800}"
UNIQUE_CALLER_THRESHOLD="${UNIQUE_CALLER_THRESHOLD:-100}"
NODE_ADDRESS="${NODE_ADDRESS:-0x0000000000000000000000000000000000000000}"

ts="$(date +%s)"
default_out="agent/.attestations/${MILESTONE_HASH}/${ts}"
OUT_DIR="${OUT_DIR:-$default_out}"
mkdir -p "$OUT_DIR"

OUT_JSON="$OUT_DIR/attestation.json"

python_output="$(
  python3 agent/scripts/weft_collect_attestation.py \
    --rpc-url "$RPC_URL" \
    --weft-milestone "$WEFT_MILESTONE_ADDRESS" \
    --milestone-hash "$MILESTONE_HASH" \
    --contract-address "$CONTRACT_ADDRESS" \
    --measurement-window-seconds "$MEASUREMENT_WINDOW_SECONDS" \
    --unique-caller-threshold "$UNIQUE_CALLER_THRESHOLD" \
    --node-address "$NODE_ADDRESS" \
    ${PUBLISH_0G:+--publish-0g} \
    --out "$OUT_JSON"
)"

# Parse key=value lines
ATTESTATION=""
CANONICAL=""
VERIFIED=""
EVIDENCE_ROOT=""
while IFS= read -r line; do
  case "$line" in
    ATTESTATION=*) ATTESTATION="${line#ATTESTATION=}" ;;
    CANONICAL=*) CANONICAL="${line#CANONICAL=}" ;;
    VERIFIED=*) VERIFIED="${line#VERIFIED=}" ;;
    EVIDENCE_ROOT=*) EVIDENCE_ROOT="${line#EVIDENCE_ROOT=}" ;;
    *) : ;;
  esac
done <<< "$python_output"

if [[ -z "$CANONICAL" || -z "$VERIFIED" ]]; then
  echo "Failed to parse python output:" >&2
  echo "$python_output" >&2
  exit 1
fi

if [[ -z "$EVIDENCE_ROOT" ]]; then
  # Backwards-compatible fallback
  EVIDENCE_ROOT="$(cast keccak < "$CANONICAL")"
fi

echo "attestation: $ATTESTATION"
echo "canonical:   $CANONICAL"
echo "verified:    $VERIFIED"
echo "evidenceRoot:$EVIDENCE_ROOT"

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo "DRY_RUN=1 set; skipping onchain submit."
  exit 0
fi

cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  "$WEFT_MILESTONE_ADDRESS" \
  "submitVerdict(bytes32,bool,bytes32)" \
  "$MILESTONE_HASH" \
  "$VERIFIED" \
  "$EVIDENCE_ROOT"
