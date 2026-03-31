/**
 * Opportunities API Route
 * GET /api/opportunities - Get user's opportunities with filtering, pagination, and stats
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { handleError, UnauthorizedError } from '@/lib/errors';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { searchParams } = new URL(request.url);

    // Read filter params
    const platform = searchParams.get('platform') || undefined;
    const platforms = searchParams.get('platforms') || undefined;
    const minScore = searchParams.get('minScore') || undefined;
    const maxScore = searchParams.get('maxScore') || undefined;
    const minProfit = searchParams.get('minProfit') || undefined;
    const maxProfit = searchParams.get('maxProfit') || undefined;
    const category = searchParams.get('category') || undefined;
    const categories = searchParams.get('categories') || undefined;
    const status = searchParams.get('status') || undefined;
    const statuses = searchParams.get('statuses') || undefined;

    // Pagination
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const limitParam = parseInt(searchParams.get('limit') || '25', 10);
    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit = limitParam > 0 && limitParam <= 100 ? limitParam : 25;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = { userId };
    const listingWhere: Record<string, unknown> = {};

    // Opportunity status (multi-select)
    const statusList = statuses
      ? statuses.split(',').filter(Boolean)
      : status && status !== 'all'
        ? [status]
        : null;
    if (statusList?.length) where.status = { in: statusList };

    // Platform filter (nested on listing)
    const platformList = platforms
      ? platforms.split(',').filter(Boolean)
      : platform
        ? [platform]
        : null;
    if (platformList?.length) listingWhere.platform = { in: platformList };

    // Score range (on listing)
    if (minScore || maxScore) {
      listingWhere.valueScore = {
        ...(minScore ? { gte: parseFloat(minScore) } : {}),
        ...(maxScore ? { lte: parseFloat(maxScore) } : {}),
      };
    }

    // Profit range (on listing)
    if (minProfit || maxProfit) {
      listingWhere.profitPotential = {
        ...(minProfit ? { gte: parseFloat(minProfit) } : {}),
        ...(maxProfit ? { lte: parseFloat(maxProfit) } : {}),
      };
    }

    // Category (on listing)
    const categoryList = categories
      ? categories.split(',').filter(Boolean)
      : category
        ? [category]
        : null;
    if (categoryList?.length) listingWhere.category = { in: categoryList };

    // Apply listing filters if any exist
    if (Object.keys(listingWhere).length > 0) {
      where.listing = listingWhere;
    }

    const [opportunities, total] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        include: { listing: { include: { images: { take: 1 } } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.opportunity.count({ where }),
    ]);

    // Stats calculated over ALL matching opportunities (not just current page)
    const allMatching = await prisma.opportunity.findMany({
      where,
      select: { purchasePrice: true, resalePrice: true },
    });

    const stats = {
      totalOpportunities: total,
      totalProfit: allMatching.reduce(
        (sum, o) =>
          sum + (o.resalePrice && o.purchasePrice ? o.resalePrice - o.purchasePrice : 0),
        0
      ),
      totalInvested: allMatching.reduce((sum, o) => sum + (o.purchasePrice || 0), 0),
      totalRevenue: allMatching.reduce((sum, o) => sum + (o.resalePrice || 0), 0),
    };

    return NextResponse.json({
      success: true,
      opportunities,
      stats,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handleError(error);
  }
}
