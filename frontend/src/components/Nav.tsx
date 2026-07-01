"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./Nav.module.css";

const NAV_LINKS = [
  { href: "/explorer", label: "Explorer" },
  { href: "/operations", label: "Operations" },
  { href: "/sponsor", label: "Sponsor" },
  { href: "/activity", label: "Activity" },
  { href: "/verifiers", label: "Verifiers" },
  { href: "/builder", label: "Builder" },
  { href: "/api/docs", label: "API" },
  { href: "/recovery", label: "Resilience" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

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
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={styles.navLink}>
            {link.label}
          </Link>
        ))}
      </nav>

      {open && (
        <nav className={styles.mobileNav} id="mobile-nav" aria-label="Mobile navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={styles.mobileNavLink}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
