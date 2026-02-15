import { NextResponse } from 'next/server';
import { metrics } from '@/lib/metrics';
import { getRecentErrors } from '@/lib/error-tracker';

/**
 * Metrics endpoint - exposes application metrics
 * GET /api/health/metrics
 * 
 * In production, this should be protected or only accessible internally.
 */
export async function GET() {
  const snapshot = metrics.snapshot();
  const recentErrors = getRecentErrors().slice(-10).map((e) => ({
    message: e.message,
    route: e.context.route,
    timestamp: e.timestamp,
  }));

  return NextResponse.json(
    {
      ...snapshot,
      recent_errors: recentErrors,
      memory: {
        heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
    },
    { status: 200 }
  );
}
