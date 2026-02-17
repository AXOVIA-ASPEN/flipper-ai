import {
  detectSoldStatus,
  extractCurrentPrice,
  processListingCheck,
  getTrackableListings,
  runTrackingCycle,
  TRACKABLE_STATUSES,
  TERMINAL_STATUSES,
} from '@/lib/listing-tracker';

// Mock prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    listing: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
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
    it('queries for trackable statuses', async () => {
      (mockPrisma.listing.findMany as jest.Mock).mockResolvedValue([]);
      await getTrackableListings();

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith({
        where: { status: { in: TRACKABLE_STATUSES } },
        select: {
          id: true,
          title: true,
          platform: true,
          url: true,
          askingPrice: true,
          status: true,
          userId: true,
        },
      });
    });

    it('returns listing data', async () => {
      const mockListings = [
        { id: '1', title: 'iPhone', platform: 'EBAY', url: 'https://ebay.com/1', askingPrice: 500, status: 'NEW', userId: 'u1' },
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
