/**
 * Unit tests for src/lib/google-calendar-token-store.ts
 * Story 12.1 — Task 8.2
 */

// Mock Prisma
const mockUpsert = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    googleCalendarToken: {
      upsert: mockUpsert,
      findUnique: mockFindUnique,
      update: mockUpdate,
      delete: mockDelete,
    },
  },
}));

// Mock crypto to use deterministic encrypt/decrypt
jest.mock('@/lib/crypto', () => ({
  encrypt: (v: string) => `enc:${v}`,
  decrypt: (v: string) => v.replace(/^enc:/, ''),
}));

import {
  storeToken,
  getToken,
  hasValidToken,
  deleteToken,
  updateAccessToken,
} from '../lib/google-calendar-token-store';

describe('google-calendar-token-store', () => {
  const userId = 'user-abc';
  const accessToken = 'access-token-value';
  const refreshToken = 'refresh-token-value';
  const expiresAt = new Date(Date.now() + 3600 * 1000);
  const calendarEmail = 'test@gmail.com';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('storeToken', () => {
    it('upserts with encrypted access and refresh tokens', async () => {
      mockUpsert.mockResolvedValue({});

      await storeToken(userId, accessToken, refreshToken, expiresAt, calendarEmail);

      expect(mockUpsert).toHaveBeenCalledWith({
        where: { userId },
        update: expect.objectContaining({
          accessToken: 'enc:access-token-value',
          refreshToken: 'enc:refresh-token-value',
          expiresAt,
          calendarEmail,
        }),
        create: expect.objectContaining({
          userId,
          accessToken: 'enc:access-token-value',
          refreshToken: 'enc:refresh-token-value',
          expiresAt,
          calendarEmail,
        }),
      });
    });

    it('stores null email when not provided', async () => {
      mockUpsert.mockResolvedValue({});
      await storeToken(userId, accessToken, refreshToken, expiresAt);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ calendarEmail: null }),
        })
      );
    });
  });

  describe('getToken', () => {
    it('returns null when no record exists', async () => {
      mockFindUnique.mockResolvedValue(null);
      const result = await getToken(userId);
      expect(result).toBeNull();
    });

    it('returns decrypted tokens', async () => {
      mockFindUnique.mockResolvedValue({
        userId,
        accessToken: `enc:${accessToken}`,
        refreshToken: `enc:${refreshToken}`,
        expiresAt,
        calendarEmail,
      });

      const result = await getToken(userId);

      expect(result).toEqual({
        userId,
        accessToken,
        refreshToken,
        expiresAt,
        calendarEmail,
      });
    });
  });

  describe('hasValidToken', () => {
    it('returns false when no record exists', async () => {
      mockFindUnique.mockResolvedValue(null);
      expect(await hasValidToken(userId)).toBe(false);
    });

    it('returns true when token is not expired', async () => {
      mockFindUnique.mockResolvedValue({ expiresAt: new Date(Date.now() + 60 * 1000) });
      expect(await hasValidToken(userId)).toBe(true);
    });

    it('returns false when token is expired', async () => {
      mockFindUnique.mockResolvedValue({ expiresAt: new Date(Date.now() - 60 * 1000) });
      expect(await hasValidToken(userId)).toBe(false);
    });
  });

  describe('deleteToken', () => {
    it('deletes the record', async () => {
      mockDelete.mockResolvedValue({});
      await deleteToken(userId);
      expect(mockDelete).toHaveBeenCalledWith({ where: { userId } });
    });

    it('resolves successfully when record does not exist (idempotent)', async () => {
      mockDelete.mockRejectedValue(new Error('Record not found'));
      await expect(deleteToken(userId)).resolves.toBeUndefined();
    });
  });

  describe('updateAccessToken', () => {
    it('updates only the access token and expiry', async () => {
      mockUpdate.mockResolvedValue({});
      const newExpiry = new Date(Date.now() + 7200 * 1000);
      await updateAccessToken(userId, 'new-access', newExpiry);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { userId },
        data: expect.objectContaining({
          accessToken: 'enc:new-access',
          expiresAt: newExpiry,
        }),
      });
    });
  });
});
