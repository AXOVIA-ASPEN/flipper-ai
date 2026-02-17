/**
 * Tests for email-templates.ts - branch coverage for optional parameters
 * Author: Stephen Boyett
 * Company: Axovia AI
 */

import {
  welcomeEmailHtml,
  digestEmailHtml,
  digestEmailText,
  priceAlertEmailHtml,
  scanSummaryEmailHtml,
  type WelcomeEmailOptions,
  type DigestEmailOptions,
  type PriceAlertEmailOptions,
  type ScanSummaryEmailOptions,
} from '@/lib/email-templates';

const baseUrl = 'https://flipper-ai.app';
const unsubUrl = `${baseUrl}/api/user/unsubscribe?token=dGVzdA`;
const settingsUrl = `${baseUrl}/settings#notifications`;

describe('email-templates - branch coverage', () => {
  describe('welcomeEmailHtml', () => {
    it('uses "there" when name is not provided', () => {
      const opts: WelcomeEmailOptions = {
        email: 'user@example.com',
        appUrl: baseUrl,
        unsubscribeUrl: unsubUrl,
        settingsUrl,
        // no name
      };
      const html = welcomeEmailHtml(opts);
      expect(html).toContain('there');
    });

    it('uses first name when full name provided', () => {
      const opts: WelcomeEmailOptions = {
        email: 'user@example.com',
        appUrl: baseUrl,
        unsubscribeUrl: unsubUrl,
        settingsUrl,
        name: 'Alice Wonderland',
      };
      const html = welcomeEmailHtml(opts);
      expect(html).toContain('Alice');
    });
  });

  describe('digestEmailHtml - without name', () => {
    const baseOpts: DigestEmailOptions = {
      email: 'user@example.com',
      scanDate: '2026-02-17',
      totalScanned: 100,
      opportunities: [],
      appUrl: baseUrl,
      unsubscribeUrl: unsubUrl,
      settingsUrl,
      // no name
    };

    it('defaults to "there" when name is not provided', () => {
      const html = digestEmailHtml(baseOpts);
      expect(html).toContain('there');
    });

    it('uses first name when full name provided', () => {
      const html = digestEmailHtml({ ...baseOpts, name: 'John Doe' });
      expect(html).toContain('John');
    });
  });

  describe('digestEmailText - without name', () => {
    const baseOpts: DigestEmailOptions = {
      email: 'user@example.com',
      scanDate: '2026-02-17',
      totalScanned: 50,
      opportunities: [],
      appUrl: baseUrl,
      unsubscribeUrl: unsubUrl,
      settingsUrl,
    };

    it('defaults to "there" when name is missing', () => {
      const text = digestEmailText(baseOpts);
      expect(text).toContain('Hi there');
    });
  });

  describe('priceAlertEmailHtml - without name', () => {
    const baseOpts: PriceAlertEmailOptions = {
      email: 'user@example.com',
      listing: {
        title: 'Apple Watch Series 9',
        url: 'https://marketplace.com/item/123',
        originalPrice: 250,
        newPrice: 180,
        priceDrop: 70,
        priceDropPercent: 28,
        marketplace: 'Craigslist',
      },
      appUrl: baseUrl,
      unsubscribeUrl: unsubUrl,
      settingsUrl,
      // no name
    };

    it('defaults to "there" when name is not provided', () => {
      const html = priceAlertEmailHtml(baseOpts);
      expect(html).toContain('there');
    });

    it('uses first name when provided', () => {
      const html = priceAlertEmailHtml({ ...baseOpts, name: 'Bob Smith' });
      expect(html).toContain('Bob');
    });
  });

  describe('scanSummaryEmailHtml', () => {
    const baseOpts: ScanSummaryEmailOptions = {
      email: 'user@example.com',
      scanId: 'scan-001',
      query: 'PlayStation 5',
      marketplace: 'craigslist',
      opportunitiesFound: 3,
      totalResults: 50,
      duration: 12,
      appUrl: baseUrl,
      unsubscribeUrl: unsubUrl,
      settingsUrl,
      // no name, no topOpportunity
    };

    it('defaults to "there" when name is not provided (no topOpportunity)', () => {
      const html = scanSummaryEmailHtml(baseOpts);
      expect(html).toContain('there');
    });

    it('includes top opportunity when provided', () => {
      const html = scanSummaryEmailHtml({
        ...baseOpts,
        name: 'Carol',
        topOpportunity: {
          title: 'PS5 Disc Edition',
          price: 300,
          profit: 150,
          profitPercent: 50,
          url: 'https://craigslist.org/ps5',
          marketplace: 'Craigslist',
          valueScore: 85,
        },
      });
      expect(html).toContain('Carol');
      expect(html).toContain('PS5 Disc Edition');
    });
  });
});
