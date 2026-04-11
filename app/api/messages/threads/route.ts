/**
 * @file app/api/messages/threads/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief API endpoint for listing conversation threads grouped by listing.
 *
 * @description
 * GET handler that returns message threads grouped by listingId for the
 * authenticated user. Each thread includes listing details, last message
 * preview, message count, unread count, and seller name. Supports search
 * filtering, pagination, and orders by most recently active thread first.
 * Messages without a listingId are excluded (cannot form threads).
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';
import { handleError, UnauthorizedError } from '@/lib/errors';

interface ThreadSummary {
  listingId: string;
  listing: {
    id: string;
    title: string;
    platform: string;
    askingPrice: number;
    imageUrls: string | null;
  } | null;
  lastMessage: {
    body: string;
    direction: 'INBOUND' | 'OUTBOUND';
    status: string;
    createdAt: string;
  };
  sellerName: string | null;
  messageCount: number;
  unreadCount: number;
  lastMessageAt: string;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Base filter: user's messages with a listing (null listingId cannot form threads)
    const baseWhere: Record<string, unknown> = {
      userId,
      listingId: { not: null },
    };

    // Push search filtering to DB level to avoid loading all threads into memory
    if (search) {
      const lowerSearch = search.toLowerCase();
      const [matchingListings, matchingMessages] = await Promise.all([
        prisma.listing.findMany({
          where: { title: { contains: lowerSearch, mode: 'insensitive' } },
          select: { id: true },
        }),
        prisma.message.findMany({
          where: {
            userId,
            listingId: { not: null },
            sellerName: { contains: lowerSearch, mode: 'insensitive' },
          },
          select: { listingId: true },
          distinct: ['listingId'],
        }),
      ]);
      const searchListingIds = [
        ...new Set([
          ...matchingListings.map((l) => l.id),
          ...matchingMessages.map((m) => m.listingId).filter((id): id is string => id !== null),
        ]),
      ];
      if (searchListingIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { total: 0, limit, offset, hasMore: false },
        });
      }
      baseWhere.listingId = { in: searchListingIds };
    }

    // Get distinct listingIds with aggregates
    const groupResult = await prisma.message.groupBy({
      by: ['listingId'],
      where: baseWhere,
      _count: true,
      _max: { createdAt: true },
    });

    if (groupResult.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { total: 0, limit, offset, hasMore: false },
      });
    }

    const listingIds = groupResult
      .map((g) => g.listingId)
      .filter((id): id is string => id !== null);

    // Get latest message per thread (using distinct on listingId)
    const latestMessages = await prisma.message.findMany({
      where: { userId, listingId: { in: listingIds } },
      orderBy: { createdAt: 'desc' },
      distinct: ['listingId'],
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

    // Get unread counts per thread (INBOUND + readAt null)
    const unreadCounts = await prisma.message.groupBy({
      by: ['listingId'],
      where: {
        userId,
        listingId: { in: listingIds },
        direction: 'INBOUND',
        readAt: null,
      },
      _count: true,
    });

    const unreadMap = new Map(
      unreadCounts.map((u) => [u.listingId, u._count])
    );

    const countMap = new Map(
      groupResult.map((g) => [g.listingId, g._count])
    );

    const maxDateMap = new Map(
      groupResult.map((g) => [g.listingId, g._max.createdAt])
    );

    // Build thread summaries
    const threads: ThreadSummary[] = latestMessages.map((msg) => ({
      listingId: msg.listingId!,
      listing: msg.listing
        ? {
            id: msg.listing.id,
            title: msg.listing.title,
            platform: msg.listing.platform,
            askingPrice: Number(msg.listing.askingPrice),
            imageUrls: msg.listing.imageUrls,
          }
        : null,
      lastMessage: {
        body: msg.body.length > 100 ? msg.body.substring(0, 100) + '...' : msg.body,
        direction: msg.direction as 'INBOUND' | 'OUTBOUND',
        status: msg.status,
        createdAt: msg.createdAt.toISOString(),
      },
      sellerName: msg.sellerName,
      messageCount: countMap.get(msg.listingId) || 0,
      unreadCount: unreadMap.get(msg.listingId) || 0,
      lastMessageAt: (maxDateMap.get(msg.listingId) || msg.createdAt).toISOString(),
    }));

    // Sort by lastMessageAt DESC (most recently active first) — satisfies AC4
    threads.sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    // Apply pagination (search filtering already handled at DB level above)
    const total = threads.length;
    const paginatedThreads = threads.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paginatedThreads,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    });
  } catch (error) {
    return handleError(error);
  }
}
