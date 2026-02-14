/**
 * Facebook OAuth Disconnect Endpoint
 * Revokes Facebook access and deletes stored token
 */

import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { revokeAccessToken } from "@/scrapers/facebook/auth";
import { getToken, deleteToken } from "@/scrapers/facebook/token-store";

export async function POST(req: NextRequest) {
  // Check if user is authenticated
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = session.user.id || session.user.email;

  try {
    // Get current token
    const tokenData = await getToken(userId);

    if (tokenData) {
      // Revoke token with Facebook
      try {
        await revokeAccessToken(tokenData.accessToken);
      } catch (err) {
        console.warn("Failed to revoke token with Facebook:", err);
        // Continue anyway to delete local token
      }
    }

    // Delete token from database
    await deleteToken(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Facebook disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Facebook" },
      { status: 500 }
    );
  }
}
