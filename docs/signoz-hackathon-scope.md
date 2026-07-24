# SigNoz Hackathon Scope

**Decision:** pursue as a focused observability submission if it is the nearest deadline.

**Positioning:** Weft is an autonomous milestone verifier where every capital-release decision is observable end to end: deterministic evidence, peer consensus, KeeperHub execution, Canton receipt writeback, and recovery from infrastructure faults.

This is not a strategy reset. SigNoz is the proof layer for Weft's existing reliability story.

## Why SigNoz is worth it

SigNoz adds production-grade evidence for claims Weft already makes:

- The daemon does not just say a milestone passed; it shows each step that produced the verdict.
- The recovery system does not just show a custom demo timeline; it exports standard OpenTelemetry traces, logs, and metrics.
- Enterprise/Canton buyers get auditability around verifier behavior, peer health, execution latency, and receipt writeback.
- The hackathon work leaves useful infrastructure behind instead of adding a one-off feature.

Reference docs:

- SigNoz docs index: https://signoz.io/docs/
- Python OpenTelemetry instrumentation: https://signoz.io/docs/instrumentation/opentelemetry-python/
- Python logs via OpenTelemetry: https://signoz.io/docs/logs-management/send-logs/python-logs/
- Dashboards: https://signoz.io/docs/dashboards/overview/
- Alerts: https://signoz.io/docs/userguide/alerts-management/

## Submission thesis

> Weft makes autonomous verification observable. A single milestone verification is traced from deadline detection through evidence collection, peer corroboration, KeeperHub execution, and receipt/audit artifact creation. When infrastructure fails, SigNoz shows the recovery path and alerts on degraded trust.

## Non-goals

- Do not build a general observability product.
- Do not add new verifier decision rules.
- Do not make SigNoz a required runtime dependency.
- Do not block the daemon when SigNoz is unavailable.
- Do not expand the frontend beyond one demo link or one small status call unless time remains.

## Minimal build

### 1. Optional observability module

Create `agent/lib/observability.py`.

Responsibilities:

- Initialize OpenTelemetry only when enabled by environment.
- Provide no-op-safe helpers:
  - `span(name, **attrs)`
  - `set_span_attrs(**attrs)`
  - `record_counter(name, value=1, **attrs)`
  - `record_histogram(name, value, **attrs)`
  - `emit_log_event(name, **attrs)`
- Keep import failures non-fatal so local development and existing tests keep working without OTel packages installed.

Environment:

```bash
WEFT_OBSERVABILITY=signoz
OTEL_SERVICE_NAME=weft-daemon
OTEL_RESOURCE_ATTRIBUTES=service.name=weft-daemon,service.version=<git-sha>,deployment.environment=demo
OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.us2.signoz.cloud:443
OTEL_EXPORTER_OTLP_HEADERS=signoz-ingestion-key=<ingestion-key>
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

### 2. Daemon traces

Instrument `agent/scripts/weft_daemon.py` around the existing verification cycle.

Primary trace: `weft.verification_cycle`

Required spans:

| Span | Key attributes |
|---|---|
| `weft.deadline.poll` | `rail`, `pending_count` |
| `weft.milestone.read` | `milestone_hash`, `project_id`, `deadline`, `finalized` |
| `weft.evidence.collect` | `milestone_hash`, `template_id`, `contract_address` |
| `weft.evidence.deployment` | `code_exists`, `code_hash` |
| `weft.evidence.usage` | `unique_callers`, `threshold`, `measurement_window_seconds` |
| `weft.github.collect` | `repo`, `commit_count`, `pr_count`, `configured` |
| `weft.consensus.wait` | `peer_threshold`, `matched_signers`, `consensus_root_enabled` |
| `weft.storage.publish` | `publish_0g`, `bundle_enabled`, `storage_root` |
| `weft.settlement.submit_verdict` | `rail`, `via`, `verified`, `evidence_root` |
| `weft.keeperhub.release` | `attempted`, `status`, `tx_hash` |
| `weft.receipt.writeback` | `rail`, `receipt_schema`, `ok` |

Trace attributes to standardize:

```text
weft.milestone_hash
weft.project_id
weft.template_id
weft.verifier_address
weft.rail              # evm | canton
weft.verified
weft.evidence_root
weft.consensus_root
weft.settlement_via    # keeperhub | cast | canton | fhe
```

### 3. Recovery logs

Extend `agent/lib/recovery.py` so every `RecoveryLog.emit()` also emits an OTel log event when SigNoz is enabled.

Map existing fields directly:

| RecoveryLog field | OTel attribute |
|---|---|
| `event` | `weft.recovery.event` |
| `outcome` | `weft.recovery.outcome` |
| `action` | `weft.recovery.action` |
| `target` | `weft.recovery.target` |
| `latency_ms` | `weft.recovery.latency_ms` |
| `context.*` | `weft.context.*` |

This reuses the existing event taxonomy: `rpc_timeout`, `rpc_fallback`, `peer_offline`, `peer_reroute`, `keeperhub_503`, `keeperhub_retry`, `keeperhub_confirmed`, `consensus_degraded`, `consensus_recovered`, `verdict_submitted`.

### 4. Metrics

Emit these metrics from the daemon and recovery log:

| Metric | Type | Labels |
|---|---|---|
| `weft_agent_plans_total` | counter | `agent`, `outcome` |
| `weft_agent_tool_calls_total` | counter | `tool`, `outcome` |
| `weft_llm_requests_total` | counter | `backend`, `model`, `outcome` |
| `weft_llm_duration_ms` | histogram | `backend`, `model`, `outcome` |
| `weft_llm_tokens_total` | histogram | `backend`, `model` |
| `weft_llm_cost_usd` | histogram | `backend`, `model` |
| `weft_verification_cycles_total` | counter | `rail`, `outcome` |
| `weft_verification_duration_ms` | histogram | `rail`, `verified` |
| `weft_evidence_collection_duration_ms` | histogram | `template_id` |
| `weft_consensus_latency_ms` | histogram | `peer_threshold`, `matched_signers` |
| `weft_keeperhub_executions_total` | counter | `status` |
| `weft_keeperhub_fallback_total` | counter | `reason` |
| `weft_recovery_events_total` | counter | `event`, `outcome` |
| `weft_receipt_writebacks_total` | counter | `rail`, `outcome` |

### 5. Demo dashboard

Create one SigNoz dashboard named `Weft Autonomous Verification`.

Panels:

1. Agent workflow trace count by span name.
2. LLM requests by backend/model/outcome.
3. LLM token and cost trend.
4. Verification cycles by outcome.
5. Verification duration p50/p95.
6. Peer consensus latency.
7. KeeperHub execution and fallback status.
8. Latest failed/degraded recovery logs.

The dashboard should make the demo story obvious without explaining the entire app.

### 6. Alerts

Create three alerts:

| Alert | Condition | Why it matters |
|---|---|---|
| `KeeperHub fallback activated` | `weft_keeperhub_fallback_total > 0` over demo window | Settlement reliability degraded |
| `Peer quorum not reached` | `consensus_degraded` or low `matched_signers` | Trust layer degraded |
| `Repeated verification failure` | failed cycles >= 2 over short window | Capital-release rail is unhealthy |

## Deliverables

- `agent/lib/observability.py`
- Daemon spans around the verification cycle
- RecoveryLog to OTel log export
- Metrics emitted for verification, consensus, KeeperHub, and recovery
- `.env.example` entries for SigNoz/OTel
- `docs/signoz-hackathon-scope.md`
- `docs/submissions/signoz-hackathon.md` with final submission copy
- Screenshot or public link to the SigNoz dashboard
- Short demo video showing:
  1. a verification run,
  2. SigNoz trace waterfall,
  3. recovery/chaos event logs,
  4. alert firing or alert rule,
  5. verdict/audit artifact.

## SigNoz deployment path

Use SigNoz Cloud for active development and demos. This keeps local machines Docker-free
while still exercising the real SigNoz UI, Query Builder, dashboards, alerts, and hosted
OTLP ingestion.

```bash
python3 -m venv .venv-signoz
.venv-signoz/bin/python -m pip install -r requirements-signoz.txt

export WEFT_OBSERVABILITY=signoz
export OTEL_SERVICE_NAME=weft-daemon
export OTEL_RESOURCE_ATTRIBUTES=service.name=weft-daemon,deployment.environment=demo
export OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.us2.signoz.cloud:443
export OTEL_EXPORTER_OTLP_HEADERS=signoz-ingestion-key=<ingestion-key>
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export WEFT_OTEL_EXPORT_TIMEOUT=3

.venv-signoz/bin/python agent/scripts/weft_signoz_smoke.py
```

After the smoke event appears in SigNoz, emit the scenarios needed to populate panels and
prove the alert rules:

```bash
.venv-signoz/bin/python agent/scripts/weft_signoz_smoke.py --scenario verified --repeat 3
.venv-signoz/bin/python agent/scripts/weft_signoz_smoke.py --scenario rejected
.venv-signoz/bin/python agent/scripts/weft_signoz_smoke.py --scenario fallback
.venv-signoz/bin/python agent/scripts/weft_signoz_smoke.py --scenario degraded
```

Then run the daemon against the real demo milestone:

```bash
.venv-signoz/bin/python agent/scripts/weft_daemon.py --once
```

### SigNoz MCP/API access

The SigNoz service-account API key is separate from telemetry ingestion:

| Use | Credential | Endpoint |
|---|---|---|
| Send traces, metrics, and logs | Ingestion key | `https://ingest.us2.signoz.cloud:443` |
| Query SigNoz or connect MCP | Service-account API key | `https://mcp.us2.signoz.cloud/mcp` |

The Weft service account validates against `https://modest-mosquito.us2.signoz.cloud`, but
its role assignment must allow the intended action. Use `signoz-viewer` for MCP read/query
workflows and `signoz-editor` if the assistant/API needs to create dashboards or alerts.

Validation on July 24, 2026:

- Service-account API key authentication returned `200` for `/api/v1/service_accounts/me`.
- The service account identity is `weft@signozserviceaccount.com`.
- Querying `weft_verification_cycles_total` returned `403` because the service account is
  not authorized for `metrics:read` on `builder_query/*`.
- Assign `signoz-viewer` at minimum before MCP/query debugging; assign `signoz-editor` if
  MCP/API should create dashboards or alert rules.
- The ingestion key successfully accepted the smoke telemetry export path; no key material
  is stored in this repository.
- A clean validation trace is available under `weft.milestone_hash = '0xwinningagent2'`.
  SigNoz returned these span counts from the Traces API: `weft.agent.tool_call=2`,
  `weft.agent.plan=1`, `weft.llm.chat=1`, `weft.verification_cycle=1`,
  `weft.evidence.deployment=1`, and `weft.evidence.usage=1`.

## Foundry reproducibility package

The repository includes `casting.yaml` and the generated `casting.yaml.lock` for a
reproducible Docker Compose deployment with the SigNoz MCP server enabled. This is submission
packaging for judges and cloud/VM reruns, not a local development dependency. On a Docker-capable
host, run:

```bash
foundryctl cast -f casting.yaml
```

Use `http://localhost:8080` for the SigNoz UI and `http://localhost:4318` as the daemon's
OTLP HTTP endpoint. Foundry generates `pours/` on that host; it is intentionally ignored
because the checked-in manifest and lock file are the reproducible source of truth.

## Acceptance criteria

- Running the daemon with no OTel packages installed still works.
- Running with `WEFT_OBSERVABILITY=signoz` exports at least one trace containing the primary verification spans.
- Recovery events appear as searchable logs in SigNoz.
- Metrics are visible in the dashboard.
- At least one alert rule is configured and shown in the demo.
- No verifier decision logic changes.

## Suggested implementation order

1. Add no-op observability helpers.
2. Wire `RecoveryLog.emit()` to OTel logs and `weft_recovery_events_total`.
3. Add high-level daemon trace spans first; avoid over-instrumenting internal helpers.
4. Add metrics for cycle duration and KeeperHub outcomes.
5. Run the smoke emitter against SigNoz Cloud, then one demo verification.
6. Build dashboard and alerts from the emitted data.
7. Record the demo.

## Timebox

| Work | Target |
|---|---:|
| Observability helper | 1.5h |
| Recovery logs + metrics | 1.5h |
| Daemon spans | 2.5h |
| Env/docs/submission copy | 1h |
| Dashboard + alerts | 2h |
| Demo recording | 1h |

Total: ~9.5 hours if SigNoz access is ready.

## Risk

| Risk | Mitigation |
|---|---|
| OTel dependency churn | Keep all imports lazy and optional |
| Too many spans | Instrument the cycle, not every helper |
| Dashboard setup takes longer than code | Use one dashboard with eight panels max |
| SigNoz access/key issue | Fall back to a temporary Docker-capable VM running Foundry, or record local traces through Collector |
| Hackathon requires specific `casting.yaml` files | Treat Foundry/casting files as submission packaging, not app architecture |
