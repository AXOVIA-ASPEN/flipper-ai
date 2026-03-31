import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-middleware';
import { getProfitLossAnalytics } from '@/lib/analytics-service';

import { handleError } from '@/lib/errors';
/**
 * GET /api/analytics/profit-loss
 * Query params: granularity=weekly|monthly (default: monthly)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const { searchParams } = request.nextUrl;
    const rawGranularity = searchParams.get('granularity');
    const granularity: 'weekly' | 'monthly' = rawGranularity === 'weekly' ? 'weekly' : 'monthly';
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    const analytics = await getProfitLossAnalytics(userId, granularity, dateFrom, dateTo);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching profit/loss analytics:', error);
    return handleError(error);
  }
}
