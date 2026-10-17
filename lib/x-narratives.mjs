const X_SEARCH_URL = "https://api.x.com/2/tweets/search/recent";

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function tokenize(text) {
  const clean = String(text ?? "").toLowerCase();
  const hashtags = [...clean.matchAll(/#([a-z0-9_]{2,40})/gi)].map((match) => match[1].toLowerCase());
  const words = clean.match(/[a-z][a-z0-9]{3,24}/g) ?? [];
  const stop = new Set(["this", "that", "with", "from", "have", "your", "about", "just", "what", "when", "will", "they", "them", "been", "into", "over", "more", "than", "here", "there", "like", "token", "coin", "crypto", "https", "http"]);
  const counts = new Map();
  for (const word of [...hashtags, ...words.filter((word) => !stop.has(word))]) {
    counts.set(word, (counts.get(word) ?? 0) + (hashtags.includes(word) ? 2 : 1));
  }
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([topic]) => topic);
}

export function rankNarratives(tweets, { now = Date.now() } = {}) {
  const topics = new Map();
  for (const tweet of tweets ?? []) {
    const text = String(tweet.text ?? "");
    const created = Date.parse(tweet.created_at ?? "");
    const ageHours = Number.isFinite(created) ? Math.max(0, (now - created) / 3_600_000) : 24;
    const metrics = tweet.public_metrics ?? {};
    const engagement = number(metrics.like_count) + 2 * number(metrics.retweet_count) + 1.5 * number(metrics.reply_count) + 2 * number(metrics.quote_count);
    const recency = Math.exp(-ageHours / 12);
    for (const topic of tokenize(text)) {
      const current = topics.get(topic) ?? { topic, mentions: 0, engagement: 0, recency: 0, examples: [] };
      current.mentions += 1;
      current.engagement += engagement;
      current.recency += recency;
      if (current.examples.length < 3 && text.length > 0) current.examples.push(text.slice(0, 240));
      topics.set(topic, current);
    }
  }
  return [...topics.values()]
    .map((item) => ({
      ...item,
      score: Math.round((Math.log1p(item.mentions) * 12 + Math.log1p(item.engagement) * 8 + item.recency * 10) * 100) / 100
    }))
    .sort((a, b) => b.score - a.score || b.mentions - a.mentions)
    .slice(0, 20);
}

export async function fetchRankedXNarratives({
  env = process.env,
  fetcher = fetch,
  now = Date.now(),
  query = "(crypto OR memecoin OR web3) lang:en -is:retweet",
  maxResults = 100
} = {}) {
  const token = env.X_BEARER_TOKEN;
  if (!token) {
    const error = new Error("X_BEARER_TOKEN is not configured");
    error.code = "PROVIDER_NOT_CONFIGURED";
    throw error;
  }
  const url = new URL(X_SEARCH_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("max_results", String(Math.min(100, Math.max(10, maxResults))));
  url.searchParams.set("tweet.fields", "created_at,public_metrics,lang");
  const response = await fetcher(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(12_000)
  });
  if (!response.ok) {
    const error = new Error(`X API returned HTTP ${response.status}`);
    error.code = "UPSTREAM_ERROR";
    throw error;
  }
  const payload = await response.json();
  const tweets = Array.isArray(payload.data) ? payload.data : [];
  return {
    provider: "X API v2 recent search",
    fetchedAt: new Date(now).toISOString(),
    tweetCount: tweets.length,
    narratives: rankNarratives(tweets, { now })
  };
}
