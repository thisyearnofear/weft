import { NextResponse } from "next/server";

const STATUS_API = process.env.WEFT_STATUS_API_URL || "http://127.0.0.1:9010";

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

interface ActivityEvent {
  timestamp: number;
  type: "verification" | "charge" | "revenue" | "consensus" | "deadline" | "chaos";
  title: string;
  description: string;
  metadata: Record<string, unknown>;
}

export async function GET() {
  try {
    const [treasuryRes, recoveryRes, overviewRes] = await Promise.allSettled([
      fetchJson(`${STATUS_API}/treasury`),
      fetchJson(`${STATUS_API}/recovery`),
      fetchJson(`${STATUS_API}/demo`),
    ]);

    const events: ActivityEvent[] = [];

    // Treasury charges → activity events
    if (treasuryRes.status === "fulfilled") {
      const treasury = treasuryRes.value;
      const charges = (treasury.recentCharges as Array<Record<string, unknown>>) ?? [];
      for (const charge of charges) {
        const service = String(charge.service ?? "unknown");
        const isRevenue = service === "revenue_sweep";
        events.push({
          timestamp: Number(charge.created ?? 0),
          type: isRevenue ? "revenue" : "charge",
          title: isRevenue ? "Revenue swept" : `${service} charge`,
          description: String(charge.memo ?? ""),
          metadata: {
            service,
            amount: charge.amount,
            chargeId: charge.id,
          },
        });
      }
    }

    // Recovery events → activity events
    if (recoveryRes.status === "fulfilled") {
      const recovery = recoveryRes.value;
      const recoveryEvents = (recovery.events as Array<Record<string, unknown>>) ?? [];
      for (const evt of recoveryEvents) {
        events.push({
          timestamp: Number(evt.timestamp ?? evt.created ?? 0),
          type: "chaos",
          title: String(evt.type ?? "Recovery event"),
          description: String(evt.description ?? evt.message ?? ""),
          metadata: evt,
        });
      }
    }

    // Milestone events → verification + deadline events
    if (overviewRes.status === "fulfilled") {
      const overview = overviewRes.value;
      const demoHints = overview.demoHints as Record<string, unknown> | undefined;
      const hashes = (demoHints?.milestones as string[]) ?? [];

      const milestoneResults = await Promise.allSettled(
        hashes.map((hash) => fetchJson(`${STATUS_API}/milestone/${hash}`))
      );

      for (const result of milestoneResults) {
        if (result.status !== "fulfilled") continue;
        const d = result.value;
        const createdAt = Number(d.createdAt ?? 0);
        const deadline = Number(d.deadline ?? 0);
        const finalized = Boolean(d.finalized);
        const verified = Boolean(d.verified);
        const released = Boolean(d.released);
        const hash = String(d.milestoneHash ?? "");
        const shortHash = hash.length > 12 ? `${hash.slice(0, 10)}...${hash.slice(-6)}` : hash;

        if (createdAt) {
          events.push({
            timestamp: createdAt,
            type: "deadline",
            title: "Milestone created",
            description: `Milestone ${shortHash} was created with a deadline`,
            metadata: { milestoneHash: hash, deadline },
          });
        }

        if (finalized) {
          events.push({
            timestamp: deadline,
            type: "verification",
            title: verified ? "Milestone verified" : "Milestone failed",
            description: verified
              ? `Milestone ${shortHash} reached quorum (${d.verifiedVotes}/${d.verifierCount} votes)`
              : `Milestone ${shortHash} did not pass verification`,
            metadata: {
              milestoneHash: hash,
              verified,
              verifierCount: d.verifierCount,
              verifiedVotes: d.verifiedVotes,
              evidenceRoot: d.finalEvidenceRoot,
            },
          });
        }

        if (released) {
          events.push({
            timestamp: deadline + 1,
            type: "verification",
            title: "Capital released",
            description: `Capital released for milestone ${shortHash}`,
            metadata: { milestoneHash: hash, staked: d.totalStaked },
          });
        }
      }
    }

    // Sort by timestamp descending
    events.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({
      ok: true,
      events,
      count: events.length,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "activity_fetch_failed", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
