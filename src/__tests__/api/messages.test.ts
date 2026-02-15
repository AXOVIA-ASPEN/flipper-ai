import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/messages/route';

// Mock auth
jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn(() => Promise.resolve('test-user-id')),
}));

// Mock prisma
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockCreate = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    message: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

const createRequest = (url: string, options?: RequestInit) =>
  new NextRequest(new URL(url, 'http://localhost:3000'), options);

const sampleMessage = {
  id: 'msg-1',
  userId: 'test-user-id',
  listingId: 'listing-1',
  direction: 'INBOUND',
  status: 'DELIVERED',
  subject: 'About your listing',
  body: 'Is this still available?',
  sellerName: 'John Doe',
  sellerContact: 'john@example.com',
  platform: 'craigslist',
  parentId: null,
  sentAt: null,
  readAt: null,
  createdAt: '2026-02-15T00:00:00Z',
  listing: {
    id: 'listing-1',
    title: 'iPhone 15',
    platform: 'craigslist',
    askingPrice: 500,
    imageUrls: null,
  },
};

describe('GET /api/messages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindMany.mockResolvedValue([sampleMessage]);
    mockCount.mockResolvedValue(1);
  });

  it('returns messages for authenticated user', async () => {
    const res = await GET(createRequest('/api/messages'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe('msg-1');
    expect(json.pagination).toEqual({ total: 1, limit: 50, offset: 0, hasMore: false });
  });

  it('filters by direction=INBOUND', async () => {
    await GET(createRequest('/api/messages?direction=INBOUND'));
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'test-user-id', direction: 'INBOUND' }),
      })
    );
  });

  it('filters by direction=OUTBOUND', async () => {
    await GET(createRequest('/api/messages?direction=OUTBOUND'));
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ direction: 'OUTBOUND' }),
      })
    );
  });

  it('ignores invalid direction', async () => {
    await GET(createRequest('/api/messages?direction=INVALID'));
    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.direction).toBeUndefined();
  });

  it('filters by status', async () => {
    await GET(createRequest('/api/messages?status=DRAFT'));
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'DRAFT' }),
      })
    );
  });

  it('filters by listingId', async () => {
    await GET(createRequest('/api/messages?listingId=listing-1'));
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ listingId: 'listing-1' }),
      })
    );
  });

  it('searches by text', async () => {
    await GET(createRequest('/api/messages?search=hello'));
    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { body: { contains: 'hello' } },
      { subject: { contains: 'hello' } },
      { sellerName: { contains: 'hello' } },
    ]);
  });

  it('supports sorting by valid fields', async () => {
    await GET(createRequest('/api/messages?sortBy=status&sortOrder=asc'));
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { status: 'asc' },
      })
    );
  });

  it('defaults to createdAt desc for invalid sort field', async () => {
    await GET(createRequest('/api/messages?sortBy=hackField'));
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      })
    );
  });

  it('caps limit at 100', async () => {
    await GET(createRequest('/api/messages?limit=999'));
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
  });

  it('supports pagination offset', async () => {
    await GET(createRequest('/api/messages?offset=20&limit=10'));
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 10 }));
  });

  it('returns hasMore=true when more results exist', async () => {
    mockCount.mockResolvedValue(100);
    const res = await GET(createRequest('/api/messages?limit=10&offset=0'));
    const json = await res.json();
    expect(json.pagination.hasMore).toBe(true);
  });

  it('returns 401 when not authenticated', async () => {
    const { getAuthUserId } = require('@/lib/auth-middleware');
    getAuthUserId.mockResolvedValueOnce(null);
    const res = await GET(createRequest('/api/messages'));
    expect(res.status).toBe(401);
  });

  it('returns 500 on database error', async () => {
    mockFindMany.mockRejectedValue(new Error('DB error'));
    const res = await GET(createRequest('/api/messages'));
    expect(res.status).toBe(500);
  });

  it('includes listing relation in response', async () => {
    await GET(createRequest('/api/messages'));
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          listing: expect.objectContaining({
            select: expect.objectContaining({ id: true, title: true }),
          }),
        }),
      })
    );
  });
});

describe('POST /api/messages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({ ...sampleMessage, direction: 'OUTBOUND', status: 'PENDING_APPROVAL' });
  });

  it('creates an outbound message', async () => {
    const res = await POST(
      createRequest('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          listingId: 'listing-1',
          direction: 'OUTBOUND',
          messageBody: 'Hello, is this available?',
          sellerName: 'Jane',
          platform: 'craigslist',
        }),
      })
    );
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'test-user-id',
          direction: 'OUTBOUND',
          body: 'Hello, is this available?',
          status: 'PENDING_APPROVAL',
        }),
      })
    );
  });

  it('creates an inbound message with DELIVERED status', async () => {
    await POST(
      createRequest('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          direction: 'INBOUND',
          messageBody: 'Reply from seller',
        }),
      })
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direction: 'INBOUND',
          status: 'DELIVERED',
        }),
      })
    );
  });

  it('sets sentAt when status is SENT', async () => {
    await POST(
      createRequest('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          direction: 'OUTBOUND',
          messageBody: 'Sent message',
          status: 'SENT',
        }),
      })
    );
    const data = mockCreate.mock.calls[0][0].data;
    expect(data.sentAt).toBeInstanceOf(Date);
  });

  it('returns 400 when messageBody is missing', async () => {
    const res = await POST(
      createRequest('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ direction: 'OUTBOUND' }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when direction is missing', async () => {
    const res = await POST(
      createRequest('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ messageBody: 'test' }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid direction', async () => {
    const res = await POST(
      createRequest('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ messageBody: 'test', direction: 'INVALID' }),
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('INBOUND or OUTBOUND');
  });

  it('returns 401 when not authenticated', async () => {
    const { getAuthUserId } = require('@/lib/auth-middleware');
    getAuthUserId.mockResolvedValueOnce(null);
    const res = await POST(
      createRequest('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ direction: 'OUTBOUND', messageBody: 'test' }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 500 on database error', async () => {
    mockCreate.mockRejectedValue(new Error('DB error'));
    const res = await POST(
      createRequest('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ direction: 'OUTBOUND', messageBody: 'test' }),
      })
    );
    expect(res.status).toBe(500);
  });

  it('handles optional fields as null', async () => {
    await POST(
      createRequest('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ direction: 'INBOUND', messageBody: 'bare message' }),
      })
    );
    const data = mockCreate.mock.calls[0][0].data;
    expect(data.listingId).toBeNull();
    expect(data.subject).toBeNull();
    expect(data.sellerName).toBeNull();
    expect(data.sellerContact).toBeNull();
    expect(data.platform).toBeNull();
    expect(data.parentId).toBeNull();
  });

  it('supports parentId for threaded replies', async () => {
    await POST(
      createRequest('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          direction: 'OUTBOUND',
          messageBody: 'Reply',
          parentId: 'msg-parent',
        }),
      })
    );
    const data = mockCreate.mock.calls[0][0].data;
    expect(data.parentId).toBe('msg-parent');
  });
});
