/**
 * Tests for POST /api/auth/signout
 * Clears session cookie and revokes Firebase refresh tokens.
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

// Mock next/headers cookies()
const mockCookieGet = jest.fn();
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: (...args: unknown[]) => mockCookieGet(...args),
  }),
}));

// Mock Firebase admin auth
const mockVerifySessionCookie = jest.fn();
const mockRevokeRefreshTokens = jest.fn();
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifySessionCookie: (...args: unknown[]) => mockVerifySessionCookie(...args),
    revokeRefreshTokens: (...args: unknown[]) => mockRevokeRefreshTokens(...args),
  },
}));

// Mock Firebase session constants
jest.mock('@/lib/firebase/session', () => ({
  SESSION_COOKIE_NAME: '__session',
}));

import { POST } from '@/app/api/auth/signout/route';

function createRequest() {
  return new NextRequest('http://localhost/api/auth/signout', {
    method: 'POST',
  });
}

describe('POST /api/auth/signout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCookieGet.mockReturnValue(undefined);
  });

  it('returns success even when no session cookie exists', async () => {
    mockCookieGet.mockReturnValue(undefined);

    const res = await POST(createRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockVerifySessionCookie).not.toHaveBeenCalled();
    expect(mockRevokeRefreshTokens).not.toHaveBeenCalled();
  });

  it('verifies session cookie and revokes refresh tokens', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid-session-cookie' });
    mockVerifySessionCookie.mockResolvedValue({ uid: 'firebase-uid-123' });
    mockRevokeRefreshTokens.mockResolvedValue(undefined);

    const res = await POST(createRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockVerifySessionCookie).toHaveBeenCalledWith('valid-session-cookie');
    expect(mockRevokeRefreshTokens).toHaveBeenCalledWith('firebase-uid-123');
  });

  it('clears the session cookie in response', async () => {
    mockCookieGet.mockReturnValue(undefined);

    const res = await POST(createRequest());

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('__session=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Max-Age=0');
    expect(setCookie).toContain('Path=/');
  });

  it('still clears cookie when session cookie is expired/invalid', async () => {
    mockCookieGet.mockReturnValue({ value: 'expired-session-cookie' });
    mockVerifySessionCookie.mockRejectedValue(new Error('Session cookie has expired'));

    const res = await POST(createRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    // Revoke should NOT have been called since verify failed
    expect(mockRevokeRefreshTokens).not.toHaveBeenCalled();
    // Cookie should still be cleared
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('Max-Age=0');
  });

  it('still clears cookie when revokeRefreshTokens fails', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid-session-cookie' });
    mockVerifySessionCookie.mockResolvedValue({ uid: 'firebase-uid-123' });
    mockRevokeRefreshTokens.mockRejectedValue(new Error('Revocation failed'));

    // This should NOT throw — the catch block handles it
    const res = await POST(createRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('sets SameSite=Strict on cleared cookie', async () => {
    mockCookieGet.mockReturnValue(undefined);

    const res = await POST(createRequest());

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie?.toLowerCase()).toContain('samesite=strict');
  });
});
