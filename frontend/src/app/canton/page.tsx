"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { CantonMilestone, CantonRole } from "@/lib/canton-types";
import { ROLE_PARTIES } from "@/lib/canton-types";
import { parseMilestoneView } from "@/lib/milestone-view";
import styles from "./page.module.css";

const ROLES: { id: CantonRole; label: string; blurb: string }[] = [
  { id: "issuer", label: "Issuer", blurb: "Create milestones and release capital" },
  { id: "funder", label: "Funder", blurb: "Stake against private deliverables" },
  { id: "verifier", label: "Verifier", blurb: "Submit agent-backed verdicts" },
  { id: "observer", label: "Observer", blurb: "Audit status without stake control" },
];

function asCantonList(raw: unknown[]): CantonMilestone[] {
  const out: CantonMilestone[] = [];
  for (const item of raw) {
    const m = parseMilestoneView(item, "canton");
    if (m && m.rail === "canton") out.push(m as CantonMilestone);
  }
  return out;
}

export default function CantonPage() {
  const [role, setRole] = useState<CantonRole>("issuer");
  const [milestones, setMilestones] = useState<CantonMilestone[]>([]);
  const [selected, setSelected] = useState<CantonMilestone | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [cbtc, setCbtc] = useState<string>("—");
  const [pending, startTransition] = useTransition();

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

  return (
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Primary market · Canton Devnet · CBTC · pilot</p>
        <h1 className={styles.brand}>Weft</h1>
        <p className={styles.lede}>
          Private milestone capital for issuers and funders — need-to-know
          visibility, institutional checklist verification, CBTC settlement.
          Agents verify document hash + delivery + invoice + checklist items;
          at quorum, capital releases or refunds. Sign via{" "}
          <a href="https://devnet.consolewallet.io" target="_blank" rel="noreferrer">
            Console Wallet
          </a>
          .
        </p>
        <p className={styles.balance}>
          {party} CBTC balance: <strong>{cbtc}</strong>
        </p>
      </header>

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
            className={styles.btnPrimary}
            onClick={() =>
              act({
                action: "create",
                projectId: "proj-institutional-1",
                templateId: "canton.institutional_checklist.v1",
                metadataHash: "0xmeta",
                issuer: ROLE_PARTIES.issuer,
                builder: ROLE_PARTIES.issuer,
              })
            }
          >
            Create CBTC milestone
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
            <li className={styles.empty}>No visible milestones for this party.</li>
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
                <strong>{m.milestoneId}</strong>
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
              <h2>{selected.milestoneId}</h2>
              <dl className={styles.dl}>
                <div>
                  <dt>Status</dt>
                  <dd>{selected.status}</dd>
                </div>
                <div>
                  <dt>Asset</dt>
                  <dd>
                    {selected.settlement?.symbol || "CBTC"} ·{" "}
                    {selected.totalStaked} staked
                  </dd>
                </div>
                <div>
                  <dt>Transfer</dt>
                  <dd className={styles.mono}>{selected.lastTransferRef || "—"}</dd>
                </div>
                <div>
                  <dt>Votes</dt>
                  <dd>
                    {selected.verifiedVotes}/{selected.quorum} quorum · {selected.verifierCount}{" "}
                    cast
                  </dd>
                </div>
                <div>
                  <dt>Verified</dt>
                  <dd>{selected.verified ? "yes" : "no"}</dd>
                </div>
                <div>
                  <dt>Released</dt>
                  <dd>{selected.released ? "yes" : "no"}</dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd className={styles.mono}>{selected.finalEvidenceRoot || "—"}</dd>
                </div>
                <div>
                  <dt>Parties</dt>
                  <dd className={styles.mono}>
                    issuer {selected.parties.issuer} · verifiers{" "}
                    {selected.parties.verifiers.join(", ")}
                  </dd>
                </div>
              </dl>

              <div className={styles.actions}>
                {role === "funder" && !selected.finalized && (
                  <button
                    type="button"
                    className={styles.btnPrimary}
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
                    className={styles.btnPrimary}
                    onClick={() =>
                      act({
                        action: "verdict",
                        milestoneId: selected.milestoneId,
                        verifier: ROLE_PARTIES.verifier,
                        useChecklist: true,
                        evidence: {
                          documentHash: "0x" + "cd".repeat(32),
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
                {role === "issuer" && selected.finalized && selected.verified && !selected.released && (
                  <button
                    type="button"
                    className={styles.btnPrimary}
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
      </div>
    </div>
  );
}
