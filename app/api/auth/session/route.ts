/**
 * POST /api/auth/session
 *
 * Exchange a Firebase ID token for an HttpOnly session cookie.
 * Called by the client after Firebase sign-in.
 *
 * Flow:
 * 1. Client signs in via Firebase SDK → gets ID token
 * 2. Client POSTs ID token here
 * 3. Server creates session cookie via createSessionCookie()
 * 4. Server upserts Prisma User record (links Firebase UID to Prisma user)
 * 5. Server sets HttpOnly secure cookie in response
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import {
  createSessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE,
} from '@/lib/firebase/session';
import { ensurePrismaUser } from '@/lib/firebase/ensure-user';
import { handleError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    // CSRF protection: verify Origin header matches expected hosts.
    // SameSite=Strict on the cookie already mitigates login CSRF in modern
    // browsers, but this provides defense-in-depth.
    const origin = req.headers.get('origin');
    if (origin) {
      const allowedHosts = [
        'localhost',
        '127.0.0.1',
        'axovia-flipper.web.app',
        'axovia-flipper.firebaseapp.com',
      ];
      try {
        const originHost = new URL(origin).hostname;
        if (!allowedHosts.some((h) => originHost === h || originHost.endsWith(`.${h}`))) {
          return NextResponse.json(
            { success: false, error: { code: 'FORBIDDEN', detail: 'Origin not allowed' } },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', detail: 'Invalid origin' } },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const { idToken, name } = body;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', detail: 'ID token is required' } },
        { status: 400 }
      );
    }

    // Verify the ID token first to get user claims
    const decoded = await adminAuth.verifyIdToken(idToken);

    // Upsert the Prisma User record and create default settings if needed
    const user = await ensurePrismaUser({
      firebaseUid: decoded.uid,
      email: decoded.email,
      name: name || decoded.name,
      image: decoded.picture,
    });

    // Create session cookie
    const sessionCookie = await createSessionCookie(idToken);

    const response = NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        name: user.name,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_COOKIE_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error) {
    return handleError(error, req.url);
  }
}
