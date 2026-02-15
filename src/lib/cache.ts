/**
 * In-memory LRU cache with TTL support for Flipper AI.
 *
 * Usage:
 *   const cache = new LRUCache<string>({ maxSize: 100, ttlMs: 60_000 });
 *   cache.set('key', 'value');
 *   cache.get('key'); // 'value' | undefined
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface LRUCacheOptions {
  /** Maximum number of entries (default 500) */
  maxSize?: number;
  /** Time-to-live in ms (default 5 minutes) */
  ttlMs?: number;
}

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(opts: LRUCacheOptions = {}) {
    this.maxSize = opts.maxSize ?? 500;
    this.ttlMs = opts.ttlMs ?? 5 * 60 * 1000;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    // Delete first to reset position
    this.cache.delete(key);
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.ttlMs),
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// ── Shared cache instances ──────────────────────────────────────────

/** Cache for marketplace search results (2 min TTL) */
export const searchCache = new LRUCache<unknown>({ maxSize: 200, ttlMs: 2 * 60 * 1000 });

/** Cache for price lookups / market value (10 min TTL) */
export const priceCache = new LRUCache<unknown>({ maxSize: 500, ttlMs: 10 * 60 * 1000 });

/** Cache for AI analysis results (30 min TTL — expensive calls) */
export const analysisCache = new LRUCache<unknown>({ maxSize: 100, ttlMs: 30 * 60 * 1000 });

// ── Helper: cached async function wrapper ───────────────────────────

/**
 * Wrap an async function with caching.
 *
 * @example
 *   const cachedFetch = withCache(priceCache, fetchMarketPrice);
 *   const price = await cachedFetch('nintendo-64');
 */
export function withCache<A extends string, R>(
  cache: LRUCache<R>,
  fn: (arg: A) => Promise<R>,
): (arg: A) => Promise<R> {
  return async (arg: A): Promise<R> => {
    const cached = cache.get(arg) as R | undefined;
    if (cached !== undefined) return cached;
    const result = await fn(arg);
    cache.set(arg, result);
    return result;
  };
}
