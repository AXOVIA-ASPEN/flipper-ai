/**
 * Integration Tests: /api/listings/[id]
 *
 * Tests the single listing API endpoints against a real SQLite database.
 */

import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/listings/[id]/route';
import { testPrisma, resetDatabase } from './setup';
import { createMockListing, resetCounters } from './fixtures';

describe('Listings [id] API Integration Tests', () => {
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

  describe('GET /api/listings/[id]', () => {
    it('should return a single listing by id', async () => {
      const listing = await testPrisma.listing.create({
        data: createMockListing({ title: 'Test Item' }),
      });

      const request = new NextRequest(`http://localhost:3000/api/listings/${listing.id}`);
      const response = await GET(request, { params: Promise.resolve({ id: listing.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(listing.id);
      expect(data.title).toBe('Test Item');
    });

    it('should return 404 for non-existent listing', async () => {
      const request = new NextRequest('http://localhost:3000/api/listings/non-existent-id');
      const response = await GET(request, { params: Promise.resolve({ id: 'non-existent-id' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Listing not found');
    });

    it('should include opportunity relation', async () => {
      const listing = await testPrisma.listing.create({
        data: createMockListing(),
      });
      await testPrisma.opportunity.create({
        data: {
          listingId: listing.id,
          status: 'PURCHASED',
          purchasePrice: 50,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/listings/${listing.id}`);
      const response = await GET(request, { params: Promise.resolve({ id: listing.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.opportunity).not.toBeNull();
      expect(data.opportunity.status).toBe('PURCHASED');
      expect(data.opportunity.purchasePrice).toBe(50);
    });
  });

  describe('PATCH /api/listings/[id]', () => {
    it('should update listing fields', async () => {
      const listing = await testPrisma.listing.create({
        data: createMockListing({
          title: 'Original Title',
          askingPrice: 100,
          status: 'NEW',
        }),
      });

      const request = new NextRequest(`http://localhost:3000/api/listings/${listing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'Updated Title',
          askingPrice: 80,
          status: 'CONTACTED',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: listing.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Updated Title');
      expect(data.askingPrice).toBe(80);
      expect(data.status).toBe('CONTACTED');
    });

    it('should update only provided fields', async () => {
      const listing = await testPrisma.listing.create({
        data: createMockListing({
          title: 'Original Title',
          description: 'Original Description',
        }),
      });

      const request = new NextRequest(`http://localhost:3000/api/listings/${listing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'New Title Only' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: listing.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('New Title Only');
      expect(data.description).toBe('Original Description'); // Unchanged
    });

    it('should update notes and price reasoning', async () => {
      const listing = await testPrisma.listing.create({
        data: createMockListing(),
      });

      const request = new NextRequest(`http://localhost:3000/api/listings/${listing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          notes: 'Great deal, seller is motivated',
          priceReasoning: 'Below market by 30%',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: listing.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notes).toBe('Great deal, seller is motivated');
      expect(data.priceReasoning).toBe('Below market by 30%');
    });
  });

  describe('DELETE /api/listings/[id]', () => {
    it('should delete a listing', async () => {
      const listing = await testPrisma.listing.create({
        data: createMockListing(),
      });

      const request = new NextRequest(`http://localhost:3000/api/listings/${listing.id}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: listing.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify it's actually deleted
      const deleted = await testPrisma.listing.findUnique({
        where: { id: listing.id },
      });
      expect(deleted).toBeNull();
    });

    it('should cascade delete associated opportunity', async () => {
      const listing = await testPrisma.listing.create({
        data: createMockListing(),
      });
      const opportunity = await testPrisma.opportunity.create({
        data: {
          listingId: listing.id,
          status: 'IDENTIFIED',
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/listings/${listing.id}`, {
        method: 'DELETE',
      });

      await DELETE(request, { params: Promise.resolve({ id: listing.id }) });

      // Opportunity should be cascade deleted
      const deletedOpp = await testPrisma.opportunity.findUnique({
        where: { id: opportunity.id },
      });
      expect(deletedOpp).toBeNull();
    });

    it('should return error for non-existent listing', async () => {
      const request = new NextRequest('http://localhost:3000/api/listings/non-existent-id', {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'non-existent-id' }),
      });

      expect(response.status).toBe(500); // Prisma throws on delete of non-existent
    });
  });
});
