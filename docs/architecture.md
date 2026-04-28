# Weft Architecture

## System Overview

Weft is an autonomous coordination layer that replaces four institutional primitives:
1. **Identity** → ENS with text records
2. **Funding** → Milestone staking contracts
3. **Verification** → Hermes Agent + AXL consensus
4. **Settlement** → KeeperHub + Uniswap

## Component Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Builder   │────▶│   Hermes    │────▶│  0G Storage │
│  (ENS ID)   │     │   Agent     │     │  (Evidence) │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Backer    │────▶│  Milestone   │◀────│    ENS      │
│  (Staker)   │     │  Contract   │     │  Profile    │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  KeeperHub  │
                    │  (Release)  │
                    └─────────────┘
```

## Data Flow

1. **Project Creation**: Builder creates milestone with target and deadline
2. **Staking**: Backers stake ETH against specific milestones
3. **Verification**: Hermes Agent reads git, deployment, and usage signals
4. **Consensus**: 3 Hermes nodes reach agreement via AXL
5. **Release**: KeeperHub triggers capital release to builder
6. **Settlement**: Revenue flows back to backers via Uniswap

## Smart Contracts

### WeftMilestoneStaking
- `createMilestone()`: Create new milestone
- `stake()`: Backers stake against milestone
- `verifyMilestone()`: Agent verification
- `release()`: Capital release to builder
- `distributeRevenue()`: Revenue sharing

## Storage Schema

### 0G Storage (KV)
```
key: milestone_hash
value: {
  project_hash: bytes32,
  builder: address,
  target_amount: uint256,
  staked_amount: uint256,
  deadline: uint256,
  is_verified: bool,
  is_released: bool,
  evidence_hash: bytes32
}
```

### 0G Storage (Log)
```
key: evidence_hash
value: {
  milestone_hash: bytes32,
  evidence_type: string (github|deployment|usage),
  raw_data: bytes,
  timestamp: uint256
}
```

## ENS Text Records

```
tessera.projects: ["project1", "project2"]
tessera.milestones.verified: 5
tessera.earned.total: 1500000000000000000
tessera.milestone.{hash}: evidence_hash
```

## Security Considerations

- Multi-sig verification (2-of-3 Hermes nodes)
- Time-locked release mechanism
- Evidence immutability via 0G Storage
- Reentrancy guards on all state-changing functions