// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "../src/utils/Ownable.sol";
import {VerifierAgenticId} from "../src/VerifierAgenticId.sol";

contract VerifierAgenticIdTest is Test {
    event WeftMilestoneSet(address indexed milestone);

    address owner = makeAddr("owner");
    address milestone = makeAddr("milestone");
    address verifier1 = makeAddr("verifier1");
    address verifier2 = makeAddr("verifier2");
    address stranger = makeAddr("stranger");

    VerifierAgenticId agenticId;

    function setUp() public {
        vm.prank(owner);
        agenticId = new VerifierAgenticId(owner);

        vm.startPrank(owner);
        agenticId.setWeftMilestone(milestone);
        vm.stopPrank();
    }

    function testMintAssignsTokenIdAndStats() public {
        bytes32 meta = keccak256("metadata-root");
        vm.prank(owner);
        uint256 tokenId = agenticId.mint(verifier1, meta);

        assertEq(tokenId, 1);
        assertEq(agenticId.verifierOf(tokenId), verifier1);
        assertEq(agenticId.tokenOf(verifier1), tokenId);
        assertEq(agenticId.totalAgents(), 1);

        VerifierAgenticId.VerifierStats memory s = agenticId.getStats(tokenId);
        assertEq(s.milestonesVerified, 0);
        assertEq(s.quorumParticipated, 0);
        assertEq(s.lastEvidenceRoot, bytes32(0));
        assertEq(s.mintedAt, block.timestamp);
        assertEq(s.metadataRoot, meta);
    }

    function testMintRevertsForStranger() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.NotOwner.selector));
        agenticId.mint(verifier1, bytes32(0));
    }

    function testMintRevertsOnDoubleMint() public {
        vm.startPrank(owner);
        agenticId.mint(verifier1, bytes32(0));
        vm.expectRevert(abi.encodeWithSelector(VerifierAgenticId.AlreadyMinted.selector, verifier1));
        agenticId.mint(verifier1, bytes32(0));
        vm.stopPrank();
    }

    function testRecordVerdictUpdatesStats() public {
        vm.prank(owner);
        agenticId.mint(verifier1, bytes32(0));

        // First verdict: didComplete=true
        vm.prank(milestone);
        agenticId.recordVerdict(verifier1, true, bytes32("evidence1"));

        VerifierAgenticId.VerifierStats memory s = agenticId.statsOfVerifier(verifier1);
        assertEq(s.milestonesVerified, 1);
        assertEq(s.quorumParticipated, 1);
        assertEq(s.lastEvidenceRoot, bytes32("evidence1"));
        assertEq(s.lastActiveAt, block.timestamp);

        // Second verdict: didComplete=false (participated but not verified)
        vm.prank(milestone);
        agenticId.recordVerdict(verifier1, false, bytes32("evidence2"));

        s = agenticId.statsOfVerifier(verifier1);
        assertEq(s.milestonesVerified, 1); // unchanged
        assertEq(s.quorumParticipated, 2);
        assertEq(s.lastEvidenceRoot, bytes32("evidence2"));
    }

    function testRecordVerdictRevertsForUnauthorized() public {
        vm.prank(owner);
        agenticId.mint(verifier1, bytes32(0));

        vm.prank(stranger);
        vm.expectRevert(VerifierAgenticId.NotAuthorized.selector);
        agenticId.recordVerdict(verifier1, true, bytes32("evidence"));
    }

    function testRecordVerdictRevertsForUnmintedVerifier() public {
        vm.prank(milestone);
        vm.expectRevert(abi.encodeWithSelector(VerifierAgenticId.NotMinted.selector, verifier2));
        agenticId.recordVerdict(verifier2, true, bytes32("evidence"));
    }

    function testOwnerCanRecordVerdict() public {
        vm.prank(owner);
        agenticId.mint(verifier1, bytes32(0));

        // Owner is also authorized to record (useful for backfill / testing)
        vm.prank(owner);
        agenticId.recordVerdict(verifier1, true, bytes32("owner-evidence"));

        VerifierAgenticId.VerifierStats memory s = agenticId.statsOfVerifier(verifier1);
        assertEq(s.milestonesVerified, 1);
        assertEq(s.quorumParticipated, 1);
    }

    function testUpdateMetadataRoot() public {
        vm.prank(owner);
        agenticId.mint(verifier1, bytes32(0));

        bytes32 newRoot = keccak256("updated-root");
        vm.prank(owner);
        agenticId.updateMetadataRoot(1, newRoot);

        VerifierAgenticId.VerifierStats memory s = agenticId.getStats(1);
        assertEq(s.metadataRoot, newRoot);
    }

    function testMultipleAgentsGetSequentialTokenIds() public {
        vm.startPrank(owner);
        uint256 id1 = agenticId.mint(verifier1, bytes32(0));
        uint256 id2 = agenticId.mint(verifier2, bytes32(0));
        vm.stopPrank();

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(agenticId.totalAgents(), 2);
        assertEq(agenticId.verifierOf(id2), verifier2);
    }

    function testStatsOfVerifierRevertsForUnminted() public {
        vm.expectRevert(abi.encodeWithSelector(VerifierAgenticId.NotMinted.selector, verifier2));
        agenticId.statsOfVerifier(verifier2);
    }

    function testSetWeftMilestoneEmitsEvent() public {
        VerifierAgenticId newId = new VerifierAgenticId(owner);

        vm.expectEmit(true, false, false, false);
        emit WeftMilestoneSet(milestone);

        vm.prank(owner);
        newId.setWeftMilestone(milestone);

        assertEq(newId.weftMilestone(), milestone);
    }
}
