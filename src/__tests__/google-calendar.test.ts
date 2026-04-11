/**
 * Unit tests for src/lib/google-calendar.ts
 * Story 12.1 — Task 8.1
 *
 * Covers: OAuth URL + state construction, token refresh order (DB write before
 * API call), 404 re-create logic for updateCalendarEvent, 404 idempotency for
 * deleteCalendarEvent, CalendarAuthRequiredError on refresh failure.
 */

process.env.GOOGLE_CALENDAR_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_CALENDAR_REDIRECT_URI = 'http://localhost:3000/api/integrations/google-calendar/callback';
process.env.ENCRYPTION_SECRET = 'test-encryption-secret-for-hmac';

// ----- googleapis mock -----
const mockGenerateAuthUrl = jest.fn(() => 'https://accounts.google.com/o/oauth2/auth?mock=1');
const mockGetToken = jest.fn();
const mockRefreshAccessToken = jest.fn();
const mockEventsInsert = jest.fn();
const mockEventsUpdate = jest.fn();
const mockEventsDelete = jest.fn();
const mockUserinfoGet = jest.fn();
const mockSetCredentials = jest.fn();

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        generateAuthUrl: mockGenerateAuthUrl,
        getToken: mockGetToken,
        refreshAccessToken: mockRefreshAccessToken,
        setCredentials: mockSetCredentials,
      })),
    },
    calendar: jest.fn().mockReturnValue({
      events: {
        insert: mockEventsInsert,
        update: mockEventsUpdate,
        delete: mockEventsDelete,
      },
    }),
    oauth2: jest.fn().mockReturnValue({
      userinfo: { get: mockUserinfoGet },
    }),
  },
}));

// ----- token store mock -----
const mockGetToken2 = jest.fn();
const mockUpdateAccessToken = jest.fn();

jest.mock('@/lib/google-calendar-token-store', () => ({
  getToken: mockGetToken2,
  updateAccessToken: mockUpdateAccessToken,
}));

import {
  generateOAuthState,
  validateOAuthState,
  getOAuthUrl,
  CalendarAuthRequiredError,
  ensureValidToken,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  exchangeCode,
} from '../lib/google-calendar';

describe('google-calendar', () => {
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // CSRF state
  // ---------------------------------------------------------------------------
  describe('generateOAuthState / validateOAuthState', () => {
    it('generates a valid state and validates it correctly', () => {
      const state = generateOAuthState(userId);
      expect(() => validateOAuthState(state, userId)).not.toThrow();
    });

    it('rejects state for a different userId', () => {
      const state = generateOAuthState(userId);
      expect(() => validateOAuthState(state, 'other-user')).toThrow();
    });

    it('rejects tampered state', () => {
      // Tamper the base64 payload
      const state = generateOAuthState(userId);
      const tampered = state.slice(0, -3) + 'xxx';
      expect(() => validateOAuthState(tampered, userId)).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // getOAuthUrl
  // ---------------------------------------------------------------------------
  describe('getOAuthUrl', () => {
    it('calls generateAuthUrl with offline access and calendar.events scope', () => {
      const state = generateOAuthState(userId);
      const url = getOAuthUrl(state);

      expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          access_type: 'offline',
          scope: ['https://www.googleapis.com/auth/calendar.events'],
          state,
        })
      );
      expect(url).toBe('https://accounts.google.com/o/oauth2/auth?mock=1');
    });
  });

  // ---------------------------------------------------------------------------
  // ensureValidToken — token refresh order
  // ---------------------------------------------------------------------------
  describe('ensureValidToken', () => {
    it('returns access token when fresh (no refresh needed)', async () => {
      mockGetToken2.mockResolvedValue({
        accessToken: 'fresh-token',
        refreshToken: 'refresh-tk',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      });

      const token = await ensureValidToken(userId);
      expect(token).toBe('fresh-token');
      expect(mockUpdateAccessToken).not.toHaveBeenCalled();
    });

    it('refreshes and writes to DB BEFORE returning new token', async () => {
      // Token expires in 1 minute (inside 5-minute buffer)
      mockGetToken2.mockResolvedValue({
        accessToken: 'old-token',
        refreshToken: 'refresh-tk',
        expiresAt: new Date(Date.now() + 60 * 1000),
      });

      const newExpiry = new Date(Date.now() + 3600 * 1000);
      mockRefreshAccessToken.mockResolvedValue({
        credentials: { access_token: 'new-token', expiry_date: newExpiry.getTime() },
      });
      mockUpdateAccessToken.mockResolvedValue(undefined);

      const token = await ensureValidToken(userId);

      // updateAccessToken must be called before we return the token (i.e. called at all)
      expect(mockUpdateAccessToken).toHaveBeenCalledWith(userId, 'new-token', expect.any(Date));
      expect(token).toBe('new-token');
    });

    it('throws CalendarAuthRequiredError when refresh fails', async () => {
      mockGetToken2.mockResolvedValue({
        accessToken: 'old-token',
        refreshToken: 'refresh-tk',
        expiresAt: new Date(Date.now() + 60 * 1000), // near-expiry
      });
      mockRefreshAccessToken.mockRejectedValue(new Error('token revoked'));

      await expect(ensureValidToken(userId)).rejects.toThrow(CalendarAuthRequiredError);
    });

    it('throws CalendarAuthRequiredError when no token stored', async () => {
      mockGetToken2.mockResolvedValue(null);
      await expect(ensureValidToken(userId)).rejects.toThrow(CalendarAuthRequiredError);
    });
  });

  // ---------------------------------------------------------------------------
  // createCalendarEvent
  // ---------------------------------------------------------------------------
  describe('createCalendarEvent', () => {
    const baseEvent = {
      title: 'Buy: iPhone 14',
      startTime: new Date('2026-05-01T14:00:00Z'),
      location: '456 Oak Ave',
      description: 'Seller: John\nContact: 555-1234',
      timezone: 'America/Los_Angeles',
    };

    it('inserts an event and returns the event ID', async () => {
      mockEventsInsert.mockResolvedValue({ data: { id: 'gcal-event-id-1' } });

      const id = await createCalendarEvent('access-token', baseEvent);

      expect(id).toBe('gcal-event-id-1');
      expect(mockEventsInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarId: 'primary',
          requestBody: expect.objectContaining({
            summary: 'Buy: iPhone 14',
            location: '456 Oak Ave',
            start: expect.objectContaining({ timeZone: 'America/Los_Angeles' }),
            end: expect.objectContaining({ timeZone: 'America/Los_Angeles' }),
          }),
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // updateCalendarEvent — 404 re-create logic
  // ---------------------------------------------------------------------------
  describe('updateCalendarEvent', () => {
    const event = {
      title: 'Buy: Item',
      startTime: new Date('2026-05-02T10:00:00Z'),
      location: '123 Main St',
      description: '',
      timezone: 'America/New_York',
    };

    it('updates in-place and returns undefined when event exists', async () => {
      mockEventsUpdate.mockResolvedValue({ data: {} });

      const result = await updateCalendarEvent('access-token', 'existing-id', event);

      expect(result).toBeUndefined(); // unchanged ID
      expect(mockEventsUpdate).toHaveBeenCalled();
      expect(mockEventsInsert).not.toHaveBeenCalled();
    });

    it('re-creates event on 404 (stale ID) and returns new event ID', async () => {
      const notFound = Object.assign(new Error('Not Found'), { code: 404 });
      mockEventsUpdate.mockRejectedValue(notFound);
      mockEventsInsert.mockResolvedValue({ data: { id: 'new-event-id' } });

      const result = await updateCalendarEvent('access-token', 'stale-id', event);

      expect(result).toBe('new-event-id');
      expect(mockEventsInsert).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // deleteCalendarEvent — 404 idempotency
  // ---------------------------------------------------------------------------
  describe('deleteCalendarEvent', () => {
    it('calls events.delete', async () => {
      mockEventsDelete.mockResolvedValue({});
      await deleteCalendarEvent('access-token', 'event-id');
      expect(mockEventsDelete).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: 'event-id',
      });
    });

    it('treats 404 as success (idempotent delete)', async () => {
      const notFound = Object.assign(new Error('Not Found'), { code: 404 });
      mockEventsDelete.mockRejectedValue(notFound);
      await expect(deleteCalendarEvent('access-token', 'gone-event-id')).resolves.toBeUndefined();
    });

    it('rethrows non-404 errors', async () => {
      const serverError = Object.assign(new Error('Internal Server Error'), { code: 500 });
      mockEventsDelete.mockRejectedValue(serverError);
      await expect(deleteCalendarEvent('access-token', 'event-id')).rejects.toThrow(
        'Internal Server Error'
      );
    });
  });

  // ---------------------------------------------------------------------------
  // createCalendarEvent — end time is always startTime + 1 hour (no endTime field)
  // ---------------------------------------------------------------------------
  describe('createCalendarEvent end time computation', () => {
    it('sets end time to startTime + 1 hour regardless of input', async () => {
      mockEventsInsert.mockResolvedValue({ data: { id: 'evt-id' } });
      const start = new Date('2026-05-01T14:00:00Z');

      await createCalendarEvent('access-token', {
        title: 'Test',
        startTime: start,
        location: 'Loc',
        description: '',
        timezone: 'America/New_York',
      });

      const call = mockEventsInsert.mock.calls[0][0] as {
        requestBody: { start: { dateTime: string }; end: { dateTime: string } };
      };
      const endTime = new Date(call.requestBody.end.dateTime);
      expect(endTime.getTime() - start.getTime()).toBe(60 * 60 * 1000);
    });
  });

  // ---------------------------------------------------------------------------
  // exchangeCode
  // ---------------------------------------------------------------------------
  describe('exchangeCode', () => {
    it('returns accessToken, refreshToken, expiresAt, and email on success', async () => {
      const expiry = Date.now() + 3600 * 1000;
      mockGetToken.mockResolvedValue({
        tokens: {
          access_token: 'access-123',
          refresh_token: 'refresh-456',
          expiry_date: expiry,
        },
      });
      mockUserinfoGet.mockResolvedValue({ data: { email: 'user@example.com' } });

      const result = await exchangeCode('auth-code');

      expect(result.accessToken).toBe('access-123');
      expect(result.refreshToken).toBe('refresh-456');
      expect(result.email).toBe('user@example.com');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeCloseTo(expiry, -2);
    });

    it('falls back to 1-hour expiry when expiry_date is absent', async () => {
      mockGetToken.mockResolvedValue({
        tokens: { access_token: 'access-123', refresh_token: 'refresh-456' },
      });
      mockUserinfoGet.mockResolvedValue({ data: { email: '' } });

      const before = Date.now();
      const result = await exchangeCode('auth-code');
      const after = Date.now();

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 3600 * 1000 - 100);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(after + 3600 * 1000 + 100);
    });

    it('throws when access_token is missing', async () => {
      mockGetToken.mockResolvedValue({ tokens: { refresh_token: 'refresh-456' } });
      await expect(exchangeCode('auth-code')).rejects.toThrow(
        'Google OAuth did not return required tokens'
      );
    });

    it('throws when refresh_token is missing', async () => {
      mockGetToken.mockResolvedValue({ tokens: { access_token: 'access-123' } });
      await expect(exchangeCode('auth-code')).rejects.toThrow(
        'Google OAuth did not return required tokens'
      );
    });
  });
});
