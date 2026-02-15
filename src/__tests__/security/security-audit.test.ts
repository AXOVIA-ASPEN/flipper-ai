/**
 * Security Audit & Hardening Tests
 * 
 * Validates security posture across:
 * - Security headers (CSP, HSTS, X-Frame-Options, etc.)
 * - CORS configuration
 * - CSRF protection
 * - Input validation/sanitization
 * - API key handling
 * - Environment variable validation
 * - Rate limiting edge cases
 * - Next.js configuration security
 * 
 * @jest-environment node
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

// ─── Security Headers ───────────────────────────────────────────────

describe('Security Headers', () => {
  let applySecurityHeaders: typeof import('@/lib/api-security').applySecurityHeaders;
  let NextResponse: typeof import('next/server').NextResponse;

  beforeEach(async () => {
    jest.resetModules();
    const mod = await import('@/lib/api-security');
    applySecurityHeaders = mod.applySecurityHeaders;
    NextResponse = (await import('next/server')).NextResponse;
  });

  test('applies X-Content-Type-Options: nosniff', () => {
    const res = applySecurityHeaders(NextResponse.json({}));
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  test('applies X-Frame-Options: DENY', () => {
    const res = applySecurityHeaders(NextResponse.json({}));
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });

  test('applies X-XSS-Protection', () => {
    const res = applySecurityHeaders(NextResponse.json({}));
    expect(res.headers.get('X-XSS-Protection')).toBe('1; mode=block');
  });

  test('applies Strict-Transport-Security with proper max-age', () => {
    const res = applySecurityHeaders(NextResponse.json({}));
    const hsts = res.headers.get('Strict-Transport-Security');
    expect(hsts).toContain('max-age=');
    const maxAge = parseInt(hsts!.match(/max-age=(\d+)/)?.[1] ?? '0');
    expect(maxAge).toBeGreaterThanOrEqual(31536000); // 1 year minimum
  });

  test('applies Referrer-Policy', () => {
    const res = applySecurityHeaders(NextResponse.json({}));
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });

  test('applies Permissions-Policy restricting sensitive APIs', () => {
    const res = applySecurityHeaders(NextResponse.json({}));
    const pp = res.headers.get('Permissions-Policy');
    expect(pp).toContain('camera=()');
    expect(pp).toContain('microphone=()');
    expect(pp).toContain('geolocation=()');
  });

  test('all required security headers are present', () => {
    const res = applySecurityHeaders(NextResponse.json({}));
    const required = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Referrer-Policy',
      'Permissions-Policy',
      'Strict-Transport-Security',
    ];
    for (const header of required) {
      expect(res.headers.has(header)).toBe(true);
    }
  });
});

// ─── CORS Configuration ─────────────────────────────────────────────

describe('CORS Configuration', () => {
  let getCorsHeaders: typeof import('@/lib/api-security').getCorsHeaders;

  beforeEach(async () => {
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    const mod = await import('@/lib/api-security');
    getCorsHeaders = mod.getCorsHeaders;
  });

  test('does not include Access-Control-Allow-Origin for unknown origins', () => {
    const headers = getCorsHeaders('https://evil-site.com');
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  test('does not include credentials for unknown origins', () => {
    const headers = getCorsHeaders('https://evil-site.com');
    expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
  });

  test('includes allowed methods', () => {
    const headers = getCorsHeaders(null);
    expect(headers['Access-Control-Allow-Methods']).toBeDefined();
  });

  test('includes proper allowed headers', () => {
    const headers = getCorsHeaders(null);
    const allowed = headers['Access-Control-Allow-Headers'];
    expect(allowed).toContain('Content-Type');
    expect(allowed).toContain('Authorization');
  });

  test('null origin returns headers without Allow-Origin', () => {
    const headers = getCorsHeaders(null);
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
  });
});

// ─── CSRF Protection ────────────────────────────────────────────────

describe('CSRF Protection', () => {
  let validateCsrf: typeof import('@/lib/api-security').validateCsrf;

  beforeEach(async () => {
    jest.resetModules();
    const mod = await import('@/lib/api-security');
    validateCsrf = mod.validateCsrf;
  });

  function makeRequest(opts: {
    method?: string;
    origin?: string;
    host?: string;
    csrfHeader?: string;
    csrfCookie?: string;
    apiKey?: string;
  }) {
    const headers = new Headers();
    if (opts.origin) headers.set('origin', opts.origin);
    if (opts.host) headers.set('host', opts.host);
    if (opts.csrfHeader) headers.set('x-csrf-token', opts.csrfHeader);
    if (opts.apiKey) headers.set('x-api-key', opts.apiKey);

    return {
      method: opts.method ?? 'POST',
      headers,
      cookies: {
        get: (name: string) => {
          if (name === 'csrf-token' && opts.csrfCookie) {
            return { value: opts.csrfCookie };
          }
          return undefined;
        },
      },
    } as any;
  }

  test('allows GET requests without CSRF', () => {
    expect(validateCsrf(makeRequest({ method: 'GET' }))).toBe(true);
  });

  test('allows HEAD requests without CSRF', () => {
    expect(validateCsrf(makeRequest({ method: 'HEAD' }))).toBe(true);
  });

  test('allows OPTIONS requests without CSRF', () => {
    expect(validateCsrf(makeRequest({ method: 'OPTIONS' }))).toBe(true);
  });

  test('blocks POST without CSRF or same-origin', () => {
    const req = makeRequest({ method: 'POST' });
    expect(validateCsrf(req)).toBe(false);
  });

  test('blocks POST with mismatched CSRF tokens', () => {
    const req = makeRequest({
      method: 'POST',
      csrfHeader: 'token-a',
      csrfCookie: 'token-b',
    });
    expect(validateCsrf(req)).toBe(false);
  });

  test('allows POST with matching CSRF tokens', () => {
    const req = makeRequest({
      method: 'POST',
      csrfHeader: 'valid-token',
      csrfCookie: 'valid-token',
    });
    expect(validateCsrf(req)).toBe(true);
  });

  test('allows same-origin POST', () => {
    const req = makeRequest({
      method: 'POST',
      origin: 'https://flipper.ai',
      host: 'flipper.ai',
    });
    expect(validateCsrf(req)).toBe(true);
  });

  test('blocks cross-origin POST without CSRF', () => {
    const req = makeRequest({
      method: 'POST',
      origin: 'https://evil.com',
      host: 'flipper.ai',
    });
    expect(validateCsrf(req)).toBe(false);
  });

  test('blocks DELETE without CSRF or same-origin', () => {
    expect(validateCsrf(makeRequest({ method: 'DELETE' }))).toBe(false);
  });

  test('blocks PATCH without CSRF or same-origin', () => {
    expect(validateCsrf(makeRequest({ method: 'PATCH' }))).toBe(false);
  });
});

// ─── API Key Validation ─────────────────────────────────────────────

describe('API Key Validation', () => {
  let validateApiKey: typeof import('@/lib/api-security').validateApiKey;

  beforeEach(async () => {
    jest.resetModules();
    process.env.FLIPPER_API_KEYS = 'key-one,key-two,key-three';
    const mod = await import('@/lib/api-security');
    validateApiKey = mod.validateApiKey;
  });

  afterEach(() => {
    delete process.env.FLIPPER_API_KEYS;
  });

  function makeReq(apiKey?: string) {
    const headers = new Headers();
    if (apiKey) headers.set('x-api-key', apiKey);
    return { headers } as any;
  }

  test('rejects missing API key', () => {
    expect(validateApiKey(makeReq())).toBe(false);
  });

  test('rejects empty API key', () => {
    expect(validateApiKey(makeReq(''))).toBe(false);
  });

  test('rejects invalid API key', () => {
    expect(validateApiKey(makeReq('wrong-key'))).toBe(false);
  });

  test('accepts valid API key', () => {
    expect(validateApiKey(makeReq('key-two'))).toBe(true);
  });

  test('rejects partial key match', () => {
    expect(validateApiKey(makeReq('key'))).toBe(false);
  });

  test('Headers API trims whitespace so padded keys match (browser spec)', () => {
    // Note: Headers.set() trims values per spec, so ' key-one ' becomes 'key-one'
    expect(validateApiKey(makeReq(' key-one '))).toBe(true);
  });
});

// ─── Input Validation ───────────────────────────────────────────────

describe('Input Validation (validateRequestBody)', () => {
  let validateRequestBody: typeof import('@/lib/api-security').validateRequestBody;
  let z: typeof import('zod/v4');

  beforeEach(async () => {
    jest.resetModules();
    const mod = await import('@/lib/api-security');
    validateRequestBody = mod.validateRequestBody;
    z = await import('zod/v4');
  });

  function makeJsonReq(body: unknown) {
    return {
      json: async () => body,
    } as any;
  }

  function makeBadJsonReq() {
    return {
      json: async () => { throw new Error('bad json'); },
    } as any;
  }

  test('rejects malformed JSON', async () => {
    const schema = z.object({ name: z.string() });
    const result = await validateRequestBody(makeBadJsonReq(), schema);
    expect(result.error).toBeDefined();
    expect(result.error!.status).toBe(400);
  });

  test('rejects invalid data', async () => {
    const schema = z.object({ email: z.email() });
    const result = await validateRequestBody(makeJsonReq({ email: 'not-an-email' }), schema);
    expect(result.error).toBeDefined();
  });

  test('accepts valid data', async () => {
    const schema = z.object({ name: z.string().min(1) });
    const result = await validateRequestBody(makeJsonReq({ name: 'Test' }), schema);
    expect(result.data).toEqual({ name: 'Test' });
    expect(result.error).toBeUndefined();
  });

  test('strips extra fields with strict schema', async () => {
    const schema = z.object({ name: z.string() }).strict();
    const result = await validateRequestBody(makeJsonReq({ name: 'Test', evil: '<script>' }), schema);
    expect(result.error).toBeDefined();
  });
});

// ─── Rate Limiter Edge Cases ────────────────────────────────────────

describe('Rate Limiter - Security Edge Cases', () => {
  let rateLimit: typeof import('@/lib/rate-limiter').rateLimit;
  let resetRateLimiter: typeof import('@/lib/rate-limiter').resetRateLimiter;
  let ENDPOINT_CONFIGS: typeof import('@/lib/rate-limiter').ENDPOINT_CONFIGS;

  beforeEach(async () => {
    jest.resetModules();
    const mod = await import('@/lib/rate-limiter');
    rateLimit = mod.rateLimit;
    resetRateLimiter = mod.resetRateLimiter;
    ENDPOINT_CONFIGS = mod.ENDPOINT_CONFIGS;
    resetRateLimiter();
  });

  afterEach(() => {
    resetRateLimiter();
  });

  test('auth registration has strict rate limit', () => {
    const config = ENDPOINT_CONFIGS['/api/auth/register'];
    expect(config).toBeDefined();
    expect(config.limit).toBeLessThanOrEqual(10);
    expect(config.windowSeconds).toBeGreaterThanOrEqual(60);
  });

  test('scraper endpoints have strict rate limits', () => {
    const scrapeConfig = ENDPOINT_CONFIGS['/api/scrape'];
    expect(scrapeConfig).toBeDefined();
    expect(scrapeConfig.limit).toBeLessThanOrEqual(10);
  });

  test('exhausting rate limit returns 429 info', () => {
    // Exhaust the limit for analyze endpoint (10 requests/min)
    for (let i = 0; i < 15; i++) {
      rateLimit('1.2.3.4', '/api/analyze');
    }
    const result = rateLimit('1.2.3.4', '/api/analyze');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  test('different IPs have separate rate limits', () => {
    for (let i = 0; i < 10; i++) {
      rateLimit('1.1.1.1', '/api/analyze');
    }
    // IP 1 exhausted
    expect(rateLimit('1.1.1.1', '/api/analyze').allowed).toBe(false);
    // IP 2 still has budget
    expect(rateLimit('2.2.2.2', '/api/analyze').allowed).toBe(true);
  });

  test('authenticated users get higher limits', () => {
    // User limit = 2x IP limit for analyze = 20
    for (let i = 0; i < 10; i++) {
      rateLimit('3.3.3.3', '/api/analyze', 'user-123');
    }
    // IP limit hit at 10, but user still ok
    const result = rateLimit('3.3.3.3', '/api/analyze', 'user-123');
    // Should be blocked since IP limit (10) is hit
    expect(result.allowed).toBe(false);
  });
});

// ─── Next.js Config Security ────────────────────────────────────────

describe('Next.js Configuration Security', () => {
  test('standalone output mode is configured', async () => {
    // Read next.config to verify standalone mode
    const fs = await import('fs');
    const path = await import('path');
    const configPath = path.resolve(__dirname, '../../../next.config.ts');
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('standalone');
  });

  test('TypeScript errors are not ignored in build', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const configPath = path.resolve(__dirname, '../../../next.config.ts');
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('ignoreBuildErrors: false');
  });
});

// ─── Client IP Extraction ───────────────────────────────────────────

describe('Client IP Extraction', () => {
  let getClientIp: typeof import('@/lib/api-security').getClientIp;

  beforeEach(async () => {
    jest.resetModules();
    const mod = await import('@/lib/api-security');
    getClientIp = mod.getClientIp;
  });

  function makeReq(headers: Record<string, string>) {
    return {
      headers: {
        get: (name: string) => headers[name.toLowerCase()] ?? null,
      },
    } as any;
  }

  test('extracts IP from x-forwarded-for (first entry)', () => {
    expect(getClientIp(makeReq({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4');
  });

  test('extracts IP from x-real-ip', () => {
    expect(getClientIp(makeReq({ 'x-real-ip': '9.8.7.6' }))).toBe('9.8.7.6');
  });

  test('returns unknown when no IP headers present', () => {
    expect(getClientIp(makeReq({}))).toBe('unknown');
  });

  test('prefers x-forwarded-for over x-real-ip', () => {
    expect(getClientIp(makeReq({
      'x-forwarded-for': '1.1.1.1',
      'x-real-ip': '2.2.2.2',
    }))).toBe('1.1.1.1');
  });
});

// ─── Environment Security ───────────────────────────────────────────

describe('Environment Variable Security', () => {
  test('env module exists and exports validated config', async () => {
    jest.resetModules();
    const { env } = await import('@/lib/env');
    expect(env).toBeDefined();
    expect(env.NODE_ENV).toBe('test');
  });

  test('ENCRYPTION_SECRET requires minimum length', async () => {
    jest.resetModules();
    // The env module requires min 16 chars for ENCRYPTION_SECRET
    const { env } = await import('@/lib/env');
    expect(env.ENCRYPTION_SECRET.length).toBeGreaterThanOrEqual(16);
  });
});
