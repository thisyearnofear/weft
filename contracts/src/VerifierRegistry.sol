// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "./utils/Ownable.sol";

/// @title VerifierRegistry
/// @notice Registry of authorized Hermes verifier node addresses.
/// @dev MVP: owner-managed. Production: set owner to a multisig / governance.
contract VerifierRegistry is Ownable {
    mapping(address => bool) public isVerifier;

    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);

    error AlreadySet();

    constructor(address _owner) Ownable(_owner) {}

    function addVerifier(address verifier) external onlyOwner {
        if (isVerifier[verifier]) revert AlreadySet();
        isVerifier[verifier] = true;
        emit VerifierAdded(verifier);
    }

    function removeVerifier(address verifier) external onlyOwner {
        if (!isVerifier[verifier]) revert AlreadySet();
        isVerifier[verifier] = false;
        emit VerifierRemoved(verifier);
    }
}

