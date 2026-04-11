/**
 * @file src/__tests__/lib/email-templates-flip.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-09
 * @version 1.0
 * @brief Unit tests for flip lifecycle email templates.
 *
 * @description
 * Tests the 4 HTML+text template pairs for opportunity found, flip purchased,
 * flip listed, and flip sold emails. Verifies data field presence, null safety,
 * HTML entity sanitization, and text fallback readability.
 */

import {
  opportunityFoundEmailHtml,
  opportunityFoundEmailText,
  flipPurchasedEmailHtml,
  flipPurchasedEmailText,
  flipListedEmailHtml,
  flipListedEmailText,
  flipSoldEmailHtml,
  flipSoldEmailText,
  escapeHtml,
  truncate,
  relativeTime,
  scoreColor,
  type OpportunityFoundEmailOptions,
  type FlipPurchasedEmailOptions,
  type FlipListedEmailOptions,
  type FlipSoldEmailOptions,
} from '@/lib/email-templates';

// ---------------------------------------------------------------------------
// Shared base options
// ---------------------------------------------------------------------------

const BASE_URLS = {
  appUrl: 'https://app.test',
  unsubscribeUrl: 'https://app.test/unsub',
  settingsUrl: 'https://app.test/settings',
  email: 'test@test.com',
};

// ---------------------------------------------------------------------------
// Helper function tests
// ---------------------------------------------------------------------------

describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes angle brackets', () => {
    expect(escapeHtml('<div>hello</div>')).toBe('&lt;div&gt;hello&lt;/div&gt;');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('escapes a full XSS payload', () => {
    const xss = '<script>alert("xss")</script>';
    const escaped = escapeHtml(xss);
    expect(escaped).not.toContain('<script>');
    expect(escaped).toContain('&lt;script&gt;');
    expect(escaped).toContain('&quot;xss&quot;');
  });

  it('returns unchanged string when no special characters', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('truncate', () => {
  it('returns unchanged string when within limit', () => {
    expect(truncate('short', 100)).toBe('short');
  });

  it('returns unchanged string when exactly at limit', () => {
    const str = 'a'.repeat(100);
    expect(truncate(str, 100)).toBe(str);
  });

  it('truncates and adds ellipsis when over limit', () => {
    const str = 'a'.repeat(110);
    const result = truncate(str, 100);
    expect(result.length).toBe(100);
    expect(result.endsWith('…')).toBe(true);
    expect(result).toBe('a'.repeat(99) + '…');
  });

  it('handles single character limit', () => {
    const result = truncate('hello', 1);
    expect(result).toBe('…');
  });
});

describe('relativeTime', () => {
  it('returns "Just now" for dates less than 1 minute ago', () => {
    const date = new Date(Date.now() - 30_000); // 30 seconds ago
    expect(relativeTime(date)).toBe('Just now');
  });

  it('returns "1 minute ago" for exactly 1 minute', () => {
    const date = new Date(Date.now() - 60_000);
    expect(relativeTime(date)).toBe('1 minute ago');
  });

  it('returns plural minutes for multiple minutes', () => {
    const date = new Date(Date.now() - 5 * 60_000);
    expect(relativeTime(date)).toBe('5 minutes ago');
  });

  it('returns "1 hour ago" for exactly 1 hour', () => {
    const date = new Date(Date.now() - 60 * 60_000);
    expect(relativeTime(date)).toBe('1 hour ago');
  });

  it('returns plural hours for multiple hours', () => {
    const date = new Date(Date.now() - 3 * 60 * 60_000);
    expect(relativeTime(date)).toBe('3 hours ago');
  });

  it('returns "1 day ago" for exactly 24 hours', () => {
    const date = new Date(Date.now() - 24 * 60 * 60_000);
    expect(relativeTime(date)).toBe('1 day ago');
  });

  it('returns plural days for multiple days', () => {
    const date = new Date(Date.now() - 7 * 24 * 60 * 60_000);
    expect(relativeTime(date)).toBe('7 days ago');
  });

  it('returns "59 minutes ago" at boundary before hour', () => {
    const date = new Date(Date.now() - 59 * 60_000);
    expect(relativeTime(date)).toBe('59 minutes ago');
  });

  it('returns "23 hours ago" at boundary before day', () => {
    const date = new Date(Date.now() - 23 * 60 * 60_000);
    expect(relativeTime(date)).toBe('23 hours ago');
  });
});

describe('scoreColor', () => {
  it('returns green for score >= 80', () => {
    const color = scoreColor(80);
    expect(color).toBe('#16a34a'); // SUCCESS_COLOR / green-600
  });

  it('returns green for score 100', () => {
    expect(scoreColor(100)).toBe('#16a34a');
  });

  it('returns amber for score 60-79', () => {
    expect(scoreColor(60)).toBe('#d97706'); // AMBER_COLOR
    expect(scoreColor(79)).toBe('#d97706');
  });

  it('returns red for score below 60', () => {
    expect(scoreColor(59)).toBe('#dc2626'); // DANGER_COLOR
    expect(scoreColor(0)).toBe('#dc2626');
  });
});

// ---------------------------------------------------------------------------
// Opportunity Found Email
// ---------------------------------------------------------------------------

describe('Opportunity Found Email', () => {
  const baseOpts: OpportunityFoundEmailOptions = {
    ...BASE_URLS,
    platform: 'eBay',
    buyPrice: 49.99,
    estimatedProfit: 30.0,
    flippabilityScore: 85,
    flippabilityLabel: 'Excellent',
    itemTitle: 'Vintage Camera Nikon F3',
    imageUrl: 'https://img.test/camera.jpg',
    eventCreatedAt: new Date(Date.now() - 10 * 60_000),
    opportunityUrl: 'https://app.test/opportunities/abc123',
  };

  describe('HTML output', () => {
    it('contains the platform name', () => {
      const html = opportunityFoundEmailHtml(baseOpts);
      expect(html).toContain('eBay');
    });

    it('contains the buy price', () => {
      const html = opportunityFoundEmailHtml(baseOpts);
      expect(html).toContain('49.99');
    });

    it('contains the estimated profit', () => {
      const html = opportunityFoundEmailHtml(baseOpts);
      expect(html).toContain('30.00');
    });

    it('contains the flippability score', () => {
      const html = opportunityFoundEmailHtml(baseOpts);
      expect(html).toContain('85');
    });

    it('contains the item title', () => {
      const html = opportunityFoundEmailHtml(baseOpts);
      expect(html).toContain('Vintage Camera Nikon F3');
    });

    it('contains the image URL', () => {
      const html = opportunityFoundEmailHtml(baseOpts);
      expect(html).toContain('https://img.test/camera.jpg');
    });

    it('contains the opportunity URL', () => {
      const html = opportunityFoundEmailHtml(baseOpts);
      expect(html).toContain('https://app.test/opportunities/abc123');
    });

    it('contains the flippability label', () => {
      const html = opportunityFoundEmailHtml(baseOpts);
      expect(html).toContain('Excellent');
    });

    it('does not contain {{unsubscribe_url}} placeholder', () => {
      const html = opportunityFoundEmailHtml(baseOpts);
      expect(html).not.toContain('{{unsubscribe_url}}');
      expect(html).not.toContain('{{settings_url}}');
      expect(html).not.toContain('{{app_url}}');
    });

    it('replaces placeholders with actual URLs', () => {
      const html = opportunityFoundEmailHtml(baseOpts);
      expect(html).toContain('https://app.test/unsub');
      expect(html).toContain('https://app.test/settings');
      expect(html).toContain('https://app.test');
    });

    it('sanitizes XSS in item title in the body', () => {
      const xssOpts = {
        ...baseOpts,
        itemTitle: '<script>alert("xss")</script>',
      };
      const html = opportunityFoundEmailHtml(xssOpts);
      // The body content uses escapeHtml(truncate(title))
      expect(html).toContain('&lt;script&gt;');
    });

    it('truncates long titles in the body to 100 characters', () => {
      const longTitle = 'A'.repeat(150);
      const longOpts = { ...baseOpts, itemTitle: longTitle };
      const html = opportunityFoundEmailHtml(longOpts);
      // The body uses truncate(title, 100) which yields 99 chars + ellipsis
      expect(html).toContain('A'.repeat(99) + '\u2026');
    });

    it('handles missing imageUrl gracefully', () => {
      const noImageOpts = { ...baseOpts, imageUrl: undefined };
      const html = opportunityFoundEmailHtml(noImageOpts);
      expect(html).not.toContain('<img');
      expect(html).toContain('Vintage Camera Nikon F3');
    });

    it('handles missing eventCreatedAt gracefully', () => {
      const noDateOpts = { ...baseOpts, eventCreatedAt: undefined };
      const html = opportunityFoundEmailHtml(noDateOpts);
      expect(html).toContain('Vintage Camera Nikon F3');
    });

    it('handles null-ish numeric fields via ?? 0', () => {
      const nullNumOpts = {
        ...baseOpts,
        buyPrice: undefined as unknown as number,
        estimatedProfit: undefined as unknown as number,
        flippabilityScore: undefined as unknown as number,
      };
      // Should not throw - ?? 0 guards toFixed calls
      const html = opportunityFoundEmailHtml(nullNumOpts);
      expect(html).toContain('0.00'); // buyPrice and profit default to 0
    });

    it('defaults to /opportunities when opportunityUrl missing', () => {
      const noUrlOpts = { ...baseOpts, opportunityUrl: undefined };
      const html = opportunityFoundEmailHtml(noUrlOpts);
      expect(html).toContain('https://app.test/opportunities');
    });

    it('uses "there" when name is not provided', () => {
      const noNameOpts = { ...baseOpts, name: undefined };
      const html = opportunityFoundEmailHtml(noNameOpts);
      expect(html).toContain('Hey there');
    });

    it('uses first name when full name provided', () => {
      const namedOpts = { ...baseOpts, name: 'Alice Wonderland' };
      const html = opportunityFoundEmailHtml(namedOpts);
      expect(html).toContain('Hey Alice');
    });
  });

  describe('Text output', () => {
    it('contains the item title', () => {
      const text = opportunityFoundEmailText(baseOpts);
      expect(text).toContain('Vintage Camera Nikon F3');
    });

    it('contains the platform', () => {
      const text = opportunityFoundEmailText(baseOpts);
      expect(text).toContain('eBay');
    });

    it('contains the buy price', () => {
      const text = opportunityFoundEmailText(baseOpts);
      expect(text).toContain('$49.99');
    });

    it('contains the estimated profit', () => {
      const text = opportunityFoundEmailText(baseOpts);
      expect(text).toContain('+$30.00');
    });

    it('contains the flippability score', () => {
      const text = opportunityFoundEmailText(baseOpts);
      expect(text).toContain('85/100');
    });

    it('contains the flippability label', () => {
      const text = opportunityFoundEmailText(baseOpts);
      expect(text).toContain('Excellent');
    });

    it('contains relative time when eventCreatedAt provided', () => {
      const text = opportunityFoundEmailText(baseOpts);
      expect(text).toContain('minutes ago');
    });

    it('omits time when eventCreatedAt missing', () => {
      const noDateOpts = { ...baseOpts, eventCreatedAt: undefined };
      const text = opportunityFoundEmailText(noDateOpts);
      expect(text).not.toContain('ago');
    });

    it('contains the opportunity URL', () => {
      const text = opportunityFoundEmailText(baseOpts);
      expect(text).toContain('https://app.test/opportunities/abc123');
    });

    it('contains unsubscribe URL', () => {
      const text = opportunityFoundEmailText(baseOpts);
      expect(text).toContain('https://app.test/unsub');
    });

    it('handles null-ish numeric fields gracefully', () => {
      const nullOpts = {
        ...baseOpts,
        buyPrice: undefined as unknown as number,
        estimatedProfit: undefined as unknown as number,
        flippabilityScore: undefined as unknown as number,
      };
      const text = opportunityFoundEmailText(nullOpts);
      expect(text).toContain('$0.00');
    });
  });
});

// ---------------------------------------------------------------------------
// Flip Purchased Email
// ---------------------------------------------------------------------------

describe('Flip Purchased Email', () => {
  const baseOpts: FlipPurchasedEmailOptions = {
    ...BASE_URLS,
    itemTitle: 'Sony PlayStation 5 Controller',
    purchasePrice: 35.0,
    estimatedProfit: 25.0,
    platform: 'Facebook Marketplace',
    eventCreatedAt: new Date(Date.now() - 2 * 60 * 60_000),
    opportunityUrl: 'https://app.test/opportunities/xyz789',
  };

  describe('HTML output', () => {
    it('contains the item title', () => {
      const html = flipPurchasedEmailHtml(baseOpts);
      expect(html).toContain('Sony PlayStation 5 Controller');
    });

    it('contains the purchase price', () => {
      const html = flipPurchasedEmailHtml(baseOpts);
      expect(html).toContain('35.00');
    });

    it('contains the estimated profit', () => {
      const html = flipPurchasedEmailHtml(baseOpts);
      expect(html).toContain('25.00');
    });

    it('contains the platform', () => {
      const html = flipPurchasedEmailHtml(baseOpts);
      expect(html).toContain('Facebook Marketplace');
    });

    it('contains the opportunity URL', () => {
      const html = flipPurchasedEmailHtml(baseOpts);
      expect(html).toContain('https://app.test/opportunities/xyz789');
    });

    it('does not contain unresolved placeholders', () => {
      const html = flipPurchasedEmailHtml(baseOpts);
      expect(html).not.toContain('{{unsubscribe_url}}');
      expect(html).not.toContain('{{settings_url}}');
      expect(html).not.toContain('{{app_url}}');
    });

    it('sanitizes XSS in item title in the body', () => {
      const xssOpts = {
        ...baseOpts,
        itemTitle: '<script>alert("xss")</script>',
      };
      const html = flipPurchasedEmailHtml(xssOpts);
      // Body content uses escapeHtml(truncate(title))
      expect(html).toContain('&lt;script&gt;');
    });

    it('truncates long titles in the body to 100 characters', () => {
      const longTitle = 'B'.repeat(150);
      const longOpts = { ...baseOpts, itemTitle: longTitle };
      const html = flipPurchasedEmailHtml(longOpts);
      // Body uses truncate(title, 100) yielding 99 chars + ellipsis
      expect(html).toContain('B'.repeat(99) + '\u2026');
    });

    it('handles null-ish numeric fields via ?? 0', () => {
      const nullOpts = {
        ...baseOpts,
        purchasePrice: undefined as unknown as number,
        estimatedProfit: undefined as unknown as number,
      };
      const html = flipPurchasedEmailHtml(nullOpts);
      expect(html).toContain('0.00');
    });

    it('displays "Today" when eventCreatedAt missing', () => {
      const noDateOpts = { ...baseOpts, eventCreatedAt: undefined };
      const html = flipPurchasedEmailHtml(noDateOpts);
      expect(html).toContain('Today');
    });

    it('displays relative time when eventCreatedAt present', () => {
      const html = flipPurchasedEmailHtml(baseOpts);
      expect(html).toContain('2 hours ago');
    });

    it('defaults to /opportunities when opportunityUrl missing', () => {
      const noUrlOpts = { ...baseOpts, opportunityUrl: undefined };
      const html = flipPurchasedEmailHtml(noUrlOpts);
      expect(html).toContain('https://app.test/opportunities');
    });

    it('uses "there" when name is not provided', () => {
      const html = flipPurchasedEmailHtml(baseOpts);
      expect(html).toContain('Hey there');
    });

    it('uses first name when name provided', () => {
      const namedOpts = { ...baseOpts, name: 'Bob Smith' };
      const html = flipPurchasedEmailHtml(namedOpts);
      expect(html).toContain('Hey Bob');
    });
  });

  describe('Text output', () => {
    it('contains the item title', () => {
      const text = flipPurchasedEmailText(baseOpts);
      expect(text).toContain('Sony PlayStation 5 Controller');
    });

    it('contains the purchase price', () => {
      const text = flipPurchasedEmailText(baseOpts);
      expect(text).toContain('$35.00');
    });

    it('contains the estimated profit', () => {
      const text = flipPurchasedEmailText(baseOpts);
      expect(text).toContain('+$25.00');
    });

    it('contains the platform', () => {
      const text = flipPurchasedEmailText(baseOpts);
      expect(text).toContain('Facebook Marketplace');
    });

    it('contains the opportunity URL', () => {
      const text = flipPurchasedEmailText(baseOpts);
      expect(text).toContain('https://app.test/opportunities/xyz789');
    });

    it('contains unsubscribe and settings URLs', () => {
      const text = flipPurchasedEmailText(baseOpts);
      expect(text).toContain('https://app.test/unsub');
      expect(text).toContain('https://app.test/settings');
    });

    it('shows "Today" when no eventCreatedAt', () => {
      const noDateOpts = { ...baseOpts, eventCreatedAt: undefined };
      const text = flipPurchasedEmailText(noDateOpts);
      expect(text).toContain('Today');
    });

    it('handles null-ish numeric fields gracefully', () => {
      const nullOpts = {
        ...baseOpts,
        purchasePrice: undefined as unknown as number,
        estimatedProfit: undefined as unknown as number,
      };
      const text = flipPurchasedEmailText(nullOpts);
      expect(text).toContain('$0.00');
    });
  });
});

// ---------------------------------------------------------------------------
// Flip Listed Email
// ---------------------------------------------------------------------------

describe('Flip Listed Email', () => {
  const baseOpts: FlipListedEmailOptions = {
    ...BASE_URLS,
    itemTitle: 'Dyson V11 Vacuum',
    destinationPlatform: 'eBay',
    listingUrl: 'https://ebay.com/itm/12345',
    eventCreatedAt: new Date(Date.now() - 5 * 60_000),
    opportunityUrl: 'https://app.test/opportunities/listed1',
  };

  describe('HTML output', () => {
    it('contains the item title', () => {
      const html = flipListedEmailHtml(baseOpts);
      expect(html).toContain('Dyson V11 Vacuum');
    });

    it('contains the destination platform', () => {
      const html = flipListedEmailHtml(baseOpts);
      expect(html).toContain('eBay');
    });

    it('contains the listing URL when present', () => {
      const html = flipListedEmailHtml(baseOpts);
      expect(html).toContain('https://ebay.com/itm/12345');
      expect(html).toContain('View Resale Listing');
    });

    it('omits listing link when listingUrl is absent', () => {
      const noLinkOpts = { ...baseOpts, listingUrl: undefined };
      const html = flipListedEmailHtml(noLinkOpts);
      expect(html).not.toContain('View Resale Listing');
    });

    it('does not contain unresolved placeholders', () => {
      const html = flipListedEmailHtml(baseOpts);
      expect(html).not.toContain('{{unsubscribe_url}}');
      expect(html).not.toContain('{{settings_url}}');
      expect(html).not.toContain('{{app_url}}');
    });

    it('sanitizes XSS in item title in the body', () => {
      const xssOpts = {
        ...baseOpts,
        itemTitle: '<script>alert("xss")</script>',
      };
      const html = flipListedEmailHtml(xssOpts);
      // Body content uses escapeHtml(truncate(title))
      expect(html).toContain('&lt;script&gt;');
    });

    it('truncates long titles in the body to 100 characters', () => {
      const longTitle = 'C'.repeat(150);
      const longOpts = { ...baseOpts, itemTitle: longTitle };
      const html = flipListedEmailHtml(longOpts);
      // Body uses truncate(title, 100) yielding 99 chars + ellipsis
      expect(html).toContain('C'.repeat(99) + '\u2026');
    });

    it('displays "Just now" when eventCreatedAt missing', () => {
      const noDateOpts = { ...baseOpts, eventCreatedAt: undefined };
      const html = flipListedEmailHtml(noDateOpts);
      expect(html).toContain('Just now');
    });

    it('displays relative time when eventCreatedAt present', () => {
      const html = flipListedEmailHtml(baseOpts);
      expect(html).toContain('5 minutes ago');
    });

    it('uses "there" when name is not provided', () => {
      const html = flipListedEmailHtml(baseOpts);
      expect(html).toContain('Hey there');
    });

    it('uses first name when name provided', () => {
      const namedOpts = { ...baseOpts, name: 'Carol Davis' };
      const html = flipListedEmailHtml(namedOpts);
      expect(html).toContain('Hey Carol');
    });

    it('defaults to /opportunities when opportunityUrl missing', () => {
      const noUrlOpts = { ...baseOpts, opportunityUrl: undefined };
      const html = flipListedEmailHtml(noUrlOpts);
      expect(html).toContain('https://app.test/opportunities');
    });
  });

  describe('Text output', () => {
    it('contains the item title', () => {
      const text = flipListedEmailText(baseOpts);
      expect(text).toContain('Dyson V11 Vacuum');
    });

    it('contains the destination platform', () => {
      const text = flipListedEmailText(baseOpts);
      expect(text).toContain('eBay');
    });

    it('contains the listing URL when present', () => {
      const text = flipListedEmailText(baseOpts);
      expect(text).toContain('https://ebay.com/itm/12345');
    });

    it('omits listing URL when absent', () => {
      const noLinkOpts = { ...baseOpts, listingUrl: undefined };
      const text = flipListedEmailText(noLinkOpts);
      expect(text).not.toContain('Resale listing:');
    });

    it('contains the opportunity URL', () => {
      const text = flipListedEmailText(baseOpts);
      expect(text).toContain('https://app.test/opportunities/listed1');
    });

    it('contains unsubscribe and settings URLs', () => {
      const text = flipListedEmailText(baseOpts);
      expect(text).toContain('https://app.test/unsub');
      expect(text).toContain('https://app.test/settings');
    });

    it('shows "Just now" when no eventCreatedAt', () => {
      const noDateOpts = { ...baseOpts, eventCreatedAt: undefined };
      const text = flipListedEmailText(noDateOpts);
      expect(text).toContain('Just now');
    });
  });
});

// ---------------------------------------------------------------------------
// Flip Sold Email
// ---------------------------------------------------------------------------

describe('Flip Sold Email', () => {
  const baseOpts: FlipSoldEmailOptions = {
    ...BASE_URLS,
    itemTitle: 'Nintendo Switch OLED',
    salePrice: 280.0,
    actualProfit: 95.0,
    roiPercent: 51.35,
    daysToFlip: 7,
    platform: 'Mercari',
    purchasePrice: 185.0,
    eventCreatedAt: new Date(Date.now() - 1 * 24 * 60 * 60_000),
    opportunityUrl: 'https://app.test/opportunities/sold1',
  };

  describe('HTML output', () => {
    it('contains the item title', () => {
      const html = flipSoldEmailHtml(baseOpts);
      expect(html).toContain('Nintendo Switch OLED');
    });

    it('contains the sale price', () => {
      const html = flipSoldEmailHtml(baseOpts);
      expect(html).toContain('280.00');
    });

    it('contains the actual profit', () => {
      const html = flipSoldEmailHtml(baseOpts);
      expect(html).toContain('95.00');
    });

    it('contains the ROI percentage', () => {
      const html = flipSoldEmailHtml(baseOpts);
      expect(html).toContain('51%');
    });

    it('contains the platform', () => {
      const html = flipSoldEmailHtml(baseOpts);
      expect(html).toContain('Mercari');
    });

    it('contains the purchase price', () => {
      const html = flipSoldEmailHtml(baseOpts);
      expect(html).toContain('185.00');
    });

    it('contains daysToFlip when present', () => {
      const html = flipSoldEmailHtml(baseOpts);
      expect(html).toContain('7 days');
      expect(html).toContain('Time to Flip');
    });

    it('omits daysToFlip section when absent', () => {
      const noDaysOpts = { ...baseOpts, daysToFlip: undefined };
      const html = flipSoldEmailHtml(noDaysOpts);
      expect(html).not.toContain('Time to Flip');
    });

    it('uses singular "day" for daysToFlip === 1', () => {
      const oneDayOpts = { ...baseOpts, daysToFlip: 1 };
      const html = flipSoldEmailHtml(oneDayOpts);
      expect(html).toContain('1 day');
      expect(html).not.toContain('1 days');
    });

    it('does not contain unresolved placeholders', () => {
      const html = flipSoldEmailHtml(baseOpts);
      expect(html).not.toContain('{{unsubscribe_url}}');
      expect(html).not.toContain('{{settings_url}}');
      expect(html).not.toContain('{{app_url}}');
    });

    it('replaces placeholders with actual URLs', () => {
      const html = flipSoldEmailHtml(baseOpts);
      expect(html).toContain('https://app.test/unsub');
      expect(html).toContain('https://app.test/settings');
    });

    it('sanitizes XSS in item title in the body', () => {
      const xssOpts = {
        ...baseOpts,
        itemTitle: '<script>alert("xss")</script>',
      };
      const html = flipSoldEmailHtml(xssOpts);
      // Body content uses escapeHtml(truncate(title))
      expect(html).toContain('&lt;script&gt;');
    });

    it('truncates long titles in the body to 100 characters', () => {
      const longTitle = 'D'.repeat(150);
      const longOpts = { ...baseOpts, itemTitle: longTitle };
      const html = flipSoldEmailHtml(longOpts);
      // Body uses truncate(title, 100) yielding 99 chars + ellipsis
      expect(html).toContain('D'.repeat(99) + '\u2026');
    });

    it('handles null-ish numeric fields via ?? 0', () => {
      const nullOpts = {
        ...baseOpts,
        salePrice: undefined as unknown as number,
        actualProfit: undefined as unknown as number,
        roiPercent: undefined as unknown as number,
        purchasePrice: undefined as unknown as number,
      };
      const html = flipSoldEmailHtml(nullOpts);
      expect(html).toContain('0.00');
      expect(html).toContain('0%');
    });

    it('uses "there" when name is not provided', () => {
      const html = flipSoldEmailHtml(baseOpts);
      expect(html).toContain('there');
    });

    it('uses first name when name provided', () => {
      const namedOpts = { ...baseOpts, name: 'Dave Wilson' };
      const html = flipSoldEmailHtml(namedOpts);
      expect(html).toContain('Dave');
    });

    it('links to the dashboard', () => {
      const html = flipSoldEmailHtml(baseOpts);
      expect(html).toContain('https://app.test/dashboard');
    });
  });

  describe('Text output', () => {
    it('contains the item title', () => {
      const text = flipSoldEmailText(baseOpts);
      expect(text).toContain('Nintendo Switch OLED');
    });

    it('contains the sale price', () => {
      const text = flipSoldEmailText(baseOpts);
      expect(text).toContain('$280.00');
    });

    it('contains the actual profit', () => {
      const text = flipSoldEmailText(baseOpts);
      expect(text).toContain('+$95.00');
    });

    it('contains the ROI percentage', () => {
      const text = flipSoldEmailText(baseOpts);
      expect(text).toContain('51%');
    });

    it('contains the platform', () => {
      const text = flipSoldEmailText(baseOpts);
      expect(text).toContain('Mercari');
    });

    it('contains the purchase price', () => {
      const text = flipSoldEmailText(baseOpts);
      expect(text).toContain('$185.00');
    });

    it('contains daysToFlip when present', () => {
      const text = flipSoldEmailText(baseOpts);
      expect(text).toContain('7 days');
    });

    it('omits daysToFlip line when absent', () => {
      const noDaysOpts = { ...baseOpts, daysToFlip: undefined };
      const text = flipSoldEmailText(noDaysOpts);
      expect(text).not.toContain('Time to Flip');
    });

    it('uses singular "day" for daysToFlip === 1', () => {
      const oneDayOpts = { ...baseOpts, daysToFlip: 1 };
      const text = flipSoldEmailText(oneDayOpts);
      expect(text).toContain('1 day');
      expect(text).not.toContain('1 days');
    });

    it('contains the dashboard URL', () => {
      const text = flipSoldEmailText(baseOpts);
      expect(text).toContain('https://app.test/dashboard');
    });

    it('contains unsubscribe and settings URLs', () => {
      const text = flipSoldEmailText(baseOpts);
      expect(text).toContain('https://app.test/unsub');
      expect(text).toContain('https://app.test/settings');
    });

    it('handles null-ish numeric fields gracefully', () => {
      const nullOpts = {
        ...baseOpts,
        salePrice: undefined as unknown as number,
        actualProfit: undefined as unknown as number,
        roiPercent: undefined as unknown as number,
        purchasePrice: undefined as unknown as number,
      };
      const text = flipSoldEmailText(nullOpts);
      expect(text).toContain('$0.00');
    });
  });
});
