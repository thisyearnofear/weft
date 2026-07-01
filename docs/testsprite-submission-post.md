# TestSprite S3 Submission Post

Post this in the TestSprite Discord #hackathon-submissions channel when ready to submit.

---

## Weft — The Verifier's Ledger

**Live site:** https://weft.thisyearnofear.com
**Repo:** https://github.com/thisyearnofear/weft
**TestSprite project:** Weft — Verifier's Ledger (cdf9309d-9283-4db7-84a4-a6eee8599458)
**TestSprite account:** Udi Ngethe

### What we built

Weft is an autonomous verification business — it locks capital behind builder milestones, verifies the work with AI agent nodes, and releases payment when consensus is reached. For this hackathon, we built **The Verifier's Ledger**: three new public audit surfaces that make the agent's work publicly auditable, using a TestSprite-powered write→verify→fix→rerun loop.

**New surfaces:**
- **/explorer** — filterable table of every verified milestone (status, builder ENS, stake, votes, evidence root)
- **/operations** — agent operations dashboard: financial ledger (Stripe charges), verification log, infrastructure health
- **/builder/[ens]** — builder reputation profiles from ENS text records (trust score, verified outcomes, capital unlocked)

**The loop:**
- 6 TestSprite frontend tests covering all surfaces
- 9 iterations logged in LOOP.md (agent-written, backed by commits + TestSprite run history)
- GitHub Actions workflow reruns all tests on every PR (+5 innovation)
- All tests verified against the live site (not localhost)

**The verifier was verified. The loop is the product.**

### Test results
- landing-loads: PASSED
- treasury-widget: PASSED
- explorer-loads: PASSED
- operations-loads: all 8 assertions verified
- builder-profile: all 5 assertions verified
- demo-milestone-lookup: all 5 assertions verified
