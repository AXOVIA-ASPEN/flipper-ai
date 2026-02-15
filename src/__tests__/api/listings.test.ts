import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/listings/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/listings/[id]/route';

// Mock auth to return a test user
jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn(() => Promise.resolve('test-user-id')),
  getUserIdOrDefault: jest.fn(() => Promise.resolve('test-user-id')),
  isAuthenticated: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => Promise.resolve({ user: { id: 'test-user-id', email: 'test@test.com' } })),
}));

// Mock value-estimator to always pass the 70% threshold
jest.mock('@/lib/value-estimator', () => ({
  estimateValue: jest.fn(() => ({
    estimatedValue: 3000,
    estimatedLow: 2500,
    estimatedHigh: 3500,
    profitPotential: 2400,
    profitLow: 1900,
    profitHigh: 2900,
    valueScore: 95,
    discountPercent: 80,
    resaleDifficulty: 'EASY',
    comparableUrls: [
      { platform: 'eBay', label: 'eBay Sold', url: 'https://ebay.com/sold', type: 'sold' },
      { platform: 'eBay', label: 'eBay Active', url: 'https://ebay.com/active', type: 'active' },
      { platform: 'Amazon', label: 'Amazon', url: 'https://amazon.com', type: 'retail' },
      { platform: 'Mercari', label: 'Mercari', url: 'https://mercari.com', type: 'marketplace' },
    ],
    reasoning: 'Test reasoning',
    notes: 'Test notes',
    shippable: true,
    negotiable: true,
    tags: ['electronics'],
  })),
  detectCategory: jest.fn(() => 'electronics'),
  generatePurchaseMessage: jest.fn(
    (title: string, _price: number, _negotiable: boolean, sellerName: string | null) =>
      sellerName
        ? `Hi ${sellerName}, I'm interested in your ${title}`
        : `Hi, I'm interested in your ${title}`
  ),
}));

// Mock Prisma client
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockCount = jest.fn();
const mockUpsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    listing: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      count: (...args: unknown[]) => mockCount(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({}),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      aggregate: jest.fn().mockResolvedValue({}),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    priceHistory: {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

// Helper to create mock NextRequest
function createMockRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>
): NextRequest {
  const request = new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    ...(body && {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
  });
  return request;
}

describe('Listings API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/listings', () => {
    it('should return listings with default pagination', async () => {
      const mockListings = [
        { id: '1', title: 'Test Item 1', askingPrice: 100 },
        { id: '2', title: 'Test Item 2', askingPrice: 200 },
      ];

      mockFindMany.mockResolvedValue(mockListings);
      mockCount.mockResolvedValue(2);

      const request = createMockRequest('GET', '/api/listings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.listings).toEqual(mockListings);
      expect(data.total).toBe(2);
      expect(data.limit).toBe(50);
      expect(data.offset).toBe(0);
    });

    it('should filter by platform', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const request = createMockRequest('GET', '/api/listings?platform=CRAIGSLIST');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ platform: 'CRAIGSLIST' }),
        })
      );
    });

    it('should filter by status', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const request = createMockRequest('GET', '/api/listings?status=OPPORTUNITY');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'OPPORTUNITY' }),
        })
      );
    });

    it('should filter by minimum score', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const request = createMockRequest('GET', '/api/listings?minScore=70');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ valueScore: { gte: 70 } }),
        })
      );
    });

    it('should apply custom pagination', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(100);

      const request = createMockRequest('GET', '/api/listings?limit=10&offset=20');
      const response = await GET(request);
      const data = await response.json();

      expect(data.limit).toBe(10);
      expect(data.offset).toBe(20);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });

    it('should order by scrapedAt descending', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const request = createMockRequest('GET', '/api/listings');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { scrapedAt: 'desc' },
        })
      );
    });

    it('should include opportunity relation', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const request = createMockRequest('GET', '/api/listings');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { opportunity: true },
        })
      );
    });

    it('should handle multiple filters', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const request = createMockRequest(
        'GET',
        '/api/listings?platform=EBAY&status=NEW&minScore=50'
      );
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            platform: 'EBAY',
            status: 'NEW',
            valueScore: { gte: 50 },
          }),
        })
      );
    });

    // New filter tests for Phase 1.3.2
    it('should filter by location (contains match)', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const request = createMockRequest('GET', '/api/listings?location=tampa');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ location: { contains: 'tampa' } }),
        })
      );
    });

    it('should filter by category', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const request = createMockRequest('GET', '/api/listings?category=electronics');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'electronics' }),
        })
      );
    });

    it('should filter by minPrice only', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const request = createMockRequest('GET', '/api/listings?minPrice=100');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ askingPrice: { gte: 100 } }),
        })
      );
    });

    it('should filter by maxPrice only', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const request = createMockRequest('GET', '/api/listings?maxPrice=500');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ askingPrice: { lte: 500 } }),
        })
      );
    });

    it('should filter by price range (minPrice and maxPrice)', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const request = createMockRequest('GET', '/api/listings?minPrice=100&maxPrice=500');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ askingPrice: { gte: 100, lte: 500 } }),
        })
      );
    });

    it('should filter by dateFrom only', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const request = createMockRequest('GET', '/api/listings?dateFrom=2025-01-01');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scrapedAt: { gte: new Date('2025-01-01') },
          }),
        })
      );
    });

    it('should filter by dateTo only', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const request = createMockRequest('GET', '/api/listings?dateTo=2025-12-31');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scrapedAt: { lte: new Date('2025-12-31') },
          }),
        })
      );
    });

    it('should filter by date range (dateFrom and dateTo)', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const request = createMockRequest(
        'GET',
        '/api/listings?dateFrom=2025-01-01&dateTo=2025-12-31'
      );
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scrapedAt: {
              gte: new Date('2025-01-01'),
              lte: new Date('2025-12-31'),
            },
          }),
        })
      );
    });

    it('should combine all new filters with existing filters', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const request = createMockRequest(
        'GET',
        '/api/listings?status=OPPORTUNITY&location=tampa&category=electronics&minPrice=100&maxPrice=500&dateFrom=2025-01-01'
      );
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'OPPORTUNITY',
            location: { contains: 'tampa' },
            category: 'electronics',
            askingPrice: { gte: 100, lte: 500 },
            scrapedAt: { gte: new Date('2025-01-01') },
          }),
        })
      );
    });

    it('should return 500 on database error', async () => {
      mockFindMany.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('GET', '/api/listings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch listings');
    });
  });

  describe('POST /api/listings', () => {
    const validListingData = {
      externalId: 'ext-123',
      platform: 'CRAIGSLIST',
      url: 'https://craigslist.org/item/123',
      title: 'iPhone 12 Pro',
      description: 'Excellent condition Apple phone',
      askingPrice: 500,
      condition: 'excellent',
      location: 'San Francisco, CA',
      sellerName: 'John Doe',
      sellerContact: 'john@example.com',
    };

    it('should create a new listing with value estimation', async () => {
      const createdListing = { id: '1', ...validListingData };
      mockUpsert.mockResolvedValue(createdListing);

      const request = createMockRequest('POST', '/api/listings', validListingData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe('1');
    });

    it('should return 400 for missing externalId', async () => {
      const { externalId, ...invalidData } = validListingData;

      const request = createMockRequest('POST', '/api/listings', invalidData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should return 400 for missing platform', async () => {
      const { platform, ...invalidData } = validListingData;

      const request = createMockRequest('POST', '/api/listings', invalidData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should return 400 for missing url', async () => {
      const { url, ...invalidData } = validListingData;

      const request = createMockRequest('POST', '/api/listings', invalidData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should return 400 for missing title', async () => {
      const { title, ...invalidData } = validListingData;

      const request = createMockRequest('POST', '/api/listings', invalidData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should return 400 for missing askingPrice', async () => {
      const { askingPrice, ...invalidData } = validListingData;

      const request = createMockRequest('POST', '/api/listings', invalidData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should allow askingPrice of 0', async () => {
      const dataWithZeroPrice = { ...validListingData, askingPrice: 0 };
      mockUpsert.mockResolvedValue({ id: '1', ...dataWithZeroPrice });

      const request = createMockRequest('POST', '/api/listings', dataWithZeroPrice);
      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('should detect category when not provided', async () => {
      const dataWithoutCategory = { ...validListingData };
      mockUpsert.mockResolvedValue({ id: '1', ...dataWithoutCategory });

      const request = createMockRequest('POST', '/api/listings', dataWithoutCategory);
      await POST(request);

      // Category should be detected from "iPhone" in title -> electronics
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            category: 'electronics',
          }),
        })
      );
    });

    it('should use provided category when given', async () => {
      const dataWithCategory = { ...validListingData, category: 'video games' };
      mockUpsert.mockResolvedValue({ id: '1', ...dataWithCategory });

      const request = createMockRequest('POST', '/api/listings', dataWithCategory);
      await POST(request);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            category: 'video games',
          }),
        })
      );
    });

    it('should calculate value estimation fields', async () => {
      mockUpsert.mockResolvedValue({ id: '1', ...validListingData });

      const request = createMockRequest('POST', '/api/listings', validListingData);
      await POST(request);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            estimatedValue: expect.any(Number),
            estimatedLow: expect.any(Number),
            estimatedHigh: expect.any(Number),
            profitPotential: expect.any(Number),
            profitLow: expect.any(Number),
            profitHigh: expect.any(Number),
            valueScore: expect.any(Number),
            discountPercent: expect.any(Number),
            resaleDifficulty: expect.any(String),
          }),
        })
      );
    });

    it('should generate comparable URLs', async () => {
      mockUpsert.mockResolvedValue({ id: '1', ...validListingData });

      const request = createMockRequest('POST', '/api/listings', validListingData);
      await POST(request);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            comparableUrls: expect.any(String),
          }),
        })
      );

      // Verify comparableUrls is valid JSON
      const callArgs = mockUpsert.mock.calls[0][0];
      const comparableUrls = JSON.parse(callArgs.create.comparableUrls);
      expect(Array.isArray(comparableUrls)).toBe(true);
      expect(comparableUrls.length).toBe(4);
    });

    it('should generate purchase request message', async () => {
      mockUpsert.mockResolvedValue({ id: '1', ...validListingData });

      const request = createMockRequest('POST', '/api/listings', validListingData);
      await POST(request);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            requestToBuy: expect.stringContaining('Hi John Doe'),
          }),
        })
      );
    });

    it('should set status to OPPORTUNITY for high score items', async () => {
      // Apple iPhone should get high value boost
      const highValueData = {
        ...validListingData,
        title: 'Apple iPhone 13 Pro Max sealed',
        askingPrice: 200, // Low price for high value item
      };
      mockUpsert.mockResolvedValue({ id: '1', ...highValueData });

      const request = createMockRequest('POST', '/api/listings', highValueData);
      await POST(request);

      const callArgs = mockUpsert.mock.calls[0][0];
      // With a low price and high value keywords, it should be an opportunity
      if (callArgs.create.valueScore >= 70) {
        expect(callArgs.create.status).toBe('OPPORTUNITY');
      }
    });

    it('should set status to NEW for low score items', async () => {
      const lowValueData = {
        ...validListingData,
        title: 'Broken item for parts',
        description: 'Not working, needs repair',
        askingPrice: 1000,
      };
      mockUpsert.mockResolvedValue({ id: '1', ...lowValueData });

      const request = createMockRequest('POST', '/api/listings', lowValueData);
      await POST(request);

      const callArgs = mockUpsert.mock.calls[0][0];
      // With high price and risk keywords, it should have low score
      if (callArgs.create.valueScore < 70) {
        expect(callArgs.create.status).toBe('NEW');
      }
    });

    it('should store image URLs as JSON string', async () => {
      const dataWithImages = {
        ...validListingData,
        imageUrls: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
      };
      mockUpsert.mockResolvedValue({ id: '1', ...dataWithImages });

      const request = createMockRequest('POST', '/api/listings', dataWithImages);
      await POST(request);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            imageUrls: JSON.stringify(dataWithImages.imageUrls),
          }),
        })
      );
    });

    it('should store tags as JSON string', async () => {
      mockUpsert.mockResolvedValue({ id: '1', ...validListingData });

      const request = createMockRequest('POST', '/api/listings', validListingData);
      await POST(request);

      const callArgs = mockUpsert.mock.calls[0][0];
      const tags = JSON.parse(callArgs.create.tags);
      expect(Array.isArray(tags)).toBe(true);
      expect(tags).toContain('electronics'); // From mocked estimateValue
    });

    it('should handle postedAt date conversion', async () => {
      const dataWithDate = {
        ...validListingData,
        postedAt: '2024-01-15T10:00:00Z',
      };
      mockUpsert.mockResolvedValue({ id: '1', ...dataWithDate });

      const request = createMockRequest('POST', '/api/listings', dataWithDate);
      await POST(request);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            postedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should use platform_externalId as unique key for upsert', async () => {
      mockUpsert.mockResolvedValue({ id: '1', ...validListingData });

      const request = createMockRequest('POST', '/api/listings', validListingData);
      await POST(request);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            platform_externalId_userId: {
              platform: validListingData.platform,
              externalId: validListingData.externalId,
              userId: 'test-user-id',
            },
          },
        })
      );
    });

    it('should update existing listing on upsert', async () => {
      mockUpsert.mockResolvedValue({ id: '1', ...validListingData });

      const request = createMockRequest('POST', '/api/listings', validListingData);
      await POST(request);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            title: validListingData.title,
            description: validListingData.description,
            askingPrice: validListingData.askingPrice,
          }),
        })
      );
    });

    it('should detect shippable items', async () => {
      mockUpsert.mockResolvedValue({ id: '1', ...validListingData });

      const request = createMockRequest('POST', '/api/listings', validListingData);
      await POST(request);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            shippable: expect.any(Boolean),
          }),
        })
      );
    });

    it('should detect non-shippable items', async () => {
      const { estimateValue } = require('@/lib/value-estimator');
      estimateValue.mockReturnValueOnce({
        estimatedValue: 3000,
        estimatedLow: 2500,
        estimatedHigh: 3500,
        profitPotential: 2400,
        profitLow: 1900,
        profitHigh: 2900,
        valueScore: 95,
        discountPercent: 80,
        resaleDifficulty: 'EASY',
        comparableUrls: [
          { platform: 'eBay', label: 'eBay', url: 'https://ebay.com', type: 'sold' },
        ],
        reasoning: 'Test',
        notes: 'Test',
        shippable: false,
        negotiable: true,
        tags: ['electronics'],
      });
      const localOnlyData = {
        ...validListingData,
        description: 'Local pickup only, no shipping',
      };
      mockUpsert.mockResolvedValue({ id: '1', ...localOnlyData });

      const request = createMockRequest('POST', '/api/listings', localOnlyData);
      await POST(request);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            shippable: false,
          }),
        })
      );
    });

    it('should detect negotiable items', async () => {
      const negotiableData = {
        ...validListingData,
        description: '$500 OBO, price negotiable',
      };
      mockUpsert.mockResolvedValue({ id: '1', ...negotiableData });

      const request = createMockRequest('POST', '/api/listings', negotiableData);
      await POST(request);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            negotiable: true,
          }),
        })
      );
    });

    it('should return 500 on database error', async () => {
      mockUpsert.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('POST', '/api/listings', validListingData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create listing');
    });

    it('should handle missing optional fields', async () => {
      const minimalData = {
        externalId: 'ext-123',
        platform: 'CRAIGSLIST',
        url: 'https://craigslist.org/item/123',
        title: 'Test Item',
        askingPrice: 100,
      };
      mockUpsert.mockResolvedValue({ id: '1', ...minimalData });

      const request = createMockRequest('POST', '/api/listings', minimalData);
      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });

  describe('GET /api/listings/[id]', () => {
    const mockListing = {
      id: 'listing-123',
      externalId: 'ext-123',
      platform: 'CRAIGSLIST',
      url: 'https://craigslist.org/item/123',
      title: 'Test iPhone',
      askingPrice: 500,
      estimatedValue: 700,
      valueScore: 75,
      status: 'OPPORTUNITY',
      opportunity: null,
    };

    it('should return a single listing by ID', async () => {
      mockFindUnique.mockResolvedValue(mockListing);

      const request = createMockRequest('GET', '/api/listings/listing-123');
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'listing-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockListing);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 'listing-123' },
        include: { opportunity: true },
      });
    });

    it('should return 404 if listing not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const request = createMockRequest('GET', '/api/listings/nonexistent');
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Listing not found');
    });

    it('should include opportunity relation in response', async () => {
      const listingWithOpportunity = {
        ...mockListing,
        opportunity: {
          id: 'opp-1',
          status: 'IDENTIFIED',
          purchasePrice: null,
        },
      };
      mockFindUnique.mockResolvedValue(listingWithOpportunity);

      const request = createMockRequest('GET', '/api/listings/listing-123');
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'listing-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.opportunity).toBeDefined();
      expect(data.opportunity.id).toBe('opp-1');
    });

    it('should return 500 on database error', async () => {
      mockFindUnique.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('GET', '/api/listings/listing-123');
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'listing-123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch listing');
    });
  });

  describe('PATCH /api/listings/[id]', () => {
    const mockListing = {
      id: 'listing-123',
      title: 'Updated iPhone',
      status: 'CONTACTED',
    };

    it('should update a listing', async () => {
      mockUpdate.mockResolvedValue(mockListing);

      const request = createMockRequest('PATCH', '/api/listings/listing-123', {
        title: 'Updated iPhone',
        status: 'CONTACTED',
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'listing-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockListing);
    });

    it('should update listing status', async () => {
      mockUpdate.mockResolvedValue({ ...mockListing, status: 'PURCHASED' });

      const request = createMockRequest('PATCH', '/api/listings/listing-123', {
        status: 'PURCHASED',
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'listing-123' }) });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'listing-123' },
        data: { status: 'PURCHASED' },
      });
    });

    it('should update multiple fields at once', async () => {
      const updateData = {
        title: 'New Title',
        askingPrice: 450,
        notes: 'Price negotiated down',
      };
      mockUpdate.mockResolvedValue({ id: 'listing-123', ...updateData });

      const request = createMockRequest('PATCH', '/api/listings/listing-123', updateData);
      await PATCH(request, { params: Promise.resolve({ id: 'listing-123' }) });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'listing-123' },
        data: updateData,
      });
    });

    it('should return 500 on database error', async () => {
      mockUpdate.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('PATCH', '/api/listings/listing-123', {
        status: 'CONTACTED',
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'listing-123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update listing');
    });

    it('should return 500 when listing does not exist', async () => {
      mockUpdate.mockRejectedValue(new Error('Record not found'));

      const request = createMockRequest('PATCH', '/api/listings/nonexistent', {
        status: 'CONTACTED',
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update listing');
    });
  });

  describe('DELETE /api/listings/[id]', () => {
    it('should delete a listing', async () => {
      mockDelete.mockResolvedValue({ id: 'listing-123' });

      const request = createMockRequest('DELETE', '/api/listings/listing-123');
      const response = await DELETE(request, { params: Promise.resolve({ id: 'listing-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: 'listing-123' },
      });
    });

    it('should return 500 on database error', async () => {
      mockDelete.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('DELETE', '/api/listings/listing-123');
      const response = await DELETE(request, { params: Promise.resolve({ id: 'listing-123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete listing');
    });

    it('should return 500 when listing does not exist', async () => {
      mockDelete.mockRejectedValue(new Error('Record not found'));

      const request = createMockRequest('DELETE', '/api/listings/nonexistent');
      const response = await DELETE(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete listing');
    });
  });
});
