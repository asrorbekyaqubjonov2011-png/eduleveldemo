// Simple in-memory fixed-window limiter (per process). Enough to slow down brute force.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    return { allowed: true, retryAfterSec: 0 };
  }
  b.count += 1;
  if (b.count > limit) {
    return { allowed: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

/** Seconds until a bucket that has used up its allowance opens again, 0 when it is open. Does not count a hit. */
export function rateBlockedFor(key: string, limit: number): number {
  const b = buckets.get(key);
  const now = Date.now();
  if (!b || b.resetAt <= now) return 0;
  return b.count > limit ? Math.ceil((b.resetAt - now) / 1000) : 0;
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
