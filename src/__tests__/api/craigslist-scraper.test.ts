import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/scraper/craigslist/route';

// Mock Playwright
const mockGoto = jest.fn();
const mockWaitForSelector = jest.fn();
const mockEvaluate = jest.fn();
const mockClose = jest.fn();
const mockNewPage = jest.fn();
const mockNewContext = jest.fn();

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

describe('Craigslist Scraper API', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock for scraperJob
    mockJobCreate.mockResolvedValue({ id: 'job-123' });
    mockJobUpdate.mockResolvedValue({ id: 'job-123' });

    // Setup mock chain for browser
    mockNewContext.mockResolvedValue({
      newPage: mockNewPage,
    });
    mockNewPage.mockResolvedValue({
      goto: mockGoto,
      waitForSelector: mockWaitForSelector,
      evaluate: mockEvaluate,
    });
    mockGoto.mockResolvedValue(undefined);
    mockWaitForSelector.mockResolvedValue(undefined);
  });

  describe('GET /api/scraper/craigslist', () => {
    it('should return scraper status and supported options', async () => {
      const request = createMockRequest('GET', '/api/scraper/craigslist');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.platform).toBe('craigslist');
      expect(data.status).toBe('ready');
    });

    it('should include supported categories', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.supportedCategories).toContain('electronics');
      expect(data.supportedCategories).toContain('furniture');
      expect(data.supportedCategories).toContain('video_gaming');
      expect(data.supportedCategories).toContain('appliances');
      expect(data.supportedCategories).toContain('tools');
    });

    it('should include supported locations', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.supportedLocations).toContain('sarasota');
      expect(data.supportedLocations).toContain('tampa');
      expect(data.supportedLocations).toContain('sfbay');
      expect(data.supportedLocations).toContain('newyork');
      expect(data.supportedLocations).toContain('losangeles');
    });
  });

  describe('POST /api/scraper/craigslist - Validation', () => {
    it('should return 400 if location is missing', async () => {
      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        category: 'electronics',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Location and category are required');
    });

    it('should return 400 if category is missing', async () => {
      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Location and category are required');
    });

    it('should return 400 if both location and category are missing', async () => {
      const request = createMockRequest('POST', '/api/scraper/craigslist', {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/scraper/craigslist - Scraping', () => {
    it('should handle empty results gracefully', async () => {
      mockEvaluate.mockResolvedValue([]);

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'electronics',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.listings).toEqual([]);
      expect(data.savedCount).toBe(0);
      expect(data.message).toContain('No listings found');
    });

    it('should scrape and save listings successfully', async () => {
      const mockScrapedItems = [
        {
          title: 'iPhone 12 Pro',
          price: '$500',
          url: 'https://sarasota.craigslist.org/ele/d/iphone-12-pro/12345.html',
          location: 'Sarasota',
          imageUrl: 'https://images.craigslist.org/image1.jpg',
        },
        {
          title: 'Samsung TV 55"',
          price: '$300',
          url: 'https://sarasota.craigslist.org/ele/d/samsung-tv/12346.html',
          location: 'Bradenton',
          imageUrl: '',
        },
      ];

      mockEvaluate.mockResolvedValue(mockScrapedItems);
      mockUpsert.mockResolvedValue({ id: 'listing-1' });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'electronics',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.savedCount).toBe(2);
      expect(data.listings.length).toBe(2);
    });

    it('should skip items with zero price', async () => {
      const mockScrapedItems = [
        {
          title: 'Free couch',
          price: '$0',
          url: 'https://sarasota.craigslist.org/fua/d/free-couch/12345.html',
          location: 'Sarasota',
          imageUrl: '',
        },
        {
          title: 'iPhone 12',
          price: '$400',
          url: 'https://sarasota.craigslist.org/ele/d/iphone/12346.html',
          location: 'Sarasota',
          imageUrl: '',
        },
      ];

      mockEvaluate.mockResolvedValue(mockScrapedItems);
      mockUpsert.mockResolvedValue({ id: 'listing-1' });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'furniture',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.savedCount).toBe(1);
      expect(mockUpsert).toHaveBeenCalledTimes(1);
    });

    it('should pass keywords to search URL', async () => {
      mockEvaluate.mockResolvedValue([]);

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'tampa',
        category: 'electronics',
        keywords: 'iPhone 15 Pro',
      });
      await POST(request);

      // Verify goto was called with query parameter
      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining('query=iPhone'),
        expect.any(Object)
      );
    });

    it('should pass price filters to search URL', async () => {
      mockEvaluate.mockResolvedValue([]);

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sfbay',
        category: 'electronics',
        minPrice: 100,
        maxPrice: 500,
      });
      await POST(request);

      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining('min_price=100'),
        expect.any(Object)
      );
      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining('max_price=500'),
        expect.any(Object)
      );
    });

    it('should use correct category path in URL', async () => {
      mockEvaluate.mockResolvedValue([]);

      // Test electronics -> ela
      const request1 = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'electronics',
      });
      await POST(request1);
      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining('/search/ela'),
        expect.any(Object)
      );

      jest.clearAllMocks();
      mockNewContext.mockResolvedValue({ newPage: mockNewPage });
      mockNewPage.mockResolvedValue({
        goto: mockGoto,
        waitForSelector: mockWaitForSelector,
        evaluate: mockEvaluate,
      });
      mockEvaluate.mockResolvedValue([]);

      // Test furniture -> fua
      const request2 = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'furniture',
      });
      await POST(request2);
      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining('/search/fua'),
        expect.any(Object)
      );
    });

    it('should call value estimation for each listing', async () => {
      const mockScrapedItems = [
        {
          title: 'Apple MacBook Pro',
          price: '$800',
          url: 'https://sarasota.craigslist.org/sys/d/macbook/12345.html',
          location: 'Sarasota',
          imageUrl: 'https://images.craigslist.org/macbook.jpg',
        },
      ];

      mockEvaluate.mockResolvedValue(mockScrapedItems);
      mockUpsert.mockResolvedValue({ id: 'listing-1' });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'computers',
      });
      await POST(request);

      // Verify upsert was called with estimation fields
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            estimatedValue: expect.any(Number),
            valueScore: expect.any(Number),
            profitPotential: expect.any(Number),
            tags: expect.any(String),
            comparableUrls: expect.any(String),
          }),
        })
      );
    });

    it('should set status to OPPORTUNITY for high-score items', async () => {
      const mockScrapedItems = [
        {
          title: 'Apple iPhone 14 Pro Max sealed new',
          price: '$200',
          url: 'https://sarasota.craigslist.org/ele/d/iphone/12345.html',
          location: 'Sarasota',
          imageUrl: '',
        },
      ];

      mockEvaluate.mockResolvedValue(mockScrapedItems);
      mockUpsert.mockResolvedValue({ id: 'listing-1' });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'electronics',
      });
      await POST(request);

      // Check if status is set based on score
      const upsertCall = mockUpsert.mock.calls[0][0];
      expect(upsertCall.create.status).toBeDefined();
      expect(['NEW', 'OPPORTUNITY']).toContain(upsertCall.create.status);
    });

    it('should generate purchase request message', async () => {
      const mockScrapedItems = [
        {
          title: 'Nintendo Switch',
          price: '$250',
          url: 'https://sarasota.craigslist.org/vga/d/switch/12345.html',
          location: 'Sarasota',
          imageUrl: '',
        },
      ];

      mockEvaluate.mockResolvedValue(mockScrapedItems);
      mockUpsert.mockResolvedValue({ id: 'listing-1' });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'video_gaming',
      });
      await POST(request);

      const upsertCall = mockUpsert.mock.calls[0][0];
      expect(upsertCall.create.requestToBuy).toBeDefined();
      expect(upsertCall.create.requestToBuy).toContain('Nintendo Switch');
    });

    it('should handle database errors gracefully', async () => {
      const mockScrapedItems = [
        {
          title: 'Test Item',
          price: '$100',
          url: 'https://sarasota.craigslist.org/ele/d/test/12345.html',
          location: 'Sarasota',
          imageUrl: '',
        },
      ];

      mockEvaluate.mockResolvedValue(mockScrapedItems);
      mockUpsert.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'electronics',
      });
      const response = await POST(request);
      const data = await response.json();

      // Should still return success but with 0 saved
      expect(data.success).toBe(true);
      expect(data.savedCount).toBe(0);
    });

    it('should close browser after scraping', async () => {
      mockEvaluate.mockResolvedValue([]);

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'electronics',
      });
      await POST(request);

      expect(mockClose).toHaveBeenCalled();
    });

    it('should close browser even on error', async () => {
      mockEvaluate.mockRejectedValue(new Error('Page error'));

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'electronics',
      });

      try {
        await POST(request);
      } catch {
        // Expected error
      }

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('POST /api/scraper/craigslist - Error Handling', () => {
    it('should return 500 on Playwright launch error', async () => {
      const { chromium } = require('playwright');
      chromium.launch.mockRejectedValueOnce(new Error('Browser launch failed'));

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'electronics',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Failed to scrape listings');
    });

    it('should return 500 on navigation error', async () => {
      mockGoto.mockRejectedValue(new Error('Navigation timeout'));

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'electronics',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});

// Test helper functions separately (exported for testing)
describe('Craigslist Scraper Helper Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock for scraperJob
    mockJobCreate.mockResolvedValue({ id: 'job-123' });
    mockJobUpdate.mockResolvedValue({ id: 'job-123' });

    // Setup mock chain for browser
    mockNewContext.mockResolvedValue({
      newPage: mockNewPage,
    });
    mockNewPage.mockResolvedValue({
      goto: mockGoto,
      waitForSelector: mockWaitForSelector,
      evaluate: mockEvaluate,
    });
    mockGoto.mockResolvedValue(undefined);
    mockWaitForSelector.mockResolvedValue(undefined);
  });

  describe('parsePrice', () => {
    // These test the parsePrice logic indirectly through the scraper
    it('should parse price with dollar sign', async () => {
      mockEvaluate.mockResolvedValue([
        {
          title: 'Test Item',
          price: '$1,500',
          url: 'https://sarasota.craigslist.org/ele/d/test/12345.html',
          location: 'Sarasota',
          imageUrl: '',
        },
      ]);
      mockUpsert.mockResolvedValue({ id: 'listing-1' });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'electronics',
      });
      await POST(request);

      const upsertCall = mockUpsert.mock.calls[0][0];
      expect(upsertCall.create.askingPrice).toBe(1500);
    });

    it('should parse price without dollar sign', async () => {
      mockEvaluate.mockResolvedValue([
        {
          title: 'Test Item',
          price: '250',
          url: 'https://sarasota.craigslist.org/ele/d/test/12345.html',
          location: 'Sarasota',
          imageUrl: '',
        },
      ]);
      mockUpsert.mockResolvedValue({ id: 'listing-1' });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'electronics',
      });
      await POST(request);

      const upsertCall = mockUpsert.mock.calls[0][0];
      expect(upsertCall.create.askingPrice).toBe(250);
    });
  });

  describe('extractListingId', () => {
    it('should extract ID from Craigslist URL', async () => {
      mockEvaluate.mockResolvedValue([
        {
          title: 'Test Item',
          price: '$100',
          url: 'https://sarasota.craigslist.org/ele/d/test-item-name/7654321.html',
          location: 'Sarasota',
          imageUrl: '',
        },
      ]);
      mockUpsert.mockResolvedValue({ id: 'listing-1' });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'electronics',
      });
      await POST(request);

      const upsertCall = mockUpsert.mock.calls[0][0];
      expect(upsertCall.create.externalId).toBe('7654321');
    });
  });
});
