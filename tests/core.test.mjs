import test from "node:test";
import assert from "node:assert/strict";
import { createAuditEvent } from "../lib/audit-events.mjs";
import { calculateTargetFee, validateFeeVenue } from "../lib/fee-policy.mjs";
import { fetchMarketSnapshot, resetMarketRateLimitsForTests } from "../lib/market-data.mjs";

test("audit events validate fields and normalize timestamp", () => {
  const event = createAuditEvent({ type: "draft.saved", actor: " operator ", idempotencyKey: "draft-12345678" }, new Date("2026-01-01T00:00:00Z"));
  assert.equal(event.actor, "operator");
  assert.equal(event.occurredAt, "2026-01-01T00:00:00.000Z");
  assert.equal(event.type, "draft.saved");
  assert.throws(() => createAuditEvent({ type: "unknown", actor: "a", idempotencyKey: "long-enough-key" }), /Unsupported/);
  assert.throws(() => createAuditEvent({ type: "draft.saved", actor: "", idempotencyKey: "long-enough-key" }), /actor/);
});

test("buy and sell fees are 1% using integer arithmetic", () => {
  assert.equal(calculateTargetFee(100_000, "buy"), 1_000);
  assert.equal(calculateTargetFee(100_000, "sell"), 1_000);
  assert.equal(calculateTargetFee(99, "buy"), 0);
  assert.throws(() => calculateTargetFee(-1, "buy"), /amountMinor/);
  assert.throws(() => calculateTargetFee(100, "transfer"), /side/);
});

test("venue remains unverified until a fee hook or contract is verified", () => {
  assert.equal(validateFeeVenue({ venue: "test venue" }).enforceable, false);
  assert.equal(validateFeeVenue({ venue: "test venue", feeHookVerified: true }).status, "verified");
});

test("market provider attributes source and enforces per-provider rate limits", async () => {
  resetMarketRateLimitsForTests();
  const fetcher = async () => ({ ok: true, json: async () => ({ price: 12 }) });
  const result = await fetchMarketSnapshot({ provider: "demo", url: "https://example.test/market?api_key=do-not-store", fetcher, limit: 1, now: 1000 });
  assert.equal(result.provider, "demo");
  assert.equal(result.sourceUrl, "https://example.test/market");
  assert.doesNotMatch(result.sourceUrl, /api_key|do-not-store/);
  assert.deepEqual(result.data, { price: 12 });
  await assert.rejects(
    fetchMarketSnapshot({ provider: "demo", url: "https://example.test/market", fetcher, limit: 1, now: 1001 }),
    (error) => error.code === "RATE_LIMITED" && error.retryAfterMs > 0
  );
});

test("market provider errors are surfaced instead of disguised as live data", async () => {
  resetMarketRateLimitsForTests();
  await assert.rejects(fetchMarketSnapshot({
    provider: "offline", url: "https://example.test", now: 5000,
    fetcher: async () => ({ ok: false, status: 503 })
  }), /HTTP 503/);
});
