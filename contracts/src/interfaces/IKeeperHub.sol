// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IKeeperHub
/// @notice Interface for the external KeeperHub service that triggers capital release.
/// @dev KeeperHub is a separate service — this interface lets WeftMilestone call it.
///      Until KeeperHub is deployed, pass address(0) at deployment and set KEEPERHUB_ADDRESS.
interface IKeeperHub {
    /// @notice Schedule a release payment to a recipient after milestone verification.
    /// @param milestoneHash  The Weft milestone hash
    /// @param recipient       Split recipient address (builder or co-builder)
    /// @param amount          ETH amount to release (in wei)
    function scheduleRelease(
        bytes32 milestoneHash,
        address recipient,
        uint256 amount
    ) external payable;
}