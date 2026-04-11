/**
 * @file app/api/notifications/[id]/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-09
 * @version 1.0
 * @brief PATCH /api/notifications/[id] — mark a notification event as processed.
 *
 * @description
 * Allows an authenticated user to mark one of their NotificationEvents as PROCESSED.
 * Enforces ownership: users may only update their own events.
 *
 * Request body: { status: "PROCESSED" }
 * Response: { success: true, data: { id, status, processedAt } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import {
  handleError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '@/lib/errors';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new UnauthorizedError('Unauthorized');

    const { id } = await context.params;

    const event = await prisma.notificationEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundError('Notification event');
    if (event.userId !== userId) throw new ForbiddenError('Access denied');

    const body = await request.json().catch(() => ({}));
    const schema = z.object({ status: z.enum(['PROCESSED']) });
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new ValidationError('Invalid status');

    const updated = await prisma.notificationEvent.update({
      where: { id },
      data: { status: 'PROCESSED', processedAt: new Date() },
      select: { id: true, status: true, processedAt: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleError(error);
  }
}
