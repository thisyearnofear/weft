"""TestSprite backend test — GET /api/treasury

Verifies the treasury API returns valid JSON with:
- ok: true
- earned, spent, net (numeric)
- spendByService (object)
- recentCharges (array)
- balance object with available and pending
"""
import json
import urllib.request

BASE = "https://weft.thisyearnofear.com"


def test_treasury_schema():
    url = f"{BASE}/api/treasury"
    with urllib.request.urlopen(url, timeout=30) as resp:
        assert resp.status == 200, f"Expected 200, got {resp.status}"
        data = json.loads(resp.read().decode())

    assert data.get("ok") is True, f"Expected ok=true, got {data.get('ok')}"
    assert "earned" in data, "missing 'earned'"
    assert "spent" in data, "missing 'spent'"
    assert "net" in data, "missing 'net'"
    assert isinstance(data["earned"], (int, float)), "earned should be numeric"
    assert isinstance(data["spent"], (int, float)), "spent should be numeric"

    spend = data.get("spendByService")
    assert spend is not None, "missing 'spendByService'"
    assert isinstance(spend, dict), "spendByService should be a dict"

    charges = data.get("recentCharges")
    assert charges is not None, "missing 'recentCharges'"
    assert isinstance(charges, list), "recentCharges should be a list"

    balance = data.get("balance")
    assert balance is not None, "missing 'balance'"
    assert "available" in balance, "balance missing 'available'"
    assert "pending" in balance, "balance missing 'pending'"

    # Cross-check: net should equal earned - spent
    expected_net = data["earned"] - data["spent"]
    assert abs(data["net"] - expected_net) < 0.01, \
        f"net ({data['net']}) != earned - spent ({expected_net})"
