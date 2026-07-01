"""TestSprite backend test — GET /api/verifiers

Verifies the verifier network API returns valid JSON with:
- ok: true
- verifiers array with address, votesCast, milestonesParticipated
- consensus object with agreementRate, totalVotes
"""
import json
import urllib.request

BASE = "https://weft.thisyearnofear.com"


def test_verifiers_schema():
    url = f"{BASE}/api/verifiers"
    with urllib.request.urlopen(url, timeout=30) as resp:
        assert resp.status == 200, f"Expected 200, got {resp.status}"
        data = json.loads(resp.read().decode())

    assert data.get("ok") is True, f"Expected ok=true, got {data.get('ok')}"

    verifiers = data.get("verifiers")
    assert verifiers is not None, "Missing 'verifiers' field"
    assert isinstance(verifiers, list), "verifiers should be a list"
    assert len(verifiers) > 0, "verifiers array should not be empty"

    v = verifiers[0]
    assert "address" in v, "verifier missing 'address'"
    assert v["address"].startswith("0x"), "verifier address should start with 0x"
    assert "votesCast" in v, "verifier missing 'votesCast'"
    assert "milestonesParticipated" in v, "verifier missing 'milestonesParticipated'"
    assert isinstance(v["milestonesParticipated"], list), \
        "milestonesParticipated should be a list"

    consensus = data.get("consensus")
    assert consensus is not None, "Missing 'consensus' object"
    assert "agreementRate" in consensus, "consensus missing 'agreementRate'"
    assert "totalVotes" in consensus, "consensus missing 'totalVotes'"
    assert "totalVerifierSlots" in consensus, "consensus missing 'totalVerifierSlots'"
