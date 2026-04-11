/**
 * @file src/__tests__/lib/notification-events.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.0
 * @brief Unit tests for notification-events service.
 */

import {
  createNotificationEvent,
  createFlipNotificationEvent,
  createMessageNotificationEvent,
  emitOpportunityFoundEvent,
  buildDeduplicationKey,
  NotificationEventType,
  type NotificationEventInput,
} from '@/lib/notification-events';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db', () => ({
  prisma: {
    $transaction: jest.fn(),
    notificationEvent: {
      create: jest.fn(),
    },
  },
  default: {
    $transaction: jest.fn(),
    notificationEvent: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const makeTx = (overrides: Partial<{ create: jest.Mock }> = {}) => ({
  notificationEvent: {
    create: overrides.create ?? jest.fn().mockResolvedValue({}),
  },
  listing: { update: jest.fn() },
});

const baseInput: NotificationEventInput = {
  userId: 'user-1',
  listingId: 'listing-1',
  eventType: NotificationEventType.LISTING_SOLD,
  payload: {
    eventType: NotificationEventType.LISTING_SOLD,
    listingTitle: 'Test Item',
    listingUrl: 'https://craigslist.org/test',
    platform: 'CRAIGSLIST',
  },
};

describe('notification-events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildDeduplicationKey()', () => {
    it('builds key in format listingId:eventType:hourBucket', () => {
      const now = new Date('2026-04-08T15:45:00Z');
      const key = buildDeduplicationKey('listing-1', NotificationEventType.LISTING_SOLD, now);
      // Hour bucket should be truncated to the start of the hour
      expect(key).toBe('listing-1:listing.sold:2026-04-08T15:00:00.000Z');
    });

    it('produces identical keys for two events within the same hour', () => {
      const t1 = new Date('2026-04-08T10:05:00Z');
      const t2 = new Date('2026-04-08T10:59:59Z');
      const k1 = buildDeduplicationKey('listing-2', NotificationEventType.LISTING_PRICE_CHANGED, t1);
      const k2 = buildDeduplicationKey('listing-2', NotificationEventType.LISTING_PRICE_CHANGED, t2);
      expect(k1).toBe(k2);
    });

    it('produces different keys for events in different hours', () => {
      const t1 = new Date('2026-04-08T10:59:00Z');
      const t2 = new Date('2026-04-08T11:00:00Z');
      const k1 = buildDeduplicationKey('listing-3', NotificationEventType.LISTING_SOLD, t1);
      const k2 = buildDeduplicationKey('listing-3', NotificationEventType.LISTING_SOLD, t2);
      expect(k1).not.toBe(k2);
    });
  });

  describe('createNotificationEvent()', () => {
    it('calls tx.notificationEvent.create with correct data', async () => {
      const createMock = jest.fn().mockResolvedValue({});
      const tx = makeTx({ create: createMock });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await createNotificationEvent(tx as any, baseInput);

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            listingId: 'listing-1',
            eventType: 'listing.sold',
            status: 'PENDING',
            deduplicationKey: expect.stringContaining('listing-1:listing.sold:'),
          }),
        })
      );
    });

    it('silently skips on P2002 unique constraint violation (deduplication)', async () => {
      const p2002 = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      const createMock = jest.fn().mockRejectedValue(p2002);
      const tx = makeTx({ create: createMock });

      // Should not throw
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(createNotificationEvent(tx as any, baseInput)).resolves.toBeUndefined();

      const { logger } = jest.requireMock('@/lib/logger') as { logger: { debug: jest.Mock } };
      expect(logger.debug).toHaveBeenCalledWith(
        'Notification event deduplicated — skipping',
        expect.any(Object)
      );
    });

    it('rethrows non-P2002 errors', async () => {
      const dbError = new Error('Connection lost');
      const createMock = jest.fn().mockRejectedValue(dbError);
      const tx = makeTx({ create: createMock });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(createNotificationEvent(tx as any, baseInput)).rejects.toThrow('Connection lost');
    });

    it('includes price change values in payload for LISTING_PRICE_CHANGED events', async () => {
      const createMock = jest.fn().mockResolvedValue({});
      const tx = makeTx({ create: createMock });

      const priceChangeInput: NotificationEventInput = {
        ...baseInput,
        eventType: NotificationEventType.LISTING_PRICE_CHANGED,
        payload: {
          eventType: NotificationEventType.LISTING_PRICE_CHANGED,
          listingTitle: 'Test Item',
          listingUrl: 'https://craigslist.org/test',
          platform: 'CRAIGSLIST',
          oldPrice: 100,
          newPrice: 75,
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await createNotificationEvent(tx as any, priceChangeInput);

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'listing.price_changed',
          }),
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // Standalone flip event creation — Story 10.3
  // -------------------------------------------------------------------------

  describe('createFlipNotificationEvent()', () => {
    // The module's `import { prisma } from '@/lib/db'` resolves to the
    // mocked named export at the top of this file. We grab a handle to
    // the mocked create() so we can assert against it and queue behaviors.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getMockedCreate = (): jest.Mock => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = jest.requireMock('@/lib/db') as {
        prisma: { notificationEvent: { create: jest.Mock } };
      };
      return mod.prisma.notificationEvent.create;
    };

    beforeEach(() => {
      const create = getMockedCreate();
      create.mockReset();
      create.mockResolvedValue({});
    });

    it('creates event with global prisma.notificationEvent.create', async () => {
      const create = getMockedCreate();

      await createFlipNotificationEvent({
        userId: 'user-42',
        listingId: 'listing-42',
        eventType: NotificationEventType.FLIP_PURCHASED,
        payload: {
          listingTitle: 'Vintage Lamp',
          purchasePrice: 50,
          estimatedProfit: 70,
          platform: 'CRAIGSLIST',
        },
      });

      expect(create).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-42',
            listingId: 'listing-42',
            eventType: 'flip.purchased',
            status: 'PENDING',
          }),
        })
      );
    });

    it('uses FLIP_PURCHASED event type correctly', async () => {
      const create = getMockedCreate();

      await createFlipNotificationEvent({
        userId: 'user-1',
        listingId: 'listing-1',
        eventType: NotificationEventType.FLIP_PURCHASED,
        payload: { listingTitle: 'Test Item' },
      });

      const call = create.mock.calls[0][0] as {
        data: { eventType: string };
      };
      expect(call.data.eventType).toBe('flip.purchased');
    });

    it('builds deduplication key from listingId when present', async () => {
      const create = getMockedCreate();

      await createFlipNotificationEvent({
        userId: 'user-7',
        listingId: 'listing-7',
        eventType: NotificationEventType.OPPORTUNITY_FOUND,
        payload: { listingTitle: 'Test' },
      });

      const call = create.mock.calls[0][0] as {
        data: { deduplicationKey: string };
      };
      expect(call.data.deduplicationKey).toMatch(/^listing-7:opportunity\.found:/);
    });

    it('builds deduplication key from userId when listingId is undefined', async () => {
      const create = getMockedCreate();

      await createFlipNotificationEvent({
        userId: 'user-9',
        eventType: NotificationEventType.FLIP_LISTED,
        payload: { listingTitle: 'Test' },
      });

      const call = create.mock.calls[0][0] as {
        data: { deduplicationKey: string };
      };
      expect(call.data.deduplicationKey).toMatch(/^user-9:flip\.listed:/);
    });

    it('builds deduplication key from userId when listingId is null', async () => {
      const create = getMockedCreate();

      await createFlipNotificationEvent({
        userId: 'user-null',
        listingId: null,
        eventType: NotificationEventType.FLIP_SOLD,
        payload: { listingTitle: 'Test' },
      });

      const call = create.mock.calls[0][0] as {
        data: { deduplicationKey: string };
      };
      expect(call.data.deduplicationKey).toMatch(/^user-null:flip\.sold:/);
    });

    it('silently skips P2002 duplicate errors', async () => {
      const create = getMockedCreate();
      const p2002 = Object.assign(new Error('Unique constraint'), {
        code: 'P2002',
      });
      create.mockRejectedValueOnce(p2002);

      await expect(
        createFlipNotificationEvent({
          userId: 'user-dup',
          listingId: 'listing-dup',
          eventType: NotificationEventType.OPPORTUNITY_FOUND,
          payload: { listingTitle: 'Dup' },
        })
      ).resolves.toBeUndefined();

      const { logger } = jest.requireMock('@/lib/logger') as {
        logger: { debug: jest.Mock };
      };
      expect(logger.debug).toHaveBeenCalledWith(
        'Flip notification event deduplicated — skipping',
        expect.objectContaining({
          userId: 'user-dup',
          eventType: 'opportunity.found',
        })
      );
    });

    it('rethrows non-P2002 errors', async () => {
      const create = getMockedCreate();
      create.mockRejectedValueOnce(new Error('Database connection lost'));

      await expect(
        createFlipNotificationEvent({
          userId: 'user-err',
          listingId: 'listing-err',
          eventType: NotificationEventType.FLIP_PURCHASED,
          payload: { listingTitle: 'Err' },
        })
      ).rejects.toThrow('Database connection lost');
    });

    it('passes userId, listingId, payload, and status=PENDING through to prisma.create', async () => {
      const create = getMockedCreate();

      await createFlipNotificationEvent({
        userId: 'user-full',
        listingId: 'listing-full',
        eventType: NotificationEventType.FLIP_SOLD,
        payload: {
          listingTitle: 'Final Item',
          salePrice: 200,
          actualProfit: 150,
          roiPercent: 300,
        },
      });

      const call = create.mock.calls[0][0] as {
        data: {
          userId: string;
          listingId: string;
          status: string;
          payload: Record<string, unknown>;
        };
      };
      expect(call.data.userId).toBe('user-full');
      expect(call.data.listingId).toBe('listing-full');
      expect(call.data.status).toBe('PENDING');
      expect(call.data.payload).toEqual(
        expect.objectContaining({
          listingTitle: 'Final Item',
          salePrice: 200,
          actualProfit: 150,
          roiPercent: 300,
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // Shared scraper helper — Story 10.3
  // -------------------------------------------------------------------------

  describe('emitOpportunityFoundEvent()', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getMockedCreate = (): jest.Mock => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = jest.requireMock('@/lib/db') as {
        prisma: { notificationEvent: { create: jest.Mock } };
      };
      return mod.prisma.notificationEvent.create;
    };

    beforeEach(() => {
      const create = getMockedCreate();
      create.mockReset();
      create.mockResolvedValue({});
    });

    it('calls createFlipNotificationEvent with OPPORTUNITY_FOUND event type', async () => {
      const create = getMockedCreate();

      await emitOpportunityFoundEvent(
        {
          id: 'listing-opp-1',
          title: 'Nintendo Switch',
          price: 100,
          estimatedValue: 250,
          profitPotential: 120,
          valueScore: 85,
          platform: 'CRAIGSLIST',
          imageUrls: 'https://img.example.com/1.jpg',
        },
        'user-opp-1'
      );

      expect(create).toHaveBeenCalledTimes(1);
      const call = create.mock.calls[0][0] as {
        data: { eventType: string; userId: string; listingId: string };
      };
      expect(call.data.eventType).toBe('opportunity.found');
      expect(call.data.userId).toBe('user-opp-1');
      expect(call.data.listingId).toBe('listing-opp-1');
    });

    it('labels valueScore >= 80 as Excellent', async () => {
      const create = getMockedCreate();

      await emitOpportunityFoundEvent(
        {
          id: 'l-80',
          title: 'Excellent',
          price: 50,
          estimatedValue: 200,
          profitPotential: 130,
          valueScore: 80,
          platform: 'EBAY',
          imageUrls: null,
        },
        'u1'
      );

      const payload = (create.mock.calls[0][0] as { data: { payload: { flippabilityLabel: string } } })
        .data.payload;
      expect(payload.flippabilityLabel).toBe('Excellent');
    });

    it('labels valueScore 70-79 as Great', async () => {
      const create = getMockedCreate();

      await emitOpportunityFoundEvent(
        {
          id: 'l-70',
          title: 'Great',
          price: 50,
          estimatedValue: 150,
          profitPotential: 80,
          valueScore: 75,
          platform: 'EBAY',
          imageUrls: null,
        },
        'u1'
      );

      const payload = (create.mock.calls[0][0] as { data: { payload: { flippabilityLabel: string } } })
        .data.payload;
      expect(payload.flippabilityLabel).toBe('Great');
    });

    it('labels valueScore 60-69 as Good', async () => {
      const create = getMockedCreate();

      await emitOpportunityFoundEvent(
        {
          id: 'l-60',
          title: 'Good',
          price: 50,
          estimatedValue: 120,
          profitPotential: 55,
          valueScore: 65,
          platform: 'EBAY',
          imageUrls: null,
        },
        'u1'
      );

      const payload = (create.mock.calls[0][0] as { data: { payload: { flippabilityLabel: string } } })
        .data.payload;
      expect(payload.flippabilityLabel).toBe('Good');
    });

    it('labels valueScore < 60 as Fair', async () => {
      const create = getMockedCreate();

      await emitOpportunityFoundEvent(
        {
          id: 'l-50',
          title: 'Fair',
          price: 50,
          estimatedValue: 90,
          profitPotential: 30,
          valueScore: 50,
          platform: 'EBAY',
          imageUrls: null,
        },
        'u1'
      );

      const payload = (create.mock.calls[0][0] as { data: { payload: { flippabilityLabel: string } } })
        .data.payload;
      expect(payload.flippabilityLabel).toBe('Fair');
    });

    it('extracts first image from comma-separated imageUrls', async () => {
      const create = getMockedCreate();

      await emitOpportunityFoundEvent(
        {
          id: 'l-imgs',
          title: 'With Images',
          price: 50,
          estimatedValue: 120,
          profitPotential: 60,
          valueScore: 72,
          platform: 'CRAIGSLIST',
          imageUrls: 'https://img.example.com/first.jpg, https://img.example.com/second.jpg',
        },
        'u1'
      );

      const payload = (create.mock.calls[0][0] as { data: { payload: { imageUrl: string | null } } })
        .data.payload;
      expect(payload.imageUrl).toBe('https://img.example.com/first.jpg');
    });

    it('handles null imageUrls', async () => {
      const create = getMockedCreate();

      await emitOpportunityFoundEvent(
        {
          id: 'l-noimg',
          title: 'No Image',
          price: 50,
          estimatedValue: 120,
          profitPotential: 60,
          valueScore: 72,
          platform: 'CRAIGSLIST',
          imageUrls: null,
        },
        'u1'
      );

      const payload = (create.mock.calls[0][0] as { data: { payload: { imageUrl: string | null } } })
        .data.payload;
      expect(payload.imageUrl).toBeNull();
    });

    it('fills defaults for missing listing fields', async () => {
      const create = getMockedCreate();

      await emitOpportunityFoundEvent(
        {
          id: 'l-defaults',
          // No title, price, estimatedValue, profitPotential, valueScore, platform, imageUrls
        },
        'u1'
      );

      const payload = (create.mock.calls[0][0] as {
        data: {
          payload: {
            platform: string;
            askingPrice: number;
            estimatedValue: number;
            profitPotential: number;
            valueScore: number;
            flippabilityLabel: string;
            listingTitle: string;
            imageUrl: string | null;
          };
        };
      }).data.payload;

      expect(payload.platform).toBe('Unknown');
      expect(payload.askingPrice).toBe(0);
      expect(payload.estimatedValue).toBe(0);
      expect(payload.profitPotential).toBe(0);
      expect(payload.valueScore).toBe(0);
      expect(payload.flippabilityLabel).toBe('Fair'); // 0 → Fair
      expect(payload.listingTitle).toBe('Unknown Item');
      expect(payload.imageUrl).toBeNull();
    });

    it('swallows errors via try/catch and logs to logger.error', async () => {
      const create = getMockedCreate();
      create.mockRejectedValueOnce(new Error('Database unavailable'));

      // Should not throw
      await expect(
        emitOpportunityFoundEvent(
          {
            id: 'l-err',
            title: 'Errors',
            price: 100,
            estimatedValue: 200,
            profitPotential: 80,
            valueScore: 82,
            platform: 'CRAIGSLIST',
            imageUrls: 'https://img.example.com/x.jpg',
          },
          'user-err-1'
        )
      ).resolves.toBeUndefined();

      const { logger } = jest.requireMock('@/lib/logger') as {
        logger: { error: jest.Mock };
      };
      expect(logger.error).toHaveBeenCalledWith(
        'notification.event.creation_failed',
        expect.objectContaining({
          userId: 'user-err-1',
          listingId: 'l-err',
          eventType: 'opportunity.found',
          error: 'Database unavailable',
        })
      );
    });

    it('passes through valueScore to the payload', async () => {
      const create = getMockedCreate();

      await emitOpportunityFoundEvent(
        {
          id: 'l-score',
          title: 'Scored',
          price: 50,
          estimatedValue: 150,
          profitPotential: 80,
          valueScore: 88,
          platform: 'EBAY',
          imageUrls: null,
        },
        'u1'
      );

      const payload = (create.mock.calls[0][0] as { data: { payload: { valueScore: number } } })
        .data.payload;
      expect(payload.valueScore).toBe(88);
    });

    it('covers String(err) branch when catch receives a non-Error thrown value', async () => {
      // The catch at line 294 has `err instanceof Error ? err.message : String(err)`.
      // The previous test only throws an Error instance (covering the .message branch).
      // Here we throw a plain string to cover the String(err) fallback branch.
      const create = getMockedCreate();
      // Reject with a non-Error value so the `String(err)` branch is taken.
      create.mockRejectedValueOnce('raw string error');

      await expect(
        emitOpportunityFoundEvent(
          { id: 'l-str-err', title: 'String Error', price: 10, platform: 'CRAIGSLIST', imageUrls: null },
          'user-str-err'
        )
      ).resolves.toBeUndefined();

      const { logger } = jest.requireMock('@/lib/logger') as { logger: { error: jest.Mock } };
      expect(logger.error).toHaveBeenCalledWith(
        'notification.event.creation_failed',
        expect.objectContaining({ error: 'raw string error' })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // createMessageNotificationEvent() — Story 10.4
  // ---------------------------------------------------------------------------

  describe('createMessageNotificationEvent()', () => {
    const getMockedCreate = (): jest.Mock => {
      const mod = jest.requireMock('@/lib/db') as {
        prisma: { notificationEvent: { create: jest.Mock } };
      };
      return mod.prisma.notificationEvent.create;
    };

    beforeEach(() => {
      const create = getMockedCreate();
      create.mockReset();
      create.mockResolvedValue({});
    });

    it('creates a message.received event with correct fields', async () => {
      const create = getMockedCreate();

      await createMessageNotificationEvent({
        userId: 'user-m1',
        listingId: 'listing-m1',
        eventType: NotificationEventType.MESSAGE_RECEIVED,
        payload: { listingTitle: 'iPhone', sellerName: 'Bob', messagePreview: 'Is it available?' },
      });

      expect(create).toHaveBeenCalledTimes(1);
      const call = create.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(call.data.userId).toBe('user-m1');
      expect(call.data.listingId).toBe('listing-m1');
      expect(call.data.eventType).toBe('message.received');
      expect(call.data.status).toBe('PENDING');
    });

    it('creates a message.draft_ready event', async () => {
      const create = getMockedCreate();

      await createMessageNotificationEvent({
        userId: 'user-m2',
        listingId: 'listing-m2',
        eventType: NotificationEventType.MESSAGE_DRAFT_READY,
        payload: { listingTitle: 'MacBook', draftPreview: 'Hi, would you take $800?' },
      });

      const call = create.mock.calls[0][0] as { data: { eventType: string } };
      expect(call.data.eventType).toBe('message.draft_ready');
    });

    it('creates a message.sent event', async () => {
      const create = getMockedCreate();

      await createMessageNotificationEvent({
        userId: 'user-m3',
        listingId: 'listing-m3',
        eventType: NotificationEventType.MESSAGE_SENT,
        payload: { listingTitle: 'iPad', deliveryStatus: 'Delivered' },
      });

      const call = create.mock.calls[0][0] as { data: { eventType: string } };
      expect(call.data.eventType).toBe('message.sent');
    });

    it('builds deduplication key from listingId when present', async () => {
      const create = getMockedCreate();

      await createMessageNotificationEvent({
        userId: 'user-m4',
        listingId: 'listing-m4',
        eventType: NotificationEventType.MESSAGE_RECEIVED,
        payload: {},
      });

      const call = create.mock.calls[0][0] as { data: { deduplicationKey: string } };
      expect(call.data.deduplicationKey).toMatch(/^listing-m4:message\.received:/);
    });

    it('builds deduplication key from userId when listingId is null', async () => {
      const create = getMockedCreate();

      await createMessageNotificationEvent({
        userId: 'user-m5',
        listingId: null,
        eventType: NotificationEventType.MESSAGE_DRAFT_READY,
        payload: {},
      });

      const call = create.mock.calls[0][0] as { data: { deduplicationKey: string } };
      expect(call.data.deduplicationKey).toMatch(/^user-m5:message\.draft_ready:/);
    });

    it('silently skips P2002 duplicate errors', async () => {
      const create = getMockedCreate();
      create.mockRejectedValueOnce({ code: 'P2002' });

      await expect(createMessageNotificationEvent({
        userId: 'user-m6',
        listingId: 'listing-m6',
        eventType: NotificationEventType.MESSAGE_SENT,
        payload: {},
      })).resolves.toBeUndefined();
    });

    it('rethrows non-P2002 errors', async () => {
      const create = getMockedCreate();
      create.mockRejectedValueOnce(new Error('DB connection lost'));

      await expect(createMessageNotificationEvent({
        userId: 'user-m7',
        listingId: 'listing-m7',
        eventType: NotificationEventType.MESSAGE_RECEIVED,
        payload: {},
      })).rejects.toThrow('DB connection lost');
    });
  });
});
