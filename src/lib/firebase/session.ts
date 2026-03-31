/**
 * Firebase Server-side Session Helpers
 *
 * Provides session cookie management and server-side auth utilities.
 * Used by Server Components, middleware, and API routes that rely on
 * session cookies rather than Bearer tokens.
 */

import { cookies } from 'next/headers';
import { adminAuth } from './admin';
import prisma from '@/lib/db';
import { UnauthorizedError } from '@/lib/errors';

const SESSION_COOKIE_NAME = '__session';
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 5; // 5 days in seconds

export interface SessionUser {
  id: string;
  firebaseUid: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

/**
 * Create a session cookie from a Firebase ID token.
 * Called by /api/auth/session after client-side Firebase sign-in.
 */
export async function createSessionCookie(idToken: string): Promise<string> {
  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_COOKIE_MAX_AGE * 1000, // milliseconds
  });
  return sessionCookie;
}

/**
 * E2E test auth bypass secret. When set, session cookies with the format
 * `test:<firebaseUid>` are accepted without Firebase verification.
 * ONLY set this in local dev/test environments — never in production.
 */
const E2E_TEST_SECRET = process.env.E2E_TEST_SECRET;

/**
 * Verify the session cookie and return the decoded claims.
 * Returns null if no cookie or invalid.
 */
async function verifySessionCookie() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  // Test auth bypass: cookie format is `test:<secret>:<firebaseUid>`
  if (E2E_TEST_SECRET && sessionCookie.startsWith('test:')) {
    const parts = sessionCookie.split(':');
    if (parts.length === 3 && parts[1] === E2E_TEST_SECRET) {
      return { uid: parts[2] };
    }
    return null;
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Get the current authenticated user from the session cookie.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const decoded = await verifySessionCookie();
  if (!decoded) {
    return null;
  }

  // Look up user in database
  let user;
  try {
    user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
    });
  } catch {
    // DB unavailable — if in test mode, fall through to synthetic user below
    if (!E2E_TEST_SECRET) throw new Error('Database unavailable');
  }

  if (user) {
    return {
      id: user.id,
      firebaseUid: decoded.uid,
      email: user.email,
      name: user.name,
      image: user.image,
    };
  }

  // Test fallback: return a synthetic user when DB lookup fails/returns null
  // and we're in test auth mode. The firebaseUid encodes the test user id.
  if (E2E_TEST_SECRET && decoded.uid.startsWith('test-firebase-')) {
    const testId = decoded.uid.replace('test-firebase-', '');
    return {
      id: testId,
      firebaseUid: decoded.uid,
      email: `${testId}@test.example.com`,
      name: 'Test User',
      image: null,
    };
  }

  return null;
}

/**
 * Get the current authenticated user's Prisma ID.
 * Returns null if not authenticated.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

/**
 * Require authentication — throws if not authenticated.
 * Use in API routes that require authentication.
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }
  return user;
}

export { SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE };
