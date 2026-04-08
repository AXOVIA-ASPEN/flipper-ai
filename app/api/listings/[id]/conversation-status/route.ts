/**
 * @file app/api/listings/[id]/conversation-status/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief API route to retrieve conversation status for a listing.
 *
 * @description
 * GET endpoint that returns the conversation status, message count,
 * last message timestamp, and unread count for a specific listing.
 * Requires authentication and ownership verification via scoped query.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';
import { handleError, UnauthorizedError, NotFoundError } from '@/lib/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { id: listingId } = await params;

    // Fetch listing scoped to user for ownership enforcement
    const listing = await prisma.listing.findFirst({
      where: { id: listingId, userId },
      select: {
        id: true,
        conversationStatus: true,
      },
    });

    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    // Get message stats for this listing+user
    const [messageCount, lastMessage, unreadCount] = await Promise.all([
      prisma.message.count({
        where: { listingId, userId },
      }),
      prisma.message.findFirst({
        where: { listingId, userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      prisma.message.count({
        where: {
          listingId,
          userId,
          direction: 'INBOUND',
          readAt: null,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        conversationStatus: listing.conversationStatus ?? null,
        messageCount,
        lastMessageAt: lastMessage?.createdAt ?? null,
        unreadCount,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
