/**
 * Tests for GET /api/analytics/profit-loss
 */
import { GET } from '@/app/api/analytics/profit-loss/route';
import { NextRequest } from 'next/server';

// Mock auth
jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn().mockResolvedValue('test-user-123'),
}));

// Mock analytics service
jest.mock('@/lib/analytics-service', () => ({
  getProfitLossAnalytics: jest.fn(),
}));

import { getProfitLossAnalytics } from '@/lib/analytics-service';

const mockAnalytics = {
  totalInvested: 500,
  totalRevenue: 800,
  totalFees: 50,
  totalGrossProfit: 300,
  totalNetProfit: 230,
  overallROI: 46,
  avgDaysHeld: 12,
  completedDeals: 3,
  activeDeals: 2,
  winRate: 66.67,
  avgProfitPerFlip: 76.67,
  successRate: 60,
  bestDeal: null,
  worstDeal: null,
  items: [],
  trends: [],
  categoryBreakdown: [],
  platformBreakdown: [],
};

describe('GET /api/analytics/profit-loss', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getProfitLossAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);
  });

  it('returns analytics with default monthly granularity', async () => {
    const req = new NextRequest('http://localhost/api/analytics/profit-loss');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.totalInvested).toBe(500);
    expect(body.totalNetProfit).toBe(230);
    expect(body.overallROI).toBe(46);
    expect(getProfitLossAnalytics).toHaveBeenCalledWith('test-user-123', 'monthly', undefined, undefined);
  });

  it('accepts weekly granularity', async () => {
    const req = new NextRequest('http://localhost/api/analytics/profit-loss?granularity=weekly');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(getProfitLossAnalytics).toHaveBeenCalledWith('test-user-123', 'weekly', undefined, undefined);
  });

  it('forwards dateFrom param to service', async () => {
    const req = new NextRequest('http://localhost/api/analytics/profit-loss?dateFrom=2026-01-01');
    await GET(req);
    expect(getProfitLossAnalytics).toHaveBeenCalledWith('test-user-123', 'monthly', '2026-01-01', undefined);
  });

  it('forwards dateTo param to service', async () => {
    const req = new NextRequest('http://localhost/api/analytics/profit-loss?dateTo=2026-01-31');
    await GET(req);
    expect(getProfitLossAnalytics).toHaveBeenCalledWith('test-user-123', 'monthly', undefined, '2026-01-31');
  });

  it('forwards both dateFrom and dateTo to service', async () => {
    const req = new NextRequest('http://localhost/api/analytics/profit-loss?dateFrom=2026-01-01&dateTo=2026-01-31');
    await GET(req);
    expect(getProfitLossAnalytics).toHaveBeenCalledWith('test-user-123', 'monthly', '2026-01-01', '2026-01-31');
  });

  it('defaults to monthly for invalid granularity values', async () => {
    const req = new NextRequest('http://localhost/api/analytics/profit-loss?granularity=quarterly');
    await GET(req);
    expect(getProfitLossAnalytics).toHaveBeenCalledWith('test-user-123', 'monthly', undefined, undefined);
  });

  it('returns 500 on error', async () => {
    (getProfitLossAnalytics as jest.Mock).mockRejectedValue(new Error('DB error'));
    const req = new NextRequest('http://localhost/api/analytics/profit-loss');
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});
