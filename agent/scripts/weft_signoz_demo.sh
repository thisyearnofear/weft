#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PYTHON="${WEFT_SIGNOZ_PYTHON:-$ROOT/.venv-signoz/bin/python}"

if [[ -z "${OTEL_EXPORTER_OTLP_HEADERS:-}" ]]; then
  echo "OTEL_EXPORTER_OTLP_HEADERS must include signoz-ingestion-key=<key>" >&2
  exit 2
fi

export WEFT_OBSERVABILITY="${WEFT_OBSERVABILITY:-signoz}"
export OTEL_SERVICE_NAME="${OTEL_SERVICE_NAME:-weft-daemon}"
export OTEL_RESOURCE_ATTRIBUTES="${OTEL_RESOURCE_ATTRIBUTES:-service.name=weft-daemon,deployment.environment=demo,weft.demo.batch=winning-position}"
export OTEL_EXPORTER_OTLP_ENDPOINT="${OTEL_EXPORTER_OTLP_ENDPOINT:-https://ingest.us2.signoz.cloud:443}"
export OTEL_EXPORTER_OTLP_PROTOCOL="${OTEL_EXPORTER_OTLP_PROTOCOL:-http/protobuf}"
export WEFT_OTEL_EXPORT_TIMEOUT="${WEFT_OTEL_EXPORT_TIMEOUT:-10}"

"$PYTHON" "$ROOT/agent/scripts/weft_signoz_smoke.py" --scenario verified --repeat 3 --interval 0 --milestone-hash 0xweftverified
"$PYTHON" "$ROOT/agent/scripts/weft_signoz_smoke.py" --scenario rejected --milestone-hash 0xweftrejected
"$PYTHON" "$ROOT/agent/scripts/weft_signoz_smoke.py" --scenario fallback --milestone-hash 0xweftfallback
"$PYTHON" "$ROOT/agent/scripts/weft_signoz_smoke.py" --scenario degraded --milestone-hash 0xweftdegraded
"$PYTHON" "$ROOT/agent/scripts/weft_signoz_smoke.py" --scenario fallback --milestone-hash 0xwinningagent2

cat <<'EOF'
SigNoz demo telemetry emitted.

Suggested trace filter:
  service.name = 'weft-daemon' AND weft.milestone_hash = '0xwinningagent2'

Expected span names:
  weft.verification_cycle
  weft.agent.plan
  weft.agent.tool_call
  weft.llm.chat
  weft.evidence.deployment
  weft.evidence.usage
EOF
