// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {WeftMilestone} from "../src/WeftMilestone.sol";
import {VerifierRegistry} from "../src/VerifierRegistry.sol";

/// @notice Deploys WeftMilestone + VerifierRegistry to the target chain.
/// @dev Env vars:
///      DEPLOYER_KEY   — deployer private key (required)
///      OWNER_ADDRESS — owner address   (default: deployer)
contract Deploy is Script {
    event DeployedWeft(address indexed weft, address indexed registry);

    function run() external {
        uint256 sk    = vm.envUint("DEPLOYER_KEY");
        address owner = vm.envOr("OWNER_ADDRESS", vm.addr(sk));

        vm.startBroadcast(sk);

        VerifierRegistry registry = new VerifierRegistry(owner);
        WeftMilestone weft    = new WeftMilestone(owner, registry);

        vm.stopBroadcast();

        emit DeployedWeft(address(weft), address(registry));
    }
}
