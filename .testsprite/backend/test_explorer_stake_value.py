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
    assert len(milestones) > 0, "No milestones returned"

    m = milestones[0]
    staked_eth = m.get("stakedEth", "")
    total_staked = m.get("totalStaked", "0")

    # stakedEth should be a small decimal string like "0.0100"
    # If it equals the raw totalStaked (e.g. "10000000000000000"), the conversion is broken
    assert staked_eth != total_staked, \
        f"stakedEth ({staked_eth}) equals raw totalStaked ({total_staked}) — wei-to-ETH conversion is broken"

    # stakedEth should contain a decimal point (ETH values are decimals)
    assert "." in staked_eth, \
        f"stakedEth ({staked_eth}) should be a decimal ETH value, not raw wei"

    # The numeric value should be reasonable (less than 1 ETH for this demo)
    eth_value = float(staked_eth)
    assert eth_value < 1.0, \
        f"stakedEth ({staked_eth}) = {eth_value} ETH — expected < 1.0 ETH for demo milestone"
    assert eth_value > 0, \
        f"stakedEth ({staked_eth}) should be positive"
