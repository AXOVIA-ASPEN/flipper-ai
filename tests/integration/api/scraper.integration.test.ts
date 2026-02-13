/**
 * Integration tests for marketplace scraper APIs
 * Author: Stephen Boyett
 * Company: Axovia AI
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { NextRequest } from 'next/server';

describe('Scraper API Integration Tests', () => {
  let testDb: any;

  beforeAll(async () => {
    // Set up test database
    testDb = await setupTestDatabase();
  });

  afterAll(async () => {
    // Clean up test database
    await teardownTestDatabase(testDb);
  });

  describe('eBay Scraper', () => {
    it('should scrape eBay listings successfully', async () => {
      const { POST } = await import('../../../src/app/api/scraper/ebay/route');
      
      const request = new NextRequest('http://localhost:3000/api/scraper/ebay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'iPhone 13',
          location: 'Tampa, FL',
          category: 'electronics',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.listings).toBeDefined();
      expect(Array.isArray(data.listings)).toBe(true);
      expect(data.listings.length).toBeGreaterThan(0);
      
      // Verify listing structure
      const listing = data.listings[0];
      expect(listing).toHaveProperty('id');
      expect(listing).toHaveProperty('title');
      expect(listing).toHaveProperty('price');
      expect(listing).toHaveProperty('url');
      expect(listing).toHaveProperty('marketplace', 'ebay');
    });

    it('should handle empty search results', async () => {
      const { POST } = await import('../../../src/app/api/scraper/ebay/route');
      
      const request = new NextRequest('http://localhost:3000/api/scraper/ebay', {
        method: 'POST',
        body: JSON.stringify({
          query: 'xyzabc123nonexistent',
          location: 'Tampa, FL',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.listings).toBeDefined();
      expect(data.listings).toHaveLength(0);
    });

    it('should validate required parameters', async () => {
      const { POST } = await import('../../../src/app/api/scraper/ebay/route');
      
      const request = new NextRequest('http://localhost:3000/api/scraper/ebay', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });

    it('should cache scraped results', async () => {
      const { POST } = await import('../../../src/app/api/scraper/ebay/route');
      
      const requestData = {
        query: 'iPad Pro',
        location: 'Tampa, FL',
      };

      // First request
      const request1 = new NextRequest('http://localhost:3000/api/scraper/ebay', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });
      
      const start1 = Date.now();
      const response1 = await POST(request1);
      const time1 = Date.now() - start1;

      // Second request (should hit cache)
      const request2 = new NextRequest('http://localhost:3000/api/scraper/ebay', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });
      
      const start2 = Date.now();
      const response2 = await POST(request2);
      const time2 = Date.now() - start2;

      expect(response2.status).toBe(200);
      expect(time2).toBeLessThan(time1); // Cached should be faster
    });
  });

  describe('Facebook Marketplace Scraper', () => {
    it('should scrape Facebook listings successfully', async () => {
      const { POST } = await import('../../../src/app/api/scraper/facebook/route');
      
      const request = new NextRequest('http://localhost:3000/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({
          query: 'MacBook Pro',
          location: 'Tampa, FL',
          category: 'electronics',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.listings).toBeDefined();
      expect(Array.isArray(data.listings)).toBe(true);
    });

    it('should handle authentication errors', async () => {
      const { POST } = await import('../../../src/app/api/scraper/facebook/route');
      
      // Clear auth cookies
      const request = new NextRequest('http://localhost:3000/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({ query: 'test' }),
      });

      const response = await POST(request);
      
      // Should fail without auth or handle gracefully
      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('OfferUp Scraper', () => {
    it('should scrape OfferUp listings successfully', async () => {
      const { POST } = await import('../../../src/app/api/scraper/offerup/route');
      
      const request = new NextRequest('http://localhost:3000/api/scraper/offerup', {
        method: 'POST',
        body: JSON.stringify({
          query: 'Nintendo Switch',
          location: 'Tampa, FL',
          category: 'video-games',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.listings).toBeDefined();
    });

    it('should cache images locally', async () => {
      const { POST } = await import('../../../src/app/api/scraper/offerup/route');
      
      const request = new NextRequest('http://localhost:3000/api/scraper/offerup', {
        method: 'POST',
        body: JSON.stringify({
          query: 'PlayStation 5',
          location: 'Tampa, FL',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      if (data.listings.length > 0) {
        const listing = data.listings[0];
        expect(listing.images).toBeDefined();
        
        // Check if images are cached locally
        if (listing.images.length > 0) {
          expect(listing.images[0]).toMatch(/^\/api\/images\/proxy/);
        }
      }
    });
  });

  describe('Craigslist Scraper', () => {
    it('should scrape Craigslist listings successfully', async () => {
      const { POST } = await import('../../../src/app/api/scraper/craigslist/route');
      
      const request = new NextRequest('http://localhost:3000/api/scraper/craigslist', {
        method: 'POST',
        body: JSON.stringify({
          query: 'bicycle',
          location: 'tampa',
          category: 'sporting',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.listings).toBeDefined();
    });

    it('should parse price correctly', async () => {
      const { POST } = await import('../../../src/app/api/scraper/craigslist/route');
      
      const request = new NextRequest('http://localhost:3000/api/scraper/craigslist', {
        method: 'POST',
        body: JSON.stringify({
          query: 'furniture',
          location: 'tampa',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      if (data.listings.length > 0) {
        const listing = data.listings[0];
        expect(listing.price).toBeDefined();
        expect(typeof listing.price).toBe('number');
        expect(listing.price).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Mercari Scraper', () => {
    it('should scrape Mercari listings successfully', async () => {
      const { POST } = await import('../../../src/app/api/scraper/mercari/route');
      
      const request = new NextRequest('http://localhost:3000/api/scraper/mercari', {
        method: 'POST',
        body: JSON.stringify({
          query: 'sneakers',
          category: 'shoes',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.listings).toBeDefined();
    });
  });

  describe('Multi-Marketplace Aggregation', () => {
    it('should aggregate results from all marketplaces', async () => {
      const { POST: ebayPost } = await import('../../../src/app/api/scraper/ebay/route');
      const { POST: facebookPost } = await import('../../../src/app/api/scraper/facebook/route');
      const { POST: offerupPost } = await import('../../../src/app/api/scraper/offerup/route');

      const searchParams = {
        query: 'iPhone 14',
        location: 'Tampa, FL',
      };

      const [ebayRes, fbRes, offerupRes] = await Promise.all([
        ebayPost(new NextRequest('http://localhost:3000/api/scraper/ebay', {
          method: 'POST',
          body: JSON.stringify(searchParams),
        })),
        facebookPost(new NextRequest('http://localhost:3000/api/scraper/facebook', {
          method: 'POST',
          body: JSON.stringify(searchParams),
        })),
        offerupPost(new NextRequest('http://localhost:3000/api/scraper/offerup', {
          method: 'POST',
          body: JSON.stringify(searchParams),
        })),
      ]);

      const ebayData = await ebayRes.json();
      const fbData = await fbRes.json();
      const offerupData = await offerupRes.json();

      // Combine all results
      const allListings = [
        ...ebayData.listings,
        ...fbData.listings,
        ...offerupData.listings,
      ];

      expect(allListings.length).toBeGreaterThan(0);
      
      // Verify each listing has marketplace identifier
      allListings.forEach(listing => {
        expect(listing.marketplace).toBeDefined();
        expect(['ebay', 'facebook', 'offerup']).toContain(listing.marketplace);
      });
    });
  });
});

// Helper functions
async function setupTestDatabase() {
  // Implementation for test DB setup
  return {};
}

async function teardownTestDatabase(db: any) {
  // Implementation for test DB cleanup
}
