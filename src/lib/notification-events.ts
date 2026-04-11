/**
 * @file src/lib/notification-events.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.0
 * @brief Notification event persistence with deduplication for the monitoring pipeline.
 *
 * @description
 * Provides createNotificationEvent() which inserts a NotificationEvent record into the
 * database. Designed to be called within a prisma.$transaction() from listing-tracker.ts
 * so the event insert is atomic with the listing state update.
 *
 * Events are deduplicated within an hourly window via the deduplicationKey unique constraint:
 *   ${listingId}:${eventType}:${hourBucket}
 * Duplicate inserts (P2002) are silently skipped — downstream consumers see each event once.
 *
 * Downstream processors (Stories 10.3–10.5) consume events by querying:
 *   WHERE status = 'PENDING' ORDER BY createdAt
 */

import { prisma } from '@/lib/db';
import { Prisma } from '@/generated/prisma';
import { logger } from '@/lib/logger';

// Derive the transaction client type from the prisma singleton to avoid
// dual-instance conflicts between @prisma/client and the generated client.
type PrismaTxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// ---------------------------------------------------------------------------
// Event type constants
// ---------------------------------------------------------------------------

export const NotificationEventType = {
  LISTING_SOLD: 'listing.sold',
  LISTING_PRICE_CHANGED: 'listing.price_changed',
  LISTING_EXPIRING: 'listing.expiring',
  LISTING_UNAVAILABLE: 'listing.unavailable',
  // Story 10.3: Flip lifecycle events
  OPPORTUNITY_FOUND: 'opportunity.found',
  FLIP_PURCHASED: 'flip.purchased',
  FLIP_LISTED: 'flip.listed',
  FLIP_SOLD: 'flip.sold',
  // Story 10.4: Communication events
  MESSAGE_RECEIVED: 'message.received',
  MESSAGE_DRAFT_READY: 'message.draft_ready',
  MESSAGE_SENT: 'message.sent',
  // Story 12.2: Meeting departure reminder
  MEETING_DEPARTURE_REMINDER: 'meeting.departure_reminder',
} as const;

export type NotificationEventType =
  (typeof NotificationEventType)[keyof typeof NotificationEventType];

// ---------------------------------------------------------------------------
// Payload shape (kept lean — max 8 KB)
// ---------------------------------------------------------------------------

export interface NotificationEventPayload {
  eventType: NotificationEventType;
  listingTitle: string;
  listingUrl: string;
  platform: string;
  // listing.sold
  soldIndicator?: string;
  // listing.price_changed
  oldPrice?: number;
  newPrice?: number;
  changePercent?: number;
  direction?: 'increase' | 'decrease';
  // listing.expiring
  estimatedExpiresAt?: string; // ISO-8601
  hoursRemaining?: number;
  /** @deprecated Use estimatedExpiresAt. Kept for backwards compat with 10.1 callers. */
  expiryDate?: string; // ISO-8601
  // listing.unavailable
  reason?: string;
}

// ---------------------------------------------------------------------------
// Input to createNotificationEvent
// ---------------------------------------------------------------------------

export interface NotificationEventInput {
  userId: string;
  listingId: string;
  eventType: NotificationEventType;
  payload: NotificationEventPayload;
}

// ---------------------------------------------------------------------------
// Deduplication helpers
// ---------------------------------------------------------------------------

/**
 * Compute the hour-bucket string used in the deduplication key.
 * Truncates the current time to the start of the current UTC hour.
 */
function hourBucket(now: Date = new Date()): string {
  const d = new Date(now);
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString();
}

/**
 * Build the deduplication key for a given listing+event within the current hour.
 */
export function buildDeduplicationKey(
  listingId: string,
  eventType: NotificationEventType,
  now?: Date
): string {
  return `${listingId}:${eventType}:${hourBucket(now)}`;
}

// ---------------------------------------------------------------------------
// Core function
// ---------------------------------------------------------------------------

/**
 * Persist a notification event inside a caller-supplied transaction client.
 *
 * The function MUST be called within a prisma.$transaction() so that the
 * listing state update and this event insert are atomic. Passing the global
 * prisma client violates the atomicity guarantee.
 *
 * Duplicate inserts (same userId + listingId + eventType + deduplicationKey)
 * are silently skipped via unique-constraint catch (P2002).
 *
 * @param tx  - Prisma transaction client from prisma.$transaction()
 * @param input - Event details
 */
export async function createNotificationEvent(
  tx: PrismaTxClient,
  input: NotificationEventInput
): Promise<void> {
  const deduplicationKey = buildDeduplicationKey(input.listingId, input.eventType);

  try {
    await tx.notificationEvent.create({
      data: {
        userId: input.userId,
        listingId: input.listingId,
        eventType: input.eventType,
        payload: input.payload as unknown as Prisma.InputJsonValue,
        deduplicationKey,
        status: 'PENDING',
      },
    });
  } catch (err) {
    // P2002 = unique constraint violation — duplicate event within the hour, skip silently
    if (
      err !== null &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      logger.debug('Notification event deduplicated — skipping', {
        listingId: input.listingId,
        eventType: input.eventType,
        deduplicationKey,
      });
      return;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Story 10.3: Flip lifecycle event payloads
// ---------------------------------------------------------------------------

export interface FlipNotificationPayload {
  platform?: string;
  askingPrice?: number;
  estimatedValue?: number;
  profitPotential?: number;
  valueScore?: number;
  flippabilityLabel?: string;
  listingTitle?: string;
  imageUrl?: string | null;
  purchasePrice?: number;
  estimatedProfit?: number;
  destinationPlatform?: string;
  listingUrl?: string | null;
  salePrice?: number;
  actualProfit?: number;
  roiPercent?: number;
  daysToFlip?: number;
  [key: string]: unknown;
}

export interface FlipNotificationEventInput {
  userId: string;
  listingId?: string | null;
  eventType: NotificationEventType;
  payload: FlipNotificationPayload;
}

// ---------------------------------------------------------------------------
// Standalone event creation (no transaction required) — Story 10.3
// ---------------------------------------------------------------------------

/**
 * Create a flip lifecycle notification event without requiring a transaction.
 * Uses the global prisma client directly. Duplicate inserts are silently
 * skipped. This is used by scraper routes and the opportunity PATCH handler
 * where atomicity with the parent operation is not required.
 */
export async function createFlipNotificationEvent(
  input: FlipNotificationEventInput
): Promise<void> {
  const deduplicationKey = input.listingId
    ? buildDeduplicationKey(input.listingId, input.eventType)
    : `${input.userId}:${input.eventType}:${hourBucket()}`;

  try {
    await prisma.notificationEvent.create({
      data: {
        userId: input.userId,
        listingId: input.listingId ?? undefined,
        eventType: input.eventType,
        payload: input.payload as unknown as Prisma.InputJsonValue,
        deduplicationKey,
        status: 'PENDING',
      },
    });
  } catch (err) {
    if (
      err !== null &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      logger.debug('Flip notification event deduplicated — skipping', {
        userId: input.userId,
        eventType: input.eventType,
        deduplicationKey,
      });
      return;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Shared helpers for scraper routes — Story 10.3
// ---------------------------------------------------------------------------

interface ListingForNotification {
  id: string;
  title?: string | null;
  price?: number | null;
  estimatedValue?: number | null;
  profitPotential?: number | null;
  valueScore?: number | null;
  platform?: string | null;
  imageUrls?: string | null;
}

/**
 * Emit an opportunity.found notification event. Called from scraper routes
 * after a listing is upserted with status OPPORTUNITY.
 *
 * This is a shared helper to avoid duplicating the hook logic across 5 scraper
 * routes. Fire-and-forget: errors are logged but never thrown.
 */
export async function emitOpportunityFoundEvent(
  listing: ListingForNotification,
  userId: string
): Promise<void> {
  try {
    const scoreLabel = getFlippabilityLabel(listing.valueScore ?? 0);
    const firstImage = listing.imageUrls?.split(',')[0]?.trim() ?? null;

    await createFlipNotificationEvent({
      userId,
      listingId: listing.id,
      eventType: NotificationEventType.OPPORTUNITY_FOUND,
      payload: {
        platform: listing.platform ?? 'Unknown',
        askingPrice: listing.price ?? 0,
        estimatedValue: listing.estimatedValue ?? 0,
        profitPotential: listing.profitPotential ?? 0,
        valueScore: listing.valueScore ?? 0,
        flippabilityLabel: scoreLabel,
        listingTitle: listing.title ?? 'Unknown Item',
        imageUrl: firstImage,
      },
    });
  } catch (err) {
    logger.error('notification.event.creation_failed', {
      userId,
      listingId: listing.id,
      eventType: 'opportunity.found',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Map a value score to a human-readable flippability label. */
function getFlippabilityLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Great';
  if (score >= 60) return 'Good';
  return 'Fair';
}

// ---------------------------------------------------------------------------
// Story 10.4: Message notification event payloads
// ---------------------------------------------------------------------------

export interface MessageNotificationPayload {
  listingTitle?: string | null;
  sellerName?: string | null;
  messagePreview?: string | null;
  draftPreview?: string | null;
  deliveryStatus?: string | null;
  [key: string]: unknown;
}

export interface MessageNotificationEventInput {
  userId: string;
  listingId?: string | null;
  eventType:
    | typeof NotificationEventType.MESSAGE_RECEIVED
    | typeof NotificationEventType.MESSAGE_DRAFT_READY
    | typeof NotificationEventType.MESSAGE_SENT;
  payload: MessageNotificationPayload;
}

/**
 * Create a communication notification event without requiring a transaction.
 * Uses the global prisma client directly. Duplicate inserts within the same
 * hour are silently skipped (P2002 deduplication).
 *
 * Called fire-and-forget from CommunicationNotificationService to establish
 * an audit trail and enable retry of FAILED/PENDING events.
 */
export async function createMessageNotificationEvent(
  input: MessageNotificationEventInput
): Promise<void> {
  const deduplicationKey = input.listingId
    ? buildDeduplicationKey(input.listingId, input.eventType)
    : `${input.userId}:${input.eventType}:${hourBucket()}`;

  try {
    await prisma.notificationEvent.create({
      data: {
        userId: input.userId,
        listingId: input.listingId ?? undefined,
        eventType: input.eventType,
        payload: input.payload as unknown as Prisma.InputJsonValue,
        deduplicationKey,
        status: 'PENDING',
      },
    });
  } catch (err) {
    if (
      err !== null &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      logger.debug('Message notification event deduplicated — skipping', {
        userId: input.userId,
        eventType: input.eventType,
        deduplicationKey,
      });
      return;
    }
    throw err;
  }
}
