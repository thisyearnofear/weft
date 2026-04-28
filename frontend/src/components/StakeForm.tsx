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

export function StakeForm({ milestoneHash, contractAddress, onSuccess }: StakeFormProps) {
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState("");
  const [isPending, setIsPending] = useState(false);

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    setIsPending(true);
    try {
      writeContract({
        address: contractAddress,
        abi: WeftMilestoneAbi,
        functionName: "stake",
        args: [milestoneHash],
        value: parseEther(amount),
      });
    } catch (err) {
      console.error("Stake failed:", err);
      setIsPending(false);
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
            href={`https://basescan.org/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            View on Basescan
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
        <input
          type="number"
          step="0.001"
          min="0.001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.1"
          className={styles.input}
          required
        />
        <span className={styles.suffix}>ETH</span>
      </div>
      <button
        type="submit"
        disabled={isPending || !amount || parseFloat(amount) <= 0}
        className={styles.button}
      >
        {isPending ? "Signing..." : "Stake ETH"}
      </button>
    </form>
  );
}