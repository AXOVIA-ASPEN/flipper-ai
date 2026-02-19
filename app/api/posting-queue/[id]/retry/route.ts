import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
type RouteContext = { params: Promise<{ id: string }> };

// POST /api/posting-queue/:id/retry - Retry a failed posting
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { id } = await context.params;
    const item = await prisma.postingQueueItem.findFirst({
      where: { id, userId },
    });

    if (!item) {
      throw new NotFoundError('Queue item not found');
    }

    if (item.status !== 'FAILED') {
      throw new ValidationError('Only failed items can be retried');
    }

    if (item.retryCount >= item.maxRetries) {
      return NextResponse.json(
        { error: `Max retries (${item.maxRetries}) exceeded. Update maxRetries to allow more.` },
        { status: 400 }
      );
    }

    const updated = await prisma.postingQueueItem.update({
      where: { id },
      data: {
        status: 'PENDING',
        retryCount: { increment: 1 },
        errorMessage: null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('POST /api/posting-queue/[id]/retry error:', error);
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Internal server error');
  }
}
