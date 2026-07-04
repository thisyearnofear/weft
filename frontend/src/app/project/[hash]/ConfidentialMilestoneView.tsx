"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, Coins, Database, Lock, LockOpen, ShieldCheck, Vote } from "lucide-react";
import { sepolia } from "wagmi/chains";
import { ConfidentialMilestone, useDecryptSealedResult } from "../../../hooks/useConfidentialMilestone";
import { StakeForm } from "../../../components/StakeForm";
import { getConfidentialAddress } from "../../../lib/contracts";
import styles from "./page.module.css";

const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io";
const ZERO_ROOT = "0x0000000000000000000000000000000000000000000000000000000000000000";
const MAX_VERIFIERS = 3;
const QUORUM = 2;

function ConfidentialStatusBadge({ m }: { m: ConfidentialMilestone }) {
  if (m.resultConfirmed && m.resultVerified)
    return <span className={`${styles.statusBadge} ${styles.statusVerified}`}>Verified</span>;
  if (m.resultConfirmed && !m.resultVerified)
    return <span className={`${styles.statusBadge} ${styles.statusRejected}`}>Rejected</span>;
  if (m.finalized)
    return <span className={`${styles.statusBadge} ${styles.statusActive}`}>Sealed — awaiting decryption</span>;
  return <span className={`${styles.statusBadge} ${styles.statusActive}`}>Sealed ballot in progress</span>;
}

function DecryptPanel({ m }: { m: ConfidentialMilestone }) {
  const { data: decrypted, mutate: decrypt, isPending, error } = useDecryptSealedResult(m.verifiedHandle);

  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.kicker}>Sealed result</span>
          <h3>Decrypt the outcome yourself</h3>
        </div>
        {decrypted === undefined ? <Lock size={18} /> : <LockOpen size={18} />}
      </div>
      <p className={styles.panelText}>
        {m.finalized
          ? "All ballots are in. The contract made the final result publicly decryptable — ask the Zama relayer to decrypt it. Individual votes stay sealed forever."
          : `The result is encrypted onchain and cannot be decrypted by anyone — not even the contract owner — until all ${MAX_VERIFIERS} ballots are cast. The Zama relayer will refuse this request right now. That's the point.`}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <button
          onClick={() => decrypt()}
          disabled={isPending}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
            padding: "0.85rem 1.15rem", borderRadius: "999px",
            fontWeight: 600, fontSize: "0.9rem", border: "none", cursor: "pointer",
            background: "linear-gradient(135deg, var(--c-accent), #eab308)",
            color: "white", opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? "Asking relayer..." : <><Lock size={16} /> Decrypt sealed result</>}
        </button>
        {decrypted !== undefined && (
          <div className={styles.codeBlock}>
            <span className={styles.codeLabel}>Publicly decrypted via Zama relayer</span>
            <p style={{ color: decrypted ? "var(--c-success, #22c55e)" : "var(--c-error, #ef4444)", fontWeight: 700 }}>
              {decrypted ? `VERIFIED — encrypted quorum (≥${QUORUM} of ${MAX_VERIFIERS}) was reached` : "NOT VERIFIED — encrypted quorum was not reached"}
            </p>
          </div>
        )}
        {error != null && (
          <div style={{ color: "var(--c-text-secondary)", fontSize: "0.82rem" }}>
            {m.finalized
              ? `Decryption failed: ${error instanceof Error ? error.message : "relayer error"}`
              : "Refused, as expected — the ciphertext is not publicly decryptable until every ballot is in."}
          </div>
        )}
      </div>
    </article>
  );
}

export function ConfidentialMilestoneView({ hash, milestone: m }: { hash: string; milestone: ConfidentialMilestone }) {
  const contractAddress = getConfidentialAddress();
  const stakedEth = (Number(m.totalStaked) / 1e18).toFixed(4);
  const evidenceRoot = m.finalEvidenceRoot !== ZERO_ROOT ? m.finalEvidenceRoot : null;
  const isActive = !m.finalized;
  // Snapshot once per mount — render must stay pure for the React Compiler
  const [now] = React.useState(() => Date.now());
  const deadlinePassed = Number(m.deadline) * 1000 < now;

  return (
    <div className={styles.container}>
      <div className={styles.shell}>
        <section className={styles.heroCard}>
          <div className={styles.heroTop}>
            <Link href="/" className={styles.backLink}>← Back to system view</Link>
            <ConfidentialStatusBadge m={m} />
          </div>

          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>Confidential milestone · Zama FHE · Sepolia</span>
              <h1 className={styles.title}>Milestone {hash.slice(0, 10)}...{hash.slice(-8)}</h1>
              <p className={styles.subtitle}>
                Verifiers vote on this milestone by sealed ballot: every vote is encrypted in the
                browser of the agent that casts it, the contract tallies votes homomorphically, and
                quorum is checked on ciphertext. No verifier can see how the others voted — herding
                is cryptographically impossible.
              </p>
              <div className={styles.heroActions}>
                <a
                  href={`${SEPOLIA_EXPLORER}/address/${contractAddress}`}
                  target="_blank" rel="noopener noreferrer"
                  className={styles.primaryAction}
                >
                  <ArrowUpRight size={16} />
                  Contract on Etherscan
                </a>
                <a
                  href={`${SEPOLIA_EXPLORER}/address/${m.builder}`}
                  target="_blank" rel="noopener noreferrer"
                  className={styles.secondaryAction}
                >
                  View builder
                  <ArrowUpRight size={16} />
                </a>
              </div>
            </div>

            <div className={styles.executionCard}>
              <div className={styles.executionHeader}>
                <ShieldCheck size={18} />
                <span>Sealed-ballot consensus</span>
              </div>
              <h2>
                {m.resultConfirmed
                  ? m.resultVerified ? "Encrypted quorum reached" : "Encrypted quorum not reached"
                  : m.finalized ? "Ballots sealed — result decryptable" : "Ballots being collected"}
              </h2>
              <p>
                {m.verifierCount} of {MAX_VERIFIERS} encrypted ballots cast.
                {isActive && !deadlinePassed && " Voting opens when the deadline passes."}
              </p>
              <div className={styles.executionBullets}>
                <div>
                  <Vote size={16} />
                  <span>Each vote arrives as a Zama ciphertext with a zero-knowledge input proof</span>
                </div>
                <div>
                  <Database size={16} />
                  <span>The contract adds votes with FHE.add and checks quorum with FHE.ge — all on ciphertext</span>
                </div>
                <div>
                  <Lock size={16} />
                  <span>Individual ballots are never decrypted, by anyone, ever</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.metricGrid}>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Capital at stake</span>
            <strong className={styles.metricValue}>{stakedEth} ETH</strong>
            <p>Escrowed on Sepolia until the sealed result is confirmed.</p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Sealed ballots</span>
            <strong className={styles.metricValue}>{m.verifierCount}/{MAX_VERIFIERS}</strong>
            <p>Votes cast — how each verifier voted is encrypted onchain.</p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Result</span>
            <strong className={styles.metricValue}>
              {m.resultConfirmed ? (m.resultVerified ? "Verified" : "Rejected") : "🔒 Sealed"}
            </strong>
            <p>{m.resultConfirmed ? "Confirmed onchain after public decryption." : "Encrypted until all ballots are in."}</p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Evidence root</span>
            <strong className={styles.metricValueSmall}>
              {evidenceRoot ? `${evidenceRoot.slice(0, 12)}...${evidenceRoot.slice(-8)}` : "Pending"}
            </strong>
            <p>{evidenceRoot ? "Final proof anchor written onchain." : "Anchored when the last ballot lands."}</p>
          </article>
        </section>

        <section className={styles.mainGrid}>
          <div className={styles.primaryColumn}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.kicker}>Why sealed ballots</span>
                  <h3>Verification without herding</h3>
                </div>
                <Coins size={18} />
              </div>
              <p className={styles.panelText}>
                On the public contract, verifiers can watch each other vote before submitting their
                own verdict — late voters can free-ride on early ones. Here, every ballot is a Zama
                FHE ciphertext. The contract computes <code>votes ≥ quorum</code> homomorphically and
                only the final boolean ever becomes decryptable, and only after all {MAX_VERIFIERS} ballots
                are cast. This is consensus that is impossible to build without FHE.
              </p>
              <div className={styles.codeBlock}>
                <span className={styles.codeLabel}>Onchain tally (never decrypted)</span>
                <code>
                  verifiedVotes = FHE.add(verifiedVotes, encryptedBallot);{"\n"}
                  verified = FHE.select(FHE.ge(verifiedVotes, quorum), true, verified);
                </code>
              </div>
            </article>

            <DecryptPanel m={m} />
          </div>

          <aside className={styles.sideColumn}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.kicker}>Builder</span>
                  <h3>{m.builder.slice(0, 6)}...{m.builder.slice(-4)}</h3>
                </div>
              </div>
              <div className={styles.identityMeta}>
                <span className={styles.identityLabel}>Address</span>
                <span className={styles.identityValue}>{m.builder}</span>
              </div>
              <div className={styles.identityMeta}>
                <span className={styles.identityLabel}>Deadline</span>
                <span className={styles.identityValue}>
                  {new Date(Number(m.deadline) * 1000).toLocaleString()}
                </span>
              </div>
            </article>

            {isActive && contractAddress && (
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.kicker}>Participate</span>
                    <h3>Stake behind this outcome</h3>
                  </div>
                  <Coins size={18} />
                </div>
                <p className={styles.panelText}>
                  Stake Sepolia ETH behind this milestone. Capital releases only if the sealed-ballot
                  consensus verifies the outcome.
                </p>
                <StakeForm
                  milestoneHash={hash as `0x${string}`}
                  contractAddress={contractAddress}
                  chainId={sepolia.id}
                  explorerTxBase={`${SEPOLIA_EXPLORER}/tx`}
                  explorerName="Sepolia Etherscan"
                />
              </article>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
}
