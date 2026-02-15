/**
 * Integration Tests: /api/scraper-jobs and /api/scraper-jobs/[id]
 *
 * Tests the scraper jobs API endpoints against a real SQLite database.
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/scraper-jobs/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/scraper-jobs/[id]/route';
import { testPrisma, resetDatabase } from './setup';
import { createMockScraperJob, resetCounters } from './fixtures';

describe('Scraper Jobs API Integration Tests', () => {
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

  describe('GET /api/scraper-jobs', () => {
    it('should return empty array when no jobs exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/scraper-jobs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('should return all scraper jobs', async () => {
      await testPrisma.scraperJob.create({
        data: createMockScraperJob({ platform: 'CRAIGSLIST' }),
      });
      await testPrisma.scraperJob.create({
        data: createMockScraperJob({ platform: 'FACEBOOK_MARKETPLACE' }),
      });

      const request = new NextRequest('http://localhost:3000/api/scraper-jobs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it('should filter by status', async () => {
      await testPrisma.scraperJob.create({
        data: createMockScraperJob({ status: 'PENDING' }),
      });
      await testPrisma.scraperJob.create({
        data: createMockScraperJob({ status: 'COMPLETED' }),
      });

      const request = new NextRequest('http://localhost:3000/api/scraper-jobs?status=COMPLETED');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs).toHaveLength(1);
      expect(data.jobs[0].status).toBe('COMPLETED');
    });

    it('should filter by platform', async () => {
      await testPrisma.scraperJob.create({
        data: createMockScraperJob({ platform: 'CRAIGSLIST' }),
      });
      await testPrisma.scraperJob.create({
        data: createMockScraperJob({ platform: 'EBAY' }),
      });

      const request = new NextRequest('http://localhost:3000/api/scraper-jobs?platform=CRAIGSLIST');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs).toHaveLength(1);
      expect(data.jobs[0].platform).toBe('CRAIGSLIST');
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await testPrisma.scraperJob.create({
          data: createMockScraperJob(),
        });
      }

      const request = new NextRequest('http://localhost:3000/api/scraper-jobs?limit=2');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs).toHaveLength(2);
    });
  });

  describe('POST /api/scraper-jobs', () => {
    it('should create a new scraper job', async () => {
      const request = new NextRequest('http://localhost:3000/api/scraper-jobs', {
        method: 'POST',
        body: JSON.stringify({
          platform: 'CRAIGSLIST',
          location: 'tampa',
          category: 'electronics',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.platform).toBe('CRAIGSLIST');
      expect(data.location).toBe('tampa');
      expect(data.category).toBe('electronics');
      expect(data.status).toBe('PENDING');
    });

    it('should return 400 for missing platform', async () => {
      const request = new NextRequest('http://localhost:3000/api/scraper-jobs', {
        method: 'POST',
        body: JSON.stringify({ location: 'tampa' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Platform is required');
    });

    it('should return 400 for invalid platform', async () => {
      const request = new NextRequest('http://localhost:3000/api/scraper-jobs', {
        method: 'POST',
        body: JSON.stringify({ platform: 'INVALID_PLATFORM' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid platform');
    });

    it('should accept all valid platforms', async () => {
      const validPlatforms = ['CRAIGSLIST', 'FACEBOOK_MARKETPLACE', 'EBAY', 'OFFERUP'];

      for (const platform of validPlatforms) {
        const request = new NextRequest('http://localhost:3000/api/scraper-jobs', {
          method: 'POST',
          body: JSON.stringify({ platform }),
        });

        const response = await POST(request);
        expect(response.status).toBe(201);
      }
    });
  });

  describe('GET /api/scraper-jobs/[id]', () => {
    it('should return a single job by id', async () => {
      const job = await testPrisma.scraperJob.create({
        data: createMockScraperJob({
          platform: 'CRAIGSLIST',
          location: 'tampa',
          listingsFound: 10,
        }),
      });

      const request = new NextRequest(`http://localhost:3000/api/scraper-jobs/${job.id}`);
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: job.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(job.id);
      expect(data.platform).toBe('CRAIGSLIST');
      expect(data.listingsFound).toBe(10);
    });

    it('should return 404 for non-existent job', async () => {
      const request = new NextRequest('http://localhost:3000/api/scraper-jobs/non-existent-id');
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: 'non-existent-id' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Scraper job not found');
    });
  });

  describe('PATCH /api/scraper-jobs/[id]', () => {
    it('should update job status', async () => {
      const job = await testPrisma.scraperJob.create({
        data: createMockScraperJob({ status: 'PENDING' }),
      });

      const request = new NextRequest(`http://localhost:3000/api/scraper-jobs/${job.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'RUNNING' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: job.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('RUNNING');
    });

    it('should update job with results', async () => {
      const job = await testPrisma.scraperJob.create({
        data: createMockScraperJob({ status: 'RUNNING' }),
      });

      const request = new NextRequest(`http://localhost:3000/api/scraper-jobs/${job.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'COMPLETED',
          listingsFound: 25,
          opportunitiesFound: 5,
          completedAt: new Date().toISOString(),
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: job.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('COMPLETED');
      expect(data.listingsFound).toBe(25);
      expect(data.opportunitiesFound).toBe(5);
      expect(data.completedAt).not.toBeNull();
    });

    it('should update job with error', async () => {
      const job = await testPrisma.scraperJob.create({
        data: createMockScraperJob({ status: 'RUNNING' }),
      });

      const request = new NextRequest(`http://localhost:3000/api/scraper-jobs/${job.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'FAILED',
          errorMessage: 'Connection timeout',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: job.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('FAILED');
      expect(data.errorMessage).toBe('Connection timeout');
    });

    it('should return 400 for invalid status', async () => {
      const job = await testPrisma.scraperJob.create({
        data: createMockScraperJob(),
      });

      const request = new NextRequest(`http://localhost:3000/api/scraper-jobs/${job.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'INVALID_STATUS' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: job.id }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid status');
    });
  });

  describe('DELETE /api/scraper-jobs/[id]', () => {
    it('should delete a scraper job', async () => {
      const job = await testPrisma.scraperJob.create({
        data: createMockScraperJob(),
      });

      const request = new NextRequest(`http://localhost:3000/api/scraper-jobs/${job.id}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: job.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify deletion
      const deleted = await testPrisma.scraperJob.findUnique({
        where: { id: job.id },
      });
      expect(deleted).toBeNull();
    });
  });
});
