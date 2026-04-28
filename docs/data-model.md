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

### WeftMilestone

#### Structs

```solidity
struct MilestoneCore {
    bytes32 projectId;         // Parent project identifier
    bytes32 templateId;        // Deterministic verification template ID
    bytes32 metadataHash;      // Pointer to project/milestone metadata (0G/IPFS/etc)
    address builder;           // Project builder address
    uint64  createdAt;         // When the milestone was created
    uint64  deadline;          // Unix timestamp deadline
    uint256 totalStaked;       // Total ETH staked by backers
    bool    finalized;         // Resolved by verifier quorum (success/fail)
    bool    verified;          // True iff quorum reached with didComplete=true
    bool    released;          // True once capital has been released
    uint8   verifierCount;     // How many verifier votes were submitted
    uint8   verifiedVotes;     // How many votes were didComplete=true
    bytes32 finalEvidenceRoot; // Content hash / 0G root of the evidence bundle
}

struct Split {
    address wallet;   // Recipient wallet (builder or co-builder)
    uint16  shareBps; // Basis points (10000 = 100%)
}
```

#### Storage Mappings

| Mapping | Key | Value | Description |
|---------|-----|-------|-------------|
| `milestones` | `bytes32` (milestoneHash) | `MilestoneCore` | All milestone core data |
| `stakes` | `bytes32` → `address` → `uint256` | Amount | Individual backer stakes |
| `splits` | `bytes32` → `Split[]` | Array | Capital recipients for a verified milestone |
| `verifierVoted` | `bytes32` → `address` → `bool` | Flag | Prevents double-voting |
| `evidenceByVerifier` | `bytes32` → `address` → `bytes32` | Root | Each verifier’s evidence pointer |

#### Functions

| Function | Visibility | Description |
|----------|------------|-------------|
| `createMilestone(...)` | external | Builder registers a milestone + template + splits |
| `stake(bytes32)` | external payable | Backer stakes ETH against milestone |
| `submitVerdict(bytes32,bool,bytes32)` | external | Authorized Hermes node submits verdict + evidence root |
| `release(bytes32)` | external | Release escrow to split recipients after verified finalize |
| `refund(bytes32)` | external | Backer refunds stake if milestone finalizes as not verified |

### VerifierRegistry

| Function | Visibility | Description |
|----------|------------|-------------|
| `addVerifier(address)` | external | Add an authorized verifier node |
| `removeVerifier(address)` | external | Remove an authorized verifier node |

---

## 0G Storage Schema

### KV Layer (Fast Lookup)

```
Key: milestoneHash (bytes32)
Value: {
    projectId: bytes32,
    templateId: bytes32,
    builder: address,
    totalStaked: uint256,
    deadline: uint256,
    finalized: bool,
    verified: bool,
    released: bool,
    finalEvidenceRoot: bytes32,
    verifierNodes: address[3],
    verifiedVotes: uint8,
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
