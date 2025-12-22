/**
 * Integration Tests: /api/opportunities/[id]
 *
 * Tests the single opportunity API endpoints against a real SQLite database.
 */

import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/opportunities/[id]/route';
import { testPrisma, resetDatabase } from './setup';
import { createMockListing, resetCounters } from './fixtures';

describe('Opportunities [id] API Integration Tests', () => {
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

  describe('GET /api/opportunities/[id]', () => {
    it('should return a single opportunity by id', async () => {
      const listing = await testPrisma.listing.create({
        data: createMockListing({ title: 'Test Item' }),
      });
      const opportunity = await testPrisma.opportunity.create({
        data: {
          listingId: listing.id,
          status: 'IDENTIFIED',
          notes: 'Test notes',
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/opportunities/${opportunity.id}`);
      const response = await GET(request, { params: Promise.resolve({ id: opportunity.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(opportunity.id);
      expect(data.status).toBe('IDENTIFIED');
      expect(data.notes).toBe('Test notes');
    });

    it('should return 404 for non-existent opportunity', async () => {
      const request = new NextRequest('http://localhost:3000/api/opportunities/non-existent-id');
      const response = await GET(request, { params: Promise.resolve({ id: 'non-existent-id' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Opportunity not found');
    });

    it('should include listing relation', async () => {
      const listing = await testPrisma.listing.create({
        data: createMockListing({
          title: 'Vintage Watch',
          askingPrice: 200,
        }),
      });
      const opportunity = await testPrisma.opportunity.create({
        data: { listingId: listing.id, status: 'IDENTIFIED' },
      });

      const request = new NextRequest(`http://localhost:3000/api/opportunities/${opportunity.id}`);
      const response = await GET(request, { params: Promise.resolve({ id: opportunity.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.listing).not.toBeNull();
      expect(data.listing.title).toBe('Vintage Watch');
      expect(data.listing.askingPrice).toBe(200);
    });
  });

  describe('PATCH /api/opportunities/[id]', () => {
    it('should update opportunity status', async () => {
      const listing = await testPrisma.listing.create({
        data: createMockListing(),
      });
      const opportunity = await testPrisma.opportunity.create({
        data: { listingId: listing.id, status: 'IDENTIFIED' },
      });

      const request = new NextRequest(`http://localhost:3000/api/opportunities/${opportunity.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CONTACTED' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: opportunity.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('CONTACTED');
    });

    it('should update purchase info', async () => {
      const listing = await testPrisma.listing.create({
        data: createMockListing(),
      });
      const opportunity = await testPrisma.opportunity.create({
        data: { listingId: listing.id, status: 'IDENTIFIED' },
      });

      const purchaseDate = new Date().toISOString();
      const request = new NextRequest(`http://localhost:3000/api/opportunities/${opportunity.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'PURCHASED',
          purchasePrice: 75,
          purchaseDate,
          purchaseNotes: 'Picked up locally',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: opportunity.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('PURCHASED');
      expect(data.purchasePrice).toBe(75);
      expect(data.purchaseNotes).toBe('Picked up locally');
    });

    it('should calculate actualProfit when resale info provided', async () => {
      const listing = await testPrisma.listing.create({
        data: createMockListing(),
      });
      const opportunity = await testPrisma.opportunity.create({
        data: {
          listingId: listing.id,
          status: 'PURCHASED',
          purchasePrice: 50,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/opportunities/${opportunity.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          purchasePrice: 50,
          resalePrice: 120,
          fees: 15, // Platform fees
          status: 'SOLD',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: opportunity.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.resalePrice).toBe(120);
      expect(data.fees).toBe(15);
      // actualProfit = resalePrice - purchasePrice - fees = 120 - 50 - 15 = 55
      expect(data.actualProfit).toBe(55);
    });

    it('should include listing in response', async () => {
      const listing = await testPrisma.listing.create({
        data: createMockListing({ title: 'Updated Item' }),
      });
      const opportunity = await testPrisma.opportunity.create({
        data: { listingId: listing.id, status: 'IDENTIFIED' },
      });

      const request = new NextRequest(`http://localhost:3000/api/opportunities/${opportunity.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: 'Updated notes' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: opportunity.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.listing).not.toBeNull();
      expect(data.listing.title).toBe('Updated Item');
    });
  });

  describe('DELETE /api/opportunities/[id]', () => {
    it('should delete opportunity and reset listing status', async () => {
      const listing = await testPrisma.listing.create({
        data: createMockListing({ status: 'OPPORTUNITY' }),
      });
      const opportunity = await testPrisma.opportunity.create({
        data: { listingId: listing.id, status: 'IDENTIFIED' },
      });

      const request = new NextRequest(`http://localhost:3000/api/opportunities/${opportunity.id}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: opportunity.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify opportunity is deleted
      const deletedOpp = await testPrisma.opportunity.findUnique({
        where: { id: opportunity.id },
      });
      expect(deletedOpp).toBeNull();

      // Verify listing status reset to NEW
      const updatedListing = await testPrisma.listing.findUnique({
        where: { id: listing.id },
      });
      expect(updatedListing?.status).toBe('NEW');
    });

    it('should return 404 for non-existent opportunity', async () => {
      const request = new NextRequest('http://localhost:3000/api/opportunities/non-existent-id', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'non-existent-id' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Opportunity not found');
    });
  });
});
