# TestSprite S3 — The Verifier's Ledger

**Hackathon:** TestSprite Season 3 — CLI Launch & Loop Engineering
**Dates:** Jun 30 – Jul 7, 2026
**Prize pool:** $5,000 (5 project winners + $2,000 CLI improvement bounty)
**Live site:** https://weft.thisyearnofear.com
**Repo:** https://github.com/thisyearnofear/weft

---

## The Thesis

Weft is a verification business — it locks capital behind builder milestones,
verifies the work with AI agent nodes, and releases payment when consensus is
reached. But a verification business that can't show its own work isn't
trustworthy.

So we're building **the Verifier's Ledger**: a public audit surface where anyone
can browse every milestone Weft verified, inspect the agent's operational
ledger, and check builder reputations. And we're building it using a
verification loop — the TestSprite CLI checks every line our agent writes,
catches real bugs, and makes us fix them before they ship.

**The verifier was verified. The loop is the product.**

---

## Eligibility Checklist

| Requirement | Status |
|---|---|
| TestSprite CLI installed | Install on Jul 1 |
| Public URL (no localhost) | ✅ weft.thisyearnofear.com |
| Public repo | ✅ github.com/thisyearnofear/weft |
| Agent-written LOOP.md | Generate during the week from commit + run history |
| README with app + live URL | Update Jul 7 |
| Demo video (optional) | If time permits |
| TestSprite wired into CI/CD | +5 innovation bonus — add `.github/workflows/testsprite.yml` |

---

## Judging Rubric Alignment

| Criterion | Pts | How we score |
|---|---|---|
| Project Quality | 40 | Three new production surfaces on a live site: `/explorer`, `/operations`, `/builder/[ens]` |
| Loop Quality | 40 | Real write→verify→fix→rerun cycles logged in LOOP.md, backed by commits + TestSprite runs |
| Innovation | 20 | Meta-narrative: a verification business built with a verification loop. +5 for CI/CD wiring |
| Engagement | ∞ | Discord polls, X shares, long-form write-up |

---

## What We're Building

Three new web surfaces, all HTTP-testable by TestSprite. Each is backed by a
REST API endpoint and a Next.js page.

### 1. Verification Explorer (`/explorer`)

A public registry of every milestone Weft has touched.

**Page:** `/explorer`
- Filterable table: status (pending/verified/released/refunded), builder, sponsor, stake amount, deadline
- Per-milestone detail: evidence breakdown, verifier votes, evidence root, 0G bundle link
- Onchain cross-check: live RPC call confirming the onchain state matches what the page displays

**API:** `/api/explorer/milestones`
- `GET /api/explorer/milestones` — list all known milestones (from local attestation cache + onchain scan)
- `GET /api/explorer/milestones/[hash]` — single milestone detail with evidence

**Why it enhances the product:** Right now you can only look up a milestone if
you already know its hash. An explorer makes the agent's work publicly auditable
— the core trust layer for a verification business.

**Why it's testable:** Pure HTTP — page loads, table renders, filters work,
detail pages load, data matches onchain state.

### 2. Agent Operations Dashboard (`/operations`)

Expand the treasury widget into a full operational dashboard.

**Page:** `/operations`
- Verification log: every verdict the agent submitted, with timestamp, outcome, reasoning summary
- Financial ledger: itemized earn/spend history (not just totals), per-service breakdown
- Consensus participation: which verifier nodes voted, agreement rates, dissent flags
- Uptime / health: daemon status, last poll time, peer node status

**API:**
- `GET /api/operations/verifications` — verification log (from attestation cache)
- `GET /api/operations/ledger` — itemized Stripe charge history + revenue sweeps
- `GET /api/operations/consensus` — peer node status + vote history

**Why it enhances the product:** The "agent-run company with open books" narrative
is currently a $1.00/$1.50 widget. A real operations dashboard makes the autonomy
claim credible and auditable.

**Why it's testable:** Backed by REST endpoints — TestSprite checks they return
valid JSON with expected schema.

### 3. Builder Reputation Profiles (`/builder/[ens]`)

Aggregate ENS text records into public profile pages.

**Page:** `/builder/[ens]`
- Verified milestone count, total earned, reputation score
- Milestone history with links to evidence bundles
- Co-builder network
- Verification timeline

**API:** `/api/builder/[ens]`
- `GET /api/builder/[ens]` — aggregated reputation data from ENS text records

**Why it enhances the product:** The product plan promises "reputation that
travels." Right now ENS records exist but there's no public-facing view. This
makes the reputation portable and visible.

**Why it's testable:** Page loads by ENS name, stats render, milestone list
displays, links resolve.

---

## The Loop (what judges will read in LOOP.md)

Each iteration is one line: maker first, then what ran, what broke, what got
fixed. Backed by commit history + TestSprite run history.

Example iterations (the real ones will be generated as we go):

```
iter 1 | agent built /explorer page shell | testsprite: table render fails on empty milestone list | fix: added empty state component
iter 2 | agent added filter logic | testsprite: "verified" filter returns finalized-but-not-released milestones | fix: corrected filter condition
iter 3 | agent built /operations API | testsprite: /api/operations/ledger 500s when Stripe key unset | fix: graceful fallback to empty ledger
iter 4 | agent built builder profile page | testsprite: ENS lookup crashes on unregistered names | fix: added not-found state
```

---

## Execution Timeline

| Day | Goal | Loop iterations |
|---|---|---|
| **Jul 1** | Install TestSprite CLI, onboard, write baseline tests against existing landing page + status API. Deploy current main to live URL. | 1-2 (baseline) |
| **Jul 2-3** | Build `/explorer` — verification explorer page + API. Run the loop. | 3-6 |
| **Jul 4-5** | Build `/operations` — agent operations dashboard + API. Run the loop. | 7-10 |
| **Jul 6** | Build `/builder/[ens]` — reputation profiles. Wire TestSprite into GitHub Actions. | 11-13 |
| **Jul 7** | Final loop pass, write LOOP.md from commit + run history, update README, post to Discord. | 14 |

---

## CI/CD Integration (+5 innovation)

`.github/workflows/testsprite.yml`:

```yaml
on: pull_request
env:
  TESTSPRITE_API_KEY: ${{ secrets.TESTSPRITE_API_KEY }}
  PROJECT_ID: ${{ secrets.TESTSPRITE_PROJECT_ID }}
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: '20'
  - run: npm i -g @testsprite/testsprite-cli
  - run: testsprite test run --all --project "$PROJECT_ID" --wait --output json
```

Every PR reruns the test suite. Non-zero exit fails the build.

---

## Submission Checklist (Jul 7)

- [ ] Live URL stays up all week (weft.thisyearnofear.com)
- [ ] Public repo has all source committed
- [ ] LOOP.md is agent-written, one line per iteration
- [ ] README covers the app + live URL + what the loop covered
- [ ] TestSprite account registered
- [ ] Post in Discord #hackathon-submissions: live URL, repo link, TestSprite email/name
- [ ] Demo video (if time permits)

---

## Story for Judges

> Weft is an autonomous verification business — it locks capital behind builder
> milestones, verifies the work with AI agent nodes, and releases payment when
> consensus is reached. But a verification business that can't show its own work
> isn't trustworthy.
>
> So we built the Verifier's Ledger: a public audit surface where anyone can
> browse every milestone Weft verified, inspect the agent's operational ledger,
> and check builder reputations. And we built it using a verification loop — the
> TestSprite CLI checked every line our agent wrote, caught real bugs, and made
> us fix them before they shipped.
>
> The verifier was verified. The loop is the product.
