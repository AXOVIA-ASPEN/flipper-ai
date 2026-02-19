/**
 * Facebook OAuth Disconnect Endpoint
 * Revokes Facebook access and deletes stored token
 */

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { revokeAccessToken } from '@/scrapers/facebook/auth';
import { getToken, deleteToken } from '@/scrapers/facebook/token-store';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
export async function POST(req: NextRequest) {
  // Check if user is authenticated
  const session = await auth();

  if (!session?.user?.email) {
    throw new UnauthorizedError('Unauthorized');
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
        console.warn('Failed to revoke token with Facebook:', err);
        // Continue anyway to delete local token
      }
    }

    // Delete token from database
    await deleteToken(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Facebook disconnect error:', error);
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to disconnect Facebook');
  }
}
