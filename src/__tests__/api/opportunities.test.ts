import { NextRequest } from 'next/server';
import { GET } from '@/app/api/opportunities/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/opportunities/[id]/route';

// Mock auth - getCurrentUserId is used by GET /api/opportunities
const mockGetCurrentUserId = jest.fn<Promise<string | null>, []>();

jest.mock('@/lib/auth', () => ({
  getCurrentUserId: (...args: unknown[]) => mockGetCurrentUserId(...(args as [])),
}));

// Mock Prisma client
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockListingUpdate = jest.fn();
const mockTransaction = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    opportunity: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
    listing: {
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
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    ...(body && {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
  });
}

describe('Opportunities API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserId.mockResolvedValue('test-user-id');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /api/opportunities
  // ──────────────────────────────────────────────────────────────────────────
  describe('GET /api/opportunities', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetCurrentUserId.mockResolvedValue(null);

      const request = createMockRequest('GET', '/api/opportunities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return opportunities list with count', async () => {
      const mockOpportunities = [
        {
          id: 'opp1',
          userId: 'test-user-id',
          listingId: 'listing1',
          status: 'IDENTIFIED',
          purchasePrice: null,
          resalePrice: null,
          actualProfit: null,
          createdAt: '2026-01-15T10:00:00.000Z',
          listing: {
            id: 'listing1',
            title: 'Test Item',
            askingPrice: 100,
          },
        },
        {
          id: 'opp2',
          userId: 'test-user-id',
          listingId: 'listing2',
          status: 'PURCHASED',
          purchasePrice: 50,
          resalePrice: null,
          actualProfit: null,
          createdAt: '2026-01-14T10:00:00.000Z',
          listing: {
            id: 'listing2',
            title: 'Another Item',
            askingPrice: 200,
          },
        },
      ];

      mockFindMany.mockResolvedValue(mockOpportunities);

      const request = createMockRequest('GET', '/api/opportunities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.count).toBe(2);
      expect(data.opportunities).toEqual(mockOpportunities);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        include: { listing: true },
        orderBy: { createdAt: 'desc' },
        take: 25,
      });
    });

    it('should return empty list when no opportunities exist', async () => {
      mockFindMany.mockResolvedValue([]);

      const request = createMockRequest('GET', '/api/opportunities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.count).toBe(0);
      expect(data.opportunities).toEqual([]);
    });

    it('should respect the limit query parameter', async () => {
      mockFindMany.mockResolvedValue([]);

      const request = createMockRequest('GET', '/api/opportunities?limit=10');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });

    it('should default limit to 25 when not provided', async () => {
      mockFindMany.mockResolvedValue([]);

      const request = createMockRequest('GET', '/api/opportunities');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
        })
      );
    });

    it('should handle database errors with 500 status', async () => {
      mockFindMany.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest('GET', '/api/opportunities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /api/opportunities/[id]
  // ──────────────────────────────────────────────────────────────────────────
  describe('GET /api/opportunities/[id]', () => {
    it('should return a single opportunity with listing', async () => {
      const mockOpportunity = {
        id: 'opp1',
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
      };

      mockFindUnique.mockResolvedValue(mockOpportunity);

      const request = createMockRequest('GET', '/api/opportunities/opp1');
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: 'opp1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockOpportunity);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 'opp1' },
        include: { listing: true },
      });
    });

    it('should return 404 when opportunity is not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const request = createMockRequest('GET', '/api/opportunities/nonexistent');
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: 'nonexistent' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should handle database errors with 500 status', async () => {
      mockFindUnique.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('GET', '/api/opportunities/opp1');
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: 'opp1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PATCH /api/opportunities/[id]
  // ──────────────────────────────────────────────────────────────────────────
  describe('PATCH /api/opportunities/[id]', () => {
    it('should update an opportunity', async () => {
      const mockUpdated = {
        id: 'opp1',
        listingId: 'listing1',
        status: 'PURCHASED',
        purchasePrice: 100,
        resalePrice: null,
        actualProfit: null,
        listing: {
          id: 'listing1',
          title: 'Test Item',
        },
      };

      mockUpdate.mockResolvedValue(mockUpdated);

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        status: 'PURCHASED',
        purchasePrice: 100,
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'opp1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUpdated);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'opp1' },
        data: { status: 'PURCHASED', purchasePrice: 100 },
        include: { listing: true },
      });
    });

    it('should calculate actualProfit when purchasePrice and resalePrice are provided with fees', async () => {
      const mockUpdated = {
        id: 'opp1',
        purchasePrice: 100,
        resalePrice: 150,
        fees: 10,
        actualProfit: 40,
        listing: { id: 'listing1' },
      };

      mockUpdate.mockResolvedValue(mockUpdated);

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        purchasePrice: 100,
        resalePrice: 150,
        fees: 10,
      });
      await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });

      // actualProfit = resalePrice - purchasePrice - fees = 150 - 100 - 10 = 40
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actualProfit: 40,
          }),
        })
      );
    });

    it('should calculate actualProfit with fees defaulting to 0 when not provided', async () => {
      const mockUpdated = {
        id: 'opp1',
        purchasePrice: 100,
        resalePrice: 150,
        actualProfit: 50,
        listing: { id: 'listing1' },
      };

      mockUpdate.mockResolvedValue(mockUpdated);

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        purchasePrice: 100,
        resalePrice: 150,
      });
      await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });

      // actualProfit = 150 - 100 - 0 = 50
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actualProfit: 50,
          }),
        })
      );
    });

    it('should not calculate actualProfit when only purchasePrice is provided', async () => {
      mockUpdate.mockResolvedValue({
        id: 'opp1',
        purchasePrice: 100,
        listing: { id: 'listing1' },
      });

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        purchasePrice: 100,
      });
      await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'opp1' },
        data: { purchasePrice: 100 },
        include: { listing: true },
      });
    });

    it('should not calculate actualProfit when only resalePrice is provided', async () => {
      mockUpdate.mockResolvedValue({
        id: 'opp1',
        resalePrice: 200,
        listing: { id: 'listing1' },
      });

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        resalePrice: 200,
      });
      await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'opp1' },
        data: { resalePrice: 200 },
        include: { listing: true },
      });
    });

    it('should handle status transition to SOLD with profit calculation', async () => {
      const mockUpdated = {
        id: 'opp1',
        status: 'SOLD',
        purchasePrice: 500,
        resalePrice: 900,
        fees: 50,
        actualProfit: 350,
        listing: { id: 'listing1' },
      };

      mockUpdate.mockResolvedValue(mockUpdated);

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        status: 'SOLD',
        purchasePrice: 500,
        resalePrice: 900,
        fees: 50,
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'opp1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('SOLD');
      // actualProfit = 900 - 500 - 50 = 350
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SOLD',
            actualProfit: 350,
          }),
        })
      );
    });

    it('should persist dates when provided', async () => {
      const purchaseDate = '2026-01-01T12:00:00.000Z';
      const resaleDate = '2026-02-15T09:30:00.000Z';

      mockUpdate.mockResolvedValue({
        id: 'opp1',
        purchaseDate,
        resaleDate,
        listing: { id: 'listing1' },
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

    it('should handle database errors with 500 status', async () => {
      mockUpdate.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        status: 'PURCHASED',
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'opp1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE /api/opportunities/[id]
  // ──────────────────────────────────────────────────────────────────────────
  describe('DELETE /api/opportunities/[id]', () => {
    it('should delete an opportunity and reset listing status', async () => {
      mockFindUnique.mockResolvedValue({ listingId: 'listing1' });
      mockTransaction.mockResolvedValue([{}, {}]);

      const request = createMockRequest('DELETE', '/api/opportunities/opp1');
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'opp1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 'opp1' },
        select: { listingId: true },
      });
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should return 404 when opportunity is not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const request = createMockRequest('DELETE', '/api/opportunities/nonexistent');
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'nonexistent' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should handle database errors during findUnique with 500 status', async () => {
      mockFindUnique.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('DELETE', '/api/opportunities/opp1');
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'opp1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle database errors during transaction with 500 status', async () => {
      mockFindUnique.mockResolvedValue({ listingId: 'listing1' });
      mockTransaction.mockRejectedValue(new Error('Transaction failed'));

      const request = createMockRequest('DELETE', '/api/opportunities/opp1');
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'opp1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
