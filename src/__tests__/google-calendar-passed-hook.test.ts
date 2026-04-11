/**
 * Unit test for the PASSED status → calendar deletion fire-and-forget hook
 * in app/api/opportunities/[id]/route.ts
 * Story 12.1 — Task 8.4
 *
 * Verifies that:
 * - When status transitions to PASSED and calendarEventId is set,
 *   deleteCalendarEvent is called (fire-and-forget).
 * - The PATCH response returns successfully without waiting for the deletion.
 * - Deletion failure does not surface an error to the caller.
 */

import { NextRequest } from 'next/server';

const mockGetCurrentUserId = jest.fn();
jest.mock('@/lib/auth', () => ({ getCurrentUserId: mockGetCurrentUserId }));

const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    opportunity: { findFirst: mockFindFirst, update: mockUpdate },
  },
}));

const mockHasValidToken = jest.fn();
jest.mock('@/lib/google-calendar-token-store', () => ({
  hasValidToken: mockHasValidToken,
}));

const mockEnsureValidToken = jest.fn();
const mockDeleteCalendarEvent = jest.fn();
const MockCalendarAuthRequiredError = class extends Error {};

jest.mock('@/lib/google-calendar', () => ({
  ensureValidToken: mockEnsureValidToken,
  deleteCalendarEvent: mockDeleteCalendarEvent,
  CalendarAuthRequiredError: MockCalendarAuthRequiredError,
}));

jest.mock('@/lib/conversation-status', () => ({ transitionToPurchased: jest.fn() }));
jest.mock('@/lib/notification-events', () => ({
  createFlipNotificationEvent: jest.fn(),
  NotificationEventType: { FLIP_PURCHASED: 'flip.purchased', FLIP_LISTED: 'flip.listed', FLIP_SOLD: 'flip.sold' },
}));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } }));

import { PATCH } from '@/app/api/opportunities/[id]/route';

function makePatchRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/opportunities/opp-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ id: 'opp-1' });

describe('PATCH /api/opportunities/[id] — PASSED status hook (Story 12.1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserId.mockResolvedValue('user-1');
  });

  it('triggers fire-and-forget calendar deletion when status transitions to PASSED and calendarEventId exists', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'opp-1',
      userId: 'user-1',
      status: 'IDENTIFIED',
      calendarEventId: 'gcal-event-123',
      listing: { id: 'l1', title: 'Test', platform: 'craigslist' },
    });
    mockUpdate.mockResolvedValue({
      id: 'opp-1',
      userId: 'user-1',
      status: 'PASSED',
      calendarEventId: 'gcal-event-123',
      listing: { id: 'l1', title: 'Test', platform: 'craigslist' },
    });
    mockHasValidToken.mockResolvedValue(true);
    mockEnsureValidToken.mockResolvedValue('access-token');
    mockDeleteCalendarEvent.mockResolvedValue(undefined);

    const res = await PATCH(makePatchRequest({ status: 'PASSED' }), { params });

    // Response must be 200 (fire-and-forget does not block)
    expect(res.status).toBe(200);

    // Give the fire-and-forget a tick to run
    await new Promise((r) => setTimeout(r, 10));

    expect(mockDeleteCalendarEvent).toHaveBeenCalledWith('access-token', 'gcal-event-123');
  });

  it('does not call deleteCalendarEvent when no calendarEventId', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'opp-1',
      userId: 'user-1',
      status: 'IDENTIFIED',
      calendarEventId: null,
      listing: { id: 'l1', title: 'Test', platform: 'craigslist' },
    });
    mockUpdate.mockResolvedValue({
      id: 'opp-1',
      userId: 'user-1',
      status: 'PASSED',
      calendarEventId: null,
      listing: { id: 'l1', title: 'Test', platform: 'craigslist' },
    });

    const res = await PATCH(makePatchRequest({ status: 'PASSED' }), { params });
    expect(res.status).toBe(200);

    await new Promise((r) => setTimeout(r, 10));
    expect(mockDeleteCalendarEvent).not.toHaveBeenCalled();
  });

  it('does not surface deletion failure to caller', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'opp-1',
      userId: 'user-1',
      status: 'IDENTIFIED',
      calendarEventId: 'gcal-event-abc',
      listing: { id: 'l1', title: 'Test', platform: 'craigslist' },
    });
    mockUpdate.mockResolvedValue({
      id: 'opp-1',
      userId: 'user-1',
      status: 'PASSED',
      calendarEventId: 'gcal-event-abc',
      listing: { id: 'l1', title: 'Test', platform: 'craigslist' },
    });
    mockHasValidToken.mockResolvedValue(true);
    mockEnsureValidToken.mockResolvedValue('access-token');
    mockDeleteCalendarEvent.mockRejectedValue(new Error('Google API error'));

    const res = await PATCH(makePatchRequest({ status: 'PASSED' }), { params });

    // Must still return 200 despite the calendar error
    expect(res.status).toBe(200);
  });
});
