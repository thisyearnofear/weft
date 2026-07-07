"use client";

import { useState } from "react";
import Link from "next/link";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { keccak256, encodePacked, stringToHex } from "viem";
import { Bot, ArrowRight, Lock, Globe, Shield, Clock, Check, Loader2, Eye, EyeOff } from "lucide-react";
import { WeftMilestoneAbi, WeftMilestoneConfidentialAbi, getAddresses, getConfidentialAddress, DEFAULT_CHAIN } from "../lib/contracts";
import { rememberMilestoneName } from "../lib/milestone-meta";
import { track } from "../lib/track";
import styles from "./AgentBriefWizard.module.css";

const TEMPLATE_ID = "0x" + "00".repeat(32);
const EXPLORER_TX = "https://chainscan-new.0g.ai/tx";
const SEPOLIA_EXPLORER_TX = "https://sepolia.etherscan.io/tx";
const DEMO_DEADLINE = 0; // sentinel: 10-minute deadline for confidential demo

type WizardStep = 0 | 1 | 2 | 3 | "creating" | "done";

export function AgentBriefWizard({ onCreated }: { onCreated?: (hash: string) => void }) {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const [step, setStep] = useState<WizardStep>(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deadlineDays, setDeadlineDays] = useState(14);
  const [confidential, setConfidential] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [milestoneHash, setMilestoneHash] = useState<string | null>(null);
  const [deadlineUnix, setDeadlineUnix] = useState<bigint>(BigInt(0));

  const confidentialAddress = getConfidentialAddress();
  const addresses = getAddresses(DEFAULT_CHAIN);
  const targetAddress = confidential ? confidentialAddress : addresses.weftMilestone;

  const projectId = name ? keccak256(stringToHex(name)) : ("0x" + "00".repeat(32));
  const metadataHash = description
    ? keccak256(stringToHex(description.slice(0, 256)))
    : ("0x" + "00".repeat(32));

  const computedHash = keccak256(
    encodePacked(
      ["bytes32", "bytes32", "uint64", "bytes32"],
      [projectId as `0x${string}`, TEMPLATE_ID as `0x${string}`, deadlineUnix, metadataHash as `0x${string}`]
    )
  );

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // ── Step transitions ──
  const goToStep = (s: WizardStep) => {
    setStep(s);
    track("wizard_step", { step: String(s) });
  };

  const handleCreate = async () => {
    if (!targetAddress) return;
    setError(null);
    setStep("creating");
    try {
      if (confidential && chainId !== sepolia.id) {
        await switchChainAsync({ chainId: sepolia.id });
      }
      writeContract(
        confidential
          ? {
              chainId: sepolia.id,
              address: targetAddress,
              abi: WeftMilestoneConfidentialAbi,
              functionName: "createMilestone",
              args: [
                computedHash,
                projectId as `0x${string}`,
                TEMPLATE_ID as `0x${string}`,
                deadlineUnix,
                metadataHash as `0x${string}`,
                [{ wallet: address, shareBps: 10_000 }],
              ],
            }
          : {
              address: targetAddress,
              abi: WeftMilestoneAbi,
              functionName: "createMilestone",
              args: [
                computedHash,
                projectId as `0x${string}`,
                TEMPLATE_ID as `0x${string}`,
                deadlineUnix,
                metadataHash as `0x${string}`,
                [],
              ],
            }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation failed");
      setStep(3);
    }
  };

  // ── Transaction confirmation ──
  if (isConfirming || isSuccess) {
    if (isSuccess && txHash && !milestoneHash) {
      rememberMilestoneName(computedHash, name, description || undefined);
      setMilestoneHash(computedHash);
      setStep("done");
      onCreated?.(computedHash);
    }
    if (step === "creating" || step === "done") {
      return (
        <div className={styles.wrap}>
          <AgentMessage>
            {isConfirming ? "Confirming your milestone onchain..." : "Milestone live."}
          </AgentMessage>
          {txHash && (
            <a
              href={`${confidential ? SEPOLIA_EXPLORER_TX : EXPLORER_TX}/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.txLink}
            >
              {confidential ? "View on Sepolia Etherscan" : "View on 0G Explorer"} →
            </a>
          )}
          {isConfirming && (
            <div className={styles.confirmingLoader}>
              <Loader2 size={18} className={styles.spinner} />
              <span>Waiting for block confirmation...</span>
            </div>
          )}
        </div>
      );
    }
  }

  // ── Done state ──
  if (step === "done" && milestoneHash) {
    const deadlineDate = new Date(Number(deadlineUnix) * 1000);
    return (
      <div className={styles.wrap}>
        <div className={styles.doneAgent}>
          <AgentAvatar />
          <div className={styles.doneAgentBody}>
            <p className={styles.agentLine}>
              I&apos;m now watching for <strong>{name}</strong>.
            </p>
            <p className={styles.agentLine}>
              I&apos;ll verify the moment your deadline passes on{" "}
              <strong>{deadlineDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</strong>.
              You&apos;ll get a proof at your ENS name — even if no sponsor stakes.
            </p>
            <p className={styles.agentLineMuted}>
              Share the link below with sponsors to get funded, or just ship.
              I&apos;ll handle the rest.
            </p>
          </div>
        </div>

        <div className={styles.doneHash}>
          <span className={styles.doneHashLabel}>Milestone hash</span>
          <code>{milestoneHash}</code>
        </div>

        <Link
          href={`/project/${milestoneHash}${confidential ? "?confidential=1" : ""}`}
          className={styles.doneCta}
        >
          View your milestone <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  // ── Not connected ──
  if (!isConnected) {
    return (
      <div className={styles.wrap}>
        <AgentMessage>
          Connect your wallet to start briefing me on what you&apos;ll ship.
        </AgentMessage>
      </div>
    );
  }

  // ── Compute deadline display ──
  const deadlineSeconds = deadlineDays === DEMO_DEADLINE ? 10 * 60 : deadlineDays * 86400;
  const deadlineDate = new Date(Date.now() + deadlineSeconds * 1000);
  const deadlineLabel = deadlineDays === DEMO_DEADLINE
    ? "10 minutes (demo — sealed ballots open quickly)"
    : deadlineDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className={styles.wrap}>
      {/* Progress dots */}
      <div className={styles.progress} aria-hidden="true">
        {[0, 1, 2, 3].map((i) => {
          const stepNum = typeof step === "number" ? step : 4;
          return (
            <span
              key={i}
              className={styles.progressDot}
              data-state={i < stepNum ? "done" : i === stepNum ? "active" : "idle"}
            />
          );
        })}
      </div>

      {/* ── Step 0: What are you building? ── */}
      {step === 0 && (
        <div className={styles.step} key="step0">
          <AgentMessage>
            What are you building?
          </AgentMessage>
          <p className={styles.agentSubtext}>
            Give your project a name. I&apos;ll use it to track what you ship.
          </p>

          <div className={styles.inputGroup}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My App v2"
              className={styles.input}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) goToStep(1); }}
            />
          </div>

          <div className={styles.inputGroup}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will you ship? (optional — helps me know what evidence to look for)"
              className={`${styles.input} ${styles.textarea}`}
              rows={3}
            />
          </div>

          <button
            type="button"
            className={styles.stepBtn}
            disabled={!name.trim()}
            onClick={() => goToStep(1)}
          >
            Continue <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* ── Step 1: When will it be ready? ── */}
      {step === 1 && (
        <div className={styles.step} key="step1">
          <AgentMessage>
            {name.trim()} — got it.
            {description.trim() && " I'll use your description to understand what evidence to look for."}
            {" "}When will it be ready?
          </AgentMessage>
          <p className={styles.agentSubtext}>
            I&apos;ll start verifying on this date. If you ship before then,
            evidence collection starts immediately.
          </p>

          <div className={styles.deadlineOptions}>
            {confidential && (
              <button
                type="button"
                className={styles.deadlineOption}
                data-selected={deadlineDays === DEMO_DEADLINE}
                onClick={() => setDeadlineDays(DEMO_DEADLINE)}
              >
                <Clock size={16} />
                <div>
                  <div className={styles.deadlineOptionLabel}>10 minutes</div>
                  <div className={styles.deadlineOptionHint}>Demo — sealed ballots open fast</div>
                </div>
              </button>
            )}
            {[
              { days: 7, label: "7 days" },
              { days: 14, label: "14 days" },
              { days: 30, label: "30 days" },
              { days: 60, label: "60 days" },
            ].map((opt) => (
              <button
                key={opt.days}
                type="button"
                className={styles.deadlineOption}
                data-selected={deadlineDays === opt.days}
                onClick={() => setDeadlineDays(opt.days)}
              >
                <Clock size={16} />
                <div>
                  <div className={styles.deadlineOptionLabel}>{opt.label}</div>
                  <div className={styles.deadlineOptionHint}>
                    Verify on {new Date(Date.now() + opt.days * 86400 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className={styles.stepActions}>
            <button type="button" className={styles.backBtn} onClick={() => goToStep(0)}>
              Back
            </button>
            <button type="button" className={styles.stepBtn} onClick={() => goToStep(2)}>
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Public or confidential? ── */}
      {step === 2 && (
        <div className={styles.step} key="step2">
          <AgentMessage>
            Should verification be public or confidential?
          </AgentMessage>
          <p className={styles.agentSubtext}>
            This affects how verifier votes are recorded onchain.
          </p>

          <div className={styles.privacyCards}>
            <button
              type="button"
              className={styles.privacyCard}
              data-selected={!confidential}
              onClick={() => setConfidential(false)}
            >
              <Globe size={20} className={styles.privacyIcon} />
              <div className={styles.privacyTitle}>Public</div>
              <div className={styles.privacyDesc}>
                Verifier votes are visible onchain. Anyone can see who verified and how they voted.
              </div>
            </button>

            <button
              type="button"
              className={styles.privacyCard}
              data-selected={confidential}
              onClick={() => setConfidential(true)}
            >
              <Lock size={20} className={styles.privacyIcon} />
              <div className={styles.privacyTitle}>Confidential</div>
              <div className={styles.privacyDesc}>
                Votes encrypted with Zama FHE — only the consensus result is revealed. Individual votes never decrypted.
              </div>
              <div className={styles.privacyBadge}>Sepolia</div>
            </button>
          </div>

          <div className={styles.stepActions}>
            <button type="button" className={styles.backBtn} onClick={() => goToStep(1)}>
              Back
            </button>
            <button type="button" className={styles.stepBtn} onClick={() => {
              setDeadlineUnix(BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds));
              goToStep(3);
            }}>
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Here's what I'll do ── */}
      {step === 3 && (
        <div className={styles.step} key="step3">
          <AgentMessage>
            Here&apos;s my plan for <strong>{name}</strong>.
          </AgentMessage>

          <div className={styles.plan}>
            <div className={styles.planItem}>
              <span className={styles.planIcon}><Clock size={14} /></span>
              <div>
                <div className={styles.planLabel}>Deadline</div>
                <div className={styles.planValue}>{deadlineLabel}</div>
              </div>
            </div>

            <div className={styles.planItem}>
              <span className={styles.planIcon}><Eye size={14} /></span>
              <div>
                <div className={styles.planLabel}>What I&apos;ll check</div>
                <div className={styles.planValue}>
                  Contract deployment, unique callers, GitHub commits in the milestone window
                </div>
              </div>
            </div>

            <div className={styles.planItem}>
              <span className={styles.planIcon}><Shield size={14} /></span>
              <div>
                <div className={styles.planLabel}>Consensus</div>
                <div className={styles.planValue}>
                  {confidential
                    ? "3 verifier nodes, sealed-ballot with Zama FHE on Sepolia"
                    : "3 verifier nodes, 2-of-3 consensus on 0G Chain"}
                </div>
              </div>
            </div>

            <div className={styles.planItem}>
              <span className={styles.planIcon}><Check size={14} /></span>
              <div>
                <div className={styles.planLabel}>If verified</div>
                <div className={styles.planValue}>
                  Proof mints to your ENS name. Any staked capital releases to you the same moment.
                  No sponsor? You still get a permanent, portable proof that you shipped.
                </div>
              </div>
            </div>
          </div>

          <div className={styles.planHash}>
            <span className={styles.planHashLabel}>Milestone hash</span>
            <code>{computedHash}</code>
          </div>

          <div className={styles.stepActions}>
            <button type="button" className={styles.backBtn} onClick={() => goToStep(2)}>
              Back
            </button>
            <button
              type="button"
              className={styles.stepBtn}
              onClick={handleCreate}
              disabled={isPending || !targetAddress}
            >
              {isPending ? (
                <><Loader2 size={16} className={styles.spinner} /> Signing...</>
              ) : confidential ? (
                <><Bot size={16} /> Create on Sepolia — I&apos;ll start watching</>
              ) : (
                <><Bot size={16} /> Create milestone — I&apos;ll start watching</>
              )}
            </button>
          </div>

          {confidential && !confidentialAddress && (
            <div className={styles.error}>Confidential contract not configured for Sepolia yet.</div>
          )}
          {error && <div className={styles.error}>{error}</div>}
        </div>
      )}
    </div>
  );
}

// ── Agent visual elements ──

function AgentAvatar() {
  return (
    <div className={styles.agentAvatar}>
      <Bot size={20} />
    </div>
  );
}

function AgentMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.agentMessage}>
      <AgentAvatar />
      <div className={styles.agentText}>{children}</div>
    </div>
  );
}
