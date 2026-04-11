/**
 * @file app/api/meeting-reminders/run/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-11
 * @version 1.0
 * @brief POST endpoint for triggering the meeting departure reminder scheduler (Story 12.2).
 *
 * @description
 * Cloud Scheduler POSTs here every 5 minutes to dispatch "time to leave" notifications.
 * Execution is capped at 90 seconds internally (MAX_RUN_DURATION_MS).
 *
 * Auth: Bearer token validated via timing-safe comparison against MONITORING_API_KEY.
 * (Reuses the same API key as the monitoring endpoint for operational simplicity.)
 *
 * This endpoint MUST run on Cloud Run. It must NOT be on Vercel.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { runMeetingReminderScheduler } from '@/lib/meeting-reminder-scheduler';
import { handleError, UnauthorizedError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const MIN_KEY_LENGTH = 32;

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!validateApiKey(request)) {
    logger.warn('meeting.reminders.auth_failure', {
      ip: request.headers.get('x-forwarded-for') ?? 'unknown',
    });
    return handleError(new UnauthorizedError('Unauthorized'));
  }

  try {
    const summary = await runMeetingReminderScheduler();

    return NextResponse.json({
      success: true,
      data: {
        processed: summary.processed,
        dispatched: summary.dispatched,
        skipped: summary.skipped,
        errors: summary.errors,
        durationMs: summary.durationMs,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
