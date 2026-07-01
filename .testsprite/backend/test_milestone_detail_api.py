"""TestSprite backend test — GET /api/status/milestone/[hash]

Verifies the milestone detail API returns valid JSON with:
- ok: true
- milestoneHash, builder, totalStaked, verified, released, verifierCount
- Cross-checks: if verified=true then verifiedVotes > 0
"""
import json
import urllib.request

BASE = "https://weft.thisyearnofear.com"
DEMO_HASH = "0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f"


def test_milestone_detail_schema():
    url = f"{BASE}/api/status/milestone/{DEMO_HASH}"
    with urllib.request.urlopen(url, timeout=30) as resp:
        assert resp.status == 200, f"Expected 200, got {resp.status}"
        data = json.loads(resp.read().decode())

    assert data.get("ok") is True, f"Expected ok=true, got {data.get('ok')}"
    assert data.get("milestoneHash") == DEMO_HASH, \
        f"milestoneHash mismatch: {data.get('milestoneHash')}"
    assert "builder" in data, "missing 'builder'"
    assert data["builder"].startswith("0x"), "builder should be an address"
    assert "totalStaked" in data, "missing 'totalStaked'"
    assert "verified" in data, "missing 'verified'"
    assert "released" in data, "missing 'released'"
    assert "verifierCount" in data, "missing 'verifierCount'"
    assert "verifiedVotes" in data, "missing 'verifiedVotes'"
    assert "finalized" in data, "missing 'finalized'"

    # Cross-check: if verified, there must be votes
    if data["verified"]:
        assert data["verifiedVotes"] > 0, \
            "verified=true but verifiedVotes=0 — logical inconsistency"
        assert data["verifierCount"] > 0, \
            "verified=true but verifierCount=0 — logical inconsistency"

    # Cross-check: if released, must be verified and finalized
    if data["released"]:
        assert data["verified"] is True, \
            "released=true but verified=false — capital released without verification"
        assert data["finalized"] is True, \
            "released=true but finalized=false — capital released before finalization"
