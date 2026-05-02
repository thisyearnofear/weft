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
  finalEvidenceRoot: string;
}

export interface VerifierInfo {
  addr: Address;
  ens: string;
  authorized: boolean;
}

const MILESTONE_QUERY_KEYS = {
  all: ["milestones"] as const,
  detail: (milestoneHash: string) => ["milestones", milestoneHash] as const,
  evidence: (milestoneHash: string, verifier: Address) => ["milestones", milestoneHash, "evidence", verifier] as const,
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
      // viem returns multi-output as array: [projectId, templateId, metadataHash, builder, ...]
      const r = result as unknown[];
      if (!r || !Array.isArray(r) || r.length < 13) throw new Error("Invalid milestone data");
      const m: Milestone = {
        projectId: r[0] as string,
        templateId: r[1] as string,
        metadataHash: r[2] as string,
        builder: r[3] as Address,
        createdAt: r[4] as bigint,
        deadline: r[5] as bigint,
        totalStaked: r[6] as bigint,
        finalized: r[7] as boolean,
        verified: r[8] as boolean,
        released: r[9] as boolean,
        verifierCount: Number(r[10]),
        verifiedVotes: Number(r[11]),
        finalEvidenceRoot: r[12] as string,
      };
      if (!m.builder || m.builder === "0x0000000000000000000000000000000000000000") throw new Error("Empty milestone");
      return m;
    },
    enabled: !!milestoneHash,
    retry: false,
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
      const logs = await client.getLogs({
        address: addresses.weftMilestone,
        fromBlock: BigInt(0),
        toBlock: "latest",
        event: {
          type: "event",
          name: "MilestoneCreated",
          inputs: [
            { type: "bytes32", name: "milestoneHash", indexed: true },
            { type: "bytes32", name: "projectId", indexed: true },
            { type: "address", name: "builder", indexed: true },
            { type: "bytes32", name: "templateId" },
            { type: "uint256", name: "deadline" },
            { type: "bytes32", name: "metadataHash" },
          ],
        },
      });
      return logs.map((log) => log.args.milestoneHash as `0x${string}`);
    },
    retry: false,
  });
}

export function useMilestoneEvidence(milestoneHash: string, verifier: Address) {
  const client = usePublicClient();

  return useQuery({
    queryKey: MILESTONE_QUERY_KEYS.evidence(milestoneHash, verifier),
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
        args: [milestoneHash as `0x${string}`, verifier],
      });
      return result;
    },
    enabled: !!milestoneHash && !!verifier,
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
