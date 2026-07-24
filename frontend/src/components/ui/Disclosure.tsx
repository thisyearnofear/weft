"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./weft-ui.module.css";

interface DisclosureProps {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function Disclosure({ label, children, defaultOpen = false }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={styles.disclosure}>
      <button
        type="button"
        className={styles.disclosureTrigger}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <strong>{label}</strong>
        <ChevronDown
          size={16}
          className={`${styles.disclosureChevron} ${open ? styles.disclosureChevronOpen : ""}`}
        />
      </button>
      <div className={`${styles.disclosurePanel} ${open ? styles.disclosurePanelOpen : ""}`}>
        <div className={styles.disclosurePanelInner}>{children}</div>
      </div>
    </div>
  );
}
