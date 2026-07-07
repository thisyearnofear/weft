// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FhevmTest} from "forge-fhevm/FhevmTest.sol";
import {Test} from "forge-std/Test.sol";
import {FHE} from "@fhevm/solidity/lib/FHE.sol";
import {euint8, euint32, ebool, externalEuint32} from "encrypted-types/EncryptedTypes.sol";
import {InputProofHelper} from "forge-fhevm/InputProofHelper.sol";
import {FheType} from "@fhevm/host-contracts/contracts/shared/FheType.sol";
import {CleartextArithmetic} from "forge-fhevm/cleartext/CleartextArithmetic.sol";
import {aclAdd, inputVerifierAdd} from "@fhevm/host-contracts/addresses/FHEVMHostAddresses.sol";

import {WeftMilestoneConfidentialWeighted} from "../src-fhe/WeftMilestoneConfidentialWeighted.sol";
import {VerifierRegistry} from "../src/VerifierRegistry.sol";

contract WeftMilestoneConfidentialWeightedTest is FhevmTest {
    WeftMilestoneConfidentialWeighted weft;
    address weftAddress;
    VerifierRegistry registry;

    address owner = makeAddr("owner");
    address builder = makeAddr("builder");
    address backer1 = makeAddr("backer1");

    address v1 = makeAddr("verifier1");
    address v2 = makeAddr("verifier2");
    address v3 = makeAddr("verifier3");

    bytes32 milestoneHash;
    uint64 deadline;
    uint256 private _batchNonce;

    function setUp() public override {
        super.setUp();

        vm.startPrank(owner);
        registry = new VerifierRegistry(owner);
        registry.addVerifier(v1);
        registry.addVerifier(v2);
        registry.addVerifier(v3);
        weft = new WeftMilestoneConfidentialWeighted(owner, registry);
        weftAddress = address(weft);
        vm.stopPrank();

        vm.deal(backer1, 10 ether);

        milestoneHash = keccak256("weighted-test-milestone");
        deadline = uint64(block.timestamp + 7 days);

        _createMilestone();
    }

    function _createMilestone() internal {
        WeftMilestoneConfidentialWeighted.Split[] memory splits =
            new WeftMilestoneConfidentialWeighted.Split[](1);
        splits[0] = WeftMilestoneConfidentialWeighted.Split({wallet: builder, shareBps: 10_000});
        vm.prank(builder);
        weft.createMilestone(milestoneHash, keccak256("project"), keccak256("template"), deadline, keccak256("meta"), splits);
    }

    /// Batch-encrypt two uint32 values in a single input proof.
    /// Mirrors what the Zama SDK does: createEncryptedInput → add32 → add32 → encrypt.
    function _encryptTwoUint32(uint32 val1, uint32 val2, address user, address contractAddr)
        internal
        returns (externalEuint32, externalEuint32, bytes memory)
    {
        _batchNonce += 1;

        // Create two ciphertexts + handles (index 0 and 1)
        bytes32[] memory handles = new bytes32[](2);
        for (uint256 i = 0; i < 2; i++) {
            uint256 val = i == 0 ? val1 : val2;
            bytes memory ciphertext =
                abi.encodePacked(keccak256(abi.encodePacked(val, uint8(FheType.Uint32), _batchNonce, i)));
            handles[i] = InputProofHelper.computeInputHandle(ciphertext, uint8(i), FheType.Uint32, aclAdd, uint64(block.chainid));
            _plaintexts[handles[i]] = CleartextArithmetic.normalizePlaintextToType(val, uint8(FheType.Uint32));
        }

        // Single digest over both handles, one signature
        bytes32 domainSeparator =
            InputProofHelper.computeInputVerifierDomainSeparator(inputVerifierAdd, block.chainid);
        bytes32 digest = InputProofHelper.computeInputVerificationDigest(
            handles, user, contractAddr, block.chainid, EMPTY_EXTRA_DATA, domainSeparator
        );
        bytes[] memory signatures = new bytes[](1);
        signatures[0] = _signDigest(MOCK_INPUT_SIGNER_PK, digest);
        bytes memory inputProof = InputProofHelper.assembleInputProof(handles, signatures, EMPTY_EXTRA_DATA);

        return (externalEuint32.wrap(handles[0]), externalEuint32.wrap(handles[1]), inputProof);
    }

    function _submitWeightedVote(address verifier, bool didComplete, uint32 confidence, bytes32 evidenceRoot) internal {
        (externalEuint32 encDidComplete, externalEuint32 encConfidence, bytes memory inputProof) =
            _encryptTwoUint32(didComplete ? 1 : 0, confidence, verifier, weftAddress);
        vm.prank(verifier);
        weft.submitWeightedVerdict(milestoneHash, encDidComplete, encConfidence, inputProof, evidenceRoot);
    }

    function test_createMilestone() public view {
        (, , , address mBuilder, , uint64 mDeadline, , bool mFinalized, , , , , , , , ) =
            weft.milestones(milestoneHash);
        assertEq(mBuilder, builder);
        assertEq(mDeadline, deadline);
        assertEq(mFinalized, false);
    }

    /// Two verifiers vote YES with high confidence → verified.
    /// weightedTally = 80 + 90 = 170 ≥ 100 (threshold) → verified.
    function test_weightedQuorum_highConfidenceVerified() public {
        vm.prank(backer1);
        weft.stake{value: 1 ether}(milestoneHash);
        vm.warp(deadline + 1);

        _submitWeightedVote(v1, true, 80, keccak256("e1"));
        _submitWeightedVote(v2, true, 90, keccak256("e2"));
        _submitWeightedVote(v3, false, 50, keccak256("e3"));

        (, , , , , , , bool mFinalized, ebool mVerified, , , , , , , ) =
            weft.milestones(milestoneHash);
        assertTrue(mFinalized);
        assertTrue(decrypt(mVerified));

        // Trustless confirmation + release
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(mVerified);
        (uint256[] memory cleartexts, bytes memory proof) = publicDecrypt(handles);
        vm.prank(backer1);
        weft.confirmResult(milestoneHash, abi.encode(cleartexts), proof);

        uint256 balBefore = builder.balance;
        weft.release(milestoneHash);
        assertEq(builder.balance, balBefore + 1 ether);
    }

    /// Two verifiers vote YES but with very low confidence.
    /// Binary quorum (2 of 3) is met, but weightedTally = 5 + 5 = 10 < 100
    /// → NOT verified. This proves the weighted gate is load-bearing.
    function test_weightedQuorum_lowConfidenceRejected() public {
        vm.prank(backer1);
        weft.stake{value: 1 ether}(milestoneHash);
        vm.warp(deadline + 1);

        _submitWeightedVote(v1, true, 5, keccak256("e1"));
        _submitWeightedVote(v2, true, 5, keccak256("e2"));
        _submitWeightedVote(v3, false, 90, keccak256("e3"));

        (, , , , , , , bool mFinalized, ebool mVerified, , , , , , , ) =
            weft.milestones(milestoneHash);
        assertTrue(mFinalized);
        assertFalse(decrypt(mVerified));
    }

    /// One verifier votes YES with confidence 100, two vote NO.
    /// Binary quorum fails (1 of 3) even though weightedTally = 100 ≥ threshold.
    /// → NOT verified. Both gates must pass.
    function test_weightedQuorum_binaryGateStillRequired() public {
        vm.warp(deadline + 1);

        _submitWeightedVote(v1, true, 100, keccak256("e1"));
        _submitWeightedVote(v2, false, 100, keccak256("e2"));
        _submitWeightedVote(v3, false, 100, keccak256("e3"));

        (, , , , , , , bool mFinalized, ebool mVerified, , , , , , , ) =
            weft.milestones(milestoneHash);
        assertTrue(mFinalized);
        assertFalse(decrypt(mVerified));
    }

    /// Inflated ballot (encrypting 2) still clamped to 1 — can't fake quorum.
    function test_inflatedBallotCannotFakeQuorum() public {
        vm.warp(deadline + 1);

        (externalEuint32 encDidComplete, externalEuint32 encConfidence, bytes memory inputProof) =
            _encryptTwoUint32(2, 100, v1, weftAddress);
        vm.prank(v1);
        weft.submitWeightedVerdict(milestoneHash, encDidComplete, encConfidence, inputProof, keccak256("e1"));

        _submitWeightedVote(v2, false, 100, keccak256("e2"));
        _submitWeightedVote(v3, false, 100, keccak256("e3"));

        (, , , , , , , bool mFinalized, ebool mVerified, , , , , , , ) =
            weft.milestones(milestoneHash);
        assertTrue(mFinalized);
        assertFalse(decrypt(mVerified));
    }
}
