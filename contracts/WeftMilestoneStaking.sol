// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title WeftMilestoneStaking
/// @notice Milestone-based staking contract where backers stake against specific milestones
/// @dev Release is triggered by verified Hermes agent via KeeperHub
contract WeftMilestoneStaking is Ownable, ReentrancyGuard {

    struct Milestone {
        bytes32 projectHash;
        uint256 targetAmount;
        uint256 stakedAmount;
        uint256 deadline;
        bool isVerified;
        bool isReleased;
        address builder;
    }

    struct Stake {
        address backer;
        uint256 amount;
        uint256 timestamp;
    }

    // Mapping: milestoneHash => Milestone
    mapping(bytes32 => Milestone) public milestones;

    // Mapping: milestoneHash => Stake[] (backers who staked)
    mapping(bytes32 => Stake[]) public milestoneStakes;

    // Mapping: milestoneHash => backer => amount staked
    mapping(bytes32 => mapping(address => uint256)) public stakes;

    // Events
    event MilestoneCreated(bytes32 indexed milestoneHash, address indexed builder, uint256 targetAmount, uint256 deadline);
    event Staked(bytes32 indexed milestoneHash, address indexed backer, uint256 amount);
    event MilestoneVerified(bytes32 indexed milestoneHash);
    event CapitalReleased(bytes32 indexed milestoneHash, uint256 amount);
    event RevenueDistributed(bytes32 indexed milestoneHash, address[] backerAddresses, uint256[] amounts);

    error InvalidMilestone();
    error AlreadyStaked();
    error MilestoneNotMet();
    error AlreadyReleased();
    error ZeroAddress();
    error InsufficientStake();

    /// @notice Create a new milestone for a project
    /// @param _milestoneHash Unique hash of the milestone
    /// @param _projectHash Hash of the parent project
    /// @param _targetAmount Funding target for this milestone
    /// @param _deadline Unix timestamp deadline for completion
    function createMilestone(
        bytes32 _milestoneHash,
        bytes32 _projectHash,
        uint256 _targetAmount,
        uint256 _deadline
    ) external {
        require(milestones[_milestoneHash].builder == address(0), "Milestone already exists");
        require(_targetAmount > 0, "Target amount must be > 0");
        require(_deadline > block.timestamp, "Deadline must be in future");

        milestones[_milestoneHash] = Milestone({
            projectHash: _projectHash,
            targetAmount: _targetAmount,
            stakedAmount: 0,
            deadline: _deadline,
            isVerified: false,
            isReleased: false,
            builder: msg.sender
        });

        emit MilestoneCreated(_milestoneHash, msg.sender, _targetAmount, _deadline);
    }

    /// @notice Backers stake ETH against a specific milestone
    /// @param _milestoneHash The milestone to stake on
    function stake(bytes32 _milestoneHash) external payable nonReentrant {
        Milestone storage milestone = milestones[_milestoneHash];
        
        if (milestone.builder == address(0)) revert InvalidMilestone();
        if (msg.value == 0) revert InsufficientStake();

        // Update stake tracking
        uint256 existingStake = stakes[_milestoneHash][msg.sender];
        stakes[_milestoneHash][msg.sender] += msg.value;
        milestone.stakedAmount += msg.value;

        // Track backer in array (only first time)
        if (existingStake == 0) {
            milestoneStakes[_milestoneHash].push(Stake({
                backer: msg.sender,
                amount: msg.value,
                timestamp: block.timestamp
            }));
        }

        emit Staked(_milestoneHash, msg.sender, msg.value);
    }

    /// @notice Hermes agent verifies milestone completion (called via KeeperHub)
    /// @param _milestoneHash The milestone being verified
    /// @param _evidenceHash Hash of evidence stored on 0G Storage
    function verifyMilestone(bytes32 _milestoneHash, bytes32 _evidenceHash) external onlyOwner {
        Milestone storage milestone = milestones[_milestoneHash];
        
        if (milestone.builder == address(0)) revert InvalidMilestone();
        if (milestone.isVerified) revert AlreadyReleased();

        milestone.isVerified = true;

        emit MilestoneVerified(_milestoneHash);
        emit CapitalReleased(_milestoneHash, milestone.stakedAmount);
    }

    /// @notice Release capital to builder after verification (called by Hermes/KeeperHub)
    /// @param _milestoneHash The milestone to release
    function release(bytes32 _milestoneHash) external nonReentrant {
        Milestone storage milestone = milestones[_milestoneHash];

        if (milestone.builder == address(0)) revert InvalidMilestone();
        if (!milestone.isVerified) revert MilestoneNotMet();
        if (milestone.isReleased) revert AlreadyReleased();

        milestone.isReleased = true;

        // Transfer staked amount to builder
        (bool success, ) = milestone.builder.call{value: milestone.stakedAmount}("");
        require(success, "Transfer failed");

        emit CapitalReleased(_milestoneHash, milestone.stakedAmount);
    }

    /// @notice Distribute revenue back to backers proportionally
    /// @param _milestoneHash The milestone
    /// @param _recipients Array of backer addresses
    /// @param _amounts Array of amounts (must match recipients length)
    function distributeRevenue(
        bytes32 _milestoneHash,
        address[] calldata _recipients,
        uint256[] calldata _amounts
    ) external payable nonReentrant {
        if (_recipients.length != _amounts.length) revert InvalidMilestone();
        if (msg.value == 0) revert InsufficientStake();

        uint256 totalAmount = msg.value;
        
        for (uint256 i = 0; i < _recipients.length; i++) {
            if (_recipients[i] == address(0)) revert ZeroAddress();
            
            uint256 share = (msg.value * _amounts[i]) / totalAmount;
            (bool success, ) = _recipients[i].call{value: share}("");
            require(success, "Transfer failed");
        }

        emit RevenueDistributed(_milestoneHash, _recipients, _amounts);
    }

    /// @notice Get stake details for a milestone
    /// @param _milestoneHash The milestone to query
    /// @return backerCount Number of unique backers
    function getStakeCount(bytes32 _milestoneHash) external view returns (uint256) {
        return milestoneStakes[_milestoneHash].length;
    }

    /// @notice Get milestone details
    /// @param _milestoneHash The milestone to query
    /// @return projectHash, targetAmount, stakedAmount, deadline, isVerified, isReleased, builder
    function getMilestone(bytes32 _milestoneHash) external view returns (
        bytes32 projectHash,
        uint256 targetAmount,
        uint256 stakedAmount,
        uint256 deadline,
        bool isVerified,
        bool isReleased,
        address builder
    ) {
        Milestone storage m = milestones[_milestoneHash];
        return (
            m.projectHash,
            m.targetAmount,
            m.stakedAmount,
            m.deadline,
            m.isVerified,
            m.isReleased,
            m.builder
        );
    }

    /// @notice Allow contract to receive ETH
    receive() external payable {}
}