import { rateLimit, resetRateLimiter, DEFAULT_CONFIG, ENDPOINT_CONFIGS } from "../lib/rate-limiter";

describe("rate-limiter", () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it("allows requests within limit", () => {
    const result = rateLimit("1.2.3.4", "/api/listings");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(DEFAULT_CONFIG.limit - 1);
  });

  it("blocks after exceeding limit", () => {
    const ip = "10.0.0.1";
    const path = "/api/listings";
    for (let i = 0; i < DEFAULT_CONFIG.limit; i++) {
      const r = rateLimit(ip, path);
      expect(r.allowed).toBe(true);
    }
    const blocked = rateLimit(ip, path);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("uses endpoint-specific config for /api/auth/register", () => {
    const ip = "10.0.0.2";
    const path = "/api/auth/register";
    const cfg = ENDPOINT_CONFIGS[path];
    for (let i = 0; i < cfg.limit; i++) {
      expect(rateLimit(ip, path).allowed).toBe(true);
    }
    expect(rateLimit(ip, path).allowed).toBe(false);
  });

  it("tracks different IPs independently", () => {
    const path = "/api/listings";
    rateLimit("a", path);
    rateLimit("b", path);
    expect(rateLimit("a", path).remaining).toBe(DEFAULT_CONFIG.limit - 2);
    expect(rateLimit("b", path).remaining).toBe(DEFAULT_CONFIG.limit - 2);
  });

  it("tracks per-user when userId provided", () => {
    const result = rateLimit("1.1.1.1", "/api/listings", "user-123");
    expect(result.allowed).toBe(true);
  });

  it("returns rate limit metadata", () => {
    const result = rateLimit("5.5.5.5", "/api/listings");
    expect(result).toHaveProperty("limit");
    expect(result).toHaveProperty("remaining");
    expect(result).toHaveProperty("resetAt");
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it("blocks per-user after exceeding user limit (2x IP limit)", () => {
    const ip = "10.0.0.50";
    const path = "/api/analyze";
    const userId = "user-heavy";
    const cfg = ENDPOINT_CONFIGS[path]; // limit: 10
    const userLimit = cfg.limit * 2; // 20

    // Use unique IPs to avoid IP-level blocking, same userId
    for (let i = 0; i < userLimit; i++) {
      const r = rateLimit(`ip-${i}`, path, userId);
      expect(r.allowed).toBe(true);
    }
    // Next request from a fresh IP should still be blocked by user limit
    const blocked = rateLimit("ip-fresh", path, userId);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets expired entries on next check", () => {
    const ip = "10.0.0.99";
    const path = "/api/listings";

    // Exhaust the limit
    for (let i = 0; i < DEFAULT_CONFIG.limit; i++) {
      rateLimit(ip, path);
    }
    expect(rateLimit(ip, path).allowed).toBe(false);

    // Simulate time passing beyond the window by manipulating Date.now
    const originalNow = Date.now;
    Date.now = () => originalNow() + (DEFAULT_CONFIG.windowSeconds + 1) * 1000;

    // Should be allowed again (entry expired)
    const result = rateLimit(ip, path);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(DEFAULT_CONFIG.limit - 1);

    Date.now = originalNow;
  });

  it("returns combined remaining from IP and user limits", () => {
    const path = "/api/listings";
    // Make several requests as a user
    for (let i = 0; i < 10; i++) {
      rateLimit("10.0.0.60", path, "user-combo");
    }
    const result = rateLimit("10.0.0.60", path, "user-combo");
    expect(result.allowed).toBe(true);
    // remaining should be min of IP remaining and user remaining
    expect(result.remaining).toBeLessThanOrEqual(DEFAULT_CONFIG.limit - 11);
  });

  it("uses /api/auth config for sub-paths of /api/auth", () => {
    const ip = "10.0.0.70";
    const path = "/api/auth/login";
    const cfg = ENDPOINT_CONFIGS["/api/auth"]; // limit: 20
    const result = rateLimit(ip, path);
    expect(result.limit).toBe(cfg.limit);
  });

  it("falls back to DEFAULT_CONFIG for unknown paths", () => {
    const result = rateLimit("10.0.0.80", "/api/unknown-endpoint");
    expect(result.limit).toBe(DEFAULT_CONFIG.limit);
  });

  it("cleanup interval removes expired entries", () => {
    jest.useFakeTimers();

    // Create some entries
    rateLimit("cleanup-ip", "/api/listings");
    rateLimit("cleanup-ip2", "/api/listings", "cleanup-user");

    // Advance past the window so entries expire
    jest.advanceTimersByTime(DEFAULT_CONFIG.windowSeconds * 1000 + 1000);

    // Advance past the cleanup interval (5 minutes)
    jest.advanceTimersByTime(5 * 60 * 1000);

    // After cleanup, a new request should start fresh
    const result = rateLimit("cleanup-ip", "/api/listings");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(DEFAULT_CONFIG.limit - 1);

    jest.useRealTimers();
  });
});
