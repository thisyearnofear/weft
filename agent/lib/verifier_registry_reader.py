#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Onchain VerifierRegistry reader.

Enhancement-first:
- Uses existing JsonRpcClient + abi helpers.
- Keeps all selector constants in one place.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional

from .abi import (
    chunk_words,
    decode_address,
    decode_bool,
    encode_call,
)
from .jsonrpc import JsonRpcClient


WEFT_VERIFIER_REGISTRY_SELECTOR = "0x86a23a6b"  # verifierRegistry()
REGISTRY_IS_VERIFIER_SELECTOR = "0x33105218"  # isVerifier(address)


def _encode_address_arg(address: str) -> bytes:
    # ABI: address is right-aligned in 32 bytes
    a = address.lower()
    if a.startswith("0x"):
        a = a[2:]
    raw = bytes.fromhex(a)
    if len(raw) != 20:
        raise ValueError("address must be 20 bytes")
    return b"\x00" * 12 + raw


def read_verifier_registry_address(rpc: JsonRpcClient, weft_address: str) -> str:
    data = encode_call(WEFT_VERIFIER_REGISTRY_SELECTOR, [])
    result = rpc.call("eth_call", [{"to": weft_address, "data": data}, "latest"])
    words = chunk_words(result)
    if len(words) != 1:
        raise RuntimeError("Unexpected verifierRegistry() return")
    return decode_address(words[0])


@dataclass
class VerifierRegistryClient:
    rpc: JsonRpcClient
    registry_address: str
    _cache: Dict[str, bool]

    def __init__(self, rpc: JsonRpcClient, registry_address: str):
        self.rpc = rpc
        self.registry_address = registry_address
        self._cache = {}

    def is_verifier(self, address: str) -> bool:
        key = address.lower()
        if key in self._cache:
            return self._cache[key]

        data = encode_call(REGISTRY_IS_VERIFIER_SELECTOR, [_encode_address_arg(address)])
        result = self.rpc.call("eth_call", [{"to": self.registry_address, "data": data}, "latest"])
        words = chunk_words(result)
        if len(words) != 1:
            # treat as not authorized
            self._cache[key] = False
            return False
        ok = decode_bool(words[0])
        self._cache[key] = ok
        return ok

