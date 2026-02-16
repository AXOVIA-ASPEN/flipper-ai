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
