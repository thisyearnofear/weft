#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f "scripts/.env" ]]; then
  echo "Missing scripts/.env"
  exit 1
fi

# shellcheck disable=SC1091
source "scripts/.env"

export ETH_RPC_URL
export WEFT_CONTRACT_ADDRESS
export ZERO_G_INDEXER_RPC
export STATUS_HOST
export STATUS_PORT

python3 agent/scripts/weft_status_api.py --host "${STATUS_HOST}" --port "${STATUS_PORT}"

