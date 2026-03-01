/**
 * Authentication tests — Firebase session-based auth
 * @jest-environment node
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock next/headers cookies()
const mockCookieGet = jest.fn();
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: (...args: unknown[]) => mockCookieGet(...args),
  }),
}));

// Mock Firebase Admin SDK
const mockVerifySessionCookie = jest.fn();
const mockCreateSessionCookie = jest.fn();
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifySessionCookie: (...args: unknown[]) => mockVerifySessionCookie(...args),
    createSessionCookie: (...args: unknown[]) => mockCreateSessionCookie(...args),
  },
}));

// Mock Prisma client
const mockUserFindUnique = jest.fn();
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
  },
}));

// Must import after mocks are set up
import { getCurrentUser, getCurrentUserId, requireAuth } from '@/lib/auth';

describe('Auth utilities (Firebase session)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCookieGet.mockReturnValue(undefined);
  });

  describe('getCurrentUser', () => {
    test('should return user when valid session cookie and user exists in DB', async () => {
      mockCookieGet.mockReturnValue({ value: 'valid-session-cookie' });
      mockVerifySessionCookie.mockResolvedValue({
        uid: 'firebase-uid-123',
        email: 'test@example.com',
      });
      mockUserFindUnique.mockResolvedValue({
        id: 'prisma-user-123',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
        firebaseUid: 'firebase-uid-123',
      });

      const user = await getCurrentUser();
      expect(user).toEqual({
        id: 'prisma-user-123',
        firebaseUid: 'firebase-uid-123',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
      });
    });

    test('should return null when no session cookie exists', async () => {
      mockCookieGet.mockReturnValue(undefined);

      const user = await getCurrentUser();
      expect(user).toBeNull();
      expect(mockVerifySessionCookie).not.toHaveBeenCalled();
    });

    test('should return null when session cookie is invalid', async () => {
      mockCookieGet.mockReturnValue({ value: 'invalid-cookie' });
      mockVerifySessionCookie.mockRejectedValue(new Error('Invalid cookie'));

      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    test('should return null when user not found in database', async () => {
      mockCookieGet.mockReturnValue({ value: 'valid-session-cookie' });
      mockVerifySessionCookie.mockResolvedValue({
        uid: 'firebase-uid-unknown',
      });
      mockUserFindUnique.mockResolvedValue(null);

      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    test('should verify session cookie with checkRevoked=true', async () => {
      mockCookieGet.mockReturnValue({ value: 'session-cookie-value' });
      mockVerifySessionCookie.mockResolvedValue({ uid: 'uid' });
      mockUserFindUnique.mockResolvedValue(null);

      await getCurrentUser();
      expect(mockVerifySessionCookie).toHaveBeenCalledWith('session-cookie-value', true);
    });

    test('should lookup user by firebaseUid', async () => {
      mockCookieGet.mockReturnValue({ value: 'valid-session-cookie' });
      mockVerifySessionCookie.mockResolvedValue({ uid: 'firebase-uid-456' });
      mockUserFindUnique.mockResolvedValue(null);

      await getCurrentUser();
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { firebaseUid: 'firebase-uid-456' },
      });
    });
  });

  describe('getCurrentUserId', () => {
    test('should return user ID when authenticated', async () => {
      mockCookieGet.mockReturnValue({ value: 'valid-session-cookie' });
      mockVerifySessionCookie.mockResolvedValue({ uid: 'firebase-uid-123' });
      mockUserFindUnique.mockResolvedValue({
        id: 'prisma-user-123',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
        firebaseUid: 'firebase-uid-123',
      });

      const userId = await getCurrentUserId();
      expect(userId).toBe('prisma-user-123');
    });

    test('should return null when not authenticated', async () => {
      mockCookieGet.mockReturnValue(undefined);

      const userId = await getCurrentUserId();
      expect(userId).toBeNull();
    });

    test('should return null when session is invalid', async () => {
      mockCookieGet.mockReturnValue({ value: 'invalid-cookie' });
      mockVerifySessionCookie.mockRejectedValue(new Error('Invalid'));

      const userId = await getCurrentUserId();
      expect(userId).toBeNull();
    });
  });

  describe('requireAuth', () => {
    test('should return user when authenticated', async () => {
      mockCookieGet.mockReturnValue({ value: 'valid-session-cookie' });
      mockVerifySessionCookie.mockResolvedValue({ uid: 'firebase-uid-123' });
      mockUserFindUnique.mockResolvedValue({
        id: 'prisma-user-123',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
        firebaseUid: 'firebase-uid-123',
      });

      const user = await requireAuth();
      expect(user).toEqual({
        id: 'prisma-user-123',
        firebaseUid: 'firebase-uid-123',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
      });
    });

    test('should throw error when not authenticated', async () => {
      mockCookieGet.mockReturnValue(undefined);
      await expect(requireAuth()).rejects.toThrow('Authentication required');
    });

    test('should throw error when session cookie is invalid', async () => {
      mockCookieGet.mockReturnValue({ value: 'invalid-cookie' });
      mockVerifySessionCookie.mockRejectedValue(new Error('Invalid'));
      await expect(requireAuth()).rejects.toThrow('Authentication required');
    });

    test('should throw error when user not in database', async () => {
      mockCookieGet.mockReturnValue({ value: 'valid-cookie' });
      mockVerifySessionCookie.mockResolvedValue({ uid: 'unknown-uid' });
      mockUserFindUnique.mockResolvedValue(null);
      await expect(requireAuth()).rejects.toThrow('Authentication required');
    });
  });
});
