# 0G Bridge by AKINDO — Buildathon plan

**Status:** Pursuing (scoping rule: reuse Canton artifacts wherever possible, no AI-x-Web3 feature creep).

10 weeks, 5 Waves, ~2 weeks each. Up to $50k in 0G credits (infrastructure, not cash). Top performers get 0G Investment Committee + Apollo cohort exposure. Demo Day at Token2049 Singapore (Oct 2026).

## Why we're pursuing it

The Buildathon is a **distribution + mainnet-forcing play**, not a strategy reset. Three things it gives us that we can't get otherwise:

1. **Forced mainnet deployment by Wave 3.** Canton enterprise buyers don't buy testnet. The Buildathon forces mainnet, which unblocks the institutional GTM.
2. **Demo video shipped.** The roadmap has "Record demo video" unchecked. The Buildathon requires a 3-min video every Wave — a forcing function for the distribution pillar.
3. **0G Investment Committee exposure.** Top performers get recommended. Real deal flow access for crypto-native sponsors.

## The scoping rule

Every Buildathon submission must be a Canton-adjacent asset that also advances the institutional GTM. **No AI-x-Web3 feature creep.** The secret ("deterministic evidence rules, not LLM judgment") is the asset — don't let the crypto audience reframe it. The Agentic ID play works precisely *because* the verifier's judgment is deterministic; that's what makes the track record tokenizable and trustworthy.

## The specific play: Agentic ID (ERC-7857)

Tokenize each verifier agent as an **Agentic ID** on 0G. The verifier's onchain track record (milestones verified, quorum participation, evidence roots attested) becomes the agent's intelligence — embedded in the token, not just a metadata pointer.

Why this wins:

- **Deepens 0G integration from 2 components to 3** (Chain + Storage + Agentic ID). Judges reward this (30% of score).
- **Compounds Weft's moat.** VerifierRegistry becomes portable and tradeable. Verifier reputation travels with the agent token. This is a new Thiel-style lock-in: the verifier reputation layer becomes the canonical reputation primitive on 0G.
- **Aligns with the ENS portable attestations distribution pillar.** ENS for builders, Agentic ID for verifiers. Symmetric. Both portable. Both surface Weft wherever they're displayed.
- **Genuinely novel.** No other project is doing agent-as-tokenized-verifier with onchain milestone track record.
- **Crypto-native reframe without abandoning the secret.** Pitch: "Verifiers are agents. Their judgment is deterministic. Their track record is a tokenized Agentic ID on 0G. You can own a piece of the verification layer."

## Wave-by-wave plan

| Wave | Credits | Ship | Why it scores |
|---|---|---|---|
| 1 | $5,000 | Mainnet deployment of `WeftMilestone` + `VerifierRegistry` on 0G Chain. Demo video. X post with #0GBridge #BuildOn0G. | 0G Chain integration live on mainnet. Progress momentum (40%). |
| 2 | $7,500 | 0G Storage integration deepened — publish a real attestation bundle to mainnet 0G Storage, write KV pointers (`weft:milestone:<hash>:bundle`). | 0G Storage integration. Real onchain activity. |
| 3 | $15,000 | **Agentic ID (ERC-7857) integration** — deploy `VerifierAgenticId` contract; tokenize the first verifier agent with its track record. Mainnet contract + explorer link. | The big one. 3rd 0G component. Wave 3 has the largest allocation and judges will reward the novelty. |
| 4 | $10,000 | Verifier swarm demo — 3 Agentic IDs, AXL peer corroboration, sealed-ballot consensus (Zama FHE on Sepolia). | Multi-agent system on 0G. Cross-track fit (AI Agents + Trust & Safety + Data & Infrastructure). |
| 5 | $12,500 | Token2049 Demo Day pitch + demo video. Portable ENS + Agentic ID attestations shown end to end. | Traction + communication (10%) + demo clarity. The whole vision in 3 minutes. |

## Submission requirements (per Wave)

- [ ] Public GitHub repo with meaningful commits during the Wave period
- [ ] README with setup instructions
- [ ] 0G Integration Proof from Wave 3 onwards (mainnet contract address + explorer link)
- [ ] Demo video (max 3 min) hosted publicly (YouTube/Loom)
- [ ] Architecture diagram + which 0G modules used + reproduction steps
- [ ] **Mandatory X post** with: project name, demo screenshot/clip, `#0GBridge #BuildOn0G`, tags `@0G_labs @0G_Builders @AKINDO_io`

## Judging criteria

| Criterion | Weight | Our lever |
|---|---|---|
| Progress & Momentum | 40% | Mainnet deployment + new Wave each cycle |
| 0G Integration | 30% | Chain + Storage + Agentic ID (3 components) |
| Technical Quality & Execution | 20% | Deterministic evidence rules (not LLM judgment) + FHE sealed ballots |
| Traction & Communication | 10% | Public X posts + demo video + AKINDO platform |

## Track fit

Weft spans 3 tracks (cross-area projects are highly encouraged):

- **AI Agents** — autonomous verifiers that operate onchain, multi-agent systems (verifier swarm)
- **Trust & Safety** — verification infrastructure, compliance, fraud detection
- **Data & Infrastructure** — verifiable evidence pipelines, on-chain data markets (0G Storage attestation bundles)

## Hard conditions

- **Don't let the Buildathon reframe the secret.** The deterministic-evidence-rules stance is the asset. Crypto audiences will push for "AI judges your work." Hold the line. The Agentic ID play works *because* the verifier's judgment is deterministic — that's what makes the track record tokenizable and trustworthy.
- **Don't invent new product surface area.** Every Buildathon submission should reuse Canton artifacts (receipt shape, institutional checklist, attestation bundle) wherever possible.
- **Don't let it cannibalize Canton pilot work.** 10 weeks is a long time. If Canton pilot work stalls, the institutional GTM stalls.

## Resources

- Program docs: https://docs.0g.ai/
- Builder Hub: https://build.0g.ai/
- Agentic ID overview: https://docs.0g.ai/concepts/agentic-id
- ERC-7857 standard: https://docs.0g.ai/developer-hub/building-on-0g/agentic-id/erc7857
- Apollo Accelerator: https://apollo.0g.ai/
- 0G Discord: https://discord.gg/0glabs
- Faucet (testnet): https://faucet.0g.ai/
