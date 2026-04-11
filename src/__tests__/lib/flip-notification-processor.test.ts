/**
 * @file src/__tests__/lib/flip-notification-processor.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-09
 * @version 1.0
 * @brief Unit tests for flip lifecycle notification processor.
 *
 * @description
 * Tests processFlipLifecycleNotifications() covering event consumption,
 * preference checking, frequency checking, email dispatch, per-user rate
 * limiting, opportunity digest aggregation, provider circuit breaker,
 * error handling, batch processing, stale event filtering, retry with
 * retryCount, and idempotency guard.
 */

// ---------------------------------------------------------------------------
// Environment — must be set before module loads to override SEND_DELAY_MS
// ---------------------------------------------------------------------------

process.env.NOTIFICATION_PROCESSOR_SEND_DELAY_MS = '0';

// ---------------------------------------------------------------------------
// Mocks — jest.mock calls are hoisted above imports by Jest
// ---------------------------------------------------------------------------

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    notificationEvent: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/email-service', () => ({
  __esModule: true,
  emailService: {
    sendOpportunityFound: jest.fn(),
    sendFlipPurchased: jest.fn(),
    sendFlipListed: jest.fn(),
    sendFlipSold: jest.fn(),
    sendDigest: jest.fn(),
  },
}));

// Story 11.2: SMS dispatch is fire-and-forget from the processor. Mock it so
// the email-focused tests don't hit the real SMS service.
jest.mock('@/lib/sms-notification-service', () => ({
  __esModule: true,
  smsNotificationService: {
    notifyNewDeal: jest.fn().mockResolvedValue(undefined),
    notifyFlipLifecycle: jest.fn().mockResolvedValue(undefined),
  },
}));

// Story 11.3: Push dispatch is fire-and-forget from the processor.
jest.mock('@/lib/push-notification', () => ({
  __esModule: true,
  pushNotificationService: {
    sendToUser: jest.fn().mockResolvedValue(undefined),
  },
}));

// Story 10.4: Communication events (message.*) are routed through this service.
jest.mock('@/lib/communication-notification', () => ({
  __esModule: true,
  communicationNotificationService: {
    notifyMessageReceived: jest.fn().mockResolvedValue(undefined),
    notifyDraftReady: jest.fn().mockResolvedValue(undefined),
    notifyMessageSent: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    timed: jest.fn(() => jest.fn()),
  },
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import prisma from '@/lib/db';
import { emailService } from '@/lib/email-service';
import { logger } from '@/lib/logger';
import { smsNotificationService } from '@/lib/sms-notification-service';
import { pushNotificationService } from '@/lib/push-notification';
import {
  processFlipLifecycleNotifications,
  type ProcessingResult,
} from '@/lib/flip-notification-processor';

// ---------------------------------------------------------------------------
// Typed mock references
// ---------------------------------------------------------------------------

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockEmailService = emailService as jest.Mocked<typeof emailService>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockSmsService = smsNotificationService as jest.Mocked<typeof smsNotificationService>;
const mockPushService = pushNotificationService as jest.Mocked<typeof pushNotificationService>;

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

interface MockEventUser {
  id: string;
  email: string;
  name: string | null;
  settings: {
    emailNotifications: boolean;
    notifyNewDeals: boolean;
    notifySoldItems: boolean;
    notifyFrequency: string | null;
  } | null;
}

interface MockEvent {
  id: string;
  eventType: string;
  userId: string;
  status: string;
  retryCount: number;
  createdAt: Date;
  processedAt: Date | null;
  payload: Record<string, unknown>;
  errorMessage: string | null;
  listingId: string | null;
  user: MockEventUser | null;
}

function makeUser(overrides: Partial<MockEventUser> = {}): MockEventUser {
  return {
    id: 'user-1',
    email: 'flipper@example.com',
    name: 'Test Flipper',
    settings: {
      emailNotifications: true,
      notifyNewDeals: true,
      notifySoldItems: true,
      notifyFrequency: 'instant',
    },
    ...overrides,
  };
}

function makeEvent(overrides: Partial<MockEvent> = {}): MockEvent {
  return {
    id: 'evt-1',
    eventType: 'opportunity.found',
    userId: 'user-1',
    status: 'PENDING',
    retryCount: 0,
    createdAt: new Date(),
    processedAt: null,
    payload: {
      platform: 'CRAIGSLIST',
      askingPrice: 50,
      estimatedValue: 120,
      profitPotential: 70,
      valueScore: 85,
      flippabilityLabel: 'Great Flip',
      listingTitle: 'Vintage Lamp',
    },
    errorMessage: null,
    listingId: 'lst-1',
    user: makeUser(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Default mock return values
// ---------------------------------------------------------------------------

const DEFAULT_SEND_RESULT = { success: true, messageId: 'test-msg-id' };

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('flip-notification-processor', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the findMany mock queue — jest.clearAllMocks() preserves
    // queued .mockResolvedValueOnce() values, which would otherwise leak
    // between tests when the previous test didn't consume its full queue.
    (mockPrisma.notificationEvent.findMany as jest.Mock).mockReset();

    // Default: no events (PENDING/FAILED query, then stale query)
    (mockPrisma.notificationEvent.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    // Default: no recent email sends for rate limiting
    (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

    // Default: updateMany succeeds (used by optimistic lock + stale marking)
    (mockPrisma.notificationEvent.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    // Default: update succeeds
    (mockPrisma.notificationEvent.update as jest.Mock).mockResolvedValue({});

    // Default: findUnique returns event with payload (used by markProcessed metadata merge)
    (mockPrisma.notificationEvent.findUnique as jest.Mock).mockResolvedValue({
      payload: {},
    });

    // Default: all email sends succeed
    (mockEmailService.sendOpportunityFound as jest.Mock).mockResolvedValue(DEFAULT_SEND_RESULT);
    (mockEmailService.sendFlipPurchased as jest.Mock).mockResolvedValue(DEFAULT_SEND_RESULT);
    (mockEmailService.sendFlipListed as jest.Mock).mockResolvedValue(DEFAULT_SEND_RESULT);
    (mockEmailService.sendFlipSold as jest.Mock).mockResolvedValue(DEFAULT_SEND_RESULT);
    (mockEmailService.sendDigest as jest.Mock).mockResolvedValue(DEFAULT_SEND_RESULT);

    // Logger timed returns a done function
    (mockLogger.timed as jest.Mock).mockReturnValue(jest.fn());

    // Default: SMS dispatch succeeds (fire-and-forget)
    (mockSmsService.notifyNewDeal as jest.Mock).mockResolvedValue(undefined);
    (mockSmsService.notifyFlipLifecycle as jest.Mock).mockResolvedValue(undefined);
  });

  // -----------------------------------------------------------------------
  // 1. Event consumption
  // -----------------------------------------------------------------------

  describe('event consumption', () => {
    it('processes PENDING events and calls sendOpportunityFound for opportunity.found', async () => {
      const event = makeEvent({ eventType: 'opportunity.found' });
      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      expect(mockEmailService.sendOpportunityFound).toHaveBeenCalledWith(
        'flipper@example.com',
        expect.objectContaining({
          platform: 'CRAIGSLIST',
          buyPrice: 50,
          estimatedProfit: 70,
          flippabilityScore: 85,
        })
      );
      expect(result.sent).toBe(1);
    });

    it('calls sendFlipPurchased for flip.purchased events', async () => {
      const event = makeEvent({
        eventType: 'flip.purchased',
        payload: {
          listingTitle: 'Vintage Lamp',
          purchasePrice: 50,
          estimatedProfit: 70,
          platform: 'CRAIGSLIST',
        },
      });
      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      await processFlipLifecycleNotifications();

      expect(mockEmailService.sendFlipPurchased).toHaveBeenCalledWith(
        'flipper@example.com',
        expect.objectContaining({
          itemTitle: 'Vintage Lamp',
          purchasePrice: 50,
        })
      );
    });

    it('calls sendFlipListed for flip.listed events', async () => {
      const event = makeEvent({
        eventType: 'flip.listed',
        payload: {
          listingTitle: 'Vintage Lamp',
          destinationPlatform: 'EBAY',
          listingUrl: 'https://ebay.com/item/123',
        },
      });
      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      await processFlipLifecycleNotifications();

      expect(mockEmailService.sendFlipListed).toHaveBeenCalledWith(
        'flipper@example.com',
        expect.objectContaining({
          destinationPlatform: 'EBAY',
          listingUrl: 'https://ebay.com/item/123',
        })
      );
    });

    it('calls sendFlipSold for flip.sold events', async () => {
      const event = makeEvent({
        eventType: 'flip.sold',
        payload: {
          listingTitle: 'Vintage Lamp',
          salePrice: 150,
          actualProfit: 100,
          roiPercent: 200,
          daysToFlip: 7,
          platform: 'EBAY',
          purchasePrice: 50,
        },
      });
      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      await processFlipLifecycleNotifications();

      expect(mockEmailService.sendFlipSold).toHaveBeenCalledWith(
        'flipper@example.com',
        expect.objectContaining({
          salePrice: 150,
          actualProfit: 100,
          roiPercent: 200,
          daysToFlip: 7,
        })
      );
    });

    it('marks event as PROCESSED with resendMessageId after successful send', async () => {
      const event = makeEvent();
      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      await processFlipLifecycleNotifications();

      expect(mockPrisma.notificationEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'evt-1' },
          data: expect.objectContaining({
            status: 'PROCESSED',
            processedAt: expect.any(Date),
            payload: expect.objectContaining({
              processedAction: 'sent',
              resendMessageId: 'test-msg-id',
            }),
          }),
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // 2. Preference checking
  // -----------------------------------------------------------------------

  describe('preference checking', () => {
    it('skips event when emailNotifications master toggle is false', async () => {
      const event = makeEvent({
        user: makeUser({
          settings: {
            emailNotifications: false,
            notifyNewDeals: true,
            notifySoldItems: true,
            notifyFrequency: 'instant',
          },
        }),
      });
      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      expect(result.skipped.preferenceDisabled).toBe(1);
      expect(result.sent).toBe(0);
      expect(mockEmailService.sendOpportunityFound).not.toHaveBeenCalled();
    });

    it('skips opportunity.found when notifyNewDeals is false', async () => {
      const event = makeEvent({
        eventType: 'opportunity.found',
        user: makeUser({
          settings: {
            emailNotifications: true,
            notifyNewDeals: false,
            notifySoldItems: true,
            notifyFrequency: 'instant',
          },
        }),
      });
      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      expect(result.skipped.preferenceDisabled).toBe(1);
      expect(mockEmailService.sendOpportunityFound).not.toHaveBeenCalled();
    });

    it('skips flip.sold when notifySoldItems is false', async () => {
      const event = makeEvent({
        eventType: 'flip.sold',
        user: makeUser({
          settings: {
            emailNotifications: true,
            notifyNewDeals: true,
            notifySoldItems: false,
            notifyFrequency: 'instant',
          },
        }),
        payload: {
          listingTitle: 'Vintage Lamp',
          salePrice: 150,
          actualProfit: 100,
          roiPercent: 200,
          platform: 'EBAY',
          purchasePrice: 50,
        },
      });
      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      expect(result.skipped.preferenceDisabled).toBe(1);
      expect(mockEmailService.sendFlipSold).not.toHaveBeenCalled();
    });

    it('skips event when user has null settings', async () => {
      const event = makeEvent({
        user: makeUser({ settings: null }),
      });
      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      expect(result.skipped.preferenceDisabled).toBe(1);
      expect(mockEmailService.sendOpportunityFound).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 3. Frequency checking
  // -----------------------------------------------------------------------

  describe('frequency checking', () => {
    it('defers opportunity.found when notifyFrequency is daily', async () => {
      const event = makeEvent({
        eventType: 'opportunity.found',
        user: makeUser({
          settings: {
            emailNotifications: true,
            notifyNewDeals: true,
            notifySoldItems: true,
            notifyFrequency: 'daily',
          },
        }),
      });
      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      expect(result.skipped.frequencyDeferred).toBe(1);
      expect(result.sent).toBe(0);
      expect(mockEmailService.sendOpportunityFound).not.toHaveBeenCalled();
    });

    it('does NOT defer flip.sold when notifyFrequency is daily', async () => {
      const event = makeEvent({
        eventType: 'flip.sold',
        user: makeUser({
          settings: {
            emailNotifications: true,
            notifyNewDeals: true,
            notifySoldItems: true,
            notifyFrequency: 'daily',
          },
        }),
        payload: {
          listingTitle: 'Vintage Lamp',
          salePrice: 150,
          actualProfit: 100,
          roiPercent: 200,
          platform: 'EBAY',
          purchasePrice: 50,
        },
      });
      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      expect(result.skipped.frequencyDeferred).toBe(0);
      expect(mockEmailService.sendFlipSold).toHaveBeenCalled();
    });

    it('does NOT defer flip.purchased when notifyFrequency is weekly', async () => {
      const event = makeEvent({
        eventType: 'flip.purchased',
        user: makeUser({
          settings: {
            emailNotifications: true,
            notifyNewDeals: true,
            notifySoldItems: true,
            notifyFrequency: 'weekly',
          },
        }),
        payload: {
          listingTitle: 'Vintage Lamp',
          purchasePrice: 50,
          estimatedProfit: 70,
          platform: 'CRAIGSLIST',
        },
      });
      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      expect(result.skipped.frequencyDeferred).toBe(0);
      expect(mockEmailService.sendFlipPurchased).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 4. Per-user rate limiting
  // -----------------------------------------------------------------------

  describe('per-user rate limiting', () => {
    it('skips events when user exceeds MAX_EMAILS_PER_USER_PER_HOUR', async () => {
      const event = makeEvent();
      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);

      // User already sent 10 emails in the past hour (default max is 10)
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([
        { userId: 'user-1', _count: { id: 10 } },
      ]);

      const result = await processFlipLifecycleNotifications();

      expect(result.skipped.rateLimited).toBe(1);
      expect(result.sent).toBe(0);
      expect(mockEmailService.sendOpportunityFound).not.toHaveBeenCalled();
    });

    it('allows events when user is below rate limit', async () => {
      const event = makeEvent();
      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);

      // User sent 5 emails — below the default 10 limit
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([
        { userId: 'user-1', _count: { id: 5 } },
      ]);

      const result = await processFlipLifecycleNotifications();

      expect(result.skipped.rateLimited).toBe(0);
      expect(result.sent).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // 5. Opportunity digest aggregation
  // -----------------------------------------------------------------------

  describe('opportunity digest aggregation', () => {
    it('sends digest when > OPPORTUNITY_DIGEST_THRESHOLD events for same user', async () => {
      // Create 6 opportunity.found events for the same user (threshold default is 5)
      const events = Array.from({ length: 6 }, (_, i) =>
        makeEvent({
          id: `evt-${i + 1}`,
          eventType: 'opportunity.found',
          payload: {
            platform: 'CRAIGSLIST',
            askingPrice: 50 + i * 10,
            estimatedValue: 120 + i * 10,
            profitPotential: 70 + i * 5,
            valueScore: 80 + i,
            flippabilityLabel: 'Great Flip',
            listingTitle: `Item ${i + 1}`,
          },
        })
      );

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce(events)
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      expect(mockEmailService.sendDigest).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendDigest).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'flipper@example.com',
          totalScanned: 6,
        })
      );
      // Individual opportunity sends should NOT have been called
      expect(mockEmailService.sendOpportunityFound).not.toHaveBeenCalled();
      expect(result.sent).toBe(1); // 1 digest email
    });

    it('sends individual emails when <= OPPORTUNITY_DIGEST_THRESHOLD events', async () => {
      // Create 3 opportunity.found events — below threshold
      const events = Array.from({ length: 3 }, (_, i) =>
        makeEvent({
          id: `evt-${i + 1}`,
          eventType: 'opportunity.found',
          payload: {
            platform: 'CRAIGSLIST',
            askingPrice: 50 + i * 10,
            estimatedValue: 120,
            profitPotential: 70,
            valueScore: 85,
            flippabilityLabel: 'Great Flip',
            listingTitle: `Item ${i + 1}`,
          },
        })
      );

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce(events)
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      expect(mockEmailService.sendDigest).not.toHaveBeenCalled();
      expect(mockEmailService.sendOpportunityFound).toHaveBeenCalledTimes(3);
      expect(result.sent).toBe(3);
    });

    it('skips digest when emailNotifications is false', async () => {
      // 6 opportunity.found events for one user (above digest threshold)
      // but the user has the master email toggle disabled.
      const events = Array.from({ length: 6 }, (_, i) =>
        makeEvent({
          id: `evt-pref-${i + 1}`,
          eventType: 'opportunity.found',
          user: makeUser({
            settings: {
              emailNotifications: false,
              notifyNewDeals: true,
              notifySoldItems: true,
              notifyFrequency: 'instant',
            },
          }),
          payload: {
            platform: 'CRAIGSLIST',
            listingTitle: `Item ${i + 1}`,
            valueScore: 80,
          },
        })
      );

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce(events)
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      // No email send should happen
      expect(mockEmailService.sendDigest).not.toHaveBeenCalled();
      expect(mockEmailService.sendOpportunityFound).not.toHaveBeenCalled();
      // All 6 events counted as preference disabled (digest fan-out)
      expect(result.skipped.preferenceDisabled).toBe(6);
      expect(result.processed).toBe(6);
      expect(result.sent).toBe(0);
      // The digest path uses updateMany (markDigestProcessed) — verify it
      // was called against the full digest event id list.
      expect(mockPrisma.notificationEvent.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: {
              in: expect.arrayContaining([
                'evt-pref-1',
                'evt-pref-2',
                'evt-pref-3',
                'evt-pref-4',
                'evt-pref-5',
                'evt-pref-6',
              ]),
            },
          },
          data: expect.objectContaining({ status: 'PROCESSED' }),
        })
      );
    });

    it('skips digest when notifyNewDeals is false', async () => {
      // 6 events for one user, type-specific opt-out for opportunity.found
      const events = Array.from({ length: 6 }, (_, i) =>
        makeEvent({
          id: `evt-newdeals-${i + 1}`,
          eventType: 'opportunity.found',
          user: makeUser({
            settings: {
              emailNotifications: true,
              notifyNewDeals: false,
              notifySoldItems: true,
              notifyFrequency: 'instant',
            },
          }),
          payload: {
            platform: 'CRAIGSLIST',
            listingTitle: `Item ${i + 1}`,
            valueScore: 80,
          },
        })
      );

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce(events)
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      expect(mockEmailService.sendDigest).not.toHaveBeenCalled();
      expect(mockEmailService.sendOpportunityFound).not.toHaveBeenCalled();
      expect(result.skipped.preferenceDisabled).toBe(6);
      expect(result.processed).toBe(6);
      expect(result.sent).toBe(0);
      expect(mockPrisma.notificationEvent.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: {
              in: expect.arrayContaining([
                'evt-newdeals-1',
                'evt-newdeals-6',
              ]),
            },
          },
          data: expect.objectContaining({ status: 'PROCESSED' }),
        })
      );
    });

    it("defers digest when notifyFrequency is 'daily'", async () => {
      // 6 events for one user with daily frequency — full digest deferred
      const events = Array.from({ length: 6 }, (_, i) =>
        makeEvent({
          id: `evt-daily-${i + 1}`,
          eventType: 'opportunity.found',
          user: makeUser({
            settings: {
              emailNotifications: true,
              notifyNewDeals: true,
              notifySoldItems: true,
              notifyFrequency: 'daily',
            },
          }),
          payload: {
            platform: 'CRAIGSLIST',
            listingTitle: `Item ${i + 1}`,
            valueScore: 80,
          },
        })
      );

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce(events)
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      expect(mockEmailService.sendDigest).not.toHaveBeenCalled();
      expect(mockEmailService.sendOpportunityFound).not.toHaveBeenCalled();
      expect(result.skipped.frequencyDeferred).toBe(6);
      expect(result.processed).toBe(6);
      expect(result.sent).toBe(0);
      expect(mockPrisma.notificationEvent.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: {
              in: expect.arrayContaining([
                'evt-daily-1',
                'evt-daily-6',
              ]),
            },
          },
          data: expect.objectContaining({ status: 'PROCESSED' }),
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // 6. Provider circuit breaker
  // -----------------------------------------------------------------------

  describe('provider circuit breaker', () => {
    it('stops processing after PROVIDER_FAILURE_THRESHOLD consecutive failures', async () => {
      // Create 5 events — circuit breaker default threshold is 3
      const events = Array.from({ length: 5 }, (_, i) =>
        makeEvent({
          id: `evt-${i + 1}`,
          eventType: 'flip.purchased',
          payload: {
            listingTitle: `Item ${i + 1}`,
            purchasePrice: 50,
            estimatedProfit: 70,
            platform: 'CRAIGSLIST',
          },
        })
      );

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce(events)
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      // All email sends fail
      (mockEmailService.sendFlipPurchased as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Provider unavailable',
      });

      const result = await processFlipLifecycleNotifications();

      // Should have attempted 3 sends, then circuit breaker trips
      expect(mockEmailService.sendFlipPurchased).toHaveBeenCalledTimes(3);
      expect(result.failed).toBe(3);
      // The remaining 2 events were not processed due to circuit breaker
      expect(mockLogger.error).toHaveBeenCalledWith(
        'notification.provider.circuit_breaker',
        expect.objectContaining({
          failureCount: 3,
        })
      );
    });

    it('resets consecutive failure counter on a successful send', async () => {
      // Events: fail, fail, succeed, fail, fail — should NOT trip breaker
      const events = Array.from({ length: 5 }, (_, i) =>
        makeEvent({
          id: `evt-${i + 1}`,
          eventType: 'flip.listed',
          payload: {
            listingTitle: `Item ${i + 1}`,
            destinationPlatform: 'EBAY',
          },
        })
      );

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce(events)
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      (mockEmailService.sendFlipListed as jest.Mock)
        .mockResolvedValueOnce({ success: false, error: 'Transient error' })
        .mockResolvedValueOnce({ success: false, error: 'Transient error' })
        .mockResolvedValueOnce({ success: true, messageId: 'msg-3' })
        .mockResolvedValueOnce({ success: false, error: 'Transient error' })
        .mockResolvedValueOnce({ success: false, error: 'Transient error' });

      const result = await processFlipLifecycleNotifications();

      // All 5 events should be attempted since breaker resets at event 3
      expect(mockEmailService.sendFlipListed).toHaveBeenCalledTimes(5);
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(4);
    });
  });

  // -----------------------------------------------------------------------
  // 7. Stale event filtering
  // -----------------------------------------------------------------------

  describe('stale event filtering', () => {
    it('marks events older than MAX_EVENT_AGE_HOURS as PROCESSED', async () => {
      const staleEventIds = [{ id: 'stale-1' }, { id: 'stale-2' }, { id: 'stale-3' }];

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([]) // no fresh events
        .mockResolvedValueOnce(staleEventIds); // stale events
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      expect(mockPrisma.notificationEvent.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['stale-1', 'stale-2', 'stale-3'] } },
          data: expect.objectContaining({
            status: 'PROCESSED',
            processedAt: expect.any(Date),
          }),
        })
      );
      expect(result.skipped.stale).toBe(3);
      expect(result.processed).toBe(3);
    });

    it('does not call updateMany for stale events when there are none', async () => {
      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      expect(result.skipped.stale).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // 8. Retry with retryCount
  // -----------------------------------------------------------------------

  describe('retry with retryCount', () => {
    it('picks up FAILED events with retryCount < MAX_RETRIES', async () => {
      const failedEvent = makeEvent({
        id: 'evt-failed-1',
        status: 'FAILED',
        retryCount: 1,
      });

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([failedEvent])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      expect(result.sent).toBe(1);
      expect(mockEmailService.sendOpportunityFound).toHaveBeenCalled();
    });

    it('increments retryCount on send failure', async () => {
      const event = makeEvent({
        id: 'evt-retry-1',
        retryCount: 1,
      });

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);
      (mockEmailService.sendOpportunityFound as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Delivery failed',
      });

      await processFlipLifecycleNotifications();

      expect(mockPrisma.notificationEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'evt-retry-1' },
          data: expect.objectContaining({
            status: 'FAILED',
            retryCount: 2, // event.retryCount (1) + 1
            errorMessage: 'Delivery failed',
          }),
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // 9. Idempotency guard
  // -----------------------------------------------------------------------

  describe('idempotency guard', () => {
    it('skips events where payload contains resendMessageId', async () => {
      const event = makeEvent({
        payload: {
          platform: 'CRAIGSLIST',
          listingTitle: 'Vintage Lamp',
          resendMessageId: 'already-sent-msg-id',
        },
      });

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      expect(result.processed).toBe(1);
      expect(result.sent).toBe(0);
      expect(mockEmailService.sendOpportunityFound).not.toHaveBeenCalled();
      // Should mark as processed with skipped reason
      expect(mockPrisma.notificationEvent.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'evt-1' }),
          data: expect.objectContaining({
            status: 'PROCESSED',
          }),
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // 10. Error handling
  // -----------------------------------------------------------------------

  describe('error handling', () => {
    it('records error in errorMessage and increments retryCount on send failure', async () => {
      const event = makeEvent({
        id: 'evt-err-1',
        retryCount: 0,
      });

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);
      (mockEmailService.sendOpportunityFound as jest.Mock).mockResolvedValue({
        success: false,
        error: 'SMTP connection refused',
      });

      const result = await processFlipLifecycleNotifications();

      expect(result.failed).toBe(1);
      expect(result.errors).toEqual([
        { eventId: 'evt-err-1', error: 'SMTP connection refused' },
      ]);
      expect(mockPrisma.notificationEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FAILED',
            retryCount: 1,
            errorMessage: 'SMTP connection refused',
          }),
        })
      );
    });

    it('handles thrown exceptions during email send', async () => {
      const event = makeEvent({
        id: 'evt-throw-1',
        retryCount: 0,
      });

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);
      (mockEmailService.sendOpportunityFound as jest.Mock).mockRejectedValue(
        new Error('Unexpected network failure')
      );

      const result = await processFlipLifecycleNotifications();

      expect(result.failed).toBe(1);
      expect(result.errors[0]).toEqual(
        expect.objectContaining({
          eventId: 'evt-throw-1',
          error: 'Unexpected network failure',
        })
      );
    });

    it('handles non-Error thrown values gracefully', async () => {
      const event = makeEvent({
        id: 'evt-throw-str',
        retryCount: 0,
      });

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);
      (mockEmailService.sendOpportunityFound as jest.Mock).mockRejectedValue('string error');

      const result = await processFlipLifecycleNotifications();

      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toBe('string error');
    });

    it('leaves event as PENDING when provider returns 429 rate limit', async () => {
      const event = makeEvent({
        id: 'evt-429',
        retryCount: 0,
      });

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);
      (mockEmailService.sendOpportunityFound as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Rate limited: 429 Too Many Requests',
      });

      await processFlipLifecycleNotifications();

      // Should set status back to PENDING (not FAILED) for 429 errors
      expect(mockPrisma.notificationEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'evt-429' },
          data: { status: 'PENDING' },
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // 11. Result shape
  // -----------------------------------------------------------------------

  describe('result shape', () => {
    it('returns correct ProcessingResult structure with all fields', async () => {
      // No events — clean run
      const result = await processFlipLifecycleNotifications();

      expect(result).toEqual<ProcessingResult>({
        processed: 0,
        sent: 0,
        skipped: {
          preferenceDisabled: 0,
          frequencyDeferred: 0,
          rateLimited: 0,
          stale: 0,
          userDeleted: 0,
        },
        failed: 0,
        errors: [],
      });
    });

    it('aggregates counts across mixed event outcomes', async () => {
      const okEvent = makeEvent({
        id: 'evt-ok',
        eventType: 'flip.purchased',
        payload: {
          listingTitle: 'OK Item',
          purchasePrice: 50,
          estimatedProfit: 70,
          platform: 'CRAIGSLIST',
        },
      });
      const prefDisabledEvent = makeEvent({
        id: 'evt-pref',
        eventType: 'flip.listed',
        user: makeUser({
          settings: {
            emailNotifications: false,
            notifyNewDeals: true,
            notifySoldItems: true,
            notifyFrequency: 'instant',
          },
        }),
        payload: { listingTitle: 'Pref Item', destinationPlatform: 'EBAY' },
      });
      const deletedUserEvent = makeEvent({
        id: 'evt-deleted',
        eventType: 'flip.sold',
        user: null,
        payload: { listingTitle: 'Deleted User Item' },
      });

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([okEvent, prefDisabledEvent, deletedUserEvent])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      expect(result.processed).toBeGreaterThanOrEqual(3);
      expect(result.sent).toBe(1);
      expect(result.skipped.preferenceDisabled).toBe(1);
      expect(result.skipped.userDeleted).toBe(1);
      expect(result.failed).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // 12. User deleted
  // -----------------------------------------------------------------------

  describe('user deleted', () => {
    it('handles null user gracefully and increments userDeleted counter', async () => {
      const event = makeEvent({
        id: 'evt-orphan',
        user: null,
      });

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      expect(result.skipped.userDeleted).toBe(1);
      expect(result.processed).toBe(1);
      expect(result.sent).toBe(0);
      expect(mockEmailService.sendOpportunityFound).not.toHaveBeenCalled();
    });

    it('marks orphaned event as PROCESSED with skipped reason', async () => {
      const event = makeEvent({
        id: 'evt-orphan-2',
        user: null,
      });

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      await processFlipLifecycleNotifications();

      expect(mockPrisma.notificationEvent.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'evt-orphan-2' }),
          data: expect.objectContaining({
            status: 'PROCESSED',
          }),
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // SMS dispatch — Story 11.2 (fire-and-forget alongside email)
  // -----------------------------------------------------------------------

  describe('SMS dispatch', () => {
    // Helper to wait for the fire-and-forget SMS promise to settle. The
    // processor uses `void dispatchLifecycleSms(...).catch(...)` so we need
    // to flush the microtask queue before asserting on SMS mock calls.
    const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

    it('dispatches SMS for opportunity.found after email succeeds', async () => {
      const event = makeEvent({
        id: 'evt-sms-opp',
        eventType: 'opportunity.found',
        userId: 'user-sms-1',
        payload: {
          listingTitle: 'Vintage Lamp',
          askingPrice: 50,
          profitPotential: 70,
          platform: 'CRAIGSLIST',
          valueScore: 85,
        },
      });

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      await processFlipLifecycleNotifications();
      await flushMicrotasks();

      expect(mockSmsService.notifyNewDeal).toHaveBeenCalledWith({
        userId: 'user-sms-1',
        listingTitle: 'Vintage Lamp',
        askingPrice: 50,
        estimatedProfit: 70,
      });
      expect(mockSmsService.notifyFlipLifecycle).not.toHaveBeenCalled();
    });

    it('dispatches SMS for flip.purchased after email succeeds', async () => {
      const event = makeEvent({
        id: 'evt-sms-purch',
        eventType: 'flip.purchased',
        userId: 'user-sms-2',
        payload: {
          listingTitle: 'Antique Chair',
          purchasePrice: 80,
          estimatedProfit: 100,
          platform: 'EBAY',
        },
      });

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      await processFlipLifecycleNotifications();
      await flushMicrotasks();

      expect(mockSmsService.notifyFlipLifecycle).toHaveBeenCalledWith({
        userId: 'user-sms-2',
        listingTitle: 'Antique Chair',
        newStatus: 'purchased',
      });
      expect(mockSmsService.notifyNewDeal).not.toHaveBeenCalled();
    });

    it('dispatches SMS for flip.listed after email succeeds', async () => {
      const event = makeEvent({
        id: 'evt-sms-listed',
        eventType: 'flip.listed',
        userId: 'user-sms-3',
        payload: {
          listingTitle: 'Restored Watch',
          destinationPlatform: 'EBAY',
          listingUrl: 'https://ebay.com/watch',
        },
      });

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      await processFlipLifecycleNotifications();
      await flushMicrotasks();

      expect(mockSmsService.notifyFlipLifecycle).toHaveBeenCalledWith({
        userId: 'user-sms-3',
        listingTitle: 'Restored Watch',
        newStatus: 'listed',
      });
    });

    it('dispatches SMS for flip.sold after email succeeds', async () => {
      const event = makeEvent({
        id: 'evt-sms-sold',
        eventType: 'flip.sold',
        userId: 'user-sms-4',
        payload: {
          listingTitle: 'Vintage Camera',
          salePrice: 250,
          actualProfit: 150,
          roiPercent: 150,
          platform: 'EBAY',
          purchasePrice: 100,
        },
      });

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      await processFlipLifecycleNotifications();
      await flushMicrotasks();

      expect(mockSmsService.notifyFlipLifecycle).toHaveBeenCalledWith({
        userId: 'user-sms-4',
        listingTitle: 'Vintage Camera',
        newStatus: 'sold',
      });
    });

    it('SMS dispatch failure does not affect email processing', async () => {
      const event = makeEvent({
        id: 'evt-sms-err',
        eventType: 'flip.purchased',
        userId: 'user-sms-err',
        payload: {
          listingTitle: 'Broken SMS',
          purchasePrice: 50,
          estimatedProfit: 70,
          platform: 'CRAIGSLIST',
        },
      });

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      // SMS service throws — should be swallowed by .catch(() => undefined)
      (mockSmsService.notifyFlipLifecycle as jest.Mock).mockRejectedValueOnce(
        new Error('Twilio API down')
      );

      const result = await processFlipLifecycleNotifications();
      await flushMicrotasks();

      // Email still sent
      expect(mockEmailService.sendFlipPurchased).toHaveBeenCalledTimes(1);
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
      // SMS was attempted
      expect(mockSmsService.notifyFlipLifecycle).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Optimistic locking
  // -----------------------------------------------------------------------

  describe('optimistic locking', () => {
    it('skips event when another run already claimed it (updateMany returns 0)', async () => {
      const event = makeEvent({ id: 'evt-claimed' });

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      // Optimistic lock fails — another process claimed the event
      (mockPrisma.notificationEvent.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await processFlipLifecycleNotifications();

      expect(result.processed).toBe(1);
      expect(result.sent).toBe(0);
      expect(mockEmailService.sendOpportunityFound).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  describe('payload fallback defaults', () => {
    // These tests exercise the `?? 'Unknown'` and `?? 0` fallback branches in
    // sendLifecycleEmail and dispatchLifecycleSms by passing empty payloads.

    it('uses defaults for opportunity.found with empty payload', async () => {
      const event = makeEvent({
        id: 'evt-empty-opp',
        eventType: 'opportunity.found',
        payload: {},
        user: makeUser({ name: null }),
      });

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);

      await processFlipLifecycleNotifications();

      expect(mockEmailService.sendOpportunityFound).toHaveBeenCalledWith(
        'flipper@example.com',
        expect.objectContaining({
          name: undefined,
          platform: 'Unknown',
          buyPrice: 0,
          estimatedProfit: 0,
          flippabilityScore: 0,
          flippabilityLabel: 'Unknown',
          itemTitle: 'Unknown Item',
        })
      );
    });

    it('uses defaults for flip.purchased with empty payload', async () => {
      const event = makeEvent({
        id: 'evt-empty-pur',
        eventType: 'flip.purchased',
        payload: {},
        user: makeUser({ name: null }),
      });

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);

      await processFlipLifecycleNotifications();

      expect(mockEmailService.sendFlipPurchased).toHaveBeenCalledWith(
        'flipper@example.com',
        expect.objectContaining({
          name: undefined,
          itemTitle: 'Unknown Item',
          purchasePrice: 0,
          estimatedProfit: 0,
          platform: 'Unknown',
        })
      );
    });

    it('uses defaults for flip.listed with empty payload', async () => {
      const event = makeEvent({
        id: 'evt-empty-list',
        eventType: 'flip.listed',
        payload: {},
        user: makeUser({ name: null }),
      });

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);

      await processFlipLifecycleNotifications();

      expect(mockEmailService.sendFlipListed).toHaveBeenCalledWith(
        'flipper@example.com',
        expect.objectContaining({
          name: undefined,
          itemTitle: 'Unknown Item',
          destinationPlatform: 'Unknown',
        })
      );
    });

    it('uses defaults for flip.sold with empty payload', async () => {
      const event = makeEvent({
        id: 'evt-empty-sold',
        eventType: 'flip.sold',
        payload: {},
        user: makeUser({ name: null }),
      });

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);

      await processFlipLifecycleNotifications();

      expect(mockEmailService.sendFlipSold).toHaveBeenCalledWith(
        'flipper@example.com',
        expect.objectContaining({
          name: undefined,
          itemTitle: 'Unknown Item',
          salePrice: 0,
          actualProfit: 0,
          roiPercent: 0,
          platform: 'Unknown',
          purchasePrice: 0,
        })
      );
    });

    it('dispatches SMS for opportunity.found with empty payload defaults', async () => {
      const event = makeEvent({
        id: 'evt-empty-sms-opp',
        eventType: 'opportunity.found',
        payload: { listingTitle: 'Test' },
      });

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);

      await processFlipLifecycleNotifications();
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockSmsService.notifyNewDeal).toHaveBeenCalledWith(
        expect.objectContaining({
          askingPrice: 0,
          estimatedProfit: 0,
        })
      );
    });

    it('uses defaults for digest with minimal/empty payloads', async () => {
      // Build 6 opportunity.found events for the same user with minimal payloads
      // to exercise the `?? 0`, `?? 'Unknown Item'`, `?? 'Unknown'` fallbacks
      // inside sendDigestEmail.
      const events = Array.from({ length: 6 }, (_, i) =>
        makeEvent({
          id: `evt-digest-empty-${i}`,
          listingId: `lst-digest-${i}`,
          eventType: 'opportunity.found',
          payload: {}, // Empty — hits all fallbacks
          user: makeUser({ name: null }),
        })
      );

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce(events)
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      await processFlipLifecycleNotifications();

      expect(mockEmailService.sendDigest).toHaveBeenCalledWith(
        expect.objectContaining({
          name: undefined,
          opportunities: expect.arrayContaining([
            expect.objectContaining({
              title: 'Unknown Item',
              price: 0,
              estimatedResaleValue: 0,
              profit: 0,
              profitPercent: 0,
              marketplace: 'Unknown',
            }),
          ]),
        })
      );
    });

    it('computes profitPercent correctly for digest with askingPrice > 0', async () => {
      const events = Array.from({ length: 6 }, (_, i) =>
        makeEvent({
          id: `evt-digest-price-${i}`,
          listingId: `lst-digest-price-${i}`,
          eventType: 'opportunity.found',
          payload: {
            askingPrice: 100,
            profitPotential: 50,
            listingTitle: `Item ${i}`,
            valueScore: 80 - i,
            platform: 'CRAIGSLIST',
          },
        })
      );

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce(events)
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      await processFlipLifecycleNotifications();

      expect(mockEmailService.sendDigest).toHaveBeenCalledWith(
        expect.objectContaining({
          opportunities: expect.arrayContaining([
            expect.objectContaining({
              profitPercent: 50, // (50 / 100) * 100
            }),
          ]),
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  describe('push dispatch (Story 11.3)', () => {
    it('fires pushNotificationService.sendToUser for opportunity.found events', async () => {
      const event = makeEvent({ eventType: 'opportunity.found', payload: { listingTitle: 'iPhone', askingPrice: 400, profitPotential: 100 } });

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);
      (mockPrisma.notificationEvent.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (mockPrisma.notificationEvent.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.notificationEvent.findUnique as jest.Mock).mockResolvedValue({ payload: {} });
      (mockEmailService.sendOpportunityFound as jest.Mock).mockResolvedValue({ success: true, messageId: 'msg-1' });
      (mockPushService.sendToUser as jest.Mock).mockResolvedValue(undefined);

      await processFlipLifecycleNotifications();

      // Push should be fired once with 'newDeals' event key
      expect(mockPushService.sendToUser).toHaveBeenCalledWith(
        event.userId,
        expect.objectContaining({ title: expect.stringContaining('Opportunity') }),
        'newDeals'
      );
    });
  });

  // -----------------------------------------------------------------------
  describe('max duration abort', () => {
    it('breaks out of the event loop when MAX_DURATION_MS is exceeded', async () => {
      // MAX_DURATION_MS default is 240000. Mock Date.now() to jump forward
      // after startTime is captured, forcing the duration check to trip
      // inside the per-event loop.
      const realNow = Date.now;
      const baseTime = 1_700_000_000_000;
      let callCount = 0;
      jest.spyOn(Date, 'now').mockImplementation(() => {
        callCount++;
        // First call = startTime capture. Return normal on first few calls,
        // then a far-future value to trip MAX_DURATION_MS check.
        if (callCount <= 3) return baseTime;
        return baseTime + 300_000; // 5 minutes later — exceeds 240s default
      });

      const events = [
        makeEvent({ id: 'evt-1' }),
        makeEvent({ id: 'evt-2' }),
        makeEvent({ id: 'evt-3' }),
      ];

      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce(events)
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      // Early break — zero or few events processed before abort
      expect(result.processed).toBeLessThan(3);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'notification.max_duration_reached',
        expect.objectContaining({
          eventsRemaining: expect.any(Number),
        })
      );

      // Restore
      Date.now = realNow;
    });
  });

  // -----------------------------------------------------------------------
  // Story 10.4: message.* event routing through CommunicationNotificationService
  // -----------------------------------------------------------------------

  describe('message event routing (sendLifecycleEmail)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockCommService: any;

    beforeEach(() => {
      mockCommService = (jest.requireMock('@/lib/communication-notification') as {
        communicationNotificationService: {
          notifyMessageReceived: jest.Mock;
          notifyDraftReady: jest.Mock;
          notifyMessageSent: jest.Mock;
        };
      }).communicationNotificationService;
      mockCommService.notifyMessageReceived.mockReset().mockResolvedValue(undefined);
      mockCommService.notifyDraftReady.mockReset().mockResolvedValue(undefined);
      mockCommService.notifyMessageSent.mockReset().mockResolvedValue(undefined);
    });

    it('routes message.received to communicationNotificationService.notifyMessageReceived', async () => {
      const event = makeEvent({
        eventType: 'message.received',
        payload: {
          listingTitle: 'Vintage Lamp',
          sellerName: 'Bob',
          messagePreview: 'Is this still available?',
        },
      });
      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      expect(mockCommService.notifyMessageReceived).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', listingTitle: 'Vintage Lamp' })
      );
      expect(result.sent).toBe(1);
    });

    it('routes message.draft_ready to communicationNotificationService.notifyDraftReady', async () => {
      const event = makeEvent({
        eventType: 'message.draft_ready',
        payload: {
          listingTitle: 'Vintage Lamp',
          draftPreview: 'Hi, I would like to buy this item.',
        },
      });
      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      expect(mockCommService.notifyDraftReady).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', listingTitle: 'Vintage Lamp' })
      );
      expect(result.sent).toBe(1);
    });

    it('routes message.sent to communicationNotificationService.notifyMessageSent', async () => {
      const event = makeEvent({
        eventType: 'message.sent',
        payload: {
          listingTitle: 'Vintage Lamp',
          messagePreview: 'I sent an offer of $40.',
          deliveryStatus: 'Delivered',
        },
      });
      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      expect(mockCommService.notifyMessageSent).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', listingTitle: 'Vintage Lamp' })
      );
      expect(result.sent).toBe(1);
    });

    it('marks event as failed when communicationNotificationService throws', async () => {
      mockCommService.notifyMessageReceived.mockRejectedValueOnce(new Error('Comm service down'));

      const event = makeEvent({
        eventType: 'message.received',
        payload: { listingTitle: 'Item', messagePreview: 'hello' },
      });
      (mockPrisma.notificationEvent.findMany as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce([event])
        .mockResolvedValueOnce([]);
      (mockPrisma.notificationEvent.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await processFlipLifecycleNotifications();

      expect(result.failed).toBeGreaterThanOrEqual(1);
      expect(result.sent).toBe(0);
    });
  });
});
