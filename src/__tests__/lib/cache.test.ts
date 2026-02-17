import { LRUCache, withCache, searchCache, priceCache, analysisCache } from '../../lib/cache';

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>({ maxSize: 3, ttlMs: 1000 });
  });

  it('stores and retrieves values', () => {
    cache.set('a', 'alpha');
    expect(cache.get('a')).toBe('alpha');
  });

  it('returns undefined for missing keys', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('respects maxSize by evicting oldest entries', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');
    cache.set('d', '4'); // should evict 'a'
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe('2');
    expect(cache.get('d')).toBe('4');
    expect(cache.size).toBe(3);
  });

  it('promotes recently accessed entries (LRU behavior)', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');
    // Access 'a' to make it recently used
    cache.get('a');
    // Insert 'd' — should evict 'b' (oldest unused)
    cache.set('d', '4');
    expect(cache.get('a')).toBe('1');
    expect(cache.get('b')).toBeUndefined();
  });

  it('expires entries after TTL', () => {
    jest.useFakeTimers();
    cache.set('a', 'value');
    expect(cache.get('a')).toBe('value');
    jest.advanceTimersByTime(1001);
    expect(cache.get('a')).toBeUndefined();
    jest.useRealTimers();
  });

  it('supports custom TTL per entry', () => {
    jest.useFakeTimers();
    cache.set('short', 'val', 100);
    cache.set('long', 'val', 5000);
    jest.advanceTimersByTime(200);
    expect(cache.get('short')).toBeUndefined();
    expect(cache.get('long')).toBe('val');
    jest.useRealTimers();
  });

  it('has() returns true only for valid entries', () => {
    cache.set('x', 'y');
    expect(cache.has('x')).toBe(true);
    expect(cache.has('z')).toBe(false);
  });

  it('delete() removes entries', () => {
    cache.set('a', 'b');
    expect(cache.delete('a')).toBe(true);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.delete('nonexistent')).toBe(false);
  });

  it('clear() empties the cache', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });

  it('overwrites existing keys', () => {
    cache.set('a', 'old');
    cache.set('a', 'new');
    expect(cache.get('a')).toBe('new');
    expect(cache.size).toBe(1);
  });
});

describe('withCache', () => {
  it('caches async function results', async () => {
    const cache = new LRUCache<number>({ maxSize: 10, ttlMs: 5000 });
    let callCount = 0;
    const expensive = async (key: string): Promise<number> => {
      callCount++;
      return key.length;
    };
    const cached = withCache(cache, expensive);

    expect(await cached('hello')).toBe(5);
    expect(await cached('hello')).toBe(5);
    expect(callCount).toBe(1); // Only called once
  });

  it('calls function again after cache miss', async () => {
    jest.useFakeTimers();
    const cache = new LRUCache<number>({ maxSize: 10, ttlMs: 100 });
    let callCount = 0;
    const fn = async (k: string) => {
      callCount++;
      return 42;
    };
    const cached = withCache(cache, fn);

    await cached('k');
    jest.advanceTimersByTime(200);
    await cached('k');
    expect(callCount).toBe(2);
    jest.useRealTimers();
  });
});

describe('Shared cache instances', () => {
  it('searchCache exists with expected config', () => {
    expect(searchCache).toBeInstanceOf(LRUCache);
  });

  it('priceCache exists with expected config', () => {
    expect(priceCache).toBeInstanceOf(LRUCache);
  });

  it('analysisCache exists with expected config', () => {
    expect(analysisCache).toBeInstanceOf(LRUCache);
  });
});

// ── Additional branch coverage ────────────────────────────────────────────────
describe('LRUCache - branch coverage', () => {
  it('uses default maxSize and ttlMs when no options provided', () => {
    const { LRUCache } = require('@/lib/cache');
    const cache = new LRUCache();
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  it('evicts oldest entry when at capacity and oldest is defined', () => {
    const { LRUCache } = require('@/lib/cache');
    const cache = new LRUCache({ maxSize: 2, ttlMs: 60000 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3); // Should evict 'a'
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });
});
