# Agents of SigNoz Submission

## Track

Track 01: AI & Agent Observability

## Project

Weft: an observable autonomous verifier for milestone-based capital release.

## Thesis

If an AI agent can release capital, it cannot be a black box.

Weft verifies milestone claims with deterministic evidence rules, not LLM judgment. The LLM
is allowed to narrate, but the payment decision comes from auditable checks: deployment
evidence, usage evidence, verifier quorum, and settlement execution. SigNoz makes that entire
agent workflow inspectable: plan, tool calls, LLM narrative step, deterministic evidence,
recovery events, and final verdict path.

## What SigNoz Shows

- Trace waterfall for `weft.verification_cycle`
- AI-agent planning span for the verifier workflow
- Tool-call spans for chain evidence collection
- LLM span with model, token, latency, and cost attributes for narrative generation
- Evidence spans for deployment and usage checks
- Peer quorum latency and degraded-consensus events
- KeeperHub execution status and fallback events
- Recovery logs for degraded infrastructure paths
- Metrics dashboard for verification outcomes, latency, consensus, settlement, and recovery
- Alerts for KeeperHub fallback, peer quorum failure, and repeated verification failures

## User Experience

Weft includes an Agent Observatory page at `/observability`. It translates the SigNoz trace
into the user-facing audit story: what the agent planned, which tools it called, what the LLM
did, which deterministic evidence checks passed, and why the verdict path was safe.

SigNoz remains the deep inspection layer. Weft is the receipt and explanation layer for users
who need to trust an autonomous agent with money.

## Why This Fits

Weft is not adding observability as a badge. Observability is the product argument: the agent
does not ask users to trust an opaque LLM decision. It shows the deterministic evidence,
the verifier swarm agreement, the LLM narrative layer, the settlement route, and the recovery
path in one SigNoz view.

This directly matches the hackathon mission: when latency spikes, tool calls fail, LLM costs
rise, or an agent degrades under infrastructure pressure, SigNoz shows where and why.

## Demo Proof

The demo trace `weft.milestone_hash = '0xwinningagent2'` is queryable in SigNoz and shows:

- `weft.agent.plan`
- `weft.agent.tool_call`
- `weft.llm.chat`
- `weft.verification_cycle`
- `weft.evidence.deployment`
- `weft.evidence.usage`

Dashboard build notes are in `docs/signoz-dashboard-build-sheet.md`.

Provision the live dashboard and alerts (OpenTofu or Terraform):

```bash
brew install opentofu   # or hashicorp/tap/terraform
export SIGNOZ_ENDPOINT='https://modest-mosquito.us2.signoz.cloud'
export SIGNOZ_ACCESS_TOKEN='<service-account-api-key>'
agent/scripts/weft_signoz_provision.sh
```

The provision script writes `NEXT_PUBLIC_SIGNOZ_INSTANCE_URL` and
`NEXT_PUBLIC_SIGNOZ_DASHBOARD_URL` into `frontend/.env.local` for `/observability` deep links.

Infrastructure definitions: [`signoz/terraform/`](../../signoz/terraform/).

The demo data can be regenerated with:

```bash
agent/scripts/weft_signoz_demo.sh
```

Record the submission demo with `docs/signoz-demo-recording.md`.

## Reproducibility

The repository includes `casting.yaml` and `casting.yaml.lock` for judge reruns with Foundry.
For active development, Weft can send OpenTelemetry directly to SigNoz Cloud without requiring
local Docker. The SigNoz MCP server can be connected with a service-account API key for
querying traces, logs, metrics, dashboards, and alerts during the demo.

## Why It Matters

Program officers and funders do not need a raw observability backend in their daily workflow.
They need a defensible receipt when a grant tranche releases or stays locked. Weft uses SigNoz
to make the autonomous verifier debuggable, then turns that debug trail into a human audit
artifact: the agent's plan, evidence, tool calls, LLM narrative behavior, recovery path, and
settlement result.

## AI Assistant Disclosure

AI assistants were used during planning, code implementation, and documentation. The project
logic, architecture decisions, and final submission materials remain the team's responsibility.
