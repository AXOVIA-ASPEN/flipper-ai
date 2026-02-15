/**
 * @file Unit tests for POST /api/posting-queue/[id]/retry
 * @author Stephen Boyett
 * @company Axovia AI
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/posting-queue/[id]/retry/route';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    postingQueueItem: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn(),
}));

const mockAuth = getAuthUserId as jest.MockedFunction<typeof getAuthUserId>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/posting-queue/item-1/retry', {
    method: 'POST',
  });
}

function makeContext(id = 'item-1') {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/posting-queue/[id]/retry', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as any);
    const res = await POST(makeRequest(), makeContext());
    expect(res.status).toBe(401);
  });

  it('returns 404 when queue item not found', async () => {
    mockAuth.mockResolvedValue('user-1');
    (mockPrisma.postingQueueItem.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeRequest(), makeContext());
    expect(res.status).toBe(404);
  });

  it('returns 400 when item is not in FAILED status', async () => {
    mockAuth.mockResolvedValue('user-1');
    (mockPrisma.postingQueueItem.findFirst as jest.Mock).mockResolvedValue({
      id: 'item-1',
      status: 'PENDING',
      retryCount: 0,
      maxRetries: 3,
    });
    const res = await POST(makeRequest(), makeContext());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Only failed items');
  });

  it('returns 400 when max retries exceeded', async () => {
    mockAuth.mockResolvedValue('user-1');
    (mockPrisma.postingQueueItem.findFirst as jest.Mock).mockResolvedValue({
      id: 'item-1',
      status: 'FAILED',
      retryCount: 3,
      maxRetries: 3,
    });
    const res = await POST(makeRequest(), makeContext());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Max retries');
  });

  it('successfully retries a failed item', async () => {
    mockAuth.mockResolvedValue('user-1');
    (mockPrisma.postingQueueItem.findFirst as jest.Mock).mockResolvedValue({
      id: 'item-1',
      status: 'FAILED',
      retryCount: 1,
      maxRetries: 3,
    });
    const updated = { id: 'item-1', status: 'PENDING', retryCount: 2, errorMessage: null };
    (mockPrisma.postingQueueItem.update as jest.Mock).mockResolvedValue(updated);

    const res = await POST(makeRequest(), makeContext());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('PENDING');
    expect(mockPrisma.postingQueueItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: {
        status: 'PENDING',
        retryCount: { increment: 1 },
        errorMessage: null,
      },
    });
  });

  it('returns 500 on unexpected error', async () => {
    mockAuth.mockResolvedValue('user-1');
    (mockPrisma.postingQueueItem.findFirst as jest.Mock).mockRejectedValue(new Error('DB down'));
    const res = await POST(makeRequest(), makeContext());
    expect(res.status).toBe(500);
  });
});
