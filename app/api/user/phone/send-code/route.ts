/**
 * @file app/api/user/phone/send-code/route.ts
 * @author Stephen Boyett
 * @company Axovia
 * @date 2026-04-09
 * @version 1.0
 * @brief POST endpoint that sends a 6-digit phone verification SMS (Story 11.2).
 *
 * @description
 * Starts the phone verification flow (AC-1 — FR-NOTIFY-13). Accepts a phone
 * number in E.164 format, generates a 6-digit OTP, bcrypt-hashes it, stores
 * the hash plus a 10-minute expiry in UserSettings, and dispatches the code
 * via the `smsService` (Twilio in prod, NullSmsProvider in dev/test).
 *
 * Security rules:
 *   - OTP plaintext is ONLY visible in the outbound SMS — never logged,
 *     never returned to the client.
 *   - Only bcrypt hashes of the OTP are persisted.
 *   - Storing a new number clears phoneVerified → false immediately.
 *   - Re-sending within 60 seconds of the previous request returns 429 to
 *     prevent OTP flooding.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { handleError, UnauthorizedError, ValidationError, RateLimitError, AppError, ErrorCode } from '@/lib/errors';
import { smsService } from '@/lib/sms-service';
import { logger } from '@/lib/logger';

/** E.164 format validator: +<country><number> up to 15 digits total. */
const E164_REGEX = /^\+[1-9]\d{1,14}$/;

/** OTP expiry window in minutes. */
const OTP_TTL_MINUTES = 10;

/** Minimum seconds between re-send requests to prevent OTP flooding. */
const RESEND_COOLDOWN_SECONDS = 60;

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new UnauthorizedError('Unauthorized');

    const body = await request.json().catch(() => ({}));
    const { phoneNumber } = body as { phoneNumber?: unknown };

    if (typeof phoneNumber !== 'string' || !E164_REGEX.test(phoneNumber)) {
      throw new ValidationError(
        'phoneNumber must be in E.164 format (e.g., +12025551234)'
      );
    }

    // Ensure settings row exists (should already from onboarding, but be safe)
    const existing = await prisma.userSettings.findUnique({
      where: { userId },
      select: { phoneVerificationSentAt: true },
    });
    if (!existing) {
      throw new ValidationError('User settings not initialized');
    }

    // Rate limit: if a code was sent within the cooldown window, reject with 429.
    // Uses the explicit phoneVerificationSentAt timestamp so correctness is
    // independent of OTP_TTL_MINUTES.
    if (existing.phoneVerificationSentAt) {
      const secondsSinceSend = (Date.now() - existing.phoneVerificationSentAt.getTime()) / 1000;
      if (secondsSinceSend < RESEND_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceSend);
        throw new RateLimitError(
          `Please wait ${waitSeconds}s before requesting a new verification code`
        );
      }
    }

    // Generate a cryptographically-secure 6-digit OTP (100000–999999).
    // crypto.randomInt is a CSPRNG backed by the OS entropy source.
    const code = randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiry = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    const now = new Date();
    await prisma.userSettings.update({
      where: { userId },
      data: {
        phoneNumber,
        phoneVerified: false, // new/changed number → always unverified until confirmed
        phoneVerificationCode: codeHash,
        phoneVerificationExpiry: expiry,
        phoneVerificationSentAt: now,
      },
    });

    const smsBody = `Your Flipper AI verification code: ${code}. Valid for ${OTP_TTL_MINUTES} minutes.`;
    const smsResult = await smsService.send(phoneNumber, smsBody);

    // NEVER log the plaintext code — only success/failure status
    logger.info('[PhoneVerify] OTP dispatched', {
      userId,
      provider: smsResult.success ? 'ok' : 'error',
      messageId: smsResult.messageId,
    });

    if (!smsResult.success) {
      // OTP was stored but SMS delivery failed — client should retry (503 = temporary outage)
      throw new AppError(
        ErrorCode.SERVICE_UNAVAILABLE,
        'Unable to send verification SMS. Please try again in a moment.'
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
