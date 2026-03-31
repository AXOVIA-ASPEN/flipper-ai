/**
 * Mercari Scraper Module Tests
 * Tests for extracted scraper functions: API calls, Playwright fallback,
 * exponential backoff, data normalization, and RawListing conversion.
 */

import {
  callMercariApi,
  scrapeMercariSearch,
  fetchMercariListings,
  fetchSoldListings,
  normalizeCondition,
  formatLocation,
  collectImageUrls,
  buildSellerNote,
  buildMercariHeaders,
  convertMercariToRawListing,
  getRandomUserAgent,
  scrapeMercariWithPlaywright,
  USER_AGENTS,
  SCRAPER_CONFIG,
  MAX_LIMIT,
  DEFAULT_LIMIT,
  SUPPORTED_CATEGORIES,
  SUPPORTED_CONDITIONS,
  CONDITION_MAP,
  MERCARI_API_BASE_URL,
  MERCARI_SEARCH_URL,
  API_VERSION,
} from '@/scrapers/mercari';
import type { MercariItem } from '@/scrapers/mercari';
import { ExternalServiceError, RateLimitError } from '@/lib/errors';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock playwright
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn(),
  },
}));

const { chromium } = require('playwright');

// Helper to create a full MercariItem
function createMercariItem(overrides: Partial<MercariItem> = {}): MercariItem {
  return {
    id: 'm123456',
    name: 'Nintendo Switch Console',
    description: 'Great condition, barely used',
    price: 199,
    status: 'on_sale',
    thumbnails: ['https://mercari.com/thumb1.jpg'],
    photos: ['https://mercari.com/photo1.jpg', 'https://mercari.com/photo2.jpg'],
    itemCondition: { id: '3', name: 'Very good' },
    seller: {
      id: 's123',
      name: 'TestSeller',
      ratings: { good: 50, normal: 5, bad: 0 },
    },
    shippingPayer: { id: '1', name: 'Seller' },
    shippingMethod: { id: '1', name: 'Standard shipping' },
    shippingFromArea: { id: '1', name: 'California' },
    created: Math.floor(Date.now() / 1000) - 3600,
    rootCategory: { id: '3', name: 'Electronics' },
    itemBrand: { id: 'b1', name: 'Nintendo' },
    ...overrides,
  };
}

describe('mercari barrel exports from index', () => {
  it('exports all constants from types module', () => {
    expect(SUPPORTED_CATEGORIES).toBeDefined();
    expect(SUPPORTED_CONDITIONS).toBeDefined();
    expect(CONDITION_MAP).toBeDefined();
    expect(MERCARI_API_BASE_URL).toBeDefined();
    expect(MERCARI_SEARCH_URL).toBeDefined();
    expect(API_VERSION).toBeDefined();
  });
});

describe('Mercari Scraper Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── buildMercariHeaders ────────────────────────────────────────────────────

  describe('buildMercariHeaders', () => {
    it('returns headers with rotating user agent from pool', () => {
      const headers1 = buildMercariHeaders();
      const headers2 = buildMercariHeaders();

      expect(headers1['User-Agent']).toBeDefined();
      expect(headers2['User-Agent']).toBeDefined();
      // User agents should rotate (not always the same)
      expect(USER_AGENTS).toContain(headers1['User-Agent']);
      expect(USER_AGENTS).toContain(headers2['User-Agent']);
    });

    it('includes required browser-mimicking headers', () => {
      const headers = buildMercariHeaders();

      expect(headers.Accept).toBe('application/json, text/plain, */*');
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers.Referer).toBe('https://www.mercari.com/');
      expect(headers.Origin).toBe('https://www.mercari.com');
      expect(headers['X-Platform']).toBe('web');
      expect(headers['Sec-Fetch-Dest']).toBe('empty');
      expect(headers['Sec-Fetch-Mode']).toBe('cors');
      expect(headers['Sec-Fetch-Site']).toBe('same-origin');
    });

    it('includes randomized Accept-Language header', () => {
      const headers = buildMercariHeaders();
      expect(headers['Accept-Language']).toBeDefined();
      expect(headers['Accept-Language']).toMatch(/^en/);
    });
  });

  // ── getRandomUserAgent ─────────────────────────────────────────────────────

  describe('getRandomUserAgent', () => {
    it('returns a user agent from the pool', () => {
      const ua = getRandomUserAgent();
      expect(USER_AGENTS).toContain(ua);
    });

    it('rotates through the pool', () => {
      const uas = new Set<string>();
      for (let i = 0; i < USER_AGENTS.length * 2; i++) {
        uas.add(getRandomUserAgent());
      }
      // Should have seen multiple unique UAs
      expect(uas.size).toBeGreaterThan(1);
    });
  });

  // ── callMercariApi ─────────────────────────────────────────────────────────

  describe('callMercariApi', () => {
    it('calls Mercari API with correct URL and headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success', data: [] }),
      });

      await callMercariApi('/search', 'POST', { keyword: 'test' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.mercari.com/v1/api/search',
        expect.objectContaining({
          method: 'POST',
          cache: 'no-store',
        })
      );
    });

    it('returns parsed JSON response on success', async () => {
      const mockResponse = { result: 'success', data: [{ id: '1', name: 'Item' }] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await callMercariApi('/search', 'POST', { keyword: 'test' });
      expect(result).toEqual(mockResponse);
    });

    it('throws RateLimitError on 429 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve('rate limit exceeded'),
      });

      await expect(callMercariApi('/search', 'POST', { keyword: 'test' })).rejects.toThrow(
        RateLimitError
      );
    });

    it('throws RateLimitError when HTML response detected (block)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
        text: () => Promise.resolve('<html>Blocked</html>'),
      });

      await expect(callMercariApi('/search', 'POST', { keyword: 'test' })).rejects.toThrow(
        RateLimitError
      );
    });

    it('throws ExternalServiceError on non-rate-limit API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve('Internal server error'),
      });

      await expect(callMercariApi('/search', 'POST', { keyword: 'test' })).rejects.toThrow(
        ExternalServiceError
      );
    });

    it('throws ExternalServiceError when content-type header is null', async () => {
      const headersMap = new Map<string, string>();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: { get: (key: string) => headersMap.get(key) ?? null },
        text: () => Promise.resolve('Server error without content type'),
      });

      await expect(callMercariApi('/search', 'POST', { keyword: 'test' })).rejects.toThrow(
        ExternalServiceError
      );
    });

    it('sends POST body as JSON string', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success', data: [] }),
      });

      const body = { keyword: 'switch', categoryId: ['3'] };
      await callMercariApi('/search', 'POST', body);

      const callArgs = mockFetch.mock.calls[0];
      expect(JSON.parse(callArgs[1].body)).toEqual(body);
    });

    it('does not send body for GET requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success' }),
      });

      await callMercariApi('/status', 'GET');

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].body).toBeUndefined();
    });

    it('defaults to GET method when not specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success' }),
      });

      await callMercariApi('/status');

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].method).toBe('GET');
    });
  });

  // ── scrapeMercariSearch (exponential backoff) ──────────────────────────────

  describe('scrapeMercariSearch', () => {
    it('returns listings on first successful API call', async () => {
      const mockItems = [createMercariItem()];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success', data: mockItems }),
      });

      const result = await scrapeMercariSearch({ keywords: 'switch' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('m123456');
    });

    it('retries with exponential backoff on RateLimitError', async () => {
      // First call: rate limited
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve('rate limit'),
      });
      // Second call (after backoff): success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success', data: [createMercariItem()] }),
      });

      const result = await scrapeMercariSearch({ keywords: 'switch' });
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('applies exponential backoff delays of 1s, 2s, 4s between API retries', async () => {
      // All 4 API attempts rate limited (initial + 3 retries = MAX_RETRIES+1 total)
      for (let i = 0; i <= SCRAPER_CONFIG.MAX_RETRIES; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ 'content-type': 'application/json' }),
          text: () => Promise.resolve('rate limit'),
        });
      }

      // Mock Playwright fallback to return immediately
      const mockPage = {
        addInitScript: jest.fn(),
        goto: jest.fn(),
        waitForSelector: jest.fn().mockRejectedValue(new Error('timeout')),
        evaluate: jest.fn().mockResolvedValue([]),
      };
      const mockContext = { newPage: jest.fn().mockResolvedValue(mockPage) };
      chromium.launch.mockResolvedValue({
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn(),
      });

      // Spy on setTimeout to capture the delay values without altering timer behavior
      const capturedDelays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      const setTimeoutSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((fn: Parameters<typeof setTimeout>[0], delay?: number, ...args: unknown[]) => {
          if (typeof delay === 'number') capturedDelays.push(delay);
          return originalSetTimeout(fn as () => void, delay, ...args);
        });

      try {
        await scrapeMercariSearch({ keywords: 'test' });
      } finally {
        setTimeoutSpy.mockRestore();
      }

      // Verify the three exponential backoff delays were scheduled
      expect(capturedDelays).toContain(SCRAPER_CONFIG.BACKOFF_BASE_MS * Math.pow(2, 0)); // 1000ms
      expect(capturedDelays).toContain(SCRAPER_CONFIG.BACKOFF_BASE_MS * Math.pow(2, 1)); // 2000ms
      expect(capturedDelays).toContain(SCRAPER_CONFIG.BACKOFF_BASE_MS * Math.pow(2, 2)); // 4000ms
    }, 30000);

    it('falls back to Playwright after all API retries fail with rate limit', async () => {
      // All API attempts fail with rate limit
      for (let i = 0; i <= SCRAPER_CONFIG.MAX_RETRIES; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ 'content-type': 'application/json' }),
          text: () => Promise.resolve('rate limit'),
        });
      }

      // Mock Playwright browser
      const mockPage = {
        addInitScript: jest.fn(),
        goto: jest.fn(),
        waitForSelector: jest.fn().mockRejectedValue(new Error('timeout')),
        evaluate: jest.fn().mockResolvedValue([]),
        close: jest.fn(),
      };
      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn(),
      };
      const mockBrowser = {
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn(),
      };
      chromium.launch.mockResolvedValue(mockBrowser);

      const result = await scrapeMercariSearch({ keywords: 'switch' });
      expect(result).toEqual([]);
      expect(chromium.launch).toHaveBeenCalled();
    }, 30000);

    it('falls back to Playwright immediately on ExternalServiceError', async () => {
      // API fails with non-rate-limit error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve('Internal error'),
      });

      // Mock Playwright
      const mockPage = {
        addInitScript: jest.fn(),
        goto: jest.fn(),
        waitForSelector: jest.fn().mockRejectedValue(new Error('timeout')),
        evaluate: jest.fn().mockResolvedValue([
          { id: 'pw-1', name: 'Playwright Item', price: 50 },
        ]),
        close: jest.fn(),
      };
      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn(),
      };
      const mockBrowser = {
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn(),
      };
      chromium.launch.mockResolvedValue(mockBrowser);

      const result = await scrapeMercariSearch({ keywords: 'test' });
      // Only 1 API call (no retries for non-rate-limit errors)
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(chromium.launch).toHaveBeenCalled();
    }, 30000);

    it('throws RateLimitError when both API and Playwright fail', async () => {
      // All API attempts fail with rate limit
      for (let i = 0; i <= SCRAPER_CONFIG.MAX_RETRIES; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ 'content-type': 'application/json' }),
          text: () => Promise.resolve('rate limit'),
        });
      }

      // Playwright also fails
      chromium.launch.mockRejectedValue(new Error('Browser launch failed'));

      await expect(scrapeMercariSearch({ keywords: 'switch' })).rejects.toThrow(
        RateLimitError
      );
    }, 30000);

    it('throws ExternalServiceError when API fails with non-rate-limit error and Playwright also fails', async () => {
      // API fails with non-rate-limit error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve('Internal error'),
      });

      // Playwright also fails
      chromium.launch.mockRejectedValue(new Error('Browser launch failed'));

      await expect(scrapeMercariSearch({ keywords: 'switch' })).rejects.toThrow(
        ExternalServiceError
      );
    }, 30000);

    it('returns items from apiResponse.items when .data is absent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            result: 'success',
            items: [createMercariItem({ id: 'items-1' })],
          }),
      });

      const result = await scrapeMercariSearch({ keywords: 'test' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('items-1');
    });

    it('respects limit parameter capped at MAX_LIMIT', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success', data: [] }),
      });

      await scrapeMercariSearch({ keywords: 'test', limit: 100 });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.length).toBe(MAX_LIMIT);
    });

    it('uses DEFAULT_LIMIT when limit not specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success', data: [] }),
      });

      await scrapeMercariSearch({ keywords: 'test' });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.length).toBe(DEFAULT_LIMIT);
    });

    it('returns empty array when API response has neither data nor items', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success' }),
      });

      const result = await scrapeMercariSearch({ keywords: 'test' });
      expect(result).toEqual([]);
    });

    it('uses empty defaults for missing optional params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success', data: [] }),
      });

      await scrapeMercariSearch({ keywords: '' });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.keyword).toBe('');
      expect(body.categoryId).toEqual([]);
      expect(body.itemConditionId).toEqual([]);
      expect(body.sort).toBe('created_time');
      expect(body.priceMin).toBeUndefined();
      expect(body.priceMax).toBeUndefined();
    });

    it('passes all search parameters to API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success', data: [] }),
      });

      await scrapeMercariSearch({
        keywords: 'vintage camera',
        categoryId: '7',
        condition: '3',
        minPrice: 50,
        maxPrice: 200,
        sortBy: 'price_asc',
        limit: 30,
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.keyword).toBe('vintage camera');
      expect(body.categoryId).toEqual(['7']);
      expect(body.itemConditionId).toEqual(['3']);
      expect(body.priceMin).toBe(50);
      expect(body.priceMax).toBe(200);
      expect(body.sort).toBe('price_asc');
      expect(body.length).toBe(30);
    });
  });

  // ── fetchMercariListings ───────────────────────────────────────────────────

  describe('fetchMercariListings', () => {
    it('delegates to scrapeMercariSearch with capped limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success', data: [] }),
      });

      await fetchMercariListings({ keywords: 'test', limit: 100 });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.length).toBeLessThanOrEqual(MAX_LIMIT);
    });

    it('uses DEFAULT_LIMIT when limit is not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success', data: [] }),
      });

      await fetchMercariListings({ keywords: 'test' });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.length).toBe(DEFAULT_LIMIT);
    });
  });

  // ── fetchSoldListings ──────────────────────────────────────────────────────

  describe('fetchSoldListings', () => {
    it('fetches sold items for price history', async () => {
      const soldItems = [createMercariItem({ id: 'sold-1', status: 'sold_out' })];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success', data: soldItems }),
      });

      const result = await fetchSoldListings({ keywords: 'test' });
      expect(result).toHaveLength(1);
    });

    it('returns empty array on failure (does not throw)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchSoldListings({ keywords: 'test' });
      expect(result).toEqual([]);
    });

    it('returns items from .items field when .data absent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            result: 'success',
            items: [createMercariItem({ id: 'sold-items', status: 'sold_out' })],
          }),
      });

      const result = await fetchSoldListings({ keywords: 'test' });
      expect(result).toHaveLength(1);
    });

    it('passes categoryId when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success', data: [] }),
      });

      await fetchSoldListings({ keywords: 'test', categoryId: '7' });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.categoryId).toEqual(['7']);
    });

    it('uses empty string for keyword when keywords not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success', data: [] }),
      });

      await fetchSoldListings({} as any);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.keyword).toBe('');
    });

    it('returns empty array when response has neither data nor items', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success' }),
      });

      const result = await fetchSoldListings({ keywords: 'test' });
      expect(result).toEqual([]);
    });

    it('sends empty categoryId array when no categoryId provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success', data: [] }),
      });

      await fetchSoldListings({ keywords: 'test' });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.categoryId).toEqual([]);
    });
  });

  // ── normalizeCondition ─────────────────────────────────────────────────────

  describe('normalizeCondition', () => {
    it('maps condition ID 1 to "New with tags"', () => {
      const item = createMercariItem({ itemCondition: { id: '1', name: 'NWT' } });
      expect(normalizeCondition(item)).toBe('New with tags');
    });

    it('maps condition ID 2 to "New without tags"', () => {
      const item = createMercariItem({ itemCondition: { id: '2', name: 'NWOT' } });
      expect(normalizeCondition(item)).toBe('New without tags');
    });

    it('maps condition ID 3 to "Very good"', () => {
      const item = createMercariItem({ itemCondition: { id: '3', name: 'VG' } });
      expect(normalizeCondition(item)).toBe('Very good');
    });

    it('maps condition ID 4 to "Good"', () => {
      const item = createMercariItem({ itemCondition: { id: '4', name: 'G' } });
      expect(normalizeCondition(item)).toBe('Good');
    });

    it('maps condition ID 5 to "Fair"', () => {
      const item = createMercariItem({ itemCondition: { id: '5', name: 'F' } });
      expect(normalizeCondition(item)).toBe('Fair');
    });

    it('maps condition ID 6 to "Poor"', () => {
      const item = createMercariItem({ itemCondition: { id: '6', name: 'P' } });
      expect(normalizeCondition(item)).toBe('Poor');
    });

    it('falls back to condition name for unknown ID', () => {
      const item = createMercariItem({ itemCondition: { id: '99', name: 'Custom' } });
      expect(normalizeCondition(item)).toBe('Custom');
    });

    it('returns null when condition has unknown ID and no name', () => {
      const item = createMercariItem({ itemCondition: { id: '99', name: '' } });
      expect(normalizeCondition(item)).toBeNull();
    });

    it('returns null when no condition present', () => {
      const item = createMercariItem({ itemCondition: undefined });
      expect(normalizeCondition(item)).toBeNull();
    });
  });

  // ── formatLocation ─────────────────────────────────────────────────────────

  describe('formatLocation', () => {
    it('returns shipping area name', () => {
      const item = createMercariItem({ shippingFromArea: { id: '1', name: 'California' } });
      expect(formatLocation(item)).toBe('California');
    });

    it('returns null when no shipping area present', () => {
      const item = createMercariItem({ shippingFromArea: undefined });
      expect(formatLocation(item)).toBeNull();
    });

    it('returns null when shipping area name is empty', () => {
      const item = createMercariItem({ shippingFromArea: { id: '1', name: '' } });
      expect(formatLocation(item)).toBeNull();
    });
  });

  // ── collectImageUrls ──────────────────────────────────────────────────────

  describe('collectImageUrls', () => {
    it('prefers photos over thumbnails', () => {
      const item = createMercariItem({
        photos: ['https://img.mercari.com/photo1.jpg'],
        thumbnails: ['https://img.mercari.com/thumb1.jpg'],
      });
      const urls = collectImageUrls(item);
      expect(urls).toEqual(['https://img.mercari.com/photo1.jpg']);
    });

    it('falls back to thumbnails when no photos', () => {
      const item = createMercariItem({
        photos: undefined,
        thumbnails: ['https://img.mercari.com/thumb1.jpg'],
      });
      const urls = collectImageUrls(item);
      expect(urls).toEqual(['https://img.mercari.com/thumb1.jpg']);
    });

    it('returns empty array when no photos or thumbnails', () => {
      const item = createMercariItem({ photos: undefined, thumbnails: undefined });
      const urls = collectImageUrls(item);
      expect(urls).toEqual([]);
    });

    it('returns empty array for empty photos and thumbnails arrays', () => {
      const item = createMercariItem({ photos: [], thumbnails: [] });
      const urls = collectImageUrls(item);
      expect(urls).toEqual([]);
    });

    it('returns multiple photos', () => {
      const item = createMercariItem({
        photos: ['https://img1.jpg', 'https://img2.jpg', 'https://img3.jpg'],
      });
      const urls = collectImageUrls(item);
      expect(urls).toHaveLength(3);
    });
  });

  // ── buildSellerNote ────────────────────────────────────────────────────────

  describe('buildSellerNote', () => {
    it('returns seller name and positive rating percentage', () => {
      const item = createMercariItem({
        seller: { id: 's1', name: 'GreatSeller', ratings: { good: 90, normal: 8, bad: 2 } },
      });
      const note = buildSellerNote(item);
      expect(note).toBe('Seller: GreatSeller - 90% positive (100 ratings)');
    });

    it('returns "New seller (no ratings)" when total is zero', () => {
      const item = createMercariItem({
        seller: { id: 's1', name: 'NewGuy', ratings: { good: 0, normal: 0, bad: 0 } },
      });
      expect(buildSellerNote(item)).toBe('New seller (no ratings)');
    });

    it('returns null when seller has no ratings object', () => {
      const item = createMercariItem({
        seller: { id: 's1', name: 'NoRatings', ratings: undefined },
      });
      expect(buildSellerNote(item)).toBeNull();
    });

    it('returns null when no seller present', () => {
      const item = createMercariItem({ seller: undefined });
      expect(buildSellerNote(item)).toBeNull();
    });

    it('handles ratings with only some fields present', () => {
      const item = createMercariItem({
        seller: { id: 's1', name: 'Partial', ratings: { good: 10 } },
      });
      const note = buildSellerNote(item);
      expect(note).toBe('Seller: Partial - 100% positive (10 ratings)');
    });

    it('handles ratings with only bad present, good and normal default to 0', () => {
      const item = createMercariItem({
        seller: { id: 's1', name: 'BadSeller', ratings: { bad: 5 } },
      });
      const note = buildSellerNote(item);
      expect(note).toBe('Seller: BadSeller - 0% positive (5 ratings)');
    });
  });

  // ── convertMercariToRawListing ─────────────────────────────────────────────

  describe('convertMercariToRawListing', () => {
    it('converts full MercariItem to RawListing format', () => {
      const item = createMercariItem();
      const raw = convertMercariToRawListing(item);

      expect(raw.externalId).toBe('m123456');
      expect(raw.url).toBe('https://www.mercari.com/us/item/m123456/');
      expect(raw.title).toBe('Nintendo Switch Console');
      expect(raw.description).toBe('Great condition, barely used');
      expect(raw.askingPrice).toBe(199);
      expect(raw.condition).toBe('Very good');
      expect(raw.location).toBe('California');
      expect(raw.sellerName).toBe('TestSeller');
      expect(raw.sellerContact).toBeNull();
      expect(raw.imageUrls).toEqual(['https://mercari.com/photo1.jpg', 'https://mercari.com/photo2.jpg']);
      expect(raw.category).toBe('Electronics');
      expect(raw.postedAt).toBeInstanceOf(Date);
    });

    it('handles minimal item with missing optional fields', () => {
      const item = createMercariItem({
        description: undefined,
        photos: undefined,
        thumbnails: undefined,
        itemCondition: undefined,
        seller: undefined,
        shippingFromArea: undefined,
        rootCategory: undefined,
        created: undefined,
        updated: undefined,
      });
      const raw = convertMercariToRawListing(item);

      expect(raw.description).toBeNull();
      expect(raw.condition).toBeNull();
      expect(raw.location).toBeNull();
      expect(raw.sellerName).toBeNull();
      expect(raw.imageUrls).toEqual([]);
      expect(raw.category).toBeNull();
      expect(raw.postedAt).toBeNull();
    });

    it('uses updated timestamp when created is absent', () => {
      const updatedTimestamp = Math.floor(Date.now() / 1000) - 7200;
      const item = createMercariItem({
        created: undefined,
        updated: updatedTimestamp,
      });
      const raw = convertMercariToRawListing(item);

      expect(raw.postedAt).toEqual(new Date(updatedTimestamp * 1000));
    });

    it('uses created timestamp over updated when both present', () => {
      const createdTimestamp = Math.floor(Date.now() / 1000) - 3600;
      const updatedTimestamp = Math.floor(Date.now() / 1000) - 1800;
      const item = createMercariItem({
        created: createdTimestamp,
        updated: updatedTimestamp,
      });
      const raw = convertMercariToRawListing(item);

      expect(raw.postedAt).toEqual(new Date(createdTimestamp * 1000));
    });
  });

  // ── scrapeMercariWithPlaywright ────────────────────────────────────────────

  describe('scrapeMercariWithPlaywright', () => {
    function createMockPlaywright() {
      const mockPage = {
        addInitScript: jest.fn(),
        goto: jest.fn(),
        waitForSelector: jest.fn().mockRejectedValue(new Error('timeout')),
        evaluate: jest.fn().mockResolvedValue([]),
        close: jest.fn(),
      };
      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn(),
      };
      const mockBrowser = {
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn(),
      };
      chromium.launch.mockResolvedValue(mockBrowser);
      return { mockBrowser, mockContext, mockPage };
    }

    it('launches headless browser with anti-detection args', async () => {
      createMockPlaywright();

      await scrapeMercariWithPlaywright({ keywords: 'test' });

      expect(chromium.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: true,
          args: expect.arrayContaining(['--disable-blink-features=AutomationControlled']),
        })
      );
    });

    it('adds webdriver override script', async () => {
      const { mockPage } = createMockPlaywright();

      await scrapeMercariWithPlaywright({ keywords: 'test' });

      expect(mockPage.addInitScript).toHaveBeenCalled();
    });

    it('navigates to Mercari search URL with keyword and category', async () => {
      const { mockPage } = createMockPlaywright();

      await scrapeMercariWithPlaywright({ keywords: 'switch', categoryId: '3' });

      const gotoUrl = mockPage.goto.mock.calls[0][0];
      expect(gotoUrl).toContain('keyword=switch');
      expect(gotoUrl).toContain('categoryIds=3');
    });

    it('includes condition, minPrice, maxPrice, and sortBy in URL', async () => {
      const { mockPage } = createMockPlaywright();

      await scrapeMercariWithPlaywright({
        keywords: 'camera',
        condition: '3',
        minPrice: 50,
        maxPrice: 200,
        sortBy: 'price_asc',
      });

      const gotoUrl = mockPage.goto.mock.calls[0][0];
      expect(gotoUrl).toContain('itemConditionId=3');
      expect(gotoUrl).toContain('minPrice=50');
      expect(gotoUrl).toContain('maxPrice=200');
      expect(gotoUrl).toContain('sortBy=price_asc');
    });

    it('uses default sortBy when not specified', async () => {
      const { mockPage } = createMockPlaywright();

      await scrapeMercariWithPlaywright({ keywords: 'test' });

      const gotoUrl = mockPage.goto.mock.calls[0][0];
      expect(gotoUrl).toContain('sortBy=created_time');
      expect(gotoUrl).toContain('itemStatuses=on_sale');
    });

    it('converts extracted items to MercariItem format', async () => {
      const { mockPage } = createMockPlaywright();
      mockPage.evaluate.mockResolvedValue([
        { id: 'pw-item-1', name: 'Playwright Item', price: 99, imageUrl: 'https://img.jpg', url: 'https://mercari.com/item/pw-item-1/' },
      ]);

      const result = await scrapeMercariWithPlaywright({ keywords: 'test' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pw-item-1');
      expect(result[0].name).toBe('Playwright Item');
      expect(result[0].price).toBe(99);
      expect(result[0].status).toBe('on_sale');
      expect(result[0].photos).toEqual(['https://img.jpg']);
    });

    it('omits keyword from URL when keywords is empty', async () => {
      const { mockPage } = createMockPlaywright();

      await scrapeMercariWithPlaywright({ keywords: '' });

      const gotoUrl = mockPage.goto.mock.calls[0][0];
      expect(gotoUrl).not.toContain('keyword=');
    });

    it('handles items without imageUrl', async () => {
      const { mockPage } = createMockPlaywright();
      mockPage.evaluate.mockResolvedValue([
        { id: 'pw-2', name: 'No Image Item', price: 50 },
      ]);

      const result = await scrapeMercariWithPlaywright({ keywords: 'test' });

      expect(result).toHaveLength(1);
      expect(result[0].photos).toBeUndefined();
    });

    it('always closes browser in finally block', async () => {
      const mockBrowser = {
        newContext: jest.fn().mockRejectedValue(new Error('context error')),
        close: jest.fn(),
      };
      chromium.launch.mockResolvedValue(mockBrowser);

      await expect(scrapeMercariWithPlaywright({ keywords: 'test' })).rejects.toThrow();

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('sets randomized viewport within configured bounds', async () => {
      const { mockBrowser } = createMockPlaywright();

      await scrapeMercariWithPlaywright({ keywords: 'test' });

      const contextCall = mockBrowser.newContext.mock.calls[0][0];
      expect(contextCall.viewport.width).toBeGreaterThanOrEqual(SCRAPER_CONFIG.VIEWPORT_MIN_WIDTH);
      expect(contextCall.viewport.width).toBeLessThanOrEqual(SCRAPER_CONFIG.VIEWPORT_MAX_WIDTH);
      expect(contextCall.viewport.height).toBeGreaterThanOrEqual(SCRAPER_CONFIG.VIEWPORT_MIN_HEIGHT);
      expect(contextCall.viewport.height).toBeLessThanOrEqual(SCRAPER_CONFIG.VIEWPORT_MAX_HEIGHT);
    });
  });
});
