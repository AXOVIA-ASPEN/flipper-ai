/**
 * Facebook OAuth Status Endpoint
 * Returns current Facebook auth status for logged-in user
 */

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/firebase/session';
import { getToken, hasValidToken } from '@/scrapers/facebook/token-store';

import { handleError, UnauthorizedError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    // Check if user is authenticated via Firebase session
    const sessionUser = await getCurrentUser();

    if (!sessionUser?.email) {
      throw new UnauthorizedError('Unauthorized');
    }

    const userId = sessionUser.id;

    const isValid = await hasValidToken(userId);
    const tokenData = await getToken(userId);

    return NextResponse.json({
      connected: isValid,
      expiresAt: tokenData?.expiresAt,
      // Don't send actual token to client for security
    });
  } catch (error) {
    return handleError(error);
  }
}
