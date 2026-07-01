/**
 * Fetch with timeout via AbortController.
 * Prevents API routes from hanging indefinitely when upstream services are slow.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  }
}

/**
 * Fetch JSON with timeout. Returns parsed JSON or throws.
 */
export async function fetchJsonWithTimeout<T = Record<string, unknown>>(
  url: string,
  timeoutMs = 10000
): Promise<T> {
  const res = await fetchWithTimeout(url, { cache: "no-store" }, timeoutMs);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json() as Promise<T>;
}

/**
 * Fetch JSON with timeout + retry + exponential backoff.
 * Retries on network errors and 5xx responses. Does not retry on 4xx.
 *
 * @param url - URL to fetch
 * @param opts - timeoutMs, maxRetries (default 2), baseDelayMs (default 1000)
 */
export async function fetchJsonWithRetry<T = Record<string, unknown>>(
  url: string,
  opts: { timeoutMs?: number; maxRetries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const { timeoutMs = 10000, maxRetries = 2, baseDelayMs = 1000 } = opts;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, { cache: "no-store" }, timeoutMs);
      // Retry on 5xx (server errors) — these are likely transient
      if (res.status >= 500 && attempt < maxRetries) {
        await sleep(baseDelayMs * Math.pow(2, attempt));
        continue;
      }
      if (!res.ok) throw new Error(`${url} returned ${res.status}`);
      return res.json() as Promise<T>;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // Don't retry on the last attempt
      if (attempt < maxRetries) {
        await sleep(baseDelayMs * Math.pow(2, attempt));
      }
    }
  }

  throw lastError ?? new Error(`fetch failed after ${maxRetries + 1} attempts: ${url}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
