/**
 * file: src/lib/posting-queue-processor.ts
 * author: Stephen Boyett
 * company: Axovia AI
 * date: 2026-03-31
 * version: 3.0
 * brief: Processes the posting queue — dispatches items to platform handlers.
 *
 * description:
 *     Handles PostingQueueItem lifecycle (PENDING -> IN_PROGRESS -> POSTED/FAILED)
 *     by invoking registered PlatformPoster handlers. processQueue() is scoped
 *     to a single userId to prevent cross-tenant processing. Adds a per-item
 *     timeout, a concurrency guard that re-checks item status before posting,
 *     and a stuck-item recovery pass that resets IN_PROGRESS items older than
 *     five minutes back to PENDING (so crashes and hung Lambda invocations do
 *     not strand work). Eager-loads ListingImage[] on every queue item so
 *     PlatformPoster implementations receive cross-post-ready image URLs via
 *     listing.images without additional database queries (Story 9.4). Includes
 *     a non-blocking legacy fallback that downloads images from a listing's
 *     pre-Epic-3 imageUrls JSON column using captureListingImages() when the
 *     modern ListingImage relation is empty.
 */

import prisma from '@/lib/db';
import type {
  PostingQueueItem,
  ListingImage,
} from '@/generated/prisma';
import type { ListingWithImages } from '@/lib/image-helpers';
import { captureListingImages, saveImageMetadata } from '@/lib/image-capture';

// Re-export ListingWithImages so poster implementations can import from this
// module alongside the PlatformPoster type.
export type { ListingWithImages } from '@/lib/image-helpers';

// Platform-specific posting result
export interface PostingResult {
  success: boolean;
  externalPostId?: string;
  externalPostUrl?: string;
  errorMessage?: string;
}

// Platform posting handler interface. Accepts a listing with its eagerly-loaded
// ListingImage[] relation so posters can attach Firebase Storage URLs without
// an extra query. Existing handlers that do not need images can simply ignore
// the `images` field on the listing argument.
export type PlatformPoster = (
  listing: ListingWithImages,
  queueItem: PostingQueueItem
) => Promise<PostingResult>;

// Result summary returned by processQueue so callers can report a breakdown
// to end users (e.g., "Processed 5 items: 3 posted, 2 failed").
export interface ProcessResult {
  processed: number;
  posted: number;
  failed: number;
}

// Registry of platform-specific posting handlers
const platformPosters: Record<string, PlatformPoster> = {};

/**
 * Register a platform-specific posting handler
 */
export function registerPoster(platform: string, poster: PlatformPoster): void {
  platformPosters[platform] = poster;
}

// Per-item poster timeout — a hung platform poster must not block the entire
// queue run. Matches the value documented in the Story 9.3 Dev Notes.
const POSTER_TIMEOUT_MS = 30_000;

// Stuck-item recovery threshold. Items left in IN_PROGRESS longer than this
// are presumed abandoned (crash, Lambda timeout, forced restart) and are
// reset to PENDING at the start of each run.
const STUCK_ITEM_THRESHOLD_MS = 5 * 60 * 1000;

// Per-image fallback download timeout for legacy listings that have no
// ListingImage records but do carry a populated imageUrls JSON column. Ten
// seconds per image keeps a dead original URL from stalling the queue run
// without being so aggressive that working URLs regularly fail.
const LEGACY_IMAGE_DOWNLOAD_TIMEOUT_MS = 10_000;

/**
 * Wrap a poster call in Promise.race() against a timeout. Rejected with a
 * descriptive error so it flows through the existing catch-block retry logic.
 */
async function runPosterWithTimeout(
  poster: PlatformPoster,
  listing: ListingWithImages,
  item: PostingQueueItem
): Promise<PostingResult> {
  return Promise.race<PostingResult>([
    poster(listing, item),
    new Promise<PostingResult>((_, reject) => {
      setTimeout(
        () => reject(new Error('Posting timed out')),
        POSTER_TIMEOUT_MS
      );
    }),
  ]);
}

/**
 * Parse a listing's legacy `imageUrls` JSON column into a plain array of URLs.
 * Returns an empty array on null, malformed JSON, or an unexpected shape so
 * callers never have to pattern-match on JSON.parse exceptions.
 */
function parseLegacyImageUrls(imageUrls: string | null): string[] {
  if (!imageUrls) return [];
  try {
    const parsed = JSON.parse(imageUrls);
    return Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Attempt to populate a listing's Firebase Storage images by downloading from
 * its legacy `imageUrls` column. Wraps `captureListingImages()` in a budget
 * timeout of 10s per URL — if a dead marketplace CDN hangs every request, the
 * whole operation aborts and returns the listing unchanged so queue processing
 * continues. Any failure is swallowed: this function NEVER throws.
 *
 * On success, persists the newly uploaded ListingImage records so a subsequent
 * run can skip the fallback entirely.
 */
async function hydrateLegacyImages(
  listing: ListingWithImages
): Promise<ListingWithImages> {
  // Callers are expected to guard with `listing.images.length === 0`, so we
  // skip the defensive re-check here and go straight to the ownership guard.
  if (!listing.userId) return listing;

  const legacyUrls = parseLegacyImageUrls(listing.imageUrls);
  if (legacyUrls.length === 0) return listing;

  const budgetMs = LEGACY_IMAGE_DOWNLOAD_TIMEOUT_MS * legacyUrls.length;
  // Definitely-assigned: the Promise executor runs synchronously during
  // construction, so `timer` is always set before either the try or catch
  // branch runs.
  let timer!: ReturnType<typeof setTimeout>;

  try {
    const capture = await Promise.race<
      Awaited<ReturnType<typeof captureListingImages>>
    >([
      captureListingImages(listing.id, listing.userId, listing.platform, legacyUrls),
      new Promise((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(`Legacy image download exceeded ${budgetMs}ms budget`)
            ),
          budgetMs
        );
      }),
    ]);
    clearTimeout(timer);

    if (capture.captured.length === 0) return listing;

    await saveImageMetadata(listing.id, capture.captured);

    const hydratedImages: ListingImage[] = capture.captured.map((img) => ({
      id: `legacy-${listing.id}-${img.imageIndex}`,
      listingId: listing.id,
      imageIndex: img.imageIndex,
      originalUrl: img.originalUrl,
      storagePath: img.storagePath,
      storageUrl: img.storageUrl,
      fileSize: img.fileSize,
      contentType: img.contentType,
      width: null,
      height: null,
      uploadedAt: new Date(),
    }));

    return { ...listing, images: hydratedImages };
  } catch (error) {
    clearTimeout(timer);
    // Non-blocking: log and continue. The queue item will still attempt to
    // post via its platform handler — some platforms accept text-only
    // listings, and the API response exposes imageStatus so the client can
    // prompt the user to upload manually.
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(
      `[posting-queue-processor] Legacy image hydration failed for listing ${listing.id}: ${msg}`
    );
    return listing;
  }
}

/**
 * Process a single queue item. Returns 'posted' or 'failed' to let the caller
 * aggregate a ProcessResult breakdown. 'failed' also covers retried items —
 * any item that did not successfully post in this run counts as failed from
 * the user's perspective (even if it will be retried on the next run).
 *
 * The `item.listing` relation is eagerly loaded with its `images` array so
 * the platform handler receives a fully hydrated `ListingWithImages` without
 * any N+1 lookups. When the listing has no ListingImage records but still
 * carries a legacy `imageUrls` column, a non-blocking hydration pass attempts
 * to download from the original URLs before invoking the poster.
 */
async function processItem(
  item: PostingQueueItem & { listing: ListingWithImages }
): Promise<'posted' | 'failed'> {
  // Defense-in-depth ownership check. processQueue() scopes findMany() by
  // userId already, but we verify again here so a mis-joined row or a stale
  // cached PostingQueueItem from an admin tool cannot slip through to post
  // one user's listing under another user's identity.
  if (item.listing.userId && item.listing.userId !== item.userId) {
    await prisma.postingQueueItem.update({
      where: { id: item.id },
      data: {
        status: 'FAILED',
        errorMessage: 'Authorization error: listing does not belong to user',
      },
    });
    return 'failed';
  }

  const poster = platformPosters[item.targetPlatform];

  if (!poster) {
    await prisma.postingQueueItem.update({
      where: { id: item.id },
      data: {
        status: 'FAILED',
        errorMessage: `No posting handler registered for platform: ${item.targetPlatform}`,
      },
    });
    return 'failed';
  }

  // Mark as in progress
  await prisma.postingQueueItem.update({
    where: { id: item.id },
    data: { status: 'IN_PROGRESS' },
  });

  // Concurrency guard: re-read the row and confirm it is still IN_PROGRESS.
  // If a parallel processQueue() call grabbed it first, the status will have
  // moved on (POSTED/FAILED/PENDING) and we must bail out to avoid
  // double-posting to the external platform.
  const current = await prisma.postingQueueItem.findUnique({
    where: { id: item.id },
  });
  if (!current || current.status !== 'IN_PROGRESS') {
    return 'failed';
  }

  // When no ListingImage records exist (pre-Epic-3 legacy), kick off a
  // non-blocking hydration pass that downloads from the listing's legacy
  // imageUrls column. hydrateLegacyImages() short-circuits when there's
  // nothing to hydrate and swallows errors so queue processing continues
  // even if every original CDN URL is dead.
  let listingForPoster: ListingWithImages = item.listing;
  if (item.listing.images.length === 0) {
    listingForPoster = await hydrateLegacyImages(item.listing);
  }

  try {
    const result = await runPosterWithTimeout(poster, listingForPoster, item);

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
      return 'posted';
    }

    const shouldRetry = item.retryCount < item.maxRetries;
    await prisma.postingQueueItem.update({
      where: { id: item.id },
      data: {
        status: shouldRetry ? 'PENDING' : 'FAILED',
        retryCount: { increment: 1 },
        errorMessage: result.errorMessage ?? 'Unknown posting error',
      },
    });
    return 'failed';
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
    return 'failed';
  }
}

/**
 * Reset items stuck in IN_PROGRESS for more than STUCK_ITEM_THRESHOLD_MS back
 * to PENDING so a subsequent pass can retry them. This guards against crashes
 * and Lambda timeouts that leave items orphaned in IN_PROGRESS forever.
 */
async function recoverStuckItems(userId: string): Promise<void> {
  const threshold = new Date(Date.now() - STUCK_ITEM_THRESHOLD_MS);
  await prisma.postingQueueItem.updateMany({
    where: {
      userId,
      status: 'IN_PROGRESS',
      updatedAt: { lt: threshold },
    },
    data: { status: 'PENDING' },
  });
}

/**
 * Process pending items in the queue for a specific user.
 *
 * IMPORTANT: This function is intentionally scoped to a single userId. A
 * global variant that processes every user's items would be an IDOR risk
 * if exposed to user-facing endpoints, and must NOT be added without a
 * separate admin-only code path.
 *
 * @param userId - Authenticated user's Prisma id (cuid)
 * @param batchSize - Maximum number of items to process in one run
 */
export async function processQueue(
  userId: string,
  batchSize = 10
): Promise<ProcessResult> {
  await recoverStuckItems(userId);

  const now = new Date();

  const pendingItems = await prisma.postingQueueItem.findMany({
    where: {
      userId,
      status: 'PENDING',
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
    },
    include: {
      // Eager-load images once per listing (single JOIN, zero N+1) so each
      // queue item can be handed to its PlatformPoster as a fully hydrated
      // ListingWithImages. Ordering by imageIndex keeps the hero image in
      // slot 0 across every platform the item is cross-posted to.
      listing: {
        include: {
          images: { orderBy: { imageIndex: 'asc' } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  });

  let posted = 0;
  let failed = 0;

  for (const item of pendingItems) {
    const outcome = await processItem(item);
    if (outcome === 'posted') posted += 1;
    else failed += 1;
  }

  return { processed: pendingItems.length, posted, failed };
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

  return {
    pending,
    inProgress,
    posted,
    failed,
    total: pending + inProgress + posted + failed,
  };
}
