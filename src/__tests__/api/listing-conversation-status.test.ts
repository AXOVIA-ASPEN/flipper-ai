/**
 * @file src/__tests__/api/listing-conversation-status.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Unit tests for GET /api/listings/[id]/conversation-status route.
 *
 * @description
 * Tests authentication, listing ownership, status retrieval,
 * and null status handling for the conversation status API endpoint.
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/listings/[id]/conversation-status/route';

// Mock auth
const mockGetAuthUserId = jest.fn();
jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: (...args: unknown[]) => mockGetAuthUserId(...args),
}));

// Mock prisma
const mockListingFindFirst = jest.fn();
const mockMessageCount = jest.fn();
const mockMessageFindFirst = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    listing: {
      findFirst: (...args: unknown[]) => mockListingFindFirst(...args),
    },
    message: {
      count: (...args: unknown[]) => mockMessageCount(...args),
      findFirst: (...args: unknown[]) => mockMessageFindFirst(...args),
    },
  },
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

const createRequest = (listingId: string) =>
  new NextRequest(
    new URL(`/api/listings/${listingId}/conversation-status`, 'http://localhost:3000'),
    { method: 'GET' }
  );

// ── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/listings/[id]/conversation-status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue('test-user-id');
    mockListingFindFirst.mockResolvedValue({
      id: 'listing-1',
      conversationStatus: 'pending',
    });
    mockMessageCount
      .mockResolvedValueOnce(3)  // total message count
      .mockResolvedValueOnce(1); // unread count
    mockMessageFindFirst.mockResolvedValue({
      createdAt: new Date('2026-03-31T10:00:00Z'),
    });
  });

  // ── Auth ────────────────────────────────────────────────────────────────

  it('returns 401 when user is not authenticated', async () => {
    mockGetAuthUserId.mockResolvedValue(null);
    const res = await GET(createRequest('listing-1'), {
      params: Promise.resolve({ id: 'listing-1' }),
    });
    expect(res.status).toBe(401);
  });

  // ── Listing lookup ────────────────────────────────────────────────────

  it('returns 404 when listing not found', async () => {
    mockListingFindFirst.mockResolvedValue(null);
    const res = await GET(createRequest('nonexistent'), {
      params: Promise.resolve({ id: 'nonexistent' }),
    });
    expect(res.status).toBe(404);
  });

  it('scopes listing query to the authenticated user', async () => {
    await GET(createRequest('listing-1'), {
      params: Promise.resolve({ id: 'listing-1' }),
    });
    expect(mockListingFindFirst).toHaveBeenCalledWith({
      where: { id: 'listing-1', userId: 'test-user-id' },
      select: { id: true, conversationStatus: true },
    });
  });

  // ── Successful retrieval ──────────────────────────────────────────────

  it('returns 200 with conversation status and message stats', async () => {
    const res = await GET(createRequest('listing-1'), {
      params: Promise.resolve({ id: 'listing-1' }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.conversationStatus).toBe('pending');
    expect(json.data.messageCount).toBe(3);
    expect(json.data.lastMessageAt).toBe('2026-03-31T10:00:00.000Z');
    expect(json.data.unreadCount).toBe(1);
  });

  // ── Null status ───────────────────────────────────────────────────────

  it('returns null conversationStatus when no conversation exists', async () => {
    mockListingFindFirst.mockResolvedValue({
      id: 'listing-1',
      conversationStatus: null,
    });
    mockMessageCount.mockReset();
    mockMessageCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockMessageFindFirst.mockResolvedValue(null);

    const res = await GET(createRequest('listing-1'), {
      params: Promise.resolve({ id: 'listing-1' }),
    });
    const json = await res.json();

    expect(json.data.conversationStatus).toBeNull();
    expect(json.data.messageCount).toBe(0);
    expect(json.data.lastMessageAt).toBeNull();
    expect(json.data.unreadCount).toBe(0);
  });

  // ── Error handling ────────────────────────────────────────────────────

  it('returns 500 on database error', async () => {
    mockListingFindFirst.mockRejectedValue(new Error('Database error'));
    const res = await GET(createRequest('listing-1'), {
      params: Promise.resolve({ id: 'listing-1' }),
    });
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
  });
});
