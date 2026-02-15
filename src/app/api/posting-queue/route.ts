import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';
import {
  PostingQueueQuerySchema,
  CreatePostingQueueItemSchema,
  CreatePostingQueueBatchSchema,
  validateQuery,
  validateBody,
} from '@/lib/validations';

// GET /api/posting-queue - List posting queue items with filters
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = validateQuery(PostingQueueQuerySchema, searchParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error },
        { status: 400 }
      );
    }

    const { limit, offset, status, targetPlatform, listingId } = parsed.data;

    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;
    if (targetPlatform) where.targetPlatform = targetPlatform;
    if (listingId) where.listingId = listingId;

    const [items, total] = await Promise.all([
      prisma.postingQueueItem.findMany({
        where,
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              platform: true,
              askingPrice: true,
              imageUrls: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.postingQueueItem.count({ where }),
    ]);

    return NextResponse.json({ items, total, limit, offset });
  } catch (error) {
    console.error('GET /api/posting-queue error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/posting-queue - Queue a listing for posting to one or multiple platforms
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Support batch creation (multiple platforms at once)
    if (body.platforms && Array.isArray(body.platforms)) {
      const parsed = validateBody(CreatePostingQueueBatchSchema, body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request body', details: parsed.error },
          { status: 400 }
        );
      }

      const { listingId, platforms, askingPrice, title, description } = parsed.data;

      // Verify listing exists and belongs to user
      const listing = await prisma.listing.findFirst({
        where: { id: listingId, userId },
      });
      if (!listing) {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
      }

      // Filter out platforms where the listing already originated
      const filteredPlatforms = platforms.filter((p) => p !== listing.platform);
      if (filteredPlatforms.length === 0) {
        return NextResponse.json(
          { error: 'Cannot post to the same platform the listing was scraped from' },
          { status: 400 }
        );
      }

      // Create queue items, skipping duplicates
      const created = await Promise.all(
        filteredPlatforms.map((targetPlatform) =>
          prisma.postingQueueItem.upsert({
            where: {
              listingId_targetPlatform_userId: { listingId, targetPlatform, userId },
            },
            update: {},
            create: {
              userId,
              listingId,
              targetPlatform,
              askingPrice,
              title,
              description,
              status: 'PENDING',
            },
          })
        )
      );

      return NextResponse.json({ items: created, count: created.length }, { status: 201 });
    }

    // Single platform creation
    const parsed = validateBody(CreatePostingQueueItemSchema, body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error },
        { status: 400 }
      );
    }

    const { listingId, targetPlatform, askingPrice, title, description, scheduledAt } =
      parsed.data;

    // Verify listing exists and belongs to user
    const listing = await prisma.listing.findFirst({
      where: { id: listingId, userId },
    });
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (targetPlatform === listing.platform) {
      return NextResponse.json(
        { error: 'Cannot post to the same platform the listing was scraped from' },
        { status: 400 }
      );
    }

    const item = await prisma.postingQueueItem.upsert({
      where: {
        listingId_targetPlatform_userId: { listingId, targetPlatform, userId },
      },
      update: { askingPrice, title, description, scheduledAt: scheduledAt ?? undefined },
      create: {
        userId,
        listingId,
        targetPlatform,
        askingPrice,
        title,
        description,
        scheduledAt: scheduledAt ?? undefined,
        status: 'PENDING',
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('POST /api/posting-queue error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
