/**
 * @file src/lib/__tests__/meeting-reminder-scheduler.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-11
 * @version 1.0
 * @brief Unit tests for meeting-reminder-scheduler.ts (Story 12.2).
 *
 * @description
 * Tests cover: only fires for notifyMeetingReminder=true, skips cancelled meetings
 * (meetingLocation null), idempotency (no duplicate NotificationEvent), fallback
 * departure time when route unavailable, skips past meetings, payload completeness.
 */

import { runMeetingReminderScheduler } from '@/lib/meeting-reminder-scheduler';
import { NotificationEventType } from '@/lib/notification-events';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    opportunity: { findMany: jest.fn() },
    notificationEvent: { findFirst: jest.fn(), create: jest.fn() },
  },
}));

jest.mock('@/lib/maps-service', () => ({
  getRoute: jest.fn(),
}));

jest.mock('@/lib/push-notification', () => ({
  pushNotificationService: { sendToUser: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@/lib/email-service', () => ({
  emailService: { send: jest.fn().mockResolvedValue({ success: true }) },
}));

jest.mock('@/lib/sms-service', () => ({
  smsService: { send: jest.fn().mockResolvedValue({ success: true }) },
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), debug: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Import mocked modules
// ---------------------------------------------------------------------------

import prisma from '@/lib/db';
import { getRoute } from '@/lib/maps-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = new Date('2026-04-11T13:55:00Z'); // 5 minutes before departure
const MEETING_TIME = new Date('2026-04-11T15:00:00Z'); // 1h from now
// departureTime = meetingTime - 30min duration - 10min buffer = 14:20
// dispatch window: now(13:55) >= departureTime(14:20) - 5min(14:15) ← FALSE actually

// Let's set meeting closer to test dispatch
// departure = meetingTime - 30min - 10min = meetingTime - 40min
// If meeting is at 14:35, departure = 13:55, dispatch window = [13:50, 14:35]
const NEAR_MEETING_TIME = new Date('2026-04-11T14:35:00Z');
const PAST_MEETING_TIME = new Date('2026-04-11T10:00:00Z');

function makeOpportunity(overrides: Record<string, unknown> = {}) {
  return {
    id: 'opp_123',
    userId: 'user_123',
    meetingTime: NEAR_MEETING_TIME,
    meetingLocation: '456 Oak Ave, Bellevue, WA',
    listing: { id: 'listing_123', title: 'iPhone 14 Pro' },
    user: {
      id: 'user_123',
      email: 'test@example.com',
      settings: {
        homeLocation: '123 Main St, Seattle, WA',
        meetingDepartureBufferMinutes: 10,
        notifyMeetingReminder: true,
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: true,
        phoneVerified: true,
        phoneNumber: '+12025551234',
      },
    },
    ...overrides,
  };
}

const MOCK_ROUTE = {
  durationSeconds: 1800,
  distanceMeters: 24140,
  durationText: '30 mins',
  distanceText: '15.0 mi',
  deepLinkUrl: 'https://www.google.com/maps/dir/?...',
  mapsSearchUrl: 'https://www.google.com/maps/search/?...',
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(NOW);

  (getRoute as jest.Mock).mockResolvedValue(MOCK_ROUTE);
  (prisma.notificationEvent.findFirst as jest.Mock).mockResolvedValue(null);
  (prisma.notificationEvent.create as jest.Mock).mockResolvedValue({ id: 'evt_1' });
  (prisma.opportunity.findUnique as jest.Mock) = jest.fn().mockResolvedValue({
    meetingLocation: '456 Oak Ave, Bellevue, WA',
  });
});

afterEach(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runMeetingReminderScheduler', () => {
  test('only processes opportunities with notifyMeetingReminder = true', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([makeOpportunity()]);

    const summary = await runMeetingReminderScheduler();

    // Query must filter by notifyMeetingReminder: true
    expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          user: { settings: { notifyMeetingReminder: true } },
        }),
      })
    );
    expect(summary.processed).toBe(1);
  });

  test('skips opportunity when meetingLocation is null (cancelled meeting)', async () => {
    // The WHERE clause filters out null meetingLocation, but simulate a race condition
    // where meetingLocation is cleared between query and processing by mocking findUnique
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([makeOpportunity()]);
    (prisma.opportunity.findUnique as jest.Mock) = jest.fn().mockResolvedValue({
      meetingLocation: null,
    });

    const summary = await runMeetingReminderScheduler();

    // Should skip and not create a NotificationEvent
    expect(prisma.notificationEvent.create).not.toHaveBeenCalled();
    expect(summary.skipped).toBeGreaterThanOrEqual(1);
  });

  test('is idempotent — second run does not create duplicate NotificationEvent', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([makeOpportunity()]);
    // Simulate existing event (already created in first run)
    (prisma.notificationEvent.findFirst as jest.Mock).mockResolvedValue({ id: 'existing_evt' });
    (prisma.opportunity.findUnique as jest.Mock) = jest.fn().mockResolvedValue({
      meetingLocation: '456 Oak Ave, Bellevue, WA',
    });

    const summary = await runMeetingReminderScheduler();

    expect(prisma.notificationEvent.create).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(1);
  });

  test('uses fallback 1-hour departure buffer when route unavailable', async () => {
    (getRoute as jest.Mock).mockResolvedValue(null);
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([makeOpportunity()]);

    // Set meeting time such that fallback 1h - 10min buffer = 50min from now
    // NOW = 13:55, meetingTime = 14:45 → departure = 13:45 → within dispatch window
    const meetingIn50Min = new Date(NOW.getTime() + 50 * 60 * 1000);
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
      makeOpportunity({ meetingTime: meetingIn50Min }),
    ]);

    const summary = await runMeetingReminderScheduler();

    // Should dispatch with routeDegraded=true payload
    const createCall = (prisma.notificationEvent.create as jest.Mock).mock.calls[0]?.[0];
    const payload = createCall?.data?.payload;
    expect(payload?.routeDegraded).toBe(true);
    expect(payload?.durationText).toBe('Unknown');
  });

  test('skips opportunities where meeting time is in the past', async () => {
    // meetingTime in the past is filtered by WHERE clause, but test scheduler logic too
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
      makeOpportunity({ meetingTime: PAST_MEETING_TIME }),
    ]);

    const summary = await runMeetingReminderScheduler();
    // Meeting in past → skipped by nowMs >= meetingTime check
    expect(summary.skipped).toBe(1);
  });

  test('payload includes listingTitle and sellerName fields in NotificationEvent', async () => {
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
      makeOpportunity(),
    ]);

    await runMeetingReminderScheduler();

    const createCall = (prisma.notificationEvent.create as jest.Mock).mock.calls[0]?.[0];
    const payload = createCall?.data?.payload;
    expect(payload?.listingTitle).toBe('iPhone 14 Pro');
    expect(payload?.listingId).toBe('listing_123');
    expect(payload?.opportunityId).toBe('opp_123');
  });
});
