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
  scanSummaryEmailText,
  escapeHtml,
  validateExternalUrl,
  reviewReceivedEmailHtml,
  reviewReceivedEmailText,
  flipGoneColdEmailHtml,
  flipGoneColdEmailText,
  flipTurnedHotEmailHtml,
  flipTurnedHotEmailText,
  priceChangeAlertEmailHtml,
  priceChangeAlertEmailText,
  paymentFailedEmailHtml,
  paymentFailedEmailText,
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

  describe('scanSummaryEmailText', () => {
    const scanTextOpts: ScanSummaryEmailOptions = {
      email: 'user@example.com',
      scanId: 'scan-002',
      query: 'PlayStation 5',
      marketplace: 'craigslist',
      opportunitiesFound: 3,
      totalResults: 50,
      duration: 12,
      appUrl: baseUrl,
      unsubscribeUrl: unsubUrl,
      settingsUrl,
    };

    it('uses first name when name is provided', () => {
      const text = scanSummaryEmailText({ ...scanTextOpts, name: 'Carol Jones' });
      expect(text).toContain('Carol');
    });

    it('uses "there" when name is not provided', () => {
      const text = scanSummaryEmailText(scanTextOpts);
      expect(text).toContain('there');
    });
  });
});

// ---------------------------------------------------------------------------
// Story 10.5: escapeHtml
// ---------------------------------------------------------------------------
describe('escapeHtml', () => {
  it('escapes <script> tags', () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      '&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;'
    );
  });

  it('escapes &', () => {
    expect(escapeHtml('AT&T')).toBe('AT&amp;T');
  });

  it('escapes "', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it("escapes '", () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('escapes < and >', () => {
    expect(escapeHtml('a < b > c')).toBe('a &lt; b &gt; c');
  });

  it('returns empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Story 10.5: validateExternalUrl
// ---------------------------------------------------------------------------
describe('validateExternalUrl', () => {
  const fallback = 'https://app.flipper.ai/opportunities';

  it('allows known platform domains', () => {
    expect(validateExternalUrl('https://www.ebay.com/item/123', fallback)).toBe('https://www.ebay.com/item/123');
    expect(validateExternalUrl('https://mercari.com/listing/abc', fallback)).toBe('https://mercari.com/listing/abc');
    expect(validateExternalUrl('https://craigslist.org/search', fallback)).toBe('https://craigslist.org/search');
    expect(validateExternalUrl('https://offerup.com/item/1', fallback)).toBe('https://offerup.com/item/1');
    expect(validateExternalUrl('https://facebook.com/marketplace/1', fallback)).toBe('https://facebook.com/marketplace/1');
  });

  it('rejects unknown domains with fallback', () => {
    expect(validateExternalUrl('https://evil.com/phish', fallback)).toBe(fallback);
    expect(validateExternalUrl('https://ebay.com.evil.com/item', fallback)).toBe(fallback);
  });

  it('returns fallback for null/undefined', () => {
    expect(validateExternalUrl(null, fallback)).toBe(fallback);
    expect(validateExternalUrl(undefined, fallback)).toBe(fallback);
  });

  it('returns fallback for invalid URLs', () => {
    expect(validateExternalUrl('not-a-url', fallback)).toBe(fallback);
  });
});

// ---------------------------------------------------------------------------
// Story 10.5: reviewReceivedEmailHtml / reviewReceivedEmailText
// ---------------------------------------------------------------------------
const reviewOpts = {
  email: 'buyer@example.com',
  platform: 'eBay',
  rating: 5,
  reviewText: 'Great seller, fast shipping!',
  reviewerName: 'Alice',
  reviewUrl: 'https://ebay.com/feedback/123',
  appUrl: baseUrl,
  unsubscribeUrl: unsubUrl,
  settingsUrl,
};

describe('reviewReceivedEmailHtml', () => {
  it('renders platform, star rating, review text, reviewer name, review link', () => {
    const html = reviewReceivedEmailHtml(reviewOpts);
    expect(html).toContain('eBay');
    expect(html).toContain('&#9733;'); // filled stars
    expect(html).toContain('Great seller');
    expect(html).toContain('Alice');
    expect(html).toContain('https://ebay.com/feedback/123');
    expect(html).toContain('Unsubscribe');
  });

  it('escapes XSS in reviewText', () => {
    const html = reviewReceivedEmailHtml({ ...reviewOpts, reviewText: '<b>evil</b>' });
    expect(html).not.toContain('<b>evil</b>');
    expect(html).toContain('&lt;b&gt;');
  });

  it('falls back to "A buyer" when reviewerName is null', () => {
    const html = reviewReceivedEmailHtml({ ...reviewOpts, reviewerName: undefined });
    expect(html).toContain('A buyer');
  });

  it('replaces non-whitelisted reviewUrl with app fallback', () => {
    const html = reviewReceivedEmailHtml({ ...reviewOpts, reviewUrl: 'https://evil.com' });
    expect(html).not.toContain('evil.com');
    expect(html).toContain(baseUrl);
  });

  it('omits greeting when name is not provided', () => {
    const html = reviewReceivedEmailHtml({ ...reviewOpts, name: undefined });
    expect(html).not.toContain('Hi ');
  });

  it('includes greeting when name is provided', () => {
    const html = reviewReceivedEmailHtml({ ...reviewOpts, name: 'Bob Smith' });
    expect(html).toContain('Hi Bob');
  });
});

describe('reviewReceivedEmailText', () => {
  it('includes all required content', () => {
    const text = reviewReceivedEmailText(reviewOpts);
    expect(text).toContain('eBay');
    expect(text).toContain('5/5 stars');
    expect(text).toContain('Alice');
    expect(text).toContain('Great seller');
    expect(text).toContain('ebay.com/feedback/123');
  });

  it('includes greeting when name is provided', () => {
    const text = reviewReceivedEmailText({ ...reviewOpts, name: 'Bob Smith' });
    expect(text).toContain('Hi Bob');
  });
});

// ---------------------------------------------------------------------------
// Story 10.5: flipGoneColdEmailHtml / flipGoneColdEmailText
// ---------------------------------------------------------------------------
const coldOpts = {
  email: 'user@example.com',
  listingTitle: 'Sony PS5',
  hoursSinceLastResponse: 26,
  sellerName: 'John',
  coldReason: 'user_not_replied' as const,
  threadUrl: `${baseUrl}/messages/listing-123`,
  appUrl: baseUrl,
  unsubscribeUrl: unsubUrl,
  settingsUrl,
};

describe('flipGoneColdEmailHtml', () => {
  it('renders user_not_replied headline and listing title', () => {
    const html = flipGoneColdEmailHtml(coldOpts);
    expect(html).toContain("You haven't responded");
    expect(html).toContain('Sony PS5');
    expect(html).toContain('26h since last response');
    expect(html).toContain('John');
    expect(html).toContain(`${baseUrl}/messages/listing-123`);
  });

  it('renders seller_not_replied headline', () => {
    const html = flipGoneColdEmailHtml({ ...coldOpts, coldReason: 'seller_not_replied' });
    expect(html).toContain("Seller hasn't responded");
  });

  it('escapes XSS in listingTitle', () => {
    const html = flipGoneColdEmailHtml({ ...coldOpts, listingTitle: '<img src=x onerror=alert(1)>' });
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('falls back to "the seller" when sellerName is null', () => {
    const html = flipGoneColdEmailHtml({ ...coldOpts, sellerName: undefined });
    expect(html).toContain('the seller');
  });
});

describe('flipGoneColdEmailText', () => {
  it('includes all required content for user_not_replied', () => {
    const text = flipGoneColdEmailText(coldOpts);
    expect(text).toContain("You haven't responded");
    expect(text).toContain('Sony PS5');
    expect(text).toContain('26h');
    expect(text).toContain('John');
  });

  it('uses seller_not_replied headline', () => {
    const text = flipGoneColdEmailText({ ...coldOpts, coldReason: 'seller_not_replied' });
    expect(text).toContain("Seller hasn't responded");
  });

  it('includes greeting when name is provided', () => {
    const text = flipGoneColdEmailText({ ...coldOpts, name: 'Dave Green' });
    expect(text).toContain('Hi Dave');
  });
});

// ---------------------------------------------------------------------------
// Story 10.5: flipTurnedHotEmailHtml / flipTurnedHotEmailText
// ---------------------------------------------------------------------------
const hotOpts = {
  email: 'user@example.com',
  listingTitle: 'Nintendo Switch',
  unreadCount: 5,
  latestMessagePreview: 'Still interested?',
  sellerName: 'Seller Bob',
  threadUrl: `${baseUrl}/messages/listing-456`,
  appUrl: baseUrl,
  unsubscribeUrl: unsubUrl,
  settingsUrl,
};

describe('flipTurnedHotEmailHtml', () => {
  it('renders listing title, unread count, message preview, respond link', () => {
    const html = flipTurnedHotEmailHtml(hotOpts);
    expect(html).toContain('Nintendo Switch');
    expect(html).toContain('5 unread messages');
    expect(html).toContain('Still interested?');
    expect(html).toContain(`${baseUrl}/messages/listing-456`);
  });

  it('escapes XSS in latestMessagePreview', () => {
    const html = flipTurnedHotEmailHtml({ ...hotOpts, latestMessagePreview: '<script>evil()</script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('falls back to "the seller" when sellerName is null', () => {
    const html = flipTurnedHotEmailHtml({ ...hotOpts, sellerName: undefined });
    expect(html).toContain('the seller');
  });
});

describe('flipTurnedHotEmailText', () => {
  it('includes all required content', () => {
    const text = flipTurnedHotEmailText(hotOpts);
    expect(text).toContain('Nintendo Switch');
    expect(text).toContain('5');
    expect(text).toContain('Still interested?');
    expect(text).toContain(`${baseUrl}/messages/listing-456`);
  });

  it('includes greeting when name is provided', () => {
    const text = flipTurnedHotEmailText({ ...hotOpts, name: 'Eve Kim' });
    expect(text).toContain('Hi Eve');
  });
});

// ---------------------------------------------------------------------------
// Story 10.5: priceChangeAlertEmailHtml / priceChangeAlertEmailText
// ---------------------------------------------------------------------------
const priceChangeOpts = {
  email: 'user@example.com',
  listingTitle: 'iPhone 14 Pro',
  platform: 'eBay',
  oldPrice: 800,
  newPrice: 650,
  changePercent: 18.75,
  direction: 'decrease' as const,
  updatedProfitMargin: 120,
  listingUrl: `${baseUrl}/opportunities/listing-789`,
  appUrl: baseUrl,
  unsubscribeUrl: unsubUrl,
  settingsUrl,
};

describe('priceChangeAlertEmailHtml', () => {
  it('renders listing title, old/new price, direction, profit margin (decrease)', () => {
    const html = priceChangeAlertEmailHtml(priceChangeOpts);
    expect(html).toContain('iPhone 14 Pro');
    expect(html).toContain('eBay');
    expect(html).toContain('$800.00');
    expect(html).toContain('$650.00');
    expect(html).toContain('18.8%');
    expect(html).toContain('$120.00'); // profit margin
    expect(html).toContain(`${baseUrl}/opportunities/listing-789`);
  });

  it('uses DANGER_COLOR for price increase', () => {
    const html = priceChangeAlertEmailHtml({ ...priceChangeOpts, direction: 'increase', oldPrice: 650, newPrice: 800 });
    expect(html).toContain('#dc2626'); // DANGER_COLOR
    expect(html).toContain('↑ Price Increase');
  });

  it('uses SUCCESS_COLOR for price decrease', () => {
    const html = priceChangeAlertEmailHtml(priceChangeOpts);
    expect(html).toContain('#16a34a'); // SUCCESS_COLOR
    expect(html).toContain('↓ Price Decrease');
  });

  it('escapes XSS in listingTitle', () => {
    const html = priceChangeAlertEmailHtml({ ...priceChangeOpts, listingTitle: '<b>evil</b>' });
    expect(html).not.toContain('<b>evil</b>');
    expect(html).toContain('&lt;b&gt;');
  });

  it('omits profit margin line when not provided', () => {
    const html = priceChangeAlertEmailHtml({ ...priceChangeOpts, updatedProfitMargin: undefined });
    expect(html).not.toContain('profit margin');
  });
});

describe('priceChangeAlertEmailText', () => {
  it('includes all required content', () => {
    const text = priceChangeAlertEmailText(priceChangeOpts);
    expect(text).toContain('iPhone 14 Pro');
    expect(text).toContain('decreased');
    expect(text).toContain('$800.00');
    expect(text).toContain('$650.00');
    expect(text).toContain('$120.00');
  });

  it('uses "increased" for price increase', () => {
    const text = priceChangeAlertEmailText({ ...priceChangeOpts, direction: 'increase' });
    expect(text).toContain('increased');
  });

  it('includes greeting when name is provided', () => {
    const text = priceChangeAlertEmailText({ ...priceChangeOpts, name: 'Frank Lee' });
    expect(text).toContain('Hi Frank');
  });
});

describe('paymentFailedEmailHtml', () => {
  const paymentFailedOpts = {
    email: 'user@example.com',
    appUrl: baseUrl,
    settingsUrl,
    unsubscribeUrl: unsubUrl,
  };

  it('uses first name when name is provided', () => {
    const html = paymentFailedEmailHtml({ ...paymentFailedOpts, name: 'Alice Wonderland' });
    expect(html).toContain('Alice');
    expect(html).not.toContain('Hey there');
  });

  it('uses "there" when name is not provided', () => {
    const html = paymentFailedEmailHtml(paymentFailedOpts);
    expect(html).toContain('there');
  });
});

describe('paymentFailedEmailText', () => {
  const paymentFailedOpts = {
    email: 'user@example.com',
    appUrl: baseUrl,
    settingsUrl,
    unsubscribeUrl: unsubUrl,
  };

  it('uses first name when name is provided', () => {
    const text = paymentFailedEmailText({ ...paymentFailedOpts, name: 'Bob Smith' });
    expect(text).toContain('Bob');
    expect(text).toContain('Payment Update Needed');
  });

  it('uses "there" when name is not provided', () => {
    const text = paymentFailedEmailText(paymentFailedOpts);
    expect(text).toContain('there');
  });
});
