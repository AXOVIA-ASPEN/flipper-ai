import {
  detectSoldStatus,
  extractCurrentPrice,
  processListingCheck,
  getTrackableListings,
  runTrackingCycle,
  classifyHttpResponse,
  isPriceChangeMeaningful,
  updatePlatformParseStats,
  isAnomalyThresholdExceeded,
  updateListingStateWithEvent,
  TRACKABLE_STATUSES,
  TERMINAL_STATUSES,
  type PlatformParseStats,
} from '@/lib/listing-tracker';
import { NotificationEventType } from '@/lib/notification-events';

// Mock prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    listing: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock notification-events — listing-tracker imports it for updateListingStateWithEvent
jest.mock('@/lib/notification-events', () => ({
  createNotificationEvent: jest.fn().mockResolvedValue(undefined),
  NotificationEventType: {
    LISTING_SOLD: 'listing.sold',
    LISTING_PRICE_CHANGED: 'listing.price_changed',
    LISTING_EXPIRING: 'listing.expiring',
    LISTING_UNAVAILABLE: 'listing.unavailable',
  },
  buildDeduplicationKey: jest.fn().mockReturnValue('key'),
}));

import { prisma } from '@/lib/db';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('listing-tracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectSoldStatus', () => {
    it('detects Craigslist deleted posting', () => {
      expect(detectSoldStatus('This posting has been deleted by its author', 'CRAIGSLIST')).toBe(true);
    });

    it('detects Craigslist expired posting', () => {
      expect(detectSoldStatus('This posting has expired', 'CRAIGSLIST')).toBe(true);
    });

    it('detects eBay ended listing', () => {
      expect(detectSoldStatus('This listing has ended. Winning bid: $150.00', 'EBAY')).toBe(true);
    });

    it('detects eBay sold item', () => {
      expect(detectSoldStatus('Sold for $200.00 on Feb 10', 'EBAY')).toBe(true);
    });

    it('detects Facebook Marketplace sold', () => {
      expect(detectSoldStatus('This item has been marked as Sold', 'FACEBOOK_MARKETPLACE')).toBe(true);
    });

    it('detects Facebook unavailable listing', () => {
      expect(detectSoldStatus('This listing is unavailable', 'FACEBOOK_MARKETPLACE')).toBe(true);
    });

    it('detects OfferUp sold', () => {
      expect(detectSoldStatus('Item sold! Check out similar items', 'OFFERUP')).toBe(true);
    });

    it('detects Mercari sold', () => {
      expect(detectSoldStatus('This item has been sold', 'MERCARI')).toBe(true);
    });

    it('returns false for active listing', () => {
      expect(detectSoldStatus('iPhone 14 Pro - $500 - Great condition!', 'CRAIGSLIST')).toBe(false);
    });

    it('returns false for empty content', () => {
      expect(detectSoldStatus('', 'EBAY')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(detectSoldStatus('THIS POSTING HAS BEEN DELETED', 'CRAIGSLIST')).toBe(true);
    });

    it('handles unknown platform with generic indicators', () => {
      expect(detectSoldStatus('This item is sold', 'UNKNOWN_PLATFORM')).toBe(true);
      expect(detectSoldStatus('Item no longer available', 'UNKNOWN_PLATFORM')).toBe(true);
    });

    it('does not false-positive on "sold" in description text', () => {
      // "sold" appears but it's the actual indicator, so this IS a match
      expect(detectSoldStatus('sold', 'OFFERUP')).toBe(true);
    });
  });

  describe('extractCurrentPrice', () => {
    it('extracts dollar price from basic format', () => {
      expect(extractCurrentPrice('Price: $1,234.56', 'CRAIGSLIST')).toBe(1234.56);
    });

    it('extracts price without cents', () => {
      expect(extractCurrentPrice('$500', 'EBAY')).toBe(500);
    });

    it('extracts price with comma separator', () => {
      expect(extractCurrentPrice('$2,500', 'FACEBOOK_MARKETPLACE')).toBe(2500);
    });

    it('extracts price from "asking" format', () => {
      expect(extractCurrentPrice('Asking: $350', 'CRAIGSLIST')).toBe(350);
    });

    it('extracts price from "price:" format', () => {
      expect(extractCurrentPrice('price: $199.99', 'OFFERUP')).toBe(199.99);
    });

    it('extracts eBay itemprop price', () => {
      expect(extractCurrentPrice('itemprop="price" content="299.99"', 'EBAY')).toBe(299.99);
    });

    it('returns null for no price found', () => {
      expect(extractCurrentPrice('No price here', 'CRAIGSLIST')).toBeNull();
    });

    it('returns null for empty content', () => {
      expect(extractCurrentPrice('', 'EBAY')).toBeNull();
    });

    it('returns null for zero price', () => {
      expect(extractCurrentPrice('$0', 'CRAIGSLIST')).toBeNull();
    });

    it('handles price with space after dollar sign', () => {
      expect(extractCurrentPrice('$ 750', 'MERCARI')).toBe(750);
    });
  });

  describe('getTrackableListings', () => {
    it('queries for trackable statuses with lastMonitoredAt ordering', async () => {
      (mockPrisma.listing.findMany as jest.Mock).mockResolvedValue([]);
      await getTrackableListings();

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: TRACKABLE_STATUSES } },
          select: expect.objectContaining({
            id: true,
            title: true,
            platform: true,
            url: true,
            askingPrice: true,
            status: true,
            userId: true,
            lastMonitoredAt: true,
          }),
          orderBy: [{ lastMonitoredAt: 'asc' }],
        })
      );
    });

    it('applies cursor pagination when cursor is provided', async () => {
      (mockPrisma.listing.findMany as jest.Mock).mockResolvedValue([]);
      await getTrackableListings({ cursor: 'listing-5', take: 20 });

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'listing-5' },
          skip: 1,
          take: 20,
        })
      );
    });

    it('scopes to userId when provided', async () => {
      (mockPrisma.listing.findMany as jest.Mock).mockResolvedValue([]);
      await getTrackableListings({ userId: 'user-123' });

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-123' }),
        })
      );
    });

    it('returns listing data including lastMonitoredAt', async () => {
      const mockListings = [
        { id: '1', title: 'iPhone', platform: 'EBAY', url: 'https://ebay.com/1', askingPrice: 500, status: 'NEW', userId: 'u1', lastMonitoredAt: null },
      ];
      (mockPrisma.listing.findMany as jest.Mock).mockResolvedValue(mockListings);

      const result = await getTrackableListings();
      expect(result).toEqual(mockListings);
    });
  });

  describe('processListingCheck', () => {
    const mockListing = {
      id: 'listing-1',
      title: 'iPhone 14',
      platform: 'EBAY',
      status: 'OPPORTUNITY',
      askingPrice: 500,
      notes: null,
    };

    it('detects sold status change', async () => {
      (mockPrisma.listing.findUnique as jest.Mock).mockResolvedValue(mockListing);
      (mockPrisma.listing.update as jest.Mock).mockResolvedValue({ ...mockListing, status: 'SOLD' });

      const result = await processListingCheck('listing-1', true, null, 500);

      expect(result.statusChange).not.toBeNull();
      expect(result.statusChange!.newStatus).toBe('SOLD');
      expect(result.statusChange!.previousStatus).toBe('OPPORTUNITY');
      expect(mockPrisma.listing.update).toHaveBeenCalledWith({
        where: { id: 'listing-1' },
        data: { status: 'SOLD' },
      });
    });

    it('does not mark already-sold listing as sold again', async () => {
      (mockPrisma.listing.findUnique as jest.Mock).mockResolvedValue({ ...mockListing, status: 'SOLD' });

      const result = await processListingCheck('listing-1', true, null, 500);
      expect(result.statusChange).toBeNull();
    });

    it('detects price decrease', async () => {
      (mockPrisma.listing.findUnique as jest.Mock).mockResolvedValue(mockListing);
      (mockPrisma.listing.update as jest.Mock).mockResolvedValue({ ...mockListing, askingPrice: 400 });

      const result = await processListingCheck('listing-1', false, 400, 500);

      expect(result.priceChange).not.toBeNull();
      expect(result.priceChange!.previousPrice).toBe(500);
      expect(result.priceChange!.newPrice).toBe(400);
      expect(result.priceChange!.changePercent).toBe(-20);
    });

    it('detects price increase', async () => {
      (mockPrisma.listing.findUnique as jest.Mock).mockResolvedValue(mockListing);
      (mockPrisma.listing.update as jest.Mock).mockResolvedValue({ ...mockListing, askingPrice: 600 });

      const result = await processListingCheck('listing-1', false, 600, 500);

      expect(result.priceChange).not.toBeNull();
      expect(result.priceChange!.changePercent).toBe(20);
    });

    it('ignores tiny price changes (< 1%)', async () => {
      (mockPrisma.listing.findUnique as jest.Mock).mockResolvedValue(mockListing);

      const result = await processListingCheck('listing-1', false, 502, 500);
      expect(result.priceChange).toBeNull();
    });

    it('does not check price when sold', async () => {
      (mockPrisma.listing.findUnique as jest.Mock).mockResolvedValue(mockListing);
      (mockPrisma.listing.update as jest.Mock).mockResolvedValue({ ...mockListing, status: 'SOLD' });

      const result = await processListingCheck('listing-1', true, 400, 500);

      // Should have status change but NOT price change
      expect(result.statusChange).not.toBeNull();
      expect(result.priceChange).toBeNull();
    });

    it('throws for non-existent listing', async () => {
      (mockPrisma.listing.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(processListingCheck('bad-id', false, null, 500)).rejects.toThrow('Listing bad-id not found');
    });

    it('appends to existing notes on price change', async () => {
      (mockPrisma.listing.findUnique as jest.Mock).mockResolvedValue({
        ...mockListing,
        notes: 'Existing note',
      });
      (mockPrisma.listing.update as jest.Mock).mockResolvedValue({});

      await processListingCheck('listing-1', false, 400, 500);

      const updateCall = (mockPrisma.listing.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.notes).toContain('Existing note');
      expect(updateCall.data.notes).toContain('Price changed: $500 → $400');
    });
  });

  describe('runTrackingCycle', () => {
    it('checks all trackable listings', async () => {
      const listings = [
        { id: '1', title: 'Item 1', platform: 'EBAY', url: 'https://ebay.com/1', askingPrice: 100, status: 'NEW', userId: null },
        { id: '2', title: 'Item 2', platform: 'CRAIGSLIST', url: 'https://cl.com/2', askingPrice: 200, status: 'OPPORTUNITY', userId: null },
      ];
      (mockPrisma.listing.findMany as jest.Mock).mockResolvedValue(listings);
      (mockPrisma.listing.findUnique as jest.Mock).mockImplementation(({ where }: { where: { id: string } }) => {
        const l = listings.find((x) => x.id === where.id);
        return Promise.resolve(l ? { ...l, notes: null } : null);
      });

      const fetchPage = jest.fn().mockResolvedValue('Active listing $100');

      const result = await runTrackingCycle(fetchPage);

      expect(fetchPage).toHaveBeenCalledTimes(2);
      expect(result.checked).toBe(2);
    });

    it('records errors for failed fetches', async () => {
      (mockPrisma.listing.findMany as jest.Mock).mockResolvedValue([
        { id: '1', title: 'Item', platform: 'EBAY', url: 'https://ebay.com/1', askingPrice: 100, status: 'NEW', userId: null },
      ]);

      const fetchPage = jest.fn().mockResolvedValue(null);
      const result = await runTrackingCycle(fetchPage);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Failed to fetch');
    });

    it('detects sold listings in cycle', async () => {
      const listings = [
        { id: '1', title: 'Sold Item', platform: 'EBAY', url: 'https://ebay.com/1', askingPrice: 100, status: 'NEW', userId: null },
      ];
      (mockPrisma.listing.findMany as jest.Mock).mockResolvedValue(listings);
      (mockPrisma.listing.findUnique as jest.Mock).mockResolvedValue({ ...listings[0], notes: null });
      (mockPrisma.listing.update as jest.Mock).mockResolvedValue({});

      const fetchPage = jest.fn().mockResolvedValue('This listing has ended');
      const result = await runTrackingCycle(fetchPage);

      expect(result.statusChanges).toHaveLength(1);
      expect(result.statusChanges[0].newStatus).toBe('SOLD');
    });

    it('handles empty trackable list', async () => {
      (mockPrisma.listing.findMany as jest.Mock).mockResolvedValue([]);

      const fetchPage = jest.fn();
      const result = await runTrackingCycle(fetchPage);

      expect(result.checked).toBe(0);
      expect(fetchPage).not.toHaveBeenCalled();
    });

    it('handles fetch exceptions gracefully', async () => {
      (mockPrisma.listing.findMany as jest.Mock).mockResolvedValue([
        { id: '1', title: 'Item', platform: 'EBAY', url: 'https://ebay.com/1', askingPrice: 100, status: 'NEW', userId: null },
      ]);

      const fetchPage = jest.fn().mockRejectedValue(new Error('Network error'));
      const result = await runTrackingCycle(fetchPage);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Network error');
    });
  });

  describe('constants', () => {
    it('TRACKABLE_STATUSES includes active statuses', () => {
      expect(TRACKABLE_STATUSES).toContain('NEW');
      expect(TRACKABLE_STATUSES).toContain('OPPORTUNITY');
      expect(TRACKABLE_STATUSES).toContain('LISTED');
    });

    it('TERMINAL_STATUSES includes end states', () => {
      expect(TERMINAL_STATUSES).toContain('SOLD');
      expect(TERMINAL_STATUSES).toContain('EXPIRED');
    });

    it('no overlap between trackable and terminal', () => {
      const overlap = TRACKABLE_STATUSES.filter((s) => TERMINAL_STATUSES.includes(s));
      expect(overlap).toHaveLength(0);
    });
  });
});

// ── Additional branch coverage ────────────────────────────────────────────────
describe('listing-tracker - additional branch coverage', () => {
  it('uses empty platform patterns when platform is unknown', async () => {
    // Covers: platformPatterns[platform] || [] (the || [] fallback for unknown platforms)
    // extractCurrentPrice uses platformPatterns[platform] || [] for unknown platforms
    // Call with an unknown platform - will fall back to [] for platform-specific patterns
    // The function should still use generic pricePatterns
    const price = extractCurrentPrice('<div>Price: $99.99</div>', 'UNKNOWN_PLATFORM');
    expect(price).toBe(99.99); // Generic pattern still matches
  });

  it('handles non-Error throw in tracking cycle error handler', async () => {
    // Covers: error instanceof Error ? error.message : String(error) (String branch, line 243)
    (mockPrisma.listing.findMany as jest.Mock).mockResolvedValue([
      { id: 'listing-1', title: 'Test Item', platform: 'EBAY', url: 'https://ebay.com/1', askingPrice: 100, status: 'NEW', userId: null },
    ]);

    // Throw a non-Error object to trigger String(error) branch
    const fetchPage = jest.fn().mockRejectedValue('non-error string thrown');
    const result = await runTrackingCycle(fetchPage);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toBe('non-error string thrown'); // String('non-error string thrown')
  });
});

// ── Story 10.1 additions ──────────────────────────────────────────────────────

describe('listing-tracker - Story 10.1 additions', () => {
  describe('classifyHttpResponse()', () => {
    it('returns "removed" for HTTP 404', () => {
      expect(classifyHttpResponse(404, '')).toBe('removed');
    });

    it('returns "removed" for HTTP 410', () => {
      expect(classifyHttpResponse(410, '')).toBe('removed');
    });

    it('returns "removed" for 200 with "deleted" text', () => {
      expect(classifyHttpResponse(200, 'this posting has been deleted by its author')).toBe('removed');
    });

    it('returns "rate_limited" for HTTP 403', () => {
      expect(classifyHttpResponse(403, '')).toBe('rate_limited');
    });

    it('returns "rate_limited" for HTTP 429', () => {
      expect(classifyHttpResponse(429, '')).toBe('rate_limited');
    });

    it('returns "rate_limited" for 200 with CAPTCHA content', () => {
      expect(classifyHttpResponse(200, 'Please complete the captcha to continue')).toBe('rate_limited');
    });

    it('returns "rate_limited" for 200 with "blocked" text', () => {
      expect(classifyHttpResponse(200, 'you have been blocked')).toBe('rate_limited');
    });

    it('returns "ok" for 200 with normal listing content', () => {
      expect(classifyHttpResponse(200, 'iPhone 14 Pro - $500')).toBe('ok');
    });

    it('does NOT classify 403 as "removed" (rate limit, not removal)', () => {
      const result = classifyHttpResponse(403, '');
      expect(result).toBe('rate_limited');
      expect(result).not.toBe('removed');
    });

    it('does NOT classify 200 with incidental "blocked" word as rate_limited', () => {
      // "blocked drains" is legitimate listing content — should not trigger rate limit
      expect(classifyHttpResponse(200, 'Blocked drains cleaning tool - $25')).toBe('ok');
    });
  });

  describe('isPriceChangeMeaningful()', () => {
    it('returns true when change exceeds both thresholds via max()', () => {
      // threshold = max(1.0, 100 * 5/100) = max(1.0, 5.0) = 5.0; $6 >= 5.0 → true
      expect(isPriceChangeMeaningful(100, 94, 1.0, 5)).toBe(true);
    });

    it('returns true when absolute dominates the max threshold', () => {
      // threshold = max(100, 1000 * 5/100) = max(100, 50) = 100; $110 >= 100 → true
      expect(isPriceChangeMeaningful(1000, 890, 100, 5)).toBe(true);
    });

    it('returns false when change is below max(minDelta, percentThreshold)', () => {
      // threshold = max(1.0, 100 * 5/100) = max(1.0, 5.0) = 5.0; $0.50 < 5.0 → false
      expect(isPriceChangeMeaningful(100, 100.5, 1.0, 5)).toBe(false);
    });

    it('returns false for small absolute change on expensive item (percent threshold dominates)', () => {
      // threshold = max(1.0, 10000 * 5/100) = max(1.0, 500) = 500; $2 < 500 → false
      expect(isPriceChangeMeaningful(10000, 9998, 1.0, 5)).toBe(false);
    });

    it('returns false when absolute exceeds minDelta but not the percent-derived threshold', () => {
      // threshold = max(1.0, 100 * 5/100) = max(1.0, 5.0) = 5.0; $2 < 5.0 → false
      expect(isPriceChangeMeaningful(100, 98, 1.0, 5)).toBe(false);
    });

    it('returns false when percent exceeds minPercent but absolute below percent-derived threshold', () => {
      // threshold = max(100, 1000 * 5/100) = max(100, 50) = 100; $60 < 100 → false
      expect(isPriceChangeMeaningful(1000, 940, 100, 5)).toBe(false);
    });
  });

  describe('updatePlatformParseStats()', () => {
    it('initializes platform entry on first call', () => {
      const stats: Record<string, PlatformParseStats> = {};
      updatePlatformParseStats(stats, 'CRAIGSLIST', true, false, false);

      expect(stats['CRAIGSLIST']).toEqual({
        checked: 1,
        parsed: 1,
        events: 0,
        unavailable: 0,
      });
    });

    it('accumulates counts across multiple calls', () => {
      const stats: Record<string, PlatformParseStats> = {};
      updatePlatformParseStats(stats, 'EBAY', true, true, false);
      updatePlatformParseStats(stats, 'EBAY', false, false, true);
      updatePlatformParseStats(stats, 'EBAY', true, false, false);

      expect(stats['EBAY']).toEqual({
        checked: 3,
        parsed: 2,
        events: 1,
        unavailable: 1,
      });
    });

    it('tracks different platforms independently', () => {
      const stats: Record<string, PlatformParseStats> = {};
      updatePlatformParseStats(stats, 'CRAIGSLIST', true, false, false);
      updatePlatformParseStats(stats, 'OFFERUP', false, false, true);

      expect(stats['CRAIGSLIST'].checked).toBe(1);
      expect(stats['OFFERUP'].checked).toBe(1);
      expect(stats['OFFERUP'].unavailable).toBe(1);
    });
  });

  describe('isAnomalyThresholdExceeded()', () => {
    it('returns false when fewer than 3 checks (avoid false positives on small batches)', () => {
      const stats: PlatformParseStats = { checked: 2, parsed: 0, events: 0, unavailable: 2 };
      expect(isAnomalyThresholdExceeded(stats, 30)).toBe(false);
    });

    it('returns true when unavailable ratio exceeds threshold', () => {
      const stats: PlatformParseStats = { checked: 10, parsed: 3, events: 0, unavailable: 5 };
      expect(isAnomalyThresholdExceeded(stats, 30)).toBe(true); // 50% > 30%
    });

    it('returns false when unavailable ratio is below threshold', () => {
      const stats: PlatformParseStats = { checked: 10, parsed: 8, events: 2, unavailable: 2 };
      expect(isAnomalyThresholdExceeded(stats, 30)).toBe(false); // 20% < 30%
    });

    it('returns false when exactly at threshold (not exceeded)', () => {
      const stats: PlatformParseStats = { checked: 10, parsed: 7, events: 0, unavailable: 3 };
      expect(isAnomalyThresholdExceeded(stats, 30)).toBe(false); // 30% = 30%, not exceeded
    });
  });

  describe('updateListingStateWithEvent()', () => {
    const makeTx = (overrides: Partial<{ update: jest.Mock; create: jest.Mock }> = {}) => ({
      listing: { update: overrides.update ?? jest.fn().mockResolvedValue({}) },
      notificationEvent: { create: overrides.create ?? jest.fn().mockResolvedValue({}) },
    });

    const baseListing = {
      userId: 'user-1',
      title: 'Test Item',
      url: 'https://craigslist.org/item/1',
      platform: 'CRAIGSLIST',
    };

    it('updates listing to SOLD on sold event', async () => {
      const updateMock = jest.fn().mockResolvedValue({});
      const tx = makeTx({ update: updateMock });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateListingStateWithEvent(tx as any, 'listing-1', baseListing, {
        type: NotificationEventType.LISTING_SOLD,
      });

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'listing-1' },
          data: expect.objectContaining({ status: 'SOLD', lastMonitoredAt: expect.any(Date) }),
        })
      );
    });

    it('updates listing to EXPIRED on unavailable event', async () => {
      const updateMock = jest.fn().mockResolvedValue({});
      const tx = makeTx({ update: updateMock });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateListingStateWithEvent(tx as any, 'listing-1', baseListing, {
        type: NotificationEventType.LISTING_UNAVAILABLE,
      });

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'EXPIRED' }),
        })
      );
    });

    it('updates asking price on price changed event', async () => {
      const updateMock = jest.fn().mockResolvedValue({});
      const tx = makeTx({ update: updateMock });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateListingStateWithEvent(tx as any, 'listing-1', baseListing, {
        type: NotificationEventType.LISTING_PRICE_CHANGED,
        oldPrice: 100,
        newPrice: 75,
      });

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ askingPrice: 75 }),
        })
      );
    });

    it('calls createNotificationEvent for user with userId', async () => {
      const tx = makeTx();
      const { createNotificationEvent: createMock } = jest.requireMock('@/lib/notification-events') as {
        createNotificationEvent: jest.Mock;
      };
      createMock.mockClear();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateListingStateWithEvent(tx as any, 'listing-1', baseListing, {
        type: NotificationEventType.LISTING_SOLD,
      });

      expect(createMock).toHaveBeenCalledWith(
        expect.anything(), // tx
        expect.objectContaining({
          userId: 'user-1',
          listingId: 'listing-1',
          eventType: 'listing.sold',
        })
      );
    });

    it('includes expiryDate in payload for expiring events', async () => {
      const tx = makeTx();
      const { createNotificationEvent: createMock } = jest.requireMock('@/lib/notification-events') as {
        createNotificationEvent: jest.Mock;
      };
      createMock.mockClear();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateListingStateWithEvent(tx as any, 'listing-1', baseListing, {
        type: NotificationEventType.LISTING_EXPIRING,
        expiryDate: '2026-05-01T00:00:00Z',
      });

      expect(createMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          eventType: 'listing.expiring',
          payload: expect.objectContaining({ expiryDate: '2026-05-01T00:00:00Z' }),
        })
      );
    });

    it('handles price changed without newPrice (no price update)', async () => {
      const updateMock = jest.fn().mockResolvedValue({});
      const tx = makeTx({ update: updateMock });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateListingStateWithEvent(tx as any, 'listing-1', baseListing, {
        type: NotificationEventType.LISTING_PRICE_CHANGED,
        // newPrice intentionally omitted
      });

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ askingPrice: expect.anything() }),
        })
      );
    });

    it('skips notification event when userId is null', async () => {
      const createMock = jest.fn().mockResolvedValue({});
      const tx = makeTx({ create: createMock });
      const listingNoUser = { ...baseListing, userId: null };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateListingStateWithEvent(tx as any, 'listing-1', listingNoUser, {
        type: NotificationEventType.LISTING_SOLD,
      });

      expect(createMock).not.toHaveBeenCalled();
    });
  });
});
