/**
 * Authentication tests
 * @jest-environment node
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock NextAuth before importing auth
const mockNextAuth = jest.fn((config) => {
  // Store the config so tests can access it
  mockNextAuth._config = config;
  return {
    handlers: { GET: jest.fn(), POST: jest.fn() },
    auth: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  };
});

jest.mock('next-auth', () => ({
  __esModule: true,
  default: mockNextAuth,
}));

// Mock NextAuth providers
jest.mock('next-auth/providers/google', () => ({
  __esModule: true,
  default: jest.fn((config) => ({ ...config, type: 'oauth', id: 'google', name: 'Google' })),
}));

jest.mock('next-auth/providers/github', () => ({
  __esModule: true,
  default: jest.fn((config) => ({ ...config, type: 'oauth', id: 'github', name: 'GitHub' })),
}));

jest.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: jest.fn((config) => ({ ...config, type: 'credentials', id: 'credentials', name: 'credentials' })),
}));

// Mock Prisma adapter
jest.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: jest.fn(),
}));

// Mock Prisma client
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    userSettings: {
      create: jest.fn(),
    },
  },
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import prisma from '@/lib/db';

// Must import after mocks are set up
import { getCurrentUser, getCurrentUserId, requireAuth } from '@/lib/auth';

describe('Auth utilities', () => {
  let mockAuth: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get the mocked auth function from NextAuth
    const NextAuth = require('next-auth').default;
    const authConfig = NextAuth._config;
    mockAuth = authConfig ? jest.fn() : jest.fn();
  });

  describe('getCurrentUser', () => {
    test('should return user when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
      };

      // Mock the auth function to return a valid session
      jest.spyOn(require('@/lib/auth'), 'auth').mockResolvedValue({
        user: mockUser,
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const user = await getCurrentUser();
      expect(user).toEqual(mockUser);
    });

    test('should return null when not authenticated', async () => {
      jest.spyOn(require('@/lib/auth'), 'auth').mockResolvedValue(null);
      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    test('should return null when session has no user', async () => {
      jest.spyOn(require('@/lib/auth'), 'auth').mockResolvedValue({
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    test('should return null when session user has no ID', async () => {
      jest.spyOn(require('@/lib/auth'), 'auth').mockResolvedValue({
        user: { email: 'test@example.com' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      const user = await getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('getCurrentUserId', () => {
    test('should return user ID when authenticated', async () => {
      jest.spyOn(require('@/lib/auth'), 'auth').mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const userId = await getCurrentUserId();
      expect(userId).toBe('user-123');
    });

    test('should return null when not authenticated', async () => {
      jest.spyOn(require('@/lib/auth'), 'auth').mockResolvedValue(null);
      const userId = await getCurrentUserId();
      expect(userId).toBeNull();
    });

    test('should return null when user has no ID', async () => {
      jest.spyOn(require('@/lib/auth'), 'auth').mockResolvedValue({
        user: { email: 'test@example.com' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      const userId = await getCurrentUserId();
      expect(userId).toBeNull();
    });
  });

  describe('requireAuth', () => {
    test('should return user when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      jest.spyOn(require('@/lib/auth'), 'auth').mockResolvedValue({
        user: mockUser,
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const user = await requireAuth();
      expect(user).toEqual(mockUser);
    });

    test('should throw error when not authenticated', async () => {
      jest.spyOn(require('@/lib/auth'), 'auth').mockResolvedValue(null);
      await expect(requireAuth()).rejects.toThrow('Unauthorized');
    });

    test('should throw error when session has no user', async () => {
      jest.spyOn(require('@/lib/auth'), 'auth').mockResolvedValue({
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      await expect(requireAuth()).rejects.toThrow('Unauthorized');
    });

    test('should throw error when user has no ID', async () => {
      jest.spyOn(require('@/lib/auth'), 'auth').mockResolvedValue({
        user: { email: 'test@example.com' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      await expect(requireAuth()).rejects.toThrow('Unauthorized');
    });
  });

  describe('Credentials provider', () => {
    test('should authenticate with valid email and password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: '$2a$10$hashedpassword',
        image: null,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      const bcrypt = require('bcryptjs');
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const credentialsProvider = authConfig.providers.find(
        (p: any) => p.name === 'credentials'
      );

      if (!credentialsProvider) {
        throw new Error('Credentials provider not found');
      }

      const result = await credentialsProvider.authorize({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
      });
    });

    test('should reject missing email', async () => {
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const credentialsProvider = authConfig.providers.find(
        (p: any) => p.name === 'credentials'
      );

      await expect(
        credentialsProvider.authorize({ password: 'password123' })
      ).rejects.toThrow('Email and password are required');
    });

    test('should reject missing password', async () => {
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const credentialsProvider = authConfig.providers.find(
        (p: any) => p.name === 'credentials'
      );

      await expect(
        credentialsProvider.authorize({ email: 'test@example.com' })
      ).rejects.toThrow('Email and password are required');
    });

    test('should reject invalid email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const credentialsProvider = authConfig.providers.find(
        (p: any) => p.name === 'credentials'
      );

      await expect(
        credentialsProvider.authorize({
          email: 'wrong@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    test('should reject user without password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        password: null, // OAuth user
      });

      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const credentialsProvider = authConfig.providers.find(
        (p: any) => p.name === 'credentials'
      );

      await expect(
        credentialsProvider.authorize({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    test('should reject invalid password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        password: '$2a$10$hashedpassword',
      });
      const bcrypt = require('bcryptjs');
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const credentialsProvider = authConfig.providers.find(
        (p: any) => p.name === 'credentials'
      );

      await expect(
        credentialsProvider.authorize({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('JWT callback', () => {
    test('should add user ID to token', async () => {
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const jwtCallback = authConfig.callbacks.jwt;

      const token = { sub: 'token-sub' };
      const user = { id: 'user-123' };

      const result = await jwtCallback({ token, user });
      expect(result.id).toBe('user-123');
    });

    test('should preserve existing token when no user', async () => {
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const jwtCallback = authConfig.callbacks.jwt;

      const token = { sub: 'token-sub', id: 'existing-id' };

      const result = await jwtCallback({ token });
      expect(result.id).toBe('existing-id');
    });
  });

  describe('Session callback', () => {
    test('should add user ID to session', async () => {
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const sessionCallback = authConfig.callbacks.session;

      const session = { user: { email: 'test@example.com' } };
      const token = { id: 'user-123' };

      const result = await sessionCallback({ session, token });
      expect(result.user.id).toBe('user-123');
    });

    test('should handle missing user in session', async () => {
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const sessionCallback = authConfig.callbacks.session;

      const session = {};
      const token = { id: 'user-123' };

      const result = await sessionCallback({ session, token });
      expect(result).toEqual(session);
    });

    test('should handle missing token ID', async () => {
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const sessionCallback = authConfig.callbacks.session;

      const session = { user: { email: 'test@example.com' } };
      const token = {};

      const result = await sessionCallback({ session, token });
      expect(result.user).not.toHaveProperty('id');
    });
  });

  describe('createUser event', () => {
    test('should create default settings for new user', async () => {
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const createUserEvent = authConfig.events.createUser;

      const user = { id: 'new-user-123' };
      await createUserEvent({ user });

      expect(prisma.userSettings.create).toHaveBeenCalledWith({
        data: {
          userId: 'new-user-123',
          llmModel: 'gpt-4o-mini',
          discountThreshold: 50,
          autoAnalyze: true,
        },
      });
    });

    test('should not create settings when user has no ID', async () => {
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const createUserEvent = authConfig.events.createUser;

      const user = { email: 'test@example.com' };
      await createUserEvent({ user });

      expect(prisma.userSettings.create).not.toHaveBeenCalled();
    });
  });
});
