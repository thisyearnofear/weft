#!/usr/bin/env bash
# Scaffold Devnet party map + CBTC env on nuncio (or any host).
# Does NOT allocate real Canton parties — fill party IDs after Console Wallet / validator onboarding.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LEDGER="$ROOT/canton/.ledger"
mkdir -p "$LEDGER"

NETWORK="${CANTON_NETWORK:-devnet}"

cat > "$LEDGER/parties.json" <<EOF
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
  "note": "Replace display names with real Devnet party IDs (name::hexkey) after Console Wallet onboarding."
}
EOF

cat > "$LEDGER/cbtc.env.example" <<'EOF'
# Copy to cbtc.env and fill. Loaded by weft_canton_api on nuncio.
export CANTON_NETWORK=devnet
export CANTON_SETTLEMENT_SYMBOL=CBTC
export CANTON_CBTC_INSTRUMENT_ID=cbtc-devnet-placeholder
# BitSafe (https://docs.bitsafe.finance/developers/cbtc-quick-start)
export BITSAFE_API_URL=https://api.devnet.bitsafe.finance
export REGISTRY_URL=https://api.utilities.digitalasset-dev.com
# Keycloak — from your Devnet sponsor / utilities onboarding
export KEYCLOAK_HOST=
export KEYCLOAK_REALM=
export KEYCLOAK_CLIENT_ID=
export KEYCLOAK_USERNAME=
export KEYCLOAK_PASSWORD=
export LEDGER_HOST=
export PARTY_ID=
# Console Wallet Devnet
export CONSOLE_WALLET_URL=https://devnet.consolewallet.io
# Faucet (browser): https://cbtc-faucet.bitsafe.finance/
# CC for Devnet gas narrative: contact @mrlp8
EOF

if [[ ! -f "$LEDGER/cbtc.env" ]]; then
  cp "$LEDGER/cbtc.env.example" "$LEDGER/cbtc.env"
fi

cat > "$LEDGER/deployed.json" <<EOF
{
  "network": "$NETWORK",
  "host": "$(hostname)",
  "package": "weft-canton-milestone-0.1.0",
  "sdkVersion": "3.4.11",
  "darPath": "$ROOT/canton/.daml/dist/weft-canton-milestone-0.1.0.dar",
  "jsonApiUrl": "${CANTON_JSON_API_URL:-}",
  "consoleWallet": "https://devnet.consolewallet.io",
  "cbtcFaucet": "https://cbtc-faucet.bitsafe.finance/",
  "bitsafeApi": "https://api.devnet.bitsafe.finance",
  "status": "awaiting-devnet-party-ids",
  "checklist": [
    "Install Console Wallet and create/import Devnet parties",
    "Replace parties.json display names with partyId format name::hex",
    "Claim CBTC at faucet; record balances via POST /canton/action action=faucet (mirror) or BitSafe",
    "Upload DAR to participant; set CANTON_JSON_API_URL",
    "Book mentor if blocked: https://calendar.app.google/X9TtEmne43FMw9Fx6"
  ]
}
EOF

echo "Wrote $LEDGER/parties.json"
echo "Wrote $LEDGER/cbtc.env.example (+ cbtc.env stub)"
echo "Wrote $LEDGER/deployed.json"
echo
echo "Next:"
echo "  1) Open https://devnet.consolewallet.io and https://cbtc-faucet.bitsafe.finance/"
echo "  2) Paste real party IDs into $LEDGER/parties.json and export CANTON_*_PARTY"
echo "  3) Start API: python3 agent/scripts/weft_canton_api.py --port 9020"
