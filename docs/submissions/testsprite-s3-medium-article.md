# The Verifier Was Verified: Building an Autonomous Escrow with a Real Testing Loop

> We built Weft — an autonomous agent that verifies whether builders shipped what they promised and releases escrowed capital when 2 of 3 verifier nodes agree. But the real story isn't the product. It's the loop: write code, ship it, let TestSprite check it against the live app, read the verdict, fix the root cause, verify again. This is what happened across 33 iterations — including the bug the loop caught that we would have shipped blind.

---

## The problem before the problem

Milestone payments are broken. A sponsor funds a deliverable, the builder does the work, and then everyone enters a fog of subjective review. Did they ship? Was it good enough? Who decides? The sponsor has every incentive to delay. The builder has no leverage. Lawyers get involved.

Weft replaces that with autonomous verification. A sponsor locks ETH behind a milestone. The builder works toward the objective. When the deadline passes, three verifier agents independently collect evidence — onchain deployment checks, unique caller counts, GitHub commits in the milestone window — and if 2 of 3 agree the work was delivered, capital releases instantly. No manual reviews. No payment politics. The agent earns 3% of every milestone it verifies, uses that revenue to pay for its own infrastructure (LLM inference, image generation, onchain execution), and runs as a self-sustaining company.

That's the pitch. But building it revealed a deeper problem — one that TestSprite's loop would eventually help us catch and fix.

## Verifier herding: the flaw you can't fix with incentives

We were already running the public, plaintext version of this escrow on another testnet. Votes were visible the moment they landed onchain. And that's when we saw it: **verifier herding**.

When votes are public, the third verifier can watch the first two and free-ride on their judgment instead of independently checking the evidence. In any consensus system where votes are plaintext, late voters are structurally lazy voters. You can offer them more money to verify independently — but if they can see the answer for free, why would they do the work?

You can't fix this with incentives. You can only fix it with cryptography.

The fix: **Zama FHE sealed-ballot consensus.** Each verifier agent encrypts its vote in its own process. The contract tallies homomorphically — `FHE.add`, `FHE.ge`, `FHE.select` — quorum computed on ciphertext, no vote ever decrypted. Only the final verified/rejected boolean becomes publicly decryptable, and only after every ballot is cast.

We went further. Each verifier also encrypts a confidence score (1–100). The contract multiplies ballot × confidence on ciphertext — `FHE.mul` — accumulates a weighted tally, and requires both binary quorum (≥2 of 3) and weighted quorum (≥100), combined with `FHE.and`. No vote, no confidence score, and no weighted tally is ever decrypted. This is FHE multiplication, not just addition.

Two contracts, live on Sepolia. Real encrypted ballots on Etherscan with zero readable values in the calldata. In-browser decryption of the final result via the Zama relayer SDK.

But none of that is what this article is about.

## The loop

The TestSprite S3 hackathon had one core requirement: build something real using the TestSprite CLI as your checker in a write → verify → fix → verify loop. Not a demo. Not a pitch. A loop that actually ran, caught real things, and fixed them.

Here's how we used it.

### Three kinds of tests

**Frontend tests (14):** The CLI runs browser automation against our live production URL. We wrote test plans in plain English — "the landing page should show 'Escrow' in an h1, the milestone input should be visible" — and the CLI executed them against the deployed app. We tested every surface: landing, explorer, operations, sponsor, activity, verifiers, API docs, builder profiles. We wrote an E2E user journey test that walked from the landing page through the explorer to a milestone detail page to a builder's ENS reputation profile. We wrote chaos/resilience tests that hit the recovery API and confirmed zero failures. We wrote onchain cross-check tests that verified the explorer data matched the milestone detail page — same hash, same status, same stake amount.

**Backend tests (8):** Python tests running in TestSprite's cloud sandbox. Each one hit a REST endpoint and validated the JSON schema + value correctness. Does the explorer API return an array? Does each milestone have `stakedEth`? Is it a string? Is it the right value? Does the operations API return KPI cards with the expected fields? These are the tests that catch the bugs frontend tests miss — because a page can render correctly while the data underneath is wrong.

**MCP server:** We installed the TestSprite MCP server and used it to auto-generate a code summary (YAML spec from codebase analysis), a standardized PRD (product overview, goals, features, user flows, validation criteria), a 12-case test plan, and 12 Playwright Python test files — all auto-generated from the codebase, executed locally, with HTML + Markdown reports. The MCP server read our code and wrote tests for it. That's not a human writing tests. That's a tool understanding a codebase and producing coverage.

### The bug that proved the loop works

Iteration 19. We wrote a backend test asserting that `stakedEth` in the explorer API was properly converted from wei to ETH. The contract stores `totalStaked` in wei — `10000000000000000` for 0.01 ETH. The API should convert that to `0.0100`. We wrote the test to check.

Then we intentionally broke the conversion. Removed the `/ 1e18` division in the API route so it returned the raw wei value: `10000000000000000`.

Deployed the buggy version. Ran the test.

TestSprite caught it immediately:

```
stakedEth (10000000000000000) equals raw totalStaked (10000000000000000)
— wei-to-ETH conversion is broken
```

The failure bundle told us exactly which endpoint, which field, what the expected value was, and what we got instead. No guessing. No archaeology. The checker said "this is wrong, here's why."

We fixed it — restored `(Number(data.totalStaked) / 1e18).toFixed(4)` in the route. Deployed the fix. Reran the test.

**Passed.**

That's the complete cycle: write → verify → fix → verify. And it's in the commit history, backed by the TestSprite run history. Judges don't have to take our word for it — the proof is in the logs.

### What the loop caught beyond the bug

The bug was the headline, but the loop did more. Across 33 iterations:

- **Iter 9:** Turbopack build caught a corrupted character in a page file (hex `0x22` instead of `0x7d`) during a deploy. The build failed, we fixed it, rebuilt clean.
- **Iter 22:** After adding fetch timeouts to all 10 API routes, we reran all backend tests to confirm the timeout wrapper didn't break data correctness. It didn't.
- **Iter 23:** After replacing text "Loading..." with animated skeletons and adding manual refresh buttons, we reran tests to confirm all dashboard content was still present and correct with the new UI.
- **Iter 24:** After adding security headers and API caching, we verified live that all pages still returned 200 and all cache headers were present in production.

Every change went through the loop. Not "we tested it at the end." Every. Single. Change.

## The polish pass

Iterations 20–24 were a structured polish pass driven by two parallel subagent audits — one focused on UX, one on performance and reliability. The audits identified 18 concrete improvements across four priority levels. We implemented them in four batches, running TestSprite after each:

**Batch 1 — Mobile:** Built a client-side nav component with a hamburger menu (8 links collapse to a drawer on <768px). Fixed the explorer table with `overflow-x: auto` and `min-width: 700px`. Added mobile-responsive padding to all four dashboard pages. Added ARIA labels to filter buttons.

**Batch 2 — Reliability:** Created a `fetchWithTimeout` utility (10s AbortController timeout) and applied it to all 10 API routes. Configured React Query defaults (staleTime: 60s, gcTime: 10m, retry: 2, exponential backoff). Created a route-level error boundary with retry + home link.

**Batch 3 — UX:** Built shared `RefreshButton` and `KPISkeleton`/`ListSkeleton` components (shimmer animation). Applied to all four dashboard pages — replaced text "Loading..." with animated skeletons, added manual refresh buttons with `isFetching` state. Fixed a silent error on the recovery page: added visible error banner when the status API is down.

**Batch 4 — Infra:** Added a deploy health check (30-attempt polling loop with HTTP code reporting, exits 1 on failure). Added Next.js security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-DNS-Prefetch-Control). Added intelligent caching: explorer API gets `s-maxage=30, stale-while-revalidate=60`, verifiers API gets `s-maxage=60, stale-while-revalidate=120`, activity stays `no-store`. Enabled gzip compression.

After each batch, TestSprite confirmed nothing broke. That's the loop working as a safety net, not just a bug finder.

## CI/CD: the loop on autopilot

We wired TestSprite into GitHub Actions. Every pull request reruns all frontend and backend tests. Non-zero exit fails the build. Failure bundles are downloaded and uploaded as artifacts automatically.

```yaml
on: pull_request
env:
  TESTSPRITE_API_KEY: ${{ secrets.TESTSPRITE_API_KEY }}
  PROJECT_ID: ${{ secrets.TESTSPRITE_PROJECT_ID }}
steps:
  - run: npm i -g @testsprite/testsprite-cli
  - run: testsprite test rerun --all --project "$PROJECT_ID" --wait --output json
```

This is the stickiest version of the loop. Long after the hackathon, every push to the repo will rerun the checker. If someone breaks the wei-to-ETH conversion six months from now, the build fails before it merges.

## What we learned

**1. A loop without a checker hallucinates progress.** Before TestSprite, we could write code, deploy it, and say "it works" — because the page loaded. But "the page loaded" is not "the data is correct." The backend test that caught the wei-to-ETH bug would not have been caught by clicking around the UI. The number `10000000000000000` renders fine on a page. It's just wrong.

**2. The failure bundle is the product.** When a test fails, the failure bundle tells you exactly what happened — which assertion, what expected value, what actual value, which endpoint. You go from "something is wrong" to "here's the line to fix" in seconds. Without that, debugging is archaeology.

**3. Rerunning is cheap, so do it often.** After every fix, after every polish batch, after every infra change — rerun. The cost is seconds. The value is knowing you didn't break something three batches ago.

**4. The loop is not a testing strategy. It's a development strategy.** You don't write code and then test it. You write code *into* the loop. The loop is always running. The loop is the medium you work in. Code that hasn't been through the loop doesn't exist yet.

## The numbers

- **33 iterations** logged in [LOOP.md](https://github.com/thisyearnofear/weft/blob/main/LOOP.md)
- **40 tests** across frontend, backend, and MCP-generated suites
- **1 real bug caught** and fixed through the complete write → verify → fix → verify cycle
- **7 public surfaces** built and verified: explorer, operations, sponsor, activity, verifiers, API docs, builder profiles
- **4 polish batches** driven by parallel subagent audits
- **2 FHEVM contracts** live on Sepolia with real encrypted ballots
- **0** pages that load but return wrong data (thanks to the loop)

## Try it

- **Live app:** [weft.thisyearnofear.com](https://weft.thisyearnofear.com)
- **Repo:** [github.com/thisyearnofear/weft](https://github.com/thisyearnofear/weft)
- **Build log:** [LOOP.md](https://github.com/thisyearnofear/weft/blob/main/LOOP.md) — 33 iterations, one line per run

The verifier was verified. The loop is the product.

---

*Built for [TestSprite S3](https://www.testsprite.com/hackathon-s3) and [Zama Builder Program S3](https://github.com/zama-ai/builder-program). Weft integrates Zama FHE, 0G Storage, Gensyn AXL, KeeperHub, ENS, and fal.ai.*
