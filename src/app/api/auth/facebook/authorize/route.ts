/**
 * Facebook OAuth Authorization Endpoint
 * Redirects user to Facebook login to grant permissions
 */

import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getAuthorizationUrl } from "@/scrapers/facebook/auth";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  // Check if user is authenticated
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in first." },
      { status: 401 }
    );
  }

  // Get Facebook app credentials from env
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const redirectUri =
    process.env.FACEBOOK_REDIRECT_URI || "http://localhost:3000/api/auth/facebook/callback";

  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: "Facebook OAuth not configured. Please add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to .env" },
      { status: 500 }
    );
  }

  // Generate state token for CSRF protection
  const state = randomBytes(32).toString("hex");

  // Store state in session/cookie (for verification in callback)
  const response = NextResponse.redirect(
    getAuthorizationUrl(
      { appId, appSecret, redirectUri },
      state
    )
  );

  response.cookies.set("facebook_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
