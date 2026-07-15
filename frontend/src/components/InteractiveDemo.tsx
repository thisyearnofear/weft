"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, FileCheck2, ShieldCheck, Coins, ArrowRight, Loader2 } from "lucide-react";
import { useStatusMilestone } from "@/hooks/useStatusApi";
import { track } from "@/lib/track";
import styles from "./InteractiveDemo.module.css";

const DEMO_HASH = "0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f";

const BEATS = [
  { key: "locked", label: "Lock", icon: Lock, title: "Capital escrowed" },
  { key: "evidence", label: "Evidence", icon: FileCheck2, title: "Agents gather proof" },
  { key: "consensus", label: "Consensus", icon: ShieldCheck, title: "Verifiers agree" },
  { key: "released", label: "Release", icon: Coins, title: "Capital pays out" },
] as const;

/**
 * Interactive verification demo — the judge steps through the actual
 * verification flow at their own pace, seeing real onchain data at
 * each beat. Replaces the passive hash-paste form with the "aha moment"
 * that makes the product click.
 *
 * On desktop: a horizontal stepper with a detail panel below.
 * On mobile: a vertical stepper with details stacking down.
 *
 * Pulls real data from /api/status/milestone for the demo milestone.
 */
export function InteractiveDemo() {
  const [step, setStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const { data, isLoading } = useStatusMilestone(DEMO_HASH, true);

  const stakedEth = data ? (Number(data.totalStaked) / 1e18).toFixed(4) : "0.01";
  const builderEns = data?.demo?.tracks?.ens?.builderEns || "weft.thisyearnofear.eth";
  const builderShort = data?.builder ? `${data.builder.slice(0, 6)}...${data.builder.slice(-4)}` : "0x...";
  const verifierCount = data?.verifierCount ?? 3;
  const verifiedVotes = data?.verifiedVotes ?? 2;
  const peerCount = data?.demo?.tracks?.gensyn?.bestPeerGroup?.peerCount ?? 3;
  const evidenceRoot = data?.finalEvidenceRoot && data.finalEvidenceRoot !== "0x0000000000000000000000000000000000000000000000000000000000000000"
    ? data.finalEvidenceRoot
    : null;
  const signedSigners = data?.demo?.tracks?.gensyn?.signedConsensusSigners ?? [];

  const evidenceItems = [
    { label: "Contract deployed", detail: data?.projectId ? `Project ${data.projectId.slice(0, 10)}...` : "On 0G Testnet" },
    { label: `${peerCount} peer signers`, detail: signedSigners.length > 0 ? `${signedSigners.length} signed consensus` : "Cross-node corroboration" },
    { label: "GitHub commits verified", detail: "Evidence window matched" },
  ];

  // Auto-advance when "Run" is clicked
  const runVerification = () => {
    if (isRunning) return;
    setIsRunning(true);
    setStep(0);
    const timings = [1200, 1600, 1600, 2000];
    let i = 0;
    const advance = () => {
      i++;
      if (i >= BEATS.length) {
        setIsRunning(false);
        track("interactive_demo_complete");
        return;
      }
      setStep(i);
      setTimeout(advance, timings[i - 1]);
    };
    setTimeout(advance, timings[0]);
  };

  const clickStep = (i: number) => {
    if (isRunning) return;
    setStep(i);
    track("interactive_demo_step_click", { step: i });
  };

  return (
    <div className={styles.wrap}>
      {/* Stepper rail */}
      <div className={styles.rail}>
        {BEATS.map((beat, i) => {
          const Icon = beat.icon;
          const state = i < step ? "done" : i === step ? "active" : "idle";
          return (
            <button
              key={beat.key}
              type="button"
              className={styles.railStep}
              data-state={state}
              onClick={() => clickStep(i)}
              disabled={isRunning}
              aria-label={`${beat.label}: ${beat.title}`}
            >
              <span className={styles.railDot}>
                <Icon size={15} />
              </span>
              <span className={styles.railLabel}>{beat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Detail panel — shows real data for the current beat */}
      <div className={styles.detail} data-beat={BEATS[step].key}>
        {isLoading && (
          <div className={styles.loading}>
            <Loader2 size={20} className={styles.spinner} />
            <span>Loading real milestone data...</span>
          </div>
        )}

        {/* Beat 0: Locked */}
        {step === 0 && (
          <div className={styles.beatContent}>
            <div className={styles.beatHeader}>
              <h3>{stakedEth} ETH locked behind a deliverable</h3>
              <span className={styles.badgePending}>Escrowed</span>
            </div>
            <p className={styles.beatBody}>
              A builder stakes capital into the WeftMilestone contract against a specific
              deliverable. No one — not the builder, not the sponsor, not Weft — can move
              it until verification completes.
            </p>
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>Builder</span>
              <span className={styles.dataValue}>{builderEns}</span>
            </div>
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>Contract</span>
              <span className={styles.dataValueMono}>{builderShort}</span>
            </div>
          </div>
        )}

        {/* Beat 1: Evidence */}
        {step === 1 && (
          <div className={styles.beatContent}>
            <div className={styles.beatHeader}>
              <h3>Autonomous agents collect onchain evidence</h3>
            </div>
            <p className={styles.beatBody}>
              Three independent verifier nodes poll the chain — checking deployments,
              counting unique callers, reading GitHub activity — and sign their findings
              over encrypted P2P.
            </p>
            <div className={styles.evidenceList}>
              {evidenceItems.map((e) => (
                <div key={e.label} className={styles.evidenceChip}>
                  <span className={styles.evidenceCheck}>✓</span>
                  <div>
                    <div className={styles.evidenceLabel}>{e.label}</div>
                    <div className={styles.evidenceDetail}>{e.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Beat 2: Consensus */}
        {step === 2 && (
          <div className={styles.beatContent}>
            <div className={styles.beatHeader}>
              <h3>Verifiers reach consensus</h3>
              <span className={styles.badgeConsensus}>{verifiedVotes}/{verifierCount} agree</span>
            </div>
            <p className={styles.beatBody}>
              The verifier nodes compare their evidence roots over the AXL P2P network.
              When {verifiedVotes} of {verifierCount} agree, the verdict is signed and
              ready for onchain submission.
            </p>
            <div className={styles.nodes}>
              {Array.from({ length: verifierCount }, (_, n) => (
                <span
                  key={n}
                  className={styles.node}
                  data-agreed={n < verifiedVotes}
                >
                  V{n + 1}
                </span>
              ))}
              <span className={styles.quorum}>
                {verifiedVotes}/{verifierCount} quorum reached
              </span>
            </div>
            {signedSigners.length > 0 && (
              <div className={styles.dataRow}>
                <span className={styles.dataLabel}>Signed by</span>
                <span className={styles.dataValueMono}>
                  {signedSigners.length} nodes
                </span>
              </div>
            )}
          </div>
        )}

        {/* Beat 3: Released */}
        {step === 3 && (
          <div className={styles.beatContent}>
            <div className={styles.beatHeader}>
              <h3>Capital released automatically</h3>
              <span className={styles.badgeReleased}>Released</span>
            </div>
            <p className={styles.beatBody}>
              At quorum the contract releases {stakedEth} ETH to {builderEns}.
              The evidence root stays onchain as an auditable receipt (0G Testnet demo).
            </p>
            <div className={styles.payoff}>
              <Coins size={16} />
              <span>{stakedEth} ETH → <strong>{builderEns}</strong></span>
            </div>
            {evidenceRoot && (
              <div className={styles.dataRow}>
                <span className={styles.dataLabel}>Evidence root</span>
                <span className={styles.dataValueMono}>{evidenceRoot.slice(0, 18)}...</span>
              </div>
            )}
            <Link
              href={`/project/${DEMO_HASH}`}
              className={styles.proofLink}
              onClick={() => track("interactive_demo_see_proof")}
            >
              See this exact proof onchain <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>

      {/* Run control */}
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.runBtn}
          onClick={runVerification}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <Loader2 size={15} className={styles.spinner} />
              Verifying...
            </>
          ) : step === 3 && !isRunning ? (
            <>
              <ArrowRight size={15} />
              Run it again
            </>
          ) : (
            <>
              <ArrowRight size={15} />
              Run the verification
            </>
          )}
        </button>
        <span className={styles.hint}>
          Or click a step to jump there
        </span>
      </div>
    </div>
  );
}
