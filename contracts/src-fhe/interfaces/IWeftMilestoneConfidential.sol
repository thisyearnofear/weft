// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {euint256, euint8, ebool, externalEuint32} from "encrypted-types/EncryptedTypes.sol";

/// @title IWeftMilestoneConfidential
/// @notice ABI interface for external callers of WeftMilestoneConfidential.
interface IWeftMilestoneConfidential {
    // ---- Structs ----

    struct ConfidentialMilestoneCore {
        bytes32 projectId;
        bytes32 templateId;
        bytes32 metadataHash;
        address builder;
        uint64 createdAt;
        uint64 deadline;
        euint256 totalStaked;
        bool finalized;
        ebool verified;
        bool released;
        euint8 verifierCount;
        euint8 verifiedVotes;
        bytes32 finalEvidenceRoot;
    }

    struct Split {
        address wallet;
        uint16 shareBps;
    }

    // ---- Events ----

    event MilestoneCreated(
        bytes32 indexed milestoneHash,
        bytes32 indexed projectId,
        address indexed builder,
        bytes32 templateId,
        uint256 deadline,
        bytes32 metadataHash
    );

    event Staked(bytes32 indexed milestoneHash, address indexed backer);
    event VerdictSubmitted(bytes32 indexed milestoneHash, address indexed verifier, bytes32 evidenceRoot);
    event MilestoneFinalized(bytes32 indexed milestoneHash, bytes32 finalEvidenceRoot);
    event Released(bytes32 indexed milestoneHash);
    event Refunded(bytes32 indexed milestoneHash, address indexed backer);

    // ---- Core ----

    function createMilestone(
        bytes32 milestoneHash,
        bytes32 projectId,
        bytes32 templateId,
        uint64 deadline,
        bytes32 metadataHash,
        Split[] calldata splits
    ) external;

    function stake(bytes32 milestoneHash) external payable;

    function submitVerdict(
        bytes32 milestoneHash,
        externalEuint32 encryptedDidComplete,
        bytes calldata inputProof,
        bytes32 evidenceRoot
    ) external;

    function release(bytes32 milestoneHash) external;

    function refund(bytes32 milestoneHash) external;

    function refundAfterTimeout(bytes32 milestoneHash) external;

    function isTimedOut(bytes32 milestoneHash) external view returns (bool);
}
