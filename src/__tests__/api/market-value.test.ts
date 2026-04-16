import { NextRequest } from 'next/server';

const mockUpdateListingWithMarketValue = jest.fn();
jest.mock('@/lib/price-history-service', () => ({
  updateListingWithMarketValue: (...args: unknown[]) => mockUpdateListingWithMarketValue(...args),
}));

const mockGetCurrentUserId = jest.fn();
jest.mock('@/lib/auth', () => ({
  __esModule: true,
  getCurrentUserId: (...args: unknown[]) => mockGetCurrentUserId(...args),
}));

const mockListingFindUnique = jest.fn();
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    listing: {
      findUnique: (...args: unknown[]) => mockListingFindUnique(...args),
    },
  },
}));

import { POST } from '@/app/api/listings/[id]/market-value/route';

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/listings/[id]/market-value - branch coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserId.mockResolvedValue('user-1');
    mockListingFindUnique.mockResolvedValue({ userId: 'user-1' });
  });

  it('returns 422 when id is empty', async () => {
    const req = new NextRequest('http://localhost/api/listings//market-value', { method: 'POST' });
    const res = await POST(req, createParams(''));
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/listings/[id]/market-value', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserId.mockResolvedValue('user-1');
    mockListingFindUnique.mockResolvedValue({ userId: 'user-1' });
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetCurrentUserId.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/listings/listing-1/market-value', {
      method: 'POST',
    });
    const res = await POST(req, createParams('listing-1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when listing does not exist', async () => {
    mockListingFindUnique.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/listings/bad-id/market-value', {
      method: 'POST',
    });
    const res = await POST(req, createParams('bad-id'));
    expect(res.status).toBe(404);
  });

  it('returns 403 when listing is owned by another user', async () => {
    mockListingFindUnique.mockResolvedValue({ userId: 'other-user' });

    const req = new NextRequest('http://localhost/api/listings/listing-1/market-value', {
      method: 'POST',
    });
    const res = await POST(req, createParams('listing-1'));
    expect(res.status).toBe(403);
  });

  it('updates market value successfully', async () => {
    mockUpdateListingWithMarketValue.mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost/api/listings/listing-1/market-value', {
      method: 'POST',
    });
    const res = await POST(req, createParams('listing-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 404 when service reports listing not found', async () => {
    mockUpdateListingWithMarketValue.mockRejectedValue(new Error('Listing not found'));

    const req = new NextRequest('http://localhost/api/listings/bad-id/market-value', {
      method: 'POST',
    });
    const res = await POST(req, createParams('bad-id'));
    expect(res.status).toBe(404);
  });

  it('returns 500 on generic error', async () => {
    mockUpdateListingWithMarketValue.mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/listings/listing-1/market-value', {
      method: 'POST',
    });
    const res = await POST(req, createParams('listing-1'));
    expect(res.status).toBe(500);
  });
});
