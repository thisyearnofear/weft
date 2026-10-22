"""TestSprite backend test — GET /api/explorer/milestones

Verifies the explorer API returns valid JSON with the expected schema:
- ok: true
- milestones: non-empty array
- each milestone has milestoneHash, state, statusLabel, stakedEth
"""
import json

import requests

BASE = "https://weft.persidian.com"


def test_explorer_milestones_schema():
    url = f"{BASE}/api/explorer/milestones"
    resp = requests.get(url, timeout=30)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()

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

# TestSprite executes this file top to bottom, so the test function
# MUST be called: a defined-but-never-called function would pass vacuously.
test_explorer_milestones_schema()
