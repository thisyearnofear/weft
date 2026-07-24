"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import styles from "./CopyCodeButton.module.css";

export function CopyCodeButton({
  value,
  label = "Copy filter",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <button
      type="button"
      className={`${styles.btn} ${className ?? ""}`}
      onClick={onCopy}
      aria-label={label}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}
