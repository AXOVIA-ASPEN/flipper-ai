/**
 * @file src/lib/flip-notification-processor.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-09
 * @version 1.1
 * @brief Processes flip lifecycle + communication notification events via Resend.
 *
 * @description
 * Consumes PENDING NotificationEvent records for flip lifecycle event types
 * (opportunity.found, flip.purchased, flip.listed, flip.sold) and communication
 * event types (message.received, message.draft_ready, message.sent), sending
 * emails through the EmailService / CommunicationNotificationService singletons.
 * Implements:
 *   - User preference checking (master toggle + type-specific + frequency)
 *   - Per-user email rate limiting
 *   - Opportunity digest aggregation (>5 pending for same user)
 *   - Provider circuit breaker (3 consecutive failures)
 *   - Stale event filtering (>48h old)
 *   - Retry logic with retryCount cap and idempotency guard
 *   - Optimistic locking to prevent double-processing
 *   - Max duration abort for Cloud Run compatibility
 */

import { Prisma } from '@/generated/prisma';
import prisma from '@/lib/db';
import { emailService } from '@/lib/email-service';
import { smsNotificationService } from '@/lib/sms-notification-service';
import { pushNotificationService } from '@/lib/push-notification';
import { logger } from '@/lib/logger';
import { communicationNotificationService } from '@/lib/communication-notification';

// ---------------------------------------------------------------------------
// Event types handled by this processor
// ---------------------------------------------------------------------------

export const FLIP_EVENT_TYPES = [
  'opportunity.found',
  'flip.purchased',
  'flip.listed',
  'flip.sold',
] as const;

export type FlipEventType = (typeof FLIP_EVENT_TYPES)[number];

/** Story 10.4: Communication event types retried by this processor. */
export const MESSAGE_EVENT_TYPES = [
  'message.received',
  'message.draft_ready',
  'message.sent',
] as const;

export type MessageEventType = (typeof MESSAGE_EVENT_TYPES)[number];

/** All event types this processor handles. */
const ALL_EVENT_TYPES = [...FLIP_EVENT_TYPES, ...MESSAGE_EVENT_TYPES];

// ---------------------------------------------------------------------------
// Configuration constants (overridable via environment variables)
// ---------------------------------------------------------------------------

/* istanbul ignore next -- trivial env var defaults */
const BATCH_SIZE = parseInt(process.env.NOTIFICATION_PROCESSOR_BATCH_SIZE ?? '50', 10);
/* istanbul ignore next -- trivial env var defaults */
const MAX_RETRIES = parseInt(process.env.NOTIFICATION_PROCESSOR_MAX_RETRIES ?? '3', 10);
/* istanbul ignore next -- trivial env var defaults */
const SEND_DELAY_MS = parseInt(process.env.NOTIFICATION_PROCESSOR_SEND_DELAY_MS ?? '100', 10);
/* istanbul ignore next -- trivial env var defaults */
const MAX_DURATION_MS = parseInt(process.env.NOTIFICATION_PROCESSOR_MAX_DURATION_MS ?? '240000', 10);
/* istanbul ignore next -- trivial env var defaults */
const MAX_EMAILS_PER_USER_PER_HOUR = parseInt(
  process.env.NOTIFICATION_PROCESSOR_MAX_EMAILS_PER_USER_PER_HOUR ?? '10',
  10
);
/* istanbul ignore next -- trivial env var defaults */
const PROVIDER_FAILURE_THRESHOLD = parseInt(
  process.env.NOTIFICATION_PROVIDER_FAILURE_THRESHOLD ?? '3',
  10
);
/* istanbul ignore next -- trivial env var defaults */
const MAX_EVENT_AGE_HOURS = parseInt(process.env.NOTIFICATION_MAX_EVENT_AGE_HOURS ?? '48', 10);
/* istanbul ignore next -- trivial env var defaults */
const OPPORTUNITY_DIGEST_THRESHOLD = parseInt(
  process.env.OPPORTUNITY_DIGEST_THRESHOLD ?? '5',
  10
);

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface ProcessingResult {
  processed: number;
  sent: number;
  skipped: {
    preferenceDisabled: number;
    frequencyDeferred: number;
    rateLimited: number;
    stale: number;
    userDeleted: number;
  };
  failed: number;
  errors: Array<{ eventId: string; error: string }>;
}

// ---------------------------------------------------------------------------
// Preference mapping
// ---------------------------------------------------------------------------

/** Map event type → user settings toggle field (flip events only). */
function getPreferenceField(eventType: string): 'notifyNewDeals' | 'notifySoldItems' {
  if (eventType === 'opportunity.found') return 'notifyNewDeals';
  return 'notifySoldItems'; // flip.purchased, flip.listed, flip.sold
}

/** Returns true when the event type is a communication (message.*) event. */
function isMessageEvent(eventType: string): boolean {
  return (MESSAGE_EVENT_TYPES as readonly string[]).includes(eventType);
}

// ---------------------------------------------------------------------------
// Payload type (matches what event creators store)
// ---------------------------------------------------------------------------

interface EventPayload {
  platform?: string;
  askingPrice?: number;
  estimatedValue?: number;
  profitPotential?: number;
  valueScore?: number;
  flippabilityLabel?: string;
  listingTitle?: string;
  imageUrl?: string;
  purchasePrice?: number;
  estimatedProfit?: number;
  destinationPlatform?: string;
  listingUrl?: string;
  salePrice?: number;
  actualProfit?: number;
  roiPercent?: number;
  daysToFlip?: number;
  resendMessageId?: string;
  processedAction?: string;
  skippedReason?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Core processor
// ---------------------------------------------------------------------------

export async function processFlipLifecycleNotifications(): Promise<ProcessingResult> {
  const done = logger.timed('notification.flip_lifecycle.processing');
  const startTime = Date.now();

  const result: ProcessingResult = {
    processed: 0,
    sent: 0,
    skipped: {
      preferenceDisabled: 0,
      frequencyDeferred: 0,
      rateLimited: 0,
      stale: 0,
      userDeleted: 0,
    },
    failed: 0,
    errors: [],
  };

  // Track per-user email count in this run for rate limiting
  const userEmailCountThisRun = new Map<string, number>();
  let consecutiveFailures = 0;
  let lastErrorClass = '';

  // Stale threshold
  const staleThreshold = new Date(Date.now() - MAX_EVENT_AGE_HOURS * 60 * 60 * 1000);

  // Fetch PENDING + retry-eligible FAILED events (flip + message types)
  const events = await prisma.notificationEvent.findMany({
    where: {
      eventType: { in: [...ALL_EVENT_TYPES] },
      OR: [
        { status: 'PENDING', createdAt: { gt: staleThreshold } },
        {
          status: 'FAILED',
          retryCount: { lt: MAX_RETRIES },
          createdAt: { gt: staleThreshold },
        },
      ],
    },
    include: {
      user: {
        include: {
          settings: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
    take: BATCH_SIZE,
  });

  // Also find stale events to mark them (include PROCESSING to recover from crashed runs)
  const staleEvents = await prisma.notificationEvent.findMany({
    where: {
      eventType: { in: [...ALL_EVENT_TYPES] },
      status: { in: ['PENDING', 'PROCESSING', 'FAILED'] },
      createdAt: { lte: staleThreshold },
    },
    select: { id: true },
    take: BATCH_SIZE,
  });

  // Mark stale events
  if (staleEvents.length > 0) {
    await prisma.notificationEvent.updateMany({
      where: { id: { in: staleEvents.map((e) => e.id) } },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });
    result.skipped.stale += staleEvents.length;
    result.processed += staleEvents.length;
    logger.info('notification.stale_events_skipped', { count: staleEvents.length });
  }

  // Group opportunity.found events by user for digest aggregation
  const opportunityEventsByUser = new Map<string, typeof events>();
  const nonOpportunityEvents: typeof events = [];

  for (const event of events) {
    if (event.eventType === 'opportunity.found') {
      const existing = opportunityEventsByUser.get(event.userId) ?? [];
      existing.push(event);
      opportunityEventsByUser.set(event.userId, existing);
    } else {
      nonOpportunityEvents.push(event);
    }
  }

  // Build final ordered event list with digest aggregation
  const eventsToProcess: Array<{
    event: (typeof events)[0];
    isDigest: boolean;
    digestEvents?: typeof events;
  }> = [];

  // Handle opportunity events — aggregate into digest if > threshold
  for (const [, userOpEvents] of opportunityEventsByUser) {
    if (userOpEvents.length > OPPORTUNITY_DIGEST_THRESHOLD) {
      // Send digest for this user, mark all as processed
      eventsToProcess.push({
        event: userOpEvents[0], // Use first event as representative
        isDigest: true,
        digestEvents: userOpEvents,
      });
    } else {
      for (const event of userOpEvents) {
        eventsToProcess.push({ event, isDigest: false });
      }
    }
  }

  // Add non-opportunity events
  for (const event of nonOpportunityEvents) {
    eventsToProcess.push({ event, isDigest: false });
  }

  // Query recent email sends per user for rate limiting
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentSendCounts = await prisma.notificationEvent.groupBy({
    by: ['userId'],
    where: {
      eventType: { in: [...ALL_EVENT_TYPES] },
      status: 'PROCESSED',
      processedAt: { gte: oneHourAgo },
    },
    _count: { id: true },
  });
  const recentEmailsByUser = new Map(
    recentSendCounts.map((r) => [r.userId, r._count.id])
  );

  // Process each event
  for (const { event, isDigest, digestEvents } of eventsToProcess) {
    // Check max duration
    if (Date.now() - startTime > MAX_DURATION_MS) {
      logger.warn('notification.max_duration_reached', {
        elapsedMs: Date.now() - startTime,
        eventsRemaining: eventsToProcess.length - result.processed,
      });
      break;
    }

    // Check circuit breaker
    if (consecutiveFailures >= PROVIDER_FAILURE_THRESHOLD) {
      logger.error('notification.provider.circuit_breaker', {
        failureCount: consecutiveFailures,
        errorClass: lastErrorClass,
        eventsRemaining: eventsToProcess.length - result.processed,
      });
      break;
    }

    const eventStartTime = Date.now();

    try {
      // Check user existence
      if (!event.user) {
        await markProcessed(event.id, 'PENDING', { processedAction: 'skipped', skippedReason: 'user_deleted' });
        result.skipped.userDeleted++;
        result.processed++;
        logEventProcessed(event, 'skipped', 'user_deleted', eventStartTime);
        continue;
      }

      const user = event.user;
      const settings = user.settings;

      // When processing a digest, skip-counters increase by the full digest
      // size; otherwise, by 1. digestEvents is always set when isDigest is true.
      const skipCount = isDigest && digestEvents ? digestEvents.length : 1;

      const skipDigestOrSingle = async (reason: string): Promise<void> => {
        if (isDigest && digestEvents) {
          await markDigestProcessed(digestEvents, { processedAction: 'skipped', skippedReason: reason });
        } else {
          await markProcessed(event.id, event.status, { processedAction: 'skipped', skippedReason: reason });
        }
      };

      // Check master email toggle
      if (!settings?.emailNotifications) {
        await skipDigestOrSingle('preference_disabled');
        result.skipped.preferenceDisabled += skipCount;
        result.processed += skipCount;
        logEventProcessed(event, 'skipped', 'preference_disabled', eventStartTime);
        continue;
      }

      // Check type-specific toggle (flip events only; message events gate in their service)
      if (!isMessageEvent(event.eventType)) {
        const prefField = getPreferenceField(event.eventType);
        if (settings[prefField] === false) {
          await skipDigestOrSingle('preference_disabled');
          result.skipped.preferenceDisabled += skipCount;
          result.processed += skipCount;
          logEventProcessed(event, 'skipped', 'preference_disabled', eventStartTime);
          continue;
        }

        // Check notifyFrequency for opportunity.found events
        if (
          event.eventType === 'opportunity.found' &&
          settings.notifyFrequency &&
          settings.notifyFrequency !== 'instant'
        ) {
          await skipDigestOrSingle('deferred_to_digest');
          result.skipped.frequencyDeferred += skipCount;
          result.processed += skipCount;
          logEventProcessed(event, 'skipped', 'deferred_to_digest', eventStartTime);
          continue;
        }
      }

      // Per-user rate limiting
      const recentCount = (recentEmailsByUser.get(event.userId) ?? 0) +
        (userEmailCountThisRun.get(event.userId) ?? 0);
      if (recentCount >= MAX_EMAILS_PER_USER_PER_HOUR) {
        // Leave PENDING — do not mark as FAILED and do NOT count as processed.
        // These events are deferred to the next run, not handled in this one.
        result.skipped.rateLimited += skipCount;
        logEventProcessed(event, 'skipped', 'rate_limited', eventStartTime);
        continue;
      }

      // Idempotency guard — check if already sent (resendMessageId exists)
      const payload = event.payload as EventPayload;
      if (payload.resendMessageId) {
        await markProcessed(event.id, event.status, { processedAction: 'skipped', skippedReason: 'already_sent' });
        result.processed++;
        logEventProcessed(event, 'skipped', 'already_sent', eventStartTime);
        continue;
      }

      // Optimistic locking — try to claim the event
      const claimed = await prisma.notificationEvent.updateMany({
        where: { id: event.id, status: event.status },
        data: { status: 'PROCESSING' },
      });
      if (claimed.count === 0) {
        // Another run claimed it
        result.processed++;
        continue;
      }

      // Story 11.3: fire push INDEPENDENTLY of the email branch so that
      // "push only" scenarios (email disabled, push enabled) work correctly.
      // The push service gates on pushNotifications master + per-event toggle.
      /* istanbul ignore next -- fire-and-forget; rejection is intentionally swallowed */
      void dispatchLifecyclePush(event).catch(() => undefined);

      // Send email
      let sendResult;
      if (isDigest && digestEvents) {
        sendResult = await sendDigestEmail(user, digestEvents);
      } else {
        sendResult = await sendLifecycleEmail(user, event);
      }

      if (sendResult.success) {
        // Story 11.2: fire-and-forget SMS alongside email. The SMS service
        // swallows all errors internally and gates on phoneVerified +
        // smsNotifications. Fired as a secondary channel AFTER email
        // succeeds — SMS failure must never affect email processing.
        /* istanbul ignore next -- fire-and-forget; rejection is intentionally swallowed */
        void dispatchLifecycleSms(event).catch(() => undefined);

        // Mark all events as processed
        if (isDigest && digestEvents) {
          await markDigestProcessed(digestEvents, {
            processedAction: 'sent',
            resendMessageId: sendResult.messageId,
          });
        } else {
          await prisma.notificationEvent.update({
            where: { id: event.id },
            data: {
              status: 'PROCESSED',
              processedAt: new Date(),
              payload: {
                ...(event.payload as object),
                processedAction: 'sent',
                resendMessageId: sendResult.messageId,
              },
            },
          });
        }
        result.sent++;
        result.processed += skipCount;
        userEmailCountThisRun.set(
          event.userId,
          (userEmailCountThisRun.get(event.userId) ?? 0) + 1
        );
        consecutiveFailures = 0;
        logEventProcessed(event, 'sent', undefined, eventStartTime, sendResult.messageId);
      } else {
        // Determine if this is a rate limit (429) from provider.
        // EmailService always returns an error string on failure, so the
        // `?? 'unknown'` fallback is defensive only.
        /* istanbul ignore next -- emailService always returns error on failure */
        const errorStr = sendResult.error ?? 'unknown';
        const isRateLimit = errorStr.includes('429');
        const errorClass = isRateLimit ? '429' : errorStr.slice(0, 50);

        if (isRateLimit) {
          // Leave as PENDING — do NOT increment retryCount
          await prisma.notificationEvent.update({
            where: { id: event.id },
            data: { status: 'PENDING' },
          });
        } else {
          // Increment retryCount and set FAILED
          await prisma.notificationEvent.update({
            where: { id: event.id },
            data: {
              status: 'FAILED',
              retryCount: event.retryCount + 1,
              errorMessage: errorStr.slice(0, 500),
            },
          });
        }

        result.failed++;
        result.processed++;
        result.errors.push({ eventId: event.id, error: errorStr });
        consecutiveFailures++;
        lastErrorClass = errorClass;
        logEventProcessed(event, 'failed', errorStr, eventStartTime);
      }

      // Inter-email delay
      /* istanbul ignore next -- SEND_DELAY_MS set to 0 in tests to avoid timer blocking */
      if (SEND_DELAY_MS > 0) {
        await sleep(SEND_DELAY_MS);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      // Try to mark event as failed
      try {
        await prisma.notificationEvent.update({
          where: { id: event.id },
          data: {
            status: 'FAILED',
            retryCount: event.retryCount + 1,
            errorMessage: errorMsg.slice(0, 500),
          },
        });
      } catch {
        // Status update failed — leave it for the next run
      }

      result.failed++;
      result.processed++;
      result.errors.push({ eventId: event.id, error: errorMsg });
      consecutiveFailures++;
      lastErrorClass = errorMsg.slice(0, 50);
      logEventProcessed(event, 'failed', errorMsg, eventStartTime);
    }
  }

  // Check if failure rate > 50%
  if (result.sent + result.failed > 0 && result.failed / (result.sent + result.failed) > 0.5) {
    logger.error('notification.delivery.degraded', {
      sent: result.sent,
      failed: result.failed,
      failureRate: (result.failed / (result.sent + result.failed) * 100).toFixed(1) + '%',
    });
  }

  done();

  logger.info('notification.flip_lifecycle.complete', {
    processed: result.processed,
    sent: result.sent,
    skipped: result.skipped,
    failed: result.failed,
    errorCount: result.errors.length,
  });

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/* istanbul ignore next -- only reached when SEND_DELAY_MS > 0, which tests disable */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function markProcessed(
  eventId: string,
  currentStatus: string,
  metadata: Record<string, unknown>
): Promise<void> {
  await prisma.notificationEvent.updateMany({
    where: { id: eventId, status: currentStatus },
    data: {
      status: 'PROCESSED',
      processedAt: new Date(),
    },
  });
  // Store metadata in payload via a separate update since updateMany can't do JSON merge
  /* istanbul ignore else -- metadata is always non-empty from callers */
  if (Object.keys(metadata).length > 0) {
    try {
      const current = await prisma.notificationEvent.findUnique({
        where: { id: eventId },
        select: { payload: true },
      });
      // Use updateMany with status guard to avoid overwriting concurrent state
      // changes that may have occurred between the status update and this write.
      await prisma.notificationEvent.updateMany({
        where: { id: eventId, status: 'PROCESSED' },
        data: {
          payload: { ...(current?.payload as object ?? {}), ...metadata } as unknown as Prisma.InputJsonValue,
        },
      });
    } catch {
      // Non-critical — metadata not saved but event is processed
    }
  }
}

async function markDigestProcessed(
  events: Array<{ id: string; status: string; payload: unknown }>,
  metadata: Record<string, unknown>
): Promise<void> {
  await prisma.notificationEvent.updateMany({
    where: { id: { in: events.map((e) => e.id) } },
    data: {
      status: 'PROCESSED',
      processedAt: new Date(),
    },
  });
  // Write metadata (including resendMessageId) into each event's payload so
  // the idempotency guard can detect already-sent digests if events are retried.
  if (Object.keys(metadata).length > 0) {
    await Promise.allSettled(
      events.map((e) =>
        prisma.notificationEvent.updateMany({
          where: { id: e.id, status: 'PROCESSED' },
          data: {
            payload: {
              ...(e.payload as object ?? {}),
              ...metadata,
            } as unknown as Prisma.InputJsonValue,
          },
        })
      )
    );
  }
}

function logEventProcessed(
  event: { id: string; eventType: string; userId: string },
  action: string,
  reason?: string,
  startTime?: number,
  resendMessageId?: string
): void {
  logger.info('notification.processed', {
    eventId: event.id,
    eventType: event.eventType,
    userId: event.userId,
    action,
    reason,
    resendMessageId,
    duration: startTime ? Date.now() - startTime : undefined,
  });
}

// ---------------------------------------------------------------------------
// Email dispatch — routes event to correct sender method
// ---------------------------------------------------------------------------

interface UserWithSettings {
  id: string;
  email: string;
  name?: string | null;
  settings?: {
    emailNotifications?: boolean;
    notifyNewDeals?: boolean;
    notifySoldItems?: boolean;
    notifyFrequency?: string | null;
    notifyMessageReceived?: boolean;
    notifyDraftReady?: boolean;
    notifyMessageSent?: boolean;
  } | null;
}

async function sendLifecycleEmail(
  user: UserWithSettings,
  event: { eventType: string; payload: unknown; createdAt: Date; listingId?: string | null }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const payload = event.payload as EventPayload;

  // Route message.* events to CommunicationNotificationService which owns
  // their templates, per-event toggles, and circuit breaker.
  if (isMessageEvent(event.eventType)) {
    try {
      switch (event.eventType) {
        case 'message.received':
          await communicationNotificationService.notifyMessageReceived({
            userId: user.id,
            listingId: event.listingId,
            listingTitle: payload.listingTitle,
            sellerName: payload.sellerName as string | undefined,
            messagePreview: (payload.messagePreview as string | undefined) ?? '',
          });
          break;
        case 'message.draft_ready':
          await communicationNotificationService.notifyDraftReady({
            userId: user.id,
            listingId: event.listingId,
            listingTitle: payload.listingTitle,
            draftPreview: (payload.draftPreview as string | undefined) ?? '',
          });
          break;
        case 'message.sent':
          await communicationNotificationService.notifyMessageSent({
            userId: user.id,
            listingId: event.listingId,
            listingTitle: payload.listingTitle,
            messagePreview: (payload.messagePreview as string | undefined) ?? '',
            deliveryStatus: payload.deliveryStatus as string | undefined,
          });
          break;
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  switch (event.eventType) {
    case 'opportunity.found':
      return emailService.sendOpportunityFound(user.email, {
        name: user.name ?? undefined,
        platform: payload.platform ?? 'Unknown',
        buyPrice: payload.askingPrice ?? 0,
        estimatedProfit: payload.profitPotential ?? 0,
        flippabilityScore: payload.valueScore ?? 0,
        flippabilityLabel: payload.flippabilityLabel ?? 'Unknown',
        itemTitle: payload.listingTitle ?? 'Unknown Item',
        imageUrl: payload.imageUrl,
        eventCreatedAt: event.createdAt,
      });

    case 'flip.purchased':
      return emailService.sendFlipPurchased(user.email, {
        name: user.name ?? undefined,
        itemTitle: payload.listingTitle ?? 'Unknown Item',
        purchasePrice: payload.purchasePrice ?? 0,
        estimatedProfit: payload.estimatedProfit ?? 0,
        platform: payload.platform ?? 'Unknown',
        eventCreatedAt: event.createdAt,
      });

    case 'flip.listed':
      return emailService.sendFlipListed(user.email, {
        name: user.name ?? undefined,
        itemTitle: payload.listingTitle ?? 'Unknown Item',
        destinationPlatform: payload.destinationPlatform ?? 'Unknown',
        listingUrl: payload.listingUrl,
        eventCreatedAt: event.createdAt,
      });

    case 'flip.sold':
      return emailService.sendFlipSold(user.email, {
        name: user.name ?? undefined,
        itemTitle: payload.listingTitle ?? 'Unknown Item',
        salePrice: payload.salePrice ?? 0,
        actualProfit: payload.actualProfit ?? 0,
        roiPercent: payload.roiPercent ?? 0,
        daysToFlip: payload.daysToFlip,
        platform: payload.platform ?? 'Unknown',
        purchasePrice: payload.purchasePrice ?? 0,
        eventCreatedAt: event.createdAt,
      });

    /* istanbul ignore next -- defensive: findMany filters by FLIP_EVENT_TYPES, unreachable */
    default:
      return { success: false, error: `Unknown event type: ${event.eventType}` };
  }
}

/**
 * Story 11.3: Dispatch push notification for a single flip lifecycle event.
 * Fire-and-forget — errors are swallowed by pushNotificationService itself.
 * Gated internally by per-event pushNotify* toggle.
 */
async function dispatchLifecyclePush(
  event: { eventType: string; payload: unknown; userId: string }
): Promise<void> {
  const payload = event.payload as EventPayload;
  const title = payload.listingTitle ?? 'Unknown Item';
  switch (event.eventType) {
    case 'opportunity.found':
      return pushNotificationService.sendToUser(
        event.userId,
        { title: '🎯 New Flip Opportunity', body: `${title} — Est. profit $${Math.round(payload.profitPotential ?? 0)}` },
        'newDeals'
      );
    case 'flip.purchased':
      return pushNotificationService.sendToUser(
        event.userId,
        { title: '📦 Flip Purchased', body: `${title} marked as purchased` },
        'soldItems'
      );
    case 'flip.listed':
      return pushNotificationService.sendToUser(
        event.userId,
        { title: '🏷️ Flip Listed', body: `${title} is now listed` },
        'soldItems'
      );
    case 'flip.sold':
      return pushNotificationService.sendToUser(
        event.userId,
        { title: '💰 Flip Sold!', body: `${title} sold for $${Math.round(payload.salePrice ?? 0)}` },
        'soldItems'
      );
    /* istanbul ignore next -- defensive: findMany filters by FLIP_EVENT_TYPES, unreachable */
    default:
      return;
  }
}

/**
 * Story 11.2: Dispatch SMS alongside email for a single flip lifecycle event.
 * Fire-and-forget — errors are swallowed by smsNotificationService itself.
 * Skips digest dispatch because SMS isn't suitable for multi-item summaries.
 */
async function dispatchLifecycleSms(
  event: { eventType: string; payload: unknown; userId: string }
): Promise<void> {
  const payload = event.payload as EventPayload;
  const listingTitle = payload.listingTitle ?? 'Unknown Item';

  switch (event.eventType) {
    case 'opportunity.found':
      return smsNotificationService.notifyNewDeal({
        userId: event.userId,
        listingTitle,
        askingPrice: payload.askingPrice ?? 0,
        estimatedProfit: payload.profitPotential ?? 0,
      });
    case 'flip.purchased':
      return smsNotificationService.notifyFlipLifecycle({
        userId: event.userId,
        listingTitle,
        newStatus: 'purchased',
      });
    case 'flip.listed':
      return smsNotificationService.notifyFlipLifecycle({
        userId: event.userId,
        listingTitle,
        newStatus: 'listed',
      });
    case 'flip.sold':
      return smsNotificationService.notifyFlipLifecycle({
        userId: event.userId,
        listingTitle,
        newStatus: 'sold',
      });
    /* istanbul ignore next -- defensive: findMany filters by FLIP_EVENT_TYPES, unreachable */
    default:
      return;
  }
}

async function sendDigestEmail(
  user: UserWithSettings,
  events: Array<{ payload: unknown; createdAt: Date }>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Sort by valueScore descending and pick top 5
  const sortedPayloads = events
    .map((e) => e.payload as EventPayload)
    .sort((a, b) => (b.valueScore ?? 0) - (a.valueScore ?? 0))
    .slice(0, 5);

  const opportunities = sortedPayloads.map((p) => ({
    title: p.listingTitle ?? 'Unknown Item',
    price: p.askingPrice ?? 0,
    estimatedResaleValue: p.estimatedValue ?? 0,
    profit: p.profitPotential ?? 0,
    profitPercent: p.askingPrice && p.askingPrice > 0
      ? ((p.profitPotential ?? 0) / p.askingPrice) * 100
      : 0,
    marketplace: p.platform ?? 'Unknown',
    url: '', // No direct URL from payload
  }));

  return emailService.sendDigest({
    name: user.name ?? undefined,
    email: user.email,
    opportunities,
    totalScanned: events.length,
    scanDate: new Date().toLocaleDateString(),
  });
}
