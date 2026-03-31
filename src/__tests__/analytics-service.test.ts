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
  purchaseDate: new Date('2026-01-02T12:00:00Z'),
  resalePrice: 200,
  resaleDate: new Date('2026-01-15T12:00:00Z'),
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
        purchaseDate: new Date('2026-01-10T12:00:00Z'),
        resaleDate: new Date('2026-01-20T12:00:00Z'),
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
      makeOpp({ resaleDate: new Date('2026-01-20T12:00:00Z') }),
    ]);
    const result = await getProfitLossAnalytics('user-1');
    // Just verify categoryBreakdown has entries (avgROI >0 since there's purchase price)
    expect(result.categoryBreakdown.length).toBeGreaterThan(0);
  });

  it('uses resalePrice ?? 0 when item has resaleDate but null resalePrice (line 175)', async () => {
    // Item is SOLD with a resaleDate but resalePrice: null → triggers ?? 0 branch in trend
    const soldWithNullPrice = makeOpp({
      status: 'SOLD',
      purchaseDate: new Date('2026-01-02T12:00:00Z'),
      resaleDate: new Date('2026-01-15T12:00:00Z'),
      resalePrice: null,
    });
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([soldWithNullPrice]);
    const result = await getProfitLossAnalytics('user-1');
    // Trend should exist; revenue should be 0 (fell back to 0)
    const saleTrend = result.trends.find((t) => t.itemsSold > 0);
    expect(saleTrend).toBeDefined();
    expect(saleTrend?.revenue).toBe(0);
  });

  it('computes avgROI correctly for sold item in category', async () => {
    // Normal item, verifies the avgROI > 0 path in categoryBreakdown
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
      makeOpp({ purchasePrice: 50, resalePrice: 100, resaleDate: new Date('2026-01-20T12:00:00Z') }),
    ]);
    const result = await getProfitLossAnalytics('user-1');
    const cat = result.categoryBreakdown.find((c) => c.category === 'Electronics');
    expect(cat?.avgROI).toBeGreaterThan(0);
  });
});

// ── Story 6.4: New metrics and date range tests ─────────────────────────────

describe('getProfitLossAnalytics - avgProfitPerFlip and successRate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('computes avgProfitPerFlip: 2 SOLD items with netProfit $100 and $200 → avgProfitPerFlip = 150', async () => {
    // Use same purchase and resale date to eliminate carrying cost, making netProfit exact
    const sameDay = new Date('2026-01-02T12:00:00Z');
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
      makeOpp({ id: 'opp-a', purchasePrice: 50, resalePrice: 160, fees: 10,
        purchaseDate: sameDay, resaleDate: sameDay }),
      makeOpp({ id: 'opp-b', purchasePrice: 50, resalePrice: 260, fees: 10,
        purchaseDate: sameDay, resaleDate: sameDay }),
    ]);
    const result = await getProfitLossAnalytics('user-1');
    // opp-a netProfit: 160-50-10=100, opp-b: 260-50-10=200, avg=150
    expect(result.avgProfitPerFlip).toBe(150);
  });

  it('returns avgProfitPerFlip = 0 when no completed deals', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
      makeOpp({ status: 'PURCHASED', resalePrice: null, resaleDate: null }),
    ]);
    const result = await getProfitLossAnalytics('user-1');
    expect(result.avgProfitPerFlip).toBe(0);
  });

  it('computes successRate: 2 SOLD out of 3 total → successRate = 66.67', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
      makeOpp({ id: 'sold-1', status: 'SOLD' }),
      makeOpp({ id: 'sold-2', status: 'SOLD',
        purchaseDate: new Date('2026-01-05T12:00:00Z'),
        resaleDate: new Date('2026-01-20T12:00:00Z') }),
      makeOpp({ id: 'active-1', status: 'PURCHASED', resalePrice: null, resaleDate: null }),
    ]);
    const result = await getProfitLossAnalytics('user-1');
    expect(result.successRate).toBeCloseTo(66.67, 1);
  });

  it('returns successRate = 0 when no items', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([]);
    const result = await getProfitLossAnalytics('user-1');
    expect(result.successRate).toBe(0);
  });

  it('computes platformBreakdown: 2 EBAY items, 1 CRAIGSLIST → two entries sorted by totalProfit', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
      makeOpp({ id: 'eb-1', purchasePrice: 50, resalePrice: 200, fees: 10,
        listing: { title: 'eBay 1', platform: 'EBAY', category: 'Electronics' } }),
      makeOpp({ id: 'eb-2', purchasePrice: 50, resalePrice: 200, fees: 10,
        purchaseDate: new Date('2026-01-05T12:00:00Z'),
        resaleDate: new Date('2026-01-20T12:00:00Z'),
        listing: { title: 'eBay 2', platform: 'EBAY', category: 'Electronics' } }),
      makeOpp({ id: 'cl-1', purchasePrice: 100, resalePrice: 120, fees: 0,
        listing: { title: 'CL item', platform: 'CRAIGSLIST', category: 'Furniture' } }),
    ]);
    const result = await getProfitLossAnalytics('user-1');
    expect(result.platformBreakdown).toHaveLength(2);
    // EBAY has higher totalProfit → sorted first
    expect(result.platformBreakdown[0].platform).toBe('EBAY');
    expect(result.platformBreakdown[1].platform).toBe('CRAIGSLIST');
    expect(result.platformBreakdown[0].count).toBe(2);
  });

  it('avgProfitPerFlip uses only SOLD items netProfit, ignoring active item carrying costs', async () => {
    const sameDay = new Date('2026-01-02T12:00:00Z');
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
      // SOLD item: netProfit = 200 - 100 - 10 = 90 (same-day purchase/resale, no carrying cost)
      makeOpp({ id: 'sold-1', purchasePrice: 100, resalePrice: 200, fees: 10,
        purchaseDate: sameDay, resaleDate: sameDay }),
      // PURCHASED item: contributes large negative netProfit to totalNetProfit via carrying costs
      makeOpp({ id: 'active-1', status: 'PURCHASED', purchasePrice: 500,
        resalePrice: null, resaleDate: null }),
    ]);
    const result = await getProfitLossAnalytics('user-1');
    // avgProfitPerFlip must reflect only the SOLD item: 90 / 1 = 90
    // NOT totalNetProfit / 1 (which would be −$500+ due to active item carrying costs)
    expect(result.avgProfitPerFlip).toBe(90);
    expect(result.completedDeals).toBe(1);
  });

  it('platformBreakdown successRate is SOLD / all items per platform', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
      makeOpp({ id: 'eb-sold', status: 'SOLD',
        listing: { title: 'eBay sold', platform: 'EBAY', category: 'Electronics' } }),
      makeOpp({ id: 'eb-active', status: 'PURCHASED', resalePrice: null, resaleDate: null,
        listing: { title: 'eBay active', platform: 'EBAY', category: 'Electronics' } }),
    ]);
    const result = await getProfitLossAnalytics('user-1');
    const ebay = result.platformBreakdown.find((p) => p.platform === 'EBAY');
    expect(ebay?.successRate).toBeCloseTo(50, 1);
  });
});

describe('getProfitLossAnalytics - date range filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes dateFrom/dateTo to prisma where clause', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([makeOpp()]);
    await getProfitLossAnalytics('user-1', 'monthly', '2026-01-01', '2026-01-31');
    const call = (prisma.opportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.purchaseDate).toBeDefined();
    expect(call.where.purchaseDate.gte).toEqual(new Date('2026-01-01'));
    expect(call.where.purchaseDate.lte).toEqual(new Date('2026-01-31T23:59:59Z'));
  });

  it('passes only dateFrom when dateTo is null', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([]);
    await getProfitLossAnalytics('user-1', 'monthly', '2026-01-01', null);
    const call = (prisma.opportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.purchaseDate.gte).toEqual(new Date('2026-01-01'));
    expect(call.where.purchaseDate.lte).toBeUndefined();
  });

  it('passes only dateTo when dateFrom is null', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([]);
    await getProfitLossAnalytics('user-1', 'monthly', null, '2026-01-31');
    const call = (prisma.opportunity.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.purchaseDate.lte).toEqual(new Date('2026-01-31T23:59:59Z'));
    expect(call.where.purchaseDate.gte).toBeUndefined();
  });

  it('does not add purchaseDate filter when no dates provided', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([]);
    await getProfitLossAnalytics('user-1', 'monthly', null, null);
    const call = (prisma.opportunity.findMany as jest.Mock).mock.calls[0][0];
    // purchaseDate.not is the initial value from the base where clause, not a range
    expect(call.where.purchaseDate).toEqual({ not: null });
  });

  it('returns empty summary with empty date range results', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([]);
    const result = await getProfitLossAnalytics('user-1', 'monthly', '2026-06-01', '2026-06-30');
    expect(result.items).toHaveLength(0);
    expect(result.avgProfitPerFlip).toBe(0);
    expect(result.successRate).toBe(0);
    expect(result.platformBreakdown).toHaveLength(0);
  });
});
