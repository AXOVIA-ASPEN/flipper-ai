/**
 * Integration Tests: /api/listings
 *
 * Tests the listings API endpoints against a real SQLite database.
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/listings/route';
import { testPrisma, resetDatabase } from './setup';
import { createMockListing, createMockListingRequest, resetCounters } from './fixtures';

describe('Listings API Integration Tests', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
    resetCounters();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  describe('GET /api/listings', () => {
    it('should return empty array when no listings exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/listings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.listings).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('should return paginated listings', async () => {
      // Seed 3 listings
      const listings = [
        createMockListing({ title: 'Item 1' }),
        createMockListing({ title: 'Item 2' }),
        createMockListing({ title: 'Item 3' }),
      ];

      for (const listing of listings) {
        await testPrisma.listing.create({ data: listing });
      }

      const request = new NextRequest('http://localhost:3000/api/listings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.listings).toHaveLength(3);
      expect(data.total).toBe(3);
      expect(data.limit).toBe(50);
      expect(data.offset).toBe(0);
    });

    it('should respect limit and offset parameters', async () => {
      // Seed 5 listings
      for (let i = 0; i < 5; i++) {
        await testPrisma.listing.create({
          data: createMockListing({ title: `Item ${i + 1}` }),
        });
      }

      const request = new NextRequest('http://localhost:3000/api/listings?limit=2&offset=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.listings).toHaveLength(2);
      expect(data.total).toBe(5);
      expect(data.limit).toBe(2);
      expect(data.offset).toBe(1);
    });

    it('should filter by platform', async () => {
      await testPrisma.listing.create({
        data: createMockListing({ platform: 'CRAIGSLIST', title: 'Craigslist Item' }),
      });
      await testPrisma.listing.create({
        data: createMockListing({ platform: 'FACEBOOK_MARKETPLACE', title: 'FB Item' }),
      });

      const request = new NextRequest('http://localhost:3000/api/listings?platform=CRAIGSLIST');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.listings).toHaveLength(1);
      expect(data.listings[0].platform).toBe('CRAIGSLIST');
    });

    it('should filter by status', async () => {
      await testPrisma.listing.create({
        data: createMockListing({ status: 'NEW' }),
      });
      await testPrisma.listing.create({
        data: createMockListing({ status: 'OPPORTUNITY' }),
      });

      const request = new NextRequest('http://localhost:3000/api/listings?status=OPPORTUNITY');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.listings).toHaveLength(1);
      expect(data.listings[0].status).toBe('OPPORTUNITY');
    });

    it('should filter by minimum score', async () => {
      await testPrisma.listing.create({
        data: createMockListing({ valueScore: 30 }),
      });
      await testPrisma.listing.create({
        data: createMockListing({ valueScore: 80 }),
      });

      const request = new NextRequest('http://localhost:3000/api/listings?minScore=70');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.listings).toHaveLength(1);
      expect(data.listings[0].valueScore).toBeGreaterThanOrEqual(70);
    });

    it('should include opportunity relation', async () => {
      const listing = await testPrisma.listing.create({
        data: createMockListing(),
      });
      await testPrisma.opportunity.create({
        data: {
          listingId: listing.id,
          status: 'IDENTIFIED',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/listings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.listings[0].opportunity).not.toBeNull();
      expect(data.listings[0].opportunity.status).toBe('IDENTIFIED');
    });
  });

  describe('POST /api/listings', () => {
    it('should create a new listing with value estimation', async () => {
      const listingData = createMockListingRequest({
        title: 'Apple iPhone 14 Pro',
        askingPrice: 500,
        condition: 'like new',
      });

      const request = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        body: JSON.stringify(listingData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.title).toBe('Apple iPhone 14 Pro');
      expect(data.askingPrice).toBe(500);
      // Value estimation should be calculated
      expect(data.estimatedValue).toBeDefined();
      expect(data.valueScore).toBeDefined();
      expect(data.category).toBe('electronics'); // Auto-detected
      expect(data.requestToBuy).toBeDefined(); // AI-generated message
    });

    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        body: JSON.stringify({ title: 'Missing fields' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should upsert existing listing (same platform + externalId)', async () => {
      const listingData = createMockListingRequest({
        externalId: 'unique-ext-1',
        platform: 'CRAIGSLIST',
        title: 'Original Title',
        askingPrice: 100,
      });

      // Create first
      const request1 = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        body: JSON.stringify(listingData),
      });
      const response1 = await POST(request1);
      expect(response1.status).toBe(201);

      // Upsert with new price
      const request2 = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        body: JSON.stringify({
          ...listingData,
          title: 'Updated Title',
          askingPrice: 80,
        }),
      });
      const response2 = await POST(request2);
      const data2 = await response2.json();

      expect(response2.status).toBe(201);
      expect(data2.title).toBe('Updated Title');
      expect(data2.askingPrice).toBe(80);

      // Verify only one listing exists
      const count = await testPrisma.listing.count();
      expect(count).toBe(1);
    });

    it('should set status to OPPORTUNITY for high-score listings', async () => {
      // Create a listing that should score high (brand name, good condition, low price)
      const listingData = createMockListingRequest({
        title: 'Dyson V15 Vacuum NEW IN BOX',
        description: 'Brand new sealed Dyson V15 Detect vacuum cleaner',
        askingPrice: 200, // Well below market value
        condition: 'new',
      });

      const request = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        body: JSON.stringify(listingData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      // High-value items should be marked as opportunities
      if (data.valueScore >= 70) {
        expect(data.status).toBe('OPPORTUNITY');
      }
    });

    it('should store imageUrls as JSON string', async () => {
      const listingData = createMockListingRequest({
        imageUrls: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
      });

      const request = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        body: JSON.stringify(listingData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.imageUrls).toBeDefined();
      const parsedUrls = JSON.parse(data.imageUrls);
      expect(parsedUrls).toHaveLength(2);
    });
  });
});
