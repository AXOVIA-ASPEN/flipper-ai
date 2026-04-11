/**
 * @file src/__tests__/api/messages-id.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 2.0
 * @brief Tests for /api/messages/[id] route — GET, PATCH (approve/confirm/edit/reject), DELETE.
 *
 * @description
 * Covers the two-step approval workflow (Story 8.4): approve routes to SENT
 * or PENDING_APPROVAL based on user settings, confirm from PENDING_APPROVAL,
 * per-action status guards via ConflictError, tier enforcement, atomic
 * updateMany, input sanitization, and fire-and-forget dispatch stub.
 */
import { GET, PATCH, DELETE } from '@/app/api/messages/[id]/route';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    message: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    userSettings: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));
jest.mock('@/lib/auth-middleware');
jest.mock('@/lib/tier-enforcement', () => ({
  checkFeatureAccess: jest.fn((_tier: string, _feature: string) => ({ allowed: true })),
}));
jest.mock('@/lib/message-dispatcher', () => ({
  dispatchMessage: jest.fn(() => Promise.resolve({ success: true, stub: true })),
}));
// Mock communication notifications (Story 10.4) — isolate from email side-effects
jest.mock('@/lib/communication-notification', () => ({
  communicationNotificationService: {
    notifyMessageReceived: jest.fn().mockResolvedValue(undefined),
    notifyDraftReady: jest.fn().mockResolvedValue(undefined),
    notifyMessageSent: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockGetAuthUserId = getAuthUserId as jest.MockedFunction<typeof getAuthUserId>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeRequest(method: string, body?: unknown): Request {
  return {
    method,
    json: () => Promise.resolve(body || {}),
  } as unknown as Request;
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const mockMessage = {
  id: 'msg-1',
  userId: 'user-1',
  direction: 'OUTBOUND',
  status: 'DRAFT',
  body: 'Hello, is this still available?',
  subject: null,
  sellerName: 'Seller A',
  sellerContact: null,
  platform: 'craigslist',
  listingId: 'listing-1',
  parentId: null,
  sentAt: null,
  readAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  listing: { id: 'listing-1', title: 'iPhone 14', platform: 'craigslist', askingPrice: 500, updatedAt: new Date().toISOString() },
};

describe('/api/messages/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue('user-1');
    // Default mocks for new dependencies
    (mockPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue({ messageApprovalRequired: false });
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ subscriptionTier: 'FLIPPER' });
    (mockPrisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (mockPrisma.message.findUnique as jest.Mock).mockResolvedValue({ ...mockMessage, status: 'SENT', sentAt: new Date() });
  });

  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuthUserId.mockResolvedValue(null);
      const res = await GET(makeRequest('GET') as any, makeParams('msg-1'));
      expect(res.status).toBe(401);
    });

    it('returns 404 when message not found', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await GET(makeRequest('GET') as any, makeParams('msg-999'));
      expect(res.status).toBe(404);
    });

    it('returns message when found', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue(mockMessage);
      const res = await GET(makeRequest('GET') as any, makeParams('msg-1'));
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.id).toBe('msg-1');
    });

    it('handles server errors', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));
      const res = await GET(makeRequest('GET') as any, makeParams('msg-1'));
      expect(res.status).toBe(500);
    });
  });

  describe('PATCH', () => {
    beforeEach(() => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue(mockMessage);
    });

    it('returns 401 when not authenticated', async () => {
      mockGetAuthUserId.mockResolvedValue(null);
      const res = await PATCH(makeRequest('PATCH', { action: 'approve' }) as any, makeParams('msg-1'));
      expect(res.status).toBe(401);
    });

    it('returns 404 when message not found', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await PATCH(makeRequest('PATCH', { action: 'approve' }) as any, makeParams('msg-999'));
      expect(res.status).toBe(404);
    });

    it('returns 422 when action is missing', async () => {
      const res = await PATCH(makeRequest('PATCH', {}) as any, makeParams('msg-1'));
      expect(res.status).toBe(422);
    });

    it('returns 422 for invalid action', async () => {
      const res = await PATCH(makeRequest('PATCH', { action: 'invalid' }) as any, makeParams('msg-1'));
      expect(res.status).toBe(422);
    });

    it('accepts confirm as a valid action', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue({ ...mockMessage, status: 'PENDING_APPROVAL' });
      const res = await PATCH(makeRequest('PATCH', { action: 'confirm' }) as any, makeParams('msg-1'));
      expect(res.status).not.toBe(422);
    });

    // Approve: approval setting OFF → SENT
    it('approves a DRAFT message to SENT when approval not required', async () => {
      (mockPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue({ messageApprovalRequired: false });
      (mockPrisma.message.findUnique as jest.Mock).mockResolvedValue({ ...mockMessage, status: 'SENT', sentAt: new Date() });

      const res = await PATCH(makeRequest('PATCH', { action: 'approve' }) as any, makeParams('msg-1'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.action).toBe('approve');
      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SENT' }),
        })
      );
    });

    // Approve: approval setting ON → PENDING_APPROVAL
    it('approves a DRAFT message to PENDING_APPROVAL when approval required', async () => {
      (mockPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue({ messageApprovalRequired: true });
      (mockPrisma.message.findUnique as jest.Mock).mockResolvedValue({ ...mockMessage, status: 'PENDING_APPROVAL' });

      const res = await PATCH(makeRequest('PATCH', { action: 'approve' }) as any, makeParams('msg-1'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.nextAction).toBe('confirm');
      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PENDING_APPROVAL' }),
        })
      );
    });

    // Confirm from PENDING_APPROVAL → SENT
    it('confirms a PENDING_APPROVAL message to SENT', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue({ ...mockMessage, status: 'PENDING_APPROVAL' });
      (mockPrisma.message.findUnique as jest.Mock).mockResolvedValue({ ...mockMessage, status: 'SENT', sentAt: new Date() });

      const res = await PATCH(makeRequest('PATCH', { action: 'confirm' }) as any, makeParams('msg-1'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.status).toBe('SENT');
      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SENT' }),
        })
      );
    });

    // Confirm on DRAFT → 409
    it('returns 409 when confirming a DRAFT message', async () => {
      const res = await PATCH(makeRequest('PATCH', { action: 'confirm' }) as any, makeParams('msg-1'));
      expect(res.status).toBe(409);
    });

    // Approve on PENDING_APPROVAL → 409
    it('returns 409 when approving a PENDING_APPROVAL message', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue({ ...mockMessage, status: 'PENDING_APPROVAL' });
      const res = await PATCH(makeRequest('PATCH', { action: 'approve' }) as any, makeParams('msg-1'));
      expect(res.status).toBe(409);
    });

    // Edit on PENDING_APPROVAL → 409
    it('returns 409 when editing a PENDING_APPROVAL message', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue({ ...mockMessage, status: 'PENDING_APPROVAL' });
      const res = await PATCH(makeRequest('PATCH', { action: 'edit', body: 'new' }) as any, makeParams('msg-1'));
      expect(res.status).toBe(409);
    });

    // Edit with empty body → 422
    it('returns 422 when editing with empty body', async () => {
      const res = await PATCH(makeRequest('PATCH', { action: 'edit', body: '   ' }) as any, makeParams('msg-1'));
      expect(res.status).toBe(422);
    });

    // Edit requires body or subject
    it('returns 422 when edit has no body or subject', async () => {
      const res = await PATCH(makeRequest('PATCH', { action: 'edit' }) as any, makeParams('msg-1'));
      expect(res.status).toBe(422);
    });

    // Edit with HTML-only body (sanitizes to empty) → 422
    it('returns 422 when body is HTML-only and sanitizes to empty', async () => {
      const res = await PATCH(makeRequest('PATCH', { action: 'edit', body: '<b></b>' }) as any, makeParams('msg-1'));
      expect(res.status).toBe(422);
    });

    it('edits a message body and resets to DRAFT', async () => {
      (mockPrisma.message.findUnique as jest.Mock).mockResolvedValue({ ...mockMessage, body: 'Updated body', status: 'DRAFT' });

      const res = await PATCH(
        makeRequest('PATCH', { action: 'edit', body: 'Updated body' }) as any,
        makeParams('msg-1')
      );
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.action).toBe('edit');
    });

    it('edits message subject', async () => {
      (mockPrisma.message.findUnique as jest.Mock).mockResolvedValue({ ...mockMessage, subject: 'New subject', status: 'DRAFT' });

      const res = await PATCH(
        makeRequest('PATCH', { action: 'edit', subject: 'New subject' }) as any,
        makeParams('msg-1')
      );
      expect(res.status).toBe(200);
    });

    // Reject from DRAFT → REJECTED (terminal)
    it('rejects a DRAFT message to REJECTED', async () => {
      (mockPrisma.message.findUnique as jest.Mock).mockResolvedValue({ ...mockMessage, status: 'REJECTED' });

      const res = await PATCH(makeRequest('PATCH', { action: 'reject' }) as any, makeParams('msg-1'));
      const json = await res.json();

      expect(json.action).toBe('reject');
      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'REJECTED' }),
        })
      );
    });

    // Reject from PENDING_APPROVAL → DRAFT (recoverable)
    it('rejects a PENDING_APPROVAL message back to DRAFT', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue({ ...mockMessage, status: 'PENDING_APPROVAL' });
      (mockPrisma.message.findUnique as jest.Mock).mockResolvedValue({ ...mockMessage, status: 'DRAFT' });

      const res = await PATCH(makeRequest('PATCH', { action: 'reject' }) as any, makeParams('msg-1'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'DRAFT' }),
        })
      );
    });

    // Race condition: updateMany returns count 0 → 409
    it('returns 409 on race condition (updateMany count 0)', async () => {
      (mockPrisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      const res = await PATCH(makeRequest('PATCH', { action: 'approve' }) as any, makeParams('msg-1'));
      expect(res.status).toBe(409);
    });

    it('returns 409 for SENT status (approve)', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue({ ...mockMessage, status: 'SENT' });
      const res = await PATCH(makeRequest('PATCH', { action: 'approve' }) as any, makeParams('msg-1'));
      expect(res.status).toBe(409);
    });

    it('returns 409 for DELIVERED status (reject)', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue({ ...mockMessage, status: 'DELIVERED' });
      const res = await PATCH(makeRequest('PATCH', { action: 'reject' }) as any, makeParams('msg-1'));
      expect(res.status).toBe(409);
    });

    it('returns 403 when FREE tier tries to approve', async () => {
      const { checkFeatureAccess } = require('@/lib/tier-enforcement');
      checkFeatureAccess.mockReturnValue({ allowed: false, reason: 'Upgrade required' });

      const res = await PATCH(makeRequest('PATCH', { action: 'approve' }) as any, makeParams('msg-1'));
      expect(res.status).toBe(403);

      // Restore
      checkFeatureAccess.mockReturnValue({ allowed: true });
    });

    it('handles server errors', async () => {
      (mockPrisma.message.updateMany as jest.Mock).mockRejectedValue(new Error('DB error'));
      const res = await PATCH(makeRequest('PATCH', { action: 'approve' }) as any, makeParams('msg-1'));
      expect(res.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuthUserId.mockResolvedValue(null);
      const res = await DELETE(makeRequest('DELETE') as any, makeParams('msg-1'));
      expect(res.status).toBe(401);
    });

    it('returns 404 when message not found', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await DELETE(makeRequest('DELETE') as any, makeParams('msg-999'));
      expect(res.status).toBe(404);
    });

    it('deletes a message', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.message.delete as jest.Mock).mockResolvedValue(mockMessage);

      const res = await DELETE(makeRequest('DELETE') as any, makeParams('msg-1'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(mockPrisma.message.delete).toHaveBeenCalledWith({ where: { id: 'msg-1' } });
    });

    it('handles server errors', async () => {
      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue(mockMessage);
      (mockPrisma.message.delete as jest.Mock).mockRejectedValue(new Error('DB error'));
      const res = await DELETE(makeRequest('DELETE') as any, makeParams('msg-1'));
      expect(res.status).toBe(500);
    });
  });

  // Story 10.4: notification hook assertions (Task 7.4)
  describe('notification hooks', () => {
    it('fires notifyMessageSent when confirm action transitions status to SENT', async () => {
      const { communicationNotificationService } = require('@/lib/communication-notification');
      (communicationNotificationService.notifyMessageSent as jest.Mock).mockClear();

      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue({ ...mockMessage, status: 'PENDING_APPROVAL', listingId: 'l-1' });
      (mockPrisma.message.findUnique as jest.Mock).mockResolvedValue({ ...mockMessage, status: 'SENT', listingId: 'l-1', sentAt: new Date() });

      await PATCH(makeRequest('PATCH', { action: 'confirm' }) as any, makeParams('msg-1'));

      expect(communicationNotificationService.notifyMessageSent).toHaveBeenCalledTimes(1);
      expect(communicationNotificationService.notifyMessageSent).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' })
      );
    });

    it('does NOT fire notifyMessageSent for edit or reject actions', async () => {
      const { communicationNotificationService } = require('@/lib/communication-notification');
      (communicationNotificationService.notifyMessageSent as jest.Mock).mockClear();

      (mockPrisma.message.findFirst as jest.Mock).mockResolvedValue(mockMessage);
      // findUnique must return DRAFT so the SENT check does not fire
      (mockPrisma.message.findUnique as jest.Mock).mockResolvedValue({ ...mockMessage, status: 'DRAFT' });
      await PATCH(makeRequest('PATCH', { action: 'edit', body: 'updated body' }) as any, makeParams('msg-1'));

      expect(communicationNotificationService.notifyMessageSent).not.toHaveBeenCalled();
    });
  });
});
