// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {WeftMilestoneConfidentialWeighted} from "../src-fhe/WeftMilestoneConfidentialWeighted.sol";
import {VerifierRegistry} from "../src/VerifierRegistry.sol";

/// @notice Deploys VerifierRegistry + WeftMilestoneConfidentialWeighted to Sepolia.
/// @dev Same env vars as DeployConfidential.s.sol. The weighted contract adds
///      FHE.mul for confidence-weighted sealed-ballot consensus.
contract DeployConfidentialWeighted is Script {
    event DeployedConfidentialWeighted(address indexed weft, address indexed registry);

    function run() external {
        uint256 sk = vm.envUint("DEPLOYER_KEY");
        address owner = vm.addr(sk);

        address v1 = vm.envAddress("VERIFIER_1");
        address v2 = vm.envAddress("VERIFIER_2");
        address v3 = vm.envAddress("VERIFIER_3");

        vm.startBroadcast(sk);

        VerifierRegistry registry = new VerifierRegistry(owner);
        registry.addVerifier(v1);
        registry.addVerifier(v2);
        registry.addVerifier(v3);

        WeftMilestoneConfidentialWeighted weft = new WeftMilestoneConfidentialWeighted(owner, registry);

        vm.stopBroadcast();

        emit DeployedConfidentialWeighted(address(weft), address(registry));
    }
}
