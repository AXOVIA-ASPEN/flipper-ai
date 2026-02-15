/**
 * Facebook Token Store Tests
 */

import {
  storeToken,
  getToken,
  hasValidToken,
  deleteToken,
  isTokenExpiring,
  getAllTokenUsers,
} from '@/scrapers/facebook/token-store';
import { prisma } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    facebookToken: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/crypto', () => ({
  encrypt: jest.fn((val: string) => `encrypted_${val}`),
  decrypt: jest.fn((val: string) => val.replace('encrypted_', '')),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Facebook Token Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('storeToken', () => {
    it('encrypts and upserts token', async () => {
      (mockPrisma.facebookToken.upsert as jest.Mock).mockResolvedValue({});

      await storeToken('user-1', 'abc123', 3600);

      expect(encrypt).toHaveBeenCalledWith('abc123');
      expect(mockPrisma.facebookToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          update: expect.objectContaining({
            accessToken: 'encrypted_abc123',
          }),
          create: expect.objectContaining({
            userId: 'user-1',
            accessToken: 'encrypted_abc123',
          }),
        })
      );
    });
  });

  describe('getToken', () => {
    it('returns decrypted token when found', async () => {
      const now = new Date();
      (mockPrisma.facebookToken.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        accessToken: 'encrypted_abc123',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: now,
        updatedAt: now,
      });

      const result = await getToken('user-1');

      expect(decrypt).toHaveBeenCalledWith('encrypted_abc123');
      expect(result).not.toBeNull();
      expect(result!.accessToken).toBe('abc123');
      expect(result!.userId).toBe('user-1');
    });

    it('returns null when token not found', async () => {
      (mockPrisma.facebookToken.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getToken('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('hasValidToken', () => {
    it('returns true for non-expired token', async () => {
      (mockPrisma.facebookToken.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        accessToken: 'encrypted_token',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(await hasValidToken('user-1')).toBe(true);
    });

    it('returns false for expired token', async () => {
      (mockPrisma.facebookToken.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        accessToken: 'encrypted_token',
        expiresAt: new Date(Date.now() - 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(await hasValidToken('user-1')).toBe(false);
    });

    it('returns false when no token exists', async () => {
      (mockPrisma.facebookToken.findUnique as jest.Mock).mockResolvedValue(null);
      expect(await hasValidToken('user-1')).toBe(false);
    });
  });

  describe('deleteToken', () => {
    it('deletes existing token', async () => {
      (mockPrisma.facebookToken.delete as jest.Mock).mockResolvedValue({});
      await deleteToken('user-1');
      expect(mockPrisma.facebookToken.delete).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('silently ignores deletion of non-existent token', async () => {
      (mockPrisma.facebookToken.delete as jest.Mock).mockRejectedValue(new Error('Not found'));
      await expect(deleteToken('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('isTokenExpiring', () => {
    it('returns true when no token exists', async () => {
      (mockPrisma.facebookToken.findUnique as jest.Mock).mockResolvedValue(null);
      expect(await isTokenExpiring('user-1')).toBe(true);
    });

    it('returns true when token expires within buffer', async () => {
      (mockPrisma.facebookToken.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        accessToken: 'encrypted_token',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Buffer is 7 days default, so 1 hour left = expiring
      expect(await isTokenExpiring('user-1')).toBe(true);
    });

    it('returns false when token has plenty of time', async () => {
      (mockPrisma.facebookToken.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        accessToken: 'encrypted_token',
        expiresAt: new Date(Date.now() + 30 * 86400000), // 30 days
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(await isTokenExpiring('user-1')).toBe(false);
    });

    it('respects custom buffer', async () => {
      (mockPrisma.facebookToken.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        accessToken: 'encrypted_token',
        expiresAt: new Date(Date.now() + 7200000), // 2 hours
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(await isTokenExpiring('user-1', 3600)).toBe(false); // 1 hour buffer
      expect(await isTokenExpiring('user-1', 86400)).toBe(true); // 1 day buffer
    });
  });

  describe('getAllTokenUsers', () => {
    it('returns array of user IDs', async () => {
      (mockPrisma.facebookToken.findMany as jest.Mock).mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);

      const result = await getAllTokenUsers();
      expect(result).toEqual(['user-1', 'user-2']);
    });

    it('returns empty array when no tokens exist', async () => {
      (mockPrisma.facebookToken.findMany as jest.Mock).mockResolvedValue([]);
      const result = await getAllTokenUsers();
      expect(result).toEqual([]);
    });
  });
});
