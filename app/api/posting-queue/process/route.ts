/**
 * @file app/api/posting-queue/process/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Trigger endpoint — processes the authenticated user's posting queue.
 *
 * @description
 * POST /api/posting-queue/process — enforces auth and the ebayCrossListing
 * feature gate, ensures platform poster stubs are registered (robust against
 * serverless cold starts), applies a simple per-user 60-second rate limit by
 * inspecting the user's most recently touched queue items, then invokes
 * processQueue(userId) and returns a ProcessResult breakdown.
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';
import {
  handleError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
} from '@/lib/errors';
import { checkFeatureAccess } from '@/lib/tier-enforcement';
import { processQueue } from '@/lib/posting-queue-processor';
import { ensurePostersRegistered } from '@/lib/platform-posters';

// Minimum seconds between successive process runs for the same user.
// Enforced inline here (not via the shared rate limiter) because the
// existing src/lib/rate-limiter.ts keys on IP+pathname via middleware and
// does not support per-user keying.
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

export async function POST() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    // Feature gate — same rule as POST /api/posting-queue. Users without
    // ebayCrossListing access must not be able to kick off a processing run.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });
    const featureCheck = checkFeatureAccess(user?.subscriptionTier, 'ebayCrossListing');
    if (!featureCheck.allowed) {
      throw new ForbiddenError(featureCheck.reason);
    }

    // Rate limit: reject if any of this user's queue items were touched in
    // the last RATE_LIMIT_WINDOW_MS. findFirst() + orderBy updatedAt is a
    // cheap lookup (indexed via userId) and captures any processQueue run,
    // manual retry, status transition, or create/update in the window.
    const recent = await prisma.postingQueueItem.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });
    if (recent) {
      const elapsedMs = Date.now() - recent.updatedAt.getTime();
      if (elapsedMs < RATE_LIMIT_WINDOW_MS) {
        const retryAfterSec = Math.ceil((RATE_LIMIT_WINDOW_MS - elapsedMs) / 1000);
        throw new RateLimitError(
          `Queue was processed recently. Try again in ${retryAfterSec}s.`
        );
      }
    }

    // Register platform poster stubs before each run. Idempotent — safe on
    // hot Lambdas, correct on cold starts.
    ensurePostersRegistered();

    const result = await processQueue(userId);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('POST /api/posting-queue/process error:', error);
    return handleError(error);
  }
}
