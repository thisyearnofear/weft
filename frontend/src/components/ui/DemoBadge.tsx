import styles from "./weft-ui.module.css";

interface DemoBadgeProps {
  label?: string;
  className?: string;
}

/**
 * Small amber-tinted badge that marks synthetic/demo data so users
 * can distinguish it from real onchain data at a glance.
 */
export function DemoBadge({ label = "Demo", className = "" }: DemoBadgeProps) {
  return (
    <span className={`${styles.demoBadge} ${className}`} title="This data is illustrative, not from a live source">
      {label}
    </span>
  );
}
