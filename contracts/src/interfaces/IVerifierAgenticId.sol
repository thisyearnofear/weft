// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IVerifierAgenticId
/// @notice ABI interface for external callers (indexers, KeeperHub, Python clients).
/// @dev Mirrors the public surface of VerifierAgenticId. See VerifierAgenticId.sol for docs.
interface IVerifierAgenticId {
    struct VerifierStats {
        uint256 milestonesVerified;
        uint256 quorumParticipated;
        bytes32 lastEvidenceRoot;
        uint64 lastActiveAt;
        uint64 mintedAt;
        bytes32 metadataRoot;
    }

    event VerifierMinted(uint256 indexed tokenId, address indexed verifier, bytes32 metadataRoot);
    event StatsUpdated(
        uint256 indexed tokenId,
        address indexed verifier,
        uint256 verified,
        uint256 participated,
        bytes32 evidenceRoot,
        uint64 at
    );
    event MetadataRootUpdated(uint256 indexed tokenId, bytes32 newRoot);
    event WeftMilestoneSet(address indexed milestone);

    function verifierOf(uint256 tokenId) external view returns (address);
    function tokenOf(address verifier) external view returns (uint256);
    function statsOf(uint256 tokenId) external view returns (VerifierStats memory);
    function getStats(uint256 tokenId) external view returns (VerifierStats memory);
    function weftMilestone() external view returns (address);
    function totalAgents() external view returns (uint256);

    function statsOfVerifier(address verifier) external view returns (VerifierStats memory);
    function recordVerdict(address verifier, bool didComplete, bytes32 evidenceRoot) external;
}
