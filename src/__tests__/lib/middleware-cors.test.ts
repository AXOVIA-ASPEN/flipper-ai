/**
 * Tests for CORS handling in Next.js middleware.
 * Validates CORS header generation, OPTIONS preflight, and origin rejection.
 */
import { NextRequest } from 'next/server';

// Mock api-security module before importing middleware
jest.mock('@/lib/api-security', () => ({
  getCorsHeaders: jest.fn((origin: string | null) => {
    const allowedOrigins = new Set([
      'https://axovia-flipper.web.app',
      'https://axovia-flipper.firebaseapp.com',
      'http://localhost:3000',
    ]);

    const headers: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-CSRF-Token',
      'Access-Control-Max-Age': '86400',
    };

    if (origin && allowedOrigins.has(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Credentials'] = 'true';
    }

    return headers;
  }),
  applySecurityHeaders: jest.fn((response) => response),
}));

// Import after mocks
import { middleware } from '../../../middleware';

function createRequest(
  url: string,
  method = 'GET',
  headers: Record<string, string> = {}
): NextRequest {
  const req = new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers,
  });
  return req;
}

describe('Middleware CORS Handling', () => {
  describe('OPTIONS preflight requests on /api/* routes', () => {
    it('should return 204 with CORS headers for allowed origin', () => {
      const req = createRequest('/api/listings', 'OPTIONS', {
        origin: 'https://axovia-flipper.web.app',
      });
      const res = middleware(req);

      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://axovia-flipper.web.app'
      );
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('should return 204 without Allow-Origin for unauthorized origin', () => {
      const req = createRequest('/api/listings', 'OPTIONS', {
        origin: 'https://evil.com',
      });
      const res = middleware(req);

      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });
  });

  describe('API requests with CORS headers', () => {
    it('should add CORS headers for allowed origin on API routes', () => {
      const req = createRequest('/api/listings', 'GET', {
        origin: 'https://axovia-flipper.web.app',
      });
      const res = middleware(req);

      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://axovia-flipper.web.app'
      );
      expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('should NOT add Allow-Origin header for unauthorized origin', () => {
      const req = createRequest('/api/listings', 'GET', {
        origin: 'https://evil.com',
      });
      const res = middleware(req);

      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('should return 403 for unauthorized origin on mutating API requests', () => {
      const req = createRequest('/api/listings', 'POST', {
        origin: 'https://evil.com',
      });
      const res = middleware(req);

      expect(res.status).toBe(403);
    });
  });

  describe('non-API routes', () => {
    it('should not add CORS headers to non-API routes', () => {
      const req = createRequest('/dashboard', 'GET', {
        origin: 'https://axovia-flipper.web.app',
      });
      const res = middleware(req);

      // Non-API route should not have CORS headers from getCorsHeaders
      // (it may have security headers from applySecurityHeaders)
      expect(res.headers.get('Access-Control-Allow-Methods')).toBeNull();
    });
  });

  describe('Request ID propagation', () => {
    it('should set X-Request-Id response header on API routes', () => {
      const req = createRequest('/api/listings', 'GET', {
        origin: 'http://localhost:3000',
      });
      const res = middleware(req);

      const requestId = res.headers.get('X-Request-Id');
      expect(requestId).toBeTruthy();
      // UUID v4 format
      expect(requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('should set X-Request-Start timing header on API routes', () => {
      const req = createRequest('/api/listings', 'GET', {
        origin: 'http://localhost:3000',
      });
      const res = middleware(req);

      const startTime = res.headers.get('X-Request-Start');
      expect(startTime).toBeTruthy();
      expect(Number(startTime)).toBeGreaterThan(0);
    });

    it('should set X-Request-Id on non-API public routes', () => {
      const req = createRequest('/login', 'GET');
      const res = middleware(req);

      expect(res.headers.get('X-Request-Id')).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });
  });

  describe('Cache-Control on API responses', () => {
    it('should set no-store Cache-Control on API responses', () => {
      const req = createRequest('/api/listings', 'GET', {
        origin: 'http://localhost:3000',
      });
      const res = middleware(req);

      expect(res.headers.get('Cache-Control')).toContain('no-store');
    });

    it('should allow short CDN cache on /api/health', () => {
      const req = createRequest('/api/health', 'GET', {
        origin: 'http://localhost:3000',
      });
      const res = middleware(req);

      expect(res.headers.get('Cache-Control')).toContain('s-maxage=60');
      expect(res.headers.get('Cache-Control')).not.toContain('no-store');
    });
  });
});
