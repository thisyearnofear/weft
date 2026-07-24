import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DemoBadge } from "./DemoBadge";
import styles from "./weft-ui.module.css";

interface DemoBridgeProps {
  /** What the user was looking at (e.g. "observability", "the explorer") */
  context?: string;
  href?: string;
  ctaLabel?: string;
}

/**
 * Bridge CTA shown at the bottom of pages that include demo data.
 * Helps users understand they're seeing illustrative data and gives
 * them a clear path to use the product for real.
 */
export function DemoBridge({
  context = "this page",
  href = "/create-milestone",
  ctaLabel = "Create a real milestone",
}: DemoBridgeProps) {
  return (
    <div className={`${styles.demoBridge} ${styles.surface}`}>
      <div className={styles.demoBridgeCopy}>
        <DemoBadge label={`Demo ${context}`} />
        <p className={styles.demoBridgeText}>
          What you see here is illustrative — real onchain milestones, real SigNoz traces,
          but staged for demo. Ready to fund a real milestone on 0G Testnet?
        </p>
      </div>
      <Link href={href} className={styles.demoBridgeCta}>
        {ctaLabel} <ArrowRight size={16} />
      </Link>
    </div>
  );
}
