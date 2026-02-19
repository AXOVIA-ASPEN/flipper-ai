import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';
import { UpdatePostingQueueItemSchema, validateBody } from '@/lib/validations';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
type RouteContext = { params: Promise<{ id: string }> };

// GET /api/posting-queue/:id - Get a single queue item
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { id } = await context.params;
    const item = await prisma.postingQueueItem.findFirst({
      where: { id, userId },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            platform: true,
            askingPrice: true,
            imageUrls: true,
            url: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundError('Queue item not found');
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('GET /api/posting-queue/[id] error:', error);
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Internal server error');
  }
}

// PATCH /api/posting-queue/:id - Update a queue item
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { id } = await context.params;
    const existing = await prisma.postingQueueItem.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundError('Queue item not found');
    }

    const body = await request.json();
    const parsed = validateBody(UpdatePostingQueueItemSchema, body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.askingPrice !== undefined) updateData.askingPrice = parsed.data.askingPrice;
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.scheduledAt !== undefined) updateData.scheduledAt = parsed.data.scheduledAt;

    const updated = await prisma.postingQueueItem.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/posting-queue/[id] error:', error);
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Internal server error');
  }
}

// DELETE /api/posting-queue/:id - Remove a queue item
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { id } = await context.params;
    const existing = await prisma.postingQueueItem.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundError('Queue item not found');
    }

    // Only allow deletion if not currently being processed
    if (existing.status === 'IN_PROGRESS') {
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Cannot delete item that is currently being processed');
    }

    await prisma.postingQueueItem.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/posting-queue/[id] error:', error);
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Internal server error');
  }
}
