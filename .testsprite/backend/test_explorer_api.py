"""TestSprite backend test — GET /api/explorer/milestones

Verifies the explorer API returns valid JSON with the expected schema:
- ok: true
- milestones: non-empty array
- each milestone has milestoneHash, state, statusLabel, stakedEth
"""
import json
import urllib.request

BASE = "https://weft.thisyearnofear.com"


def test_explorer_milestones_schema():
    url = f"{BASE}/api/explorer/milestones"
    with urllib.request.urlopen(url, timeout=30) as resp:
        assert resp.status == 200, f"Expected 200, got {resp.status}"
        data = json.loads(resp.read().decode())

    assert data.get("ok") is True, f"Expected ok=true, got {data.get('ok')}"
    assert "milestones" in data, "Missing 'milestones' field"
    assert isinstance(data["milestones"], list), "milestones should be a list"
    assert len(data["milestones"]) > 0, "milestones array should not be empty"

    m = data["milestones"][0]
    assert "milestoneHash" in m, "milestone missing 'milestoneHash'"
    assert "state" in m, "milestone missing 'state'"
    assert "statusLabel" in m, "milestone missing 'statusLabel'"
    assert "stakedEth" in m, "milestone missing 'stakedEth'"
    assert m["milestoneHash"].startswith("0x"), "milestoneHash should start with 0x"
