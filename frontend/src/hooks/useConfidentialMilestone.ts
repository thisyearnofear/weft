import { useMutation, useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { Address } from "viem";
import { getConfidentialAddress, WeftMilestoneConfidentialAbi } from "../lib/contracts";
import { queryDefaults } from "@/lib/queryConfig";

/// Confidential milestone on Sepolia (Zama FHEVM). `verifiedHandle` and
/// `verifiedVotesHandle` are FHE ciphertext handles — individual votes are
/// never decryptable; the final verified result becomes publicly decryptable
/// after finalization.
export interface ConfidentialMilestone {
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
  finalEvidenceRoot: string;
  resultConfirmed: boolean;
  resultVerified: boolean;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const CONFIDENTIAL_QUERY_KEYS = {
  detail: (milestoneHash: string) => ["confidentialMilestones", milestoneHash] as const,
  decrypt: (handle: string) => ["confidentialMilestones", "decrypt", handle] as const,
};

export function useConfidentialMilestone(milestoneHash: string, enabled = true) {
  const client = usePublicClient({ chainId: sepolia.id });

  return useQuery({
    ...queryDefaults,
    queryKey: CONFIDENTIAL_QUERY_KEYS.detail(milestoneHash),
    enabled: enabled && !!client,
    queryFn: async () => {
      if (!client) throw new Error("No Sepolia client");
      const address = getConfidentialAddress();
      if (!address) throw new Error("WeftMilestoneConfidential not configured");
      const r = (await client.readContract({
        address,
        abi: WeftMilestoneConfidentialAbi,
        functionName: "milestones",
        args: [milestoneHash as `0x${string}`],
      })) as unknown[];
      if (!Array.isArray(r) || r.length < 15) throw new Error("Invalid milestone data");
      const m: ConfidentialMilestone = {
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
        finalEvidenceRoot: r[12] as string,
        resultConfirmed: r[13] as boolean,
        resultVerified: r[14] as boolean,
      };
      if (m.builder === ZERO_ADDRESS) return null;
      return m;
    },
  });
}

/// Publicly decrypt the sealed `verified` result via the Zama relayer.
/// Only possible after finalization (FHE.makePubliclyDecryptable) — before
/// that, the relayer rejects the request, which is the point: the outcome
/// stays sealed until all ballots are in.
export function useDecryptSealedResult(handle: `0x${string}` | undefined) {
  return useMutation({
    retry: false,
    mutationFn: async () => {
      if (!handle) throw new Error("No ciphertext handle");
      const { publicDecryptBool } = await import("../lib/fhe");
      return publicDecryptBool(handle);
    },
  });
}
