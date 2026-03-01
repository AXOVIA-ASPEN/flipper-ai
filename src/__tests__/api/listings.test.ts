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

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    listing: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));

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

    it('should return listings for authenticated user', async () => {
      const mockListings = [
        { id: '1', title: 'Test Item 1', askingPrice: 100, userId: 'test-user-id' },
        { id: '2', title: 'Test Item 2', askingPrice: 200, userId: 'test-user-id' },
      ];
      mockFindMany.mockResolvedValue(mockListings);

      const request = createMockRequest('GET', '/api/listings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.count).toBe(2);
      expect(data.listings).toEqual(mockListings);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id' },
          orderBy: { scrapedAt: 'desc' },
        })
      );
    });

    it('should filter by platform query param', async () => {
      mockFindMany.mockResolvedValue([]);

      const request = createMockRequest('GET', '/api/listings?platform=CRAIGSLIST');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.count).toBe(0);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id', platform: 'CRAIGSLIST' },
        })
      );
    });

    it('should filter by min_score query param', async () => {
      mockFindMany.mockResolvedValue([]);

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

    it('should combine platform and min_score filters', async () => {
      mockFindMany.mockResolvedValue([]);

      const request = createMockRequest('GET', '/api/listings?platform=EBAY&min_score=50');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'test-user-id',
            platform: 'EBAY',
            valueScore: { gte: 50 },
          },
        })
      );
    });

    it('should return 500 on database error', async () => {
      mockFindMany.mockRejectedValue(new Error('Database connection failed'));

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

    it('should return a listing by ID', async () => {
      mockFindUnique.mockResolvedValue(mockListing);

      const request = createMockRequest('GET', '/api/listings/listing-123');
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: 'listing-123' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.listing).toEqual(mockListing);
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'listing-123' } });
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
});
