import {
  parsePrice,
  extractListingId,
  getRandomUserAgent,
  getRandomViewport,
  toRawListing,
  hasRunningJob,
  scrapeOfferUp,
  withRetry,
} from '@/scrapers/offerup';
import { USER_AGENTS, SCRAPER_CONFIG, CATEGORY_MAPPING, SUPPORTED_LOCATIONS } from '@/scrapers/offerup';

// Mock Prisma
const mockFindFirst = jest.fn();
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    scraperJob: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

// Mock sleep
jest.mock('@/lib/sleep', () => ({
  sleep: jest.fn().mockResolvedValue(undefined),
}));

// Mock Playwright
const mockGoto = jest.fn();
const mockWaitForSelector = jest.fn();
const mockEvaluate = jest.fn();
const mockAddInitScript = jest.fn();
const mockContent = jest.fn();
const mockClose = jest.fn();
const mockNewPage = jest.fn();
const mockNewContext = jest.fn();
const mockRoute = jest.fn();
const mockLaunch = jest.fn();

jest.mock('playwright', () => ({
  chromium: {
    launch: (...args: unknown[]) => mockLaunch(...args),
  },
}));

describe('OfferUp Scraper Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ legacyFakeTimers: true });

    // Default Playwright mock chain
    mockNewPage.mockResolvedValue({
      goto: mockGoto,
      waitForSelector: mockWaitForSelector,
      evaluate: mockEvaluate,
      addInitScript: mockAddInitScript,
      content: mockContent,
    });
    mockRoute.mockResolvedValue(undefined);
    mockNewContext.mockResolvedValue({
      newPage: mockNewPage,
      route: mockRoute,
    });
    mockLaunch.mockResolvedValue({
      newContext: mockNewContext,
      close: mockClose,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── barrel exports ──────────────────────────────────────────────────────────
  it('exports all constants from types module via index', () => {
    expect(CATEGORY_MAPPING).toBeDefined();
    expect(SUPPORTED_LOCATIONS).toBeDefined();
    expect(USER_AGENTS).toBeDefined();
    expect(SCRAPER_CONFIG).toBeDefined();
  });

  // ============================
  // 5.2: parsePrice
  // ============================
  describe('parsePrice', () => {
    it('parses "$500"', () => {
      expect(parsePrice('$500')).toBe(500);
    });

    it('parses "$1,500"', () => {
      expect(parsePrice('$1,500')).toBe(1500);
    });

    it('handles "Free"', () => {
      expect(parsePrice('Free')).toBe(0);
    });

    it('handles "free" (lowercase)', () => {
      expect(parsePrice('free')).toBe(0);
    });

    it('handles "negotiable"', () => {
      expect(parsePrice('negotiable')).toBe(0);
    });

    it('handles empty string', () => {
      expect(parsePrice('')).toBe(0);
    });

    it('handles null-like input', () => {
      expect(parsePrice(undefined as unknown as string)).toBe(0);
    });

    it('parses price with decimals', () => {
      expect(parsePrice('$49.99')).toBe(49.99);
    });

    it('parses price without dollar sign', () => {
      expect(parsePrice('250')).toBe(250);
    });

    it('handles whitespace-only string', () => {
      expect(parsePrice('   ')).toBe(0);
    });

    it('returns 0 for non-numeric text', () => {
      expect(parsePrice('make an offer')).toBe(0);
    });
  });

  // ============================
  // 5.3: extractListingId
  // ============================
  describe('extractListingId', () => {
    it('extracts from /item/detail/123', () => {
      expect(extractListingId('https://offerup.com/item/detail/123')).toBe('123');
    });

    it('extracts from /item/detail/1234567890', () => {
      expect(extractListingId('https://offerup.com/item/detail/1234567890')).toBe('1234567890');
    });

    it('extracts trailing number from alternative URL', () => {
      expect(extractListingId('https://offerup.com/listing/12345/')).toBe('12345');
    });

    it('extracts trailing number without slash', () => {
      expect(extractListingId('https://offerup.com/listing/12345')).toBe('12345');
    });

    it('falls back to full URL when no number found', () => {
      const url = 'https://offerup.com/some-listing-slug';
      expect(extractListingId(url)).toBe(url);
    });
  });

  // ============================
  // 5.4: getRandomUserAgent
  // ============================
  describe('getRandomUserAgent', () => {
    it('returns a string from the pool', () => {
      const ua = getRandomUserAgent();
      expect(USER_AGENTS).toContain(ua);
    });

    it('pool has >= 6 agents', () => {
      expect(USER_AGENTS.length).toBeGreaterThanOrEqual(6);
    });

    it('all agents are Chrome 130+', () => {
      for (const ua of USER_AGENTS) {
        const match = ua.match(/Chrome\/(\d+)/);
        expect(match).not.toBeNull();
        expect(Number(match![1])).toBeGreaterThanOrEqual(130);
      }
    });
  });

  // ============================
  // 5.5: toRawListing
  // ============================
  describe('toRawListing', () => {
    it('maps full OfferUpItem to RawListing', () => {
      const item = {
        title: 'iPhone 15',
        price: 500,
        url: 'https://offerup.com/item/detail/123',
        location: 'Tampa',
        externalId: '123',
        description: 'Great phone',
        imageUrls: ['img1.jpg', 'img2.jpg'],
        postedAt: new Date('2026-01-01'),
        condition: 'Good',
        sellerName: 'John',
      };

      const raw = toRawListing(item, 'tampa-fl');

      expect(raw.externalId).toBe('123');
      expect(raw.url).toBe('https://offerup.com/item/detail/123');
      expect(raw.title).toBe('iPhone 15');
      expect(raw.description).toBe('Great phone');
      expect(raw.askingPrice).toBe(500);
      expect(raw.condition).toBe('Good');
      expect(raw.location).toBe('Tampa');
      expect(raw.sellerName).toBe('John');
      expect(raw.sellerContact).toBeNull();
      expect(raw.imageUrls).toEqual(['img1.jpg', 'img2.jpg']);
      expect(raw.category).toBeNull();
      expect(raw.postedAt).toEqual(new Date('2026-01-01'));
    });

    it('maps partial OfferUpItem with null defaults', () => {
      const item = {
        title: 'Chair',
        price: 50,
        url: 'https://offerup.com/item/detail/456',
        location: '',
        externalId: '456',
      };

      const raw = toRawListing(item, 'orlando-fl');

      expect(raw.description).toBeNull();
      expect(raw.condition).toBeNull();
      expect(raw.location).toBe('orlando-fl'); // fallback to search location
      expect(raw.sellerName).toBeNull();
      expect(raw.sellerContact).toBeNull();
      expect(raw.imageUrls).toEqual([]);
      expect(raw.postedAt).toBeNull();
    });
  });

  // ============================
  // 5.6: scrapeOfferUp success path
  // ============================
  describe('scrapeOfferUp', () => {
    it('scrapes successfully with mocked Playwright', async () => {
      mockGoto.mockResolvedValue(undefined);
      mockWaitForSelector.mockResolvedValue(undefined);
      mockContent.mockResolvedValue('<html></html>');
      mockEvaluate.mockResolvedValue([
        {
          title: 'iPhone 15',
          price: '$500',
          url: 'https://offerup.com/item/detail/123',
          location: 'Tampa',
          imageUrl: 'img.jpg',
          condition: 'Good',
        },
      ]);

      jest.useRealTimers();
      const result = await scrapeOfferUp({ location: 'tampa-fl' });

      expect(result.success).toBe(true);
      expect(result.listings).toHaveLength(1);
      expect(result.listings[0].title).toBe('iPhone 15');
      expect(result.listings[0].price).toBe(500);
      expect(result.listings[0].externalId).toBe('123');
      expect(result.totalFound).toBe(1);

      // Verify browser launch args
      expect(mockLaunch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: true,
          args: expect.arrayContaining(['--disable-blink-features=AutomationControlled']),
        })
      );

      // Verify resource blocking
      expect(mockRoute).toHaveBeenCalledTimes(3);

      // Verify addInitScript called (webdriver override)
      expect(mockAddInitScript).toHaveBeenCalledTimes(1);

      // Verify browser cleanup
      expect(mockClose).toHaveBeenCalled();
    });

    // ============================
    // 5.7: block/captcha detection
    // ============================
    it('returns blocked failure when captcha detected', async () => {
      mockGoto.mockResolvedValue(undefined);
      mockWaitForSelector.mockResolvedValue(undefined);
      mockContent.mockResolvedValue('<html>captcha detected</html>');

      jest.useRealTimers();
      const result = await scrapeOfferUp({ location: 'tampa-fl' });

      expect(result.success).toBe(false);
      expect(result.failureReason).toBe('blocked');
      expect(result.error).toContain('blocked');
    });

    it('returns blocked failure when Access Denied', async () => {
      mockGoto.mockResolvedValue(undefined);
      mockWaitForSelector.mockResolvedValue(undefined);
      mockContent.mockResolvedValue('<html>Access Denied</html>');

      jest.useRealTimers();
      const result = await scrapeOfferUp({ location: 'tampa-fl' });

      expect(result.success).toBe(false);
      expect(result.failureReason).toBe('blocked');
    });

    it('returns unknown failure for unexpected errors', async () => {
      mockLaunch.mockRejectedValue(new Error('Unexpected playwright crash'));

      jest.useRealTimers();
      const result = await scrapeOfferUp({ location: 'tampa-fl' });

      expect(result.success).toBe(false);
      expect(result.failureReason).toBe('unknown');
      expect(result.error).toContain('Unexpected playwright crash');
    });

    // ============================
    // 5.8: session timeout
    // ============================
    it('returns timeout failure when session exceeds 60s', async () => {
      // Make the scrape hang indefinitely
      mockGoto.mockImplementation(() => new Promise(() => {}));

      const scrapePromise = scrapeOfferUp({ location: 'tampa-fl' });

      // Advance timers past the 60s session timeout
      jest.advanceTimersByTime(SCRAPER_CONFIG.SESSION_TIMEOUT_MS + 1000);

      const result = await scrapePromise;

      expect(result.success).toBe(false);
      expect(result.failureReason).toBe('timeout');
      expect(result.error).toContain('timeout');
    });

    // ============================
    // 5.10: viewport randomization
    // ============================
    it('verifies viewport within bounds', async () => {
      mockGoto.mockResolvedValue(undefined);
      mockWaitForSelector.mockResolvedValue(undefined);
      mockContent.mockResolvedValue('<html></html>');
      mockEvaluate.mockResolvedValue([]);

      jest.useRealTimers();
      await scrapeOfferUp({ location: 'tampa-fl' });

      // Check that newContext was called with a viewport in valid range
      const contextCall = mockNewContext.mock.calls[0][0];
      expect(contextCall.viewport.width).toBeGreaterThanOrEqual(SCRAPER_CONFIG.VIEWPORT_MIN_WIDTH);
      expect(contextCall.viewport.width).toBeLessThanOrEqual(SCRAPER_CONFIG.VIEWPORT_MAX_WIDTH);
      expect(contextCall.viewport.height).toBeGreaterThanOrEqual(SCRAPER_CONFIG.VIEWPORT_MIN_HEIGHT);
      expect(contextCall.viewport.height).toBeLessThanOrEqual(SCRAPER_CONFIG.VIEWPORT_MAX_HEIGHT);
    });

    it('uses location fallback when listing has no location', async () => {
      mockGoto.mockResolvedValue(undefined);
      mockWaitForSelector.mockResolvedValue(undefined);
      mockContent.mockResolvedValue('<html></html>');
      mockEvaluate.mockResolvedValue([
        {
          title: 'No Location Item',
          price: '$100',
          url: 'https://offerup.com/item/detail/999',
          location: '',
        },
      ]);

      jest.useRealTimers();
      const result = await scrapeOfferUp({ location: 'tampa-fl' });

      expect(result.success).toBe(true);
      expect(result.listings[0].location).toBe('tampa-fl');
    });

    it('handles waitForSelector timeout gracefully', async () => {
      mockGoto.mockResolvedValue(undefined);
      mockWaitForSelector.mockRejectedValue(new Error('Timeout'));
      mockContent.mockResolvedValue('<html>normal page</html>');
      mockEvaluate.mockResolvedValue([
        {
          title: 'Found Item',
          price: '$30',
          url: 'https://offerup.com/item/detail/777',
          location: 'Tampa',
        },
      ]);

      jest.useRealTimers();
      const result = await scrapeOfferUp({ location: 'tampa-fl' });

      expect(result.success).toBe(true);
      expect(result.listings).toHaveLength(1);
    });

    it('builds correct URL with category and search params', async () => {
      mockGoto.mockResolvedValue(undefined);
      mockWaitForSelector.mockResolvedValue(undefined);
      mockContent.mockResolvedValue('<html></html>');
      mockEvaluate.mockResolvedValue([]);

      jest.useRealTimers();
      await scrapeOfferUp({
        location: 'tampa-fl',
        category: 'electronics',
        keywords: 'iphone',
        minPrice: 100,
        maxPrice: 500,
      });

      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining('offerup.com/search/tampa-fl'),
        expect.anything()
      );
      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining('q=iphone'),
        expect.anything()
      );
      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining('price_min=100'),
        expect.anything()
      );
      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining('price_max=500'),
        expect.anything()
      );
      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining('catid=electronics'),
        expect.anything()
      );
    });
  });

  // ============================
  // 5.9: withRetry
  // ============================
  describe('withRetry', () => {
    it('returns on first success', async () => {
      jest.useRealTimers();
      const fn = jest.fn().mockResolvedValue('ok');
      const result = await withRetry(fn, 3);
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on failure and succeeds', async () => {
      jest.useRealTimers();
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockResolvedValueOnce('ok');
      const result = await withRetry(fn, 3);
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('throws last error after all retries exhausted', async () => {
      jest.useRealTimers();
      const fn = jest.fn().mockRejectedValue(new Error('persistent failure'));
      await expect(withRetry(fn, 3)).rejects.toThrow('persistent failure');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('handles non-Error thrown values', async () => {
      jest.useRealTimers();
      const fn = jest.fn().mockRejectedValue('string error');
      await expect(withRetry(fn, 1)).rejects.toThrow('string error');
    });

    it('uses exponential backoff delays', async () => {
      jest.useRealTimers();
      const { sleep: mockSleep } = require('@/lib/sleep');
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('ok');

      await withRetry(fn, 3);

      // Verify exponential backoff: BACKOFF_BASE_MS * 1, BACKOFF_BASE_MS * 2
      expect(mockSleep).toHaveBeenCalledTimes(2);
      expect(mockSleep).toHaveBeenNthCalledWith(1, SCRAPER_CONFIG.BACKOFF_BASE_MS * 1);
      expect(mockSleep).toHaveBeenNthCalledWith(2, SCRAPER_CONFIG.BACKOFF_BASE_MS * 2);
    });
  });

  // ============================
  // 5.10: getRandomViewport
  // ============================
  describe('getRandomViewport', () => {
    it('returns width within bounds', () => {
      for (let i = 0; i < 20; i++) {
        const vp = getRandomViewport();
        expect(vp.width).toBeGreaterThanOrEqual(SCRAPER_CONFIG.VIEWPORT_MIN_WIDTH);
        expect(vp.width).toBeLessThanOrEqual(SCRAPER_CONFIG.VIEWPORT_MAX_WIDTH);
      }
    });

    it('returns height within bounds', () => {
      for (let i = 0; i < 20; i++) {
        const vp = getRandomViewport();
        expect(vp.height).toBeGreaterThanOrEqual(SCRAPER_CONFIG.VIEWPORT_MIN_HEIGHT);
        expect(vp.height).toBeLessThanOrEqual(SCRAPER_CONFIG.VIEWPORT_MAX_HEIGHT);
      }
    });
  });

  // ============================
  // hasRunningJob
  // ============================
  describe('hasRunningJob', () => {
    it('returns true when running job exists', async () => {
      jest.useRealTimers();
      mockFindFirst.mockResolvedValue({ id: 'job-1' });
      expect(await hasRunningJob('user-1', 'OFFERUP')).toBe(true);
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1', platform: 'OFFERUP', status: 'RUNNING' },
      });
    });

    it('returns false when no running job', async () => {
      jest.useRealTimers();
      mockFindFirst.mockResolvedValue(null);
      expect(await hasRunningJob('user-1', 'OFFERUP')).toBe(false);
    });
  });
});
