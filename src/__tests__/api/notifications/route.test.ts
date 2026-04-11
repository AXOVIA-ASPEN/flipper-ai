import { NextRequest } from 'next/server';
import { GET } from '@/app/api/notifications/route';

// Mock auth
const mockGetCurrentUserId = jest.fn<Promise<string | null>, []>();
jest.mock('@/lib/auth', () => ({
  getCurrentUserId: (...args: unknown[]) => mockGetCurrentUserId(...(args as [])),
}));

// Mock Prisma
jest.mock('@/lib/db', () => {
  const db = {
    notificationEvent: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };
  return { __esModule: true, default: db, prisma: db };
});

import db from '@/lib/db';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb = db as any;
const mockFindMany: jest.Mock = mockDb.notificationEvent.findMany;
const mockCount: jest.Mock = mockDb.notificationEvent.count;

const makeRequest = (url: string) =>
  new NextRequest(new URL(url, 'http://localhost:3000'));

const sampleEvent = {
  id: 'evt-1',
  userId: 'user-1',
  listingId: 'lst-1',
  eventType: 'listing.sold',
  status: 'PENDING',
  payload: { eventType: 'listing.sold', listingTitle: 'iPhone', listingUrl: 'http://x', platform: 'CRAIGSLIST' },
  deduplicationKey: 'lst-1:listing.sold:2026-04-09T12:00:00.000Z',
  createdAt: new Date('2026-04-09T10:00:00.000Z'),
  processedAt: null,
  listing: { title: 'iPhone', platform: 'CRAIGSLIST', askingPrice: 500, imageUrls: null },
};

describe('GET /api/notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserId.mockResolvedValue('user-1');
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetCurrentUserId.mockResolvedValue(null);
    const res = await GET(makeRequest('http://localhost:3000/api/notifications'));
    expect(res.status).toBe(401);
  });

  it('returns paginated events with pagination metadata', async () => {
    mockFindMany.mockResolvedValueOnce([sampleEvent]);
    mockCount.mockResolvedValueOnce(1);

    const res = await GET(makeRequest('http://localhost:3000/api/notifications'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.events).toHaveLength(1);
    expect(body.data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('uses custom page and limit params', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(50);

    const res = await GET(makeRequest('http://localhost:3000/api/notifications?page=2&limit=10'));
    const body = await res.json();

    expect(body.data.pagination.page).toBe(2);
    expect(body.data.pagination.limit).toBe(10);
    expect(body.data.pagination.totalPages).toBe(5);

    const findManyCall = mockFindMany.mock.calls[0][0];
    expect(findManyCall.skip).toBe(10); // (page-1)*limit
    expect(findManyCall.take).toBe(10);
  });

  it('caps limit at 100', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    const res = await GET(makeRequest('http://localhost:3000/api/notifications?limit=999'));
    const body = await res.json();

    expect(body.data.pagination.limit).toBe(20); // falls back to default
  });

  it('filters by eventType when provided', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    await GET(makeRequest('http://localhost:3000/api/notifications?eventType=listing.sold'));

    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.eventType).toBe('listing.sold');
  });

  it('filters by status when provided', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    await GET(makeRequest('http://localhost:3000/api/notifications?status=PROCESSED'));

    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.status).toBe('PROCESSED');
  });

  it('does not include eventType filter when not provided', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    await GET(makeRequest('http://localhost:3000/api/notifications'));

    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.eventType).toBeUndefined();
    expect(where.status).toBeUndefined();
  });

  it('sorts events by createdAt DESC', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    await GET(makeRequest('http://localhost:3000/api/notifications'));

    const orderBy = mockFindMany.mock.calls[0][0].orderBy;
    expect(orderBy).toEqual({ createdAt: 'desc' });
  });

  it('scopes query to the authenticated user', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    await GET(makeRequest('http://localhost:3000/api/notifications'));

    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.userId).toBe('user-1');
  });

  it('defaults page to 1 when invalid page param supplied', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    const res = await GET(makeRequest('http://localhost:3000/api/notifications?page=abc'));
    const body = await res.json();
    expect(body.data.pagination.page).toBe(1);
  });
});
