import {
  computeEstimatedExpiry,
  getExpiringListings,
  PLATFORM_EXPIRY_DAYS,
} from '@/lib/listing-expiry';

// Mock prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    listing: {
      findMany: jest.fn(),
    },
  },
}));

// Mock TRACKABLE_STATUSES dependency
jest.mock('@/lib/listing-tracker', () => ({
  TRACKABLE_STATUSES: ['NEW', 'ANALYZING', 'OPPORTUNITY', 'CONTACTED', 'PURCHASED', 'LISTED'],
  TERMINAL_STATUSES: ['SOLD', 'EXPIRED', 'PASSED'],
}));

import { prisma } from '@/lib/db';
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('listing-expiry', () => {
  describe('PLATFORM_EXPIRY_DAYS', () => {
    it('defines 7 days for CRAIGSLIST', () => {
      expect(PLATFORM_EXPIRY_DAYS['CRAIGSLIST']).toBe(7);
    });

    it('defines 30 days for EBAY', () => {
      expect(PLATFORM_EXPIRY_DAYS['EBAY']).toBe(30);
    });

    it('defines 7 days for FACEBOOK_MARKETPLACE', () => {
      expect(PLATFORM_EXPIRY_DAYS['FACEBOOK_MARKETPLACE']).toBe(7);
    });

    it('defines null for MERCARI', () => {
      expect(PLATFORM_EXPIRY_DAYS['MERCARI']).toBeNull();
    });

    it('defines null for OFFERUP', () => {
      expect(PLATFORM_EXPIRY_DAYS['OFFERUP']).toBeNull();
    });
  });

  describe('computeEstimatedExpiry', () => {
    const baseDate = new Date('2026-01-01T00:00:00.000Z');

    it('returns +7 days for CRAIGSLIST', () => {
      const result = computeEstimatedExpiry('CRAIGSLIST', baseDate);
      expect(result).not.toBeNull();
      const expected = new Date('2026-01-08T00:00:00.000Z');
      expect(result!.toISOString()).toBe(expected.toISOString());
    });

    it('returns +30 days for EBAY', () => {
      const result = computeEstimatedExpiry('EBAY', baseDate);
      expect(result).not.toBeNull();
      const expected = new Date('2026-01-31T00:00:00.000Z');
      expect(result!.toISOString()).toBe(expected.toISOString());
    });

    it('returns +7 days for FACEBOOK_MARKETPLACE', () => {
      const result = computeEstimatedExpiry('FACEBOOK_MARKETPLACE', baseDate);
      expect(result).not.toBeNull();
      const expected = new Date('2026-01-08T00:00:00.000Z');
      expect(result!.toISOString()).toBe(expected.toISOString());
    });

    it('returns null for MERCARI', () => {
      expect(computeEstimatedExpiry('MERCARI', baseDate)).toBeNull();
    });

    it('returns null for OFFERUP', () => {
      expect(computeEstimatedExpiry('OFFERUP', baseDate)).toBeNull();
    });

    it('returns null when postedAt is null', () => {
      expect(computeEstimatedExpiry('CRAIGSLIST', null)).toBeNull();
    });

    it('returns null when postedAt is undefined', () => {
      expect(computeEstimatedExpiry('CRAIGSLIST', undefined)).toBeNull();
    });

    it('returns null for unknown platform', () => {
      expect(computeEstimatedExpiry('UNKNOWN_PLATFORM', baseDate)).toBeNull();
    });

    it('does not mutate the input date', () => {
      const original = new Date('2026-01-01T00:00:00.000Z');
      const copy = new Date(original.getTime());
      computeEstimatedExpiry('CRAIGSLIST', original);
      expect(original.toISOString()).toBe(copy.toISOString());
    });
  });

  describe('getExpiringListings', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    const now = new Date('2026-04-09T12:00:00.000Z');

    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('queries listings with estimatedExpiresAt within the next 24 hours', async () => {
      (mockPrisma.listing.findMany as jest.Mock).mockResolvedValueOnce([]);

      await getExpiringListings(24);

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estimatedExpiresAt: expect.objectContaining({
              not: null,
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
            status: expect.objectContaining({ in: expect.arrayContaining(['NEW', 'OPPORTUNITY']) }),
          }),
        })
      );

      const call = (mockPrisma.listing.findMany as jest.Mock).mock.calls[0][0];
      const { gte, lte } = call.where.estimatedExpiresAt;
      expect(lte.getTime() - gte.getTime()).toBe(24 * 3_600_000);
    });

    it('returns listings mapped with non-null estimatedExpiresAt', async () => {
      const fakeExpiry = new Date('2026-04-09T18:00:00.000Z');
      (mockPrisma.listing.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 'l1', title: 'Test', platform: 'CRAIGSLIST', url: 'http://x', askingPrice: 100, userId: 'u1', estimatedExpiresAt: fakeExpiry, postedAt: null },
      ]);

      const result = await getExpiringListings(24);

      expect(result).toHaveLength(1);
      expect(result[0].estimatedExpiresAt).toBe(fakeExpiry);
    });

    it('excludes terminal-status listings (SOLD/EXPIRED/PASSED) via the status filter', async () => {
      (mockPrisma.listing.findMany as jest.Mock).mockResolvedValueOnce([]);

      await getExpiringListings();

      const call = (mockPrisma.listing.findMany as jest.Mock).mock.calls[0][0];
      const statusFilter = call.where.status.in as string[];
      expect(statusFilter).not.toContain('SOLD');
      expect(statusFilter).not.toContain('EXPIRED');
      expect(statusFilter).not.toContain('PASSED');
    });

    it('uses 24 hours as the default window', async () => {
      (mockPrisma.listing.findMany as jest.Mock).mockResolvedValueOnce([]);

      await getExpiringListings(); // default = 24

      const call = (mockPrisma.listing.findMany as jest.Mock).mock.calls[0][0];
      const { gte, lte } = call.where.estimatedExpiresAt;
      expect(lte.getTime() - gte.getTime()).toBe(24 * 3_600_000);
    });
  });
});
