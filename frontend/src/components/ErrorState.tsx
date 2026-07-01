"use client";

import { RefreshCw } from "lucide-react";
import styles from "./ErrorState.module.css";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

/**
 * Shared error state with retry button.
 * Used across all dashboard pages for consistent error handling.
 */
export function ErrorState({ message, onRetry, isRetrying }: ErrorStateProps) {
  return (
    <div className={styles.container}>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className={styles.retryBtn}
        >
          <RefreshCw size={14} className={isRetrying ? styles.spinning : ""} />
          {isRetrying ? "Retrying..." : "Try again"}
        </button>
      )}
    </div>
  );
}
