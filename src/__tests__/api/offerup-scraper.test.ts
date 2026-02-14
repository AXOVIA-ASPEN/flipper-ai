import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/scraper/offerup/route';

const mockEstimateValue = jest.fn();
const mockDetectCategory = jest.fn();
const mockGeneratePurchaseMessage = jest.fn();

jest.mock('@/lib/value-estimator', () => ({
  estimateValue: (...args: unknown[]) => mockEstimateValue(...args),
  detectCategory: (...args: unknown[]) => mockDetectCategory(...args),
  generatePurchaseMessage: (...args: unknown[]) => mockGeneratePurchaseMessage(...args),
}));

const createDefaultEstimation = () => ({
  estimatedValue: 800,
  estimatedLow: 650,
  estimatedHigh: 950,
  profitPotential: 300,
  profitLow: 250,
  profitHigh: 350,
  valueScore: 82,
  discountPercent: 38,
  resaleDifficulty: "EASY",
  comparableUrls: [{ platform: "eBay", label: "eBay", url: "https://ebay.com", type: "sold" }],
  reasoning: "Test reasoning",
  notes: "Test notes",
  shippable: true,
  negotiable: true,
  tags: ["electronics", "offerup"],
});

// Mock Playwright
const mockGoto = jest.fn();
const mockWaitForSelector = jest.fn();
const mockEvaluate = jest.fn();
const mockClose = jest.fn();
const mockNewPage = jest.fn();
const mockNewContext = jest.fn();
const mockRoute = jest.fn();

jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn(() => ({
      newContext: mockNewContext,
      close: mockClose,
    })),
  },
}));

// Mock Prisma client
const mockUpsert = jest.fn();
const mockJobCreate = jest.fn();
const mockJobUpdate = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    listing: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
    scraperJob: {
      create: (...args: unknown[]) => mockJobCreate(...args),
      update: (...args: unknown[]) => mockJobUpdate(...args),
    },
  },
}));

// Mock auth middleware
jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn(() => 'test-user-id'),
}));

jest.mock('@/lib/sleep', () => ({
  sleep: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/image-service', () => ({
  downloadAndCacheImages: jest.fn(async (urls: string[]) => ({
    cachedUrls: urls,
    successCount: urls.length,
    failedCount: 0,
  })),
  normalizeLocation: jest.fn((loc: string) => ({ normalized: loc, city: '', state: '', zip: '' })),
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

describe('OfferUp Scraper API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Playwright mocks
    mockNewPage.mockResolvedValue({
      goto: mockGoto,
      waitForSelector: mockWaitForSelector,
      evaluate: mockEvaluate,
      content: jest.fn().mockResolvedValue('<html></html>'),
    });
    mockNewContext.mockResolvedValue({
      newPage: mockNewPage,
      route: mockRoute,
    });
    mockGoto.mockResolvedValue(undefined);
    mockWaitForSelector.mockResolvedValue(undefined);
    mockRoute.mockResolvedValue(undefined);
    
    // Setup value estimator mocks
    mockDetectCategory.mockReturnValue('electronics');
    mockEstimateValue.mockReturnValue(createDefaultEstimation());
    mockGeneratePurchaseMessage.mockReturnValue('Hi, is this still available?');
    
    // Setup Prisma mocks
    mockJobCreate.mockResolvedValue({ id: 'job-123' });
    mockJobUpdate.mockResolvedValue({});
    mockUpsert.mockResolvedValue({ id: 'listing-123' });
  });

  describe('GET /api/scraper/offerup', () => {
    it('returns scraper status and configuration', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.platform).toBe('offerup');
      expect(data.status).toBe('ready');
      expect(data.supportedCategories).toBeDefined();
      expect(data.supportedLocations).toBeDefined();
      expect(data.rateLimits).toBeDefined();
    });

    it('includes rate limit configuration', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.rateLimits.requestDelayMs).toBe(2000);
      expect(data.rateLimits.maxRetries).toBe(3);
      expect(data.rateLimits.maxListingsPerScrape).toBe(50);
    });

    it('returns supported categories', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.supportedCategories).toContain('electronics');
      expect(data.supportedCategories).toContain('furniture');
      expect(data.supportedCategories).toContain('video_gaming');
    });

    it('returns supported locations', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.supportedLocations).toContain('tampa-fl');
      expect(data.supportedLocations).toContain('los-angeles-ca');
      expect(data.supportedLocations).toContain('new-york-ny');
    });
  });

  describe('POST /api/scraper/offerup', () => {
    it('requires location parameter', async () => {
      const request = createMockRequest(
        'POST',
        '/api/scraper/offerup',
        { category: 'electronics' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Location is required');
    });

    it('creates a scraper job on start', async () => {
      mockEvaluate.mockResolvedValue([]);
      
      const request = createMockRequest(
        'POST',
        '/api/scraper/offerup',
        { location: 'tampa-fl', category: 'electronics' }
      );

      await POST(request);

      expect(mockJobCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          platform: 'OFFERUP',
          location: 'tampa-fl',
          status: 'RUNNING',
        }),
      });
    });

    it('handles empty results gracefully', async () => {
      mockEvaluate.mockResolvedValue([]);
      
      const request = createMockRequest(
        'POST',
        '/api/scraper/offerup',
        { location: 'tampa-fl', category: 'electronics' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.savedCount).toBe(0);
      expect(data.listings).toEqual([]);
    });

    it('processes and saves listings', async () => {
      mockEvaluate.mockResolvedValue([
        {
          title: 'iPhone 13 Pro',
          price: '$500',
          url: 'https://offerup.com/item/detail/123456789',
          location: 'Tampa, FL',
          imageUrl: 'https://example.com/image.jpg',
        },
      ]);
      
      const request = createMockRequest(
        'POST',
        '/api/scraper/offerup',
        { location: 'tampa-fl', category: 'electronics' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.savedCount).toBe(1);
      expect(mockUpsert).toHaveBeenCalled();
    });

    it('identifies opportunities based on value score', async () => {
      mockEstimateValue.mockReturnValue({
        ...createDefaultEstimation(),
        valueScore: 85,
      });
      
      mockEvaluate.mockResolvedValue([
        {
          title: 'PS5 Console',
          price: '$300',
          url: 'https://offerup.com/item/detail/987654321',
          location: 'Tampa, FL',
        },
      ]);
      
      const request = createMockRequest(
        'POST',
        '/api/scraper/offerup',
        { location: 'tampa-fl', category: 'video_gaming' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(data.opportunitiesFound).toBe(1);
    });

    it('skips free listings (price = 0)', async () => {
      mockEvaluate.mockResolvedValue([
        {
          title: 'Free Couch',
          price: 'Free',
          url: 'https://offerup.com/item/detail/111111111',
          location: 'Tampa, FL',
        },
      ]);
      
      const request = createMockRequest(
        'POST',
        '/api/scraper/offerup',
        { location: 'tampa-fl', category: 'furniture' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(data.savedCount).toBe(0);
    });

    it('updates job status on completion', async () => {
      mockEvaluate.mockResolvedValue([
        {
          title: 'Nintendo Switch',
          price: '$200',
          url: 'https://offerup.com/item/detail/222222222',
          location: 'Orlando, FL',
        },
      ]);
      
      const request = createMockRequest(
        'POST',
        '/api/scraper/offerup',
        { location: 'orlando-fl', category: 'video_gaming' }
      );

      await POST(request);

      expect(mockJobUpdate).toHaveBeenCalledWith({
        where: { id: 'job-123' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          listingsFound: 1,
        }),
      });
    });

    it('handles blocked/captcha requests', async () => {
      mockNewPage.mockResolvedValue({
        goto: mockGoto,
        waitForSelector: mockWaitForSelector,
        evaluate: mockEvaluate,
        content: jest.fn().mockResolvedValue('<html>captcha required</html>'),
      });
      
      const request = createMockRequest(
        'POST',
        '/api/scraper/offerup',
        { location: 'tampa-fl', category: 'electronics' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.message).toContain('blocked');
    });

    it('normalizes location format', async () => {
      mockEvaluate.mockResolvedValue([]);
      
      const request = createMockRequest(
        'POST',
        '/api/scraper/offerup',
        { location: 'Tampa FL', category: 'electronics' }
      );

      await POST(request);

      expect(mockJobCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          location: 'tampa-fl',
        }),
      });
    });

    it('supports keyword search', async () => {
      mockEvaluate.mockResolvedValue([]);
      
      const request = createMockRequest(
        'POST',
        '/api/scraper/offerup',
        { location: 'tampa-fl', keywords: 'macbook pro' }
      );

      await POST(request);

      // Verify goto was called with search parameters
      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining('q=macbook'),
        expect.any(Object)
      );
    });

    it('supports price range filtering', async () => {
      mockEvaluate.mockResolvedValue([]);
      
      const request = createMockRequest(
        'POST',
        '/api/scraper/offerup',
        { location: 'tampa-fl', minPrice: 100, maxPrice: 500 }
      );

      await POST(request);

      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringMatching(/price_min=100.*price_max=500|price_max=500.*price_min=100/),
        expect.any(Object)
      );
    });

    it('extracts listing IDs from OfferUp URLs', async () => {
      mockEvaluate.mockResolvedValue([
        {
          title: 'Test Item',
          price: '$100',
          url: 'https://offerup.com/item/detail/1234567890',
          location: 'Tampa, FL',
        },
      ]);
      
      const request = createMockRequest(
        'POST',
        '/api/scraper/offerup',
        { location: 'tampa-fl' }
      );

      await POST(request);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            platform_externalId_userId: expect.objectContaining({
              externalId: '1234567890',
            }),
          }),
        })
      );
    });

    it('updates job status on failure', async () => {
      mockGoto.mockRejectedValue(new Error('Network error'));
      
      const request = createMockRequest(
        'POST',
        '/api/scraper/offerup',
        { location: 'tampa-fl' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(mockJobUpdate).toHaveBeenCalledWith({
        where: { id: 'job-123' },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: expect.any(String),
        }),
      });
    });
  });

  describe('Price parsing', () => {
    it('parses standard dollar format', async () => {
      mockEvaluate.mockResolvedValue([
        {
          title: 'Test Item',
          price: '$1,234',
          url: 'https://offerup.com/item/detail/111',
          location: 'Tampa, FL',
        },
      ]);
      
      const request = createMockRequest(
        'POST',
        '/api/scraper/offerup',
        { location: 'tampa-fl' }
      );

      await POST(request);

      expect(mockEstimateValue).toHaveBeenCalledWith(
        expect.any(String),
        null,
        1234,
        null,
        expect.any(String)
      );
    });

    it('handles Free listings', async () => {
      mockEvaluate.mockResolvedValue([
        {
          title: 'Free Item',
          price: 'Free',
          url: 'https://offerup.com/item/detail/222',
          location: 'Tampa, FL',
        },
      ]);
      
      const request = createMockRequest(
        'POST',
        '/api/scraper/offerup',
        { location: 'tampa-fl' }
      );

      const response = await POST(request);
      const data = await response.json();

      // Free items should be skipped
      expect(data.savedCount).toBe(0);
    });
  });
});
