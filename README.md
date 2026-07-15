# Weft

**Milestone release for program offices.**

Institutional funders and grant issuers escrow capital against checkable
deliverables. Autonomous agents verify against a fixed evidence template;
Canton settles privately (need-to-know). A public EVM builder wedge on 0G
Testnet remains for crypto-native demos — not production money.

> *"Technology provides the warp. Liberal arts provide the weft."*
>
> In weaving, the **weft** is the horizontal thread that interlaces with the vertical warp
> to create fabric. In this protocol, raw data threads — evidence checklists, peer verdicts,
> settlement references — are woven into outcomes: verified milestones and capital released.

## Surfaces

**https://weft.thisyearnofear.com**

| Surface | URL | Note |
|---|---|---|
| Institutional rail (primary) | [/canton](https://weft.thisyearnofear.com/canton) | Canton Devnet · CBTC · pilot |
| Program dashboard | [/sponsor](https://weft.thisyearnofear.com/sponsor) | Funder view (public EVM demos) |
| Verification Explorer | [/explorer](https://weft.thisyearnofear.com/explorer) | 0G Testnet milestones |
| Builder create (wedge) | [/create-milestone](https://weft.thisyearnofear.com/create-milestone) | 0G Testnet — not prod |
| Agent Operations | [/operations](https://weft.thisyearnofear.com/operations) | Developer |

See [`canton/BUSINESS_BRIEF.md`](canton/BUSINESS_BRIEF.md) for ICP and who pays.

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
- Demo: [Confidential demos on Explorer](https://weft.thisyearnofear.com/explorer#fhe-demos) — open v1 sealed ballot and decrypt

**v2 — Multiplication-class FHE** (`FHE.mul`, `FHE.and`, `FHE.add`, `FHE.ge`, `FHE.select`)

Each verifier encrypts **both** a ballot (0/1) **and** a confidence score (1–100). The
contract multiplies them on ciphertext — `weightedVote = FHE.mul(ballot, confidence)` —
accumulates a weighted tally, and requires **both** binary quorum (≥2 of 3) **and** weighted
quorum (≥100), combined with `FHE.and`. No vote, no confidence score, and no weighted tally
is ever decrypted. This is FHE multiplication, not just addition.

- Contract: [`WeftMilestoneConfidentialWeighted.sol`](contracts/src-fhe/WeftMilestoneConfidentialWeighted.sol) — [`0xcc2395ac…60f8`](https://sepolia.etherscan.io/address/0xcc2395ac3f70ace0c1828cb0a18b00da823760f8)
- Demo: [Confidential demos on Explorer](https://weft.thisyearnofear.com/explorer#fhe-demos) — open v2 weighted ballot and decrypt
- Sealed ballot tx (FHE.mul on Sepolia): see [SUBMISSION.md](SUBMISSION.md) for full tx links
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

## Verification loop (TestSprite S3)

Built with the [TestSprite CLI](https://github.com/TestSprite/testsprite-cli) as the checker in a
write → verify → fix → verify loop. Full agent-written log in [LOOP.md](LOOP.md).

**40 tests** across 3 project types:
- 14 frontend CLI tests — surface loads, API contracts, E2E user journey, chaos/resilience, onchain cross-checks
- 8 backend Python tests — schema validation + value cross-checks for all REST endpoints
- 12 MCP-generated Playwright tests — auto-generated from codebase analysis, executed locally
- 6 rerun tests after polish pass

**The loop caught a real bug** (iter 19): a backend test detected a wei-to-ETH conversion error in
the explorer API (`stakedEth` returned raw wei instead of ETH). The failure bundle pinpointed the
root cause, the fix was deployed, and the rerun confirmed the fix — the complete
write→verify→fix→verify cycle.

**CI/CD**: [.github/workflows/testsprite.yml](.github/workflows/testsprite.yml) reruns all tests
on every PR and fails the build if anything breaks.

## Documentation

- [Zama S3 submission details](SUBMISSION.md)
- [X thread + video script](docs/submissions/zama-s3-x-thread-and-video.md)
- [Technical reference](AGENTS.md) — architecture, agent layer, data model, env vars, scripts
- [Product plan & monetization](docs/product-plan.md)
- [MVP spec](docs/mvp.md)
- [Hackathon archive](docs/hackathons.md) — past submission materials
- [Build log](LOOP.md) — TestSprite verification loop
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
