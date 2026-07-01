"""TestSprite backend test — GET /api/sponsor

Verifies the sponsor dashboard API returns valid JSON with:
- ok: true
- summary object with totalReleased, totalLocked, verifiedCount
- milestones array with capitalStatus field
"""
import json
import urllib.request

BASE = "https://weft.thisyearnofear.com"


def test_sponsor_schema():
    url = f"{BASE}/api/sponsor"
    with urllib.request.urlopen(url, timeout=30) as resp:
        assert resp.status == 200, f"Expected 200, got {resp.status}"
        data = json.loads(resp.read().decode())

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
