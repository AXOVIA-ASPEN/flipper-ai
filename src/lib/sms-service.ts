/**
 * @file src/lib/sms-service.ts
 * @author Stephen Boyett
 * @company Axovia
 * @date 2026-04-09
 * @version 1.0
 * @brief Twilio SMS abstraction for Flipper AI (Story 11.2).
 *
 * @description
 * Wraps the Twilio Node.js SDK with a provider abstraction identical to
 * email-service.ts. In production, uses TwilioProvider (real API calls).
 * In dev/test (no TWILIO_ACCOUNT_SID), falls back to NullSmsProvider
 * (console.log only) so the app never crashes on missing credentials.
 *
 * The TwilioProvider uses a lazy `require('twilio')` inside the constructor
 * so that Jest can mock the `twilio` module and tests never touch the real
 * SDK at module-load time.
 */

import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/** Minimal interface — swap providers by implementing this. */
export interface SmsProvider {
  send(to: string, body: string): Promise<SendSmsResult>;
}

// Shape of the twilio() client we actually use — keeps things strictly typed
// without needing to import heavy upstream types at module load.
interface TwilioMessagesClient {
  messages: {
    create(opts: { from: string; to: string; body: string }): Promise<{ sid: string }>;
  };
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

/** No-op provider — logs to console; used in dev/test when no credentials are set. */
export class NullSmsProvider implements SmsProvider {
  async send(to: string, body: string): Promise<SendSmsResult> {
    logger.info('[SmsService][NullSmsProvider] SMS would have been sent (no TWILIO_ACCOUNT_SID)', {
      to,
      bodyLength: body.length,
    });
    /* istanbul ignore next -- console output excluded from coverage */
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[NullSms] Would send SMS to ${to}: ${body}`);
    }
    return { success: true, messageId: 'null-provider' };
  }
}

/** Twilio provider — used in production when TWILIO_ACCOUNT_SID is set. */
export class TwilioProvider implements SmsProvider {
  private client: TwilioMessagesClient;
  private fromNumber: string;

  constructor(accountSid: string, authToken: string, fromNumber: string) {
    // Lazy import so Jest can mock the module and so the app doesn't crash
    // in environments without Twilio credentials configured.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const twilio = require('twilio') as (sid: string, token: string) => TwilioMessagesClient;
    this.client = twilio(accountSid, authToken);
    this.fromNumber = fromNumber;
  }

  async send(to: string, body: string): Promise<SendSmsResult> {
    try {
      const message = await this.client.messages.create({
        from: this.fromNumber,
        to,
        body,
      });
      return { success: true, messageId: message.sid };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('[SmsService] Twilio provider exception', { err: message });
      return { success: false, error: message };
    }
  }
}

// ---------------------------------------------------------------------------
// SmsService
// ---------------------------------------------------------------------------

export class SmsService {
  private provider: SmsProvider;

  constructor(provider: SmsProvider) {
    this.provider = provider;
  }

  /**
   * Send an SMS. `to` MUST be in E.164 format (+12025551234). `body` MUST be
   * ≤ 160 characters — the caller (sms-notification-service) is responsible
   * for truncation.
   */
  async send(to: string, body: string): Promise<SendSmsResult> {
    return this.provider.send(to, body);
  }
}

// ---------------------------------------------------------------------------
// Singleton factory
// ---------------------------------------------------------------------------

function createSmsService(): SmsService {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  let provider: SmsProvider;

  /* istanbul ignore next -- production branches excluded from test env (NODE_ENV=test) */
  if (accountSid && authToken && fromNumber && process.env.NODE_ENV !== 'test') {
    provider = new TwilioProvider(accountSid, authToken, fromNumber);
    logger.info('[SmsService] Twilio provider initialized', { fromNumber });
  } else {
    provider = new NullSmsProvider();
    /* istanbul ignore next -- production warning excluded from test env */
    if (process.env.NODE_ENV !== 'test') {
      logger.warn('[SmsService] No TWILIO_ACCOUNT_SID — using null provider (SMS logged only)');
    }
  }

  return new SmsService(provider);
}

/** Singleton SMS service — import this everywhere. */
export const smsService = createSmsService();
