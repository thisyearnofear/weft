# TestSprite S3 — Discord Submission Post

Post this in **#hackathon-submissions**.

---

## Weft — Escrow that releases itself (verified by autonomous agents, checked by TestSprite)

**Live URL:** https://weft.thisyearnofear.com
**Repo:** https://github.com/thisyearnofear/weft
**TestSprite account:** <your email> · <your name>

---

### What it is

Weft replaces milestone payments with autonomous verification. A sponsor locks ETH behind a deliverable. The builder ships. Three verifier agents independently collect evidence — onchain deployment checks, unique caller counts, GitHub commits — and if 2 of 3 agree, capital releases instantly. No manual reviews, no payment chasing, no politics. The agent earns 3% of every milestone it verifies and uses that revenue to pay for its own infrastructure.

### The problem we hit in production

We were already running the public, plaintext version on another testnet. That's how we discovered **verifier herding**: when votes are public, the last verifier watches the first two and free-rides instead of independently checking the work. For a system whose entire job is honest verification, that's fatal. You can't fix it with incentives — only with cryptography. We integrated Zama FHE for sealed-ballot consensus: each agent encrypts its vote, the contract tallies homomorphically, no individual vote is ever decrypted.

### How we used TestSprite

The TestSprite CLI was our checker in a real write → verify → fix → verify loop across 33 iterations. We used it three ways:

1. **Frontend tests** (14) — browser automation against the live production URL: surface loads, API contracts, E2E user journey (landing → explorer → milestone detail → builder profile), chaos/resilience, onchain cross-checks
2. **Backend tests** (8) — Python tests in the cloud sandbox validating JSON schema + value correctness for every REST endpoint
3. **MCP server** — auto-generated a code summary, standardized PRD, 12-case test plan, and executed 12 Playwright tests locally

Every feature we shipped went through the loop: write code → deploy → run TestSprite → read verdict → fix if needed → rerun.

### What TestSprite actually caught

**The bug that proved the loop works** (iter 19): We wrote a backend test asserting that `stakedEth` in the explorer API was converted from wei to ETH. Then we intentionally broke the conversion — removed `/ 1e18` so the API returned `10000000000000000` instead of `0.0100`. TestSprite caught it immediately:

> `stakedEth (10000000000000000) equals raw totalStaked (10000000000000000) — wei-to-ETH conversion is broken`

The failure bundle pinpointed the exact endpoint and field. We fixed it, deployed, reran the test — **passed**. That's the complete write → verify → fix → verify cycle, and it's in the commit history.

### CI/CD

TestSprite is wired into GitHub Actions — every PR reruns all tests and fails the build if anything breaks. (+5 innovation, and the stickiest version of the loop.)

### The loop, by the numbers

- **33 iterations** logged in [LOOP.md](https://github.com/thisyearnofear/weft/blob/main/LOOP.md)
- **40 tests** across frontend, backend, and MCP-generated suites
- **1 real bug caught** and fixed through the loop
- **7 public surfaces** built and verified: explorer, operations, sponsor, activity, verifiers, API docs, builder profiles
- **4 polish batches** driven by parallel subagent audits: mobile nav, fetch timeouts, loading skeletons, API caching + security headers

**The verifier was verified. The loop is the product.**

---

Demo video: _(optional — link if recorded)_
