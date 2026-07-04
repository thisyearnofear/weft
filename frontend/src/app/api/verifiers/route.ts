import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem } from "viem";
import { sepolia } from "viem/chains";
import { fetchJsonWithTimeout } from "@/lib/fetchWithTimeout";

const STATUS_API = process.env.WEFT_STATUS_API_URL || "http://127.0.0.1:9010";
// drpc serves historical eth_getLogs on the free tier; publicnode does not
const SEPOLIA_RPC = "https://sepolia.drpc.org";
const CONFIDENTIAL_CONTRACT = process.env.NEXT_PUBLIC_WEFT_MILESTONE_CONFIDENTIAL_SEPOLIA as
  | `0x${string}`
  | undefined;
const CONFIDENTIAL_DEPLOY_BLOCK = BigInt(11201564);

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  return fetchJsonWithTimeout(url);
}

export interface SealedBallotStats {
  contract: string;
  ballots: number;
  verifiers: Array<{ address: string; ballots: number; milestones: string[] }>;
}

/// Sealed-ballot verifiers on Sepolia (Zama FHE). VerdictSubmitted proves a
/// ballot was cast — how each verifier voted stays encrypted onchain forever.
async function fetchSealedBallots(): Promise<SealedBallotStats | null> {
  if (!CONFIDENTIAL_CONTRACT) return null;
  try {
    const client = createPublicClient({ chain: sepolia, transport: http(SEPOLIA_RPC) });
    const logs = await client.getLogs({
      address: CONFIDENTIAL_CONTRACT,
      event: parseAbiItem(
        "event VerdictSubmitted(bytes32 indexed milestoneHash, address indexed verifier, bytes32 evidenceRoot)"
      ),
      fromBlock: CONFIDENTIAL_DEPLOY_BLOCK,
      toBlock: "latest",
    });
    const byVerifier = new Map<string, { address: string; ballots: number; milestones: string[] }>();
    for (const log of logs) {
      const verifier = String(log.args.verifier);
      const milestone = String(log.args.milestoneHash);
      const entry = byVerifier.get(verifier) ?? { address: verifier, ballots: 0, milestones: [] };
      entry.ballots++;
      if (!entry.milestones.includes(milestone)) entry.milestones.push(milestone);
      byVerifier.set(verifier, entry);
    }
    return {
      contract: CONFIDENTIAL_CONTRACT,
      ballots: logs.length,
      verifiers: [...byVerifier.values()],
    };
  } catch {
    return null; // RPC hiccups must not take down the page
  }
}

export async function GET() {
  try {
    const [overview, sealedBallots] = await Promise.all([
      fetchJson(`${STATUS_API}/demo`),
      fetchSealedBallots(),
    ]);
    const demoHints = overview.demoHints as Record<string, unknown> | undefined;
    const hashes = (demoHints?.milestones as string[]) ?? [];

    // Fetch milestone details to extract verifier info
    const milestoneResults = await Promise.allSettled(
      hashes.map((hash) => fetchJson(`${STATUS_API}/milestone/${hash}`))
    );

    const milestones = milestoneResults
      .filter((r): r is PromiseFulfilledResult<Record<string, unknown>> => r.status === "fulfilled")
      .map((r) => r.value);

    // Extract verifier info from milestone demo tracks
    const verifierMap = new Map<string, {
      address: string;
      ens: string | null;
      authorized: boolean;
      votesCast: number;
      milestonesParticipated: string[];
    }>();

    for (const m of milestones) {
      const demo = m.demo as Record<string, unknown> | undefined;
      const tracks = demo?.tracks as Record<string, unknown> | undefined;
      const gensyn = tracks?.gensyn as Record<string, unknown> | undefined;
      const ens = tracks?.ens as Record<string, unknown> | undefined;

      // Extract verifier addresses from the consensus data
      const verifierAddrs = (gensyn?.verifierAddresses as string[]) ?? [];
      const hash = String(m.milestoneHash ?? "");

      for (const addr of verifierAddrs) {
        const existing = verifierMap.get(addr);
        if (existing) {
          existing.votesCast++;
          if (!existing.milestonesParticipated.includes(hash)) {
            existing.milestonesParticipated.push(hash);
          }
        } else {
          verifierMap.set(addr, {
            address: addr,
            ens: ens?.agentEns as string ?? null,
            authorized: true,
            votesCast: 1,
            milestonesParticipated: [hash],
          });
        }
      }
    }

    // Also check the agent ENS as a verifier
    const agentEns = (demoHints?.agentEns as string) ?? null;
    const builderEns = (demoHints?.builderEns as string) ?? null;

    // If no verifiers were extracted from tracks, add the known agent
    if (verifierMap.size === 0 && agentEns) {
      verifierMap.set("0xebe2ee532ba0c24d901a11f751e8c338db053d76", {
        address: "0xebe2ee532ba0c24d901a11f751e8c338db053d76",
        ens: agentEns,
        authorized: true,
        votesCast: milestones.reduce((sum, m) => sum + Number(m.verifiedVotes ?? 0), 0),
        milestonesParticipated: milestones.map((m) => String(m.milestoneHash ?? "")),
      });
    }

    const verifiers = Array.from(verifierMap.values());

    // Consensus stats
    const totalVotes = milestones.reduce((sum, m) => sum + Number(m.verifiedVotes ?? 0), 0);
    const totalVerifierSlots = milestones.reduce((sum, m) => sum + Number(m.verifierCount ?? 0), 0);
    const agreementRate = totalVerifierSlots > 0 ? (totalVotes / totalVerifierSlots) * 100 : 0;

    return NextResponse.json({
      ok: true,
      verifiers,
      consensus: {
        totalVotes,
        totalVerifierSlots,
        agreementRate: agreementRate.toFixed(1),
        dissentFlags: 0,
        peerInboxDir: (demoHints?.peerInboxDir as string) ?? null,
        peerInboxExists: false,
      },
      agentEns,
      builderEns,
      sealedBallots,
    }, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=120" } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "verifiers_fetch_failed", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
