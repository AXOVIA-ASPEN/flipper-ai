/**
 * @jest-environment node
 */

/**
 * Tests for Next.js middleware (src/middleware.ts)
 * Verifies security headers, request ID, and timing headers are applied.
 */

import { NextRequest } from 'next/server';

// Mock next/server NextResponse
jest.mock('next/server', () => {
  const headers = new Map<string, string>();
  return {
    NextResponse: {
      next: jest.fn(() => ({
        headers: {
          set: (key: string, value: string) => headers.set(key, value),
          get: (key: string) => headers.get(key),
          _map: headers,
        },
      })),
    },
    NextRequest: jest.fn(),
  };
});

describe('Next.js Middleware', () => {
  let middleware: (req: NextRequest) => unknown;

  beforeEach(() => {
    jest.resetModules();
    // Re-import after resetting modules so the mock header map is fresh
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      ({ middleware } = require('../middleware'));
    });
  });

  function makeRequest(path = '/api/test'): NextRequest {
    return {
      url: `http://localhost${path}`,
      method: 'GET',
    } as unknown as NextRequest;
  }

  it('applies X-Content-Type-Options header', () => {
    const req = makeRequest();
    const res = middleware(req) as { headers: { get: (k: string) => string | undefined } };
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('applies X-Frame-Options header', () => {
    const req = makeRequest();
    const res = middleware(req) as { headers: { get: (k: string) => string | undefined } };
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('applies Content-Security-Policy header', () => {
    const req = makeRequest();
    const res = middleware(req) as { headers: { get: (k: string) => string | undefined } };
    const csp = res.headers.get('Content-Security-Policy') ?? '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
  });

  it('applies Strict-Transport-Security header', () => {
    const req = makeRequest();
    const res = middleware(req) as { headers: { get: (k: string) => string | undefined } };
    const hsts = res.headers.get('Strict-Transport-Security') ?? '';
    expect(hsts).toContain('max-age=');
    expect(hsts).toContain('includeSubDomains');
  });

  it('adds X-Request-Id header (UUID format)', () => {
    const req = makeRequest();
    const res = middleware(req) as { headers: { get: (k: string) => string | undefined } };
    const requestId = res.headers.get('X-Request-Id') ?? '';
    expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('adds X-Request-Start timing header', () => {
    const req = makeRequest();
    const res = middleware(req) as { headers: { get: (k: string) => string | undefined } };
    const start = res.headers.get('X-Request-Start') ?? '';
    expect(Number(start)).toBeGreaterThan(0);
  });

  it('applies Referrer-Policy header', () => {
    const req = makeRequest();
    const res = middleware(req) as { headers: { get: (k: string) => string | undefined } };
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });

  it('applies Permissions-Policy header', () => {
    const req = makeRequest();
    const res = middleware(req) as { headers: { get: (k: string) => string | undefined } };
    expect(res.headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()');
  });

  it('applies X-XSS-Protection header', () => {
    const req = makeRequest();
    const res = middleware(req) as { headers: { get: (k: string) => string | undefined } };
    expect(res.headers.get('X-XSS-Protection')).toBe('1; mode=block');
  });
});
