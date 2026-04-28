import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { Address } from "viem";
import { DEFAULT_CHAIN, getAddresses, WeftMilestoneAbi, VerifierRegistryAbi } from "../lib/contracts";

export interface Milestone {
  projectId: string;
  templateId: string;
  metadataHash: string;
  builder: Address;
  createdAt: bigint;
  deadline: bigint;
  totalStaked: bigint;
  finalized: boolean;
  verified: boolean;
  released: boolean;
  verifierCount: number;
  verifiedVotes: number;
  rejectedVotes: number;
  evidenceRoot: string;
}

export interface VerifierInfo {
  addr: Address;
  ens: string;
  authorized: boolean;
}

const MILESTONE_QUERY_KEYS = {
  all: ["milestones"] as const,
  detail: (milestoneHash: string) => ["milestones", milestoneHash] as const,
  evidence: (milestoneHash: string) => ["milestones", milestoneHash, "evidence"] as const,
  allByVerifier: (verifier: Address) => ["milestones", "byVerifier", verifier] as const,
  verifiers: ["verifiers"] as const,
  verifier: (verifier: Address) => ["verifiers", verifier] as const,
};

export function useMilestone(milestoneHash: string) {
  const client = usePublicClient();

  return useQuery({
    queryKey: MILESTONE_QUERY_KEYS.detail(milestoneHash),
    queryFn: async () => {
      if (!client) throw new Error("No public client");
      const addresses = getAddresses(DEFAULT_CHAIN);
      if (!addresses.weftMilestone) {
        throw new Error("WeftMilestone not configured");
      }
      const result = await client.readContract({
        address: addresses.weftMilestone,
        abi: WeftMilestoneAbi,
        functionName: "milestones",
        args: [milestoneHash as `0x${string}`],
      });
      return result as Milestone;
    },
    enabled: !!milestoneHash,
  });
}

export function useMilestones() {
  const client = usePublicClient();

  return useQuery({
    queryKey: MILESTONE_QUERY_KEYS.all,
    queryFn: async () => {
      if (!client) throw new Error("No public client");
      const addresses = getAddresses(DEFAULT_CHAIN);
      if (!addresses.weftMilestone) {
        throw new Error("WeftMilestone not configured");
      }
      const count = await client.readContract({
        address: addresses.weftMilestone,
        abi: WeftMilestoneAbi,
        functionName: "milestoneCount",
      });
      const hashes = await client.readContract({
        address: addresses.weftMilestone,
        abi: WeftMilestoneAbi,
        functionName: "milestoneHashes",
        args: [BigInt(0), count as bigint],
      });
      return hashes as `0x${string}`[];
    },
  });
}

export function useMilestoneEvidence(milestoneHash: string) {
  const client = usePublicClient();

  return useQuery({
    queryKey: MILESTONE_QUERY_KEYS.evidence(milestoneHash),
    queryFn: async () => {
      if (!client) throw new Error("No public client");
      const addresses = getAddresses(DEFAULT_CHAIN);
      if (!addresses.weftMilestone) {
        throw new Error("WeftMilestone not configured");
      }
      const result = await client.readContract({
        address: addresses.weftMilestone,
        abi: WeftMilestoneAbi,
        functionName: "evidenceByVerifier",
        args: [milestoneHash as `0x${string}`],
      });
      return result;
    },
    enabled: !!milestoneHash,
  });
}

export function useVerifiers() {
  const client = usePublicClient();

  return useQuery({
    queryKey: MILESTONE_QUERY_KEYS.verifiers,
    queryFn: async () => {
      if (!client) throw new Error("No public client");
      const addresses = getAddresses(DEFAULT_CHAIN);
      if (!addresses.verifierRegistry) {
        throw new Error("VerifierRegistry not configured");
      }
      const count = await client.readContract({
        address: addresses.verifierRegistry,
        abi: VerifierRegistryAbi,
        functionName: "verifierCount",
      });
      const verifiers = await client.readContract({
        address: addresses.verifierRegistry,
        abi: VerifierRegistryAbi,
        functionName: "verifiers",
        args: [BigInt(0), count as bigint],
      });
      return verifiers as VerifierInfo[];
    },
  });
}

export function useVerifier(verifier: Address) {
  const client = usePublicClient();

  return useQuery({
    queryKey: MILESTONE_QUERY_KEYS.verifier(verifier),
    queryFn: async () => {
      if (!client) throw new Error("No public client");
      const addresses = getAddresses(DEFAULT_CHAIN);
      if (!addresses.verifierRegistry) {
        throw new Error("VerifierRegistry not configured");
      }
      const result = await client.readContract({
        address: addresses.verifierRegistry,
        abi: VerifierRegistryAbi,
        functionName: "verifiers",
        args: [BigInt(0), BigInt(1)],
      });
      return result as VerifierInfo;
    },
    enabled: !!verifier,
  });
}