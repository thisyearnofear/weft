"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { parseEther } from "viem";
import { WeftMilestoneAbi } from "../lib/contracts";
import styles from "./StakeForm.module.css";

interface StakeFormProps {
  milestoneHash: `0x${string}`;
  contractAddress: `0x${string}`;
  onSuccess?: (txHash: string) => void;
}

export function StakeForm({ milestoneHash, contractAddress }: StakeFormProps) {
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    setError(null);
    try {
      writeContract({
        address: contractAddress,
        abi: WeftMilestoneAbi,
        functionName: "stake",
        args: [milestoneHash],
        value: parseEther(amount),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stake failed");
    }
  };

  if (isConfirming || isSuccess) {
    return (
      <div className={styles.container}>
        <div className={styles.success}>
          {isConfirming ? "Confirming stake..." : "Stake successful!"}
        </div>
        {hash && (
          <a
            href={`https://chainscan-new.0g.ai/tx/${hash}`}
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
        <p className={styles.connectPrompt}>Connect wallet to stake</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.container}>
      <div className={styles.inputGroup}>
        <label htmlFor="stake-amount" className="sr-only">Stake amount in ETH</label>
        <input
          id="stake-amount"
          type="number"
          step="0.001"
          min="0.001"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setError(null); }}
          placeholder="0.1"
          className={styles.input}
          aria-label="Stake amount in ETH"
          required
        />
        <span className={styles.suffix}>ETH</span>
      </div>
      <button
        type="submit"
        disabled={isPending || !amount || parseFloat(amount) <= 0}
        className={styles.button}
      >
        {isPending ? <><span className={styles.spinner} />Signing...</> : "Stake ETH"}
      </button>
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
    </form>
  );
}
