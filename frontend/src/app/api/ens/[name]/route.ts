import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, Address, keccak256, toBytes, namehash } from "viem";
import { mainnet } from "viem/chains";

const MAINNET_RPC = process.env.MAINNET_RPC || "https://eth.public-rpc.com";

const client = createPublicClient({
  chain: mainnet,
  transport: http(MAINNET_RPC, {
    fetchOptions: {
      headers: {
        // Server-side proxy - no CORS issues
      },
    },
  }),
});

const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as Address;

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

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as Address;

function ensNamehash(name: string): `0x${string}` {
  const labels = name.split(".");
  let node: `0x${string}` = "0x0000000000000000000000000000000000000000000000000000000000000000";
  for (let i = labels.length - 1; i >= 0; i--) {
    const label = labels[i];
    const labelBytes = toBytes(keccak256(new TextEncoder().encode(label)));
    const nodeBytes = toBytes(node);
    const combined = new Uint8Array(nodeBytes.length + labelBytes.length);
    combined.set(nodeBytes);
    combined.set(labelBytes, nodeBytes.length);
    node = keccak256(combined);
  }
  return node;
}

async function readText(
  resolver: Address,
  node: `0x${string}`,
  key: string
): Promise<string> {
  try {
    return (await client.readContract({
      address: resolver,
      abi: TEXT_ABI,
      functionName: "text",
      args: [node, key],
    })) as string;
  } catch {
    return "";
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const ensName = name.endsWith(".eth") ? name : `${name}.eth`;
  const node = ensNamehash(ensName);

  try {
    // Get resolver
    const resolver = (await client.readContract({
      address: ENS_REGISTRY,
      abi: REGISTRY_ABI,
      functionName: "resolver",
      args: [node],
    })) as Address;

    if (!resolver || resolver === ZERO_ADDR) {
      return NextResponse.json({ error: "ENS not found" }, { status: 404 });
    }

    // Get address
    const address = (await client.readContract({
      address: resolver,
      abi: ADDR_ABI,
      functionName: "addr",
      args: [node],
    })) as Address;

    const resolvedAddr = address && address !== ZERO_ADDR ? address : resolver;

    // Get text records in parallel
    const [
      avatar,
      description,
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
      readText(resolver, node, "url"),
      readText(resolver, node, "com.github"),
      readText(resolver, node, "com.twitter"),
      readText(resolver, node, "weft.projects"),
      readText(resolver, node, "weft.milestones.verified"),
      readText(resolver, node, "weft.earned.total"),
      readText(resolver, node, "weft.cobuilders"),
      readText(resolver, node, "weft.reputation.score"),
    ]);

    return NextResponse.json({
      ens: ensName,
      address: resolvedAddr,
      avatar: avatar || undefined,
      description: description || undefined,
      url: url || undefined,
      github: github || undefined,
      twitter: twitter || undefined,
      weftProjects: avatar ? JSON.parse(weftProjects || "[]") : [],
      weftMilestonesVerified: parseInt(weftVerified || "0"),
      weftEarnedTotal: parseInt(weftEarned || "0"),
      weftCobuilders: weftCobuilders ? JSON.parse(weftCobuilders || "[]") : [],
      weftReputationScore: parseInt(weftRep || "0"),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}