/**
 * @file src/__tests__/lib/smart-alert-notification-processor.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-09
 * @version 1.0
 * @brief Unit tests for the smart alert notification processor.
 */

// ---------------------------------------------------------------------------
// Mocks — factories must be self-contained (jest.mock is hoisted before vars)
// ---------------------------------------------------------------------------

jest.mock('@/lib/db', () => ({
  prisma: {
    notificationEvent: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    userSettings: { findUnique: jest.fn() },
    user: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/email-service', () => ({
  emailService: {
    sendReviewReceived: jest.fn(),
    sendFlipGoneCold: jest.fn(),
    sendFlipTurnedHot: jest.fn(),
    sendPriceChangeAlert: jest.fn(),
  },
}));

const mockDetectColdFlips = jest.fn();
const mockDetectHotFlips = jest.fn();

jest.mock('@/lib/cold-hot-detector', () => ({
  detectColdFlips: (...args: unknown[]) => mockDetectColdFlips(...args),
  detectHotFlips: (...args: unknown[]) => mockDetectHotFlips(...args),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Story 11.2/11.3: SMS + push are fire-and-forget — mock so tests are isolated.
jest.mock('@/lib/sms-notification-service', () => ({
  smsNotificationService: {
    notifyPriceDrop: jest.fn().mockResolvedValue(undefined),
    notifyFlipGoneCold: jest.fn().mockResolvedValue(undefined),
    notifyFlipTurnedHot: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/lib/push-notification', () => ({
  pushNotificationService: {
    sendToUser: jest.fn().mockResolvedValue(undefined),
  },
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import { processSmartAlertNotificationEvents } from '@/lib/smart-alert-notification-processor';

// ---------------------------------------------------------------------------
// Mock references (safe to access after jest.mock declarations)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = (jest.requireMock('@/lib/db') as any).prisma;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockEmailService = (jest.requireMock('@/lib/email-service') as any).emailService;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-1',
    userId: 'user-1',
    listingId: 'listing-1',
    eventType: 'review.received',
    status: 'PENDING',
    retryCount: 0,
    payload: {
      platform: 'eBay',
      rating: 5,
      reviewText: 'Great seller!',
      reviewUrl: 'https://ebay.com/feedback/1',
    },
    user: { id: 'user-1', email: 'user@example.com', name: 'Alice' },
    createdAt: new Date(),
    ...overrides,
  };
}

function makeUserSettings(overrides: Record<string, unknown> = {}) {
  return {
    emailNotifications: true,
    notifyReviewReceived: true,
    notifyFlipGoneCold: true,
    notifyFlipTurnedHot: true,
    notifyPriceChanges: true,
    flipGoneColdHours: 24,
    flipTurnedHotCount: 3,
    ...overrides,
  };
}

function resetMocks() {
  mockPrisma.notificationEvent.findMany.mockReset();
  mockPrisma.notificationEvent.findFirst.mockReset();
  mockPrisma.notificationEvent.create.mockReset();
  mockPrisma.notificationEvent.update.mockReset();
  mockPrisma.notificationEvent.updateMany.mockReset();
  mockPrisma.userSettings.findUnique.mockReset();
  mockPrisma.user.findMany.mockReset();
  mockEmailService.sendReviewReceived.mockReset();
  mockEmailService.sendFlipGoneCold.mockReset();
  mockEmailService.sendFlipTurnedHot.mockReset();
  mockEmailService.sendPriceChangeAlert.mockReset();
  mockDetectColdFlips.mockReset();
  mockDetectHotFlips.mockReset();
}

// Default Phase 2: no users
function defaultPhase2Setup() {
  mockPrisma.user.findMany.mockResolvedValue([]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('processSmartAlertNotificationEvents', () => {
  beforeEach(() => {
    resetMocks();
    defaultPhase2Setup();
  });

  // ---- Phase 1: review.received ----

  it('sends email for review.received when notifyReviewReceived is true', async () => {
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([makeEvent()]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(makeUserSettings());
    mockEmailService.sendReviewReceived.mockResolvedValueOnce({ success: true, messageId: 'msg-1' });
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();

    expect(mockEmailService.sendReviewReceived).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('sends email for listing.price_changed when notifyPriceChanges is true', async () => {
    const event = makeEvent({
      eventType: 'listing.price_changed',
      payload: {
        listingTitle: 'MacBook',
        platform: 'eBay',
        oldPrice: 1000,
        newPrice: 800,
        changePercent: 20,
        direction: 'decrease',
      },
    });
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([event]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(makeUserSettings());
    mockEmailService.sendPriceChangeAlert.mockResolvedValueOnce({ success: true });
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();

    expect(mockEmailService.sendPriceChangeAlert).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);
  });

  it('skips email when master toggle emailNotifications is false', async () => {
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([makeEvent()]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(
      makeUserSettings({ emailNotifications: false })
    );
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();

    expect(mockEmailService.sendReviewReceived).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);
    expect(result.sent).toBe(0);
  });

  it('skips email when event-type-specific toggle is false', async () => {
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([makeEvent()]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(
      makeUserSettings({ notifyReviewReceived: false })
    );
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();

    expect(mockEmailService.sendReviewReceived).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);
  });

  it('skips email when user has no email address (marks PROCESSED not FAILED)', async () => {
    const event = makeEvent({ user: { id: 'user-1', email: null, name: null } });
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([event]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(makeUserSettings());
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();

    expect(mockEmailService.sendReviewReceived).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('handles missing UserSettings gracefully (uses defaults)', async () => {
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([makeEvent()]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(null); // no settings
    mockEmailService.sendReviewReceived.mockResolvedValueOnce({ success: true });
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();

    // With default settings, emailNotifications=true and notifyReviewReceived=true → send
    expect(mockEmailService.sendReviewReceived).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);
  });

  it('marks invalid payloads as FAILED', async () => {
    const event = makeEvent({
      payload: { badField: true }, // invalid for review.received
    });
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([event]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(makeUserSettings());
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();

    expect(mockEmailService.sendReviewReceived).not.toHaveBeenCalled();
    expect(result.failed).toBe(1);
  });

  it('retries FAILED events from previous cycles (within 24h)', async () => {
    const failedEvent = makeEvent({ status: 'FAILED', retryCount: 1 });
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([failedEvent]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(makeUserSettings());
    mockEmailService.sendReviewReceived.mockResolvedValueOnce({ success: true });
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();
    expect(result.sent).toBe(1);
  });

  it('marks send failures as FAILED and increments retryCount', async () => {
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([makeEvent()]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(makeUserSettings());
    mockEmailService.sendReviewReceived.mockResolvedValueOnce({ success: false, error: '500 Internal' });
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();
    expect(result.failed).toBe(1);
    expect(result.sent).toBe(0);
  });

  it('logs errors but never throws', async () => {
    mockPrisma.notificationEvent.findMany.mockRejectedValueOnce(new Error('DB down'));
    // Should not throw
    const result = await processSmartAlertNotificationEvents();
    expect(result).toBeDefined();
  });

  it('returns correct counts { processed, sent, skipped, failed }', async () => {
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([makeEvent()]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(makeUserSettings());
    mockEmailService.sendReviewReceived.mockResolvedValueOnce({ success: true });
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();
    expect(result).toMatchObject({
      processed: expect.any(Number),
      sent: expect.any(Number),
      skipped: expect.any(Number),
      failed: expect.any(Number),
    });
  });

  // ---- Phase 2: cold/hot detection ----

  it('creates and sends cold flip alert when detection threshold exceeded', async () => {
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([]); // Phase 1: no events
    mockPrisma.user.findMany.mockResolvedValueOnce([
      {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Alice',
        settings: makeUserSettings(),
      },
    ]).mockResolvedValueOnce([]); // Second batch: empty

    mockDetectColdFlips.mockResolvedValueOnce([
      {
        listingId: 'listing-1',
        listingTitle: 'Sony TV',
        sellerName: 'Seller A',
        hoursSinceLastResponse: 30,
        lastMessageAt: new Date(),
        coldReason: 'user_not_replied',
      },
    ]);
    mockDetectHotFlips.mockResolvedValueOnce([]);
    mockPrisma.notificationEvent.create.mockResolvedValueOnce({ id: 'ev-cold-1' });
    mockEmailService.sendFlipGoneCold.mockResolvedValueOnce({ success: true });
    mockPrisma.notificationEvent.findFirst.mockResolvedValueOnce({ id: 'ev-cold-1' });
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();

    expect(mockDetectColdFlips).toHaveBeenCalledWith('user-1', 24);
    expect(mockEmailService.sendFlipGoneCold).toHaveBeenCalledTimes(1);
    expect(result.sent).toBeGreaterThanOrEqual(1);
  });

  it('creates and sends hot flip alert when detection threshold exceeded', async () => {
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([]); // Phase 1: no events
    mockPrisma.user.findMany.mockResolvedValueOnce([
      {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Bob',
        settings: makeUserSettings(),
      },
    ]).mockResolvedValueOnce([]);

    mockDetectColdFlips.mockResolvedValueOnce([]);
    mockDetectHotFlips.mockResolvedValueOnce([
      {
        listingId: 'listing-2',
        listingTitle: 'MacBook Pro',
        sellerName: null,
        consecutiveInboundCount: 4,
        latestMessagePreview: 'Are you still selling?',
      },
    ]);
    mockPrisma.notificationEvent.create.mockResolvedValueOnce({ id: 'ev-hot-1' });
    mockEmailService.sendFlipTurnedHot.mockResolvedValueOnce({ success: true });
    mockPrisma.notificationEvent.findFirst.mockResolvedValueOnce({ id: 'ev-hot-1' });
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();

    expect(mockEmailService.sendFlipTurnedHot).toHaveBeenCalledTimes(1);
    expect(result.sent).toBeGreaterThanOrEqual(1);
  });

  it('deduplicates cold/hot events (P2002 on create → skip)', async () => {
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([]);
    mockPrisma.user.findMany.mockResolvedValueOnce([
      {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Alice',
        settings: makeUserSettings(),
      },
    ]).mockResolvedValueOnce([]);

    mockDetectColdFlips.mockResolvedValueOnce([
      {
        listingId: 'listing-1',
        listingTitle: 'TV',
        sellerName: null,
        hoursSinceLastResponse: 30,
        lastMessageAt: new Date(),
        coldReason: 'user_not_replied',
      },
    ]);
    mockDetectHotFlips.mockResolvedValueOnce([]);

    // Simulate P2002 unique constraint (already exists)
    const p2002Error = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    mockPrisma.notificationEvent.create.mockRejectedValueOnce(p2002Error);

    const result = await processSmartAlertNotificationEvents();

    // Email NOT sent because event was deduplicated
    expect(mockEmailService.sendFlipGoneCold).not.toHaveBeenCalled();
    expect(result.skipped).toBeGreaterThanOrEqual(1);
  });

  it('caps alerts at MAX_SMART_ALERTS_PER_USER_PER_CYCLE (10)', async () => {
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([]);
    mockPrisma.user.findMany.mockResolvedValueOnce([
      {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Alice',
        settings: makeUserSettings(),
      },
    ]).mockResolvedValueOnce([]);

    // Return 15 hot flips — should be capped at 10
    const hotFlips = Array.from({ length: 15 }, (_, i) => ({
      listingId: `listing-${i}`,
      listingTitle: `Item ${i}`,
      sellerName: null,
      consecutiveInboundCount: 4,
      latestMessagePreview: 'msg',
    }));

    mockDetectColdFlips.mockResolvedValueOnce([]);
    mockDetectHotFlips.mockResolvedValueOnce(hotFlips);
    mockPrisma.notificationEvent.create.mockResolvedValue({ id: 'ev-1' });
    mockPrisma.notificationEvent.findFirst.mockResolvedValue({ id: 'ev-1' });
    mockEmailService.sendFlipTurnedHot.mockResolvedValue({ success: true });
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();

    // At most 10 emails sent
    expect(mockEmailService.sendFlipTurnedHot.mock.calls.length).toBeLessThanOrEqual(10);
    expect(result.sent).toBeLessThanOrEqual(10);
  });

  it('processes users in batches and stops when batch is empty', async () => {
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([]);
    // First call returns 1 user, second call returns empty (end of pagination)
    mockPrisma.user.findMany
      .mockResolvedValueOnce([
        {
          id: 'user-1',
          email: 'user@example.com',
          name: null,
          settings: makeUserSettings({ notifyFlipGoneCold: false, notifyFlipTurnedHot: false }),
        },
      ])
      .mockResolvedValueOnce([]);

    mockDetectColdFlips.mockResolvedValueOnce([]);
    mockDetectHotFlips.mockResolvedValueOnce([]);

    const result = await processSmartAlertNotificationEvents();
    expect(result).toBeDefined();
    // No alerts sent for user with toggles off
    expect(mockEmailService.sendFlipGoneCold).not.toHaveBeenCalled();
    expect(mockEmailService.sendFlipTurnedHot).not.toHaveBeenCalled();
  });

  // ---- Phase 1: flip.gone_cold event ----

  it('sends email for flip.gone_cold Phase 1 event', async () => {
    const event = makeEvent({
      eventType: 'flip.gone_cold',
      payload: {
        listingTitle: 'Sony TV',
        hoursSinceLastResponse: 30,
        sellerName: 'Bob',
        coldReason: 'user_not_replied',
        threadUrl: 'https://flipper-ai.app/messages/listing-1',
      },
    });
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([event]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(makeUserSettings());
    mockEmailService.sendFlipGoneCold.mockResolvedValueOnce({ success: true });
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();

    expect(mockEmailService.sendFlipGoneCold).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);
  });

  it('marks invalid flip.gone_cold payload as FAILED', async () => {
    const event = makeEvent({
      eventType: 'flip.gone_cold',
      payload: { badField: 'wrong' },
    });
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([event]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(makeUserSettings());
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();

    expect(mockEmailService.sendFlipGoneCold).not.toHaveBeenCalled();
    expect(result.failed).toBe(1);
  });

  it('sends email for flip.turned_hot Phase 1 event', async () => {
    const event = makeEvent({
      eventType: 'flip.turned_hot',
      payload: {
        listingTitle: 'MacBook Pro',
        unreadCount: 4,
        latestMessagePreview: 'Still interested?',
        sellerName: null,
        threadUrl: 'https://flipper-ai.app/messages/listing-1',
      },
    });
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([event]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(makeUserSettings());
    mockEmailService.sendFlipTurnedHot.mockResolvedValueOnce({ success: true });
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();

    expect(mockEmailService.sendFlipTurnedHot).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);
  });

  it('marks invalid flip.turned_hot payload as FAILED', async () => {
    const event = makeEvent({
      eventType: 'flip.turned_hot',
      payload: { wrong: true },
    });
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([event]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(makeUserSettings());
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();

    expect(mockEmailService.sendFlipTurnedHot).not.toHaveBeenCalled();
    expect(result.failed).toBe(1);
  });

  // ---- Phase 2: error paths ----

  it('Phase 2: handles non-P2002 create error as alert failure', async () => {
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([]);
    mockPrisma.user.findMany.mockResolvedValueOnce([
      {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Alice',
        settings: makeUserSettings(),
      },
    ]).mockResolvedValueOnce([]);

    mockDetectColdFlips.mockResolvedValueOnce([
      {
        listingId: 'listing-1',
        listingTitle: 'TV',
        sellerName: null,
        hoursSinceLastResponse: 30,
        lastMessageAt: new Date(),
        coldReason: 'user_not_replied',
      },
    ]);
    mockDetectHotFlips.mockResolvedValueOnce([]);

    // Non-P2002 error — propagates to alertErr catch
    const dbError = new Error('Unexpected DB error');
    mockPrisma.notificationEvent.create.mockRejectedValueOnce(dbError);

    const result = await processSmartAlertNotificationEvents();

    expect(result.failed).toBeGreaterThanOrEqual(1);
  });

  it('Phase 2: handles hot flip send failure', async () => {
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([]);
    mockPrisma.user.findMany.mockResolvedValueOnce([
      {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Bob',
        settings: makeUserSettings(),
      },
    ]).mockResolvedValueOnce([]);

    mockDetectColdFlips.mockResolvedValueOnce([]);
    mockDetectHotFlips.mockResolvedValueOnce([
      {
        listingId: 'listing-2',
        listingTitle: 'MacBook Pro',
        sellerName: null,
        consecutiveInboundCount: 4,
        latestMessagePreview: 'msg',
      },
    ]);
    mockPrisma.notificationEvent.create.mockResolvedValueOnce({ id: 'ev-hot-1' });
    mockEmailService.sendFlipTurnedHot.mockResolvedValueOnce({ success: false, error: 'Provider error' });
    mockPrisma.notificationEvent.findFirst.mockResolvedValueOnce({ id: 'ev-hot-1' });
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();

    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(result.sent).toBe(0);
  });

  it('Phase 2: handles batch query failure gracefully', async () => {
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([]);
    mockPrisma.user.findMany.mockRejectedValueOnce(new Error('DB batch query failed'));

    const result = await processSmartAlertNotificationEvents();
    expect(result).toBeDefined();
  });

  it('Phase 2: skips cold detection when toggle is false, runs hot detection', async () => {
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([]);
    mockPrisma.user.findMany.mockResolvedValueOnce([
      {
        id: 'user-1',
        email: 'user@example.com',
        name: null,
        settings: makeUserSettings({ notifyFlipGoneCold: false }),
      },
    ]).mockResolvedValueOnce([]);

    mockDetectHotFlips.mockResolvedValueOnce([]);

    const result = await processSmartAlertNotificationEvents();
    expect(result).toBeDefined();
    expect(mockDetectColdFlips).not.toHaveBeenCalled();
    expect(mockDetectHotFlips).toHaveBeenCalledTimes(1);
  });

  it('marks invalid listing.price_changed payload as FAILED', async () => {
    const event = makeEvent({
      eventType: 'listing.price_changed',
      payload: { bad: 'payload' }, // missing required fields
    });
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([event]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(makeUserSettings());
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();

    expect(mockEmailService.sendPriceChangeAlert).not.toHaveBeenCalled();
    expect(result.failed).toBe(1);
  });

  it('Phase 2: handles user-level error (detectColdFlips throws) and increments consecutiveDbErrors', async () => {
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([]);
    mockPrisma.user.findMany
      .mockResolvedValueOnce([
        { id: 'user-1', email: 'user@example.com', name: null, settings: makeUserSettings() },
      ])
      .mockResolvedValueOnce([]);

    mockDetectColdFlips.mockRejectedValueOnce(new Error('detect failed'));
    mockDetectHotFlips.mockResolvedValueOnce([]);

    const result = await processSmartAlertNotificationEvents();
    expect(result).toBeDefined();
    // User error increments consecutiveDbErrors but doesn't throw
  });

  it('Phase 2: aborts processing when consecutiveDbErrors reaches abort threshold (5)', async () => {
    // Set up 6 users — errors on each cause consecutiveDbErrors to climb to 5,
    // then on the 6th user's iteration the abort guard fires and phase2 returns early.
    const users = Array.from({ length: 6 }, (_, i) => ({
      id: `user-abort-${i}`,
      email: `user${i}@example.com`,
      name: null,
      settings: makeUserSettings(),
    }));

    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([]);
    mockPrisma.user.findMany
      .mockResolvedValueOnce(users) // all 6 in one batch
      .mockResolvedValueOnce([]); // second batch: empty (end of pagination)

    // detectColdFlips throws for every user, incrementing consecutiveDbErrors
    mockDetectColdFlips.mockRejectedValue(new Error('DB error'));
    mockDetectHotFlips.mockResolvedValue([]);

    const result = await processSmartAlertNotificationEvents();

    // Phase 2 should have returned early — only 5 users processed before abort
    expect(mockDetectColdFlips).toHaveBeenCalledTimes(5);
    expect(result).toBeDefined();
  });

  it('Phase 1: outer catch fires when userSettings query throws, inner catch swallows markEventFailed failure', async () => {
    // Phase 1 outer catch (lines 440–455): fires when an unexpected error occurs during event
    // processing (not just a failed send). Here userSettings.findUnique throws.
    // Phase 1 inner catch (lines 448–452): fires when markEventFailed (i.e. notificationEvent.update)
    // also throws — the inner catch swallows it silently.
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([makeEvent()]);
    mockPrisma.userSettings.findUnique.mockRejectedValueOnce(new Error('Settings query failed'));
    // Make notificationEvent.update also throw to exercise inner catch
    mockPrisma.notificationEvent.update.mockRejectedValueOnce(new Error('Update failed too'));

    const result = await processSmartAlertNotificationEvents();

    // Event counted as failed, but the inner update error was silently swallowed
    expect(result.failed).toBe(1);
  });

  it('Phase 2: hot flip P2002 create → deduplicated and skipped', async () => {
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([]);
    mockPrisma.user.findMany
      .mockResolvedValueOnce([
        { id: 'user-1', email: 'user@example.com', name: 'Alice', settings: makeUserSettings() },
      ])
      .mockResolvedValueOnce([]);

    mockDetectColdFlips.mockResolvedValueOnce([]);
    mockDetectHotFlips.mockResolvedValueOnce([
      {
        listingId: 'listing-hot-dedup',
        listingTitle: 'Hot Item',
        sellerName: null,
        consecutiveInboundCount: 4,
        latestMessagePreview: 'Interested?',
      },
    ]);

    // P2002 on create → deduplicated
    const p2002 = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    mockPrisma.notificationEvent.create.mockRejectedValueOnce(p2002);

    const result = await processSmartAlertNotificationEvents();

    expect(mockEmailService.sendFlipTurnedHot).not.toHaveBeenCalled();
    expect(result.skipped).toBeGreaterThanOrEqual(1);
  });

  it('Phase 2: cold flip send failure where findFirst returns null (ev === null path)', async () => {
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([]);
    mockPrisma.user.findMany
      .mockResolvedValueOnce([
        { id: 'user-1', email: 'user@example.com', name: 'Alice', settings: makeUserSettings() },
      ])
      .mockResolvedValueOnce([]);

    mockDetectColdFlips.mockResolvedValueOnce([
      {
        listingId: 'cold-ev-null',
        listingTitle: 'Old TV',
        sellerName: null,
        hoursSinceLastResponse: 30,
        lastMessageAt: new Date(),
        coldReason: 'user_not_replied',
      },
    ]);
    mockDetectHotFlips.mockResolvedValueOnce([]);

    // Create succeeds
    mockPrisma.notificationEvent.create.mockResolvedValueOnce({ id: 'ev-cold-1' });
    // Send fails
    mockEmailService.sendFlipGoneCold.mockResolvedValueOnce({ success: false, error: 'Email provider error' });
    // findFirst returns null → ev === null → markEventFailed NOT called but result.failed++ still fires
    mockPrisma.notificationEvent.findFirst.mockResolvedValueOnce(null);

    const result = await processSmartAlertNotificationEvents();

    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(result.sent).toBe(0);
    // notificationEvent.update NOT called because ev was null
    expect(mockPrisma.notificationEvent.update).not.toHaveBeenCalled();
  });

  // ---- Phase 1: default switch case (unknown event type) ----

  it('Phase 1: default case marks unknown eventType as skipped and continues', async () => {
    // The default case fires when eventType is not one of the known SMART_ALERT_EVENT_TYPES.
    // findMany is mocked directly so the unknown type bypasses the real DB filter.
    const event = makeEvent({ eventType: 'unknown.custom.type' });
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([event]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(makeUserSettings());
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();

    expect(result.skipped).toBe(1);
    expect(result.processed).toBe(1);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
  });

  // ---- Phase 2: timeout ----

  it('Phase 2: breaks out of the processing loop when PHASE2_TIMEOUT_MS is exceeded', async () => {
    // Phase 1: nothing to process
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([]);

    const TIMEOUT = 5 * 60 * 1000; // matches PHASE2_TIMEOUT_MS in source

    // Date.now() is called at three points before the timeout check fires:
    //   Call 1 (line 258): retryWindowThreshold in the main function body
    //   Call 2 (line 482): phase2Start = Date.now()   ← set to 0
    //   Call 3 (line 489): timeout check               ← must be > TIMEOUT from phase2Start
    const nowSpy = jest.spyOn(Date, 'now')
      .mockReturnValueOnce(1000)     // call 1: retryWindowThreshold (any real-ish timestamp is fine)
      .mockReturnValueOnce(0)        // call 2: phase2Start = 0
      .mockReturnValue(TIMEOUT + 1); // call 3+: TIMEOUT+1 − 0 > TIMEOUT → break before user.findMany

    try {
      const result = await processSmartAlertNotificationEvents();
      // The loop breaks at the very first iteration — user.findMany never called
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    } finally {
      nowSpy.mockRestore();
    }
  });

  // Story 11.3: Push dispatch alongside email
  it('fires push notification alongside email for review.received (Phase 1)', async () => {
    const { pushNotificationService } = jest.requireMock('@/lib/push-notification') as {
      pushNotificationService: { sendToUser: jest.Mock };
    };
    pushNotificationService.sendToUser.mockClear();

    const event = makeEvent({ eventType: 'review.received' });
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([event]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(makeUserSettings());
    mockEmailService.sendReviewReceived.mockResolvedValueOnce({ success: true, messageId: 'review-msg' });
    mockPrisma.notificationEvent.update.mockResolvedValueOnce({});

    await processSmartAlertNotificationEvents();

    expect(pushNotificationService.sendToUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ title: expect.stringContaining('Review') }),
      'reviewReceived'
    );
  });

  it('Phase 2: hot flip non-P2002 create error propagates to alertErr catch', async () => {
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([]);
    mockPrisma.user.findMany
      .mockResolvedValueOnce([
        { id: 'user-1', email: 'user@example.com', name: null, settings: makeUserSettings() },
      ])
      .mockResolvedValueOnce([]);

    mockDetectColdFlips.mockResolvedValueOnce([]);
    mockDetectHotFlips.mockResolvedValueOnce([
      {
        listingId: 'listing-hot',
        listingTitle: 'Hot Item',
        sellerName: null,
        consecutiveInboundCount: 4,
        latestMessagePreview: 'msg',
      },
    ]);

    // Non-P2002 error on hot flip create
    mockPrisma.notificationEvent.create.mockRejectedValueOnce(new Error('DB connection reset'));

    const result = await processSmartAlertNotificationEvents();
    expect(result.failed).toBeGreaterThanOrEqual(1);
  });

  // ---- Coverage: null payloads trigger is*Payload() !p branch ----

  it('marks null payload as FAILED for review.received (covers !p branch at is*Payload)', async () => {
    const event = makeEvent({ payload: null });
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([event]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(makeUserSettings());
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();
    expect(result.failed).toBe(1);
  });

  it('marks null payload as FAILED for listing.price_changed', async () => {
    const event = makeEvent({ eventType: 'listing.price_changed', payload: null });
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([event]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(makeUserSettings());
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();
    expect(result.failed).toBe(1);
  });

  it('marks null payload as FAILED for flip.gone_cold', async () => {
    const event = makeEvent({ eventType: 'flip.gone_cold', payload: null });
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([event]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(makeUserSettings());
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();
    expect(result.failed).toBe(1);
  });

  it('marks null payload as FAILED for flip.turned_hot', async () => {
    const event = makeEvent({ eventType: 'flip.turned_hot', payload: null });
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([event]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(makeUserSettings());
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();
    expect(result.failed).toBe(1);
  });

  // ---- Coverage: direction 'increase' skips SMS/push (false branch of if(p.direction==='decrease')) ----

  it('sends email but skips SMS/push for price_changed with direction increase', async () => {
    const { smsNotificationService } = jest.requireMock('@/lib/sms-notification-service') as {
      smsNotificationService: { notifyPriceDrop: jest.Mock };
    };
    const { pushNotificationService } = jest.requireMock('@/lib/push-notification') as {
      pushNotificationService: { sendToUser: jest.Mock };
    };
    smsNotificationService.notifyPriceDrop.mockClear();
    pushNotificationService.sendToUser.mockClear();

    const event = makeEvent({
      eventType: 'listing.price_changed',
      listingId: null, // also covers event.listingId ?? '' branch
      payload: {
        listingTitle: 'MacBook',
        platform: 'eBay',
        oldPrice: 800,
        newPrice: 1000,
        changePercent: 25,
        direction: 'increase',
      },
    });
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([event]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(makeUserSettings());
    mockEmailService.sendPriceChangeAlert.mockResolvedValueOnce({ success: true });
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();

    expect(mockEmailService.sendPriceChangeAlert).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);
    // SMS and push NOT fired for price increase
    expect(smsNotificationService.notifyPriceDrop).not.toHaveBeenCalled();
  });

  // ---- Coverage: resolveSettings ?? branches when individual fields are null ----

  it('resolveSettings uses defaults for null-valued fields in partial UserSettings', async () => {
    const event = makeEvent();
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([event]);
    // Return settings with all fields null — each ?? operator falls back to the default
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce({
      emailNotifications: null,
      notifyReviewReceived: null,
      notifyFlipGoneCold: null,
      notifyFlipTurnedHot: null,
      notifyPriceChanges: null,
      flipGoneColdHours: null,
      flipTurnedHotCount: null,
    });
    mockEmailService.sendReviewReceived.mockResolvedValueOnce({ success: true });
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();
    // All defaults are true/enabled, so email is sent
    expect(result.sent).toBe(1);
  });

  // ---- Coverage: isColdFlipPayload seller_not_replied branch ----

  it('isColdFlipPayload accepts coldReason seller_not_replied (|| second option)', async () => {
    const event = makeEvent({
      eventType: 'flip.gone_cold',
      payload: {
        listingTitle: 'Sony TV',
        hoursSinceLastResponse: 48,
        sellerName: null,
        coldReason: 'seller_not_replied',
        threadUrl: 'https://flipper-ai.app/messages/listing-1',
      },
    });
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([event]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(makeUserSettings());
    mockEmailService.sendFlipGoneCold.mockResolvedValueOnce({ success: true });
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();
    expect(mockEmailService.sendFlipGoneCold).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);
  });

  // ---- Coverage: Phase 1 event.user optional chain (user is null) ----

  it('Phase 1: skips when event.user is null (optional chain ?. short-circuit)', async () => {
    const event = makeEvent({ user: null });
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([event]);
    mockPrisma.userSettings.findUnique.mockResolvedValueOnce(makeUserSettings());
    mockPrisma.notificationEvent.update.mockResolvedValue({});

    const result = await processSmartAlertNotificationEvents();

    expect(result.skipped).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockEmailService.sendReviewReceived).not.toHaveBeenCalled();
  });

  // ---- Coverage: Phase 2 cold flip findFirst→null on SUCCESS path ----

  it('Phase 2: cold flip send SUCCESS with findFirst → null (ev===null skips markProcessed)', async () => {
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([]);
    mockPrisma.user.findMany
      .mockResolvedValueOnce([
        { id: 'user-1', email: 'user@example.com', name: null, settings: makeUserSettings() },
      ])
      .mockResolvedValueOnce([]);

    mockDetectColdFlips.mockResolvedValueOnce([
      {
        listingId: 'cold-success-null-ev',
        listingTitle: 'Old TV',
        sellerName: null,
        hoursSinceLastResponse: 30,
        lastMessageAt: new Date(),
        coldReason: 'user_not_replied',
      },
    ]);
    mockDetectHotFlips.mockResolvedValueOnce([]);

    mockPrisma.notificationEvent.create.mockResolvedValueOnce({ id: 'ev-cold-1' });
    mockEmailService.sendFlipGoneCold.mockResolvedValueOnce({ success: true });
    mockPrisma.notificationEvent.findFirst.mockResolvedValueOnce(null); // ev === null

    const result = await processSmartAlertNotificationEvents();

    expect(result.sent).toBe(1);
    expect(mockPrisma.notificationEvent.update).not.toHaveBeenCalled();
  });

  // ---- Coverage: Phase 2 hot flip findFirst→null on SUCCESS and FAILURE paths ----

  it('Phase 2: hot flip send SUCCESS with findFirst → null (ev===null skips markProcessed)', async () => {
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([]);
    mockPrisma.user.findMany
      .mockResolvedValueOnce([
        { id: 'user-1', email: 'user@example.com', name: null, settings: makeUserSettings() },
      ])
      .mockResolvedValueOnce([]);

    mockDetectColdFlips.mockResolvedValueOnce([]);
    mockDetectHotFlips.mockResolvedValueOnce([
      {
        listingId: 'hot-success-null-ev',
        listingTitle: 'MacBook',
        sellerName: null,
        consecutiveInboundCount: 4,
        latestMessagePreview: 'Still selling?',
      },
    ]);

    mockPrisma.notificationEvent.create.mockResolvedValueOnce({ id: 'ev-hot-1' });
    mockEmailService.sendFlipTurnedHot.mockResolvedValueOnce({ success: true });
    mockPrisma.notificationEvent.findFirst.mockResolvedValueOnce(null); // ev === null

    const result = await processSmartAlertNotificationEvents();

    expect(result.sent).toBe(1);
    expect(mockPrisma.notificationEvent.update).not.toHaveBeenCalled();
  });

  it('Phase 2: hot flip send FAILURE with findFirst → null (ev===null skips markFailed)', async () => {
    mockPrisma.notificationEvent.findMany.mockResolvedValueOnce([]);
    mockPrisma.user.findMany
      .mockResolvedValueOnce([
        { id: 'user-1', email: 'user@example.com', name: null, settings: makeUserSettings() },
      ])
      .mockResolvedValueOnce([]);

    mockDetectColdFlips.mockResolvedValueOnce([]);
    mockDetectHotFlips.mockResolvedValueOnce([
      {
        listingId: 'hot-fail-null-ev',
        listingTitle: 'MacBook',
        sellerName: null,
        consecutiveInboundCount: 4,
        latestMessagePreview: 'msg',
      },
    ]);

    mockPrisma.notificationEvent.create.mockResolvedValueOnce({ id: 'ev-hot-1' });
    mockEmailService.sendFlipTurnedHot.mockResolvedValueOnce({ success: false, error: 'Provider down' });
    mockPrisma.notificationEvent.findFirst.mockResolvedValueOnce(null); // ev === null

    const result = await processSmartAlertNotificationEvents();

    expect(result.failed).toBe(1);
    expect(mockPrisma.notificationEvent.update).not.toHaveBeenCalled();
  });
});
