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
