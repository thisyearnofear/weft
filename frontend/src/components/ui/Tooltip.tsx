"use client";

import { ReactNode, useId, useState } from "react";
import styles from "./Tooltip.module.css";

interface TooltipProps {
  /** The term/element that triggers the tooltip. */
  children: ReactNode;
  /** Short definition or explanation shown on hover/focus. */
  tip: string;
  /** Optional accessible label; falls back to tip. */
  label?: string;
  /** Extra classes for the trigger wrapper. */
  className?: string;
}

/**
 * Lightweight, accessible tooltip for inline jargon/terms.
 *
 * - The trigger is wrapped in a span with a dotted underline to indicate
 *   “more info available”.
 * - Appears on hover and focus; disappears on mouse leave or blur.
 * - Keeps the DOM light: no portal, no external dependencies.
 */
export function Tooltip({ children, tip, label, className = "" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <span
      className={`${styles.tooltip} ${className}`.trim()}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      role="term"
      aria-describedby={id}
      tabIndex={0}
    >
      {children}
      <span
        id={id}
        className={styles.tip}
        data-visible={visible}
        role="definition"
        aria-label={label || tip}
      >
        {tip}
      </span>
    </span>
  );
}
