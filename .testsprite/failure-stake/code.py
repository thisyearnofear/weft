# Auto-injected credentials — do not modify
__AUTH_CREDENTIAL__ = ""
__AUTH_TYPE__ = "public"
__AUTH_HEADERS__ = {}
"""TestSprite backend test — Explorer API stakedEth value check

Verifies that stakedEth is properly converted from wei to ETH.
The raw totalStaked is 10000000000000000 wei = 0.0100 ETH.
If the API returns raw wei instead of ETH, this test catches it.
"""
import json
import urllib.request

BASE = "https://weft.thisyearnofear.com"


def test_explorer_staked_eth_is_converted():
    url = f"{BASE}/api/explorer/milestones"
    with urllib.request.urlopen(url, timeout=30) as resp:
        assert resp.status == 200, f"Expected 200, got {resp.status}"
        data = json.loads(resp.read().decode())

    assert data.get("ok") is True
    milestones = data.get("milestones", [])
    assert isinstance(milestones, list) and len(milestones) > 0, "No milestones returned"

    m = milestones[0]
    assert isinstance(m, dict), "First milestone should be an object"

    staked_eth = m.get("stakedEth")
    total_staked = m.get("totalStaked")

    assert staked_eth is not None, "stakedEth missing from milestone"
    assert total_staked is not None, "totalStaked missing from milestone"

    staked_eth_str = str(staked_eth).strip()
    total_staked_str = str(total_staked).strip()

    # If the API returns a decimal ETH string, it should differ from raw wei.
    # If it returns an integer-like raw wei value, surface that as a product issue.
    if staked_eth_str == total_staked_str:
        raise AssertionError(
            f"stakedEth ({staked_eth_str}) equals raw totalStaked ({total_staked_str}) — wei-to-ETH conversion is broken"
        )

    if "." in staked_eth_str:
        eth_value = float(staked_eth_str)
        assert eth_value > 0, f"stakedEth ({staked_eth_str}) should be positive"
        assert eth_value < 1.0, f"stakedEth ({staked_eth_str}) = {eth_value} ETH — expected < 1.0 ETH for demo milestone"

        try:
            wei_value = int(total_staked_str)
            expected_eth = wei_value / 10**18
            assert abs(eth_value - expected_eth) < 1e-9, (
                f"stakedEth ({eth_value}) does not match wei conversion ({expected_eth})"
            )
        except ValueError:
            pass


test_explorer_staked_eth_is_converted()