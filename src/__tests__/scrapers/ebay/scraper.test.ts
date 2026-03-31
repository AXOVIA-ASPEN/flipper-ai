import {
  buildFilterString,
  getEbayToken,
  callEbayApi,
  fetchEbayListings,
  fetchSoldListings,
  formatLocation,
  buildSellerNote,
  parseEbayPrice,
  collectImageUrls,
  convertEbayItemsToNormalized,
  EBAY_API_DEFAULTS,
  SUPPORTED_CATEGORIES,
  SUPPORTED_CONDITIONS,
} from '@/scrapers/ebay';
import type { EbayItemSummary } from '@/scrapers/ebay';
import {
  ExternalServiceError,
  RateLimitError,
  ConfigurationError,
} from '@/lib/errors';

// Mock value-estimator (used by convertEbayItemsToNormalized for detectCategory fallback)
jest.mock('@/lib/value-estimator', () => ({
  detectCategory: jest.fn().mockReturnValue('electronics'),
  estimateValue: jest.fn().mockReturnValue({
    estimatedValue: 100,
    estimatedLow: 80,
    estimatedHigh: 120,
    profitPotential: 50,
    profitLow: 30,
    profitHigh: 70,
    valueScore: 75,
    discountPercent: 0.3,
    resaleDifficulty: 'EASY',
    comparableUrls: [],
    reasoning: 'test',
    notes: '',
    shippable: true,
    negotiable: true,
    tags: [],
  }),
  generatePurchaseMessage: jest.fn().mockReturnValue('test message'),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('eBay barrel exports from index', () => {
  it('exports all constants from types module', () => {
    expect(SUPPORTED_CATEGORIES).toBeDefined();
    expect(SUPPORTED_CONDITIONS).toBeDefined();
  });
});

describe('eBay Scraper Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.EBAY_OAUTH_TOKEN = 'test-token-abc123';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ============================
  // buildFilterString
  // ============================
  describe('buildFilterString', () => {
    it('always includes buyingOptions:{FIXED_PRICE}', () => {
      const result = buildFilterString({});
      expect(result).toBe('buyingOptions:{FIXED_PRICE}');
    });

    it('adds soldItemsOnly:true when soldOnly is true', () => {
      const result = buildFilterString({}, true);
      expect(result).toBe('buyingOptions:{FIXED_PRICE},soldItemsOnly:true');
    });

    it('adds price range with min and max', () => {
      const result = buildFilterString({ minPrice: 10, maxPrice: 100 });
      expect(result).toBe('buyingOptions:{FIXED_PRICE},price:[10..100]');
    });

    it('uses 0 as default min when only maxPrice specified', () => {
      const result = buildFilterString({ maxPrice: 500 });
      expect(result).toBe('buyingOptions:{FIXED_PRICE},price:[0..500]');
    });

    it('uses * as default max when only minPrice specified', () => {
      const result = buildFilterString({ minPrice: 25 });
      expect(result).toBe('buyingOptions:{FIXED_PRICE},price:[25..*]');
    });

    it('adds condition filter', () => {
      const result = buildFilterString({ condition: 'USED' });
      expect(result).toBe('buyingOptions:{FIXED_PRICE},conditions:{USED}');
    });

    it('combines all filters', () => {
      const result = buildFilterString(
        { minPrice: 5, maxPrice: 200, condition: 'NEW' },
        true
      );
      expect(result).toBe(
        'buyingOptions:{FIXED_PRICE},soldItemsOnly:true,price:[5..200],conditions:{NEW}'
      );
    });

    it('handles empty params with soldOnly', () => {
      const result = buildFilterString({}, true);
      expect(result).toContain('soldItemsOnly:true');
    });

    it('handles condition CERTIFIED_REFURBISHED', () => {
      const result = buildFilterString({ condition: 'CERTIFIED_REFURBISHED' });
      expect(result).toContain('conditions:{CERTIFIED_REFURBISHED}');
    });

    it('handles minPrice of 0 explicitly', () => {
      const result = buildFilterString({ minPrice: 0, maxPrice: 50 });
      expect(result).toBe('buyingOptions:{FIXED_PRICE},price:[0..50]');
    });
  });

  // ============================
  // getEbayToken
  // ============================
  describe('getEbayToken', () => {
    it('returns token when EBAY_OAUTH_TOKEN is set', () => {
      process.env.EBAY_OAUTH_TOKEN = 'my-token-123';
      expect(getEbayToken()).toBe('my-token-123');
    });

    it('throws ConfigurationError when EBAY_OAUTH_TOKEN is missing', () => {
      delete process.env.EBAY_OAUTH_TOKEN;
      expect(() => getEbayToken()).toThrow(ConfigurationError);
      expect(() => getEbayToken()).toThrow('EBAY_OAUTH_TOKEN is not configured');
    });

    it('throws ConfigurationError when EBAY_OAUTH_TOKEN is empty string', () => {
      process.env.EBAY_OAUTH_TOKEN = '';
      expect(() => getEbayToken()).toThrow(ConfigurationError);
    });
  });

  // ============================
  // callEbayApi
  // ============================
  describe('callEbayApi', () => {
    it('makes fetch request with correct headers and URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ itemSummaries: [] }),
      });

      await callEbayApi('/item_summary/search', { q: 'laptop' }, 'test-token');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/item_summary/search');
      expect(url).toContain('q=laptop');
      expect(options.headers.Authorization).toBe('Bearer test-token');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.headers['X-EBAY-C-MARKETPLACE-ID']).toBe('EBAY_US');
    });

    it('returns parsed JSON response on success', async () => {
      const mockData = { itemSummaries: [{ itemId: '123', title: 'Test' }] };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await callEbayApi('/item_summary/search', { q: 'test' }, 'token');
      expect(result).toEqual(mockData);
    });

    it('throws ExternalServiceError on 401 (expired token)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      await expect(
        callEbayApi('/item_summary/search', { q: 'test' }, 'bad-token')
      ).rejects.toThrow(ExternalServiceError);

      await expect(
        callEbayApi('/item_summary/search', { q: 'test' }, 'bad-token')
      ).rejects.toThrow('OAuth token expired or invalid');
    });

    it('throws ExternalServiceError on 403 (forbidden)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Forbidden'),
      });

      await expect(
        callEbayApi('/item_summary/search', { q: 'test' }, 'bad-token')
      ).rejects.toThrow(ExternalServiceError);
    });

    it('throws RateLimitError on 429', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limited'),
      });

      await expect(
        callEbayApi('/item_summary/search', { q: 'test' }, 'token')
      ).rejects.toThrow(RateLimitError);
    });

    it('throws ExternalServiceError on 500 server error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      await expect(
        callEbayApi('/item_summary/search', { q: 'test' }, 'token')
      ).rejects.toThrow(ExternalServiceError);
      await expect(
        callEbayApi('/item_summary/search', { q: 'test' }, 'token')
      ).rejects.toThrow('Request failed with status 500');
    });

    it('sets search params correctly on the URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ itemSummaries: [] }),
      });

      await callEbayApi(
        '/item_summary/search',
        { q: 'iphone', limit: '20', category_ids: '293' },
        'token'
      );

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('q=iphone');
      expect(url).toContain('limit=20');
      expect(url).toContain('category_ids=293');
    });
  });

  // ============================
  // fetchEbayListings
  // ============================
  describe('fetchEbayListings', () => {
    it('fetches active listings with correct params', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            itemSummaries: [{ itemId: '1', title: 'Item 1', itemWebUrl: 'http://ebay.com/1' }],
          }),
      });

      const result = await fetchEbayListings(
        { keywords: 'laptop', categoryId: '293', limit: 10 },
        'token'
      );

      expect(result).toHaveLength(1);
      expect(result[0].itemId).toBe('1');

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('q=laptop');
      expect(url).toContain('limit=10');
      expect(url).toContain('category_ids=293');
      expect(url).toContain('fieldgroups=EXTENDED');
      expect(url).toContain('sort=-price');
    });

    it('returns empty array when no itemSummaries', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await fetchEbayListings({ keywords: 'test' }, 'token');
      expect(result).toEqual([]);
    });

    it('caps limit at MAX_LIMIT', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ itemSummaries: [] }),
      });

      await fetchEbayListings({ keywords: 'test', limit: 100 }, 'token');

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain(`limit=${EBAY_API_DEFAULTS.MAX_LIMIT}`);
    });

    it('uses default limit when not specified', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ itemSummaries: [] }),
      });

      await fetchEbayListings({ keywords: 'test' }, 'token');

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain(`limit=${EBAY_API_DEFAULTS.DEFAULT_LIMIT}`);
    });
  });

  // ============================
  // fetchSoldListings
  // ============================
  describe('fetchSoldListings', () => {
    it('fetches sold listings with soldItemsOnly filter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            itemSummaries: [{ itemId: '2', title: 'Sold Item', itemWebUrl: 'http://ebay.com/2' }],
          }),
      });

      const result = await fetchSoldListings({ keywords: 'guitar' }, 'token');

      expect(result).toHaveLength(1);
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('soldItemsOnly');
      expect(url).toContain('limit=10');
    });

    it('returns empty array when no sold items', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await fetchSoldListings({ keywords: 'test' }, 'token');
      expect(result).toEqual([]);
    });
  });

  // ============================
  // parseEbayPrice
  // ============================
  describe('parseEbayPrice', () => {
    it('parses valid price string', () => {
      expect(parseEbayPrice('29.99')).toBe(29.99);
    });

    it('parses integer price string', () => {
      expect(parseEbayPrice('100')).toBe(100);
    });

    it('returns 0 for undefined', () => {
      expect(parseEbayPrice(undefined)).toBe(0);
    });

    it('returns 0 for empty string', () => {
      expect(parseEbayPrice('')).toBe(0);
    });

    it('returns 0 for non-numeric string', () => {
      expect(parseEbayPrice('not-a-price')).toBe(0);
    });

    it('parses "0" as 0', () => {
      expect(parseEbayPrice('0')).toBe(0);
    });

    it('parses large price', () => {
      expect(parseEbayPrice('9999.99')).toBe(9999.99);
    });

    it('parses small price', () => {
      expect(parseEbayPrice('0.01')).toBe(0.01);
    });
  });

  // ============================
  // collectImageUrls
  // ============================
  describe('collectImageUrls', () => {
    it('collects primary image only', () => {
      const item: EbayItemSummary = {
        itemId: '1',
        title: 'Test',
        itemWebUrl: 'http://ebay.com/1',
        image: { imageUrl: 'http://img.com/primary.jpg' },
      };
      expect(collectImageUrls(item)).toEqual(['http://img.com/primary.jpg']);
    });

    it('collects primary + additional images', () => {
      const item: EbayItemSummary = {
        itemId: '1',
        title: 'Test',
        itemWebUrl: 'http://ebay.com/1',
        image: { imageUrl: 'http://img.com/primary.jpg' },
        additionalImages: [
          { imageUrl: 'http://img.com/extra1.jpg' },
          { imageUrl: 'http://img.com/extra2.jpg' },
        ],
      };
      expect(collectImageUrls(item)).toEqual([
        'http://img.com/primary.jpg',
        'http://img.com/extra1.jpg',
        'http://img.com/extra2.jpg',
      ]);
    });

    it('returns empty array when no images', () => {
      const item: EbayItemSummary = {
        itemId: '1',
        title: 'Test',
        itemWebUrl: 'http://ebay.com/1',
      };
      expect(collectImageUrls(item)).toEqual([]);
    });

    it('handles additional images without primary', () => {
      const item: EbayItemSummary = {
        itemId: '1',
        title: 'Test',
        itemWebUrl: 'http://ebay.com/1',
        additionalImages: [{ imageUrl: 'http://img.com/extra.jpg' }],
      };
      expect(collectImageUrls(item)).toEqual(['http://img.com/extra.jpg']);
    });

    it('handles empty additional images array', () => {
      const item: EbayItemSummary = {
        itemId: '1',
        title: 'Test',
        itemWebUrl: 'http://ebay.com/1',
        image: { imageUrl: 'http://img.com/primary.jpg' },
        additionalImages: [],
      };
      expect(collectImageUrls(item)).toEqual(['http://img.com/primary.jpg']);
    });
  });

  // ============================
  // formatLocation
  // ============================
  describe('formatLocation', () => {
    it('formats full location (city, state, country)', () => {
      const item: EbayItemSummary = {
        itemId: '1',
        title: 'Test',
        itemWebUrl: 'http://ebay.com/1',
        itemLocation: {
          city: 'San Francisco',
          stateOrProvince: 'CA',
          country: 'US',
        },
      };
      expect(formatLocation(item)).toBe('San Francisco, CA, US');
    });

    it('formats partial location (city only)', () => {
      const item: EbayItemSummary = {
        itemId: '1',
        title: 'Test',
        itemWebUrl: 'http://ebay.com/1',
        itemLocation: { city: 'Austin' },
      };
      expect(formatLocation(item)).toBe('Austin');
    });

    it('formats state and country only', () => {
      const item: EbayItemSummary = {
        itemId: '1',
        title: 'Test',
        itemWebUrl: 'http://ebay.com/1',
        itemLocation: { stateOrProvince: 'NY', country: 'US' },
      };
      expect(formatLocation(item)).toBe('NY, US');
    });

    it('returns null when no itemLocation', () => {
      const item: EbayItemSummary = {
        itemId: '1',
        title: 'Test',
        itemWebUrl: 'http://ebay.com/1',
      };
      expect(formatLocation(item)).toBeNull();
    });

    it('returns null when itemLocation has no data', () => {
      const item: EbayItemSummary = {
        itemId: '1',
        title: 'Test',
        itemWebUrl: 'http://ebay.com/1',
        itemLocation: {},
      };
      expect(formatLocation(item)).toBeNull();
    });
  });

  // ============================
  // buildSellerNote
  // ============================
  describe('buildSellerNote', () => {
    it('builds full seller note with feedback percentage and score', () => {
      const item: EbayItemSummary = {
        itemId: '1',
        title: 'Test',
        itemWebUrl: 'http://ebay.com/1',
        seller: {
          username: 'seller1',
          feedbackScore: 250,
          feedbackPercentage: '99.5',
        },
      };
      expect(buildSellerNote(item)).toBe('Seller feedback: 99.5 (250 ratings)');
    });

    it('handles missing feedbackScore', () => {
      const item: EbayItemSummary = {
        itemId: '1',
        title: 'Test',
        itemWebUrl: 'http://ebay.com/1',
        seller: { username: 'seller1', feedbackPercentage: '98.0' },
      };
      expect(buildSellerNote(item)).toBe('Seller feedback: 98.0 (N/A ratings)');
    });

    it('handles missing feedbackPercentage', () => {
      const item: EbayItemSummary = {
        itemId: '1',
        title: 'Test',
        itemWebUrl: 'http://ebay.com/1',
        seller: { username: 'seller1', feedbackScore: 100 },
      };
      expect(buildSellerNote(item)).toBe('Seller feedback: N/A (100 ratings)');
    });

    it('returns null when no seller', () => {
      const item: EbayItemSummary = {
        itemId: '1',
        title: 'Test',
        itemWebUrl: 'http://ebay.com/1',
      };
      expect(buildSellerNote(item)).toBeNull();
    });

    it('returns null when seller has no feedback data', () => {
      const item: EbayItemSummary = {
        itemId: '1',
        title: 'Test',
        itemWebUrl: 'http://ebay.com/1',
        seller: { username: 'seller1' },
      };
      expect(buildSellerNote(item)).toBeNull();
    });

    it('handles feedbackScore of 0', () => {
      const item: EbayItemSummary = {
        itemId: '1',
        title: 'Test',
        itemWebUrl: 'http://ebay.com/1',
        seller: { username: 'new_seller', feedbackScore: 0, feedbackPercentage: '100.0' },
      };
      // feedbackScore 0 is still a valid number, nullish coalescing preserves it
      expect(buildSellerNote(item)).toBe('Seller feedback: 100.0 (0 ratings)');
    });
  });

  // ============================
  // convertEbayItemsToNormalized
  // ============================
  describe('convertEbayItemsToNormalized', () => {
    const fullItem: EbayItemSummary = {
      itemId: 'v1|123456|0',
      title: 'Apple MacBook Pro 16" M3 Max',
      shortDescription: 'Like new MacBook Pro with M3 Max chip',
      itemWebUrl: 'https://www.ebay.com/itm/123456',
      price: { value: '2499.99', currency: 'USD' },
      buyingOptions: ['FIXED_PRICE'],
      condition: 'USED',
      image: { imageUrl: 'https://i.ebayimg.com/images/primary.jpg' },
      additionalImages: [
        { imageUrl: 'https://i.ebayimg.com/images/side.jpg' },
        { imageUrl: 'https://i.ebayimg.com/images/back.jpg' },
      ],
      seller: {
        username: 'techdeals',
        feedbackScore: 500,
        feedbackPercentage: '99.8',
      },
      itemLocation: {
        city: 'San Jose',
        stateOrProvince: 'CA',
        country: 'US',
      },
      categories: [{ categoryId: '293', categoryName: 'Computers & Tablets' }],
      itemCreationDate: '2026-02-15T10:00:00.000Z',
    };

    it('converts a full eBay item to RawListing format', () => {
      const result = convertEbayItemsToNormalized([fullItem]);

      expect(result).toHaveLength(1);
      const listing = result[0];
      expect(listing.externalId).toBe('v1|123456|0');
      expect(listing.url).toBe('https://www.ebay.com/itm/123456');
      expect(listing.title).toBe('Apple MacBook Pro 16" M3 Max');
      expect(listing.description).toBe('Like new MacBook Pro with M3 Max chip');
      expect(listing.askingPrice).toBe(2499.99);
      expect(listing.condition).toBe('USED');
      expect(listing.location).toBe('San Jose, CA, US');
      expect(listing.sellerName).toBe('techdeals');
      expect(listing.sellerContact).toBe('Seller feedback: 99.8 (500 ratings)');
      expect(listing.imageUrls).toEqual([
        'https://i.ebayimg.com/images/primary.jpg',
        'https://i.ebayimg.com/images/side.jpg',
        'https://i.ebayimg.com/images/back.jpg',
      ]);
      expect(listing.category).toBe('Computers & Tablets');
      expect(listing.postedAt).toEqual(new Date('2026-02-15T10:00:00.000Z'));
    });

    it('handles item with missing optional fields', () => {
      const minimalItem: EbayItemSummary = {
        itemId: '789',
        title: 'Basic Item',
        itemWebUrl: 'https://ebay.com/789',
      };

      const result = convertEbayItemsToNormalized([minimalItem]);

      expect(result).toHaveLength(1);
      const listing = result[0];
      expect(listing.askingPrice).toBe(0);
      expect(listing.condition).toBeNull();
      expect(listing.location).toBeNull();
      expect(listing.sellerName).toBeNull();
      expect(listing.sellerContact).toBeNull();
      expect(listing.imageUrls).toEqual([]);
      expect(listing.postedAt).toBeNull();
    });

    it('filters out items without required fields', () => {
      const items: EbayItemSummary[] = [
        { itemId: '', title: 'No ID', itemWebUrl: 'https://ebay.com/1' },
        { itemId: '2', title: '', itemWebUrl: 'https://ebay.com/2' },
        { itemId: '3', title: 'No URL', itemWebUrl: '' },
        fullItem,
      ];

      const result = convertEbayItemsToNormalized(items);
      expect(result).toHaveLength(1);
      expect(result[0].externalId).toBe('v1|123456|0');
    });

    it('uses description fallback when no shortDescription', () => {
      const item: EbayItemSummary = {
        ...fullItem,
        shortDescription: undefined,
        description: 'Full description here',
      };

      const result = convertEbayItemsToNormalized([item]);
      expect(result[0].description).toBe('Full description here');
    });

    it('uses detectCategory fallback when no categories', () => {
      const item: EbayItemSummary = {
        ...fullItem,
        categories: undefined,
      };

      const result = convertEbayItemsToNormalized([item]);
      // detectCategory mock returns 'electronics'
      expect(result[0].category).toBe('electronics');
    });

    it('uses "electronics" as default category when detectCategory returns null', () => {
      const { detectCategory } = jest.requireMock('@/lib/value-estimator');
      detectCategory.mockReturnValueOnce(null);

      const item: EbayItemSummary = {
        ...fullItem,
        categories: undefined,
      };

      const result = convertEbayItemsToNormalized([item]);
      expect(result[0].category).toBe('electronics');
    });

    it('processes multiple items', () => {
      const item2: EbayItemSummary = {
        itemId: '999',
        title: 'Another Item',
        itemWebUrl: 'https://ebay.com/999',
        price: { value: '50.00' },
      };

      const result = convertEbayItemsToNormalized([fullItem, item2]);
      expect(result).toHaveLength(2);
      expect(result[0].askingPrice).toBe(2499.99);
      expect(result[1].askingPrice).toBe(50);
    });

    it('handles empty array', () => {
      expect(convertEbayItemsToNormalized([])).toEqual([]);
    });

    it('sets sellerContact to seller feedback note', () => {
      const result = convertEbayItemsToNormalized([fullItem]);
      expect(result[0].sellerContact).toBe('Seller feedback: 99.8 (500 ratings)');
    });

    it('sets sellerContact to null when no seller feedback', () => {
      const item: EbayItemSummary = {
        ...fullItem,
        seller: { username: 'basic_seller' },
      };
      const result = convertEbayItemsToNormalized([item]);
      expect(result[0].sellerContact).toBeNull();
    });
  });
});
