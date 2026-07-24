# SigNoz Winning Position

## Current Score

| Dimension | Current | Target | Remaining |
|---|---:|---:|---|
| Technical SigNoz depth | 9/10 | 9/10 | Demo video + submission screenshots |
| Docs and submission narrative | 9/10 | 9/10 | Attach screenshots to hackathon form |
| UI/UX reflection | 9/10 | 9/10 | Rebuild/deploy frontend after `weft_signoz_provision.sh` |
| Real user usefulness | 8/10 | 9/10 | Tie SigNoz proof to Canton/GMS receipt in demo close |

## What Makes It Stand Out

Most hackathon projects will show traces for an app. Weft shows traces for an autonomous
agent that can decide whether capital releases.

The strong angle:

> The LLM is observable, but it does not decide. SigNoz proves exactly where the LLM sits in
> the workflow and where deterministic evidence takes over.

## Judge Demo Flow

1. Open `/observability`.
2. Click **Open winning trace** (pre-filtered SigNoz explorer).
3. Expand `weft.verification_cycle` for `0xwinningagent2` and show nested spans.
4. Open **Weft Autonomous Agent Observatory** dashboard (via provision script output).
5. Show the three alert rules in SigNoz alerts.
6. Return to `/operations` for the user-facing audit surface.

Full shot list: [`docs/signoz-demo-recording.md`](signoz-demo-recording.md)

## Provisioning Checklist

- [x] `agent/scripts/weft_signoz_demo.sh` — emits winning trace + scenario pack
- [x] `agent/scripts/weft_signoz_provision.sh` — OpenTofu/Terraform dashboard + 3 `signoz_rule` alerts
- [x] Live dashboard: **Weft Autonomous Agent Observatory** on SigNoz Cloud
- [ ] Screenshot: traces waterfall for `0xwinningagent2`
- [ ] Screenshot: dashboard with all 8 panels
- [ ] Screenshot: alerts list
- [ ] Screenshot: `/observability` + `/operations`
- [ ] Record 3-minute demo video (`docs/signoz-demo-recording.md`)
- [ ] Submit to Agents of SigNoz form (Track 01)

Provision writes `NEXT_PUBLIC_SIGNOZ_*` into `frontend/.env.local` automatically. Rebuild or
restart the frontend dev server to pick up dashboard deep links on `/observability`.

## User Value

The actual user does not buy SigNoz. They buy confidence that an autonomous capital-release
agent can explain itself. SigNoz gives Weft the ground truth; Weft turns that into a receipt
that a program officer, funder, or builder can understand.
