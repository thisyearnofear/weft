"use client";

import React from "react";
import Link from "next/link";
import { useBuilderPassport } from "../../../hooks/useBuilderPassport";
import styles from "./page.module.css";

function PassportSkeleton() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.skeletonCircle} />
          <div className={styles.identity}>
            <div className={styles.skeletonLine} style={{ width: 140, height: 20 }} />
            <div className={styles.skeletonLine} style={{ width: 200, height: 12, marginTop: 4 }} />
          </div>
        </div>
        <div className={styles.skeletonLine} style={{ width: "100%", height: 14 }} />
        <div className={styles.skeletonLine} style={{ width: "70%", height: 14 }} />
        <div className={styles.stats}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.stat}>
              <div className={styles.skeletonLine} style={{ width: 40, height: 20, margin: "0 auto" }} />
              <div className={styles.skeletonLine} style={{ width: 60, height: 12, margin: "4px auto 0" }} />
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

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          {passport.avatar && (
            <img src={passport.avatar} alt={passport.ens} className={styles.avatar} />
          )}
          <div className={styles.identity}>
            <h1 className={styles.ens}>{passport.ens}</h1>
            <p className={styles.address}>{passport.address}</p>
          </div>
        </div>

        {passport.description && (
          <p className={styles.description}>{passport.description}</p>
        )}

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{passport.weftMilestonesVerified}</span>
            <span className={styles.statLabel}>Verified</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>Ξ{passport.weftEarnedTotal / 1e18}</span>
            <span className={styles.statLabel}>Earned</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{passport.weftReputationScore}</span>
            <span className={styles.statLabel}>Reputation</span>
          </div>
        </div>

        {passport.weftProjects.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Projects</h3>
            <ul className={styles.list}>
              {passport.weftProjects.map((project) => (
                <li key={project} className={styles.listItem}>
                  <Link href={`/project/${project}`}>{project}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {passport.weftCobuilders.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Cobuilders</h3>
            <ul className={styles.list}>
              {passport.weftCobuilders.map((cobuilder) => (
                <li key={cobuilder} className={styles.listItem}>
                  <Link href={`/builder/${cobuilder}`}>{cobuilder}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.links}>
          {passport.github && (
            <a href={`https://github.com/${passport.github}`} className={styles.link} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          )}
          {passport.twitter && (
            <a href={`https://twitter.com/${passport.twitter}`} className={styles.link} target="_blank" rel="noopener noreferrer">
              Twitter
            </a>
          )}
          {passport.url && (
            <a href={passport.url} className={styles.link} target="_blank" rel="noopener noreferrer">
              Website
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
