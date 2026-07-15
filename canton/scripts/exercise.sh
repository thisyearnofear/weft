#!/usr/bin/env bash
# Optional bridge: exercise a Daml choice on a running ledger.
# Args: <ChoiceName> <milestoneId> <jsonPayload>
# Without DAML/JSON API configured, exits 0 (ledger mirror remains authoritative).

set -euo pipefail

CHOICE="${1:-}"
MID="${2:-}"
PAYLOAD="${3:-{}}"

if [[ -z "$CHOICE" || -z "$MID" ]]; then
  echo "usage: exercise.sh <Choice> <milestoneId> <jsonPayload>" >&2
  exit 2
fi

echo "[canton exercise] choice=$CHOICE milestone=$MID payload=$PAYLOAD"

if [[ -z "${CANTON_JSON_API_URL:-}" ]]; then
  echo "[canton exercise] CANTON_JSON_API_URL unset — mirror-only mode"
  exit 0
fi

# Operator fills in JSON API command submission for their Devnet validator.
# Example shape (illustrative — adjust to your JSON API version):
# curl -sS -X POST "$CANTON_JSON_API_URL/v2/commands/submit-and-wait" ...
echo "[canton exercise] JSON API configured at $CANTON_JSON_API_URL — wire operator credentials to submit $CHOICE"
exit 0
