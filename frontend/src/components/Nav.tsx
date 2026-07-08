"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Plus, ChevronDown } from "lucide-react";
import styles from "./Nav.module.css";

// Primary nav covers the two builder flows (Create / Fund) plus the
// public read surfaces (Explorer / Activity / Confidential). The
// developer/ops pages live in a "Developers" dropdown so they stay
// reachable without crowding the bar.
const NAV_GROUPS = [
  {
    label: "Explore",
    links: [
      { href: "/explorer", label: "Explorer" },
      { href: "/activity", label: "Activity" },
      { href: "/explorer#fhe-demos", label: "Confidential" },
    ],
  },
];

const DEV_LINKS = [
  { href: "/verifiers", label: "Verifiers" },
  { href: "/operations", label: "Operations" },
  { href: "/api/docs", label: "API docs" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const devRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const isActive = (href: string) => {
    const base = href.split("#")[0];
    if (base === "/explorer") return pathname === "/explorer";
    return pathname === base || pathname.startsWith(base + "/");
  };

  const devActive = DEV_LINKS.some((l) => isActive(l.href));

  // Close the Developers dropdown on outside click or Escape.
  useEffect(() => {
    if (!devOpen) return;
    const onDown = (e: MouseEvent) => {
      if (devRef.current && !devRef.current.contains(e.target as Node)) setDevOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDevOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [devOpen]);

  return (
    <>
      <button
        className={styles.menuBtn}
        aria-label="Toggle navigation menu"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.menuIcon} data-open={open}>
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      <nav className={styles.desktopNav} aria-label="Main navigation">
        {/* Primary actions — visually distinct */}
        <Link
          href="/create-milestone"
          className={styles.navCta}
          aria-label="Create a milestone"
        >
          <Plus size={14} /> Create
        </Link>
        <Link
          href="/sponsor"
          className={styles.navCtaSecondary}
          aria-label="Fund a milestone"
        >
          Fund
        </Link>

        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className={styles.navGroup}>
            {gi > 0 && <span className={styles.navDivider} />}
            {group.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${isActive(link.href) ? styles.navLinkActive : ""}`}
                aria-current={isActive(link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}

        {/* Developers dropdown */}
        <div className={styles.navDropdown} ref={devRef}>
          <button
            type="button"
            className={`${styles.navDropdownBtn} ${devActive ? styles.navLinkActive : ""}`}
            aria-haspopup="true"
            aria-expanded={devOpen}
            onClick={() => setDevOpen((v) => !v)}
          >
            Developers
            <ChevronDown size={14} className={styles.navDropdownChevron} aria-hidden="true" />
          </button>
          {devOpen && (
            <div className={styles.navDropdownMenu} role="menu">
              {DEV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={styles.navDropdownItem}
                  role="menuitem"
                  aria-current={isActive(link.href) ? "page" : undefined}
                  onClick={() => setDevOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      {open && (
        <nav className={styles.mobileNav} id="mobile-nav" aria-label="Mobile navigation">
          <Link
            href="/create-milestone"
            className={styles.mobileNavCta}
            onClick={() => setOpen(false)}
          >
            <Plus size={16} /> Create a milestone
          </Link>
          {[...NAV_GROUPS, { label: "Developers", links: DEV_LINKS }].map((group) => (
            <div key={group.label} className={styles.mobileNavGroup}>
              <span className={styles.mobileNavLabel}>{group.label}</span>
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${styles.mobileNavLink} ${isActive(link.href) ? styles.mobileNavLinkActive : ""}`}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(link.href) ? "page" : undefined}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      )}
    </>
  );
}
