// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "./utils/Ownable.sol";
import {ReentrancyGuard} from "./utils/ReentrancyGuard.sol";
import {IWeftMilestone} from "./interfaces/IWeftMilestone.sol";
import {IKeeperHub} from "./interfaces/IKeeperHub.sol";

/// @title KeeperHubRelayer
/// @notice On-chain relayer that KeeperHub calls to trigger capital release.
/// @dev Implements IKeeperHub.scheduleRelease() by calling WeftMilestone.release().
///      Deployed separately from WeftMilestone. Anyone can trigger release() directly
///      on the milestone contract — this relayer adds KeeperHub integration for
///      automated release after off-chain verification confirmation.
///
///      Flow:
///        1) Verifier submits submitVerdict() on WeftMilestone (via KeeperHub or cast)
///        2) KeeperHub confirms the tx
///        3) KeeperHub calls scheduleRelease() on this relayer
///        4) Relayer calls WeftMilestone.release() to distribute escrowed ETH
contract KeeperHubRelayer is Ownable, ReentrancyGuard {
    /// @notice The WeftMilestone contract this relayer targets.
    IWeftMilestone public immutable weftMilestone;

    /// @notice Tracks which milestones have been released through this relayer.
    mapping(bytes32 => bool) public released;

    /// @notice Emitted when a release is triggered through this relayer.
    event ReleaseTriggered(bytes32 indexed milestoneHash, uint256 amount);

    /// @notice Emitted when a release attempt fails (the milestone contract may revert).
    event ReleaseFailed(bytes32 indexed milestoneHash, string reason);

    /// @param _weftMilestone Address of the deployed WeftMilestone contract.
    constructor(address _weftMilestone) {
        if (_weftMilestone == address(0)) revert ZeroAddress();
        weftMilestone = IWeftMilestone(_weftMilestone);
    }

    /// @inheritdoc IKeeperHub
    /// @dev Called by KeeperHub after off-chain verification confirms the onchain verdict.
    ///      Relays the call to WeftMilestone.release().
    ///      Uses nonReentrant to prevent re-entrancy from the milestone's ETH transfer.
    function scheduleRelease(
        bytes32 milestoneHash,
        address,      /* recipient — unused, milestone contract handles splits */
        uint256       /* amount — unused, milestone contract knows totalStaked */
    ) external payable nonReentrant {
        if (released[milestoneHash]) revert AlreadyReleased();

        // Delegate to the milestone contract — it validates verified + finalized state
        released[milestoneHash] = true;

        // Get the milestone's totalStaked before release for the event
        (,,, address builder,,,,,,,,,) = IWeftMilestone(weftMilestone).milestones(milestoneHash);
        if (builder == address(0)) revert MilestoneNotFound();

        try weftMilestone.release(milestoneHash) {
            emit ReleaseTriggered(milestoneHash, address(weftMilestone).balance);
        } catch Error(string memory reason) {
            released[milestoneHash] = false;
            emit ReleaseFailed(milestoneHash, reason);
            revert(string.concat("release failed: ", reason));
        } catch {
            released[milestoneHash] = false;
            emit ReleaseFailed(milestoneHash, "unknown error");
            revert("release failed");
        }
    }

    /// @notice Check if a milestone has been released through this relayer.
    /// @param milestoneHash The milestone hash to check.
    /// @return True if already released.
    function isReleased(bytes32 milestoneHash) external view returns (bool) {
        return released[milestoneHash];
    }

    /// @notice Withdraw any ETH accidentally sent to this contract.
    function withdraw(address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        (bool ok, ) = to.call{value: address(this).balance}("");
        if (!ok) revert TransferFailed();
    }
}
