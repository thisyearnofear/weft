"use client";

import { WifiOff } from "lucide-react";
import styles from "./OfflineBadge.module.css";

/**
 * Shows a small "showing cached data" badge when the API is unreachable
 * but we still have data from a previous successful fetch.
 */
export function OfflineBadge() {
  return (
    <div className={styles.badge}>
      <WifiOff size={13} />
      <span>Showing cached data</span>
    </div>
  );
}
