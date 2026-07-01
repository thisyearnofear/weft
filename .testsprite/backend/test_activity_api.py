"""TestSprite backend test — GET /api/activity

Verifies the activity feed API returns valid JSON with:
- ok: true
- events: non-empty array
- each event has timestamp, type, title, description
- event types are from the valid set
"""
import json
import urllib.request

BASE = "https://weft.thisyearnofear.com"

VALID_TYPES = {"verification", "charge", "revenue", "consensus", "deadline", "chaos"}


def test_activity_schema():
    url = f"{BASE}/api/activity"
    with urllib.request.urlopen(url, timeout=30) as resp:
        assert resp.status == 200, f"Expected 200, got {resp.status}"
        data = json.loads(resp.read().decode())

    assert data.get("ok") is True, f"Expected ok=true, got {data.get('ok')}"

    events = data.get("events")
    assert events is not None, "Missing 'events' field"
    assert isinstance(events, list), "events should be a list"
    assert len(events) > 0, "events array should not be empty"
    assert data.get("count") == len(events), \
        f"count ({data.get('count')}) != len(events) ({len(events)})"

    evt = events[0]
    assert "timestamp" in evt, "event missing 'timestamp'"
    assert "type" in evt, "event missing 'type'"
    assert "title" in evt, "event missing 'title'"
    assert "description" in evt, "event missing 'description'"
    assert evt["type"] in VALID_TYPES, f"Invalid event type: {evt['type']}"

    # Verify events are sorted by timestamp descending
    timestamps = [e["timestamp"] for e in events]
    assert timestamps == sorted(timestamps, reverse=True), \
        "Events should be sorted by timestamp descending"
