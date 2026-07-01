/**
 * Shared React Query defaults — single source of truth for retry/stale config.
 *
 * Usage:
 *   useQuery({ queryKey: ..., queryFn: ..., ...queryDefaults })
 */
export const queryDefaults = {
  retry: 2,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 8000),
  refetchOnWindowFocus: false,
} as const;

/** Stale times — how long data is considered fresh before refetching */
export const STALE_TIMES = {
  /** Onchain milestone data — changes infrequently (only on new blocks) */
  onchain: 60_000,
  /** Status API data — milestone status, demo overview */
  status: 30_000,
  /** Treasury data — changes only on fee sweeps */
  treasury: 60_000,
  /** Explorer data — new milestones are rare */
  explorer: 60_000,
} as const;
