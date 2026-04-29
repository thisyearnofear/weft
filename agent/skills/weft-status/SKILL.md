---
name: weft-status
description: Check the status of a Weft milestone — onchain state, verification progress, and builder info
version: 1.1.0
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

## Procedure

### 1. Read milestone state

```bash
export ETH_RPC_URL="https://evmrpc-testnet.0g.ai"
export WEFT_CONTRACT_ADDRESS="0xcc768d56b0053b1b2df5391dde989be3f859474c"

cast call $WEFT_CONTRACT_ADDRESS \
  "milestones(bytes32)(bytes32,bytes32,bytes32,address,uint64,uint64,uint256,bool,bool,bool,uint8,uint8,bytes32)" \
  <MILESTONE_HASH> \
  --rpc-url $ETH_RPC_URL
```

### 2. Generate formatted report

```bash
python3 -c "
import time
from agent.lib.jsonrpc import JsonRpcClient
from agent.lib.weft_milestone_reader import read_milestone

rpc = JsonRpcClient('$ETH_RPC_URL')
m = read_milestone(rpc, '$WEFT_CONTRACT_ADDRESS', '<MILESTONE_HASH>')

now = int(time.time())
if m.finalized:
    if m.verified:
        state = 'VERIFIED'
        emoji = '\u2705'
        color = 'brightgreen'
    else:
        state = 'FAILED'
        emoji = '\u274c'
        color = 'red'
elif now >= m.deadline:
    state = 'AWAITING VOTES'
    emoji = '\u23f3'
    color = 'yellow'
else:
    remaining = m.deadline - now
    hours = remaining // 3600
    mins = (remaining % 3600) // 60
    state = f'ACTIVE ({hours}h {mins}m left)'
    emoji = '\U0001f7e2'
    color = 'blue'

staked = int(m.totalStaked) / 1e18
deadline_str = time.strftime('%b %d, %Y', time.gmtime(m.deadline))

print(f'')
print(f'  {emoji}  {state}')
print(f'')
print(f'  Builder:    {m.builder[:6]}...{m.builder[-4:]}')
print(f'  Staked:     {staked:.4f} ETH')
print(f'  Deadline:   {deadline_str}')
print(f'  Verifiers:  {m.verifiedVotes}/{m.verifierCount} verified')
print(f'  Finalized:  {m.finalized}')
print(f'  Released:   {m.released}')
if m.finalEvidenceRoot and m.finalEvidenceRoot != '0x' + '00' * 32:
    print(f'  Evidence:   {m.finalEvidenceRoot[:18]}...{m.finalEvidenceRoot[-8:]}')
print(f'')
print(f'  View: weft.build/project/{m_hash}')
print(f'')
"
```

## Output Format

Always present the status as a clean, scannable block. Example for a verified milestone:

```
  ✓  VERIFIED

  Builder:    0x80fd...ac04
  Staked:     0.0100 ETH
  Deadline:   Apr 28, 2026
  Verifiers:  3/3 verified
  Finalized:  True
  Released:   False
  Evidence:   0xabc123...def456

  View: weft.build/project/0x0f93e22d...
```

Example for an active milestone:

```
  🟢  ACTIVE (2h 15m left)

  Builder:    0x80fd...ac04
  Staked:     0.0100 ETH
  Deadline:   Apr 28, 2026
  Verifiers:  0/0 verified
  Finalized:  False
  Released:   False

  View: weft.build/project/0x0f93e22d...
```

## Pitfalls

- **Milestone not found:** All fields return zero/false. Check the hash is correct.
- **Deadline in the past but not finalized:** Verifiers haven't voted yet. This is normal.
- **finalized=true but verified=false:** Quorum wasn't reached. Backers can refund.
