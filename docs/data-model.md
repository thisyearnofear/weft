# Weft Core Data Model

## ENS Text Record Schema

Each builder's ENS name serves as their portable reputation profile. Text records are structured for machine-readable queries by future backers, collaborators, and agents.

### Root Level Records

| Record Key | Type | Description |
|------------|------|-------------|
| `weft.projects` | Array | List of project IDs the builder has participated in |
| `weft.milestones.verified` | Integer | Total count of verified milestones completed |
| `weft.earned.total` | Integer | Cumulative earnings in wei |
| `weft.cobuilders` | Array | List of ENS subnames for agent co-builders |
| `weft.reputation.score` | Integer | Composite score (0-100) based on completed work |

### Per-Project Records

Key format: `weft.project.{projectId}.*`

| Record Key | Type | Description |
|------------|------|-------------|
| `weft.project.{projectId}.role` | String | `builder`, `backer`, or `cobuild` |
| `weft.project.{projectId}.joined` | Integer | Unix timestamp of project join |
| `weft.project.{projectId}.earnings` | Integer | Earnings from this project in wei |
| `weft.project.{projectId}.milestones` | Integer | Number of milestones verified |

### Per-Milestone Records

Key format: `weft.milestone.{milestoneHash}.*`

| Record Key | Type | Description |
|------------|------|-------------|
| `weft.milestone.{milestoneHash}.project` | String | Parent project ID |
| `weft.milestone.{milestoneHash}.status` | String | `pending`, `verified`, `released` |
| `weft.milestone.{milestoneHash}.evidence` | String | 0G Storage evidence hash |
| `weft.milestone.{milestoneHash}.released` | Integer | Amount released in wei |
| `weft.milestone.{milestoneHash}.timestamp` | Integer | Verification timestamp |

### Agent Co-Builder Records

Agents participate via ENS subnames: `{agent-name}.{project}.weft.eth`

| Record Key | Type | Description |
|------------|------|-------------|
| `weft.agent.contributions` | Integer | Number of contributions verified |
| `weft.agent.earnings` | Integer | Total earnings in wei |
| `weft.agent.projects` | Array | List of project IDs participated in |

---

## Smart Contract Data Model

### WeftMilestoneStaking

#### Structs

```solidity
struct Milestone {
    bytes32 projectHash;      // Parent project identifier
    uint256 targetAmount;    // Funding target for this milestone
    uint256 stakedAmount;    // Total ETH staked by backers
    uint256 deadline;        // Unix timestamp deadline
    bool isVerified;         // Has Hermes verified completion?
    bool isReleased;         // Has capital been released?
    address builder;         // Project builder address
}

struct Stake {
    address backer;          // Staker address
    uint256 amount;          // Amount staked in wei
    uint256 timestamp;       // When stake was made
}
```

#### Storage Mappings

| Mapping | Key | Value | Description |
|---------|-----|-------|-------------|
| `milestones` | `bytes32` (milestoneHash) | `Milestone` | All milestone data |
| `milestoneStakes` | `bytes32` → `Stake[]` | Array | Backers who staked per milestone |
| `stakes` | `bytes32` → `address` → `uint256` | Amount | Individual backer stakes |

#### Functions

| Function | Visibility | Description |
|----------|------------|-------------|
| `createMilestone()` | external | Builder creates new milestone |
| `stake()` | external payable | Backer stakes ETH against milestone |
| `verifyMilestone()` | external | Hermes agent verifies completion |
| `release()` | external | Trigger capital release to builder |
| `distributeRevenue()` | external payable | Revenue sharing to backers |
| `getMilestone()` | external view | Read milestone details |
| `getStakeCount()` | external view | Get number of backers |

---

## 0G Storage Schema

### KV Layer (Fast Lookup)

```
Key: milestoneHash (bytes32)
Value: {
    projectHash: bytes32,
    builder: address,
    targetAmount: uint256,
    stakedAmount: uint256,
    deadline: uint256,
    isVerified: bool,
    isReleased: bool,
    evidenceHash: bytes32,
    verifierNodes: address[3],
    consensusBlock: uint256
}
```

### Log Layer (Permanent Evidence Archive)

```
Key: evidenceHash (bytes32)
Value: {
    milestoneHash: bytes32,
    evidenceType: string,  // "github" | "deployment" | "usage" | "synthesis"
    rawData: bytes,
    kimisummary: string,
    timestamp: uint256,
    nodeSignature: bytes
}
```

---

## Data Flow

```
Builder creates milestone
        │
        ▼
Backers stake ETH (locked in contract)
        │
        ▼
Hermes Agent reads:
  • GitHub commits/PRs
  • 0G Chain deployments
  • Usage signals
        │
        ▼
AXL consensus (2-of-3 nodes agree)
        │
        ▼
Evidence written to 0G Storage
        │
        ▼
verifyMilestone() called
        │
        ▼
release() triggers capital transfer
        │
        ▼
ENS text records updated
        │
        ▼
Revenue flows back via Uniswap (if applicable)
```

---

## Hash Calculation

### Milestone Hash
```solidity
keccak256(abi.encodePacked(
    projectId,
    milestoneIndex,
    builderAddress,
    deadline
))
```

### Project Hash
```solidity
keccak256(abi.encodePacked(
    projectName,
    builderAddress,
    timestamp
))
```

### Evidence Hash
```solidity
keccak256(abi.encodePacked(
    milestoneHash,
    evidenceType,
    rawDataHash,
    kimisummaryHash
))
```