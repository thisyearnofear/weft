// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FhevmTest} from "forge-fhevm/FhevmTest.sol";
import {Test} from "forge-std/Test.sol";
import {FHE} from "@fhevm/solidity/lib/FHE.sol";
import {euint8, ebool, externalEuint32} from "encrypted-types/EncryptedTypes.sol";

import {WeftMilestoneConfidential} from "../src-fhe/WeftMilestoneConfidential.sol";
import {VerifierRegistry} from "../src/VerifierRegistry.sol";

contract WeftMilestoneConfidentialTest is FhevmTest {
    WeftMilestoneConfidential weft;
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

    function setUp() public override {
        super.setUp();

        vm.startPrank(owner);
        registry = new VerifierRegistry(owner);
        registry.addVerifier(v1);
        registry.addVerifier(v2);
        registry.addVerifier(v3);
        weft = new WeftMilestoneConfidential(owner, registry);
        weftAddress = address(weft);
        vm.stopPrank();

        vm.deal(backer1, 10 ether);

        milestoneHash = keccak256("test-milestone");
        deadline = uint64(block.timestamp + 7 days);

        _createMilestone();
    }

    function _createMilestone() internal {
        WeftMilestoneConfidential.Split[] memory splits =
            new WeftMilestoneConfidential.Split[](1);
        splits[0] = WeftMilestoneConfidential.Split({wallet: builder, shareBps: 10_000});
        vm.prank(builder);
        weft.createMilestone(milestoneHash, keccak256("project"), keccak256("template"), deadline, keccak256("meta"), splits);
    }

    function _submitEncryptedVote(address verifier, bool didComplete, bytes32 evidenceRoot) internal {
        (externalEuint32 encVote, bytes memory proof) =
            encryptUint32(didComplete ? 1 : 0, verifier, weftAddress);
        vm.prank(verifier);
        weft.submitVerdict(milestoneHash, encVote, proof, evidenceRoot);
    }

    function test_createMilestone() public view {
        (, , , address mBuilder, , uint64 mDeadline, , bool mFinalized, , , , , , , ) =
            weft.milestones(milestoneHash);
        assertEq(mBuilder, builder);
        assertEq(mDeadline, deadline);
        assertEq(mFinalized, false);
    }

    function test_stakeAccumulates() public {
        vm.prank(backer1);
        weft.stake{value: 1 ether}(milestoneHash);
        (, , , , , , uint256 mTotalStaked, , , , , , , , ) = weft.milestones(milestoneHash);
        assertEq(mTotalStaked, 1 ether);
    }

    function test_sealedBallotQuorum_twoOfThreeVerified() public {
        vm.prank(backer1);
        weft.stake{value: 1 ether}(milestoneHash);
        vm.warp(deadline + 1);
        _submitEncryptedVote(v1, true, keccak256("e1"));
        _submitEncryptedVote(v2, true, keccak256("e2"));
        _submitEncryptedVote(v3, false, keccak256("e3"));

        (, , , , , , , bool mFinalized, ebool mVerified, , uint8 mCount, , , , ) =
            weft.milestones(milestoneHash);
        assertEq(mFinalized, true);
        assertEq(mCount, 3);

        bool isVerified = decrypt(mVerified);
        assertTrue(isVerified);

        // Trustless confirmation: any caller submits the KMS-signed public
        // decryption; the contract verifies the proof itself.
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(mVerified);
        (uint256[] memory cleartexts, bytes memory proof) = publicDecrypt(handles);
        vm.prank(backer1);
        weft.confirmResult(milestoneHash, abi.encode(cleartexts), proof);

        (, , , , , , , , , , , , , bool mConfirmed, bool mResultVerified) =
            weft.milestones(milestoneHash);
        assertTrue(mConfirmed);
        assertTrue(mResultVerified);

        uint256 balBefore = builder.balance;
        weft.release(milestoneHash);
        assertEq(builder.balance, balBefore + 1 ether);
    }

    function test_inflatedBallotCannotFakeQuorum() public {
        vm.warp(deadline + 1);

        // A rogue verifier encrypts 2 instead of 1, trying to satisfy the
        // >= 2 quorum comparison alone. The clamp must count it as at most
        // one yes vote, so with the other two voting no, quorum fails.
        (externalEuint32 encVote, bytes memory proof) = encryptUint32(2, v1, weftAddress);
        vm.prank(v1);
        weft.submitVerdict(milestoneHash, encVote, proof, keccak256("e1"));

        _submitEncryptedVote(v2, false, keccak256("e2"));
        _submitEncryptedVote(v3, false, keccak256("e3"));

        (, , , , , , , bool mFinalized, ebool mVerified, , , , , , ) =
            weft.milestones(milestoneHash);
        assertTrue(mFinalized);
        assertFalse(decrypt(mVerified));
    }

    function test_confirmResult_rejectsForgedCleartext() public {
        vm.warp(deadline + 1);
        _submitEncryptedVote(v1, false, keccak256("e1"));
        _submitEncryptedVote(v2, false, keccak256("e2"));
        _submitEncryptedVote(v3, false, keccak256("e3"));

        (, , , , , , , bool mFinalized, ebool mVerified, , , , , , ) =
            weft.milestones(milestoneHash);
        assertTrue(mFinalized);

        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(mVerified);
        (, bytes memory proof) = publicDecrypt(handles);

        // Quorum failed (0 of 3) — an attacker replays the valid proof but
        // claims the result was `true`. Signature check must revert.
        uint256[] memory forged = new uint256[](1);
        forged[0] = 1;
        vm.prank(backer1);
        vm.expectRevert();
        weft.confirmResult(milestoneHash, abi.encode(forged), proof);
    }
}
