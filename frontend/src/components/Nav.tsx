"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./Nav.module.css";

const NAV_GROUPS = [
  {
    label: "Explore",
    links: [
      { href: "/explorer", label: "Explorer" },
      { href: "/sponsor", label: "Sponsors" },
      { href: "/builder", label: "Builders" },
    ],
  },
  {
    label: "System",
    links: [
      { href: "/operations", label: "Operations" },
      { href: "/activity", label: "Activity" },
      { href: "/verifiers", label: "Verifiers" },
      { href: "/recovery", label: "Recovery" },
    ],
  },
  {
    label: "Dev",
    links: [
      { href: "/api/docs", label: "API Docs" },
    ],
  },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/explorer") return pathname === "/explorer";
    return pathname === href || pathname.startsWith(href + "/");
  };

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
      </nav>

      {open && (
        <nav className={styles.mobileNav} id="mobile-nav" aria-label="Mobile navigation">
          {NAV_GROUPS.map((group) => (
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
