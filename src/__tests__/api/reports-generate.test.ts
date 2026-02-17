/**
 * Tests for POST/GET /api/reports/generate route
 */

import { NextRequest } from 'next/server';

// Mock report-service
// Mock auth middleware — reports routes require session auth
jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn().mockResolvedValue('user-1'),
}));

jest.mock('@/lib/report-service', () => ({
  getDateRange: jest.fn().mockReturnValue({
    start: new Date('2026-02-01'),
    end: new Date('2026-02-07'),
  }),
  buildReport: jest.fn().mockReturnValue({
    id: 'rpt-123',
    userId: 'user-1',
    generatedAt: '2026-02-07T00:00:00.000Z',
    period: 'weekly',
    startDate: '2026-02-01',
    endDate: '2026-02-07',
    summary: {
      totalRevenue: 500,
      totalCost: 200,
      totalProfit: 300,
      itemsSold: 5,
      itemsPurchased: 3,
      avgROI: 150,
      topCategory: 'electronics',
      topPlatform: 'ebay',
    },
    sections: [],
  }),
  reportToCSV: jest.fn().mockReturnValue('id,userId,period\nrpt-123,user-1,weekly\n'),
}));

import { GET, POST } from '@/app/api/reports/generate/route';
import { getDateRange, buildReport, reportToCSV } from '@/lib/report-service';

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

describe('POST /api/reports/generate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns JSON report for valid request', async () => {
    const req = makeRequest('/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-1', period: 'weekly' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe('rpt-123');
    expect(data.summary.totalProfit).toBe(300);
  });

  it('returns 200 when userId omitted from body (uses session userId)', async () => {
    // userId is now optional in body — route uses session userId as default
    const req = makeRequest('/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ period: 'weekly' }),
    });
    const res = await POST(req);
    // With auth mocked (user-1), omitting userId in body is fine
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.userId).toBe('user-1');
  });

  it('returns 400 for invalid period', async () => {
    const req = makeRequest('/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-1', period: 'yearly' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Invalid period');
  });

  it('returns 400 for custom period without dates', async () => {
    const req = makeRequest('/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-1', period: 'custom' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('startDate');
  });

  it('accepts custom period with dates', async () => {
    const req = makeRequest('/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        period: 'custom',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(getDateRange).toHaveBeenCalledWith(
      'custom',
      expect.any(Date),
      expect.any(Date)
    );
  });

  it('returns CSV when format=csv', async () => {
    const req = makeRequest('/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-1', period: 'weekly', format: 'csv' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    const text = await res.text();
    expect(text).toContain('rpt-123');
    expect(reportToCSV).toHaveBeenCalled();
  });

  it('returns 500 on unexpected error', async () => {
    (buildReport as jest.Mock).mockImplementationOnce(() => {
      throw new Error('DB down');
    });
    const req = makeRequest('/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-1', period: 'weekly' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain('Failed');
  });

  it('defaults period to weekly when not provided', async () => {
    const req = makeRequest('/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(getDateRange).toHaveBeenCalledWith('weekly', undefined, undefined);
  });
});

describe('GET /api/reports/generate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns JSON report with defaults', async () => {
    const req = makeRequest('/api/reports/generate');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe('rpt-123');
  });

  it('returns CSV when format=csv', async () => {
    const req = makeRequest('/api/reports/generate?format=csv');
    const res = await GET(req);
    expect(res.headers.get('Content-Type')).toBe('text/csv');
  });

  it('passes period and userId from query params', async () => {
    const req = makeRequest('/api/reports/generate?period=monthly&userId=u-42');
    await GET(req);
    expect(getDateRange).toHaveBeenCalledWith('monthly');
    expect(buildReport).toHaveBeenCalledWith('u-42', 'monthly', expect.any(Object), expect.any(Array));
  });

  it('defaults userId to anonymous', async () => {
    const req = makeRequest('/api/reports/generate');
    await GET(req);
    expect(buildReport).toHaveBeenCalledWith('anonymous', expect.any(String), expect.any(Object), expect.any(Array));
  });
});
