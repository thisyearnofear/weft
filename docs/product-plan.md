# Weft — Product Plan & Monetization Strategy

## Vision

Weft is verification infrastructure for **post-award program offices**: agents sit
beside the grant management SoR the buyer already pays for (Fluxx, Foundant,
AmpliFund, Salesforce Nonprofit, etc.), evaluate a fixed checklist, and write a
verification receipt back onto the grant record. Canton is optional private
settlement when capital is escrowed — not the commercial lead. A public EVM
builder wedge (0G Testnet) remains for crypto-native demos.

**The contrarian secret.** Most agent startups in 2026 use an LLM to judge work.
Weft does the opposite: the LLM only narrates, **deterministic evidence rules
decide**. Payment decisions must be auditable — no LLM hallucination risk on
capital release. This is the philosophical core of the project and the
defensible secret.

**The business model: sell trust at a percentage of the capital it unlocks
(and/or pilot SaaS on time-to-tranche).**

**Thiel / PG framing:**

- *Creative monopoly.* Define the category "post-award verification rail" rather
  than compete in GMS or escrow. Own a small market first.
- *Last mover advantage.* Verifiers, 0G evidence archive, ENS reputation schema,
  Canton receipt writebacks all compound. The longer the system runs, the harder
  to displace.
- *Schlep taste (PG).* Take on real schleps: institutional verification, escrow,
  FHE sealed ballots, AXL peer transport, 0G bundle provenance.
- *Do things that don't scale (PG).* Free 0% daemon tier, CLI builder onboarding
  script ("alpha"), founder-led pilot deployments. Classic wedge.

Primary ICP + SoR thesis: see [`canton/BUSINESS_BRIEF.md`](../canton/BUSINESS_BRIEF.md).

## Product Tiers

### Free Tier — Weft Daemon

**What it is:** Open-source Python verification loop that anyone can self-host.

| Feature | Included |
|---|---|
| Deterministic evidence collection | ✅ |
| Onchain attestation via cast send | ✅ |
| Unique caller counting | ✅ |
| Deployment verification | ✅ |
| CLI-only interface | ✅ |
| Manual setup (env vars, VPS) | ✅ |
| Community support | ✅ |

**Value prop:** "Get verified for free. Run your own node."

**Strategic role:** On-ramp. Lowers barrier to adoption. Creates network effects. Every free user is a potential upgrade.

**Cost to Weft:** $0 (open source, self-hosted)

---

### Hermes Agent Tier — Weft Agent

**What it is:** Weft-hosted Hermes Agent that handles the entire verification pipeline autonomously.

| Feature | Included |
|---|---|
| Everything in Free | ✅ |
| Persistent memory across milestones | ✅ |
| Auto-generated verification skills | ✅ |
| Telegram/Discord interface | ✅ |
| LLM narrative generation (Nemotron/Kimi/Nous) | ✅ |
| Anomaly detection | ✅ |
| Automatic 0G Storage publishing | ✅ |
| Multi-node peer consensus (AXL) | ✅ |
| KeeperHub reliable execution | ✅ |
| ENS record updates | ✅ |
| Autonomous spend via Stripe Skills | ✅ |
| Pluggable LLM backend (Nemotron/Kimi/Nous) | ✅ |
| Human-readable verification reports | ✅ |

**Value prop:** "An AI agent that verifies your work and tells the story."

**Strategic role:** Revenue driver. This is the product.

**Cost to Weft:** Hosting (minimal — e2-micro), LLM API calls (Nemotron/Kimi/Nous), fal.ai image generation, 0G Storage writes — all paid autonomously via Stripe Skills from earned revenue.

---

### Enterprise / Team Tier — Weft Swarm

**What it is:** Multi-agent verification infrastructure for teams and DAOs.

| Feature | Included |
|---|---|
| Everything in Agent | ✅ |
| Multiple specialized agents (verifier, monitor, reporter) | ✅ |
| Custom verification templates | ✅ |
| Dedicated support | ✅ |
| SLA guarantees | ✅ |
| Custom integrations | ✅ |

**Value prop:** "A verification team, not just a tool."

**Strategic role:** High-value contracts. Future expansion.

---

## Distribution Strategy

A technically excellent product with no engineered distribution is fighting uphill.
Weft's distribution plan, in priority order:

1. **Sponsor-side wedge.** Don't sell to builders; sell to sponsors who require Weft
   verification for their grantees. Sponsor mandates create builder demand — the buyer
   pulls builders in, not the other way around. This is the highest-leverage move
   because it flips the GTM from "push to builders" to "pull from sponsors."
2. **Canton receipt as marketing.** Every Canton receipt written back into a buyer's GMS
   is Weft-branded. The receipt IS the marketing surface — embedded in existing
   institutional workflows, not a separate UI to drive traffic to. Every receipt in a
   sponsor's GMS is a permanent Weft touchpoint inside the buyer's existing system.
3. **Portable ENS attestations.** Builders who get verified carry a portable attestation
   on their ENS name. When displayed on portfolios, resumes, or other sponsor pages, the
   attestation itself surfaces Weft. This is the builder-side virality loop.
4. **Social proof bot (planned).** A Farcaster/Twitter bot that auto-verifies public
   milestone claims and posts the attestation in reply — turns every public milestone
   announcement into a Weft touchpoint. Low effort, high surface area.

The free daemon tier (0% fee) is the wedge for builder-side adoption: lowers barrier,
creates network effects, and every free user is a potential upgrade to the Hermes
Agent tier.

## Revenue Model

### Mechanism: Revenue Share on Released Capital

Weft earns when builders earn. No upfront fees, no monthly subscriptions.

```
Milestone:     10 ETH staked by backers
Verification:  ✓ verified by Weft Agent
Release:       10 ETH → builder
Platform fee:  0.3 ETH (3%) → Weft treasury
Net to builder: 9.7 ETH
```

**Why revenue share:**
1. Builders have no cash upfront — that's why they use Weft
2. Value is proportional to milestone size — a $500 milestone and a $50k milestone shouldn't pay the same
3. Perfect alignment — Weft only earns when the builder succeeds
4. Proven model — Stripe (2.9%), Juicebox (5%), Gitcoin (5%)

### Fee Structure

| Tier | Fee | Basis |
|---|---|---|
| Free (Daemon) | 0% | Self-hosted, no platform involvement |
| Agent | 2-3% | Of released capital after successful verification |
| Swarm | Custom | Negotiated per team |

### Implementation Options

**Option A: Onchain fee (trustless)**

Add `platformFeeBps` to `WeftMilestone.sol`. Modify `release()` to deduct before distributing.

```solidity
uint16 public platformFeeBps = 300; // 3%
address public treasury;

function release(bytes32 milestoneHash) external nonReentrant {
    // ... existing logic ...
    uint256 fee = (total * platformFeeBps) / 10_000;
    uint256 net = total - fee;
    // distribute net to splits, fee to treasury
}
```

- Pro: Trustless, transparent, automatic
- Con: Contract change, gas cost, visible onchain

**Option B: Offchain invoicing (flexible)**

Weft Agent tracks which milestones it verified. After release, invoices builder for % of released amount. Builder pays via ETH transfer.

- Pro: Simple contract, flexible pricing, negotiable
- Con: Not trustless, requires payment follow-through

**Option C: Service stake (hybrid)**

Builder optionally stakes a "service fee" alongside the milestone. After verification, Weft Agent claims its fee from the service stake.

- Pro: Aligned, escrowed, automatic
- Con: Requires additional staking from builder

**Recommendation: Option B for MVP, Option A for production.**

Option B lets you iterate on pricing without contract changes. Option A becomes important at scale when trustlessness matters.

---

## Fee Justification

### What builders get for 3%:

| Without Weft Agent | With Weft Agent |
|---|---|
| Self-hosted verification | Managed verification |
| Raw JSON attestation | Human-readable narrative |
| Manual ENS updates | Automatic reputation building |
| Single-node voting | Multi-node consensus |
| No memory across milestones | Persistent learning agent |
| CLI-only | Telegram/Discord interface |
| Manual 0G publishing | Automatic evidence bundles |

### The math for builders:

```
Milestone value:           10 ETH
Weft Agent fee (3%):       0.3 ETH
Builder receives:          9.7 ETH

Without Weft Agent:
- Manual verification setup: ~2 hours of engineering time
- Engineering cost: ~$100-200/hour = $200-400
- 0.3 ETH @ $2000/ETH = $600

Verdict: the fee is roughly equivalent to the engineering time saved,
but with better quality (multi-node consensus, narrative, memory).
```

### The math for Weft:

```
100 milestones/month × avg 10 ETH × 3% = 30 ETH/month
@ $2000/ETH = $60,000/month

1000 milestones/month = $600,000/month
```

At scale, this is a real business.

---

## Builder Experience

### Free Tier Flow

```
1. Builder creates milestone onchain
2. Builder runs: python3 weft_daemon.py --once
3. Daemon collects evidence, votes onchain
4. Builder sees: verified=true evidenceRoot=0xabc
5. Builder calls release(), funds distributed
```

### Hermes Agent Flow

```
1. Builder creates milestone onchain
2. Builder texts Weft Telegram bot: "verify my milestone 0xabc"
3. Agent responds: "Got it. Collecting evidence..."
4. Agent runs: deployment check, unique callers, 0G metadata
5. Agent generates narrative via Kimi
6. Agent broadcasts to peer nodes, builds consensus
7. Agent submits onchain vote via KeeperHub
8. Agent responds with report:

   "Your milestone 'Deploy smart contracts' has been verified.

   Evidence:
   • Contract deployed at 0x1234...5678 (block 12,345,678)
   • 147 unique wallets interacted during measurement window
   • Verifier quorum agreed on the outcome
   • Evidence published to 0G Storage

   Funds (3.5 ETH) are now available for release.
   Reply 'release' to initiate payout."

9. Builder replies "release"
10. Agent calls release(), funds distributed minus 3% fee
```

The narrative is the product. The automation is the moat.

---

## Technical Architecture

### Deployment Model

```
┌─────────────────────────────────────────────────────────┐
│              Free Tier — GCP e2-micro (free)             │
│                                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                │
│  │Verifier │  │Verifier │  │Verifier │                 │
│  │ Node 1  │  │ Node 2  │  │ Node 3  │                 │
│  │ daemon  │  │ daemon  │  │ daemon  │                 │
│  └────┬────┘  └────┬────┘  └────┬────┘                 │
│       └────────────┼────────────┘                       │
│              peer inbox broadcast                       │
└────────────────────┼────────────────────────────────────┘
                     │
              ┌──────▼──────┐
              │  0G Chain   │
              │  Contracts  │
              └──────┬──────┘
                     │
┌────────────────────┼────────────────────────────────────┐
│         Paid Tier — GitHub Codespace (free 60h/mo)       │
│                     │                                    │
│  ┌──────────────────▼──────────────────┐                │
│  │         Hermes Agent                 │                │
│  │                                      │                │
│  │  Skills:                             │                │
│  │  • weft-verify (evidence + vote)     │                │
│  │  • weft-narrate (Kimi narratives)    │                │
│  │  • weft-status (state queries)       │                │
│  │                                      │                │
│  │  Memory: persistent across sessions  │                │
│  │  Interface: CLI / Telegram / Discord  │                │
│  └──────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────┘
```

### Hermes Skills (built)

1. **weft-verify** — Check milestone state, collect evidence, submit verdict
2. **weft-narrate** — Generate human-readable narrative via Kimi from attestation data
3. **weft-status** — Query and format milestone status for builders

---

## Roadmap

### 0G Bridge Buildathon (now — 10 weeks, 5 Waves)
- [ ] **Wave 1** ($5k): Mainnet deployment of `WeftMilestone` + `VerifierRegistry` on 0G Chain. Demo video. X post.
- [ ] **Wave 2** ($7.5k): Deepen 0G Storage integration — publish attestation bundle to mainnet 0G Storage, write KV pointers.
- [ ] **Wave 3** ($15k): **Agentic ID (ERC-7857) integration** — deploy `VerifierAgenticId` contract; tokenize the first verifier agent with its track record.
- [ ] **Wave 4** ($10k): Verifier swarm demo — 3 Agentic IDs, AXL peer corroboration, sealed-ballot consensus.
- [ ] **Wave 5** ($12.5k): Token2049 Demo Day pitch + demo video. Portable ENS + Agentic ID attestations end to end.
- [ ] Multi-Wave Completion Bonus + 0G Investment Committee recommendation.

See [0G Bridge Buildathon plan](0g-bridge-buildathon.md) for the full wave-by-wave breakdown, scoping rule, and hard conditions.

### Hackathon (now — 0G APAC)
- [x] Contracts deployed on 0G Galileo
- [x] Hermes Agent with 9 auto-loaded skills (verify, chronicle, narrate, demo, manim, status, ens, workflow, treasury)
- [x] Landing page with consensus visualization, AskWeft, verified profile fallback, and live status data
- [x] 0G Storage KV/file-publishing evidence memory architecture
- [x] AXL encrypted P2P path implemented; public demo runs one live AXL process, local demo can run multiple nodes
- [x] Kimi narrative generation + fal.ai milestone imagery
- [x] ENS text record updates for portable builder reputation
- [x] Live frontend at weft.thisyearnofear.com
- [x] Comprehensive architecture docs, data model, hackathon strategy
- [x] Autonomous spend loop via Stripe Skills (agent earns 3% → sweeps to Stripe → pays for Kimi/fal/KeeperHub)
- [x] Pluggable LLM backend: Nemotron 3 Ultra (NVIDIA/NemoClaw), Kimi, NousResearch
- [x] Treasury widget on landing page (live agent P&L — earned vs spent)
- [ ] Record demo video
- [ ] Submit to 0G APAC Hackathon

### Post-Hackathon (Month 1-2)
- [ ] Telegram/Discord bot interface (requires persistent hosting, not Codespace)
- [ ] Hermes Agent on persistent VPS (Railway/Fly.io)

### Post-Hackathon (Month 1-2)
- [ ] Hermes Agent as hosted service
- [ ] Telegram/Discord bot interface
- [ ] Offchain invoicing for Agent tier
- [ ] Builder onboarding flow
- [ ] Documentation site

### Growth (Month 3-6)
- [ ] Onchain fee mechanism (Option A)
- [ ] Custom verification templates
- [ ] Multi-region deployment
- [ ] Team tier (Weft Swarm)
- [ ] Uniswap revenue routing (deferred from MVP)

### Scale (Month 6-12)
- [ ] Governance token for fee parameters
- [ ] Verifier marketplace (3rd party verifiers)
- [ ] Cross-chain verification
- [ ] SDK for framework integration
