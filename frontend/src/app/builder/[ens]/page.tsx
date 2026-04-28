"use client";

import { useBuilderPassport } from "../../../hooks/useBuilderPassport";
import styles from "./page.module.css";

export default function BuilderPage({ params }: { params: Promise<{ ens: string }> }) {
  const { ens } = React.use(params);
  const { data: passport, isLoading, error } = useBuilderPassport(ens);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading passport...</div>
      </div>
    );
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
                  <a href={`/project/${project}`}>{project}</a>
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
                  <a href={`/builder/${cobuilder}`}>{cobuilder}</a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.links}>
          {passport.github && (
            <a href={`https://github.com/${passport.github}`} className={styles.link}>
              GitHub
            </a>
          )}
          {passport.twitter && (
            <a href={`https://twitter.com/${passport.twitter}`} className={styles.link}>
              Twitter
            </a>
          )}
          {passport.url && (
            <a href={passport.url} className={styles.link}>
              Website
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

import React from "react";