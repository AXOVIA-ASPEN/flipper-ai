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
  scanSummaryEmailText,
  paymentFailedEmailHtml,
  paymentFailedEmailText,
  opportunityFoundEmailHtml,
  opportunityFoundEmailText,
  flipPurchasedEmailHtml,
  flipPurchasedEmailText,
  flipListedEmailHtml,
  flipListedEmailText,
  flipSoldEmailHtml,
  flipSoldEmailText,
  reviewReceivedEmailHtml,
  reviewReceivedEmailText,
  flipGoneColdEmailHtml,
  flipGoneColdEmailText,
  flipTurnedHotEmailHtml,
  flipTurnedHotEmailText,
  priceChangeAlertEmailHtml,
  priceChangeAlertEmailText,
  type WelcomeEmailOptions,
  type DigestEmailOptions,
  type PriceAlertEmailOptions,
  type PasswordResetEmailOptions,
  type ScanSummaryEmailOptions,
  type PaymentFailedEmailOptions,
  type OpportunityFoundEmailOptions,
  type FlipPurchasedEmailOptions,
  type FlipListedEmailOptions,
  type FlipSoldEmailOptions,
  type ReviewReceivedEmailOptions,
  type FlipGoneColdEmailOptions,
  type FlipTurnedHotEmailOptions,
  type PriceChangeAlertEmailOptions,
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
  headers?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Flip lifecycle email data contracts (public API — no internal URLs)
// ---------------------------------------------------------------------------

export interface OpportunityFoundEmailData {
  platform: string;
  buyPrice: number;
  estimatedProfit: number;
  flippabilityScore: number;
  flippabilityLabel: string;
  itemTitle: string;
  imageUrl?: string;
  opportunityId?: string;
  eventCreatedAt?: Date;
}

export interface FlipSoldEmailData {
  itemTitle: string;
  salePrice: number;
  actualProfit: number;
  roiPercent: number;
  daysToFlip?: number;
  platform: string;
  purchasePrice: number;
  opportunityId?: string;
  eventCreatedAt?: Date;
}

export interface FlipPurchasedEmailData {
  itemTitle: string;
  purchasePrice: number;
  estimatedProfit: number;
  platform: string;
  opportunityId?: string;
  eventCreatedAt?: Date;
}

export interface FlipListedEmailData {
  itemTitle: string;
  destinationPlatform: string;
  listingUrl?: string;
  opportunityId?: string;
  eventCreatedAt?: Date;
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
        headers: params.headers,
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
      text: scanSummaryEmailText(emailOpts),
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

  // ---- Flip lifecycle senders (Story 10.3) --------------------------------

  /** Build List-Unsubscribe headers for RFC 8058 compliance. */
  private listUnsubscribeHeaders(email: string): Record<string, string> {
    const url = this.unsubscribeUrl(email);
    return {
      'List-Unsubscribe': `<${url}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    };
  }

  /**
   * Send an opportunity-found email.
   */
  async sendOpportunityFound(
    to: string,
    data: OpportunityFoundEmailData & { name?: string }
  ): Promise<SendEmailResult> {
    const opportunityUrl = data.opportunityId
      ? `${this.appUrl}/opportunities?id=${data.opportunityId}`
      : undefined;
    const emailOpts: OpportunityFoundEmailOptions = {
      email: to,
      name: data.name,
      platform: data.platform,
      buyPrice: data.buyPrice,
      estimatedProfit: data.estimatedProfit,
      flippabilityScore: data.flippabilityScore,
      flippabilityLabel: data.flippabilityLabel,
      itemTitle: data.itemTitle,
      imageUrl: data.imageUrl,
      eventCreatedAt: data.eventCreatedAt,
      opportunityUrl,
      appUrl: this.appUrl,
      unsubscribeUrl: this.unsubscribeUrl(to),
      settingsUrl: this.settingsUrl(),
    };

    return this.send({
      to,
      subject: `🔥 New Flip Opportunity: ${data.itemTitle.slice(0, 60)}`,
      html: opportunityFoundEmailHtml(emailOpts),
      text: opportunityFoundEmailText(emailOpts),
      headers: this.listUnsubscribeHeaders(to),
    });
  }

  /**
   * Send a flip-purchased confirmation email.
   */
  async sendFlipPurchased(
    to: string,
    data: FlipPurchasedEmailData & { name?: string }
  ): Promise<SendEmailResult> {
    const opportunityUrl = data.opportunityId
      ? `${this.appUrl}/opportunities?id=${data.opportunityId}`
      : undefined;
    const emailOpts: FlipPurchasedEmailOptions = {
      email: to,
      name: data.name,
      itemTitle: data.itemTitle,
      purchasePrice: data.purchasePrice,
      estimatedProfit: data.estimatedProfit,
      platform: data.platform,
      eventCreatedAt: data.eventCreatedAt,
      opportunityUrl,
      appUrl: this.appUrl,
      unsubscribeUrl: this.unsubscribeUrl(to),
      settingsUrl: this.settingsUrl(),
    };

    return this.send({
      to,
      subject: `🛒 Flip Purchased: ${data.itemTitle.slice(0, 60)}`,
      html: flipPurchasedEmailHtml(emailOpts),
      text: flipPurchasedEmailText(emailOpts),
      headers: this.listUnsubscribeHeaders(to),
    });
  }

  /**
   * Send a flip-listed notification email.
   */
  async sendFlipListed(
    to: string,
    data: FlipListedEmailData & { name?: string }
  ): Promise<SendEmailResult> {
    const opportunityUrl = data.opportunityId
      ? `${this.appUrl}/opportunities?id=${data.opportunityId}`
      : undefined;
    const emailOpts: FlipListedEmailOptions = {
      email: to,
      name: data.name,
      itemTitle: data.itemTitle,
      destinationPlatform: data.destinationPlatform,
      listingUrl: data.listingUrl,
      eventCreatedAt: data.eventCreatedAt,
      opportunityUrl,
      appUrl: this.appUrl,
      unsubscribeUrl: this.unsubscribeUrl(to),
      settingsUrl: this.settingsUrl(),
    };

    return this.send({
      to,
      subject: `📦 Flip Listed: ${data.itemTitle.slice(0, 60)}`,
      html: flipListedEmailHtml(emailOpts),
      text: flipListedEmailText(emailOpts),
      headers: this.listUnsubscribeHeaders(to),
    });
  }

  // ---- Smart alert senders (Story 10.5) ----------------------------------

  /**
   * Send a review received alert email.
   */
  async sendReviewReceived(
    opts: Omit<ReviewReceivedEmailOptions, 'appUrl' | 'unsubscribeUrl' | 'settingsUrl'>
  ): Promise<SendEmailResult> {
    const emailOpts: ReviewReceivedEmailOptions = {
      ...opts,
      appUrl: this.appUrl,
      unsubscribeUrl: this.unsubscribeUrl(opts.email),
      settingsUrl: this.settingsUrl(),
    };
    const rating = Math.max(1, Math.min(5, Math.round(opts.rating)));
    return this.send({
      to: opts.email,
      subject: `New ${rating}-star review on ${opts.platform}`,
      html: reviewReceivedEmailHtml(emailOpts),
      text: reviewReceivedEmailText(emailOpts),
      headers: this.listUnsubscribeHeaders(opts.email),
    });
  }

  /**
   * Send a flip gone cold alert email.
   */
  async sendFlipGoneCold(
    opts: Omit<FlipGoneColdEmailOptions, 'appUrl' | 'unsubscribeUrl' | 'settingsUrl'>
  ): Promise<SendEmailResult> {
    const emailOpts: FlipGoneColdEmailOptions = {
      ...opts,
      appUrl: this.appUrl,
      unsubscribeUrl: this.unsubscribeUrl(opts.email),
      settingsUrl: this.settingsUrl(),
    };
    return this.send({
      to: opts.email,
      subject: `Flip going cold: ${opts.listingTitle} — no response for ${opts.hoursSinceLastResponse}h`,
      html: flipGoneColdEmailHtml(emailOpts),
      text: flipGoneColdEmailText(emailOpts),
      headers: this.listUnsubscribeHeaders(opts.email),
    });
  }

  /**
   * Send a flip turned hot alert email.
   */
  async sendFlipTurnedHot(
    opts: Omit<FlipTurnedHotEmailOptions, 'appUrl' | 'unsubscribeUrl' | 'settingsUrl'>
  ): Promise<SendEmailResult> {
    const emailOpts: FlipTurnedHotEmailOptions = {
      ...opts,
      appUrl: this.appUrl,
      unsubscribeUrl: this.unsubscribeUrl(opts.email),
      settingsUrl: this.settingsUrl(),
    };
    return this.send({
      to: opts.email,
      subject: `${opts.unreadCount} messages on ${opts.listingTitle}`,
      html: flipTurnedHotEmailHtml(emailOpts),
      text: flipTurnedHotEmailText(emailOpts),
      headers: this.listUnsubscribeHeaders(opts.email),
    });
  }

  /**
   * Send a price change alert email.
   */
  async sendPriceChangeAlert(
    opts: Omit<PriceChangeAlertEmailOptions, 'appUrl' | 'unsubscribeUrl' | 'settingsUrl'>
  ): Promise<SendEmailResult> {
    const emailOpts: PriceChangeAlertEmailOptions = {
      ...opts,
      appUrl: this.appUrl,
      unsubscribeUrl: this.unsubscribeUrl(opts.email),
      settingsUrl: this.settingsUrl(),
    };
    const dirLabel = opts.direction === 'increase' ? 'increase' : 'decrease';
    return this.send({
      to: opts.email,
      subject: `Price ${dirLabel}: ${opts.listingTitle} $${opts.oldPrice.toFixed(2)} → $${opts.newPrice.toFixed(2)}`,
      html: priceChangeAlertEmailHtml(emailOpts),
      text: priceChangeAlertEmailText(emailOpts),
      headers: this.listUnsubscribeHeaders(opts.email),
    });
  }

  /**
   * Send a flip-sold celebration email.
   */
  async sendFlipSold(
    to: string,
    data: FlipSoldEmailData & { name?: string }
  ): Promise<SendEmailResult> {
    const opportunityUrl = data.opportunityId
      ? `${this.appUrl}/opportunities?id=${data.opportunityId}`
      : undefined;
    const emailOpts: FlipSoldEmailOptions = {
      email: to,
      name: data.name,
      itemTitle: data.itemTitle,
      salePrice: data.salePrice,
      actualProfit: data.actualProfit,
      roiPercent: data.roiPercent,
      daysToFlip: data.daysToFlip,
      platform: data.platform,
      purchasePrice: data.purchasePrice,
      eventCreatedAt: data.eventCreatedAt,
      opportunityUrl,
      appUrl: this.appUrl,
      unsubscribeUrl: this.unsubscribeUrl(to),
      settingsUrl: this.settingsUrl(),
    };

    return this.send({
      to,
      subject: `🎉 Flip Sold: ${data.itemTitle.slice(0, 60)} — +$${(data.actualProfit ?? 0).toFixed(0)} profit`,
      html: flipSoldEmailHtml(emailOpts),
      text: flipSoldEmailText(emailOpts),
      headers: this.listUnsubscribeHeaders(to),
    });
  }
}

// ---------------------------------------------------------------------------
// Singleton factory
// ---------------------------------------------------------------------------

function createEmailService(): EmailService {
  const resendApiKey = process.env.RESEND_API_KEY;
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
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
