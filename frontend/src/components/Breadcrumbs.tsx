"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import styles from "./Breadcrumbs.module.css";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items, homeLabel = "Weft" }: { items: Crumb[]; homeLabel?: string }) {
  const router = useRouter();
  return (
    <nav className={styles.crumbs} aria-label="Breadcrumb">
      <button
        type="button"
        className={styles.back}
        onClick={() => router.back()}
        aria-label="Go back to the previous page"
      >
        <ArrowLeft size={14} />
      </button>
      <Link href="/" className={styles.crumb}>
        {homeLabel}
      </Link>
      {items.map((c) => (
        <span key={`${c.href ?? ""}${c.label}`} className={styles.trail}>
          <ChevronRight size={12} className={styles.sep} aria-hidden="true" />
          {c.href ? (
            <Link href={c.href} className={styles.crumb}>
              {c.label}
            </Link>
          ) : (
            <span className={styles.current} aria-current="page">
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
