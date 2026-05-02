"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, Blocks, CheckCircle2, Clock3, Coins, Database, Network, ShieldCheck } from "lucide-react";
import { useMilestone } from "../../../hooks/useMilestones";
import { useBuilderPassport } from "../../../hooks/useBuilderPassport";
import { useStatusMilestone } from "../../../hooks/useStatusApi";
import { StakeForm } from "../../../components/StakeForm";
import { DEFAULT_CHAIN, getAddresses } from "../../../lib/contracts";
import styles from "./page.module.css";

const EXPLORER_ADDR = "https://chainscan-new.0g.ai/address";
const ZERO_ROOT = "0x0000000000000000000000000000000000000000000000000000000000000000";

function ProjectSkeleton() {
  return (
    <div className={styles.container}>
      <div className={styles.skeletonPanel}>
        <div className={styles.skeletonLine} style={{ width: 180, height: 14 }} />
        <div className={styles.skeletonLine} style={{ width: "70%", height: 48, marginTop: 18 }} />
        <div className={styles.skeletonGrid}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonLine} style={{ width: 96, height: 12 }} />
              <div className={styles.skeletonLine} style={{ width: "55%", height: 24, marginTop: 10 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ milestone }: { milestone: { finalized: boolean; verified: boolean } }) {
  if (milestone.verified) return <span className={`${styles.statusBadge} ${styles.statusVerified}`}>Verified</span>;
  if (milestone.finalized) return <span className={`${styles.statusBadge} ${styles.statusRejected}`}>Rejected</span>;
  return <span className={`${styles.statusBadge} ${styles.statusActive}`}>In verification</span>;
}

function ShareButtons({ url, title }: { url: string; title: string }) {
  const tweetText = encodeURIComponent(`Tracking on Weft: "${title}"\n\n${url}`);
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

  return (
    <div className={styles.shareRow}>
      <button className={styles.shareBtn} onClick={() => navigator.clipboard.writeText(url)} aria-label="Copy link">
        Copy link
      </button>
      <a href={tweetUrl} target="_blank" rel="noopener noreferrer" className={styles.shareBtn}>
        Share on X
      </a>
    </div>
  );
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const milestoneHash = (id.startsWith("0x") ? id : `0x${id}`) as `0x${string}`;
  const { data: milestone, isLoading, error } = useMilestone(milestoneHash);
  const { data: statusMilestone } = useStatusMilestone(milestoneHash, true);
  const addresses = getAddresses(DEFAULT_CHAIN);

  const builderAddr = milestone?.builder ?? "";
  const { data: builderPassport } = useBuilderPassport(
    statusMilestone?.demo?.tracks.ens.builderEns || (builderAddr ? `0x${BigInt(builderAddr).toString(16)}.eth` : "")
  );

  const builderName =
    statusMilestone?.demo?.tracks.ens.builderEns ||
    builderPassport?.ens ||
    (builderAddr ? `${builderAddr.slice(0, 6)}...${builderAddr.slice(-4)}` : "");
  const stakedEth = milestone ? (Number(milestone.totalStaked) / 1e18).toFixed(4) : "0";
  const isVerified = Boolean(milestone?.verified);
  const isActive = Boolean(milestone && !milestone.finalized);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const evidenceRoot = milestone?.finalEvidenceRoot && milestone.finalEvidenceRoot !== ZERO_ROOT ? milestone.finalEvidenceRoot : null;
  const verificationProgress = milestone?.verifierCount ? Math.min(100, Math.round((milestone.verifiedVotes / milestone.verifierCount) * 100)) : 0;
  const payoutStatus = isVerified ? "This outcome has earned capital release." : milestone?.finalized ? "This outcome failed the trust threshold and can follow the refund path." : "Capital is still locked because the system is not yet confident enough.";
  const evidenceStatus = evidenceRoot ? "Evidence root recorded onchain." : "Awaiting final evidence root publication.";
  const demo = statusMilestone?.demo;
  const peerGroup = demo?.tracks.gensyn.bestPeerGroup;
  const keeperhub = demo?.tracks.keeperhub;
  const metadataRoot = demo?.tracks["0g"].metadataRoot;

  if (isLoading) return <ProjectSkeleton />;

  if (error || !milestone) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Milestone not found: {id}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.shell}>
        <section className={styles.heroCard}>
          <div className={styles.heroTop}>
            <Link href="/" className={styles.backLink}>
              ← Back to system view
            </Link>
            <StatusBadge milestone={milestone} />
          </div>

          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>Trust decision view</span>
              <h1 className={styles.title}>Milestone {id.slice(0, 10)}...{id.slice(-8)}</h1>
              <p className={styles.subtitle}>
                {demo?.pitch || "This page answers the real question: should a fluid team earn capital release for this outcome?"}
              </p>

              <div className={styles.heroActions}>
                <a href={`${EXPLORER_ADDR}/${milestone.builder}`} target="_blank" rel="noopener noreferrer" className={styles.primaryAction}>
                  View builder on explorer
                  <ArrowUpRight size={16} />
                </a>
                <Link href={`/builder/${builderName}`} className={styles.secondaryAction}>
                  Open trust profile
                </Link>
              </div>
            </div>

            <div className={styles.executionCard}>
              <div className={styles.executionHeader}>
                <ShieldCheck size={18} />
                <span>Capital release readiness</span>
              </div>
              <h2>{isVerified ? "Trust threshold cleared" : milestone.finalized ? "Trust threshold not met" : "Trust still being established"}</h2>
              <p>{payoutStatus}</p>
              <div className={styles.executionBullets}>
                <div>
                  <Database size={16} />
                  <span>{metadataRoot ? `0G metadata root: ${metadataRoot.slice(0, 12)}...${metadataRoot.slice(-8)}` : evidenceStatus}</span>
                </div>
                <div>
                  <Network size={16} />
                  <span>{peerGroup ? `${peerGroup.peerCount} corroborating peers aligned on this outcome` : `${milestone.verifiedVotes}/${milestone.verifierCount} verifier votes recorded so far`}</span>
                </div>
                <div>
                  <Blocks size={16} />
                  <span>{keeperhub?.configured ? `Reliable KeeperHub execution is available once the decision is final.` : "Fallback execution path remains available if KeeperHub is not configured."}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.metricGrid}>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Capital at stake</span>
            <strong className={styles.metricValue}>{stakedEth} ETH</strong>
            <p>Escrowed until the system is confident enough to release or refund.</p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Verifier confidence</span>
            <strong className={styles.metricValue}>{milestone.verifiedVotes}/{milestone.verifierCount}</strong>
            <p>{verificationProgress}% of the current quorum has been satisfied.</p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Peer corroboration</span>
            <strong className={styles.metricValue}>{peerGroup ? peerGroup.peerCount : 0}</strong>
            <p>{peerGroup ? "Peer consensus is visible for this funding decision." : "No corroborating peer group surfaced yet."}</p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Evidence root</span>
            <strong className={styles.metricValueSmall}>{evidenceRoot ? `${evidenceRoot.slice(0, 12)}...${evidenceRoot.slice(-8)}` : "Pending"}</strong>
            <p>{evidenceRoot ? "Final proof anchor has been written onchain." : "Root will appear after finalization."}</p>
          </article>
        </section>

        <section className={styles.mainGrid}>
          <div className={styles.primaryColumn}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.kicker}>Why this matters</span>
                  <h3>This is a funding decision, not a dashboard row</h3>
                </div>
                <Coins size={18} />
              </div>
              <p className={styles.panelText}>
                Weft treats this milestone as a release-or-refund decision for an internet-native team. Funds remain gated until evidence exists, peer verifiers corroborate the outcome, and the system is confident enough to move real capital.
              </p>
              <div className={styles.progressWrap}>
                <div className={styles.progressHeader}>
                  <span>Trust progress</span>
                  <span>{verificationProgress}%</span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${verificationProgress}%` }} />
                </div>
              </div>
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.kicker}>Evidence and payout path</span>
                  <h3>What the network requires before money moves</h3>
                </div>
                <CheckCircle2 size={18} />
              </div>
              <ul className={styles.summaryList}>
                <li>Deployment and milestone-linked usage must be verifiable.</li>
                <li>Verifier votes need to converge on a credible outcome.</li>
                <li>Evidence roots should be anchorable and inspectable.</li>
                <li>Final execution should use a reliable path rather than a fragile one-off transaction.</li>
              </ul>
              {evidenceRoot && (
                <div className={styles.codeBlock}>
                  <span className={styles.codeLabel}>Final evidence root</span>
                  <code>{evidenceRoot}</code>
                </div>
              )}
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.kicker}>Trust graph impact</span>
                  <h3>What this outcome changes for the team</h3>
                </div>
                <ArrowUpRight size={18} />
              </div>
              <p className={styles.panelText}>
                If this milestone verifies, it does more than unlock capital. It strengthens the reusable trust graph around the builder and collaborators. If it fails, that is useful too: Weft makes failure legible instead of hiding it behind social ambiguity.
              </p>
              <ShareButtons url={shareUrl} title={`Milestone ${id.slice(0, 10)}`} />
            </article>
          </div>

          <aside className={styles.sideColumn}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.kicker}>Trust profile</span>
                  <h3>{builderName}</h3>
                </div>
                <Clock3 size={18} />
              </div>
              <div className={styles.identityMeta}>
                <span className={styles.identityLabel}>Address</span>
                <span className={styles.identityValue}>{milestone.builder}</span>
              </div>
              {builderPassport?.description && <p className={styles.panelText}>{builderPassport.description}</p>}
              <div className={styles.identityStats}>
                <div>
                  <span>Verified outcomes</span>
                  <strong>{builderPassport?.weftMilestonesVerified ?? demo?.tracks.ens.builderProfile?.milestonesVerified ?? 0}</strong>
                </div>
                <div>
                  <span>Reputation score</span>
                  <strong>{builderPassport?.weftReputationScore ?? demo?.tracks.ens.builderProfile?.reputationScore ?? 0}</strong>
                </div>
                <div>
                  <span>Capital unlocked</span>
                  <strong>{builderPassport?.weftEarnedTotal ?? demo?.tracks.ens.builderProfile?.earnedTotal ?? 0}</strong>
                </div>
              </div>
            </article>

            {isActive && addresses.weftMilestone && (
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.kicker}>Participate</span>
                    <h3>Stake behind this outcome</h3>
                  </div>
                  <Coins size={18} />
                </div>
                <p className={styles.panelText}>
                  Add capital to the milestone while it is still active. Funds remain governed by Weft’s trust loop until the final outcome is known.
                </p>
                <StakeForm milestoneHash={milestoneHash} contractAddress={addresses.weftMilestone} />
              </article>
            )}

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.kicker}>Protocol roles</span>
                  <h3>What each integration contributes</h3>
                </div>
                <Database size={18} />
              </div>
              <div className={styles.integrationList}>
                <div>
                  <span className={styles.integrationTag}>0G</span>
                  <p>{demo?.tracks["0g"].note || "Chain and storage anchors for milestone state, metadata, and evidence artifacts."}</p>
                </div>
                <div>
                  <span className={styles.integrationTag}>AXL</span>
                  <p>{peerGroup ? `Corroborating peers: ${peerGroup.nodeAddresses.join(", ")}` : "Verifier nodes share peer signals before trusting a payout decision."}</p>
                </div>
                <div>
                  <span className={styles.integrationTag}>KeeperHub</span>
                  <p>{keeperhub?.note || "Provides a robust execution path once the system is ready to submit or settle."}</p>
                </div>
                <div>
                  <span className={styles.integrationTag}>ENS</span>
                  <p>{demo?.tracks.ens.builderEns || demo?.tracks.ens.agentEns ? `Visible identities: ${[demo.tracks.ens.builderEns, demo.tracks.ens.agentEns].filter(Boolean).join(" · ")}` : "Portable builder and agent identity keeps the milestone understandable to humans."}</p>
                </div>
              </div>
            </article>
          </aside>
        </section>
      </div>
    </div>
  );
}
