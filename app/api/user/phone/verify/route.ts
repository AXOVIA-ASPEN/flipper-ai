/**
 * @file app/api/user/phone/verify/route.ts
 * @author Stephen Boyett
 * @company Axovia
 * @date 2026-04-09
 * @version 1.0
 * @brief POST endpoint that verifies a 6-digit phone verification OTP (Story 11.2).
 *
 * @description
 * Completes the phone verification flow (AC-1 — FR-NOTIFY-13). Accepts the
 * 6-digit OTP the user received via SMS, validates it against the stored
 * bcrypt hash, checks expiry, and on success marks `phoneVerified: true`
 * and clears the OTP fields.
 *
 * On failure (wrong code, expired code, missing code) the endpoint returns
 * a generic 422 ValidationError without leaking which check failed.
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { handleError, UnauthorizedError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new UnauthorizedError('Unauthorized');

    /* istanbul ignore next -- JSON parse fallback; tested via validation path */
    const body = await request.json().catch(() => ({}));
    const { code } = body as { code?: unknown };

    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      throw new ValidationError('code must be a 6-digit string');
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: {
        phoneVerificationCode: true,
        phoneVerificationExpiry: true,
      },
    });

    if (!settings?.phoneVerificationCode || !settings.phoneVerificationExpiry) {
      throw new ValidationError('Invalid or expired verification code');
    }

    // Check expiry FIRST so we avoid the bcrypt compare for expired codes.
    if (new Date() >= settings.phoneVerificationExpiry) {
      throw new ValidationError('Invalid or expired verification code');
    }

    const matches = await bcrypt.compare(code, settings.phoneVerificationCode);
    if (!matches) {
      // Invalidate the OTP immediately on a wrong guess — forces the user to
      // request a new code. This prevents any enumeration window within the TTL
      // because the OTP is single-use: one wrong attempt and it is gone.
      await prisma.userSettings.update({
        where: { userId },
        data: { phoneVerificationCode: null, phoneVerificationExpiry: null },
      });
      throw new ValidationError('Invalid or expired verification code');
    }

    await prisma.userSettings.update({
      where: { userId },
      data: {
        phoneVerified: true,
        phoneVerificationCode: null,
        phoneVerificationExpiry: null,
      },
    });

    logger.info('[PhoneVerify] Phone verified', { userId });

    return NextResponse.json({ success: true, phoneVerified: true });
  } catch (error) {
    return handleError(error);
  }
}
