/**
 * Facebook OAuth Callback Endpoint
 * Handles the redirect from Facebook after user grants permissions
 */

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  calculateExpirationTimestamp,
} from '@/scrapers/facebook/auth';
import { storeToken } from '@/scrapers/facebook/token-store';

export async function GET(req: NextRequest) {
  const baseUrl = req.nextUrl.origin;

  // Check if user is authenticated
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.redirect(new URL('/auth/signin?error=unauthorized', baseUrl));
  }

  // Get code and state from query params
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle authorization errors (user denied permission)
  if (error) {
    return NextResponse.redirect(new URL(`/settings?error=facebook_auth_${error}`, baseUrl));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings?error=missing_code_or_state', baseUrl));
  }

  // Verify state token (CSRF protection)
  const storedState = req.cookies.get('facebook_oauth_state')?.value;

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL('/settings?error=invalid_state', baseUrl));
  }

  // Get Facebook app credentials
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const redirectUri =
    process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3000/api/auth/facebook/callback';

  if (!appId || !appSecret) {
    return NextResponse.redirect(new URL('/settings?error=facebook_not_configured', baseUrl));
  }

  try {
    // Exchange authorization code for short-lived access token
    const shortToken = await exchangeCodeForToken({ appId, appSecret, redirectUri }, code);

    // Exchange short-lived token for long-lived token (60 days)
    const longToken = await exchangeForLongLivedToken(
      { appId, appSecret, redirectUri },
      shortToken.access_token
    );

    // Store encrypted token in database
    const userId = session.user.id || session.user.email;
    await storeToken(userId, longToken.access_token, longToken.expires_in);

    // Redirect to settings page with success message
    const response = NextResponse.redirect(new URL('/settings?facebook_auth=success', baseUrl));

    // Clear state cookie
    response.cookies.delete('facebook_oauth_state');

    return response;
  } catch (error) {
    console.error('Facebook OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/settings?error=token_exchange_failed&message=${encodeURIComponent(
          error instanceof Error ? error.message : 'Unknown error'
        )}`,
        baseUrl
      )
    );
  }
}
