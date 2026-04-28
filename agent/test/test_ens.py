# SPDX-License-Identifier: MIT
"""Additional agent tests for ENS client."""

import pytest

from agent.lib import (
    ens_client,
    BuilderProfile,
    EnsClient,
)


class TestEnsClient:
    def test_builder_profile_dataclass(self):
        profile = BuilderProfile(
            ens_name="builder.weft.eth",
            projects=["p1", "p2"],
            milestones_verified=5,
            earned_total=1000000000000000000,
            cobuilders=[],
            reputation_score=85,
        )
        assert profile.projects == ["p1", "p2"]
        assert profile.milestones_verified == 5
        assert profile.reputation_score == 85

    def test_ens_client_init(self):
        client = EnsClient(
            "http://localhost:8545",
            "0x1234",
        )
        assert client.rpc_url == "http://localhost:8545"
        assert client.wallet_key == "0x1234"
        assert client.public_resolver != ""

    def test_update_builder_profile_returns_empty_when_no_calls(self):
        import unittest.mock as mock

        with mock.patch.object(EnsClient, "_get_text", return_value=None):
            client = EnsClient("http://localhost:8545", "0x1234")
            result = client.update_builder_profile("test.weft.eth")
            assert result == ""