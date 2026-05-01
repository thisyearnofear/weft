"use client";

import Image from "next/image";
import React from "react";
import Link from "next/link";
import { ArrowUpRight, Blocks, CheckCircle2, Coins, Globe, Sparkles, Users, Code2 } from "lucide-react";
import { useBuilderPassport } from "../../../hooks/useBuilderPassport";
import styles from "./page.module.css";

function PassportSkeleton() {
  return (
    <div className={styles.container}>
      <div className={styles.shell}>
        <div className={styles.heroCard}>
          <div className={styles.heroTop}>
            <div className={styles.skeletonCircle} />
            <div className={styles.identityBlock}>
              <div className={styles.skeletonLine} style={{ width: 160, height: 24 }} />
              <div className={styles.skeletonLine} style={{ width: 220, height: 14, marginTop: 8 }} />
            </div>
          </div>
          <div className={styles.skeletonLine} style={{ width: "100%", height: 16, marginTop: 20 }} />
          <div className={styles.skeletonLine} style={{ width: "78%", height: 16, marginTop: 10 }} />
        </div>
        <div className={styles.metricsGrid}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.metricCard}>
              <div className={styles.skeletonLine} style={{ width: 80, height: 12 }} />
              <div className={styles.skeletonLine} style={{ width: 90, height: 26, marginTop: 10 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BuilderPage({ params }: { params: Promise<{ ens: string }> }) {
  const { ens } = React.use(params);
  const { data: passport, isLoading, error } = useBuilderPassport(ens);

  if (isLoading) {
    return <PassportSkeleton />;
  }

  if (error || !passport) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Builder not found: {ens}</div>
      </div>
    );
  }

  const earnedEth = passport.weftEarnedTotal ? (passport.weftEarnedTotal / 1e18).toFixed(3) : "0.000";
  const collaborationDensity = passport.weftCobuilders.length + passport.weftProjects.length;

  return (
    <div className={styles.container}>
      <div className={styles.shell}>
        <section className={styles.heroCard}>
          <div className={styles.heroHeaderRow}>
            <Link href="/" className={styles.backLink}>← Back to system view</Link>
            <div className={styles.roleBadge}>
              <Sparkles size={16} />
              Portable trust profile
            </div>
          </div>

          <div className={styles.heroTop}>
            <div className={styles.identityCluster}>
              {passport.avatar ? (
                <Image src={passport.avatar} alt={passport.ens} className={styles.avatar} width={96} height={96} unoptimized />
              ) : (
                <div className={styles.avatarFallback}>{passport.ens.slice(0, 2).toUpperCase()}</div>
              )}
              <div className={styles.identityBlock}>
                <span className={styles.kicker}>Identity for fluid teams</span>
                <h1 className={styles.ens}>{passport.ens}</h1>
                <p className={styles.address}>{passport.address}</p>
                {passport.description && <p className={styles.description}>{passport.description}</p>}
              </div>
            </div>

            <div className={styles.reputationCard}>
              <div className={styles.reputationHeader}>
                <CheckCircle2 size={18} />
                <span>Trust signal</span>
              </div>
              <h2>{passport.weftReputationScore}</h2>
              <p>
                This profile matters because it ties funded outcomes, collaborator history, and released capital to one portable identity that future sponsors can trust.
              </p>
            </div>
          </div>

          <div className={styles.linkRow}>
            {passport.github && (
              <a href={`https://github.com/${passport.github}`} className={styles.linkChip} target="_blank" rel="noopener noreferrer">
                <Code2 size={16} />
                GitHub
                <ArrowUpRight size={14} />
              </a>
            )}
            {passport.twitter && (
              <a href={`https://twitter.com/${passport.twitter}`} className={styles.linkChip} target="_blank" rel="noopener noreferrer">
                <Sparkles size={16} />
                X / Twitter
                <ArrowUpRight size={14} />
              </a>
            )}
            {passport.url && (
              <a href={passport.url} className={styles.linkChip} target="_blank" rel="noopener noreferrer">
                <Globe size={16} />
                Website
                <ArrowUpRight size={14} />
              </a>
            )}
          </div>
        </section>

        <section className={styles.metricsGrid}>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Verified outcomes</span>
            <strong className={styles.metricValue}>{passport.weftMilestonesVerified}</strong>
            <p>Completed milestones that translated into capital-worthy trust.</p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Capital unlocked</span>
            <strong className={styles.metricValue}>{earnedEth} ETH</strong>
            <p>Total value attributed to this identity through Weft’s trust loop.</p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Collaborators</span>
            <strong className={styles.metricValue}>{passport.weftCobuilders.length}</strong>
            <p>Humans and agents visible directly in the same funding graph.</p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Trust density</span>
            <strong className={styles.metricValue}>{collaborationDensity}</strong>
            <p>Combined signal from shipped work and retained collaborators.</p>
          </article>
        </section>

        <section className={styles.mainGrid}>
          <div className={styles.primaryColumn}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.kicker}>Why this profile matters</span>
                  <h3>Trust that can actually move money</h3>
                </div>
                <Coins size={18} />
              </div>
              <p className={styles.panelText}>
                Weft treats this record as infrastructure for funding decisions. Past verified outcomes, capital unlocked, and collaborator history make it easier to evaluate whether future milestones from this identity deserve trust.
              </p>
              <ul className={styles.summaryList}>
                <li>Identity is portable instead of trapped inside a single app or company shell.</li>
                <li>Proof of work is tied to funded outcomes, not just social claims.</li>
                <li>Human and agent collaborators are first-class economic actors in the same trust graph.</li>
              </ul>
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.kicker}>Outcome graph</span>
                  <h3>Milestones and products linked to this identity</h3>
                </div>
                <Blocks size={18} />
              </div>
              {passport.weftProjects.length > 0 ? (
                <div className={styles.listGrid}>
                  {passport.weftProjects.map((project) => (
                    <Link key={project} href={`/project/${project}`} className={styles.listCard}>
                      <span className={styles.listTitle}>{project}</span>
                      <span className={styles.listMeta}>Open trust decision view</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyText}>No linked projects found for this identity yet.</p>
              )}
            </article>
          </div>

          <aside className={styles.sideColumn}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.kicker}>Human-agent graph</span>
                  <h3>Cobuilders in this trust network</h3>
                </div>
                <Users size={18} />
              </div>
              {passport.weftCobuilders.length > 0 ? (
                <div className={styles.collabList}>
                  {passport.weftCobuilders.map((cobuilder) => (
                    <Link key={cobuilder} href={`/builder/${cobuilder}`} className={styles.collabItem}>
                      <span className={styles.collabName}>{cobuilder}</span>
                      <span className={styles.collabHint}>View trust profile</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyText}>No cobuilder records attached to this profile yet.</p>
              )}
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.kicker}>Protocol interpretation</span>
                  <h3>How Weft reads this passport</h3>
                </div>
                <CheckCircle2 size={18} />
              </div>
              <div className={styles.interpretationList}>
                <div>
                  <span className={styles.interpretationTag}>ENS</span>
                  <p>Human-readable identity and metadata are the edge of programmable trust.</p>
                </div>
                <div>
                  <span className={styles.interpretationTag}>Milestones</span>
                  <p>Verified outcomes create a stronger signal than activity feeds or résumés.</p>
                </div>
                <div>
                  <span className={styles.interpretationTag}>Agents</span>
                  <p>Agent collaborators can accrue history and reputation like humans, which makes fluid teams legible.</p>
                </div>
              </div>
            </article>
          </aside>
        </section>
      </div>
    </div>
  );
}
