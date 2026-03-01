/**
 * Tests for getCorsHeaders() with various origin types including
 * Firebase Hosting URLs, localhost, and unauthorized origins.
 */

describe('getCorsHeaders - CORS origin validation', () => {
  const originalEnv = process.env.ALLOWED_ORIGINS;

  beforeEach(() => {
    // Reset module cache so ALLOWED_ORIGINS is re-evaluated
    jest.resetModules();
    process.env.ALLOWED_ORIGINS =
      'https://axovia-flipper.web.app,https://axovia-flipper.firebaseapp.com';
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = originalEnv;
  });

  function loadGetCorsHeaders() {
    return require('@/lib/api-security').getCorsHeaders as (
      origin: string | null
    ) => Record<string, string>;
  }

  it('should allow Firebase Hosting web.app origin', () => {
    const getCorsHeaders = loadGetCorsHeaders();
    const headers = getCorsHeaders('https://axovia-flipper.web.app');
    expect(headers['Access-Control-Allow-Origin']).toBe('https://axovia-flipper.web.app');
    expect(headers['Access-Control-Allow-Credentials']).toBe('true');
  });

  it('should allow Firebase Hosting firebaseapp.com origin', () => {
    const getCorsHeaders = loadGetCorsHeaders();
    const headers = getCorsHeaders('https://axovia-flipper.firebaseapp.com');
    expect(headers['Access-Control-Allow-Origin']).toBe(
      'https://axovia-flipper.firebaseapp.com'
    );
  });

  it('should allow localhost:3000 in development', () => {
    const getCorsHeaders = loadGetCorsHeaders();
    const headers = getCorsHeaders('http://localhost:3000');
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
  });

  it('should reject unauthorized origins', () => {
    const getCorsHeaders = loadGetCorsHeaders();
    const headers = getCorsHeaders('https://evil.com');
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
  });

  it('should reject null origin', () => {
    const getCorsHeaders = loadGetCorsHeaders();
    const headers = getCorsHeaders(null);
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('should always return methods, headers, and max-age', () => {
    const getCorsHeaders = loadGetCorsHeaders();
    const headers = getCorsHeaders(null);
    expect(headers['Access-Control-Allow-Methods']).toContain('GET');
    expect(headers['Access-Control-Allow-Methods']).toContain('POST');
    expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type');
    expect(headers['Access-Control-Allow-Headers']).toContain('Authorization');
    expect(headers['Access-Control-Max-Age']).toBe('86400');
  });

  it('should reject origins with wrong protocol', () => {
    const getCorsHeaders = loadGetCorsHeaders();
    const headers = getCorsHeaders('http://axovia-flipper.web.app');
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('should reject origins with extra path', () => {
    const getCorsHeaders = loadGetCorsHeaders();
    const headers = getCorsHeaders('https://axovia-flipper.web.app/some/path');
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
  });
});
