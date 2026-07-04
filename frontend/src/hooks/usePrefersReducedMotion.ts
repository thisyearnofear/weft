import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/// Reactive prefers-reduced-motion, React Compiler-safe (no setState in
/// effects). Server snapshot is `true` so SSR renders the static fallback;
/// motion mounts only after hydration confirms the user allows it.
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true
  );
}
