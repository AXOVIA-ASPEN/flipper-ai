/**
 * Tests for Story 10.2 event payload enrichment in listing-tracker.ts:
 *  - direction field on price-change events
 *  - reason classification on unavailable events
 *  - soldIndicator on sold events
 */

import {
  classifyHttpResponse,
  classifyUnavailableReason,
  isPriceChangeMeaningful,
  processListingCheck,
  type PriceChange,
} from '@/lib/listing-tracker';

// Mock prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    listing: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock notification-events
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

// Mock sse-emitter (new import in listing-tracker)
jest.mock('@/lib/sse-emitter', () => ({
  sseEmitter: {
    emit: jest.fn().mockResolvedValue(0),
  },
}));

import { prisma } from '@/lib/db';
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('listing-tracker — event payload enrichment (Story 10.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('classifyHttpResponse — reason classification', () => {
    it('classifies HTTP 404 as removed', () => {
      expect(classifyHttpResponse(404, '')).toBe('removed');
    });

    it('classifies HTTP 410 as removed', () => {
      expect(classifyHttpResponse(410, '')).toBe('removed');
    });

    it('classifies "flagged for removal" body text as removed', () => {
      expect(classifyHttpResponse(200, 'This listing has been flagged for removal')).toBe('removed');
    });

    it('classifies "listing has been removed" body text as removed', () => {
      expect(classifyHttpResponse(200, 'listing has been removed from the site')).toBe('removed');
    });

    it('classifies HTTP 403 as rate_limited', () => {
      expect(classifyHttpResponse(403, '')).toBe('rate_limited');
    });

    it('classifies HTTP 429 as rate_limited', () => {
      expect(classifyHttpResponse(429, '')).toBe('rate_limited');
    });

    it('classifies CAPTCHA body text as rate_limited', () => {
      expect(classifyHttpResponse(200, 'Please verify you are human with a CAPTCHA')).toBe('rate_limited');
    });

    it('classifies normal page as ok', () => {
      expect(classifyHttpResponse(200, 'Great Nintendo Switch $250')).toBe('ok');
    });
  });

  describe('PriceChange.direction', () => {
    const baseListing = {
      id: 'l1',
      title: 'iPhone 15',
      platform: 'CRAIGSLIST',
      url: 'http://cl/l1',
      status: 'OPPORTUNITY',
      userId: 'u1',
      lastMonitoredAt: null,
      askingPrice: 500,
    };

    beforeEach(() => {
      (mockPrisma.listing.findUnique as jest.Mock).mockResolvedValue({ ...baseListing });
      (mockPrisma.listing.update as jest.Mock).mockResolvedValue({ ...baseListing });
    });

    it('sets direction = "decrease" when price drops', async () => {
      const { priceChange } = await processListingCheck('l1', false, 400, 500);
      expect(priceChange).not.toBeNull();
      expect((priceChange as PriceChange).direction).toBe('decrease');
      expect((priceChange as PriceChange).changePercent).toBeLessThan(0);
    });

    it('sets direction = "increase" when price rises', async () => {
      const { priceChange } = await processListingCheck('l1', false, 600, 500);
      expect(priceChange).not.toBeNull();
      expect((priceChange as PriceChange).direction).toBe('increase');
      expect((priceChange as PriceChange).changePercent).toBeGreaterThan(0);
    });

    it('returns null priceChange when change is below 1% threshold', async () => {
      const { priceChange } = await processListingCheck('l1', false, 501, 500);
      expect(priceChange).toBeNull();
    });
  });

  describe('classifyUnavailableReason — granular reason classification (Task 5.4)', () => {
    it('classifies HTTP 404 as removed', () => {
      expect(classifyUnavailableReason(404, '')).toBe('removed');
    });

    it('classifies HTTP 410 as removed', () => {
      expect(classifyUnavailableReason(410, '')).toBe('removed');
    });

    it('classifies body with "deleted" as deleted', () => {
      expect(classifyUnavailableReason(200, 'This posting has been deleted')).toBe('deleted');
    });

    it('classifies body with "flagged" as flagged', () => {
      expect(classifyUnavailableReason(200, 'Flagged for removal by moderator')).toBe('flagged');
    });

    it('classifies body with "expired" as expired', () => {
      expect(classifyUnavailableReason(200, 'This listing has expired')).toBe('expired');
    });

    it('classifies body with "removed" as removed', () => {
      expect(classifyUnavailableReason(200, 'listing has been removed')).toBe('removed');
    });

    it('classifies unknown content as unknown', () => {
      expect(classifyUnavailableReason(200, 'Nothing notable here')).toBe('unknown');
    });

    it('prefers HTTP 404 classification over body text', () => {
      expect(classifyUnavailableReason(404, 'deleted flagged expired')).toBe('removed');
    });

    it('prefers "deleted" body text over "removed" body text', () => {
      expect(classifyUnavailableReason(200, 'deleted and later removed')).toBe('deleted');
    });
  });

  describe('isPriceChangeMeaningful', () => {
    it('returns true when absolute change exceeds the computed threshold', () => {
      // abs=10, threshold=max(5, 100*5/100)=max(5,5)=5 → 10 >= 5 = true
      expect(isPriceChangeMeaningful(100, 110, 5, 5)).toBe(true);
    });

    it('returns true when percent change exceeds minDeltaPercent', () => {
      // abs=15, threshold=max(5, 100*10/100)=max(5,10)=10 → 15 >= 10 = true
      expect(isPriceChangeMeaningful(100, 115, 5, 10)).toBe(true);
    });

    it('returns false when change is below both thresholds', () => {
      // abs=1, threshold=max(5, 1000*2/100)=max(5,20)=20 → 1 < 20 = false
      expect(isPriceChangeMeaningful(1000, 1001, 5, 2)).toBe(false);
    });
  });
});
