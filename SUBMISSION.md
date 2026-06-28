# Weft — Submission for 0G APAC Hackathon

**Escrow that releases itself.**

A sponsor locks ETH behind a deliverable. The builder ships. Autonomous agents verify
the work onchain — and if 2 of 3 agree, capital releases instantly. The agent earns 3%
of every milestone it verifies and pays for its own infrastructure via Stripe Skills.
No manual reviews. No chasing sponsors. No payment politics.

| Field | Value |
|---|---|
| **Tracks** | Track 3 — Agentic Economy & Autonomous Applications |
| | Track 4 — Web 4.0 Open Innovation |
| **Chain** | 0G Testnet (chain ID 16602) |
| **WeftMilestone contract** | [`0x9f66158c560ce5c8b40820fdcd2874ff8d852192`](https://explorer-testnet.0g.ai/address/0x9f66158c560ce5c8b40820fdcd2874ff8d852192) |
| **VerifierRegistry** | `0x1356dd3f28461685ffd81d44f6ae9ae87937e34a` |
| **Demo milestone** | `0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f` |
| **ENS identity** | `weft.thisyearnofear.eth` |
| **Frontend** | https://weft.thisyearnofear.com |
| **Source** | https://github.com/thisyearnofear/weft |

## What was built

Weft is a capital coordination system for internet-native teams:

1. A sponsor locks ETH into a **WeftMilestone** smart contract against a specific deliverable
2. The builder ships the work — deploys a contract, hits usage targets, pushes commits
3. Autonomous **verifier nodes** collect onchain evidence, check deployment + usage signals
4. Nodes reach **peer consensus** (2-of-3 quorum) over encrypted P2P channels
5. Capital releases automatically when quorum confirms the outcome
6. The verified outcome attaches to the builder's **ENS identity** as portable reputation

## What's verified onchain

The demo milestone `0x516975...` is **verified, finalized, and released** on 0G Testnet:

- **2 of 3 verifier quorum** reached — two independently registered verifiers voted `didComplete=true`
- **0.01 ETH** capital released from escrow
- **Evidence root** recorded onchain at `0x01e1b3...`
- Full verification: submitVerdict → MilestoneFinalized → release → CapitalReleased

## Demo walkthrough

1. Go to **[weft.thisyearnofear.com](https://weft.thisyearnofear.com)**
2. Click the "Try: 0x516975...b1c16f" chip in the hero section
3. See the verified milestone result card: status, staked amount, verifier votes, released capital
4. Click **"Read the story"** — Kimi weaves onchain evidence into a Builder Journey narrative
5. Visit **/builder/weft.thisyearnofear.eth** — see portable ENS trust profile with reputation score
6. Visit **[/recovery](https://weft.thisyearnofear.com/recovery)** — inject failures into all 4 infrastructure layers and watch the agent recover

## Stack

| Layer | Technology |
|---|---|
| Smart contracts | Solidity (Foundry) — WeftMilestone.sol, VerifierRegistry.sol |
| Offchain verification | Python daemon — `weft_daemon.py` |
| Peer consensus | AXL encrypted P2P transport |
| Execution | KeeperHub + cast send fallback |
| Metadata storage | 0G Storage (content-addressed) |
| Frontend | Next.js 16 + RainbowKit + wagmi |
| Identity | ENS text records |
| Narrative AI | Kimi / Moonshot API |

## Architecture

```
Sponsor locks ETH ──→ WeftMilestone.sol ──→ Builder ships work
                         │
                    deadline passes
                         │
               ┌─────────▼─────────┐
               │  Verifier swarm    │
               │  (Python daemon)   │
               │                    │
               │ 1. Read milestone  │
               │ 2. Download meta   │ ← 0G Storage
               │ 3. Check deploy    │ ← onchain
               │ 4. Count callers   │ ← onchain
               │ 5. Build attest.   │
               │ 6. Peer consensus  │ ← AXL P2P
               │ 7. Submit verdict  │ ← submitVerdict()
               └─────────┬─────────┘
                         │
               ┌─────────▼─────────┐
               │  quorum ≥ 2/3?     │
               │  yes → verified    │
               │  no  → not met     │
               └─────────┬─────────┘
                         │
                   release() called
                         │
               ┌─────────▼─────────┐
               │  Capital released  │
               │  ENS reputation    │
               │  updated           │
               └───────────────────┘
```

## Project structure

```
weft/
├── contracts/          # Solidity (Foundry project)
│   └── src/
│       ├── WeftMilestone.sol      # Core escrow + verification contract
│       └── VerifierRegistry.sol   # Authorized verifier node registry
├── agent/              # Python verifier daemon
│   ├── lib/            # Shared modules (RPC, ABI, evidence, ENS, AXL, KeeperHub)
│   └── scripts/        # weft_daemon.py, weft_status_api.py, etc.
├── frontend/           # Next.js 16 app (App Router)
│   └── src/
│       ├── app/        # Pages (landing, builder, sponsor, recovery, story, project)
│       └── components/ # UI components (ConnectButton, AskWeft, ScrollStory, etc.)
└── docs/               # Architecture, product plan
```
