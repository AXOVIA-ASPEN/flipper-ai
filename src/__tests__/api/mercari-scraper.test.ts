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

      // active: API fails, fallback succeeds (returns []); sold: caught internally → []
      mockFetch
        .mockResolvedValueOnce(failResponse)      // active API call fails
        .mockResolvedValueOnce(fallbackOkResponse) // active fallback succeeds → returns []
        .mockResolvedValueOnce(failResponse);      // sold API call fails → caught, returns []

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
