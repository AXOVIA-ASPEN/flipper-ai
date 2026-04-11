/**
 * Unit tests for app/api/opportunities/[id]/meeting/route.ts
 * Story 12.1 — Task 8.3
 *
 * Covers:
 * - POST saves meeting data to DB before attempting calendar ops
 * - POST handles stale calendarEventId (404 re-create)
 * - DELETE treats Google 404 as success
 * - Disconnected calendar → saves without error, no calendar call
 * - CALENDAR_AUTH_REQUIRED response shape
 */

import { NextRequest } from 'next/server';

const mockGetCurrentUserId = jest.fn();
jest.mock('@/lib/auth', () => ({ getCurrentUserId: mockGetCurrentUserId }));

const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    opportunity: {
      findFirst: mockFindFirst,
      update: mockUpdate,
    },
  },
}));

const mockHasValidToken = jest.fn();
jest.mock('@/lib/google-calendar-token-store', () => ({
  hasValidToken: mockHasValidToken,
}));

const mockEnsureValidToken = jest.fn();
const mockCreateCalendarEvent = jest.fn();
const mockUpdateCalendarEvent = jest.fn();
const mockDeleteCalendarEvent = jest.fn();
const MockCalendarAuthRequiredError = class extends Error {
  constructor(msg?: string) { super(msg); this.name = 'CalendarAuthRequiredError'; }
};

jest.mock('@/lib/google-calendar', () => ({
  ensureValidToken: mockEnsureValidToken,
  createCalendarEvent: mockCreateCalendarEvent,
  updateCalendarEvent: mockUpdateCalendarEvent,
  deleteCalendarEvent: mockDeleteCalendarEvent,
  CalendarAuthRequiredError: MockCalendarAuthRequiredError,
}));

jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));

import { POST, DELETE } from '@/app/api/opportunities/[id]/meeting/route';

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/opportunities/opp-1/meeting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(): NextRequest {
  return new NextRequest('http://localhost/api/opportunities/opp-1/meeting', {
    method: 'DELETE',
  });
}

const params = Promise.resolve({ id: 'opp-1' });

const baseOpportunity = {
  id: 'opp-1',
  userId: 'user-1',
  status: 'IDENTIFIED',
  calendarEventId: null,
  listing: {
    id: 'listing-1',
    title: 'iPhone 14 Pro',
    platform: 'craigslist',
    url: 'http://example.com/listing',
    sellerName: 'John',
    sellerContact: '555-1234',
    askingPrice: 500,
  },
};

describe('POST /api/opportunities/[id]/meeting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserId.mockResolvedValue('user-1');
    mockFindFirst.mockResolvedValue(baseOpportunity);
    mockUpdate.mockImplementation(({ data }) =>
      Promise.resolve({ ...baseOpportunity, ...data, listing: baseOpportunity.listing })
    );
    mockHasValidToken.mockResolvedValue(false); // calendar not connected by default
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetCurrentUserId.mockResolvedValue(null);
    const res = await POST(makeRequest({ meetingTime: '2026-05-01T14:00:00Z', meetingLocation: 'Park', timezone: 'UTC' }), { params });
    expect(res.status).toBe(401);
  });

  it('returns 422 when meetingTime is missing', async () => {
    const res = await POST(makeRequest({ meetingLocation: 'Park', timezone: 'UTC' }), { params });
    expect(res.status).toBe(422);
  });

  it('returns 422 when meetingLocation is missing', async () => {
    const res = await POST(makeRequest({ meetingTime: '2026-05-01T14:00:00Z', timezone: 'UTC' }), { params });
    expect(res.status).toBe(422);
  });

  it('saves meeting data to DB FIRST before calendar op when connected', async () => {
    mockHasValidToken.mockResolvedValue(true);
    mockEnsureValidToken.mockResolvedValue('access-token');
    mockCreateCalendarEvent.mockResolvedValue('gcal-new-event');

    const callOrder: string[] = [];
    mockUpdate.mockImplementation(({ data }) => {
      callOrder.push('db-update');
      return Promise.resolve({ ...baseOpportunity, ...data, listing: baseOpportunity.listing });
    });
    mockCreateCalendarEvent.mockImplementation(() => {
      callOrder.push('calendar-create');
      return Promise.resolve('gcal-new-event');
    });

    await POST(makeRequest({
      meetingTime: '2026-05-01T14:00:00Z',
      meetingLocation: '456 Oak Ave',
      meetingType: 'buy',
      timezone: 'America/Los_Angeles',
    }), { params });

    // DB update must come first
    expect(callOrder[0]).toBe('db-update');
    expect(callOrder[1]).toBe('calendar-create');
  });

  it('stores meeting without error when Google Calendar not connected', async () => {
    mockHasValidToken.mockResolvedValue(false);

    const res = await POST(makeRequest({
      meetingTime: '2026-05-01T14:00:00Z',
      meetingLocation: '456 Oak Ave',
      timezone: 'America/Los_Angeles',
    }), { params });

    expect(res.status).toBe(200);
    expect(mockCreateCalendarEvent).not.toHaveBeenCalled();
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('handles stale calendarEventId by re-creating event', async () => {
    mockHasValidToken.mockResolvedValue(true);
    mockEnsureValidToken.mockResolvedValue('access-token');
    // Opportunity already has a calendarEventId
    mockFindFirst.mockResolvedValue({ ...baseOpportunity, calendarEventId: 'old-event-id' });
    // updateCalendarEvent returns new ID (stale → re-created)
    mockUpdateCalendarEvent.mockResolvedValue('new-event-id');

    await POST(makeRequest({
      meetingTime: '2026-05-01T14:00:00Z',
      meetingLocation: '456 Oak Ave',
      meetingType: 'buy',
      timezone: 'America/Los_Angeles',
    }), { params });

    expect(mockUpdateCalendarEvent).toHaveBeenCalledWith('access-token', 'old-event-id', expect.any(Object));
    // Should persist the new event ID
    expect(mockUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ calendarEventId: 'new-event-id' }) })
    );
  });

  it('returns CALENDAR_AUTH_REQUIRED with 401 when token is revoked', async () => {
    mockHasValidToken.mockResolvedValue(true);
    mockEnsureValidToken.mockRejectedValue(new MockCalendarAuthRequiredError());

    const res = await POST(makeRequest({
      meetingTime: '2026-05-01T14:00:00Z',
      meetingLocation: '456 Oak Ave',
      timezone: 'UTC',
    }), { params });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error?.code).toBe('CALENDAR_AUTH_REQUIRED');
  });
});

describe('DELETE /api/opportunities/[id]/meeting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserId.mockResolvedValue('user-1');
  });

  it('clears meeting fields from DB', async () => {
    mockFindFirst.mockResolvedValue({ calendarEventId: null });
    mockUpdate.mockResolvedValue({});

    const res = await DELETE(makeDeleteRequest(), { params });

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          meetingTime: null,
          meetingLocation: null,
          meetingType: null,
          calendarEventId: null,
        },
      })
    );
  });

  it('treats Google 404 on deletion as success', async () => {
    mockFindFirst.mockResolvedValue({ calendarEventId: 'event-id' });
    mockHasValidToken.mockResolvedValue(true);
    mockEnsureValidToken.mockResolvedValue('access-token');
    const notFound = Object.assign(new Error('Not Found'), { code: 404 });
    mockDeleteCalendarEvent.mockRejectedValue(notFound);
    mockUpdate.mockResolvedValue({});

    const res = await DELETE(makeDeleteRequest(), { params });
    // Should not throw — DB cleanup still happens
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });
});
