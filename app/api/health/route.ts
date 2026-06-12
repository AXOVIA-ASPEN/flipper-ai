import { NextResponse } from 'next/server';
import { metrics } from '@/lib/metrics';

/**
 * Health check endpoint - lightweight liveness probe
 * GET /api/health
 */
export async function GET() {
  metrics.increment('health_checks');

  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
    },
    { status: 200 }
  );
}
