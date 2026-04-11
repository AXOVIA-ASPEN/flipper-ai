/**
 * @file src/lib/sms-notification-service.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-09
 * @version 1.0
 * @brief SMS notification dispatcher for all flip event types (Story 11.2).
 *
 * @description
 * Fire-and-forget SMS notification dispatcher. Swallows all errors — SMS
 * failures must never crash API routes or block email/push channels.
 *
 * Each notify* method:
 *   1. Loads the user's phoneNumber, phoneVerified, smsNotifications from UserSettings.
 *   2. Returns silently if the user has no phone, phone is not verified, or
 *      master smsNotifications toggle is OFF.
 *   3. Formats a concise SMS body (≤ 160 chars, truncating the item title).
 *   4. Dispatches via `smsService.send(phoneNumber, body)`.
 *   5. Swallows all errors — only logs them.
 *
 * Story 11.3 adds per-event SMS toggle gating. `loadSmsContext` selects all
 * 12 per-event `smsNotify*` fields, and each notify* method passes its
 * matching field key to `dispatch` so it is checked before sending.
 */

import prisma from '@/lib/db';
import { smsService as defaultSmsService, type SmsService } from '@/lib/sms-service';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum SMS body length (single Twilio segment). */
export const SMS_MAX_LENGTH = 160;

/** Truncation marker appended to long titles. */
const TRUNCATION_MARKER = '…';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SmsContext {
  phoneNumber: string;
  phoneVerified: boolean;
  smsNotifications: boolean;
  // Story 11.3: Per-event SMS toggle fields.
  // Note: smsNotifyWeeklyDigest exists in the schema and settings UI but has no
  // SMS dispatcher — the weekly digest is email-only until a future story adds
  // an SMS digest formatter. Its toggle is surfaced in the UI now so user prefs
  // are persisted and ready when the feature ships.
  smsNotifyNewDeals: boolean;
  smsNotifySoldItems: boolean;
  smsNotifyMessageReceived: boolean;
  smsNotifyDraftReady: boolean;
  smsNotifyMessageSent: boolean;
  smsNotifyReviewReceived: boolean;
  smsNotifyFlipGoneCold: boolean;
  smsNotifyFlipTurnedHot: boolean;
  smsNotifyPriceDrops: boolean;
  smsNotifyExpiring: boolean;
  smsNotifyListingUnavailable: boolean;
}

type SmsPerEventField = keyof Omit<SmsContext, 'phoneNumber' | 'phoneVerified' | 'smsNotifications'>;

export interface NewDealParams {
  userId: string;
  listingTitle: string;
  askingPrice: number;
  estimatedProfit: number;
}

export interface FlipLifecycleParams {
  userId: string;
  listingTitle: string;
  newStatus: string;
}

export interface MessageReceivedParams {
  userId: string;
  listingTitle: string;
  sellerName: string;
}

export interface DraftReadyParams {
  userId: string;
  listingTitle: string;
}

export interface MessageSentParams {
  userId: string;
  listingTitle: string;
}

export interface FlipGoneColdParams {
  userId: string;
  listingTitle: string;
  hoursInactive: number;
}

export interface FlipTurnedHotParams {
  userId: string;
  listingTitle: string;
}

export interface PriceDropParams {
  userId: string;
  listingTitle: string;
  newPrice: number;
}

export interface ExpiringParams {
  userId: string;
  listingTitle: string;
  hoursUntilExpiry: number;
}

export interface ListingUnavailableParams {
  userId: string;
  listingTitle: string;
}

// ---------------------------------------------------------------------------
// formatSmsBody — public helper (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Build an SMS body by replacing `{key}` placeholders in `template` with
 * values from `vars`, truncating the `title` var as needed so that the final
 * message length is ≤ SMS_MAX_LENGTH (160 chars).
 *
 * The helper looks for a `{title}` placeholder specifically (since listing
 * titles are the only variable-length field in the templates) and shrinks
 * the title with a `…` marker until the full body fits in 160 chars.
 *
 * If `title` is missing, or the template has no `{title}` placeholder, a
 * simple replacement is performed and the result is hard-truncated at 160.
 */
export function formatSmsBody(template: string, vars: Record<string, string>): string {
  const varsCopy = { ...vars };
  const title = varsCopy.title;
  const hasTitle = typeof title === 'string' && template.includes('{title}');

  // First pass with the full title (or without title replacement at all)
  let body = applyVars(template, varsCopy);
  if (body.length <= SMS_MAX_LENGTH) {
    return body;
  }

  // If there's no title to trim, hard-truncate and bail out
  if (!hasTitle) {
    return body.slice(0, SMS_MAX_LENGTH - 1) + TRUNCATION_MARKER;
  }

  // Figure out how much room the rest of the template takes (everything
  // except the {title} placeholder) once all other vars are substituted.
  const withoutTitle = applyVars(template.replace('{title}', ''), varsCopy);
  const nonTitleLen = withoutTitle.length;
  const roomForTitle = SMS_MAX_LENGTH - nonTitleLen;

  // Not enough room for even 1 character of the title? Hard-truncate.
  if (roomForTitle <= 1) {
    return body.slice(0, SMS_MAX_LENGTH - 1) + TRUNCATION_MARKER;
  }

  // Trim title with marker
  const trimmedTitle = title.slice(0, Math.max(1, roomForTitle - 1)) + TRUNCATION_MARKER;
  varsCopy.title = trimmedTitle;
  body = applyVars(template, varsCopy);

  // Safety net — should already fit, but guarantee ≤ 160
  /* istanbul ignore next -- mathematically unreachable: trimmedTitle guarantees body fits */
  if (body.length > SMS_MAX_LENGTH) {
    return body.slice(0, SMS_MAX_LENGTH - 1) + TRUNCATION_MARKER;
  }
  return body;
}

function applyVars(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{${key}}`).join(value);
  }
  return out;
}

// ---------------------------------------------------------------------------
// SmsNotificationService
// ---------------------------------------------------------------------------

export class SmsNotificationService {
  private readonly smsService: SmsService;

  /**
   * @param smsService Optional SmsService override — used by tests to inject
   * a stub that captures sent messages or simulates provider failures. When
   * omitted, the singleton from `src/lib/sms-service.ts` is used.
   */
  constructor(smsService: SmsService = defaultSmsService) {
    this.smsService = smsService;
  }

  /** AC-2 / AC-3: New flip opportunity found. */
  async notifyNewDeal(params: NewDealParams): Promise<void> {
    await this.dispatch('new_deal', params.userId, 'smsNotifyNewDeals', () =>
      formatSmsBody('🎯 New flip: {title} ${price} | Est. profit ${profit} — flipper.ai', {
        title: params.listingTitle,
        price: formatMoney(params.askingPrice),
        profit: formatMoney(params.estimatedProfit),
      })
    );
  }

  /** AC-2 / AC-3: Flip lifecycle status transition (purchased/listed/sold). */
  async notifyFlipLifecycle(params: FlipLifecycleParams): Promise<void> {
    await this.dispatch('flip_lifecycle', params.userId, 'smsNotifySoldItems', () =>
      formatSmsBody('📦 Flip update: {title} → {status} — flipper.ai', {
        title: params.listingTitle,
        status: params.newStatus,
      })
    );
  }

  /** AC-2 / AC-3: Seller replied in a conversation thread. */
  async notifyMessageReceived(params: MessageReceivedParams): Promise<void> {
    await this.dispatch('message_received', params.userId, 'smsNotifyMessageReceived', () =>
      formatSmsBody('💬 {sellerName} replied about {title} — flipper.ai/messages', {
        sellerName: params.sellerName,
        title: params.listingTitle,
      })
    );
  }

  /** AC-2 / AC-3: AI draft ready for user review. */
  async notifyDraftReady(params: DraftReadyParams): Promise<void> {
    await this.dispatch('draft_ready', params.userId, 'smsNotifyDraftReady', () =>
      formatSmsBody('✍️ AI draft ready for {title}. Review at flipper.ai/messages', {
        title: params.listingTitle,
      })
    );
  }

  /** AC-2 / AC-3: Outbound message sent confirmation. */
  async notifyMessageSent(params: MessageSentParams): Promise<void> {
    await this.dispatch('message_sent', params.userId, 'smsNotifyMessageSent', () =>
      formatSmsBody('✅ Message sent for {title} — flipper.ai/messages', {
        title: params.listingTitle,
      })
    );
  }

  /** AC-2 / AC-3: Flip listing gone cold (no seller response). */
  async notifyFlipGoneCold(params: FlipGoneColdParams): Promise<void> {
    await this.dispatch('flip_gone_cold', params.userId, 'smsNotifyFlipGoneCold', () =>
      formatSmsBody('🥶 {title} gone cold ({hours}h). Take action — flipper.ai', {
        title: params.listingTitle,
        hours: String(Math.round(params.hoursInactive)),
      })
    );
  }

  /** AC-2 / AC-3: Flip listing turned hot (seller responded). */
  async notifyFlipTurnedHot(params: FlipTurnedHotParams): Promise<void> {
    await this.dispatch('flip_turned_hot', params.userId, 'smsNotifyFlipTurnedHot', () =>
      formatSmsBody('🔥 {title} turned hot! Respond now — flipper.ai/messages', {
        title: params.listingTitle,
      })
    );
  }

  /** AC-2 / AC-3: Watched listing dropped in price. */
  async notifyPriceDrop(params: PriceDropParams): Promise<void> {
    await this.dispatch('price_drop', params.userId, 'smsNotifyPriceDrops', () =>
      formatSmsBody('📉 {title} dropped to ${newPrice} — flipper.ai', {
        title: params.listingTitle,
        newPrice: formatMoney(params.newPrice),
      })
    );
  }

  /** AC-2 / AC-3: Watched listing expiring soon. */
  async notifyExpiring(params: ExpiringParams): Promise<void> {
    await this.dispatch('expiring', params.userId, 'smsNotifyExpiring', () =>
      formatSmsBody('⏰ {title} expires in {hours}h — flipper.ai', {
        title: params.listingTitle,
        hours: String(Math.round(params.hoursUntilExpiry)),
      })
    );
  }

  /** AC-2 / AC-3: Watched listing removed / marked unavailable. */
  async notifyListingUnavailable(params: ListingUnavailableParams): Promise<void> {
    await this.dispatch('listing_unavailable', params.userId, 'smsNotifyListingUnavailable', () =>
      formatSmsBody('🚫 {title} listing removed — flipper.ai', {
        title: params.listingTitle,
      })
    );
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  /**
   * Shared dispatch helper: loads user context, gates on verification, master
   * toggle, AND per-event toggle, formats the body, and fires the SMS via
   * `smsService`. All failure modes are logged, never thrown.
   *
   * @param perEventField — the specific smsNotify* field for this event type.
   *   SMS is skipped silently when that field is false (Story 11.3 per-event gating).
   */
  private async dispatch(
    eventLabel: string,
    userId: string,
    perEventField: SmsPerEventField,
    buildBody: () => string
  ): Promise<void> {
    try {
      const ctx = await this.loadSmsContext(userId);
      if (!ctx) return;
      if (!ctx.phoneVerified) return;
      if (!ctx.smsNotifications) return;
      // Story 11.3: per-event gate — skip if user disabled SMS for this specific event
      if (!ctx[perEventField]) return;

      const body = buildBody();
      const result = await this.smsService.send(ctx.phoneNumber, body);

      if (result.success) {
        logger.info('[SmsNotification] Sent SMS', {
          event: eventLabel,
          userId,
          messageId: result.messageId,
        });
      } else {
        logger.error('[SmsNotification] SMS send returned failure', {
          event: eventLabel,
          userId,
          error: result.error,
        });
      }
    } catch (err) {
      logger.error('[SmsNotification] Failed to send SMS', {
        event: eventLabel,
        userId,
        /* istanbul ignore next -- tests always throw Error instances */
        err: err instanceof Error ? err.message : String(err),
      });
      // NEVER re-throw — SMS failure must not propagate
    }
  }

  private async loadSmsContext(userId: string): Promise<SmsContext | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        settings: {
          select: {
            phoneNumber: true,
            phoneVerified: true,
            smsNotifications: true,
            // Story 11.3: Per-event SMS toggle fields
            smsNotifyNewDeals: true,
            smsNotifySoldItems: true,
            smsNotifyMessageReceived: true,
            smsNotifyDraftReady: true,
            smsNotifyMessageSent: true,
            smsNotifyReviewReceived: true,
            smsNotifyFlipGoneCold: true,
            smsNotifyFlipTurnedHot: true,
            smsNotifyPriceDrops: true,
            smsNotifyExpiring: true,
            smsNotifyListingUnavailable: true,
          },
        },
      },
    });
    const s = user?.settings;
    if (!s?.phoneNumber) return null;
    return {
      phoneNumber: s.phoneNumber,
      phoneVerified: s.phoneVerified,
      smsNotifications: s.smsNotifications,
      smsNotifyNewDeals: s.smsNotifyNewDeals,
      smsNotifySoldItems: s.smsNotifySoldItems,
      smsNotifyMessageReceived: s.smsNotifyMessageReceived,
      smsNotifyDraftReady: s.smsNotifyDraftReady,
      smsNotifyMessageSent: s.smsNotifyMessageSent,
      smsNotifyReviewReceived: s.smsNotifyReviewReceived,
      smsNotifyFlipGoneCold: s.smsNotifyFlipGoneCold,
      smsNotifyFlipTurnedHot: s.smsNotifyFlipTurnedHot,
      smsNotifyPriceDrops: s.smsNotifyPriceDrops,
      smsNotifyExpiring: s.smsNotifyExpiring,
      smsNotifyListingUnavailable: s.smsNotifyListingUnavailable,
    };
  }
}

function formatMoney(value: number): string {
  /* istanbul ignore next -- Infinity/NaN guard; callers always pass finite prices */
  if (!isFinite(value)) return '0';
  return Math.round(value).toString();
}

/** Singleton — import this in notification callsites. */
export const smsNotificationService = new SmsNotificationService();
