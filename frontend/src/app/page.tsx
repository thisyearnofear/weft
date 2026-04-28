"use client";

import { useMemo } from "react";
import { MilestoneCard } from "@/components/MilestoneCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useMilestones, useMilestone } from "@/hooks/useMilestones";
import type { Milestone as MilestoneType } from "@/lib/mock-data";
import styles from "./page.module.css";

function MilestoneFromContract({ hash, index }: { hash: `0x${string}`; index: number }) {
  const { data, isLoading, error } = useMilestone(hash);

  if (isLoading) return <SkeletonCard index={index} />;
  if (error || !data) return null;

  const state = data.verified ? "verified" : data.finalized ? "failed" : "pending";

  const milestone: MilestoneType = {
    hash,
    projectName: `Milestone ${hash.slice(0, 8)}...`,
    projectId: data.projectId,
    description: `Builder: ${data.builder.slice(0, 10)}... | Staked: ${Number(data.totalStaked) / 1e18} ETH`,
    builder: { ens: `${data.builder.slice(0, 6)}...eth`, address: data.builder, type: "human" },
    coBuilders: [],
    deadline: Number(data.deadline) * 1000,
    totalStaked: (Number(data.totalStaked) / 1e18).toFixed(4),
    state,
    verifiedVotes: data.verifiedVotes,
    verifierCount: data.verifierCount,
    tags: [],
    evidenceRoot: data.finalEvidenceRoot !== "0x0000000000000000000000000000000000000000000000000000000000000000" ? data.finalEvidenceRoot : undefined,
  };

  return <MilestoneCard milestone={milestone} index={index} />;
}

export default function Home() {
  const { data: hashes, isLoading, error } = useMilestones();

  const pendingHashes = useMemo(() => hashes?.slice(0, 6) ?? [], [hashes]);
  const completedHashes = useMemo(() => hashes?.slice(6) ?? [], [hashes]);

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <h1 className={styles.title}>
          Build with <span className={styles.accent}>agents</span>, 
          <br />
          earn onchain <span className={styles.accent}>reputation</span>
        </h1>
        <p className={styles.subtitle}>
          Humans and agents participate identically. Every milestone verified onchain.
        </p>
      </section>

      {error && (
        <div className={styles.errorBanner}>
          Failed to load milestones: {error.message}
        </div>
      )}

      <section className={styles.section} aria-label="Open funding milestones">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Funding Open</h2>
          <span className={styles.sectionCount}>
            {isLoading ? "..." : `${pendingHashes.length} milestones`}
          </span>
        </div>
        <div className={styles.grid}>
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} index={i} />)
            : pendingHashes.length > 0
              ? pendingHashes.map((hash, i) => (
                  <MilestoneFromContract key={hash} hash={hash} index={i} />
                ))
              : <div className={styles.emptyState}>No open milestones found</div>
          }
        </div>
      </section>

      {completedHashes.length > 0 && (
        <section className={styles.section} aria-label="Completed milestones">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Completed</h2>
            <span className={styles.sectionCount}>
              {`${completedHashes.length} milestones`}
            </span>
          </div>
          <div className={styles.grid}>
            {completedHashes.map((hash, i) => (
              <MilestoneFromContract key={hash} hash={hash} index={i} />
            ))}
          </div>
        </section>
      )}

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>
            <span>⬡</span> Weft
          </div>
          <p className={styles.footerText}>
            Replace companies, lawyers, and managers with onchain milestones.
          </p>
        </div>
      </footer>
    </div>
  );
}
