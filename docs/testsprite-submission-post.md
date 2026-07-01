# TestSprite S3 Submission Post

Post this in the TestSprite Discord #hackathon-submissions channel when ready to submit.

---

## Weft — The Verifier's Ledger

**Live site:** https://weft.thisyearnofear.com
**Repo:** https://github.com/thisyearnofear/weft
**TestSprite frontend project:** Weft (498234da-24b8-4311-9fdf-879ad0a0df3a)
**TestSprite backend project:** Weft API (a47ef3be-049f-4ebd-b27f-32a34294846d)
**TestSprite MCP project:** 43bfaf67-931e-4d7f-b5c0-0063a9ade62f
**TestSprite account:** Udi Ngethe

---

### What we built

Weft is an autonomous verification business — it locks capital behind builder milestones, verifies the work with AI agent nodes, and releases payment when consensus is reached. For this hackathon, we built **The Verifier's Ledger**: 8 public audit surfaces that make the agent's work publicly auditable, using a TestSprite-powered write→verify→fix→rerun loop.

**8 public surfaces:**
1. **/explorer** — filterable table of every verified milestone (status, builder ENS, stake, votes, evidence root)
2. **/operations** — agent operations dashboard: KPI cards, financial ledger (Stripe charges), verification log, infrastructure health
3. **/sponsor** — sponsor dashboard: capital flow bar, KPI cards, funded milestones with verification status
4. **/activity** — chronological timeline of every agent action (verifications, charges, revenue, chaos events)
5. **/verifiers** — verifier network: authorized nodes, votes cast, consensus agreement rate, dissent flags
6. **/builder/[ens]** — builder reputation profiles from ENS text records (trust score, verified outcomes, capital unlocked)
7. **/api/docs** — interactive API reference with 12 documented endpoints, example curl commands, try-it links
8. **/recovery** — chaos engineering demo with fault injection, recovery timeline, and verdict landing

**Product polish pass (4 batches):**
- **Mobile**: hamburger nav menu, responsive explorer table, mobile padding for all dashboards, ARIA labels
- **Reliability**: 10s fetch timeouts on all 10 API routes, React Query defaults (staleTime, retry, backoff), route-level error boundary
- **UX**: animated loading skeletons (replaced text "Loading..."), manual refresh buttons on all data pages, recovery page error banner
- **Infra**: deploy health check (30-attempt polling), security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy), intelligent API caching, gzip compression

---

### The loop

**28 TestSprite tests** across 3 project types:
- **14 frontend tests** (CLI plan-based browser automation against production URL)
- **8 backend tests** (Python: schema validation + value cross-checks for all REST endpoints)
- **12 MCP-generated Playwright tests** (auto-generated from codebase analysis, executed locally)

**25 iterations** logged in LOOP.md (agent-written, backed by commits + TestSprite run history).

**The loop caught a real bug** (iter 19): TestSprite's backend test detected a wei-to-ETH conversion error in the explorer API — `stakedEth` returned raw wei instead of ETH. The failure bundle pinpointed the root cause, the fix was deployed, and the rerun confirmed the fix. This is the complete write→verify→fix→rerun cycle.

---

### TestSprite platform features used

| Feature | How we used it |
|---|---|
| **CLI — Frontend tests** | 14 plan-based browser automation tests against production URL |
| **CLI — Backend tests** | 8 Python tests in cloud sandbox (schema + value cross-checks) |
| **MCP Server** | Auto-generated PRD from codebase, 12 Playwright test files, HTML + Markdown test reports |
| **MCP — Code Summary** | YAML code summary auto-generated from project structure |
| **MCP — Standardized PRD** | JSON PRD with product overview, goals, features, validation criteria |
| **MCP — Test Plan** | 12 test cases across 10 requirement groups |
| **MCP — Code Generation + Execution** | Playwright test code generated and executed against local dev server |
| **Failure bundle** | Downloaded via `test artifact get` — self-consistent, run-scoped |
| **Test rerun** | Cheap replay after fixes — `test rerun` |
| **Agent skill installation** | `testsprite agent install --target claude --target codex` |
| **GitHub Actions CI/CD** | Workflow reruns all tests on every PR, uploads failure bundles + MCP report |
| **Two project types** | Frontend + backend projects |
| **Parallel subagent audits** | Two parallel subagent audits (UX + performance) identified 18 improvements |

---

### MCP Server workflow (new for this submission)

We used the TestSprite MCP Server to auto-generate tests from our codebase:

1. **Code Summary** — MCP server analyzed our Next.js project structure, routes, features, and tech stack
2. **Standardized PRD** — Generated a JSON PRD with product overview, core goals, key features, user flows, and validation criteria
3. **Test Plan** — 12 test cases across 10 requirement groups (functional, UI, error handling)
4. **Code Generation + Execution** — Playwright Python test files auto-generated and executed against local dev server
5. **Test Report** — HTML + Markdown reports with per-test status, screenshots/videos, and gap analysis

The MCP-generated tests complement our CLI tests: CLI tests run against production (source of truth), MCP tests run locally (fast iteration). Together they demonstrate full platform coverage.

---

### GitHub App setup (recommended for judges)

We also set up the TestSprite GitHub App for automatic PR testing:

1. Log in to [TestSprite Web Portal](https://www.testsprite.com)
2. Navigate to **GitHub App** under Settings
3. Click **Connect With GitHub App**
4. Authorize TestSprite to access the `thisyearnofear/weft` repository
5. Configure: **Run on PRs** = enabled, **Blocking PR** = enabled

Once connected, every PR automatically triggers TestSprite tests against the Vercel preview deployment and posts results as a PR comment.

---

### Test results

**CLI tests (against production — source of truth):**
- landing-loads: PASSED
- explorer-loads: PASSED
- operations-loads: PASSED (12/12 steps)
- sponsor-dashboard: all assertions verified
- activity-feed: all assertions verified
- verifiers-network: all assertions verified
- builder-profile: all assertions verified
- demo-milestone-lookup: all assertions verified
- treasury-widget: PASSED
- api-docs-page: PASSED (16/16 steps)
- api-contract: all 13 assertions PASSED
- e2e-user-journey: all assertions verified
- chaos-resilience: PASSED (24/24 steps)
- onchain-crosscheck: PASSED (11/11 steps)
- explorer-stake-value: PASSED (bug caught + fixed)
- All 8 backend tests: PASSED

**MCP tests (against localhost — fast iteration):**
- 5/12 passed, 5/12 failed (env issue — no blockchain RPC locally), 2/12 blocked
- All page shells render correctly (12/12)
- All static content tests passed (navigation, filters, API docs, builder lookup)
- HTML report: `frontend/testsprite_tests/testsprite-mcp-test-report.html`

---

**The verifier was verified. The loop is the product.**
