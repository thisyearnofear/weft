// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "./utils/Ownable.sol";

/// @title VerifierAgenticId
/// @notice Tokenizes each authorized verifier as an onchain agent (ERC-7857-inspired).
/// @dev The verifier's track record (milestones verified, quorum participation,
///      evidence roots attested) becomes the agent's intelligence — embedded in the
///      token, not just a metadata pointer. Built for the 0G Bridge Buildathon.
///
///      This is a self-contained, ERC-7857-inspired implementation. Production
///      deployments should layer on the official 0G Agentic ID reference for full
///      ERC-7857 compliance (encrypted metadata, secure ownership transfer). The
///      core "intelligence-onchain" semantics here are stable and test-covered.
contract VerifierAgenticId is Ownable {
    uint256 private _nextTokenId = 1;

    // tokenId => verifier address (the agent's "identity")
    mapping(uint256 => address) public verifierOf;
    // verifier address => tokenId
    mapping(address => uint256) public tokenOf;

    /// @dev The agent's intelligence: the verifier's onchain track record.
    struct VerifierStats {
        uint256 milestonesVerified; // count of didComplete=true verdicts
        uint256 quorumParticipated; // count of any verdicts submitted
        bytes32 lastEvidenceRoot; // most recent evidence root attested
        uint64 lastActiveAt; // timestamp of most recent verdict
        uint64 mintedAt; // when the agent was tokenized
        bytes32 metadataRoot; // 0G Storage root pointing to encrypted full track record
    }
    mapping(uint256 => VerifierStats) public statsOf;

    /// @dev Authorized caller (WeftMilestone contract) that can record verdicts.
    address public weftMilestone;

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

    error NotAuthorized();
    error NotMinted(address);
    error AlreadyMinted(address);

    constructor(address _owner) Ownable(_owner) {}

    function setWeftMilestone(address _milestone) external onlyOwner {
        weftMilestone = _milestone;
        emit WeftMilestoneSet(_milestone);
    }

    /// @notice Mint an Agentic ID for an authorized verifier.
    /// @param metadataRoot 0G Storage root pointing to encrypted full track record (optional, bytes32(0) ok)
    function mint(address verifier, bytes32 metadataRoot) external onlyOwner returns (uint256 tokenId) {
        if (tokenOf[verifier] != 0) revert AlreadyMinted(verifier);
        tokenId = _nextTokenId++;
        verifierOf[tokenId] = verifier;
        tokenOf[verifier] = tokenId;
        statsOf[tokenId] = VerifierStats({
            milestonesVerified: 0,
            quorumParticipated: 0,
            lastEvidenceRoot: bytes32(0),
            lastActiveAt: 0,
            mintedAt: uint64(block.timestamp),
            metadataRoot: metadataRoot
        });
        emit VerifierMinted(tokenId, verifier, metadataRoot);
    }

    /// @notice Called by WeftMilestone when a verifier submits a verdict.
    /// @dev This is what makes the agent "intelligent" — its track record updates onchain
    ///      with every verdict, embedded in the token itself.
    function recordVerdict(address verifier, bool didComplete, bytes32 evidenceRoot) external {
        if (msg.sender != weftMilestone && msg.sender != owner) revert NotAuthorized();
        uint256 tokenId = tokenOf[verifier];
        if (tokenId == 0) revert NotMinted(verifier);

        VerifierStats storage s = statsOf[tokenId];
        s.quorumParticipated += 1;
        if (didComplete) s.milestonesVerified += 1;
        s.lastEvidenceRoot = evidenceRoot;
        s.lastActiveAt = uint64(block.timestamp);

        emit StatsUpdated(
            tokenId, verifier, s.milestonesVerified, s.quorumParticipated, evidenceRoot, s.lastActiveAt
        );
    }

    function updateMetadataRoot(uint256 tokenId, bytes32 newRoot) external onlyOwner {
        statsOf[tokenId].metadataRoot = newRoot;
        emit MetadataRootUpdated(tokenId, newRoot);
    }

    /// @dev Explicit struct-returning getter (the public mapping auto-getter returns a tuple).
    function getStats(uint256 tokenId) external view returns (VerifierStats memory) {
        return statsOf[tokenId];
    }

    function statsOfVerifier(address verifier) external view returns (VerifierStats memory) {
        uint256 tokenId = tokenOf[verifier];
        if (tokenId == 0) revert NotMinted(verifier);
        return statsOf[tokenId];
    }

    function totalAgents() external view returns (uint256) {
        return _nextTokenId - 1;
    }
}
