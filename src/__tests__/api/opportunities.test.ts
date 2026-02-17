import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/opportunities/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/opportunities/[id]/route';

// Mock Prisma client
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockTransaction = jest.fn();
const mockAggregate = jest.fn();
const mockCount = jest.fn();
const mockListingFindUnique = jest.fn();
const mockListingUpdate = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    opportunity: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
      aggregate: (...args: unknown[]) => mockAggregate(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
    listing: {
      findUnique: (...args: unknown[]) => mockListingFindUnique(...args),
      update: (...args: unknown[]) => mockListingUpdate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
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

describe('Opportunities API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/opportunities', () => {
    it('should return opportunities with stats', async () => {
      const mockOpportunities = [
        {
          id: '1',
          listingId: 'listing1',
          status: 'IDENTIFIED',
          purchasePrice: null,
          resalePrice: null,
          actualProfit: null,
          listing: {
            id: 'listing1',
            title: 'Test Item',
            askingPrice: 100,
          },
        },
      ];

      const mockStats = {
        _sum: {
          actualProfit: 500,
          purchasePrice: 1000,
          resalePrice: 1500,
        },
        _count: 1,
      };

      mockFindMany.mockResolvedValue(mockOpportunities);
      mockCount.mockResolvedValue(1);
      mockAggregate.mockResolvedValue(mockStats);

      const request = createMockRequest('GET', '/api/opportunities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.opportunities).toEqual(mockOpportunities);
      expect(data.stats.totalOpportunities).toBe(1);
      expect(data.stats.totalProfit).toBe(500);
      expect(data.stats.totalInvested).toBe(1000);
      expect(data.stats.totalRevenue).toBe(1500);
    });

    it('should filter opportunities by status', async () => {
      const mockOpportunities = [
        {
          id: '1',
          listingId: 'listing1',
          status: 'PURCHASED',
          purchasePrice: 100,
        },
      ];

      mockFindMany.mockResolvedValue(mockOpportunities);
      mockCount.mockResolvedValue(1);
      mockAggregate.mockResolvedValue({
        _sum: { actualProfit: 0, purchasePrice: 0, resalePrice: 0 },
        _count: 1,
      });

      const request = createMockRequest('GET', '/api/opportunities?status=PURCHASED');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PURCHASED' },
        })
      );
    });

    it('should handle errors gracefully', async () => {
      mockFindMany.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('GET', '/api/opportunities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch opportunities');
    });

    it('should filter by platform via listing relation', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);
      mockAggregate.mockResolvedValue({
        _sum: { actualProfit: 0, purchasePrice: 0, resalePrice: 0 },
        _count: 0,
      });

      const request = createMockRequest('GET', '/api/opportunities?platform=EBAY');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            listing: expect.objectContaining({ platform: 'EBAY' }),
          }),
        })
      );
    });

    it('should filter by minScore and maxScore', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);
      mockAggregate.mockResolvedValue({
        _sum: { actualProfit: 0, purchasePrice: 0, resalePrice: 0 },
        _count: 0,
      });

      const request = createMockRequest('GET', '/api/opportunities?minScore=50&maxScore=90');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            listing: expect.objectContaining({
              valueScore: { gte: 50, lte: 90 },
            }),
          }),
        })
      );
    });

    it('should filter by minProfit and maxProfit', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);
      mockAggregate.mockResolvedValue({
        _sum: { actualProfit: 0, purchasePrice: 0, resalePrice: 0 },
        _count: 0,
      });

      const request = createMockRequest('GET', '/api/opportunities?minProfit=100&maxProfit=500');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            listing: expect.objectContaining({
              profitPotential: { gte: 100, lte: 500 },
            }),
          }),
        })
      );
    });

    it('should combine multiple filters', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);
      mockAggregate.mockResolvedValue({
        _sum: { actualProfit: 0, purchasePrice: 0, resalePrice: 0 },
        _count: 0,
      });

      const request = createMockRequest(
        'GET',
        '/api/opportunities?status=IDENTIFIED&platform=CRAIGSLIST&minScore=70&minProfit=50'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'IDENTIFIED',
            listing: expect.objectContaining({
              platform: 'CRAIGSLIST',
              valueScore: { gte: 70 },
              profitPotential: { gte: 50 },
            }),
          }),
        })
      );
    });
  });

  describe('POST /api/opportunities', () => {
    it('should create a new opportunity from a listing', async () => {
      const mockListing = {
        id: 'listing1',
        title: 'Test Item',
      };

      const mockOpportunity = {
        id: 'opp1',
        listingId: 'listing1',
        status: 'IDENTIFIED',
      };

      mockListingFindUnique.mockResolvedValue(mockListing);
      mockFindUnique.mockResolvedValue(null); // No existing opportunity
      mockTransaction.mockResolvedValue([mockOpportunity, {}]);

      const request = createMockRequest('POST', '/api/opportunities', {
        listingId: 'listing1',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockOpportunity);
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should return 404 when listing is not found', async () => {
      mockListingFindUnique.mockResolvedValue(null);

      const request = createMockRequest('POST', '/api/opportunities', {
        listingId: 'missing-listing',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Listing not found');
      expect(mockFindUnique).not.toHaveBeenCalled();
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('should prevent creating duplicate opportunities for a listing', async () => {
      mockListingFindUnique.mockResolvedValue({ id: 'listing1' });
      mockFindUnique.mockResolvedValue({ id: 'existing-opp', listingId: 'listing1' });

      const request = createMockRequest('POST', '/api/opportunities', {
        listingId: 'listing1',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Opportunity already exists for this listing');
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('should handle missing listingId', async () => {
      const request = createMockRequest('POST', '/api/opportunities', {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should handle errors gracefully', async () => {
      const mockListing = {
        id: 'listing1',
        title: 'Test Item',
      };

      mockListingFindUnique.mockResolvedValue(mockListing);
      mockFindUnique.mockResolvedValue(null); // No existing opportunity
      mockTransaction.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('POST', '/api/opportunities', {
        listingId: 'listing1',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create opportunity');
    });
  });

  describe('GET /api/opportunities/[id]', () => {
    it('should return a single opportunity', async () => {
      const mockOpportunity = {
        id: 'opp1',
        listingId: 'listing1',
        status: 'IDENTIFIED',
        listing: {
          id: 'listing1',
          title: 'Test Item',
        },
      };

      mockFindUnique.mockResolvedValue(mockOpportunity);

      const request = createMockRequest('GET', '/api/opportunities/opp1');
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'opp1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockOpportunity);
    });

    it('should return 404 if opportunity not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const request = createMockRequest('GET', '/api/opportunities/nonexistent');
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Opportunity not found');
    });
  });

  describe('PATCH /api/opportunities/[id]', () => {
    it('should update an opportunity', async () => {
      const mockUpdatedOpportunity = {
        id: 'opp1',
        listingId: 'listing1',
        status: 'PURCHASED',
        purchasePrice: 100,
        resalePrice: null,
        actualProfit: null,
      };

      mockUpdate.mockResolvedValue(mockUpdatedOpportunity);

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        status: 'PURCHASED',
        purchasePrice: 100,
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUpdatedOpportunity);
    });

    it('should calculate actualProfit when purchasePrice and resalePrice are provided', async () => {
      const mockUpdatedOpportunity = {
        id: 'opp1',
        purchasePrice: 100,
        resalePrice: 150,
        fees: 10,
        actualProfit: 40,
      };

      mockUpdate.mockResolvedValue(mockUpdatedOpportunity);

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        purchasePrice: 100,
        resalePrice: 150,
        fees: 10,
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actualProfit: 40,
          }),
        })
      );
    });

    it('should handle valid status transitions', async () => {
      const mockUpdatedOpportunity = {
        id: 'opp1',
        status: 'SOLD',
        purchasePrice: 500,
        resalePrice: 900,
        fees: 50,
        actualProfit: 350,
      };

      mockUpdate.mockResolvedValue(mockUpdatedOpportunity);

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        status: 'SOLD',
        purchasePrice: 500,
        resalePrice: 900,
        fees: 50,
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('SOLD');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SOLD',
            actualProfit: 350,
          }),
        })
      );
    });

    it('should persist purchase and resale dates when provided', async () => {
      const purchaseDate = '2024-01-01T12:00:00.000Z';
      const resaleDate = '2024-02-15T09:30:00.000Z';

      mockUpdate.mockResolvedValue({
        id: 'opp1',
        purchaseDate,
        resaleDate,
      });

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        purchaseDate,
        resaleDate,
      });
      await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            purchaseDate,
            resaleDate,
          }),
        })
      );
    });

    it('should handle errors gracefully', async () => {
      mockUpdate.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        status: 'PURCHASED',
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update opportunity');
    });
  });

  describe('DELETE /api/opportunities/[id]', () => {
    it('should delete an opportunity and reset listing status', async () => {
      const mockOpportunity = {
        listingId: 'listing1',
      };

      mockFindUnique.mockResolvedValue(mockOpportunity);
      mockTransaction.mockResolvedValue([{}, {}]);

      const request = createMockRequest('DELETE', '/api/opportunities/opp1');
      const response = await DELETE(request, { params: Promise.resolve({ id: 'opp1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should return 404 if opportunity not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const request = createMockRequest('DELETE', '/api/opportunities/nonexistent');
      const response = await DELETE(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Opportunity not found');
    });

    it('should handle errors gracefully', async () => {
      mockFindUnique.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('DELETE', '/api/opportunities/opp1');
      const response = await DELETE(request, { params: Promise.resolve({ id: 'opp1' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete opportunity');
    });
  });
});

// ── Additional branch coverage ────────────────────────────────────────────────
describe('Opportunities API - branch coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
  });

  it('returns 400 for invalid query params', async () => {
    const request = createMockRequest('GET', '/api/opportunities?minScore=not-a-number');
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it('GET with valid status enum param returns 200', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
    // Use a valid status enum value
    const request = createMockRequest('GET', '/api/opportunities?status=PURCHASED');
    const response = await GET(request);
    expect(response.status).toBe(200);
  });
});
