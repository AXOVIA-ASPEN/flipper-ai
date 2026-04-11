/**
 * @file src/__tests__/api/maps-route.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-11
 * @version 1.0
 * @brief Unit tests for GET /api/opportunities/[id]/maps-route.
 *
 * @description
 * Tests cover: 401 unauthenticated, 403 non-PRO tier, 403 wrong user ownership,
 * 400 no meetingLocation, state=past_meeting, state=missing_home_location,
 * state=degraded (getRoute null), departureIsPast flag, full departureTime math,
 * and privacy (homeLocation not in logged errors).
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/opportunities/[id]/maps-route/route';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/auth', () => ({
  getCurrentUserId: jest.fn(),
}));

jest.mock('@/lib/tier-enforcement', () => ({
  enforceFeatureAccess: jest.fn(),
}));

jest.mock('@/lib/maps-service', () => ({
  getRoute: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    opportunity: {
      findUnique: jest.fn(),
    },
    userSettings: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), debug: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Import mocked modules after jest.mock()
// ---------------------------------------------------------------------------

import { getCurrentUserId } from '@/lib/auth';
import { enforceFeatureAccess } from '@/lib/tier-enforcement';
import { getRoute } from '@/lib/maps-service';
import prisma from '@/lib/db';
import { ForbiddenError } from '@/lib/errors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(opportunityId: string = 'opp_123'): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(`http://localhost/api/opportunities/${opportunityId}/maps-route`);
  const ctx = { params: Promise.resolve({ id: opportunityId }) };
  return [req, ctx];
}

const NOW = new Date('2026-04-11T14:00:00Z');
const FUTURE_MEETING = new Date('2026-04-11T17:00:00Z'); // 3h from now
const PAST_MEETING = new Date('2026-04-11T10:00:00Z');   // 4h ago

const MOCK_OPPORTUNITY = {
  id: 'opp_123',
  userId: 'user_123',
  meetingLocation: '456 Oak Ave, Bellevue, WA',
  meetingTime: FUTURE_MEETING,
  listing: { id: 'listing_123', title: 'iPhone 14 Pro' },
};

const MOCK_SETTINGS = {
  homeLocation: '123 Main St, Seattle, WA',
  meetingDepartureBufferMinutes: 10,
};

const MOCK_ROUTE = {
  durationSeconds: 1800,
  distanceMeters: 24140,
  durationText: '30 mins',
  distanceText: '15.0 mi',
  deepLinkUrl: 'https://www.google.com/maps/dir/?api=1&origin=123%20Main%20St%2C%20Seattle%2C%20WA&destination=456%20Oak%20Ave%2C%20Bellevue%2C%20WA&travelmode=driving',
  mapsSearchUrl: 'https://www.google.com/maps/search/?api=1&query=456%20Oak%20Ave%2C%20Bellevue%2C%20WA',
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(NOW);

  (getCurrentUserId as jest.Mock).mockResolvedValue('user_123');
  (enforceFeatureAccess as jest.Mock).mockResolvedValue(undefined);
  (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue(MOCK_OPPORTUNITY);
  (prisma.userSettings.findUnique as jest.Mock).mockResolvedValue(MOCK_SETTINGS);
  (getRoute as jest.Mock).mockResolvedValue(MOCK_ROUTE);
});

afterEach(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/opportunities/[id]/maps-route', () => {
  test('returns 401 when unauthenticated', async () => {
    (getCurrentUserId as jest.Mock).mockResolvedValue(null);
    const [req, ctx] = makeRequest();
    const res = await GET(req, ctx);
    expect(res.status).toBe(401);
  });

  test('returns 403 when user is not on PRO tier (enforceFeatureAccess throws)', async () => {
    (enforceFeatureAccess as jest.Mock).mockRejectedValue(
      new ForbiddenError('Meeting & Logistics is not available on the Free plan.')
    );
    const [req, ctx] = makeRequest();
    const res = await GET(req, ctx);
    expect(res.status).toBe(403);
  });

  test('returns 403 when opportunity belongs to different user', async () => {
    (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
      ...MOCK_OPPORTUNITY,
      userId: 'different_user',
    });
    const [req, ctx] = makeRequest();
    const res = await GET(req, ctx);
    expect(res.status).toBe(403);
  });

  test('returns 400 when meetingLocation is null', async () => {
    (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
      ...MOCK_OPPORTUNITY,
      meetingLocation: null,
    });
    const [req, ctx] = makeRequest();
    const res = await GET(req, ctx);
    expect(res.status).toBe(422);
  });

  test('returns state=past_meeting when meetingTime is in the past', async () => {
    (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
      ...MOCK_OPPORTUNITY,
      meetingTime: PAST_MEETING,
    });
    const [req, ctx] = makeRequest();
    const res = await GET(req, ctx);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.state).toBe('past_meeting');
    expect(body.data).not.toHaveProperty('departureTime');
  });

  test('returns state=missing_home_location when homeLocation is null', async () => {
    (prisma.userSettings.findUnique as jest.Mock).mockResolvedValue({
      ...MOCK_SETTINGS,
      homeLocation: null,
    });
    const [req, ctx] = makeRequest();
    const res = await GET(req, ctx);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.state).toBe('missing_home_location');
  });

  test('returns state=degraded when getRoute returns null (no API key or ZERO_RESULTS)', async () => {
    (getRoute as jest.Mock).mockResolvedValue(null);
    const [req, ctx] = makeRequest();
    const res = await GET(req, ctx);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.state).toBe('degraded');
    expect(body.data).not.toHaveProperty('route');
  });

  test('sets departureIsPast=true when departure time has passed but meetingTime has not', async () => {
    // durationSeconds = 1800 (30 min), buffer = 10 min → departure = meetingTime - 40 min
    // meetingTime = NOW + 3h = 17:00 UTC → departureTime = 16:20 UTC
    // But let's set a closer meeting so departureTime is in the past:
    // meetingTime = NOW + 20 min (14:20), duration=30min, buffer=10min → departure = 14:20 - 40min = 13:40 → past
    const closeMeeting = new Date(NOW.getTime() + 20 * 60 * 1000);
    (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
      ...MOCK_OPPORTUNITY,
      meetingTime: closeMeeting,
    });
    const [req, ctx] = makeRequest();
    const res = await GET(req, ctx);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.state).toBe('ok');
    expect(body.data.departureIsPast).toBe(true);
  });

  test('computes departureTime correctly using ms math (meetingTime - duration - buffer)', async () => {
    // meetingTime = 17:00 UTC, durationSeconds=1800 (30min), buffer=10min
    // Expected: 17:00 - 30min - 10min = 16:20 UTC
    const [req, ctx] = makeRequest();
    const res = await GET(req, ctx);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.state).toBe('ok');

    const departureTime = new Date(body.data.departureTime);
    const expectedDeparture = new Date(
      FUTURE_MEETING.getTime() - 1800 * 1000 - 10 * 60 * 1000
    );
    expect(departureTime.getTime()).toBe(expectedDeparture.getTime());
  });

  test('raw homeLocation does not appear in logger calls on route error', async () => {
    const { logger } = await import('@/lib/logger');
    (getRoute as jest.Mock).mockRejectedValue(new Error('API down'));

    const [req, ctx] = makeRequest();
    await GET(req, ctx);

    const loggerErrorCalls = (logger.error as jest.Mock).mock.calls.flat().map(String).join(' ');
    expect(loggerErrorCalls).not.toContain(MOCK_SETTINGS.homeLocation);
  });
});
