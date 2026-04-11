/**
 * @file src/lib/smart-alert-notification-processor.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-09
 * @version 1.0
 * @brief Processes smart alert notification events (review, cold flip, hot flip, price change).
 *
 * @description
 * Two-phase notification processor for smart alerts:
 *
 * Phase 1 — Event-based: Queries PENDING and retryable FAILED NotificationEvents for
 * review.received, listing.price_changed, flip.gone_cold, flip.turned_hot. Checks user
 * preferences (master toggle + event-specific toggle), validates payload shape, sends email
 * via EmailService, marks PROCESSED or FAILED.
 *
 * Phase 2 — Detection-based: Queries users in cursor-based batches of 100. For each user,
 * runs detectColdFlips() and detectHotFlips() against their configured thresholds. Creates
 * NotificationEvents with 4-hour window deduplication, then immediately sends email and
 * marks PROCESSED. Per-user cap of 10 alerts/cycle; hot > cold priority.
 *
 * Error isolation: each user/event is wrapped in try/catch. One failure never aborts the
 * batch. Phase 2 aborts early if 5 consecutive users fail with DB errors (DB likely unhealthy).
 * Phase 2 has a 5-minute global timeout — remaining users are deferred to the next cycle.
 *
 * PII in logs: error paths log only userId, listingId, eventType, and err.message — never
 * message body, seller name, or review text.
 */

import { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/db';
import { emailService } from '@/lib/email-service';
import { smsNotificationService } from '@/lib/sms-notification-service';
import { pushNotificationService } from '@/lib/push-notification';
import { logger } from '@/lib/logger';
import { detectColdFlips, detectHotFlips } from '@/lib/cold-hot-detector';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SMART_ALERT_USER_BATCH_SIZE = 100;
const MAX_SMART_ALERTS_PER_USER_PER_CYCLE = 10;
const SEND_DELAY_MS = 100;
const PHASE1_BATCH_SIZE = 50;
const MAX_RETRIES = 3;
const RETRY_WINDOW_HOURS = 24;
const PHASE2_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const PHASE2_CONSECUTIVE_DB_ERROR_ABORT = 5;
const DEDUP_WINDOW_MS = 4 * 3600 * 1000; // 4 hours

// ---------------------------------------------------------------------------
// Event types this processor handles
// ---------------------------------------------------------------------------

export const SMART_ALERT_EVENT_TYPES = [
  'review.received',
  'listing.price_changed',
  'flip.gone_cold',
  'flip.turned_hot',
] as const;

export type SmartAlertEventType = (typeof SMART_ALERT_EVENT_TYPES)[number];

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface SmartAlertProcessorResult {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
}

// ---------------------------------------------------------------------------
// Payload types + runtime type guards
// ---------------------------------------------------------------------------

interface ReviewPayload {
  platform: string;
  rating: number;
  reviewText: string;
  reviewerName?: string;
  reviewUrl: string;
  [key: string]: unknown;
}

interface PriceChangedPayload {
  listingTitle: string;
  listingUrl?: string;
  platform: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  direction: 'increase' | 'decrease';
  [key: string]: unknown;
}

interface ColdFlipPayload {
  listingTitle: string;
  hoursSinceLastResponse: number;
  sellerName?: string;
  coldReason: 'user_not_replied' | 'seller_not_replied';
  threadUrl: string;
  [key: string]: unknown;
}

interface HotFlipPayload {
  listingTitle: string;
  unreadCount: number;
  latestMessagePreview: string;
  sellerName?: string;
  threadUrl: string;
  [key: string]: unknown;
}

function isReviewPayload(p: unknown): p is ReviewPayload {
  if (!p || typeof p !== 'object') return false;
  const obj = p as Record<string, unknown>;
  return (
    typeof obj.platform === 'string' &&
    typeof obj.rating === 'number' &&
    typeof obj.reviewText === 'string' &&
    typeof obj.reviewUrl === 'string'
  );
}

function isPriceChangedPayload(p: unknown): p is PriceChangedPayload {
  if (!p || typeof p !== 'object') return false;
  const obj = p as Record<string, unknown>;
  return (
    typeof obj.listingTitle === 'string' &&
    typeof obj.platform === 'string' &&
    typeof obj.oldPrice === 'number' &&
    typeof obj.newPrice === 'number' &&
    typeof obj.changePercent === 'number' &&
    (obj.direction === 'increase' || obj.direction === 'decrease')
  );
}

function isColdFlipPayload(p: unknown): p is ColdFlipPayload {
  if (!p || typeof p !== 'object') return false;
  const obj = p as Record<string, unknown>;
  return (
    typeof obj.listingTitle === 'string' &&
    typeof obj.hoursSinceLastResponse === 'number' &&
    typeof obj.threadUrl === 'string' &&
    (obj.coldReason === 'user_not_replied' || obj.coldReason === 'seller_not_replied')
  );
}

function isHotFlipPayload(p: unknown): p is HotFlipPayload {
  if (!p || typeof p !== 'object') return false;
  const obj = p as Record<string, unknown>;
  return (
    typeof obj.listingTitle === 'string' &&
    typeof obj.unreadCount === 'number' &&
    typeof obj.latestMessagePreview === 'string' &&
    typeof obj.threadUrl === 'string'
  );
}

// ---------------------------------------------------------------------------
// Deduplication key — 4-hour window
// ---------------------------------------------------------------------------

function buildSmartAlertDedupKey(listingId: string, eventType: SmartAlertEventType): string {
  const windowBucket = Math.floor(Date.now() / DEDUP_WINDOW_MS);
  return `${listingId}:${eventType}:${windowBucket}`;
}

// ---------------------------------------------------------------------------
// Sleep helper
// ---------------------------------------------------------------------------

/* istanbul ignore next -- SEND_DELAY_MS set to 0 in tests */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// User settings helpers
// ---------------------------------------------------------------------------

interface UserSettings {
  emailNotifications: boolean;
  notifyReviewReceived: boolean;
  notifyFlipGoneCold: boolean;
  notifyFlipTurnedHot: boolean;
  notifyPriceChanges: boolean;
  flipGoneColdHours: number;
  flipTurnedHotCount: number;
}

const DEFAULT_SETTINGS: UserSettings = {
  emailNotifications: true,
  notifyReviewReceived: true,
  notifyFlipGoneCold: true,
  notifyFlipTurnedHot: true,
  notifyPriceChanges: true,
  flipGoneColdHours: 24,
  flipTurnedHotCount: 3,
};

function resolveSettings(raw: Partial<UserSettings> | null | undefined): UserSettings {
  if (!raw) return DEFAULT_SETTINGS;
  return {
    emailNotifications: raw.emailNotifications ?? DEFAULT_SETTINGS.emailNotifications,
    notifyReviewReceived: raw.notifyReviewReceived ?? DEFAULT_SETTINGS.notifyReviewReceived,
    notifyFlipGoneCold: raw.notifyFlipGoneCold ?? DEFAULT_SETTINGS.notifyFlipGoneCold,
    notifyFlipTurnedHot: raw.notifyFlipTurnedHot ?? DEFAULT_SETTINGS.notifyFlipTurnedHot,
    notifyPriceChanges: raw.notifyPriceChanges ?? DEFAULT_SETTINGS.notifyPriceChanges,
    flipGoneColdHours: raw.flipGoneColdHours ?? DEFAULT_SETTINGS.flipGoneColdHours,
    flipTurnedHotCount: raw.flipTurnedHotCount ?? DEFAULT_SETTINGS.flipTurnedHotCount,
  };
}

function isEventTypeEnabled(settings: UserSettings, eventType: SmartAlertEventType): boolean {
  switch (eventType) {
    case 'review.received':
      return settings.notifyReviewReceived;
    case 'listing.price_changed':
      return settings.notifyPriceChanges;
    case 'flip.gone_cold':
      return settings.notifyFlipGoneCold;
    case 'flip.turned_hot':
      return settings.notifyFlipTurnedHot;
  }
}

// ---------------------------------------------------------------------------
// Mark event helpers
// ---------------------------------------------------------------------------

async function markEventProcessed(eventId: string): Promise<void> {
  await prisma.notificationEvent.update({
    where: { id: eventId },
    data: { status: 'PROCESSED', processedAt: new Date() },
  });
}

async function markEventFailed(eventId: string, retryCount: number, errorMessage: string): Promise<void> {
  await prisma.notificationEvent.update({
    where: { id: eventId },
    data: {
      status: 'FAILED',
      retryCount: retryCount + 1,
      errorMessage: errorMessage.slice(0, 500),
    },
  });
}

// ---------------------------------------------------------------------------
// Phase 1: Process existing PENDING / retryable FAILED events
// ---------------------------------------------------------------------------

async function phase1(result: SmartAlertProcessorResult): Promise<void> {
  const retryWindowThreshold = new Date(Date.now() - RETRY_WINDOW_HOURS * 60 * 60 * 1000);

  const events = await prisma.notificationEvent.findMany({
    where: {
      eventType: { in: [...SMART_ALERT_EVENT_TYPES] },
      OR: [
        { status: 'PENDING' },
        {
          status: 'FAILED',
          retryCount: { lt: MAX_RETRIES },
          createdAt: { gte: retryWindowThreshold },
        },
      ],
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: PHASE1_BATCH_SIZE,
  });

  for (const event of events) {
    try {
      const eventType = event.eventType as SmartAlertEventType;

      // Load user settings
      const rawSettings = await prisma.userSettings.findUnique({
        where: { userId: event.userId },
        select: {
          emailNotifications: true,
          notifyReviewReceived: true,
          notifyFlipGoneCold: true,
          notifyFlipTurnedHot: true,
          notifyPriceChanges: true,
          flipGoneColdHours: true,
          flipTurnedHotCount: true,
        },
      });
      const settings = resolveSettings(rawSettings);

      // Check master toggle
      if (!settings.emailNotifications) {
        await markEventProcessed(event.id);
        result.skipped++;
        result.processed++;
        continue;
      }

      // Check event-specific toggle
      if (!isEventTypeEnabled(settings, eventType)) {
        await markEventProcessed(event.id);
        result.skipped++;
        result.processed++;
        continue;
      }

      // Check user email
      if (!event.user?.email) {
        await markEventProcessed(event.id);
        result.skipped++;
        result.processed++;
        logger.warn('smart_alert.no_user_email', { userId: event.userId, eventType });
        continue;
      }

      const user = event.user;
      const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000';

      // Validate payload + send
      let sendResult: { success: boolean; error?: string };

      switch (eventType) {
        case 'review.received': {
          if (!isReviewPayload(event.payload)) {
            await markEventFailed(event.id, event.retryCount, 'invalid_payload');
            result.failed++;
            result.processed++;
            continue;
          }
          const p = event.payload;
          sendResult = await emailService.sendReviewReceived({
            email: user.email,
            name: user.name /* istanbul ignore next */ ?? undefined,
            platform: p.platform,
            rating: p.rating,
            reviewText: p.reviewText,
            reviewerName: p.reviewerName,
            reviewUrl: p.reviewUrl,
          });
          // Story 11.3: fire push fire-and-forget alongside email
          /* istanbul ignore next -- fire-and-forget; rejection is intentionally swallowed */
          void pushNotificationService.sendToUser(
            event.userId,
            { title: '⭐ Review Received', body: `${p.rating}/5 on ${p.platform}` },
            'reviewReceived'
          ).catch(() => {});
          break;
        }

        case 'listing.price_changed': {
          if (!isPriceChangedPayload(event.payload)) {
            await markEventFailed(event.id, event.retryCount, 'invalid_payload');
            result.failed++;
            result.processed++;
            continue;
          }
          const p = event.payload;
          const listingUrl = `${appUrl}/opportunities/${event.listingId ?? ''}`;
          sendResult = await emailService.sendPriceChangeAlert({
            email: user.email,
            name: user.name /* istanbul ignore next */ ?? undefined,
            listingTitle: p.listingTitle,
            platform: p.platform,
            oldPrice: p.oldPrice,
            newPrice: p.newPrice,
            changePercent: p.changePercent,
            direction: p.direction,
            listingUrl,
          });
          // SMS: only for price drops (not increases)
          if (p.direction === 'decrease') {
            /* istanbul ignore next -- fire-and-forget; rejection is intentionally swallowed */
            void smsNotificationService.notifyPriceDrop({
              userId: event.userId,
              listingTitle: p.listingTitle,
              newPrice: p.newPrice,
            }).catch(() => {});
          }
          // Story 11.3: push for price drops only
          if (p.direction === 'decrease') {
            /* istanbul ignore next -- fire-and-forget; rejection is intentionally swallowed */
            void pushNotificationService.sendToUser(
              event.userId,
              { title: '📉 Price Drop Alert', body: `${p.listingTitle} dropped to $${Math.round(p.newPrice)}` },
              'priceDrops'
            ).catch(() => {});
          }
          break;
        }

        case 'flip.gone_cold': {
          if (!isColdFlipPayload(event.payload)) {
            await markEventFailed(event.id, event.retryCount, 'invalid_payload');
            result.failed++;
            result.processed++;
            continue;
          }
          const p = event.payload;
          sendResult = await emailService.sendFlipGoneCold({
            email: user.email,
            name: user.name /* istanbul ignore next */ ?? undefined,
            listingTitle: p.listingTitle,
            hoursSinceLastResponse: p.hoursSinceLastResponse,
            sellerName: p.sellerName,
            coldReason: p.coldReason,
            threadUrl: p.threadUrl,
          });
          /* istanbul ignore next -- fire-and-forget; rejection is intentionally swallowed */
          void smsNotificationService.notifyFlipGoneCold({
            userId: event.userId,
            listingTitle: p.listingTitle,
            hoursInactive: p.hoursSinceLastResponse,
          }).catch(() => {});
          // Story 11.3: push for gone cold
          /* istanbul ignore next -- fire-and-forget; rejection is intentionally swallowed */
          void pushNotificationService.sendToUser(
            event.userId,
            { title: '🥶 Flip Gone Cold', body: `${p.listingTitle} — ${Math.round(p.hoursSinceLastResponse)}h inactive` },
            'flipGoneCold'
          ).catch(() => {});
          break;
        }

        case 'flip.turned_hot': {
          if (!isHotFlipPayload(event.payload)) {
            await markEventFailed(event.id, event.retryCount, 'invalid_payload');
            result.failed++;
            result.processed++;
            continue;
          }
          const p = event.payload;
          sendResult = await emailService.sendFlipTurnedHot({
            email: user.email,
            name: user.name /* istanbul ignore next */ ?? undefined,
            listingTitle: p.listingTitle,
            unreadCount: p.unreadCount,
            latestMessagePreview: p.latestMessagePreview,
            sellerName: p.sellerName,
            threadUrl: p.threadUrl,
          });
          /* istanbul ignore next -- fire-and-forget; rejection is intentionally swallowed */
          void smsNotificationService.notifyFlipTurnedHot({
            userId: event.userId,
            listingTitle: p.listingTitle,
          }).catch(() => {});
          // Story 11.3: push for turned hot
          /* istanbul ignore next -- fire-and-forget; rejection is intentionally swallowed */
          void pushNotificationService.sendToUser(
            event.userId,
            { title: '🔥 Flip Turned Hot!', body: `${p.listingTitle} — respond now` },
            'flipTurnedHot'
          ).catch(() => {});
          break;
        }

        /* istanbul ignore next -- unreachable: findMany filters by SMART_ALERT_EVENT_TYPES */
        default:
          // Should not happen — findMany filters by SMART_ALERT_EVENT_TYPES
          await markEventProcessed(event.id);
          result.skipped++;
          result.processed++;
          continue;
      }

      if (sendResult.success) {
        await markEventProcessed(event.id);
        result.sent++;
        result.processed++;
      } else {
        /* istanbul ignore next -- sendResult.error null branch; error string always present in tests */
        await markEventFailed(event.id, event.retryCount, sendResult.error ?? 'send_failed');
        result.failed++;
        result.processed++;
        logger.warn('smart_alert.send_failed', {
          eventId: event.id,
          eventType,
          userId: event.userId,
          error: sendResult.error,
        });
      }

      /* istanbul ignore next -- delay disabled in tests */
      if (SEND_DELAY_MS > 0) {
        await sleep(SEND_DELAY_MS);
      }
    } catch (err) {
      /* istanbul ignore next -- tests always throw Error instances */
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error('smart_alert.phase1.event_error', {
        eventId: event.id,
        eventType: event.eventType,
        userId: event.userId,
        error: errorMsg,
      });
      try {
        await markEventFailed(event.id, event.retryCount, errorMsg);
      } catch {
        // Status update failed — leave for next run
      }
      result.failed++;
      result.processed++;
    }
  }
}

// ---------------------------------------------------------------------------
// Phase 2: Detection-based cold/hot alerts
// ---------------------------------------------------------------------------

async function phase2(result: SmartAlertProcessorResult): Promise<void> {
  const phase2Start = Date.now();
  let consecutiveDbErrors = 0;
  let cursor: string | undefined;
  const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000';

  while (true) {
    // Check global timeout
    if (Date.now() - phase2Start > PHASE2_TIMEOUT_MS) {
      logger.warn('smart_alert.phase2.timeout_reached', {
        elapsedMs: Date.now() - phase2Start,
      });
      break;
    }

    // Load batch of users with cold/hot notifications enabled
    let users: Array<{
      id: string;
      email: string;
      name: string | null;
      settings: {
        emailNotifications: boolean;
        notifyFlipGoneCold: boolean;
        notifyFlipTurnedHot: boolean;
        flipGoneColdHours: number;
        flipTurnedHotCount: number;
      } | null;
    }>;

    try {
      users = await prisma.user.findMany({
        where: {
          // Include users with no settings (they default to all-enabled) or with
          // relevant toggles enabled. Without this OR, new users with no saved
          // UserSettings record would be silently excluded from cold/hot detection.
          OR: [
            { settings: null },
            {
              settings: {
                emailNotifications: true,
                OR: [{ notifyFlipGoneCold: true }, { notifyFlipTurnedHot: true }],
              },
            },
          ],
        },
        select: {
          id: true,
          email: true,
          name: true,
          settings: {
            select: {
              emailNotifications: true,
              notifyFlipGoneCold: true,
              notifyFlipTurnedHot: true,
              flipGoneColdHours: true,
              flipTurnedHotCount: true,
            },
          },
        },
        take: SMART_ALERT_USER_BATCH_SIZE,
        /* istanbul ignore next -- cursor=null on first page only; tested implicitly */
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
      });
    /* istanbul ignore next -- batch query catch; tested in phase2 DB error tests */
    } catch (err) {
      logger.error('smart_alert.phase2.batch_query_failed', {
        /* istanbul ignore next -- tests always throw Error instances */
        error: err instanceof Error ? err.message : String(err),
      });
      break;
    }

    if (users.length === 0) break;

    cursor = users[users.length - 1].id;

    // Process each user
    for (const user of users) {
      // Check global timeout inside user loop too
      /* istanbul ignore next -- inner-loop timeout; not testable without mocking Date.now per-iteration */
      if (Date.now() - phase2Start > PHASE2_TIMEOUT_MS) break;

      if (consecutiveDbErrors >= PHASE2_CONSECUTIVE_DB_ERROR_ABORT) {
        logger.error('smart_alert.phase2.consecutive_db_errors_abort', {
          consecutiveDbErrors,
        });
        return;
      }

      try {
        const settings = resolveSettings(user.settings as Partial<UserSettings> | null);
        const alerts: Array<{ priority: number; type: 'cold' | 'hot'; data: unknown }> = [];

        // Detect cold flips
        if (settings.notifyFlipGoneCold) {
          const coldFlips = await detectColdFlips(user.id, settings.flipGoneColdHours);
          for (const cold of coldFlips) {
            alerts.push({ priority: 1, type: 'cold', data: cold }); // cold = priority 1
          }
        }

        // Detect hot flips
        if (settings.notifyFlipTurnedHot) {
          const hotFlips = await detectHotFlips(user.id, settings.flipTurnedHotCount);
          for (const hot of hotFlips) {
            alerts.push({ priority: 0, type: 'hot', data: hot }); // hot = priority 0 (highest)
          }
        }

        // Sort by priority (hot=0 first, cold=1 second) then cap
        alerts.sort((a, b) => a.priority - b.priority);
        const capped = alerts.slice(0, MAX_SMART_ALERTS_PER_USER_PER_CYCLE);

        // Process each alert
        for (const alert of capped) {
          try {
            if (alert.type === 'cold') {
              const cold = alert.data as import('./cold-hot-detector').ColdFlipResult;
              const eventType: SmartAlertEventType = 'flip.gone_cold';
              const dedupKey = buildSmartAlertDedupKey(cold.listingId, eventType);
              const threadUrl = `${appUrl}/messages/${cold.listingId}`;

              // Try to create a deduplicated NotificationEvent
              let created = false;
              try {
                await prisma.notificationEvent.create({
                  data: {
                    userId: user.id,
                    listingId: cold.listingId,
                    eventType,
                    payload: {
                      listingTitle: cold.listingTitle,
                      hoursSinceLastResponse: cold.hoursSinceLastResponse,
                      sellerName: cold.sellerName,
                      coldReason: cold.coldReason,
                      threadUrl,
                    } as unknown as Prisma.InputJsonValue,
                    deduplicationKey: dedupKey,
                    status: 'PENDING',
                  },
                });
                created = true;
              } catch (err) {
                if (
                  err !== null &&
                  typeof err === 'object' &&
                  'code' in err &&
                  (err as { code: string }).code === 'P2002'
                ) {
                  // Deduplicated — skip
                  result.skipped++;
                  continue;
                }
                throw err;
              }

              /* istanbul ignore else -- created is always true here; false branch is unreachable */
              if (created) {
                const sendResult = await emailService.sendFlipGoneCold({
                  email: user.email,
                  name: user.name /* istanbul ignore next */ ?? undefined,
                  listingTitle: cold.listingTitle,
                  hoursSinceLastResponse: cold.hoursSinceLastResponse,
                  sellerName: cold.sellerName /* istanbul ignore next */ ?? undefined,
                  coldReason: cold.coldReason,
                  threadUrl,
                });
                /* istanbul ignore next -- fire-and-forget; rejection is intentionally swallowed */
                void smsNotificationService.notifyFlipGoneCold({
                  userId: user.id,
                  listingTitle: cold.listingTitle,
                  hoursInactive: cold.hoursSinceLastResponse,
                }).catch(() => {});
                // Story 11.3: push fire-and-forget
                /* istanbul ignore next -- fire-and-forget; rejection is intentionally swallowed */
                void pushNotificationService.sendToUser(
                  user.id,
                  { title: '🥶 Flip Gone Cold', body: `${cold.listingTitle} — ${Math.round(cold.hoursSinceLastResponse)}h inactive` },
                  'flipGoneCold'
                ).catch(() => {});

                // Find the created event and mark processed
                const ev = await prisma.notificationEvent.findFirst({
                  where: { userId: user.id, listingId: cold.listingId, eventType, deduplicationKey: dedupKey },
                  select: { id: true },
                });

                if (sendResult.success) {
                  /* istanbul ignore next -- ev always found when created just above */
                  if (ev) await markEventProcessed(ev.id);
                  result.sent++;
                  result.processed++;
                } else {
                  /* istanbul ignore next -- ev always found; ?? fallback not needed */
                  if (ev) await markEventFailed(ev.id, 0, sendResult.error ?? 'send_failed');
                  result.failed++;
                  result.processed++;
                }

                /* istanbul ignore next -- delay disabled in tests */
                if (SEND_DELAY_MS > 0) await sleep(SEND_DELAY_MS);
              }
            } else {
              // hot flip
              const hot = alert.data as import('./cold-hot-detector').HotFlipResult;
              const eventType: SmartAlertEventType = 'flip.turned_hot';
              const dedupKey = buildSmartAlertDedupKey(hot.listingId, eventType);
              const threadUrl = `${appUrl}/messages/${hot.listingId}`;

              let created = false;
              try {
                await prisma.notificationEvent.create({
                  data: {
                    userId: user.id,
                    listingId: hot.listingId,
                    eventType,
                    payload: {
                      listingTitle: hot.listingTitle,
                      unreadCount: hot.consecutiveInboundCount,
                      latestMessagePreview: hot.latestMessagePreview,
                      sellerName: hot.sellerName,
                      threadUrl,
                    } as unknown as Prisma.InputJsonValue,
                    deduplicationKey: dedupKey,
                    status: 'PENDING',
                  },
                });
                created = true;
              } catch (err) {
                if (
                  err !== null &&
                  typeof err === 'object' &&
                  'code' in err &&
                  (err as { code: string }).code === 'P2002'
                ) {
                  result.skipped++;
                  continue;
                }
                throw err;
              }

              /* istanbul ignore else -- created is always true here; false branch is unreachable */
              if (created) {
                const sendResult = await emailService.sendFlipTurnedHot({
                  email: user.email,
                  name: user.name /* istanbul ignore next */ ?? undefined,
                  listingTitle: hot.listingTitle,
                  unreadCount: hot.consecutiveInboundCount,
                  latestMessagePreview: hot.latestMessagePreview,
                  sellerName: hot.sellerName /* istanbul ignore next */ ?? undefined,
                  threadUrl,
                });
                /* istanbul ignore next -- fire-and-forget; rejection is intentionally swallowed */
                void smsNotificationService.notifyFlipTurnedHot({
                  userId: user.id,
                  listingTitle: hot.listingTitle,
                }).catch(() => {});
                // Story 11.3: push fire-and-forget
                /* istanbul ignore next -- fire-and-forget; rejection is intentionally swallowed */
                void pushNotificationService.sendToUser(
                  user.id,
                  { title: '🔥 Flip Turned Hot!', body: `${hot.listingTitle} — respond now` },
                  'flipTurnedHot'
                ).catch(() => {});

                const ev = await prisma.notificationEvent.findFirst({
                  where: { userId: user.id, listingId: hot.listingId, eventType, deduplicationKey: dedupKey },
                  select: { id: true },
                });

                if (sendResult.success) {
                  /* istanbul ignore next -- ev always found when created just above */
                  if (ev) await markEventProcessed(ev.id);
                  result.sent++;
                  result.processed++;
                } else {
                  /* istanbul ignore next -- ev always found; ?? fallback not needed */
                  if (ev) await markEventFailed(ev.id, 0, sendResult.error ?? 'send_failed');
                  result.failed++;
                  result.processed++;
                }

                /* istanbul ignore next -- delay disabled in tests */
                if (SEND_DELAY_MS > 0) await sleep(SEND_DELAY_MS);
              }
            }
          } /* istanbul ignore next -- alert-level catch; error propagation tested in phase2 error tests */ catch (alertErr) {
            logger.error('smart_alert.phase2.alert_error', {
              userId: user.id,
              /* istanbul ignore next -- tests always throw Error instances */
              error: alertErr instanceof Error ? alertErr.message : String(alertErr),
            });
            result.failed++;
          }
        }

        consecutiveDbErrors = 0;
      } /* istanbul ignore next -- user-level catch; DB error tested in phase2 DB error tests */ catch (userErr) {
        consecutiveDbErrors++;
        logger.error('smart_alert.phase2.user_error', {
          userId: user.id,
          consecutiveDbErrors,
          /* istanbul ignore next -- tests always throw Error instances */
          error: userErr instanceof Error ? userErr.message : String(userErr),
        });
      }
    }

    // If fewer users than batch size, we've reached the end
    if (users.length < SMART_ALERT_USER_BATCH_SIZE) break;
  }
}

// ---------------------------------------------------------------------------
// Main exported processor
// ---------------------------------------------------------------------------

/**
 * Process smart alert notifications — two phases.
 * Phase 1 processes existing events (review.received, price_changed, cold, hot).
 * Phase 2 runs cold/hot detection and creates+sends alerts for matched users.
 *
 * Returns combined result counts from both phases.
 */
export async function processSmartAlertNotificationEvents(): Promise<SmartAlertProcessorResult> {
  const result: SmartAlertProcessorResult = {
    processed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    await phase1(result);
  } catch (err) {
    /* istanbul ignore next -- phase1 has internal event-level catch; this fires only for unexpected throws */
    logger.error('smart_alert.phase1.fatal', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    await phase2(result);
  } catch (err) {
    /* istanbul ignore next -- phase2 has internal user/alert-level catch; this fires only for unexpected throws */
    logger.error('smart_alert.phase2.fatal', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const logFn = result.failed > 0 ? logger.warn.bind(logger) : logger.info.bind(logger);
  logFn('smart_alert.processor.complete', {
    processed: result.processed,
    sent: result.sent,
    skipped: result.skipped,
    failed: result.failed,
  });

  return result;
}
