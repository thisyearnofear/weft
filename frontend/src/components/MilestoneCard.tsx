"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Milestone, MilestoneState } from "@/lib/milestone-types";
import { formatDeadline } from "@/lib/milestone-types";
import styles from "./MilestoneCard.module.css";
import { useProximity } from "@/hooks/useProximity";

interface MilestoneCardProps {
  milestone: Milestone;
  index?: number;
  swatchUrl?: string | null;
  confidential?: boolean;
}

const STATE_CONFIG: Record<MilestoneState, { label: string; color: string }> = {
  pending: { label: "Awaiting Verification", color: "#f59e0b" },
  verified: { label: "Verified", color: "#22c55e" },
  failed: { label: "Failed", color: "#ef4444" },
};

export function MilestoneCard({ milestone, index = 0, swatchUrl, confidential = false }: MilestoneCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const config = STATE_CONFIG[milestone.state];

  // Cursor-proximity feedback — desktop + motion-OK only (no-op otherwise)
  useProximity(cardRef, { radius: 160, tilt: 5 });

  // One-shot glow when a verified card scrolls into view
  useEffect(() => {
    if (milestone.state !== "verified") return;
    const el = cardRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          el.animate(
            [
              { boxShadow: "0 0 0 0 rgba(34, 197, 94, 0)" },
              { boxShadow: "0 0 32px 2px rgba(34, 197, 94, 0.35)" },
              { boxShadow: "0 0 0 0 rgba(34, 197, 94, 0)" },
            ],
            { duration: 1400, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
          );
          observer.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [milestone.state]);

  return (
    <Link
      ref={cardRef}
      href={`/project/${milestone.hash}`}
      className={styles.card}
      style={{ animationDelay: `${index * 0.1}s` }}
      role="article"
      aria-label={`${milestone.projectName} — ${config.label}`}
    >
      <div className={styles.header}>
        <div className={styles.projectName}>
          {milestone.projectName}
          {confidential && <span className={styles.confidentialBadge}>Confidential</span>}
        </div>
        <div className={`${styles.state} scale-in`} style={{ backgroundColor: config.color }}>
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
          <span>{confidential ? "Confidential" : `${milestone.totalStaked} ETH staked`}</span>
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
              {confidential
                ? "Sealed ballot"
                : `${milestone.verifiedVotes}/${milestone.verifierCount} verifier${milestone.verifierCount !== 1 ? "s" : ""}`}
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
