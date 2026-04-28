# Weft

**The verifiable reputation and milestone-funding layer for fluid builder teams.**

Weft is an autonomous coordination layer for the post-company economy. It solves four problems that currently require corporations, lawyers, and managers: identity, funding, verification, and settlement — for teams of humans, agents, or both.

## How It Works

A builder posts a project with discrete milestones and a funding target. Backers stake capital against specific milestones rather than taking equity. A Hermes Agent instance acts as the autonomous verifier — reading git commits, deployment addresses, on-chain activity, and usage signals to determine whether a milestone was genuinely hit. When it is, KeeperHub releases the staked capital automatically. If the project earns revenue, it flows back to backers proportionally via Uniswap swaps.

Every verified action — milestone funded, work completed, capital released, revenue earned — gets written as a structured attestation to 0G Storage as a permanent evidence archive, with a human-readable summary pushed to the builder's ENS profile as text records. The ENS name becomes a portable, machine-readable track record: what they shipped, who co-signed it, what it earned, how long it lasted. This record travels with the builder across every project they touch.

Agents participate as first-class co-builders. They hold project shares via ENS subnames, their output history is stored and verified exactly like a human's, and their earnings are settled the same way. Multiple Hermes nodes reach consensus on milestone completion over Gensyn's AXL peer-to-peer network — no central coordinator, no single point of trust.

## Architecture

```
weft/
├── contracts/              # Milestone staking contract (Solidity)
├── agent/                  # Hermes skill pack
│   ├── skills/             # Custom verification skills
│   └── hermes.config.yml   # Agent configuration
├── indexer/                # 0G Storage writer
├── frontend/               # Minimal UI
├── scripts/                # Deploy + setup scripts
└── docs/
    └── architecture.md     # Technical architecture docs
```

## Tech Stack

- **Smart Contracts**: Solidity on 0G Chain
- **Verification Agent**: Hermes Agent (Nous Research)
- **Multi-Verifier Consensus**: Gensyn AXL
- **Storage**: 0G Storage (KV + Log layers)
- **Identity**: ENS with text records
- **Settlement**: KeeperHub + Uniswap
- **AI Judgment**: Kimi (Moonshot)

## Getting Started

```bash
# Install Hermes Agent
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash

# Setup Hermes
hermes setup

# Deploy contracts (see scripts/)
cd scripts && ./deploy.sh
```

## Hackathon Submissions

- **Hermes/Kimi Creative Hackathon** (Nous Research × Kimi Moonshot) — Deadline May 3
- **0G APAC Hackathon** (HackQuest) — Deadline May 16

## License

MIT