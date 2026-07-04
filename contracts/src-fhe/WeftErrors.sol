// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title WeftErrors
/// @notice Shared error definitions for both WeftMilestone and WeftMilestoneConfidential.
/// @dev DRY: single source of truth for error definitions across both contracts.
library WeftErrors {
    error MilestoneNotFound();
    error AlreadyExists();
    error NotVerifier();
    error NotVerified();
    error AlreadyReleased();
    error MilestoneNotFailed();
    error NothingToRefund();
    error TimeoutNotReached();
    error TooEarly();
    error TransferFailed();
    error NoSplits();
    error DeadlinePassed();
    error InvalidCleartexts();
}
