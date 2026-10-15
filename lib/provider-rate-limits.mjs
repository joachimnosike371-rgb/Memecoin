function readConfig(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    const error = new Error("Shared rate limiting requires Supabase server credentials");
    error.code = "RATE_LIMIT_STORAGE_NOT_CONFIGURED";
    throw error;
  }
  const base = new URL(env.SUPABASE_URL);
  if (base.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(base.hostname)) {
    throw new TypeError("SUPABASE_URL must use HTTPS");
  }
  return { baseUrl: base.origin, key: env.SUPABASE_SERVICE_ROLE_KEY };
}

export async function consumeProviderRateLimit(provider, options = {}) {
  if (typeof provider !== "string" || !/^[a-z0-9_-]{1,80}$/i.test(provider)) {
    throw new TypeError("Invalid provider identifier");
  }
  const limit = options.limit ?? 20;
  const windowMs = options.windowMs ?? 60_000;
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new TypeError("limit must be 1-1000");
  if (!Number.isInteger(windowMs) || windowMs < 1000 || windowMs > 3_600_000) throw new TypeError("windowMs must be 1000-3600000");

  const { baseUrl, key } = readConfig(options.env ?? process.env);
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(`${baseUrl}/rest/v1/rpc/consume_provider_rate_limit`, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ p_provider: provider.toLowerCase(), p_limit: limit, p_window_ms: windowMs }),
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) {
    const error = new Error(`Shared provider rate limiter returned HTTP ${response.status}`);
    error.code = "RATE_LIMIT_STORAGE_ERROR";
    throw error;
  }
  const result = await response.json();
  const row = Array.isArray(result) ? result[0] : result;
  if (!row || typeof row.allowed !== "boolean") {
    const error = new Error("Shared provider rate limiter returned an invalid response");
    error.code = "RATE_LIMIT_STORAGE_ERROR";
    throw error;
  }
  if (!row.allowed) {
    const error = new Error("Market provider rate limit reached");
    error.code = "RATE_LIMITED";
    error.retryAfterMs = Number.isFinite(Number(row.retry_after_ms)) ? Math.max(1, Number(row.retry_after_ms)) : windowMs;
    throw error;
  }
  return true;
}
