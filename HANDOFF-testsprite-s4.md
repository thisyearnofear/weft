# Handoff: TestSprite Season 4 submission — weft

You are working **inside the `weft` repo** (`thisyearnofear/weft`). Your job is
to land an entry in the **TestSprite Season 4 hackathon** and prepare the
submission. Much of the groundwork is done; your job is to verify it, close the
gaps, and open the PR.

**Read `AGENTS.md` first.** It is the technical reference and it is binding —
architecture, the agent layer, the data model, and the environment variables. It
also ends with a `TESTSPRITE AGENT SECTION` block describing the verification
loop you are about to use. Then read `docs/TESTING.md` and `LOOP.md`.

**Note on scope:** this is the **contingency** entry, prepared alongside
cognivern. The TestSprite rules allow **one submission per person or team** —
multiple submissions are disqualification. So this is not a second entry to
also make; it is the entry to use **if** the cognivern entry is blocked. Confirm
with the user which project is being submitted before you post anything.

---

## 1. The event

**TestSprite Season 4** — build an app, wire TestSprite verification into how
you ship it, and prove it with a pull request.

| | |
|---|---|
| **Build window** | 16 Oct – **22 Oct 2026, 23:59 PT** (submissions close; posts go in `#hackathon-s4-submissions`) |
| **Judging** | 23–27 Oct · **Winners announced 6 Nov** |
| **Prizes** | $3,000 project pool (1st $1,500 · 2nd $750 · 3rd $450 · 4th/5th $150) + a **separate** $1,000 CLI-improvement pool (closes 29 Oct 23:59 PT) |
| **Judging criteria** | **Project quality (40)** — craft, polish, completeness; does the live app work well? · **Tests that run themselves (40)** — coverage, assertion depth, scenario design, and whether the check fires on every PR and holds the merge; read from the PR, the portal and the commits · **Innovation (20)** — creativity of the project, or of how verification is wired into how you ship · plus an engagement bonus for Discord polls, X shares and build write-ups |

**S4 changed the format.** S3 was a manual CLI loop (which is what this repo
built). S4 is the **TestSprite 3.0 web portal + GitHub App**: you generate the
suite in the portal against the live app, connect the repo with the GitHub App,
and from then on every PR is tested automatically — the agent writes the code,
TestSprite checks the PR, the agent fixes from the failure bundle, and the check
reruns on its own. **The proof is the PR itself.**

---

## 2. What already exists — this is a strong entry

| Asset | Where |
|---|---|
| Repo (public) | `github.com/thisyearnofear/weft` |
| Live app | `https://weft.persidian.com` (200, ~0.1 s) |
| Frontend suite | `.testsprite/plans/` — 14 plans (tracked) |
| Backend suite | `.testsprite/backend/` — 8 exported Python modules (tracked) |
| Portal config | `.testsprite/config.json` |
| CI | `.github/workflows/testsprite.yml` — `pull_request` to `main`; runs both suites; downloads failure bundles; uploads them plus the MCP test report as artifacts |
| Loop log | `LOOP.md` — **34 iterations**, each with maker, what ran, what broke, what got fixed |
| Agent wiring | `.claude/skills/testsprite-onboard`, `.claude/skills/testsprite-verify`, and a `TESTSPRITE AGENT SECTION` block in `AGENTS.md` — any coding agent that opens the repo discovers the loop unprompted |
| Failure evidence | `.testsprite/failure/` — `result.json`, `code.py`, `failure.json`, `meta.json`, **`video.mp4`**, and `steps/` with HTML snapshots + per-step JSON evidence |
| Durable doc | `docs/TESTING.md` (new) — the verification contract |
| Event doc | `docs/hackathons.md` § 9 (new) — the S4 entry |
| Post draft | `docs/submissions/testsprite-s4-discord-post.md` (new) — the Discord post, unfilled |

### The story that wins the points

**The product thesis is the test suite.** Weft's positioning is deliberately
contrarian: *most agent startups use an LLM to judge work; Weft does the
opposite — the LLM only narrates, deterministic evidence rules decide.* Nothing
in the verification path is a model judgement, so nothing in the test suite is
either. Every assertion is about something deterministic: schema shape, numeric
correctness, two surfaces agreeing, a page surviving fault injection.

**The four plans that carry the weight** — the ones a screenshot cannot check:

| Plan | What it proves |
|---|---|
| `api-contract` | Five endpoints cross-checked; every response valid JSON with the expected schema fields |
| `e2e-user-journey` | landing → explorer → milestone detail → builder profile, as one continuous path |
| `chaos-resilience` | The recovery surface and recovery API under fault injection: zero failures, summary + chaos + failures returned |
| `onchain-crosscheck` | Explorer data and milestone detail **agree** — same hash, same `Verified` state, same amount |

**Iteration 19 is the proof-of-mechanism, and it is deliberately constructed.**
We wrote a backend test asserting `stakedEth` was converted from wei to ETH,
then **planted a bug** — removed the `/ 1e18` division so the API returned
`10000000000000000` instead of `0.0100` — and deployed the broken build.
TestSprite caught it:

> `stakedEth (10000000000000000) equals raw totalStaked (10000000000000000) —
> wei-to-ETH conversion is broken`

We restored the division, deployed, reran → **passed**. A bug we planted on
purpose, caught, fixed and re-verified. That is the complete write → verify →
fix → rerun cycle, and it cannot be dismissed as never having been closed. It is
in the commit history and in `LOOP.md`.

**The loop is wired into the repository, not just into a process.** The
TestSprite agent skills are committed in `.claude/skills/`, and `AGENTS.md`
carries the agent section. That is the literal answer to *"how you wired
verification into how you ship."*

**Honest details worth keeping in the submission** (they read as maturity):
TestSprite sometimes reports `status=blocked` on click-then-assert flows even
when every assertion verified — the loop log records it as a runner quirk, not
a product failure. And the 0G Testnet builder wedge is **demo scope, not
production money**, which the README already says.

---

## 3. What to do, in order

### 3a. Verify what is already written (do this first)

`docs/TESTING.md`, `docs/hackathons.md` § 9 and the S4 post draft were written
from a read of the repo and may be wrong in detail. Check them against reality
and fix what is wrong:

- `ls .testsprite/plans/` → 14 real plan filenames; confirm `docs/TESTING.md`
  lists exactly those
- `ls .testsprite/backend/` → 8 real module names; same check
- `.testsprite/config.json` → confirm the project id and target URL
- `LOOP.md` → confirm the iteration count (34 lines, last is iter 33) and that
  every claim quoted in `docs/TESTING.md` and the post draft is actually in it
- `curl -s -o /dev/null -w '%{http_code}' https://weft.persidian.com` → confirm
  the live host responds

### 3b. Reconcile the project ids — the one real blocker

Three ids are in play and they do not agree:

| Source | Id |
|---|---|
| `.testsprite/config.json` | `6121d8fe-a142-48e1-8522-585c22f6099d` (frontend) |
| `LOOP.md` iter 0 | `cdf9309d` (frontend — "Weft — Verifier's Ledger") |
| `LOOP.md` iter 18 | `1f6f51ae` (backend — "Weft API — Backend Tests") |
| CI | `FRONTEND_PROJECT_ID` + `BACKEND_PROJECT_ID`, both **repository secrets** |

Decide which frontend id is authoritative, make `config.json`, the CI secrets
and the docs agree, and record the answer in `docs/hackathons.md` § 9. This
matters because **the account that submits must be the account that generated
the suite the GitHub App runs** — you cannot check that if you don't know which
project is the real one.

### 3c. Human-only steps — prompt the user, do not attempt these yourself

These are disqualifying if missed.

1. **Join the TestSprite Discord and get the badge**, and **follow TestSprite on
   X.** Participation without joining Discord is not valid; X-only submissions
   are not counted.
2. **Install the TestSprite GitHub App** on `thisyearnofear/weft` from the
   dashboard. **The submitting TestSprite account must be the one that
   generated the suite and connected the GitHub App** — a mismatch is
   disqualifying and fails silently. Ask the user which account that is.
3. **Turn on Blocking PRs.** Optional per the rules, but the scoring reads
   *"whether the check fires on every PR **and holds the merge**."* Free points.
4. **Regenerate/confirm the suite in the 3.0 web portal** against
   `https://weft.persidian.com`. The 14 plans in `.testsprite/plans/` are the
   intended starting set.

### 3d. Open the PR — this is your job

The submission **must include at least one PR opened during the build window
(16–22 Oct) carrying a TestSprite comment or status check.**

Best path, in preference order:

1. **Let the suite run against the live app and fix what it catches.** That is
   the S4 loop producing real, check-verified commits, and it *is* the
   submission evidence.
2. If the suite is green, make a **genuine improvement**. The thinnest parts
   are the **Canton rail** (the primary commercial surface, currently with no
   coverage — see `docs/TESTING.md` § *What the suite does not cover*), the
   `/create-milestone` builder wedge, and the Zama FHE confidential contracts.
   A PR that adds assertions for one of those and fixes what they catch is
   exactly the "improve the suite" work that scores 40 points.

Locally:

```bash
npm install -g @testsprite/testsprite-cli
testsprite --version && testsprite auth whoami

testsprite test create --plan-from .testsprite/plans/explorer-loads.plan.json \
  --run --wait --target-url https://weft.persidian.com --timeout 600 --output json
testsprite test run --all --project <frontend-project-id> --wait --max-concurrency 4 --output json
testsprite test run --all --project <backend-project-id> --wait --max-concurrency 4 --output json
testsprite test artifact get <run-id> --out ./.testsprite/runs/<run-id>/
```

Then: branch → commit → push → **open a PR**. Do not push to `main`.

### 3e. Finish the submission materials

- Fill in `docs/submissions/testsprite-s4-discord-post.md`: the TestSprite
  account, the PR link, the run ids, and confirm the live URL resolves. **Use
  `https://weft.persidian.com`** — the older `weft.thisyearnofear.com` in the
  S3 post no longer resolves, and nine archived files still cite it.
- Follow the **channel template** in `#hackathon-s4-submissions` — it is
  authoritative. Draft for the user to paste; do not post on their behalf.
- Update `docs/hackathons.md` § 9 with the PR link and the final state.
- The README must cover the app, the live URL, and what the test suite covers —
  the rules require all three. The Verification section now does.

### 3f. Optional, separate: the $1,000 CLI improvement bonus

A **separate pool**, its own deadline (29 Oct), its own judging. It does not
compete with the project award and needs no live app. Only take it on if the
project entry is safely submitted first.

- Repo: `TestSprite/testsprite-cli`. Read `CONTRIBUTING.md` and `VISION.md`.
- Find a real bug, open an issue with the **🏆 Hackathon Improvement** template
  (version/commit tested, Discord username, what's broken, how to reproduce), and
  wait for a maintainer to add the `accepted` label — it cannot be claimed
  before that.
- Claim with `/assign`. Max 3 open claims per person. Open a draft PR with
  `Closes #<issue>` **within 48 hours** or the claim is released.
- The PR must carry `Closes #N`, the Season 4 bonus box ticked, and the Discord
  username. Lint, typecheck and tests must pass with **coverage ≥ 80%**. Use
  Conventional Commits.
- It must be **merged AND judged a genuine improvement** — two separate bars.
  Formatting, typos, comment-only changes, unexplained dependency bumps,
  behaviour changes without tests, and one change split across several PRs do
  not qualify, and bounty farming ends season eligibility.

### 3g. A licence

The repo has **no `LICENSE` file**. The rules require "your own original work, or
work you have the rights to use" and the right to grant TestSprite marketing
permissions — a public repo with no licence is legally awkward for anyone who
forks it and undercuts the "original work" claim in substance. Adding a licence
is a decision for the user (and may affect the OKX.AI / other listings already
in `docs/hackathons.md`), so **ask, do not assume.**

---

## 4. Hard requirements — the disqualifiers

- **One submission only.** Weft and cognivern cannot both be submitted.
- **The submitting TestSprite account must be the account that generated the
  suite and connected the GitHub App.**
- **At least one PR opened in the window carrying a TestSprite check.**
- **The app must be reachable at a public URL throughout the build phase** —
  TestSprite runs in the cloud and does not test localhost. Every PR check hits
  the live URL; if the app is down, the checks fail.
- **The repo must be public**, and the README must cover app + live URL + suite
  coverage. Never commit secrets.
- **Discord membership with a badge**, and TestSprite followed on X.
- 18+, and no prize in comprehensively sanctioned regions.

---

## 5. Repo conventions you must follow

- **Read `AGENTS.md` and `OPS.local.md.example` before touching deployment.**
  `OPS.local.md` is the gitignored local ops file — keep it that way, and never
  copy its contents into public docs.
- **Keep secrets out of the repo.** The SigNoz ingest token
  (`OTEL_EXPORTER_OTLP_HEADERS`) belongs in a secret store or `.env`, not in
  git. The `/api/observability/demo` route executes a Python script whose path
  comes from `WEFT_REPO_ROOT` — do not expose it publicly without
  authenticating callers.
- **Frontend setup is non-standard:** `frontend/.npmrc` sets
  `legacy-peer-deps=true` (RainbowKit 2 peers on wagmi 2, this project uses
  wagmi 3). Run `npm ci --cache .npm-cache` in `frontend/`, and run
  `npm run sync-zama-sdk` before `dev`/`build` — the Relayer SDK WASM files are
  gitignored and the build copies them from `node_modules`.
- **Keep the package name `daml`** if you rebuild the Daml package — the
  `#daml:Main:SealedBidAuction` references break otherwise.
- **Do not commit** `public/zama/`, `.env`, or `OPS.local.md`.
- **Do not disturb the live Canton DevNet or the 0G Testnet surfaces** with
  probe/test data — they persist in the demo lists. Use the sandbox.
- The loop is the point: **write code → deploy → run TestSprite → read the
  verdict → fix → rerun**, and commit each fix with the run id.

---

## 6. Git and credential state (already fixed — do not undo it)

- `gh` accounts in the keyring: `sneldao` (active), `thisyearnofear`,
  `udirobert`. Two tokens that had been embedded in remote URLs were exposed
  and have been **revoked**; all accounts were re-authorised afterwards.
- `thisyearnofear/weft` has a **local credential helper** that resolves the
  right account at runtime from the keyring. **Never put a token in a remote
  URL.** If a push fails with `Permission denied`, check the identity with
  `git -C weft credential fill` rather than editing the remote.
- Commit as `thisyearnofear`.

---

## 7. Definition of done

- [ ] `docs/TESTING.md`, `docs/hackathons.md` § 9 and the S4 post draft verified
      against the repo and corrected
- [ ] **Project ids reconciled** — config.json, CI secrets and docs agree, and
      the answer is recorded in `docs/hackathons.md` § 9
- [ ] `https://weft.persidian.com` confirmed reachable; the app stays up
      through the window
- [ ] Discord joined with a badge; TestSprite followed on X
- [ ] GitHub App installed, from the same account that owns the suite
- [ ] Blocking PRs enabled
- [ ] Suite confirmed in the 3.0 portal against the live target
- [ ] **≥1 PR opened in the window carrying a TestSprite check**, with the
      check green
- [ ] README covers app, live URL, and what the suite covers
- [ ] S4 post draft filled in — account, PR link, run ids — and ready to paste
- [ ] Licence question raised with the user
- [ ] Nothing committed that is a plan, a scratch file, or a secret

Report back with: the PR link, the run ids, what the suite caught, which
project id is authoritative, and confirmation that the live app is up.
