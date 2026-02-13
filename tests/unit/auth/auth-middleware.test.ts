/**
 * Unit tests for auth-middleware.ts
 * Author: Stephen Boyett
 * Company: Axovia AI
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';

describe('Auth Middleware', () => {
  let mockRequest: Partial<NextRequest>;
  let mockResponse: Partial<NextResponse>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      headers: new Headers(),
      cookies: {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
      } as any,
      nextUrl: {
        pathname: '/dashboard',
      } as any,
    };
  });

  describe('Authentication Middleware', () => {
    it('should allow access with valid token', async () => {
      const { authMiddleware } = await import('../../../src/middleware/auth-middleware');
      
      const validToken = 'valid_jwt_token';
      mockRequest.headers!.set('Authorization', `Bearer ${validToken}`);
      
      const response = await authMiddleware(mockRequest as NextRequest);
      
      expect(response).toBeUndefined(); // Passes through
    });

    it('should reject request without token', async () => {
      const { authMiddleware } = await import('../../../src/middleware/auth-middleware');
      
      const response = await authMiddleware(mockRequest as NextRequest);
      
      expect(response).toBeDefined();
      expect(response?.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const { authMiddleware } = await import('../../../src/middleware/auth-middleware');
      
      mockRequest.headers!.set('Authorization', 'Bearer invalid_token');
      
      const response = await authMiddleware(mockRequest as NextRequest);
      
      expect(response).toBeDefined();
      expect(response?.status).toBe(401);
    });

    it('should reject request with expired token', async () => {
      const { authMiddleware } = await import('../../../src/middleware/auth-middleware');
      
      const expiredToken = 'expired_jwt_token';
      mockRequest.headers!.set('Authorization', `Bearer ${expiredToken}`);
      
      const response = await authMiddleware(mockRequest as NextRequest);
      
      expect(response?.status).toBe(401);
    });

    it('should extract user from valid token', async () => {
      const { authMiddleware } = await import('../../../src/middleware/auth-middleware');
      
      const validToken = 'valid_jwt_token';
      mockRequest.headers!.set('Authorization', `Bearer ${validToken}`);
      
      await authMiddleware(mockRequest as NextRequest);
      
      // Check if user was attached to request
      expect((mockRequest as any).user).toBeDefined();
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow admin access to admin routes', async () => {
      const { requireRole } = await import('../../../src/middleware/auth-middleware');
      
      const adminUser = { id: '123', role: 'admin' };
      (mockRequest as any).user = adminUser;
      mockRequest.nextUrl!.pathname = '/admin/dashboard';
      
      const middleware = requireRole(['admin']);
      const response = await middleware(mockRequest as NextRequest);
      
      expect(response).toBeUndefined();
    });

    it('should deny user access to admin routes', async () => {
      const { requireRole } = await import('../../../src/middleware/auth-middleware');
      
      const regularUser = { id: '123', role: 'user' };
      (mockRequest as any).user = regularUser;
      mockRequest.nextUrl!.pathname = '/admin/dashboard';
      
      const middleware = requireRole(['admin']);
      const response = await middleware(mockRequest as NextRequest);
      
      expect(response?.status).toBe(403);
    });

    it('should allow multiple valid roles', async () => {
      const { requireRole } = await import('../../../src/middleware/auth-middleware');
      
      const moderatorUser = { id: '123', role: 'moderator' };
      (mockRequest as any).user = moderatorUser;
      
      const middleware = requireRole(['admin', 'moderator']);
      const response = await middleware(mockRequest as NextRequest);
      
      expect(response).toBeUndefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests under rate limit', async () => {
      const { rateLimitMiddleware } = await import('../../../src/middleware/auth-middleware');
      
      const clientIp = '192.168.1.1';
      (mockRequest as any).ip = clientIp;
      
      const response = await rateLimitMiddleware(mockRequest as NextRequest);
      
      expect(response).toBeUndefined();
    });

    it('should block requests over rate limit', async () => {
      const { rateLimitMiddleware } = await import('../../../src/middleware/auth-middleware');
      
      const clientIp = '192.168.1.1';
      (mockRequest as any).ip = clientIp;
      
      // Simulate 100 requests
      for (let i = 0; i < 100; i++) {
        await rateLimitMiddleware(mockRequest as NextRequest);
      }
      
      const response = await rateLimitMiddleware(mockRequest as NextRequest);
      
      expect(response?.status).toBe(429);
    });

    it('should reset rate limit after time window', async () => {
      const { rateLimitMiddleware } = await import('../../../src/middleware/auth-middleware');
      
      const clientIp = '192.168.1.1';
      (mockRequest as any).ip = clientIp;
      
      // Max out rate limit
      for (let i = 0; i < 100; i++) {
        await rateLimitMiddleware(mockRequest as NextRequest);
      }
      
      // Wait for reset (mock timer)
      jest.advanceTimersByTime(60000); // 1 minute
      
      const response = await rateLimitMiddleware(mockRequest as NextRequest);
      
      expect(response).toBeUndefined();
    });
  });

  describe('CSRF Protection', () => {
    it('should validate CSRF token on POST request', async () => {
      const { csrfMiddleware } = await import('../../../src/middleware/auth-middleware');
      
      const validCsrfToken = 'valid_csrf_token';
      mockRequest.method = 'POST';
      mockRequest.headers!.set('X-CSRF-Token', validCsrfToken);
      
      const response = await csrfMiddleware(mockRequest as NextRequest);
      
      expect(response).toBeUndefined();
    });

    it('should reject POST without CSRF token', async () => {
      const { csrfMiddleware } = await import('../../../src/middleware/auth-middleware');
      
      mockRequest.method = 'POST';
      
      const response = await csrfMiddleware(mockRequest as NextRequest);
      
      expect(response?.status).toBe(403);
    });

    it('should allow GET requests without CSRF token', async () => {
      const { csrfMiddleware } = await import('../../../src/middleware/auth-middleware');
      
      mockRequest.method = 'GET';
      
      const response = await csrfMiddleware(mockRequest as NextRequest);
      
      expect(response).toBeUndefined();
    });
  });

  describe('Session Validation', () => {
    it('should validate active session', async () => {
      const { sessionMiddleware } = await import('../../../src/middleware/auth-middleware');
      
      const sessionCookie = 'valid_session_id';
      (mockRequest.cookies!.get as jest.Mock).mockReturnValue({ value: sessionCookie });
      
      const response = await sessionMiddleware(mockRequest as NextRequest);
      
      expect(response).toBeUndefined();
    });

    it('should reject expired session', async () => {
      const { sessionMiddleware } = await import('../../../src/middleware/auth-middleware');
      
      const expiredSession = 'expired_session_id';
      (mockRequest.cookies!.get as jest.Mock).mockReturnValue({ value: expiredSession });
      
      const response = await sessionMiddleware(mockRequest as NextRequest);
      
      expect(response?.status).toBe(401);
    });

    it('should refresh session on activity', async () => {
      const { sessionMiddleware } = await import('../../../src/middleware/auth-middleware');
      
      const sessionCookie = 'valid_session_id';
      (mockRequest.cookies!.get as jest.Mock).mockReturnValue({ value: sessionCookie });
      
      await sessionMiddleware(mockRequest as NextRequest);
      
      // Check if session was refreshed
      expect(mockRequest.cookies!.set).toHaveBeenCalled();
    });
  });

  describe('Public Routes', () => {
    it('should allow access to public routes without auth', async () => {
      const { authMiddleware } = await import('../../../src/middleware/auth-middleware');
      
      mockRequest.nextUrl!.pathname = '/login';
      
      const response = await authMiddleware(mockRequest as NextRequest);
      
      expect(response).toBeUndefined();
    });

    it('should allow access to API health check', async () => {
      const { authMiddleware } = await import('../../../src/middleware/auth-middleware');
      
      mockRequest.nextUrl!.pathname = '/api/health';
      
      const response = await authMiddleware(mockRequest as NextRequest);
      
      expect(response).toBeUndefined();
    });

    it('should require auth for protected routes', async () => {
      const { authMiddleware } = await import('../../../src/middleware/auth-middleware');
      
      mockRequest.nextUrl!.pathname = '/dashboard';
      
      const response = await authMiddleware(mockRequest as NextRequest);
      
      expect(response?.status).toBe(401);
    });
  });
});
