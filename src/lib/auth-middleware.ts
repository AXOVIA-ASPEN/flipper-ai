/**
 * Authentication Middleware Helpers
 * Provides utilities for protecting API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export type AuthenticatedRequest = NextRequest & {
  userId: string;
  userEmail: string | null;
};

/**
 * Wrap an API route handler with authentication
 * Returns 401 if not authenticated
 */
export function withAuth<T>(
  handler: (req: AuthenticatedRequest, context: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: T): Promise<NextResponse> => {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Attach user info to request
    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.userId = session.user.id;
    authenticatedReq.userEmail = session.user.email ?? null;

    return handler(authenticatedReq, context);
  };
}

/**
 * Get the current user ID from the session
 * Returns null if not authenticated
 */
export async function getAuthUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Get the current user from the session
 * Returns null if not authenticated
 */
export async function getAuthUser() {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Check if the request is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await auth();
  return !!session?.user?.id;
}

/**
 * For development/migration: Get user ID or fall back to default user
 * This allows the app to work without authentication during development
 */
export async function getUserIdOrDefault(): Promise<string> {
  const session = await auth();

  if (session?.user?.id) {
    return session.user.id;
  }

  // In development, allow fallback to default user
  if (process.env.NODE_ENV === 'development') {
    const prisma = (await import('@/lib/db')).default;
    const defaultUser = await prisma.user.findFirst({
      where: { email: 'default@flipper.ai' },
    });
    if (defaultUser) {
      return defaultUser.id;
    }
  }

  throw new Error('Unauthorized');
}

/**
 * Protect page - returns redirect response if not authenticated
 * Use in Server Components
 */
export async function requirePageAuth() {
  const session = await auth();

  if (!session?.user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return { props: { user: session.user } };
}
