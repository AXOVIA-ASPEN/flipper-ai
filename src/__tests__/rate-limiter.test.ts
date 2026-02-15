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
});
