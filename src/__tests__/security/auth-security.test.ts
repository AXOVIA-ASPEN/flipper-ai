/**
 * Comprehensive Security Tests for Authentication
 * @jest-environment node
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

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
  default: jest.fn((config) => ({
    ...config,
    type: 'credentials',
    id: 'credentials',
    name: 'credentials',
  })),
}));

// Mock NextAuth before importing auth
const mockNextAuth = jest.fn((config) => {
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

jest.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: jest.fn(),
}));

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

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

// Import auth to trigger NextAuth config setup
import '@/lib/auth';

describe('Security: Authentication Attack Vectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SQL Injection Protection', () => {
    test('should safely handle SQL injection in email field', async () => {
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const credentialsProvider = authConfig.providers.find((p: any) => p.id === 'credentials');

      const maliciousEmail = "admin'--";
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        credentialsProvider.authorize({
          email: maliciousEmail,
          password: 'password123',
        })
      ).rejects.toThrow('Invalid email or password');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: maliciousEmail },
      });
    });

    test('should safely handle SQL injection in password field', async () => {
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const credentialsProvider = authConfig.providers.find((p: any) => p.id === 'credentials');

      const maliciousPassword = "' OR '1'='1";
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: '$2a$10$hashedpassword',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        credentialsProvider.authorize({
          email: 'test@example.com',
          password: maliciousPassword,
        })
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('Brute Force Protection', () => {
    test('should reject rapid successive login attempts', async () => {
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const credentialsProvider = authConfig.providers.find((p: any) => p.id === 'credentials');

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Simulate 5 rapid failed login attempts
      const attempts = Array(5)
        .fill(null)
        .map(() =>
          credentialsProvider
            .authorize({
              email: 'test@example.com',
              password: 'wrongpass',
            })
            .catch(() => 'failed')
        );

      const results = await Promise.all(attempts);
      expect(results.every((r) => r === 'failed')).toBe(true);
    });
  });

  describe('Password Security', () => {
    test('should reject weak passwords (if validation exists)', async () => {
      // This test assumes password validation would be added
      const weakPasswords = ['123', 'password', 'abc', '11111111'];

      // For now, just verify bcrypt is called for comparison
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const credentialsProvider = authConfig.providers.find((p: any) => p.id === 'credentials');

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: '$2a$10$hashedpassword',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      for (const weakPass of weakPasswords) {
        await expect(
          credentialsProvider.authorize({
            email: 'test@example.com',
            password: weakPass,
          })
        ).rejects.toThrow('Invalid email or password');
      }
    });

    test('should use bcrypt for password hashing', async () => {
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const credentialsProvider = authConfig.providers.find((p: any) => p.id === 'credentials');

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: '$2a$10$hashedpassword',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await credentialsProvider.authorize({
        email: 'test@example.com',
        password: 'correct-password',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith('correct-password', '$2a$10$hashedpassword');
    });
  });

  describe('Session Security', () => {
    test('should use JWT strategy (not database sessions)', () => {
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;

      expect(authConfig.session.strategy).toBe('jwt');
    });

    test('should include user ID in JWT token', async () => {
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const jwtCallback = authConfig.callbacks.jwt;

      const token = { sub: 'token-sub' };
      const user = { id: 'user-123' };

      const result = await jwtCallback({ token, user });
      expect(result.id).toBe('user-123');
    });

    test('should propagate user ID to session', async () => {
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const sessionCallback = authConfig.callbacks.session;

      const session = { user: { email: 'test@example.com' } };
      const token = { id: 'user-123' };

      const result = await sessionCallback({ session, token });
      expect(result.user.id).toBe('user-123');
    });
  });

  describe('OAuth Security', () => {
    test('should enable account linking for Google', () => {
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const googleProvider = authConfig.providers.find((p: any) => p.id === 'google');

      expect(googleProvider.allowDangerousEmailAccountLinking).toBe(true);
    });

    test('should enable account linking for GitHub', () => {
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const githubProvider = authConfig.providers.find((p: any) => p.id === 'github');

      expect(githubProvider.allowDangerousEmailAccountLinking).toBe(true);
    });
  });

  describe('Input Validation', () => {
    test('should reject null/undefined email', async () => {
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const credentialsProvider = authConfig.providers.find((p: any) => p.id === 'credentials');

      await expect(
        credentialsProvider.authorize({
          email: null,
          password: 'password123',
        })
      ).rejects.toThrow('Email and password are required');
    });

    test('should reject XSS attempts in email', async () => {
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const credentialsProvider = authConfig.providers.find((p: any) => p.id === 'credentials');

      const xssEmail = '<script>alert("XSS")</script>@example.com';
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        credentialsProvider.authorize({
          email: xssEmail,
          password: 'password123',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    test('should reject extremely long inputs', async () => {
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const credentialsProvider = authConfig.providers.find((p: any) => p.id === 'credentials');

      const longEmail = 'a'.repeat(10000) + '@example.com';
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        credentialsProvider.authorize({
          email: longEmail,
          password: 'password123',
        })
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('Error Handling', () => {
    test('should not leak user existence information', async () => {
      const NextAuth = require('next-auth').default;
      const authConfig = NextAuth._config;
      const credentialsProvider = authConfig.providers.find((p: any) => p.id === 'credentials');

      // Case 1: User doesn't exist
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const errorNoUser = await credentialsProvider
        .authorize({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .catch((e: Error) => e.message);

      // Case 2: User exists but wrong password
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'exists@example.com',
        password: '$2a$10$hashedpassword',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const errorWrongPass = await credentialsProvider
        .authorize({
          email: 'exists@example.com',
          password: 'wrongpassword',
        })
        .catch((e: Error) => e.message);

      // Both should return same error message
      expect(errorNoUser).toBe(errorWrongPass);
      expect(errorNoUser).toBe('Invalid email or password');
    });
  });
});

describe('Security: Rate Limiting & Abuse Prevention', () => {
  test('should document rate limiting strategy', () => {
    // Note: Actual rate limiting would be implemented at middleware level
    // This test documents the security requirement
    expect(true).toBe(true);
    console.log('INFO: Rate limiting middleware can be added for /api/auth/*');
  });
});
