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
  const stakedEth = (Number(data.totalStaked) / 1e18).toFixed(4);
  const builderShort = `${data.builder.slice(0, 6)}...${data.builder.slice(-4)}`;

  const milestone: MilestoneType = {
    hash,
    projectName: `Milestone ${hash.slice(0, 8)}...`,
    projectId: data.projectId,
    description: data.verified
      ? `Verified onchain. ${stakedEth} ETH released to ${builderShort}.`
      : data.finalized
      ? `Verification failed. ${stakedEth} ETH available for refund.`
      : `${stakedEth} ETH staked. Awaiting verifier votes.`,
    builder: { ens: builderShort, address: data.builder, type: "human" },
    coBuilders: [],
    deadline: Number(data.deadline) * 1000,
    totalStaked: stakedEth,
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

  const verifiedHashes = useMemo(
    () => hashes?.filter(() => true) ?? [], // actual filtering happens in MilestoneFromContract
    [hashes]
  );

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <h1 className={styles.title}>
          Onchain <span className={styles.accent}>verification receipts</span>
        </h1>
        <p className={styles.subtitle}>
          Every milestone verified by autonomous agents. Every verification is a shareable, permanent receipt.
        </p>
      </section>

      {error && (
        <div className={styles.errorBanner}>
          Failed to load milestones: {error.message}
        </div>
      )}

      <section className={styles.section} aria-label="Verified milestones">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Verified Milestones</h2>
          <span className={styles.sectionCount}>
            {isLoading ? "..." : `${verifiedHashes.length} milestones`}
          </span>
        </div>
        <div className={styles.grid}>
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} index={i} />)
            : verifiedHashes.length > 0
              ? verifiedHashes.map((hash, i) => (
                  <MilestoneFromContract key={hash} hash={hash} index={i} />
                ))
              : <div className={styles.emptyState}>No milestones found</div>
          }
        </div>
      </section>

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
