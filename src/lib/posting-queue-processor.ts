/**
 * Posting Queue Processor
 *
 * Processes pending items in the posting queue by dispatching to
 * platform-specific posting handlers. Handles retries and status tracking.
 */

import prisma from '@/lib/db';
import type { PostingQueueItem, Listing } from '@/generated/prisma/client';

// Platform-specific posting result
export interface PostingResult {
  success: boolean;
  externalPostId?: string;
  externalPostUrl?: string;
  errorMessage?: string;
}

// Platform posting handler interface
export type PlatformPoster = (
  listing: Listing,
  queueItem: PostingQueueItem
) => Promise<PostingResult>;

// Registry of platform-specific posting handlers
const platformPosters: Record<string, PlatformPoster> = {};

/**
 * Register a platform-specific posting handler
 */
export function registerPoster(platform: string, poster: PlatformPoster): void {
  platformPosters[platform] = poster;
}

/**
 * Process a single queue item
 */
async function processItem(
  item: PostingQueueItem & { listing: Listing }
): Promise<void> {
  const poster = platformPosters[item.targetPlatform];

  if (!poster) {
    await prisma.postingQueueItem.update({
      where: { id: item.id },
      data: {
        status: 'FAILED',
        errorMessage: `No posting handler registered for platform: ${item.targetPlatform}`,
      },
    });
    return;
  }

  // Mark as in progress
  await prisma.postingQueueItem.update({
    where: { id: item.id },
    data: { status: 'IN_PROGRESS' },
  });

  try {
    const result = await poster(item.listing, item);

    if (result.success) {
      await prisma.postingQueueItem.update({
        where: { id: item.id },
        data: {
          status: 'POSTED',
          externalPostId: result.externalPostId ?? null,
          externalPostUrl: result.externalPostUrl ?? null,
          postedAt: new Date(),
          errorMessage: null,
        },
      });
    } else {
      const shouldRetry = item.retryCount < item.maxRetries;
      await prisma.postingQueueItem.update({
        where: { id: item.id },
        data: {
          status: shouldRetry ? 'PENDING' : 'FAILED',
          retryCount: { increment: 1 },
          errorMessage: result.errorMessage ?? 'Unknown posting error',
        },
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const shouldRetry = item.retryCount < item.maxRetries;
    await prisma.postingQueueItem.update({
      where: { id: item.id },
      data: {
        status: shouldRetry ? 'PENDING' : 'FAILED',
        retryCount: { increment: 1 },
        errorMessage: errorMsg,
      },
    });
  }
}

/**
 * Process all pending items in the queue.
 * Call this from a cron job or background worker.
 *
 * @param batchSize - Maximum number of items to process in one run
 * @returns Number of items processed
 */
export async function processQueue(batchSize = 10): Promise<number> {
  const now = new Date();

  const pendingItems = await prisma.postingQueueItem.findMany({
    where: {
      status: 'PENDING',
      OR: [
        { scheduledAt: null },
        { scheduledAt: { lte: now } },
      ],
    },
    include: { listing: true },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  });

  for (const item of pendingItems) {
    await processItem(item);
  }

  return pendingItems.length;
}

/**
 * Get queue statistics for a user
 */
export async function getQueueStats(userId: string) {
  const [pending, inProgress, posted, failed] = await Promise.all([
    prisma.postingQueueItem.count({ where: { userId, status: 'PENDING' } }),
    prisma.postingQueueItem.count({ where: { userId, status: 'IN_PROGRESS' } }),
    prisma.postingQueueItem.count({ where: { userId, status: 'POSTED' } }),
    prisma.postingQueueItem.count({ where: { userId, status: 'FAILED' } }),
  ]);

  return { pending, inProgress, posted, failed, total: pending + inProgress + posted + failed };
}
