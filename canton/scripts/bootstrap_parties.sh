#!/usr/bin/env bash
# Bootstrap Canton parties + upload DAR (LocalNet or Devnet).
# Usage:
#   ./canton/scripts/bootstrap_parties.sh
# Env:
#   CANTON_NETWORK=localnet|devnet (default: localnet)
#   CANTON_JSON_API_URL  (optional JSON API)
#   DAML_SDK / PATH must provide `daml` for build+upload when available

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CANTON_DIR="$ROOT/canton"
NETWORK="${CANTON_NETWORK:-localnet}"
PARTIES_FILE="$CANTON_DIR/.ledger/parties.json"
LEDGER_IDS="$CANTON_DIR/.ledger/deployed.json"

mkdir -p "$CANTON_DIR/.ledger"

echo "==> Weft Canton bootstrap ($NETWORK)"

cat > "$PARTIES_FILE" <<EOF
{
  "network": "$NETWORK",
  "parties": {
    "issuer": "${CANTON_ISSUER_PARTY:-Issuer}",
    "builder": "${CANTON_BUILDER_PARTY:-Builder}",
    "funder": "${CANTON_FUNDER_PARTY:-Funder}",
    "verifierA": "${CANTON_VERIFIER_A_PARTY:-VerifierA}",
    "verifierB": "${CANTON_VERIFIER_B_PARTY:-VerifierB}",
    "auditor": "${CANTON_AUDITOR_PARTY:-Auditor}"
  },
  "quorum": 2,
  "note": "Replace display names with Canton Devnet party IDs after allocation."
}
EOF

echo "Wrote $PARTIES_FILE"

if command -v dpm >/dev/null 2>&1; then
  echo "==> Building DAR with dpm (3.x)"
  (cd "$CANTON_DIR" && dpm install package && dpm build)
  DAR="$(ls -1 "$CANTON_DIR/.daml/dist/"*.dar 2>/dev/null | head -1 || true)"
elif command -v daml >/dev/null 2>&1; then
  echo "==> Building DAR with daml"
  (cd "$CANTON_DIR" && daml build)
  DAR="$(ls -1 "$CANTON_DIR/.daml/dist/"*.dar 2>/dev/null | head -1 || true)"
  if [[ -n "${DAR:-}" ]]; then
    echo "DAR: $DAR"
    if [[ -n "${CANTON_JSON_API_URL:-}" ]]; then
      echo "==> Upload via JSON API is environment-specific; record DAR path for operator upload"
    fi
  fi
else
  echo "dpm/daml CLI not found — skipping DAR build (source is under canton/daml/)"
  echo "Install: curl https://get.digitalasset.com/install/install.sh | sh   # dpm 3.4.x"
  DAR=""
fi

if [[ -n "${DAR:-}" ]]; then
  echo "DAR: $DAR"
  if [[ -n "${CANTON_JSON_API_URL:-}" ]]; then
    echo "==> Upload via JSON API is environment-specific; record DAR path for operator upload"
  fi
fi
# Seed ledger mirror with a demo milestone when --seed is passed
if [[ "${1:-}" == "--seed" ]]; then
  echo "==> Seeding ledger mirror via Python CantonSettlement"
  export CANTON_LEDGER_STORE="${CANTON_LEDGER_STORE:-$CANTON_DIR/.ledger/milestones.json}"
  export WEFT_SETTLEMENT_RAIL=canton
  python3 - <<'PY'
import os, time, sys
sys.path.insert(0, os.environ.get("WEFT_ROOT", "."))
from agent.lib.canton_client import CantonSettlement

c = CantonSettlement.from_env()
mid = "ms-demo-001"
r = c.create_milestone(
    milestone_id=mid,
    project_id="proj-institutional-1",
    template_id="canton.institutional_checklist.v1",
    deadline=int(time.time()) + 86400 * 30,
    metadata_hash="0xabc123",
    builder=os.environ.get("CANTON_BUILDER_PARTY", "Builder"),
    verifiers=[
        os.environ.get("CANTON_VERIFIER_A_PARTY", "VerifierA"),
        os.environ.get("CANTON_VERIFIER_B_PARTY", "VerifierB"),
    ],
    observers=[os.environ.get("CANTON_AUDITOR_PARTY", "Auditor")],
    quorum=2,
    issuer=os.environ.get("CANTON_ISSUER_PARTY", "Issuer"),
)
print("create:", r.ok, r.reference)
r2 = c.stake(mid, funder=os.environ.get("CANTON_FUNDER_PARTY", "Funder"), amount="100000")
print("stake:", r2.ok, r2.raw)
print("milestone_id:", mid)
PY
fi

cat > "$LEDGER_IDS" <<EOF
{
  "network": "$NETWORK",
  "package": "weft-canton-milestone-0.1.0",
  "sdkVersion": "3.4.11",
  "darPath": "",
  "jsonApiUrl": "",
  "partiesFile": "$PARTIES_FILE",
  "ledgerStore": "${CANTON_LEDGER_STORE:-$CANTON_DIR/.ledger/milestones.json}",
  "status": "bootstrap-complete",
  "devnetNote": "On Devnet: allocate parties, dpm/daml 3.4.11 upload-dar, update parties.json with real party IDs, re-run with --seed. Prefer dpm over daml assistant."
}
EOF

echo "Wrote $LEDGER_IDS"
echo "Done."
