---
name: weft-narrate
description: Generate a human-readable narrative from a Weft attestation using Kimi (moonshot-v1-128k)
version: 1.1.0
metadata:
  hermes:
    tags: [web3, ai, kimi, narrative, 0g]
    category: devops
    requires_toolsets: [terminal]
required_environment_variables:
  - name: KIMI_API_KEY
    prompt: Kimi/Moonshot API key
    help: "Get a key from https://platform.moonshot.cn"
    required_for: "narrative generation"
---

# Weft Narrative Generation

## When to Use

- After verifying a milestone, generate a human-readable report
- User asks for a summary of a milestone's verification
- User asks to explain what an attestation means
- Converting raw onchain data into builder-friendly language

## Procedure

### 1. Collect attestation data

```bash
cd ~/weft
export ETH_RPC_URL="https://evmrpc-testnet.0g.ai"
export WEFT_CONTRACT_ADDRESS="0xcc768d56b0053b1b2df5391dde989be3f859474c"

python3 agent/scripts/weft_collect_attestation.py \
  --rpc-url $ETH_RPC_URL \
  --weft-milestone $WEFT_CONTRACT_ADDRESS \
  --milestone-hash <MILESTONE_HASH> \
  --contract-address <CONTRACT_ADDRESS> \
  --out /tmp/attestation.json
```

### 2. Generate narrative

```bash
export KIMI_API_KEY="<your_kimi_api_key>"

python3 -c "
import json
from agent.lib.kimi_client import generate_narrative

with open('/tmp/attestation.json') as f:
    attestation = json.load(f)

narrative = generate_narrative(attestation)
print(narrative)
"
```

### 3. Format the output

Always present the narrative as a clean, readable block with context. Example:

```
  Weft Verification Report
  ━━━━━━━━━━━━━━━━━━━━━━━

  "Deploy smart contracts"
  Builder: 0x80fd...ac04

  Your milestone was verified onchain. Here's what we found:

  Contract Deployment
  The contract at 0x1234...5678 was deployed and confirmed
  at block 12,345,678. Code hash verified.

  Usage
  147 unique wallets interacted with the contract within
  the 7-day measurement window. This exceeds the threshold
  of 100 unique callers.

  Verification
  All 3 authorized verifiers agreed on the outcome.
  Evidence published to 0G Storage.

  ━━━━━━━━━━━━━━━━━━━━━━━
  Evidence root: 0xabc123...
  View full report: weft.build/project/0x0f93e22d...
```

## Pitfalls

- **No KIMI_API_KEY:** Falls back to raw JSON output. Get a key from https://platform.moonshot.cn
- **Rate limits:** Kimi API has rate limits. For batch verification, add delays between calls.
- **Context window:** The 128k context is more than enough for any attestation. No truncation needed.
