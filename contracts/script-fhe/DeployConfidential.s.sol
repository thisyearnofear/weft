// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {WeftMilestoneConfidential} from "../src-fhe/WeftMilestoneConfidential.sol";
import {VerifierRegistry} from "../src/VerifierRegistry.sol";

/// @notice Deploys VerifierRegistry + WeftMilestoneConfidential to Sepolia (Zama FHEVM).
/// @dev Env vars:
///      DEPLOYER_KEY — deployer private key (required; becomes owner so it can
///                     register verifiers and call confirmResult after decryption)
///      VERIFIER_1 / VERIFIER_2 / VERIFIER_3 — verifier addresses to register (required)
///
///      FOUNDRY_PROFILE=fhe forge script contracts/script-fhe/DeployConfidential.s.sol \
///        --rpc-url $SEPOLIA_RPC_URL --broadcast
contract DeployConfidential is Script {
    event DeployedConfidential(address indexed weft, address indexed registry);

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

        WeftMilestoneConfidential weft = new WeftMilestoneConfidential(owner, registry);

        vm.stopBroadcast();

        emit DeployedConfidential(address(weft), address(registry));
    }
}
