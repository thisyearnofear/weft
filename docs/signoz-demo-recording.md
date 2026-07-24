# SigNoz Demo Recording Guide

Three-minute submission video for **Agents of SigNoz — Track 01: AI & Agent Observability**.

Judging lens: potential impact, creativity, technical excellence, best use of SigNoz, UX, presentation quality.

## Before recording

```bash
# Telemetry pack (ingestion key)
export WEFT_OBSERVABILITY=signoz
export OTEL_EXPORTER_OTLP_HEADERS='signoz-ingestion-key=<ingestion-key>'
export OTEL_EXPORTER_OTLP_ENDPOINT='https://ingest.us2.signoz.cloud:443'
agent/scripts/weft_signoz_demo.sh

# Dashboard + alerts (service-account API key)
export SIGNOZ_ENDPOINT='https://modest-mosquito.us2.signoz.cloud'
export SIGNOZ_ACCESS_TOKEN='<service-account-api-key>'
agent/scripts/weft_signoz_provision.sh   # writes frontend/.env.local
```

Open browser tabs:

1. `https://weft.thisyearnofear.com/observability` (defaults to guided mode now)
2. SigNoz traces explorer with winning filter
3. SigNoz dashboard `Weft Autonomous Agent Observatory`
4. SigNoz alerts list
5. `https://weft.thisyearnofear.com/operations`

## Shot list (~3:00)

| Time | Scene | What to say / show |
|---|---|---|
| 0:00–0:20 | Problem | "If an AI agent can release capital, it cannot be a black box. Weft verifies milestones with deterministic evidence — the LLM narrates, it does not decide." |
| 0:20–0:45 | `/observability` Act 1 | The page defaults to guided mode. Show Act 1 (Problem): hero copy, trace filter, proof panel with live span counts. Point at "SigNoz connected" badge. Click **Run demo trace** — show the pulse animation + CountUp refresh. |
| 0:45–1:15 | `/observability` Act 2 | Click Act 2 teaser (it expands). Show the trace waterfall: plan → tools → LLM → evidence → cycle. Show the agent receipt with LLM model, tokens, cost. |
| 1:15–1:45 | SigNoz trace | Switch to SigNoz. Expand `weft.verification_cycle` for `0xwinningagent2`. Show nested spans: `weft.agent.plan`, `weft.agent.tool_call`, `weft.llm.chat` with token/cost attrs, `weft.evidence.*`. |
| 1:45–2:10 | SigNoz dashboard | Open **Weft Autonomous Agent Observatory**. Pan the 8 panels: workflow spans, LLM requests/cost, outcomes, tool calls, peer consensus, KeeperHub status, recovery events. Note the 24h sparklines. |
| 2:10–2:30 | SigNoz alerts | Show alert rules: KeeperHub fallback, peer quorum degraded, LLM narrative failures. Point at the filter strings. |
| 2:30–2:50 | `/observability` Act 3 + `/operations` | Back to Weft. Expand Act 3 (Operations): 8 live MetricCards with sparklines, 3 alert rules. Then switch to `/operations` — show the agent's financial ledger, verification log, and infrastructure health. |
| 2:50–3:00 | Close | "Observable agent. Deterministic verdict. Defensible capital release." Show the AgentHelper at the bottom — "anyone can ask the agent questions." Show repo link. |

## B-roll (optional, 15s each)

- `/explorer` — FHE demo milestones with chain badges
- `/create-milestone` — the wizard intro step + AgentHelper sidebar
- `/confidential` — sealed ballot → decrypt result flow
- AgentHelper on any page — click an FAQ, show the agent's answer

## Screenshots for submission form

Capture PNGs of:

1. `/observability` Act 1 — hero + proof panel with live counts
2. `/observability` Act 2 — trace waterfall + agent receipt
3. `/observability` Act 3 — 8 MetricCards with sparklines
4. SigNoz waterfall for `0xwinningagent2`
5. Full SigNoz dashboard (all 8 panels)
6. SigNoz alerts list with Weft rules
7. `/operations` — financial ledger + verification log

## Key URLs

- Live site: https://weft.thisyearnofear.com
- Observatory (guided): https://weft.thisyearnofear.com/observability
- Observatory (present mode): https://weft.thisyearnofear.com/observability?guided=1&present=1
- Operations: https://weft.thisyearnofear.com/operations
- Explorer: https://weft.thisyearnofear.com/explorer
- Create milestone: https://weft.thisyearnofear.com/create-milestone
- Private SigNoz dashboard: https://modest-mosquito.us2.signoz.cloud/dashboard/019f939c-cffa-7134-a7ee-9622693ec4fb

## Winning trace filter

```text
service.name = 'weft-daemon' AND weft.milestone_hash = '0xwinningagent2'
```

## One-line thesis (for form description)

> Weft makes an autonomous capital-release agent fully debuggable in SigNoz — plan, tool calls,
> LLM cost, deterministic evidence, recovery, and settlement — while keeping payment decisions
> off the LLM.
