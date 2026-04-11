/**
 * @file src/__tests__/lib/sms-notification-service.test.ts
 * @author Stephen Boyett
 * @company Axovia
 * @date 2026-04-09
 * @version 1.0
 * @brief Unit tests for SmsNotificationService (Story 11.2).
 *
 * @description
 * Covers:
 *   - All 10 notify* methods dispatch SMS when phone verified + sms toggle ON.
 *   - Gate: skips when user/settings not found.
 *   - Gate: skips when phoneNumber missing.
 *   - Gate: skips when phoneVerified = false.
 *   - Gate: skips when smsNotifications = false.
 *   - formatSmsBody() truncates the {title} placeholder to keep body ≤ 160.
 *   - Notification methods swallow smsService failures (never throw).
 *   - SMS body format includes expected event icons / keywords.
 */

import {
  SmsNotificationService,
  formatSmsBody,
  SMS_MAX_LENGTH,
} from '@/lib/sms-notification-service';
import prisma from '@/lib/db';
import { smsService } from '@/lib/sms-service';

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

jest.mock('@/lib/sms-service', () => ({
  smsService: {
    send: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockSmsSend = smsService.send as jest.MockedFunction<typeof smsService.send>;

function mockSettings(overrides: {
  phoneNumber?: string | null;
  phoneVerified?: boolean;
  smsNotifications?: boolean;
} = {}) {
  const phoneNumber = overrides.phoneNumber === undefined ? '+12025551234' : overrides.phoneNumber;
  const phoneVerified = overrides.phoneVerified ?? true;
  const smsNotifications = overrides.smsNotifications ?? true;
  // Per-event toggle defaults (Story 11.3) — all ON so Story 11.2 tests still pass
  const perEventDefaults = {
    smsNotifyNewDeals: true,
    smsNotifySoldItems: true,
    smsNotifyMessageReceived: true,
    smsNotifyDraftReady: true,
    smsNotifyMessageSent: true,
    smsNotifyReviewReceived: true,
    smsNotifyFlipGoneCold: true,
    smsNotifyFlipTurnedHot: true,
    smsNotifyPriceDrops: true,
    smsNotifyExpiring: true,
    smsNotifyListingUnavailable: true,
  };
  (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
    phoneNumber
      ? { settings: { phoneNumber, phoneVerified, smsNotifications, ...perEventDefaults } }
      : { settings: { phoneNumber: null, phoneVerified: false, smsNotifications: false, ...perEventDefaults } }
  );
}

// ---------------------------------------------------------------------------
// formatSmsBody
// ---------------------------------------------------------------------------

describe('formatSmsBody', () => {
  it('substitutes template placeholders', () => {
    const body = formatSmsBody('Hi {name} — flipper.ai', { name: 'Alice' });
    expect(body).toBe('Hi Alice — flipper.ai');
  });

  it('returns the body unchanged if already within 160 chars', () => {
    const body = formatSmsBody('🎯 New flip: {title} $100 — flipper.ai', {
      title: 'iPhone',
    });
    expect(body.length).toBeLessThanOrEqual(SMS_MAX_LENGTH);
    expect(body).toContain('iPhone');
  });

  it('truncates the {title} placeholder when the full body exceeds 160 chars', () => {
    const longTitle = 'A'.repeat(300);
    const body = formatSmsBody('🎯 New flip: {title} — flipper.ai', { title: longTitle });
    expect(body.length).toBeLessThanOrEqual(SMS_MAX_LENGTH);
    expect(body).toMatch(/…/);
  });

  it('hard-truncates when there is no {title} placeholder but the body is too long', () => {
    const body = formatSmsBody('x'.repeat(200), {});
    expect(body.length).toBeLessThanOrEqual(SMS_MAX_LENGTH);
    expect(body.endsWith('…')).toBe(true);
  });

  it('hard-truncates when there is no room left for the title', () => {
    const prefix = 'y'.repeat(160);
    const body = formatSmsBody(`${prefix}{title}`, { title: 'whatever' });
    expect(body.length).toBeLessThanOrEqual(SMS_MAX_LENGTH);
  });
});

// ---------------------------------------------------------------------------
// notify* methods — shared setup
// ---------------------------------------------------------------------------

describe('SmsNotificationService', () => {
  let service: SmsNotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SmsNotificationService();
    mockSmsSend.mockResolvedValue({ success: true, messageId: 'sms-123' });
  });

  // -------------------------------------------------------------------------
  // notifyNewDeal — representative gating test set (AC-2, AC-4, AC-5)
  // -------------------------------------------------------------------------

  describe('notifyNewDeal', () => {
    const params = {
      userId: 'user-1',
      listingTitle: 'iPhone 15 Pro',
      askingPrice: 400,
      estimatedProfit: 200,
    };

    it('sends SMS when phone verified + smsNotifications ON', async () => {
      mockSettings();

      await service.notifyNewDeal(params);

      expect(mockSmsSend).toHaveBeenCalledTimes(1);
      const [to, body] = mockSmsSend.mock.calls[0];
      expect(to).toBe('+12025551234');
      expect(body).toContain('iPhone 15 Pro');
      expect(body).toContain('400');
      expect(body).toContain('200');
      expect(body.length).toBeLessThanOrEqual(SMS_MAX_LENGTH);
    });

    it('skips when phoneVerified is false', async () => {
      mockSettings({ phoneVerified: false });

      await service.notifyNewDeal(params);

      expect(mockSmsSend).not.toHaveBeenCalled();
    });

    it('skips when smsNotifications is false', async () => {
      mockSettings({ smsNotifications: false });

      await service.notifyNewDeal(params);

      expect(mockSmsSend).not.toHaveBeenCalled();
    });

    it('skips when phoneNumber is null', async () => {
      mockSettings({ phoneNumber: null });

      await service.notifyNewDeal(params);

      expect(mockSmsSend).not.toHaveBeenCalled();
    });

    it('skips when user is not found', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await service.notifyNewDeal(params);

      expect(mockSmsSend).not.toHaveBeenCalled();
    });

    it('swallows smsService exceptions without throwing', async () => {
      mockSettings();
      mockSmsSend.mockRejectedValueOnce(new Error('Twilio down'));

      await expect(service.notifyNewDeal(params)).resolves.toBeUndefined();
    });

    it('logs when smsService returns a failure result', async () => {
      mockSettings();
      mockSmsSend.mockResolvedValueOnce({ success: false, error: 'rate limited' });

      await expect(service.notifyNewDeal(params)).resolves.toBeUndefined();
    });

    it('swallows prisma exceptions without throwing', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockRejectedValueOnce(new Error('db down'));

      await expect(service.notifyNewDeal(params)).resolves.toBeUndefined();
      expect(mockSmsSend).not.toHaveBeenCalled();
    });

    it('truncates listing title so body stays within 160 chars', async () => {
      mockSettings();

      await service.notifyNewDeal({
        ...params,
        listingTitle: 'Very Long Listing Title '.repeat(20),
      });

      const [, body] = mockSmsSend.mock.calls[0];
      expect(body.length).toBeLessThanOrEqual(SMS_MAX_LENGTH);
    });
  });

  // -------------------------------------------------------------------------
  // notifyFlipLifecycle
  // -------------------------------------------------------------------------

  describe('notifyFlipLifecycle', () => {
    it('dispatches with status label in body', async () => {
      mockSettings();

      await service.notifyFlipLifecycle({
        userId: 'user-1',
        listingTitle: 'Nintendo Switch',
        newStatus: 'purchased',
      });

      expect(mockSmsSend).toHaveBeenCalledTimes(1);
      const body = mockSmsSend.mock.calls[0][1];
      expect(body).toContain('Nintendo Switch');
      expect(body).toContain('purchased');
    });

    it('respects guards', async () => {
      mockSettings({ smsNotifications: false });

      await service.notifyFlipLifecycle({
        userId: 'user-1',
        listingTitle: 'Anything',
        newStatus: 'sold',
      });

      expect(mockSmsSend).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Communication-event methods
  // -------------------------------------------------------------------------

  describe('notifyMessageReceived', () => {
    it('includes seller name and title', async () => {
      mockSettings();

      await service.notifyMessageReceived({
        userId: 'user-1',
        listingTitle: 'Guitar',
        sellerName: 'Bob',
      });

      const body = mockSmsSend.mock.calls[0][1];
      expect(body).toContain('Bob');
      expect(body).toContain('Guitar');
    });
  });

  describe('notifyDraftReady', () => {
    it('sends draft-ready SMS', async () => {
      mockSettings();

      await service.notifyDraftReady({ userId: 'user-1', listingTitle: 'Bike' });

      const body = mockSmsSend.mock.calls[0][1];
      expect(body).toContain('Bike');
      expect(body).toMatch(/draft/i);
    });
  });

  describe('notifyMessageSent', () => {
    it('sends message-sent SMS', async () => {
      mockSettings();

      await service.notifyMessageSent({ userId: 'user-1', listingTitle: 'Camera' });

      const body = mockSmsSend.mock.calls[0][1];
      expect(body).toContain('Camera');
    });
  });

  // -------------------------------------------------------------------------
  // Smart-alert methods
  // -------------------------------------------------------------------------

  describe('notifyFlipGoneCold', () => {
    it('sends gone-cold SMS with hours inactive', async () => {
      mockSettings();

      await service.notifyFlipGoneCold({
        userId: 'user-1',
        listingTitle: 'Couch',
        hoursInactive: 48,
      });

      const body = mockSmsSend.mock.calls[0][1];
      expect(body).toContain('Couch');
      expect(body).toContain('48');
    });
  });

  describe('notifyFlipTurnedHot', () => {
    it('sends turned-hot SMS', async () => {
      mockSettings();

      await service.notifyFlipTurnedHot({ userId: 'user-1', listingTitle: 'Lamp' });

      const body = mockSmsSend.mock.calls[0][1];
      expect(body).toContain('Lamp');
    });
  });

  describe('notifyPriceDrop', () => {
    it('sends price-drop SMS with new price', async () => {
      mockSettings();

      await service.notifyPriceDrop({
        userId: 'user-1',
        listingTitle: 'TV',
        newPrice: 300,
      });

      const body = mockSmsSend.mock.calls[0][1];
      expect(body).toContain('TV');
      expect(body).toContain('300');
    });
  });

  describe('notifyExpiring', () => {
    it('sends expiring SMS with hours remaining', async () => {
      mockSettings();

      await service.notifyExpiring({
        userId: 'user-1',
        listingTitle: 'Desk',
        hoursUntilExpiry: 12,
      });

      const body = mockSmsSend.mock.calls[0][1];
      expect(body).toContain('Desk');
      expect(body).toContain('12');
    });
  });

  describe('notifyListingUnavailable', () => {
    it('sends unavailable SMS', async () => {
      mockSettings();

      await service.notifyListingUnavailable({
        userId: 'user-1',
        listingTitle: 'Fridge',
      });

      const body = mockSmsSend.mock.calls[0][1];
      expect(body).toContain('Fridge');
    });
  });

  // -------------------------------------------------------------------------
  // Story 11.3: Per-event toggle gating
  // -------------------------------------------------------------------------

  describe('per-event SMS toggle gating (Story 11.3)', () => {
    it('skips notifyFlipGoneCold when smsNotifyFlipGoneCold is false', async () => {
      // mockSettings sets all per-event fields, override just the one under test
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        settings: {
          phoneNumber: '+12025551234',
          phoneVerified: true,
          smsNotifications: true,
          smsNotifyNewDeals: true,
          smsNotifySoldItems: true,
          smsNotifyMessageReceived: true,
          smsNotifyDraftReady: true,
          smsNotifyMessageSent: true,
          smsNotifyReviewReceived: true,
          smsNotifyFlipGoneCold: false, // disabled
          smsNotifyFlipTurnedHot: true,
          smsNotifyPriceDrops: true,
          smsNotifyExpiring: true,
          smsNotifyListingUnavailable: true,
        },
      });

      await service.notifyFlipGoneCold({
        userId: 'user-1',
        listingTitle: 'Couch',
        hoursInactive: 48,
      });

      expect(mockSmsSend).not.toHaveBeenCalled();
    });

    it('sends notifyFlipGoneCold when smsNotifyFlipGoneCold is true', async () => {
      mockSettings({ smsNotifyFlipGoneCold: true } as Parameters<typeof mockSettings>[0]);

      await service.notifyFlipGoneCold({
        userId: 'user-1',
        listingTitle: 'Couch',
        hoursInactive: 24,
      });

      expect(mockSmsSend).toHaveBeenCalledTimes(1);
    });

    it('skips notifyNewDeal when smsNotifyNewDeals is false', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        settings: {
          phoneNumber: '+12025551234',
          phoneVerified: true,
          smsNotifications: true,
          smsNotifyNewDeals: false, // disabled
          smsNotifySoldItems: true,
          smsNotifyMessageReceived: true,
          smsNotifyDraftReady: true,
          smsNotifyMessageSent: true,
          smsNotifyReviewReceived: true,
          smsNotifyFlipGoneCold: true,
          smsNotifyFlipTurnedHot: true,
          smsNotifyPriceDrops: true,
          smsNotifyExpiring: true,
          smsNotifyListingUnavailable: true,
        },
      });

      await service.notifyNewDeal({
        userId: 'user-1',
        listingTitle: 'iPhone',
        askingPrice: 500,
        estimatedProfit: 100,
      });

      expect(mockSmsSend).not.toHaveBeenCalled();
    });
  });
});
