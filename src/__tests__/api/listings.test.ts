import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/listings/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/listings/[id]/route';

// Mock auth - only getCurrentUserId is used by the routes
const mockGetCurrentUserId = jest.fn<Promise<string | null>, []>();

jest.mock('@/lib/auth', () => ({
  getCurrentUserId: (...args: unknown[]) => mockGetCurrentUserId(...(args as [])),
}));

// Mock Prisma client
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockListingCount = jest.fn();
const mockOpportunityCount = jest.fn();
const mockOpportunityAggregate = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    listing: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
      count: (...args: unknown[]) => mockListingCount(...args),
    },
    opportunity: {
      count: (...args: unknown[]) => mockOpportunityCount(...args),
      aggregate: (...args: unknown[]) => mockOpportunityAggregate(...args),
    },
  },
}));

// Helper: default mock setup for GET /api/listings (6 queries in Promise.all)
function setupListingGetMocks(opts: {
  listings?: unknown[];
  listingCount?: number;
  filteredCount?: number;
  oppsCount?: number;
  activeFlips?: number;
  profit?: number | null;
} = {}) {
  const {
    listings = [],
    listingCount = 0,
    filteredCount,
    oppsCount = 0,
    activeFlips = 0,
    profit = null,
  } = opts;
  // Promise.all order: totalListings, opportunitiesCount, activeFlipsCount, totalProfitAgg, filteredTotal, listings
  mockListingCount
    .mockResolvedValueOnce(listingCount) // totalListings (unfiltered stats)
    .mockResolvedValueOnce(filteredCount ?? listingCount); // filteredTotal (pagination)
  mockOpportunityCount
    .mockResolvedValueOnce(oppsCount) // opportunitiesCount
    .mockResolvedValueOnce(activeFlips); // activeFlipsCount
  mockOpportunityAggregate.mockResolvedValueOnce({ _sum: { actualProfit: profit } });
  mockFindMany.mockResolvedValueOnce(listings);
}

// Helper to create mock NextRequest
function createMockRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>
): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    ...(body && {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
  });
}

describe('Listings API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserId.mockResolvedValue('test-user-id');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /api/listings
  // ──────────────────────────────────────────────────────────────────────────
  describe('GET /api/listings', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetCurrentUserId.mockResolvedValue(null);

      const request = createMockRequest('GET', '/api/listings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return listings with stats and pagination for authenticated user', async () => {
      const mockListings = [
        { id: '1', title: 'Test Item 1', askingPrice: 100, userId: 'test-user-id' },
        { id: '2', title: 'Test Item 2', askingPrice: 200, userId: 'test-user-id' },
      ];
      setupListingGetMocks({ listings: mockListings, listingCount: 2, oppsCount: 1, activeFlips: 1, profit: 50 });

      const request = createMockRequest('GET', '/api/listings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.listings).toEqual(mockListings);
      expect(data.stats).toEqual({
        totalListings: 2,
        opportunitiesFound: 1,
        activeFlips: 1,
        totalProfit: 50,
      });
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should apply default pagination (page=1, limit=20) with skip=0', async () => {
      setupListingGetMocks();

      const request = createMockRequest('GET', '/api/listings');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          orderBy: { scrapedAt: 'desc' },
        })
      );
    });

    it('should apply pagination with page=2 and limit=10', async () => {
      setupListingGetMocks({ listingCount: 25, filteredCount: 25 });

      const request = createMockRequest('GET', '/api/listings?page=2&limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 })
      );
      expect(data.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });

    it('should reject invalid limit and fall back to 20', async () => {
      setupListingGetMocks();

      const request = createMockRequest('GET', '/api/listings?limit=999');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 })
      );
    });

    it('should return totalProfit of 0 when no SOLD opportunities', async () => {
      setupListingGetMocks({ profit: null });

      const request = createMockRequest('GET', '/api/listings');
      const response = await GET(request);
      const data = await response.json();

      expect(data.stats.totalProfit).toBe(0);
    });

    it('should include images and opportunity relations in findMany', async () => {
      setupListingGetMocks();

      const request = createMockRequest('GET', '/api/listings');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            images: expect.anything(),
            opportunity: expect.objectContaining({ select: expect.anything() }),
          }),
        })
      );
    });

    it('should filter by single platform query param (wrapped in { in: [...] })', async () => {
      setupListingGetMocks();

      const request = createMockRequest('GET', '/api/listings?platform=CRAIGSLIST');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id', platform: { in: ['CRAIGSLIST'] } },
        })
      );
    });

    it('should filter by platforms multi-select query param', async () => {
      setupListingGetMocks();

      const request = createMockRequest('GET', '/api/listings?platforms=CRAIGSLIST,EBAY');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id', platform: { in: ['CRAIGSLIST', 'EBAY'] } },
        })
      );
    });

    it('should filter by min_score query param (legacy underscore name)', async () => {
      setupListingGetMocks();

      const request = createMockRequest('GET', '/api/listings?min_score=70');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id', valueScore: { gte: 70 } },
        })
      );
    });

    it('should filter by minScore camelCase query param', async () => {
      setupListingGetMocks();

      const request = createMockRequest('GET', '/api/listings?minScore=80');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id', valueScore: { gte: 80 } },
        })
      );
    });

    it('should filter by score range (min and max)', async () => {
      setupListingGetMocks();

      const request = createMockRequest('GET', '/api/listings?minScore=70&maxScore=90');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id', valueScore: { gte: 70, lte: 90 } },
        })
      );
    });

    it('should filter by profit range', async () => {
      setupListingGetMocks();

      const request = createMockRequest('GET', '/api/listings?minProfit=50');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id', profitPotential: { gte: 50 } },
        })
      );
    });

    it('should filter by categories multi-select', async () => {
      setupListingGetMocks();

      const request = createMockRequest('GET', '/api/listings?categories=electronics,tools');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id', category: { in: ['electronics', 'tools'] } },
        })
      );
    });

    it('should filter by statuses multi-select', async () => {
      setupListingGetMocks();

      const request = createMockRequest('GET', '/api/listings?statuses=NEW');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id', status: { in: ['NEW'] } },
        })
      );
    });

    it('should apply AND logic with multiple filters', async () => {
      setupListingGetMocks();

      const request = createMockRequest(
        'GET',
        '/api/listings?platforms=EBAY&minScore=80&statuses=OPPORTUNITY'
      );
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'test-user-id',
            platform: { in: ['EBAY'] },
            valueScore: { gte: 80 },
            status: { in: ['OPPORTUNITY'] },
          },
        })
      );
    });

    it('should combine platform and min_score filters (legacy)', async () => {
      setupListingGetMocks();

      const request = createMockRequest('GET', '/api/listings?platform=EBAY&min_score=50');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'test-user-id',
            platform: { in: ['EBAY'] },
            valueScore: { gte: 50 },
          },
        })
      );
    });

    it('should return no filters when no filter params given', async () => {
      setupListingGetMocks();

      const request = createMockRequest('GET', '/api/listings');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id' },
        })
      );
    });

    it('should default page to 1 when page param is NaN', async () => {
      setupListingGetMocks();

      const request = createMockRequest('GET', '/api/listings?page=abc');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(1);
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0 }));
    });

    it('should filter by maxScore only (no minScore — covers false gte branch)', async () => {
      setupListingGetMocks();

      const request = createMockRequest('GET', '/api/listings?maxScore=90');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id', valueScore: { lte: 90 } },
        })
      );
    });

    it('should filter by maxProfit only (no minProfit — covers false gte branch)', async () => {
      setupListingGetMocks();

      const request = createMockRequest('GET', '/api/listings?maxProfit=200');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id', profitPotential: { lte: 200 } },
        })
      );
    });

    it('should filter by single category param (not categories)', async () => {
      setupListingGetMocks();

      const request = createMockRequest('GET', '/api/listings?category=electronics');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id', category: { in: ['electronics'] } },
        })
      );
    });

    it('should filter by single status param (not statuses)', async () => {
      setupListingGetMocks();

      const request = createMockRequest('GET', '/api/listings?status=OPPORTUNITY');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id', status: { in: ['OPPORTUNITY'] } },
        })
      );
    });

    it('should return 500 on database error', async () => {
      mockListingCount.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest('GET', '/api/listings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /api/listings
  // ──────────────────────────────────────────────────────────────────────────
  describe('POST /api/listings', () => {
    const validListingData = {
      platform: 'CRAIGSLIST',
      url: 'https://craigslist.org/item/123',
      title: 'iPhone 12 Pro',
      description: 'Excellent condition',
      askingPrice: 500,
      condition: 'excellent',
      location: 'San Francisco, CA',
      sellerName: 'John Doe',
      sellerContact: 'john@example.com',
      imageUrls: ['https://example.com/img1.jpg'],
      category: 'electronics',
    };

    it('should return 401 when not authenticated', async () => {
      mockGetCurrentUserId.mockResolvedValue(null);

      const request = createMockRequest('POST', '/api/listings', validListingData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should create a listing successfully', async () => {
      const createdListing = { id: 'new-listing-1', ...validListingData, userId: 'test-user-id' };
      mockCreate.mockResolvedValue(createdListing);

      const request = createMockRequest('POST', '/api/listings', validListingData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Listing created successfully');
      expect(data.listing).toEqual(createdListing);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'test-user-id',
            platform: 'CRAIGSLIST',
            url: 'https://craigslist.org/item/123',
            title: 'iPhone 12 Pro',
            askingPrice: 500,
          }),
        })
      );
    });

    it('should return 422 when platform is missing', async () => {
      const { platform, ...invalidData } = validListingData;

      const request = createMockRequest('POST', '/api/listings', invalidData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 422 when url is missing', async () => {
      const { url, ...invalidData } = validListingData;

      const request = createMockRequest('POST', '/api/listings', invalidData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 422 when title is missing', async () => {
      const { title, ...invalidData } = validListingData;

      const request = createMockRequest('POST', '/api/listings', invalidData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 422 when askingPrice is missing', async () => {
      const { askingPrice, ...invalidData } = validListingData;

      const request = createMockRequest('POST', '/api/listings', invalidData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should allow askingPrice of 0 (falsy but defined)', async () => {
      const dataWithZeroPrice = { ...validListingData, askingPrice: 0 };
      mockCreate.mockResolvedValue({ id: 'listing-zero', ...dataWithZeroPrice });

      const request = createMockRequest('POST', '/api/listings', dataWithZeroPrice);
      const response = await POST(request);

      // askingPrice === 0 means `body.askingPrice === undefined` is false, so validation passes
      // However, !body.askingPrice would be true for 0. Let's check what the route actually does:
      // The check is `body.askingPrice === undefined`, so 0 should pass.
      // Actually looking again: the check is `body.askingPrice === undefined`
      // Wait, the route uses: `!body.platform || !body.url || !body.title || body.askingPrice === undefined`
      // So askingPrice: 0 passes because 0 !== undefined
      expect(response.status).toBe(200);
    });

    it('should store imageUrls as JSON string when provided', async () => {
      mockCreate.mockResolvedValue({ id: 'listing-img', ...validListingData });

      const request = createMockRequest('POST', '/api/listings', validListingData);
      await POST(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            imageUrls: JSON.stringify(validListingData.imageUrls),
          }),
        })
      );
    });

    it('should set imageUrls to undefined when not provided', async () => {
      const { imageUrls, ...dataWithoutImages } = validListingData;
      mockCreate.mockResolvedValue({ id: 'listing-no-img', ...dataWithoutImages });

      const request = createMockRequest('POST', '/api/listings', dataWithoutImages);
      await POST(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            imageUrls: undefined,
          }),
        })
      );
    });

    it('should derive externalId from url when not provided', async () => {
      const { imageUrls, ...dataNoExtId } = validListingData;
      mockCreate.mockResolvedValue({ id: 'listing-derived', ...dataNoExtId });

      const request = createMockRequest('POST', '/api/listings', dataNoExtId);
      await POST(request);

      // externalId should be derived from url: url.split('/').pop() => '123'
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            externalId: '123',
          }),
        })
      );
    });

    it('should fall back to empty string externalId when url ends with slash', async () => {
      const dataTrailingSlash = { ...validListingData, url: 'https://craigslist.org/item/' };
      mockCreate.mockResolvedValue({ id: 'listing-slash', ...dataTrailingSlash });

      const request = createMockRequest('POST', '/api/listings', dataTrailingSlash);
      await POST(request);

      // url.split('/').pop() returns '' for trailing slash, so falls to ''
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            externalId: '',
          }),
        })
      );
    });

    it('should use provided externalId when given', async () => {
      const dataWithExtId = { ...validListingData, externalId: 'custom-ext-id' };
      mockCreate.mockResolvedValue({ id: 'listing-ext', ...dataWithExtId });

      const request = createMockRequest('POST', '/api/listings', dataWithExtId);
      await POST(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            externalId: 'custom-ext-id',
          }),
        })
      );
    });

    it('should return 500 on database error', async () => {
      mockCreate.mockRejectedValue(new Error('Database write failed'));

      const request = createMockRequest('POST', '/api/listings', validListingData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /api/listings/[id]
  // ──────────────────────────────────────────────────────────────────────────
  describe('GET /api/listings/[id]', () => {
    const mockListing = {
      id: 'listing-123',
      userId: 'test-user-id',
      platform: 'CRAIGSLIST',
      url: 'https://craigslist.org/item/123',
      title: 'Test iPhone',
      askingPrice: 500,
    };

    it('should return 401 when not authenticated', async () => {
      mockGetCurrentUserId.mockResolvedValue(null);

      const request = createMockRequest('GET', '/api/listings/listing-123');
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: 'listing-123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return a listing by ID with images and opportunity', async () => {
      mockFindUnique.mockResolvedValue(mockListing);

      const request = createMockRequest('GET', '/api/listings/listing-123');
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: 'listing-123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.listing).toEqual(mockListing);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 'listing-123' },
        include: { images: true, opportunity: true },
      });
    });

    it('should return 404 when listing not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const request = createMockRequest('GET', '/api/listings/nonexistent');
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: 'nonexistent' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 when listing belongs to another user', async () => {
      const otherUserListing = { ...mockListing, userId: 'other-user-id' };
      mockFindUnique.mockResolvedValue(otherUserListing);

      const request = createMockRequest('GET', '/api/listings/listing-123');
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: 'listing-123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('should return 500 on database error', async () => {
      mockFindUnique.mockRejectedValue(new Error('Database read failed'));

      const request = createMockRequest('GET', '/api/listings/listing-123');
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: 'listing-123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PATCH /api/listings/[id]
  // ──────────────────────────────────────────────────────────────────────────
  describe('PATCH /api/listings/[id]', () => {
    const existingListing = {
      id: 'listing-123',
      userId: 'test-user-id',
      title: 'Original Title',
      askingPrice: 500,
    };

    it('should return 401 when not authenticated', async () => {
      mockGetCurrentUserId.mockResolvedValue(null);

      const request = createMockRequest('PATCH', '/api/listings/listing-123', {
        title: 'Updated Title',
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'listing-123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should update a listing successfully', async () => {
      const updatedListing = { ...existingListing, title: 'Updated Title' };
      mockFindUnique.mockResolvedValue(existingListing);
      mockUpdate.mockResolvedValue(updatedListing);

      const request = createMockRequest('PATCH', '/api/listings/listing-123', {
        title: 'Updated Title',
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'listing-123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Listing updated successfully');
      expect(data.listing).toEqual(updatedListing);
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'listing-123' } });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'listing-123' },
        data: { title: 'Updated Title' },
      });
    });

    it('should return 404 when listing not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const request = createMockRequest('PATCH', '/api/listings/nonexistent', {
        title: 'Updated',
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'nonexistent' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should return 403 when listing belongs to another user', async () => {
      const otherUserListing = { ...existingListing, userId: 'other-user-id' };
      mockFindUnique.mockResolvedValue(otherUserListing);

      const request = createMockRequest('PATCH', '/api/listings/listing-123', {
        title: 'Hacked Title',
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'listing-123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should return 500 on database error during findUnique', async () => {
      mockFindUnique.mockRejectedValue(new Error('Database read failed'));

      const request = createMockRequest('PATCH', '/api/listings/listing-123', {
        title: 'Updated',
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'listing-123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('should return 500 on database error during update', async () => {
      mockFindUnique.mockResolvedValue(existingListing);
      mockUpdate.mockRejectedValue(new Error('Database write failed'));

      const request = createMockRequest('PATCH', '/api/listings/listing-123', {
        title: 'Updated',
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'listing-123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE /api/listings/[id]
  // ──────────────────────────────────────────────────────────────────────────
  describe('DELETE /api/listings/[id]', () => {
    const existingListing = {
      id: 'listing-123',
      userId: 'test-user-id',
      title: 'Item to Delete',
    };

    it('should return 401 when not authenticated', async () => {
      mockGetCurrentUserId.mockResolvedValue(null);

      const request = createMockRequest('DELETE', '/api/listings/listing-123');
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'listing-123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should delete a listing successfully', async () => {
      mockFindUnique.mockResolvedValue(existingListing);
      mockDelete.mockResolvedValue(existingListing);

      const request = createMockRequest('DELETE', '/api/listings/listing-123');
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'listing-123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Listing deleted successfully');
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'listing-123' } });
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'listing-123' } });
    });

    it('should return 404 when listing not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const request = createMockRequest('DELETE', '/api/listings/nonexistent');
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'nonexistent' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('should return 403 when listing belongs to another user', async () => {
      const otherUserListing = { ...existingListing, userId: 'other-user-id' };
      mockFindUnique.mockResolvedValue(otherUserListing);

      const request = createMockRequest('DELETE', '/api/listings/listing-123');
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'listing-123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('should return 500 on database error during findUnique', async () => {
      mockFindUnique.mockRejectedValue(new Error('Database read failed'));

      const request = createMockRequest('DELETE', '/api/listings/listing-123');
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'listing-123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('should return 500 on database error during delete', async () => {
      mockFindUnique.mockResolvedValue(existingListing);
      mockDelete.mockRejectedValue(new Error('Database delete failed'));

      const request = createMockRequest('DELETE', '/api/listings/listing-123');
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'listing-123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Extra branch coverage for PATCH /api/listings/[id]
  // ──────────────────────────────────────────────────────────────────────────
  describe('PATCH /api/listings/[id] - all optional fields', () => {
    it('should update all optional fields when all are provided', async () => {
      const existingListing = {
        id: 'listing-123',
        userId: 'test-user-id',
        title: 'Original Title',
        askingPrice: 500,
      };
      const body = {
        title: 'New Title',
        description: 'New description',
        location: 'San Francisco, CA',
        condition: 'Like New',
        askingPrice: 450,
        sellerName: 'Jane',
        sellerContact: 'jane@example.com',
      };
      const updatedListing = { ...existingListing, ...body };

      mockFindUnique.mockResolvedValue(existingListing);
      mockUpdate.mockResolvedValue(updatedListing);

      const request = createMockRequest('PATCH', '/api/listings/listing-123', body);
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'listing-123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'listing-123' },
        data: body,
      });
    });
  });
});
