/**
 * Facebook Auth Tests
 * Tests for OAuth URL generation and utility functions
 */

import {
  getAuthorizationUrl,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  verifyAccessToken,
  revokeAccessToken,
  calculateExpirationTimestamp,
  isTokenExpiring,
  type FacebookAuthConfig,
} from '@/scrapers/facebook/auth';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const testConfig: FacebookAuthConfig = {
  appId: 'test-app-id',
  appSecret: 'test-secret',
  redirectUri: 'https://example.com/callback',
};

describe('Facebook Auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAuthorizationUrl', () => {
    it('generates correct OAuth URL', () => {
      const url = getAuthorizationUrl(testConfig);
      expect(url).toContain('https://www.facebook.com/v18.0/dialog/oauth');
      expect(url).toContain('client_id=test-app-id');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('response_type=code');
    });

    it('includes state parameter when provided', () => {
      const url = getAuthorizationUrl(testConfig, 'csrf-token-123');
      expect(url).toContain('state=csrf-token-123');
    });

    it('excludes state parameter when not provided', () => {
      const url = getAuthorizationUrl(testConfig);
      expect(url).not.toContain('state=');
    });

    it('includes required scopes', () => {
      const url = getAuthorizationUrl(testConfig);
      expect(url).toContain('scope=public_profile');
    });
  });

  describe('exchangeCodeForToken', () => {
    it('exchanges code for token successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'short-lived-token',
            token_type: 'bearer',
            expires_in: 3600,
          }),
      });

      const result = await exchangeCodeForToken(testConfig, 'auth-code');
      expect(result.access_token).toBe('short-lived-token');
      expect(result.token_type).toBe('bearer');
    });

    it('throws on failed exchange', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: { message: 'Invalid code' } }),
      });

      await expect(exchangeCodeForToken(testConfig, 'bad-code')).rejects.toThrow(
        'Facebook token exchange failed'
      );
    });
  });

  describe('exchangeForLongLivedToken', () => {
    it('exchanges for long-lived token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'long-lived-token',
            token_type: 'bearer',
            expires_in: 5184000,
          }),
      });

      const result = await exchangeForLongLivedToken(testConfig, 'short-token');
      expect(result.access_token).toBe('long-lived-token');
      expect(result.expires_in).toBe(5184000);
    });

    it('throws on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: { message: 'Invalid token' } }),
      });

      await expect(exchangeForLongLivedToken(testConfig, 'bad-token')).rejects.toThrow(
        'Long-lived token exchange failed'
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('returns token info when valid', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              app_id: 'test-app-id',
              user_id: 'user-123',
              is_valid: true,
              expires_at: 1700000000,
            },
          }),
      });

      const result = await verifyAccessToken('valid-token');
      expect(result.isValid).toBe(true);
      expect(result.userId).toBe('user-123');
    });

    it('throws on network failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await expect(verifyAccessToken('token')).rejects.toThrow('Token verification failed');
    });
  });

  describe('revokeAccessToken', () => {
    it('revokes token successfully', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      await expect(revokeAccessToken('token')).resolves.toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('permissions'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('throws on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      });
      await expect(revokeAccessToken('token')).rejects.toThrow('Token revocation failed');
    });
  });

  describe('calculateExpirationTimestamp', () => {
    it('calculates future timestamp', () => {
      const now = Math.floor(Date.now() / 1000);
      const result = calculateExpirationTimestamp(3600);
      expect(result).toBeGreaterThanOrEqual(now + 3599);
      expect(result).toBeLessThanOrEqual(now + 3601);
    });
  });

  describe('isTokenExpiring', () => {
    it('returns true for expired token', () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 100;
      expect(isTokenExpiring(pastTimestamp)).toBe(true);
    });

    it('returns true when within buffer', () => {
      const soonTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour
      expect(isTokenExpiring(soonTimestamp, 86400)).toBe(true); // 24h buffer
    });

    it('returns false when plenty of time remains', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 604800; // 7 days
      expect(isTokenExpiring(futureTimestamp, 86400)).toBe(false);
    });

    it('uses default 24h buffer', () => {
      const justOver24h = Math.floor(Date.now() / 1000) + 86401;
      expect(isTokenExpiring(justOver24h)).toBe(false);

      const justUnder24h = Math.floor(Date.now() / 1000) + 86399;
      expect(isTokenExpiring(justUnder24h)).toBe(true);
    });
  });
});
