import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/analyze/[listingId]/route';

// Mock claude-analyzer
const mockAnalyzeListing = jest.fn();
jest.mock('@/lib/claude-analyzer', () => ({
  analyzeListing: (...args: unknown[]) => mockAnalyzeListing(...args),
}));

// Mock prisma
const mockFindFirst = jest.fn();
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    aiAnalysisCache: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

function createParams(listingId: string) {
  return { params: Promise.resolve({ listingId }) };
}

describe('POST /api/analyze/[listingId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns analysis for valid listing', async () => {
    const analysis = { score: 95, recommendation: 'buy' };
    mockAnalyzeListing.mockResolvedValue(analysis);

    const req = new NextRequest('http://localhost/api/analyze/listing-1', { method: 'POST' });
    const res = await POST(req, createParams('listing-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.listingId).toBe('listing-1');
    expect(data.analysis).toEqual(analysis);
  });

  it('returns 404 when listing not found', async () => {
    mockAnalyzeListing.mockRejectedValue(new Error('Listing not found'));

    const req = new NextRequest('http://localhost/api/analyze/bad-id', { method: 'POST' });
    const res = await POST(req, createParams('bad-id'));
    expect(res.status).toBe(404);
  });

  it('returns 429 on rate limit', async () => {
    mockAnalyzeListing.mockRejectedValue(new Error('rate limit exceeded'));

    const req = new NextRequest('http://localhost/api/analyze/listing-1', { method: 'POST' });
    const res = await POST(req, createParams('listing-1'));
    expect(res.status).toBe(429);
  });

  it('returns 500 on API_KEY error', async () => {
    mockAnalyzeListing.mockRejectedValue(new Error('API_KEY not configured'));

    const req = new NextRequest('http://localhost/api/analyze/listing-1', { method: 'POST' });
    const res = await POST(req, createParams('listing-1'));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain('Claude API not configured');
  });

  it('returns 500 on generic Error', async () => {
    mockAnalyzeListing.mockRejectedValue(new Error('Something broke'));

    const req = new NextRequest('http://localhost/api/analyze/listing-1', { method: 'POST' });
    const res = await POST(req, createParams('listing-1'));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Something broke');
  });

  it('returns 500 on non-Error throw', async () => {
    mockAnalyzeListing.mockRejectedValue('string error');

    const req = new NextRequest('http://localhost/api/analyze/listing-1', { method: 'POST' });
    const res = await POST(req, createParams('listing-1'));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Failed to analyze listing');
  });
});

describe('GET /api/analyze/[listingId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns cached analysis when available', async () => {
    const cached = {
      analysisResult: JSON.stringify({ score: 90 }),
      createdAt: new Date('2026-01-01'),
      expiresAt: new Date('2026-12-31'),
    };
    mockFindFirst.mockResolvedValue(cached);

    const req = new NextRequest('http://localhost/api/analyze/listing-1');
    const res = await GET(req, createParams('listing-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.cached).toBe(true);
    expect(data.analysis).toEqual({ score: 90 });
  });

  it('returns cached=false when no cache', async () => {
    mockFindFirst.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/analyze/listing-1');
    const res = await GET(req, createParams('listing-1'));
    const data = await res.json();

    expect(data.cached).toBe(false);
  });

  it('returns 500 on error', async () => {
    mockFindFirst.mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/analyze/listing-1');
    const res = await GET(req, createParams('listing-1'));
    expect(res.status).toBe(500);
  });
});
