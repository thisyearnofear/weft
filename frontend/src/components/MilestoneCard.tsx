"use client";

import Link from "next/link";
import type { Milestone, MilestoneState } from "../lib/mock-data";
import { formatDeadline } from "../lib/mock-data";
import styles from "./MilestoneCard.module.css";

interface MilestoneCardProps {
  milestone: Milestone;
  index?: number;
  swatchUrl?: string | null;
}

const STATE_CONFIG: Record<MilestoneState, { label: string; color: string }> = {
  pending: { label: "Awaiting Verification", color: "#f59e0b" },
  verified: { label: "Verified", color: "#22c55e" },
  failed: { label: "Failed", color: "#ef4444" },
};

export function MilestoneCard({ milestone, index = 0, swatchUrl }: MilestoneCardProps) {
  const config = STATE_CONFIG[milestone.state];

  return (
    <Link
      href={`/project/${milestone.hash}`}
      className={styles.card}
      style={{ animationDelay: `${index * 0.1}s` }}
      role="article"
      aria-label={`${milestone.projectName} — ${config.label}`}
    >
      <div className={styles.header}>
        <div className={styles.projectName}>{milestone.projectName}</div>
        <div className={styles.state} style={{ backgroundColor: config.color }}>
          {config.label}
        </div>
      </div>

      <p className={styles.description}>{milestone.description}</p>

      <div className={styles.tags}>
        {milestone.tags.map((tag) => (
          <span key={tag} className={styles.tag}>
            {tag}
          </span>
        ))}
      </div>

      <div className={styles.progress}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: milestone.state === "pending" ? "65%" : "100%",
            }}
          />
        </div>
        <div className={styles.progressLabel}>
          <span>{milestone.totalStaked} ETH staked</span>
          <span>{formatDeadline(milestone.deadline)}</span>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.builder}>
          <span className={styles.builderLabel}>Builder</span>
          <span className={styles.builderEns}>{milestone.builder.ens}</span>
        </div>

        {milestone.coBuilders.length > 0 && (
          <div className={styles.cobuilders}>
            {milestone.coBuilders.slice(0, 2).map((cb) => (
              <span key={cb.ens} className={styles.cobuilderBadge} title={cb.ens}>
                {cb.type === "agent" ? "🤖" : "👤"}
              </span>
            ))}
            {milestone.coBuilders.length > 2 && (
              <span className={styles.cobuilderMore}>+{milestone.coBuilders.length - 2}</span>
            )}
          </div>
        )}

        <div className={styles.verifiers}>
          {milestone.verifierCount > 0 && (
            <span className={styles.verifierCount}>
              {milestone.verifiedVotes}/{milestone.verifierCount} verifier{milestone.verifierCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className={styles.cardBottom}>
        {swatchUrl && (
          <img src={swatchUrl} alt="AI-woven milestone swatch" className={styles.swatch} />
        )}
        <div className={styles.ctaRow}>
          <span className={styles.cta}>
            {milestone.state === "verified" ? "View Verification" : "View Milestone"}
          </span>
          <span className={styles.storyCta}>Read the story →</span>
        </div>
      </div>
    </Link>
  );
}
