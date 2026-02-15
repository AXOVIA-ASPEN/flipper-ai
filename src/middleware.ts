/**
 * Next.js Middleware
 * - Security headers on all responses
 * - CORS handling
 * - Rate limiting on API routes
 * - CSRF validation on mutations
 * - Auth integration via NextAuth
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limiter";
import {
  applySecurityHeaders,
  getCorsHeaders,
  getClientIp,
  validateCsrf,
} from "@/lib/api-security";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api");

  // --- CORS preflight ---
  if (req.method === "OPTIONS" && isApi) {
    const origin = req.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  // --- Rate limiting (API only) ---
  if (isApi && !pathname.startsWith("/api/auth/")) {
    const ip = getClientIp(req as unknown as NextRequest);
    const userId = req.auth?.user?.id ?? null;
    const result = rateLimit(ip, pathname, userId);

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Too many requests", retryAfter },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfter),
              "X-RateLimit-Limit": String(result.limit),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
            },
          }
        )
      );
    }
  }

  // --- CSRF check for API mutations ---
  if (isApi && !pathname.startsWith("/api/auth/")) {
    if (!validateCsrf(req as unknown as NextRequest)) {
      return applySecurityHeaders(
        NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
      );
    }
  }

  // --- Pass through with security headers ---
  const response = NextResponse.next();
  applySecurityHeaders(response);

  // Add CORS headers for API responses
  if (isApi) {
    const origin = req.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
  }

  // Add rate limit info headers
  if (isApi && !pathname.startsWith("/api/auth/")) {
    const ip = getClientIp(req as unknown as NextRequest);
    const userId = req.auth?.user?.id ?? null;
    const result = rateLimit(ip, pathname, userId);
    response.headers.set("X-RateLimit-Limit", String(result.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
  }

  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
