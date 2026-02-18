import { NextRequest, NextResponse } from 'next/server';
import { metrics } from '@/lib/metrics';
import { getRecentErrors } from '@/lib/error-tracker';
import { auth } from '@/lib/auth';

/**
 * Metrics endpoint - exposes application metrics
 * GET /api/health/metrics
 *
 * Protected: requires authentication in production.
 * In development (NODE_ENV !== 'production'), access is unrestricted for convenience.
 */
export async function GET(req: NextRequest) {
  // Enforce authentication in production
  if (process.env.NODE_ENV === 'production') {
    // Allow internal health checks via bearer token (for uptime monitors)
    const authHeader = req.headers.get('Authorization');
    const internalToken = process.env.METRICS_TOKEN;
    if (internalToken && authHeader === `Bearer ${internalToken}`) {
      // Valid internal token — allow through
    } else {
      // Require user session for browser-based access
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }
  }

  const snapshot = metrics.snapshot();
  const recentErrors = getRecentErrors()
    .slice(-10)
    .map((e) => ({
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
