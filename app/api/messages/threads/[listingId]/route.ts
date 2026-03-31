/**
 * @file app/api/messages/threads/[listingId]/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief API endpoint for retrieving a single conversation thread's messages.
 *
 * @description
 * GET handler that returns all messages for a given listing in chronological
 * order. Includes listing details (or null if deleted), message metadata
 * (direction, status, timestamps), and thread summary counts. Automatically
 * marks INBOUND messages as read (fire-and-forget for performance). Enforces
 * user ownership isolation — users can only see their own messages.
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';
import { handleError, UnauthorizedError, NotFoundError } from '@/lib/errors';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { listingId } = await params;

    // Fetch all messages for this user + listing in chronological order
    const messages = await prisma.message.findMany({
      where: { userId, listingId },
      orderBy: { createdAt: 'asc' },
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
    });

    if (messages.length === 0) {
      throw new NotFoundError('No messages found for this listing');
    }

    // Extract listing details from first message (all share same listing)
    const listing = messages[0].listing
      ? {
          id: messages[0].listing.id,
          title: messages[0].listing.title,
          platform: messages[0].listing.platform,
          askingPrice: Number(messages[0].listing.askingPrice),
          imageUrls: messages[0].listing.imageUrls,
        }
      : null;

    // Get seller name from the most recent message that has one
    const sellerName =
      [...messages].reverse().find((m) => m.sellerName)?.sellerName || null;

    // Count unread messages
    const unreadCount = messages.filter(
      (m) => m.direction === 'INBOUND' && m.readAt === null
    ).length;

    // Auto-mark INBOUND messages as read — fire-and-forget (non-blocking)
    prisma.message
      .updateMany({
        where: { userId, listingId, direction: 'INBOUND', readAt: null },
        data: { readAt: new Date() },
      })
      .catch(() => {}); // swallow errors — read-tracking is best-effort

    // Format messages for response
    const formattedMessages = messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      status: m.status,
      subject: m.subject,
      body: m.body,
      sellerName: m.sellerName,
      platform: m.platform,
      parentId: m.parentId,
      sentAt: m.sentAt?.toISOString() || null,
      readAt: m.readAt?.toISOString() || null,
      createdAt: m.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        listing,
        sellerName,
        messages: formattedMessages,
        threadMeta: {
          messageCount: messages.length,
          unreadCount,
        },
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
