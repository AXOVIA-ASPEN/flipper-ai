/**
 * Facebook OAuth Disconnect Endpoint
 * Revokes Facebook access and deletes stored token
 */

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/firebase/session';
import { revokeAccessToken } from '@/scrapers/facebook/auth';
import { getToken, deleteToken } from '@/scrapers/facebook/token-store';

import { handleError, UnauthorizedError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    // Check if user is authenticated via Firebase session
    const sessionUser = await getCurrentUser();

    if (!sessionUser?.email) {
      throw new UnauthorizedError('Unauthorized');
    }

    const userId = sessionUser.id;

    // Get current token
    const tokenData = await getToken(userId);

    if (tokenData) {
      // Revoke token with Facebook
      try {
        await revokeAccessToken(tokenData.accessToken);
      } catch (err) {
        console.warn('Failed to revoke token with Facebook:', err);
        // Continue anyway to delete local token
      }
    }

    // Delete token from database
    await deleteToken(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
