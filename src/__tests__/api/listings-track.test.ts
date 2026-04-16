// Tests for /api/listings/track route
import { NextRequest } from 'next/server';

// Mock listing-tracker module
jest.mock('@/lib/listing-tracker', () => ({
  getTrackableListings: jest.fn(),
  runTrackingCycle: jest.fn(),
}));

const mockGetCurrentUserId = jest.fn().mockResolvedValue('test-user');
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

import { GET, POST } from '@/app/api/listings/track/route';
import { getTrackableListings, runTrackingCycle } from '@/lib/listing-tracker';

const mockGetTrackable = getTrackableListings as jest.MockedFunction<typeof getTrackableListings>;
const mockRunCycle = runTrackingCycle as jest.MockedFunction<typeof runTrackingCycle>;

function makeRequest(body?: object): NextRequest {
  return new NextRequest('http://localhost/api/listings/track', {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  });
}

describe('GET /api/listings/track', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserId.mockResolvedValue('test-user');
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetCurrentUserId.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockGetTrackable).not.toHaveBeenCalled();
  });

  it('scopes trackable listings to the authenticated user', async () => {
    mockGetTrackable.mockResolvedValue([]);

    await GET();

    expect(mockGetTrackable).toHaveBeenCalledWith({ userId: 'test-user' });
  });

  it('returns trackable listings with count', async () => {
    mockGetTrackable.mockResolvedValue([
      { id: '1', title: 'iPhone 14', platform: 'ebay', status: 'ACTIVE', askingPrice: 500, url: 'https://ebay.com/1' },
      { id: '2', title: 'PS5', platform: 'craigslist', status: 'ACTIVE', askingPrice: 300, url: 'https://cl.com/2' },
    ] as any);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.trackableCount).toBe(2);
    expect(data.listings).toHaveLength(2);
    expect(data.listings[0]).toEqual({
      id: '1',
      title: 'iPhone 14',
      platform: 'ebay',
      status: 'ACTIVE',
      askingPrice: 500,
    });
  });

  it('returns empty list when no trackable listings', async () => {
    mockGetTrackable.mockResolvedValue([]);

    const res = await GET();
    const data = await res.json();

    expect(data.trackableCount).toBe(0);
    expect(data.listings).toEqual([]);
  });

  it('returns 500 on error', async () => {
    mockGetTrackable.mockRejectedValue(new Error('DB error'));

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });
});

describe('POST /api/listings/track', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserId.mockResolvedValue('test-user');
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetCurrentUserId.mockResolvedValue(null);

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(401);
    expect(mockRunCycle).not.toHaveBeenCalled();
  });

  it('returns 404 when targeting a listingId that does not exist', async () => {
    mockListingFindUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ listingId: 'missing' }));
    expect(res.status).toBe(404);
    expect(mockRunCycle).not.toHaveBeenCalled();
  });

  it('returns 403 when targeting a listingId owned by another user', async () => {
    mockListingFindUnique.mockResolvedValue({ userId: 'other-user' });

    const res = await POST(makeRequest({ listingId: 'other-listing' }));
    expect(res.status).toBe(403);
    expect(mockRunCycle).not.toHaveBeenCalled();
  });

  it('runs tracking cycle when the caller owns the targeted listingId', async () => {
    mockListingFindUnique.mockResolvedValue({ userId: 'test-user' });
    const cycleResult = { checked: 1, updated: 0, sold: 0, errors: 0 };
    mockRunCycle.mockResolvedValue(cycleResult as any);

    const res = await POST(makeRequest({ listingId: 'my-listing' }));
    expect(res.status).toBe(200);
    expect(mockRunCycle).toHaveBeenCalled();
  });

  it('runs tracking cycle and returns result', async () => {
    const cycleResult = { checked: 3, updated: 1, sold: 1, errors: 0 };
    mockRunCycle.mockResolvedValue(cycleResult as any);

    const req = makeRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(cycleResult);
    expect(mockRunCycle).toHaveBeenCalledWith(expect.any(Function));
  });

  it('handles dryRun mode', async () => {
    mockGetTrackable.mockResolvedValue([
      { id: '1', title: 'iPhone 14', url: 'https://ebay.com/1', platform: 'ebay', status: 'ACTIVE', askingPrice: 500 },
    ] as any);

    const req = makeRequest({ dryRun: true });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.dryRun).toBe(true);
    expect(data.wouldCheck).toBe(1);
    expect(data.listings[0]).toEqual({
      id: '1',
      title: 'iPhone 14',
      url: 'https://ebay.com/1',
      platform: 'ebay',
    });
  });

  it('handles request with no body gracefully', async () => {
    const cycleResult = { checked: 0, updated: 0, sold: 0, errors: 0 };
    mockRunCycle.mockResolvedValue(cycleResult as any);

    // Request with no body - json() will fail, caught by .catch(() => ({}))
    const req = new NextRequest('http://localhost/api/listings/track', { method: 'POST' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockRunCycle).toHaveBeenCalled();
  });

  it('returns 500 on tracking cycle error', async () => {
    mockRunCycle.mockRejectedValue(new Error('Scraper failed'));

    const req = makeRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('dryRun returns 500 when getTrackableListings fails', async () => {
    mockGetTrackable.mockRejectedValue(new Error('DB down'));

    const req = makeRequest({ dryRun: true });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('passes a fetcher callback that logs and returns null (placeholder)', async () => {
    // Make runTrackingCycle actually invoke the fetcher callback to cover lines 48-49
    const cycleResult = { checked: 1, updated: 0, sold: 0, errors: 0 };
    mockRunCycle.mockImplementation(async (fetcher: (url: string) => Promise<null>) => {
      // Invoke the placeholder fetcher callback with a URL
      const result = await fetcher('https://ebay.com/item/123');
      expect(result).toBeNull();
      return cycleResult as any;
    });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const req = makeRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(cycleResult);
    // Verify the placeholder fetcher logged the URL
    expect(consoleSpy).toHaveBeenCalledWith('Would fetch: https://ebay.com/item/123');

    consoleSpy.mockRestore();
  });
});
