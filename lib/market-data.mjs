const windows = new Map();

/**
 * Provider wrapper with a per-provider rolling-window request cap.
 * Supply an injected fetcher to keep provider integration and tests deterministic.
 */
export async function fetchMarketSnapshot({ provider, url, fetcher = fetch, limit = 30, windowMs = 60_000, now = Date.now() }) {
  if (typeof provider !== "string" || !provider.trim()) throw new TypeError("Provider name is required");
  if (!Number.isInteger(limit) || limit < 1) throw new TypeError("limit must be a positive integer");
  const key = provider.trim().toLowerCase();
  const recent = (windows.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
  if (recent.length >= limit) {
    const retryAfterMs = Math.max(1, windowMs - (now - recent[0]));
    const error = new Error("Market provider rate limit reached");
    error.code = "RATE_LIMITED";
    error.retryAfterMs = retryAfterMs;
    throw error;
  }
  recent.push(now);
  windows.set(key, recent);
  const response = await fetcher(url, { headers: { accept: "application/json" } });
  if (!response?.ok) {
    const error = new Error(`Market provider ${provider} returned HTTP ${response?.status ?? "unknown"}`);
    error.code = "PROVIDER_ERROR";
    throw error;
  }
  return Object.freeze({
    provider: provider.trim(),
    sourceUrl: String(url),
    fetchedAt: new Date(now).toISOString(),
    data: await response.json()
  });
}

export function resetMarketRateLimitsForTests() {
  windows.clear();
}
