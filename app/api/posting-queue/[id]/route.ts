import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';
import { UpdatePostingQueueItemSchema, validateBody } from '@/lib/validations';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/posting-queue/:id - Get a single queue item
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('GET /api/posting-queue/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/posting-queue/:id - Update a queue item
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await prisma.postingQueueItem.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/posting-queue/:id - Remove a queue item
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await prisma.postingQueueItem.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    // Only allow deletion if not currently being processed
    if (existing.status === 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Cannot delete item that is currently being processed' },
        { status: 409 }
      );
    }

    await prisma.postingQueueItem.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/posting-queue/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
