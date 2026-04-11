/**
 * @file src/__tests__/lib/push-notification.test.ts
 * @author Stephen Boyett
 * @company Axovia
 * @date 2026-04-08
 * @version 1.1
 * @brief Unit tests for PushNotificationService (Story 11.1 + Story 11.3 per-event gating).
 */

import { PushNotificationService } from '@/lib/push-notification';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    deviceToken: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    userSettings: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/firebase/messaging-admin', () => ({
  sendToDevice: jest.fn(),
  // namespace import — same mock object is returned for both named and namespace access
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import prisma from '@/lib/db';
import * as messagingAdmin from '@/lib/firebase/messaging-admin';
import { logger } from '@/lib/logger';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockSendToDevice = messagingAdmin.sendToDevice as jest.MockedFunction<typeof messagingAdmin.sendToDevice>;

const PAYLOAD = { title: 'Test', body: 'Test body' };
const USER_ID = 'user-123';
const TOKEN_A = 'token-aaa';
const TOKEN_B = 'token-bbb';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PushNotificationService', () => {
  let service: PushNotificationService;

  beforeEach(() => {
    service = new PushNotificationService();
    jest.clearAllMocks();
  });

  describe('sendToUser', () => {
    it('sends to all tokens when pushNotifications is enabled', async () => {
      (mockPrisma.deviceToken.findMany as jest.Mock).mockResolvedValue([
        { id: 'dt-1', token: TOKEN_A },
        { id: 'dt-2', token: TOKEN_B },
      ]);
      (mockPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue({ pushNotifications: true });
      mockSendToDevice.mockResolvedValue('msg-id-123');

      await service.sendToUser(USER_ID, PAYLOAD);

      expect(mockSendToDevice).toHaveBeenCalledTimes(2);
      expect(mockSendToDevice).toHaveBeenCalledWith(TOKEN_A, PAYLOAD);
      expect(mockSendToDevice).toHaveBeenCalledWith(TOKEN_B, PAYLOAD);
    });

    it('is a no-op when no tokens found', async () => {
      (mockPrisma.deviceToken.findMany as jest.Mock).mockResolvedValue([]);

      await service.sendToUser(USER_ID, PAYLOAD);

      expect(mockSendToDevice).not.toHaveBeenCalled();
    });

    it('is a no-op when pushNotifications is false', async () => {
      (mockPrisma.deviceToken.findMany as jest.Mock).mockResolvedValue([
        { id: 'dt-1', token: TOKEN_A },
      ]);
      (mockPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue({ pushNotifications: false });

      await service.sendToUser(USER_ID, PAYLOAD);

      expect(mockSendToDevice).not.toHaveBeenCalled();
    });

    it('defaults to sending when settings are absent (null)', async () => {
      (mockPrisma.deviceToken.findMany as jest.Mock).mockResolvedValue([
        { id: 'dt-1', token: TOKEN_A },
      ]);
      (mockPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue(null);
      mockSendToDevice.mockResolvedValue('msg-id-no-settings');

      await service.sendToUser(USER_ID, PAYLOAD);

      expect(mockSendToDevice).toHaveBeenCalledTimes(1);
      expect(mockSendToDevice).toHaveBeenCalledWith(TOKEN_A, PAYLOAD);
    });

    it('deletes stale token when sendToDevice returns null', async () => {
      (mockPrisma.deviceToken.findMany as jest.Mock).mockResolvedValue([
        { id: 'dt-1', token: TOKEN_A },
      ]);
      (mockPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue({ pushNotifications: true });
      mockSendToDevice.mockResolvedValue(null); // stale token
      (mockPrisma.deviceToken.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.sendToUser(USER_ID, PAYLOAD);

      expect(mockPrisma.deviceToken.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['dt-1'] } },
      });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Stale token'),
        expect.objectContaining({ userId: USER_ID })
      );
    });

    it('fans out to multiple tokens and only deletes stale ones', async () => {
      (mockPrisma.deviceToken.findMany as jest.Mock).mockResolvedValue([
        { id: 'dt-1', token: TOKEN_A },
        { id: 'dt-2', token: TOKEN_B },
      ]);
      (mockPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue({ pushNotifications: true });
      mockSendToDevice
        .mockResolvedValueOnce('msg-id-a')  // TOKEN_A succeeds
        .mockResolvedValueOnce(null);         // TOKEN_B is stale
      (mockPrisma.deviceToken.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.sendToUser(USER_ID, PAYLOAD);

      expect(mockSendToDevice).toHaveBeenCalledTimes(2);
      expect(mockPrisma.deviceToken.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['dt-2'] } },
      });
    });

    it('does not propagate errors — swallows exceptions silently', async () => {
      (mockPrisma.deviceToken.findMany as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

      await expect(service.sendToUser(USER_ID, PAYLOAD)).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('sendToUser failed'),
        expect.objectContaining({ userId: USER_ID })
      );
    });

    it('does not propagate errors when sendToDevice throws', async () => {
      (mockPrisma.deviceToken.findMany as jest.Mock).mockResolvedValue([
        { id: 'dt-1', token: TOKEN_A },
      ]);
      (mockPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue({ pushNotifications: true });
      mockSendToDevice.mockRejectedValue(new Error('FCM network error'));

      await expect(service.sendToUser(USER_ID, PAYLOAD)).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // Story 11.3: Per-event toggle gating
    // -----------------------------------------------------------------------

    const FULL_SETTINGS = {
      pushNotifications: true,
      pushNotifyNewDeals: true,
      pushNotifySoldItems: true,
      pushNotifyMessageReceived: true,
      pushNotifyDraftReady: true,
      pushNotifyMessageSent: true,
      pushNotifyReviewReceived: true,
      pushNotifyFlipGoneCold: true,
      pushNotifyFlipTurnedHot: true,
      pushNotifyPriceDrops: true,
      pushNotifyExpiring: true,
      pushNotifyListingUnavailable: true,
      pushNotifyWeeklyDigest: false,
    };

    it('skips when eventKey provided and per-event toggle is false', async () => {
      (mockPrisma.deviceToken.findMany as jest.Mock).mockResolvedValue([
        { id: 'dt-1', token: TOKEN_A },
      ]);
      (mockPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue({
        ...FULL_SETTINGS,
        pushNotifyFlipGoneCold: false, // disabled
      });

      await service.sendToUser(USER_ID, PAYLOAD, 'flipGoneCold');

      expect(mockSendToDevice).not.toHaveBeenCalled();
    });

    it('sends when eventKey provided and per-event toggle is true', async () => {
      (mockPrisma.deviceToken.findMany as jest.Mock).mockResolvedValue([
        { id: 'dt-1', token: TOKEN_A },
      ]);
      (mockPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue(FULL_SETTINGS);
      mockSendToDevice.mockResolvedValue('msg-123');

      await service.sendToUser(USER_ID, PAYLOAD, 'flipGoneCold');

      expect(mockSendToDevice).toHaveBeenCalledTimes(1);
    });

    it('falls back to master-only gating when no eventKey provided', async () => {
      // Without eventKey, existing behaviour: per-event fields irrelevant
      (mockPrisma.deviceToken.findMany as jest.Mock).mockResolvedValue([
        { id: 'dt-1', token: TOKEN_A },
      ]);
      (mockPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue({
        ...FULL_SETTINGS,
        pushNotifyFlipGoneCold: false, // disabled — should be ignored without eventKey
      });
      mockSendToDevice.mockResolvedValue('msg-no-key');

      await service.sendToUser(USER_ID, PAYLOAD); // no eventKey

      expect(mockSendToDevice).toHaveBeenCalledTimes(1);
    });

    it('sends when settings are null and eventKey provided (default to send)', async () => {
      (mockPrisma.deviceToken.findMany as jest.Mock).mockResolvedValue([
        { id: 'dt-1', token: TOKEN_A },
      ]);
      (mockPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue(null);
      mockSendToDevice.mockResolvedValue('msg-null-settings');

      await service.sendToUser(USER_ID, PAYLOAD, 'newDeals');

      expect(mockSendToDevice).toHaveBeenCalledTimes(1);
    });
  });
});
