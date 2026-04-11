/**
 * @file app/api/integrations/google-calendar/connect/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-11
 * @version 1.0
 * @brief Initiates the Google Calendar OAuth consent flow.
 *
 * @description
 * GET: generates a CSRF state token (HMAC-SHA256 of userId + timestamp,
 * 10-minute TTL) and redirects the user to the Google OAuth consent screen
 * requesting calendar.events write access. Returns 400 if the Google Calendar
 * integration is not configured in the environment.
 */

import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/lib/errors';
import { generateOAuthState, getOAuthUrl } from '@/lib/google-calendar';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new UnauthorizedError('Unauthorized');

    if (!process.env.GOOGLE_CALENDAR_CLIENT_ID) {
      return NextResponse.json(
        { success: false, error: 'Google Calendar integration is not configured' },
        { status: 400 }
      );
    }

    const state = generateOAuthState(userId);
    const url = getOAuthUrl(state);
    return NextResponse.redirect(url);
  } catch (error) {
    return handleError(error);
  }
}
