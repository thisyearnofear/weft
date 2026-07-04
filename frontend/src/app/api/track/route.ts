import { appendFile, mkdir } from "fs/promises";
import path from "path";

/**
 * First-party event sink. Appends allowlisted funnel events as JSONL.
 * Stores no IP, no user agent, no identifiers — nothing that needs consent.
 *
 * Default file lives one level above the app dir (/opt/weft/data on the VPS)
 * so `deploy-frontend.sh`'s rsync --delete of frontend/ never wipes it.
 * Analyze with e.g.:  jq -s 'group_by(.event) | map({(.[0].event): length}) | add' data/weft-events.jsonl
 */
const ALLOWED_EVENTS = new Set([
  "heroproof_loop",
  "proofline_click",
  "heroproof_proof_click",
  "create_started",
  "share_click",
]);

const EVENTS_FILE =
  process.env.WEFT_EVENTS_FILE || path.resolve(process.cwd(), "../data/weft-events.jsonl");

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    if (raw.length > 512) return new Response(null, { status: 204 });

    const { event, props, path: pagePath } = JSON.parse(raw);
    if (typeof event !== "string" || !ALLOWED_EVENTS.has(event)) {
      return new Response(null, { status: 204 });
    }

    const line = JSON.stringify({
      event,
      props: sanitizeProps(props),
      path: typeof pagePath === "string" ? pagePath.slice(0, 120) : undefined,
      ts: Date.now(),
    });

    await mkdir(path.dirname(EVENTS_FILE), { recursive: true });
    await appendFile(EVENTS_FILE, line + "\n");
  } catch {
    // Never surface tracking failures to the client.
  }
  return new Response(null, { status: 204 });
}

function sanitizeProps(props: unknown): Record<string, string | number | boolean> | undefined {
  if (typeof props !== "object" || props === null) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props).slice(0, 5)) {
    if (typeof value === "string") out[key.slice(0, 40)] = value.slice(0, 80);
    else if (typeof value === "number" || typeof value === "boolean") out[key.slice(0, 40)] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
