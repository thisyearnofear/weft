# Weft — Product Plan & Monetization Strategy

## Vision

Weft is the verification infrastructure layer for onchain work. Builders create milestones, backers stake capital, and Weft's autonomous agents verify completion — replacing managers, lawyers, and escrow services with onchain proof.

**The business model: sell trust at a percentage of the capital it unlocks.**

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
| Kimi narrative generation | ✅ |
| Anomaly detection | ✅ |
| Automatic 0G Storage publishing | ✅ |
| Multi-node peer consensus (AXL) | ✅ |
| KeeperHub reliable execution | ✅ |
| ENS record updates | ✅ |
| Human-readable verification reports | ✅ |

**Value prop:** "An AI agent that verifies your work and tells the story."

**Strategic role:** Revenue driver. This is the product.

**Cost to Weft:** Hosting (minimal — e2-micro), Kimi API calls, 0G Storage writes.

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
   • All 3 verifiers agreed on the outcome
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

## Hackathon Positioning

### ETHGlobal Open Agents

| Prize | How Tiers Help |
|---|---|
| 0G ($7,500) | Free tier uses 0G Chain; Agent tier auto-publishes to 0G Storage |
| Gensyn AXL ($5,000) | Free tier is single-node; Agent tier coordinates multi-node consensus |
| ENS ($2,500) | Free tier uses ENS for identity; Agent tier auto-updates ENS records |
| KeeperHub ($4,500) | Free tier uses cast send; Agent tier uses KeeperHub for reliability |

### Nous Research Hermes Creative Hackathon

| Track | Evidence |
|---|---|
| Main Track ($15k) | Hermes Agent as autonomous verification system — memory, skills, learning |
| Kimi Track ($5k) | Kimi generates human-readable narratives from raw attestation data |

**Both tracks, one submission:** "Hermes Agent that autonomously verifies onchain milestones, learns from each verification, generates narratives via Kimi, and coordinates multi-node consensus."

---

## Roadmap

### Hackathon (now)
- [x] Contracts deployed on 0G Galileo
- [x] 3-node verifier infrastructure on GCP (free tier)
- [x] Structured logging
- [x] Kimi narrative generation
- [x] Hermes skills created (verify, narrate, status)
- [x] DevContainer config for Codespace deployment
- [ ] Install Hermes Agent in Codespace
- [ ] Configure Kimi API key
- [ ] Test end-to-end via Hermes CLI
- [ ] Record demo video
- [ ] Submit to both hackathons

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
