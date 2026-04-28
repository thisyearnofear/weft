"use client";

import { useMilestone } from "../../../hooks/useMilestones";
import { useBuilderPassport } from "../../../hooks/useBuilderPassport";
import { StakeForm } from "../../../components/StakeForm";
import { DEFAULT_CHAIN, getAddresses } from "../../../lib/contracts";
import styles from "./page.module.css";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const milestoneHash = (id.startsWith("0x") ? id : `0x${id}`) as `0x${string}`;
  const { data: milestone, isLoading, error } = useMilestone(milestoneHash);
  const addresses = getAddresses(DEFAULT_CHAIN);

  const { data: builderPassport } = useBuilderPassport(
    milestone?.builder ? `0x${BigInt(milestone.builder).toString(16)}.eth` : ""
  );

  const isActive = milestone && Number(milestone.deadline) * 1000 > Date.now() && !milestone.finalized;
  const isVerified = milestone?.verified;
  const isRejected = milestone?.verified === false && milestone.finalized;

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading milestone...</div>
      </div>
    );
  }

  if (error || !milestone) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Milestone not found: {id}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.status}>
            {isVerified && <span className={styles.verified}>Verified</span>}
            {isRejected && <span className={styles.rejected}>Rejected</span>}
            {isActive && <span className={styles.active}>Active</span>}
            {!isActive && !isVerified && !isRejected && (
              <span className={styles.pending}>Pending</span>
            )}
          </div>
          <div className={styles.metadata}>
            <span className={styles.label}>ID</span>
            <span className={styles.value}>{id}</span>
          </div>
        </div>

        <div className={styles.builder}>
          <span className={styles.label}>Builder</span>
          <a href={`/builder/${milestone.builder}`} className={styles.builderLink}>
            {builderPassport?.ens || milestone.builder}
          </a>
        </div>

        <div className={styles.details}>
          <div className={styles.detail}>
            <span className={styles.label}>Total Staked</span>
            <span className={styles.value}>
              {Number(milestone.totalStaked) / 1e18} ETH
            </span>
          </div>
          <div className={styles.detail}>
            <span className={styles.label}>Deadline</span>
            <span className={styles.value}>
              {new Date(Number(milestone.deadline) * 1000).toLocaleString()}
            </span>
          </div>
          <div className={styles.detail}>
            <span className={styles.label}>Verifiers</span>
            <span className={styles.value}>
              {milestone.verifiedVotes}/{milestone.verifierCount}
            </span>
          </div>
        </div>

        {milestone.evidenceRoot && (
          <div className={styles.evidence}>
            <span className={styles.label}>Evidence Root</span>
            <code className={styles.code}>{milestone.evidenceRoot}</code>
          </div>
        )}

        {isActive && addresses.weftMilestone && (
          <div className={styles.stake}>
            <h3 className={styles.sectionTitle}>Stake this milestone</h3>
            <StakeForm
              milestoneHash={milestoneHash}
              contractAddress={addresses.weftMilestone}
            />
          </div>
        )}
      </div>
    </div>
  );
}

import React from "react";
import { Address } from "viem";