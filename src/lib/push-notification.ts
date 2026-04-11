/**
 * @file src/lib/push-notification.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.1
 * @brief Push notification service — FCM fan-out to all registered device tokens (Story 11.1).
 *
 * @description
 * Handles server-side push notification delivery via Firebase Cloud Messaging.
 *
 * Key behaviours:
 *   - Loads all DeviceToken records for the target user from the database.
 *   - Respects the global `UserSettings.pushNotifications` toggle (defaults to true
 *     if settings don't exist, per fire-and-forget pattern).
 *   - Story 11.3: Accepts an optional `eventKey` to gate on the per-event
 *     `pushNotify*` field. When provided, sends only if the matching field is true.
 *     When omitted, falls back to master-toggle-only behaviour (backwards compatible).
 *   - Fans out to every registered device token (AC-4: multi-device delivery).
 *   - Detects stale tokens (FCM returns null) and deletes them from the DB.
 *   - Swallows all errors — notifications must NEVER propagate to the API layer.
 */

import prisma from '@/lib/db';
import * as messagingAdmin from '@/lib/firebase/messaging-admin';
import type { NotificationPayload } from '@/lib/firebase/messaging-admin';
import { logger } from '@/lib/logger';

export type { NotificationPayload } from '@/lib/firebase/messaging-admin';

// ---------------------------------------------------------------------------
// Per-event key type (Story 11.3)
// ---------------------------------------------------------------------------

/** Maps event keys to the corresponding `pushNotify*` column in UserSettings. */
export type PushEventKey =
  | 'newDeals'
  | 'soldItems'
  | 'messageReceived'
  | 'draftReady'
  | 'messageSent'
  | 'reviewReceived'
  | 'flipGoneCold'
  | 'flipTurnedHot'
  | 'priceDrops'
  | 'expiring'
  | 'listingUnavailable'
  | 'weeklyDigest';

/** Maps a PushEventKey to its UserSettings column name. */
const PUSH_EVENT_FIELD_MAP: Record<PushEventKey, string> = {
  newDeals: 'pushNotifyNewDeals',
  soldItems: 'pushNotifySoldItems',
  messageReceived: 'pushNotifyMessageReceived',
  draftReady: 'pushNotifyDraftReady',
  messageSent: 'pushNotifyMessageSent',
  reviewReceived: 'pushNotifyReviewReceived',
  flipGoneCold: 'pushNotifyFlipGoneCold',
  flipTurnedHot: 'pushNotifyFlipTurnedHot',
  priceDrops: 'pushNotifyPriceDrops',
  expiring: 'pushNotifyExpiring',
  listingUnavailable: 'pushNotifyListingUnavailable',
  weeklyDigest: 'pushNotifyWeeklyDigest',
};

// ---------------------------------------------------------------------------
// Prisma-compatible interfaces
// ---------------------------------------------------------------------------

interface PushSettings {
  pushNotifications: boolean;
  pushNotifyNewDeals: boolean;
  pushNotifySoldItems: boolean;
  pushNotifyMessageReceived: boolean;
  pushNotifyDraftReady: boolean;
  pushNotifyMessageSent: boolean;
  pushNotifyReviewReceived: boolean;
  pushNotifyFlipGoneCold: boolean;
  pushNotifyFlipTurnedHot: boolean;
  pushNotifyPriceDrops: boolean;
  pushNotifyExpiring: boolean;
  pushNotifyListingUnavailable: boolean;
  pushNotifyWeeklyDigest: boolean;
}

/** Minimal interface required from the prisma client — allows test injection. */
interface PrismaLike {
  deviceToken: {
    findMany: (args: { where: { userId: string }; select: { id: boolean; token: boolean } }) => Promise<Array<{ id: string; token: string }>>;
    deleteMany: (args: { where: { id: { in: string[] } } }) => Promise<{ count: number }>;
  };
  userSettings: {
    findUnique: (args: { where: { userId: string }; select: Record<string, boolean> }) => Promise<PushSettings | null>;
  };
}

/** Minimal interface for FCM delivery — allows test injection. */
interface MessagingAdminLike {
  sendToDevice: (token: string, payload: NotificationPayload) => Promise<string | null>;
}

export class PushNotificationService {
  private readonly db: PrismaLike;
  private readonly messaging: MessagingAdminLike;

  constructor(prismaClient?: PrismaLike, messagingAdminClient?: MessagingAdminLike) {
    /* istanbul ignore next -- tests always pass explicit mocks; production singleton path not needed in unit tests */
    this.db = prismaClient ?? (prisma as unknown as PrismaLike);
    /* istanbul ignore next -- tests always pass explicit mocks; production singleton path not needed in unit tests */
    this.messaging = messagingAdminClient ?? messagingAdmin;
  }

  /**
   * Send a push notification to all registered devices for a user.
   *
   * - No-op when the user has no registered device tokens.
   * - No-op when the user's `pushNotifications` master setting is false.
   * - No-op when `eventKey` is provided and the matching per-event toggle is false (Story 11.3).
   * - Deletes stale tokens automatically (FCM registration-token-not-registered).
   * - Never throws — all errors are swallowed and logged.
   *
   * @param eventKey Optional event key for per-event gating. When omitted the
   *   method falls back to master-toggle-only behaviour (backwards compatible).
   */
  async sendToUser(userId: string, payload: NotificationPayload, eventKey?: PushEventKey): Promise<void> {
    try {
      const tokens = await this.db.deviceToken.findMany({
        where: { userId },
        select: { id: true, token: true },
      });

      if (tokens.length === 0) {
        return;
      }

      // Load master toggle + all per-event toggles in one query
      const settings = await this.db.userSettings.findUnique({
        where: { userId },
        select: {
          pushNotifications: true,
          pushNotifyNewDeals: true,
          pushNotifySoldItems: true,
          pushNotifyMessageReceived: true,
          pushNotifyDraftReady: true,
          pushNotifyMessageSent: true,
          pushNotifyReviewReceived: true,
          pushNotifyFlipGoneCold: true,
          pushNotifyFlipTurnedHot: true,
          pushNotifyPriceDrops: true,
          pushNotifyExpiring: true,
          pushNotifyListingUnavailable: true,
          pushNotifyWeeklyDigest: true,
        },
      });

      // Respect the global push toggle (default true when settings absent)
      if (settings !== null && settings.pushNotifications === false) {
        return;
      }

      // Story 11.3: per-event gate — skip if user disabled push for this event
      if (eventKey && settings !== null) {
        const fieldName = PUSH_EVENT_FIELD_MAP[eventKey];
        if ((settings as unknown as Record<string, boolean>)[fieldName] === false) {
          return;
        }
      }

      const staleIds: string[] = [];

      await Promise.all(
        tokens.map(async ({ id, token }) => {
          const messageId = await this.messaging.sendToDevice(token, payload);
          if (messageId === null) {
            logger.warn('[PushNotification] Stale token detected — queued for deletion', {
              userId,
              tokenPrefix: token.slice(0, 10),
            });
            staleIds.push(id);
          } else {
            logger.info('[PushNotification] Delivered push to device', {
              userId,
              messageId,
            });
          }
        })
      );

      if (staleIds.length > 0) {
        await this.db.deviceToken.deleteMany({ where: { id: { in: staleIds } } });
        logger.info('[PushNotification] Removed stale tokens', {
          userId,
          count: staleIds.length,
        });
      }
    } catch (err) {
      logger.error('[PushNotification] sendToUser failed', { userId, err });
    }
  }
}

/** Singleton — import this in API routes and event processors. */
export const pushNotificationService = new PushNotificationService();
