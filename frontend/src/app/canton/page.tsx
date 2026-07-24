"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { CantonMilestone, CantonRole } from "@/lib/canton-types";
import { ROLE_PARTIES } from "@/lib/canton-types";
import { parseMilestoneView } from "@/lib/milestone-view";
import { AgentHelper } from "@/components/AgentHelper";
import styles from "./page.module.css";

const ROLES: { id: CantonRole; label: string; blurb: string }[] = [
  { id: "issuer", label: "Program officer", blurb: "Ingest from GMS · release / refund" },
  { id: "funder", label: "Funder", blurb: "Stake when capital is escrowed" },
  { id: "verifier", label: "Agent", blurb: "Checklist verdict (or auto via ingest)" },
  { id: "observer", label: "Auditor", blurb: "Download verification receipts" },
];

function asCantonList(raw: unknown[]): CantonMilestone[] {
  const out: CantonMilestone[] = [];
  for (const item of raw) {
    const m = parseMilestoneView(item, "canton");
    if (m && m.rail === "canton") out.push(m as CantonMilestone);
  }
  return out;
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CantonPage() {
  const [role, setRole] = useState<CantonRole>("issuer");
  const [milestones, setMilestones] = useState<CantonMilestone[]>([]);
  const [selected, setSelected] = useState<CantonMilestone | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [cbtc, setCbtc] = useState<string>("—");
  const [pending, startTransition] = useTransition();
  const [externalRef, setExternalRef] = useState("fluxx-grant-demo-001");
  const [notes, setNotes] = useState("Grantee submitted final report");

  const party = ROLE_PARTIES[role];

  const refresh = useCallback(() => {
    startTransition(async () => {
      setError(null);
      try {
        const [mRes, bRes] = await Promise.all([
          fetch(
            `/api/canton/milestones?party=${encodeURIComponent(party)}&role=${role}`,
            { cache: "no-store" },
          ),
          fetch(`/api/canton/balances?party=${encodeURIComponent(party)}`, {
            cache: "no-store",
          }),
        ]);
        const data = await mRes.json();
        const bal = await bRes.json();
        if (bal.ok) setCbtc(bal.cbtc ?? bal.balances?.CBTC ?? "0");
        if (!data.ok) {
          setError(data.error || data.hint || "Failed to load");
          setMilestones([]);
          return;
        }
        const list = asCantonList(data.milestones || []);
        setMilestones(list);
        if (selected) {
          const updated = list.find((m) => m.milestoneId === selected.milestoneId);
          setSelected(updated || null);
        }
      } catch (e) {
        setError(String(e));
      }
    });
  }, [party, role, selected]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  async function act(body: Record<string, unknown>) {
    setMsg(null);
    setError(null);
    const res = await fetch("/api/canton/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) {
      setError(data.receipt?.error || data.error || "action failed");
    } else {
      const delta = data.receipt?.raw
        ? ` · bal ${data.receipt.raw.balanceBefore ?? ""}→${data.receipt.raw.balanceAfter ?? data.receipt.raw.after ?? ""}`
        : "";
      setMsg(
        `${body.action} ok${data.receipt?.reference ? ` · ${data.receipt.reference}` : ""}${delta}`,
      );
    }
    refresh();
  }

  async function ingestFromGms() {
    setMsg(null);
    setError(null);
    const res = await fetch("/api/canton/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        externalRef,
        projectId: `proj-${externalRef}`,
        autoVerdict: true,
        autoQuorum: true,
        evidence: {
          documentHash: `0x${"ab".repeat(32)}`,
          deliveryConfirmed: true,
          invoiceSettled: true,
          checklistItemsPassed: 3,
          checklistItemsRequired: 3,
          notes,
        },
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      setError(data.error || "ingest failed");
      return;
    }
    setMsg(
      `Ingested ${data.externalRef} → ${data.milestoneId} · checklist ${
        data.checklist?.verdict?.verified ? "passed" : "failed"
      } · receipt ready for GMS writeback`,
    );
    if (data.verificationReceipt) {
      downloadJson(
        `weft-receipt-${data.milestoneId}.json`,
        data.verificationReceipt,
      );
    }
    refresh();
  }

  async function downloadReceipt(mid: string) {
    setError(null);
    const res = await fetch(`/api/canton/receipt/${encodeURIComponent(mid)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (!data.ok) {
      setError(data.error || "receipt unavailable");
      return;
    }
    downloadJson(`weft-receipt-${mid}.json`, data.verificationReceipt);
    setMsg(`Receipt downloaded for ${mid}`);
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>
          Program operations · beside your grant management system · Canton Devnet
        </p>
        <h1 className={styles.brand}>Weft</h1>
        <p className={styles.lede}>
          When a grantee claims a milestone in your grant management system
          (Fluxx, Foundant, AmpliFund, or Salesforce), Weft checks a fixed
          checklist and returns a verification receipt you can paste back
          onto that grant record. No manual review, no subjective judgment.
        </p>
        <p className={styles.balance}>
          {party} pilot balance: <strong>{cbtc}</strong> CBTC
        </p>
      </header>

      <section className={styles.ingest} aria-label="GMS ingest">
        <h2 className={styles.ingestTitle}>Simulate GMS webhook</h2>
        <p className={styles.ingestLede}>
          Mimics <code>POST /canton/ingest</code> from your grant system of
          record — external grant id + checklist → auto verdict + receipt JSON.
        </p>
        <div className={styles.ingestRow}>
          <label className={styles.field}>
            <span>GMS external ref</span>
            <input
              value={externalRef}
              onChange={(e) => setExternalRef(e.target.value)}
              placeholder="fluxx-grant-123"
            />
          </label>
          <label className={styles.field}>
            <span>Notes</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={ingestFromGms}
            disabled={pending || !externalRef.trim()}
          >
            Ingest + download receipt
          </button>
        </div>
      </section>

      <section className={styles.roles} aria-label="Select role">
        {ROLES.map((r) => (
          <button
            key={r.id}
            type="button"
            className={role === r.id ? styles.roleActive : styles.role}
            onClick={() => setRole(r.id)}
          >
            <span className={styles.roleLabel}>{r.label}</span>
            <span className={styles.roleBlurb}>{r.blurb}</span>
            <span className={styles.roleParty}>{ROLE_PARTIES[r.id]}</span>
          </button>
        ))}
      </section>

      <div className={styles.toolbar}>
        <button type="button" className={styles.btn} onClick={refresh} disabled={pending}>
          Refresh
        </button>
        <button
          type="button"
          className={styles.btn}
          onClick={() => act({ action: "faucet", party, amount: "0.05" })}
        >
          Faucet 0.05 CBTC
        </button>
        {role === "issuer" && (
          <button
            type="button"
            className={styles.btn}
            onClick={() =>
              act({
                action: "create",
                projectId: "proj-post-award-1",
                templateId: "canton.institutional_checklist.v1",
                metadataHash: "0xmeta",
                issuer: ROLE_PARTIES.issuer,
                builder: ROLE_PARTIES.issuer,
              })
            }
          >
            Create empty milestone
          </button>
        )}
      </div>

      {(error || msg) && (
        <p className={error ? styles.error : styles.ok} role="status">
          {error || msg}
        </p>
      )}

      <div className={styles.grid}>
        <ul className={styles.list}>
          {milestones.length === 0 && (
            <li className={styles.empty}>
              No milestones yet — run a GMS ingest above or create one.
            </li>
          )}
          {milestones.map((m) => (
            <li key={m.milestoneId}>
              <button
                type="button"
                className={
                  selected?.milestoneId === m.milestoneId ? styles.itemActive : styles.item
                }
                onClick={() => setSelected(m)}
              >
                <strong>{m.externalRef || m.milestoneId}</strong>
                <span>{m.status}</span>
                <span>{m.totalStaked} staked</span>
              </button>
            </li>
          ))}
        </ul>

        <div className={styles.detail}>
          {!selected && <p className={styles.empty}>Select a milestone.</p>}
          {selected && (
            <>
              <h2>{selected.externalRef || selected.milestoneId}</h2>
              <dl className={styles.dl}>
                <div>
                  <dt>GMS ref</dt>
                  <dd className={styles.mono}>{selected.externalRef || "—"}</dd>
                </div>
                <div>
                  <dt>Weft id</dt>
                  <dd className={styles.mono}>{selected.milestoneId}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{selected.status}</dd>
                </div>
                <div>
                  <dt>Asset</dt>
                  <dd>
                    {selected.settlement?.symbol || "CBTC"} · {selected.totalStaked}{" "}
                    staked
                  </dd>
                </div>
                <div>
                  <dt>Votes</dt>
                  <dd>
                    {selected.verifiedVotes}/{selected.quorum} quorum ·{" "}
                    {selected.verifierCount} cast
                  </dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd className={styles.mono}>{selected.finalEvidenceRoot || "—"}</dd>
                </div>
                <div>
                  <dt>Settlement</dt>
                  <dd className={styles.mono}>{selected.lastTransferRef || "—"}</dd>
                </div>
              </dl>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => downloadReceipt(selected.milestoneId)}
                >
                  Download GMS receipt
                </button>
                {role === "funder" && !selected.finalized && (
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() =>
                      act({
                        action: "stake",
                        milestoneId: selected.milestoneId,
                        funder: ROLE_PARTIES.funder,
                        amount: "0.01",
                      })
                    }
                  >
                    Stake 0.01 CBTC
                  </button>
                )}
                {role === "verifier" && !selected.finalized && (
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() =>
                      act({
                        action: "verdict",
                        milestoneId: selected.milestoneId,
                        verifier: ROLE_PARTIES.verifier,
                        useChecklist: true,
                        evidence: {
                          documentHash: `0x${"ab".repeat(32)}`,
                          deliveryConfirmed: true,
                          invoiceSettled: true,
                          checklistItemsPassed: 3,
                          checklistItemsRequired: 3,
                        },
                      })
                    }
                  >
                    Submit checklist verdict
                  </button>
                )}
                {role === "issuer" &&
                  selected.finalized &&
                  selected.verified &&
                  !selected.released && (
                    <button
                      type="button"
                      className={styles.btn}
                      onClick={() =>
                        act({ action: "release", milestoneId: selected.milestoneId })
                      }
                    >
                      Release
                    </button>
                  )}
                {role === "issuer" &&
                  selected.finalized &&
                  !selected.verified &&
                  !selected.released && (
                    <button
                      type="button"
                      className={styles.btn}
                      onClick={() =>
                        act({ action: "refund", milestoneId: selected.milestoneId })
                      }
                    >
                      Refund
                    </button>
                  )}
              </div>
            </>
          )}
        </div>

        <AgentHelper
          context="canton program ops"
          faqs={[
            { q: "What does this page do?", a: "It simulates a webhook from your grant management system. When a grantee claims a milestone, Weft checks a fixed checklist (document hash, delivery confirmed, invoice settled) and returns a verification receipt for GMS writeback." },
            { q: "What are the roles?", a: "Program officer (ingest from GMS, release/refund), Funder (stake when capital is escrowed), Agent (checklist verdict or auto via ingest), Auditor (download verification receipts)." },
            { q: "Is this real money?", a: "No. This runs on Canton Devnet with private CBTC. It's pilot infrastructure for institutional grant workflows." },
            { q: "How do I integrate with my GMS?", a: "POST to /canton/ingest with the external grant ID and checklist evidence. The API returns a verification receipt JSON you write back to your GMS." },
          ]}
        />
      </div>
    </div>
  );
}
