/**
 * User Registration API Route
 * POST /api/auth/register
 *
 * With Firebase Auth migration, user creation in Firebase is handled client-side.
 * This endpoint creates/verifies the Prisma User record from a verified Firebase ID token.
 *
 * Flow:
 * 1. Client calls Firebase createUserWithEmailAndPassword()
 * 2. Client calls /api/auth/session to create session cookie (which also upserts Prisma user)
 * 3. Client optionally calls this endpoint to update user name or other profile data
 *
 * Note: The primary registration flow now goes through /api/auth/session.
 * This endpoint is kept for backward compatibility and profile updates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { ensurePrismaUser } from '@/lib/firebase/ensure-user';
import { emailService } from '@/lib/email-service';
import { captureError } from '@/lib/error-tracker';
import { metrics } from '@/lib/metrics';
import { handleError, ValidationError } from '@/lib/errors';

interface RegisterBody {
  idToken?: string;
  name?: string;
  email?: string;
}

export async function POST(request: NextRequest) {
  metrics.increment('registration_attempts');

  try {
    const body: RegisterBody = await request.json();
    const { idToken, name } = body;

    if (!idToken || typeof idToken !== 'string') {
      throw new ValidationError('Firebase ID token is required');
    }

    // Verify the Firebase ID token
    const decoded = await adminAuth.verifyIdToken(idToken);

    // Upsert the Prisma User record and create default settings if needed
    const user = await ensurePrismaUser({
      firebaseUid: decoded.uid,
      email: decoded.email,
      name: name || decoded.name,
      image: decoded.picture,
    });

    metrics.increment('registration_success');

    // Send welcome email (non-blocking)
    emailService.sendWelcome({ name: user.name ?? undefined, email: user.email }).catch((err) => {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        route: '/api/auth/register',
        action: 'send_welcome_email',
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
    });
  } catch (error) {
    metrics.increment('registration_failures');
    captureError(error instanceof Error ? error : new Error(String(error)), {
      route: '/api/auth/register',
      action: 'register',
    });
    return handleError(error, request.url);
  }
}
