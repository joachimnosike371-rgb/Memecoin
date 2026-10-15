export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
  env?: Record<string, string | undefined>;
  fetcher?: typeof fetch;
}
export function consumeProviderRateLimit(provider: string, options?: RateLimitOptions): Promise<true>;
