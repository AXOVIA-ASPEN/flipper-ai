/**
 * @file app/api/notifications/process/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-09
 * @version 1.0
 * @brief POST endpoint for triggering flip lifecycle notification processing.
 *
 * @description
 * Cloud Scheduler POSTs here every 5 minutes to trigger notification processing.
 * The run completes synchronously — results are returned in the response body.
 *
 * Auth: Bearer token validated via timing-safe comparison against
 * NOTIFICATION_PROCESSOR_API_KEY (MUST be different from MONITORING_API_KEY).
 * Concurrent-run guard: database-level lock via MonitoringJob model with type
 * 'notification_processing'. Rate-limit auth failures: 5 failed attempts from
 * same IP within 1 minute → 429 for 5 minutes.
 *
 * This endpoint MUST run on Cloud Run (timeout 300s). The processor has a 240s
 * internal max duration (60s buffer for Cloud Run).
 */

import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import prisma from '@/lib/db';
import { handleError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { processFlipLifecycleNotifications } from '@/lib/flip-notification-processor';
import { processSmartAlertNotificationEvents } from '@/lib/smart-alert-notification-processor';

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

const MIN_KEY_LENGTH = 32;

// In-memory auth failure rate limiter
const authFailures = new Map<string, { count: number; firstFailure: number }>();

function validateApiKey(request: NextRequest): boolean {
  const apiKey = process.env.NOTIFICATION_PROCESSOR_API_KEY;
  if (!apiKey || apiKey.length < MIN_KEY_LENGTH) return false;

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  const providedKey = authHeader.slice(7);
  if (providedKey.length !== apiKey.length) return false;

  const keyBuffer = Buffer.from(apiKey);
  const providedBuffer = Buffer.from(providedKey);

  return crypto.timingSafeEqual(keyBuffer, providedBuffer);
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

function isAuthRateLimited(ip: string): boolean {
  const record = authFailures.get(ip);
  if (!record) return false;

  const elapsed = Date.now() - record.firstFailure;

  // Reset after 5 minutes
  /* istanbul ignore if -- timeout cleanup path, not practical to test without clock mocking */
  if (elapsed > 5 * 60 * 1000) {
    authFailures.delete(ip);
    return false;
  }

  // Rate limit after 5 failures within 1 minute
  return record.count >= 5;
}

function recordAuthFailure(ip: string): void {
  const record = authFailures.get(ip);
  const now = Date.now();

  if (!record || now - record.firstFailure > 60_000) {
    authFailures.set(ip, { count: 1, firstFailure: now });
  } else {
    record.count++;
  }
}

// ---------------------------------------------------------------------------
// Concurrent run guard — uses MonitoringJob with a distinctive errorMessage
// as a sentinel since the model has no `type` field. The partial unique index
// on status='RUNNING' prevents two RUNNING jobs from coexisting.
// ---------------------------------------------------------------------------

const LOCK_SENTINEL = 'notification_processing_lock';

async function acquireLock(): Promise<string | null> {
  // Reap stale locks first (RUNNING for > 5 minutes)
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
  await prisma.monitoringJob.updateMany({
    where: {
      status: 'RUNNING',
      errorMessage: LOCK_SENTINEL,
      startedAt: { lt: staleThreshold },
    },
    data: { status: 'FAILED', completedAt: new Date() },
  });

  try {
    const job = await prisma.monitoringJob.create({
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
        errorMessage: LOCK_SENTINEL,
      },
    });
    return job.id;
  } catch (err) {
    // P2002 = unique constraint violation — another RUNNING job exists
    if (
      err !== null &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      return null;
    }
    throw err;
  }
}

async function releaseLock(jobId: string, status: 'COMPLETED' | 'FAILED'): Promise<void> {
  try {
    await prisma.monitoringJob.update({
      where: { id: jobId },
      data: { status, completedAt: new Date() },
    });
  } catch {
    // Non-critical — lock will be stale-recovered on next run
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    // Check API key is configured
    if (!process.env.NOTIFICATION_PROCESSOR_API_KEY) {
      return NextResponse.json(
        { success: false, error: { code: 'SERVICE_UNAVAILABLE', detail: 'Notification processor not configured' } },
        { status: 503 }
      );
    }

    // Rate-limit auth failures
    if (isAuthRateLimited(ip)) {
      logger.warn('notification.auth.rate_limited', { ip });
      return NextResponse.json(
        { success: false, error: { code: 'RATE_LIMITED', detail: 'Too many failed auth attempts' } },
        { status: 429 }
      );
    }

    // Validate API key
    if (!validateApiKey(request)) {
      recordAuthFailure(ip);
      logger.warn('notification.auth.failed', { ip });
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', detail: 'Invalid API key' } },
        { status: 401 }
      );
    }

    // Concurrent run guard
    const jobId = await acquireLock();
    if (!jobId) {
      logger.info('notification.concurrent_run_blocked');
      return NextResponse.json(
        { success: false, error: { code: 'CONFLICT', detail: 'Another notification processing run is active' } },
        { status: 409 }
      );
    }

    // Process notifications
    const startTime = Date.now();
    let flipResult;
    let smartAlertResult;
    try {
      flipResult = await processFlipLifecycleNotifications();
      smartAlertResult = await processSmartAlertNotificationEvents();
      await releaseLock(jobId, 'COMPLETED');
    } catch (err) {
      await releaseLock(jobId, 'FAILED');
      throw err;
    }

    const duration = Date.now() - startTime;

    // Combine results from both processors
    const combinedProcessed = flipResult.processed + smartAlertResult.processed;
    const combinedSent = flipResult.sent + smartAlertResult.sent;
    const combinedFailed = flipResult.failed + smartAlertResult.failed;

    logger.info('notification.processing.complete', {
      flip: { processed: flipResult.processed, sent: flipResult.sent, failed: flipResult.failed },
      smartAlert: smartAlertResult,
      duration,
    });

    return NextResponse.json({
      success: true,
      data: {
        processed: combinedProcessed,
        sent: combinedSent,
        // Preserve per-bucket breakdown from flip processor (spec Task 5.3).
        // smartAlert contributes a raw count (no per-bucket breakdown available).
        skipped: {
          preferenceDisabled: flipResult.skipped.preferenceDisabled,
          frequencyDeferred: flipResult.skipped.frequencyDeferred,
          rateLimited: flipResult.skipped.rateLimited,
          stale: flipResult.skipped.stale,
          userDeleted: flipResult.skipped.userDeleted,
          smartAlert: smartAlertResult.skipped,
        },
        failed: combinedFailed,
        duration,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
