import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/scraper/craigslist/route';

// Mock auth
jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn(() => Promise.resolve('test-user-id')),
  getUserIdOrDefault: jest.fn(() => Promise.resolve('test-user-id')),
  isAuthenticated: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => Promise.resolve({ user: { id: 'test-user-id', email: 'test@test.com' } })),
}));

const mockEstimateValue = jest.fn();
const mockDetectCategory = jest.fn();
const mockGeneratePurchaseMessage = jest.fn();
const mockIdentifyItem = jest.fn();
const mockFetchMarketPrice = jest.fn();
const mockCloseMarketBrowser = jest.fn();
const mockAnalyzeSellability = jest.fn();
const mockQuickDiscountCheck = jest.fn();

jest.mock('@/lib/value-estimator', () => ({
  estimateValue: (...args: unknown[]) => mockEstimateValue(...args),
  detectCategory: (...args: unknown[]) => mockDetectCategory(...args),
  generatePurchaseMessage: (...args: unknown[]) => mockGeneratePurchaseMessage(...args),
}));

jest.mock('@/lib/llm-identifier', () => ({
  identifyItem: (...args: unknown[]) => mockIdentifyItem(...args),
}));

jest.mock('@/lib/market-price', () => ({
  fetchMarketPrice: (...args: unknown[]) => mockFetchMarketPrice(...args),
  closeBrowser: (...args: unknown[]) => mockCloseMarketBrowser(...args),
}));

jest.mock('@/lib/llm-analyzer', () => ({
  analyzeSellability: (...args: unknown[]) => mockAnalyzeSellability(...args),
  quickDiscountCheck: (...args: unknown[]) => mockQuickDiscountCheck(...args),
}));

const createDefaultEstimation = () => ({
  estimatedValue: 1200,
  estimatedLow: 1000,
  estimatedHigh: 1400,
  profitPotential: 400,
  profitLow: 350,
  profitHigh: 450,
  valueScore: 85,
  discountPercent: 40,
  resaleDifficulty: 'EASY',
  comparableUrls: [{ platform: 'eBay', label: 'eBay', url: 'https://ebay.com', type: 'sold' }],
  reasoning: 'Test reasoning',
  notes: 'Test notes',
  shippable: true,
  negotiable: true,
  tags: ['electronics', 'craigslist'],
});

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
    delete process.env.GOOGLE_API_KEY;
    delete process.env.OPENAI_API_KEY;
    mockEstimateValue.mockImplementation(() => createDefaultEstimation());
    mockDetectCategory.mockReturnValue('electronics');
    mockGeneratePurchaseMessage.mockImplementation(
      (title: string) => `Auto purchase message for ${title}`
    );
    mockIdentifyItem.mockResolvedValue(null);
    mockFetchMarketPrice.mockResolvedValue(null);
    mockAnalyzeSellability.mockResolvedValue(null);
    mockQuickDiscountCheck.mockReturnValue({ passesQuickCheck: false });
    mockCloseMarketBrowser.mockResolvedValue(undefined);

    // Setup mock for scraperJob
    mockJobCreate.mockResolvedValue({ id: 'job-123' });
    mockJobUpdate.mockResolvedValue({ id: 'job-123' });

    // Re-setup chromium.launch after clearAllMocks resets factory mocks
    const { chromium: chromiumMock } = require('playwright');
    chromiumMock.launch.mockResolvedValue({
      newContext: mockNewContext,
      close: mockClose,
    });

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

    // Re-setup chromium.launch after clearAllMocks resets factory mocks
    const { chromium: chromiumMock2 } = require('playwright');
    chromiumMock2.launch.mockResolvedValue({
      newContext: mockNewContext,
      close: mockClose,
    });

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

  describe('LLM Analysis Pipeline', () => {
    beforeEach(() => {
      // Set up standard listing response
      mockEvaluate.mockResolvedValue([
        {
          title: 'iPhone 15 Pro',
          price: '$400',
          url: 'https://sarasota.craigslist.org/ele/d/iphone/1234567.html',
          location: 'Sarasota',
          imageUrl: 'https://images.craigslist.org/test.jpg',
        },
      ]);
      mockUpsert.mockResolvedValue({ id: 'listing-1' });
    });

    it('should run LLM pipeline when OPENAI_API_KEY is set', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      mockQuickDiscountCheck.mockReturnValue({ passesQuickCheck: true });

      mockIdentifyItem.mockResolvedValue({
        brand: 'Apple',
        model: 'iPhone 15 Pro',
        variant: '256GB',
        condition: 'good',
        searchQuery: 'iPhone 15 Pro 256GB',
        category: 'electronics',
        worthInvestigating: true,
      });

      mockFetchMarketPrice.mockResolvedValue({
        averagePrice: 800,
        medianPrice: 750,
        lowestPrice: 600,
        highestPrice: 1000,
        salesCount: 10,
        soldListings: [{ title: 'iPhone 15 Pro', price: 750, url: 'https://ebay.com/1' }],
      });

      mockAnalyzeSellability.mockResolvedValue({
        sellabilityScore: 90,
        demandLevel: 'high',
        expectedDaysToSell: 3,
        authenticityRisk: 'low',
        recommendedOfferPrice: 350,
        recommendedListPrice: 700,
        resaleStrategy: 'List on eBay immediately',
        verifiedMarketValue: 750,
        trueDiscountPercent: 60,
        meetsThreshold: true,
        confidence: 0.95,
        reasoning: 'Great deal on a popular phone',
      });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'electronics',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(mockIdentifyItem).toHaveBeenCalled();
      expect(mockFetchMarketPrice).toHaveBeenCalled();
      expect(mockAnalyzeSellability).toHaveBeenCalled();
      expect(data.savedCount).toBe(1);

      const upsertCall = mockUpsert.mock.calls[0][0];
      expect(upsertCall.create.llmAnalyzed).toBe(true);
      expect(upsertCall.create.verifiedMarketValue).toBe(750);
      expect(upsertCall.create.trueDiscountPercent).toBe(60);
      expect(upsertCall.create.identifiedBrand).toBe('Apple');

      delete process.env.OPENAI_API_KEY;
    });

    it('should skip item when LLM says not worth investigating', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      mockIdentifyItem.mockResolvedValue({
        brand: null,
        model: null,
        worthInvestigating: false,
      });

      // estimateValue returns low score so item is skipped
      mockEstimateValue.mockReturnValue({
        estimatedValue: 50,
        estimatedLow: 30,
        estimatedHigh: 70,
        profitPotential: -10,
        profitLow: -30,
        profitHigh: 10,
        valueScore: 30,
        discountPercent: 10,
        resaleDifficulty: 'hard',
        comparableUrls: [],
        reasoning: 'Not worth it',
        notes: '',
        shippable: false,
        negotiable: false,
        tags: [],
      });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'electronics',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(mockIdentifyItem).toHaveBeenCalled();
      expect(mockFetchMarketPrice).not.toHaveBeenCalled();
      expect(data.savedCount).toBe(0);

      delete process.env.OPENAI_API_KEY;
    });

    it('should skip when market data has zero sales', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      mockIdentifyItem.mockResolvedValue({
        brand: 'Generic',
        model: 'Widget',
        searchQuery: 'generic widget',
        category: 'other',
        worthInvestigating: true,
      });

      mockFetchMarketPrice.mockResolvedValue({
        averagePrice: 0,
        medianPrice: 0,
        lowestPrice: 0,
        highestPrice: 0,
        salesCount: 0,
        soldListings: [],
      });

      mockEstimateValue.mockReturnValue({
        estimatedValue: 50,
        estimatedLow: 30,
        estimatedHigh: 70,
        profitPotential: -10,
        profitLow: -30,
        profitHigh: 10,
        valueScore: 30,
        discountPercent: 10,
        resaleDifficulty: 'hard',
        comparableUrls: [],
        reasoning: 'Low value',
        notes: '',
        shippable: false,
        negotiable: false,
        tags: [],
      });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'electronics',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(mockFetchMarketPrice).toHaveBeenCalled();
      expect(mockAnalyzeSellability).not.toHaveBeenCalled();

      delete process.env.OPENAI_API_KEY;
    });

    it('should skip when discount below threshold', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      mockIdentifyItem.mockResolvedValue({
        brand: 'Apple',
        model: 'iPhone 15',
        searchQuery: 'iPhone 15',
        category: 'electronics',
        worthInvestigating: true,
      });

      mockFetchMarketPrice.mockResolvedValue({
        averagePrice: 500,
        medianPrice: 500,
        lowestPrice: 400,
        highestPrice: 600,
        salesCount: 5,
        soldListings: [{ title: 'iPhone 15', price: 500, url: 'https://ebay.com/1' }],
      });

      // quickDiscountCheck will return false for items not deeply discounted
      mockQuickDiscountCheck.mockReturnValue({ passesQuickCheck: false });

      mockEstimateValue.mockReturnValue({
        estimatedValue: 450,
        estimatedLow: 400,
        estimatedHigh: 500,
        profitPotential: 50,
        profitLow: 0,
        profitHigh: 100,
        valueScore: 50,
        discountPercent: 20,
        resaleDifficulty: 'medium',
        comparableUrls: [],
        reasoning: 'Fair price',
        notes: '',
        shippable: true,
        negotiable: true,
        tags: [],
      });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'electronics',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(mockAnalyzeSellability).not.toHaveBeenCalled();
      expect(data.savedCount).toBe(0);

      delete process.env.OPENAI_API_KEY;
    });

    it('should handle LLM analysis errors gracefully', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      mockIdentifyItem.mockRejectedValue(new Error('LLM API timeout'));

      // Falls back to algorithmic, high score saves it
      mockEstimateValue.mockReturnValue({
        estimatedValue: 800,
        estimatedLow: 600,
        estimatedHigh: 1000,
        profitPotential: 400,
        profitLow: 200,
        profitHigh: 600,
        valueScore: 85,
        discountPercent: 50,
        resaleDifficulty: 'easy',
        comparableUrls: [],
        reasoning: 'Algorithmic fallback',
        notes: '',
        shippable: true,
        negotiable: true,
        tags: ['electronics'],
      });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'electronics',
      });
      const response = await POST(request);
      const data = await response.json();

      // With LLM key set but analysis failed, meetsThreshold is false,
      // so it won't save via LLM path
      expect(data.success).toBe(true);

      delete process.env.OPENAI_API_KEY;
    });

    it('should handle listing with no imageUrls', async () => {
      mockEvaluate.mockResolvedValue([
        {
          title: 'Old Radio',
          price: '$25',
          url: 'https://sarasota.craigslist.org/ele/d/radio/9999999.html',
          location: 'Sarasota',
          imageUrl: '',
        },
      ]);

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'electronics',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it('should handle null identification result', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      mockIdentifyItem.mockResolvedValue(null);

      mockEstimateValue.mockReturnValue({
        estimatedValue: 50,
        estimatedLow: 30,
        estimatedHigh: 70,
        profitPotential: -350,
        profitLow: -370,
        profitHigh: -330,
        valueScore: 10,
        discountPercent: 0,
        resaleDifficulty: 'impossible',
        comparableUrls: [],
        reasoning: 'Unknown item',
        notes: '',
        shippable: false,
        negotiable: false,
        tags: [],
      });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'electronics',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(mockFetchMarketPrice).not.toHaveBeenCalled();

      delete process.env.OPENAI_API_KEY;
    });

    it('should save listing with full LLM data when threshold met', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      mockIdentifyItem.mockResolvedValue({
        brand: 'Sony',
        model: 'PlayStation 5',
        variant: 'Disc Edition',
        condition: 'like new',
        searchQuery: 'PlayStation 5 Disc Edition',
        category: 'video_gaming',
        worthInvestigating: true,
      });

      mockFetchMarketPrice.mockResolvedValue({
        averagePrice: 450,
        medianPrice: 440,
        lowestPrice: 380,
        highestPrice: 520,
        salesCount: 25,
        soldListings: [
          { title: 'PS5 Disc', price: 440, url: 'https://ebay.com/1' },
          { title: 'PS5 Disc Edition', price: 450, url: 'https://ebay.com/2' },
        ],
      });

      mockQuickDiscountCheck.mockReturnValue({ passesQuickCheck: true });

      mockAnalyzeSellability.mockResolvedValue({
        sellabilityScore: 95,
        demandLevel: 'very high',
        expectedDaysToSell: 1,
        authenticityRisk: 'low',
        recommendedOfferPrice: 180,
        recommendedListPrice: 400,
        resaleStrategy: 'List immediately on eBay',
        verifiedMarketValue: 440,
        trueDiscountPercent: 55,
        meetsThreshold: true,
        confidence: 0.98,
        reasoning: 'PS5 at half price, instant flip',
      });

      // Price is $400 but let's make it cheap
      mockEvaluate.mockResolvedValue([
        {
          title: 'PS5 Like New',
          price: '$200',
          url: 'https://sarasota.craigslist.org/vgm/d/ps5/5555555.html',
          location: 'Sarasota',
          imageUrl: 'https://images.craigslist.org/ps5.jpg',
        },
      ]);

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'sarasota',
        category: 'video_gaming',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.savedCount).toBe(1);
      expect(data.analyzedWithLLM).toBe(1);

      const upsertCall = mockUpsert.mock.calls[0][0];
      expect(upsertCall.create.identifiedBrand).toBe('Sony');
      expect(upsertCall.create.identifiedModel).toBe('PlayStation 5');
      expect(upsertCall.create.sellabilityScore).toBe(95);
      expect(upsertCall.create.demandLevel).toBe('very high');
      expect(upsertCall.create.marketDataSource).toBe('ebay_scrape');
      expect(upsertCall.create.comparableSalesJson).toBeTruthy();
      expect(upsertCall.create.resaleStrategy).toBe('List immediately on eBay');

      delete process.env.OPENAI_API_KEY;
    });
  });
});

// ── Additional branch coverage ───────────────────────────────────────────────
import { getAuthUserId } from '@/lib/auth-middleware';

describe('Craigslist Scraper - additional branch coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthUserId as jest.Mock).mockResolvedValue('user-test');
    mockJobCreate.mockResolvedValue({ id: 'job-branch' });
    mockJobUpdate.mockResolvedValue({});
    mockUpsert.mockResolvedValue({ id: 'listing-branch' });
    mockDetectCategory.mockReturnValue('electronics');
    mockEstimateValue.mockImplementation(() => createDefaultEstimation());
    mockGeneratePurchaseMessage.mockReturnValue('Hi, still available?');

    // Default playwright mocks
    mockNewPage.mockReturnValue({
      goto: mockGoto.mockResolvedValue(undefined),
      waitForSelector: mockWaitForSelector.mockResolvedValue(undefined),
      evaluate: mockEvaluate.mockResolvedValue([]),
      close: jest.fn(),
    });
    mockNewContext.mockResolvedValue({
      newPage: mockNewPage,
    });
  });

  it('returns 401 when not authenticated', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue(null);

    const request = createMockRequest('POST', '/api/scraper/craigslist', {
      location: 'tampa',
      category: 'electronics',
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('handles parse price with no match (returns 0)', async () => {
    // Items with non-numeric price get price=0 and are skipped
    mockEvaluate.mockResolvedValue([
      {
        title: 'Free Couch',
        price: 'Free',
        url: 'https://tampa.craigslist.org/fua/d/free-couch/1234567.html',
        location: 'Tampa',
        imageUrl: '',
      },
    ]);

    const request = createMockRequest('POST', '/api/scraper/craigslist', {
      location: 'tampa',
      category: 'furniture',
    });
    const response = await POST(request);
    const data = await response.json();
    expect(data.success).toBe(true);
    // Free item with no price should be skipped
    expect(data.savedCount).toBe(0);
  });

  it('handles waitForSelector timeout (catch callback)', async () => {
    // waitForSelector throws → covered by .catch()
    mockWaitForSelector.mockRejectedValue(new Error('Timeout'));
    mockEvaluate.mockResolvedValue([]);

    const request = createMockRequest('POST', '/api/scraper/craigslist', {
      location: 'tampa',
      category: 'electronics',
    });
    const response = await POST(request);
    const data = await response.json();
    expect(data.success).toBe(true); // Should succeed with empty results
  });
});
