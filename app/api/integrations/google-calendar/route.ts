/**
 * @file app/api/integrations/google-calendar/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-11
 * @version 1.0
 * @brief Google Calendar integration status and disconnect endpoints.
 *
 * @description
 * GET  — returns { connected: boolean, email: string | null }.
 * DELETE — revokes the Google token (best-effort) and deletes the DB row
 *          regardless of revoke outcome. This matches the story spec:
 *          "delete the token from the DB regardless of Google revoke success".
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/lib/errors';
import { getToken, deleteToken } from '@/lib/google-calendar-token-store';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new UnauthorizedError('Unauthorized');

    const record = await prisma.googleCalendarToken.findUnique({
      where: { userId },
      select: { calendarEmail: true, expiresAt: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        configured: !!process.env.GOOGLE_CALENDAR_CLIENT_ID,
        connected: !!record,
        email: record?.calendarEmail ?? null,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new UnauthorizedError('Unauthorized');

    // Attempt to revoke the token at Google (best-effort — never blocks deletion)
    const stored = await getToken(userId);
    if (stored) {
      fetch(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(stored.accessToken)}`,
        { method: 'POST' }
      ).catch(() => {});
    }

    // Delete from DB regardless of revoke outcome
    await deleteToken(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
