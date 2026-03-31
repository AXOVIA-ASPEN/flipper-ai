/**
 * @file src/__tests__/api/messages-generate.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Unit tests for POST /api/messages/generate route.
 *
 * @description
 * Tests the message generation API endpoint covering authentication,
 * tier enforcement, request validation, listing ownership, message
 * creation, and error handling paths.
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/messages/generate/route';

// Mock auth
const mockGetAuthUserId = jest.fn();
jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: (...args: unknown[]) => mockGetAuthUserId(...args),
}));

// Mock prisma
const mockUserFindUnique = jest.fn();
const mockListingFindFirst = jest.fn();
const mockMessageCreate = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    listing: {
      findFirst: (...args: unknown[]) => mockListingFindFirst(...args),
    },
    message: {
      create: (...args: unknown[]) => mockMessageCreate(...args),
    },
  },
}));

// Mock tier enforcement
const mockCheckFeatureAccess = jest.fn();
jest.mock('@/lib/tier-enforcement', () => ({
  checkFeatureAccess: (...args: unknown[]) => mockCheckFeatureAccess(...args),
}));

// Mock message generator
const mockGeneratePurchaseMessage = jest.fn();
jest.mock('@/lib/message-generator', () => ({
  generatePurchaseMessage: (...args: unknown[]) => mockGeneratePurchaseMessage(...args),
  isValidMessageType: (type: string) =>
    ['inquiry', 'offer', 'follow-up', 'negotiation'].includes(type),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

const createRequest = (body: Record<string, unknown>) =>
  new NextRequest(new URL('/api/messages/generate', 'http://localhost:3000'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const sampleListing = {
  id: 'listing-1',
  title: 'Sony WH-1000XM5 Headphones',
  askingPrice: 150,
  platform: 'CRAIGSLIST',
  sellerName: 'John',
  sellerContact: 'john@example.com',
  condition: 'Like New',
};

const sampleGenerated = {
  subject: 'Question about Sony WH-1000XM5 Headphones',
  body: 'Hi John! Is this still available?',
  messageType: 'inquiry' as const,
  platform: 'CRAIGSLIST',
  tone: 'casual' as const,
  isFallback: true,
};

const sampleMessage = {
  id: 'msg-1',
  userId: 'test-user-id',
  listingId: 'listing-1',
  direction: 'OUTBOUND',
  status: 'DRAFT',
  subject: sampleGenerated.subject,
  body: sampleGenerated.body,
  sellerName: 'John',
  sellerContact: 'john@example.com',
  platform: 'CRAIGSLIST',
  listing: {
    id: 'listing-1',
    title: 'Sony WH-1000XM5 Headphones',
    platform: 'CRAIGSLIST',
    askingPrice: 150,
  },
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/messages/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue('test-user-id');
    mockUserFindUnique.mockResolvedValue({ subscriptionTier: 'FLIPPER' });
    mockCheckFeatureAccess.mockReturnValue({ allowed: true, tier: 'FLIPPER', limits: {} });
    mockListingFindFirst.mockResolvedValue(sampleListing);
    mockGeneratePurchaseMessage.mockResolvedValue(sampleGenerated);
    mockMessageCreate.mockResolvedValue(sampleMessage);
  });

  // ── Auth ────────────────────────────────────────────────────────────────

  it('returns 401 when user is not authenticated', async () => {
    mockGetAuthUserId.mockResolvedValue(null);
    const res = await POST(createRequest({ listingId: 'listing-1' }));
    expect(res.status).toBe(401);
  });

  // ── Tier enforcement ──────────────────────────────────────────────────

  it('returns 403 when user tier lacks messaging access', async () => {
    mockCheckFeatureAccess.mockReturnValue({
      allowed: false,
      reason: 'Messaging requires FLIPPER tier or higher',
      tier: 'FREE',
      limits: {},
    });
    const res = await POST(createRequest({ listingId: 'listing-1' }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('checks feature access with the user subscription tier', async () => {
    mockUserFindUnique.mockResolvedValue({ subscriptionTier: 'PRO' });
    await POST(createRequest({ listingId: 'listing-1' }));
    expect(mockCheckFeatureAccess).toHaveBeenCalledWith('PRO', 'messaging');
  });

  // ── Validation ────────────────────────────────────────────────────────

  it('returns 422 when listingId is missing', async () => {
    const res = await POST(createRequest({}));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 422 for invalid messageType', async () => {
    const res = await POST(createRequest({ listingId: 'listing-1', messageType: 'spam' }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('accepts valid messageType values', async () => {
    for (const type of ['inquiry', 'offer', 'follow-up', 'negotiation']) {
      mockGeneratePurchaseMessage.mockResolvedValue({ ...sampleGenerated, messageType: type });
      mockMessageCreate.mockResolvedValue(sampleMessage);
      const res = await POST(createRequest({ listingId: 'listing-1', messageType: type }));
      expect(res.status).toBe(201);
    }
  });

  // ── Listing lookup ────────────────────────────────────────────────────

  it('returns 404 when listing not found', async () => {
    mockListingFindFirst.mockResolvedValue(null);
    const res = await POST(createRequest({ listingId: 'nonexistent' }));
    expect(res.status).toBe(404);
  });

  it('scopes listing query to the authenticated user', async () => {
    await POST(createRequest({ listingId: 'listing-1' }));
    expect(mockListingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'listing-1', userId: 'test-user-id' },
      })
    );
  });

  // ── Successful generation ─────────────────────────────────────────────

  it('returns 201 with generated message and metadata', async () => {
    const res = await POST(createRequest({ listingId: 'listing-1' }));
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.message).toEqual(sampleMessage);
    expect(json.data.generation).toEqual({
      messageType: 'inquiry',
      tone: 'casual',
      isFallback: true,
    });
  });

  it('passes correct input to message generator', async () => {
    await POST(
      createRequest({
        listingId: 'listing-1',
        messageType: 'offer',
        offerPrice: 120,
        additionalContext: 'Need it by Friday',
      })
    );
    expect(mockGeneratePurchaseMessage).toHaveBeenCalledWith({
      listingTitle: 'Sony WH-1000XM5 Headphones',
      askingPrice: 150,
      platform: 'CRAIGSLIST',
      sellerName: 'John',
      messageType: 'offer',
      offerPrice: 120,
      itemCondition: 'Like New',
      additionalContext: 'Need it by Friday',
    });
  });

  it('creates DRAFT OUTBOUND message in database', async () => {
    await POST(createRequest({ listingId: 'listing-1' }));
    expect(mockMessageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'test-user-id',
          listingId: 'listing-1',
          direction: 'OUTBOUND',
          status: 'DRAFT',
          subject: sampleGenerated.subject,
          body: sampleGenerated.body,
          platform: 'CRAIGSLIST',
        }),
      })
    );
  });

  it('defaults messageType to inquiry when not provided', async () => {
    await POST(createRequest({ listingId: 'listing-1' }));
    expect(mockGeneratePurchaseMessage).toHaveBeenCalledWith(
      expect.objectContaining({ messageType: 'inquiry' })
    );
  });

  it('converts askingPrice to number', async () => {
    mockListingFindFirst.mockResolvedValue({
      ...sampleListing,
      askingPrice: '250.00',
    });
    await POST(createRequest({ listingId: 'listing-1' }));
    expect(mockGeneratePurchaseMessage).toHaveBeenCalledWith(
      expect.objectContaining({ askingPrice: 250 })
    );
  });

  it('handles null askingPrice gracefully', async () => {
    mockListingFindFirst.mockResolvedValue({
      ...sampleListing,
      askingPrice: null,
    });
    await POST(createRequest({ listingId: 'listing-1' }));
    expect(mockGeneratePurchaseMessage).toHaveBeenCalledWith(
      expect.objectContaining({ askingPrice: 0 })
    );
  });
});
