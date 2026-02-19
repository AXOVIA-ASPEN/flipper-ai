import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/metrics';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
/**
 * Readiness probe - checks that all dependencies are available
 * GET /api/health/ready
 */
export async function GET() {
  const checks: Record<string, { status: string; latencyMs?: number }> = {};
  let healthy = true;

  // Database check
  try {
    const dbStart = performance.now();
    await prisma.$queryRawUnsafe('SELECT 1');
    const dbLatency = Math.round(performance.now() - dbStart);
    checks.database = { status: 'ok', latencyMs: dbLatency };
    metrics.observe('db_health_check_ms', dbLatency);
  } catch (error) {
    healthy = false;
    checks.database = { status: 'error' };
    logger.error('Readiness check: database unreachable', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  metrics.increment('readiness_checks');

  return NextResponse.json(
    {
      status: healthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: healthy ? 200 : 503 }
  );
}
