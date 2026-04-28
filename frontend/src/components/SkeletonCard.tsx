"use client";

import styles from "./MilestoneCard.module.css";

interface SkeletonCardProps {
  index?: number;
}

export function SkeletonCard({ index = 0 }: SkeletonCardProps) {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonLine} style={{ width: "60%" }} />
        <div className={styles.skeletonBadge} />
      </div>
      <div className={styles.skeletonLine} style={{ width: "100%" }} />
      <div className={styles.skeletonLine} style={{ width: "80%" }} />
      <div className={styles.skeletonTags}>
        <div className={styles.skeletonTag} />
        <div className={styles.skeletonTag} />
      </div>
      <div className={styles.skeletonProgress} />
      <div className={styles.skeletonFooter}>
        <div className={styles.skeletonLine} style={{ width: "40%" }} />
      </div>
    </div>
  );
}