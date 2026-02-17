import { rateLimit, resetRateLimiter, ENDPOINT_CONFIGS, DEFAULT_CONFIG } from '@/lib/rate-limiter';

describe('rate-limiter', () => {
  beforeEach(() => {
    resetRateLimiter();
    jest.useFakeTimers();
  });

  afterEach(() => {
    resetRateLimiter();
    jest.useRealTimers();
  });

  describe('DEFAULT_CONFIG', () => {
    it('has sensible defaults', () => {
      expect(DEFAULT_CONFIG.limit).toBe(60);
      expect(DEFAULT_CONFIG.windowSeconds).toBe(60);
    });
  });

  describe('ENDPOINT_CONFIGS', () => {
    it('has stricter limits for auth registration', () => {
      expect(ENDPOINT_CONFIGS['/api/auth/register'].limit).toBe(5);
      expect(ENDPOINT_CONFIGS['/api/auth/register'].windowSeconds).toBe(300);
    });

    it('has limits for analyze and scrape endpoints', () => {
      expect(ENDPOINT_CONFIGS['/api/analyze'].limit).toBe(10);
      expect(ENDPOINT_CONFIGS['/api/scrape'].limit).toBe(5);
    });
  });

  describe('rateLimit', () => {
    it('allows first request and returns correct remaining count', () => {
      const result = rateLimit('1.2.3.4', '/api/listings');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(DEFAULT_CONFIG.limit - 1);
      expect(result.limit).toBe(DEFAULT_CONFIG.limit);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it('uses endpoint-specific config for matching paths', () => {
      const result = rateLimit('1.2.3.4', '/api/auth/register');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(4);
    });

    it('matches longer prefix over shorter (register vs auth)', () => {
      // /api/auth/register should match its own config (limit 5), not /api/auth (limit 20)
      const result = rateLimit('1.2.3.4', '/api/auth/register');
      expect(result.limit).toBe(5);
    });

    it('uses /api/auth config for non-register auth paths', () => {
      const result = rateLimit('1.2.3.4', '/api/auth/login');
      expect(result.limit).toBe(20);
    });

    it('blocks requests after limit is exceeded', () => {
      const ip = '10.0.0.1';
      const path = '/api/scrape/test';

      // scrape limit is 5
      for (let i = 0; i < 5; i++) {
        const r = rateLimit(ip, path);
        expect(r.allowed).toBe(true);
      }

      const blocked = rateLimit(ip, path);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it('resets after window expires', () => {
      const ip = '10.0.0.2';
      const path = '/api/scrape/items';

      // Exhaust limit
      for (let i = 0; i < 5; i++) {
        rateLimit(ip, path);
      }
      expect(rateLimit(ip, path).allowed).toBe(false);

      // Advance past window (60 seconds for scrape)
      jest.advanceTimersByTime(61_000);

      const result = rateLimit(ip, path);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // fresh window
    });

    it('tracks different IPs independently', () => {
      const path = '/api/scrape/test';

      for (let i = 0; i < 5; i++) {
        rateLimit('ip-a', path);
      }
      expect(rateLimit('ip-a', path).allowed).toBe(false);

      // Different IP should still be allowed
      const result = rateLimit('ip-b', path);
      expect(result.allowed).toBe(true);
    });

    it('tracks different paths independently for same IP', () => {
      const ip = '10.0.0.3';

      for (let i = 0; i < 5; i++) {
        rateLimit(ip, '/api/scrape/a');
      }
      expect(rateLimit(ip, '/api/scrape/a').allowed).toBe(false);

      // Different path (same prefix, same config, but different key)
      const result = rateLimit(ip, '/api/analyze/b');
      expect(result.allowed).toBe(true);
    });

    describe('per-user limits', () => {
      it('applies 2x limit for authenticated users', () => {
        const ip = '10.0.0.4';
        const path = '/api/scrape/items';
        const userId = 'user-123';

        // IP limit is 5, user limit is 10
        // Make 5 requests - IP should still allow, user has headroom
        for (let i = 0; i < 5; i++) {
          const r = rateLimit(ip, path, userId);
          expect(r.allowed).toBe(true);
        }

        // 6th request should be blocked by IP limit
        const blocked = rateLimit(ip, path, userId);
        expect(blocked.allowed).toBe(false);
      });

      it('blocks when user limit exceeded even if IP has remaining', () => {
        const path = '/api/listings';
        const userId = 'user-456';

        // User limit is 120 (60 * 2), IP limit is 60
        // Use different IPs but same user to exhaust user limit
        for (let i = 0; i < 60; i++) {
          rateLimit(`ip-${i}`, path, userId);
        }
        for (let i = 0; i < 60; i++) {
          rateLimit(`ip-${i + 100}`, path, userId);
        }

        // Next request from fresh IP but same user should be blocked by user limit
        const result = rateLimit('fresh-ip', path, userId);
        expect(result.allowed).toBe(false);
      });

      it('returns minimum of IP and user remaining', () => {
        const ip = '10.0.0.5';
        const path = '/api/listings';
        const userId = 'user-789';

        const result = rateLimit(ip, path, userId);
        expect(result.allowed).toBe(true);
        // IP remaining: 59, user remaining: 119 → min is 59
        expect(result.remaining).toBe(59);
      });

      it('does not apply user limits when userId is null', () => {
        const ip = '10.0.0.6';
        const path = '/api/listings';

        const result = rateLimit(ip, path, null);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(59);
      });
    });
  });

  describe('resetRateLimiter', () => {
    it('clears all rate limit state', () => {
      const ip = '10.0.0.7';
      const path = '/api/scrape/test';

      for (let i = 0; i < 5; i++) {
        rateLimit(ip, path);
      }
      expect(rateLimit(ip, path).allowed).toBe(false);

      resetRateLimiter();

      const result = rateLimit(ip, path);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });
  });

  describe('cleanup timer', () => {
    it('cleans up expired entries periodically', () => {
      // Make a request to start the cleanup timer
      rateLimit('cleanup-ip', '/api/listings');

      // Advance past window
      jest.advanceTimersByTime(61_000);

      // Advance to trigger cleanup (5 minutes)
      jest.advanceTimersByTime(5 * 60 * 1000);

      // After cleanup, a new request should get a fresh window
      const result = rateLimit('cleanup-ip', '/api/listings');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(59);
    });
  });

  describe('edge cases', () => {
    it('handles empty pathname', () => {
      const result = rateLimit('1.2.3.4', '');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(DEFAULT_CONFIG.limit);
    });

    it('handles empty IP', () => {
      const result = rateLimit('', '/api/listings');
      expect(result.allowed).toBe(true);
    });

    it('correctly decrements remaining on successive calls', () => {
      const ip = '10.0.0.8';
      const path = '/api/analyze/test';
      // analyze limit is 10

      for (let i = 0; i < 10; i++) {
        const r = rateLimit(ip, path);
        expect(r.remaining).toBe(10 - 1 - i);
      }
    });

    it('returns resetAt in the blocked response', () => {
      const ip = '10.0.0.9';
      const path = '/api/scrape/test';

      for (let i = 0; i < 5; i++) {
        rateLimit(ip, path);
      }

      const blocked = rateLimit(ip, path);
      expect(blocked.allowed).toBe(false);
      expect(blocked.resetAt).toBeGreaterThan(Date.now());
    });
  });
});
