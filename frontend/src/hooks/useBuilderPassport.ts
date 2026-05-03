import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http, Address, keccak256, toBytes } from "viem";
import { mainnet } from "viem/chains";

// ENS lives on Ethereum mainnet — always use mainnet client regardless of app chain
const ensMainnetClient = createPublicClient({
  chain: mainnet,
  transport: http("https://eth.llamarpc.com"),
});

const ENS_REGISTRY = "0x00000000000C2E706e62F196aA929C3F6a76CF3E" as Address;

const REGISTRY_ABI = [
  {
    type: "function",
    name: "resolver",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

const ADDR_ABI = [
  {
    type: "function",
    name: "addr",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

const TEXT_ABI = [
  {
    type: "function",
    name: "text",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
] as const;

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

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
  return useQuery({
    queryKey: ["builder-passport", ens],
    queryFn: async (): Promise<BuilderPassport> => {
      const name = ens.toLowerCase();
      const node = namehash(name);

      // Step 1: get resolver from ENS Registry on Ethereum mainnet
      const resolver = await ensMainnetClient.readContract({
        address: ENS_REGISTRY,
        abi: REGISTRY_ABI,
        functionName: "resolver",
        args: [node],
      }).catch(() => ZERO_ADDR as Address) as Address;

      if (!resolver || resolver === ZERO_ADDR) {
        throw new Error(`ENS name not found: ${name}`);
      }

      // Step 2: resolve the actual wallet address
      const address = await ensMainnetClient.readContract({
        address: resolver,
        abi: ADDR_ABI,
        functionName: "addr",
        args: [node],
      }).catch(() => ZERO_ADDR as Address) as Address;

      // Step 3: read all text records in parallel
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
        readText(resolver, node, "avatar"),
        readText(resolver, node, "description"),
        readText(resolver, node, "email"),
        readText(resolver, node, "url"),
        readText(resolver, node, "com.github"),
        readText(resolver, node, "com.twitter"),
        readText(resolver, node, "weft.projects"),
        readText(resolver, node, "weft.milestones.verified"),
        readText(resolver, node, "weft.earned.total"),
        readText(resolver, node, "weft.cobuilders"),
        readText(resolver, node, "weft.reputation.score"),
      ]);

      return {
        ens: name,
        address: (address && address !== ZERO_ADDR ? address : resolver) as Address,
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
    enabled: !!ens && ens.endsWith(".eth"),
    retry: false,
  });
}

async function readText(
  resolver: Address,
  node: `0x${string}`,
  key: string
): Promise<string> {
  return ensMainnetClient
    .readContract({
      address: resolver,
      abi: TEXT_ABI,
      functionName: "text",
      args: [node, key],
    })
    .catch(() => "") as Promise<string>;
}