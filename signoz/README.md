# Weft × SigNoz

Infrastructure-as-code for the **Weft Autonomous Agent Observatory** dashboard and the three
hackathon alert rules described in [`docs/signoz-dashboard-build-sheet.md`](../docs/signoz-dashboard-build-sheet.md).

## Quick path (recommended)

```bash
# 1. Emit demo telemetry (requires SigNoz Cloud ingestion key)
export WEFT_OBSERVABILITY=signoz
export OTEL_EXPORTER_OTLP_HEADERS='signoz-ingestion-key=<ingestion-key>'
export OTEL_EXPORTER_OTLP_ENDPOINT='https://ingest.us2.signoz.cloud:443'
agent/scripts/weft_signoz_demo.sh

# 2. Provision dashboard + alerts (requires service-account API key + OpenTofu/Terraform)
export SIGNOZ_ENDPOINT='https://modest-mosquito.us2.signoz.cloud'
export SIGNOZ_ACCESS_TOKEN='<service-account-api-key>'
agent/scripts/weft_signoz_provision.sh

# The provision script:
# - creates the weft-demo notification channel if missing
# - applies signoz/terraform (dashboard + 3 signoz_rule alerts)
# - writes NEXT_PUBLIC_SIGNOZ_* into frontend/.env.local (gitignored)
```

## OpenTofu / Terraform only

Requires **Terraform** or **OpenTofu** (`brew install opentofu`). State stays local in
`signoz/terraform/terraform.tfstate` (gitignored) — only `.tf` sources and `.terraform.lock.hcl`
are committed.

```bash
cd signoz/terraform
export SIGNOZ_ENDPOINT='https://modest-mosquito.us2.signoz.cloud'
export SIGNOZ_ACCESS_TOKEN='<service-account-api-key>'

tofu init    # or: terraform init
tofu apply   # or: terraform apply
tofu output dashboard_url
tofu output traces_explorer_url
```

## What gets created

| Asset | Terraform resource | Name |
|---|---|---|
| Dashboard | `signoz_dashboard.weft_agent_observatory` | Weft Autonomous Agent Observatory (8 panels) |
| Alert | `signoz_rule.keeperhub_fallback` | Weft KeeperHub fallback activated |
| Alert | `signoz_rule.peer_quorum_degraded` | Weft peer quorum degraded |
| Alert | `signoz_rule.llm_narrative_failures` | Weft LLM narrative failures |
| Channel | (HTTP bootstrap in provision script) | `weft-demo` webhook for alert routing |

## Credential types

| Credential | Used for |
|---|---|
| **Ingestion key** | `OTEL_EXPORTER_OTLP_HEADERS` — write-only telemetry from daemon/smoke scripts |
| **Service-account API key** | `SIGNOZ_ACCESS_TOKEN` — Terraform dashboard/alert provisioning and MCP queries |

Do not commit either key. See [`.env.example`](../.env.example).

## Judge demo trace

```text
service.name = 'weft-daemon' AND weft.milestone_hash = '0xwinningagent2'
```

Regenerate with the last scenario in `agent/scripts/weft_signoz_demo.sh`.

## Demo recording

Follow [`docs/signoz-demo-recording.md`](../docs/signoz-demo-recording.md) for the 3-minute
submission video shot list.
