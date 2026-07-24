# Weft — Agents of SigNoz Submission (Track 01: AI & Agent Observability)

**If an AI agent can release capital, it cannot be a black box.**

Weft is an autonomous verification agent that checks milestone evidence, reaches
verifier quorum, and releases capital onchain. SigNoz makes every step of that
decision inspectable: planning, tool calls, LLM narrative, deterministic evidence
checks, recovery events, and settlement execution.

| Field | Value |
|---|---|
| **Live site** | https://weft.thisyearnofear.com |
| **Source** | https://github.com/thisyearnofear/weft |
| **Track** | 01 — AI & Agent Observability |
| **SigNoz Cloud** | https://modest-mosquito.us2.signoz.cloud |
| **Winning trace filter** | `service.name = 'weft-daemon' AND weft.milestone_hash = '0xwinningagent2'` |
| **Private dashboard** | https://modest-mosquito.us2.signoz.cloud/dashboard/019f939c-cffa-7134-a7ee-9622693ec4fb |

---

## Try the demo (2 minutes)

1. Open https://weft.thisyearnofear.com/observability — the page defaults to **guided mode** with a 3-act narrative: Problem → Proof → Operations. Click through acts 2 and 3 (they expand when clicked).
2. Click **Run demo trace** — this emits a real OTel trace to SigNoz and polls until it appears. The proof panel pulses and the CountUp stats refresh.
3. Open the **SigNoz trace explorer** link — see the live trace waterfall for `0xwinningagent2` with nested spans: `weft.agent.plan`, `weft.agent.tool_call`, `weft.llm.chat` (with token/cost attrs), `weft.evidence.deployment`, `weft.evidence.usage`, `weft.verification_cycle`.
4. Open the **SigNoz dashboard** link (logged in) — 8 panels with live counts and 24h sparklines.
5. Scroll to the **AgentHelper** at the bottom — click any FAQ for an instant answer from the Weft agent, or ask a free-text question.

For screen recording: add `?guided=1&present=1` to hide nav/footer and show one act at a time.

## What SigNoz shows

The Weft agent emits OpenTelemetry traces for every verification cycle. Each trace contains:

| Span | What it proves |
|---|---|
| `weft.agent.plan` | The agent decided how to verify this milestone |
| `weft.agent.tool_call` | Chain evidence calls (RPC, contract reads) |
| `weft.llm.chat` | LLM narrative generation — model, tokens, latency, cost |
| `weft.verification_cycle` | The full capital-release decision as one trace |
| `weft.evidence.deployment` | Contract code exists at the stated address |
| `weft.evidence.usage` | Unique caller count exceeded threshold |

**The LLM is observable, but it does not decide.** The verdict is deterministic —
deployment + usage evidence gates the result. The LLM span exists so teams can
inspect cost and narrative behavior, not because an LLM is allowed to control
payment. SigNoz proves exactly where the LLM sits in the workflow and where
deterministic evidence takes over.

## What we built on top of SigNoz

The `/observability` page is not an iframe embed — it queries the SigNoz API
directly (`/api/v5/query_range`) and renders the results in a Weft-native UI:

- **Live span counts** — grouped by span name, queried from SigNoz
- **24h time-series sparklines** — real `time_series` queries, not mock data
- **LLM span attributes** — backend, model, input/output tokens, cost, outcome
- **Alert states** — 3 alert rules (KeeperHub fallback, peer quorum degraded,
  LLM narrative failures) with live firing/OK/disabled states
- **Demo fallback** — when SigNoz isn't configured, the page shows synthetic
  data with a visible "Demo snapshot" badge so judges aren't misled
- **Progressive disclosure** — 3-act structure collapses non-active sections to
  teasers; guided mode walks through one act at a time

## The UX layer (what changed for this hackathon)

Every page in the app now has:

- **Plain-language headers** — no jargon, explains what the user is looking at
- **AgentHelper** — contextual FAQ + chat input on all 9 pages, powered by
  the Weft agent's `/api/chat` endpoint
- **Progressive disclosure** — `ActSection` + `Reveal` scroll animation on
  every page; dashboard dumps replaced with narrative arcs
- **Demo/real demarcation** — `DemoBadge` on synthetic data, `DemoBridge` CTA
  linking to `/create-milestone` for real usage
- **Motion system** — transitions.dev-aligned tokens, stagger, CountUp,
  reduced-motion respect, `pulseSuccess` on demo trace completion

## Why this matters

Program officers and funders do not need a raw observability backend in their
daily workflow. They need a defensible receipt when capital releases or stays
locked. Weft uses SigNoz as the ground truth, then turns that debug trail into
a human-readable audit artifact.

The hackathon thesis is "if you can't observe your AI agents, you don't own
them." Weft is the case study: an agent that can move money, with every step
of that decision traced in SigNoz and rendered as a receipt a non-technical
user can read.

## Architecture

```
Builder creates milestone → stakes ETH
        │
        ▼
Deadline passes → Weft daemon polls
        │
        ├─ weft.agent.plan (SigNoz span)
        ├─ weft.agent.tool_call (RPC reads)
        ├─ weft.llm.chat (narrative, tokens, cost)
        ├─ weft.evidence.deployment (code hash check)
        ├─ weft.evidence.usage (unique caller count)
        ├─ weft.verification_cycle (full cycle)
        │
        ▼
2-of-3 verifier quorum → verdict onchain
        │
        ├─ public: submitVerdict() on 0G Chain
        ├─ confidential: FHE.add / FHE.mul on Sepolia
        │
        ▼
Capital releases or refunds → receipt generated
```

## Infrastructure

- **SigNoz Cloud** — `modest-mosquito.us2.signoz.cloud`
- **Provisioning** — `agent/scripts/weft_signoz_provision.sh` (OpenTofu/Terraform)
  creates the dashboard, 3 alert rules, and writes `NEXT_PUBLIC_SIGNOZ_*` env vars
- **Demo trace emitter** — `agent/scripts/weft_signoz_demo.sh` emits real OTel
  traces with the winning milestone hash
- **Dashboard panels** — 8 panels: workflow spans, LLM requests, LLM token cost,
  verification outcomes, tool call outcomes, peer consensus, KeeperHub
  reliability, recovery events

## AI Assistant Disclosure

AI assistants were used during planning, code implementation, and documentation.
The project logic, architecture decisions, and final submission materials remain
the team's responsibility.
