import { useMutation, useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { Address } from "viem";
import { getWeightedConfidentialAddress, WeftMilestoneConfidentialWeightedAbi } from "../lib/contracts";
import { queryDefaults } from "@/lib/queryConfig";

/// Confidence-weighted confidential milestone on Sepolia (Zama FHEVM).
/// Same sealed-ballot pattern as v1, but each verifier also encrypts a
/// confidence score (1-100). The contract computes
///   weightedVote = FHE.mul(ballot, confidence)
///   weightedTally = FHE.add(weightedTally, weightedVote)
/// on ciphertext — FHE multiplication, not just addition.
///
/// The struct has 16 fields (v1 has 15) — `weightedTally` (euint32) is
/// inserted at index 12, shifting finalEvidenceRoot/resultConfirmed/
/// resultVerified by one position.
export interface WeightedConfidentialMilestone {
  projectId: string;
  templateId: string;
  metadataHash: string;
  builder: Address;
  createdAt: bigint;
  deadline: bigint;
  totalStaked: bigint;
  finalized: boolean;
  verifiedHandle: `0x${string}`;
  released: boolean;
  verifierCount: number;
  verifiedVotesHandle: `0x${string}`;
  weightedTallyHandle: `0x${string}`;
  finalEvidenceRoot: string;
  resultConfirmed: boolean;
  resultVerified: boolean;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const WEIGHTED_QUERY_KEYS = {
  detail: (milestoneHash: string) => ["weightedConfidentialMilestones", milestoneHash] as const,
};

export function useWeightedConfidentialMilestone(milestoneHash: string, enabled = true) {
  const client = usePublicClient({ chainId: sepolia.id });

  return useQuery({
    ...queryDefaults,
    queryKey: WEIGHTED_QUERY_KEYS.detail(milestoneHash),
    enabled: enabled && !!client,
    refetchInterval: (query) =>
      query.state.data && !query.state.data.finalized ? 8000 : false,
    queryFn: async () => {
      if (!client) throw new Error("No Sepolia client");
      const address = getWeightedConfidentialAddress();
      if (!address) throw new Error("WeftMilestoneConfidentialWeighted not configured");
      const r = (await client.readContract({
        address,
        abi: WeftMilestoneConfidentialWeightedAbi,
        functionName: "milestones",
        args: [milestoneHash as `0x${string}`],
      })) as unknown[];
      if (!Array.isArray(r) || r.length < 16) throw new Error("Invalid milestone data");
      const m: WeightedConfidentialMilestone = {
        projectId: r[0] as string,
        templateId: r[1] as string,
        metadataHash: r[2] as string,
        builder: r[3] as Address,
        createdAt: r[4] as bigint,
        deadline: r[5] as bigint,
        totalStaked: r[6] as bigint,
        finalized: r[7] as boolean,
        verifiedHandle: r[8] as `0x${string}`,
        released: r[9] as boolean,
        verifierCount: Number(r[10]),
        verifiedVotesHandle: r[11] as `0x${string}`,
        weightedTallyHandle: r[12] as `0x${string}`,
        finalEvidenceRoot: r[13] as string,
        resultConfirmed: r[14] as boolean,
        resultVerified: r[15] as boolean,
      };
      if (m.builder === ZERO_ADDRESS) return null;
      return m;
    },
  });
}

/// Publicly decrypt the sealed `verified` result via the Zama relayer.
export function useDecryptWeightedResult(handle: `0x${string}` | undefined) {
  return useMutation({
    retry: false,
    mutationFn: async () => {
      if (!handle) throw new Error("No ciphertext handle");
      const { publicDecryptBool } = await import("../lib/fhe");
      return publicDecryptBool(handle);
    },
  });
}
