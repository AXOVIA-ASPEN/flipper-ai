import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/scraper-jobs/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/scraper-jobs/[id]/route';

// Mock Prisma client
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    scraperJob: {
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

describe('Scraper Jobs API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/scraper-jobs', () => {
    it('should return all scraper jobs', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          platform: 'CRAIGSLIST',
          location: 'tampa',
          category: 'electronics',
          status: 'COMPLETED',
          listingsFound: 25,
          opportunitiesFound: 5,
          createdAt: new Date(),
        },
        {
          id: 'job-2',
          platform: 'CRAIGSLIST',
          location: 'orlando',
          category: 'furniture',
          status: 'RUNNING',
          listingsFound: 0,
          opportunitiesFound: 0,
          createdAt: new Date(),
        },
      ];
      mockFindMany.mockResolvedValue(mockJobs);

      const request = createMockRequest('GET', '/api/scraper-jobs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it('should filter by status when provided', async () => {
      mockFindMany.mockResolvedValue([]);

      const request = createMockRequest('GET', '/api/scraper-jobs?status=RUNNING');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { status: 'RUNNING' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should filter by platform when provided', async () => {
      mockFindMany.mockResolvedValue([]);

      const request = createMockRequest('GET', '/api/scraper-jobs?platform=CRAIGSLIST');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { platform: 'CRAIGSLIST' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should respect limit parameter', async () => {
      mockFindMany.mockResolvedValue([]);

      const request = createMockRequest('GET', '/api/scraper-jobs?limit=10');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });

    it('should return 500 on database error', async () => {
      mockFindMany.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('GET', '/api/scraper-jobs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch scraper jobs');
    });
  });

  describe('POST /api/scraper-jobs', () => {
    it('should create a new scraper job', async () => {
      const newJob = {
        platform: 'CRAIGSLIST',
        location: 'tampa',
        category: 'electronics',
      };
      mockCreate.mockResolvedValue({
        id: 'job-1',
        ...newJob,
        status: 'PENDING',
        listingsFound: 0,
        opportunitiesFound: 0,
      });

      const request = createMockRequest('POST', '/api/scraper-jobs', newJob);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.platform).toBe('CRAIGSLIST');
      expect(data.status).toBe('PENDING');
    });

    it('should return 400 if platform is missing', async () => {
      const request = createMockRequest('POST', '/api/scraper-jobs', {
        location: 'tampa',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Platform');
    });

    it('should return 400 for invalid platform', async () => {
      const request = createMockRequest('POST', '/api/scraper-jobs', {
        platform: 'INVALID_PLATFORM',
        location: 'tampa',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid platform');
    });

    it('should accept all valid platforms', async () => {
      const platforms = ['CRAIGSLIST', 'FACEBOOK_MARKETPLACE', 'EBAY', 'OFFERUP'];

      for (const platform of platforms) {
        mockCreate.mockResolvedValue({ id: 'job-1', platform, status: 'PENDING' });

        const request = createMockRequest('POST', '/api/scraper-jobs', {
          platform,
          location: 'tampa',
        });
        const response = await POST(request);

        expect(response.status).toBe(201);
      }
    });

    it('should allow optional location and category', async () => {
      mockCreate.mockResolvedValue({ id: 'job-1', platform: 'CRAIGSLIST', status: 'PENDING' });

      const request = createMockRequest('POST', '/api/scraper-jobs', {
        platform: 'CRAIGSLIST',
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          platform: 'CRAIGSLIST',
          location: null,
          category: null,
          status: 'PENDING',
        },
      });
    });

    it('should return 500 on database error', async () => {
      mockCreate.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('POST', '/api/scraper-jobs', {
        platform: 'CRAIGSLIST',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create scraper job');
    });
  });

  describe('GET /api/scraper-jobs/[id]', () => {
    it('should return a single scraper job', async () => {
      const mockJob = {
        id: 'job-1',
        platform: 'CRAIGSLIST',
        location: 'tampa',
        status: 'COMPLETED',
        listingsFound: 25,
      };
      mockFindUnique.mockResolvedValue(mockJob);

      const request = createMockRequest('GET', '/api/scraper-jobs/job-1');
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'job-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockJob);
    });

    it('should return 404 if job not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const request = createMockRequest('GET', '/api/scraper-jobs/nonexistent');
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Scraper job not found');
    });

    it('should return 500 on database error', async () => {
      mockFindUnique.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('GET', '/api/scraper-jobs/job-1');
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'job-1' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch scraper job');
    });
  });

  describe('PATCH /api/scraper-jobs/[id]', () => {
    it('should update a scraper job status', async () => {
      const updatedJob = {
        id: 'job-1',
        status: 'RUNNING',
        startedAt: new Date(),
      };
      mockUpdate.mockResolvedValue(updatedJob);

      const request = createMockRequest('PATCH', '/api/scraper-jobs/job-1', {
        status: 'RUNNING',
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'job-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('RUNNING');
    });

    it('should update listingsFound and opportunitiesFound', async () => {
      mockUpdate.mockResolvedValue({ id: 'job-1' });

      const request = createMockRequest('PATCH', '/api/scraper-jobs/job-1', {
        listingsFound: 25,
        opportunitiesFound: 5,
      });
      await PATCH(request, { params: Promise.resolve({ id: 'job-1' }) });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { listingsFound: 25, opportunitiesFound: 5 },
      });
    });

    it('should update timestamps', async () => {
      const now = new Date().toISOString();
      mockUpdate.mockResolvedValue({ id: 'job-1' });

      const request = createMockRequest('PATCH', '/api/scraper-jobs/job-1', {
        startedAt: now,
        completedAt: now,
      });
      await PATCH(request, { params: Promise.resolve({ id: 'job-1' }) });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: {
          startedAt: expect.any(Date),
          completedAt: expect.any(Date),
        },
      });
    });

    it('should validate status on update', async () => {
      const request = createMockRequest('PATCH', '/api/scraper-jobs/job-1', {
        status: 'INVALID_STATUS',
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'job-1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid status');
    });

    it('should update error message', async () => {
      mockUpdate.mockResolvedValue({ id: 'job-1' });

      const request = createMockRequest('PATCH', '/api/scraper-jobs/job-1', {
        errorMessage: 'Scraping failed: timeout',
      });
      await PATCH(request, { params: Promise.resolve({ id: 'job-1' }) });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { errorMessage: 'Scraping failed: timeout' },
      });
    });

    it('should return 500 on database error', async () => {
      mockUpdate.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('PATCH', '/api/scraper-jobs/job-1', {
        status: 'RUNNING',
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'job-1' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update scraper job');
    });
  });

  describe('DELETE /api/scraper-jobs/[id]', () => {
    it('should delete a scraper job', async () => {
      mockDelete.mockResolvedValue({ id: 'job-1' });

      const request = createMockRequest('DELETE', '/api/scraper-jobs/job-1');
      const response = await DELETE(request, { params: Promise.resolve({ id: 'job-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'job-1' } });
    });

    it('should return 500 on database error', async () => {
      mockDelete.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('DELETE', '/api/scraper-jobs/job-1');
      const response = await DELETE(request, { params: Promise.resolve({ id: 'job-1' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete scraper job');
    });
  });
});
