"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import styles from "./RefreshButton.module.css";

interface RefreshButtonProps {
  onClick: () => void;
  isFetching?: boolean;
  label?: string;
}

export function RefreshButton({ onClick, isFetching, label = "Refresh" }: RefreshButtonProps) {
  const [spinning, setSpinning] = useState(false);

  const handleClick = () => {
    setSpinning(true);
    onClick();
    setTimeout(() => setSpinning(false), 600);
  };

  return (
    <button
      className={styles.refreshBtn}
      onClick={handleClick}
      aria-label={label}
      disabled={isFetching || spinning}
    >
      <RefreshCw size={15} className={spinning || isFetching ? styles.spinning : ""} />
      <span>{label}</span>
    </button>
  );
}
