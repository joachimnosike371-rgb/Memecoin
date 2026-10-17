import { consumeProviderRateLimit } from "./provider-rate-limits.mjs";
import { fetchMarketSnapshot } from "./market-data.mjs";

const PROVIDERS = Object.freeze({
  coingecko: Object.freeze({
    baseUrl: "https://api.coingecko.com/api/v3",
    attribution: "CoinGecko API",
    defaultLimit: 20,
    windowMs: 60_000
  }),
  dexscreener: Object.freeze({
    baseUrl: "https://api.dexscreener.com/latest/dex",
    attribution: "DexScreener API",
    defaultLimit: 30,
    windowMs: 60_000
  })
});

export function listMarketProviders() {
  return Object.entries(PROVIDERS).map(([id, item]) => ({
    id,
    attribution: item.attribution,
    baseUrl: item.baseUrl
  }));
}

export async function fetchAttributedMarketData({ provider, path, fetcher = fetch, env = process.env, now = Date.now() }) {
  const config = PROVIDERS[String(provider).toLowerCase()];
  if (!config) throw new TypeError("Unsupported market provider");
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//") || path.includes("..")) {
    throw new TypeError("Provider path must be a safe absolute API path");
  }
  await consumeProviderRateLimit(provider, {
    limit: config.defaultLimit,
    windowMs: config.windowMs,
    env
  });
  const url = new URL(path, config.baseUrl).toString();
  const result = await fetchMarketSnapshot({
    provider,
    url,
    fetcher,
    limit: config.defaultLimit,
    windowMs: config.windowMs,
    now
  });
  return Object.freeze({ ...result, attribution: config.attribution });
}
