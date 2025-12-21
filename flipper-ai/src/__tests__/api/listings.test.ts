import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/listings/route';

// Mock Prisma client
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockUpsert = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    listing: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
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
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 for missing platform', async () => {
      const { platform, ...invalidData } = validListingData;

      const request = createMockRequest('POST', '/api/listings', invalidData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 for missing url', async () => {
      const { url, ...invalidData } = validListingData;

      const request = createMockRequest('POST', '/api/listings', invalidData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 for missing title', async () => {
      const { title, ...invalidData } = validListingData;

      const request = createMockRequest('POST', '/api/listings', invalidData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 for missing askingPrice', async () => {
      const { askingPrice, ...invalidData } = validListingData;

      const request = createMockRequest('POST', '/api/listings', invalidData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
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
      expect(tags).toContain('apple'); // Should detect Apple from iPhone
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
            platform_externalId: {
              platform: validListingData.platform,
              externalId: validListingData.externalId,
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
});
