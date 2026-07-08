# Weft

**Escrow that releases itself.**

A sponsor locks ETH behind a deliverable. The builder ships. Autonomous agents verify
the work onchain — and if 2 of 3 agree, capital releases instantly. No manual reviews.
No chasing sponsors. No payment politics.

The agent earns 3% of every milestone it verifies, uses that revenue to pay for its own
infrastructure (LLM inference, image generation, onchain execution), and runs as a
self-sustaining company. Verified outcomes attach to the builder's ENS identity as
portable reputation.

> *"Technology provides the warp. Liberal arts provide the weft."*
>
> In weaving, the **weft** is the horizontal thread that interlaces with the vertical warp
> to create fabric. In this protocol, raw data threads — onchain events, GitHub commits,
> peer verdicts — are woven into meaningful outcomes: verified milestones, capital released,
> portable ENS reputation.

## Live

**https://weft.thisyearnofear.com**

| Surface | URL |
|---|---|
| Frontend | [weft.thisyearnofear.com](https://weft.thisyearnofear.com) |
| Verification Explorer | [/explorer](https://weft.thisyearnofear.com/explorer) |
| Agent Operations | [/operations](https://weft.thisyearnofear.com/operations) |
| Sponsor Dashboard | [/sponsor](https://weft.thisyearnofear.com/sponsor) |
| Builder Profile | [/builder/weft.thisyearnofear.eth](https://weft.thisyearnofear.com/builder/weft.thisyearnofear.eth) |
| Status API | `GET /api/status/demo` |

## Sealed-ballot consensus (Zama FHE)

When votes are public, the last verifier watches the first two and free-rides instead of
independently checking the work. We discovered this running the public version on another
testnet — verifier herding. You can't fix it with incentives, only with cryptography.

The fix: **Zama FHE sealed-ballot consensus.** Each verifier agent encrypts its vote in its
own process. The contract tallies homomorphically on Sepolia — no vote is ever decrypted.
Only the final verified/rejected boolean becomes publicly decryptable, and only after every
ballot is cast.

### Two contracts, live on Sepolia

**v1 — Addition-class FHE** (`FHE.add`, `FHE.ge`, `FHE.select`)

Each verifier encrypts a boolean ballot. The contract counts votes on ciphertext, checks
2-of-3 quorum on ciphertext, and branches on ciphertext.

- Contract: [`WeftMilestoneConfidential.sol`](contracts/src-fhe/WeftMilestoneConfidential.sol) — [`0x152d758d…d212`](https://sepolia.etherscan.io/address/0x152d758d496db7444a00a6b2c7fe254b9aced212)
- Live demo: [sealed-ballot milestone](https://weft.thisyearnofear.com/project/0xa22c4a43e1ded5d10cb6b46b801c0385a5107a013ae263d3fb04c807a99af40d?confidential=1) — click "Decrypt sealed result"

**v2 — Multiplication-class FHE** (`FHE.mul`, `FHE.and`, `FHE.add`, `FHE.ge`, `FHE.select`)

Each verifier encrypts **both** a ballot (0/1) **and** a confidence score (1–100). The
contract multiplies them on ciphertext — `weightedVote = FHE.mul(ballot, confidence)` —
accumulates a weighted tally, and requires **both** binary quorum (≥2 of 3) **and** weighted
quorum (≥100), combined with `FHE.and`. No vote, no confidence score, and no weighted tally
is ever decrypted. This is FHE multiplication, not just addition.

- Contract: [`WeftMilestoneConfidentialWeighted.sol`](contracts/src-fhe/WeftMilestoneConfidentialWeighted.sol) — [`0xcc2395ac…60f8`](https://sepolia.etherscan.io/address/0xcc2395ac3f70ace0c1828cb0a18b00da823760f8)
- Live demo: [confidence-weighted milestone](https://weft.thisyearnofear.com/project/0xbd5c85db97cd5a8f30779da9311651e549f702b6ce72ebd03dcb816d3b071722?weighted=1) — click "Decrypt sealed result"
- Sealed ballot tx (FHE.mul on Sepolia): [`0xe5a94f…`](https://sepolia.etherscan.io/tx/0xe5a94fd2632c06b5837e39b14c83c0a5e1406eae9be78b295a5de038ef04b462)
- Tests: 5 forge-fhevm tests — [high confidence verified, low confidence rejected, binary gate required, inflated ballot clamped](contracts/test-fhe/WeftMilestoneConfidentialWeighted.t.sol)

### FHE operations used

| Operation | Where | Purpose |
|---|---|---|
| `FHE.add` | v1, v2 | Accumulate encrypted vote count / weighted tally |
| `FHE.ge` | v1, v2 | Quorum check on ciphertext (≥ threshold) |
| `FHE.select` | v1, v2 | Branch on ciphertext (set verified flag) |
| `FHE.mul` | v2 | Multiply ballot × confidence — both encrypted |
| `FHE.and` | v2 | Combine binary + weighted quorum gates on ciphertext |
| `FHE.eq` | v2 | Clamp ballot to {0, 1} on ciphertext |

## How it works

1. A sponsor or DAO defines a milestone and escrows capital
2. The builder works toward the objective
3. When the deadline passes, 3 verifier agents independently collect evidence (deployment check, unique callers, GitHub commits)
4. For confidential milestones, each agent encrypts its ballot (and confidence score) client-side via the Zama SDK
5. The contract tallies on ciphertext — quorum is checked without decrypting any vote
6. Capital releases automatically when quorum confirms delivery
7. The builder retains portable reputation tied to funded outcomes, attached to their ENS name

## Integration partners

| Partner | What Weft uses | Why it matters |
|---|---|---|
| **Zama** | FHEVM on Sepolia — sealed-ballot consensus with FHE.add, FHE.mul, FHE.ge, FHE.select, FHE.and | Verifier herding is cryptographically impossible — the core FHE claim |
| **0G** | 0G Chain, 0G Storage (KV + Log), indexer | Milestones, metadata, evidence roots, attestation bundles |
| **Gensyn / AXL** | Peer broadcast, signed verdict envelopes, offchain corroboration | Separate verifier nodes coordinate before voting; no central coordinator |
| **KeeperHub** | Reliable `submitVerdict()` execution with retry/audit trail | Agents reason about a verdict and still need a robust path to execute it onchain |
| **ENS** | Builder / verifier profile records | Human-readable identity and portable reputation |
| **Hermes + Kimi** | Managed agent layer, narrative generation, Builder Journey chronicles | Weaves raw data threads into meaningful fabric |
| **fal.ai** | Text-to-image — AI-woven milestone swatches + chronicle covers | Visual layer for the weaving motif |

## Deployed contracts

**0G Galileo Testnet (Chain ID: 16602)** — `https://evmrpc-testnet.0g.ai`

| Contract | Address |
|---|---|
| WeftMilestone | `0x9f66158c560ce5c8b40820fdcd2874ff8d852192` |
| VerifierRegistry | `0x1356dd3f28461685ffd81d44f6ae9ae87937e34a` |

**Sepolia (Chain ID: 11155111)** — Zama FHEVM

| Contract | Address |
|---|---|
| WeftMilestoneConfidential (v1) | `0x152d758d496db7444a00a6b2c7fe254b9aced212` |
| WeftMilestoneConfidentialWeighted (v2) | `0xcc2395ac3f70ace0c1828cb0a18b00da823760f8` |
| VerifierRegistry (Sepolia) | `0xa7e74abb5c4c4fc70aff99bc4ac0b9f9bf6b5a66` |

## Documentation

- [Zama S3 submission details](SUBMISSION.md)
- [X thread + video script](docs/submissions/zama-s3-x-thread-and-video.md)
- [Technical reference](AGENTS.md) — architecture, agent layer, data model, env vars, scripts
- [Product plan & monetization](docs/product-plan.md)
- [MVP spec](docs/mvp.md)
- [Hackathon archive](docs/hackathons.md) — past submission materials
- [Build log](docs/loop.md) — TestSprite verification loop
- [Known issues & feedback](docs/feedback.md)

## Quick start

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Init dependencies
git submodule update --init --recursive

# Solidity tests
forge test

# FHE tests (requires FOUNDRY_PROFILE=fhe)
FOUNDRY_PROFILE=fhe forge test --match-contract WeftMilestoneConfidentialWeightedTest -vvv

# Python agent tests
python -m pytest agent/test/ -v
```

See [AGENTS.md](AGENTS.md) for the full agent setup, environment variables, and demo scripts.

## License

MIT
