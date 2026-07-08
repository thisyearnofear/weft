"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import styles from "./Nav.module.css";

// Primary nav stays focused on the builder path. Machinery pages
// (Verifiers, Operations, API docs) live in the footer's Developers group
// and, for reachability, in the mobile menu below.
const NAV_GROUPS = [
  {
    label: "Explore",
    links: [
      { href: "/explorer", label: "Explorer" },
      { href: "/activity", label: "Activity" },
      { href: "/explorer", label: "Demos" },
    ],
  },
];

const MOBILE_ONLY_GROUPS = [
  {
    label: "Developers",
    links: [
      { href: "/verifiers", label: "Verifiers" },
      { href: "/operations", label: "Operations" },
      { href: "/api/docs", label: "API docs" },
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
        {/* Primary action — visually distinct */}
        <Link
          href="/create-milestone"
          className={styles.navCta}
          aria-label="Create a milestone"
        >
          <Plus size={14} /> Create
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
          {[...NAV_GROUPS, ...MOBILE_ONLY_GROUPS].map((group) => (
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
