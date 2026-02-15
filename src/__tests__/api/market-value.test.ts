import { NextRequest } from 'next/server';
import { POST } from '@/app/api/listings/[id]/market-value/route';

const mockUpdateListingWithMarketValue = jest.fn();
jest.mock('@/lib/price-history-service', () => ({
  updateListingWithMarketValue: (...args: unknown[]) => mockUpdateListingWithMarketValue(...args),
}));

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/listings/[id]/market-value', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates market value successfully', async () => {
    mockUpdateListingWithMarketValue.mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost/api/listings/listing-1/market-value', { method: 'POST' });
    const res = await POST(req, createParams('listing-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when listing not found', async () => {
    mockUpdateListingWithMarketValue.mockRejectedValue(new Error('Listing not found'));

    const req = new NextRequest('http://localhost/api/listings/bad-id/market-value', { method: 'POST' });
    const res = await POST(req, createParams('bad-id'));
    expect(res.status).toBe(404);
  });

  it('returns 500 on generic error', async () => {
    mockUpdateListingWithMarketValue.mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/listings/listing-1/market-value', { method: 'POST' });
    const res = await POST(req, createParams('listing-1'));
    expect(res.status).toBe(500);
  });
});
