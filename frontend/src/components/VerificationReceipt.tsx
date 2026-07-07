"use client";

/// A portable proof artifact for a finalized milestone — the thing a grant
/// program hands to its community or auditors when someone asks "why did
/// this get paid?". Renders the onchain facts and exports them as JSON.

import React from "react";
import { FileCheck2, Copy, Download, Check } from "lucide-react";
import styles from "./VerificationReceipt.module.css";

export interface ReceiptData {
  milestoneHash: string;
  projectId?: string;
  status: "verified" | "rejected";
  released: boolean;
  builder: { name: string; address: string };
  stakedEth: string;
  quorum: { votes: number; verifiers: number };
  /** Sealed-ballot (FHE) milestone: individual votes are encrypted forever,
   *  so the receipt reports whether the encrypted quorum was reached rather
   *  than a vote count. */
  sealed?: boolean;
  evidenceRoot: string | null;
  contractAddress: string;
  chain: string;
  createdAt?: number; // unix seconds
  deadline?: number; // unix seconds
  explorerUrl?: string;
}

function fmtDate(ts?: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

export function VerificationReceipt({ receipt }: { receipt: ReceiptData }) {
  const [copied, setCopied] = React.useState(false);

  const receiptJson = React.useMemo(
    () =>
      JSON.stringify(
        {
          schema: "weft.verification-receipt.v1",
          milestoneHash: receipt.milestoneHash,
          projectId: receipt.projectId,
          status: receipt.status,
          capitalReleased: receipt.released,
          builder: receipt.builder,
          stakedEth: receipt.stakedEth,
          verifierQuorum: receipt.sealed
            ? `sealed ballots — encrypted quorum (≥${receipt.quorum.votes} of ${receipt.quorum.verifiers}) ${receipt.status === "verified" ? "reached" : "not reached"}`
            : `${receipt.quorum.votes}/${receipt.quorum.verifiers}`,
          evidenceRoot: receipt.evidenceRoot,
          contract: { address: receipt.contractAddress, chain: receipt.chain },
          createdAt: receipt.createdAt ? new Date(receipt.createdAt * 1000).toISOString() : undefined,
          deadline: receipt.deadline ? new Date(receipt.deadline * 1000).toISOString() : undefined,
          permalink: typeof window !== "undefined" ? window.location.href.split("?")[0] : undefined,
        },
        null,
        2
      ),
    [receipt]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(receiptJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — the visible rows still carry the data */
    }
  };

  const handleDownload = () => {
    const blob = new Blob([receiptJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weft-receipt-${receipt.milestoneHash.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <article className={styles.receipt}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <FileCheck2 size={16} className={styles.headerIcon} />
          <span className={styles.kicker}>Verification receipt</span>
        </div>
        <span className={`${styles.statusChip} ${receipt.status === "verified" ? styles.statusVerified : styles.statusRejected}`}>
          {receipt.status === "verified" ? "Verified" : "Rejected"}
        </span>
      </div>
      <p className={styles.lede}>
        Every fact below is anchored onchain — share this receipt and anyone
        can check it without trusting Weft or the sponsor.
      </p>
      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt>Milestone</dt>
          <dd className={styles.mono}>{receipt.milestoneHash.slice(0, 12)}…{receipt.milestoneHash.slice(-8)}</dd>
        </div>
        <div className={styles.row}>
          <dt>Builder</dt>
          <dd>{receipt.builder.name}</dd>
        </div>
        <div className={styles.row}>
          <dt>Verifier quorum</dt>
          <dd>
            {receipt.sealed
              ? `Encrypted quorum (≥${receipt.quorum.votes} of ${receipt.quorum.verifiers}) ${receipt.status === "verified" ? "reached" : "not reached"} — votes sealed`
              : `${receipt.quorum.votes} of ${receipt.quorum.verifiers} agreed`}
          </dd>
        </div>
        <div className={styles.row}>
          <dt>Capital</dt>
          <dd>
            {Number(receipt.stakedEth) > 0
              ? `${receipt.stakedEth} ETH ${receipt.released ? "released" : receipt.status === "verified" ? "releasable" : "refundable"}`
              : "Unfunded — reputation-only proof"}
          </dd>
        </div>
        {receipt.evidenceRoot && (
          <div className={styles.row}>
            <dt>Evidence root</dt>
            <dd className={styles.mono}>{receipt.evidenceRoot.slice(0, 12)}…{receipt.evidenceRoot.slice(-8)}</dd>
          </div>
        )}
        <div className={styles.row}>
          <dt>Contract</dt>
          <dd className={styles.mono}>
            {receipt.explorerUrl ? (
              <a href={receipt.explorerUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                {receipt.contractAddress.slice(0, 10)}…{receipt.contractAddress.slice(-6)} ({receipt.chain})
              </a>
            ) : (
              <>{receipt.contractAddress.slice(0, 10)}…{receipt.contractAddress.slice(-6)} ({receipt.chain})</>
            )}
          </dd>
        </div>
        <div className={styles.row}>
          <dt>Window</dt>
          <dd>{fmtDate(receipt.createdAt)} → {fmtDate(receipt.deadline)}</dd>
        </div>
      </dl>
      <div className={styles.actions}>
        <button type="button" className={styles.actionBtn} onClick={handleCopy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy JSON"}
        </button>
        <button type="button" className={styles.actionBtn} onClick={handleDownload}>
          <Download size={14} />
          Download
        </button>
      </div>
    </article>
  );
}
