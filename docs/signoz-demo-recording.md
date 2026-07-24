# SigNoz Demo Recording Guide

Three-minute submission video for **Agents of SigNoz — Track 01: AI & Agent Observability**.

Judging lens: potential impact, creativity, technical excellence, best use of SigNoz, UX,
presentation quality.

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

1. `https://weft.thisyearnofear.com/observability`
2. SigNoz traces explorer with winning filter (from `terraform output traces_explorer_url`)
3. SigNoz dashboard `Weft Autonomous Agent Observatory`
4. SigNoz alerts list (show the three Weft rules)
5. `https://weft.thisyearnofear.com/operations`

## Shot list (~3:00)

| Time | Scene | What to say / show |
|---|---|---|
| 0:00–0:25 | Problem | "If an AI agent can release capital, it cannot be a black box. Weft verifies milestones with deterministic evidence — the LLM narrates, it does not decide." |
| 0:25–0:55 | `/observability` | Scroll hero + validated trace filter: `service.name = 'weft-daemon' AND weft.milestone_hash = '0xwinningagent2'`. Point at span waterfall: plan → tools → LLM → evidence → cycle. |
| 0:55–1:35 | SigNoz trace | Switch to SigNoz. Expand `weft.verification_cycle` for `0xwinningagent2`. Show nested spans: `weft.agent.plan`, `weft.agent.tool_call`, `weft.llm.chat` with token/cost attrs, `weft.evidence.*`, `weft.keeperhub.release`. |
| 1:35–2:05 | Dashboard | Open **Weft Autonomous Agent Observatory**. Pan the 8 panels: workflow spans, LLM requests/cost, outcomes, tool calls, peer consensus, KeeperHub status, recovery logs. |
| 2:05–2:25 | Alerts | Show alert rules firing or in OK state. Highlight KeeperHub fallback + peer quorum degraded + LLM failure rules tied to real filters. |
| 2:25–2:45 | `/operations` | Return to Weft. Show SigNoz proof panel + recovery timeline. "SigNoz is the ground truth; Weft is the receipt users actually read." |
| 2:45–3:00 | Close | "Observable agent. Deterministic verdict. Defensible capital release." Show repo + submission link. |

## B-roll (optional, 15s each)

- `agent/scripts/weft_signoz_demo.sh` terminal output
- `/canton` receipt writeback (institutional user value)
- Explorer confidential milestone (FHE wedge)

## Screenshots for submission form

Capture PNGs of:

1. `/observability` hero + trace filter
2. SigNoz waterfall for `0xwinningagent2`
3. Full dashboard (all 8 panels visible or stitched)
4. Alerts list with Weft rules
5. `/operations` SigNoz proof panel

Store under `docs/submissions/signoz-screenshots/` (gitignored if large) or attach directly
to the hackathon submission.

## Winning trace filter

```text
service.name = 'weft-daemon' AND weft.milestone_hash = '0xwinningagent2'
```

## One-line thesis (for form description)

> Weft makes an autonomous capital-release agent fully debuggable in SigNoz — plan, tool calls,
> LLM cost, deterministic evidence, recovery, and settlement — while keeping payment decisions
> off the LLM.
