/**
 * @file src/__tests__/messages-threads-api.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Unit tests for message thread API endpoints.
 *
 * @description
 * Tests for GET /api/messages/threads (thread list) and
 * GET /api/messages/threads/[listingId] (thread detail) covering
 * thread grouping, ordering, unread counts, search, pagination,
 * auth, auto-read marking, and edge cases.
 */

import { NextRequest } from 'next/server';
import { GET as getThreads } from '@/app/api/messages/threads/route';
import { GET as getThreadDetail } from '@/app/api/messages/threads/[listingId]/route';

// Mock auth
const mockGetAuthUserId = jest.fn(() => Promise.resolve('test-user-id'));
jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: (...args: unknown[]) => mockGetAuthUserId(...args),
}));

// Mock prisma
const mockGroupBy = jest.fn();
const mockFindMany = jest.fn();
const mockUpdateMany = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    message: {
      groupBy: (...args: unknown[]) => mockGroupBy(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}));

const createRequest = (url: string) =>
  new NextRequest(new URL(url, 'http://localhost:3000'));

// ── Test Data ──────────────────────────────────────────────────────────────

const now = new Date('2026-03-31T12:00:00Z');
const yesterday = new Date('2026-03-30T12:00:00Z');

const sampleListing = {
  id: 'listing-1',
  title: 'iPhone 15 Pro',
  platform: 'EBAY',
  askingPrice: 800,
  imageUrls: '["https://example.com/img.jpg"]',
};

const sampleListing2 = {
  id: 'listing-2',
  title: 'MacBook Air M3',
  platform: 'CRAIGSLIST',
  askingPrice: 900,
  imageUrls: null,
};

const sampleGroupResult = [
  { listingId: 'listing-1', _count: 5, _max: { createdAt: now } },
  { listingId: 'listing-2', _count: 2, _max: { createdAt: yesterday } },
];

const sampleLatestMessages = [
  {
    id: 'msg-5',
    userId: 'test-user-id',
    listingId: 'listing-1',
    direction: 'OUTBOUND',
    status: 'SENT',
    body: 'Is this still available? I am very interested in purchasing.',
    sellerName: 'Alice',
    createdAt: now,
    listing: sampleListing,
  },
  {
    id: 'msg-2',
    userId: 'test-user-id',
    listingId: 'listing-2',
    direction: 'INBOUND',
    status: 'DELIVERED',
    body: 'Yes it is available.',
    sellerName: 'Bob',
    createdAt: yesterday,
    listing: sampleListing2,
  },
];

const sampleUnreadCounts = [
  { listingId: 'listing-1', _count: 2 },
];

const sampleThreadMessages = [
  {
    id: 'msg-1',
    userId: 'test-user-id',
    listingId: 'listing-1',
    direction: 'OUTBOUND',
    status: 'SENT',
    subject: 'About your listing',
    body: 'Hi, is this available?',
    sellerName: 'Alice',
    platform: 'EBAY',
    parentId: null,
    sentAt: yesterday,
    readAt: null,
    createdAt: yesterday,
    listing: sampleListing,
  },
  {
    id: 'msg-2',
    userId: 'test-user-id',
    listingId: 'listing-1',
    direction: 'INBOUND',
    status: 'DELIVERED',
    subject: null,
    body: 'Yes it is! Are you interested?',
    sellerName: 'Alice',
    platform: 'EBAY',
    parentId: 'msg-1',
    sentAt: null,
    readAt: null,
    createdAt: now,
    listing: sampleListing,
  },
];

// ── GET /api/messages/threads ──────────────────────────────────────────────

describe('GET /api/messages/threads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue('test-user-id');
    mockGroupBy
      .mockResolvedValueOnce(sampleGroupResult) // main groupBy
      .mockResolvedValueOnce(sampleUnreadCounts); // unread groupBy
    mockFindMany.mockResolvedValue(sampleLatestMessages);
  });

  it('returns threads grouped by listing with correct metadata', async () => {
    const res = await getThreads(createRequest('/api/messages/threads'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);

    const thread1 = json.data[0]; // listing-1 (most recent)
    expect(thread1.listingId).toBe('listing-1');
    expect(thread1.listing.title).toBe('iPhone 15 Pro');
    expect(thread1.messageCount).toBe(5);
    expect(thread1.unreadCount).toBe(2);
    expect(thread1.sellerName).toBe('Alice');
    expect(thread1.lastMessage.direction).toBe('OUTBOUND');
  });

  it('orders threads by lastMessageAt DESC (most recent first)', async () => {
    const res = await getThreads(createRequest('/api/messages/threads'));
    const json = await res.json();

    expect(json.data[0].listingId).toBe('listing-1'); // now
    expect(json.data[1].listingId).toBe('listing-2'); // yesterday
  });

  it('calculates unread count from INBOUND + readAt null', async () => {
    const res = await getThreads(createRequest('/api/messages/threads'));
    const json = await res.json();

    // listing-1 has 2 unread, listing-2 has 0
    expect(json.data[0].unreadCount).toBe(2);
    expect(json.data[1].unreadCount).toBe(0);
  });

  it('filters by search (listing title)', async () => {
    const res = await getThreads(
      createRequest('/api/messages/threads?search=iPhone')
    );
    const json = await res.json();

    expect(json.data).toHaveLength(1);
    expect(json.data[0].listing.title).toBe('iPhone 15 Pro');
  });

  it('filters by search (seller name)', async () => {
    const res = await getThreads(
      createRequest('/api/messages/threads?search=Bob')
    );
    const json = await res.json();

    expect(json.data).toHaveLength(1);
    expect(json.data[0].sellerName).toBe('Bob');
  });

  it('supports pagination with limit and offset', async () => {
    const res = await getThreads(
      createRequest('/api/messages/threads?limit=1&offset=0')
    );
    const json = await res.json();

    expect(json.data).toHaveLength(1);
    expect(json.pagination).toEqual({
      total: 2,
      limit: 1,
      offset: 0,
      hasMore: true,
    });
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUserId.mockResolvedValue(null);

    const res = await getThreads(createRequest('/api/messages/threads'));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it('excludes messages with null listingId', async () => {
    // groupBy where clause should require listingId not null
    await getThreads(createRequest('/api/messages/threads'));

    expect(mockGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'test-user-id',
          listingId: { not: null },
        }),
      })
    );
  });

  it('handles deleted listing (listing relation null)', async () => {
    mockFindMany.mockResolvedValue([
      {
        ...sampleLatestMessages[0],
        listing: null,
      },
    ]);

    const res = await getThreads(createRequest('/api/messages/threads'));
    const json = await res.json();

    expect(json.data[0].listing).toBeNull();
    expect(json.data[0].listingId).toBe('listing-1');
  });

  it('returns empty data when no threads exist', async () => {
    mockGroupBy.mockReset();
    mockGroupBy.mockResolvedValue([]);

    const res = await getThreads(createRequest('/api/messages/threads'));
    const json = await res.json();

    expect(json.data).toEqual([]);
    expect(json.pagination.total).toBe(0);
  });

  it('truncates last message body to 100 characters', async () => {
    const longBody = 'A'.repeat(150);
    mockFindMany.mockResolvedValue([
      { ...sampleLatestMessages[0], body: longBody },
    ]);
    mockGroupBy
      .mockReset()
      .mockResolvedValueOnce([sampleGroupResult[0]])
      .mockResolvedValueOnce([]);

    const res = await getThreads(createRequest('/api/messages/threads'));
    const json = await res.json();

    expect(json.data[0].lastMessage.body).toHaveLength(103); // 100 + '...'
    expect(json.data[0].lastMessage.body.endsWith('...')).toBe(true);
  });

  it('caps limit at 100', async () => {
    const res = await getThreads(
      createRequest('/api/messages/threads?limit=500')
    );
    const json = await res.json();

    expect(json.pagination.limit).toBe(100);
  });
});

// ── GET /api/messages/threads/[listingId] ──────────────────────────────────

describe('GET /api/messages/threads/[listingId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue('test-user-id');
    mockFindMany.mockResolvedValue(sampleThreadMessages);
    mockUpdateMany.mockResolvedValue({ count: 1 });
  });

  const callThreadDetail = (listingId: string) =>
    getThreadDetail(
      new Request(`http://localhost:3000/api/messages/threads/${listingId}`),
      { params: Promise.resolve({ listingId }) }
    );

  it('returns chronological messages for a listing', async () => {
    const res = await callThreadDetail('listing-1');
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.messages).toHaveLength(2);
    // Oldest first (chronological)
    expect(json.data.messages[0].id).toBe('msg-1');
    expect(json.data.messages[1].id).toBe('msg-2');
  });

  it('auto-marks inbound messages as read (fire-and-forget)', async () => {
    await callThreadDetail('listing-1');

    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'test-user-id',
          listingId: 'listing-1',
          direction: 'INBOUND',
          readAt: null,
        }),
        data: expect.objectContaining({
          readAt: expect.any(Date),
        }),
      })
    );
  });

  it('includes listing details in response', async () => {
    const res = await callThreadDetail('listing-1');
    const json = await res.json();

    expect(json.data.listing).toEqual({
      id: 'listing-1',
      title: 'iPhone 15 Pro',
      platform: 'EBAY',
      askingPrice: 800,
      imageUrls: '["https://example.com/img.jpg"]',
    });
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUserId.mockResolvedValue(null);

    const res = await callThreadDetail('listing-1');
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it('enforces user ownership isolation (filters by userId)', async () => {
    await callThreadDetail('listing-1');

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'test-user-id',
          listingId: 'listing-1',
        }),
      })
    );
  });

  it('returns 404 if user has no messages for listing', async () => {
    mockFindMany.mockResolvedValue([]);

    const res = await callThreadDetail('nonexistent-listing');
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
  });

  it('includes all required message fields', async () => {
    const res = await callThreadDetail('listing-1');
    const json = await res.json();

    const msg = json.data.messages[0];
    expect(msg).toHaveProperty('id');
    expect(msg).toHaveProperty('direction');
    expect(msg).toHaveProperty('status');
    expect(msg).toHaveProperty('body');
    expect(msg).toHaveProperty('parentId');
    expect(msg).toHaveProperty('createdAt');
  });

  it('handles deleted listing (null listing relation)', async () => {
    mockFindMany.mockResolvedValue([
      { ...sampleThreadMessages[0], listing: null },
    ]);

    const res = await callThreadDetail('listing-1');
    const json = await res.json();

    expect(json.data.listing).toBeNull();
    expect(json.data.messages).toHaveLength(1);
  });

  it('returns thread meta with message count and unread count', async () => {
    const res = await callThreadDetail('listing-1');
    const json = await res.json();

    expect(json.data.threadMeta).toEqual({
      messageCount: 2,
      unreadCount: 1, // msg-2 is INBOUND with readAt null
    });
  });

  it('returns seller name from messages', async () => {
    const res = await callThreadDetail('listing-1');
    const json = await res.json();

    expect(json.data.sellerName).toBe('Alice');
  });

  it('swallows auto-read errors gracefully', async () => {
    mockUpdateMany.mockRejectedValue(new Error('DB error'));

    // Should not throw
    const res = await callThreadDetail('listing-1');
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });
});
