/**
 * @file app/api/monitoring/run/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.0
 * @brief POST endpoint for triggering a synchronous monitoring run.
 *
 * @description
 * Cloud Scheduler POSTs here every 30 minutes to trigger listing monitoring.
 * The run completes synchronously — results are returned in the response body.
 *
 * Auth: Bearer token validated via timing-safe comparison against MONITORING_API_KEY.
 * Concurrent-run guard: delegates to MonitoringJobService (database-level partial index).
 * Rate limiting: rejects requests made within half the monitoring interval of the last
 * completed run (prevents accidental double-triggers).
 *
 * This endpoint runs on Cloud Run (timeout 300s) to allow for full monitoring runs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as crypto from 'crypto';
import { monitoringJobService } from '@/lib/monitoring-job';
import { prisma } from '@/lib/db';
import { handleError, ValidationError, UnauthorizedError } from '@/lib/errors';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Request body schema (minimal — body is optional for Cloud Scheduler triggers)
// ---------------------------------------------------------------------------

const RequestSchema = z.object({
  dryRun: z.boolean().optional(),
}).strict();

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

const MIN_KEY_LENGTH = 32;

/**
 * Validate the Authorization: Bearer <key> header using timing-safe comparison.
 * Returns false for missing/invalid key to avoid revealing endpoint existence.
 */
function validateApiKey(request: NextRequest): boolean {
  const apiKey = process.env.MONITORING_API_KEY;
  if (!apiKey || apiKey.length < MIN_KEY_LENGTH) return false;

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  const providedKey = authHeader.slice(7);
  if (providedKey.length !== apiKey.length) return false;

  const keyBuffer = Buffer.from(apiKey);
  const providedBuffer = Buffer.from(providedKey);

  return crypto.timingSafeEqual(keyBuffer, providedBuffer);
}

/**
 * Get client IP from request for logging.
 */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

// ---------------------------------------------------------------------------
// Rate limit check (prevents double-trigger within half the scheduling interval)
// ---------------------------------------------------------------------------

async function isRateLimited(): Promise<boolean> {
  const intervalMinutes = parseInt(process.env.MONITORING_INTERVAL_MINUTES ?? '30', 10);
  const halfIntervalMs = (intervalMinutes / 2) * 60 * 1000;

  const recentCompleted = await prisma.monitoringJob.findFirst({
    where: {
      status: 'COMPLETED',
      completedAt: { gt: new Date(Date.now() - halfIntervalMs) },
    },
    orderBy: { completedAt: 'desc' },
    select: { id: true },
  });

  return recentCompleted !== null;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const clientIp = getClientIp(request);

  // Auth check — use timing-safe comparison
  if (!validateApiKey(request)) {
    logger.error('Monitoring endpoint: auth failure', { clientIp });
    // Return 401 — same as any other unauthenticated endpoint, no extra detail
    return handleError(new UnauthorizedError('Unauthorized'));
  }

  // Parse and validate request body (optional body — Cloud Scheduler may send empty)
  let _body: z.infer<typeof RequestSchema> = {};
  const rawBody = await request.text();
  if (rawBody.trim()) {
    try {
      const parsed = JSON.parse(rawBody);
      _body = RequestSchema.parse(parsed);
    } catch (parseErr) {
      if (parseErr instanceof z.ZodError) {
        return handleError(new ValidationError('Invalid request body', { issues: parseErr.issues }));
      }
      return handleError(new ValidationError('Invalid JSON in request body'));
    }
  }

  // Rate limit: reject if a completed run exists within half the scheduling interval
  try {
    if (await isRateLimited()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            detail: 'A monitoring run completed recently. Wait for the next scheduled interval.',
          },
        },
        { status: 429 }
      );
    }
  } catch {
    // DB failure in rate-limit check — proceed rather than blocking the run
    logger.warn('Rate limit DB check failed — proceeding with monitoring run');
  }

  // Execute monitoring run synchronously within the request lifecycle
  try {
    const summary = await monitoringJobService.run();

    return NextResponse.json({
      success: true,
      data: {
        jobId: summary.jobId,
        status: summary.status,
        listingsChecked: summary.listingsChecked,
        eventsCreated: summary.eventsCreated,
        errorsEncountered: summary.errorsEncountered,
        completedEarly: summary.completedEarly,
        canaryWarning: summary.canaryWarning,
        durationMs: summary.durationMs,
      },
    });
  } catch (err) {
    // Concurrent-run conflict (409)
    if (
      err !== null &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'MONITORING_CONCURRENT'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'CONFLICT', detail: 'A monitoring job is already running.' },
        },
        { status: 409 }
      );
    }

    return handleError(err);
  }
}
