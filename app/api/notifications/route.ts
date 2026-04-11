/**
 * @file app/api/notifications/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-09
 * @version 1.0
 * @brief GET /api/notifications — paginated, filterable list of notification events for the authenticated user.
 *
 * @description
 * Returns the user's NotificationEvents with offset/limit pagination.
 * Query params:
 *   page     - 1-based page number (default: 1)
 *   limit    - items per page, max 100 (default: 20)
 *   eventType - optional filter (e.g. "listing.sold")
 *   status   - optional filter ("PENDING" | "PROCESSED")
 *
 * Response: { success: true, data: { events, pagination: { page, limit, total, totalPages } } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new UnauthorizedError('Unauthorized');

    const searchParams = request.nextUrl.searchParams;

    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const limitParam = parseInt(searchParams.get('limit') || '20', 10);
    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit = limitParam > 0 && limitParam <= 100 ? limitParam : 20;
    const skip = (page - 1) * limit;
    const eventType = searchParams.get('eventType');
    const status = searchParams.get('status');

    const where = {
      userId,
      ...(eventType ? { eventType } : {}),
      ...(status ? { status } : {}),
    };

    const [events, total] = await Promise.all([
      prisma.notificationEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          listing: {
            select: {
              title: true,
              platform: true,
              askingPrice: true,
              imageUrls: true,
            },
          },
        },
      }),
      prisma.notificationEvent.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        events,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
