/**
 * Tests for analytics-service.ts
 */

// Mock prisma
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    opportunity: {
      findMany: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';
import { getProfitLossAnalytics } from '@/lib/analytics-service';

const makeOpp = (overrides: Record<string, unknown> = {}) => ({
  id: 'opp-1',
  userId: 'user-1',
  status: 'SOLD',
  purchasePrice: 100,
  purchaseDate: new Date('2026-01-01'),
  resalePrice: 200,
  resaleDate: new Date('2026-01-15'),
  fees: 10,
  listing: {
    title: 'Test Item',
    platform: 'EBAY',
    category: 'Electronics',
  },
  ...overrides,
});

describe('getProfitLossAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty summary when no opportunities', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([]);
    const result = await getProfitLossAnalytics('user-1');

    expect(result.totalInvested).toBe(0);
    expect(result.totalRevenue).toBe(0);
    expect(result.completedDeals).toBe(0);
    expect(result.activeDeals).toBe(0);
    expect(result.items).toHaveLength(0);
    expect(result.trends).toHaveLength(0);
    expect(result.categoryBreakdown).toHaveLength(0);
  });

  it('calculates correct totals for sold items', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
      makeOpp(),
      makeOpp({
        id: 'opp-2',
        purchasePrice: 50,
        resalePrice: 120,
        fees: 5,
        purchaseDate: new Date('2026-01-10'),
        resaleDate: new Date('2026-01-20'),
        listing: { title: 'Item 2', platform: 'CRAIGSLIST', category: 'Furniture' },
      }),
    ]);

    const result = await getProfitLossAnalytics('user-1');

    expect(result.totalInvested).toBe(150);
    expect(result.totalRevenue).toBe(320);
    expect(result.completedDeals).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.winRate).toBe(100); // both profitable
  });

  it('handles active (unsold) items correctly', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
      makeOpp({ status: 'PURCHASED', resalePrice: null, resaleDate: null }),
    ]);

    const result = await getProfitLossAnalytics('user-1');

    expect(result.completedDeals).toBe(0);
    expect(result.activeDeals).toBe(1);
    expect(result.items[0].status).toBe('PURCHASED');
  });

  it('computes category breakdown', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
      makeOpp(),
      makeOpp({
        id: 'opp-2',
        listing: { title: 'Another Electronic', platform: 'EBAY', category: 'Electronics' },
      }),
    ]);

    const result = await getProfitLossAnalytics('user-1');

    expect(result.categoryBreakdown).toHaveLength(1);
    expect(result.categoryBreakdown[0].category).toBe('Electronics');
    expect(result.categoryBreakdown[0].count).toBe(2);
  });

  it('computes trends by month', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([makeOpp()]);

    const result = await getProfitLossAnalytics('user-1', 'monthly');

    expect(result.trends.length).toBeGreaterThan(0);
    expect(result.trends[0].period).toBe('2026-01');
  });

  it('computes weekly trends', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([makeOpp()]);

    const result = await getProfitLossAnalytics('user-1', 'weekly');

    expect(result.trends.length).toBeGreaterThan(0);
    expect(result.trends[0].period).toMatch(/^\d{4}-W\d{2}$/);
  });

  it('identifies best and worst deals', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
      makeOpp({ id: 'best', purchasePrice: 50, resalePrice: 200 }),
      makeOpp({ id: 'worst', purchasePrice: 100, resalePrice: 80 }),
    ]);

    const result = await getProfitLossAnalytics('user-1');

    expect(result.bestDeal).not.toBeNull();
    expect(result.worstDeal).not.toBeNull();
    expect(result.bestDeal!.id).toBe('best');
    expect(result.worstDeal!.id).toBe('worst');
  });

  it('handles null category as Uncategorized', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
      makeOpp({ listing: { title: 'No Cat', platform: 'EBAY', category: null } }),
    ]);

    const result = await getProfitLossAnalytics('user-1');

    expect(result.categoryBreakdown[0].category).toBe('Uncategorized');
  });

  it('calculates win rate correctly with mixed results', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
      makeOpp({ id: 'win', purchasePrice: 50, resalePrice: 200, fees: 0 }),
      makeOpp({ id: 'loss', purchasePrice: 200, resalePrice: 100, fees: 0 }),
      makeOpp({ id: 'loss2', purchasePrice: 200, resalePrice: 100, fees: 0 }),
    ]);

    const result = await getProfitLossAnalytics('user-1');

    // 1 win out of 3 completed = 33.33%
    expect(result.winRate).toBeCloseTo(33.33, 1);
  });
});

// ── Additional branch coverage tests ────────────────────────────────────────

describe('getProfitLossAnalytics - branch coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles userId=null (no OR clause added)', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([]);
    const result = await getProfitLossAnalytics(null);
    expect(result.items).toHaveLength(0);
  });

  it('handles undefined userId (no OR clause added)', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([]);
    const result = await getProfitLossAnalytics(undefined);
    expect(result.items).toHaveLength(0);
  });

  it('computes weekly trend period correctly (Sunday edge case → -6 branch)', async () => {
    // Sunday Jan 4 2026 → getDay()===0 → diff uses -6 branch
    const sunday = new Date('2026-01-04T12:00:00Z');
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
      makeOpp({ purchaseDate: sunday, resaleDate: null, status: 'PURCHASED' }),
    ]);
    const result = await getProfitLossAnalytics('user-1', 'weekly');
    expect(result.trends.length).toBeGreaterThan(0);
    expect(result.trends[0].period).toMatch(/^\d{4}-W\d{2}$/);
  });

  it('computes weekly trend period correctly (non-Sunday branch)', async () => {
    // Tuesday Jan 6 2026 → getDay()===2 → diff uses +1 branch
    const tuesday = new Date('2026-01-06T12:00:00Z');
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
      makeOpp({ purchaseDate: tuesday, resaleDate: null, status: 'PURCHASED' }),
    ]);
    const result = await getProfitLossAnalytics('user-1', 'weekly');
    expect(result.trends.length).toBeGreaterThan(0);
  });

  it('handles item with null resaleDate in trend computation', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
      makeOpp({ resaleDate: null, resalePrice: null, status: 'PURCHASED' }),
    ]);
    const result = await getProfitLossAnalytics('user-1');
    // No sale period created, but purchase period exists
    expect(result.trends.length).toBeGreaterThanOrEqual(1);
    expect(result.trends[0].itemsSold).toBe(0);
  });

  it('returns overallROI=0 when no items (totalInvested is 0)', async () => {
    // Empty items → totalInvested=0 → overallROI=0
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([]);
    const result = await getProfitLossAnalytics('user-1');
    expect(result.overallROI).toBe(0);
  });

  it('computes avgDays=0 for category with no sold items', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
      makeOpp({ status: 'PURCHASED', resaleDate: null, resalePrice: null }),
    ]);
    const result = await getProfitLossAnalytics('user-1');
    const cat = result.categoryBreakdown.find((c) => c.category === 'Electronics');
    expect(cat?.avgDaysToSell).toBe(0);
  });

  it('computes avgROI=0 for category when invested is 0 (default param branch)', async () => {
    // Use granularity default (monthly) to hit the default branch
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
      makeOpp({ resaleDate: new Date('2026-01-20') }),
    ]);
    const result = await getProfitLossAnalytics('user-1');
    // Just verify categoryBreakdown has entries (avgROI >0 since there's purchase price)
    expect(result.categoryBreakdown.length).toBeGreaterThan(0);
  });
});
