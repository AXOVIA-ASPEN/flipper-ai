/**
 * Listings API Route
 * GET /api/listings - Get user's listings with server-side stats and pagination
 * POST /api/listings - Create new listing
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { handleError, ValidationError, UnauthorizedError } from '@/lib/errors';
import { getCurrentUserId } from '@/lib/auth';

const ALLOWED_LIMITS = [10, 20, 50] as const;

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { searchParams } = new URL(request.url);

    // Single-value legacy params
    const platform = searchParams.get('platform') || undefined;
    // Multi-select params (comma-separated)
    const platforms = searchParams.get('platforms') || undefined;
    const categories = searchParams.get('categories') || undefined;
    const statuses = searchParams.get('statuses') || undefined;
    const category = searchParams.get('category') || undefined;
    const status = searchParams.get('status') || undefined;
    // Score range — read both camelCase and underscore variants for backward compat
    const minScore = searchParams.get('minScore') || searchParams.get('min_score');
    const maxScore = searchParams.get('maxScore') || undefined;
    // Profit range
    const minProfit = searchParams.get('minProfit') || undefined;
    const maxProfit = searchParams.get('maxProfit') || undefined;

    // Pagination params
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const limitParam = parseInt(searchParams.get('limit') || '20', 10);
    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit = (ALLOWED_LIMITS as readonly number[]).includes(limitParam) ? limitParam : 20;
    const skip = (page - 1) * limit;

    // Build Prisma where clause with all active filters
    const where: Record<string, unknown> = { userId };

    // Platform (multi takes precedence over single)
    const platformList = platforms
      ? platforms.split(',').filter(Boolean)
      : platform
        ? [platform]
        : null;
    if (platformList?.length) where.platform = { in: platformList };

    // Score range
    if (minScore || maxScore) {
      where.valueScore = {
        ...(minScore ? { gte: parseFloat(minScore) } : {}),
        ...(maxScore ? { lte: parseFloat(maxScore) } : {}),
      };
    }

    // Profit range
    if (minProfit || maxProfit) {
      where.profitPotential = {
        ...(minProfit ? { gte: parseFloat(minProfit) } : {}),
        ...(maxProfit ? { lte: parseFloat(maxProfit) } : {}),
      };
    }

    // Category (multi takes precedence over single)
    const categoryList = categories
      ? categories.split(',').filter(Boolean)
      : category
        ? [category]
        : null;
    if (categoryList?.length) where.category = { in: categoryList };

    // Status (multi takes precedence over single)
    const statusList = statuses
      ? statuses.split(',').filter(Boolean)
      : status && status !== 'all'
        ? [status]
        : null;
    if (statusList?.length) where.status = { in: statusList };

    const [totalListings, opportunitiesCount, activeFlipsCount, totalProfitAgg, filteredTotal, listings] =
      await Promise.all([
        prisma.listing.count({ where: { userId } }),
        prisma.opportunity.count({ where: { userId } }),
        prisma.opportunity.count({
          where: { userId, status: { notIn: ['SOLD', 'PASSED'] } },
        }),
        prisma.opportunity.aggregate({
          where: { userId, status: 'SOLD' },
          _sum: { actualProfit: true },
        }),
        prisma.listing.count({ where }),
        prisma.listing.findMany({
          where,
          orderBy: { scrapedAt: 'desc' },
          skip,
          take: limit,
          include: {
            images: { take: 1, orderBy: { imageIndex: 'asc' } },
            opportunity: { select: { id: true, status: true } },
          },
        }),
      ]);

    return NextResponse.json({
      success: true,
      listings,
      stats: {
        totalListings,
        opportunitiesFound: opportunitiesCount,
        activeFlips: activeFlipsCount,
        totalProfit: totalProfitAgg._sum.actualProfit ?? 0,
      },
      pagination: {
        page,
        limit,
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / limit),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const body = await request.json();

    if (!body.platform || !body.url || !body.title || body.askingPrice === undefined) {
      throw new ValidationError('Missing required fields: platform, url, title, askingPrice');
    }

    const listing = await prisma.listing.create({
      data: {
        userId,
        platform: body.platform,
        externalId: body.externalId || body.url.split('/').pop() || '',
        url: body.url,
        title: body.title,
        description: body.description,
        askingPrice: body.askingPrice,
        condition: body.condition,
        location: body.location,
        sellerName: body.sellerName,
        sellerContact: body.sellerContact,
        imageUrls: body.imageUrls ? JSON.stringify(body.imageUrls) : undefined,
        category: body.category,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Listing created successfully',
      listing,
    });
  } catch (error) {
    return handleError(error);
  }
}
