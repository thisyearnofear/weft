# Weft Indexer

## Overview
The indexer reads/writes milestone state from 0G Storage or on-chain events.

## Implementation

The canonical indexer is implemented in `agent/lib/indexer_client.py`. It:
- Tries 0G Storage KV first (when `ZERO_G_INDEXER_URL` + `ZERO_G_STREAM_ID` are set)
- Falls back to on-chain events via `JsonRpcClient`

## Usage

```bash
python agent/scripts/weft_sync_from_indexer.py \
  --rpc-url "$ETH_RPC_URL" \
  --contract-address "$WEFT_CONTRACT_ADDRESS" \
  --out-dir agent/.attestations/
```

See `AGENTS.md` for the full agent workflow.