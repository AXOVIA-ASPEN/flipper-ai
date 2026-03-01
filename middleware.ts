/**
 * Next.js Middleware
 *
 * Handles:
 * 1. CORS for API routes (preflight + response headers)
 * 2. Cache-Control for API responses
 * 3. Session cookie auth check on protected routes
 *
 * Runs only on the Cloud Run build (output: 'standalone').
 * The static export for Firebase Hosting has no server-side middleware.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders } from '@/lib/api-security';

const SESSION_COOKIE_NAME = '__session';

// Routes that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/api/auth/',
  '/api/health',
  '/api/webhooks/',
  '/privacy',
  '/terms',
];

// Static file patterns to skip
const SKIP_PATTERNS = [
  '/_next/',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
];

// Mutating HTTP methods that require origin validation
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

function shouldSkip(pathname: string): boolean {
  return SKIP_PATTERNS.some((pattern) => pathname.startsWith(pattern));
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static files
  if (shouldSkip(pathname)) {
    return NextResponse.next();
  }

  // Generate request ID for tracing and propagate to downstream handlers
  const requestId = crypto.randomUUID();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-request-id', requestId);

  // --- CORS handling for API routes ---
  if (isApiRoute(pathname)) {
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    const hasAllowedOrigin = 'Access-Control-Allow-Origin' in corsHeaders;

    // OPTIONS preflight: return 204 with CORS headers
    if (req.method === 'OPTIONS') {
      const res = new NextResponse(null, { status: 204 });
      for (const [key, value] of Object.entries(corsHeaders)) {
        res.headers.set(key, value);
      }
      return res;
    }

    // Reject mutating requests from unauthorized origins
    if (origin && !hasAllowedOrigin && MUTATING_METHODS.has(req.method)) {
      return NextResponse.json(
        { error: 'Origin not allowed' },
        { status: 403 }
      );
    }

    // Continue with CORS + request ID propagated to route handlers
    const res = NextResponse.next({
      request: { headers: requestHeaders },
    });
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.headers.set(key, value);
    }

    // Request tracing headers on response
    res.headers.set('X-Request-Id', requestId);
    res.headers.set('X-Request-Start', Date.now().toString());

    // Health endpoint allows short CDN caching; all other API responses are uncacheable
    if (pathname === '/api/health') {
      res.headers.set('Cache-Control', 'public, max-age=0, s-maxage=60');
    } else {
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
    return res;
  }

  // --- Auth check for non-API protected routes ---
  if (isPublicPath(pathname)) {
    const res = NextResponse.next({
      request: { headers: requestHeaders },
    });
    res.headers.set('X-Request-Id', requestId);
    return res;
  }

  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Basic expiration check: decode JWT payload (without signature verification,
  // which requires Firebase Admin SDK unavailable in Edge Runtime) and check
  // the `exp` claim. Full verification happens in API route handlers.
  try {
    const payloadB64 = sessionCookie.split('.')[1];
    if (payloadB64) {
      const payload = JSON.parse(atob(payloadB64));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        const redirectResponse = NextResponse.redirect(loginUrl);
        redirectResponse.cookies.set(SESSION_COOKIE_NAME, '', {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 0,
          path: '/',
        });
        return redirectResponse;
      }
    }
  } catch {
    // If decode fails, let the request through — API routes will reject
    // the invalid token and return a proper 401.
  }

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });
  res.headers.set('X-Request-Id', requestId);
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
