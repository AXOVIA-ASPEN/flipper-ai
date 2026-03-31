/**
 * Tests for GET /api/analytics/export
 */
import { GET } from '@/app/api/analytics/export/route';
import { NextRequest } from 'next/server';

// Mock auth
jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn().mockResolvedValue('user-123'),
}));

// Mock analytics service
jest.mock('@/lib/analytics-service', () => ({
  getProfitLossAnalytics: jest.fn(),
}));

import { getAuthUserId } from '@/lib/auth-middleware';
import { getProfitLossAnalytics } from '@/lib/analytics-service';

const mockItem = {
  id: '1',
  title: 'Test Item',
  platform: 'EBAY',
  category: 'electronics',
  status: 'SOLD',
  purchasePrice: 100,
  resalePrice: 150,
  fees: 10,
  grossProfit: 50,
  netProfit: 40,
  roiPercent: 40,
  daysHeld: 14,
  purchaseDate: '2026-01-01T00:00:00.000Z',
  resaleDate: '2026-01-15T00:00:00.000Z',
};

const mockAnalytics = {
  items: [mockItem],
  trends: [],
  categoryBreakdown: [],
  platformBreakdown: [],
  totalInvested: 100,
  totalRevenue: 150,
  totalFees: 10,
  totalGrossProfit: 50,
  totalNetProfit: 40,
  overallROI: 40,
  avgDaysHeld: 14,
  completedDeals: 1,
  activeDeals: 0,
  winRate: 100,
  avgProfitPerFlip: 40,
  successRate: 100,
  bestDeal: null,
  worstDeal: null,
};

describe('GET /api/analytics/export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getProfitLossAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);
    (getAuthUserId as jest.Mock).mockResolvedValue('user-123');
  });

  it('returns 200 with text/csv Content-Type for format=csv', async () => {
    const req = new NextRequest('http://localhost/api/analytics/export?format=csv');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/csv');
  });

  it('sets Content-Disposition to attachment with dated filename', async () => {
    const req = new NextRequest('http://localhost/api/analytics/export?format=csv');
    const res = await GET(req);

    const disposition = res.headers.get('Content-Disposition') ?? '';
    expect(disposition).toContain('attachment');
    expect(disposition).toMatch(/flipper-report-\d{4}-\d{2}-\d{2}\.csv/);
  });

  it('returns CSV content with header row', async () => {
    const req = new NextRequest('http://localhost/api/analytics/export?format=csv');
    const res = await GET(req);
    const text = await res.text();

    expect(text.split('\n')[0]).toContain('Title');
    expect(text.split('\n')[0]).toContain('Platform');
    expect(text.split('\n')[0]).toContain('Sale Date');
  });

  it('includes item data in CSV body', async () => {
    const req = new NextRequest('http://localhost/api/analytics/export?format=csv');
    const res = await GET(req);
    const text = await res.text();

    expect(text).toContain('Test Item');
    expect(text).toContain('EBAY');
  });

  it('returns 400 for format=pdf (pdf is client-side only)', async () => {
    const req = new NextRequest('http://localhost/api/analytics/export?format=pdf');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('returns 400 for unsupported format values', async () => {
    const req = new NextRequest('http://localhost/api/analytics/export?format=xlsx');
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it('returns 401 when user is not authenticated', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/analytics/export?format=csv');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Unauthorized');
  });

  it('defaults to csv format when format param is missing', async () => {
    const req = new NextRequest('http://localhost/api/analytics/export');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/csv');
  });

  it('passes monthly granularity to getProfitLossAnalytics by default', async () => {
    const req = new NextRequest('http://localhost/api/analytics/export?format=csv');
    await GET(req);

    expect(getProfitLossAnalytics).toHaveBeenCalledWith('user-123', 'monthly', undefined, undefined);
  });

  it('passes weekly granularity when specified', async () => {
    const req = new NextRequest(
      'http://localhost/api/analytics/export?format=csv&granularity=weekly'
    );
    await GET(req);

    expect(getProfitLossAnalytics).toHaveBeenCalledWith('user-123', 'weekly', undefined, undefined);
  });

  it('passes dateFrom and dateTo to getProfitLossAnalytics', async () => {
    const req = new NextRequest(
      'http://localhost/api/analytics/export?format=csv&dateFrom=2026-01-01&dateTo=2026-01-31'
    );
    await GET(req);

    expect(getProfitLossAnalytics).toHaveBeenCalledWith('user-123', 'monthly', '2026-01-01', '2026-01-31');
  });

  it('passes only dateFrom when dateTo is absent', async () => {
    const req = new NextRequest(
      'http://localhost/api/analytics/export?format=csv&dateFrom=2026-01-01'
    );
    await GET(req);

    expect(getProfitLossAnalytics).toHaveBeenCalledWith('user-123', 'monthly', '2026-01-01', undefined);
  });

  it('returns 500 on service error', async () => {
    (getProfitLossAnalytics as jest.Mock).mockRejectedValue(new Error('DB down'));
    const req = new NextRequest('http://localhost/api/analytics/export?format=csv');
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
