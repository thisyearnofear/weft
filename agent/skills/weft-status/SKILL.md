---
name: weft-status
description: Check the status of a Weft milestone — onchain state, verification progress, and builder info
version: 1.0.0
metadata:
  hermes:
    tags: [web3, status, ethereum, 0g]
    category: devops
    requires_toolsets: [terminal]
---

# Weft Milestone Status

## When to Use

- User asks "what's the status of milestone 0xabc?"
- User asks if a milestone is verified, finalized, or released
- User wants to know how many verifiers have voted
- User asks about a builder's reputation or ENS profile

## Quick Status Check

```bash
export ETH_RPC_URL="https://evmrpc-testnet.0g.ai"
export WEFT_CONTRACT_ADDRESS="0xcc768d56b0053b1b2df5391dde989be3f859474c"

cast call $WEFT_CONTRACT_ADDRESS \
  "milestones(bytes32)(bytes32,bytes32,bytes32,address,uint64,uint64,uint256,bool,bool,bool,uint8,uint8,bytes32)" \
  <MILESTONE_HASH> \
  --rpc-url $ETH_RPC_URL
```

## Interpreting Results

The return values in order:

| Index | Field | Meaning |
|---|---|---|
| 0 | projectId | Unique project identifier |
| 1 | templateId | Verification template |
| 2 | metadataHash | Pointer to offchain metadata |
| 3 | builder | Builder's wallet address |
| 4 | createdAt | Unix timestamp |
| 5 | deadline | Unix timestamp — voting opens after this |
| 6 | totalStaked | Wei staked by backers |
| 7 | finalized | Verdict resolved (true/false) |
| 8 | verified | Success path only (true/false) |
| 9 | released | Capital released to builder (true/false) |
| 10 | verifierCount | How many verifiers have voted |
| 11 | verifiedVotes | How many voted "verified" |
| 12 | finalEvidenceRoot | Evidence pointer for the result |

## Status Transitions

```
CREATED → (deadline passes) → VERIFIABLE → (verifiers vote) → FINALIZED
                                                              ↓
                                              verified=true  → RELEASED
                                              verified=false → REFUNDABLE
```

## Formatted Status Report

Generate a human-readable status:

```bash
python3 -c "
import time
from agent.lib.jsonrpc import JsonRpcClient
from agent.lib.weft_milestone_reader import read_milestone

rpc = JsonRpcClient('$ETH_RPC_URL')
m = read_milestone(rpc, '$WEFT_CONTRACT_ADDRESS', '<MILESTONE_HASH>')

now = int(time.time())
if m.finalized:
    state = 'VERIFIED ✓' if m.verified else 'FAILED ✗'
elif now >= m.deadline:
    state = 'VERIFIABLE (awaiting votes)'
else:
    remaining = m.deadline - now
    state = f'ACTIVE ({remaining // 60}min until deadline)'

print(f'State:          {state}')
print(f'Builder:        {m.builder}')
print(f'Total Staked:   {int(m.totalStaked) / 1e18} ETH')
print(f'Deadline:       {time.strftime(\"%Y-%m-%d %H:%M UTC\", time.gmtime(m.deadline))}')
print(f'Verifiers:      {m.verifiedVotes}/{m.verifierCount} voted verified')
print(f'Finalized:      {m.finalized}')
print(f'Released:       {m.released}')
if m.finalEvidenceRoot != '0x' + '00' * 32:
    print(f'Evidence Root:  {m.finalEvidenceRoot}')
"
```

## Pitfalls

- **Milestone not found:** All fields return zero/false. Check the hash is correct.
- **Deadline in the past but not finalized:** Verifiers haven't voted yet. This is normal.
- **finalized=true but verified=false:** Quorum wasn't reached. Backers can refund.

## Verification

A healthy milestone should show:
- Active: deadline in future, no votes yet
- Verifiable: deadline passed, awaiting votes
- Verified: finalized=true, verified=true, released=false (ready for release)
- Released: finalized=true, verified=true, released=true (complete)
