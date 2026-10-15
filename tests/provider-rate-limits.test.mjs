import test from "node:test";
import assert from "node:assert/strict";
import { consumeProviderRateLimit } from "../lib/provider-rate-limits.mjs";
import { listMarketProviders } from "../lib/market-providers.mjs";

const env = { SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "server-test-key" };

test("shared rate limiter fails closed without database credentials", async () => {
  await assert.rejects(consumeProviderRateLimit("coingecko", { env: {} }), (e) => e.code === "RATE_LIMIT_STORAGE_NOT_CONFIGURED");
});

test("shared rate limiter records provider atomically via server-side RPC", async () => {
  let captured;
  const allowed = await consumeProviderRateLimit("coingecko", {
    env,
    fetcher: async (url, options) => {
      captured = { url, options };
      return { ok: true, json: async () => [{ allowed: true, retry_after_ms: 0 }] };
    }
  });
  assert.equal(allowed, true);
  assert.match(captured.url, /rpc\/consume_provider_rate_limit$/);
  assert.equal(captured.options.method, "POST");
  assert.equal(JSON.parse(captured.options.body).p_provider, "coingecko");
  assert.equal(captured.options.headers.authorization, "Bearer server-test-key");
});

test("shared rate limiter reports retry time without fetching a provider", async () => {
  await assert.rejects(consumeProviderRateLimit("coingecko", {
    env,
    fetcher: async () => ({ ok: true, json: async () => [{ allowed: false, retry_after_ms: 2345 }] })
  }), (e) => e.code === "RATE_LIMITED" && e.retryAfterMs === 2345);
});

test("market registry attributes only explicitly configured providers", () => {
  const items = listMarketProviders();
  assert.deepEqual(items.map(x => x.id), ["coingecko", "dexscreener"]);
  assert.deepEqual(items.map(x => x.id).filter(id => id === "unknown"), []);
});
