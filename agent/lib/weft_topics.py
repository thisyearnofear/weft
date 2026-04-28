#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Canonical event topics for Weft contracts.

Single source of truth so indexers/schedulers do not drift.
"""

# keccak256("MilestoneCreated(bytes32,bytes32,address,bytes32,uint256,bytes32)")
MILESTONE_CREATED_TOPIC0 = "0xdf8f41dec4a0bc2532bb71b1e28d8cffc7b2d28b2db538aa79956981696dde01"

# keccak256("VerdictSubmitted(bytes32,address,bool,bytes32)")
VERDICT_SUBMITTED_TOPIC0 = "0x17cc915ba78cc25f4c4cacb255562f711b8c6e0abb3667bb8f93dad3b8891968"

# keccak256("MilestoneFinalized(bytes32,bool,bytes32)")
MILESTONE_FINALIZED_TOPIC0 = "0x118881c1c10089c676856c2a495f78fd7bb5fd50a9eb80d053da9a68170f9935"

