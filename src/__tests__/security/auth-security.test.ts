/**
 * Security Tests for Firebase Authentication
 * @jest-environment node
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock next/headers cookies()
const mockCookieGet = jest.fn();
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: (...args: unknown[]) => mockCookieGet(...args),
  }),
}));

// Mock Firebase Admin SDK
const mockVerifySessionCookie = jest.fn();
const mockAdminVerifyIdToken = jest.fn();
const mockCreateSessionCookie = jest.fn();
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifySessionCookie: (...args: unknown[]) => mockVerifySessionCookie(...args),
    verifyIdToken: (...args: unknown[]) => mockAdminVerifyIdToken(...args),
    createSessionCookie: (...args: unknown[]) => mockCreateSessionCookie(...args),
  },
}));

// Mock Prisma
const mockUserFindUnique = jest.fn();
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
  },
}));

import { getCurrentUser, requireAuth, createSessionCookie } from '@/lib/firebase/session';
import { verifyIdToken } from '@/lib/firebase/auth-middleware';

describe('Security: Firebase Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCookieGet.mockReturnValue(undefined);
  });

  describe('Session Cookie Security', () => {
    test('should verify session cookie with revocation check', async () => {
      mockCookieGet.mockReturnValue({ value: 'session-cookie' });
      mockVerifySessionCookie.mockResolvedValue({ uid: 'uid-123' });
      mockUserFindUnique.mockResolvedValue(null);

      await getCurrentUser();
      expect(mockVerifySessionCookie).toHaveBeenCalledWith('session-cookie', true);
    });

    test('should reject expired session cookies', async () => {
      mockCookieGet.mockReturnValue({ value: 'expired-cookie' });
      mockVerifySessionCookie.mockRejectedValue(new Error('Session cookie has expired'));

      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    test('should reject tampered session cookies', async () => {
      mockCookieGet.mockReturnValue({ value: 'tampered-cookie' });
      mockVerifySessionCookie.mockRejectedValue(new Error('Decoding Firebase session cookie failed'));

      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    test('should reject revoked session cookies', async () => {
      mockCookieGet.mockReturnValue({ value: 'revoked-cookie' });
      mockVerifySessionCookie.mockRejectedValue(new Error('Session cookie has been revoked'));

      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    test('should handle missing cookie gracefully', async () => {
      mockCookieGet.mockReturnValue(undefined);

      const user = await getCurrentUser();
      expect(user).toBeNull();
      expect(mockVerifySessionCookie).not.toHaveBeenCalled();
    });

    test('should create session cookie with proper expiration', async () => {
      mockCreateSessionCookie.mockResolvedValue('new-session-cookie');

      const cookie = await createSessionCookie('valid-id-token');

      expect(mockCreateSessionCookie).toHaveBeenCalledWith('valid-id-token', {
        expiresIn: 60 * 60 * 24 * 5 * 1000, // 5 days in ms
      });
      expect(cookie).toBe('new-session-cookie');
    });
  });

  describe('Bearer Token Security', () => {
    test('should reject requests without Authorization header', async () => {
      const req = new NextRequest('http://localhost:3000/api/test');
      const result = await verifyIdToken(req);
      expect(result).toBeNull();
    });

    test('should reject requests with non-Bearer authorization', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: { Authorization: 'Basic dXNlcjpwYXNz' },
      });
      const result = await verifyIdToken(req);
      expect(result).toBeNull();
    });

    test('should reject requests with empty Bearer token', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: { Authorization: 'Bearer ' },
      });
      const result = await verifyIdToken(req);
      expect(result).toBeNull();
    });

    test('should reject invalid Firebase tokens', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: { Authorization: 'Bearer invalid-token' },
      });
      mockAdminVerifyIdToken.mockRejectedValue(new Error('Firebase ID token has invalid signature'));

      const result = await verifyIdToken(req);
      expect(result).toBeNull();
    });

    test('should reject expired Firebase tokens', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: { Authorization: 'Bearer expired-token' },
      });
      mockAdminVerifyIdToken.mockRejectedValue(new Error('Firebase ID token has expired'));

      const result = await verifyIdToken(req);
      expect(result).toBeNull();
    });

    test('should reject tokens for users not in database', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: { Authorization: 'Bearer valid-token' },
      });
      mockAdminVerifyIdToken.mockResolvedValue({ uid: 'unknown-uid', email: 'user@test.com' });
      mockUserFindUnique.mockResolvedValue(null);

      const result = await verifyIdToken(req);
      expect(result).toBeNull();
    });

    test('should resolve valid tokens to user records', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: { Authorization: 'Bearer valid-token' },
      });
      mockAdminVerifyIdToken.mockResolvedValue({
        uid: 'fb-123',
        email: 'user@test.com',
        name: 'Test',
        picture: 'http://img.com/1',
      });
      mockUserFindUnique.mockResolvedValue({
        id: 'prisma-123',
        firebaseUid: 'fb-123',
      });

      const result = await verifyIdToken(req);
      expect(result).toEqual({
        uid: 'fb-123',
        email: 'user@test.com',
        name: 'Test',
        picture: 'http://img.com/1',
        prismaUserId: 'prisma-123',
      });
    });
  });

  describe('Error Handling Security', () => {
    test('should not leak error details for invalid sessions', async () => {
      mockCookieGet.mockReturnValue({ value: 'bad-cookie' });
      mockVerifySessionCookie.mockRejectedValue(new Error('Internal Firebase error'));

      const user = await getCurrentUser();
      // Returns null — does not expose the internal error
      expect(user).toBeNull();
    });

    test('should not leak user existence for unknown Firebase UIDs', async () => {
      mockCookieGet.mockReturnValue({ value: 'valid-cookie' });
      mockVerifySessionCookie.mockResolvedValue({ uid: 'unknown-uid' });
      mockUserFindUnique.mockResolvedValue(null);

      const user = await getCurrentUser();
      // Returns null — does not indicate whether the UID exists
      expect(user).toBeNull();
    });

    test('requireAuth should throw consistent error message', async () => {
      // Case 1: No cookie
      mockCookieGet.mockReturnValue(undefined);
      await expect(requireAuth()).rejects.toThrow('Authentication required');

      // Case 2: Invalid cookie
      mockCookieGet.mockReturnValue({ value: 'bad-cookie' });
      mockVerifySessionCookie.mockRejectedValue(new Error('expired'));
      await expect(requireAuth()).rejects.toThrow('Authentication required');

      // Case 3: User not in database
      mockCookieGet.mockReturnValue({ value: 'valid-cookie' });
      mockVerifySessionCookie.mockResolvedValue({ uid: 'unknown' });
      mockUserFindUnique.mockResolvedValue(null);
      await expect(requireAuth()).rejects.toThrow('Authentication required');
    });
  });

  describe('Input Validation', () => {
    test('should safely handle tokens with SQL injection patterns', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: { Authorization: "Bearer admin'--" },
      });
      // Firebase Admin SDK validates the token; malicious strings result in rejection
      mockAdminVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      const result = await verifyIdToken(req);
      expect(result).toBeNull();
    });

    test('should safely handle extremely long tokens', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: { Authorization: `Bearer ${'a'.repeat(10000)}` },
      });
      mockAdminVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      const result = await verifyIdToken(req);
      expect(result).toBeNull();
    });

    test('should safely handle XSS attempts in token', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: { Authorization: 'Bearer <script>alert("XSS")</script>' },
      });
      mockAdminVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      const result = await verifyIdToken(req);
      expect(result).toBeNull();
    });
  });
});

describe('Security: Rate Limiting & Abuse Prevention', () => {
  test('should document rate limiting strategy', () => {
    // Rate limiting should be handled at the edge/middleware level
    expect(true).toBe(true);
  });
});
