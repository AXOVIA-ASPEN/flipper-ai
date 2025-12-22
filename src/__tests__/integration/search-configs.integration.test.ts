/**
 * Integration Tests: /api/search-configs and /api/search-configs/[id]
 *
 * Tests the search configs API endpoints against a real SQLite database.
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/search-configs/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/search-configs/[id]/route';
import { testPrisma, resetDatabase } from './setup';
import { createMockSearchConfig, resetCounters } from './fixtures';

describe('Search Configs API Integration Tests', () => {
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

  describe('GET /api/search-configs', () => {
    it('should return empty array when no configs exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/search-configs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.configs).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('should return all search configs', async () => {
      await testPrisma.searchConfig.create({
        data: createMockSearchConfig({ name: 'Config 1' }),
      });
      await testPrisma.searchConfig.create({
        data: createMockSearchConfig({ name: 'Config 2' }),
      });

      const request = new NextRequest('http://localhost:3000/api/search-configs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.configs).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it('should filter by enabled status', async () => {
      await testPrisma.searchConfig.create({
        data: createMockSearchConfig({ name: 'Enabled', enabled: true }),
      });
      await testPrisma.searchConfig.create({
        data: createMockSearchConfig({ name: 'Disabled', enabled: false }),
      });

      const request = new NextRequest('http://localhost:3000/api/search-configs?enabled=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.configs).toHaveLength(1);
      expect(data.configs[0].name).toBe('Enabled');
      expect(data.configs[0].enabled).toBe(true);
    });
  });

  describe('POST /api/search-configs', () => {
    it('should create a new search config', async () => {
      const request = new NextRequest('http://localhost:3000/api/search-configs', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Electronics Tampa',
          platform: 'CRAIGSLIST',
          location: 'tampa',
          category: 'electronics',
          keywords: 'iPhone, MacBook',
          minPrice: 50,
          maxPrice: 500,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.name).toBe('Electronics Tampa');
      expect(data.platform).toBe('CRAIGSLIST');
      expect(data.location).toBe('tampa');
      expect(data.category).toBe('electronics');
      expect(data.keywords).toBe('iPhone, MacBook');
      expect(data.minPrice).toBe(50);
      expect(data.maxPrice).toBe(500);
      expect(data.enabled).toBe(true); // Default
    });

    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/search-configs', {
        method: 'POST',
        body: JSON.stringify({ name: 'Incomplete Config' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name, platform, and location are required');
    });

    it('should return 400 for invalid platform', async () => {
      const request = new NextRequest('http://localhost:3000/api/search-configs', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Invalid Platform',
          platform: 'INVALID_PLATFORM',
          location: 'tampa',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid platform');
    });

    it('should allow creating with enabled=false', async () => {
      const request = new NextRequest('http://localhost:3000/api/search-configs', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Disabled Config',
          platform: 'CRAIGSLIST',
          location: 'tampa',
          enabled: false,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.enabled).toBe(false);
    });
  });

  describe('GET /api/search-configs/[id]', () => {
    it('should return a single config by id', async () => {
      const config = await testPrisma.searchConfig.create({
        data: createMockSearchConfig({
          name: 'My Config',
          platform: 'CRAIGSLIST',
          location: 'tampa',
        }),
      });

      const request = new NextRequest(`http://localhost:3000/api/search-configs/${config.id}`);
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: config.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(config.id);
      expect(data.name).toBe('My Config');
    });

    it('should return 404 for non-existent config', async () => {
      const request = new NextRequest('http://localhost:3000/api/search-configs/non-existent-id');
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'non-existent-id' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Search configuration not found');
    });
  });

  describe('PATCH /api/search-configs/[id]', () => {
    it('should update config name', async () => {
      const config = await testPrisma.searchConfig.create({
        data: createMockSearchConfig({ name: 'Original Name' }),
      });

      const request = new NextRequest(`http://localhost:3000/api/search-configs/${config.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: config.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('Updated Name');
    });

    it('should update price range', async () => {
      const config = await testPrisma.searchConfig.create({
        data: createMockSearchConfig(),
      });

      const request = new NextRequest(`http://localhost:3000/api/search-configs/${config.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          minPrice: '100',
          maxPrice: '1000',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: config.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.minPrice).toBe(100);
      expect(data.maxPrice).toBe(1000);
    });

    it('should toggle enabled status', async () => {
      const config = await testPrisma.searchConfig.create({
        data: createMockSearchConfig({ enabled: true }),
      });

      const request = new NextRequest(`http://localhost:3000/api/search-configs/${config.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: false }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: config.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.enabled).toBe(false);
    });

    it('should update lastRun timestamp', async () => {
      const config = await testPrisma.searchConfig.create({
        data: createMockSearchConfig(),
      });

      const lastRun = new Date().toISOString();
      const request = new NextRequest(`http://localhost:3000/api/search-configs/${config.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ lastRun }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: config.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.lastRun).not.toBeNull();
    });

    it('should return 400 for invalid platform on update', async () => {
      const config = await testPrisma.searchConfig.create({
        data: createMockSearchConfig(),
      });

      const request = new NextRequest(`http://localhost:3000/api/search-configs/${config.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ platform: 'INVALID' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: config.id }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid platform');
    });
  });

  describe('DELETE /api/search-configs/[id]', () => {
    it('should delete a search config', async () => {
      const config = await testPrisma.searchConfig.create({
        data: createMockSearchConfig(),
      });

      const request = new NextRequest(`http://localhost:3000/api/search-configs/${config.id}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: config.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify deletion
      const deleted = await testPrisma.searchConfig.findUnique({
        where: { id: config.id },
      });
      expect(deleted).toBeNull();
    });

    it('should return error for non-existent config', async () => {
      const request = new NextRequest('http://localhost:3000/api/search-configs/non-existent-id', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'non-existent-id' }) });

      expect(response.status).toBe(500); // Prisma throws on delete of non-existent
    });
  });
});
