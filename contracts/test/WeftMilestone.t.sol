// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {WeftMilestone} from "../src/WeftMilestone.sol";
import {VerifierRegistry} from "../src/VerifierRegistry.sol";
import {Ownable} from "../src/utils/Ownable.sol";

contract WeftMilestoneTest is Test {
    event QuorumUpdated(uint8 oldQuorum, uint8 newQuorum);
    event MaxVerifiersUpdated(uint8 oldMax, uint8 newMax);

    address owner = makeAddr("owner");
    address builder = makeAddr("builder");
    address cobuilder = makeAddr("cobuilder");
    address backer1 = makeAddr("backer1");
    address backer2 = makeAddr("backer2");

    address v1 = makeAddr("verifier1");
    address v2 = makeAddr("verifier2");
    address v3 = makeAddr("verifier3");

    VerifierRegistry registry;
    WeftMilestone weft;

    function setUp() public {
        vm.deal(builder, 10 ether);
        vm.deal(backer1, 10 ether);
        vm.deal(backer2, 10 ether);

        vm.prank(owner);
        registry = new VerifierRegistry(owner);

        vm.startPrank(owner);
        registry.addVerifier(v1);
        registry.addVerifier(v2);
        registry.addVerifier(v3);
        vm.stopPrank();

        vm.prank(owner);
        weft = new WeftMilestone(owner, registry);
    }

    function testHappyPathQuorumAndReleaseWithSplits() public {
        bytes32 projectId = keccak256("p1");
        bytes32 templateId = keccak256("DEPLOYED_AND_100_UNIQUE_CALLERS_7D");
        bytes32 metadataHash = keccak256("metadata");
        uint64 deadline = uint64(block.timestamp + 7 days);
        bytes32 milestoneHash = keccak256(abi.encode(projectId, uint256(0), builder, deadline));

        // Create milestone with explicit builder + cobuilder split
        WeftMilestone.Split[] memory splits = new WeftMilestone.Split[](2);
        splits[0] = WeftMilestone.Split({wallet: builder, shareBps: 7000});
        splits[1] = WeftMilestone.Split({wallet: cobuilder, shareBps: 3000});

        vm.prank(builder);
        weft.createMilestone(milestoneHash, projectId, templateId, deadline, metadataHash, splits);

        vm.prank(backer1);
        weft.stake{value: 2 ether}(milestoneHash);
        vm.prank(backer2);
        weft.stake{value: 1 ether}(milestoneHash);

        // Too early to vote
        vm.prank(v1);
        vm.expectRevert(WeftMilestone.TooEarly.selector);
        weft.submitVerdict(milestoneHash, true, bytes32("e1"));

        // After deadline: submit two positive votes => finalized verified
        vm.warp(deadline);
        vm.prank(v1);
        weft.submitVerdict(milestoneHash, true, bytes32("e1"));

        // Not yet finalized (needs quorum=2)
        uint256 totalStaked;
        bool finalized;
        bool verified;
        bytes32 _unusedRoot1;
        (,,,,,, totalStaked, finalized, verified, , , , _unusedRoot1) = weft.milestones(milestoneHash);
        assertEq(totalStaked, 3 ether);
        assertFalse(finalized);
        assertFalse(verified);

        vm.prank(v2);
        weft.submitVerdict(milestoneHash, true, bytes32("e2"));

        bytes32 finalEvidenceRoot;
        bool released;
        (,,,,,, totalStaked, finalized, verified, released, , , finalEvidenceRoot) = weft.milestones(milestoneHash);
        assertEq(totalStaked, 3 ether);
        assertTrue(finalized);
        assertTrue(verified);
        assertFalse(released);
        assertEq(finalEvidenceRoot, bytes32("e2")); // quorum-triggering root in MVP

        uint256 builderBefore = builder.balance;
        uint256 cobuilderBefore = cobuilder.balance;

        // Anyone can call release after finalize
        weft.release(milestoneHash);

        bytes32 _rootAfter;
        (
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            released,
            ,
            ,
            _rootAfter
        ) = weft.milestones(milestoneHash);
        assertTrue(released);

        // Split: 70% / 30%
        assertEq(builder.balance - builderBefore, 2.1 ether);
        assertEq(cobuilder.balance - cobuilderBefore, 0.9 ether);
    }

    function testRefundsAfterFailedFinalize() public {
        bytes32 projectId = keccak256("p2");
        bytes32 templateId = keccak256("DEPLOYED_AND_100_UNIQUE_CALLERS_7D");
        uint64 deadline = uint64(block.timestamp + 1 days);
        bytes32 milestoneHash = keccak256(abi.encode(projectId, uint256(0), builder, deadline));

        vm.prank(builder);
        weft.createMilestone(milestoneHash, projectId, templateId, deadline, bytes32(0), new WeftMilestone.Split[](0));

        vm.prank(backer1);
        weft.stake{value: 1 ether}(milestoneHash);

        vm.warp(deadline);

        // Three negative votes => finalized failed (maxVerifiers=3)
        vm.prank(v1);
        weft.submitVerdict(milestoneHash, false, bytes32("f1"));
        vm.prank(v2);
        weft.submitVerdict(milestoneHash, false, bytes32("f2"));
        vm.prank(v3);
        weft.submitVerdict(milestoneHash, false, bytes32("f3"));

        uint256 totalStaked;
        bool finalized;
        bool verified;
        bytes32 _rootFailed;
        (
            ,
            ,
            ,
            ,
            ,
            ,
            totalStaked,
            finalized,
            verified,
            ,
            ,
            ,
            _rootFailed
        ) = weft.milestones(milestoneHash);
        assertEq(totalStaked, 1 ether);
        assertTrue(finalized);
        assertFalse(verified);

        uint256 before = backer1.balance;
        vm.prank(backer1);
        weft.refund(milestoneHash);
        assertEq(backer1.balance - before, 1 ether);

        // Second refund should fail
        vm.prank(backer1);
        vm.expectRevert(WeftMilestone.NothingToRefund.selector);
        weft.refund(milestoneHash);
    }

    function testOnlyAuthorizedVerifiersCanVote() public {
        bytes32 projectId = keccak256("p3");
        uint64 deadline = uint64(block.timestamp + 1);
        bytes32 milestoneHash = keccak256(abi.encode(projectId, uint256(0), builder, deadline));

        vm.prank(builder);
        weft.createMilestone(milestoneHash, projectId, bytes32("t"), deadline, bytes32(0), new WeftMilestone.Split[](0));

        vm.warp(deadline);

        vm.prank(backer1);
        vm.expectRevert(WeftMilestone.NotAuthorizedVerifier.selector);
        weft.submitVerdict(milestoneHash, true, bytes32("e"));
    }

    function testDefaultSplitGivesBuilder100Percent() public {
        bytes32 projectId = keccak256("p4");
        uint64 deadline = uint64(block.timestamp + 1 days);
        bytes32 milestoneHash = keccak256(abi.encode(projectId, uint256(0), builder, deadline));

        vm.prank(builder);
        weft.createMilestone(milestoneHash, projectId, bytes32("t"), deadline, bytes32(0), new WeftMilestone.Split[](0));

        vm.prank(backer1);
        weft.stake{value: 1 ether}(milestoneHash);

        WeftMilestone.Split[] memory splits = weft.getSplits(milestoneHash);
        assertEq(splits.length, 1);
        assertEq(splits[0].wallet, builder);
        assertEq(splits[0].shareBps, 10000); // 100%
    }

    function testInvalidSplitTotalReverts() public {
        bytes32 projectId = keccak256("p5");
        uint64 deadline = uint64(block.timestamp + 1 days);
        bytes32 milestoneHash = keccak256(abi.encode(projectId, uint256(0), builder, deadline));

        WeftMilestone.Split[] memory badSplits = new WeftMilestone.Split[](2);
        badSplits[0] = WeftMilestone.Split({wallet: builder, shareBps: 5000});
        badSplits[1] = WeftMilestone.Split({wallet: cobuilder, shareBps: 4000}); // only 9000 total

        vm.prank(builder);
        vm.expectRevert(WeftMilestone.InvalidSplits.selector);
        weft.createMilestone(milestoneHash, projectId, bytes32("t"), deadline, bytes32(0), badSplits);
    }

    function testDuplicateStakeBySameBacker() public {
        bytes32 projectId = keccak256("p6");
        uint64 deadline = uint64(block.timestamp + 1 days);
        bytes32 milestoneHash = keccak256(abi.encode(projectId, uint256(0), builder, deadline));

        vm.prank(builder);
        weft.createMilestone(milestoneHash, projectId, bytes32("t"), deadline, bytes32(0), new WeftMilestone.Split[](0));

        vm.prank(backer1);
        weft.stake{value: 1 ether}(milestoneHash);

        vm.prank(backer1);
        weft.stake{value: 0.5 ether}(milestoneHash);

        (, , , , , , uint256 totalStaked, , , , , , ) = weft.milestones(milestoneHash);
        assertEq(totalStaked, 1.5 ether);
    }

    function testVerifierCannotVoteTwice() public {
        bytes32 projectId = keccak256("p7");
        uint64 deadline = uint64(block.timestamp + 1 days);
        bytes32 milestoneHash = keccak256(abi.encode(projectId, uint256(0), builder, deadline));

        vm.prank(builder);
        weft.createMilestone(milestoneHash, projectId, bytes32("t"), deadline, bytes32(0), new WeftMilestone.Split[](0));

        vm.warp(deadline);

        vm.prank(v1);
        weft.submitVerdict(milestoneHash, true, bytes32("e1"));

        vm.prank(v1);
        vm.expectRevert(WeftMilestone.AlreadyVoted.selector);
        weft.submitVerdict(milestoneHash, false, bytes32("e2"));
    }

    function testCannotReleaseWhenNotVerified() public {
        bytes32 projectId = keccak256("p8");
        uint64 deadline = uint64(block.timestamp + 1 days);
        bytes32 milestoneHash = keccak256(abi.encode(projectId, uint256(0), builder, deadline));

        vm.prank(builder);
        weft.createMilestone(milestoneHash, projectId, bytes32("t"), deadline, bytes32(0), new WeftMilestone.Split[](0));

        vm.prank(backer1);
        weft.stake{value: 1 ether}(milestoneHash);

        vm.warp(deadline);

        vm.prank(v1);
        weft.submitVerdict(milestoneHash, false, bytes32("f1")); // failed verdict

        vm.prank(v2);
        weft.submitVerdict(milestoneHash, false, bytes32("f2")); // second fail

        vm.prank(v3);
        weft.submitVerdict(milestoneHash, false, bytes32("f3")); // third fail = failed

        vm.prank(backer1);
        vm.expectRevert(WeftMilestone.NotVerified.selector);
        weft.release(milestoneHash);
    }

    function testStakeAfterDeadlineReverts() public {
        bytes32 projectId = keccak256("p9");
        uint64 deadline = uint64(block.timestamp + 1 days);
        bytes32 milestoneHash = keccak256(abi.encode(projectId, uint256(0), builder, deadline));

        vm.prank(builder);
        weft.createMilestone(milestoneHash, projectId, bytes32("t"), deadline, bytes32(0), new WeftMilestone.Split[](0));

        vm.warp(deadline);

        vm.prank(backer1);
        vm.expectRevert(WeftMilestone.DeadlinePassed.selector);
        weft.stake{value: 1 ether}(milestoneHash);
    }

    function testCannotCreateMilestoneWithPastDeadline() public {
        bytes32 projectId = keccak256("p10");
        uint64 deadline = uint64(block.timestamp); // exactly now = past

        vm.prank(builder);
        vm.expectRevert(WeftMilestone.InvalidDeadline.selector);
        weft.createMilestone(
            keccak256(abi.encode(projectId, uint256(0), builder, deadline)),
            projectId, bytes32("t"), deadline, bytes32(0), new WeftMilestone.Split[](0)
        );
    }

    // ---- Two-step ownership ----

    function testTwoStepOwnershipTransfer() public {
        address newOwner = makeAddr("newOwner");

        // Step 1: initiate transfer
        vm.prank(owner);
        weft.transferOwnership(newOwner);
        assertEq(weft.pendingOwner(), newOwner);
        assertEq(weft.owner(), owner); // owner unchanged

        // Only pending owner can accept
        vm.prank(owner);
        vm.expectRevert(Ownable.NotPendingOwner.selector);
        weft.acceptOwnership();

        // Step 2: accept
        vm.prank(newOwner);
        weft.acceptOwnership();
        assertEq(weft.owner(), newOwner);
        assertEq(weft.pendingOwner(), address(0));
    }

    function testOnlyOwnerCanInitiateTransfer() public {
        vm.prank(builder);
        vm.expectRevert(Ownable.NotOwner.selector);
        weft.transferOwnership(makeAddr("newOwner"));
    }

    // ---- Admin events ----

    function testSetQuorumEmitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit QuorumUpdated(2, 1);
        weft.setQuorum(1);
    }

    function testSetMaxVerifiersEmitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit MaxVerifiersUpdated(3, 5);
        weft.setMaxVerifiers(5);
    }

    // ---- Timeout refund ----

    function testRefundAfterTimeout() public {
        bytes32 projectId = keccak256("p_timeout");
        uint64 deadline = uint64(block.timestamp + 1 days);
        bytes32 milestoneHash = keccak256(abi.encode(projectId, uint256(0), builder, deadline));

        vm.prank(builder);
        weft.createMilestone(milestoneHash, projectId, bytes32("t"), deadline, bytes32(0), new WeftMilestone.Split[](0));

        vm.prank(backer1);
        weft.stake{value: 2 ether}(milestoneHash);

        // Not timed out yet (before deadline)
        assertFalse(weft.isTimedOut(milestoneHash));

        // After deadline but before grace period
        vm.warp(deadline + 1 days);
        assertFalse(weft.isTimedOut(milestoneHash));

        // After deadline + TIMEOUT_GRACE (7 days)
        vm.warp(deadline + 7 days);
        assertTrue(weft.isTimedOut(milestoneHash));

        // Backer can refund
        uint256 before = backer1.balance;
        vm.prank(backer1);
        weft.refundAfterTimeout(milestoneHash);
        assertEq(backer1.balance - before, 2 ether);
    }

    function testRefundAfterTimeoutFailsBeforeGrace() public {
        bytes32 projectId = keccak256("p_no_timeout");
        uint64 deadline = uint64(block.timestamp + 1 days);
        bytes32 milestoneHash = keccak256(abi.encode(projectId, uint256(0), builder, deadline));

        vm.prank(builder);
        weft.createMilestone(milestoneHash, projectId, bytes32("t"), deadline, bytes32(0), new WeftMilestone.Split[](0));

        vm.prank(backer1);
        weft.stake{value: 1 ether}(milestoneHash);

        // After deadline but before grace period
        vm.warp(deadline + 3 days);
        vm.prank(backer1);
        vm.expectRevert(WeftMilestone.TimeoutNotReached.selector);
        weft.refundAfterTimeout(milestoneHash);
    }
}
