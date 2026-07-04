"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { keccak256, encodePacked, stringToHex } from "viem";
import { WeftMilestoneAbi, WeftMilestoneConfidentialAbi, getAddresses, getConfidentialAddress, DEFAULT_CHAIN } from "../lib/contracts";
import { rememberMilestoneName } from "../lib/milestone-meta";
import { track } from "../lib/track";
import styles from "./StakeForm.module.css";

const TEMPLATE_ID = "0x" + "00".repeat(32);
const EXPLORER_TX = "https://chainscan-new.0g.ai/tx";
const SEPOLIA_EXPLORER_TX = "https://sepolia.etherscan.io/tx";
const DEMO_DEADLINE = 0; // sentinel: 10-minute deadline so sealed ballots open quickly

export function CreateMilestoneForm({ onCreated }: { onCreated?: (hash: string) => void }) {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const [step, setStep] = useState<"form" | "preview" | "done">("form");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deadlineDays, setDeadlineDays] = useState(14);
  const [confidential, setConfidential] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [milestoneHash, setMilestoneHash] = useState<string | null>(null);
  // Frozen when entering preview so the displayed hash matches the one submitted
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

  const enterPreview = () => {
    const seconds = deadlineDays === DEMO_DEADLINE ? 10 * 60 : deadlineDays * 86400;
    setDeadlineUnix(BigInt(Math.floor(Date.now() / 1000) + seconds));
    setStep("preview");
    track("create_started");
  };

  const handleCreate = async () => {
    if (!targetAddress) return;
    setError(null);
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
                // Confidential contract requires at least one payout split
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
    }
  };

  if (step === "done" && milestoneHash) {
    return (
      <div className={styles.container}>
        <div className={styles.success}>
          {confidential ? "Confidential milestone created on Sepolia." : "Milestone created."}
        </div>
        <p className={styles.doneHash}>
          Hash: <code>{milestoneHash}</code>
        </p>
        <p className={styles.doneHash}>
          Share the milestone link with sponsors to get it funded — or just ship:
          verification runs either way, and a verified outcome mints reputation to
          your ENS name even with zero stake.
        </p>
        <a
          href={`/project/${milestoneHash}${confidential ? "?confidential=1" : ""}`}
          className={`${styles.link} ${styles.linkBold}`}
        >
          View milestone →
        </a>
      </div>
    );
  }

  if (isConfirming || isSuccess) {
    if (isSuccess && txHash && !milestoneHash) {
      rememberMilestoneName(computedHash, name, description || undefined);
      setMilestoneHash(computedHash);
      setStep("done");
      onCreated?.(computedHash);
    }
    return (
      <div className={styles.container}>
        <div className={styles.success}>
          {isConfirming ? "Confirming transaction..." : "Transaction submitted."}
        </div>
        {txHash && (
          <a
            href={`${confidential ? SEPOLIA_EXPLORER_TX : EXPLORER_TX}/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            {confidential ? "View on Sepolia Etherscan" : "View on 0G Explorer"}
          </a>
        )}
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className={styles.container}>
        <p className={styles.connectPrompt}>Connect wallet to create a milestone</p>
      </div>
    );
  }

  if (step === "preview") {
    return (
      <div className={styles.container}>
        <div className={styles.previewGroup}>
          <div>
            <span className={styles.previewLabel}>Project name</span>
            <p className={styles.previewValue}>{name}</p>
          </div>
          {description && (
            <div>
              <span className={styles.previewLabel}>Description</span>
              <p className={styles.previewValueMuted}>{description}</p>
            </div>
          )}
          <div>
            <span className={styles.previewLabel}>Deadline</span>
            <p className={styles.previewValue}>
              {new Date(Number(deadlineUnix) * 1000).toLocaleString("en-US", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
                hour: "numeric", minute: "2-digit",
              })}
            </p>
          </div>
          {confidential && (
            <div>
              <span className={styles.previewLabel}>Privacy</span>
              <p className={styles.previewValue}>
                Confidential — sealed-ballot verification on Sepolia (Zama FHE)
              </p>
            </div>
          )}
          <div>
            <span className={styles.previewLabel}>Milestone hash</span>
            <p className={styles.previewValueMono}>{computedHash}</p>
          </div>
          <div>
            <span className={styles.previewLabel}>Builder</span>
            <p className={styles.previewValueMono}>{address}</p>
          </div>
        </div>

        <div className={styles.previewActions}>
          <button
            onClick={() => setStep("form")}
            className={`${styles.button} ${styles.buttonSecondary}`}
          >
            Edit
          </button>
          <button
            onClick={handleCreate}
            disabled={isPending || !targetAddress}
            className={`${styles.button} ${styles.buttonFlex}`}
          >
            {isPending ? "Signing..." : confidential ? "Create on Sepolia" : "Create Milestone"}
          </button>
        </div>
        {confidential && !confidentialAddress && (
          <div className={styles.error}>Confidential contract not configured for Sepolia yet.</div>
        )}
        {error && <div className={styles.error}>{error}</div>}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); enterPreview(); }}
      className={styles.container}
    >
      <div className={styles.inputGroup}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name (e.g. My App v2)"
          className={styles.input}
          required
        />
      </div>

      <div className={styles.inputGroup}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of what you'll ship (optional)"
          className={`${styles.input} ${styles.textarea}`}
          rows={3}
        />
      </div>

      <div className={styles.inputGroup}>
        <select
          value={deadlineDays}
          onChange={(e) => setDeadlineDays(Number(e.target.value))}
          className={`${styles.input} ${styles.select}`}
        >
          {confidential && <option value={DEMO_DEADLINE}>Deadline: 10 minutes (demo)</option>}
          <option value={7}>Deadline: 7 days</option>
          <option value={14}>Deadline: 14 days</option>
          <option value={30}>Deadline: 30 days</option>
          <option value={60}>Deadline: 60 days</option>
        </select>
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={confidential}
            onChange={(e) => setConfidential(e.target.checked)}
            className={styles.checkbox}
          />
          Make this milestone confidential
          <span className={styles.checkboxHint}>
            Sealed-ballot verifier consensus on Sepolia — individual votes encrypted with Zama FHE, never revealed
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={!name.trim()}
        className={styles.button}
      >
        Review Milestone
      </button>
    </form>
  );
}
