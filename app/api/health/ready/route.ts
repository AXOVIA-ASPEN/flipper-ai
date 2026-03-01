import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestLogger } from '@/lib/request-context';
import { metrics } from '@/lib/metrics';

/**
 * Readiness probe - checks that all dependencies are available
 * GET /api/health/ready
 */
export async function GET() {
  const { log } = await getRequestLogger();
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
    log.error({ error: error instanceof Error ? error.message : String(error) }, 'Readiness check: database unreachable');
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
