/**
 * EmailService — Transactional email abstraction for Flipper AI
 *
 * Uses Resend as the default provider. Falls back to a console-based
 * "null provider" in development / test environments when RESEND_API_KEY
 * is not set, so the app never crashes due to missing email credentials.
 *
 * Usage:
 *   import { emailService } from '@/lib/email-service';
 *   await emailService.sendWelcome({ name: 'Alice', email: 'alice@example.com' });
 */

import {
  welcomeEmailHtml,
  welcomeEmailText,
  digestEmailHtml,
  digestEmailText,
  priceAlertEmailHtml,
  priceAlertEmailText,
  passwordResetEmailHtml,
  passwordResetEmailText,
  scanSummaryEmailHtml,
  paymentFailedEmailHtml,
  paymentFailedEmailText,
  type WelcomeEmailOptions,
  type DigestEmailOptions,
  type PriceAlertEmailOptions,
  type PasswordResetEmailOptions,
  type ScanSummaryEmailOptions,
  type PaymentFailedEmailOptions,
} from '@/lib/email-templates';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/** Minimal interface — swap providers by implementing this. */
export interface EmailProvider {
  send(params: SendEmailParams): Promise<SendEmailResult>;
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

/** Resend provider — used in production when RESEND_API_KEY is set. */
class ResendProvider implements EmailProvider {
  private client: import('resend').Resend;
  private fromAddress: string;

  constructor(apiKey: string, fromAddress: string) {
    // Lazy import so the module doesn't crash in envs without the key
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Resend } = require('resend') as typeof import('resend');
    this.client = new Resend(apiKey);
    this.fromAddress = fromAddress;
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      const { data, error } = await this.client.emails.send({
        from: this.fromAddress,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        replyTo: params.replyTo,
      });

      if (error) {
        logger.error('Resend email send error', { err: error });
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Resend provider exception', { err });
      return { success: false, error: message };
    }
  }
}

/** No-op provider — logs to console; used in dev/test when no key is set. */
class NullProvider implements EmailProvider {
  async send(params: SendEmailParams): Promise<SendEmailResult> {
    logger.info(
      '[EmailService][NullProvider] Email would have been sent (no RESEND_API_KEY)',
      { to: params.to, subject: params.subject }
    );
    console.log('\n📧 [EmailService] Email not sent — no provider configured.');
    console.log(`   To:      ${Array.isArray(params.to) ? params.to.join(', ') : params.to}`);
    console.log(`   Subject: ${params.subject}`);
    console.log('   (Set RESEND_API_KEY to enable sending)\n');
    return { success: true, messageId: 'null-provider-' + Date.now() };
  }
}

// ---------------------------------------------------------------------------
// EmailService
// ---------------------------------------------------------------------------

export class EmailService {
  private provider: EmailProvider;
  private appUrl: string;
  private fromAddress: string;

  constructor(provider: EmailProvider, appUrl: string, fromAddress: string) {
    this.provider = provider;
    this.appUrl = appUrl.replace(/\/$/, '');
    this.fromAddress = fromAddress;
  }

  // ---- Low-level --------------------------------------------------------

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    return this.provider.send(params);
  }

  // ---- URL helpers -------------------------------------------------------

  private unsubscribeUrl(email: string): string {
    const encoded = Buffer.from(email).toString('base64url');
    return `${this.appUrl}/api/user/unsubscribe?token=${encoded}`;
  }

  private settingsUrl(): string {
    return `${this.appUrl}/settings#notifications`;
  }

  // ---- Typed senders -----------------------------------------------------

  /**
   * Send a welcome email to a newly registered user.
   */
  async sendWelcome(opts: {
    name?: string;
    email: string;
  }): Promise<SendEmailResult> {
    const emailOpts: WelcomeEmailOptions = {
      name: opts.name,
      email: opts.email,
      appUrl: this.appUrl,
      unsubscribeUrl: this.unsubscribeUrl(opts.email),
      settingsUrl: this.settingsUrl(),
    };

    return this.send({
      to: opts.email,
      subject: '🐧 Welcome to Flipper AI!',
      html: welcomeEmailHtml(emailOpts),
      text: welcomeEmailText(emailOpts),
    });
  }

  /**
   * Send the daily opportunities digest.
   */
  async sendDigest(opts: Omit<DigestEmailOptions, 'appUrl' | 'unsubscribeUrl' | 'settingsUrl'>): Promise<SendEmailResult> {
    const emailOpts: DigestEmailOptions = {
      ...opts,
      appUrl: this.appUrl,
      unsubscribeUrl: this.unsubscribeUrl(opts.email),
      settingsUrl: this.settingsUrl(),
    };

    return this.send({
      to: opts.email,
      subject: `📬 Your Daily Flipper AI Digest — ${opts.opportunities.length} deals found`,
      html: digestEmailHtml(emailOpts),
      text: digestEmailText(emailOpts),
    });
  }

  /**
   * Send a price drop alert.
   */
  async sendPriceAlert(
    opts: Omit<PriceAlertEmailOptions, 'appUrl' | 'unsubscribeUrl' | 'settingsUrl'>
  ): Promise<SendEmailResult> {
    const emailOpts: PriceAlertEmailOptions = {
      ...opts,
      appUrl: this.appUrl,
      unsubscribeUrl: this.unsubscribeUrl(opts.email),
      settingsUrl: this.settingsUrl(),
    };

    return this.send({
      to: opts.email,
      subject: `🔔 Price Drop: ${opts.listing.title} (−${Math.floor(opts.listing.priceDropPercent)}%)`,
      html: priceAlertEmailHtml(emailOpts),
      text: priceAlertEmailText(emailOpts),
    });
  }

  /**
   * Send a password reset email.
   */
  async sendPasswordReset(opts: {
    name?: string;
    email: string;
    resetUrl: string;
    expiresInMinutes?: number;
  }): Promise<SendEmailResult> {
    const emailOpts: PasswordResetEmailOptions = {
      name: opts.name,
      email: opts.email,
      resetUrl: opts.resetUrl,
      expiresInMinutes: opts.expiresInMinutes ?? 60,
      appUrl: this.appUrl,
      unsubscribeUrl: this.unsubscribeUrl(opts.email),
      settingsUrl: this.settingsUrl(),
    };

    return this.send({
      to: opts.email,
      subject: '🔐 Reset your Flipper AI password',
      html: passwordResetEmailHtml(emailOpts),
      text: passwordResetEmailText(emailOpts),
    });
  }

  /**
   * Send a scan completion summary.
   */
  async sendScanSummary(
    opts: Omit<ScanSummaryEmailOptions, 'appUrl' | 'unsubscribeUrl' | 'settingsUrl'>
  ): Promise<SendEmailResult> {
    const emailOpts: ScanSummaryEmailOptions = {
      ...opts,
      appUrl: this.appUrl,
      unsubscribeUrl: this.unsubscribeUrl(opts.email),
      settingsUrl: this.settingsUrl(),
    };

    return this.send({
      to: opts.email,
      subject: `✅ Scan complete: ${opts.opportunitiesFound} opportunities found for "${opts.query}"`,
      html: scanSummaryEmailHtml(emailOpts),
    });
  }

  /**
   * Send a payment failure notification.
   */
  async sendPaymentFailed(opts: {
    name?: string;
    email: string;
  }): Promise<SendEmailResult> {
    const emailOpts: PaymentFailedEmailOptions = {
      name: opts.name,
      email: opts.email,
      appUrl: this.appUrl,
      unsubscribeUrl: this.unsubscribeUrl(opts.email),
      settingsUrl: this.settingsUrl(),
    };

    return this.send({
      to: opts.email,
      subject: '💳 Action needed: Update your payment method — Flipper AI',
      html: paymentFailedEmailHtml(emailOpts),
      text: paymentFailedEmailText(emailOpts),
    });
  }
}

// ---------------------------------------------------------------------------
// Singleton factory
// ---------------------------------------------------------------------------

function createEmailService(): EmailService {
  const resendApiKey = process.env.RESEND_API_KEY;
  const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000';
  const fromAddress =
    process.env.EMAIL_FROM || 'Flipper AI <notifications@flipper-ai.app>';

  let provider: EmailProvider;

  /* istanbul ignore next -- production branches excluded from test env (NODE_ENV=test) */
  if (resendApiKey && process.env.NODE_ENV !== 'test') {
    provider = new ResendProvider(resendApiKey, fromAddress);
    logger.info('[EmailService] Resend provider initialized', { fromAddress });
  } else {
    provider = new NullProvider();
    /* istanbul ignore next -- production warning excluded from test env */
    if (process.env.NODE_ENV !== 'test') {
      logger.warn('[EmailService] No RESEND_API_KEY — using null provider (emails logged only)');
    }
  }

  return new EmailService(provider, appUrl, fromAddress);
}

/** Singleton email service — import this everywhere. */
export const emailService = createEmailService();

/** Export provider classes for testing */
export { ResendProvider, NullProvider };
