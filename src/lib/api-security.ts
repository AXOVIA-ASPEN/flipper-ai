/**
 * API security utilities: headers, API key auth, CORS, CSRF, and input validation helpers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';

// ---------------------------------------------------------------------------
// Security Headers
// ---------------------------------------------------------------------------

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

/** Apply security headers to a NextResponse */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = new Set((process.env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean));

// Always allow same-origin and localhost in dev
if (process.env.NODE_ENV !== 'production') {
  ALLOWED_ORIGINS.add('http://localhost:3000');
  ALLOWED_ORIGINS.add('http://127.0.0.1:3000');
}

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-CSRF-Token',
    'Access-Control-Max-Age': '86400',
  };

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

// ---------------------------------------------------------------------------
// API Key Authentication (for external integrations)
// ---------------------------------------------------------------------------

/**
 * Validate an API key from the X-API-Key header.
 * Keys are stored as comma-separated values in FLIPPER_API_KEYS env var.
 */
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) return false;

  const validKeys = (process.env.FLIPPER_API_KEYS ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  return validKeys.includes(apiKey);
}

// ---------------------------------------------------------------------------
// CSRF Protection
// ---------------------------------------------------------------------------

/**
 * Validate CSRF token for state-changing requests.
 * In Next.js with NextAuth, the session cookie + same-origin checks provide
 * baseline CSRF protection. This adds an explicit token header check for
 * extra safety on mutation endpoints.
 */
export function validateCsrf(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  // Safe methods don't need CSRF
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;

  // Check origin matches
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) return true;
    } catch {
      // malformed origin
    }
  }

  // Allow requests with valid API key (machine-to-machine)
  if (validateApiKey(request)) return true;

  // Require CSRF token header for cross-origin mutations
  const csrfToken = request.headers.get('x-csrf-token');
  const csrfCookie = request.cookies.get('csrf-token')?.value;
  if (csrfToken && csrfCookie && csrfToken === csrfCookie) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Request Validation Helper
// ---------------------------------------------------------------------------

/**
 * Parse and validate request JSON body against a Zod schema.
 * Returns typed data or a 400 error response.
 */
export async function validateRequestBody<T extends z.ZodType>(
  request: NextRequest,
  schema: T
): Promise<{ data: z.infer<T>; error?: never } | { data?: never; error: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      error: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
    };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      error: NextResponse.json(
        { error: 'Validation failed', issues: result.error.issues },
        { status: 400 }
      ),
    };
  }

  return { data: result.data };
}

// ---------------------------------------------------------------------------
// Client IP extraction
// ---------------------------------------------------------------------------

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}
