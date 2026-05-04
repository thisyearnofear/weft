import { NextRequest, NextResponse } from "next/server";

const STATUS_API = process.env.WEFT_STATUS_API_URL || "http://127.0.0.1:9010";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${STATUS_API}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "chat_api_unavailable", detail: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    );
  }
}
