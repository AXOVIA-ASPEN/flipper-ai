/**
 * Authentication middleware tests — Firebase-based
 * @jest-environment node
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';

// Mock Firebase session
const mockGetCurrentUser = jest.fn();
const mockGetCurrentUserId = jest.fn();
jest.mock('@/lib/firebase/session', () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  getCurrentUserId: (...args: unknown[]) => mockGetCurrentUserId(...args),
}));

// Mock Firebase auth middleware
const mockVerifyIdToken = jest.fn();
jest.mock('@/lib/firebase/auth-middleware', () => ({
  verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
}));

// Mock Prisma
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findFirst: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';
import {
  withAuth,
  getAuthUserId,
  getAuthUser,
  isAuthenticated,
  getUserIdOrDefault,
  requirePageAuth,
} from '@/lib/auth-middleware';

describe('Auth Middleware (Firebase)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NODE_ENV;
  });

  describe('withAuth', () => {
    test('should call handler when authenticated via session cookie', async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        firebaseUid: 'fb-123',
        image: null,
      });

      const mockHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const wrappedHandler = withAuth(mockHandler);
      const req = new NextRequest('http://localhost:3000/api/test');

      await wrappedHandler(req, {});

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          userEmail: 'test@example.com',
        }),
        {}
      );
    });

    test('should fall back to Bearer token when no session cookie', async () => {
      mockGetCurrentUser.mockResolvedValue(null);
      mockVerifyIdToken.mockResolvedValue({
        uid: 'fb-456',
        email: 'bearer@example.com',
        prismaUserId: 'user-456',
      });

      const mockHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const wrappedHandler = withAuth(mockHandler);
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: { Authorization: 'Bearer valid-token' },
      });

      await wrappedHandler(req, {});

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-456',
          userEmail: 'bearer@example.com',
        }),
        {}
      );
    });

    test('should return 401 when not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null);
      mockVerifyIdToken.mockResolvedValue(null);

      const mockHandler = jest.fn();
      const wrappedHandler = withAuth(mockHandler);
      const req = new NextRequest('http://localhost:3000/api/test');

      const response = await wrappedHandler(req, {});
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toEqual({ success: false, error: 'Unauthorized' });
      expect(mockHandler).not.toHaveBeenCalled();
    });

    test('should return 401 when session has no user', async () => {
      mockGetCurrentUser.mockResolvedValue(null);
      mockVerifyIdToken.mockResolvedValue(null);

      const mockHandler = jest.fn();
      const wrappedHandler = withAuth(mockHandler);
      const req = new NextRequest('http://localhost:3000/api/test');

      const response = await wrappedHandler(req, {});
      expect(response.status).toBe(401);
    });

    test('should attach null email when user email is missing', async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: 'user-123',
        email: null,
        name: null,
        firebaseUid: 'fb-123',
        image: null,
      });

      const mockHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const wrappedHandler = withAuth(mockHandler);
      const req = new NextRequest('http://localhost:3000/api/test');

      await wrappedHandler(req, {});

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          userEmail: null,
        }),
        {}
      );
    });

    test('should attach null email when Bearer token has no email', async () => {
      mockGetCurrentUser.mockResolvedValue(null);
      mockVerifyIdToken.mockResolvedValue({
        uid: 'fb-789',
        email: undefined,
        prismaUserId: 'user-789',
      });

      const mockHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const wrappedHandler = withAuth(mockHandler);
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: { Authorization: 'Bearer token' },
      });

      await wrappedHandler(req, {});

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-789',
          userEmail: null,
        }),
        {}
      );
    });
  });

  describe('getAuthUserId', () => {
    test('should return user ID from session cookie', async () => {
      mockGetCurrentUserId.mockResolvedValue('user-123');

      const userId = await getAuthUserId();
      expect(userId).toBe('user-123');
    });

    test('should fall back to Bearer token', async () => {
      mockGetCurrentUserId.mockResolvedValue(null);
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: { Authorization: 'Bearer valid-token' },
      });
      mockVerifyIdToken.mockResolvedValue({ prismaUserId: 'user-456' });

      const userId = await getAuthUserId(req);
      expect(userId).toBe('user-456');
    });

    test('should return null when not authenticated', async () => {
      mockGetCurrentUserId.mockResolvedValue(null);
      const userId = await getAuthUserId();
      expect(userId).toBeNull();
    });

    test('should return null when session has no user', async () => {
      mockGetCurrentUserId.mockResolvedValue(null);
      const userId = await getAuthUserId();
      expect(userId).toBeNull();
    });

    test('should return null when user has no ID', async () => {
      mockGetCurrentUserId.mockResolvedValue(null);
      mockVerifyIdToken.mockResolvedValue(null);
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: { Authorization: 'Bearer invalid' },
      });

      const userId = await getAuthUserId(req);
      expect(userId).toBeNull();
    });
  });

  describe('getAuthUser', () => {
    test('should return user when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        firebaseUid: 'fb-123',
        image: null,
      };
      mockGetCurrentUser.mockResolvedValue(mockUser);

      const user = await getAuthUser();
      expect(user).toEqual(mockUser);
    });

    test('should return null when not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null);
      const user = await getAuthUser();
      expect(user).toBeNull();
    });

    test('should return null when session has no user', async () => {
      mockGetCurrentUser.mockResolvedValue(null);
      const user = await getAuthUser();
      expect(user).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    test('should return true when authenticated', async () => {
      mockGetCurrentUserId.mockResolvedValue('user-123');
      const result = await isAuthenticated();
      expect(result).toBe(true);
    });

    test('should return false when not authenticated', async () => {
      mockGetCurrentUserId.mockResolvedValue(null);
      const result = await isAuthenticated();
      expect(result).toBe(false);
    });

    test('should return false when session has no user', async () => {
      mockGetCurrentUserId.mockResolvedValue(null);
      const result = await isAuthenticated();
      expect(result).toBe(false);
    });

    test('should return false when user has no ID', async () => {
      mockGetCurrentUserId.mockResolvedValue(null);
      const result = await isAuthenticated();
      expect(result).toBe(false);
    });
  });

  describe('getUserIdOrDefault', () => {
    test('should return authenticated user ID', async () => {
      mockGetCurrentUserId.mockResolvedValue('user-123');
      const userId = await getUserIdOrDefault();
      expect(userId).toBe('user-123');
    });

    test('should throw error in production when not authenticated', async () => {
      process.env.NODE_ENV = 'production';
      mockGetCurrentUserId.mockResolvedValue(null);
      mockVerifyIdToken.mockResolvedValue(null);

      await expect(getUserIdOrDefault()).rejects.toThrow('Unauthorized');
    });

    test('should return default user in development when not authenticated', async () => {
      process.env.NODE_ENV = 'development';
      mockGetCurrentUserId.mockResolvedValue(null);
      mockVerifyIdToken.mockResolvedValue(null);

      const mockDefaultUser = { id: 'default-user-123' };
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockDefaultUser);

      const userId = await getUserIdOrDefault();
      expect(userId).toBe('default-user-123');
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'default@flipper.ai' },
      });
    });

    test('should throw error in development when no default user exists', async () => {
      process.env.NODE_ENV = 'development';
      mockGetCurrentUserId.mockResolvedValue(null);
      mockVerifyIdToken.mockResolvedValue(null);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(getUserIdOrDefault()).rejects.toThrow('Unauthorized');
    });
  });

  describe('requirePageAuth', () => {
    test('should return user props when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        firebaseUid: 'fb-123',
        image: null,
      };
      mockGetCurrentUser.mockResolvedValue(mockUser);

      const result = await requirePageAuth();
      expect(result).toEqual({ props: { user: mockUser } });
    });

    test('should return redirect when not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const result = await requirePageAuth();
      expect(result).toEqual({
        redirect: {
          destination: '/login',
          permanent: false,
        },
      });
    });

    test('should return redirect when session has no user', async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const result = await requirePageAuth();
      expect(result).toHaveProperty('redirect');
    });
  });
});
