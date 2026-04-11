/**
 * @file app/api/user/device-token/route.ts
 * @author Stephen Boyett
 * @company Axovia
 * @date 2026-04-08
 * @version 1.0
 * @brief POST/DELETE API for FCM device token registration (Story 11.1).
 *
 * @description
 * Manages FCM device tokens for push notification delivery (AC-1, AC-4).
 *
 * POST  /api/user/device-token — Register a device token (upsert for idempotency).
 *   Body: { token: string; userAgent?: string }
 *   Returns: { success: true, data: { id: string } }
 *
 * DELETE /api/user/device-token — Unregister a device token.
 *   Body: { token: string }
 *   Returns: { success: true }
 *
 * Tokens are scoped per user. A unique constraint on (userId, token) ensures
 * a single entry per user-device pair. Stale tokens are cleaned up by the
 * push notification service when FCM returns registration-token-not-registered.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { handleError, UnauthorizedError, ValidationError } from '@/lib/errors';

// POST /api/user/device-token — Register a device token
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new UnauthorizedError('Unauthorized');

    const body = await request.json();
    const { token, userAgent } = body;

    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new ValidationError('token is required');
    }

    const deviceToken = await prisma.deviceToken.upsert({
      where: { userId_token: { userId, token } },
      create: {
        userId,
        token,
        userAgent: typeof userAgent === 'string' ? userAgent : null,
      },
      update: {
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: { id: deviceToken.id } });
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/user/device-token — Unregister a device token
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new UnauthorizedError('Unauthorized');

    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new ValidationError('token is required');
    }

    await prisma.deviceToken.deleteMany({
      where: { userId, token },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
