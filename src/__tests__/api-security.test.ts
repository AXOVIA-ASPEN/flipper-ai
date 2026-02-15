/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import {
  applySecurityHeaders,
  getClientIp,
  getCorsHeaders,
  validateApiKey,
  validateCsrf,
  validateRequestBody,
} from "../lib/api-security";

describe("api-security", () => {
  describe("applySecurityHeaders", () => {
    it("sets all security headers", () => {
      const response = NextResponse.next();
      applySecurityHeaders(response);
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
      expect(response.headers.get("X-XSS-Protection")).toBe("1; mode=block");
      expect(response.headers.get("Referrer-Policy")).toBe(
        "strict-origin-when-cross-origin"
      );
      expect(response.headers.get("Permissions-Policy")).toBe(
        "camera=(), microphone=(), geolocation=()"
      );
      expect(response.headers.get("Strict-Transport-Security")).toContain(
        "max-age="
      );
    });
  });

  describe("getClientIp", () => {
    it("extracts from x-forwarded-for", () => {
      const req = new NextRequest("http://localhost/api/test", {
        headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
      });
      expect(getClientIp(req)).toBe("1.2.3.4");
    });

    it("falls back to x-real-ip", () => {
      const req = new NextRequest("http://localhost/api/test", {
        headers: { "x-real-ip": "9.8.7.6" },
      });
      expect(getClientIp(req)).toBe("9.8.7.6");
    });

    it("returns unknown when no ip headers", () => {
      const req = new NextRequest("http://localhost/api/test");
      expect(getClientIp(req)).toBe("unknown");
    });
  });

  describe("getCorsHeaders", () => {
    it("includes origin for allowed origins in dev", () => {
      const headers = getCorsHeaders("http://localhost:3000");
      expect(headers["Access-Control-Allow-Origin"]).toBe(
        "http://localhost:3000"
      );
    });

    it("does not include origin for unknown origins", () => {
      const headers = getCorsHeaders("http://evil.com");
      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
    });

    it("always includes methods and headers", () => {
      const headers = getCorsHeaders(null);
      expect(headers["Access-Control-Allow-Methods"]).toBeDefined();
      expect(headers["Access-Control-Allow-Headers"]).toBeDefined();
    });
  });

  describe("validateApiKey", () => {
    const originalEnv = process.env.FLIPPER_API_KEYS;

    afterEach(() => {
      if (originalEnv === undefined) delete process.env.FLIPPER_API_KEYS;
      else process.env.FLIPPER_API_KEYS = originalEnv;
    });

    it("returns false when no x-api-key header", () => {
      const req = new NextRequest("http://localhost/api/test");
      expect(validateApiKey(req)).toBe(false);
    });

    it("returns false when key not in valid keys", () => {
      process.env.FLIPPER_API_KEYS = "key1,key2";
      const req = new NextRequest("http://localhost/api/test", {
        headers: { "x-api-key": "badkey" },
      });
      expect(validateApiKey(req)).toBe(false);
    });

    it("returns true when key matches", () => {
      process.env.FLIPPER_API_KEYS = "key1,key2";
      const req = new NextRequest("http://localhost/api/test", {
        headers: { "x-api-key": "key2" },
      });
      expect(validateApiKey(req)).toBe(true);
    });

    it("returns false when FLIPPER_API_KEYS is empty", () => {
      process.env.FLIPPER_API_KEYS = "";
      const req = new NextRequest("http://localhost/api/test", {
        headers: { "x-api-key": "anything" },
      });
      expect(validateApiKey(req)).toBe(false);
    });
  });

  describe("validateCsrf", () => {
    const originalEnv = process.env.FLIPPER_API_KEYS;

    afterEach(() => {
      if (originalEnv === undefined) delete process.env.FLIPPER_API_KEYS;
      else process.env.FLIPPER_API_KEYS = originalEnv;
    });

    it("allows GET requests", () => {
      const req = new NextRequest("http://localhost/api/test", { method: "GET" });
      expect(validateCsrf(req)).toBe(true);
    });

    it("allows HEAD requests", () => {
      const req = new NextRequest("http://localhost/api/test", { method: "HEAD" });
      expect(validateCsrf(req)).toBe(true);
    });

    it("allows OPTIONS requests", () => {
      const req = new NextRequest("http://localhost/api/test", { method: "OPTIONS" });
      expect(validateCsrf(req)).toBe(true);
    });

    it("allows POST when origin matches host", () => {
      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        headers: { origin: "http://localhost:3000", host: "localhost:3000" },
      });
      expect(validateCsrf(req)).toBe(true);
    });

    it("allows POST with valid API key", () => {
      process.env.FLIPPER_API_KEYS = "secret123";
      const req = new NextRequest("http://localhost/api/test", {
        method: "POST",
        headers: { "x-api-key": "secret123" },
      });
      expect(validateCsrf(req)).toBe(true);
    });

    it("allows POST with matching CSRF token and cookie", () => {
      const req = new NextRequest("http://localhost/api/test", {
        method: "POST",
        headers: {
          "x-csrf-token": "tok123",
          cookie: "csrf-token=tok123",
        },
      });
      expect(validateCsrf(req)).toBe(true);
    });

    it("rejects POST with no protection", () => {
      process.env.FLIPPER_API_KEYS = "";
      const req = new NextRequest("http://localhost/api/test", {
        method: "POST",
      });
      expect(validateCsrf(req)).toBe(false);
    });

    it("rejects POST with mismatched origin", () => {
      process.env.FLIPPER_API_KEYS = "";
      const req = new NextRequest("http://localhost/api/test", {
        method: "POST",
        headers: { origin: "http://evil.com", host: "localhost:3000" },
      });
      expect(validateCsrf(req)).toBe(false);
    });

    it("handles malformed origin gracefully", () => {
      process.env.FLIPPER_API_KEYS = "";
      const req = new NextRequest("http://localhost/api/test", {
        method: "POST",
        headers: { origin: "not-a-url", host: "localhost:3000" },
      });
      expect(validateCsrf(req)).toBe(false);
    });

    it("rejects POST with mismatched CSRF token", () => {
      process.env.FLIPPER_API_KEYS = "";
      const req = new NextRequest("http://localhost/api/test", {
        method: "POST",
        headers: {
          "x-csrf-token": "tok123",
          cookie: "csrf-token=different",
        },
      });
      expect(validateCsrf(req)).toBe(false);
    });
  });

  describe("validateRequestBody", () => {
    const schema = z.object({ name: z.string(), age: z.number() });

    it("returns data for valid body", async () => {
      const req = new NextRequest("http://localhost/api/test", {
        method: "POST",
        body: JSON.stringify({ name: "Alice", age: 30 }),
        headers: { "content-type": "application/json" },
      });
      const result = await validateRequestBody(req, schema);
      expect(result.data).toEqual({ name: "Alice", age: 30 });
      expect(result.error).toBeUndefined();
    });

    it("returns 400 for invalid JSON", async () => {
      const req = new NextRequest("http://localhost/api/test", {
        method: "POST",
        body: "not json",
        headers: { "content-type": "application/json" },
      });
      const result = await validateRequestBody(req, schema);
      expect(result.error).toBeDefined();
      expect(result.error!.status).toBe(400);
    });

    it("returns 400 for schema mismatch", async () => {
      const req = new NextRequest("http://localhost/api/test", {
        method: "POST",
        body: JSON.stringify({ name: 123 }),
        headers: { "content-type": "application/json" },
      });
      const result = await validateRequestBody(req, schema);
      expect(result.error).toBeDefined();
      expect(result.error!.status).toBe(400);
    });
  });
});
