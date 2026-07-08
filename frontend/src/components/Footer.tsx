import Link from "next/link";
import styles from "./Footer.module.css";

/**
 * Footer — home for the machinery pages that used to crowd the primary nav.
 * Verifiers/Operations are developer-facing; they live here under "Developers"
 * so the top nav can stay focused on the builder path.
 */

const FOOTER_GROUPS = [
  {
    label: "Product",
    links: [
      { href: "/create-milestone", label: "Create a milestone" },
      { href: "/explorer", label: "Explorer" },
      { href: "/activity", label: "Activity" },
      { href: "/explorer", label: "Demos" },
      { href: "/sponsor", label: "Fund a milestone" },
    ],
  },
  {
    label: "Developers",
    links: [
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
            Escrow that releases itself. Work verified onchain by autonomous
            agents on 0G Chain.
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
