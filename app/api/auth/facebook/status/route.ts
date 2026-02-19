/**
 * Facebook OAuth Status Endpoint
 * Returns current Facebook auth status for logged-in user
 */

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { getToken, hasValidToken } from '@/scrapers/facebook/token-store';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
export async function GET(req: NextRequest) {
  // Check if user is authenticated
  const session = await auth();

  if (!session?.user?.email) {
    throw new UnauthorizedError('Unauthorized');
  }

  const userId = session.user.id || session.user.email;

  try {
    const isValid = await hasValidToken(userId);
    const tokenData = await getToken(userId);

    return NextResponse.json({
      connected: isValid,
      expiresAt: tokenData?.expiresAt,
      // Don't send actual token to client for security
    });
  } catch (error) {
    console.error('Facebook status check error:', error);
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to check Facebook status');
  }
}
