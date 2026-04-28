import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { Address, keccak256, toBytes } from "viem";

const ENS_REGISTRY = "0x00000000000C2E706e62F196aA929C3F6a76CF3E";

const RESOLVER_ABI = [
  {
    type: "function",
    name: "resolve",
    inputs: [{ name: "name", type: "bytes", internalType: "bytes" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
] as const;

const TEXT_ABI = [
  {
    type: "function",
    name: "text",
    inputs: [
      { name: "node", type: "bytes32", internalType: "bytes32" },
      { name: "key", type: "string", internalType: "string" },
    ],
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view",
  },
] as const;

export interface BuilderPassport {
  ens: string;
  address: Address;
  avatar?: string;
  description?: string;
  email?: string;
  url?: string;
  github?: string;
  twitter?: string;
  weftProjects: string[];
  weftMilestonesVerified: number;
  weftEarnedTotal: number;
  weftCobuilders: string[];
  weftReputationScore: number;
}

function safeJsonParse(v: string): string[] {
  try { return JSON.parse(v || "[]"); } catch { return []; }
}

function namehash(name: string): `0x${string}` {
  let node: `0x${string}` = "0x0000000000000000000000000000000000000000000000000000000000000000";
  if (name) {
    const labels = name.split(".");
    for (let i = labels.length - 1; i >= 0; i--) {
      const label = labels[i];
      const labelBytes = toBytes(keccak256(new TextEncoder().encode(label)));
      const nodeBytes = toBytes(node as `0x${string}`);
      const combined = new Uint8Array(nodeBytes.length + labelBytes.length);
      combined.set(nodeBytes);
      combined.set(labelBytes, nodeBytes.length);
      node = keccak256(combined);
    }
  }
  return node;
}

export function useBuilderPassport(ens: string) {
  const client = usePublicClient();

  return useQuery({
    queryKey: ["builder-passport", ens],
    queryFn: async (): Promise<BuilderPassport> => {
      if (!client) throw new Error("No public client");

      const name = ens.toLowerCase();
      const node = namehash(name);

      const resolver = (await client
        .readContract({
          address: ENS_REGISTRY,
          abi: RESOLVER_ABI,
          functionName: "resolve",
          args: [name as `0x${string}`],
        })
        .catch(() => "0x0000000000000000000000000000000000000000000000000000" as Address)) as Address;

      if (resolver === "0x0000000000000000000000000000000000000000000000000000") {
        throw new Error(`ENS not found: ${name}`);
      }

      const [
        avatar,
        description,
        email,
        url,
        github,
        twitter,
        weftProjects,
        weftVerified,
        weftEarned,
        weftCobuilders,
        weftRep,
      ] = await Promise.all([
        readText(client, resolver, node, "avatar"),
        readText(client, resolver, node, "description"),
        readText(client, resolver, node, "email"),
        readText(client, resolver, node, "url"),
        readText(client, resolver, node, "com.github"),
        readText(client, resolver, node, "com.twitter"),
        readText(client, resolver, node, "weft.projects"),
        readText(client, resolver, node, "weft.milestones.verified"),
        readText(client, resolver, node, "weft.earned.total"),
        readText(client, resolver, node, "weft.cobuilders"),
        readText(client, resolver, node, "weft.reputation.score"),
      ]);

      return {
        ens: name,
        address: resolver,
        avatar: avatar || undefined,
        description: description || undefined,
        email: email || undefined,
        url: url || undefined,
        github: github || undefined,
        twitter: twitter || undefined,
        weftProjects: safeJsonParse(weftProjects),
        weftMilestonesVerified: parseInt(weftVerified || "0"),
        weftEarnedTotal: parseInt(weftEarned || "0"),
        weftCobuilders: safeJsonParse(weftCobuilders),
        weftReputationScore: parseInt(weftRep || "0"),
      };
    },
    enabled: !!ens,
  });
}

async function readText(
  client: ReturnType<typeof usePublicClient>,
  resolver: Address,
  node: `0x${string}`,
  key: string
): Promise<string> {
  if (!client) {
    return "";
  }
  return client
    .readContract({
      address: resolver,
      abi: TEXT_ABI,
      functionName: "text",
      args: [node, key],
    })
    .catch(() => "") as Promise<string>;
}