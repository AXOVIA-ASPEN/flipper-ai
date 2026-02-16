/**
 * Facebook Authentication Tests
 * Unit tests for Facebook OAuth flow
 */

import {
  getAuthorizationUrl,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  verifyAccessToken,
  refreshAccessToken,
  revokeAccessToken,
  calculateExpirationTimestamp,
  isTokenExpiring,
} from '../../../../flipper-ai/src/scrapers/facebook/auth';

// Mock fetch globally
global.fetch = jest.fn();

describe('Facebook Authentication', () => {
  const mockConfig = {
    appId: 'test-app-id',
    appSecret: 'test-app-secret',
    redirectUri: 'http://localhost:3000/callback',
  };

  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  describe('getAuthorizationUrl', () => {
    it('should generate valid authorization URL', () => {
      const url = getAuthorizationUrl(mockConfig);

      expect(url).toContain('https://www.facebook.com/v18.0/dialog/oauth');
      expect(url).toContain(`client_id=${mockConfig.appId}`);
      expect(url).toContain(`redirect_uri=${encodeURIComponent(mockConfig.redirectUri)}`);
      expect(url).toContain('scope=public_profile%2Cemail');
      expect(url).toContain('response_type=code');
    });

    it('should include state parameter when provided', () => {
      const state = 'random-state-token';
      const url = getAuthorizationUrl(mockConfig, state);

      expect(url).toContain(`state=${state}`);
    });

    it('should not include state parameter when empty string', () => {
      const url = getAuthorizationUrl(mockConfig, '');
      expect(url).not.toContain('state=');
    });
  });

  describe('exchangeCodeForToken', () => {
    it('should exchange code for access token', async () => {
      const mockResponse = {
        access_token: 'short-lived-token',
        token_type: 'bearer',
        expires_in: 3600,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await exchangeCodeForToken(mockConfig, 'test-code');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://graph.facebook.com/v18.0/oauth/access_token')
      );
    });

    it('should throw error on failed exchange', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: { message: 'Invalid authorization code' },
        }),
      });

      await expect(exchangeCodeForToken(mockConfig, 'invalid-code')).rejects.toThrow(
        'Invalid authorization code'
      );
    });

    it('should fall back to statusText when error.message is missing', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: {},
        }),
      });

      await expect(exchangeCodeForToken(mockConfig, 'invalid-code')).rejects.toThrow(
        'Bad Request'
      );
    });

    it('should fall back to statusText when error object is missing', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({}),
      });

      await expect(exchangeCodeForToken(mockConfig, 'invalid-code')).rejects.toThrow(
        'Bad Request'
      );
    });
  });

  describe('exchangeForLongLivedToken', () => {
    it('should exchange short-lived token for long-lived token', async () => {
      const mockResponse = {
        access_token: 'long-lived-token',
        token_type: 'bearer',
        expires_in: 5184000, // 60 days
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await exchangeForLongLivedToken(mockConfig, 'short-lived-token');

      expect(result).toEqual(mockResponse);
      expect(result.expires_in).toBe(5184000);
    });

    it('should throw error on failed long-lived token exchange', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: { message: 'Invalid OAuth access token' },
        }),
      });

      await expect(
        exchangeForLongLivedToken(mockConfig, 'bad-token')
      ).rejects.toThrow('Invalid OAuth access token');
    });

    it('should fall back to statusText when error.message is missing', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: {} }),
      });

      await expect(
        exchangeForLongLivedToken(mockConfig, 'bad-token')
      ).rejects.toThrow('Bad Request');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid token', async () => {
      const mockResponse = {
        data: {
          app_id: 'test-app-id',
          user_id: 'test-user-id',
          is_valid: true,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await verifyAccessToken('test-token');

      expect(result.isValid).toBe(true);
      expect(result.userId).toBe('test-user-id');
      expect(result.appId).toBe('test-app-id');
    });

    it('should return invalid for expired/invalid token', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            is_valid: false,
            app_id: '',
            user_id: '',
            expires_at: 0,
          },
        }),
      });

      const result = await verifyAccessToken('expired-token');

      expect(result.isValid).toBe(false);
    });

    it('should handle fetch failure during verification', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({
          error: { message: 'Service unavailable' },
        }),
      });

      await expect(verifyAccessToken('test-token')).rejects.toThrow();
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh valid token', async () => {
      // Mock verify call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            app_id: 'test-app-id',
            user_id: 'test-user-id',
            is_valid: true,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          },
        }),
      });

      // Mock exchange call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'refreshed-token',
          token_type: 'bearer',
          expires_in: 5184000,
        }),
      });

      const result = await refreshAccessToken(mockConfig, 'old-token');

      expect(result.access_token).toBe('refreshed-token');
      expect(result.expires_in).toBe(5184000);
    });

    it('should throw error if token is invalid', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            is_valid: false,
          },
        }),
      });

      await expect(refreshAccessToken(mockConfig, 'invalid-token')).rejects.toThrow(
        'Token is invalid'
      );
    });
  });

  describe('revokeAccessToken', () => {
    it('should revoke access token', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await expect(revokeAccessToken('test-token')).resolves.not.toThrow();
    });

    it('should throw error when revocation fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(revokeAccessToken('bad-token')).rejects.toThrow(
        'Token revocation failed: Bad Request'
      );
    });

    it('should call DELETE on the correct Facebook endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await revokeAccessToken('my-token');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/me/permissions?access_token=my-token',
        { method: 'DELETE' }
      );
    });
  });

  describe('calculateExpirationTimestamp', () => {
    it('should calculate correct expiration timestamp', () => {
      const expiresIn = 3600; // 1 hour
      const before = Math.floor(Date.now() / 1000);
      const timestamp = calculateExpirationTimestamp(expiresIn);
      const after = Math.floor(Date.now() / 1000);

      expect(timestamp).toBeGreaterThanOrEqual(before + expiresIn);
      expect(timestamp).toBeLessThanOrEqual(after + expiresIn);
    });
  });

  describe('isTokenExpiring', () => {
    it('should return true if token is expired', () => {
      const expiredTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      expect(isTokenExpiring(expiredTime)).toBe(true);
    });

    it('should return true if token expires within buffer', () => {
      const expiringTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      expect(isTokenExpiring(expiringTime, 7200)).toBe(true); // 2 hour buffer
    });

    it('should return false if token has plenty of time left', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 604800; // 1 week from now
      expect(isTokenExpiring(futureTime, 86400)).toBe(false); // 1 day buffer
    });

    it('should use default 24-hour buffer when not specified', () => {
      // Token expires in 12 hours — within default 24h buffer
      const expiringTime = Math.floor(Date.now() / 1000) + 43200;
      expect(isTokenExpiring(expiringTime)).toBe(true);
    });

    it('should return true when token expires exactly at buffer boundary', () => {
      const now = Math.floor(Date.now() / 1000);
      // Token expires exactly at buffer time — (expiresAt - now) == bufferSeconds → returns true (<=)
      expect(isTokenExpiring(now + 100, 100)).toBe(true);
    });
  });
});
