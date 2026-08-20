/**
 * Simple in-process rate limiter for sensitive actions.
 * Good enough for a small private league on a single Node instance.
 * For multi-instance deploys, swap for Redis / Upstash.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const MAX_KEYS = 5_000;

function prune(now: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size >= MAX_KEYS) {
    const first = buckets.keys().next().value;
    if (first != null) buckets.delete(first);
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  prune(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { ok: true };
}

export const RATE_LIMITS = {
  chatPost: { limit: 20, windowMs: 60_000 },
  chatReact: { limit: 60, windowMs: 60_000 },
  taunt: { limit: 20, windowMs: 60_000 },
  baajiCreate: { limit: 10, windowMs: 60 * 60_000 },
  wallPost: { limit: 20, windowMs: 60_000 },
  penaltyAction: { limit: 40, windowMs: 60_000 },
} as const;
