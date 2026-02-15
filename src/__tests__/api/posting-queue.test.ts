import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/posting-queue/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/posting-queue/[id]/route';
import { POST as RETRY } from '@/app/api/posting-queue/[id]/retry/route';

// Mock auth
jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn(() => Promise.resolve('test-user-id')),
}));

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => Promise.resolve({ user: { id: 'test-user-id' } })),
}));

// Mock Prisma - use jest.fn() inline to avoid hoisting issues
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    postingQueueItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    listing: {
      findFirst: jest.fn(),
    },
  },
}));

// Import after mock setup (jest.mock is hoisted)
import db from '@/lib/db';
const mockPrisma = db as jest.Mocked<typeof db>;

const makeRequest = (url: string, options?: RequestInit) =>
  new NextRequest(new URL(url, 'http://localhost:3000'), options);

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe('POST /api/posting-queue', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a single queue item', async () => {
    const listing = { id: 'lst-1', platform: 'CRAIGSLIST', userId: 'test-user-id' };
    mockPrisma.listing.findFirst.mockResolvedValue(listing);
    mockPrisma.postingQueueItem.upsert.mockResolvedValue({
      id: 'pq-1',
      listingId: 'lst-1',
      targetPlatform: 'EBAY',
      status: 'PENDING',
    });

    const res = await POST(
      makeRequest('http://localhost:3000/api/posting-queue', {
        method: 'POST',
        body: JSON.stringify({ listingId: 'lst-1', targetPlatform: 'EBAY' }),
      })
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.targetPlatform).toBe('EBAY');
  });

  it('creates batch queue items for multiple platforms', async () => {
    const listing = { id: 'lst-1', platform: 'CRAIGSLIST', userId: 'test-user-id' };
    mockPrisma.listing.findFirst.mockResolvedValue(listing);
    mockPrisma.postingQueueItem.upsert.mockImplementation(({ create }: { create: Record<string, unknown> }) =>
      Promise.resolve({ id: `pq-${create.targetPlatform}`, ...create })
    );

    const res = await POST(
      makeRequest('http://localhost:3000/api/posting-queue', {
        method: 'POST',
        body: JSON.stringify({
          listingId: 'lst-1',
          platforms: ['EBAY', 'OFFERUP', 'MERCARI'],
        }),
      })
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.count).toBe(3);
  });

  it('rejects posting to same platform as source', async () => {
    const listing = { id: 'lst-1', platform: 'EBAY', userId: 'test-user-id' };
    mockPrisma.listing.findFirst.mockResolvedValue(listing);

    const res = await POST(
      makeRequest('http://localhost:3000/api/posting-queue', {
        method: 'POST',
        body: JSON.stringify({ listingId: 'lst-1', targetPlatform: 'EBAY' }),
      })
    );

    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent listing', async () => {
    mockPrisma.listing.findFirst.mockResolvedValue(null);

    const res = await POST(
      makeRequest('http://localhost:3000/api/posting-queue', {
        method: 'POST',
        body: JSON.stringify({ listingId: 'nope', targetPlatform: 'EBAY' }),
      })
    );

    expect(res.status).toBe(404);
  });
});

describe('GET /api/posting-queue', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paginated queue items', async () => {
    mockPrisma.postingQueueItem.findMany.mockResolvedValue([]);
    mockPrisma.postingQueueItem.count.mockResolvedValue(0);

    const res = await GET(makeRequest('http://localhost:3000/api/posting-queue'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total');
  });
});

describe('PATCH /api/posting-queue/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates queue item status', async () => {
    mockPrisma.postingQueueItem.findFirst.mockResolvedValue({
      id: 'pq-1',
      userId: 'test-user-id',
      status: 'PENDING',
    });
    mockPrisma.postingQueueItem.update.mockResolvedValue({
      id: 'pq-1',
      status: 'CANCELLED',
    });

    const res = await PATCH(
      makeRequest('http://localhost:3000/api/posting-queue/pq-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED' }),
      }),
      makeParams('pq-1')
    );

    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/posting-queue/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes a pending queue item', async () => {
    mockPrisma.postingQueueItem.findFirst.mockResolvedValue({
      id: 'pq-1',
      userId: 'test-user-id',
      status: 'PENDING',
    });
    mockPrisma.postingQueueItem.delete.mockResolvedValue({});

    const res = await DELETE(
      makeRequest('http://localhost:3000/api/posting-queue/pq-1', { method: 'DELETE' }),
      makeParams('pq-1')
    );

    expect(res.status).toBe(200);
  });

  it('rejects deleting in-progress items', async () => {
    mockPrisma.postingQueueItem.findFirst.mockResolvedValue({
      id: 'pq-1',
      userId: 'test-user-id',
      status: 'IN_PROGRESS',
    });

    const res = await DELETE(
      makeRequest('http://localhost:3000/api/posting-queue/pq-1', { method: 'DELETE' }),
      makeParams('pq-1')
    );

    expect(res.status).toBe(409);
  });
});

describe('POST /api/posting-queue/:id/retry', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retries a failed item', async () => {
    mockPrisma.postingQueueItem.findFirst.mockResolvedValue({
      id: 'pq-1',
      userId: 'test-user-id',
      status: 'FAILED',
      retryCount: 1,
      maxRetries: 3,
    });
    mockPrisma.postingQueueItem.update.mockResolvedValue({
      id: 'pq-1',
      status: 'PENDING',
      retryCount: 2,
    });

    const res = await RETRY(
      makeRequest('http://localhost:3000/api/posting-queue/pq-1/retry', { method: 'POST' }),
      makeParams('pq-1')
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('PENDING');
  });

  it('rejects retry on non-failed items', async () => {
    mockPrisma.postingQueueItem.findFirst.mockResolvedValue({
      id: 'pq-1',
      userId: 'test-user-id',
      status: 'PENDING',
    });

    const res = await RETRY(
      makeRequest('http://localhost:3000/api/posting-queue/pq-1/retry', { method: 'POST' }),
      makeParams('pq-1')
    );

    expect(res.status).toBe(400);
  });

  it('rejects retry when max retries exceeded', async () => {
    mockPrisma.postingQueueItem.findFirst.mockResolvedValue({
      id: 'pq-1',
      userId: 'test-user-id',
      status: 'FAILED',
      retryCount: 3,
      maxRetries: 3,
    });

    const res = await RETRY(
      makeRequest('http://localhost:3000/api/posting-queue/pq-1/retry', { method: 'POST' }),
      makeParams('pq-1')
    );

    expect(res.status).toBe(400);
  });
});
