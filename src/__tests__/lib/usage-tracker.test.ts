/**
 * @file src/__tests__/lib/usage-tracker.test.ts
 * @author Stephen Boyett
 * @company Silverline Software
 * @date 2026-03-08
 * @version 1.0
 * @brief Unit tests for the usage-tracker service.
 *
 * @description
 * Tests recordUsage, getMonthlyUsage, getUsageDisplay, and getMonthStart
 * functions. Validates atomic upsert patterns, monthly reset via periodStart,
 * tier-appropriate display formatting, and edge cases.
 */

const mockUpsert = jest.fn();
const mockFindMany = jest.fn();
const mockScraperJobCount = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    usageRecord: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    scraperJob: {
      count: (...args: unknown[]) => mockScraperJobCount(...args),
    },
  },
}));

import {
  recordUsage,
  getMonthlyUsage,
  getUsageDisplay,
  getMonthStart,
} from '@/lib/usage-tracker';

describe('usage-tracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScraperJobCount.mockResolvedValue(0);
  });

  describe('getMonthStart', () => {
    it('returns the first day of the current month at 00:00 UTC', () => {
      const result = getMonthStart();
      expect(result.getUTCDate()).toBe(1);
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
      expect(result.getUTCMilliseconds()).toBe(0);
    });

    it('returns a Date in the current month and year', () => {
      const now = new Date();
      const result = getMonthStart();
      expect(result.getUTCFullYear()).toBe(now.getUTCFullYear());
      expect(result.getUTCMonth()).toBe(now.getUTCMonth());
    });
  });

  describe('recordUsage', () => {
    it('upserts a SCAN record for the current month', async () => {
      mockUpsert.mockResolvedValue({});

      await recordUsage('user-1', 'SCAN');

      expect(mockUpsert).toHaveBeenCalledWith({
        where: {
          userId_type_periodStart: {
            userId: 'user-1',
            type: 'SCAN',
            periodStart: expect.any(Date),
          },
        },
        create: {
          userId: 'user-1',
          type: 'SCAN',
          count: 1,
          periodStart: expect.any(Date),
        },
        update: {
          count: { increment: 1 },
        },
      });
    });

    it('upserts an ANALYSIS record for the current month', async () => {
      mockUpsert.mockResolvedValue({});

      await recordUsage('user-2', 'ANALYSIS');

      expect(mockUpsert).toHaveBeenCalledWith({
        where: {
          userId_type_periodStart: {
            userId: 'user-2',
            type: 'ANALYSIS',
            periodStart: expect.any(Date),
          },
        },
        create: {
          userId: 'user-2',
          type: 'ANALYSIS',
          count: 1,
          periodStart: expect.any(Date),
        },
        update: {
          count: { increment: 1 },
        },
      });
    });

    it('uses periodStart matching the first day of the current month', async () => {
      mockUpsert.mockResolvedValue({});

      await recordUsage('user-1', 'SCAN');

      const callArgs = mockUpsert.mock.calls[0][0];
      const periodStart = callArgs.where.userId_type_periodStart.periodStart;
      expect(periodStart.getUTCDate()).toBe(1);
      expect(periodStart.getUTCHours()).toBe(0);
    });

    it('propagates database errors', async () => {
      mockUpsert.mockRejectedValue(new Error('DB error'));

      await expect(recordUsage('user-1', 'SCAN')).rejects.toThrow('DB error');
    });
  });

  describe('getMonthlyUsage', () => {
    it('returns correct counts when both scan and analysis records exist', async () => {
      mockFindMany.mockResolvedValue([
        { type: 'SCAN', count: 5 },
        { type: 'ANALYSIS', count: 3 },
      ]);

      const result = await getMonthlyUsage('user-1');

      expect(result).toEqual({ scans: 5, analyses: 3 });
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', periodStart: expect.any(Date) },
      });
    });

    it('returns zero for missing record types', async () => {
      mockFindMany.mockResolvedValue([{ type: 'SCAN', count: 2 }]);

      const result = await getMonthlyUsage('user-1');

      expect(result).toEqual({ scans: 2, analyses: 0 });
    });

    it('returns zeros when no records exist', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await getMonthlyUsage('user-1');

      expect(result).toEqual({ scans: 0, analyses: 0 });
    });

    it('returns zero scans when only analysis records exist', async () => {
      mockFindMany.mockResolvedValue([{ type: 'ANALYSIS', count: 7 }]);

      const result = await getMonthlyUsage('user-1');

      expect(result).toEqual({ scans: 0, analyses: 7 });
    });

    it('queries using the current month periodStart', async () => {
      mockFindMany.mockResolvedValue([]);

      await getMonthlyUsage('user-1');

      const callArgs = mockFindMany.mock.calls[0][0];
      const periodStart = callArgs.where.periodStart;
      expect(periodStart.getUTCDate()).toBe(1);
    });
  });

  describe('getUsageDisplay', () => {
    it('formats correctly for FREE tier with daily scan limit', async () => {
      mockFindMany.mockResolvedValue([
        { type: 'SCAN', count: 7 },
        { type: 'ANALYSIS', count: 2 },
      ]);
      mockScraperJobCount.mockResolvedValue(3);

      const result = await getUsageDisplay('user-1', 'FREE');

      expect(result.scans.usedThisMonth).toBe(7);
      expect(result.scans.usedToday).toBe(3);
      expect(result.scans.limitPerDay).toBe(10); // FREE tier: 10 scans/day
      expect(result.analyses.usedThisMonth).toBe(2);
      expect(result.analyses.limit).toBeNull();
      expect(result.tier).toBe('FREE');
      expect(result.periodStart).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.periodEnd).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('formats correctly for FLIPPER tier with unlimited scans', async () => {
      mockFindMany.mockResolvedValue([
        { type: 'SCAN', count: 50 },
        { type: 'ANALYSIS', count: 10 },
      ]);

      const result = await getUsageDisplay('user-1', 'FLIPPER');

      expect(result.scans.usedThisMonth).toBe(50);
      expect(result.scans.limitPerDay).toBeNull(); // FLIPPER: unlimited
      expect(result.analyses.usedThisMonth).toBe(10);
      expect(result.tier).toBe('FLIPPER');
    });

    it('formats correctly for PRO tier with unlimited scans', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await getUsageDisplay('user-1', 'PRO');

      expect(result.scans.usedThisMonth).toBe(0);
      expect(result.scans.limitPerDay).toBeNull(); // PRO: unlimited
      expect(result.analyses.usedThisMonth).toBe(0);
      expect(result.tier).toBe('PRO');
    });

    it('returns valid period dates for the current month', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await getUsageDisplay('user-1', 'FREE');

      const periodStart = new Date(result.periodStart);
      const periodEnd = new Date(result.periodEnd);
      expect(periodStart.getUTCDate()).toBe(1);
      expect(periodEnd.getUTCDate()).toBeGreaterThanOrEqual(28); // Last day of month
      expect(periodEnd.getUTCMonth()).toBe(periodStart.getUTCMonth());
    });
  });

  describe('monthly reset behavior', () => {
    it('queries only current month records (implicit reset)', async () => {
      mockFindMany.mockResolvedValue([]);

      await getMonthlyUsage('user-1');

      const callArgs = mockFindMany.mock.calls[0][0];
      const periodStart = callArgs.where.periodStart;
      const now = new Date();
      expect(periodStart.getUTCFullYear()).toBe(now.getUTCFullYear());
      expect(periodStart.getUTCMonth()).toBe(now.getUTCMonth());
    });

    it('new month query returns zero when no records exist for new month', async () => {
      // Simulate: old records exist but none for current month
      mockFindMany.mockResolvedValue([]);

      const result = await getMonthlyUsage('user-1');

      expect(result).toEqual({ scans: 0, analyses: 0 });
    });
  });
});
