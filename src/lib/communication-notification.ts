/**
 * @file src/lib/communication-notification.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.1
 * @brief Service for sending communication-event email notifications (Story 10.4).
 *
 * @description
 * Handles the three communication notification event types:
 *   - message.received   — seller replied to a conversation thread (AC1, FR-NOTIFY-02)
 *   - message.draft_ready — AI generated a draft message for user review (AC2, FR-NOTIFY-03)
 *   - message.sent       — outbound message successfully sent (AC3, FR-NOTIFY-04)
 *
 * Each method:
 *   1. Persists a NotificationEvent record for deduplication, audit trail, and retry.
 *   2. Loads the user's email address and notification preferences.
 *   3. Respects `UserSettings.emailNotifications` (master) and per-event toggles.
 *   4. Renders the appropriate email template.
 *   5. Dispatches via the existing `emailService` singleton (Resend in production).
 *   6. Swallows all errors — notifications must NEVER crash the API layer.
 *   7. Implements a circuit breaker: after 5 consecutive provider failures the
 *      service stops dispatching and leaves remaining events as PENDING for the
 *      next scheduled batch processor run.
 *
 * Integration: called fire-and-forget from the messages API routes.
 */

import prisma from '@/lib/db';
import { emailService } from '@/lib/email-service';
import { smsNotificationService } from '@/lib/sms-notification-service';
import { pushNotificationService } from '@/lib/push-notification';
import { logger } from '@/lib/logger';
import {
  messageReceivedEmailHtml,
  messageReceivedEmailText,
  draftReadyEmailHtml,
  draftReadyEmailText,
  messageSentEmailHtml,
  messageSentEmailText,
} from '@/lib/communication-email-templates';
import {
  createMessageNotificationEvent,
  NotificationEventType,
} from '@/lib/notification-events';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MessageReceivedParams {
  userId: string;
  listingId?: string | null;
  listingTitle?: string | null;
  sellerName?: string | null;
  messagePreview: string;
}

export interface DraftReadyParams {
  userId: string;
  listingId?: string | null;
  listingTitle?: string | null;
  draftPreview: string;
}

export interface MessageSentParams {
  userId: string;
  listingId?: string | null;
  listingTitle?: string | null;
  messagePreview: string;
  deliveryStatus?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

function unsubscribeUrl(email: string): string {
  const encoded = Buffer.from(email).toString('base64url');
  return `${APP_URL}/api/user/unsubscribe?token=${encoded}`;
}

function settingsUrl(): string {
  return `${APP_URL}/settings#notifications`;
}

function threadUrl(listingId?: string | null): string {
  if (listingId) return `${APP_URL}/messages?listingId=${listingId}`;
  return `${APP_URL}/messages`;
}

function reviewUrl(listingId?: string | null): string {
  if (listingId) return `${APP_URL}/messages?listingId=${listingId}&mode=review`;
  return `${APP_URL}/messages`;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
}

function truncate(text: string, maxLength = 200): string {
  const stripped = stripHtml(text);
  if (stripped.length <= maxLength) return stripped;
  return stripped.slice(0, maxLength - 1) + '…';
}

function truncateSubjectPart(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

// ---------------------------------------------------------------------------
// Circuit breaker configuration
// ---------------------------------------------------------------------------

/* istanbul ignore next -- trivial env var default */
const CIRCUIT_BREAKER_THRESHOLD = parseInt(
  process.env.COMM_NOTIFICATION_CIRCUIT_BREAKER_THRESHOLD ?? '5',
  10
);

// ---------------------------------------------------------------------------
// CommunicationNotificationService
// ---------------------------------------------------------------------------

export class CommunicationNotificationService {
  /** Consecutive provider failure counter. Resets on any success. */
  private consecutiveFailures = 0;
  /**
   * Notify user that a seller replied to their inquiry (AC1 — FR-NOTIFY-02).
   * Fires on INBOUND message creation with status DELIVERED.
   */
  async notifyMessageReceived(params: MessageReceivedParams): Promise<void> {
    // Persist event for audit trail and retry before any preference checks.
    // Fire-and-forget — event persistence failure must not block notification.
    /* istanbul ignore next -- fire-and-forget persistence, error swallowed defensively */
    createMessageNotificationEvent({
      userId: params.userId,
      listingId: params.listingId,
      eventType: NotificationEventType.MESSAGE_RECEIVED,
      payload: {
        listingTitle: params.listingTitle,
        sellerName: params.sellerName,
        messagePreview: params.messagePreview,
      },
    }).catch(() => undefined);

    try {
      if (this.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
        logger.error('[CommunicationNotification] Circuit breaker open — skipping message.received', {
          consecutiveFailures: this.consecutiveFailures,
        });
        return;
      }

      const userContext = await this.loadUserContext(params.userId);
      if (!userContext) return;
      const { email, emailNotifications, notifyMessageReceived } = userContext;
      if (!emailNotifications) return;
      if (!notifyMessageReceived) return;

      const sellerName = params.sellerName || 'Seller';
      const listingTitle = params.listingTitle || 'your listing';
      const messagePreview = truncate(params.messagePreview);
      const url = threadUrl(params.listingId);
      const sellerNameTrunc = truncateSubjectPart(sellerName, 20);
      const listingTitleTrunc = truncateSubjectPart(listingTitle, 40);

      await emailService.send({
        to: email,
        subject: `💬 New message from ${sellerNameTrunc} — ${listingTitleTrunc}`,
        html: messageReceivedEmailHtml({
          email,
          sellerName,
          messagePreview,
          listingTitle,
          threadUrl: url,
          appUrl: APP_URL,
          unsubscribeUrl: unsubscribeUrl(email),
          settingsUrl: settingsUrl(),
        }),
        text: messageReceivedEmailText({
          email,
          sellerName,
          messagePreview,
          listingTitle,
          threadUrl: url,
          appUrl: APP_URL,
          unsubscribeUrl: unsubscribeUrl(email),
          settingsUrl: settingsUrl(),
        }),
      });

      this.consecutiveFailures = 0;
      logger.info('[CommunicationNotification] Sent message.received email', {
        userId: params.userId,
        listingId: params.listingId,
      });

      // Story 11.2: fire-and-forget SMS alongside email (secondary channel).
      /* istanbul ignore next -- SMS catch callback: smsNotificationService is mocked in tests */
      void smsNotificationService
        .notifyMessageReceived({
          userId: params.userId,
          listingTitle: listingTitle,
          sellerName: sellerName,
        })
        .catch(() => undefined);
      // Story 11.3: fire-and-forget push alongside email.
      /* istanbul ignore next -- push catch callback: pushNotificationService is mocked in tests */
      void pushNotificationService
        .sendToUser(params.userId, { title: '💬 New Message', body: `${sellerName} replied about ${listingTitle}` }, 'messageReceived')
        .catch(() => undefined);
    } catch (err) {
      this.consecutiveFailures++;
      logger.error('[CommunicationNotification] Failed to send message.received email', { err });
    }
  }

  /**
   * Notify user that an AI draft is ready for review (AC2 — FR-NOTIFY-03).
   * Fires on OUTBOUND message creation with status DRAFT.
   */
  async notifyDraftReady(params: DraftReadyParams): Promise<void> {
    /* istanbul ignore next -- fire-and-forget persistence, error swallowed defensively */
    createMessageNotificationEvent({
      userId: params.userId,
      listingId: params.listingId,
      eventType: NotificationEventType.MESSAGE_DRAFT_READY,
      payload: {
        listingTitle: params.listingTitle,
        draftPreview: params.draftPreview,
      },
    }).catch(() => undefined);

    try {
      if (this.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
        logger.error('[CommunicationNotification] Circuit breaker open — skipping message.draft_ready', {
          consecutiveFailures: this.consecutiveFailures,
        });
        return;
      }

      const userContext = await this.loadUserContext(params.userId);
      if (!userContext) return;
      const { email, emailNotifications, notifyDraftReady } = userContext;
      if (!emailNotifications) return;
      if (!notifyDraftReady) return;

      const listingTitle = params.listingTitle || 'your listing';
      const draftPreview = truncate(params.draftPreview);
      const url = reviewUrl(params.listingId);
      const listingTitleTrunc = truncateSubjectPart(listingTitle, 40);

      await emailService.send({
        to: email,
        subject: `✍️ AI draft ready for review — ${listingTitleTrunc}`,
        html: draftReadyEmailHtml({
          email,
          listingTitle,
          draftPreview,
          reviewUrl: url,
          appUrl: APP_URL,
          unsubscribeUrl: unsubscribeUrl(email),
          settingsUrl: settingsUrl(),
        }),
        text: draftReadyEmailText({
          email,
          listingTitle,
          draftPreview,
          reviewUrl: url,
          appUrl: APP_URL,
          unsubscribeUrl: unsubscribeUrl(email),
          settingsUrl: settingsUrl(),
        }),
      });

      this.consecutiveFailures = 0;
      logger.info('[CommunicationNotification] Sent message.draft_ready email', {
        userId: params.userId,
        listingId: params.listingId,
      });

      // Story 11.2: fire-and-forget SMS alongside email.
      /* istanbul ignore next -- SMS catch callback: smsNotificationService is mocked in tests */
      void smsNotificationService
        .notifyDraftReady({ userId: params.userId, listingTitle })
        .catch(() => undefined);
      // Story 11.3: fire-and-forget push alongside email.
      /* istanbul ignore next -- push catch callback: pushNotificationService is mocked in tests */
      void pushNotificationService
        .sendToUser(params.userId, { title: '✍️ AI Draft Ready', body: `Review your draft for ${listingTitle}` }, 'draftReady')
        .catch(() => undefined);
    } catch (err) {
      this.consecutiveFailures++;
      logger.error('[CommunicationNotification] Failed to send message.draft_ready email', { err });
    }
  }

  /**
   * Notify user that their message was successfully sent (AC3 — FR-NOTIFY-04).
   * Fires when an OUTBOUND message transitions to status SENT.
   */
  async notifyMessageSent(params: MessageSentParams): Promise<void> {
    /* istanbul ignore next -- fire-and-forget persistence, error swallowed defensively */
    createMessageNotificationEvent({
      userId: params.userId,
      listingId: params.listingId,
      eventType: NotificationEventType.MESSAGE_SENT,
      payload: {
        listingTitle: params.listingTitle,
        messagePreview: params.messagePreview,
        deliveryStatus: params.deliveryStatus,
      },
    }).catch(() => undefined);

    try {
      if (this.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
        logger.error('[CommunicationNotification] Circuit breaker open — skipping message.sent', {
          consecutiveFailures: this.consecutiveFailures,
        });
        return;
      }

      const userContext = await this.loadUserContext(params.userId);
      if (!userContext) return;
      const { email, emailNotifications, notifyMessageSent } = userContext;
      if (!emailNotifications) return;
      if (!notifyMessageSent) return;

      const listingTitle = params.listingTitle || 'your listing';
      const messagePreview = truncate(params.messagePreview);
      const deliveryStatus = params.deliveryStatus || 'Delivered';
      const url = threadUrl(params.listingId);
      const listingTitleTrunc = truncateSubjectPart(listingTitle, 40);

      await emailService.send({
        to: email,
        subject: `✅ Message sent — ${listingTitleTrunc}`,
        html: messageSentEmailHtml({
          email,
          listingTitle,
          messagePreview,
          deliveryStatus,
          threadUrl: url,
          appUrl: APP_URL,
          unsubscribeUrl: unsubscribeUrl(email),
          settingsUrl: settingsUrl(),
        }),
        text: messageSentEmailText({
          email,
          listingTitle,
          messagePreview,
          deliveryStatus,
          threadUrl: url,
          appUrl: APP_URL,
          unsubscribeUrl: unsubscribeUrl(email),
          settingsUrl: settingsUrl(),
        }),
      });

      this.consecutiveFailures = 0;
      logger.info('[CommunicationNotification] Sent message.sent email', {
        userId: params.userId,
        listingId: params.listingId,
      });

      // Story 11.2: fire-and-forget SMS alongside email.
      /* istanbul ignore next -- SMS catch callback: smsNotificationService is mocked in tests */
      void smsNotificationService
        .notifyMessageSent({ userId: params.userId, listingTitle })
        .catch(() => undefined);
      // Story 11.3: fire-and-forget push alongside email.
      /* istanbul ignore next -- push catch callback: pushNotificationService is mocked in tests */
      void pushNotificationService
        .sendToUser(params.userId, { title: '✅ Message Sent', body: `Your message about ${listingTitle} was delivered` }, 'messageSent')
        .catch(() => undefined);
    } catch (err) {
      this.consecutiveFailures++;
      logger.error('[CommunicationNotification] Failed to send message.sent email', { err });
    }
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private async loadUserContext(userId: string): Promise<{
    email: string;
    emailNotifications: boolean;
    notifyMessageReceived: boolean;
    notifyDraftReady: boolean;
    notifyMessageSent: boolean;
  } | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        settings: {
          select: {
            emailNotifications: true,
            notifyMessageReceived: true,
            notifyDraftReady: true,
            notifyMessageSent: true,
          },
        },
      },
    });

    if (!user?.email) {
      logger.warn('[CommunicationNotification] User not found or has no email', { userId });
      return null;
    }

    // Use in-memory defaults when no UserSettings record exists — do NOT auto-create.
    return {
      email: user.email,
      emailNotifications: user.settings?.emailNotifications ?? true,
      notifyMessageReceived: user.settings?.notifyMessageReceived ?? true,
      notifyDraftReady: user.settings?.notifyDraftReady ?? true,
      notifyMessageSent: user.settings?.notifyMessageSent ?? false,
    };
  }
}

/** Singleton — import this in API routes. */
export const communicationNotificationService = new CommunicationNotificationService();
