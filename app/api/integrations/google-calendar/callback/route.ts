/**
 * @file app/api/integrations/google-calendar/callback/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-11
 * @version 1.0
 * @brief Google Calendar OAuth callback — validates state, exchanges code, stores tokens.
 *
 * @description
 * GET: called by Google after the user grants consent. Validates the CSRF
 * state (HMAC + 10-minute TTL), exchanges the authorization code for
 * access + refresh tokens, stores them encrypted in GoogleCalendarToken,
 * and redirects to /settings?tab=integrations&connected=true.
 * On any error, redirects to /settings?tab=integrations&error=<reason>.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { exchangeCode, validateOAuthState } from '@/lib/google-calendar';
import { storeToken } from '@/lib/google-calendar-token-store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  // User denied access on the consent screen
  if (errorParam) {
    return NextResponse.redirect(
      new URL('/settings?tab=integrations&error=access_denied', request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/settings?tab=integrations&error=missing_params', request.url)
    );
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.redirect(
        new URL('/login?redirect=/settings?tab=integrations', request.url)
      );
    }

    // Validate CSRF state (HMAC + TTL)
    validateOAuthState(state, userId);

    // Exchange code for tokens
    const { accessToken, refreshToken, expiresAt, email } = await exchangeCode(code);

    // Store encrypted tokens
    await storeToken(userId, accessToken, refreshToken, expiresAt, email || null);

    return NextResponse.redirect(
      new URL('/settings?tab=integrations&connected=true', request.url)
    );
  } catch {
    return NextResponse.redirect(
      new URL('/settings?tab=integrations&error=auth_failed', request.url)
    );
  }
}
