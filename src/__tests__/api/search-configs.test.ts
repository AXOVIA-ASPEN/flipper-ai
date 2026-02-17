import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/search-configs/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/search-configs/[id]/route';

// Mock Prisma client
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

const mockGetAuthUserId = jest.fn().mockResolvedValue(null);
jest.mock('@/lib/auth-middleware', () => ({
  __esModule: true,
  getAuthUserId: (...args: unknown[]) => mockGetAuthUserId(...args),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    searchConfig: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));

// Helper to create mock NextRequest
function createMockRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>
): NextRequest {
  const request = new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    ...(body && {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
  });
  return request;
}

describe('Search Configs API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/search-configs', () => {
    it('should return all search configs', async () => {
      const mockConfigs = [
        {
          id: 'config-1',
          name: 'Electronics Tampa',
          platform: 'CRAIGSLIST',
          location: 'tampa',
          category: 'electronics',
          enabled: true,
        },
        {
          id: 'config-2',
          name: 'Furniture Orlando',
          platform: 'CRAIGSLIST',
          location: 'orlando',
          category: 'furniture',
          enabled: false,
        },
      ];
      mockFindMany.mockResolvedValue(mockConfigs);

      const request = createMockRequest('GET', '/api/search-configs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.configs).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it('should filter by enabled status when requested', async () => {
      mockFindMany.mockResolvedValue([]);

      const request = createMockRequest('GET', '/api/search-configs?enabled=true');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { enabled: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return 500 on database error', async () => {
      mockFindMany.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('GET', '/api/search-configs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch search configurations');
    });

    it('should filter by userId when authenticated', async () => {
      mockGetAuthUserId.mockResolvedValueOnce('user-456');
      mockFindMany.mockResolvedValue([{ id: 'config-1', name: 'Test' }]);

      const request = createMockRequest('GET', '/api/search-configs');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ userId: 'user-456' }, { userId: null }],
          }),
        })
      );
    });
  });

  describe('POST /api/search-configs', () => {
    beforeEach(() => {
      // POST endpoints require authentication
      mockGetAuthUserId.mockResolvedValue('test-user-id');
    });

    it('should create a new search config', async () => {
      const newConfig = {
        name: 'Electronics Search',
        platform: 'CRAIGSLIST',
        location: 'tampa',
        category: 'electronics',
        keywords: 'iphone, macbook',
        minPrice: 100,
        maxPrice: 1000,
      };
      mockCreate.mockResolvedValue({ id: 'config-1', ...newConfig, enabled: true });

      const request = createMockRequest('POST', '/api/search-configs', newConfig);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('Electronics Search');
      expect(data.platform).toBe('CRAIGSLIST');
    });

    it('should return 400 if name is missing', async () => {
      const request = createMockRequest('POST', '/api/search-configs', {
        platform: 'CRAIGSLIST',
        location: 'tampa',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should return 400 if platform is missing', async () => {
      const request = createMockRequest('POST', '/api/search-configs', {
        name: 'Test',
        location: 'tampa',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should return 400 if location is missing', async () => {
      const request = createMockRequest('POST', '/api/search-configs', {
        name: 'Test',
        platform: 'CRAIGSLIST',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should return 400 for invalid platform', async () => {
      const request = createMockRequest('POST', '/api/search-configs', {
        name: 'Test',
        platform: 'INVALID_PLATFORM',
        location: 'tampa',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should accept all valid platforms', async () => {
      const platforms = ['CRAIGSLIST', 'FACEBOOK_MARKETPLACE', 'EBAY', 'OFFERUP'];

      for (const platform of platforms) {
        mockCreate.mockResolvedValue({ id: 'config-1', name: 'Test', platform, location: 'tampa' });

        const request = createMockRequest('POST', '/api/search-configs', {
          name: 'Test',
          platform,
          location: 'tampa',
        });
        const response = await POST(request);

        expect(response.status).toBe(201);
      }
    });

    it('should default enabled to true', async () => {
      mockCreate.mockResolvedValue({ id: 'config-1', enabled: true });

      const request = createMockRequest('POST', '/api/search-configs', {
        name: 'Test',
        platform: 'CRAIGSLIST',
        location: 'tampa',
      });
      await POST(request);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ enabled: true }),
      });
    });

    it('should parse minPrice and maxPrice as floats', async () => {
      mockCreate.mockResolvedValue({ id: 'config-1' });

      const request = createMockRequest('POST', '/api/search-configs', {
        name: 'Test',
        platform: 'CRAIGSLIST',
        location: 'tampa',
        minPrice: '100.50',
        maxPrice: '500.75',
      });
      await POST(request);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          minPrice: 100.5,
          maxPrice: 500.75,
        }),
      });
    });

    it('should filter by userId when authenticated', async () => {
      mockGetAuthUserId.mockResolvedValueOnce('user-123');
      mockCreate.mockResolvedValue({
        id: 'config-1',
        name: 'Test',
        platform: 'CRAIGSLIST',
        location: 'tampa',
      });

      const request = createMockRequest('POST', '/api/search-configs', {
        name: 'Test',
        platform: 'CRAIGSLIST',
        location: 'tampa',
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'user-123' }),
      });
    });

    it('should return 500 when prisma create throws', async () => {
      mockCreate.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest('POST', '/api/search-configs', {
        name: 'Test',
        platform: 'CRAIGSLIST',
        location: 'tampa',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create search configuration');
    });
  });

  describe('GET /api/search-configs/[id]', () => {
    it('should return a single search config', async () => {
      const mockConfig = {
        id: 'config-1',
        name: 'Electronics Tampa',
        platform: 'CRAIGSLIST',
        location: 'tampa',
      };
      mockFindUnique.mockResolvedValue(mockConfig);

      const request = createMockRequest('GET', '/api/search-configs/config-1');
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'config-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockConfig);
    });

    it('should return 404 if config not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const request = createMockRequest('GET', '/api/search-configs/nonexistent');
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Search configuration not found');
    });

    it('should return 500 on database error', async () => {
      mockFindUnique.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('GET', '/api/search-configs/config-1');
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'config-1' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch search configuration');
    });
  });

  describe('PATCH /api/search-configs/[id]', () => {
    it('should update a search config', async () => {
      const updatedConfig = {
        id: 'config-1',
        name: 'Updated Name',
        enabled: false,
      };
      mockUpdate.mockResolvedValue(updatedConfig);

      const request = createMockRequest('PATCH', '/api/search-configs/config-1', {
        name: 'Updated Name',
        enabled: false,
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'config-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('Updated Name');
    });

    it('should only update provided fields', async () => {
      mockUpdate.mockResolvedValue({ id: 'config-1' });

      const request = createMockRequest('PATCH', '/api/search-configs/config-1', {
        name: 'New Name',
      });
      await PATCH(request, { params: Promise.resolve({ id: 'config-1' }) });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'config-1' },
        data: { name: 'New Name' },
      });
    });

    it('should validate platform on update', async () => {
      const request = createMockRequest('PATCH', '/api/search-configs/config-1', {
        platform: 'INVALID',
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'config-1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid platform');
    });

    it('should update lastRun timestamp', async () => {
      const lastRunDate = '2024-01-15T10:30:00Z';
      mockUpdate.mockResolvedValue({ id: 'config-1', lastRun: lastRunDate });

      const request = createMockRequest('PATCH', '/api/search-configs/config-1', {
        lastRun: lastRunDate,
      });
      await PATCH(request, { params: Promise.resolve({ id: 'config-1' }) });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'config-1' },
        data: { lastRun: new Date(lastRunDate) },
      });
    });

    it('should update all fields at once', async () => {
      mockUpdate.mockResolvedValue({ id: 'config-1' });

      const request = createMockRequest('PATCH', '/api/search-configs/config-1', {
        name: 'Full Update',
        platform: 'EBAY',
        location: 'miami',
        category: 'electronics',
        keywords: 'laptop',
        minPrice: '50.00',
        maxPrice: '999.99',
        enabled: true,
        lastRun: '2024-06-01T00:00:00Z',
      });
      await PATCH(request, { params: Promise.resolve({ id: 'config-1' }) });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'config-1' },
        data: {
          name: 'Full Update',
          platform: 'EBAY',
          location: 'miami',
          category: 'electronics',
          keywords: 'laptop',
          minPrice: 50,
          maxPrice: 999.99,
          enabled: true,
          lastRun: new Date('2024-06-01T00:00:00Z'),
        },
      });
    });

    it('should set minPrice to null when falsy value provided', async () => {
      mockUpdate.mockResolvedValue({ id: 'config-1' });

      const request = createMockRequest('PATCH', '/api/search-configs/config-1', {
        minPrice: 0,
        maxPrice: 0,
      });
      await PATCH(request, { params: Promise.resolve({ id: 'config-1' }) });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'config-1' },
        data: { minPrice: null, maxPrice: null },
      });
    });

    it('should accept valid platform FACEBOOK_MARKETPLACE on update', async () => {
      mockUpdate.mockResolvedValue({ id: 'config-1' });

      const request = createMockRequest('PATCH', '/api/search-configs/config-1', {
        platform: 'FACEBOOK_MARKETPLACE',
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'config-1' }) });

      expect(response.status).toBe(200);
    });

    it('should accept valid platform OFFERUP on update', async () => {
      mockUpdate.mockResolvedValue({ id: 'config-1' });

      const request = createMockRequest('PATCH', '/api/search-configs/config-1', {
        platform: 'OFFERUP',
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'config-1' }) });

      expect(response.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      mockUpdate.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('PATCH', '/api/search-configs/config-1', {
        name: 'Test',
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'config-1' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update search configuration');
    });
  });

  describe('DELETE /api/search-configs/[id]', () => {
    it('should delete a search config', async () => {
      mockDelete.mockResolvedValue({ id: 'config-1' });

      const request = createMockRequest('DELETE', '/api/search-configs/config-1');
      const response = await DELETE(request, { params: Promise.resolve({ id: 'config-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'config-1' } });
    });

    it('should return 500 on database error', async () => {
      mockDelete.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('DELETE', '/api/search-configs/config-1');
      const response = await DELETE(request, { params: Promise.resolve({ id: 'config-1' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete search configuration');
    });
  });
});
