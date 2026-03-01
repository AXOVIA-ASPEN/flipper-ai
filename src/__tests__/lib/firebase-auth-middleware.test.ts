/**
 * Tests for firebase/auth-middleware.ts
 * @jest-environment node
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';

// Mock Firebase admin auth
const mockVerifyIdToken = jest.fn();
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: { verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args) },
}));

// Mock Prisma
const mockFindUnique = jest.fn();
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { user: { findUnique: (...args: unknown[]) => mockFindUnique(...args) } },
}));

import { verifyIdToken, withFirebaseAuth, FirebaseAuthUser } from '@/lib/firebase/auth-middleware';

function createMockRequest(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader !== undefined) {
    headers.set('authorization', authHeader);
  }
  return new NextRequest('http://localhost:3000/api/test', { headers });
}

describe('firebase/auth-middleware', () => {
  beforeEach(() => {
    mockVerifyIdToken.mockReset();
    mockFindUnique.mockReset();
  });

  describe('verifyIdToken', () => {
    test('returns null when no authorization header is present', async () => {
      const req = createMockRequest();
      const result = await verifyIdToken(req);
      expect(result).toBeNull();
    });

    test('returns null when authorization header does not start with "Bearer "', async () => {
      const req = createMockRequest('Basic abc123');
      const result = await verifyIdToken(req);
      expect(result).toBeNull();
    });

    test('returns null when token is empty after "Bearer "', async () => {
      const req = createMockRequest('Bearer ');
      const result = await verifyIdToken(req);
      expect(result).toBeNull();
    });

    test('returns user object when token is valid and user exists', async () => {
      const decodedToken = {
        uid: 'firebase-uid-123',
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
      };
      const prismaUser = { id: 'prisma-user-id-456' };

      mockVerifyIdToken.mockResolvedValue(decodedToken);
      mockFindUnique.mockResolvedValue(prismaUser);

      const req = createMockRequest('Bearer valid-token-123');
      const result = await verifyIdToken(req);

      expect(result).toEqual({
        uid: 'firebase-uid-123',
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
        prismaUserId: 'prisma-user-id-456',
      });
      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token-123');
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { firebaseUid: 'firebase-uid-123' },
      });
    });

    test('returns null when token is valid but user not found in database', async () => {
      const decodedToken = {
        uid: 'firebase-uid-unknown',
        email: 'unknown@example.com',
        name: 'Unknown User',
        picture: undefined,
      };

      mockVerifyIdToken.mockResolvedValue(decodedToken);
      mockFindUnique.mockResolvedValue(null);

      const req = createMockRequest('Bearer valid-token-no-user');
      const result = await verifyIdToken(req);

      expect(result).toBeNull();
    });

    test('returns null when token verification throws an error', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Token expired'));

      const req = createMockRequest('Bearer expired-token');
      const result = await verifyIdToken(req);

      expect(result).toBeNull();
    });
  });

  describe('withFirebaseAuth', () => {
    test('returns 401 when user is not authenticated', async () => {
      const handler = jest.fn();
      const wrappedHandler = withFirebaseAuth(handler);

      const req = createMockRequest(); // No auth header
      const context = {};

      const response = await wrappedHandler(req, context);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          detail: 'Invalid or missing authentication',
        },
      });
      expect(handler).not.toHaveBeenCalled();
    });

    test('calls handler with userId and userEmail when authenticated', async () => {
      const decodedToken = {
        uid: 'firebase-uid-123',
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
      };
      const prismaUser = { id: 'prisma-user-id-456' };

      mockVerifyIdToken.mockResolvedValue(decodedToken);
      mockFindUnique.mockResolvedValue(prismaUser);

      const expectedResponse = NextResponse.json({ success: true, data: 'ok' });
      const handler = jest.fn().mockResolvedValue(expectedResponse);

      const wrappedHandler = withFirebaseAuth(handler);
      const req = createMockRequest('Bearer valid-token');
      const context = { params: { id: '123' } };

      const response = await wrappedHandler(req, context);

      expect(handler).toHaveBeenCalledTimes(1);

      const calledReq = handler.mock.calls[0][0] as NextRequest & { userId: string; userEmail: string | null };
      expect(calledReq.userId).toBe('prisma-user-id-456');
      expect(calledReq.userEmail).toBe('user@example.com');

      const calledContext = handler.mock.calls[0][1];
      expect(calledContext).toEqual({ params: { id: '123' } });

      expect(response).toBe(expectedResponse);
    });

    test('sets userEmail to null when authenticated user has no email', async () => {
      const decodedToken = {
        uid: 'firebase-uid-no-email',
        email: undefined,
        name: 'No Email User',
        picture: undefined,
      };
      const prismaUser = { id: 'prisma-user-id-789' };

      mockVerifyIdToken.mockResolvedValue(decodedToken);
      mockFindUnique.mockResolvedValue(prismaUser);

      const expectedResponse = NextResponse.json({ success: true });
      const handler = jest.fn().mockResolvedValue(expectedResponse);

      const wrappedHandler = withFirebaseAuth(handler);
      const req = createMockRequest('Bearer valid-token-no-email');
      const context = {};

      await wrappedHandler(req, context);

      expect(handler).toHaveBeenCalledTimes(1);

      const calledReq = handler.mock.calls[0][0] as NextRequest & { userId: string; userEmail: string | null };
      expect(calledReq.userId).toBe('prisma-user-id-789');
      expect(calledReq.userEmail).toBeNull();
    });
  });
});
