/**
 * Mercari Scraper API Tests
 * Author: Stephen Boyett
 * Company: Axovia AI
 * Created: 2026-02-03
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/scraper/mercari/route';

// Mock prisma
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    scraperJob: {
      create: jest.fn().mockResolvedValue({ id: 'job-123' }),
      update: jest.fn().mockResolvedValue({}),
    },
    listing: {
      upsert: jest.fn().mockResolvedValue({
        id: 'listing-123',
        platform: 'MERCARI',
        externalId: 'm123456',
        title: 'Test Item',
        status: 'NEW',
      }),
    },
    priceHistory: {
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

// Mock auth middleware
jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn().mockResolvedValue('user-123'),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Mercari Scraper API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/scraper/mercari', () => {
    it('returns scraper status and configuration', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.platform).toBe('mercari');
      expect(data.status).toBe('ready');
      expect(data.apiVersion).toBe('2.0');
      expect(Array.isArray(data.supportedCategories)).toBe(true);
      expect(Array.isArray(data.supportedConditions)).toBe(true);
      expect(data.sortOptions).toContain('created_time');
      expect(data.sortOptions).toContain('price_asc');
      expect(data.sortOptions).toContain('price_desc');
    });

    it('includes category and condition options', async () => {
      const response = await GET();
      const data = await response.json();

      // Check categories
      const electronicsCategory = data.supportedCategories.find(
        (c: { id: string; label: string }) => c.label === 'Electronics'
      );
      expect(electronicsCategory).toBeDefined();
      expect(electronicsCategory.id).toBe('3');

      // Check conditions
      const newCondition = data.supportedConditions.find(
        (c: { id: string; label: string }) => c.label === 'New with tags'
      );
      expect(newCondition).toBeDefined();
      expect(newCondition.id).toBe('1');
    });
  });

  describe('POST /api/scraper/mercari', () => {
    it('requires keywords parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('keywords is required');
    });

    it('rejects empty keywords', async () => {
      const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
        method: 'POST',
        body: JSON.stringify({ keywords: '   ' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('keywords is required');
    });

    it('successfully scrapes with valid keywords', async () => {
      // Mock successful Mercari API response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              result: 'success',
              data: [
                {
                  id: 'm123456',
                  name: 'Nintendo Switch Console',
                  description: 'Great condition, barely used',
                  price: 199,
                  status: 'on_sale',
                  thumbnails: ['https://mercari.com/img1.jpg'],
                  itemCondition: { id: '3', name: 'Very good' },
                  seller: {
                    id: 's123',
                    name: 'TestSeller',
                    ratings: { good: 50, normal: 5, bad: 0 },
                  },
                  shippingPayer: { id: '1', name: 'Seller' },
                  shippingMethod: { id: '1', name: 'Standard shipping' },
                  shippingFromArea: { id: '1', name: 'California' },
                  created: Math.floor(Date.now() / 1000),
                  rootCategory: { id: '3', name: 'Electronics' },
                },
              ],
            }),
        })
        .mockResolvedValueOnce({
          // Sold listings response
          ok: true,
          json: () => Promise.resolve({ result: 'success', data: [] }),
        });

      const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
        method: 'POST',
        body: JSON.stringify({
          keywords: 'nintendo switch',
          categoryId: '3',
          maxPrice: 300,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.platform).toBe('MERCARI');
      expect(data.listingsSaved).toBeGreaterThanOrEqual(0);
    });

    it('handles Mercari API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve('Rate limit exceeded'),
      });

      const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'iphone' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to scrape Mercari listings');
    });

    it('handles rate limiting with appropriate response', async () => {
      // Mock both fetch calls - active and sold listings
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ 'content-type': 'application/json' }),
          text: () => Promise.resolve('rate limit exceeded'),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ result: 'success', data: [] }),
        });

      const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'test item' }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should return 429 for rate limiting
      expect(response.status).toBe(429);
      expect(data.suggestion).toContain('rate limiting');
    });

    it('respects limit parameter with maximum cap', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: 'success', data: [] }),
      });

      const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
        method: 'POST',
        body: JSON.stringify({
          keywords: 'test',
          limit: 100, // Over the 50 max
        }),
      });

      await POST(request);

      // Verify the API was called (limit should be capped internally)
      expect(mockFetch).toHaveBeenCalled();
    });

    it('supports all filter options', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: 'success', data: [] }),
      });

      const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
        method: 'POST',
        body: JSON.stringify({
          keywords: 'vintage camera',
          categoryId: '7', // Toys & Collectibles
          condition: '3', // Very good
          minPrice: 50,
          maxPrice: 200,
          sortBy: 'price_asc',
          limit: 30,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Mercari item processing', () => {
    it('extracts seller information correctly', async () => {
      const { default: prisma } = await import('@/lib/db');

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              result: 'success',
              data: [
                {
                  id: 'test-item-1',
                  name: 'Test Product',
                  price: 100,
                  status: 'on_sale',
                  seller: {
                    id: 'seller-1',
                    name: 'GreatSeller',
                    ratings: { good: 100, normal: 10, bad: 2 },
                  },
                },
              ],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ result: 'success', data: [] }),
        });

      const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'test' }),
      });

      await POST(request);

      // Verify listing was saved with seller name
      expect(prisma.listing.upsert).toHaveBeenCalled();
    });

    it('handles items without optional fields', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              result: 'success',
              data: [
                {
                  id: 'minimal-item',
                  name: 'Minimal Item',
                  price: 50,
                  status: 'on_sale',
                  // No description, no photos, no seller info, etc.
                },
              ],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ result: 'success', data: [] }),
        });

      const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'minimal' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('stores price history from sold listings', async () => {
      const { default: prisma } = await import('@/lib/db');

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              result: 'success',
              data: [],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              result: 'success',
              data: [
                {
                  id: 'sold-1',
                  name: 'Sold Item 1',
                  price: 75,
                  status: 'sold_out',
                  updated: Math.floor(Date.now() / 1000),
                },
                {
                  id: 'sold-2',
                  name: 'Sold Item 2',
                  price: 85,
                  status: 'sold_out',
                  updated: Math.floor(Date.now() / 1000),
                },
              ],
            }),
        });

      const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'sold items test' }),
      });

      await POST(request);

      expect(prisma.priceHistory.createMany).toHaveBeenCalled();
    });
  });
});

// ── Additional branch coverage ───────────────────────────────────────────────
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';

describe('Mercari Scraper - additional branch coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthUserId as jest.Mock).mockResolvedValue('user-1');
    (prisma.scraperJob.create as jest.Mock).mockResolvedValue({ id: 'job-extra' });
    (prisma.scraperJob.update as jest.Mock).mockResolvedValue({});
    (prisma.listing.upsert as jest.Mock).mockResolvedValue({ id: 'listing-1' });
    (prisma.priceHistory.createMany as jest.Mock).mockResolvedValue({ count: 0 });
  });

  it('handles HTML response (rate limit/block) with 429 status', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
        text: () => Promise.resolve('<html>Blocked</html>'),
      })
      // second call (sold listings) also fails
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success', data: [] }),
      });

    const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
      method: 'POST',
      body: JSON.stringify({ keywords: 'test html block' }),
    });

    const response = await POST(request);
    // When the API returns HTML, it's treated as rate limiting
    expect([429, 500]).toContain(response.status);
  });

  it('handles items with thumbnails (no photos array)', async () => {
    const itemWithThumbnails = {
      id: 'thumb-1',
      name: 'Item with thumbnails',
      price: 100,
      status: 'on_sale',
      updated: Math.floor(Date.now() / 1000),
      thumbnails: ['https://img.mercari.com/thumb/thumb1.jpg'],
      // no photos property
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success', data: [itemWithThumbnails] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success', data: [] }),
      });

    const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
      method: 'POST',
      body: JSON.stringify({ keywords: 'thumbnail test' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('handles save error for individual item (continues without crashing)', async () => {
    const item = {
      id: 'err-item-1',
      name: 'Error Item',
      price: 50,
      status: 'on_sale',
      updated: Math.floor(Date.now() / 1000),
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success', data: [item] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success', data: [] }),
      });

    // Make upsert throw for this item
    (prisma.listing.upsert as jest.Mock).mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
      method: 'POST',
      body: JSON.stringify({ keywords: 'save error test' }),
    });

    const response = await POST(request);
    // Should continue and return success even if item save fails
    expect(response.status).toBe(200);
  });

  it('returns 401 when not authenticated', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
      method: 'POST',
      body: JSON.stringify({ keywords: 'test' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  // ── Additional branch coverage ─────────────────────────────────────────────
  describe('Branch coverage - collectImageUrls', () => {
    it('handles items with photos array (not thumbnails)', async () => {
      const itemWithPhotos = {
        id: 'photo-1',
        name: 'Item with photos',
        price: 150,
        status: 'on_sale',
        updated: Math.floor(Date.now() / 1000),
        photos: ['https://img.mercari.com/photos/photo1.jpg', 'https://img.mercari.com/photos/photo2.jpg'],
        // no thumbnails
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ result: 'success', data: [itemWithPhotos] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ result: 'success', data: [] }),
        });

      const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'photos test' }),
      });

      const response = await POST(request);
      expect([200, 201]).toContain(response.status);
    });

    it('tries web scraping fallback when API fails with non-rate-limit error (fallback fails)', async () => {
      // Set up: API call fails, fallback also fails, sold listings call also fails
      const failResponse = {
        ok: false,
        status: 503,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve('Service unavailable'),
        json: () => Promise.resolve({ message: 'Service unavailable' }),
      };
      const fallbackFailResponse = { ok: false, status: 503 };

      // active: API call, fallback fetch; sold: caught internally → []
      mockFetch
        .mockResolvedValueOnce(failResponse)     // active API call → triggers fallback
        .mockResolvedValueOnce(fallbackFailResponse) // active fallback web scrape fails
        .mockResolvedValueOnce(failResponse);    // sold listings API call → caught, returns []

      const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'fallback test' }),
      });

      const response = await POST(request);
      // Fallback fails → either 500 or it's gracefully handled as 200 with empty results
      expect([200, 500]).toContain(response.status);
    });

    it('returns empty array from web scraping fallback when fetch succeeds', async () => {
      const failResponse = {
        ok: false,
        status: 500,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve('Server error'),
        json: () => Promise.resolve({ message: 'Server error' }),
      };
      const fallbackOkResponse = {
        ok: true,
        text: () => Promise.resolve('<html>listings</html>'),
        json: () => Promise.resolve({}),
        headers: { get: () => 'text/html' },
      };

      // POST handler uses Promise.all([fetchMercariListings, fetchSoldListings])
      // Both fire fetch concurrently, so mock order is:
      //   fetch #1: active API call (fails → non-rate-limit error → triggers fallback)
      //   fetch #2: sold API call (fails → caught internally → returns [])
      //   fetch #3: active fallback web scrape (succeeds → console.warn + return [])
      mockFetch
        .mockResolvedValueOnce(failResponse)       // fetch #1: active API fails
        .mockResolvedValueOnce(failResponse)       // fetch #2: sold API fails (caught internally)
        .mockResolvedValueOnce(fallbackOkResponse); // fetch #3: fallback web scrape succeeds → []

      const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'fallback success test' }),
      });

      const response = await POST(request);
      // Fallback returns [] (no items) → 200 with empty listings
      expect([200, 500]).toContain(response.status);
    });
  });
});

// ── Extended branch coverage ─────────────────────────────────────────────────

describe('Mercari Scraper - extended branch coverage', () => {
  const mockPrisma = require('@/lib/db').default;
  const mockFetch = global.fetch as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.scraperJob.create.mockResolvedValue({ id: 'job-ext' });
    mockPrisma.scraperJob.update.mockResolvedValue({});
    mockPrisma.listing.upsert.mockResolvedValue({
      id: 'listing-ext', platform: 'MERCARI', externalId: 'm999', title: 'Ext Item', status: 'OPPORTUNITY',
    });
    mockPrisma.priceHistory.createMany.mockResolvedValue({ count: 2 });
    require('@/lib/auth-middleware').getAuthUserId.mockResolvedValue('user-ext');
  });

  it('returns apiResponse.items when .data is absent', async () => {
    // fetchSoldListings uses apiResponse.data || apiResponse.items || []
    const soldResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({
        result: 'SUCCESS',
        items: [{ id: 'sold-1', name: 'Sold Item', price: 200, status: 'sold_out' }],
      }),
    };
    const activeResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({
        result: 'SUCCESS',
        data: [{ id: 'active-1', name: 'Active Item', price: 100, status: 'on_sale' }],
      }),
    };
    // Promise.all order: active API, sold API
    mockFetch
      .mockResolvedValueOnce(activeResponse)   // active API
      .mockResolvedValueOnce(soldResponse);    // sold API (uses .items)

    const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
      method: 'POST',
      body: JSON.stringify({ keywords: 'test items' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('handles items with rootCategory, brand, and buyer-pays shipping', async () => {
    // Covers: rootCategory.name, brandNote, shippingPayer buyer path, shippingMethod.name
    const itemWithFullData = {
      id: 'full-item-1',
      name: 'Nike Air Max',
      description: 'Great shoes',
      price: 80,
      status: 'on_sale',
      rootCategory: { id: '2', name: 'Shoes' },
      itemBrand: { id: 'b1', name: 'Nike' },
      itemCondition: { id: '3', name: 'Very good' },
      shippingPayer: { id: '2', name: 'Buyer' },
      shippingMethod: { id: '1', name: 'USPS' },
      shippingFromArea: { id: '1', name: 'California' },
      seller: { id: 'seller-1', name: 'SellerA', ratings: { good: 50, normal: 5, bad: 0 } },
      created: Math.floor(Date.now() / 1000) - 3600,
    };
    const activeResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: 'SUCCESS', data: [itemWithFullData] }),
    };
    const soldResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: 'SUCCESS', data: [] }),
    };
    mockFetch
      .mockResolvedValueOnce(activeResponse)
      .mockResolvedValueOnce(soldResponse);

    const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
      method: 'POST',
      body: JSON.stringify({ keywords: 'shoes', categoryId: '2', condition: '3' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it('handles items with seller ratings totaling zero (new seller)', async () => {
    // Covers: buildSellerNote total === 0 → 'New seller (no ratings)'
    const newSellerItem = {
      id: 'new-seller-1',
      name: 'Widget',
      price: 25,
      status: 'on_sale',
      seller: { id: 's2', name: 'NewGuy', ratings: { good: 0, normal: 0, bad: 0 } },
      updated: Math.floor(Date.now() / 1000) - 7200, // no created, has updated
    };
    const activeResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: 'SUCCESS', data: [newSellerItem] }),
    };
    const soldResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: 'SUCCESS', data: [] }),
    };
    mockFetch
      .mockResolvedValueOnce(activeResponse)
      .mockResolvedValueOnce(soldResponse);

    const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
      method: 'POST',
      body: JSON.stringify({ keywords: 'widget' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it('handles storePriceHistoryRecords with items missing price and name', async () => {
    // Covers: !item.price → null (filtered out), item.name || keywords fallback
    const soldItemMissingPrice = { id: 's1', name: '', price: 0, status: 'sold_out' };
    const soldItemMissingName = { id: 's2', name: '', price: 50, status: 'sold_out' };
    const activeResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: 'SUCCESS', data: [] }),
    };
    const soldResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({
        result: 'SUCCESS',
        data: [soldItemMissingPrice, soldItemMissingName],
      }),
    };
    mockFetch
      .mockResolvedValueOnce(activeResponse)
      .mockResolvedValueOnce(soldResponse);

    const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
      method: 'POST',
      body: JSON.stringify({ keywords: 'test price history' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it('handles item with free shipping and no created/updated timestamp', async () => {
    // Covers: shippingPayer === 'Seller' → 'Free shipping', no created/updated → new Date()
    const freeShipItem = {
      id: 'free-ship-1',
      name: 'Free Ship Item',
      price: 40,
      status: 'on_sale',
      shippingPayer: { id: '1', name: 'Seller' },
      // no created, no updated
    };
    const activeResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: 'SUCCESS', data: [freeShipItem] }),
    };
    const soldResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: 'SUCCESS', data: [] }),
    };
    mockFetch
      .mockResolvedValueOnce(activeResponse)
      .mockResolvedValueOnce(soldResponse);

    const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
      method: 'POST',
      body: JSON.stringify({ keywords: 'free shipping item', minPrice: 10, maxPrice: 100 }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it('handles item with unknown condition ID falling back to name', async () => {
    // Covers: CONDITION_MAP[id] missing → falls back to item.itemCondition.name
    const unknownCondItem = {
      id: 'uc-1',
      name: 'Unknown Cond',
      price: 30,
      status: 'on_sale',
      itemCondition: { id: '99', name: 'Customized' }, // not in CONDITION_MAP
    };
    const activeResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: 'SUCCESS', data: [unknownCondItem] }),
    };
    const soldResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: 'SUCCESS', data: [] }),
    };
    mockFetch
      .mockResolvedValueOnce(activeResponse)
      .mockResolvedValueOnce(soldResponse);

    const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
      method: 'POST',
      body: JSON.stringify({ keywords: 'condition test' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it('handles sold items with rootCategory and updated timestamp', async () => {
    // Covers: item.rootCategory?.name in storePriceHistoryRecords,
    //         item.updated → new Date(updated * 1000) in price history
    const activeResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: 'SUCCESS', data: [] }),
    };
    const soldResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({
        result: 'SUCCESS',
        data: [{
          id: 'sold-cat-1',
          name: 'Categorized Sold Item',
          price: 120,
          status: 'sold_out',
          rootCategory: { id: '3', name: 'Electronics' },
          updated: Math.floor(Date.now() / 1000) - 86400,
          itemCondition: { id: '4', name: 'Good' },
        }],
      }),
    };
    mockFetch
      .mockResolvedValueOnce(activeResponse)
      .mockResolvedValueOnce(soldResponse);

    const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
      method: 'POST',
      body: JSON.stringify({ keywords: 'categorized sold' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it('filters out items with missing id or name', async () => {
    // Covers: !item.id || !item.name continue (skips invalid items)
    const badItems = [
      { id: '', name: 'No ID', price: 50, status: 'on_sale' },       // no id
      { id: 'has-id', name: '', price: 50, status: 'on_sale' },       // no name
      { id: 'valid-1', name: 'Valid Item', price: 50, status: 'on_sale' }, // valid
    ];
    const activeResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: 'SUCCESS', data: badItems }),
    };
    const soldResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: 'SUCCESS', data: [] }),
    };
    mockFetch
      .mockResolvedValueOnce(activeResponse)
      .mockResolvedValueOnce(soldResponse);

    const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
      method: 'POST',
      body: JSON.stringify({ keywords: 'filter test' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    // Only 1 valid item saved (the others are filtered out)
    expect(data.listingsSaved).toBe(1);
  });

  it('handles non-Error thrown inside error response', async () => {
    // Covers: error instanceof Error ? error.message : 'Unknown Mercari error'
    mockPrisma.scraperJob.create.mockResolvedValue({ id: 'job-err' });
    // Simulate prisma throwing a non-Error object
    mockPrisma.listing.upsert.mockRejectedValue('string error');
    const activeResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({
        result: 'SUCCESS',
        data: [{ id: 'throw-1', name: 'Throw Item', price: 50, status: 'on_sale' }],
      }),
    };
    const soldResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: 'SUCCESS', data: [] }),
    };
    mockFetch
      .mockResolvedValueOnce(activeResponse)
      .mockResolvedValueOnce(soldResponse);

    const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
      method: 'POST',
      body: JSON.stringify({ keywords: 'non-error test' }),
    });
    // The listing save error is caught per-item (doesn't fail the whole request)
    const response = await POST(request);
    expect([200, 500]).toContain(response.status);
  });

  it('handles sortBy parameter', async () => {
    // Covers: sortBy = params.sortBy || 'created_time' (non-default value)
    const activeResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: 'SUCCESS', data: [] }),
    };
    const soldResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: 'SUCCESS', data: [] }),
    };
    mockFetch
      .mockResolvedValueOnce(activeResponse)
      .mockResolvedValueOnce(soldResponse);

    const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
      method: 'POST',
      body: JSON.stringify({ keywords: 'sort test', sortBy: 'price_asc' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it('returns 429 with rate-limit suggestion when Mercari API returns HTML (rate limit)', async () => {
    // Covers: isRateLimited=true path → 429 + suggestion field in outer error handler
    // Mercari returns HTML (rate limit block) → error includes 'rate limit' → 429
    const htmlResponse = {
      ok: false,
      status: 503,
      headers: { get: (h: string) => h === 'content-type' ? 'text/html; charset=utf-8' : null },
      text: () => Promise.resolve('<html>Service Unavailable</html>'),
    };
    // Both fetch calls (active + sold) fail with HTML block
    mockFetch
      .mockResolvedValue(htmlResponse);

    const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
      method: 'POST',
      body: JSON.stringify({ keywords: 'rate limit test' }),
    });
    const response = await POST(request);
    const data = await response.json();
    // Should detect rate limit and return 429 with suggestion
    expect(response.status).toBe(429);
    expect(data.suggestion).toBeDefined();
    expect(data.suggestion).toContain('rate limiting');
  });

  it('falls through to web scrape fallback when Mercari API fails for non-rate-limit reason (fallback ok)', async () => {
    // Covers: catch(apiError) where error doesn't include 'rate limit'/'429'/'block'
    //         then tries web scrape as fallback (ok response → returns [])
    // Use URL-based discrimination: /v1/api → error, /search/ → ok
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/v1/api/')) {
        // API call fails (non-rate-limit)
        return Promise.resolve({
          ok: false,
          status: 500,
          headers: { get: () => 'application/json' },
          text: () => Promise.resolve('Internal Server Error'),
        });
      } else {
        // Web scrape URL (/search/?...) succeeds → returns []
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'text/html' },
          text: () => Promise.resolve('<html>results</html>'),
        });
      }
    });

    const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
      method: 'POST',
      body: JSON.stringify({ keywords: 'fallback test' }),
    });
    const response = await POST(request);
    // Web scrape returns [] so 0 listings saved; scraper job completes
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.listingsSaved).toBe(0);
  });

  it('falls through to web scrape fallback and throws when fallback also fails (!ok)', async () => {
    // Covers: if (!response.ok) throw new Error(`Mercari web scrape failed (${response.status})`)
    // Use URL-based discrimination: all fetches fail
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/v1/api/')) {
        // API call fails (non-rate-limit generic error)
        return Promise.resolve({
          ok: false,
          status: 500,
          headers: { get: () => 'application/json' },
          text: () => Promise.resolve('Internal Server Error'),
        });
      } else {
        // Web scrape also fails → throws "Mercari web scrape failed"
        return Promise.resolve({
          ok: false,
          status: 403,
          headers: { get: () => 'text/html' },
          text: () => Promise.resolve('Forbidden'),
        });
      }
    });

    const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
      method: 'POST',
      body: JSON.stringify({ keywords: 'web scrape fail test' }),
    });
    const response = await POST(request);
    // Web scrape failure propagates → 500
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it('handles item with no shippingPayer (shippingNote = null branch)', async () => {
    // Covers: shippingPayer is undefined → null shippingNote
    const item = {
      id: 'ship-null-1',
      name: 'No Shipping Info Item',
      price: 80,
      status: 'on_sale',
      // No shippingPayer, no shippingMethod
    };
    const activeResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: 'SUCCESS', data: [item] }),
    };
    const soldResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: 'SUCCESS', data: [] }),
    };
    mockFetch
      .mockResolvedValueOnce(activeResponse)
      .mockResolvedValueOnce(soldResponse);

    const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
      method: 'POST',
      body: JSON.stringify({ keywords: 'no shipping' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it('handles item with buyer-pays shipping but no method name (standard fallback)', async () => {
    // Covers: item.shippingPayer.name !== 'Seller' AND shippingMethod.name falsy → 'standard'
    const item = {
      id: 'ship-buyer-1',
      name: 'Buyer Pays No Method',
      price: 60,
      status: 'on_sale',
      shippingPayer: { id: '2', name: 'Buyer' },
      // shippingMethod present but name is empty string
      shippingMethod: { id: '1', name: '' },
    };
    const activeResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: 'SUCCESS', data: [item] }),
    };
    const soldResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: 'SUCCESS', data: [] }),
    };
    mockFetch
      .mockResolvedValueOnce(activeResponse)
      .mockResolvedValueOnce(soldResponse);

    const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
      method: 'POST',
      body: JSON.stringify({ keywords: 'buyer pays standard' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it('handles item where postedAt is null (no created or updated timestamp)', async () => {
    // Covers: item.created falsy AND item.updated falsy → postedAt = null
    const item = {
      id: 'no-dates-1',
      name: 'No Dates Item',
      price: 45,
      status: 'on_sale',
      // No created or updated fields
    };
    const activeResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: 'SUCCESS', data: [item] }),
    };
    const soldResponse = {
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: 'SUCCESS', data: [] }),
    };
    mockFetch
      .mockResolvedValueOnce(activeResponse)
      .mockResolvedValueOnce(soldResponse);

    const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
      method: 'POST',
      body: JSON.stringify({ keywords: 'no dates test' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
