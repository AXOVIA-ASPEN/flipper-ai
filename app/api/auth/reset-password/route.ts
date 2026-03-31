/**
 * POST /api/auth/reset-password
 *
 * Validates a password reset token, updates the password in Firebase Auth,
 * revokes all sessions, and sends a security notification email.
 *
 * Security:
 * - Token hashed with SHA-256 before DB lookup (no plaintext storage)
 * - Atomic token consumption via deleteMany + count check (AC #7)
 * - Expired tokens deleted immediately on lookup failure
 * - All sessions invalidated after password change (AC #6)
 * - Max password length 128 to prevent hash DoS
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '@/lib/db';
import { adminAuth } from '@/lib/firebase/admin';
import { emailService } from '@/lib/email-service';
import { passwordChangedEmailHtml, passwordChangedEmailText } from '@/lib/email-templates';
import { captureError } from '@/lib/error-tracker';
import { handleError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export async function POST(req: NextRequest) {
  try {
    // Parse and validate
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid request body');
    }

    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      const detail =
        firstError?.path[0] === 'password'
          ? 'Password must be between 8 and 128 characters.'
          : 'Invalid request.';
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', detail } },
        { status: 422 }
      );
    }

    const { token: rawToken, password: newPassword } = parsed.data;

    // Validate password complexity
    if (!/[A-Z]/.test(newPassword)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', detail: 'Password must contain at least 1 uppercase letter.' } },
        { status: 422 }
      );
    }
    if (!/[0-9]/.test(newPassword)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', detail: 'Password must contain at least 1 number.' } },
        { status: 422 }
      );
    }

    // Hash the incoming token
    const candidateHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Look up token by hash
    const storedToken = await prisma.passwordResetToken.findFirst({
      where: { tokenHash: candidateHash },
      include: { user: true },
    });

    if (!storedToken) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', detail: 'Invalid or already used reset token.' } },
        { status: 400 }
      );
    }

    // Check expiry — delete expired token immediately (defense in depth)
    if (storedToken.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: storedToken.id } });
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', detail: 'This reset link has expired. Please request a new one.' } },
        { status: 400 }
      );
    }

    // Atomic token consumption (AC #7): delete and check count
    const { count } = await prisma.passwordResetToken.deleteMany({
      where: { tokenHash: candidateHash },
    });

    if (count === 0) {
      // Another request consumed the token first
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', detail: 'This reset token has already been used.' } },
        { status: 400 }
      );
    }

    // Update password in Firebase Auth
    const firebaseUid = storedToken.user.firebaseUid;
    if (!firebaseUid) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', detail: 'Account not linked to authentication provider.' } },
        { status: 400 }
      );
    }

    await adminAuth.updateUser(firebaseUid, { password: newPassword });

    // Revoke all sessions (AC #6) — handle failure non-fatally
    try {
      await adminAuth.revokeRefreshTokens(firebaseUid);
    } catch (revokeErr) {
      captureError(
        revokeErr instanceof Error ? revokeErr : new Error(String(revokeErr)),
        {
          route: '/api/auth/reset-password',
          action: 'revoke_sessions',
          userId: storedToken.userId,
        }
      );
      logger.warn('Failed to revoke refresh tokens after password reset', {
        userId: storedToken.userId,
      });
    }

    // Delete all remaining tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: storedToken.userId },
    });

    // Send password-changed notification email (non-blocking)
    emailService
      .send({
        to: storedToken.user.email,
        subject: 'Your Flipper AI password was changed',
        html: passwordChangedEmailHtml(storedToken.user.name ?? undefined),
        text: passwordChangedEmailText(),
      })
      .catch((emailErr: unknown) => {
        captureError(
          emailErr instanceof Error ? emailErr : new Error(String(emailErr)),
          {
            route: '/api/auth/reset-password',
            action: 'send_password_changed_email',
            userId: storedToken.userId,
          }
        );
      });

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully.',
    });
  } catch (error) {
    return handleError(error, req.url);
  }
}
