import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/posting-queue/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/posting-queue/[id]/route';
import { POST as RETRY } from '@/app/api/posting-queue/[id]/retry/route';

// Mock auth
jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn(() => Promise.resolve('test-user-id')),
}));

jest.mock('@/lib/auth', () => ({
  getCurrentUser: jest.fn(() => Promise.resolve({ id: 'test-user-id', email: 'test@test.com', name: 'Test User', firebaseUid: 'fb-uid', image: null })),
  getCurrentUserId: jest.fn(() => Promise.resolve('test-user-id')),
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
    user: {
      findUnique: jest.fn(),
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
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: PRO tier user (ebayCrossListing allowed)
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ subscriptionTier: 'PRO' });
  });

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

    expect(res.status).toBe(422);
  });

  it('returns 401 when unauthenticated', async () => {
    const { getAuthUserId } = require('@/lib/auth-middleware');
    getAuthUserId.mockResolvedValueOnce(null);

    const res = await POST(
      makeRequest('http://localhost:3000/api/posting-queue', {
        method: 'POST',
        body: JSON.stringify({ listingId: 'lst-1', targetPlatform: 'EBAY' }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid single body', async () => {
    const res = await POST(
      makeRequest('http://localhost:3000/api/posting-queue', {
        method: 'POST',
        body: JSON.stringify({ targetPlatform: 'EBAY' }), // missing listingId
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid batch body', async () => {
    const res = await POST(
      makeRequest('http://localhost:3000/api/posting-queue', {
        method: 'POST',
        body: JSON.stringify({ platforms: ['EBAY'] }), // missing listingId
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent listing in batch', async () => {
    mockPrisma.listing.findFirst.mockResolvedValue(null);

    const res = await POST(
      makeRequest('http://localhost:3000/api/posting-queue', {
        method: 'POST',
        body: JSON.stringify({ listingId: 'nope', platforms: ['EBAY'] }),
      })
    );
    expect(res.status).toBe(404);
  });

  it('returns 422 when batch platforms all match source', async () => {
    const listing = { id: 'lst-1', platform: 'EBAY', userId: 'test-user-id' };
    mockPrisma.listing.findFirst.mockResolvedValue(listing);

    const res = await POST(
      makeRequest('http://localhost:3000/api/posting-queue', {
        method: 'POST',
        body: JSON.stringify({ listingId: 'lst-1', platforms: ['EBAY'] }),
      })
    );
    expect(res.status).toBe(422);
  });

  it('returns 500 on internal error', async () => {
    mockPrisma.listing.findFirst.mockRejectedValue(new Error('DB down'));

    const res = await POST(
      makeRequest('http://localhost:3000/api/posting-queue', {
        method: 'POST',
        body: JSON.stringify({ listingId: 'lst-1', targetPlatform: 'EBAY' }),
      })
    );
    expect(res.status).toBe(500);
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

  // Story 9.4: the GET route must include ListingImage[] in the listing select
  // AND must expose a computed imageStatus field per queue item.
  it('eager-loads sorted listing.images in the listing select (Story 9.4)', async () => {
    mockPrisma.postingQueueItem.findMany.mockResolvedValue([]);
    mockPrisma.postingQueueItem.count.mockResolvedValue(0);

    await GET(makeRequest('http://localhost:3000/api/posting-queue'));

    expect(mockPrisma.postingQueueItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          listing: expect.objectContaining({
            select: expect.objectContaining({
              images: expect.objectContaining({
                select: expect.objectContaining({
                  id: true,
                  imageIndex: true,
                  storageUrl: true,
                  contentType: true,
                }),
                orderBy: { imageIndex: 'asc' },
              }),
            }),
          }),
        }),
      })
    );
  });

  it("computes imageStatus='available' for items whose listing has Firebase Storage images", async () => {
    mockPrisma.postingQueueItem.findMany.mockResolvedValue([
      {
        id: 'pq-1',
        listing: {
          id: 'lst-1',
          images: [{ id: 'img-1', imageIndex: 0, storageUrl: 'https://x', contentType: 'image/jpeg' }],
          imageUrls: null,
        },
      },
    ]);
    mockPrisma.postingQueueItem.count.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost:3000/api/posting-queue'));
    const data = await res.json();
    expect(data.items[0].imageStatus).toBe('available');
  });

  it("computes imageStatus='legacy-fallback' for items with only legacy imageUrls", async () => {
    mockPrisma.postingQueueItem.findMany.mockResolvedValue([
      {
        id: 'pq-1',
        listing: {
          id: 'lst-1',
          images: [],
          imageUrls: JSON.stringify(['https://legacy.example/a.jpg']),
        },
      },
    ]);
    mockPrisma.postingQueueItem.count.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost:3000/api/posting-queue'));
    const data = await res.json();
    expect(data.items[0].imageStatus).toBe('legacy-fallback');
  });

  it("computes imageStatus='manual-upload-required' for items with no images at all", async () => {
    mockPrisma.postingQueueItem.findMany.mockResolvedValue([
      {
        id: 'pq-1',
        listing: { id: 'lst-1', images: [], imageUrls: null },
      },
    ]);
    mockPrisma.postingQueueItem.count.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost:3000/api/posting-queue'));
    const data = await res.json();
    expect(data.items[0].imageStatus).toBe('manual-upload-required');
  });

  it('returns 401 when unauthenticated', async () => {
    const { getAuthUserId } = require('@/lib/auth-middleware');
    getAuthUserId.mockResolvedValueOnce(null);

    const res = await GET(makeRequest('http://localhost:3000/api/posting-queue'));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid query params', async () => {
    const res = await GET(makeRequest('http://localhost:3000/api/posting-queue?limit=notanumber'));
    expect(res.status).toBe(400);
  });

  it('filters by status, targetPlatform, and listingId', async () => {
    mockPrisma.postingQueueItem.findMany.mockResolvedValue([]);
    mockPrisma.postingQueueItem.count.mockResolvedValue(0);

    const res = await GET(
      makeRequest('http://localhost:3000/api/posting-queue?status=PENDING&targetPlatform=EBAY&listingId=lst-1')
    );
    expect(res.status).toBe(200);
    expect(mockPrisma.postingQueueItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PENDING',
          targetPlatform: 'EBAY',
          listingId: 'lst-1',
        }),
      })
    );
  });

  it('returns 500 on internal error', async () => {
    mockPrisma.postingQueueItem.findMany.mockRejectedValue(new Error('DB down'));

    const res = await GET(makeRequest('http://localhost:3000/api/posting-queue'));
    expect(res.status).toBe(500);
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

    expect(res.status).toBe(422);
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

// ── Auto-generation: title/description from listing data when not provided ──
describe('POST /api/posting-queue - auto-generates title/description', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ subscriptionTier: 'PRO' });
  });

  const richListing = {
    id: 'lst-rich',
    platform: 'CRAIGSLIST',
    userId: 'test-user-id',
    identifiedBrand: 'Apple',
    identifiedModel: 'iPhone 14',
    identifiedVariant: '256GB',
    identifiedCondition: 'good',
    condition: 'used',
    category: 'Electronics',
    askingPrice: 80,
    recommendedList: 120,
    verifiedMarketValue: 110,
    notes: null,
  };

  it('auto-generates title and description when not provided (single)', async () => {
    mockPrisma.listing.findFirst.mockResolvedValue(richListing);
    mockPrisma.postingQueueItem.upsert.mockImplementation(
      ({ create }: { create: Record<string, unknown> }) =>
        Promise.resolve({ id: 'pq-auto', ...create })
    );

    const res = await POST(
      makeRequest('http://localhost:3000/api/posting-queue', {
        method: 'POST',
        body: JSON.stringify({ listingId: 'lst-rich', targetPlatform: 'EBAY' }),
      })
    );

    expect(res.status).toBe(201);
    const upsertCall = (mockPrisma.postingQueueItem.upsert as jest.Mock).mock.calls[0][0];
    // Generators ran and produced non-empty title + description
    expect(typeof upsertCall.create.title).toBe('string');
    expect(upsertCall.create.title.length).toBeGreaterThan(0);
    expect(typeof upsertCall.create.description).toBe('string');
    expect(upsertCall.create.description.length).toBeGreaterThan(0);
    // The brand should appear in the algorithmic title
    expect(upsertCall.create.title.toLowerCase()).toContain('apple');
  });

  it('uses provided title and description verbatim when supplied', async () => {
    mockPrisma.listing.findFirst.mockResolvedValue(richListing);
    mockPrisma.postingQueueItem.upsert.mockImplementation(
      ({ create }: { create: Record<string, unknown> }) =>
        Promise.resolve({ id: 'pq-prov', ...create })
    );

    const res = await POST(
      makeRequest('http://localhost:3000/api/posting-queue', {
        method: 'POST',
        body: JSON.stringify({
          listingId: 'lst-rich',
          targetPlatform: 'EBAY',
          title: 'Custom Title',
          description: 'Custom Description',
        }),
      })
    );

    expect(res.status).toBe(201);
    const upsertCall = (mockPrisma.postingQueueItem.upsert as jest.Mock).mock.calls[0][0];
    expect(upsertCall.create.title).toBe('Custom Title');
    expect(upsertCall.create.description).toBe('Custom Description');
  });

  it('batch auto-generates per-platform title/description for each target', async () => {
    mockPrisma.listing.findFirst.mockResolvedValue(richListing);
    mockPrisma.postingQueueItem.upsert.mockImplementation(
      ({ create }: { create: Record<string, unknown> }) =>
        Promise.resolve({ id: `pq-${create.targetPlatform}`, ...create })
    );

    const res = await POST(
      makeRequest('http://localhost:3000/api/posting-queue', {
        method: 'POST',
        body: JSON.stringify({
          listingId: 'lst-rich',
          platforms: ['EBAY', 'MERCARI', 'OFFERUP'],
        }),
      })
    );

    expect(res.status).toBe(201);
    const calls = (mockPrisma.postingQueueItem.upsert as jest.Mock).mock.calls;
    expect(calls).toHaveLength(3);
    for (const call of calls) {
      expect(typeof call[0].create.title).toBe('string');
      expect(call[0].create.title.length).toBeGreaterThan(0);
      expect(typeof call[0].create.description).toBe('string');
      expect(call[0].create.description.length).toBeGreaterThan(0);
    }
    // The Mercari title must respect Mercari's 40-char limit
    const mercari = calls.find((c) => c[0].create.targetPlatform === 'MERCARI');
    expect(mercari![0].create.title.length).toBeLessThanOrEqual(40);
  });

  it('maps CRAIGSLIST target to generic generator without throwing', async () => {
    // A listing on EBAY can be cross-posted to CRAIGSLIST
    const ebayListing = { ...richListing, platform: 'EBAY' };
    mockPrisma.listing.findFirst.mockResolvedValue(ebayListing);
    mockPrisma.postingQueueItem.upsert.mockImplementation(
      ({ create }: { create: Record<string, unknown> }) =>
        Promise.resolve({ id: 'pq-cl', ...create })
    );

    const res = await POST(
      makeRequest('http://localhost:3000/api/posting-queue', {
        method: 'POST',
        body: JSON.stringify({ listingId: 'lst-rich', targetPlatform: 'CRAIGSLIST' }),
      })
    );

    expect(res.status).toBe(201);
    const upsertCall = (mockPrisma.postingQueueItem.upsert as jest.Mock).mock.calls[0][0];
    expect(typeof upsertCall.create.title).toBe('string');
    expect(upsertCall.create.title.length).toBeGreaterThan(0);
  });

  it('handles listing with null identification fields gracefully', async () => {
    const minimalListing = {
      ...richListing,
      identifiedBrand: null,
      identifiedModel: null,
      identifiedVariant: null,
      identifiedCondition: null,
      condition: null,
      category: null,
      notes: null,
      recommendedList: null,
      verifiedMarketValue: null,
    };
    mockPrisma.listing.findFirst.mockResolvedValue(minimalListing);
    mockPrisma.postingQueueItem.upsert.mockImplementation(
      ({ create }: { create: Record<string, unknown> }) =>
        Promise.resolve({ id: 'pq-min', ...create })
    );

    const res = await POST(
      makeRequest('http://localhost:3000/api/posting-queue', {
        method: 'POST',
        body: JSON.stringify({ listingId: 'lst-rich', targetPlatform: 'EBAY' }),
      })
    );

    expect(res.status).toBe(201);
    const upsertCall = (mockPrisma.postingQueueItem.upsert as jest.Mock).mock.calls[0][0];
    // Falls back to a generic title rather than crashing
    expect(typeof upsertCall.create.title).toBe('string');
  });

  it('FACEBOOK_MARKETPLACE single target generates a facebook-styled description with a local pickup note', async () => {
    // Regression guard for the H2 fix: the schema enum FACEBOOK_MARKETPLACE
    // must be mapped to the generator's "facebook" key so the description
    // path produces "Local pickup available..." rather than the generic
    // "Ships quickly with tracking" fallback.
    const ebayListing = { ...richListing, platform: 'EBAY' };
    mockPrisma.listing.findFirst.mockResolvedValue(ebayListing);
    mockPrisma.postingQueueItem.upsert.mockImplementation(
      ({ create }: { create: Record<string, unknown> }) =>
        Promise.resolve({ id: 'pq-fb', ...create })
    );

    const res = await POST(
      makeRequest('http://localhost:3000/api/posting-queue', {
        method: 'POST',
        body: JSON.stringify({
          listingId: 'lst-rich',
          targetPlatform: 'FACEBOOK_MARKETPLACE',
        }),
      })
    );

    expect(res.status).toBe(201);
    const upsertCall = (mockPrisma.postingQueueItem.upsert as jest.Mock).mock.calls[0][0];
    expect(upsertCall.create.description.toLowerCase()).toContain('local pickup');
    // And the title respects Facebook's 99-char limit, not the default 80.
    expect(upsertCall.create.title.length).toBeLessThanOrEqual(99);
  });

  it('FACEBOOK_MARKETPLACE in batch mode also maps to the facebook generator', async () => {
    const ebayListing = { ...richListing, platform: 'EBAY' };
    mockPrisma.listing.findFirst.mockResolvedValue(ebayListing);
    mockPrisma.postingQueueItem.upsert.mockImplementation(
      ({ create }: { create: Record<string, unknown> }) =>
        Promise.resolve({ id: `pq-${create.targetPlatform}`, ...create })
    );

    const res = await POST(
      makeRequest('http://localhost:3000/api/posting-queue', {
        method: 'POST',
        body: JSON.stringify({
          listingId: 'lst-rich',
          platforms: ['FACEBOOK_MARKETPLACE', 'MERCARI'],
        }),
      })
    );

    expect(res.status).toBe(201);
    const calls = (mockPrisma.postingQueueItem.upsert as jest.Mock).mock.calls;
    const fb = calls.find((c) => c[0].create.targetPlatform === 'FACEBOOK_MARKETPLACE');
    expect(fb).toBeDefined();
    expect(fb![0].create.description.toLowerCase()).toContain('local pickup');
  });
});

// ── Branch coverage: scheduledAt non-null path (??  operator) ────────────────
describe('POST /api/posting-queue - scheduledAt branch coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ subscriptionTier: 'PRO' });
  });

  it('creates a single queue item with scheduledAt set (covers ?? non-null branch)', async () => {
    const listing = { id: 'lst-sched', platform: 'CRAIGSLIST', userId: 'test-user-id' };
    const scheduledAt = '2026-03-01T10:00:00.000Z';

    mockPrisma.listing.findFirst.mockResolvedValue(listing);
    mockPrisma.postingQueueItem.upsert.mockResolvedValue({
      id: 'pq-sched',
      listingId: 'lst-sched',
      targetPlatform: 'EBAY',
      status: 'PENDING',
      scheduledAt: new Date(scheduledAt),
    });

    const res = await POST(
      makeRequest('http://localhost:3000/api/posting-queue', {
        method: 'POST',
        body: JSON.stringify({
          listingId: 'lst-sched',
          targetPlatform: 'EBAY',
          scheduledAt,
        }),
      })
    );

    expect(res.status).toBe(201);
    // Verify upsert was called with the scheduledAt value (not undefined)
    // The route passes scheduledAt as a string (from Zod validation) — covers the ?? non-null branch
    const upsertCall = (mockPrisma.postingQueueItem.upsert as jest.Mock).mock.calls[0][0];
    expect(upsertCall.create.scheduledAt).toBe(scheduledAt);
    expect(upsertCall.update.scheduledAt).toBe(scheduledAt);
  });
});
