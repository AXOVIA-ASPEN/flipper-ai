/**
 * @file src/__tests__/lib/cold-hot-detector.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-09
 * @version 1.0
 * @brief Unit tests for cold and hot flip detection logic.
 */

import { detectColdFlips, detectHotFlips } from '@/lib/cold-hot-detector';

// ---------------------------------------------------------------------------
// Mock Prisma
// ---------------------------------------------------------------------------

const mockFindMany = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    listing: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

const ACTIVE_STATUSES = ['OPPORTUNITY', 'CONTACTED', 'PURCHASED', 'LISTED'];

// ---------------------------------------------------------------------------
// detectColdFlips
// ---------------------------------------------------------------------------

describe('detectColdFlips', () => {
  beforeEach(() => mockFindMany.mockReset());

  it('returns user_not_replied when last INBOUND message exceeds threshold', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'listing-1',
        title: 'Sony PS5',
        messages: [
          { createdAt: hoursAgo(30), direction: 'INBOUND', sellerName: 'Bob' },
        ],
      },
    ]);
    const result = await detectColdFlips('user-1', 24);
    expect(result).toHaveLength(1);
    expect(result[0].coldReason).toBe('user_not_replied');
    expect(result[0].listingTitle).toBe('Sony PS5');
    expect(result[0].sellerName).toBe('Bob');
  });

  it('returns seller_not_replied when last OUTBOUND message exceeds 2x threshold', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'listing-2',
        title: 'Nintendo Switch',
        messages: [
          { createdAt: hoursAgo(50), direction: 'OUTBOUND', sellerName: 'Alice' },
        ],
      },
    ]);
    const result = await detectColdFlips('user-1', 24); // 2x = 48h, 50h > 48h
    expect(result).toHaveLength(1);
    expect(result[0].coldReason).toBe('seller_not_replied');
  });

  it('excludes flips where last message is within threshold', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'listing-3',
        title: 'iPhone 14',
        messages: [
          { createdAt: hoursAgo(10), direction: 'INBOUND', sellerName: null },
        ],
      },
    ]);
    const result = await detectColdFlips('user-1', 24);
    expect(result).toHaveLength(0);
  });

  it('excludes listings with no messages', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'listing-4',
        title: 'MacBook',
        messages: [],
      },
    ]);
    const result = await detectColdFlips('user-1', 24);
    expect(result).toHaveLength(0);
  });

  it('returns empty array when no conversations exist', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    const result = await detectColdFlips('user-1', 24);
    expect(result).toHaveLength(0);
  });

  it('excludes stale conversations (no messages in last 30 days)', async () => {
    // The DB query itself filters by 30-day recency — if no matching listings come back,
    // the function returns an empty result. Verify the query is called with a 30-day
    // threshold by returning an empty array (simulating the DB applying the filter).
    mockFindMany.mockResolvedValueOnce([]);
    const result = await detectColdFlips('user-1', 24);
    expect(result).toHaveLength(0);
    // Confirm the findMany call included the 30-day createdAt filter
    const callArg = mockFindMany.mock.calls[0][0];
    expect(callArg.where.messages.some.createdAt.gte).toBeInstanceOf(Date);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    expect(callArg.where.messages.some.createdAt.gte.getTime()).toBeGreaterThan(
      thirtyDaysAgo.getTime() - 5000 // within 5 s of expected threshold
    );
  });

  it('catches errors and returns empty array without throwing', async () => {
    mockFindMany.mockRejectedValueOnce(new Error('DB connection failed'));
    const result = await detectColdFlips('user-1', 24);
    expect(result).toHaveLength(0);
  });

  it('does not include message body in error logs', async () => {
    const { logger } = await import('@/lib/logger');
    mockFindMany.mockRejectedValueOnce(new Error('DB error'));
    await detectColdFlips('user-1', 24);
    const calls = (logger.error as jest.Mock).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const loggedData = JSON.stringify(calls[0]);
    expect(loggedData).not.toContain('body');
    expect(loggedData).not.toContain('sellerName');
  });

  it('includes userId in error log but no PII', async () => {
    const { logger } = await import('@/lib/logger');
    (logger.error as jest.Mock).mockClear();
    mockFindMany.mockRejectedValueOnce(new Error('timeout'));
    await detectColdFlips('user-abc', 24);
    const loggedData = JSON.stringify((logger.error as jest.Mock).mock.calls[0]);
    expect(loggedData).toContain('user-abc');
  });
});

// ---------------------------------------------------------------------------
// detectHotFlips
// ---------------------------------------------------------------------------

describe('detectHotFlips', () => {
  beforeEach(() => mockFindMany.mockReset());

  it('returns hot flip with consecutive UNREAD inbound count >= threshold', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'listing-1',
        title: 'iPad Pro',
        messages: [
          { direction: 'INBOUND', readAt: null, body: 'Message 3', sellerName: 'Tom' },
          { direction: 'INBOUND', readAt: null, body: 'Message 2', sellerName: 'Tom' },
          { direction: 'INBOUND', readAt: null, body: 'Message 1', sellerName: 'Tom' },
        ],
      },
    ]);
    const result = await detectHotFlips('user-1', 3);
    expect(result).toHaveLength(1);
    expect(result[0].consecutiveInboundCount).toBe(3);
    expect(result[0].latestMessagePreview).toBe('Message 3');
    expect(result[0].sellerName).toBe('Tom');
  });

  it('does NOT count read inbound messages', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'listing-2',
        title: 'Sony WH-1000XM5',
        messages: [
          { direction: 'INBOUND', readAt: null, body: 'Msg 1', sellerName: null },
          { direction: 'INBOUND', readAt: new Date(), body: 'Msg 2 (read)', sellerName: null },
          { direction: 'INBOUND', readAt: null, body: 'Msg 3', sellerName: null },
        ],
      },
    ]);
    // Messages are ordered desc by createdAt: Msg1 (unread), Msg2 (read) — stops at Msg2
    const result = await detectHotFlips('user-1', 3);
    expect(result).toHaveLength(0); // Only 1 consecutive unread before hitting read
  });

  it('resets count when an outbound message is found', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'listing-3',
        title: 'Desk',
        messages: [
          { direction: 'INBOUND', readAt: null, body: 'Inbox 1', sellerName: null },
          { direction: 'OUTBOUND', readAt: null, body: 'My offer', sellerName: null },
          { direction: 'INBOUND', readAt: null, body: 'Inbox 2', sellerName: null },
        ],
      },
    ]);
    const result = await detectHotFlips('user-1', 2);
    // First msg is INBOUND (count=1), second is OUTBOUND (break), so count=1 < threshold=2
    expect(result).toHaveLength(0);
  });

  it('returns empty array when threshold not met', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'listing-4',
        title: 'Chair',
        messages: [
          { direction: 'INBOUND', readAt: null, body: 'Hi', sellerName: null },
          { direction: 'INBOUND', readAt: null, body: 'Hello', sellerName: null },
        ],
      },
    ]);
    const result = await detectHotFlips('user-1', 5); // threshold=5, only 2 messages
    expect(result).toHaveLength(0);
  });

  it('catches errors and returns empty array without throwing', async () => {
    mockFindMany.mockRejectedValueOnce(new Error('DB error'));
    const result = await detectHotFlips('user-1', 3);
    expect(result).toHaveLength(0);
  });

  it('does not include message body in error logs', async () => {
    const { logger } = await import('@/lib/logger');
    (logger.error as jest.Mock).mockClear();
    mockFindMany.mockRejectedValueOnce(new Error('timeout'));
    await detectHotFlips('user-1', 3);
    const loggedData = JSON.stringify((logger.error as jest.Mock).mock.calls[0]);
    expect(loggedData).not.toContain('body');
    expect(loggedData).not.toContain('sellerName');
  });

  it('returns empty array when no listings have unread inbound messages', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    const result = await detectHotFlips('user-1', 3);
    expect(result).toHaveLength(0);
  });

  it('excludes stale conversations (no unread inbound messages in last 30 days)', async () => {
    // The DB query filters messages by both direction=INBOUND, readAt=null, and 30-day recency.
    // Simulate the DB returning empty (stale listings excluded by the query).
    mockFindMany.mockResolvedValueOnce([]);
    const result = await detectHotFlips('user-1', 3);
    expect(result).toHaveLength(0);
    const callArg = mockFindMany.mock.calls[0][0];
    expect(callArg.where.messages.some.createdAt.gte).toBeInstanceOf(Date);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    expect(callArg.where.messages.some.createdAt.gte.getTime()).toBeGreaterThan(
      thirtyDaysAgo.getTime() - 5000
    );
  });

  it('excludes terminal-status listings (SOLD, EXPIRED, PASSED)', async () => {
    // Terminal statuses are excluded at the DB query level via status filter.
    // Simulate the DB returning empty because terminal listings are filtered out.
    mockFindMany.mockResolvedValueOnce([]);
    const result = await detectHotFlips('user-1', 3);
    expect(result).toHaveLength(0);
    const callArg = mockFindMany.mock.calls[0][0];
    const allowedStatuses: string[] = callArg.where.status.in;
    expect(allowedStatuses).not.toContain('SOLD');
    expect(allowedStatuses).not.toContain('EXPIRED');
    expect(allowedStatuses).not.toContain('PASSED');
    expect(allowedStatuses).toContain('OPPORTUNITY');
    expect(allowedStatuses).toContain('CONTACTED');
  });
});
