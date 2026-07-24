#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TF_DIR="$ROOT/signoz/terraform"

SIGNOZ_ENDPOINT="${SIGNOZ_ENDPOINT:-${SIGNOZ_INSTANCE_URL:-}}"
SIGNOZ_ACCESS_TOKEN="${SIGNOZ_ACCESS_TOKEN:-${SIGNOZ_API_KEY:-}}"

if [[ -z "${SIGNOZ_ENDPOINT}" || -z "${SIGNOZ_ACCESS_TOKEN}" ]]; then
  cat >&2 <<'EOF'
Missing SigNoz provisioning credentials.

Export a service-account API key (not the ingestion key):
  export SIGNOZ_ENDPOINT='https://modest-mosquito.us2.signoz.cloud'
  export SIGNOZ_ACCESS_TOKEN='<service-account-api-key>'

Then rerun:
  agent/scripts/weft_signoz_provision.sh
EOF
  exit 2
fi

TF_BIN=""
if command -v terraform >/dev/null 2>&1; then
  TF_BIN="terraform"
elif command -v tofu >/dev/null 2>&1; then
  TF_BIN="tofu"
fi

if [[ -z "$TF_BIN" ]]; then
  cat >&2 <<'EOF'
terraform or tofu is required.

Install one of:
  brew install terraform
  brew install opentofu

Then rerun:
  agent/scripts/weft_signoz_provision.sh
EOF
  exit 2
fi

ALERT_CHANNEL="${SIGNOZ_ALERT_CHANNEL:-weft-demo}"
CHANNELS_JSON="$(curl -sS -H "SIGNOZ-API-KEY: ${SIGNOZ_ACCESS_TOKEN}" "${SIGNOZ_ENDPOINT%/}/api/v1/channels")"
if ! printf '%s' "$CHANNELS_JSON" | grep -q "\"name\":\"${ALERT_CHANNEL}\""; then
  curl -sS -X POST "${SIGNOZ_ENDPOINT%/}/api/v1/channels" \
    -H "Content-Type: application/json" \
    -H "SIGNOZ-API-KEY: ${SIGNOZ_ACCESS_TOKEN}" \
    -d "{\"name\":\"${ALERT_CHANNEL}\",\"webhook_configs\":[{\"url\":\"https://example.com/weft-signoz-demo\",\"send_resolved\":true}]}" >/dev/null
  echo "Created SigNoz notification channel: ${ALERT_CHANNEL}"
fi

cd "$TF_DIR"
"$TF_BIN" init -input=false
"$TF_BIN" apply -input=false -auto-approve \
  -var="signoz_endpoint=${SIGNOZ_ENDPOINT}" \
  -var="signoz_access_token=${SIGNOZ_ACCESS_TOKEN}" \
  -var="alert_channel=${ALERT_CHANNEL}"

DASHBOARD_URL="$("$TF_BIN" output -raw dashboard_url)"
TRACES_EXPLORER_URL="$("$TF_BIN" output -raw traces_explorer_url)"
FRONTEND_ENV="$ROOT/frontend/.env.local"

touch "$FRONTEND_ENV"
if grep -q '^NEXT_PUBLIC_SIGNOZ_INSTANCE_URL=' "$FRONTEND_ENV"; then
  sed -i.bak "s|^NEXT_PUBLIC_SIGNOZ_INSTANCE_URL=.*|NEXT_PUBLIC_SIGNOZ_INSTANCE_URL=${SIGNOZ_ENDPOINT}|" "$FRONTEND_ENV"
else
  printf '\nNEXT_PUBLIC_SIGNOZ_INSTANCE_URL=%s\n' "$SIGNOZ_ENDPOINT" >> "$FRONTEND_ENV"
fi

if grep -q '^NEXT_PUBLIC_SIGNOZ_DASHBOARD_URL=' "$FRONTEND_ENV"; then
  sed -i.bak "s|^NEXT_PUBLIC_SIGNOZ_DASHBOARD_URL=.*|NEXT_PUBLIC_SIGNOZ_DASHBOARD_URL=${DASHBOARD_URL}|" "$FRONTEND_ENV"
else
  printf 'NEXT_PUBLIC_SIGNOZ_DASHBOARD_URL=%s\n' "$DASHBOARD_URL" >> "$FRONTEND_ENV"
fi
rm -f "$FRONTEND_ENV.bak"

cat <<EOF

Weft SigNoz assets provisioned.

Dashboard URL:
${DASHBOARD_URL}

Traces explorer (winning demo filter):
${TRACES_EXPLORER_URL}

Frontend env updated:
  NEXT_PUBLIC_SIGNOZ_INSTANCE_URL=${SIGNOZ_ENDPOINT}
  NEXT_PUBLIC_SIGNOZ_DASHBOARD_URL=${DASHBOARD_URL}

Record the demo using docs/signoz-demo-recording.md
EOF
