# Weft

**Weft is a decentralized verifier swarm for milestone-based capital release.**

Weft turns milestone funding into an autonomous, auditable agent workflow:
1. a builder creates a milestone and stakes capital,
2. verifier agents monitor deadlines and gather evidence,
3. peers corroborate via AXL,
4. evidence and bundle pointers persist on 0G,
5. KeeperHub reliably executes the onchain verdict,
6. ENS gives builders and verifier agents human-readable identity.

## Why this matters

Weft replaces four things that currently require corporations, lawyers, and managers:

| Primitive | Replaced by |
|---|---|
| Identity / CV | ENS text records (portable, machine-readable) |
| Funding / equity | `WeftMilestone.sol` — milestone-staked ETH |
| Verification / managers | Hermes Agent verification loop |
| Settlement / payroll | KeeperHub reliable execution (ETH-only; Uniswap routing deferred) |

## Sponsor fit at a glance

| Sponsor | What Weft uses | Why it is essential |
|---|---|---|
| **0G** | 0G Chain, metadata lookup via indexer, 0G Storage bundle/evidence publishing | Milestones, metadata, evidence roots, and downloadable attestation artifacts live in the same workflow |
| **Gensyn / AXL** | Peer broadcast, signed verdict envelopes, offchain corroboration | Separate verifier nodes coordinate before voting; no central coordinator |
| **KeeperHub** | Reliable `submitVerdict()` execution with retry/audit trail | Agents can reason about a verdict and still need a robust path to execute it onchain |
| **ENS** | Builder / verifier profile records and discoverability | Human-readable identity and portable reputation for builders and agents |
| **Hermes + Kimi** | Managed agent layer and narrative generation | Makes the system usable by humans, not just scripts |

## For judges: 3-minute demo flow

### Story in one sentence
**Weft verifies whether a builder actually shipped, then lets a decentralized verifier swarm release milestone capital with a visible audit trail.**

### Demo sequence
1. **Create / inspect a milestone**
   - show the milestone hash and metadata root on 0G
2. **Open the Weft status API**
   - `python3 agent/scripts/weft_status_api.py --port 9010`
   - open `http://localhost:9010/`
3. **Fetch the milestone payload**
   - use `/milestone/<hash>?includeMetadata=1`
   - show `demo.0g`, `demo.gensyn`, `demo.keeperhub`, and `demo.ens`
4. **Explain the peer-swarm step**
   - signed peer envelopes land in `agent/.inbox/`
   - corroborating peers agree on `(verified, evidenceRoot)`
5. **Explain the execution step**
   - KeeperHub is the preferred execution path for `submitVerdict()`
6. **Close with the artifact proof**
   - evidence root / consensus root / bundle manifest make the process auditable

### What to highlight verbally
- **0G:** metadata + evidence persistence
- **AXL:** separate verifier nodes, shared corroboration
- **KeeperHub:** reliable execution, not a raw one-off tx
- **ENS:** discoverable agent / builder identity

## Hermes Agent architecture

Weft's verification layer is a **multi-node autonomous Hermes Agent system**. Each node runs an independent Python daemon that:

1. **Polls** onchain milestones past their deadline via `DeadlineScheduler`
2. **Collects** deterministic evidence (deployment check + unique caller count)
3. **Generates** a human-readable narrative from raw attestation data using **Kimi** (`moonshot-v1-128k`)
4. **Broadcasts** verdicts to peer nodes for offchain consensus
5. **Submits** onchain votes via KeeperHub (with `cast send` fallback)
6. **Publishes** evidence bundles + consensus proofs to 0G Storage

```text
┌─────────────────────────────────────────────────────────┐
│                    0G Galileo Testnet                  │
│  WeftMilestone: 0xcc76...474c                         │
│  VerifierRegistry: 0x599e...3169                      │
└──────────┬──────────────┬──────────────┬──────────────┘
           │              │              │
     ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
     │ Verifier 1│ │ Verifier 2│ │ Verifier 3│
     │  daemon   │ │  daemon   │ │  daemon   │
     │           │ │           │ │           │
     │ • poll    │ │ • poll    │ │ • poll    │
     │ • verify  │ │ • verify  │ │ • verify  │
     │ • narrate │ │ • narrate │ │ • narrate │
     │ • vote    │ │ • vote    │ │ • vote    │
     └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
           │              │              │
           └──── signed peer envelopes ─┘
                 (AXL / inbox consensus)
```

## Demo surfaces

### 1. Status API / landing page

Run:
```bash
ETH_RPC_URL="http://127.0.0.1:8545" \
WEFT_CONTRACT_ADDRESS="0x..." \
ZERO_G_INDEXER_RPC="https://..." \
WEFT_BUILDER_ENS="builder.eth" \
WEFT_AGENT_ENS="verifier.eth" \
python3 agent/scripts/weft_status_api.py --port 9010
```

Open:
- `http://localhost:9010/`
- `http://localhost:9010/demo`
- `http://localhost:9010/milestone/<hash>?includeMetadata=1`

The milestone payload includes a `demo` section that surfaces:
- **0G** metadata and evidence-root context
- **Gensyn / AXL** peer corroboration state from `agent/.inbox/`
- **KeeperHub** execution-path configuration
- **ENS** builder / agent profile visibility

### 2. Hermes skills

Open in Codespaces if you want the managed-agent flow:
**[Open in GitHub Codespaces](https://codespaces.new/thisyearnofear/weft)**

Then:
```bash
bash setup-hermes.sh && source ~/.bashrc && hermes setup
hermes
```

Useful prompts:
```text
Load ~/weft/agent/skills/weft-status/SKILL.md and check the status of milestone 0x0f93e22d852f346d633f5bd0f61d38e011661ee09a74b0a7dd2856181fe9266f
```

```text
Load ~/weft/agent/skills/weft-narrate/SKILL.md and generate a narrative for milestone 0x0f93e22d852f346d633f5bd0f61d38e011661ee09a74b0a7dd2856181fe9266f
```

```text
Load ~/weft/agent/skills/weft-verify/SKILL.md and verify milestone 0x0f93e22d852f346d633f5bd0f61d38e011661ee09a74b0a7dd2856181fe9266f
```

## Quick start

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Init dependencies (one-time)
git submodule update --init --recursive

# Solidity tests
forge test

# Python agent tests
python -m pytest agent/test/ -v
```

### Local deployment / milestone flow

```bash
# Deploy locally
DEPLOYER_KEY=0x... ETH_RPC_URL=http://127.0.0.1:8545 ./scripts/deploy.sh

# Builder onboarding (alpha)
python3 scripts/weft_builder.py init-metadata \
  --chain-id 16600 \
  --contract-address 0x0000000000000000000000000000000000000000 \
  --deadline 1710000000 \
  --upload-0g

python3 scripts/weft_builder.py verify-metadata \
  --root 0x... \
  --expect-chain-id 16600 \
  --expect-contract-address 0x0000000000000000000000000000000000000000 \
  --expect-deadline 1710000000

python3 scripts/weft_builder.py create-milestone \
  --rpc-url "$ETH_RPC_URL" \
  --weft "$WEFT_CONTRACT_ADDRESS" \
  --private-key 0x... \
  --project "my-project" \
  --metadata-root 0x... \
  --indexer "$ZERO_G_INDEXER_RPC"

python3 scripts/weft_builder.py stake \
  --rpc-url "$ETH_RPC_URL" \
  --weft "$WEFT_CONTRACT_ADDRESS" \
  --private-key 0x... \
  --milestone-hash 0x... \
  --value-eth 0.05
```

### Verification flow

```bash
# Collect attestation
python agent/scripts/weft_collect_attestation.py \
  --rpc-url "http://127.0.0.1:8545" \
  --weft-milestone "0x..." \
  --milestone-hash "0x..." \
  --contract-address "0x..." \
  --out agent/.attestations/attestation.json

# Run verifier daemon once
ETH_RPC_URL="http://127.0.0.1:8545" \
WEFT_CONTRACT_ADDRESS="0x..." \
PRIVATE_KEY="0x..." \
ZERO_G_INDEXER_RPC="https://..." \
python3 agent/scripts/weft_daemon.py --once
```

## Why each integration is real

### 0G
- Weft milestones live on **0G Chain**
- builder metadata is resolved from **0G indexer / storage**
- evidence / consensus artifacts can be uploaded and referenced deterministically

### Gensyn / AXL
- verifiers share signed verdict envelopes across nodes
- peer corroboration is visible in the inbox-derived consensus view
- this is not an in-process mock; the design is node-to-node

### KeeperHub
- preferred execution path for `submitVerdict()`
- gives retry logic, gas optimization, audit trail, and better operator reliability

### ENS
- builder and verifier profiles can be anchored in text records
- identity and discoverability become portable across tools and frontends

## Kimi integration

Each verification cycle can optionally call Kimi to transform raw attestation JSON into a builder-facing narrative:

```python
from agent.lib.kimi_client import generate_narrative

narrative = generate_narrative(attestation)
```

The narrative is persisted alongside the attestation and can be published to 0G Storage as part of the evidence bundle.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ETH_RPC_URL` | Yes | 0G Chain RPC |
| `WEFT_CONTRACT_ADDRESS` | Yes | Deployed WeftMilestone |
| `GITHUB_TOKEN` | No | GitHub API for commits/PRs |
| `KIMI_API_KEY` | No | Kimi API for narrative |
| `KEEPERHUB_API_KEY` | No | KeeperHub reliable execution (fallback: `cast send`) |
| `ZERO_G_INDEXER_RPC` | Yes (verifier/demo) | Milestone metadata lookup |
| `ZERO_G_*` | No | 0G Storage config (publish evidence/bundles) |
| `WEFT_BUILDER_ENS` | No | Builder ENS name to display/update |
| `WEFT_AGENT_ENS` | No | Verifier agent ENS name to display |

See [AGENTS.md](AGENTS.md) for the full environment variable reference.

## Qualification checklist

### Open Agents / 0G / Gensyn / KeeperHub / ENS
- [x] project name and short description
- [x] public GitHub repo
- [x] setup instructions
- [x] contract deployment addresses
- [x] explanation of protocol usage
- [x] working example agent / daemon flow
- [ ] final demo video under 3 minutes
- [ ] final live demo link in submission
- [ ] final team/contact block in submission form
- [ ] architecture diagram image if you want a stronger package

### Uniswap
- [x] required `FEEDBACK.md` exists
- [ ] real Uniswap API integration intentionally deferred until there is a core settlement use case

## Product tiers

### Free — Weft Daemon
Self-hosted Python verification loop.

```bash
python3 agent/scripts/weft_daemon.py --once
```

### Weft Agent (Hermes Agent)
Managed verification with AI-powered narrative generation.

### Weft Swarm (Enterprise)
Multi-agent verification infrastructure for teams and DAOs.

See [Product Plan](docs/product-plan.md) for the full monetization strategy.

## Links

- [Hackathon Submission Pack](docs/hackathon-submission.md)
- [Judge-Friendly Architecture Diagram](docs/architecture-diagram.md)
- [Product Plan & Monetization](docs/product-plan.md)
- [Technical Architecture](docs/architecture.md)
- [MVP Spec](docs/mvp.md)
- [Agent Workflow](AGENTS.md)
- [Builder Feedback for Uniswap](FEEDBACK.md)

## Deployed contracts

**0G Galileo Testnet (Chain ID: 16602)**

| Contract | Address |
|---|---|
| WeftMilestone | `0xcc768d56b0053b1b2df5391dde989be3f859474c` |
| VerifierRegistry | `0x599e34de50379c584787e0b7ba616ac9b6723169` |

**RPC**: `https://evmrpc-testnet.0g.ai`

**Explorer**: `https://explorer-testnet.0g.ai`

## License

MIT
