# SigNoz Winning Position

## Current Score

| Dimension | Score | Evidence |
|---|---:|---|
| Potential Impact | 9/10 | Agent that releases capital + observability = the hackathon thesis made concrete |
| Creativity & Innovation | 9/10 | No other entry combines capital escrow + FHE sealed ballots + SigNoz traces |
| Technical Excellence | 9/10 | Real onchain contracts, real SigNoz API, FHE on Sepolia, 0 lint errors, clean build |
| Best Use of SigNoz | 8/10 | Traces, time series, alerts, LLM spans, dashboard. Could go deeper with MCP. |
| User Experience | 9/10 | Progressive disclosure on all pages, AgentHelper, plain-language headers, demo/real demarcation |
| Presentation Quality | 7/10 | Docs ready, demo guide updated. Video not yet recorded. |

## What Makes It Stand Out

Most hackathon projects will show traces for an app. Weft shows traces for an autonomous
agent that can decide whether capital releases.

The strong angle:

> The LLM is observable, but it does not decide. SigNoz proves exactly where the LLM sits in
> the workflow and where deterministic evidence takes over.

## What changed in the UX pass

- Every page uses `ActSection` + `Reveal` for progressive disclosure (3-act narrative, not dashboard dumps)
- `/observability` defaults to guided mode — non-active acts collapse to clickable teasers
- All 9 pages have `AgentHelper` (contextual FAQ + chat input via `/api/chat`)
- Plain-language headers everywhere (no "swarm", "wedge", "post-award ops")
- `DemoBadge` on synthetic data, `DemoBridge` CTA to `/create-milestone`
- Nav dropdown fixed (opaque background, not translucent)
- Motion tokens aligned to transitions.dev scale
- `MetricCard` disclosure uses `grid-template-rows` (no clipping)
- `Sparkline` with unique gradient ids per instance
- `signoz.live` means data-in-window, not just configured

## Judge Demo Flow

1. Open `https://weft.thisyearnofear.com` (landing page).
2. Click "Start guided demo" — walks through the full story.
3. Or go directly to `/observability` — defaults to guided 3-act mode.
4. Click "Run demo trace" to emit a real trace and see the pulse + CountUp.
5. Expand Act 2 for the trace waterfall + agent receipt.
6. Expand Act 3 for the 8-panel live dashboard + alerts.
7. Open the SigNoz links to see the ground truth.
8. Visit `/operations` for the agent's financial books.
9. Visit `/create-milestone` to see the wizard + AgentHelper sidebar.

Full shot list: [`docs/signoz-demo-recording.md`](signoz-demo-recording.md)

## Submission checklist

- [x] Live site deployed: https://weft.thisyearnofear.com
- [x] SigNoz dashboard provisioned (8 panels + 3 alerts)
- [x] Demo trace emitter (`weft_signoz_demo.sh`)
- [x] Submission doc: `SUBMISSION-SIGNOZ.md`
- [x] Demo recording guide updated for current UX
- [x] Progressive disclosure on all pages
- [x] AgentHelper on all pages
- [x] Demo/real demarcation (DemoBadge + DemoBridge)
- [ ] Record 3-minute demo video
- [ ] Capture screenshots for submission form
- [ ] Submit to Agents of SigNoz form (Track 01)

## Provisioning

```bash
brew install opentofu   # or hashicorp/tap/terraform
export SIGNOZ_ENDPOINT='https://modest-mosquito.us2.signoz.cloud'
export SIGNOZ_ACCESS_TOKEN='<service-account-api-key>'
agent/scripts/weft_signoz_provision.sh
```

Provision writes `NEXT_PUBLIC_SIGNOZ_INSTANCE_URL` and
`NEXT_PUBLIC_SIGNOZ_DASHBOARD_URL` into `frontend/.env.local` for `/observability` deep links.

Infrastructure definitions: [`signoz/terraform/`](../signoz/terraform/).

## User Value

The actual user does not buy SigNoz. They buy confidence that an autonomous capital-release
agent can explain itself. SigNoz gives Weft the ground truth; Weft turns that into a receipt
that a program officer, funder, or builder can understand.
