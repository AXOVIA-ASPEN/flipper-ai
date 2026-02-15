/**
 * In-memory rate limiter with per-IP and per-user tracking.
 * Configurable limits per endpoint pattern.
 *
 * For production at scale, swap the Map store for Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  /** Max requests in the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  limit: 60,
  windowSeconds: 60,
};

/** Per-endpoint overrides (path prefix match) */
const ENDPOINT_CONFIGS: Record<string, RateLimitConfig> = {
  "/api/auth/register": { limit: 5, windowSeconds: 300 },
  "/api/auth": { limit: 20, windowSeconds: 60 },
  "/api/analyze": { limit: 10, windowSeconds: 60 },
  "/api/scrape": { limit: 5, windowSeconds: 60 },
  "/api/scraper": { limit: 5, windowSeconds: 60 },
};

// In-memory stores (reset on server restart — fine for single-instance)
const ipStore = new Map<string, RateLimitEntry>();
const userStore = new Map<string, RateLimitEntry>();

// Periodic cleanup every 5 minutes
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of ipStore) if (v.resetAt <= now) ipStore.delete(k);
    for (const [k, v] of userStore) if (v.resetAt <= now) userStore.delete(k);
  }, 5 * 60 * 1000);
  // Don't prevent process exit
  if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

function getConfig(pathname: string): RateLimitConfig {
  for (const [prefix, cfg] of Object.entries(ENDPOINT_CONFIGS)) {
    if (pathname.startsWith(prefix)) return cfg;
  }
  return DEFAULT_CONFIG;
}

function check(
  store: Map<string, RateLimitEntry>,
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  ensureCleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + config.windowSeconds * 1000;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.limit - 1, resetAt };
  }

  entry.count++;
  store.set(key, entry);

  if (entry.count > config.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return {
    allowed: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
}

/**
 * Check rate limit for a request.
 * @param ip      Client IP address
 * @param pathname  Request pathname (e.g. /api/listings)
 * @param userId  Optional authenticated user ID (stricter per-user limits applied separately)
 */
export function rateLimit(
  ip: string,
  pathname: string,
  userId?: string | null
): RateLimitResult {
  const config = getConfig(pathname);
  const ipKey = `${ip}:${pathname}`;
  const ipResult = check(ipStore, ipKey, config);

  if (!ipResult.allowed) {
    return { allowed: false, remaining: 0, limit: config.limit, resetAt: ipResult.resetAt };
  }

  // Per-user limit (2x the IP limit) if authenticated
  if (userId) {
    const userConfig = { ...config, limit: config.limit * 2 };
    const userKey = `user:${userId}:${pathname}`;
    const userResult = check(userStore, userKey, userConfig);
    if (!userResult.allowed) {
      return { allowed: false, remaining: 0, limit: userConfig.limit, resetAt: userResult.resetAt };
    }
    return { allowed: true, remaining: Math.min(ipResult.remaining, userResult.remaining), limit: config.limit, resetAt: ipResult.resetAt };
  }

  return { allowed: true, remaining: ipResult.remaining, limit: config.limit, resetAt: ipResult.resetAt };
}

/** Reset stores and cleanup timer — useful for tests */
export function resetRateLimiter() {
  ipStore.clear();
  userStore.clear();
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

export { ENDPOINT_CONFIGS, DEFAULT_CONFIG };
