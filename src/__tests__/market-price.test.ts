// Tests for market-price.ts
// We mock Playwright to avoid actual browser usage

jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn().mockResolvedValue(undefined),
          waitForSelector: jest.fn().mockResolvedValue(undefined),
          evaluate: jest.fn().mockResolvedValue([
            {
              title: 'iPhone 14 Pro 256GB',
              price: '$500.00',
              shipping: 'Free shipping',
              condition: 'Used',
              url: 'https://ebay.com/1',
              soldDate: '',
            },
            {
              title: 'iPhone 14 Pro 256GB Blue',
              price: '$520.00',
              shipping: '+$10.00 shipping',
              condition: 'Used',
              url: 'https://ebay.com/2',
              soldDate: '',
            },
            {
              title: 'iPhone 14 Pro 128GB',
              price: '$450.00',
              shipping: 'Free shipping',
              condition: 'Used',
              url: 'https://ebay.com/3',
              soldDate: '',
            },
          ]),
        }),
        close: jest.fn().mockResolvedValue(undefined),
      }),
      close: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

import { fetchMarketPrice, fetchMarketPricesBatch, closeBrowser, parseEbayPrice, median, buildEbaySoldUrl } from '../lib/market-price';

describe('market-price', () => {
  afterAll(async () => {
    await closeBrowser();
  });

  describe('fetchMarketPrice', () => {
    it('returns market data for a valid query', async () => {
      const result = await fetchMarketPrice('iPhone 14 Pro 256GB');
      expect(result).not.toBeNull();
      expect(result?.source).toBe('ebay_scrape');
      expect(result?.soldListings.length).toBeGreaterThan(0);
      expect(result?.medianPrice).toBeGreaterThan(0);
      expect(result?.searchQuery).toBe('iPhone 14 Pro 256GB');
    });

    it('includes category in search when provided', async () => {
      const result = await fetchMarketPrice('iPhone 14 Pro', 'electronics');
      expect(result).not.toBeNull();
    });

    it('calculates median, low, high, avg correctly', async () => {
      const result = await fetchMarketPrice('iPhone 14 Pro 256GB');
      expect(result).not.toBeNull();
      expect(result!.lowPrice).toBeLessThanOrEqual(result!.medianPrice);
      expect(result!.highPrice).toBeGreaterThanOrEqual(result!.medianPrice);
      expect(result!.salesCount).toBe(3);
    });
  });

  describe('fetchMarketPricesBatch', () => {
    it('processes multiple queries', async () => {
      const results = await fetchMarketPricesBatch([
        { searchQuery: 'iPhone 14 Pro' },
        { searchQuery: 'Samsung TV', category: 'electronics' },
      ]);
      expect(results).toHaveLength(2);
    });
  });

  describe('closeBrowser', () => {
    it('closes without error', async () => {
      await expect(closeBrowser()).resolves.not.toThrow();
    });

    it('resets browser instance so next call creates new browser', async () => {
      const { chromium } = require('playwright');
      chromium.launch.mockClear();

      // First call should launch a browser
      await fetchMarketPrice('test 1');
      const firstCallCount = chromium.launch.mock.calls.length;
      expect(firstCallCount).toBeGreaterThan(0);

      // Second call should reuse the browser (no new launch)
      await fetchMarketPrice('test 2');
      expect(chromium.launch.mock.calls.length).toBe(firstCallCount);

      // Close browser
      await closeBrowser();

      // Next call should launch a new browser
      chromium.launch.mockClear();
      await fetchMarketPrice('test 3');
      expect(chromium.launch).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('returns null when no listings are found (empty evaluate)', async () => {
      // Re-mock with empty results
      const { chromium } = require('playwright');
      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        waitForSelector: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockResolvedValue([]),
      };
      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };
      chromium.launch.mockResolvedValue({
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined),
      });

      // Need fresh module to pick up new mock
      await closeBrowser(); // Reset browser instance
      const result = await fetchMarketPrice('nonexistent_item_xyz_123');
      expect(result).toBeNull();
    });

    it('returns null when all prices are zero', async () => {
      const { chromium } = require('playwright');
      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        waitForSelector: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockResolvedValue([
          {
            title: 'Item',
            price: '$0.00',
            shipping: 'Free',
            condition: 'Used',
            url: 'https://ebay.com/x',
            soldDate: '',
          },
        ]),
      };
      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };
      chromium.launch.mockResolvedValue({
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined),
      });

      await closeBrowser();
      const result = await fetchMarketPrice('zero price item');
      expect(result).toBeNull();
    });

    it('handles page.goto error gracefully', async () => {
      const { chromium } = require('playwright');
      const mockContext = {
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn().mockRejectedValue(new Error('timeout')),
          waitForSelector: jest.fn(),
          evaluate: jest.fn(),
        }),
        close: jest.fn().mockResolvedValue(undefined),
      };
      chromium.launch.mockResolvedValue({
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined),
      });

      await closeBrowser();
      const result = await fetchMarketPrice('error item');
      expect(result).toBeNull();
    });

    it('handles parseEbayPrice with no valid number', async () => {
      const { chromium } = require('playwright');
      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        waitForSelector: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockResolvedValue([
          {
            title: 'Item',
            price: 'no-price-here',
            shipping: 'no shipping info',
            condition: 'Used',
            url: 'https://ebay.com/z',
            soldDate: '',
          },
        ]),
      };
      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };
      chromium.launch.mockResolvedValue({
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined),
      });

      await closeBrowser();
      const result = await fetchMarketPrice('unparseable price item');
      // Price parses to 0, shipping parses to 0, so all validPrices filtered out → null
      expect(result).toBeNull();
    });

    it('handles shipping with non-free non-numeric text', async () => {
      const { chromium } = require('playwright');
      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        waitForSelector: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockResolvedValue([
          {
            title: 'Item B',
            price: '$200.00',
            shipping: 'Shipping not specified',
            condition: 'Used',
            url: 'https://ebay.com/b',
            soldDate: '',
          },
        ]),
      };
      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };
      chromium.launch.mockResolvedValue({
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined),
      });

      await closeBrowser();
      const result = await fetchMarketPrice('shipping text item');
      expect(result).not.toBeNull();
      expect(result!.soldListings[0].shippingCost).toBe(0);
    });

    it('handles waitForSelector timeout (no results selector)', async () => {
      const { chromium } = require('playwright');
      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        waitForSelector: jest.fn().mockRejectedValue(new Error('Timeout')),
        evaluate: jest.fn().mockResolvedValue([
          {
            title: 'Item C',
            price: '$300.00',
            shipping: 'Free shipping',
            condition: 'New',
            url: 'https://ebay.com/c',
            soldDate: '',
          },
        ]),
      };
      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };
      chromium.launch.mockResolvedValue({
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined),
      });

      await closeBrowser();
      const result = await fetchMarketPrice('timeout selector item');
      // waitForSelector failure is caught, evaluate still runs
      expect(result).not.toBeNull();
    });

    it('handles even number of listings for median calculation', async () => {
      const { chromium } = require('playwright');
      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        waitForSelector: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockResolvedValue([
          {
            title: 'Item 1',
            price: '$100.00',
            shipping: 'Free shipping',
            condition: 'Used',
            url: 'https://ebay.com/1',
            soldDate: '',
          },
          {
            title: 'Item 2',
            price: '$200.00',
            shipping: 'Free shipping',
            condition: 'Used',
            url: 'https://ebay.com/2',
            soldDate: '',
          },
          {
            title: 'Item 3',
            price: '$300.00',
            shipping: 'Free shipping',
            condition: 'Used',
            url: 'https://ebay.com/3',
            soldDate: '',
          },
          {
            title: 'Item 4',
            price: '$400.00',
            shipping: 'Free shipping',
            condition: 'Used',
            url: 'https://ebay.com/4',
            soldDate: '',
          },
        ]),
      };
      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };
      chromium.launch.mockResolvedValue({
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined),
      });

      await closeBrowser();
      const result = await fetchMarketPrice('even count items');
      expect(result).not.toBeNull();
      expect(result!.medianPrice).toBe(250); // (200+300)/2
      expect(result!.salesCount).toBe(4);
    });

    it('uses known categories correctly', async () => {
      const { chromium } = require('playwright');
      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        waitForSelector: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockResolvedValue([
          {
            title: 'Game',
            price: '$50.00',
            shipping: 'Free shipping',
            condition: 'Used',
            url: 'https://ebay.com/g',
            soldDate: '',
          },
        ]),
      };
      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };
      chromium.launch.mockResolvedValue({
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined),
      });

      await closeBrowser();
      // Test multiple known categories
      for (const cat of [
        'video games',
        'computers',
        'cell phones',
        'collectibles',
        'tools',
        'musical',
        'furniture',
        'appliances',
        'sports',
      ]) {
        const result = await fetchMarketPrice('test', cat);
        expect(result).not.toBeNull();
      }
    });

    it('handles unknown category gracefully', async () => {
      const { chromium } = require('playwright');
      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        waitForSelector: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockResolvedValue([
          {
            title: 'Item A',
            price: '$100.00',
            shipping: '+$5.50 shipping',
            condition: 'New',
            url: 'https://ebay.com/a',
            soldDate: '',
          },
        ]),
      };
      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };
      chromium.launch.mockResolvedValue({
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined),
      });

      await closeBrowser();
      const result = await fetchMarketPrice('test item', 'unknown_category');
      expect(result).not.toBeNull();
      expect(result!.soldListings[0].shippingCost).toBe(5.5);
    });
  });

  describe('parseEbayPrice (direct)', () => {
    it('parses standard dollar amount', () => {
      expect(parseEbayPrice('$100.00')).toBe(100);
    });

    it('parses price with commas', () => {
      expect(parseEbayPrice('$1,234.56')).toBe(1234.56);
    });

    it('parses price without dollar sign', () => {
      expect(parseEbayPrice('250.99')).toBe(250.99);
    });

    it('parses price with extra text', () => {
      expect(parseEbayPrice('US $99.99 (approx)')).toBe(99.99);
    });

    it('returns 0 for empty string', () => {
      expect(parseEbayPrice('')).toBe(0);
    });

    it('returns 0 for non-numeric string', () => {
      expect(parseEbayPrice('no price')).toBe(0);
    });

    it('parses whole number without decimals', () => {
      expect(parseEbayPrice('$50')).toBe(50);
    });

    it('parses price with currency symbols', () => {
      expect(parseEbayPrice('€150.00')).toBe(150);
    });

    it('parses large prices with multiple commas', () => {
      expect(parseEbayPrice('$10,000,000.00')).toBe(10000000);
    });
  });

  describe('median (direct)', () => {
    it('returns 0 for empty array', () => {
      expect(median([])).toBe(0);
    });

    it('returns the single element for length 1', () => {
      expect(median([42])).toBe(42);
    });

    it('returns middle element for odd-length array', () => {
      expect(median([1, 3, 5])).toBe(3);
    });

    it('returns average of two middle elements for even-length array', () => {
      expect(median([1, 2, 3, 4])).toBe(2.5);
    });

    it('handles unsorted input', () => {
      expect(median([5, 1, 3])).toBe(3);
    });

    it('does not mutate original array', () => {
      const arr = [3, 1, 2];
      median(arr);
      expect(arr).toEqual([3, 1, 2]);
    });

    it('handles duplicate values', () => {
      expect(median([5, 5, 5, 5])).toBe(5);
    });

    it('handles two elements', () => {
      expect(median([10, 20])).toBe(15);
    });
  });

  describe('buildEbaySoldUrl (direct)', () => {
    it('builds URL with search query', () => {
      const url = buildEbaySoldUrl('iPhone 14');
      expect(url).toContain('_nkw=iPhone+14');
      expect(url).toContain('LH_Complete=1');
      expect(url).toContain('LH_Sold=1');
      expect(url).toContain('_sop=13');
    });

    it('includes category ID for known category', () => {
      const url = buildEbaySoldUrl('laptop', 'electronics');
      expect(url).toContain('_sacat=293');
    });

    it('includes category for video games', () => {
      const url = buildEbaySoldUrl('ps5', 'video games');
      expect(url).toContain('_sacat=1249');
    });

    it('includes category for computers', () => {
      const url = buildEbaySoldUrl('macbook', 'computers');
      expect(url).toContain('_sacat=58058');
    });

    it('includes category for cell phones', () => {
      const url = buildEbaySoldUrl('pixel', 'cell phones');
      expect(url).toContain('_sacat=15032');
    });

    it('includes category for collectibles', () => {
      const url = buildEbaySoldUrl('coins', 'collectibles');
      expect(url).toContain('_sacat=1');
    });

    it('includes category for tools', () => {
      const url = buildEbaySoldUrl('drill', 'tools');
      expect(url).toContain('_sacat=631');
    });

    it('includes category for musical', () => {
      const url = buildEbaySoldUrl('guitar', 'musical');
      expect(url).toContain('_sacat=619');
    });

    it('includes category for furniture', () => {
      const url = buildEbaySoldUrl('desk', 'furniture');
      expect(url).toContain('_sacat=3197');
    });

    it('includes category for appliances', () => {
      const url = buildEbaySoldUrl('microwave', 'appliances');
      expect(url).toContain('_sacat=20710');
    });

    it('includes category for sports', () => {
      const url = buildEbaySoldUrl('bike', 'sports');
      expect(url).toContain('_sacat=888');
    });

    it('does not add _sacat for unknown category', () => {
      const url = buildEbaySoldUrl('thing', 'unknown');
      expect(url).not.toContain('_sacat');
    });

    it('does not add _sacat when no category provided', () => {
      const url = buildEbaySoldUrl('thing');
      expect(url).not.toContain('_sacat');
    });

    it('handles case-insensitive category matching', () => {
      const url = buildEbaySoldUrl('tv', 'Electronics');
      expect(url).toContain('_sacat=293');
    });
  });
});
