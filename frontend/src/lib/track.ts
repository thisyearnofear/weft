/**
 * Minimal first-party event tracking — answers "where does the aha happen?"
 * without a third-party service, cookies, or PII. Events land as JSONL via
 * /api/track. Swap the transport here if we ever move to Plausible/Umami.
 *
 * Funnel events (allowlisted server-side in /api/track):
 *   heroproof_loop        — the hero animation played through at least once
 *   proofline_click       — hero proof line ("Latest release ...") clicked
 *   heroproof_proof_click — "See this exact proof onchain" clicked
 *   create_started        — milestone form advanced to preview
 *   share_click           — proof share card used (props.kind: x|link|badge)
 */
export function track(event: string, props?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({ event, props, path: window.location.pathname });
    // sendBeacon survives navigation (the proof-line click navigates away)
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/track", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  } catch {
    // Analytics must never break the UI.
  }
}
