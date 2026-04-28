# SPDX-License-Identifier: MIT
"""Weft agent library — single source of truth for agent-layer shared logic."""

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
from .deadline_scheduler import DeadlineScheduler, PendingMilestone, poll_pending_milestones
from .github_client import GithubEvidence, collect_github_evidence, evidence_to_dict
from .jsonrpc import FileCache, JsonRpcClient, JsonRpcError, default_cache
from .kimi_client import Narrative, generate_narrative
from .axl_client import BroadcastResult, broadcast_verdict, parse_peers
from .mvp_verifier import (
    DeploymentEvidence,
    UsageEvidence,
    build_attestation,
    count_unique_callers,
    keccak_hex,
    keccak_text,
    write_attestation_files,
)
from .eth_rpc import (
    chain_id as eth_chain_id,
    get_block as eth_get_block,
    get_code as eth_get_code,
    block_number as eth_get_latest_block_number,
    get_tx_receipt as eth_get_transaction_receipt,
    find_first_block_at_or_after,
    find_last_block_at_or_before,
)
from .weft_milestone_reader import MilestoneView, read_milestone
from .zero_storage import (
    StorageReceipt,
    read_evidence_from_storage,
    write_evidence_to_storage,
)
from .indexer_client import IndexerClient, MilestoneState

__all__ = [
    # abi
    "chunk_words", "decode_address", "decode_bool", "decode_bytes32",
    "decode_uint64", "decode_uint8", "decode_word",
    "encode_bytes32", "encode_call",
    # deadline_scheduler
    "DeadlineScheduler", "PendingMilestone", "poll_pending_milestones",
    # github_client
    "GithubEvidence", "collect_github_evidence", "evidence_to_dict",
    # jsonrpc
    "FileCache", "JsonRpcClient", "JsonRpcError", "default_cache",
    # kimi_client
    "Narrative", "generate_narrative",
    # axl_client
    "BroadcastResult", "broadcast_verdict", "parse_peers",
    # mvp_verifier
    "DeploymentEvidence", "UsageEvidence",
    "build_attestation", "count_unique_callers",
    "eth_chain_id", "eth_get_block", "eth_get_code",
    "eth_get_latest_block_number", "eth_get_transaction_receipt",
    "find_first_block_at_or_after", "find_last_block_at_or_before",
    "keccak_hex", "keccak_text", "write_attestation_files",
    # weft_milestone_reader
    "MilestoneView", "read_milestone",
    # zero_storage
    "StorageReceipt", "read_evidence_from_storage", "write_evidence_to_storage",
    # indexer_client
    "IndexerClient", "MilestoneState",
]
