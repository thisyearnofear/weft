import Link from "next/link";
import styles from "./Footer.module.css";

/**
 * Footer — product surfaces lean institutional; builder/testnet wedge under Developers.
 */

const FOOTER_GROUPS = [
  {
    label: "Product",
    links: [
      { href: "/canton", label: "Program ops (post-award)" },
      { href: "/sponsor", label: "Program dashboard" },
      { href: "/explorer", label: "Explorer" },
      { href: "/activity", label: "Activity" },
    ],
  },
  {
    label: "Developers",
    links: [
      { href: "/create-milestone", label: "Builder create (0G Testnet)" },
      { href: "/explorer#fhe-demos", label: "Confidential demos (Sepolia)" },
      { href: "/verifiers", label: "Verifiers" },
      { href: "/operations", label: "Operations" },
      { href: "/api/docs", label: "API docs" },
    ],
  },
];

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link href="/" className={styles.logo}>
            ⬡ Weft
          </Link>
          <p className={styles.tagline}>
            Milestone release for program offices — agents verify checkable
            deliverables; Canton settles privately.
          </p>
        </div>

        <div className={styles.groups}>
          {FOOTER_GROUPS.map((group) => (
            <nav key={group.label} className={styles.group} aria-label={group.label}>
              <span className={styles.groupLabel}>{group.label}</span>
              {group.links.map((link) => (
                <Link key={link.href} href={link.href} className={styles.link}>
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
      </div>
    </footer>
  );
}
