import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/scraper/ebay/route';

// Mock auth
const mockGetAuthUserId = jest.fn(() => Promise.resolve('test-user-id'));
jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: (...args: unknown[]) => mockGetAuthUserId(...args),
  getUserIdOrDefault: jest.fn(() => Promise.resolve('test-user-id')),
  isAuthenticated: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => Promise.resolve({ user: { id: 'test-user-id', email: 'test@test.com' } })),
}));

const mockListingUpsert = jest.fn();
const mockPriceHistoryCreateMany = jest.fn();
const mockPriceHistoryFindMany = jest.fn();
const mockPriceHistoryDeleteMany = jest.fn();
const mockJobCreate = jest.fn();
const mockJobUpdate = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    listing: {
      upsert: (...args: unknown[]) => mockListingUpsert(...args),
    },
    priceHistory: {
      createMany: (...args: unknown[]) => mockPriceHistoryCreateMany(...args),
      findMany: (...args: unknown[]) => mockPriceHistoryFindMany(...args),
      deleteMany: (...args: unknown[]) => mockPriceHistoryDeleteMany(...args),
    },
    scraperJob: {
      create: (...args: unknown[]) => mockJobCreate(...args),
      update: (...args: unknown[]) => mockJobUpdate(...args),
    },
  },
}));

jest.mock('@/lib/market-value-calculator', () => ({
  calculateVerifiedMarketValue: jest.fn().mockResolvedValue({
    verifiedMarketValue: 900,
    marketDataSource: 'ebay_sold',
  }),
  calculateTrueDiscount: jest.fn().mockReturnValue(5.5),
}));

function createRequest(body: Record<string, unknown>) {
  return new NextRequest(new URL('http://localhost/api/scraper/ebay'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeEbayItem(overrides: Record<string, unknown> = {}) {
  return {
    itemId: 'ebay-1',
    title: 'Apple iPhone 14 Pro',
    shortDescription: 'Great phone',
    itemWebUrl: 'https://ebay.com/itm/ebay-1',
    price: { value: '850', currency: 'USD' },
    buyingOptions: ['FIXED_PRICE'],
    condition: 'USED',
    image: { imageUrl: 'https://img.example/iphone.jpg' },
    additionalImages: [{ imageUrl: 'https://img.example/iphone2.jpg' }],
    seller: { username: 'trusted_seller', feedbackPercentage: '99.8', feedbackScore: 2021 },
    itemLocation: { city: 'Austin', stateOrProvince: 'TX', country: 'US' },
    categories: [{ categoryId: '9355', categoryName: 'Cell Phones' }],
    itemCreationDate: '2024-02-01T10:00:00.000Z',
    ...overrides,
  };
}

function makeSoldItem(overrides: Record<string, unknown> = {}) {
  return {
    itemId: 'sold-1',
    title: 'Apple iPhone 13 Pro Max',
    price: { value: '920', currency: 'USD' },
    condition: 'USED',
    itemEndDate: '2024-01-28T12:00:00.000Z',
    categories: [{ categoryId: '9355', categoryName: 'Cell Phones' }],
    ...overrides,
  };
}

describe('eBay Scraper API', () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.EBAY_OAUTH_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EBAY_OAUTH_TOKEN = 'test-token';
    (global.fetch as unknown) = jest.fn();
    mockGetAuthUserId.mockResolvedValue('test-user-id');

    mockJobCreate.mockResolvedValue({ id: 'job-1' });
    mockJobUpdate.mockResolvedValue({ id: 'job-1' });
    mockListingUpsert.mockResolvedValue({
      id: 'listing-1',
      status: 'OPPORTUNITY',
    });
    mockPriceHistoryCreateMany.mockResolvedValue({ count: 1 });
    mockPriceHistoryFindMany.mockResolvedValue([]);
    mockPriceHistoryDeleteMany.mockResolvedValue({ count: 0 });
  });

  afterAll(() => {
    global.fetch = originalFetch;
    process.env.EBAY_OAUTH_TOKEN = originalToken;
  });

  // === GET ===

  describe('GET /api/scraper/ebay', () => {
    it('returns scraper status and configuration', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.platform).toBe('ebay');
      expect(data.status).toBe('ready');
      expect(Array.isArray(data.supportedCategories)).toBe(true);
      expect(Array.isArray(data.supportedConditions)).toBe(true);
      expect(data.notes).toContain('eBay Browse API');
    });

    it('returns missing_token status when token is not set', async () => {
      process.env.EBAY_OAUTH_TOKEN = '';

      const response = await GET();
      const data = await response.json();

      expect(data.status).toBe('missing_token');

      process.env.EBAY_OAUTH_TOKEN = 'test-token';
    });
  });

  // === POST ===

  describe('POST /api/scraper/ebay', () => {
    it('returns 500 when EBAY_OAUTH_TOKEN is missing', async () => {
      process.env.EBAY_OAUTH_TOKEN = '';

      const response = await POST(createRequest({ keywords: 'iphone' }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('EBAY_OAUTH_TOKEN');
    });

    it('returns 401 when user is not authenticated', async () => {
      mockGetAuthUserId.mockResolvedValue(null);

      const response = await POST(createRequest({ keywords: 'iphone' }));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 400 when keywords is empty', async () => {
      const response = await POST(createRequest({ keywords: '' }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('keywords');
    });

    it('returns 400 when keywords is missing', async () => {
      const response = await POST(createRequest({}));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('keywords');
    });

    it('returns 400 when keywords is whitespace only', async () => {
      const response = await POST(createRequest({ keywords: '   ' }));
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('scrapes listings and stores price history', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ itemSummaries: [makeEbayItem()] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ itemSummaries: [makeSoldItem()] }),
        });

      const response = await POST(
        createRequest({
          keywords: 'iPhone',
          categoryId: '9355',
          condition: 'USED',
          minPrice: 500,
          maxPrice: 1200,
        })
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.listingsSaved).toBe(1);
      expect(data.platform).toBe('EBAY');
      expect(mockListingUpsert).toHaveBeenCalledTimes(1);
      expect(mockPriceHistoryCreateMany).toHaveBeenCalledTimes(1);
      expect(mockJobCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ platform: 'EBAY', status: 'RUNNING' }),
        })
      );
      expect(mockJobUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COMPLETED' }),
        })
      );
    });

    it('handles empty active listings response', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'nonexistent item xyz' }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.listingsSaved).toBe(0);
      expect(data.priceHistorySaved).toBe(0);
    });

    it('skips items without itemId', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            itemSummaries: [makeEbayItem({ itemId: undefined })],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      const data = await response.json();

      expect(data.listingsSaved).toBe(0);
      expect(mockListingUpsert).not.toHaveBeenCalled();
    });

    it('skips items without itemWebUrl', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            itemSummaries: [makeEbayItem({ itemWebUrl: undefined })],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      const data = await response.json();

      expect(data.listingsSaved).toBe(0);
    });

    it('skips items without title', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            itemSummaries: [makeEbayItem({ title: undefined })],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      const data = await response.json();

      expect(data.listingsSaved).toBe(0);
    });

    it('handles item with no price', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            itemSummaries: [makeEbayItem({ price: undefined })],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.listingsSaved).toBe(1);
    });

    it('handles item with no condition', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            itemSummaries: [makeEbayItem({ condition: undefined })],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      const data = await response.json();

      expect(data.listingsSaved).toBe(1);
    });

    it('handles item with no seller info', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            itemSummaries: [makeEbayItem({ seller: undefined })],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      const data = await response.json();

      expect(data.listingsSaved).toBe(1);
    });

    it('handles seller with only feedbackScore (no percentage)', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            itemSummaries: [makeEbayItem({ seller: { username: 'seller1', feedbackScore: 100 } })],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      expect(response.status).toBe(200);
    });

    it('handles seller with only feedbackPercentage (no score)', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            itemSummaries: [
              makeEbayItem({ seller: { username: 'seller1', feedbackPercentage: '99.5' } }),
            ],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      expect(response.status).toBe(200);
    });

    it('handles seller with no feedback info at all', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            itemSummaries: [makeEbayItem({ seller: { username: 'seller1' } })],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      expect(response.status).toBe(200);
    });

    it('handles item with no location', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            itemSummaries: [makeEbayItem({ itemLocation: undefined })],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      expect(response.status).toBe(200);
    });

    it('handles item with partial location (city only)', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            itemSummaries: [makeEbayItem({ itemLocation: { city: 'Austin' } })],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      expect(response.status).toBe(200);
    });

    it('handles item with empty location object', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            itemSummaries: [makeEbayItem({ itemLocation: {} })],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      expect(response.status).toBe(200);
    });

    it('handles item with no categories', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            itemSummaries: [makeEbayItem({ categories: undefined })],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      expect(response.status).toBe(200);
      expect(mockListingUpsert).toHaveBeenCalled();
    });

    it('handles item with empty categories array', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            itemSummaries: [makeEbayItem({ categories: [] })],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      expect(response.status).toBe(200);
    });

    it('handles item with no image', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            itemSummaries: [makeEbayItem({ image: undefined, additionalImages: undefined })],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      expect(response.status).toBe(200);
    });

    it('handles item with no additionalImages', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            itemSummaries: [makeEbayItem({ additionalImages: undefined })],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      expect(response.status).toBe(200);
    });

    it('handles item with no creation date', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            itemSummaries: [makeEbayItem({ itemCreationDate: undefined })],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      expect(response.status).toBe(200);
    });

    it('handles item with AUCTION buying option', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            itemSummaries: [makeEbayItem({ buyingOptions: ['FIXED_PRICE', 'AUCTION'] })],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      expect(response.status).toBe(200);
    });

    it('handles item with no buyingOptions', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            itemSummaries: [makeEbayItem({ buyingOptions: undefined })],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      expect(response.status).toBe(200);
    });

    it('handles item with description instead of shortDescription', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            itemSummaries: [
              makeEbayItem({ shortDescription: undefined, description: 'Full description' }),
            ],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      expect(response.status).toBe(200);
    });

    it('handles item with no description at all', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            itemSummaries: [makeEbayItem({ shortDescription: undefined, description: undefined })],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      expect(response.status).toBe(200);
    });

    it('marks low value score listings as NEW', async () => {
      mockListingUpsert.mockResolvedValue({ id: 'listing-1', status: 'NEW' });
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ itemSummaries: [makeEbayItem()] }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it('caps limit to MAX_LIMIT (50)', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await POST(createRequest({ keywords: 'test', limit: 100 }));

      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      expect(fetchUrl).toContain('limit=50');
    });

    it('uses default limit when not specified', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await POST(createRequest({ keywords: 'test' }));

      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      expect(fetchUrl).toContain('limit=20');
    });

    it('handles eBay API error response', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      });

      const response = await POST(createRequest({ keywords: 'test' }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to scrape');
      expect(mockJobUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED' }),
        })
      );
    });

    it('handles fetch throwing an error', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockRejectedValue(new Error('Network error'));

      const response = await POST(createRequest({ keywords: 'test' }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(mockJobUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FAILED',
            errorMessage: 'Network error',
          }),
        })
      );
    });

    it('handles non-Error throw', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockRejectedValue('string error');

      const response = await POST(createRequest({ keywords: 'test' }));
      expect(response.status).toBe(500);
    });

    it('handles job creation failure', async () => {
      mockJobCreate.mockRejectedValue(new Error('DB error'));

      const response = await POST(createRequest({ keywords: 'test' }));
      expect(response.status).toBe(500);
    });

    it('builds filter with only minPrice', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await POST(createRequest({ keywords: 'test', minPrice: 100 }));

      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      expect(fetchUrl).toContain('price');
    });

    it('builds filter with only maxPrice', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await POST(createRequest({ keywords: 'test', maxPrice: 500 }));

      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      expect(fetchUrl).toContain('price');
    });

    it('builds filter with condition', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await POST(createRequest({ keywords: 'test', condition: 'NEW' }));

      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      expect(fetchUrl).toContain('conditions');
    });

    it('passes categoryId to API', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await POST(createRequest({ keywords: 'test', categoryId: '293' }));

      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      expect(fetchUrl).toContain('category_ids=293');
    });

    it('stores sold listings in price history', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          itemSummaries: [
            makeSoldItem(),
            makeSoldItem({ itemId: 'sold-2', title: 'iPhone 12', price: { value: '600' } }),
          ],
        }),
      });

      const response = await POST(createRequest({ keywords: 'iPhone' }));
      const data = await response.json();

      expect(data.priceHistorySaved).toBe(2);
      expect(mockPriceHistoryCreateMany).toHaveBeenCalledTimes(1);
    });

    it('skips sold items with zero price in price history', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          itemSummaries: [makeSoldItem({ price: { value: '0' } })],
        }),
      });

      const response = await POST(createRequest({ keywords: 'test' }));
      const data = await response.json();

      expect(data.priceHistorySaved).toBe(0);
    });

    it('skips sold items with no price in price history', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          itemSummaries: [makeSoldItem({ price: undefined })],
        }),
      });

      const response = await POST(createRequest({ keywords: 'test' }));
      const data = await response.json();

      expect(data.priceHistorySaved).toBe(0);
    });

    it('uses itemCreationDate when itemEndDate is missing for sold items', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          itemSummaries: [
            makeSoldItem({ itemEndDate: undefined, itemCreationDate: '2024-01-15T00:00:00Z' }),
          ],
        }),
      });

      const response = await POST(createRequest({ keywords: 'test' }));
      const data = await response.json();

      expect(data.priceHistorySaved).toBe(1);
    });

    it('uses current date when both itemEndDate and itemCreationDate are missing', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          itemSummaries: [makeSoldItem({ itemEndDate: undefined, itemCreationDate: undefined })],
        }),
      });

      const response = await POST(createRequest({ keywords: 'test' }));
      const data = await response.json();

      expect(data.priceHistorySaved).toBe(1);
    });

    it('uses item title for price history when available', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          itemSummaries: [makeSoldItem({ title: undefined })],
        }),
      });

      const response = await POST(createRequest({ keywords: 'fallback keyword' }));
      const data = await response.json();

      expect(data.priceHistorySaved).toBe(1);
    });

    it('handles sold items with no categories', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          itemSummaries: [makeSoldItem({ categories: undefined })],
        }),
      });

      const response = await POST(createRequest({ keywords: 'test' }));
      const data = await response.json();

      expect(data.priceHistorySaved).toBe(1);
    });

    it('handles market value returning null', async () => {
      const { calculateVerifiedMarketValue } = require('@/lib/market-value-calculator');
      calculateVerifiedMarketValue.mockResolvedValueOnce(null);

      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ itemSummaries: [makeEbayItem()] }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      expect(response.status).toBe(200);
    });

    it('trims keywords before searching', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await POST(createRequest({ keywords: '  iPhone Pro  ' }));

      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      expect(fetchUrl).toContain('q=iPhone+Pro');
    });

    it('counts opportunities in job update', async () => {
      mockListingUpsert
        .mockResolvedValueOnce({ id: 'l1', status: 'OPPORTUNITY' })
        .mockResolvedValueOnce({ id: 'l2', status: 'NEW' })
        .mockResolvedValueOnce({ id: 'l3', status: 'OPPORTUNITY' });

      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            itemSummaries: [
              makeEbayItem({ itemId: 'e1' }),
              makeEbayItem({ itemId: 'e2' }),
              makeEbayItem({ itemId: 'e3' }),
            ],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'test' }));
      const data = await response.json();

      expect(data.listingsSaved).toBe(3);
      expect(mockJobUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            opportunitiesFound: 2,
            listingsFound: 3,
          }),
        })
      );
    });

    it('saves listing as NEW status when valueScore < 70 (low-value generic item)', async () => {
      // A $20 item with no brand/no categories → detectCategory used (no categories path) → score < 70 → 'NEW'
      const lowValueItem = makeEbayItem({
        itemId: 'low-value-1',
        title: 'Random old misc lot junk',
        shortDescription: '',
        price: { value: '20', currency: 'USD' }, // very low price, no brand = low/negative profit
        categories: undefined, // triggers detectCategory fallback (covers line 168 category branch)
        condition: undefined, // triggers item.condition || null → null (covers line 229/261)
        image: undefined,
        additionalImages: undefined,
        seller: { username: 'seller', feedbackPercentage: '95', feedbackScore: 10 },
      });

      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ itemSummaries: [lowValueItem] }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'random lot' }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // The upsert should be called with status 'NEW' (low valueScore from generic item)
      expect(mockListingUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ status: 'NEW' }),
        })
      );
    });

    it('saves listing as OPPORTUNITY when valueScore >= 70 (high-margin item)', async () => {
      // A cheap $50 Apple item in "New" condition → high profit margin → score >= 70 → 'OPPORTUNITY'
      // profitPotential = ~21 (35% margin after 13% fees), score ≈ 92 ≥ 70
      const highValueItem = makeEbayItem({
        itemId: 'high-value-1',
        title: 'Apple AirPods Pro', // Apple brand boost (1.2x)
        shortDescription: 'Sealed in box',
        price: { value: '50', currency: 'USD' }, // low asking price → high profit margin
        condition: 'New', // conditionMultiplier = 1.0 (no discount)
        buyingOptions: ['FIXED_PRICE'],
      });

      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ itemSummaries: [highValueItem] }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const response = await POST(createRequest({ keywords: 'airpods' }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // The upsert should be called with status 'OPPORTUNITY' (high valueScore)
      expect(mockListingUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ status: 'OPPORTUNITY' }),
        })
      );
    });

    it('saves sold items with no condition as null', async () => {
      // Sold item without condition field → item.condition || null → null (covers line 298)
      const soldItemNoCondition = makeSoldItem({ condition: undefined });

      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // active listings
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ itemSummaries: [soldItemNoCondition] }),
        });

      mockPriceHistoryCreateMany.mockResolvedValue({ count: 1 });

      const response = await POST(createRequest({ keywords: 'test' }));
      const data = await response.json();

      expect(response.status).toBe(200);
      // Price history should be saved with condition: null
      expect(mockPriceHistoryCreateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ condition: null }),
          ]),
        })
      );
    });
  });
});
