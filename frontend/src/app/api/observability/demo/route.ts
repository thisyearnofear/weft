import { spawnSync } from "node:child_process";
import path from "node:path";
import { NextResponse } from "next/server";

const COOLDOWN_MS = 45_000;
let lastRunAt = 0;

function repoRoot(): string {
  return (
    process.env.WEFT_REPO_ROOT?.trim() ||
    path.join(/* turbopackIgnore: true */ process.cwd(), "..")
  );
}

function pythonBin(root: string): string {
  const candidates = [
    process.env.WEFT_SIGNOZ_PYTHON?.trim(),
    path.join(root, ".venv-signoz", "bin", "python"),
    path.join(root, "venv", "bin", "python"),
    "python3",
  ].filter(Boolean) as string[];
  return candidates[0] ?? "python3";
}

export async function POST() {
  const now = Date.now();
  if (now - lastRunAt < COOLDOWN_MS) {
    return NextResponse.json(
      {
        ok: false,
        error: "demo_cooldown",
        retryAfterMs: COOLDOWN_MS - (now - lastRunAt),
      },
      { status: 429 }
    );
  }

  if (!process.env.OTEL_EXPORTER_OTLP_HEADERS?.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: "otel_not_configured",
        detail: "Set OTEL_EXPORTER_OTLP_HEADERS on the frontend host to emit demo traces.",
      },
      { status: 503 }
    );
  }

  const root = repoRoot();
  const script = path.join(root, "agent/scripts/weft_signoz_smoke.py");
  const python = pythonBin(root);

  const env = {
    ...process.env,
    WEFT_OBSERVABILITY: process.env.WEFT_OBSERVABILITY ?? "signoz",
    OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME ?? "weft-daemon",
    OTEL_RESOURCE_ATTRIBUTES:
      process.env.OTEL_RESOURCE_ATTRIBUTES ??
      "service.name=weft-daemon,deployment.environment=demo,weft.demo.batch=winning-position",
    OTEL_EXPORTER_OTLP_ENDPOINT:
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "https://ingest.us2.signoz.cloud:443",
    OTEL_EXPORTER_OTLP_PROTOCOL: process.env.OTEL_EXPORTER_OTLP_PROTOCOL ?? "http/protobuf",
    WEFT_OTEL_EXPORT_TIMEOUT: process.env.WEFT_OTEL_EXPORT_TIMEOUT ?? "10",
  };

  const result = spawnSync(
    python,
    [script, "--scenario", "fallback", "--milestone-hash", "0xwinningagent2"],
    {
      cwd: root,
      env,
      encoding: "utf-8",
      timeout: 30_000,
    }
  );

  lastRunAt = Date.now();

  if (result.error) {
    return NextResponse.json(
      {
        ok: false,
        error: "demo_spawn_failed",
        detail: result.error.message,
      },
      { status: 500 }
    );
  }

  if (result.status !== 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "demo_trace_failed",
        exitCode: result.status,
        stderr: (result.stderr || "").slice(-2000),
        stdout: (result.stdout || "").slice(-2000),
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      milestoneHash: "0xwinningagent2",
      scenario: "fallback",
      message: "Demo trace emitted — refresh observability in a few seconds.",
    },
    { headers: { "cache-control": "no-store" } }
  );
}
