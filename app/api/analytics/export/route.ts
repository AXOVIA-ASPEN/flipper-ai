import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-middleware';
import { getProfitLossAnalytics } from '@/lib/analytics-service';
import { buildCsvContent } from '@/lib/analytics-export';
import { handleError } from '@/lib/errors';

/**
 * GET /api/analytics/export
 * Query params:
 *   format=csv (required; pdf is client-side only — returns 400)
 *   granularity=weekly|monthly (default: monthly)
 *   dateFrom=YYYY-MM-DD (optional)
 *   dateTo=YYYY-MM-DD (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const format = searchParams.get('format') || 'csv';
    const rawGranularity = searchParams.get('granularity');
    const granularity: 'weekly' | 'monthly' = rawGranularity === 'weekly' ? 'weekly' : 'monthly';
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    if (format !== 'csv') {
      return NextResponse.json(
        { success: false, error: 'Unsupported format. Use format=csv.' },
        { status: 400 }
      );
    }

    const analytics = await getProfitLossAnalytics(userId, granularity, dateFrom, dateTo);
    const csv = buildCsvContent(analytics.items);
    const filename = `flipper-report-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
