"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { keccak256, encodePacked, stringToHex } from "viem";
import { WeftMilestoneAbi, getAddresses, DEFAULT_CHAIN } from "../lib/contracts";
import styles from "./StakeForm.module.css";

const TEMPLATE_ID = "0x" + "00".repeat(32);
const EXPLORER_TX = "https://chainscan-new.0g.ai/tx";

export function CreateMilestoneForm({ onCreated }: { onCreated?: (hash: string) => void }) {
  const { isConnected, address } = useAccount();
  const [step, setStep] = useState<"form" | "preview" | "done">("form");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deadlineDays, setDeadlineDays] = useState(14);
  const [confidential, setConfidential] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [milestoneHash, setMilestoneHash] = useState<string | null>(null);

  const addresses = getAddresses(DEFAULT_CHAIN);

  const projectId = name ? keccak256(stringToHex(name)) : ("0x" + "00".repeat(32));
  const deadlineUnix = BigInt(Math.floor(Date.now() / 1000) + deadlineDays * 86400);
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

  const handleCreate = async () => {
    if (!addresses.weftMilestone) return;
    setError(null);
    try {
      writeContract({
        address: addresses.weftMilestone,
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
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation failed");
    }
  };

  if (step === "done" && milestoneHash) {
    return (
      <div className={styles.container}>
        <div className={styles.success}>
          Milestone created successfully!
        </div>
        <p className={styles.doneHash}>
          Hash: <code>{milestoneHash}</code>
        </p>
        <a
          href={`/project/${milestoneHash}`}
          className={`${styles.link} ${styles.linkBold}`}
        >
          View milestone →
        </a>
      </div>
    );
  }

  if (isConfirming || isSuccess) {
    if (isSuccess && txHash && !milestoneHash) {
      setMilestoneHash(computedHash);
      setStep("done");
      onCreated?.(computedHash);
    }
    return (
      <div className={styles.container}>
        <div className={styles.success}>
          {isConfirming ? "Confirming transaction..." : "Transaction submitted!"}
        </div>
        {txHash && (
          <a
            href={`${EXPLORER_TX}/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            View on 0G Explorer
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
            <span className={styles.previewLabel}>Project Name</span>
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
              {new Date(Number(deadlineUnix) * 1000).toLocaleDateString("en-US", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          </div>
          <div>
            <span className={styles.previewLabel}>Milestone Hash</span>
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
            disabled={isPending || !addresses.weftMilestone}
            className={`${styles.button} ${styles.buttonFlex}`}
          >
            {isPending ? "Signing..." : "Create Milestone"}
          </button>
        </div>
        {error && <div className={styles.error}>{error}</div>}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); setStep("preview"); }}
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
            Sealed-ballot verifier consensus + encrypted stake amounts (Zama FHE)
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
