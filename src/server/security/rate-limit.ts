type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  nowMs?: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const buckets = new Map<string, RateLimitBucket>();

function cleanup(nowMs: number) {
  if (buckets.size < 1_000) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= nowMs) buckets.delete(key);
  }
}

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const nowMs = options.nowMs ?? Date.now();
  cleanup(nowMs);

  const current = buckets.get(options.key);
  const bucket =
    current && current.resetAt > nowMs
      ? current
      : { count: 0, resetAt: nowMs + options.windowMs };

  bucket.count += 1;
  buckets.set(options.key, bucket);

  const remaining = Math.max(options.limit - bucket.count, 0);
  const retryAfterSeconds = Math.max(Math.ceil((bucket.resetAt - nowMs) / 1000), 1);

  return {
    allowed: bucket.count <= options.limit,
    limit: options.limit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds,
  };
}
