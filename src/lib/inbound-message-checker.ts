/**
 * @file src/lib/inbound-message-checker.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Platform-adapter-based inbound message checker for seller replies.
 *
 * @description
 * Checks for inbound seller replies across marketplace platforms using a
 * platform adapter pattern. Each platform has a dedicated checker that can
 * be swapped from a stub to a real implementation (browser-based or API).
 * When inbound messages are found, they are deduplicated, stored as INBOUND
 * Message records, and trigger a conversation status transition to 'responded'.
 * All platform adapters are currently stubs returning { found: false }.
 */

import prisma from '@/lib/db';
import { transitionToResponded } from '@/lib/conversation-status';

/** Result from checking a platform for inbound messages */
export interface InboundCheckResult {
  found: boolean;
  messages: InboundMessage[];
  platform: string;
}

/** A single inbound message detected from a platform */
export interface InboundMessage {
  body: string;
  sellerName?: string;
  receivedAt?: Date;
  externalId?: string;
}

/** Listing data needed for inbound message checking */
export interface ListingData {
  id: string;
  platform: string;
  sellerName?: string | null;
  sellerContact?: string | null;
  url?: string;
}

/** Platform-specific message checker interface */
interface PlatformMessageChecker {
  checkForReplies(
    listing: ListingData,
    userId: string
  ): Promise<InboundCheckResult>;
}

/**
 * Stub checker — returns no messages found.
 * Real implementations will use browser sessions or APIs.
 */
function createStubChecker(platform: string): PlatformMessageChecker {
  return {
    async checkForReplies(): Promise<InboundCheckResult> {
      return { found: false, messages: [], platform };
    },
  };
}

/** Platform adapter registry */
const PLATFORM_CHECKERS: Record<string, PlatformMessageChecker> = {
  CRAIGSLIST: createStubChecker('CRAIGSLIST'),
  FACEBOOK: createStubChecker('FACEBOOK'),
  EBAY: createStubChecker('EBAY'),
  MERCARI: createStubChecker('MERCARI'),
  OFFERUP: createStubChecker('OFFERUP'),
};

/**
 * Check if a message body already exists for this listing+user in the last 24 hours.
 *
 * Soft dedup — false negatives are acceptable, false positives must be avoided.
 *
 * NOTE: The story 8.5 dev notes describe a hash-based approach (platform +
 * sellerName + body.substring(0,100) + receivedDate). This implementation
 * intentionally deviates: we match the full `body` text scoped to (listingId,
 * userId, direction=INBOUND) within a 24-hour createdAt window. Rationale:
 *   - Listing scoping implicitly covers platform (a listing has one platform).
 *   - Full-body match is stricter than a 100-char prefix and avoids the
 *     "same opening line" false-positive class.
 *   - A 24-hour window avoids depending on a `receivedDate` the platform may
 *     not expose reliably.
 * The trade-off is body-whitespace sensitivity, which is acceptable for a
 * soft-dedup guard against the adapter replaying the same fetch.
 */
async function isDuplicate(
  listingId: string,
  userId: string,
  body: string
): Promise<boolean> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const existing = await prisma.message.findFirst({
    where: {
      listingId,
      userId,
      direction: 'INBOUND',
      body,
      createdAt: { gte: twentyFourHoursAgo },
    },
    select: { id: true },
  });

  return existing !== null;
}

/**
 * Check for seller replies on a listing's platform.
 * Dispatches to the platform-specific checker, deduplicates results,
 * creates INBOUND message records, and transitions conversation status.
 *
 * @returns Number of new (non-duplicate) messages stored
 */
export async function checkForReplies(
  listing: ListingData,
  userId: string
): Promise<{ checked: boolean; newMessages: number; conversationStatus: string | null }> {
  const checker = PLATFORM_CHECKERS[listing.platform.toUpperCase()];

  if (!checker) {
    return { checked: false, newMessages: 0, conversationStatus: null };
  }

  const result = await checker.checkForReplies(listing, userId);

  if (!result.found || result.messages.length === 0) {
    // Fetch current status even when no new messages
    const currentListing = await prisma.listing.findFirst({
      where: { id: listing.id, userId },
      select: { conversationStatus: true },
    });
    return {
      checked: true,
      newMessages: 0,
      conversationStatus: currentListing?.conversationStatus ?? null,
    };
  }

  let newCount = 0;

  for (const msg of result.messages) {
    const duplicate = await isDuplicate(listing.id, userId, msg.body);
    if (duplicate) continue;

    await prisma.message.create({
      data: {
        userId,
        listingId: listing.id,
        direction: 'INBOUND',
        status: 'DELIVERED',
        body: msg.body,
        sellerName: msg.sellerName ?? listing.sellerName ?? null,
        platform: listing.platform,
        sentAt: msg.receivedAt ?? new Date(),
      },
    });

    newCount++;
  }

  // Transition to responded if any new inbound messages were stored
  if (newCount > 0) {
    await transitionToResponded(listing.id, userId);
  }

  const updatedListing = await prisma.listing.findFirst({
    where: { id: listing.id, userId },
    select: { conversationStatus: true },
  });

  return {
    checked: true,
    newMessages: newCount,
    conversationStatus: updatedListing?.conversationStatus ?? null,
  };
}

/** Exported for testing — get the platform checkers registry */
export function getPlatformCheckers(): Record<string, PlatformMessageChecker> {
  return PLATFORM_CHECKERS;
}
