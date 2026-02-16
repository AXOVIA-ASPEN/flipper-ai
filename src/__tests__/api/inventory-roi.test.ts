/**
 * Tests for GET /api/inventory/roi
 * Covers: auth, data retrieval, ROI calculation, error handling
 */

jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    opportunity: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/roi-calculator', () => ({
  calculateROI: jest.fn(),
  calculatePortfolioROI: jest.fn(),
}));

import { GET } from '@/app/api/inventory/roi/route';
import { getAuthUserId } from '@/lib/auth-middleware';
import prisma from '@/lib/db';
import { calculateROI, calculatePortfolioROI } from '@/lib/roi-calculator';
import { NextRequest } from 'next/server';

const mockGetAuthUserId = getAuthUserId as jest.Mock;
const mockFindMany = prisma.opportunity.findMany as jest.Mock;
const mockCalculateROI = calculateROI as jest.Mock;
const mockCalculatePortfolioROI = calculatePortfolioROI as jest.Mock;

function makeReq(): NextRequest {
  return new NextRequest('http://localhost/api/inventory/roi');
}

describe('GET /api/inventory/roi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns ROI data for authenticated user with purchased items', async () => {
    mockGetAuthUserId.mockResolvedValue('user-1');
    mockFindMany.mockResolvedValue([
      {
        id: 'opp-1',
        purchasePrice: 50,
        resalePrice: 120,
        fees: 10,
        purchaseDate: new Date('2026-01-01'),
        resaleDate: new Date('2026-01-15'),
        status: 'SOLD',
        listing: { title: 'Widget', platform: 'CRAIGSLIST' },
      },
    ]);
    mockCalculateROI.mockReturnValue({
      profit: 60,
      roiPercent: 120,
      annualizedROI: 2920,
      daysHeld: 14,
    });
    mockCalculatePortfolioROI.mockReturnValue({
      totalInvested: 50,
      totalRevenue: 120,
      totalProfit: 60,
      avgROI: 120,
    });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(1);
    expect(json.items[0].title).toBe('Widget');
    expect(json.items[0].profit).toBe(60);
    expect(json.portfolio.totalProfit).toBe(60);
  });

  it('returns empty items when no opportunities exist', async () => {
    mockGetAuthUserId.mockResolvedValue('user-2');
    mockFindMany.mockResolvedValue([]);
    mockCalculatePortfolioROI.mockReturnValue({
      totalInvested: 0,
      totalRevenue: 0,
      totalProfit: 0,
      avgROI: 0,
    });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(0);
  });

  it('filters out opportunities without purchasePrice or purchaseDate', async () => {
    mockGetAuthUserId.mockResolvedValue('user-3');
    mockFindMany.mockResolvedValue([
      {
        id: 'opp-no-price',
        purchasePrice: null,
        purchaseDate: new Date(),
        status: 'PURCHASED',
        listing: { title: 'No Price', platform: 'EBAY' },
      },
      {
        id: 'opp-no-date',
        purchasePrice: 100,
        purchaseDate: null,
        status: 'PURCHASED',
        listing: { title: 'No Date', platform: 'EBAY' },
      },
      {
        id: 'opp-valid',
        purchasePrice: 75,
        resalePrice: null,
        fees: null,
        purchaseDate: new Date('2026-02-01'),
        resaleDate: null,
        status: 'PURCHASED',
        listing: { title: 'Valid Item', platform: 'CRAIGSLIST' },
      },
    ]);
    mockCalculateROI.mockReturnValue({
      profit: 0,
      roiPercent: 0,
      annualizedROI: 0,
      daysHeld: 15,
    });
    mockCalculatePortfolioROI.mockReturnValue({
      totalInvested: 75,
      totalRevenue: 0,
      totalProfit: 0,
      avgROI: 0,
    });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(1);
    expect(json.items[0].title).toBe('Valid Item');
  });

  it('works for unauthenticated users (userId null)', async () => {
    mockGetAuthUserId.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([]);
    mockCalculatePortfolioROI.mockReturnValue({
      totalInvested: 0,
      totalRevenue: 0,
      totalProfit: 0,
      avgROI: 0,
    });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    // Should still query but with different where clause (no userId filter)
    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.OR).toBeUndefined();
  });

  it('includes listing platform and status in response items', async () => {
    mockGetAuthUserId.mockResolvedValue('user-4');
    mockFindMany.mockResolvedValue([
      {
        id: 'opp-listed',
        purchasePrice: 200,
        resalePrice: 400,
        fees: 20,
        purchaseDate: new Date('2026-01-10'),
        resaleDate: null,
        status: 'LISTED',
        listing: { title: 'Listed Item', platform: 'EBAY' },
      },
    ]);
    mockCalculateROI.mockReturnValue({
      profit: 180,
      roiPercent: 90,
      annualizedROI: 1800,
      daysHeld: 37,
    });
    mockCalculatePortfolioROI.mockReturnValue({
      totalInvested: 200,
      totalRevenue: 400,
      totalProfit: 180,
      avgROI: 90,
    });

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.items[0].platform).toBe('EBAY');
    expect(json.items[0].status).toBe('LISTED');
    expect(json.items[0].purchasePrice).toBe(200);
    expect(json.items[0].resalePrice).toBe(400);
    expect(json.items[0].fees).toBe(20);
  });

  it('returns 500 when database query fails', async () => {
    mockGetAuthUserId.mockResolvedValue('user-5');
    mockFindMany.mockRejectedValue(new Error('DB connection lost'));

    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to calculate ROI');
  });

  it('returns 500 when getAuthUserId throws', async () => {
    mockGetAuthUserId.mockRejectedValue(new Error('Auth service down'));

    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to calculate ROI');
  });

  it('passes correct ROIInput to calculateROI', async () => {
    const purchaseDate = new Date('2026-01-05');
    const resaleDate = new Date('2026-01-20');

    mockGetAuthUserId.mockResolvedValue('user-6');
    mockFindMany.mockResolvedValue([
      {
        id: 'opp-check',
        purchasePrice: 100,
        resalePrice: 250,
        fees: 15,
        purchaseDate,
        resaleDate,
        status: 'SOLD',
        listing: { title: 'Check Input', platform: 'CRAIGSLIST' },
      },
    ]);
    mockCalculateROI.mockReturnValue({ profit: 135, roiPercent: 135, annualizedROI: 3285, daysHeld: 15 });
    mockCalculatePortfolioROI.mockReturnValue({ totalInvested: 100, totalRevenue: 250, totalProfit: 135, avgROI: 135 });

    await GET(makeReq());

    expect(mockCalculateROI).toHaveBeenCalledWith({
      purchasePrice: 100,
      resalePrice: 250,
      fees: 15,
      purchaseDate,
      resaleDate,
    });
  });

  it('handles multiple items and calculates portfolio', async () => {
    mockGetAuthUserId.mockResolvedValue('user-7');
    mockFindMany.mockResolvedValue([
      {
        id: 'opp-a',
        purchasePrice: 50,
        resalePrice: 100,
        fees: 5,
        purchaseDate: new Date('2026-01-01'),
        resaleDate: new Date('2026-01-10'),
        status: 'SOLD',
        listing: { title: 'Item A', platform: 'CRAIGSLIST' },
      },
      {
        id: 'opp-b',
        purchasePrice: 200,
        resalePrice: null,
        fees: null,
        purchaseDate: new Date('2026-02-01'),
        resaleDate: null,
        status: 'PURCHASED',
        listing: { title: 'Item B', platform: 'EBAY' },
      },
    ]);
    mockCalculateROI
      .mockReturnValueOnce({ profit: 45, roiPercent: 90, annualizedROI: 3285, daysHeld: 9 })
      .mockReturnValueOnce({ profit: 0, roiPercent: 0, annualizedROI: 0, daysHeld: 15 });
    mockCalculatePortfolioROI.mockReturnValue({
      totalInvested: 250,
      totalRevenue: 100,
      totalProfit: 45,
      avgROI: 45,
    });

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.items).toHaveLength(2);
    expect(mockCalculateROI).toHaveBeenCalledTimes(2);
    expect(mockCalculatePortfolioROI).toHaveBeenCalledTimes(1);
    // Portfolio should receive both inputs
    expect(mockCalculatePortfolioROI.mock.calls[0][0]).toHaveLength(2);
  });
});
