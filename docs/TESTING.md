# Weft — Verification & TestSprite

> How this repository proves itself. The suite runs in the cloud against the
> **live deployment** on every pull request, and the write → verify → fix →
> rerun loop is logged iteration by iteration in [`../LOOP.md`](../LOOP.md).
> This doc is the current contract; `LOOP.md` is the historical record.

---

## The shape of it

| | |
|---|---|
| **Live target** | `https://weft.persidian.com` |
| **Portal projects** | frontend `38b4b7d0-d18b-444c-92f7-df7991478e67` + backend `350ab61a-0d30-4cdc-a64c-49991d8a0015` — see the id reconciliation note below |
| **Config** | `.testsprite/config.json` |
| **Frontend suite** | `.testsprite/plans/` — 14 plans (tracked) |
| **Backend suite** | `.testsprite/backend/` — 8 exported Python modules (tracked) |
| **CI** | `.github/workflows/testsprite.yml` — `pull_request` to `main`; runs both suites; downloads failure bundles; uploads them plus the MCP test report as artifacts |
| **CI helpers** | `.testsprite/ci/collect_run_ids.py` (run ids → TSV), `.testsprite/ci/check_summary.py` (fail the build), and `.testsprite/ci/check_assertions.py` (fail on silent passes — a `passed` run that executed zero assertion steps) |
| **Agent wiring** | `.claude/skills/testsprite-onboard`, `.claude/skills/testsprite-verify`, and a `TESTSPRITE AGENT SECTION` block in [`../AGENTS.md`](../AGENTS.md) — coding agents auto-discover the loop without being told |
| **Last full run** | **14/14 frontend** on deterministic `--no-auto-heal` replay of pinned code, plus 8 backend modules |

> **Live-host note.** The current live host is `weft.persidian.com`. Several
> archived documents still cite `weft.thisyearnofear.com`, which no longer
> resolves. Use `weft.persidian.com` in anything new.

## Why the suite exists in this shape

The product thesis is: **deterministic evidence rules decide, the LLM only
narrates.** A payment decision must be auditable, so nothing in the
verification path may be a model judgement.

The test suite is that thesis expressed as assertions. There is no "does the
copy feel right" test. Every assertion is about something deterministic:
schema shape, numeric correctness, a value appearing in two places that must
agree, a page surviving fault injection.

#### Runs replay pinned code, not re-authored intent

TestSprite's default frontend run is **agentic**: a model interprets the
test's `description` + `planSteps` and improvises — it can merge steps, take
a wrong turn, or drop every assertion while still reporting `passed` (a
silent pass; the CI guard exists because we observed exactly that). To make
the verdict path deterministic — same thesis as the product — each test
carries **pinned Playwright code** (`.testsprite/code/<slug>.py`, pushed with
`testsprite test code put`) and CI runs with `--no-auto-heal`, which replays
the stored code verbatim. Every `expect()` executes on every run; nothing is
left to the model. `.testsprite/plans/` remains the human-readable spec;
`.testsprite/code/` is what actually executes.

Three layers keep a silent pass from ever reaching green: pinned code replay
(`--no-auto-heal`), structured plan steps (deterministic for the agentic
path too), and `check_assertions.py`, which fetches each passed run's step
list — and falls back to the stored code for replay runs, which leave no
step trail — and fails the build if no assertion executed.

## What the suite covers

### Frontend — 14 plans

| Plan | What it proves |
|---|---|
| `landing-loads` | The landing surface renders its hero and the milestone input |
| `explorer-loads` | The Verification Explorer renders its table and a Verified row |
| `operations-loads` | KPI cards, the ledger with a KeeperHub tx, the verification log with ENS, infra health |
| `sponsor-dashboard` | Total Funded, Capital Released, the capital-flow bar, funded milestone cards |
| `activity-feed` | Chronological feed: timestamped, Revenue event, Milestone event |
| `verifiers-network` | Authorised nodes, votes cast, consensus agreement rate, peer inbox |
| `api-docs-page` | The interactive API reference: title, endpoint listings, GET badges, try-it links |
| `builder-profile` | ENS identity, trust signal, verified outcome count |
| `treasury-widget` | Agent revenue and cost ledger |
| `demo-milestone-lookup` | A milestone hash resolves to its detail page |
| **`api-contract`** | Five endpoints cross-checked: every response is valid JSON with the expected schema fields |
| **`e2e-user-journey`** | landing → explorer → milestone detail → builder profile, as one journey |
| **`chaos-resilience`** | The recovery page and recovery API: zero failures, summary + chaos + failures returned |
| **`onchain-crosscheck`** | Explorer data and milestone detail **agree** — the same hash, the same `Verified` state, the same amount on both |

The last four are the ones that carry the weight. A page can render and still be
wrong; a schema can validate and still be inconsistent with the chain. Those
four check the properties that a screenshot cannot.

#### The pinned live fixture

The cross-check plans assert against one stable, live milestone so the
expected values are not guesses:

| Field | Value |
|---|---|
| Milestone hash | `0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f` |
| Detail URL | `https://weft.persidian.com/project/0x516975…afb1c16f` |
| Heading | `Weft demo milestone` |
| Status | `VERIFIED` |
| Amount | `0.0100 ETH` |
| Builder ENS | `weft.thisyearnofear.eth` |

The explorer table carries the same ENS, so the cross-check is a genuine
two-surface agreement check rather than two independent assertions.

### Backend — 8 Python modules

`test_activity_api.py`, `test_explorer_api.py`, `test_explorer_stake_value.py`,
`test_milestone_detail_api.py`, `test_operations_api.py`, `test_sponsor_api.py`,
`test_treasury_api.py`, `test_verifiers_api.py` — schema validation plus value
cross-checks for every REST endpoint, run in the TestSprite cloud sandbox.

## The loop, and the iteration that proved it

`LOOP.md` records **34 iterations** — maker, what ran, what broke, what got
fixed. Iteration 19 is the one that matters, and it is deliberately
constructed:

> We wrote a backend test asserting that `stakedEth` in the explorer API was
> converted from wei to ETH. Then we **intentionally broke the conversion** —
> removed `/ 1e18` so the API returned `10000000000000000` instead of
> `0.0100`. Deployed the buggy version. TestSprite caught it:
>
> `stakedEth (10000000000000000) equals raw totalStaked (10000000000000000) —
> wei-to-ETH conversion is broken`
>
> We restored `(Number(data.totalStaked) / 1e18).toFixed(4)`, deployed, reran
> the test → **passed**.

That is the complete write → verify → fix → rerun cycle, proven with a bug we
planted on purpose — so nobody can claim the loop was never actually closed.

Two more iterations worth knowing about:

- **iter 17** — installed the TestSprite agent skill for Claude and Codex, so the
  loop is discoverable by any coding agent that opens the repo. The skills are
  in `.claude/skills/testsprite-onboard` and `.claude/skills/testsprite-verify`,
  and the agent section is in `AGENTS.md`.
- **iter 22** — a reliability pass driven by the suite: a `fetchWithTimeout`
  utility (10 s `AbortController`) applied to all ten API routes, React Query
  defaults (`staleTime` 60 s, `retry` 2 with exponential backoff,
  `refetchOnWindowFocus: false`), and a route-level `error.tsx` boundary.

### A note on TestSprite's `blocked` status

Several iterations report `status=blocked` while every assertion was verified.
The loop log records the cause: it is a **runner quirk on click-then-assert
flows**, not a product failure — the assertions pass, the status does not. Read
the assertion results, not the status alone. The failure bundle in
`.testsprite/failure/` is one of these, and it carries `video.mp4` plus
`steps/` HTML snapshots and per-step JSON evidence.

## Running it

```bash
npm install -g @testsprite/testsprite-cli
testsprite --version && testsprite auth whoami

# Frontend — run a plan (creates/registers the test, then runs it)
testsprite test create --plan-from .testsprite/plans/explorer-loads.plan.json \
  --run --wait --target-url https://weft.persidian.com --timeout 600 --output json

# Frontend — the whole project
testsprite test run --all \
  --project 38b4b7d0-d18b-444c-92f7-df7991478e67 \
  --target-url https://weft.persidian.com \
  --wait --max-concurrency 4 --timeout 1800 --output json

# Backend — wave-ordered batch
testsprite test run --all \
  --project 350ab61a-0d30-4cdc-a64c-49991d8a0015 \
  --wait --max-concurrency 4 --timeout 1800 --output json

# Artifacts — addressed by RUN id, not by test id
testsprite test artifact get <run-id> --out ./.testsprite/runs/<run-id>/
```

`--target-url` must be publicly reachable — the sandbox does not test localhost.

### Batch output is not one clean JSON document

`testsprite test run --all --output json` writes a human-readable preamble
(`idempotency-key: ...`, `Dispatched N tests.`) before the JSON, and appends a
**second** JSON object carrying the CLI error envelope when the batch had
failures. A plain `json.load()` on the file therefore raises. The CI helpers
in [`../.testsprite/ci/`](../.testsprite/ci/) handle this:

```bash
# TSV: run_id \t test_id \t status \t source_file
python3 .testsprite/ci/collect_run_ids.py frontend-run.json backend-run.json

# Exit 1 if any test failed, timed out, or the report is missing/unparseable
python3 .testsprite/ci/check_summary.py frontend-run.json backend-run.json
```

### CI configuration

The workflow at [`../.github/workflows/testsprite.yml`](../.github/workflows/testsprite.yml)
needs three repository settings:

| Kind | Name | Value |
|---|---|---|
| **Secret** | `TESTSPRITE_API_KEY` | TestSprite API key |
| **Variable** | `TESTSPRITE_FRONTEND_PROJECT_ID` | `38b4b7d0-d18b-444c-92f7-df7991478e67` |
| **Variable** | `TESTSPRITE_BACKEND_PROJECT_ID` | `350ab61a-0d30-4cdc-a64c-49991d8a0015` |

The workflow fails fast with an explicit `::error::` when any of the three is
missing, rather than silently skipping a suite.

## Known gap: three project ids, one live target

There are four TestSprite project ids in play, and only two of them are
runnable. They are recorded in `.testsprite/config.json` and echoed here so
there is one authoritative answer to "which id do I use?":

| Role | Project id | Runnable? |
|---|---|---|
| **Frontend** (CI + local runs) | `38b4b7d0-d18b-444c-92f7-df7991478e67` | ✅ yes — use this |
| **Backend** (CI + local runs) | `350ab61a-0d30-4cdc-a64c-49991d8a0015` | ✅ yes — use this |
| Legacy frontend (S3-era) | `6121d8fe-a142-48e1-8522-585c22f6099d` | ❌ no |
| MCP mirror (view-only) | `43bfaf67-931e-4d7f-b5c0-0063a9ade62f` | ❌ no — read-only |

The frontend project id **in `.testsprite/config.json` is not the one recorded
in `LOOP.md`**. CI reads both frontend and backend ids from repository
variables rather than from the config file, so the two must be kept in sync by
hand. Before using this setup for anything that checks account ownership,
reconcile which id is authoritative and record the answer. See
[`hackathons.md`](./hackathons.md) § 7.

### How to keep the stored tests in sync with the plan files

The TestSprite V2 execution engine **re-authors a test's steps from its
`description`**, so editing a plan file's `planSteps` alone does nothing to an
already-registered test. Two commands keep the portal in sync with the repo:

```bash
# 1. push the plan's description (this is what the engine turns into steps)
testsprite test update <test-id> --description "<description>"

# 2. push the plan's explicit planSteps (deterministic steps win over re-authoring)
testsprite test plan put <test-id> --steps plan-steps.json --force
```

`plan put` takes a file shaped `{"planSteps": [...]}`; `--force` replaces
steps that were previously edited into the prose-only form. Doing both, for
every plan, is what keeps a registered test faithful to its plan file — see
[`../.testsprite/plans/`](../.testsprite/plans/).

What actually runs in CI is the **pinned code**, so after changing a plan you
must also regenerate and push it:

```bash
# 3. push the deterministic Playwright code the runner replays verbatim
testsprite test code put <test-id> --code-file .testsprite/code/<slug>.py --force
```

## What the suite does not cover

- **No Canton coverage.** The Canton post-award rail is the primary commercial
  surface and is not in the suite. `canton/` has its own docs and a separate
  pilot plan.
- **The `/create-milestone` builder wedge and the Zama FHE confidential
  contracts** are not covered by the current plan set.
- **The suite proves deployed behaviour at run time, not the commit that
  produced it.** The run id in a PR is the evidence; keep the artifact.
- **The 0G Testnet surfaces carry demo data**, not production money. The
  README says so; the suite asserts what is rendered, not that a testnet
  contract holds real value.

## Related

- [`../LOOP.md`](../LOOP.md) — the write → verify → fix log (34 iterations)
- [`hackathons.md`](./hackathons.md) — submission archive
- [`submissions/testsprite-s3-discord-post.md`](./submissions/testsprite-s3-discord-post.md) — the S3 post, and the closest thing to a template for an S4 one
- [`../AGENTS.md`](../AGENTS.md) — technical reference
- [`product-plan.md`](./product-plan.md) — product plan and monetization
