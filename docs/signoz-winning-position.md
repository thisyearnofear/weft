# SigNoz Winning Position

## Current Score

| Dimension | Current | Target | Gap |
|---|---:|---:|---|
| Technical SigNoz depth | 8.5/10 | 9/10 | Dashboard + alerts need screenshots/public proof |
| Docs and submission narrative | 8.5/10 | 9/10 | Final demo artifacts and links still need adding |
| UI/UX reflection | 8/10 | 9/10 | `/observability` exists; record it in the demo flow |
| Real user usefulness | 8/10 | 9/10 | Convert SigNoz proof into receipts inside program workflows |

## What Makes It Stand Out

Most hackathon projects will show traces for an app. Weft shows traces for an autonomous
agent that can decide whether capital releases.

The strong angle:

> The LLM is observable, but it does not decide. SigNoz proves exactly where the LLM sits in
> the workflow and where deterministic evidence takes over.

## Judge Demo Flow

1. Open `/observability`.
2. Show the validated trace filter: `weft.milestone_hash = '0xwinningagent2'`.
3. Open SigNoz and show the trace waterfall with:
   - `weft.agent.plan`
   - `weft.agent.tool_call`
   - `weft.llm.chat`
   - `weft.verification_cycle`
   - `weft.evidence.deployment`
   - `weft.evidence.usage`
4. Show the dashboard panels from `docs/signoz-dashboard-build-sheet.md`.
5. Trigger or show alert rules for KeeperHub fallback, peer quorum degradation, and LLM failure.
6. Return to `/operations` to show the user-facing agent audit surface.

## User Value

The actual user does not buy SigNoz. They buy confidence that an autonomous capital-release
agent can explain itself. SigNoz gives Weft the ground truth; Weft turns that into a receipt
that a program officer, funder, or builder can understand.
