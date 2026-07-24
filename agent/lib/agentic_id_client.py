#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
VerifierAgenticId client — tokenizes each authorized verifier as an onchain
agent (ERC-7857-inspired) with its track record embedded as intelligence.

Read methods use eth_call via JsonRpcClient.
Write methods return calldata for the daemon to submit via cast send / KeeperHub.

Env vars:
- WEFT_AGENTIC_ID_ADDRESS   Deployed VerifierAgenticId contract address

Built for the 0G Bridge Buildathon — see docs/0g-bridge-buildathon.md.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Dict, Optional

from .abi import (
    chunk_words,
    decode_address,
    decode_bool,
    decode_bytes32,
    decode_uint64,
    decode_word,
    encode_call,
)
from .jsonrpc import JsonRpcClient


# ---- Function selectors ----
# Computed via `cast sig <signature>`.
SEL_MINT = "0x2cfd3005"  # mint(address,bytes32)
SEL_SET_WEFT_MILESTONE = "0xde2e4816"  # setWeftMilestone(address)
SEL_RECORD_VERDICT = "0xa1fc56ef"  # recordVerdict(address,bool,bytes32)
SEL_UPDATE_METADATA_ROOT = "0x8d1105bf"  # updateMetadataRoot(uint256,bytes32)
SEL_VERIFIER_OF = "0x9bd6f65e"  # verifierOf(uint256)
SEL_TOKEN_OF = "0x42ec38e2"  # tokenOf(address)
SEL_GET_STATS = "0x7b303965"  # getStats(uint256)
SEL_STATS_OF_VERIFIER = "0x33d299be"  # statsOfVerifier(address)
SEL_WEFT_MILESTONE = "0x4699ca23"  # weftMilestone()
SEL_TOTAL_AGENTS = "0xc5053712"  # totalAgents()


def _encode_address(address: str) -> bytes:
    a = address.lower()
    if a.startswith("0x"):
        a = a[2:]
    raw = bytes.fromhex(a)
    if len(raw) != 20:
        raise ValueError("address must be 20 bytes")
    return b"\x00" * 12 + raw


def _encode_bytes32(value_hex: str) -> bytes:
    s = value_hex.lower()
    if s.startswith("0x"):
        s = s[2:]
    raw = bytes.fromhex(s)
    if len(raw) != 32:
        raise ValueError("bytes32 must be 32 bytes")
    return raw


def _encode_uint256(value: int) -> bytes:
    if value < 0:
        raise ValueError("uint256 must be non-negative")
    return value.to_bytes(32, byteorder="big", signed=False)


def _encode_bool(value: bool) -> bytes:
    return (1 if value else 0).to_bytes(32, byteorder="big", signed=False)


@dataclass(frozen=True)
class VerifierStats:
    milestones_verified: int
    quorum_participated: int
    last_evidence_root: str
    last_active_at: int
    minted_at: int
    metadata_root: str

    @classmethod
    def from_words(cls, words) -> "VerifierStats":
        """Decode the 6-word tuple returned by getStats/statsOfVerifier."""
        if len(words) != 6:
            raise RuntimeError(f"expected 6 words for VerifierStats, got {len(words)}")
        return cls(
            milestones_verified=decode_word(words[0]),
            quorum_participated=decode_word(words[1]),
            last_evidence_root=decode_bytes32(words[2]),
            last_active_at=decode_uint64(words[3]),
            minted_at=decode_uint64(words[4]),
            metadata_root=decode_bytes32(words[5]),
        )


@dataclass
class AgenticIdClient:
    """
    Read + write calldata helper for VerifierAgenticId.

    Reads use the provided JsonRpcClient.
    Writes return calldata strings; the caller (daemon) submits via cast send / KeeperHub.
    """

    rpc: JsonRpcClient
    contract_address: str
    _stats_cache: Dict[str, "VerifierStats"]

    def __init__(self, rpc: JsonRpcClient, contract_address: str):
        self.rpc = rpc
        self.contract_address = contract_address
        self._stats_cache = {}

    # ---- Read methods ----

    def weft_milestone(self) -> str:
        """Return the authorized WeftMilestone caller address."""
        data = encode_call(SEL_WEFT_MILESTONE, [])
        result = self.rpc.call("eth_call", [{"to": self.contract_address, "data": data}, "latest"])
        words = chunk_words(result)
        return decode_address(words[0])

    def total_agents(self) -> int:
        """Return the total number of minted Agentic IDs."""
        data = encode_call(SEL_TOTAL_AGENTS, [])
        result = self.rpc.call("eth_call", [{"to": self.contract_address, "data": data}, "latest"])
        words = chunk_words(result)
        return decode_word(words[0])

    def token_of(self, verifier: str) -> int:
        """Return the tokenId for a verifier (0 if not minted)."""
        data = encode_call(SEL_TOKEN_OF, [_encode_address(verifier)])
        result = self.rpc.call("eth_call", [{"to": self.contract_address, "data": data}, "latest"])
        words = chunk_words(result)
        return decode_word(words[0])

    def verifier_of(self, token_id: int) -> str:
        """Return the verifier address for a tokenId."""
        data = encode_call(SEL_VERIFIER_OF, [_encode_uint256(token_id)])
        result = self.rpc.call("eth_call", [{"to": self.contract_address, "data": data}, "latest"])
        words = chunk_words(result)
        return decode_address(words[0])

    def get_stats(self, token_id: int) -> VerifierStats:
        """Return the onchain track record (intelligence) for a tokenId."""
        data = encode_call(SEL_GET_STATS, [_encode_uint256(token_id)])
        result = self.rpc.call("eth_call", [{"to": self.contract_address, "data": data}, "latest"])
        words = chunk_words(result)
        return VerifierStats.from_words(words)

    def stats_of_verifier(self, verifier: str, use_cache: bool = True) -> VerifierStats:
        """Return the onchain track record for a verifier address."""
        key = verifier.lower()
        if use_cache and key in self._stats_cache:
            return self._stats_cache[key]

        data = encode_call(SEL_STATS_OF_VERIFIER, [_encode_address(verifier)])
        result = self.rpc.call("eth_call", [{"to": self.contract_address, "data": data}, "latest"])
        words = chunk_words(result)
        stats = VerifierStats.from_words(words)
        self._stats_cache[key] = stats
        return stats

    # ---- Write calldata encoders (caller submits via cast send / KeeperHub) ----

    @staticmethod
    def encode_mint(verifier: str, metadata_root: str = "0x" + "00" * 32) -> str:
        """Encode mint(verifier, metadataRoot) calldata."""
        return encode_call(SEL_MINT, [_encode_address(verifier), _encode_bytes32(metadata_root)])

    @staticmethod
    def encode_set_weft_milestone(milestone: str) -> str:
        """Encode setWeftMilestone(milestone) calldata."""
        return encode_call(SEL_SET_WEFT_MILESTONE, [_encode_address(milestone)])

    @staticmethod
    def encode_record_verdict(verifier: str, did_complete: bool, evidence_root: str) -> str:
        """Encode recordVerdict(verifier, didComplete, evidenceRoot) calldata."""
        return encode_call(
            SEL_RECORD_VERDICT,
            [_encode_address(verifier), _encode_bool(did_complete), _encode_bytes32(evidence_root)],
        )

    @staticmethod
    def encode_update_metadata_root(token_id: int, new_root: str) -> str:
        """Encode updateMetadataRoot(tokenId, newRoot) calldata."""
        return encode_call(
            SEL_UPDATE_METADATA_ROOT, [_encode_uint256(token_id), _encode_bytes32(new_root)]
        )


def agentic_id_configured() -> bool:
    """Return True if the Agentic ID contract address is configured."""
    return bool(os.environ.get("WEFT_AGENTIC_ID_ADDRESS"))


def get_agentic_id_address() -> Optional[str]:
    """Return the configured VerifierAgenticId contract address, or None."""
    addr = os.environ.get("WEFT_AGENTIC_ID_ADDRESS")
    if not addr:
        return None
    return addr if addr.startswith("0x") else "0x" + addr
