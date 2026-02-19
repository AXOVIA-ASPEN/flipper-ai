import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-middleware';
import { getQueueStats } from '@/lib/posting-queue-processor';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
// GET /api/posting-queue/stats - Get queue statistics
export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const stats = await getQueueStats(userId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('GET /api/posting-queue/stats error:', error);
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Internal server error');
  }
}
