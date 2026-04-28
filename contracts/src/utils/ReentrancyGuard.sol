// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal ReentrancyGuard implementation for Weft contracts.
abstract contract ReentrancyGuard {
    uint256 private _status;

    error Reentrancy();

    constructor() {
        _status = 1;
    }

    modifier nonReentrant() {
        if (_status != 1) revert Reentrancy();
        _status = 2;
        _;
        _status = 1;
    }
}

