"""TestSprite backend test — GET /api/sponsor

Verifies the sponsor dashboard API returns valid JSON with:
- ok: true
- summary object with totalReleased, totalLocked, verifiedCount
- milestones array with capitalStatus field
"""
import json

import requests

BASE = "https://weft.persidian.com"


def test_sponsor_schema():
    url = f"{BASE}/api/sponsor"
    resp = requests.get(url, timeout=30)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()

    assert data.get("ok") is True, f"Expected ok=true, got {data.get('ok')}"

    summary = data.get("summary")
    assert summary is not None, "Missing 'summary' object"
    assert "totalReleased" in summary, "summary missing 'totalReleased'"
    assert "totalLocked" in summary, "summary missing 'totalLocked'"
    assert "verifiedCount" in summary, "summary missing 'verifiedCount'"
    assert "totalMilestones" in summary, "summary missing 'totalMilestones'"

    milestones = data.get("milestones")
    assert milestones is not None, "Missing 'milestones' field"
    assert isinstance(milestones, list), "milestones should be a list"
    assert len(milestones) > 0, "milestones array should not be empty"

    m = milestones[0]
    assert "capitalStatus" in m, "milestone missing 'capitalStatus'"
    assert m["capitalStatus"] in ("locked", "released", "refundable"), \
        f"Invalid capitalStatus: {m['capitalStatus']}"
    assert "stakedEth" in m, "milestone missing 'stakedEth'"
    assert "milestoneHash" in m, "milestone missing 'milestoneHash'"

# TestSprite executes this file top to bottom, so the test function
# MUST be called: a defined-but-never-called function would pass vacuously.
test_sponsor_schema()
