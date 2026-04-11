/**
 * @file src/__tests__/lib/communication-notification.test.ts
 * @author Stephen Boyett
 * @company Axovia
 * @date 2026-04-08
 * @version 1.0
 * @brief Unit tests for CommunicationNotificationService (Story 10.4).
 *
 * @description
 * Covers all three notification event types (message.received, message.draft_ready,
 * message.sent) including: email dispatch when enabled, preference guard (skip when
 * emailNotifications=false), user-not-found guard, error swallowing, and correct
 * template data passed to emailService.
 */

import { CommunicationNotificationService } from '@/lib/communication-notification';
import prisma from '@/lib/db';
import { emailService } from '@/lib/email-service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/email-service', () => ({
  emailService: {
    send: jest.fn(),
  },
}));

// Story 11.2: SMS is dispatched fire-and-forget from the communication
// notification service. Mock it so no real DB lookups happen during email tests.
jest.mock('@/lib/sms-notification-service', () => ({
  smsNotificationService: {
    notifyMessageReceived: jest.fn().mockResolvedValue(undefined),
    notifyDraftReady: jest.fn().mockResolvedValue(undefined),
    notifyMessageSent: jest.fn().mockResolvedValue(undefined),
  },
}));

// Story 11.3: Push is dispatched fire-and-forget alongside email.
jest.mock('@/lib/push-notification', () => ({
  pushNotificationService: {
    sendToUser: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Story 10.4: createMessageNotificationEvent is called fire-and-forget.
// Mock it so no real DB lookups happen during service tests.
jest.mock('@/lib/notification-events', () => ({
  createMessageNotificationEvent: jest.fn().mockResolvedValue(undefined),
  NotificationEventType: {
    MESSAGE_RECEIVED: 'message.received',
    MESSAGE_DRAFT_READY: 'message.draft_ready',
    MESSAGE_SENT: 'message.sent',
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { pushNotificationService } from '@/lib/push-notification';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockEmailSend = emailService.send as jest.MockedFunction<typeof emailService.send>;
const mockPushSendToUser = pushNotificationService.sendToUser as jest.MockedFunction<typeof pushNotificationService.sendToUser>;

function mockUser(overrides: {
  email?: string | null;
  emailNotifications?: boolean;
  notifyMessageReceived?: boolean;
  notifyDraftReady?: boolean;
  notifyMessageSent?: boolean;
} = {}) {
  const email = overrides.email === undefined ? 'user@example.com' : overrides.email;
  const emailNotifications = overrides.emailNotifications ?? true;
  const notifyMessageReceived = overrides.notifyMessageReceived ?? true;
  const notifyDraftReady = overrides.notifyDraftReady ?? true;
  const notifyMessageSent = overrides.notifyMessageSent ?? false;
  (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
    email
      ? { email, settings: { emailNotifications, notifyMessageReceived, notifyDraftReady, notifyMessageSent } }
      : null
  );
}

const baseReceivedParams = {
  userId: 'user-1',
  listingId: 'listing-1',
  listingTitle: 'iPhone 15 Pro',
  sellerName: 'John Seller',
  messagePreview: 'Hi, is this still available?',
};

const baseDraftParams = {
  userId: 'user-1',
  listingId: 'listing-1',
  listingTitle: 'iPhone 15 Pro',
  draftPreview: 'Hi, I am interested in your iPhone. Would you take $400?',
};

const baseSentParams = {
  userId: 'user-1',
  listingId: 'listing-1',
  listingTitle: 'iPhone 15 Pro',
  messagePreview: 'Hi, I am interested in your iPhone. Would you take $400?',
  deliveryStatus: 'Delivered',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CommunicationNotificationService', () => {
  let service: CommunicationNotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CommunicationNotificationService();
    mockEmailSend.mockResolvedValue({ success: true });
  });

  // -------------------------------------------------------------------------
  // notifyMessageReceived (AC1 — FR-NOTIFY-02)
  // -------------------------------------------------------------------------

  describe('notifyMessageReceived', () => {
    it('sends email with correct subject and content when emailNotifications is enabled', async () => {
      mockUser({ emailNotifications: true });

      await service.notifyMessageReceived(baseReceivedParams);

      expect(mockEmailSend).toHaveBeenCalledTimes(1);
      const call = mockEmailSend.mock.calls[0][0];
      expect(call.to).toBe('user@example.com');
      expect(call.subject).toContain('John Seller');
      expect(call.subject).toContain('iPhone 15 Pro');
      expect(call.html).toContain('John Seller');
      expect(call.html).toContain('Hi, is this still available?');
      expect(call.html).toContain('iPhone 15 Pro');
      expect(call.text).toContain('John Seller');
      expect(call.text).toContain('Hi, is this still available?');
    });

    it('skips sending when emailNotifications is false', async () => {
      mockUser({ emailNotifications: false });

      await service.notifyMessageReceived(baseReceivedParams);

      expect(mockEmailSend).not.toHaveBeenCalled();
    });

    it('skips sending when notifyMessageReceived toggle is false (AC4)', async () => {
      mockUser({ notifyMessageReceived: false });

      await service.notifyMessageReceived(baseReceivedParams);

      expect(mockEmailSend).not.toHaveBeenCalled();
    });

    it('still sends when emailNotifications is true and notifyMessageReceived is true', async () => {
      mockUser({ emailNotifications: true, notifyMessageReceived: true });

      await service.notifyMessageReceived(baseReceivedParams);

      expect(mockEmailSend).toHaveBeenCalledTimes(1);
    });

    it('skips sending when user is not found', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await service.notifyMessageReceived(baseReceivedParams);

      expect(mockEmailSend).not.toHaveBeenCalled();
    });

    it('skips sending when user has no email', async () => {
      mockUser({ email: null });

      await service.notifyMessageReceived(baseReceivedParams);

      expect(mockEmailSend).not.toHaveBeenCalled();
    });

    it('includes thread link pointing to messages page with listingId', async () => {
      mockUser();

      await service.notifyMessageReceived(baseReceivedParams);

      const call = mockEmailSend.mock.calls[0][0];
      expect(call.html).toContain('/messages?listingId=listing-1');
      expect(call.text).toContain('/messages?listingId=listing-1');
    });

    it('uses fallback "Seller" when sellerName is null', async () => {
      mockUser();

      await service.notifyMessageReceived({ ...baseReceivedParams, sellerName: null });

      const call = mockEmailSend.mock.calls[0][0];
      expect(call.html).toContain('Seller');
    });

    it('uses fallback "your listing" when listingTitle is null', async () => {
      mockUser();

      await service.notifyMessageReceived({ ...baseReceivedParams, listingTitle: null });

      const call = mockEmailSend.mock.calls[0][0];
      expect(call.html).toContain('your listing');
    });

    it('truncates very long message previews', async () => {
      mockUser();
      const longMessage = 'a'.repeat(300);

      await service.notifyMessageReceived({ ...baseReceivedParams, messagePreview: longMessage });

      const call = mockEmailSend.mock.calls[0][0];
      expect(call.html).toContain('…');
    });

    it('swallows emailService errors without throwing', async () => {
      mockUser();
      mockEmailSend.mockRejectedValue(new Error('Resend down'));

      await expect(service.notifyMessageReceived(baseReceivedParams)).resolves.toBeUndefined();
    });

    it('defaults emailNotifications to true when settings is null', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        email: 'user@example.com',
        settings: null,
      });

      await service.notifyMessageReceived(baseReceivedParams);

      expect(mockEmailSend).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // notifyDraftReady (AC2 — FR-NOTIFY-03)
  // -------------------------------------------------------------------------

  describe('notifyDraftReady', () => {
    it('sends email with correct subject and draft content when enabled', async () => {
      mockUser();

      await service.notifyDraftReady(baseDraftParams);

      expect(mockEmailSend).toHaveBeenCalledTimes(1);
      const call = mockEmailSend.mock.calls[0][0];
      expect(call.to).toBe('user@example.com');
      expect(call.subject).toContain('iPhone 15 Pro');
      expect(call.subject).toContain('draft');
      expect(call.html).toContain('iPhone 15 Pro');
      expect(call.html).toContain('Would you take $400?');
      expect(call.text).toContain('Would you take $400?');
    });

    it('skips sending when emailNotifications is false', async () => {
      mockUser({ emailNotifications: false });

      await service.notifyDraftReady(baseDraftParams);

      expect(mockEmailSend).not.toHaveBeenCalled();
    });

    it('skips sending when notifyDraftReady toggle is false (AC4)', async () => {
      mockUser({ notifyDraftReady: false });

      await service.notifyDraftReady(baseDraftParams);

      expect(mockEmailSend).not.toHaveBeenCalled();
    });

    it('skips sending when user is not found', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await service.notifyDraftReady(baseDraftParams);

      expect(mockEmailSend).not.toHaveBeenCalled();
    });

    it('includes review link pointing to messages page with mode=review', async () => {
      mockUser();

      await service.notifyDraftReady(baseDraftParams);

      const call = mockEmailSend.mock.calls[0][0];
      expect(call.html).toContain('/messages?listingId=listing-1&mode=review');
      expect(call.text).toContain('/messages?listingId=listing-1&mode=review');
    });

    it('swallows emailService errors without throwing', async () => {
      mockUser();
      mockEmailSend.mockRejectedValue(new Error('Resend down'));

      await expect(service.notifyDraftReady(baseDraftParams)).resolves.toBeUndefined();
    });

    it('uses fallback "your listing" when listingTitle is null', async () => {
      mockUser();

      await service.notifyDraftReady({ ...baseDraftParams, listingTitle: null });

      const call = mockEmailSend.mock.calls[0][0];
      expect(call.html).toContain('your listing');
    });
  });

  // -------------------------------------------------------------------------
  // notifyMessageSent (AC3 — FR-NOTIFY-04)
  // -------------------------------------------------------------------------

  describe('notifyMessageSent', () => {
    it('sends email with correct subject and delivery status when enabled', async () => {
      mockUser({ notifyMessageSent: true });

      await service.notifyMessageSent(baseSentParams);

      expect(mockEmailSend).toHaveBeenCalledTimes(1);
      const call = mockEmailSend.mock.calls[0][0];
      expect(call.to).toBe('user@example.com');
      expect(call.subject).toContain('iPhone 15 Pro');
      expect(call.subject).toContain('sent');
      expect(call.html).toContain('iPhone 15 Pro');
      expect(call.html).toContain('Delivered');
      expect(call.text).toContain('Delivered');
    });

    it('skips sending when emailNotifications is false', async () => {
      mockUser({ emailNotifications: false, notifyMessageSent: true });

      await service.notifyMessageSent(baseSentParams);

      expect(mockEmailSend).not.toHaveBeenCalled();
    });

    it('skips sending when notifyMessageSent toggle is false (AC4 — default OFF)', async () => {
      mockUser({ notifyMessageSent: false });

      await service.notifyMessageSent(baseSentParams);

      expect(mockEmailSend).not.toHaveBeenCalled();
    });

    it('sends when notifyMessageSent toggle is explicitly true (AC4)', async () => {
      mockUser({ notifyMessageSent: true });

      await service.notifyMessageSent(baseSentParams);

      expect(mockEmailSend).toHaveBeenCalledTimes(1);
    });

    it('skips sending when user is not found', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await service.notifyMessageSent(baseSentParams);

      expect(mockEmailSend).not.toHaveBeenCalled();
    });

    it('includes thread link in sent notification', async () => {
      mockUser({ notifyMessageSent: true });

      await service.notifyMessageSent(baseSentParams);

      const call = mockEmailSend.mock.calls[0][0];
      expect(call.html).toContain('/messages?listingId=listing-1');
      expect(call.text).toContain('/messages?listingId=listing-1');
    });

    it('uses default "Delivered" when deliveryStatus is not provided', async () => {
      mockUser({ notifyMessageSent: true });

      await service.notifyMessageSent({ ...baseSentParams, deliveryStatus: undefined });

      const call = mockEmailSend.mock.calls[0][0];
      expect(call.html).toContain('Delivered');
    });

    it('swallows emailService errors without throwing', async () => {
      mockUser({ notifyMessageSent: true });
      mockEmailSend.mockRejectedValue(new Error('Resend down'));

      await expect(service.notifyMessageSent(baseSentParams)).resolves.toBeUndefined();
    });

    it('uses fallback "your listing" when listingTitle is null', async () => {
      mockUser({ notifyMessageSent: true });

      await service.notifyMessageSent({ ...baseSentParams, listingTitle: null });

      const call = mockEmailSend.mock.calls[0][0];
      expect(call.html).toContain('your listing');
    });
  });

  // -------------------------------------------------------------------------
  // Circuit breaker (Task 4.6)
  // -------------------------------------------------------------------------

  describe('circuit breaker', () => {
    it('stops dispatching after 5 consecutive failures (notifyMessageSent)', async () => {
      mockUser({ notifyMessageSent: true });
      mockEmailSend.mockRejectedValue(new Error('Provider 503'));

      for (let i = 0; i < 5; i++) {
        await service.notifyMessageSent(baseSentParams);
        if (i < 4) mockUser({ notifyMessageSent: true });
      }
      expect(mockEmailSend).toHaveBeenCalledTimes(5);

      // 6th call blocked by open circuit breaker
      mockUser({ notifyMessageSent: true });
      await service.notifyMessageSent(baseSentParams);
      expect(mockEmailSend).toHaveBeenCalledTimes(5);
    });

    it('stops dispatching after 5 consecutive failures (notifyMessageReceived)', async () => {
      mockEmailSend.mockRejectedValue(new Error('Provider 503'));

      for (let i = 0; i < 5; i++) {
        mockUser();
        await service.notifyMessageReceived(baseReceivedParams);
      }
      expect(mockEmailSend).toHaveBeenCalledTimes(5);

      mockUser();
      await service.notifyMessageReceived(baseReceivedParams);
      expect(mockEmailSend).toHaveBeenCalledTimes(5);
    });

    it('stops dispatching after 5 consecutive failures (notifyDraftReady)', async () => {
      mockEmailSend.mockRejectedValue(new Error('Provider 503'));

      for (let i = 0; i < 5; i++) {
        mockUser();
        await service.notifyDraftReady(baseDraftParams);
      }
      expect(mockEmailSend).toHaveBeenCalledTimes(5);

      mockUser();
      await service.notifyDraftReady(baseDraftParams);
      expect(mockEmailSend).toHaveBeenCalledTimes(5);
    });

    it('resets consecutive failure count on a successful send', async () => {
      mockUser({ notifyMessageSent: true });
      mockEmailSend.mockRejectedValueOnce(new Error('fail 1'));
      await service.notifyMessageSent(baseSentParams);
      mockUser({ notifyMessageSent: true });
      mockEmailSend.mockRejectedValueOnce(new Error('fail 2'));
      await service.notifyMessageSent(baseSentParams);

      // One success resets counter
      mockUser({ notifyMessageSent: true });
      mockEmailSend.mockResolvedValue({ success: true });
      await service.notifyMessageSent(baseSentParams);
      expect(mockEmailSend).toHaveBeenCalledTimes(3);

      // Still dispatches after reset
      mockUser({ notifyMessageSent: true });
      mockEmailSend.mockResolvedValue({ success: true });
      await service.notifyMessageSent(baseSentParams);
      expect(mockEmailSend).toHaveBeenCalledTimes(4);
    });
  });

  // -------------------------------------------------------------------------
  // Subject truncation
  // -------------------------------------------------------------------------

  describe('subject truncation', () => {
    it('truncates seller name > 20 chars in notifyMessageReceived subject', async () => {
      mockUser();

      await service.notifyMessageReceived({
        ...baseReceivedParams,
        sellerName: 'VeryLongSellerNameThatExceeds20Chars',
      });

      const call = mockEmailSend.mock.calls[0][0];
      // truncateSubjectPart(text, 20) → slice(0, 19) + '…'
      expect(call.subject).toContain('VeryLongSellerNameT…');
    });

    it('truncates listing title > 40 chars in notifyDraftReady subject', async () => {
      mockUser();

      await service.notifyDraftReady({
        ...baseDraftParams,
        listingTitle: 'A Very Long Listing Title That Definitely Exceeds 40 Characters',
      });

      const call = mockEmailSend.mock.calls[0][0];
      // truncateSubjectPart(text, 40) → slice(0, 39) + '…'
      expect(call.subject).toContain('A Very Long Listing Title That Definite…');
    });
  });

  // -------------------------------------------------------------------------
  // No listingId — fallback thread URLs
  // -------------------------------------------------------------------------

  describe('thread URL fallback when listingId is null', () => {
    it('notifyMessageReceived falls back to /messages', async () => {
      mockUser();

      await service.notifyMessageReceived({ ...baseReceivedParams, listingId: null });

      const call = mockEmailSend.mock.calls[0][0];
      // Should contain /messages but NOT ?listingId=
      expect(call.html).toContain('/messages');
      expect(call.html).not.toContain('?listingId=');
    });

    it('notifyDraftReady falls back to /messages', async () => {
      mockUser();

      await service.notifyDraftReady({ ...baseDraftParams, listingId: null });

      const call = mockEmailSend.mock.calls[0][0];
      expect(call.html).toContain('/messages');
      expect(call.html).not.toContain('?listingId=');
    });

    it('notifyMessageSent falls back to /messages', async () => {
      mockUser({ notifyMessageSent: true });

      await service.notifyMessageSent({ ...baseSentParams, listingId: null });

      const call = mockEmailSend.mock.calls[0][0];
      expect(call.html).toContain('/messages');
      expect(call.html).not.toContain('?listingId=');
    });
  });

  // -------------------------------------------------------------------------
  // Story 11.3: Push dispatch alongside email
  // -------------------------------------------------------------------------

  describe('push dispatch (Story 11.3)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockEmailSend.mockResolvedValue({ success: true, messageId: 'email-id' });
    });

    it('notifyMessageReceived fires push after email', async () => {
      mockUser();

      await service.notifyMessageReceived({
        userId: 'user-1',
        listingTitle: 'Guitar',
        sellerName: 'Bob',
        messagePreview: 'Is this still available?',
      });

      // Push should be called with messageReceived eventKey
      expect(mockPushSendToUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ title: expect.stringContaining('Message') }),
        'messageReceived'
      );
    });

    it('notifyDraftReady fires push after email', async () => {
      mockUser();

      await service.notifyDraftReady({
        userId: 'user-1',
        listingTitle: 'Bike',
        draftPreview: 'Hi, is this still available?',
      });

      expect(mockPushSendToUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ title: expect.stringContaining('Draft') }),
        'draftReady'
      );
    });

    it('notifyMessageSent fires push after email', async () => {
      mockUser({ notifyMessageSent: true });

      await service.notifyMessageSent({
        userId: 'user-1',
        listingTitle: 'Camera',
        messagePreview: 'Your message was delivered.',
      });

      expect(mockPushSendToUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ title: expect.stringContaining('Sent') }),
        'messageSent'
      );
    });
  });
});
