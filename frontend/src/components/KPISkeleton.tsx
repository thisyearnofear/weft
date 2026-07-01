import styles from "./KPISkeleton.module.css";

interface KPISkeletonProps {
  count?: number;
}

export function KPISkeleton({ count = 4 }: KPISkeletonProps) {
  return (
    <div className={styles.kpiGrid}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.kpiCard}>
          <div className={styles.skeletonLabel} />
          <div className={styles.skeletonValue} />
          <div className={styles.skeletonSub} />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className={styles.listWrap}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={styles.listRow}>
          <div className={styles.skeletonIcon} />
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLineShort} />
        </div>
      ))}
    </div>
  );
}
