import { NextRequest, NextResponse } from "next/server";

const CONTRACT = "0xcc768d56b0053b1b2df5391dde989be3f859474c";
const RPC = "https://evmrpc-testnet.0g.ai";

async function checkMilestone(hash: string): Promise<{ verified: boolean; finalized: boolean } | null> {
  try {
    const padded = hash.startsWith("0x") ? hash : `0x${hash}`;
    const data = padded.slice(2).padStart(64, "0") + "0".repeat(64 * 12);
    const sig = "0x8e84bc20" + data;
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to: CONTRACT, data: sig }, "latest"],
      }),
    });
    const json = await res.json();
    if (!json.result || json.result === "0x") return null;
    const hex = json.result.slice(2);
    const finalized = parseInt(hex.slice(192, 194), 16) === 1;
    const verified = parseInt(hex.slice(194, 196), 16) === 1;
    return { verified, finalized };
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const result = await checkMilestone(hash);

  let message = "unknown";
  let color = "grey";

  if (result) {
    if (result.verified) {
      message = "verified";
      color = "brightgreen";
    } else if (result.finalized) {
      message = "failed";
      color = "red";
    } else {
      message = "pending";
      color = "yellow";
    }
  }

  const shieldsUrl = `https://img.shields.io/badge/${encodeURIComponent("weft")}-${encodeURIComponent(message)}-${color}?style=flat-square&logo=ethereum`;
  return NextResponse.redirect(shieldsUrl, 302);
}
