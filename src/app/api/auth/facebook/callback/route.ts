/**
 * Facebook OAuth Callback Endpoint
 * Handles the redirect from Facebook after user grants permissions
 */

import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  calculateExpirationTimestamp,
} from "@/scrapers/facebook/auth";
import { storeToken } from "@/scrapers/facebook/token-store";

export async function GET(req: NextRequest) {
  // Check if user is authenticated
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.redirect("/auth/signin?error=unauthorized");
  }

  // Get code and state from query params
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle authorization errors (user denied permission)
  if (error) {
    return NextResponse.redirect(
      `/settings?error=facebook_auth_${error}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect("/settings?error=missing_code_or_state");
  }

  // Verify state token (CSRF protection)
  const storedState = req.cookies.get("facebook_oauth_state")?.value;

  if (!storedState || storedState !== state) {
    return NextResponse.redirect("/settings?error=invalid_state");
  }

  // Get Facebook app credentials
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const redirectUri =
    process.env.FACEBOOK_REDIRECT_URI || "http://localhost:3000/api/auth/facebook/callback";

  if (!appId || !appSecret) {
    return NextResponse.redirect("/settings?error=facebook_not_configured");
  }

  try {
    // Exchange authorization code for short-lived access token
    const shortToken = await exchangeCodeForToken(
      { appId, appSecret, redirectUri },
      code
    );

    // Exchange short-lived token for long-lived token (60 days)
    const longToken = await exchangeForLongLivedToken(
      { appId, appSecret, redirectUri },
      shortToken.access_token
    );

    // Store encrypted token in database
    const userId = session.user.id || session.user.email;
    await storeToken(userId, longToken.access_token, longToken.expires_in);

    // Redirect to settings page with success message
    const response = NextResponse.redirect("/settings?facebook_auth=success");

    // Clear state cookie
    response.cookies.delete("facebook_oauth_state");

    return response;
  } catch (error) {
    console.error("Facebook OAuth callback error:", error);
    return NextResponse.redirect(
      `/settings?error=token_exchange_failed&message=${encodeURIComponent(
        error instanceof Error ? error.message : "Unknown error"
      )}`
    );
  }
}
