"""TestSprite backend test — GET /api/operations

Verifies the operations dashboard API returns valid JSON with:
- ok: true
- treasury object with earned, spent, net fields
- verifications array
- recovery object
"""
import json

import requests

BASE = "https://weft.persidian.com"


def test_operations_schema():
    url = f"{BASE}/api/operations"
    resp = requests.get(url, timeout=30)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()

    assert data.get("ok") is True, f"Expected ok=true, got {data.get('ok')}"

    treasury = data.get("treasury")
    assert treasury is not None, "Missing 'treasury' object"
    assert "earned" in treasury, "treasury missing 'earned'"
    assert "spent" in treasury, "treasury missing 'spent'"
    assert "net" in treasury, "treasury missing 'net'"

    verifications = data.get("verifications")
    assert verifications is not None, "Missing 'verifications' field"
    assert isinstance(verifications, list), "verifications should be a list"

    recovery = data.get("recovery")
    assert recovery is not None, "Missing 'recovery' object"

# TestSprite executes this file top to bottom, so the test function
# MUST be called: a defined-but-never-called function would pass vacuously.
test_operations_schema()
