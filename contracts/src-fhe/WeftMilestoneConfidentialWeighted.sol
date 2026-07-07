// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint8, euint16, euint32, ebool, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "../src/utils/Ownable.sol";
import {ReentrancyGuard} from "../src/utils/ReentrancyGuard.sol";
import {VerifierRegistry} from "../src/VerifierRegistry.sol";
import {WeftErrors} from "./WeftErrors.sol";

/// @title WeftMilestoneConfidentialWeighted
/// @notice Confidence-weighted sealed-ballot verifier consensus.
/// @dev Extends WeftMilestoneConfidential with FHE multiplication: each
///      verifier submits an encrypted ballot AND an encrypted confidence
///      score (1-100). The contract computes
///
///        weightedVote = FHE.mul(ballot, confidence)
///        weightedTally = FHE.add(weightedTally, weightedVote)
///
///      on ciphertext — the vote AND the confidence AND the weighted tally
///      are all encrypted, never decrypted. The final verified result
///      requires BOTH binary quorum (≥2 of 3) AND weighted quorum
///      (weightedTally ≥ weightedThreshold). This uses FHE.mul in addition
///      to FHE.add/ge/select, demonstrating multiplication-class FHE
///      computation, not just addition-class.
contract WeftMilestoneConfidentialWeighted is ZamaEthereumConfig, Ownable, ReentrancyGuard {
    struct ConfidentialMilestoneCore {
        bytes32 projectId;
        bytes32 templateId;
        bytes32 metadataHash;
        address builder;
        uint64 createdAt;
        uint64 deadline;
        uint256 totalStaked;
        bool finalized;
        ebool verified;
        bool released;
        uint8 verifierCount;
        euint8 verifiedVotes;
        euint32 weightedTally;
        bytes32 finalEvidenceRoot;
        bool resultConfirmed;
        bool resultVerified;
    }

    struct Split {
        address wallet;
        uint16 shareBps;
    }

    mapping(bytes32 => ConfidentialMilestoneCore) public milestones;
    mapping(bytes32 => mapping(address => uint256)) public stakes;
    mapping(bytes32 => Split[]) private _splits;
    mapping(bytes32 => mapping(address => bool)) public verifierVoted;
    mapping(bytes32 => mapping(address => bytes32)) public evidenceByVerifier;

    VerifierRegistry public immutable verifierRegistry;

    uint8 public quorum = 2;
    uint8 public maxVerifiers = 3;
    /// @notice Weighted quorum threshold. Each yes-vote contributes
    ///         ballot × confidence (0-100) to the weighted tally. The
    ///         milestone is verified only if weightedTally ≥ this value.
    ///         Default 100 = two verifiers at confidence ≥ 50 each.
    uint32 public weightedThreshold = 100;
    uint256 public constant TIMEOUT_GRACE = 7 days;

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
    event ResultConfirmed(bytes32 indexed milestoneHash, bool verified);
    event Released(bytes32 indexed milestoneHash);
    event Refunded(bytes32 indexed milestoneHash, address indexed backer, uint256 amount);
    event QuorumUpdated(uint8 oldQuorum, uint8 newQuorum);
    event MaxVerifiersUpdated(uint8 oldMax, uint8 newMax);
    event WeightedThresholdUpdated(uint32 oldThreshold, uint32 newThreshold);

    constructor(address _owner, VerifierRegistry _registry) Ownable(_owner) {
        verifierRegistry = _registry;
    }

    function setQuorum(uint8 newQuorum) external onlyOwner {
        emit QuorumUpdated(quorum, newQuorum);
        quorum = newQuorum;
    }

    function setMaxVerifiers(uint8 newMax) external onlyOwner {
        emit MaxVerifiersUpdated(maxVerifiers, newMax);
        maxVerifiers = newMax;
    }

    function setWeightedThreshold(uint32 newThreshold) external onlyOwner {
        emit WeightedThresholdUpdated(weightedThreshold, newThreshold);
        weightedThreshold = newThreshold;
    }

    function createMilestone(
        bytes32 milestoneHash,
        bytes32 projectId,
        bytes32 templateId,
        uint64 deadline,
        bytes32 metadataHash,
        Split[] calldata splits
    ) external {
        if (milestones[milestoneHash].builder != address(0)) revert WeftErrors.AlreadyExists();
        if (splits.length == 0) revert WeftErrors.NoSplits();
        if (deadline <= block.timestamp) revert WeftErrors.DeadlinePassed();

        ConfidentialMilestoneCore storage m = milestones[milestoneHash];
        m.projectId = projectId;
        m.templateId = templateId;
        m.metadataHash = metadataHash;
        m.builder = msg.sender;
        m.createdAt = uint64(block.timestamp);
        m.deadline = deadline;
        m.verified = FHE.asEbool(false);
        m.verifierCount = 0;
        m.verifiedVotes = FHE.asEuint8(0);
        m.weightedTally = FHE.asEuint32(0);
        m.totalStaked = 0;

        FHE.allowThis(m.verified);
        FHE.allowThis(m.verifiedVotes);
        FHE.allowThis(m.weightedTally);

        for (uint256 i = 0; i < splits.length; i++) {
            _splits[milestoneHash].push(splits[i]);
        }

        emit MilestoneCreated(milestoneHash, projectId, msg.sender, templateId, deadline, metadataHash);
    }

    function stake(bytes32 milestoneHash) external payable {
        ConfidentialMilestoneCore storage m = milestones[milestoneHash];
        if (m.builder == address(0)) revert WeftErrors.MilestoneNotFound();
        if (msg.value == 0) revert WeftErrors.NothingToRefund();

        stakes[milestoneHash][msg.sender] += msg.value;
        m.totalStaked += msg.value;

        emit Staked(milestoneHash, msg.sender);
    }

    /// @notice Submit an encrypted weighted verdict. Both the ballot (0/1)
    ///         and the confidence score (1-100) are encrypted client-side
    ///         and never decrypted on-chain. The contract computes
    ///         weightedVote = FHE.mul(ballot, confidence) on ciphertext.
    function submitWeightedVerdict(
        bytes32 milestoneHash,
        externalEuint32 encryptedDidComplete,
        externalEuint32 encryptedConfidence,
        bytes calldata inputProof,
        bytes32 evidenceRoot
    ) external {
        ConfidentialMilestoneCore storage m = milestones[milestoneHash];
        if (m.builder == address(0)) revert WeftErrors.MilestoneNotFound();
        if (!verifierRegistry.isVerifier(msg.sender)) revert WeftErrors.NotVerifier();
        if (verifierVoted[milestoneHash][msg.sender]) revert WeftErrors.AlreadyExists();
        if (block.timestamp < m.deadline) revert WeftErrors.TooEarly();

        verifierVoted[milestoneHash][msg.sender] = true;
        evidenceByVerifier[milestoneHash][msg.sender] = evidenceRoot;

        // ── Ballot: clamp to {0,1} (same as v1 — prevents a rogue
        //    verifier from encrypting 2 and faking quorum alone)
        euint32 didComplete32 = FHE.fromExternal(encryptedDidComplete, inputProof);
        euint8 ballot = FHE.select(
            FHE.eq(didComplete32, 1), FHE.asEuint8(1), FHE.asEuint8(0)
        );

        // ── Confidence: clamp to [1, 100]
        //    A verifier's confidence score is bounded so a single high-
        //    confidence vote can't dominate the weighted tally alone.
        euint32 confidence32 = FHE.fromExternal(encryptedConfidence, inputProof);
        euint32 confidenceClamped = FHE.select(
            FHE.gt(confidence32, 100),
            FHE.asEuint32(100),
            FHE.select(FHE.eq(confidence32, 0), FHE.asEuint32(1), confidence32)
        );

        // ── FHE MULTIPLICATION: weightedVote = ballot × confidence
        //    This is the key upgrade from v1. The contract multiplies
        //    two ciphertexts together — ballot (0 or 1) and confidence
        //    (1-100) — producing an encrypted weighted vote that is
        //    never decrypted. The tally accumulates these products.
        euint32 weightedVote = FHE.mul(FHE.asEuint32(ballot), confidenceClamped);

        // ── Accumulate: binary count + weighted tally
        m.verifierCount += 1;
        m.verifiedVotes = FHE.add(m.verifiedVotes, ballot);
        m.weightedTally = FHE.add(m.weightedTally, weightedVote);
        FHE.allowThis(m.verifiedVotes);
        FHE.allowThis(m.weightedTally);

        emit VerdictSubmitted(milestoneHash, msg.sender, evidenceRoot);

        // ── Sealed-ballot quorum: BOTH conditions must hold
        //    1) Binary quorum: ≥2 of 3 verifiers voted yes
        //    2) Weighted quorum: weighted tally ≥ threshold (default 100)
        //    Both computed on ciphertext, combined with FHE.and.
        ebool binaryQuorum = FHE.ge(m.verifiedVotes, quorum);
        ebool weightedQuorum = FHE.ge(m.weightedTally, weightedThreshold);
        ebool bothMet = FHE.and(binaryQuorum, weightedQuorum);
        m.verified = FHE.select(bothMet, FHE.asEbool(true), m.verified);
        FHE.allowThis(m.verified);

        if (m.verifierCount >= maxVerifiers) {
            m.finalized = true;
            m.finalEvidenceRoot = evidenceRoot;
            FHE.makePubliclyDecryptable(m.verified);
            emit MilestoneFinalized(milestoneHash, evidenceRoot);
        }
    }

    function confirmResult(
        bytes32 milestoneHash,
        bytes memory abiEncodedCleartexts,
        bytes memory decryptionProof
    ) external {
        ConfidentialMilestoneCore storage m = milestones[milestoneHash];
        if (m.builder == address(0)) revert WeftErrors.MilestoneNotFound();
        if (!m.finalized) revert WeftErrors.NotVerified();
        if (m.resultConfirmed) revert WeftErrors.AlreadyExists();

        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(m.verified);
        FHE.checkSignatures(handles, abiEncodedCleartexts, decryptionProof);

        uint256 len = abiEncodedCleartexts.length;
        if (len < 32 || len % 32 != 0) revert WeftErrors.InvalidCleartexts();
        uint256 clearWord;
        // solhint-disable-next-line no-inline-assembly
        assembly ("memory-safe") {
            clearWord := mload(add(add(abiEncodedCleartexts, 32), sub(len, 32)))
        }
        bool isVerified = clearWord == 1;

        m.resultConfirmed = true;
        m.resultVerified = isVerified;
        emit ResultConfirmed(milestoneHash, isVerified);
    }

    function release(bytes32 milestoneHash) external nonReentrant {
        ConfidentialMilestoneCore storage m = milestones[milestoneHash];
        if (m.builder == address(0)) revert WeftErrors.MilestoneNotFound();
        if (!m.finalized) revert WeftErrors.NotVerified();
        if (m.released) revert WeftErrors.AlreadyReleased();

        if (!m.resultConfirmed) revert WeftErrors.NotVerified();
        if (!m.resultVerified) revert WeftErrors.NotVerified();

        m.released = true;
        uint256 total = address(this).balance;
        Split[] storage splits = _splits[milestoneHash];
        uint256 remaining = total;

        for (uint256 i = 0; i < splits.length; i++) {
            uint256 amount = (i == splits.length - 1)
                ? remaining
                : (total * splits[i].shareBps) / 10_000;
            remaining -= amount;
            (bool ok, ) = splits[i].wallet.call{value: amount}("");
            if (!ok) revert WeftErrors.TransferFailed();
        }

        emit Released(milestoneHash);
    }

    function refund(bytes32 milestoneHash) external nonReentrant {
        ConfidentialMilestoneCore storage m = milestones[milestoneHash];
        if (m.builder == address(0)) revert WeftErrors.MilestoneNotFound();
        if (!m.finalized) revert WeftErrors.NotVerified();

        if (!m.resultConfirmed) revert WeftErrors.NotVerified();
        if (m.resultVerified) revert WeftErrors.MilestoneNotFailed();

        uint256 amount = stakes[milestoneHash][msg.sender];
        if (amount == 0) revert WeftErrors.NothingToRefund();

        stakes[milestoneHash][msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert WeftErrors.TransferFailed();

        emit Refunded(milestoneHash, msg.sender, amount);
    }

    function refundAfterTimeout(bytes32 milestoneHash) external nonReentrant {
        ConfidentialMilestoneCore storage m = milestones[milestoneHash];
        if (m.builder == address(0)) revert WeftErrors.MilestoneNotFound();
        if (!isTimedOut(milestoneHash)) revert WeftErrors.TimeoutNotReached();

        uint256 amount = stakes[milestoneHash][msg.sender];
        if (amount == 0) revert WeftErrors.NothingToRefund();

        stakes[milestoneHash][msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert WeftErrors.TransferFailed();

        emit Refunded(milestoneHash, msg.sender, amount);
    }

    function isTimedOut(bytes32 milestoneHash) public view returns (bool) {
        ConfidentialMilestoneCore storage m = milestones[milestoneHash];
        return block.timestamp > m.deadline + uint64(TIMEOUT_GRACE) && !m.finalized;
    }

    function getSplits(bytes32 milestoneHash) external view returns (Split[] memory) {
        return _splits[milestoneHash];
    }

    receive() external payable {}
}
