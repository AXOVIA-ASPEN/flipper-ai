/**
 * Tests for Facebook OAuth API Routes
 * Covers: authorize, callback, disconnect, status
 *
 * Routes use Firebase session-based auth (getCurrentUser from @/lib/firebase/session).
 */

import { NextRequest } from 'next/server';

// Mock Firebase session auth
const mockGetCurrentUser = jest.fn();
jest.mock('@/lib/firebase/session', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

// Mock facebook auth functions
const mockGetAuthorizationUrl = jest.fn();
const mockExchangeCodeForToken = jest.fn();
const mockExchangeForLongLivedToken = jest.fn();
const mockRevokeAccessToken = jest.fn();
jest.mock('@/scrapers/facebook/auth', () => ({
  getAuthorizationUrl: (...args: unknown[]) => mockGetAuthorizationUrl(...args),
  exchangeCodeForToken: (...args: unknown[]) => mockExchangeCodeForToken(...args),
  exchangeForLongLivedToken: (...args: unknown[]) => mockExchangeForLongLivedToken(...args),
  calculateExpirationTimestamp: () => Date.now() + 5184000000,
  revokeAccessToken: (...args: unknown[]) => mockRevokeAccessToken(...args),
}));

// Mock token store
const mockStoreToken = jest.fn();
const mockGetToken = jest.fn();
const mockDeleteToken = jest.fn();
const mockHasValidToken = jest.fn();
jest.mock('@/scrapers/facebook/token-store', () => ({
  storeToken: (...args: unknown[]) => mockStoreToken(...args),
  getToken: (...args: unknown[]) => mockGetToken(...args),
  deleteToken: (...args: unknown[]) => mockDeleteToken(...args),
  hasValidToken: (...args: unknown[]) => mockHasValidToken(...args),
}));

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: () => ({
    toString: () => 'mock-state-token-abc123',
  }),
}));

/** Helper: SessionUser shape returned by getCurrentUser */
function sessionUser(overrides?: Record<string, unknown>) {
  return {
    id: 'user-1',
    firebaseUid: 'fb-uid-1',
    email: 'test@example.com',
    name: 'Test User',
    image: null,
    ...overrides,
  };
}

function makeRequest(url: string, method = 'GET', cookies?: Record<string, string>): NextRequest {
  const req = new NextRequest(new URL(url, 'http://localhost:3000'), { method });
  if (cookies) {
    Object.entries(cookies).forEach(([k, v]) => {
      req.cookies.set(k, v);
    });
  }
  return req;
}

describe('Facebook Auth - Authorize', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.FACEBOOK_APP_ID;
    delete process.env.FACEBOOK_APP_SECRET;
    delete process.env.FACEBOOK_REDIRECT_URI;
  });

  beforeAll(async () => {
    const mod = await import('@/app/api/auth/facebook/authorize/route');
    GET = mod.GET;
  });

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await GET(makeRequest('/api/auth/facebook/authorize'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when session has no email', async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser({ email: null }));
    const res = await GET(makeRequest('/api/auth/facebook/authorize'));
    expect(res.status).toBe(401);
  });

  it('returns 500 when Facebook app credentials missing', async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser());
    const res = await GET(makeRequest('/api/auth/facebook/authorize'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('not configured');
  });

  it('redirects to Facebook auth URL when configured', async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser());
    process.env.FACEBOOK_APP_ID = 'test-app-id';
    process.env.FACEBOOK_APP_SECRET = 'test-secret';
    mockGetAuthorizationUrl.mockReturnValue('https://facebook.com/dialog/oauth?state=abc');

    const res = await GET(makeRequest('/api/auth/facebook/authorize'));
    expect(res.status).toBe(307);
    expect(mockGetAuthorizationUrl).toHaveBeenCalledWith(
      expect.objectContaining({ appId: 'test-app-id', appSecret: 'test-secret' }),
      'mock-state-token-abc123'
    );
    // Check state cookie is set
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('facebook_oauth_state');
  });
});

describe('Facebook Auth - Callback', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FACEBOOK_APP_ID = 'test-app-id';
    process.env.FACEBOOK_APP_SECRET = 'test-secret';
  });

  beforeAll(async () => {
    const mod = await import('@/app/api/auth/facebook/callback/route');
    GET = mod.GET;
  });

  it('redirects to login when not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await GET(makeRequest('/api/auth/facebook/callback?code=abc&state=xyz'));
    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('login');
  });

  it('redirects with error when Facebook returns error', async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser());
    const res = await GET(makeRequest('/api/auth/facebook/callback?error=access_denied'));
    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('facebook_auth_access_denied');
  });

  it('redirects with error when code or state missing', async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser());
    const res = await GET(makeRequest('/api/auth/facebook/callback'));
    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('missing_code_or_state');
  });

  it('redirects with error on state mismatch', async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser());
    const res = await GET(
      makeRequest('/api/auth/facebook/callback?code=abc&state=wrong', 'GET', {
        facebook_oauth_state: 'correct-state',
      })
    );
    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('invalid_state');
  });

  it('redirects with error when app not configured', async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser());
    delete process.env.FACEBOOK_APP_ID;
    delete process.env.FACEBOOK_APP_SECRET;
    const res = await GET(
      makeRequest('/api/auth/facebook/callback?code=abc&state=mystate', 'GET', {
        facebook_oauth_state: 'mystate',
      })
    );
    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('not_configured');
  });

  it('exchanges code for token and stores it on success', async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser());
    mockExchangeCodeForToken.mockResolvedValue({ access_token: 'short-token' });
    mockExchangeForLongLivedToken.mockResolvedValue({
      access_token: 'long-token',
      expires_in: 5184000,
    });
    mockStoreToken.mockResolvedValue(undefined);

    const res = await GET(
      makeRequest('/api/auth/facebook/callback?code=auth-code&state=mystate', 'GET', {
        facebook_oauth_state: 'mystate',
      })
    );
    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('facebook_auth=success');
    expect(mockExchangeCodeForToken).toHaveBeenCalled();
    expect(mockExchangeForLongLivedToken).toHaveBeenCalledWith(expect.anything(), 'short-token');
    expect(mockStoreToken).toHaveBeenCalledWith('user-1', 'long-token', 5184000);
  });

  it('redirects with error on token exchange failure', async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser());
    mockExchangeCodeForToken.mockRejectedValue(new Error('Exchange failed'));

    const res = await GET(
      makeRequest('/api/auth/facebook/callback?code=bad-code&state=mystate', 'GET', {
        facebook_oauth_state: 'mystate',
      })
    );
    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('token_exchange_failed');
  });

  it('uses FACEBOOK_REDIRECT_URI env var when set', async () => {
    process.env.FACEBOOK_REDIRECT_URI = 'https://myapp.example.com/api/auth/facebook/callback';
    mockGetCurrentUser.mockResolvedValue(sessionUser());
    mockExchangeCodeForToken.mockResolvedValue({ access_token: 'short-token' });
    mockExchangeForLongLivedToken.mockResolvedValue({
      access_token: 'long-token',
      expires_in: 5184000,
    });
    mockStoreToken.mockResolvedValue(undefined);

    const res = await GET(
      makeRequest('/api/auth/facebook/callback?code=auth-code2&state=mystate2', 'GET', {
        facebook_oauth_state: 'mystate2',
      })
    );
    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('facebook_auth=success');
    expect(mockExchangeCodeForToken).toHaveBeenCalledWith(
      expect.objectContaining({ redirectUri: 'https://myapp.example.com/api/auth/facebook/callback' }),
      'auth-code2'
    );
    delete process.env.FACEBOOK_REDIRECT_URI;
  });

  it('redirects with Unknown error when non-Error is thrown in callback', async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser());
    mockExchangeCodeForToken.mockRejectedValue('string-error');

    const res = await GET(
      makeRequest('/api/auth/facebook/callback?code=bad-code2&state=mystate3', 'GET', {
        facebook_oauth_state: 'mystate3',
      })
    );
    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('token_exchange_failed');
    expect(location).toContain('Unknown%20error');
  });
});

describe('Facebook Auth - Disconnect', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    const mod = await import('@/app/api/auth/facebook/disconnect/route');
    POST = mod.POST;
  });

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await POST(makeRequest('/api/auth/facebook/disconnect', 'POST'));
    expect(res.status).toBe(401);
  });

  it('revokes token and deletes from store', async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser());
    mockGetToken.mockResolvedValue({ accessToken: 'my-token', expiresAt: Date.now() + 100000 });
    mockRevokeAccessToken.mockResolvedValue(undefined);
    mockDeleteToken.mockResolvedValue(undefined);

    const res = await POST(makeRequest('/api/auth/facebook/disconnect', 'POST'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockRevokeAccessToken).toHaveBeenCalledWith('my-token');
    expect(mockDeleteToken).toHaveBeenCalledWith('user-1');
  });

  it('still deletes local token even if revoke fails', async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser());
    mockGetToken.mockResolvedValue({ accessToken: 'my-token', expiresAt: Date.now() + 100000 });
    mockRevokeAccessToken.mockRejectedValue(new Error('Revoke failed'));
    mockDeleteToken.mockResolvedValue(undefined);

    const res = await POST(makeRequest('/api/auth/facebook/disconnect', 'POST'));
    expect(res.status).toBe(200);
    expect(mockDeleteToken).toHaveBeenCalledWith('user-1');
  });

  it('handles case when no token exists', async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser());
    mockGetToken.mockResolvedValue(null);
    mockDeleteToken.mockResolvedValue(undefined);

    const res = await POST(makeRequest('/api/auth/facebook/disconnect', 'POST'));
    expect(res.status).toBe(200);
    expect(mockRevokeAccessToken).not.toHaveBeenCalled();
  });

  it('returns 500 on unexpected error', async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser());
    mockGetToken.mockRejectedValue(new Error('DB error'));

    const res = await POST(makeRequest('/api/auth/facebook/disconnect', 'POST'));
    expect(res.status).toBe(500);
  });
});

describe('Facebook Auth - Status', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    const mod = await import('@/app/api/auth/facebook/status/route');
    GET = mod.GET;
  });

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await GET(makeRequest('/api/auth/facebook/status'));
    expect(res.status).toBe(401);
  });

  it('returns connected status with expiration', async () => {
    const expiresAt = Date.now() + 5184000000;
    mockGetCurrentUser.mockResolvedValue(sessionUser());
    mockHasValidToken.mockResolvedValue(true);
    mockGetToken.mockResolvedValue({ accessToken: 'token', expiresAt });

    const res = await GET(makeRequest('/api/auth/facebook/status'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.connected).toBe(true);
    expect(body.expiresAt).toBe(expiresAt);
    // Token should NOT be exposed
    expect(body.accessToken).toBeUndefined();
  });

  it('returns disconnected status', async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser());
    mockHasValidToken.mockResolvedValue(false);
    mockGetToken.mockResolvedValue(null);

    const res = await GET(makeRequest('/api/auth/facebook/status'));
    const body = await res.json();
    expect(body.connected).toBe(false);
    expect(body.expiresAt).toBeUndefined();
  });

  it('returns 500 on error', async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser());
    mockHasValidToken.mockRejectedValue(new Error('DB error'));

    const res = await GET(makeRequest('/api/auth/facebook/status'));
    expect(res.status).toBe(500);
  });
});
