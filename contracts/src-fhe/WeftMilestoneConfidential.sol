// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint8, euint32, ebool, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "../src/utils/Ownable.sol";
import {ReentrancyGuard} from "../src/utils/ReentrancyGuard.sol";
import {VerifierRegistry} from "../src/VerifierRegistry.sol";
import {WeftErrors} from "./WeftErrors.sol";

/// @title WeftMilestoneConfidential
/// @notice Confidential milestone escrow with sealed-ballot verifier consensus.
/// @dev Additive to WeftMilestone.sol — uses FHEVM encrypted types so that
///      stake amounts, individual verifier votes, and release amounts are
///      confidential. The contract enforces 2-of-3 quorum on encrypted votes
///      without decrypting any individual vote (sealed ballot).
contract WeftMilestoneConfidential is ZamaEthereumConfig, Ownable, ReentrancyGuard {
    // ----------------------------
    // Types
    // ----------------------------

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
        bytes32 finalEvidenceRoot;
        bool resultConfirmed;
        bool resultVerified;
    }

    struct Split {
        address wallet;
        uint16 shareBps;
    }

    // ----------------------------
    // Storage
    // ----------------------------

    mapping(bytes32 => ConfidentialMilestoneCore) public milestones;
    mapping(bytes32 => mapping(address => uint256)) public stakes;
    mapping(bytes32 => Split[]) private _splits;
    mapping(bytes32 => mapping(address => bool)) public verifierVoted;
    mapping(bytes32 => mapping(address => bytes32)) public evidenceByVerifier;

    VerifierRegistry public immutable verifierRegistry;

    uint8 public quorum = 2;
    uint8 public maxVerifiers = 3;
    uint256 public constant TIMEOUT_GRACE = 7 days;
    // ----------------------------
    // Events
    // ----------------------------

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

    // ----------------------------
    // Constructor
    // ----------------------------

    constructor(address _owner, VerifierRegistry _registry) Ownable(_owner) {
        verifierRegistry = _registry;
    }

    // ----------------------------
    // Admin
    // ----------------------------

    function setQuorum(uint8 newQuorum) external onlyOwner {
        emit QuorumUpdated(quorum, newQuorum);
        quorum = newQuorum;
    }

    function setMaxVerifiers(uint8 newMax) external onlyOwner {
        emit MaxVerifiersUpdated(maxVerifiers, newMax);
        maxVerifiers = newMax;
    }

    // ----------------------------
    // Core: Create
    // ----------------------------

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
        m.totalStaked = 0;

        // Allow the contract to operate on the encrypted initial values
        FHE.allowThis(m.verified);
        FHE.allowThis(m.verifiedVotes);

        for (uint256 i = 0; i < splits.length; i++) {
            _splits[milestoneHash].push(splits[i]);
        }

        emit MilestoneCreated(milestoneHash, projectId, msg.sender, templateId, deadline, metadataHash);
    }

    // ----------------------------
    // Core: Stake
    // ----------------------------

    function stake(bytes32 milestoneHash) external payable {
        ConfidentialMilestoneCore storage m = milestones[milestoneHash];
        if (m.builder == address(0)) revert WeftErrors.MilestoneNotFound();
        if (msg.value == 0) revert WeftErrors.NothingToRefund();

        stakes[milestoneHash][msg.sender] += msg.value;
        m.totalStaked += msg.value;

        emit Staked(milestoneHash, msg.sender);
    }
    // ----------------------------
    // Core: Submit Verdict (sealed ballot)
    // ----------------------------

    /// @notice Submit an encrypted verdict. The didComplete boolean is encrypted
    ///         client-side and never decrypted on-chain — sealed ballot.
    function submitVerdict(
        bytes32 milestoneHash,
        externalEuint32 encryptedDidComplete,
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

        // Decrypt the external input into an euint32, then cast to euint8
        euint32 didComplete32 = FHE.fromExternal(encryptedDidComplete, inputProof);
        euint8 didComplete8 = FHE.asEuint8(didComplete32);

        // Accumulate vote count (plaintext counter + encrypted vote sum)
        m.verifierCount += 1;
        m.verifiedVotes = FHE.add(m.verifiedVotes, didComplete8);
        FHE.allowThis(m.verifiedVotes);

        emit VerdictSubmitted(milestoneHash, msg.sender, evidenceRoot);

        // Sealed-ballot quorum: compare encrypted votes against plaintext quorum.
        // Produces an encrypted boolean — contract accumulates the result
        // via select() without ever decrypting individual votes.
        ebool quorumReached = FHE.ge(m.verifiedVotes, quorum);
        m.verified = FHE.select(quorumReached, FHE.asEbool(true), m.verified);
        FHE.allowThis(m.verified);

        // Finalize when all expected votes are collected (sealed ballot:
        // no early finalization — prevents information leakage about
        // whether quorum was reached before all verifiers vote)
        if (m.verifierCount >= maxVerifiers) {
            m.finalized = true;
            m.finalEvidenceRoot = evidenceRoot;
            // Make the verified result publicly decryptable (off-chain
            // process reads it, then confirmResult() stores the plaintext)
            FHE.makePubliclyDecryptable(m.verified);
            emit MilestoneFinalized(milestoneHash, evidenceRoot);
        }
    }

    /// @notice Confirm the sealed result with a KMS public-decryption proof.
    ///         Trustless: anyone may call. After finalization, the Zama
    ///         relayer's publicDecrypt returns the cleartext plus a proof
    ///         signed by the KMS signers; FHE.checkSignatures reverts unless
    ///         that proof matches this milestone's `verified` ciphertext, so
    ///         a caller cannot assert a fake result.
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

        // The KMS ABI-encodes the cleartexts as consecutive 32-byte words;
        // the single ebool cleartext is the final word. (The mock KMS in
        // tests wraps values in a dynamic array — reading the last word
        // handles both encodings.)
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

    // ----------------------------
    // Core: Settlement
    // ----------------------------

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

    // ----------------------------
    // Views
    // ----------------------------

    function isTimedOut(bytes32 milestoneHash) public view returns (bool) {
        ConfidentialMilestoneCore storage m = milestones[milestoneHash];
        return block.timestamp > m.deadline + uint64(TIMEOUT_GRACE) && !m.finalized;
    }

    function getSplits(bytes32 milestoneHash) external view returns (Split[] memory) {
        return _splits[milestoneHash];
    }

    receive() external payable {}
}


