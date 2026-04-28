#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

from dataclasses import dataclass

from .abi import (
    chunk_words,
    decode_address,
    decode_bool,
    decode_bytes32,
    decode_uint64,
    decode_uint8,
    decode_word,
    encode_bytes32,
    encode_call,
)
from .jsonrpc import JsonRpcClient


MILESTONES_SELECTOR = "0x9de9aaf4"  # milestones(bytes32)


@dataclass(frozen=True)
class MilestoneView:
    projectId: str
    templateId: str
    metadataHash: str
    builder: str
    createdAt: int
    deadline: int
    totalStaked: int
    finalized: bool
    verified: bool
    released: bool
    verifierCount: int
    verifiedVotes: int
    finalEvidenceRoot: str


def read_milestone(rpc: JsonRpcClient, weft_milestone_address: str, milestone_hash: str) -> MilestoneView:
    data = encode_call(MILESTONES_SELECTOR, [encode_bytes32(milestone_hash)])
    result = rpc.call("eth_call", [{"to": weft_milestone_address, "data": data}, "latest"])
    words = chunk_words(result)
    if len(words) != 13:
        raise RuntimeError(f"Unexpected milestones() return word count: {len(words)}")

    return MilestoneView(
        projectId=decode_bytes32(words[0]),
        templateId=decode_bytes32(words[1]),
        metadataHash=decode_bytes32(words[2]),
        builder=decode_address(words[3]),
        createdAt=decode_uint64(words[4]),
        deadline=decode_uint64(words[5]),
        totalStaked=decode_word(words[6]),
        finalized=decode_bool(words[7]),
        verified=decode_bool(words[8]),
        released=decode_bool(words[9]),
        verifierCount=decode_uint8(words[10]),
        verifiedVotes=decode_uint8(words[11]),
        finalEvidenceRoot=decode_bytes32(words[12]),
    )

