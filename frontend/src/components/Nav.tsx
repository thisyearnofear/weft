"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import styles from "./Nav.module.css";

// Primary nav: institutional rail first, then public read surfaces.
// Builder create on 0G Testnet is a secondary wedge (not the front door).
type NavLink = { href: string; label: string; external?: boolean };
type NavGroup = { label: string; links: NavLink[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Explore",
    links: [
      { href: "/explorer", label: "Explorer" },
      { href: "/activity", label: "Activity" },
      { href: "/observability", label: "Observatory" },
    ],
  },
];

const DEV_LINKS: NavLink[] = [
  { href: "/create-milestone", label: "Builder create (0G Testnet)" },
  { href: "/verifiers", label: "Verifiers" },
  { href: "/confidential", label: "Confidential vault" },
  { href: "/operations", label: "Operations" },
  { href: "/api/docs", label: "API docs" },
  { href: "https://okx.ai", label: "OKX.AI ASP", external: true },
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
        <Button href="/canton" variant="nav" size="sm" ariaLabel="Post-award grant pilot">
          Grant pilot
        </Button>
        <Button href="/sponsor" variant="navGhost" size="sm" ariaLabel="Sponsor dashboard">
          Sponsor dashboard
        </Button>

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
              {DEV_LINKS.map((link) =>
                link.external ? (
                  <a
                    key={link.href}
                    href={link.href}
                    className={styles.navDropdownItem}
                    role="menuitem"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${link.label} (opens in new tab)`}
                    onClick={() => setDevOpen(false)}
                  >
                    <span className={styles.externalLinkWrapper}>
                      {link.label}
                      <ExternalLink size={12} aria-hidden="true" />
                    </span>
                  </a>
                ) : (
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
                )
              )}
            </div>
          )}
        </div>
      </nav>

      {open && (
        <nav className={styles.mobileNav} id="mobile-nav" aria-label="Mobile navigation">
          <Link
            href="/canton"
            className={styles.mobileNavCta}
            onClick={() => setOpen(false)}
          >
            Grant pilot
          </Link>
          <Link
            href="/sponsor"
            className={styles.mobileNavLink}
            onClick={() => setOpen(false)}
            aria-current={isActive("/sponsor") ? "page" : undefined}
          >
            Sponsor dashboard
          </Link>
          {[...NAV_GROUPS, { label: "Developers", links: DEV_LINKS }].map((group) => (
            <div key={group.label} className={styles.mobileNavGroup}>
              <span className={styles.mobileNavLabel}>{group.label}</span>
              {group.links.map((link) =>
                link.external ? (
                  <a
                    key={link.href}
                    href={link.href}
                    className={styles.mobileNavLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${link.label} (opens in new tab)`}
                    onClick={() => setOpen(false)}
                  >
                    <span className={styles.externalLinkWrapper}>
                      {link.label}
                      <ExternalLink size={12} aria-hidden="true" />
                    </span>
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`${styles.mobileNavLink} ${isActive(link.href) ? styles.mobileNavLinkActive : ""}`}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(link.href) ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                )
              )}
            </div>
          ))}
        </nav>
      )}
    </>
  );
}
