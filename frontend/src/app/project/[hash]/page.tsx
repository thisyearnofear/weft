"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, BookOpen, CheckCircle2, Clock3, Coins, Database, ShieldCheck, XCircle, Wallet, AlertTriangle, Loader2, Bot } from "lucide-react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { useMilestone } from "../../../hooks/useMilestones";
import { useConfidentialMilestone } from "../../../hooks/useConfidentialMilestone";
import { useWeightedConfidentialMilestone } from "../../../hooks/useWeightedConfidentialMilestone";
import { ConfidentialMilestoneView } from "./ConfidentialMilestoneView";
import { WeightedMilestoneView } from "./WeightedMilestoneView";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useBuilderPassport } from "../../../hooks/useBuilderPassport";
import { useStatusMilestone } from "../../../hooks/useStatusApi";
import { StakeForm } from "../../../components/StakeForm";
import { ProofShareCard } from "../../../components/ProofShareCard";
import { VerificationReceipt } from "../../../components/VerificationReceipt";
import { DEFAULT_CHAIN, getAddresses, WeftMilestoneAbi } from "../../../lib/contracts";
import { resolveMilestoneMeta, shortHash } from "../../../lib/milestone-meta";
import styles from "./page.module.css";

const EXPLORER_ADDR = "https://chainscan-new.0g.ai/address";
const ZERO_ROOT = "0x0000000000000000000000000000000000000000000000000000000000000000";

function ProjectSkeleton() {
  const [step, setStep] = React.useState(0);
  const messages = [
    "Connecting to 0G chain...",
    "Reading milestone data from WeftMilestone contract...",
    "Loading onchain evidence and verifier records...",
    "Almost there — assembling the trust verdict...",
  ];

  React.useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, messages.length - 1)), 4000);
    return () => clearInterval(t);
  }, [messages.length]);

  return (
    <div className={styles.container}>
      <div className={styles.skeletonPanel}>
        <div className={styles.skeletonMsgRow}>
          <Loader2 size={18} className={styles.spinner} />
          <span className={styles.skeletonMsg}>{messages[step]}</span>
        </div>
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

function EvidenceRow({ label, passed, detail }: { label: string; passed: boolean; detail: string }) {
  return (
    <div className={styles.evidenceRow}>
      <span className={`${styles.evidenceIcon} ${passed ? styles.evidenceIconPassed : ""}`}>
        {passed ? "✓" : "○"}
      </span>
      <div className={styles.evidenceBody}>
        <div className={styles.evidenceLabel}>{label}</div>
        <div className={styles.evidenceDetail}>{detail}</div>
      </div>
    </div>
  );
}

function ReleaseButton({ milestoneHash, contractAddress, milestone, demoMode }: {
  milestoneHash: `0x${string}`; contractAddress: `0x${string}`;
  milestone: { verified: boolean; released: boolean; finalized: boolean };
  demoMode?: boolean;
}) {
  const { isConnected } = useAccount();
  const [error, setError] = React.useState<string | null>(null);
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  if (!isConnected && !demoMode) return null;

  const canRelease = milestone.verified && !milestone.released;
  const canRefund = milestone.finalized && !milestone.verified;

  if (!canRelease && !canRefund) return null;

  const handleAction = async (fn: "release" | "refund") => {
    setError(null);
    try {
      writeContract({
        address: contractAddress,
        abi: WeftMilestoneAbi,
        functionName: fn,
        args: [milestoneHash],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : `${fn} failed`);
    }
  };

  const actionLabel = canRelease ? "Release Capital" : "Request Refund";
  const actionFn: "release" | "refund" = canRelease ? "release" : "refund";

  return (
    <div className={styles.actionStack}>
      <button
        onClick={() => handleAction(actionFn)}
        disabled={isPending || isConfirming}
        className={`${styles.actionBtn} ${canRelease ? "" : styles.actionBtnRefund}`}
      >
        {isPending ? "Signing..." : isConfirming ? "Confirming..." : (
          <>{canRelease ? <Wallet size={16} /> : <XCircle size={16} />} {actionLabel}</>
        )}
      </button>
      {error && <div className={styles.actionError}>{error}</div>}
      {txHash && (
        <a
          href={`https://chainscan-new.0g.ai/tx/${txHash}`}
          target="_blank" rel="noopener noreferrer"
          className={styles.txLink}
        >
          View transaction →
        </a>
      )}
    </div>
  );
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

export default function ProjectPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = React.use(params);
  const searchParams = useSearchParams();
  const demoMode = searchParams.get("demo") === "1";
  const confidentialMode = searchParams.get("confidential") === "1";
  const weightedMode = searchParams.get("weighted") === "1";
  const milestoneHash = (hash.startsWith("0x") ? hash : `0x${hash}`) as `0x${string}`;
  const { data: milestone, isLoading, error } = useMilestone(milestoneHash);
  // Confidential milestones live on Sepolia (Zama FHEVM). Checked when asked
  // for explicitly (?confidential=1) or when the hash isn't a public milestone.
  const publicMissing = !isLoading && (!!error || !milestone || milestone.builder === "0x0000000000000000000000000000000000000000");
  const { data: confidentialMilestone, isLoading: confidentialLoading } = useConfidentialMilestone(
    milestoneHash,
    confidentialMode || publicMissing
  );
  // Weighted confidential milestones (FHE.mul) — checked when asked for
  // explicitly (?weighted=1) or when the hash isn't found on either public
  // or v1 confidential contracts.
  const { data: weightedMilestone, isLoading: weightedLoading } = useWeightedConfidentialMilestone(
    milestoneHash,
    weightedMode || (publicMissing && !confidentialMilestone)
  );
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
  const isUnfunded = Boolean(milestone && Number(milestone.totalStaked) === 0);
  const isVerified = Boolean(milestone?.verified);
  const isActive = Boolean(milestone && !milestone.finalized);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const evidenceRoot = milestone?.finalEvidenceRoot && milestone.finalEvidenceRoot !== ZERO_ROOT ? milestone.finalEvidenceRoot : null;
  const verificationProgress = milestone?.verifierCount ? Math.min(100, Math.round((milestone.verifiedVotes / milestone.verifierCount) * 100)) : 0;
  const payoutStatus = isVerified
    ? isUnfunded
      ? "This outcome verified with no capital staked — the proof itself is the payout, minted to the builder's reputation."
      : "This outcome has earned capital release."
    : milestone?.finalized
      ? "This outcome failed the trust threshold and can follow the refund path."
      : isUnfunded
        ? "No capital is staked yet — verification runs regardless, and sponsors can stake until the deadline."
        : "Capital is still locked because the system is not yet confident enough.";
  const demo = statusMilestone?.demo;
  const peerGroup = demo?.tracks.gensyn.bestPeerGroup;
  const keeperhub = demo?.tracks.keeperhub;
  const fal = demo?.tracks.fal;
  const falImageUrl = fal?.available ? (fal.falImageUrl || fal.falCoverUrl || null) : null;

  if (confidentialMilestone) {
    return <ConfidentialMilestoneView hash={milestoneHash} milestone={confidentialMilestone} />;
  }

  if (weightedMilestone) {
    return <WeightedMilestoneView hash={milestoneHash} milestone={weightedMilestone} />;
  }

  if (isLoading || ((confidentialMode || publicMissing) && (confidentialLoading || weightedLoading))) return <ProjectSkeleton />;

  if (error || !milestone || milestone.builder === "0x0000000000000000000000000000000000000000") {
    return (
      <div className={styles.container}>
        <div className={styles.shell}>
          <div className={styles.notFoundWrap}>
            <Breadcrumbs items={[{ label: "Explorer", href: "/explorer" }, { label: `${hash.slice(0, 10)}…${hash.slice(-6)}` }]} />
            <div className={styles.notFoundCard}>
              <div className={styles.notFoundIcon}><AlertTriangle size={28} /></div>
              <span className={styles.notFoundKicker}>Thread not found</span>
              <h2 className={styles.notFoundTitle}>This thread isn&apos;t in the weave yet</h2>
              <p className={styles.notFoundBody}>
                We couldn&apos;t find a milestone at{" "}
                <code className={styles.notFoundHash}>{hash.slice(0, 10)}…{hash.slice(-6)}</code>
                {" "}on any of the three contracts (0G, Sepolia confidential, Sepolia weighted).
                It may not have been created, or the hash may be incomplete.
              </p>
              <div className={styles.notFoundActions}>
                <Link href="/" className={styles.primaryAction}>
                  Back to landing <ArrowUpRight size={16} />
                </Link>
                <Link href="/explorer" className={styles.secondaryAction}>
                  Browse the explorer <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.shell}>
        <section className={styles.heroCard}>
          <div className={styles.heroTop}>
            <Breadcrumbs items={[{ label: "Explorer", href: "/explorer" }, { label: `${hash.slice(0, 10)}…${hash.slice(-6)}` }]} />
            <StatusBadge milestone={milestone} />
          </div>

          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              {/* Agent status — the agent is present, not absent */}
              <div className={styles.agentStatus}>
                <span className={styles.agentAvatar}><Bot size={16} /></span>
                <span className={styles.agentStatusText}>
                  {isVerified
                    ? `Verified — proof minted to ${builderName}. I'm done here.`
                    : milestone?.finalized
                      ? "Verification complete — threshold not met."
                      : isActive
                        ? `Watching for evidence. I'll verify when the deadline passes.`
                        : "Standing by."}
                </span>
              </div>
              {isVerified && !isUnfunded && (
                <div className={styles.agentEconomics}>
                  <span className={styles.agentEconomicsText}>
                    I earned my 3% fee from this release and paid for the verification costs
                    (Kimi, fal.ai, KeeperHub) from my own balance.
                  </span>
                  <Link href="/operations" className={styles.agentEconomicsLink}>
                    See my books →
                  </Link>
                </div>
              )}
              <span className={styles.kicker}>Milestone</span>
              <h1 className={styles.title}>{resolveMilestoneMeta(milestoneHash).name}</h1>
              <p className={styles.identityValue}>{shortHash(milestoneHash, 10, 8)}</p>
              <p className={styles.subtitle}>
                {demo?.pitch || "This page answers the real question: did this builder deliver the outcome they were funded for?"}
              </p>

              <div className={styles.heroActions}>
                <Link href={`/milestone/${milestoneHash}/story`} className={styles.primaryAction}>
                  <BookOpen size={16} />
                  Read the story
                </Link>
                <a href={`${EXPLORER_ADDR}/${milestone.builder}`} target="_blank" rel="noopener noreferrer" className={styles.secondaryAction}>
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
                <span>Verdict</span>
              </div>
              <h2>{isVerified ? "Trust threshold cleared" : milestone.finalized ? "Trust threshold not met" : "Trust still being established"}</h2>
              <p>{payoutStatus}</p>

              <div className={styles.verdictFacts}>
                <div>
                  <span className={styles.verdictFactLabel}>Capital at stake</span>
                  <span className={styles.verdictFactValue}>{stakedEth} ETH</span>
                </div>
                <div>
                  <span className={styles.verdictFactLabel}>Builder</span>
                  <span className={styles.verdictFactValue}>{builderName}</span>
                </div>
                <div>
                  <span className={styles.verdictFactLabel}>Verifier confidence</span>
                  <span className={styles.verdictFactValue}>{milestone.verifiedVotes}/{milestone.verifierCount}</span>
                </div>
                <div>
                  <span className={styles.verdictFactLabel}>Evidence root</span>
                  <span className={styles.verdictFactValueMono}>{evidenceRoot ? `${evidenceRoot.slice(0, 10)}…${evidenceRoot.slice(-8)}` : "Pending"}</span>
                </div>
              </div>

              {!milestone.released && !isUnfunded && addresses.weftMilestone && (
                <div className={styles.verdictAction}>
                  <ReleaseButton
                    milestoneHash={milestoneHash}
                    contractAddress={addresses.weftMilestone}
                    milestone={milestone}
                    demoMode={demoMode}
                  />
                </div>
              )}
              {milestone.released && (
                <div className={styles.verdictReleased}>
                  <CheckCircle2 size={16} />
                  <span>Capital has been distributed.</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {isVerified && (
          <ProofShareCard
            hash={milestoneHash}
            url={shareUrl}
            builderName={builderName}
            stakedEth={stakedEth}
            verifiedVotes={milestone.verifiedVotes}
            verifierCount={milestone.verifierCount}
          />
        )}

        {falImageUrl && (
          <section className={styles.falSwatchSection} aria-label="AI-woven milestone swatch">
            <div className={styles.falSwatchInner}>
              <div className={styles.falSwatchMeta}>
                <span className={styles.falSwatchLabel}>AI-woven milestone swatch</span>
                <p className={styles.falSwatchDesc}>
                  Generated by fal.ai · each verified milestone produces a unique textile image whose visual character is driven by the verification metrics — callers, commits, and peer signers.
                </p>
              </div>
              <div className={styles.falSwatchImageWrap}>
                <img
                  src={falImageUrl}
                  alt="AI-generated woven swatch — visual proof of this milestone's verification metrics"
                  className={styles.falSwatchImage}
                />
                <div className={styles.falSwatchOverlay} />
              </div>
            </div>
          </section>
        )}

        <section className={styles.mainGrid}>
          <div className={styles.primaryColumn}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.kicker}>My read</span>
                  <h3>{isVerified ? "This is a verified outcome" : milestone?.finalized ? "This outcome didn't verify" : "Still establishing trust"}</h3>
                </div>
                <Coins size={18} />
              </div>
              <p className={styles.panelText}>
                {isVerified
                  ? isUnfunded
                    ? "No capital was staked, but the proof itself is the payout — it mints to the builder's reputation permanently. That makes their next milestone worth funding."
                    : "Funds were gated until evidence existed, peer verifiers corroborated the outcome, and I was confident enough to move real capital. The capital has released to the builder."
                  : milestone?.finalized
                    ? "The evidence didn't meet the threshold. Sponsors can reclaim their staked capital through the refund path. Failure is legible here — not hidden behind social ambiguity."
                    : "I'm treating this milestone as a release-or-refund decision. Funds stay gated until evidence exists, peer verifiers corroborate the outcome, and I'm confident enough to move real capital."}
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
                  <span className={styles.kicker}>What I checked</span>
                  <h3>Verification timeline</h3>
                </div>
                <CheckCircle2 size={18} />
              </div>
              <p className={styles.panelText} style={{ marginBottom: "0.5rem" }}>
                {isVerified
                  ? "Here's what I found when I verified this milestone. Each check ran autonomously."
                  : milestone?.finalized
                    ? "Here's what I found. The threshold wasn't met."
                    : "Here's what I'll check when the deadline passes. Some signals are already live."}
              </p>
              <div className={styles.evidenceList}>
                <EvidenceRow
                  label="Contract deployment"
                  passed={milestone.builder !== "0x0000000000000000000000000000000000000000"}
                  detail="Deployed contract exists on 0G chain at the stated address"
                />
                <EvidenceRow
                  label="Unique callers"
                  passed={milestone.verifiedVotes > 0}
                  detail={milestone.verifiedVotes > 0 ? `${milestone.verifiedVotes} unique caller${milestone.verifiedVotes === 1 ? "" : "s"} detected` : "Awaiting usage data"}
                />
                <EvidenceRow
                  label="Verifier quorum"
                  passed={milestone.verifierCount > 0 && milestone.verifiedVotes > 0}
                  detail={milestone.verifierCount > 0 ? `${milestone.verifiedVotes}/${milestone.verifierCount} votes` : "No verifiers assigned"}
                />
                <EvidenceRow
                  label="Final evidence"
                  passed={!!evidenceRoot}
                  detail={evidenceRoot ? "Anchored onchain" : "Not yet published"}
                />
                <EvidenceRow
                  label={isUnfunded ? "Reputation payout" : "Capital release"}
                  passed={isUnfunded ? milestone.verified : milestone.released}
                  detail={
                    isUnfunded
                      ? milestone.verified
                        ? "No stake to move — verified proof minted to the builder's reputation"
                        : "Unfunded run — a verified outcome mints reputation instead of capital"
                      : milestone.released
                        ? "Capital released to builder"
                        : milestone.verified
                          ? "Ready — call release()"
                          : "Locked until verification"
                  }
                />
              </div>
              {evidenceRoot && (
                <div className={styles.codeBlock}>
                  <span className={styles.codeLabel}>Evidence root</span>
                  <code>{evidenceRoot}</code>
                </div>
              )}
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.kicker}>What this changes</span>
                  <h3>Impact on {builderName}&apos;s reputation</h3>
                </div>
                <ArrowUpRight size={18} />
              </div>
              <p className={styles.panelText}>
                {isVerified
                  ? "This verification strengthens the reusable trust graph around this builder. Their next milestone is easier to fund because this proof exists — permanently, portably, tied to their ENS name."
                  : "If this milestone verifies, it strengthens the trust graph around this builder. If it fails, that's useful too — I make failure legible instead of hiding it behind social ambiguity."}
              </p>
              <ShareButtons url={shareUrl} title={`${resolveMilestoneMeta(milestoneHash).name} — ${isVerified ? "verified, capital released" : "in verification"}`} />
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
                  {isUnfunded
                    ? "Be the first to back this outcome. The builder is shipping either way — staking routes capital to them the moment verifiers confirm the work."
                    : "Add capital to the milestone while it is still active. Funds remain governed by Weft's trust loop until the final outcome is known."}
                </p>
                <StakeForm milestoneHash={milestoneHash} contractAddress={addresses.weftMilestone} />
              </article>
            )}

            {milestone.finalized && (
              <VerificationReceipt
                receipt={{
                  milestoneHash,
                  projectId: milestone.projectId,
                  status: milestone.verified ? "verified" : "rejected",
                  released: milestone.released,
                  builder: { name: builderName, address: milestone.builder },
                  stakedEth,
                  quorum: { votes: milestone.verifiedVotes, verifiers: milestone.verifierCount },
                  evidenceRoot,
                  contractAddress: addresses.weftMilestone ?? "",
                  chain: "0G Testnet",
                  createdAt: Number(milestone.createdAt),
                  deadline: Number(milestone.deadline),
                  explorerUrl: addresses.weftMilestone ? `${EXPLORER_ADDR}/${addresses.weftMilestone}` : undefined,
                }}
              />
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
