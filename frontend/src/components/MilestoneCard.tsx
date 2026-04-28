"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { Milestone, MilestoneState } from "../lib/mock-data";
import { formatDeadline, shortAddress } from "../lib/mock-data";
import styles from "./MilestoneCard.module.css";

interface MilestoneCardProps {
  milestone: Milestone;
  index?: number;
}

const STATE_CONFIG: Record<MilestoneState, { label: string; color: string }> = {
  pending: { label: "Funding Open", color: "#10b981" },
  verified: { label: "Verified ✓", color: "#6366f1" },
  failed: { label: "Failed ✗", color: "#ef4444" },
};

export function MilestoneCard({ milestone, index = 0 }: MilestoneCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const config = STATE_CONFIG[milestone.state];

  useGSAP(() => {
    if (!cardRef.current) return;

    const card = cardRef.current;

    // Entrance animation - stagger from bottom
    gsap.fromTo(
      card,
      { opacity: 0, y: 40, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power3.out", delay: index * 0.1 }
    );

    // Hover scale
    gsap.to(card, {
      scale: isHovered ? 1.03 : 1,
      y: isHovered ? -8 : 0,
      duration: 0.3,
      ease: "power2.out",
    });
  }, [isHovered, index]);

  return (
    <div
      ref={cardRef}
      className={styles.card}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
              width: milestone.state === "pending" ? "65%" : milestone.state === "verified" ? "100%" : "100%",
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

      {milestone.state === "pending" && (
        <button className={styles.stakeButton}>Stake ETH</button>
      )}
    </div>
  );
}