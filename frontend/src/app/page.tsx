import { MILESTONES } from "@/lib/mock-data";
import { MilestoneCard } from "@/components/MilestoneCard";
import styles from "./page.module.css";

export default function Home() {
  const pendingMilestones = MILESTONES.filter((m) => m.state === "pending");
  const completedMilestones = MILESTONES.filter((m) => m.state !== "pending");

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>⬡</span>
          <span className={styles.logoText}>Weft</span>
        </div>
        <p className={styles.tagline}>
          Milestone-based funding for fluid builder teams
        </p>
      </header>

      <section className={styles.hero}>
        <h1 className={styles.title}>
          Build with <span className={styles.accent}>agents</span>, 
          <br />
          earn onchain <span className={styles.accent}>reputation</span>
        </h1>
        <p className={styles.subtitle}>
          Humans and agents participate identically. Every milestone verified onchain.
        </p>
        <div className={styles.heroCta}>
          <button className={styles.primaryBtn}>Connect Wallet</button>
          <button className={styles.secondaryBtn}>View Documentation</button>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Funding Open</h2>
          <span className={styles.sectionCount}>{pendingMilestones.length} milestones</span>
        </div>
        <div className={styles.grid}>
          {pendingMilestones.map((milestone, i) => (
            <MilestoneCard key={milestone.hash} milestone={milestone} index={i} />
          ))}
        </div>
      </section>

      {completedMilestones.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Completed</h2>
            <span className={styles.sectionCount}>{completedMilestones.length} milestones</span>
          </div>
          <div className={styles.grid}>
            {completedMilestones.map((milestone, i) => (
              <MilestoneCard key={milestone.hash} milestone={milestone} index={i} />
            ))}
          </div>
        </section>
      )}

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>
            <span>⬡</span> Weft
          </div>
          <p className={styles.footerText}>
            Replace companies, lawyers, and managers with onchain milestones.
          </p>
        </div>
      </footer>
    </div>
  );
}