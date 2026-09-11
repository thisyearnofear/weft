/**
 * Shared-secret auth for upstream Weft APIs (status API on snel-bot,
 * Canton API on nuncio). When WEFT_STATUS_API_KEY is set, requests whose
 * URL targets one of the configured upstream bases carry `x-weft-key`,
 * which the nginx reverse proxy on the VPS requires. Other destinations
 * (RPC endpoints, ENS resolution, etc.) never receive the key.
 */
const UPSTREAM_BASES = [
  process.env.WEFT_STATUS_API_URL || "http://127.0.0.1:9010",
  process.env.CANTON_API_URL ||
    process.env.NEXT_PUBLIC_CANTON_API_URL ||
    process.env.STATUS_API_URL ||
    process.env.NEXT_PUBLIC_STATUS_API_URL ||
    "http://127.0.0.1:9020",
].map((base) => base.replace(/\/+$/, ""));

export function upstreamAuthHeaders(url: string): Record<string, string> {
  const key = process.env.WEFT_STATUS_API_KEY?.trim();
  if (!key) return {};
  return UPSTREAM_BASES.some((base) => url.startsWith(base))
    ? { "x-weft-key": key }
    : {};
}
