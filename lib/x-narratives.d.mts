export type RankedNarrative = {
  topic: string;
  mentions: number;
  engagement: number;
  recency: number;
  examples: string[];
  score: number;
};
export type XNarrativeResult = {
  provider: string;
  fetchedAt: string;
  tweetCount: number;
  narratives: RankedNarrative[];
};
export function rankNarratives(tweets: unknown[], options?: { now?: number }): RankedNarrative[];
export function fetchRankedXNarratives(options?: {
  env?: Record<string, string | undefined>;
  fetcher?: typeof fetch;
  now?: number;
  query?: string;
  maxResults?: number;
}): Promise<XNarrativeResult>;
