import { NextRequest, NextResponse } from "next/server";

const STATUS =
  process.env.CANTON_API_URL ||
  process.env.NEXT_PUBLIC_CANTON_API_URL ||
  process.env.STATUS_API_URL ||
  process.env.NEXT_PUBLIC_STATUS_API_URL ||
  "http://127.0.0.1:9020";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${STATUS}/canton/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "canton_api_unreachable",
        detail: String(e),
        hint: "Start weft_canton_api.py on :9020 (CANTON_API_URL)",
      },
      { status: 503 },
    );
  }
}
