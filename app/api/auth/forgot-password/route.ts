/**
 * POST /api/auth/forgot-password
 *
 * Generates a password reset token, stores its SHA-256 hash in the DB,
 * and sends a reset email via the email service (Resend).
 *
 * Security:
 * - DB-backed rate limit: max 3 per email per 15 minutes
 * - IP-based rate limit via rate-limiter.ts ENDPOINT_CONFIGS
 * - Same response for known/unknown emails (no enumeration)
 * - Reset URL derived from NEXT_PUBLIC_APP_URL only (no Host header)
 * - Token hashed with SHA-256 before storage
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '@/lib/db';
import { emailService } from '@/lib/email-service';
import { captureError } from '@/lib/error-tracker';
import { handleError, ValidationError } from '@/lib/errors';
import { rateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

const SUCCESS_RESPONSE = {
  success: true,
  message: 'If an account exists with this email, you will receive a password reset link shortly.',
};

export async function POST(req: NextRequest) {
  try {
    // IP rate limit
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const rl = rateLimit(ip, '/api/auth/forgot-password');
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: { code: 'RATE_LIMITED', detail: 'Too many requests. Please try again later.' } },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    // Parse and validate
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid request body');
    }

    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      // Still return success to prevent enumeration via validation errors
      return NextResponse.json(SUCCESS_RESPONSE);
    }

    const email = parsed.data.email.toLowerCase();

    // DB-backed rate limit: max 3 tokens per email in 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentTokenCount = await prisma.passwordResetToken.count({
      where: {
        user: { email },
        createdAt: { gte: fifteenMinutesAgo },
      },
    });

    if (recentTokenCount >= 3) {
      return NextResponse.json(
        { success: false, error: { code: 'RATE_LIMITED', detail: 'Too many reset requests. Please try again later.' } },
        { status: 429 }
      );
    }

    // Look up user — if not found, return same success response (AC #5)
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(SUCCESS_RESPONSE);
    }

    // Generate cryptographically secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Create new token — intentionally do NOT delete existing tokens here.
    // Deleting on creation would prevent the DB-backed rate limit from accumulating
    // counts across requests. All tokens are cleaned up on: successful password
    // reset (reset-password route), expiry (opportunistic cleanup below), or
    // when a new valid password reset completes.
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Construct reset URL from env var only (prevent host header poisoning)
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3200').replace(/\/$/, '');
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    // Send email — if it fails, log but still return 200
    const result = await emailService.sendPasswordReset({
      name: user.name ?? undefined,
      email: user.email,
      resetUrl,
      expiresInMinutes: 60,
    });

    if (!result.success) {
      captureError(new Error(`Password reset email failed: ${result.error}`), {
        route: '/api/auth/forgot-password',
        action: 'send_reset_email',
        userId: user.id,
      });
    }

    // Opportunistic cleanup: delete expired tokens (fire-and-forget)
    prisma.passwordResetToken
      .deleteMany({ where: { expiresAt: { lt: new Date() } } })
      .catch((err: unknown) => {
        logger.warn('Failed to clean up expired reset tokens', {
          error: err instanceof Error ? err.message : String(err),
        });
      });

    return NextResponse.json(SUCCESS_RESPONSE);
  } catch (error) {
    return handleError(error, req.url);
  }
}
