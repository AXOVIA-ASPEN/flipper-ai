import {
  parsePrice,
  extractListingId,
  getRandomUserAgent,
  toRawListing,
  hasRunningJob,
  scrapeCraigslist,
} from '@/scrapers/craigslist';
import { USER_AGENTS, SCRAPER_CONFIG, CATEGORY_PATHS, SUPPORTED_LOCATIONS } from '@/scrapers/craigslist';

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

// Mock Playwright
const mockGoto = jest.fn();
const mockWaitForSelector = jest.fn();
const mockEvaluate = jest.fn();
const mockAddInitScript = jest.fn();
const mockClose = jest.fn();
const mockNewPage = jest.fn();
const mockNewContext = jest.fn();
const mockLaunch = jest.fn();

jest.mock('playwright', () => ({
  chromium: {
    launch: (...args: unknown[]) => mockLaunch(...args),
  },
}));

describe('craigslist barrel exports from index', () => {
  it('exports all constants from types module', () => {
    expect(CATEGORY_PATHS).toBeDefined();
    expect(SUPPORTED_LOCATIONS).toBeDefined();
    expect(USER_AGENTS).toBeDefined();
    expect(SCRAPER_CONFIG).toBeDefined();
  });
});

describe('Craigslist Scraper Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default Playwright mock chain
    mockNewPage.mockResolvedValue({
      goto: mockGoto,
      waitForSelector: mockWaitForSelector,
      evaluate: mockEvaluate,
      addInitScript: mockAddInitScript,
    });
    mockNewContext.mockResolvedValue({
      newPage: mockNewPage,
    });
    mockLaunch.mockResolvedValue({
      newContext: mockNewContext,
      close: mockClose,
    });
  });

  // ============================
  // 5.1: parsePrice edge cases
  // ============================
  describe('parsePrice', () => {
    it('parses "$1,234" correctly', () => {
      expect(parsePrice('$1,234')).toBe(1234);
    });

    it('parses "1234" without dollar sign', () => {
      expect(parsePrice('1234')).toBe(1234);
    });

    it('parses "$0" as 0', () => {
      expect(parsePrice('$0')).toBe(0);
    });

    it('parses "free" as 0', () => {
      expect(parsePrice('free')).toBe(0);
    });

    it('parses "negotiable" as 0', () => {
      expect(parsePrice('negotiable')).toBe(0);
    });

    it('parses empty string as 0', () => {
      expect(parsePrice('')).toBe(0);
    });

    it('parses "$12.50" with cents', () => {
      expect(parsePrice('$12.50')).toBe(12.50);
    });

    it('parses "$10,500.99" with commas and cents', () => {
      expect(parsePrice('$10,500.99')).toBe(10500.99);
    });

    it('parses "FREE" (uppercase) as 0', () => {
      expect(parsePrice('FREE')).toBe(0);
    });

    it('parses "$100" standard price', () => {
      expect(parsePrice('$100')).toBe(100);
    });

    it('parses text with no numeric content as 0', () => {
      expect(parsePrice('contact for price')).toBe(0);
    });

    it('parses "Negotiable" (capitalized) as 0', () => {
      expect(parsePrice('Negotiable')).toBe(0);
    });
  });

  // ============================
  // 5.2: extractListingId
  // ============================
  describe('extractListingId', () => {
    it('extracts ID from standard Craigslist URL', () => {
      expect(
        extractListingId('https://sarasota.craigslist.org/ele/d/iphone-15-pro/7654321098.html')
      ).toBe('7654321098');
    });

    it('extracts ID from URL with different category path', () => {
      expect(
        extractListingId('https://sfbay.craigslist.org/sfc/fuo/d/couch/1234567890.html')
      ).toBe('1234567890');
    });

    it('extracts ID from URL with path-only numeric segment', () => {
      expect(extractListingId('https://craigslist.org/listing/9876543210')).toBe('9876543210');
    });

    it('returns full URL when no ID pattern matches', () => {
      const url = 'https://craigslist.org/some/path';
      expect(extractListingId(url)).toBe(url);
    });

    it('handles URL with multiple numeric segments (takes .html match first)', () => {
      expect(
        extractListingId('https://city.craigslist.org/d/title-123/7777777777.html')
      ).toBe('7777777777');
    });
  });

  // ============================
  // 5.3: User agent rotation
  // ============================
  describe('getRandomUserAgent', () => {
    it('returns a string from the UA pool', () => {
      const ua = getRandomUserAgent();
      expect(USER_AGENTS).toContain(ua);
    });

    it('returns UAs with Chrome 130+ version', () => {
      for (const ua of USER_AGENTS) {
        const versionMatch = ua.match(/Chrome\/(\d+)/);
        expect(versionMatch).not.toBeNull();
        const version = parseInt(versionMatch![1], 10);
        expect(version).toBeGreaterThanOrEqual(130);
      }
    });

    it('has at least 5 user agents in pool', () => {
      expect(USER_AGENTS.length).toBeGreaterThanOrEqual(5);
    });

    it('provides rotation (multiple calls can return different UAs)', () => {
      const results = new Set<string>();
      // Call enough times to reasonably expect variation
      for (let i = 0; i < 100; i++) {
        results.add(getRandomUserAgent());
      }
      // With 6 UAs, 100 calls should hit at least 2 different ones
      expect(results.size).toBeGreaterThan(1);
    });
  });

  // ============================
  // 5.4: Data normalization to RawListing
  // ============================
  describe('toRawListing', () => {
    it('converts CraigslistItem to RawListing format', () => {
      const item = {
        title: 'iPhone 15 Pro',
        price: 800,
        url: 'https://sarasota.craigslist.org/ele/d/iphone/1234567890.html',
        location: 'Sarasota, FL',
        externalId: '1234567890',
        description: 'Great condition iPhone',
        condition: 'good',
        imageUrls: ['https://images.craigslist.org/abc.jpg'],
      };

      const raw = toRawListing(item);

      expect(raw).toEqual({
        externalId: '1234567890',
        url: 'https://sarasota.craigslist.org/ele/d/iphone/1234567890.html',
        title: 'iPhone 15 Pro',
        description: 'Great condition iPhone',
        askingPrice: 800,
        condition: 'good',
        location: 'Sarasota, FL',
        sellerName: null,
        sellerContact: null,
        imageUrls: ['https://images.craigslist.org/abc.jpg'],
        category: null,
        postedAt: null,
      });
    });

    it('handles missing optional fields', () => {
      const item = {
        title: 'Test Item',
        price: 50,
        url: 'https://test.craigslist.org/1111.html',
        location: 'Test',
        externalId: '1111',
      };

      const raw = toRawListing(item);

      expect(raw.description).toBeNull();
      expect(raw.condition).toBeNull();
      expect(raw.imageUrls).toEqual([]);
      expect(raw.sellerName).toBeNull();
      expect(raw.sellerContact).toBeNull();
      expect(raw.category).toBeNull();
      expect(raw.postedAt).toBeNull();
    });

    it('maps price to askingPrice', () => {
      const item = {
        title: 'Item',
        price: 299.99,
        url: 'https://test.craigslist.org/2222.html',
        location: 'Test',
        externalId: '2222',
      };

      expect(toRawListing(item).askingPrice).toBe(299.99);
    });
  });

  // ============================
  // 5.5: Zero-results detection
  // ============================
  describe('scrapeCraigslist - zero results detection', () => {
    it('returns selector_failure_suspected when page loads but 0 listings found', async () => {
      mockGoto.mockResolvedValue(undefined);
      mockWaitForSelector.mockRejectedValue(new Error('timeout'));
      // Page loaded successfully but no listings found
      mockEvaluate
        .mockResolvedValueOnce(200) // statusCode check
        .mockResolvedValueOnce([]); // empty listings

      const result = await scrapeCraigslist({
        location: 'sarasota',
        category: 'electronics',
      });

      expect(result.success).toBe(false);
      expect(result.failureReason).toBe('selector_failure_suspected');
      expect(result.listings).toHaveLength(0);
    });

    it('returns navigation_error on page load failure', async () => {
      mockGoto.mockRejectedValue(new Error('net::ERR_CONNECTION_REFUSED'));

      const result = await scrapeCraigslist({
        location: 'sarasota',
        category: 'electronics',
      });

      expect(result.success).toBe(false);
      expect(result.failureReason).toBe('navigation_error');
    });
  });

  // ============================
  // 5.6: Concurrent job guard
  // ============================
  describe('hasRunningJob', () => {
    it('returns true if a RUNNING job exists for user+platform', async () => {
      mockFindFirst.mockResolvedValue({ id: 'existing-job', status: 'RUNNING' });

      const result = await hasRunningJob('user-123', 'CRAIGSLIST');

      expect(result).toBe(true);
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          platform: 'CRAIGSLIST',
          status: 'RUNNING',
        },
      });
    });

    it('returns false if no RUNNING job exists', async () => {
      mockFindFirst.mockResolvedValue(null);

      const result = await hasRunningJob('user-123', 'CRAIGSLIST');

      expect(result).toBe(false);
    });

    it('checks the correct platform', async () => {
      mockFindFirst.mockResolvedValue(null);

      await hasRunningJob('user-456', 'FACEBOOK_MARKETPLACE');

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-456',
          platform: 'FACEBOOK_MARKETPLACE',
          status: 'RUNNING',
        },
      });
    });
  });

  // ============================
  // 5.7: Scraper with mocked Playwright
  // ============================
  describe('scrapeCraigslist - integration with mocked Playwright', () => {
    it('successfully scrapes listings and returns CraigslistItems', async () => {
      mockGoto.mockResolvedValue(undefined);
      mockWaitForSelector.mockResolvedValue(undefined);
      mockEvaluate
        .mockResolvedValueOnce(200) // statusCode check returns OK
        .mockResolvedValueOnce([
          // listings extraction
          {
            title: 'Samsung TV 65"',
            price: '$350',
            url: 'https://sarasota.craigslist.org/ele/d/samsung-tv/9876543210.html',
            location: 'Sarasota',
            imageUrl: 'https://images.craigslist.org/tv.jpg',
            description: 'Like new Samsung TV',
          },
          {
            title: 'iPad Pro 12.9',
            price: '$600',
            url: 'https://sarasota.craigslist.org/ele/d/ipad-pro/1111111111.html',
            location: 'Bradenton',
            imageUrl: '',
            description: '',
          },
        ]);

      const result = await scrapeCraigslist({
        location: 'sarasota',
        category: 'electronics',
        keywords: 'tv',
        minPrice: 100,
        maxPrice: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.listings).toHaveLength(2);
      expect(result.totalFound).toBe(2);

      // First listing
      expect(result.listings[0].title).toBe('Samsung TV 65"');
      expect(result.listings[0].price).toBe(350);
      expect(result.listings[0].externalId).toBe('9876543210');
      expect(result.listings[0].location).toBe('Sarasota');
      expect(result.listings[0].imageUrls).toEqual(['https://images.craigslist.org/tv.jpg']);
      expect(result.listings[0].description).toBe('Like new Samsung TV');
      expect(result.listings[0].condition).toBe('like new');

      // Second listing
      expect(result.listings[1].title).toBe('iPad Pro 12.9');
      expect(result.listings[1].price).toBe(600);
      expect(result.listings[1].externalId).toBe('1111111111');
    });

    it('always closes browser even on error', async () => {
      mockGoto.mockRejectedValue(new Error('Network error'));

      await scrapeCraigslist({
        location: 'sarasota',
        category: 'electronics',
      });

      expect(mockClose).toHaveBeenCalled();
    });

    it('launches browser with anti-detection args', async () => {
      mockGoto.mockResolvedValue(undefined);
      mockWaitForSelector.mockResolvedValue(undefined);
      mockEvaluate
        .mockResolvedValueOnce(200)
        .mockResolvedValueOnce([
          {
            title: 'Test',
            price: '$100',
            url: 'https://test.craigslist.org/1234.html',
            location: 'Test',
            imageUrl: '',
            description: '',
          },
        ]);

      await scrapeCraigslist({ location: 'sarasota', category: 'electronics' });

      expect(mockLaunch).toHaveBeenCalledWith({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled'],
      });
    });

    it('sets navigator.webdriver override via addInitScript', async () => {
      mockGoto.mockResolvedValue(undefined);
      mockWaitForSelector.mockResolvedValue(undefined);
      mockEvaluate
        .mockResolvedValueOnce(200)
        .mockResolvedValueOnce([
          {
            title: 'Test',
            price: '$100',
            url: 'https://test.craigslist.org/1234.html',
            location: 'Test',
            imageUrl: '',
            description: '',
          },
        ]);

      await scrapeCraigslist({ location: 'sarasota', category: 'electronics' });

      expect(mockAddInitScript).toHaveBeenCalled();
    });

    it('retries navigation on timeout', async () => {
      // First attempt times out, second succeeds
      mockGoto
        .mockRejectedValueOnce(new Error('Timeout exceeded'))
        .mockResolvedValueOnce(undefined);
      mockWaitForSelector.mockResolvedValue(undefined);
      mockEvaluate
        .mockResolvedValueOnce(200)
        .mockResolvedValueOnce([
          {
            title: 'Test After Retry',
            price: '$50',
            url: 'https://test.craigslist.org/5555.html',
            location: 'Test',
            imageUrl: '',
            description: '',
          },
        ]);

      const result = await scrapeCraigslist({
        location: 'sarasota',
        category: 'electronics',
      });

      expect(result.success).toBe(true);
      expect(mockGoto).toHaveBeenCalledTimes(2);
    });

    it('handles rate limiting with backoff retry then gives up', async () => {
      mockGoto.mockResolvedValue(undefined);
      mockWaitForSelector.mockResolvedValue(undefined);
      // First check: blocked, reload, second check: still blocked → give up
      mockEvaluate
        .mockResolvedValueOnce(403) // first rate limit check
        .mockResolvedValueOnce(403); // second rate limit check after backoff

      const result = await scrapeCraigslist({
        location: 'sarasota',
        category: 'electronics',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('backoff');
      // Should have retried navigation after first 403
      expect(mockGoto).toHaveBeenCalledTimes(2);
    });

    it('fails when page reload throws during rate-limit backoff', async () => {
      // Initial navigation succeeds, rate-limit check returns 403,
      // then the reload attempt throws
      mockGoto
        .mockResolvedValueOnce(undefined) // initial navigation
        .mockRejectedValueOnce(new Error('Network error')); // reload after backoff
      mockWaitForSelector.mockResolvedValue(undefined);
      mockEvaluate.mockResolvedValueOnce(403); // rate-limit check → blocked

      const result = await scrapeCraigslist({
        location: 'sarasota',
        category: 'electronics',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('reload failed');
      expect(result.failureReason).toBe('navigation_error');
    });

    it('recovers from rate limiting after backoff', async () => {
      mockGoto.mockResolvedValue(undefined);
      mockWaitForSelector.mockResolvedValue(undefined);
      // First check: blocked, after backoff reload: OK, then listings
      mockEvaluate
        .mockResolvedValueOnce(403) // first rate limit check — blocked
        .mockResolvedValueOnce(200) // second check after backoff — OK
        .mockResolvedValueOnce([    // listings extraction
          {
            title: 'Test After Backoff',
            price: '$100',
            url: 'https://test.craigslist.org/1234.html',
            location: 'Test',
            imageUrl: '',
            description: '',
          },
        ]);

      const result = await scrapeCraigslist({
        location: 'sarasota',
        category: 'electronics',
      });

      expect(result.success).toBe(true);
      expect(result.listings).toHaveLength(1);
      expect(result.listings[0].title).toBe('Test After Backoff');
    });

    it('uses randomized viewport dimensions', async () => {
      mockGoto.mockResolvedValue(undefined);
      mockWaitForSelector.mockResolvedValue(undefined);
      mockEvaluate
        .mockResolvedValueOnce(200)
        .mockResolvedValueOnce([
          {
            title: 'Test',
            price: '$100',
            url: 'https://test.craigslist.org/1234.html',
            location: 'Test',
            imageUrl: '',
            description: '',
          },
        ]);

      await scrapeCraigslist({ location: 'sarasota', category: 'electronics' });

      const contextCall = mockNewContext.mock.calls[0][0];
      expect(contextCall.viewport.width).toBeGreaterThanOrEqual(SCRAPER_CONFIG.VIEWPORT_MIN_WIDTH);
      expect(contextCall.viewport.width).toBeLessThanOrEqual(SCRAPER_CONFIG.VIEWPORT_MAX_WIDTH);
      expect(contextCall.viewport.height).toBeGreaterThanOrEqual(
        SCRAPER_CONFIG.VIEWPORT_MIN_HEIGHT
      );
      expect(contextCall.viewport.height).toBeLessThanOrEqual(SCRAPER_CONFIG.VIEWPORT_MAX_HEIGHT);
    });

    it('parses condition from listing text', async () => {
      mockGoto.mockResolvedValue(undefined);
      mockWaitForSelector.mockResolvedValue(undefined);
      mockEvaluate
        .mockResolvedValueOnce(200)
        .mockResolvedValueOnce([
          {
            title: 'Brand New iPhone 15',
            price: '$800',
            url: 'https://test.craigslist.org/a1.html',
            location: 'Test',
            imageUrl: '',
            description: 'Still sealed in box',
          },
          {
            title: 'Used Laptop for parts',
            price: '$50',
            url: 'https://test.craigslist.org/a2.html',
            location: 'Test',
            imageUrl: '',
            description: 'Broken screen, as-is',
          },
        ]);

      const result = await scrapeCraigslist({ location: 'sarasota', category: 'electronics' });

      expect(result.listings[0].condition).toBe('new');
      expect(result.listings[1].condition).toBe('salvage');
    });
  });

  // ============================
  // Session timeout
  // ============================
  describe('scrapeCraigslist - session timeout', () => {
    it('times out after SESSION_TIMEOUT_MS', async () => {
      // Make browser launch hang indefinitely
      mockLaunch.mockImplementation(
        () =>
          new Promise((resolve) => {
            // Never resolve — simulates a stuck browser launch
            setTimeout(resolve, 120_000);
          })
      );

      // Override the session timeout to something short for testing
      const originalTimeout = SCRAPER_CONFIG.SESSION_TIMEOUT_MS;
      Object.defineProperty(SCRAPER_CONFIG, 'SESSION_TIMEOUT_MS', {
        value: 100,
        writable: true,
        configurable: true,
      });

      const result = await scrapeCraigslist({
        location: 'sarasota',
        category: 'electronics',
      });

      expect(result.success).toBe(false);
      expect(result.failureReason).toBe('timeout');

      // Restore
      Object.defineProperty(SCRAPER_CONFIG, 'SESSION_TIMEOUT_MS', {
        value: originalTimeout,
        writable: true,
        configurable: true,
      });
    });
  });
});
