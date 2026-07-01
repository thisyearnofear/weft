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
