/**
 * Authentication middleware tests
 * @jest-environment node
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';

// Mock NextAuth auth function
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
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

import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  withAuth,
  getAuthUserId,
  getAuthUser,
  isAuthenticated,
  getUserIdOrDefault,
  requirePageAuth,
} from '@/lib/auth-middleware';

describe('Auth Middleware', () => {
  const mockAuth = auth as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NODE_ENV;
  });

  describe('withAuth', () => {
    test('should call handler with authenticated request', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };
      mockAuth.mockResolvedValue(mockSession);

      const mockHandler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const wrappedHandler = withAuth(mockHandler);
      const req = new NextRequest('http://localhost:3000/api/test');
      const context = { params: {} };

      await wrappedHandler(req, context);

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          userEmail: 'test@example.com',
        }),
        context
      );
    });

    test('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

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
      mockAuth.mockResolvedValue({
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const mockHandler = jest.fn();
      const wrappedHandler = withAuth(mockHandler);
      const req = new NextRequest('http://localhost:3000/api/test');

      const response = await wrappedHandler(req, {});
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    test('should return 401 when user has no ID', async () => {
      mockAuth.mockResolvedValue({
        user: { email: 'test@example.com' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const mockHandler = jest.fn();
      const wrappedHandler = withAuth(mockHandler);
      const req = new NextRequest('http://localhost:3000/api/test');

      const response = await wrappedHandler(req, {});

      expect(response.status).toBe(401);
    });

    test('should attach null email when user has no email', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const mockHandler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

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
  });

  describe('getAuthUserId', () => {
    test('should return user ID when authenticated', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const userId = await getAuthUserId();
      expect(userId).toBe('user-123');
    });

    test('should return null when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);
      const userId = await getAuthUserId();
      expect(userId).toBeNull();
    });

    test('should return null when session has no user', async () => {
      mockAuth.mockResolvedValue({
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      const userId = await getAuthUserId();
      expect(userId).toBeNull();
    });

    test('should return null when user has no ID', async () => {
      mockAuth.mockResolvedValue({
        user: { email: 'test@example.com' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      const userId = await getAuthUserId();
      expect(userId).toBeNull();
    });
  });

  describe('getAuthUser', () => {
    test('should return user when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };
      mockAuth.mockResolvedValue({
        user: mockUser,
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const user = await getAuthUser();
      expect(user).toEqual(mockUser);
    });

    test('should return null when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);
      const user = await getAuthUser();
      expect(user).toBeNull();
    });

    test('should return null when session has no user', async () => {
      mockAuth.mockResolvedValue({
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      const user = await getAuthUser();
      expect(user).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    test('should return true when authenticated', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const result = await isAuthenticated();
      expect(result).toBe(true);
    });

    test('should return false when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);
      const result = await isAuthenticated();
      expect(result).toBe(false);
    });

    test('should return false when session has no user', async () => {
      mockAuth.mockResolvedValue({
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      const result = await isAuthenticated();
      expect(result).toBe(false);
    });

    test('should return false when user has no ID', async () => {
      mockAuth.mockResolvedValue({
        user: { email: 'test@example.com' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      const result = await isAuthenticated();
      expect(result).toBe(false);
    });
  });

  describe('getUserIdOrDefault', () => {
    test('should return authenticated user ID', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const userId = await getUserIdOrDefault();
      expect(userId).toBe('user-123');
    });

    test('should throw error in production when not authenticated', async () => {
      process.env.NODE_ENV = 'production';
      mockAuth.mockResolvedValue(null);

      await expect(getUserIdOrDefault()).rejects.toThrow('Unauthorized');
    });

    test('should return default user in development when not authenticated', async () => {
      process.env.NODE_ENV = 'development';
      mockAuth.mockResolvedValue(null);

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
      mockAuth.mockResolvedValue(null);
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
      };
      mockAuth.mockResolvedValue({
        user: mockUser,
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const result = await requirePageAuth();
      expect(result).toEqual({ props: { user: mockUser } });
    });

    test('should return redirect when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const result = await requirePageAuth();
      expect(result).toEqual({
        redirect: {
          destination: '/login',
          permanent: false,
        },
      });
    });

    test('should return redirect when session has no user', async () => {
      mockAuth.mockResolvedValue({
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const result = await requirePageAuth();
      expect(result).toHaveProperty('redirect');
    });
  });
});
