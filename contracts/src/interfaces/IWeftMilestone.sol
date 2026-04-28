// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IWeftMilestone
/// @notice ABI interface for external callers of WeftMilestone (indexers, KeeperHub, scripts).
interface IWeftMilestone {
    // ---- Structs ----

    struct MilestoneCore {
        bytes32 projectId;
        bytes32 templateId;
        bytes32 metadataHash;
        address builder;
        uint64 createdAt;
        uint64 deadline;
        uint256 totalStaked;
        bool finalized;
        bool verified;
        bool released;
        uint8 verifierCount;
        uint8 verifiedVotes;
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

    event Staked(bytes32 indexed milestoneHash, address indexed backer, uint256 amount);

    event VerdictSubmitted(
        bytes32 indexed milestoneHash,
        address indexed verifier,
        bool didComplete,
        bytes32 evidenceRoot
    );

    event MilestoneFinalized(bytes32 indexed milestoneHash, bool verified, bytes32 finalEvidenceRoot);
    event Released(bytes32 indexed milestoneHash, uint256 amount);
    event Refunded(bytes32 indexed milestoneHash, address indexed backer, uint256 amount);

    // ---- Views ----

    function milestones(bytes32 milestoneHash) external view returns (MilestoneCore memory);
    function getSplits(bytes32 milestoneHash) external view returns (Split[] memory);
    function stakes(bytes32 milestoneHash, address backer) external view returns (uint256);
    function verifierRegistry() external view returns (address);
    function quorum() external view returns (uint8);
    function maxVerifiers() external view returns (uint8);

    // ---- Admin ----

    function transferOwnership(address newOwner) external;
    function setQuorum(uint8 newQuorum) external;
    function setMaxVerifiers(uint8 newMax) external;

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

    function submitVerdict(bytes32 milestoneHash, bool didComplete, bytes32 evidenceRoot) external;

    function release(bytes32 milestoneHash) external;

    function refund(bytes32 milestoneHash) external;
}