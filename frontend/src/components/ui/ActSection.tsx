"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import styles from "./weft-ui.module.css";

interface ActSectionProps {
  act: number;
  title: string;
  subtitle?: string;
  id: string;
  /** "full" renders children; "teaser" renders a collapsed header; "hidden" renders nothing */
  visibility?: "full" | "teaser" | "hidden";
  entering?: boolean;
  onActivate?: () => void;
  children: ReactNode;
  className?: string;
}

export function ActSection({
  act,
  title,
  subtitle,
  id,
  visibility = "full",
  entering = false,
  onActivate,
  children,
  className = "",
}: ActSectionProps) {
  if (visibility === "hidden") return null;

  if (visibility === "teaser") {
    return (
      <button
        type="button"
        className={`${styles.act} ${styles.actTeaser}`}
        onClick={onActivate}
        aria-label={`Jump to Act ${act}: ${title}`}
      >
        <div className={styles.actHeader}>
          <span className={styles.actLabel}>{act}</span>
          <div>
            <div className={styles.sectionKicker}>Act {act}</div>
            <h2 className={styles.sectionTitle}>{title}</h2>
            {subtitle && (
              <p style={{ margin: "0.45rem 0 0", color: "var(--c-text-2)", fontSize: "0.9rem" }}>{subtitle}</p>
            )}
          </div>
          <ChevronRight size={20} className={styles.actTeaserChevron} />
        </div>
      </button>
    );
  }

  return (
    <Reveal as="section" className={`${styles.act} ${entering ? styles.actEntering : ""} ${className}`}>
      <div id={id} className={styles.actHeader}>
        <span className={styles.actLabel}>{act}</span>
        <div>
          <div className={styles.sectionKicker}>Act {act}</div>
          <h2 className={styles.sectionTitle}>{title}</h2>
          {subtitle && <p style={{ margin: "0.45rem 0 0", color: "var(--c-text-2)", fontSize: "0.9rem" }}>{subtitle}</p>}
        </div>
      </div>
      <div className={styles.actBody}>{children}</div>
    </Reveal>
  );
}
