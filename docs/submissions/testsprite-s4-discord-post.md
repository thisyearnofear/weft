# TestSprite S4 — Discord Submission Post (draft)

> **Status: draft — not posted.** Post this in **`#hackathon-s4-submissions`**
> using the channel template. The template is authoritative; adapt to fit it.
>
> **Before posting:** fill in the TestSprite account, the PR link and the run
> ids, and confirm the live URL resolves. The channel template will ask for
> things this draft does not guess.
>
> Live host: `https://weft.persidian.com` — the older `weft.thisyearnofear.com`
> in the S3 post no longer resolves, so it is corrected here.

---

## Weft — verification you can audit, checked by TestSprite on every PR

**Live URL:** https://weft.persidian.com
**Repo:** https://github.com/thisyearnofear/weft
**TestSprite account:** `<your email>` · `<your name>`
**PR carrying the check:** `<link>`

**Suite status at submission time:** 22/22 passing — 14 frontend plans, 8
backend modules, zero failures, zero timeouts.

---

### What it is

Program officers run milestones in Fluxx, Foundant, AmpliFund, or Salesforce. Weft
sits **beside** them: when a grantee marks a milestone complete, Weft runs a fixed
evidence checklist and writes a verification receipt back onto that grant record —
so tranche decisions don't wait on a review queue.

The product thesis is deliberately contrarian. Most agent startups in 2026 use an
LLM to judge work. Weft does the opposite: **the LLM only narrates, deterministic
evidence rules decide.** A payment decision has to be auditable, so nothing in the
verification path is a model judgement.

### The problem we hit in production

Running the verifier swarm in the public revealed **verifier herding**: when votes
are public, the last verifier watches the first two and free-rides instead of
independently checking the work. For a system whose entire job is honest
verification, that's fatal. Incentives can't fix it — only cryptography can. So
verifier votes are sealed with Zama FHE (homomorphic tallying, individual votes
never decrypted), with a deterministic confidence score computed from evidence
strength and encrypted alongside the ballot.

### How we wired TestSprite into how we ship

The suite is generated in the TestSprite portal against the **live deployment** and
runs on every pull request through the GitHub App. Two projects, twenty-two
assertion suites:

1. **14 frontend plans** — surface loads, API contracts, an end-to-end user
   journey (landing → explorer → milestone detail → builder profile), chaos and
   resilience, and onchain cross-checks
2. **8 backend Python modules** — schema validation plus value cross-checks for
   every REST endpoint, run in the cloud sandbox

The four that carry the weight are the ones a screenshot can't check: **API
contract** (five endpoints cross-checked for schema), **E2E journey** (one
continuous path across four surfaces), **chaos/resilience** (the recovery surface
under fault injection), and **onchain cross-check** (the explorer and the
milestone detail page must agree on the same hash, the same state, the same
amount).

The loop is also wired into the repo itself — the TestSprite agent skills live in
`.claude/skills/`, so any coding agent that opens the project discovers the
verification loop without being told.

### The run itself

```bash
testsprite test run --all --project 38b4b7d0-d18b-444c-92f7-df7991478e67 \
  --target-url https://weft.persidian.com --wait --max-concurrency 4 --output json
```

```
Batch run complete: 14/14 passed, 0 failed/blocked, 0 timed out
```

Artifacts are addressed by **run id**, not by test id — `testsprite test
artifact get <run-id>` returns the video, the per-step HTML snapshots and the
per-step JSON that make a failure diagnosable instead of mysterious.

### What TestSprite actually caught

**The iteration that proved the loop works.** We wrote a backend test asserting
that `stakedEth` in the explorer API was converted from wei to ETH. Then we
**intentionally broke the conversion** — removed the `/ 1e18` division so the API
returned `10000000000000000` instead of `0.0100` — and deployed the broken
version. TestSprite caught it immediately:

> `stakedEth (10000000000000000) equals raw totalStaked (10000000000000000) —
> wei-to-ETH conversion is broken`

The failure bundle pinpointed the endpoint and the field. We restored the
division, deployed, reran the test — **passed**. That's the complete
write → verify → fix → verify cycle, with a bug we planted on purpose, so nobody
can say the loop was never actually closed.

### What's real

- The deterministic verification path, the 2-of-3 verifier quorum, and the
  evidence bundle with a deterministic manifest and hash chain — live
- Zama FHE sealed-ballot consensus, v1 (`FHE.add`) and v2 (`FHE.mul`) weighted
  ballots — deployed on Sepolia
- The public audit surface — `/explorer`, `/operations`, `/sponsor`, `/activity`,
  `/verifiers`, `/api/docs` — on the live URL, verified on every PR
- The x402 middleware for agent-to-MCP calls, with `402 Payment Required`
  challenges, signature recovery and onchain USDC verification

### What's demo scope

- The 0G Testnet builder wedge and `/create-milestone` are crypto-native demos —
  **not production money**
- Canton is an optional private settlement lab for pilots, not the live path
- TestSprite reports `blocked` on some click-then-assert flows even when every
  assertion passes — a runner quirk, recorded in the build log, not a product
  failure

### Where to look

- **Build log:** [`LOOP.md`](https://github.com/thisyearnofear/weft/blob/main/LOOP.md)
  — every iteration with the maker, what ran, what broke, what got fixed
- **Verification doc:** [`docs/TESTING.md`](https://github.com/thisyearnofear/weft/blob/main/docs/TESTING.md)
  — what the suite covers, and what it does not

---

*Built with the TestSprite CLI in S3, and the TestSprite 3.0 portal + GitHub App
in S4 — the same discipline, wired so it runs itself.*
