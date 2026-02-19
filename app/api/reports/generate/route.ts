/**
 * POST /api/reports/generate - Generate performance report
 * GET /api/reports/generate?period=weekly&format=csv - Quick report
 * @author Stephen Boyett
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  buildReport,
  getDateRange,
  reportToCSV,
  type ReportOptions,
} from '@/lib/report-service';
import { getAuthUserId } from '@/lib/auth-middleware';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
// Mock data fetcher (replace with real DB query in production)
async function fetchItems(userId: string, start: Date, end: Date) {
  // In production, this queries Prisma for items within date range
  // For now, return empty array - tests will mock this
  return [] as Array<{
    id: string;
    title: string;
    platform: string;
    category: string | null;
    status: string;
    purchasePrice: number;
    resalePrice: number | null;
    fees: number | null;
    purchaseDate: Date;
    resaleDate: Date | null;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // Session-based auth check first
    const sessionUserId = await getAuthUserId();
    if (!sessionUserId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const body = await request.json();
    const { userId = sessionUserId, period = 'weekly', startDate, endDate, format = 'json' } = body as ReportOptions & { format?: string };

    if (!userId) {
      throw new ValidationError('userId is required');
    }

    if (!['weekly', 'monthly', 'custom'].includes(period)) {
      throw new ValidationError('Invalid period');
    }

    if (period === 'custom' && (!startDate || !endDate)) {
      throw new ValidationError('startDate and endDate required for custom period');
    }

    const dateRange = getDateRange(
      period,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    const items = await fetchItems(userId, dateRange.start, dateRange.end);
    const report = buildReport(userId, period, dateRange, items);

    if (format === 'csv') {
      const csv = reportToCSV(report);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="report-${period}-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Report generation error:', error);
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to generate report');
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') ?? 'weekly') as 'weekly' | 'monthly';
  const format = searchParams.get('format') ?? 'json';
  const userId = searchParams.get('userId') ?? 'anonymous';

  const dateRange = getDateRange(period);
  const items = await fetchItems(userId, dateRange.start, dateRange.end);
  const report = buildReport(userId, period, dateRange, items);

  if (format === 'csv') {
    const csv = reportToCSV(report);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="report-${period}.csv"`,
      },
    });
  }

  return NextResponse.json(report);
}
