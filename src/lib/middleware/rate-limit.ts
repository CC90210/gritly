import { NextResponse } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function pruneExpiredBuckets(now: number): void {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

/**
 * Best-effort in-process rate limiting.
 * This protects single-node and warm-runtime traffic bursts, but it should still
 * be paired with edge rate limiting in production.
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): NextResponse | null {
  const now = Date.now();

  if (buckets.size > 10_000) {
    pruneExpiredBuckets(now);
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return null;
  }

  if (existing.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(existing.resetAt),
        },
      },
    );
  }

  existing.count += 1;
  buckets.set(key, existing);
  return null;
}
