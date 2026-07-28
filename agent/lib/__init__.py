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
from .kimi_client import Chronicle, Narrative, generate_chronicle, generate_narrative
from .chronicle import CardData, generate_milestone_card, write_card, write_chronicle
from .axl_client import (
    BroadcastResult,
    VerdictMessage,
    broadcast_verdict,
    receive_verdicts,
    tally_consensus,
    parse_peers,
    register_peer,
    axl_available,
    start_axl_node,
)
from .fal_client import (
    FalImageResult,
    FalClientError,
    fal_configured,
    generate_milestone_image,
    generate_chronicle_cover,
    comfyui_configured,
    generate_comfyui_image,
    generate_milestone_image_comfyui,
)
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
from .ens_client import EnsClient, BuilderProfile, update_ens_after_verification, issue_verified_subname
from .keeperhub_client import (
    ExecutionStatus,
    KeeperHubClientError,
    KeeperHubExecution,
    execute_contract_call,
    execute_verdict,
    get_execution_logs,
    keeperhub_configured,
    poll_execution_status,
    release_after_verification,
)
from .stripe_skills_client import (
    Balance,
    Charge,
    PaymentResult,
    ProfitLoss,
    ProvisionResult,
    StripeSkillsError,
    fund_wallet_from_revenue,
    get_balance,
    get_profit_loss,
    list_recent_charges,
    pay_for_service,
    provision_saas,
    stripe_configured,
)
from .llm_backend import (
    ChatResult,
    backend_info,
    generate_chat,
)
from .fhe_client import FheVoteResult, fhe_available, submit_encrypted_verdict
from .settlement import SettlementRail, get_settlement_rail, get_settlement_rail_name
from .canton_client import CantonSettlement, CantonLedgerStore
from .agentic_id_client import (
    AgenticIdClient,
    VerifierStats,
    agentic_id_configured,
    get_agentic_id_address,
)
from .verification_templates import (
    TemplateRegistry,
    VerificationTemplate,
    Verdict,
    EvmDeploymentUsageTemplate,
    InstitutionalChecklistTemplate,
    list_templates,
    verify as verify_template,
)
from .collectors.marketing_collector import (
    MarketingCampaignEvidence,
    MarketingCampaignTemplate,
)

# Ensure built-in collectors register themselves with the global registry.
# This import has side-effects; it must remain after verification_templates.
from . import collectors  # noqa: F401

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
    "Chronicle", "Narrative", "generate_chronicle", "generate_narrative",
    # chronicle
    "CardData", "generate_milestone_card", "write_card", "write_chronicle",
    # axl_client
    "BroadcastResult", "broadcast_verdict", "parse_peers",
    "axl_available", "start_axl_node",
    # fal_client
    "FalImageResult", "FalClientError", "fal_configured",
    "generate_milestone_image", "generate_chronicle_cover",
    "comfyui_configured", "generate_comfyui_image", "generate_milestone_image_comfyui",
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
    # ens_client
    "EnsClient", "BuilderProfile", "update_ens_after_verification", "issue_verified_subname",
    # keeperhub_client
    "ExecutionStatus", "KeeperHubClientError", "KeeperHubExecution",
    "execute_contract_call", "execute_verdict",
    "get_execution_logs", "keeperhub_configured",
    "poll_execution_status", "release_after_verification",
    # stripe_skills_client
    "Balance", "Charge", "PaymentResult", "ProfitLoss", "ProvisionResult",
    "StripeSkillsError",
    "fund_wallet_from_revenue", "get_balance", "get_profit_loss",
    "list_recent_charges", "pay_for_service", "provision_saas",
    "stripe_configured",
    # llm_backend
    "ChatResult", "backend_info", "generate_chat",
    # fhe_client
    "FheVoteResult", "fhe_available", "submit_encrypted_verdict",
    # settlement / canton
    "SettlementRail", "get_settlement_rail", "get_settlement_rail_name",
    "CantonSettlement", "CantonLedgerStore",
    # agentic id (ERC-7857-inspired, 0G Bridge Buildathon)
    "AgenticIdClient", "VerifierStats",
    "agentic_id_configured", "get_agentic_id_address",
    # verification templates
    "TemplateRegistry", "VerificationTemplate", "Verdict",
    "EvmDeploymentUsageTemplate", "InstitutionalChecklistTemplate",
    "list_templates", "verify_template",
    # collectors
    "MarketingCampaignEvidence", "MarketingCampaignTemplate",
]
