/**
 * @file src/lib/cold-hot-detector.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-09
 * @version 1.0
 * @brief Cold and hot flip detection for smart alert notifications.
 *
 * @description
 * Provides detectColdFlips() and detectHotFlips() which query the Message model
 * to identify flip conversations that need user attention:
 *
 * Cold flip: The last message in a conversation exceeds the configured time threshold
 * without a response. Two scenarios:
 *   - user_not_replied: Last message is INBOUND and elapsed > flipGoneColdHours
 *   - seller_not_replied: Last message is OUTBOUND and elapsed > flipGoneColdHours * 2
 *     (seller ghosted; 2x threshold because user already acted)
 *
 * Hot flip: The conversation has consecutive unread INBOUND messages meeting or
 * exceeding the flipTurnedHotCount threshold. Only counts messages where readAt IS NULL
 * to avoid false positives for read-but-not-replied conversations.
 *
 * Performance requirements: Uses composite indexes added in Story 10.5.
 * Error handling: Both functions return empty array on any error (never throw).
 * PII in logs: Never log message body, seller name, or review text in error paths.
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// Only active flip conversations are eligible for cold/hot detection.
// NEW and ANALYZING listings have no conversations yet.
const ACTIVE_FLIP_STATUSES = ['OPPORTUNITY', 'CONTACTED', 'PURCHASED', 'LISTED'] as const;

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface ColdFlipResult {
  listingId: string;
  listingTitle: string;
  sellerName: string | null;
  hoursSinceLastResponse: number;
  lastMessageAt: Date;
  coldReason: 'user_not_replied' | 'seller_not_replied';
}

export interface HotFlipResult {
  listingId: string;
  listingTitle: string;
  sellerName: string | null;
  consecutiveInboundCount: number;
  latestMessagePreview: string;
}

// ---------------------------------------------------------------------------
// detectColdFlips
// ---------------------------------------------------------------------------

/**
 * Find active flip conversations where the last message exceeds the cold threshold.
 *
 * Uses bidirectional cold detection:
 *  - user_not_replied: last INBOUND message older than coldHours
 *  - seller_not_replied: last OUTBOUND message older than coldHours * 2
 *
 * Only considers listings with messages in the last 30 days to avoid scanning
 * stale conversations. Only queries listings in active statuses.
 *
 * @param userId   - The user whose listings to check
 * @param coldHours - Threshold in hours before a flip is considered cold
 */
export async function detectColdFlips(userId: string, coldHours: number): Promise<ColdFlipResult[]> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const coldThreshold = new Date(Date.now() - coldHours * 60 * 60 * 1000);
    const sellerColdThreshold = new Date(Date.now() - coldHours * 2 * 60 * 60 * 1000);

    // Query active listings with recent messages — uses @@index([listingId, createdAt]) on Message
    const listings = await prisma.listing.findMany({
      where: {
        userId,
        status: { in: [...ACTIVE_FLIP_STATUSES] },
        messages: { some: { createdAt: { gte: thirtyDaysAgo } } },
      },
      select: {
        id: true,
        title: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            createdAt: true,
            direction: true,
            sellerName: true,
          },
        },
      },
    });

    const results: ColdFlipResult[] = [];

    for (const listing of listings) {
      const lastMsg = listing.messages[0];
      if (!lastMsg) continue;

      let coldReason: ColdFlipResult['coldReason'] | null = null;

      if (lastMsg.direction === 'INBOUND' && lastMsg.createdAt < coldThreshold) {
        coldReason = 'user_not_replied';
      } else if (lastMsg.direction === 'OUTBOUND' && lastMsg.createdAt < sellerColdThreshold) {
        coldReason = 'seller_not_replied';
      }

      if (!coldReason) continue;

      results.push({
        listingId: listing.id,
        listingTitle: listing.title,
        sellerName: lastMsg.sellerName ?? null,
        hoursSinceLastResponse: Math.floor(
          (Date.now() - lastMsg.createdAt.getTime()) / (60 * 60 * 1000)
        ),
        lastMessageAt: lastMsg.createdAt,
        coldReason,
      });
    }

    return results;
  } catch (err) {
    // Never log PII — only userId, listingId scope is not available here, log sanitized error
    logger.error('cold_detector.error', {
      userId,
      /* istanbul ignore next -- tests always throw Error instances */
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

// ---------------------------------------------------------------------------
// detectHotFlips
// ---------------------------------------------------------------------------

/**
 * Find active flip conversations with consecutive unread INBOUND messages meeting
 * or exceeding the hotCount threshold.
 *
 * Counts consecutive INBOUND messages with readAt IS NULL from the most recent
 * message backward. Stops counting when an outbound or read message is encountered.
 *
 * @param userId   - The user whose listings to check
 * @param hotCount - Minimum consecutive unread inbound messages to consider "hot"
 */
export async function detectHotFlips(userId: string, hotCount: number): Promise<HotFlipResult[]> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Uses @@index([listingId, direction, createdAt]) on Message
    const listings = await prisma.listing.findMany({
      where: {
        userId,
        status: { in: [...ACTIVE_FLIP_STATUSES] },
        // 30-day recency filter — excludes stale listings with old unread messages
        messages: { some: { direction: 'INBOUND', readAt: null, createdAt: { gte: thirtyDaysAgo } } },
      },
      select: {
        id: true,
        title: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          // Take hotCount + 5 to ensure the break point is visible
          take: hotCount + 5,
          select: {
            direction: true,
            body: true,
            sellerName: true,
            readAt: true,
          },
        },
      },
    });

    const results: HotFlipResult[] = [];

    for (const listing of listings) {
      let consecutiveUnreadInbound = 0;
      let latestMessagePreview = '';
      let sellerName: string | null = null;

      for (const msg of listing.messages) {
        if (msg.direction === 'INBOUND' && msg.readAt === null) {
          consecutiveUnreadInbound++;
          if (consecutiveUnreadInbound === 1) {
            // Most recent message — capture preview and seller name
            latestMessagePreview = (msg.body ?? '').substring(0, 200);
            sellerName = msg.sellerName ?? null;
          }
        } else {
          // Hit an outbound or read message — stop counting
          break;
        }
      }

      if (consecutiveUnreadInbound >= hotCount) {
        results.push({
          listingId: listing.id,
          listingTitle: listing.title,
          sellerName,
          consecutiveInboundCount: consecutiveUnreadInbound,
          latestMessagePreview,
        });
      }
    }

    return results;
  } catch (err) {
    logger.error('hot_detector.error', {
      userId,
      /* istanbul ignore next -- tests always throw Error instances */
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
