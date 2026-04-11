/**
 * @file src/lib/google-calendar.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-11
 * @version 1.0
 * @brief Google Calendar OAuth flow, event CRUD, and token refresh.
 *
 * @description
 * Wraps the googleapis library to provide:
 *   - OAuth consent URL generation with CSRF state (HMAC-SHA256, 10-min TTL)
 *   - Authorization code exchange
 *   - Access token refresh with DB persistence (write BEFORE API call)
 *   - Calendar event create / update / delete
 *   - Stale event-ID handling (re-create on 404 update; treat 404 as success on delete)
 *
 * All calendar ops call ensureValidToken() first so the token is always fresh.
 * CalendarAuthRequiredError is thrown when the refresh token itself is revoked.
 */

import { google } from 'googleapis';
import { createHmac, timingSafeEqual } from 'crypto';
import { getToken, updateAccessToken } from '@/lib/google-calendar-token-store';

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------

export class CalendarAuthRequiredError extends Error {
  public readonly code = 'CALENDAR_AUTH_REQUIRED' as const;

  constructor(message = 'Google Calendar re-authentication required') {
    super(message);
    this.name = 'CalendarAuthRequiredError';
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalendarEventInput {
  title: string;
  startTime: Date;
  location: string;
  description: string;
  timezone: string;
}

// ---------------------------------------------------------------------------
// OAuth client factory
// ---------------------------------------------------------------------------

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Google Calendar OAuth is not configured. Set GOOGLE_CALENDAR_CLIENT_ID, ' +
        'GOOGLE_CALENDAR_CLIENT_SECRET, and GOOGLE_CALENDAR_REDIRECT_URI.'
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// ---------------------------------------------------------------------------
// CSRF state helpers
// ---------------------------------------------------------------------------

const CSRF_SECRET = process.env.ENCRYPTION_SECRET ?? 'dev-only-secret';
const CSRF_TTL_SECONDS = 600; // 10 minutes

/**
 * Generate a CSRF state token: base64(timestamp:HMAC).
 * The timestamp is Unix seconds; HMAC covers "userId:timestamp".
 */
export function generateOAuthState(userId: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${userId}:${timestamp}`;
  const hmac = createHmac('sha256', CSRF_SECRET).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ userId, timestamp, hmac })).toString('base64url');
}

/**
 * Validate a CSRF state token.
 * Throws if the HMAC is invalid or the token has expired.
 */
export function validateOAuthState(state: string, expectedUserId: string): void {
  let parsed: { userId: string; timestamp: number; hmac: string };
  try {
    parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as {
      userId: string;
      timestamp: number;
      hmac: string;
    };
  } catch {
    throw new Error('Invalid OAuth state');
  }

  const now = Math.floor(Date.now() / 1000);
  if (now - parsed.timestamp > CSRF_TTL_SECONDS) {
    throw new Error('OAuth state has expired');
  }

  if (parsed.userId !== expectedUserId) {
    throw new Error('OAuth state user mismatch');
  }

  const expected = createHmac('sha256', CSRF_SECRET)
    .update(`${parsed.userId}:${parsed.timestamp}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(parsed.hmac, 'hex');
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    throw new Error('Invalid OAuth state HMAC');
  }
}

// ---------------------------------------------------------------------------
// OAuth URL
// ---------------------------------------------------------------------------

/**
 * Build a Google OAuth consent URL requesting calendar.events write access.
 */
export function getOAuthUrl(state: string): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    prompt: 'consent', // ensures refresh_token is returned on every auth
    state,
  });
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

/**
 * Exchange an authorization code for access + refresh tokens.
 * Returns the raw (decrypted) tokens so the caller can store them.
 */
export async function exchangeCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email: string;
}> {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Google OAuth did not return required tokens');
  }

  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3600 * 1000);

  // Fetch the user's email from the tokeninfo endpoint
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const { data } = await oauth2.userinfo.get();
  const email = data.email ?? '';

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
    email,
  };
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

/**
 * Refresh an expired access token using the stored refresh token.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: Date }> {
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error('Token refresh did not return a new access token');
  }

  const expiresAt = credentials.expiry_date
    ? new Date(credentials.expiry_date)
    : new Date(Date.now() + 3600 * 1000);

  return { accessToken: credentials.access_token, expiresAt };
}

// ---------------------------------------------------------------------------
// ensureValidToken
// ---------------------------------------------------------------------------

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Ensure the user has a valid, non-expiring access token.
 * Auto-refreshes and persists to DB BEFORE making any calendar API call.
 * Throws CalendarAuthRequiredError if the refresh token is revoked.
 */
export async function ensureValidToken(userId: string): Promise<string> {
  const stored = await getToken(userId);
  if (!stored) {
    throw new CalendarAuthRequiredError('No Google Calendar token for user');
  }

  const expiresInMs = stored.expiresAt.getTime() - Date.now();
  if (expiresInMs > REFRESH_BUFFER_MS) {
    // Token is still fresh
    return stored.accessToken;
  }

  // Token is expired or about to expire — refresh
  try {
    const { accessToken, expiresAt } = await refreshAccessToken(stored.refreshToken);
    // Persist new access token to DB BEFORE using it
    await updateAccessToken(userId, accessToken, expiresAt);
    return accessToken;
  } catch {
    throw new CalendarAuthRequiredError('Google Calendar token refresh failed — please reconnect');
  }
}

// ---------------------------------------------------------------------------
// Calendar API helpers
// ---------------------------------------------------------------------------

function buildCalendarClient(accessToken: string) {
  const auth = getOAuthClient();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: 'v3', auth });
}

/**
 * Create a calendar event in the user's primary calendar.
 * Returns the Google event ID.
 */
export async function createCalendarEvent(
  accessToken: string,
  event: CalendarEventInput
): Promise<string> {
  const calendar = buildCalendarClient(accessToken);

  const endTime = new Date(event.startTime.getTime() + 60 * 60 * 1000);

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: event.title,
      location: event.location,
      description: event.description,
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: event.timezone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: event.timezone,
      },
    },
  });

  const eventId = response.data.id;
  if (!eventId) throw new Error('Google Calendar did not return an event ID');
  return eventId;
}

/**
 * Update an existing calendar event.
 * If the event is not found (404 / stale ID), re-creates the event and
 * returns the new Google event ID. Returns undefined if the original
 * event was found and updated (calendarEventId unchanged).
 */
export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  event: CalendarEventInput
): Promise<string | undefined> {
  const calendar = buildCalendarClient(accessToken);
  const endTime = new Date(event.startTime.getTime() + 60 * 60 * 1000);

  const requestBody = {
    summary: event.title,
    location: event.location,
    description: event.description,
    start: { dateTime: event.startTime.toISOString(), timeZone: event.timezone },
    end: { dateTime: endTime.toISOString(), timeZone: event.timezone },
  };

  try {
    await calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody,
    });
    return undefined; // updated in-place, caller keeps existing eventId
  } catch (err: unknown) {
    const status = (err as { code?: number }).code ?? (err as { status?: number }).status;
    if (status === 404) {
      // Stale ID — re-create the event
      const newId = await createCalendarEvent(accessToken, event);
      return newId;
    }
    throw err;
  }
}

/**
 * Delete a calendar event.
 * Treats 404 as success (idempotent).
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const calendar = buildCalendarClient(accessToken);

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });
  } catch (err: unknown) {
    const status = (err as { code?: number }).code ?? (err as { status?: number }).status;
    if (status === 404) return; // already gone — treat as success
    throw err;
  }
}
