# SPDX-License-Identifier: MIT
"""
Canton settlement adapter.

Talks to a local ledger mirror (JSON) and optionally a Canton JSON API / script
wrapper for Devnet. Implements SettlementRail without requiring the Daml SDK
at import time.
"""

from __future__ import annotations

import json
import os
import subprocess
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from .domain.models import (
    MilestoneParties,
    MilestoneStatus,
    MilestoneViewModel,
    SettlementReceipt,
    StakeRecord,
    VerdictPayload,
)

DEFAULT_LEDGER_PATH = "canton/.ledger/milestones.json"


def _default_ledger_path() -> Path:
    env = os.environ.get("CANTON_LEDGER_STORE")
    if env:
        return Path(env)
    # Prefer repo-relative path when running from weft root
    root = Path(__file__).resolve().parents[2]
    return root / DEFAULT_LEDGER_PATH


class CantonLedgerStore:
    """File-backed mirror of Canton milestone contracts + CBTC balances."""

    def __init__(self, path: Optional[Path] = None) -> None:
        self.path = path or _default_ledger_path()

    def _load(self) -> Dict[str, Any]:
        if not self.path.exists():
            return {"milestones": {}, "balances": {}}
        with open(self.path, "r", encoding="utf-8") as f:
            data = json.load(f)
        data.setdefault("milestones", {})
        data.setdefault("balances", {})
        return data

    def _save(self, data: Dict[str, Any]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, sort_keys=True)
            f.write("\n")
        tmp.replace(self.path)

    def list_milestones(self) -> List[Dict[str, Any]]:
        data = self._load()
        return list(data.get("milestones", {}).values())

    def get(self, milestone_id: str) -> Optional[Dict[str, Any]]:
        return self._load().get("milestones", {}).get(milestone_id)

    def put(self, milestone_id: str, record: Dict[str, Any]) -> None:
        data = self._load()
        data.setdefault("milestones", {})[milestone_id] = record
        self._save(data)

    def get_balance(self, party: str, symbol: str = "CBTC") -> str:
        bal = self._load().get("balances", {}).get(party, {})
        return str(bal.get(symbol, "0"))

    def set_balance(self, party: str, amount: str, symbol: str = "CBTC") -> None:
        data = self._load()
        data.setdefault("balances", {}).setdefault(party, {})[symbol] = str(amount)
        self._save(data)

    def adjust_balance(self, party: str, delta: float, symbol: str = "CBTC") -> str:
        cur = float(self.get_balance(party, symbol) or 0)
        nxt = cur + delta
        if nxt < -1e-12:
            raise ValueError(f"insufficient {symbol} for {party}: have {cur}, delta {delta}")
        self.set_balance(party, f"{nxt:.8f}".rstrip("0").rstrip(".") or "0", symbol)
        return self.get_balance(party, symbol)

    def list_balances(self) -> Dict[str, Any]:
        return self._load().get("balances", {})


def _status_from_record(rec: Dict[str, Any]) -> MilestoneStatus:
    if rec.get("released"):
        return MilestoneStatus.RELEASED
    if rec.get("refunded"):
        return MilestoneStatus.REFUNDED
    if rec.get("finalized") and rec.get("verified"):
        return MilestoneStatus.VERIFIED
    if rec.get("finalized") and not rec.get("verified"):
        return MilestoneStatus.FAILED
    stakes = rec.get("stakes") or []
    if stakes:
        return MilestoneStatus.FUNDED
    return MilestoneStatus.PENDING


def _view_from_record(rec: Dict[str, Any]) -> MilestoneViewModel:
    parties = rec.get("parties") or {}
    stakes = [
        StakeRecord(funder=s["funder"], amount=str(s["amount"]))
        for s in (rec.get("stakes") or [])
    ]
    settlement = rec.get("settlement") or {}
    vm = MilestoneViewModel(
        milestone_id=rec["milestoneId"],
        rail="canton",
        project_id=rec.get("projectId", ""),
        template_id=rec.get("templateId", ""),
        metadata_hash=rec.get("metadataHash", ""),
        deadline=int(rec.get("deadline", 0)),
        total_staked=str(rec.get("totalStaked", "0")),
        status=_status_from_record(rec),
        finalized=bool(rec.get("finalized")),
        verified=bool(rec.get("verified")),
        released=bool(rec.get("released")),
        verifier_count=int(rec.get("verifierCount", 0)),
        verified_votes=int(rec.get("verifiedVotes", 0)),
        quorum=int(rec.get("quorum", 2)),
        final_evidence_root=rec.get("finalEvidenceRoot", ""),
        parties=MilestoneParties(
            issuer=parties.get("issuer", ""),
            builder=parties.get("builder", ""),
            funders=list(parties.get("funders") or []),
            verifiers=list(parties.get("verifiers") or []),
            observers=list(parties.get("observers") or []),
        ),
        stakes=stakes,
    )
    # Attach CBTC settlement extras via to_status_dict monkeypatch field — store on object
    vm._settlement = settlement  # type: ignore[attr-defined]
    vm._last_transfer_ref = rec.get("lastTransferRef", "")  # type: ignore[attr-defined]
    return vm


def _enrich_status(vm: MilestoneViewModel) -> Dict[str, Any]:
    d = vm.to_status_dict()
    settlement = getattr(vm, "_settlement", None) or {}
    d["settlement"] = {
        "symbol": settlement.get("symbol") or os.environ.get("CANTON_SETTLEMENT_SYMBOL", "CBTC"),
        "instrumentId": settlement.get("instrumentId")
        or os.environ.get("CANTON_CBTC_INSTRUMENT_ID", "cbtc-devnet-placeholder"),
        "decimals": int(settlement.get("decimals") or 8),
    }
    d["lastTransferRef"] = getattr(vm, "_last_transfer_ref", "") or ""
    return d


DEFAULT_CBTC_SETTLEMENT = {
    "symbol": "CBTC",
    "instrumentId": "cbtc-devnet-placeholder",
    "decimals": 8,
}


class CantonSettlement:
    """SettlementRail for Canton Network (Devnet / ledger mirror)."""

    name = "canton"

    def __init__(
        self,
        *,
        store: Optional[CantonLedgerStore] = None,
        json_api_url: str = "",
        party_verifier: str = "",
        daml_script: str = "",
    ) -> None:
        self.store = store or CantonLedgerStore()
        self.json_api_url = json_api_url.rstrip("/")
        self.party_verifier = party_verifier
        self.daml_script = daml_script  # optional path to canton/scripts/exercise.sh

    @classmethod
    def from_env(cls) -> "CantonSettlement":
        return cls(
            store=CantonLedgerStore(_default_ledger_path()),
            json_api_url=os.environ.get("CANTON_JSON_API_URL", ""),
            party_verifier=os.environ.get("CANTON_VERIFIER_PARTY", "Verifier"),
            daml_script=os.environ.get("CANTON_EXERCISE_SCRIPT", ""),
        )

    def read_milestone(self, milestone_id: str) -> Optional[MilestoneViewModel]:
        rec = self.store.get(milestone_id)
        if not rec:
            return None
        return _view_from_record(rec)

    def list_milestones(self) -> List[MilestoneViewModel]:
        return [_view_from_record(r) for r in self.store.list_milestones()]

    def list_milestone_dicts(self) -> List[Dict[str, Any]]:
        return [_enrich_status(_view_from_record(r)) for r in self.store.list_milestones()]

    def read_milestone_dict(self, milestone_id: str) -> Optional[Dict[str, Any]]:
        m = self.read_milestone(milestone_id)
        return _enrich_status(m) if m else None

    def faucet_cbtc(self, party: str, amount: str = "0.05") -> SettlementReceipt:
        """Credit faucet CBTC into the ledger-mirror balance book (Devnet faucet stand-in)."""
        try:
            before = self.store.get_balance(party, "CBTC")
            after = self.store.adjust_balance(party, float(amount), "CBTC")
        except Exception as e:
            return SettlementReceipt(
                ok=False, rail=self.name, milestone_id="", action="faucet_cbtc", error=str(e)
            )
        xref = f"cbtc-faucet-{uuid.uuid4().hex[:10]}"
        return SettlementReceipt(
            ok=True,
            rail=self.name,
            milestone_id="",
            action="faucet_cbtc",
            reference=xref,
            raw={"party": party, "before": before, "after": after, "symbol": "CBTC"},
        )

    def create_milestone(
        self,
        *,
        milestone_id: str,
        project_id: str,
        template_id: str,
        deadline: int,
        metadata_hash: str,
        builder: str,
        verifiers: List[str],
        observers: List[str],
        quorum: int = 2,
        issuer: str = "",
        settlement: Optional[Dict[str, Any]] = None,
    ) -> SettlementReceipt:
        issuer = issuer or os.environ.get("CANTON_ISSUER_PARTY", "Issuer")
        contract_id = f"cid-{uuid.uuid4().hex[:16]}"
        settle = dict(DEFAULT_CBTC_SETTLEMENT)
        settle["instrumentId"] = os.environ.get(
            "CANTON_CBTC_INSTRUMENT_ID", settle["instrumentId"]
        )
        if settlement:
            settle.update(settlement)
        rec = {
            "milestoneId": milestone_id,
            "contractId": contract_id,
            "projectId": project_id,
            "templateId": template_id,
            "metadataHash": metadata_hash,
            "deadline": deadline,
            "totalStaked": "0",
            "finalized": False,
            "verified": False,
            "released": False,
            "refunded": False,
            "verifierCount": 0,
            "verifiedVotes": 0,
            "quorum": quorum,
            "finalEvidenceRoot": "",
            "lastTransferRef": "",
            "settlement": settle,
            "votes": [],
            "stakes": [],
            "parties": {
                "issuer": issuer,
                "builder": builder or issuer,
                "funders": [],
                "verifiers": list(verifiers),
                "observers": list(observers),
            },
            "createdAt": int(time.time()),
            "ledger": os.environ.get("CANTON_NETWORK", "local-mirror"),
        }
        self.store.put(milestone_id, rec)
        self._maybe_exercise("CreateMilestone", milestone_id, rec)
        return SettlementReceipt(
            ok=True,
            rail=self.name,
            milestone_id=milestone_id,
            action="create_milestone",
            reference=contract_id,
            raw=rec,
        )

    def stake(
        self,
        milestone_id: str,
        *,
        funder: str,
        amount: str,
        transfer_ref: str = "",
    ) -> SettlementReceipt:
        rec = self.store.get(milestone_id)
        if not rec:
            return SettlementReceipt(
                ok=False, rail=self.name, milestone_id=milestone_id, action="stake", error="milestone not found"
            )
        if rec.get("finalized"):
            return SettlementReceipt(
                ok=False, rail=self.name, milestone_id=milestone_id, action="stake", error="already finalized"
            )
        symbol = (rec.get("settlement") or {}).get("symbol") or "CBTC"
        amt = float(amount)
        try:
            bal_before = self.store.get_balance(funder, symbol)
            self.store.adjust_balance(funder, -amt, symbol)
            bal_after = self.store.get_balance(funder, symbol)
        except ValueError as e:
            return SettlementReceipt(
                ok=False, rail=self.name, milestone_id=milestone_id, action="stake", error=str(e)
            )
        xref = transfer_ref or f"cbtc-stake-{uuid.uuid4().hex[:10]}"
        stakes = list(rec.get("stakes") or [])
        stakes.append({"funder": funder, "amount": str(amount), "transferRef": xref})
        rec["stakes"] = stakes
        try:
            total = sum(float(s["amount"]) for s in stakes)
        except ValueError:
            total = amt
        rec["totalStaked"] = f"{total:.8f}".rstrip("0").rstrip(".") or "0"
        rec["lastTransferRef"] = xref
        funders = list(rec["parties"].get("funders") or [])
        if funder not in funders:
            funders.append(funder)
        rec["parties"]["funders"] = funders
        self.store.put(milestone_id, rec)
        self._maybe_exercise(
            "Stake",
            milestone_id,
            {"funder": funder, "amount": amount, "transferRef": xref},
        )
        return SettlementReceipt(
            ok=True,
            rail=self.name,
            milestone_id=milestone_id,
            action="stake",
            reference=xref,
            raw={
                "totalStaked": rec["totalStaked"],
                "symbol": symbol,
                "balanceBefore": bal_before,
                "balanceAfter": bal_after,
            },
        )

    def submit_verdict(self, milestone_id: str, verdict: VerdictPayload) -> SettlementReceipt:
        rec = self.store.get(milestone_id)
        if not rec:
            return SettlementReceipt(
                ok=False,
                rail=self.name,
                milestone_id=milestone_id,
                action="submit_verdict",
                error="milestone not found",
            )
        if rec.get("finalized"):
            return SettlementReceipt(
                ok=False,
                rail=self.name,
                milestone_id=milestone_id,
                action="submit_verdict",
                error="already finalized",
            )

        verifier = verdict.verifier or self.party_verifier
        authorized = rec["parties"].get("verifiers") or []
        if authorized and verifier not in authorized:
            return SettlementReceipt(
                ok=False,
                rail=self.name,
                milestone_id=milestone_id,
                action="submit_verdict",
                error=f"verifier {verifier} not authorized",
            )

        votes = list(rec.get("votes") or [])
        if any(v.get("verifier") == verifier for v in votes):
            return SettlementReceipt(
                ok=False,
                rail=self.name,
                milestone_id=milestone_id,
                action="submit_verdict",
                error="verifier already voted",
            )

        votes.append(
            {
                "verifier": verifier,
                "didComplete": verdict.did_complete,
                "evidenceHash": verdict.evidence_hash,
                "at": int(time.time()),
            }
        )
        rec["votes"] = votes
        rec["verifierCount"] = len(votes)
        rec["verifiedVotes"] = sum(1 for v in votes if v.get("didComplete"))
        quorum = int(rec.get("quorum", 2))

        # Auto-finalize at quorum (mirrors Daml Finalize choice)
        if len(votes) >= quorum:
            verified = rec["verifiedVotes"] >= quorum
            rec["finalized"] = True
            rec["verified"] = verified
            # Prefer unanimous evidence root when complete votes agree
            complete_roots = [v["evidenceHash"] for v in votes if v.get("didComplete")]
            rec["finalEvidenceRoot"] = (
                complete_roots[0] if complete_roots and all(r == complete_roots[0] for r in complete_roots) else verdict.evidence_hash
            )

        self.store.put(milestone_id, rec)
        self._maybe_exercise(
            "SubmitVerdict",
            milestone_id,
            {
                "didComplete": verdict.did_complete,
                "evidenceHash": verdict.evidence_hash,
                "verifier": verifier,
            },
        )
        return SettlementReceipt(
            ok=True,
            rail=self.name,
            milestone_id=milestone_id,
            action="submit_verdict",
            reference=rec.get("contractId", ""),
            raw={
                "finalized": rec["finalized"],
                "verified": rec["verified"],
                "verifierCount": rec["verifierCount"],
            },
        )

    def release(self, milestone_id: str, *, transfer_ref: str = "") -> SettlementReceipt:
        rec = self.store.get(milestone_id)
        if not rec:
            return SettlementReceipt(
                ok=False, rail=self.name, milestone_id=milestone_id, action="release", error="milestone not found"
            )
        if not rec.get("finalized") or not rec.get("verified"):
            return SettlementReceipt(
                ok=False,
                rail=self.name,
                milestone_id=milestone_id,
                action="release",
                error="requires finalized+verified",
            )
        if rec.get("released"):
            return SettlementReceipt(
                ok=False, rail=self.name, milestone_id=milestone_id, action="release", error="already released"
            )
        symbol = (rec.get("settlement") or {}).get("symbol") or "CBTC"
        builder = rec["parties"].get("builder") or rec["parties"].get("issuer")
        amt = float(rec.get("totalStaked") or 0)
        xref = transfer_ref or f"cbtc-release-{uuid.uuid4().hex[:10]}"
        if amt > 0 and builder:
            self.store.adjust_balance(builder, amt, symbol)
        rec["released"] = True
        rec["lastTransferRef"] = xref
        self.store.put(milestone_id, rec)
        self._maybe_exercise("Release", milestone_id, {"transferRef": xref})
        return SettlementReceipt(
            ok=True,
            rail=self.name,
            milestone_id=milestone_id,
            action="release",
            reference=xref,
            raw={
                "paidTo": builder,
                "amount": rec.get("totalStaked"),
                "symbol": symbol,
                "balanceAfter": self.store.get_balance(builder, symbol) if builder else "",
            },
        )

    def refund(self, milestone_id: str, *, transfer_ref: str = "") -> SettlementReceipt:
        rec = self.store.get(milestone_id)
        if not rec:
            return SettlementReceipt(
                ok=False, rail=self.name, milestone_id=milestone_id, action="refund", error="milestone not found"
            )
        if rec.get("released"):
            return SettlementReceipt(
                ok=False, rail=self.name, milestone_id=milestone_id, action="refund", error="already released"
            )
        failed = rec.get("finalized") and not rec.get("verified")
        timed_out = int(time.time()) > int(rec.get("deadline", 0) or 0)
        if not (failed or timed_out):
            return SettlementReceipt(
                ok=False,
                rail=self.name,
                milestone_id=milestone_id,
                action="refund",
                error="refund only after failed finalize or timeout",
            )
        symbol = (rec.get("settlement") or {}).get("symbol") or "CBTC"
        xref = transfer_ref or f"cbtc-refund-{uuid.uuid4().hex[:10]}"
        for s in rec.get("stakes") or []:
            self.store.adjust_balance(s["funder"], float(s["amount"]), symbol)
        rec["refunded"] = True
        rec["lastTransferRef"] = xref
        self.store.put(milestone_id, rec)
        self._maybe_exercise("Refund", milestone_id, {"transferRef": xref})
        return SettlementReceipt(
            ok=True,
            rail=self.name,
            milestone_id=milestone_id,
            action="refund",
            reference=xref,
        )

    def _maybe_exercise(self, choice: str, milestone_id: str, payload: Dict[str, Any]) -> None:
        """Optionally forward to Devnet via JSON API or exercise script (best-effort)."""
        if self.daml_script and os.path.isfile(self.daml_script):
            try:
                subprocess.run(
                    [self.daml_script, choice, milestone_id, json.dumps(payload)],
                    check=False,
                    capture_output=True,
                    text=True,
                    timeout=60,
                )
            except Exception:
                pass
        if not self.json_api_url:
            return
        # Placeholder for Canton JSON API v2 command submission — ledger mirror is authoritative in v1.
        return
