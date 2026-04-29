"use client";

import React from "react";
import Link from "next/link";
import { useMilestone } from "../../../hooks/useMilestones";
import { useBuilderPassport } from "../../../hooks/useBuilderPassport";
import { StakeForm } from "../../../components/StakeForm";
import { DEFAULT_CHAIN, getAddresses } from "../../../lib/contracts";
import styles from "./page.module.css";

const EXPLORER_ADDR = "https://chainscan-new.0g.ai/address";

function ProjectSkeleton() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.skeletonLine} style={{ width: 80, height: 24, borderRadius: "var(--radius-xl)" }} />
          <div className={styles.skeletonLine} style={{ width: 120, height: 16 }} />
        </div>
        <div className={styles.builder}>
          <div className={styles.skeletonLine} style={{ width: 60, height: 12 }} />
          <div className={styles.skeletonLine} style={{ width: 140, height: 16, marginTop: 8 }} />
        </div>
        <div className={styles.details}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.detail}>
              <div className={styles.skeletonLine} style={{ width: 70, height: 12 }} />
              <div className={styles.skeletonLine} style={{ width: 90, height: 16, marginTop: 4 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VerifiedBanner() {
  return (
    <div className={styles.verifiedBanner}>
      <span className={styles.checkmark}>&#10003;</span>
      <span>Verified onchain</span>
    </div>
  );
}

function StatusBadge({ milestone }: { milestone: { finalized: boolean; verified: boolean } }) {
  const isVerified = milestone.verified;
  const isRejected = milestone.verified === false && milestone.finalized;
  const isActive = !milestone.finalized;

  if (isVerified) return <span className={styles.verified}>Verified</span>;
  if (isRejected) return <span className={styles.rejected}>Rejected</span>;
  if (isActive) return <span className={styles.active}>Active</span>;
  return <span className={styles.pending}>Pending</span>;
}

function ShareButtons({ url, title }: { url: string; title: string }) {
  const tweetText = encodeURIComponent(`Verified on Weft: "${title}"\n\n${url}`);
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

  return (
    <div className={styles.shareRow}>
      <button
        className={styles.shareBtn}
        onClick={() => navigator.clipboard.writeText(url)}
        aria-label="Copy link"
      >
        Copy Link
      </button>
      <a href={tweetUrl} target="_blank" rel="noopener noreferrer" className={styles.shareBtn}>
        Share on X
      </a>
    </div>
  );
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const milestoneHash = (id.startsWith("0x") ? id : `0x${id}`) as `0x${string}`;
  const { data: milestone, isLoading, error } = useMilestone(milestoneHash);
  const addresses = getAddresses(DEFAULT_CHAIN);

  const { data: builderPassport } = useBuilderPassport(
    milestone?.builder ? `0x${BigInt(milestone.builder).toString(16)}.eth` : ""
  );

  const builderName = builderPassport?.ens || (milestone?.builder ? `${milestone.builder.slice(0, 6)}...${milestone.builder.slice(-4)}` : "");
  const stakedEth = milestone ? (Number(milestone.totalStaked) / 1e18).toFixed(4) : "0";
  const deadlineDate = milestone ? new Date(Number(milestone.deadline) * 1000) : null;
  const isVerified = milestone?.verified;
  const isActive = milestone && !milestone.finalized;
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  if (isLoading) return <ProjectSkeleton />;

  if (error || !milestone) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Milestone not found: {id}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {isVerified && <VerifiedBanner />}

        <div className={styles.header}>
          <div className={styles.status}>
            <StatusBadge milestone={milestone} />
          </div>
          <div className={styles.metadata}>
            <span className={styles.label}>Milestone</span>
            <span className={styles.value}>{id.slice(0, 10)}...{id.slice(-8)}</span>
          </div>
        </div>

        <div className={styles.builder}>
          <span className={styles.label}>Builder</span>
          <Link href={`/builder/${milestone.builder}`} className={styles.builderLink}>
            {builderName}
          </Link>
          {milestone.builder && (
            <a
              href={`${EXPLORER_ADDR}/${milestone.builder}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.explorerLink}
            >
              View on Explorer
            </a>
          )}
        </div>

        <div className={styles.details}>
          <div className={styles.detail}>
            <span className={styles.label}>Total Staked</span>
            <span className={styles.value}>{stakedEth} ETH</span>
          </div>
          <div className={styles.detail}>
            <span className={styles.label}>Deadline</span>
            <span className={styles.value}>
              {deadlineDate ? deadlineDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
            </span>
          </div>
          <div className={styles.detail}>
            <span className={styles.label}>Verifiers</span>
            <span className={styles.value}>
              {milestone.verifiedVotes}/{milestone.verifierCount}
            </span>
          </div>
        </div>

        {milestone.finalEvidenceRoot && milestone.finalEvidenceRoot !== "0x0000000000000000000000000000000000000000000000000000000000000000" && (
          <div className={styles.evidence}>
            <span className={styles.label}>Evidence</span>
            <code className={styles.code}>{milestone.finalEvidenceRoot}</code>
          </div>
        )}

        {isVerified && (
          <div className={styles.summary}>
            <span className={styles.label}>What was verified</span>
            <ul className={styles.summaryList}>
              <li>Contract deployment confirmed onchain</li>
              <li>Unique caller threshold met during measurement window</li>
              <li>{milestone.verifiedVotes}/{milestone.verifierCount} authorized verifiers agreed on the outcome</li>
              <li>Evidence published and attestation root recorded onchain</li>
            </ul>
          </div>
        )}

        {isVerified && (
          <div className={styles.actions}>
            <ShareButtons url={shareUrl} title={`Milestone ${id.slice(0, 10)}`} />
          </div>
        )}

        {isActive && addresses.weftMilestone && (
          <div className={styles.stake}>
            <h3 className={styles.sectionTitle}>Stake this milestone</h3>
            <StakeForm
              milestoneHash={milestoneHash}
              contractAddress={addresses.weftMilestone}
            />
          </div>
        )}

        <div className={styles.footer}>
          <span className={styles.footerText}>
            Verified by Weft on 0G Chain
          </span>
        </div>
      </div>
    </div>
  );
}
