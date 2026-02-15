/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from "next/server";
import {
  applySecurityHeaders,
  getClientIp,
  getCorsHeaders,
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
});
