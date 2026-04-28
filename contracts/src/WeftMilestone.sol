// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "./utils/ReentrancyGuard.sol";
import {VerifierRegistry} from "./VerifierRegistry.sol";

/// @title WeftMilestone
/// @notice Milestone-based escrow with multi-verifier quorum.
/// @dev Core responsibilities (MVP):
///      - lock ETH stakes until milestone deadline
///      - accept 2-of-3 Hermes verifier votes after deadline
///      - on success: allow release to builder/co-builders + store evidenceRoot pointer
///      - on failure: allow backers to refund
contract WeftMilestone is ReentrancyGuard {
    // ----------------------------
    // Types
    // ----------------------------

    struct MilestoneCore {
        bytes32 projectId;
        bytes32 templateId;
        bytes32 metadataHash; // pointer to 0G/IPFS/other content addressed metadata (offchain interpretation)
        address builder;
        uint64 createdAt;
        uint64 deadline;
        uint256 totalStaked;
        bool finalized; // verdict has resolved (success or fail)
        bool verified; // success path only
        bool released; // capital has been released
        uint8 verifierCount;
        uint8 verifiedVotes;
        bytes32 finalEvidenceRoot; // evidence pointer for the finalized result (MVP: assume nodes converge)
    }

    struct Split {
        address wallet;
        uint16 shareBps; // 10000 = 100%
    }

    // ----------------------------
    // Storage
    // ----------------------------

    mapping(bytes32 => MilestoneCore) public milestones; // milestoneHash => milestone
    mapping(bytes32 => mapping(address => uint256)) public stakes; // milestoneHash => backer => amount
    mapping(bytes32 => Split[]) private _splits; // milestoneHash => recipients

    mapping(bytes32 => mapping(address => bool)) public verifierVoted; // milestoneHash => verifier => voted?
    mapping(bytes32 => mapping(address => bytes32)) public evidenceByVerifier; // milestoneHash => verifier => evidenceRoot

    VerifierRegistry public immutable verifierRegistry;

    address public owner;
    uint8 public quorum = 2; // votes required (MVP: 2-of-3)
    uint8 public maxVerifiers = 3; // how many votes we wait for before declaring failure (MVP: 3)

    // ----------------------------
    // Events
    // ----------------------------

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

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

    // ----------------------------
    // Errors
    // ----------------------------

    error NotOwner();
    error NotAuthorizedVerifier();
    error ZeroAddress();
    error MilestoneExists();
    error MilestoneNotFound();
    error InvalidDeadline();
    error DeadlinePassed();
    error TooEarly();
    error AlreadyFinalized();
    error AlreadyReleased();
    error NotVerified();
    error MilestoneNotFailed();
    error AlreadyVoted();
    error InvalidStakeAmount();
    error InvalidSplits();
    error InvalidConfig();
    error NothingToRefund();
    error TransferFailed();

    // ----------------------------
    // Modifiers
    // ----------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ----------------------------
    // Constructor / Admin
    // ----------------------------

    constructor(address _owner, VerifierRegistry _verifierRegistry) {
        if (_owner == address(0)) revert ZeroAddress();
        owner = _owner;
        verifierRegistry = _verifierRegistry;
        emit OwnershipTransferred(address(0), _owner);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setQuorum(uint8 newQuorum) external onlyOwner {
        // MVP safety: enforce 1 <= quorum <= maxVerifiers
        if (newQuorum == 0 || newQuorum > maxVerifiers) revert InvalidConfig();
        quorum = newQuorum;
    }

    function setMaxVerifiers(uint8 newMax) external onlyOwner {
        // MVP safety: enforce max >= quorum
        if (newMax == 0 || newMax < quorum) revert InvalidConfig();
        maxVerifiers = newMax;
    }

    // ----------------------------
    // Views
    // ----------------------------

    function getSplits(bytes32 milestoneHash) external view returns (Split[] memory) {
        return _splits[milestoneHash];
    }

    // ----------------------------
    // Core: Milestones
    // ----------------------------

    function createMilestone(
        bytes32 milestoneHash,
        bytes32 projectId,
        bytes32 templateId,
        uint64 deadline,
        bytes32 metadataHash,
        Split[] calldata splits
    ) external {
        if (milestones[milestoneHash].builder != address(0)) revert MilestoneExists();
        if (deadline <= block.timestamp) revert InvalidDeadline();

        MilestoneCore storage m = milestones[milestoneHash];
        m.projectId = projectId;
        m.templateId = templateId;
        m.metadataHash = metadataHash;
        m.builder = msg.sender;
        m.createdAt = uint64(block.timestamp);
        m.deadline = deadline;

        // Splits: if empty, default to builder 100%
        if (splits.length == 0) {
            _splits[milestoneHash].push(Split({wallet: msg.sender, shareBps: 10_000}));
        } else {
            uint256 totalBps;
            for (uint256 i = 0; i < splits.length; i++) {
                if (splits[i].wallet == address(0)) revert InvalidSplits();
                totalBps += splits[i].shareBps;
                _splits[milestoneHash].push(splits[i]);
            }
            if (totalBps != 10_000) revert InvalidSplits();
        }

        emit MilestoneCreated(milestoneHash, projectId, msg.sender, templateId, deadline, metadataHash);
    }

    function stake(bytes32 milestoneHash) external payable {
        MilestoneCore storage m = milestones[milestoneHash];
        if (m.builder == address(0)) revert MilestoneNotFound();
        if (block.timestamp >= m.deadline) revert DeadlinePassed();
        if (m.released) revert AlreadyReleased();
        if (msg.value == 0) revert InvalidStakeAmount();

        stakes[milestoneHash][msg.sender] += msg.value;
        m.totalStaked += msg.value;

        emit Staked(milestoneHash, msg.sender, msg.value);
    }

    // ----------------------------
    // Core: Verification (quorum)
    // ----------------------------

    function submitVerdict(bytes32 milestoneHash, bool didComplete, bytes32 evidenceRoot) external {
        if (!verifierRegistry.isVerifier(msg.sender)) revert NotAuthorizedVerifier();
        if (verifierVoted[milestoneHash][msg.sender]) revert AlreadyVoted();

        MilestoneCore storage m = milestones[milestoneHash];
        if (m.builder == address(0)) revert MilestoneNotFound();
        if (m.finalized) revert AlreadyFinalized();
        if (block.timestamp < m.deadline) revert TooEarly();

        verifierVoted[milestoneHash][msg.sender] = true;
        evidenceByVerifier[milestoneHash][msg.sender] = evidenceRoot;

        m.verifierCount += 1;
        if (didComplete) {
            m.verifiedVotes += 1;
        }

        emit VerdictSubmitted(milestoneHash, msg.sender, didComplete, evidenceRoot);

        // Success path: quorum reached
        if (m.verifiedVotes >= quorum) {
            m.finalized = true;
            m.verified = true;
            m.finalEvidenceRoot = evidenceRoot;
            emit MilestoneFinalized(milestoneHash, true, evidenceRoot);
            return;
        }

        // Failure path: we have collected all expected verifier votes and quorum is not reachable.
        // MVP assumption: maxVerifiers is the number of verifier nodes participating (default 3).
        if (m.verifierCount >= maxVerifiers) {
            m.finalized = true;
            m.verified = false;
            // Set evidence root to the last submitted one for a stable pointer (nodes should converge offchain).
            m.finalEvidenceRoot = evidenceRoot;
            emit MilestoneFinalized(milestoneHash, false, evidenceRoot);
        }
    }

    // ----------------------------
    // Core: Settlement
    // ----------------------------

    /// @notice Releases escrowed ETH to the configured split recipients after a verified finalize.
    function release(bytes32 milestoneHash) external nonReentrant {
        MilestoneCore storage m = milestones[milestoneHash];
        if (m.builder == address(0)) revert MilestoneNotFound();
        if (!m.finalized || !m.verified) revert NotVerified();
        if (m.released) revert AlreadyReleased();

        m.released = true;

        uint256 total = m.totalStaked;
        Split[] storage splits = _splits[milestoneHash];
        uint256 remaining = total;

        // Pay all but last; last receives remainder to avoid dust from integer division.
        for (uint256 i = 0; i < splits.length; i++) {
            uint256 amount = (i == splits.length - 1)
                ? remaining
                : (total * splits[i].shareBps) / 10_000;

            remaining -= amount;

            (bool ok, ) = splits[i].wallet.call{value: amount}("");
            if (!ok) revert TransferFailed();
        }

        emit Released(milestoneHash, total);
    }

    /// @notice Backers can refund their stake if milestone finalizes as not verified.
    function refund(bytes32 milestoneHash) external nonReentrant {
        MilestoneCore storage m = milestones[milestoneHash];
        if (m.builder == address(0)) revert MilestoneNotFound();
        if (!m.finalized || m.verified) revert MilestoneNotFailed();

        uint256 amount = stakes[milestoneHash][msg.sender];
        if (amount == 0) revert NothingToRefund();

        stakes[milestoneHash][msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Refunded(milestoneHash, msg.sender, amount);
    }

    receive() external payable {}
}
