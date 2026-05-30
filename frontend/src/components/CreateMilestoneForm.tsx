"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { keccak256, encodePacked, toHex, pad, stringToHex, hexToBytes } from "viem";
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
        <p style={{ fontSize: "0.85rem", color: "var(--c-text-secondary)", textAlign: "center" }}>
          Hash: <code style={{ wordBreak: "break-all" }}>{milestoneHash}</code>
        </p>
        <a
          href={`/project/${milestoneHash}`}
          className={styles.link}
          style={{ fontWeight: 600 }}
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
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div>
            <span style={{ color: "var(--c-text-muted)", fontSize: "0.78rem", textTransform: "uppercase" }}>
              Project Name
            </span>
            <p style={{ fontWeight: 600 }}>{name}</p>
          </div>
          {description && (
            <div>
              <span style={{ color: "var(--c-text-muted)", fontSize: "0.78rem", textTransform: "uppercase" }}>
                Description
              </span>
              <p style={{ color: "var(--c-text-secondary)", fontSize: "0.9rem" }}>{description}</p>
            </div>
          )}
          <div>
            <span style={{ color: "var(--c-text-muted)", fontSize: "0.78rem", textTransform: "uppercase" }}>
              Deadline
            </span>
            <p style={{ fontWeight: 600 }}>
              {new Date(Number(deadlineUnix) * 1000).toLocaleDateString("en-US", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          </div>
          <div>
            <span style={{ color: "var(--c-text-muted)", fontSize: "0.78rem", textTransform: "uppercase" }}>
              Milestone Hash
            </span>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", wordBreak: "break-all" }}>
              {computedHash}
            </p>
          </div>
          <div>
            <span style={{ color: "var(--c-text-muted)", fontSize: "0.78rem", textTransform: "uppercase" }}>
              Builder
            </span>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>{address}</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
          <button
            onClick={() => setStep("form")}
            className={styles.button}
            style={{ background: "var(--c-border-2)", flex: 1 }}
          >
            Edit
          </button>
          <button
            onClick={handleCreate}
            disabled={isPending || !addresses.weftMilestone}
            className={styles.button}
            style={{ flex: 1 }}
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
          className={styles.input}
          style={{ minHeight: "80px", resize: "vertical", fontFamily: "inherit" }}
          rows={3}
        />
      </div>

      <div className={styles.inputGroup}>
        <select
          value={deadlineDays}
          onChange={(e) => setDeadlineDays(Number(e.target.value))}
          className={styles.input}
          style={{ cursor: "pointer" }}
        >
          <option value={7}>Deadline: 7 days</option>
          <option value={14}>Deadline: 14 days</option>
          <option value={30}>Deadline: 30 days</option>
          <option value={60}>Deadline: 60 days</option>
        </select>
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
