import { useMemo } from "react";
import { useMilestone, useMilestones } from "../hooks/useMilestones";
import { Address } from "viem";
import { MILESTONES, type Milestone } from "../lib/mock-data";

export type MilestoneData = Milestone;

export function useMilestoneList() {
  const { data: contractHashes, isLoading, error } = useMilestones();

  const milestones = useMemo(() => {
    if (contractHashes && contractHashes.length > 0) {
      return contractHashes.map((hash, index) => ({
        hash,
        projectName: `Project ${index + 1}`,
        description: `Milestone at ${hash.slice(0, 8)}...`,
        tags: [],
        totalStaked: "0",
        deadline: Math.floor(Date.now() / 1000) + 86400 * 7,
        builder: { ens: "0x0000.eth", address: "0x0000000000000000000000000000000000000000" as Address },
        coBuilders: [],
        verifierCount: 0,
        verifiedVotes: 0,
        state: "pending" as const,
      }));
    }
    return MILESTONES;
  }, [contractHashes]);

  const pendingMilestones = useMemo(
    () => milestones.filter((m) => m.state === "pending"),
    [milestones]
  );

  const completedMilestones = useMemo(
    () => milestones.filter((m) => m.state !== "pending"),
    [milestones]
  );

  return {
    milestones,
    pendingMilestones,
    completedMilestones,
    isLoading,
    error,
  };
}

export function useMilestoneByHash(hash: string) {
  const { data: contractData, isLoading, error } = useMilestone(hash);

  const milestone = useMemo(() => {
    if (contractData) {
      return {
        hash,
        projectName: "Project",
        description: "Milestone details",
        tags: [],
        totalStaked: contractData.totalStaked.toString(),
        deadline: Number(contractData.deadline),
        builder: { ens: "", address: contractData.builder },
        coBuilders: [],
        verifierCount: contractData.verifierCount,
        verifiedVotes: contractData.verifiedVotes,
        state: contractData.verified ? "verified" : contractData.finalized ? "failed" : "pending" as const,
      };
    }
    const found = MILESTONES.find((m) => m.hash === hash);
    return found || null;
  }, [hash, contractData]);

  return { milestone, isLoading, error };
}