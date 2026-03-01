/**
 * Firebase Auth Middleware for API Routes
 *
 * Verifies Firebase ID tokens from Authorization: Bearer <token> headers.
 * Resolves the Firebase UID to a Prisma User record.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from './admin';
import prisma from '@/lib/db';

export interface FirebaseAuthUser {
  uid: string;
  email: string | undefined;
  name: string | undefined;
  picture: string | undefined;
  prismaUserId: string;
}

/**
 * Verify a Firebase ID token from the Authorization header.
 * Returns the decoded token claims or null if invalid/missing.
 */
export async function verifyIdToken(req: NextRequest): Promise<FirebaseAuthUser | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.slice(7);
  if (!idToken) {
    return null;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
    });

    if (!user) {
      return null;
    }

    return {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
      prismaUserId: user.id,
    };
  } catch {
    return null;
  }
}

/**
 * Wrap an API route handler with Firebase Auth verification.
 * Extracts Bearer token, verifies it, and attaches user info to the request.
 */
export function withFirebaseAuth<T>(
  handler: (
    req: NextRequest & { userId: string; userEmail: string | null },
    context: T
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: T): Promise<NextResponse> => {
    const authUser = await verifyIdToken(req);

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', detail: 'Invalid or missing authentication' } },
        { status: 401 }
      );
    }

    const authenticatedReq = req as NextRequest & { userId: string; userEmail: string | null };
    authenticatedReq.userId = authUser.prismaUserId;
    authenticatedReq.userEmail = authUser.email ?? null;

    return handler(authenticatedReq, context);
  };
}
