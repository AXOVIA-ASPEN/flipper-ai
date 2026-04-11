/**
 * @file src/__tests__/api/messages-notifications.test.ts
 * @author Stephen Boyett
 * @company Axovia
 * @date 2026-04-08
 * @version 1.0
 * @brief API-level tests verifying communication notification triggers (Story 10.4).
 *
 * @description
 * Verifies that POST /api/messages fires the correct notification method based on
 * message direction + status, and that PATCH /api/messages/[id] fires
 * notifyMessageSent when the status transitions to SENT.
 *
 * Notification service is mocked so these tests focus on the trigger wiring,
 * not on the service internals (covered in communication-notification.test.ts).
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/messages/route';
import { PATCH } from '@/app/api/messages/[id]/route';
import { communicationNotificationService } from '@/lib/communication-notification';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn().mockResolvedValue('user-1'),
}));

jest.mock('@/lib/communication-notification', () => ({
  communicationNotificationService: {
    notifyMessageReceived: jest.fn().mockResolvedValue(undefined),
    notifyDraftReady: jest.fn().mockResolvedValue(undefined),
    notifyMessageSent: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockMessageCreate = jest.fn();
const mockMessageFindFirst = jest.fn();
const mockMessageFindUnique = jest.fn();
const mockMessageUpdateMany = jest.fn();
const mockUserFindUnique = jest.fn();
const mockUserSettingsFindUnique = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    message: {
      create: (...args: unknown[]) => mockMessageCreate(...args),
      findFirst: (...args: unknown[]) => mockMessageFindFirst(...args),
      findUnique: (...args: unknown[]) => mockMessageFindUnique(...args),
      updateMany: (...args: unknown[]) => mockMessageUpdateMany(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    userSettings: {
      findUnique: (...args: unknown[]) => mockUserSettingsFindUnique(...args),
    },
  },
}));

jest.mock('@/lib/tier-enforcement', () => ({
  checkFeatureAccess: jest.fn().mockReturnValue({ allowed: true }),
}));

jest.mock('@/lib/message-dispatcher', () => ({
  dispatchMessage: jest.fn().mockResolvedValue({ success: true }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest(new URL('/api/messages', 'http://localhost:3000'), {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function makePatchRequest(body: unknown): Request {
  return { method: 'PATCH', json: () => Promise.resolve(body) } as unknown as Request;
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const mockNotify = communicationNotificationService as jest.Mocked<typeof communicationNotificationService>;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Communication notification triggers — POST /api/messages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserFindUnique.mockResolvedValue({ subscriptionTier: 'FLIPPER' });
  });

  it('calls notifyMessageReceived for INBOUND DELIVERED message', async () => {
    const createdMessage = {
      id: 'msg-1',
      userId: 'user-1',
      listingId: 'listing-1',
      direction: 'INBOUND',
      status: 'DELIVERED',
      body: 'Is this still available?',
      sellerName: 'Alice',
      listing: { id: 'listing-1', title: 'MacBook Pro', platform: 'craigslist', askingPrice: 800 },
    };
    mockMessageCreate.mockResolvedValue(createdMessage);

    await POST(
      makePostRequest({
        listingId: 'listing-1',
        direction: 'INBOUND',
        messageBody: 'Is this still available?',
        sellerName: 'Alice',
      })
    );

    // Give the fire-and-forget promise a tick to run
    await Promise.resolve();

    expect(mockNotify.notifyMessageReceived).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        listingId: 'listing-1',
        listingTitle: 'MacBook Pro',
        sellerName: 'Alice',
        messagePreview: 'Is this still available?',
      })
    );
    expect(mockNotify.notifyDraftReady).not.toHaveBeenCalled();
    expect(mockNotify.notifyMessageSent).not.toHaveBeenCalled();
  });

  it('calls notifyDraftReady for OUTBOUND DRAFT message', async () => {
    const createdMessage = {
      id: 'msg-2',
      userId: 'user-1',
      listingId: 'listing-2',
      direction: 'OUTBOUND',
      status: 'DRAFT',
      body: 'Would you take $350?',
      sellerName: null,
      listing: { id: 'listing-2', title: 'Sony Camera', platform: 'ebay', askingPrice: 400 },
    };
    mockMessageCreate.mockResolvedValue(createdMessage);

    await POST(
      makePostRequest({
        listingId: 'listing-2',
        direction: 'OUTBOUND',
        messageBody: 'Would you take $350?',
      })
    );

    await Promise.resolve();

    expect(mockNotify.notifyDraftReady).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        listingId: 'listing-2',
        listingTitle: 'Sony Camera',
        draftPreview: 'Would you take $350?',
      })
    );
    expect(mockNotify.notifyMessageReceived).not.toHaveBeenCalled();
    expect(mockNotify.notifyMessageSent).not.toHaveBeenCalled();
  });

  it('does NOT call any notification for OUTBOUND SENT message (created directly as SENT)', async () => {
    const createdMessage = {
      id: 'msg-3',
      userId: 'user-1',
      listingId: 'listing-3',
      direction: 'OUTBOUND',
      status: 'SENT',
      body: 'Sent message',
      sellerName: null,
      listing: null,
    };
    mockMessageCreate.mockResolvedValue(createdMessage);

    await POST(
      makePostRequest({
        direction: 'OUTBOUND',
        messageBody: 'Sent message',
        status: 'SENT',
      })
    );

    await Promise.resolve();

    // SENT is handled by PATCH, not POST
    expect(mockNotify.notifyMessageReceived).not.toHaveBeenCalled();
    expect(mockNotify.notifyDraftReady).not.toHaveBeenCalled();
    expect(mockNotify.notifyMessageSent).not.toHaveBeenCalled();
  });
});

describe('Communication notification triggers — PATCH /api/messages/[id]', () => {
  const mockDraftMessage = {
    id: 'msg-10',
    userId: 'user-1',
    direction: 'OUTBOUND',
    status: 'DRAFT',
    body: 'Would you take $350?',
    subject: null,
    sellerName: null,
    sellerContact: null,
    platform: 'craigslist',
    listingId: 'listing-10',
    parentId: null,
    sentAt: null,
    readAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    listing: { id: 'listing-10', title: 'Vintage Watch', platform: 'craigslist', askingPrice: 200, updatedAt: new Date() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMessageFindFirst.mockResolvedValue(mockDraftMessage);
    mockUserFindUnique.mockResolvedValue({ subscriptionTier: 'FLIPPER' });
    mockUserSettingsFindUnique.mockResolvedValue({ messageApprovalRequired: false });
    mockMessageUpdateMany.mockResolvedValue({ count: 1 });
    mockMessageFindUnique.mockResolvedValue({
      ...mockDraftMessage,
      status: 'SENT',
      sentAt: new Date(),
    });
  });

  it('calls notifyMessageSent when DRAFT message is approved → SENT', async () => {
    await PATCH(makePatchRequest({ action: 'approve' }) as never, makeParams('msg-10'));

    await Promise.resolve();

    expect(mockNotify.notifyMessageSent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        listingId: 'listing-10',
        listingTitle: 'Vintage Watch',
        deliveryStatus: 'Delivered',
      })
    );
    expect(mockNotify.notifyMessageReceived).not.toHaveBeenCalled();
    expect(mockNotify.notifyDraftReady).not.toHaveBeenCalled();
  });

  it('calls notifyMessageSent when PENDING_APPROVAL message is confirmed → SENT', async () => {
    mockMessageFindFirst.mockResolvedValue({ ...mockDraftMessage, status: 'PENDING_APPROVAL' });

    await PATCH(makePatchRequest({ action: 'confirm' }) as never, makeParams('msg-10'));

    await Promise.resolve();

    expect(mockNotify.notifyMessageSent).toHaveBeenCalledTimes(1);
  });

  it('does NOT call notifyMessageSent when approve → PENDING_APPROVAL (two-step mode)', async () => {
    mockUserSettingsFindUnique.mockResolvedValue({ messageApprovalRequired: true });
    mockMessageFindUnique.mockResolvedValue({
      ...mockDraftMessage,
      status: 'PENDING_APPROVAL',
    });

    await PATCH(makePatchRequest({ action: 'approve' }) as never, makeParams('msg-10'));

    await Promise.resolve();

    expect(mockNotify.notifyMessageSent).not.toHaveBeenCalled();
  });

  it('does NOT call notifyMessageSent for edit action', async () => {
    mockMessageFindUnique.mockResolvedValue({ ...mockDraftMessage, status: 'DRAFT' });

    await PATCH(
      makePatchRequest({ action: 'edit', body: 'Updated message body' }) as never,
      makeParams('msg-10')
    );

    await Promise.resolve();

    expect(mockNotify.notifyMessageSent).not.toHaveBeenCalled();
  });

  it('does NOT call notifyMessageSent for reject action', async () => {
    mockMessageFindUnique.mockResolvedValue({ ...mockDraftMessage, status: 'REJECTED' });

    await PATCH(makePatchRequest({ action: 'reject' }) as never, makeParams('msg-10'));

    await Promise.resolve();

    expect(mockNotify.notifyMessageSent).not.toHaveBeenCalled();
  });
});
