import { NextRequest, NextResponse } from "next/server";
import { keccak256, stringToHex } from "viem";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const runtime = "nodejs";

export interface MilestoneMetadataPayload {
  templateId: string;
  chainId: number;
  deadline: number;
  notes?: string;
  templateInputs?: Record<string, unknown>;
}

function uploadTo0g(metadataJson: string): { ok: true; root: string } | { ok: false; error: string } {
  const indexer = process.env.ZERO_G_INDEXER_RPC || process.env.ZERO_G_INDEXER_URL || "";
  const evmRpc = process.env.ZERO_G_EVM_RPC_URL || process.env.ETH_RPC_URL || "";
  const privateKey = process.env.ZERO_G_PRIVATE_KEY || process.env.PRIVATE_KEY || "";

  if (!indexer || !evmRpc || !privateKey) {
    return { ok: false, error: "missing_0g_config" };
  }

  const tmpDir = mkdtempSync(path.join(tmpdir(), "weft-metadata-"));
  try {
    const filePath = path.join(tmpDir, "metadata.json");
    writeFileSync(filePath, metadataJson, "utf-8");

    const result = spawnSync(
      "0g-storage-client",
      ["upload", "--url", evmRpc, "--key", privateKey, "--indexer", indexer, "--file", filePath],
      { encoding: "utf-8", timeout: 60_000 }
    );

    if (result.error) {
      return { ok: false, error: `0g-storage-client not available: ${result.error.message}` };
    }
    if (result.status !== 0) {
      return { ok: false, error: `0g upload failed: ${result.stderr || result.stdout}` };
    }

    const match = result.stdout.match(/0x[a-fA-F0-9]{64}/);
    if (!match) {
      return { ok: false, error: "0g upload did not return root" };
    }
    return { ok: true, root: match[0] };
  } finally {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

export async function POST(req: NextRequest) {
  let body: MilestoneMetadataPayload;
  try {
    body = (await req.json()) as MilestoneMetadataPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.templateId || typeof body.chainId !== "number" || typeof body.deadline !== "number") {
    return NextResponse.json({ ok: false, error: "missing_required_fields" }, { status: 400 });
  }

  const metadata: Record<string, unknown> = {
    templateId: body.templateId,
    chainId: body.chainId,
    deadline: body.deadline,
    notes: body.notes ?? "",
  };

  // Non-EVM templates require templateInputs; EVM templates place inputs at the root.
  if (body.templateId === "evm.deployment_usage.v1") {
    Object.assign(metadata, body.templateInputs ?? {});
  } else {
    metadata.templateInputs = body.templateInputs ?? {};
  }

  const metadataJson = JSON.stringify(metadata, null, 2);

  // Prefer uploading to 0G Storage when configured.
  const upload = uploadTo0g(metadataJson);
  if (upload.ok) {
    return NextResponse.json({ ok: true, metadataHash: upload.root, uploaded: true });
  }

  // Fallback: deterministic hash so the flow still works without 0G.
  // Verifiers will need overrides for non-EVM templates in this mode.
  const fallbackHash = keccak256(stringToHex(metadataJson));
  return NextResponse.json({
    ok: true,
    metadataHash: fallbackHash,
    uploaded: false,
    fallbackReason: upload.error,
  });
}
