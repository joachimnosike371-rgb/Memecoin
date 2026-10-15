export interface MarketProviderInfo {
  id: string;
  attribution: string;
  baseUrl: string;
}
export function listMarketProviders(): MarketProviderInfo[];
export function fetchAttributedMarketData(options: {
  provider: string;
  path: string;
  fetcher?: typeof fetch;
  env?: Record<string, string | undefined>;
  now?: number;
}): Promise<{
  provider: string;
  sourceUrl: string;
  fetchedAt: string;
  attribution: string;
  data: unknown;
}>;
