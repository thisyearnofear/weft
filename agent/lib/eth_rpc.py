#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Small, dependency-free Ethereum JSON-RPC helpers.

Kept intentionally minimal: conversions + a few core calls + timestamp/block range search.
"""

from __future__ import annotations

from typing import Any, Dict, Tuple

from .jsonrpc import JsonRpcClient


def to_int(hex_or_int: Any) -> int:
    if isinstance(hex_or_int, int):
        return hex_or_int
    if isinstance(hex_or_int, str):
        return int(hex_or_int, 16)
    raise TypeError(f"Unsupported numeric type: {type(hex_or_int)}")


def block_number(rpc: JsonRpcClient) -> int:
    return to_int(rpc.call("eth_blockNumber", []))


def chain_id(rpc: JsonRpcClient) -> int:
    return to_int(rpc.call("eth_chainId", []))


def get_block(rpc: JsonRpcClient, number: int, full: bool = False) -> Dict[str, Any]:
    return rpc.call("eth_getBlockByNumber", [hex(number), bool(full)])


def block_timestamp(block: Dict[str, Any]) -> int:
    return to_int(block["timestamp"])


def latest_timestamp(rpc: JsonRpcClient) -> int:
    bn = block_number(rpc)
    return block_timestamp(get_block(rpc, bn, full=False))


def get_code(rpc: JsonRpcClient, address: str, block: str = "latest") -> str:
    return rpc.call("eth_getCode", [address, block])


def get_tx_receipt(rpc: JsonRpcClient, tx_hash: str) -> Dict[str, Any]:
    return rpc.call("eth_getTransactionReceipt", [tx_hash])


def find_first_block_at_or_after(rpc: JsonRpcClient, target_ts: int) -> int:
    latest = block_number(rpc)
    lo, hi = 0, latest
    while lo < hi:
        mid = (lo + hi) // 2
        ts = block_timestamp(get_block(rpc, mid, full=False))
        if ts < target_ts:
            lo = mid + 1
        else:
            hi = mid
    return lo


def find_last_block_at_or_before(rpc: JsonRpcClient, target_ts: int) -> int:
    latest = block_number(rpc)
    lo, hi = 0, latest
    while lo < hi:
        mid = (lo + hi + 1) // 2
        ts = block_timestamp(get_block(rpc, mid, full=False))
        if ts > target_ts:
            hi = mid - 1
        else:
            lo = mid
    return lo

