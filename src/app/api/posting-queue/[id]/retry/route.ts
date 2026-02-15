import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/posting-queue/:id/retry - Retry a failed posting
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const item = await prisma.postingQueueItem.findFirst({
      where: { id, userId },
    });

    if (!item) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    if (item.status !== 'FAILED') {
      return NextResponse.json(
        { error: 'Only failed items can be retried' },
        { status: 400 }
      );
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
