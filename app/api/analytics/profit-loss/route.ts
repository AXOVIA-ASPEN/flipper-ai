import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-middleware';
import { getProfitLossAnalytics } from '@/lib/analytics-service';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
/**
 * GET /api/analytics/profit-loss
 * Query params: granularity=weekly|monthly (default: monthly)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const granularity = (request.nextUrl.searchParams.get('granularity') as 'weekly' | 'monthly') || 'monthly';

    const analytics = await getProfitLossAnalytics(userId, granularity);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching profit/loss analytics:', error);
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch analytics');
  }
}
