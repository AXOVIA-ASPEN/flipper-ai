import { NextRequest, NextResponse } from 'next/server';
import { metrics } from '@/lib/metrics';
import { getRecentErrors } from '@/lib/error-tracker';
import { getCurrentUser } from '@/lib/auth';
import { getRequestStats } from '@/lib/request-monitor';
import { getDbPerformanceSummary } from '@/lib/monitoring';
import { handleError, UnauthorizedError } from '@/lib/errors';
import { prisma } from '@/lib/db';
/**
 * Metrics endpoint - exposes application metrics
 * GET /api/health/metrics
 *
 * Protected: requires authentication in production.
 * In development (NODE_ENV !== 'production'), access is unrestricted for convenience.
 */
export async function GET(req: NextRequest) {
  try {
    // Enforce authentication in production
    if (process.env.NODE_ENV === 'production') {
      // Allow internal health checks via bearer token (for uptime monitors)
      const authHeader = req.headers.get('Authorization');
      const internalToken = process.env.METRICS_TOKEN;
      if (internalToken && authHeader === `Bearer ${internalToken}`) {
        // Valid internal token — allow through
      } else {
        // Require user session for browser-based access
        const sessionUser = await getCurrentUser();
        if (!sessionUser?.id) {
          throw new UnauthorizedError('Unauthorized');
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
        requests: getRequestStats(),
        database: {
          status: await prisma.$queryRawUnsafe('SELECT 1').then(() => 'connected' as const).catch(() => 'disconnected' as const),
          maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '2', 10),
        },
        db_performance: getDbPerformanceSummary(),
      },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}
