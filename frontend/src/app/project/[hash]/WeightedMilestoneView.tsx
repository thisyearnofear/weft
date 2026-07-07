"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, Bot, Lock, LockOpen, ShieldCheck, Zap } from "lucide-react";
import { WeightedConfidentialMilestone, useDecryptWeightedResult } from "../../../hooks/useWeightedConfidentialMilestone";
import { SealedReveal } from "../../../components/SealedReveal";
import { VerificationReceipt } from "../../../components/VerificationReceipt";
import { getWeightedConfidentialAddress } from "../../../lib/contracts";
import { resolveMilestoneMeta, shortHash } from "../../../lib/milestone-meta";
import styles from "./page.module.css";

const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io";
const ZERO_ROOT = "0x0000000000000000000000000000000000000000000000000000000000000000";
const MAX_VERIFIERS = 3;
const QUORUM = 2;
const WEIGHTED_THRESHOLD = 100;

function WeightedStatusBadge({ m }: { m: WeightedConfidentialMilestone }) {
  if (m.resultConfirmed && m.resultVerified)
    return <span className={`${styles.statusBadge} ${styles.statusVerified}`}>Verified</span>;
  if (m.resultConfirmed && !m.resultVerified)
    return <span className={`${styles.statusBadge} ${styles.statusRejected}`}>Rejected</span>;
  if (m.finalized)
    return <span className={`${styles.statusBadge} ${styles.statusActive}`}>Sealed — awaiting decryption</span>;
  return <span className={`${styles.statusBadge} ${styles.statusActive}`}>Weighted ballot in progress</span>;
}

function WeightedDecryptPanel({ m }: { m: WeightedConfidentialMilestone }) {
  const { data: decrypted, mutate: decrypt, isPending, error } = useDecryptWeightedResult(m.verifiedHandle);

  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.kicker}>Sealed weighted result</span>
          <h3>Decrypt the outcome yourself</h3>
        </div>
        {decrypted === undefined ? <Lock size={18} /> : <LockOpen size={18} />}
      </div>
      <p className={styles.panelText}>
        {m.finalized
          ? "All weighted ballots are in. The contract computed weightedVote = FHE.mul(ballot, confidence) on ciphertext, tallied it, and checked both binary quorum AND weighted quorum — all without decrypting a single vote or confidence score. Decrypt the final result now."
          : `The result is encrypted onchain. The contract will compute FHE.mul(ballot, confidence) for each verifier, accumulate the weighted tally, and check both quorum gates — all on ciphertext. No vote or confidence score is ever decrypted.`}
      </p>
      <SealedReveal revealed={decrypted === true} />
      <div className={styles.actionStack}>
        <button
          onClick={() => decrypt()}
          disabled={isPending}
          className={styles.actionBtn}
        >
          {isPending ? "Asking relayer..." : <><Lock size={16} /> Decrypt sealed result</>}
        </button>
        {decrypted !== undefined && (
          <div className={styles.codeBlock}>
            <span className={styles.codeLabel}>Publicly decrypted via Zama relayer</span>
            <p className={`${styles.decryptVerdict} ${decrypted ? styles.decryptVerdictOk : styles.decryptVerdictFail}`}>
              {decrypted
                ? `VERIFIED — encrypted binary quorum (≥${QUORUM} of ${MAX_VERIFIERS}) AND weighted quorum (≥${WEIGHTED_THRESHOLD}) both reached`
                : "NOT VERIFIED — one or both encrypted quorum gates failed"}
            </p>
          </div>
        )}
        {error != null && (
          <div className={styles.actionNote}>
            {m.finalized
              ? `Decryption failed: ${error instanceof Error ? error.message : "relayer error"}`
              : "Refused, as expected — the ciphertext is not publicly decryptable until every ballot is in."}
          </div>
        )}
      </div>
    </article>
  );
}

export function WeightedMilestoneView({ hash, milestone: m }: { hash: string; milestone: WeightedConfidentialMilestone }) {
  const contractAddress = getWeightedConfidentialAddress();
  const meta = resolveMilestoneMeta(hash);
  const stakedEth = (Number(m.totalStaked) / 1e18).toFixed(4);
  const evidenceRoot = m.finalEvidenceRoot !== ZERO_ROOT ? m.finalEvidenceRoot : null;
  const isActive = !m.finalized;
  const [now] = React.useState(() => Date.now());
  const deadlinePassed = Number(m.deadline) * 1000 < now;

  return (
    <div className={styles.container}>
      <div className={styles.shell}>
        <section className={styles.heroCard}>
          <div className={styles.heroTop}>
            <Link href="/" className={styles.backLink}>← Back to system view</Link>
            <WeightedStatusBadge m={m} />
          </div>

          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <div className={styles.agentStatus}>
                <span className={styles.agentAvatar}><Bot size={16} /></span>
                <span className={styles.agentStatusText}>
                  {m.resultConfirmed && m.resultVerified
                    ? "Verified by confidence-weighted sealed ballot — FHE.mul consensus confirmed. I'm done here."
                    : m.resultConfirmed && !m.resultVerified
                      ? "Weighted consensus complete — one or both quorum gates not met."
                      : m.finalized
                        ? "All weighted ballots cast. The result is decryptable now."
                        : deadlinePassed
                          ? "Deadline passed. Collecting confidence-weighted sealed ballots from verifier nodes."
                          : "Watching for evidence. I'll collect weighted sealed ballots when the deadline passes."}
                </span>
              </div>
              <span className={styles.kicker}>
                <Zap size={12} style={{ display: "inline", verticalAlign: "-2px", marginRight: "4px" }} />
                Confidence-weighted confidential milestone · Zama FHE · Sepolia
              </span>
              <h1 className={styles.title}>{meta.name}</h1>
              <p className={styles.identityValue}>{shortHash(hash, 10, 8)}</p>
              <p className={styles.subtitle}>
                Each verifier encrypts both a ballot (0 or 1) AND a confidence score (1–100).
                The contract multiplies them on ciphertext —{" "}
                <code style={{ fontSize: "0.85em", background: "var(--c-surface-3)", padding: "1px 4px", borderRadius: "3px" }}>
                  weightedVote = FHE.mul(ballot, confidence)
                </code>{" "}
                — accumulates the weighted tally, and checks both binary quorum (≥2 of 3) AND
                weighted quorum (≥100). No vote, no confidence score, and no weighted tally is
                ever decrypted. This is FHE multiplication, not just addition.
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
                <span className={styles.executionLabel}>FHE computation</span>
                <span className={styles.executionChain}>Sepolia · Zama FHEVM</span>
              </div>
              <div className={styles.executionRows}>
                <div className={styles.executionRow}>
                  <span className={styles.executionKey}>Verifiers</span>
                  <span className={styles.executionVal}>{m.verifierCount} / {MAX_VERIFIERS}</span>
                </div>
                <div className={styles.executionRow}>
                  <span className={styles.executionKey}>Binary quorum</span>
                  <span className={styles.executionVal}>≥ {QUORUM} of {MAX_VERIFIERS}</span>
                </div>
                <div className={styles.executionRow}>
                  <span className={styles.executionKey}>Weighted threshold</span>
                  <span className={styles.executionVal}>≥ {WEIGHTED_THRESHOLD}</span>
                </div>
                <div className={styles.executionRow}>
                  <span className={styles.executionKey}>FHE operations</span>
                  <span className={styles.executionVal}>
                    <code style={{ fontSize: "0.8em" }}>mul · add · ge · and · select</code>
                  </span>
                </div>
                <div className={styles.executionRow}>
                  <span className={styles.executionKey}>Staked</span>
                  <span className={styles.executionVal}>{stakedEth} ETH</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FHE computation breakdown — the key differentiator */}
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.kicker}>FHE multiplication</span>
              <h3>What the contract computes on ciphertext</h3>
            </div>
            <ShieldCheck size={18} />
          </div>
          <p className={styles.panelText}>
            The v1 contract used FHE.add, FHE.ge, and FHE.select — addition-class FHE.
            This contract adds <strong>FHE.mul</strong>: each verifier's ballot is multiplied
            by their confidence score, both encrypted, producing an encrypted weighted vote.
            The weighted tally accumulates these products. The final result requires both
            binary quorum AND weighted quorum, combined with FHE.and — all on ciphertext.
          </p>
          <div className={styles.codeBlock}>
            <span className={styles.codeLabel}>Solidity (WeftMilestoneConfidentialWeighted.sol)</span>
            <pre style={{ margin: "0.5rem 0", fontSize: "0.82rem", lineHeight: 1.6, overflowX: "auto" }}>
{`// Each verifier submits encrypted ballot + encrypted confidence
euint8 ballot = FHE.select(FHE.eq(didComplete, 1), 1, 0);
euint32 confidence = FHE.fromExternal(encConfidence, proof);

// FHE MULTIPLICATION — the key upgrade
euint32 weightedVote = FHE.mul(FHE.asEuint32(ballot), confidence);

// Accumulate weighted tally (also encrypted)
weightedTally = FHE.add(weightedTally, weightedVote);

// Both quorum gates, combined on ciphertext
ebool binaryQuorum = FHE.ge(verifiedVotes, quorum);
ebool weightedQuorum = FHE.ge(weightedTally, threshold);
verified = FHE.select(FHE.and(binaryQuorum, weightedQuorum), true, verified);`}
            </pre>
          </div>
        </article>

        {!isActive && <WeightedDecryptPanel m={m} />}

        {m.resultConfirmed && contractAddress && (
          <VerificationReceipt
            receipt={{
              milestoneHash: hash,
              projectId: m.projectId,
              status: m.resultVerified ? "verified" : "rejected",
              released: m.released,
              builder: {
                name: `${m.builder.slice(0, 6)}...${m.builder.slice(-4)}`,
                address: m.builder,
              },
              stakedEth,
              quorum: { votes: QUORUM, verifiers: MAX_VERIFIERS },
              sealed: true,
              evidenceRoot,
              contractAddress,
              chain: "Sepolia (Zama FHEVM · weighted)",
              createdAt: Number(m.createdAt),
              deadline: Number(m.deadline),
              explorerUrl: `${SEPOLIA_EXPLORER}/address/${contractAddress}`,
            }}
          />
        )}

        <div className={styles.footer}>
          <Link href="/" className={styles.backLink}>← Back to system view</Link>
        </div>
      </div>
    </div>
  );
}
