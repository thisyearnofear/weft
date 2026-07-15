# SPDX-License-Identifier: MIT
"""
Shared Canton HTTP handlers — single source of truth for /canton/* routes.

Used by weft_canton_api.py (dedicated :9020) and optionally weft_status_api.py.
"""

from __future__ import annotations

import os
import time
from typing import Any, Dict, List, Optional, Tuple

from .canton_client import CantonSettlement
from .domain.models import VerdictPayload
from .domain.templates import (
    InstitutionalChecklistEvidence,
    build_institutional_attestation,
    evaluate_institutional_checklist,
)

CONSOLE_WALLET = {
    "devnet": "https://devnet.consolewallet.io",
    "testnet": "https://testnet.consolewallet.io",
    "mainnet": "https://consolewallet.io",
    "docs": "https://consolewallet.io/develop/ledger",
}


def visible_to_party(d: Dict[str, Any], party: str) -> bool:
    p = d.get("parties") or {}
    return party in (
        [p.get("issuer"), p.get("builder")]
        + list(p.get("funders") or [])
        + list(p.get("verifiers") or [])
        + list(p.get("observers") or [])
    )


def list_milestones(c: CantonSettlement, party: str = "") -> Dict[str, Any]:
    items = c.list_milestone_dicts()
    if party:
        items = [d for d in items if visible_to_party(d, party)]
    return {"ok": True, "rail": "canton", "milestones": items}


def get_milestone(c: CantonSettlement, milestone_id: str) -> Tuple[int, Dict[str, Any]]:
    d = c.read_milestone_dict(milestone_id)
    if not d:
        return 404, {"ok": False, "error": "not_found", "rail": "canton"}
    return 200, {"ok": True, "rail": "canton", "milestone": d}


def get_balances(c: CantonSettlement, party: str = "") -> Dict[str, Any]:
    bals = c.store.list_balances()
    if party:
        return {
            "ok": True,
            "party": party,
            "balances": bals.get(party, {}),
            "cbtc": c.store.get_balance(party, "CBTC"),
        }
    return {"ok": True, "balances": bals}


def get_wallet_info() -> Dict[str, Any]:
    net = os.environ.get("CANTON_NETWORK", "devnet")
    return {
        "ok": True,
        "consoleWallet": CONSOLE_WALLET.get(net, CONSOLE_WALLET["devnet"]),
        "docs": CONSOLE_WALLET["docs"],
        "hint": "Authenticate via Console Wallet challenge→sign→JWT, then submit Canton actions.",
    }


def health_payload() -> Dict[str, Any]:
    return {
        "ok": True,
        "service": "weft-canton-api",
        "rail": "canton",
        "network": os.environ.get("CANTON_NETWORK", "local-mirror"),
        "consoleWallet": CONSOLE_WALLET,
        "cbtcFaucet": "https://cbtc-faucet.bitsafe.finance/",
        "cbtcDocs": "https://docs.bitsafe.finance/developers",
    }


def _receipt_dict(receipt) -> Dict[str, Any]:
    return {
        "reference": receipt.reference,
        "error": receipt.error,
        "action": receipt.action,
        "raw": receipt.raw,
    }


def handle_action(c: CantonSettlement, body: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
    """Dispatch create|stake|verdict|release|refund|faucet. Returns (http_code, json)."""
    action = (body.get("action") or "").strip().lower()
    mid = (body.get("milestoneId") or body.get("milestone_id") or "").strip()

    if action == "faucet":
        party = body.get("party") or os.environ.get("CANTON_FUNDER_PARTY", "Funder")
        receipt = c.faucet_cbtc(party, str(body.get("amount") or "0.05"))
        return (200 if receipt.ok else 400), {"ok": receipt.ok, "receipt": _receipt_dict(receipt)}

    if action == "create":
        mid = mid or f"ms-{int(time.time())}"
        receipt = c.create_milestone(
            milestone_id=mid,
            project_id=body.get("projectId") or "proj-institutional",
            template_id=body.get("templateId") or "canton.institutional_checklist.v1",
            deadline=int(body.get("deadline") or (time.time() + 86400 * 30)),
            metadata_hash=body.get("metadataHash") or "",
            builder=body.get("builder") or os.environ.get("CANTON_BUILDER_PARTY", "Builder"),
            verifiers=list(
                body.get("verifiers")
                or [
                    os.environ.get("CANTON_VERIFIER_A_PARTY", "VerifierA"),
                    os.environ.get("CANTON_VERIFIER_B_PARTY", "VerifierB"),
                ]
            ),
            observers=list(
                body.get("observers") or [os.environ.get("CANTON_AUDITOR_PARTY", "Auditor")]
            ),
            quorum=int(body.get("quorum") or 2),
            issuer=body.get("issuer") or os.environ.get("CANTON_ISSUER_PARTY", "Issuer"),
            settlement=body.get("settlement"),
        )
        return (200 if receipt.ok else 400), {
            "ok": receipt.ok,
            "milestoneId": mid,
            "receipt": _receipt_dict(receipt),
        }

    if not mid:
        return 400, {"ok": False, "error": "milestoneId required"}

    if action == "stake":
        receipt = c.stake(
            mid,
            funder=body.get("funder") or os.environ.get("CANTON_FUNDER_PARTY", "Funder"),
            amount=str(body.get("amount") or "0.01"),
            transfer_ref=body.get("transferRef") or "",
        )
    elif action == "verdict":
        evidence = body.get("evidence") or {}
        use_checklist = bool(evidence) or bool(body.get("useChecklist")) or "didComplete" not in body
        if use_checklist:
            checklist = InstitutionalChecklistEvidence(
                document_hash=evidence.get("documentHash")
                or body.get("evidenceHash")
                or ("0x" + "cd" * 32),
                delivery_confirmed=bool(evidence.get("deliveryConfirmed", True)),
                invoice_settled=bool(evidence.get("invoiceSettled", True)),
                checklist_items_passed=int(evidence.get("checklistItemsPassed", 3)),
                checklist_items_required=int(evidence.get("checklistItemsRequired", 3)),
                notes=evidence.get("notes") or "",
            )
            evaluated = evaluate_institutional_checklist(checklist)
            did_complete = (
                bool(body["didComplete"]) if "didComplete" in body else evaluated["verdict"]["verified"]
            )
            evidence_hash = checklist.document_hash
            att = build_institutional_attestation(
                schema_version=1,
                project_id=body.get("projectId") or "",
                milestone_id=mid,
                template_id="canton.institutional_checklist.v1",
                evidence=checklist,
                node_address=body.get("verifier")
                or os.environ.get("CANTON_VERIFIER_PARTY", "VerifierA"),
                attested_at=int(time.time()),
            )
        else:
            did_complete = bool(body.get("didComplete", True))
            evidence_hash = body.get("evidenceHash") or ("0x" + "ab" * 32)
            att = None

        receipt = c.submit_verdict(
            mid,
            VerdictPayload(
                did_complete=did_complete,
                evidence_hash=evidence_hash,
                verifier=body.get("verifier")
                or os.environ.get("CANTON_VERIFIER_PARTY", "VerifierA"),
            ),
        )
        out: Dict[str, Any] = {
            "ok": receipt.ok,
            "milestoneId": mid,
            "receipt": _receipt_dict(receipt),
        }
        if att:
            out["attestation"] = att
        return (200 if receipt.ok else 400), out
    elif action == "release":
        receipt = c.release(mid, transfer_ref=body.get("transferRef") or "")
    elif action == "refund":
        receipt = c.refund(mid, transfer_ref=body.get("transferRef") or "")
    else:
        return 400, {"ok": False, "error": f"unknown action: {action}"}

    return (200 if receipt.ok else 400), {
        "ok": receipt.ok,
        "milestoneId": mid,
        "receipt": _receipt_dict(receipt),
    }


def pending_milestone_ids(c: CantonSettlement, now: Optional[int] = None) -> List[str]:
    """Milestones past deadline, funded, not yet finalized — for daemon poll."""
    now = now if now is not None else int(time.time())
    out: List[str] = []
    for m in c.list_milestones():
        if m.finalized or m.released:
            continue
        if m.deadline > now:
            continue
        # Require some stake before verifying
        try:
            staked = float(m.total_staked or 0)
        except (TypeError, ValueError):
            staked = 0.0
        if staked <= 0:
            continue
        out.append(m.milestone_id)
    return out
