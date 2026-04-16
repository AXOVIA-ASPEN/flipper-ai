/**
 * Authentication Middleware Helpers
 *
 * Provides utilities for protecting API routes.
 * Uses Firebase Auth (session cookies and ID tokens) for authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentUser,
  getCurrentUserId as getSessionUserId,
} from '@/lib/firebase/session';
import { verifyIdToken } from '@/lib/firebase/auth-middleware';

export type AuthenticatedRequest = NextRequest & {
  userId: string;
  userEmail: string | null;
};

/**
 * Wrap an API route handler with authentication.
 * Checks session cookie first, then falls back to Bearer token.
 * Returns 401 if not authenticated.
 */
export function withAuth<T>(
  handler: (req: AuthenticatedRequest, context: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: T): Promise<NextResponse> => {
    // Try session cookie first
    const sessionUser = await getCurrentUser();
    if (sessionUser) {
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.userId = sessionUser.id;
      authenticatedReq.userEmail = sessionUser.email;
      return handler(authenticatedReq, context);
    }

    // Fall back to Bearer token
    const tokenUser = await verifyIdToken(req);
    if (tokenUser) {
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.userId = tokenUser.prismaUserId;
      authenticatedReq.userEmail = tokenUser.email ?? null;
      return handler(authenticatedReq, context);
    }

    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  };
}

/**
 * Get the current user ID from session cookie or Bearer token.
 * Returns null if not authenticated.
 */
export async function getAuthUserId(req?: NextRequest): Promise<string | null> {
  // Try session cookie first
  const sessionUserId = await getSessionUserId();
  if (sessionUserId) {
    return sessionUserId;
  }

  // Fall back to Bearer token if request is provided
  if (req) {
    const tokenUser = await verifyIdToken(req);
    if (tokenUser) {
      return tokenUser.prismaUserId;
    }
  }

  return null;
}

/**
 * Get the current user from the session.
 * Returns null if not authenticated.
 */
export async function getAuthUser() {
  return getCurrentUser();
}

/**
 * Check if the request is authenticated.
 */
export async function isAuthenticated(): Promise<boolean> {
  const userId = await getSessionUserId();
  return !!userId;
}

/**
 * For development/migration: Get user ID or fall back to default user.
 *
 * The dev bypass ONLY activates when BOTH conditions are met:
 *   1. `ENABLE_DEV_AUTH_BYPASS === 'true'` — explicit opt-in, never default
 *   2. `NODE_ENV !== 'production'` — hard production guard, even if the flag leaks
 *
 * This defense-in-depth prevents a misconfigured env from silently logging in
 * as the default user in production (historic FR-AUTH-ACCESS risk).
 */
export async function getUserIdOrDefault(req?: NextRequest): Promise<string> {
  const bypassEnabled =
    process.env.ENABLE_DEV_AUTH_BYPASS === 'true' &&
    process.env.NODE_ENV !== 'production';

  if (bypassEnabled) {
    const userId = await getAuthUserId(req);
    if (userId) return userId;

    // Fall back to default dev user for local dev without Firebase
    const prisma = (await import('@/lib/db')).default;
    const defaultUser = await prisma.user.findFirst({
      where: { email: 'default@flipper.ai' },
    });
    if (defaultUser) {
      return defaultUser.id;
    }
  } else if (process.env.ENABLE_DEV_AUTH_BYPASS === 'true') {
    // Flag set in production — refuse to activate and log loudly
    console.error(
      '[SECURITY] ENABLE_DEV_AUTH_BYPASS=true in NODE_ENV=production — refusing to activate dev bypass.'
    );
  }

  // Require proper authentication
  const userId = await getAuthUserId(req);
  if (userId) return userId;

  throw new Error('Unauthorized');
}

/**
 * Protect page — returns redirect response if not authenticated.
 * Use in Server Components.
 */
export async function requirePageAuth() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return { props: { user } };
}
