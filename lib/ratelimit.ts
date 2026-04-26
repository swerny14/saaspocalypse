import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

/**
 * Lazy Upstash Redis client. Returns null if env vars aren't configured so
 * local dev works without provisioning Redis — rate limits + locks degrade
 * to pass-through in that case.
 */
let _redis: Redis | null | undefined;
export function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    _redis = null;
    return null;
  }
  _redis = new Redis({ url, token });
  return _redis;
}

let _scanLimiter: Ratelimit | null | undefined;
export function getScanRateLimiter(): Ratelimit | null {
  if (_scanLimiter !== undefined) return _scanLimiter;
  const redis = getRedis();
  if (!redis) {
    _scanLimiter = null;
    return null;
  }
  const limit = Number(process.env.SCAN_RATE_LIMIT_PER_HOUR ?? 5);
  _scanLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, "1 h"),
    prefix: "saaspo:scan:ip",
    analytics: false,
  });
  return _scanLimiter;
}

let _viewLimiter: Ratelimit | null | undefined;
export function getViewRateLimiter(): Ratelimit | null {
  if (_viewLimiter !== undefined) return _viewLimiter;
  const redis = getRedis();
  if (!redis) {
    _viewLimiter = null;
    return null;
  }
  _viewLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    prefix: "saaspo:view:ip",
    analytics: false,
  });
  return _viewLimiter;
}

/**
 * Acquire a short-lived exclusive lock for a domain. Returns true if the lock
 * was acquired. If Redis isn't configured, returns true (no locking in dev).
 */
export async function acquireDomainLock(
  domain: string,
  ttlSeconds = 60,
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;
  const result = await redis.set(`saaspo:scan:lock:${domain}`, "1", {
    nx: true,
    ex: ttlSeconds,
  });
  return result === "OK";
}

export async function releaseDomainLock(domain: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(`saaspo:scan:lock:${domain}`);
}
