import test from "node:test";
import assert from "node:assert/strict";
import { fetchRankedXNarratives, rankNarratives } from "../lib/x-narratives.mjs";

test("rankNarratives ranks topics from tweet volume, engagement, and recency", () => {
  const now = Date.parse("2026-10-17T12:00:00Z");
  const tweets = [
    { text: "New #solana launch is moving fast", created_at: "2026-10-17T11:50:00Z", public_metrics: { like_count: 40, retweet_count: 8, reply_count: 4, quote_count: 2 } },
    { text: "Another #solana builder update", created_at: "2026-10-17T11:40:00Z", public_metrics: { like_count: 10, retweet_count: 2, reply_count: 1, quote_count: 0 } },
    { text: "Old #ethereum story", created_at: "2026-10-10T11:00:00Z", public_metrics: { like_count: 1, retweet_count: 0, reply_count: 0, quote_count: 0 } }
  ];
  const ranked = rankNarratives(tweets, { now });
  assert.ok(ranked.length > 0);
  assert.equal(ranked[0].topic, "solana");
  assert.ok(ranked[0].score > 0);
  assert.equal(ranked[0].mentions, 2);
});

test("fetchRankedXNarratives reports missing X credentials", async () => {
  await assert.rejects(
    fetchRankedXNarratives({ env: {}, fetcher: async () => { throw new Error("must not call"); } }),
    (error) => error.code === "PROVIDER_NOT_CONFIGURED"
  );
});

test("fetchRankedXNarratives uses X API data and attribution", async () => {
  const result = await fetchRankedXNarratives({
    env: { X_BEARER_TOKEN: "test-token" },
    now: Date.parse("2026-10-17T12:00:00Z"),
    fetcher: async (url, options) => {
      assert.equal(new URL(url).hostname, "api.x.com");
      assert.equal(options.headers.Authorization, "Bearer test-token");
      return { ok: true, json: async () => ({ data: [
        { text: "#solana narrative", created_at: "2026-10-17T11:00:00Z", public_metrics: { like_count: 5 } }
      ] }) };
    }
  });
  assert.equal(result.provider, "X API v2 recent search");
  assert.equal(result.tweetCount, 1);
  assert.ok(result.narratives.some((item) => item.topic === "solana"));
});
