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

/**
 * /api/scan rate limit. Only counts NEW-domain scans — cached hits short-
 * circuit in `runScan` before reaching the limiter, so a user re-visiting
 * already-scanned products is unconstrained.
 *
 * 15-over-3-hours (avg 5/h) absorbs evening-brainstorm bursts without
 * encouraging scripted scanning. The wider window also gives shared-NAT
 * users (coworking, mobile carriers) more headroom than a flat hourly cap.
 */
let _scanLimiter: Ratelimit | null | undefined;
export function getScanRateLimiter(): Ratelimit | null {
  if (_scanLimiter !== undefined) return _scanLimiter;
  const redis = getRedis();
  if (!redis) {
    _scanLimiter = null;
    return null;
  }
  _scanLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(15, "3 h"),
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
 * /api/purchase rate limit. Each request creates a Stripe Checkout session +
 * a `pending` purchase row, so abuse maps directly to Stripe API spend and DB
 * bloat. 10/hour per IP is generous for legitimate use (the modal is a single
 * click; nobody legitimately retries 10 times in an hour) but stops scripted
 * abuse cold.
 */
let _purchaseLimiter: Ratelimit | null | undefined;
export function getPurchaseRateLimiter(): Ratelimit | null {
  if (_purchaseLimiter !== undefined) return _purchaseLimiter;
  const redis = getRedis();
  if (!redis) {
    _purchaseLimiter = null;
    return null;
  }
  _purchaseLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    prefix: "saaspo:purchase:ip",
    analytics: false,
  });
  return _purchaseLimiter;
}

/**
 * /api/guide/[slug] rate limit. The token itself is unguessable (32 random
 * bytes), so this isn't really anti-brute-force — it's anti-amplification:
 * it caps the rate at which a scanner can force Supabase lookups. 10/min
 * is still 10× what any human would do (initial click + maybe a refresh).
 */
let _guideLimiter: Ratelimit | null | undefined;
export function getGuideRateLimiter(): Ratelimit | null {
  if (_guideLimiter !== undefined) return _guideLimiter;
  const redis = getRedis();
  if (!redis) {
    _guideLimiter = null;
    return null;
  }
  _guideLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "saaspo:guide:ip",
    analytics: false,
  });
  return _guideLimiter;
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
