/**
 * Integration Tests: /api/opportunities
 *
 * Tests the opportunities API endpoints against a real SQLite database.
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/opportunities/route';
import { testPrisma, resetDatabase } from './setup';
import { createMockListing, resetCounters } from './fixtures';

describe('Opportunities API Integration Tests', () => {
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

  describe('GET /api/opportunities', () => {
    it('should return empty array when no opportunities exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/opportunities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.opportunities).toEqual([]);
      expect(data.total).toBe(0);
      expect(data.stats).toEqual({
        totalOpportunities: 0,
        totalProfit: 0,
        totalInvested: 0,
        totalRevenue: 0,
      });
    });

    it('should return opportunities with stats', async () => {
      // Create listings and opportunities
      const listing1 = await testPrisma.listing.create({
        data: createMockListing({ title: 'Item 1' }),
      });
      const listing2 = await testPrisma.listing.create({
        data: createMockListing({ title: 'Item 2' }),
      });

      await testPrisma.opportunity.create({
        data: {
          listingId: listing1.id,
          status: 'SOLD',
          purchasePrice: 50,
          resalePrice: 100,
          actualProfit: 45, // After fees
        },
      });
      await testPrisma.opportunity.create({
        data: {
          listingId: listing2.id,
          status: 'PURCHASED',
          purchasePrice: 75,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/opportunities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.opportunities).toHaveLength(2);
      expect(data.total).toBe(2);
      expect(data.stats.totalOpportunities).toBe(2);
      expect(data.stats.totalInvested).toBe(125); // 50 + 75
      expect(data.stats.totalRevenue).toBe(100);
      expect(data.stats.totalProfit).toBe(45);
    });

    it('should filter by status', async () => {
      const listing1 = await testPrisma.listing.create({
        data: createMockListing(),
      });
      const listing2 = await testPrisma.listing.create({
        data: createMockListing(),
      });

      await testPrisma.opportunity.create({
        data: { listingId: listing1.id, status: 'IDENTIFIED' },
      });
      await testPrisma.opportunity.create({
        data: { listingId: listing2.id, status: 'PURCHASED' },
      });

      const request = new NextRequest('http://localhost:3000/api/opportunities?status=PURCHASED');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.opportunities).toHaveLength(1);
      expect(data.opportunities[0].status).toBe('PURCHASED');
    });

    it('should include listing relation', async () => {
      const listing = await testPrisma.listing.create({
        data: createMockListing({ title: 'Great Find', askingPrice: 100 }),
      });
      await testPrisma.opportunity.create({
        data: { listingId: listing.id, status: 'IDENTIFIED' },
      });

      const request = new NextRequest('http://localhost:3000/api/opportunities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.opportunities[0].listing).not.toBeNull();
      expect(data.opportunities[0].listing.title).toBe('Great Find');
      expect(data.opportunities[0].listing.askingPrice).toBe(100);
    });

    it('should respect limit and offset', async () => {
      // Create 5 listings and opportunities
      for (let i = 0; i < 5; i++) {
        const listing = await testPrisma.listing.create({
          data: createMockListing(),
        });
        await testPrisma.opportunity.create({
          data: { listingId: listing.id, status: 'IDENTIFIED' },
        });
      }

      const request = new NextRequest('http://localhost:3000/api/opportunities?limit=2&offset=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.opportunities).toHaveLength(2);
      expect(data.total).toBe(5);
    });
  });

  describe('POST /api/opportunities', () => {
    it('should create an opportunity from a listing', async () => {
      const listing = await testPrisma.listing.create({
        data: createMockListing({ status: 'NEW' }),
      });

      const request = new NextRequest('http://localhost:3000/api/opportunities', {
        method: 'POST',
        body: JSON.stringify({
          listingId: listing.id,
          notes: 'Great potential flip',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.listingId).toBe(listing.id);
      expect(data.status).toBe('IDENTIFIED');
      expect(data.notes).toBe('Great potential flip');
      expect(data.listing).not.toBeNull();

      // Verify listing status was updated
      const updatedListing = await testPrisma.listing.findUnique({
        where: { id: listing.id },
      });
      expect(updatedListing?.status).toBe('OPPORTUNITY');
    });

    it('should return 400 for missing listingId', async () => {
      const request = new NextRequest('http://localhost:3000/api/opportunities', {
        method: 'POST',
        body: JSON.stringify({ notes: 'No listing ID' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined(); // Route returns validation error
    });

    it('should return 404 for non-existent listing', async () => {
      const request = new NextRequest('http://localhost:3000/api/opportunities', {
        method: 'POST',
        body: JSON.stringify({ listingId: 'non-existent-id' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Listing not found');
    });

    it('should return 409 for duplicate opportunity', async () => {
      const listing = await testPrisma.listing.create({
        data: createMockListing(),
      });
      await testPrisma.opportunity.create({
        data: { listingId: listing.id, status: 'IDENTIFIED' },
      });

      const request = new NextRequest('http://localhost:3000/api/opportunities', {
        method: 'POST',
        body: JSON.stringify({ listingId: listing.id }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Opportunity already exists for this listing');
    });
  });

  describe('GET /api/opportunities - Filters', () => {
    beforeEach(async () => {
      // Create listings with different platforms, scores, and profits
      const listing1 = await testPrisma.listing.create({
        data: createMockListing({ platform: 'CRAIGSLIST', valueScore: 85, profitPotential: 200 }),
      });
      const listing2 = await testPrisma.listing.create({
        data: createMockListing({ platform: 'EBAY', valueScore: 45, profitPotential: 50 }),
      });
      const listing3 = await testPrisma.listing.create({
        data: createMockListing({ platform: 'FACEBOOK', valueScore: 70, profitPotential: 120 }),
      });

      await testPrisma.opportunity.createMany({
        data: [
          { listingId: listing1.id, status: 'IDENTIFIED' },
          { listingId: listing2.id, status: 'CONTACTED' },
          { listingId: listing3.id, status: 'IDENTIFIED' },
        ],
      });
    });

    it('should filter by platform', async () => {
      const request = new NextRequest('http://localhost:3000/api/opportunities?platform=CRAIGSLIST');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.opportunities.length).toBe(1);
      expect(data.opportunities[0].listing.platform).toBe('CRAIGSLIST');
    });

    it('should filter by minScore', async () => {
      const request = new NextRequest('http://localhost:3000/api/opportunities?minScore=60');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.opportunities.length).toBe(2);
      data.opportunities.forEach((opp: { listing: { valueScore: number } }) => {
        expect(opp.listing.valueScore).toBeGreaterThanOrEqual(60);
      });
    });

    it('should filter by maxScore', async () => {
      const request = new NextRequest('http://localhost:3000/api/opportunities?maxScore=50');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.opportunities.length).toBe(1);
      expect(data.opportunities[0].listing.valueScore).toBeLessThanOrEqual(50);
    });

    it('should filter by minProfit and maxProfit', async () => {
      const request = new NextRequest('http://localhost:3000/api/opportunities?minProfit=100&maxProfit=250');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.opportunities.length).toBe(2);
      data.opportunities.forEach((opp: { listing: { profitPotential: number } }) => {
        expect(opp.listing.profitPotential).toBeGreaterThanOrEqual(100);
        expect(opp.listing.profitPotential).toBeLessThanOrEqual(250);
      });
    });

    it('should combine platform and score filters', async () => {
      const request = new NextRequest('http://localhost:3000/api/opportunities?platform=CRAIGSLIST&minScore=80');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.opportunities.length).toBe(1);
      expect(data.opportunities[0].listing.platform).toBe('CRAIGSLIST');
      expect(data.opportunities[0].listing.valueScore).toBeGreaterThanOrEqual(80);
    });

    it('should return empty when no opportunities match filters', async () => {
      const request = new NextRequest('http://localhost:3000/api/opportunities?platform=MERCARI');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.opportunities.length).toBe(0);
    });
  });
});
