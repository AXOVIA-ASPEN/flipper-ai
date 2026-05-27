# Story 12.1: Google Calendar Integration

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69d963ffb9e4079b8fd3e9d7

## Story

As a **user**,
I want buy/sell meetups automatically added to my Google Calendar,
So that I never miss a scheduled pickup or sale.

## Acceptance Criteria

**AC1 (FR-MEET-01):** Given the user navigates to Settings → Integrations, when they click "Connect Google Calendar", then a Google OAuth flow is initiated requesting calendar write access (`calendar.events` scope), and the Settings UI clearly states: "This allows Flipper AI to create, update, and delete events on your Google Calendar."

**AC2 (FR-MEET-01):** Given Google Calendar is connected, when BOTH `meetingTime` AND `meetingLocation` are set simultaneously on an Opportunity (via POST /api/opportunities/[id]/meeting), then a calendar event is automatically created in the user's primary Google Calendar with: event title (`Buy: <listing title>` or `Sell: <listing title>`), start time = `meetingTime`, end time = `meetingTime + 1 hour`, location = `meetingLocation`, description containing item details, seller/buyer name+contact, and a link to the listing. The event timezone is determined by the `timezone` field sent in the POST body (IANA format, e.g., `America/Los_Angeles`).

**AC3 (FR-MEET-01):** Given a calendar event is created, when the meeting is rescheduled (POST to /meeting with updated meetingTime or meetingLocation), then the existing calendar event is updated to reflect the new time/location. If the `calendarEventId` is stale (Google returns 404), the system re-creates the event and stores the new event ID.

**AC4 (FR-MEET-01):** Given a calendar event is created, when the meeting is cleared (DELETE /api/opportunities/[id]/meeting), then the calendar event is deleted from Google Calendar and `calendarEventId` is cleared. If the event no longer exists in Google Calendar (404), the deletion is treated as a success.

**AC5 (FR-MEET-01):** Given an opportunity has a `calendarEventId`, when its status transitions to PASSED via PATCH /api/opportunities/[id], then the linked calendar event is deleted (fire-and-forget — does not block the PATCH response). If deletion fails, it is logged but does not surface an error to the user.

**AC6 (FR-MEET-01):** Given the Google Calendar OAuth access token is expired, when a calendar operation is attempted, then the token is refreshed automatically using the stored refresh token and the new access token is persisted to DB before the calendar API call proceeds. If the refresh itself fails (token revoked), the calendar operation returns `{ code: 'CALENDAR_AUTH_REQUIRED' }` with HTTP 401 and the frontend shows a toast: "Reconnect Google Calendar in Settings."

**AC7 (FR-MEET-01):** Given a user disconnects Google Calendar (DELETE /api/integrations/google-calendar), then the token is deleted from the DB regardless of whether Google's revoke endpoint succeeds, and the Settings page shows the disconnected state.

**AC8 (FR-MEET-01):** Given Google Calendar is not connected, when meeting fields are set on an opportunity, then the system stores `meetingTime`, `meetingLocation`, and `meetingType` without error and without attempting a calendar API call. No error is shown to the user.

## Tasks / Subtasks

- [x] Task 1: Database schema (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [x] 1.1 Add `GoogleCalendarToken` model to `prisma/schema.prisma` with `onDelete: Cascade` on the User relation
  - [x] 1.2 Add meeting fields to `Opportunity` model: `meetingTime DateTime?`, `meetingLocation String?`, `meetingType String?`, `calendarEventId String?`
  - [x] 1.3 Run `make migrate` and verify migration

- [x] Task 2: Google Calendar service layer (AC: 2, 3, 4, 5, 6)
  - [x] 2.1 Create `src/lib/google-calendar.ts` — OAuth URL generation, token exchange, event CRUD, token refresh
  - [x] 2.2 Create `src/lib/google-calendar-token-store.ts` — encrypted token storage/retrieval (mirrors FacebookToken pattern; delete always succeeds via `.catch(() => {})`)
  - [x] 2.3 Implement `ensureValidToken(userId)` — write refreshed access token to DB BEFORE making calendar API call; throw `CalendarAuthRequiredError` if refresh fails
  - [x] 2.4 Handle Google 404 responses in update/delete operations (stale event ID): re-create on update, treat 404 as success on delete

- [x] Task 3: OAuth API routes (AC: 1, 6, 7)
  - [x] 3.1 Create `app/api/integrations/google-calendar/connect/route.ts` — GET: generate state token (HMAC of userId + timestamp, 10-minute TTL), redirect to Google OAuth consent URL
  - [x] 3.2 Create `app/api/integrations/google-calendar/callback/route.ts` — GET: validate state expiry + HMAC, exchange code for tokens, store, redirect to `/settings?tab=integrations&connected=true`
  - [x] 3.3 Create `app/api/integrations/google-calendar/route.ts` — GET: connection status + email; DELETE: delete token from DB regardless of Google revoke success
  - [x] 3.4 Add `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_CALENDAR_REDIRECT_URI` to `.env.example`
  - [x] 3.5 Add the two secrets (`GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`) to `helpers/secrets.py` under an appropriate category (e.g., `integrations`) — per FR-INFRA-11, GCP Secret Manager is the sole source of truth for all secrets in production

- [x] Task 4: Meeting API route (AC: 2, 3, 4, 8)
  - [x] 4.1 Create `app/api/opportunities/[id]/meeting/route.ts`:
    - POST: accept `{ meetingTime, meetingLocation, meetingType, timezone }` — validate both meetingTime and meetingLocation present, timezone is valid IANA string; save meeting data FIRST then attempt calendar op (decouple storage from calendar availability)
    - DELETE: clear all meeting fields; attempt calendar deletion (treat Google 404 as success)
  - [x] 4.2 Note: meeting fields are NOT added to `UPDATABLE_FIELDS` in `opportunities/[id]/route.ts` — all meeting changes go through the meeting subroute exclusively

- [x] Task 5: PASSED status → calendar deletion hook (AC: 5)
  - [x] 5.1 In `app/api/opportunities/[id]/route.ts` PATCH handler, after the `transitionToPurchased` fire-and-forget block (line ~156): add a parallel fire-and-forget block — if `newStatus === 'PASSED'` and `existing.calendarEventId`, call `deleteCalendarEvent` (best-effort, catch and log errors)

- [x] Task 6: Settings UI — Integrations section (AC: 1, 7)
  - [x] 6.1 Add "Integrations" tab/section to `app/settings/page.tsx`, with `?tab=integrations&connected=true` query-param handling to show success toast
  - [x] 6.2 Render "Connect Google Calendar" button (with permission description text) when not connected; show connected account email + "Disconnect" button when connected
  - [x] 6.3 Update `app/api/user/settings/route.ts` GET to query `GoogleCalendarToken` and expose `googleCalendarConnected: boolean` and `googleCalendarEmail: string | null`

- [x] Task 7: Meeting scheduling UI (AC: 2, 3, 4)
  - [x] 7.1 Add "Schedule Meeting" button to listing detail page (`app/listings/[id]/page.tsx`) when opportunity exists
  - [x] 7.2 Implement `MeetingModal` component (`src/components/MeetingModal.tsx`) with datetime-local picker, location input; capture browser timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone` and include in POST body
  - [x] 7.3 Auto-derive `meetingType` from opportunity status (`pre-PURCHASED → 'buy'`, `LISTED → 'sell'`) with user override available only when ambiguous
  - [x] 7.4 Display scheduled meeting info (date, location, Google Calendar link) in listing detail; on `CALENDAR_AUTH_REQUIRED` response show toast
  - [x] 7.5 On cancel meeting: DELETE to `/api/opportunities/[id]/meeting` with confirmation

- [x] Task 8: Tests (AC: 1-8)
  - [x] 8.1 Unit tests for `src/lib/google-calendar.ts` — OAuth URL + state construction, event payload building, timezone inclusion, token refresh order (DB write before API call), 404 re-create logic
  - [x] 8.2 Unit tests for `src/lib/google-calendar-token-store.ts` — store/retrieve/delete with encryption; delete succeeds when record absent
  - [x] 8.3 Unit tests for `app/api/opportunities/[id]/meeting/route.ts` — POST saves data first, update handles stale ID, DELETE treats 404 as success, disconnected calendar = save without error
  - [x] 8.4 Unit test for PASSED status hook in `app/api/opportunities/[id]/route.ts` — verifies fire-and-forget calendar deletion triggered
  - [x] 8.5 E2E acceptance tests in `test/acceptance/features/E-012-meeting-logistics.feature`

## Dev Notes

### Scope Clarification

This story adds:
1. A "connect Google Calendar" OAuth flow (Settings → Integrations)
2. New meeting fields on Opportunity (meetingTime, meetingLocation, meetingType, calendarEventId)
3. Meeting scheduling UI on the listing detail page
4. Automatic calendar event lifecycle (create on schedule, update on reschedule, delete on cancel/PASSED)

The **meeting concept is NEW** — there is no existing meeting model. A "meeting" in this system is a set of fields on an Opportunity record; when both `meetingTime` and `meetingLocation` are set (and Google Calendar is connected), a calendar event is auto-created.

### Critical Constraints (Do Not Skip)

**Timezone (Critical):** Google Calendar API requires an IANA timezone string (`America/Los_Angeles`, not `UTC-8`) on all `dateTime` fields. Without it, events appear at the wrong time for users. The app has no stored timezone — capture it from the browser at the time of form submission:
```typescript
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
// Include in POST body: { meetingTime, meetingLocation, meetingType, timezone }
```
Validate that `timezone` is a non-empty string on the server. Pass it to Google Calendar as `start.timeZone` and `end.timeZone`.

**Google OAuth Restricted Scope (Production Concern):** The `calendar.events` scope is a **restricted scope** per Google's OAuth verification policy. Development and internal testing (up to 100 users) works without verification. Production launch with external users requires completing Google's Security Assessment (4–6 weeks). This is NOT a blocker for development, but must be resolved before public launch. Document this in the handoff notes.

**Decoupled Storage (Critical):** Meeting data (`meetingTime`, `meetingLocation`, `meetingType`) MUST be saved to the DB before any Google Calendar API call is attempted. If the calendar call fails, the meeting is still recorded. Calendar event creation is best-effort, not transactional.

**CSRF State Expiry:** The OAuth state token must have a **10-minute TTL**. Structure: `HMAC-SHA256(userId + ":" + timestamp)` where timestamp is Unix seconds. On callback, verify HMAC and reject if `now - timestamp > 600`.

**Stale Calendar Event IDs:** Users can delete calendar events manually in Google Calendar. When `updateCalendarEvent` receives a 404, re-create the event and save the new `calendarEventId`. When `deleteCalendarEvent` receives a 404, treat it as success (idempotent).

**Disconnect Always Deletes Token:** Call Google's revoke endpoint first, but delete the `GoogleCalendarToken` row regardless of revoke success. Use `.catch(() => {})` on the revoke call — same pattern as `deleteToken()` in `src/scrapers/facebook/token-store.ts`.

**PASSED Status Hook:** The `app/api/opportunities/[id]/route.ts` PATCH handler has an existing fire-and-forget pattern for `PURCHASED` at line ~156. Add a parallel block for `PASSED` that deletes the calendar event if `existing.calendarEventId` is set. This is a **fire-and-forget** — do NOT block the PATCH response on it.

**meetingType Auto-Derivation:** Derive from opportunity status. If `status` is `IDENTIFIED` or `CONTACTED`, type = `'buy'`. If `status` is `LISTED`, type = `'sell'`. Allow user override for `PURCHASED` (ambiguous — could be meeting seller to exchange goods or early listing meetup). Send the derived value from the frontend as the default, user can change it in the modal.

**onDelete: Cascade on GoogleCalendarToken:** The model MUST include the User relation with `onDelete: Cascade` so tokens are removed when a user account is deleted.

**Redirect URI Exact Match:** `GOOGLE_CALENDAR_REDIRECT_URI` must be registered EXACTLY (character-for-character, including trailing slash or lack thereof) in the Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client. Any mismatch causes `redirect_uri_mismatch` error. In development: `http://localhost:3000/api/integrations/google-calendar/callback` (no trailing slash).

**Settings Page Tab Navigation:** The OAuth callback redirects to `/settings?tab=integrations&connected=true`. The Settings page must handle this query param to (a) switch to the Integrations tab, and (b) show a success toast "Google Calendar connected."

### Database Schema Changes

Add to `prisma/schema.prisma`:

```prisma
// Story 12.1: Google Calendar OAuth tokens — stores encrypted access + refresh tokens
model GoogleCalendarToken {
  id            String   @id @default(cuid())
  userId        String   @unique
  accessToken   String   // AES-256 encrypted
  refreshToken  String   // AES-256 encrypted
  expiresAt     DateTime
  calendarEmail String?  // Google account email for display in Settings
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([userId])
  @@index([expiresAt])
}
```

Add to the `Opportunity` model (between existing fields):
```prisma
  // Story 12.1: Meeting scheduling fields
  meetingTime     DateTime?  // Scheduled meeting date and time
  meetingLocation String?    // Meeting address or description
  meetingType     String?    // 'buy' | 'sell'
  calendarEventId String?    // Google Calendar event ID for update/delete
```

### Google Calendar Service (`src/lib/google-calendar.ts`)

**Library:** Use the `googleapis` npm package (official Google client for Node.js). Install: `pnpm add googleapis`.

**OAuth Scopes:** `https://www.googleapis.com/auth/calendar.events` — minimal scope, write access to events only (not full calendar read). This reduces OAuth consent screen friction.

**Key functions to implement:**

```typescript
// Generate OAuth consent URL with CSRF state token
getOAuthUrl(state?: string): string

// Exchange authorization code for access + refresh tokens
exchangeCode(code: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date; email: string }>

// Refresh an expired access token using stored refresh token
refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }>

// Ensure userId has a valid (non-expired) token; auto-refresh or throw
ensureValidToken(userId: string): Promise<string>  // returns valid access token

// Create a calendar event; returns the Google event ID
createCalendarEvent(accessToken: string, event: CalendarEventInput): Promise<string>

// Update an existing calendar event by Google event ID
updateCalendarEvent(accessToken: string, eventId: string, event: Partial<CalendarEventInput>): Promise<void>

// Delete a calendar event by Google event ID
deleteCalendarEvent(accessToken: string, eventId: string): Promise<void>
```

**Event payload structure:**
```typescript
interface CalendarEventInput {
  title: string;       // e.g. "Buy: iPhone 14 Pro (OfferUp)"
  startTime: Date;     // meetingTime
  endTime: Date;       // meetingTime + 1 hour (default duration)
  location: string;    // meetingLocation
  description: string; // item details, seller/buyer name+contact, link to listing
}
```

**Token refresh logic (ensureValidToken):**
- Load token from DB via `google-calendar-token-store.ts`
- If `expiresAt - now < 5 minutes`: call `refreshAccessToken(refreshToken)`
- On refresh success: update stored token in DB
- On refresh failure (e.g. token revoked): throw `CalendarAuthRequiredError` with `code: CALENDAR_AUTH_REQUIRED`

### Token Store (`src/lib/google-calendar-token-store.ts`)

Mirror `src/scrapers/facebook/token-store.ts` pattern exactly:
- `storeToken(userId, accessToken, refreshToken, expiresAt, email)` — encrypt both tokens using `encrypt()` from `@/lib/crypto`
- `getToken(userId)` — decrypt and return
- `deleteToken(userId)` — remove from DB
- `hasValidToken(userId)` — check if non-expired token exists

### OAuth API Routes

**`GET /api/integrations/google-calendar/connect`** — generate OAuth URL, redirect user to Google consent screen. Use `state` param (CSRF) = short-lived HMAC of userId + timestamp.

**`GET /api/integrations/google-calendar/callback`** — called by Google after consent:
1. Validate state param (CSRF check)
2. Exchange code for tokens
3. Store tokens in `GoogleCalendarToken` via token store
4. Redirect to `/settings?tab=integrations&connected=true`

**`GET /api/integrations/google-calendar`** — return `{ connected: boolean, email: string | null }`. Checks if `GoogleCalendarToken` row exists for user.

**`DELETE /api/integrations/google-calendar`** — disconnect:
1. Call Google's revoke endpoint: `https://oauth2.googleapis.com/revoke?token={accessToken}`
2. Delete token from DB (regardless of revoke success)
3. Return `{ success: true }`

### Meeting Route (`app/api/opportunities/[id]/meeting/route.ts`)

**`POST /api/opportunities/[id]/meeting`**

Body: `{ meetingTime: ISO string, meetingLocation: string, meetingType: 'buy' | 'sell' }`

Logic:
1. Validate ownership of opportunity
2. Validate fields (meetingTime must be future, location required)
3. Check if Google Calendar is connected (`hasValidToken(userId)`)
4. If connected: call `ensureValidToken` → create/update calendar event
   - If `calendarEventId` already exists on opportunity: call `updateCalendarEvent`
   - If no `calendarEventId`: call `createCalendarEvent`, store returned event ID
5. Update opportunity: `meetingTime`, `meetingLocation`, `meetingType`, `calendarEventId`
6. If Calendar not connected: update opportunity fields only (no error)
7. Handle `CalendarAuthRequiredError` → return `{ success: false, error: { code: 'CALENDAR_AUTH_REQUIRED' } }` with 401

**`DELETE /api/opportunities/[id]/meeting`**

Logic:
1. Validate ownership
2. If `calendarEventId` exists and Calendar connected: call `deleteCalendarEvent`
3. Clear meeting fields: `meetingTime = null, meetingLocation = null, meetingType = null, calendarEventId = null`
4. Return `{ success: true }`

### Settings UI — Integrations Section

Add new "Integrations" tab to settings (or a new section within the existing page). Follow the existing tab/section pattern in `app/settings/page.tsx`.

**Connected state display:**
```
Google Calendar ✓ Connected (your-email@gmail.com)  [Disconnect]
```

**Disconnected state display:**
```
Google Calendar  [Connect Google Calendar]
```

The "Connect" button should navigate to `/api/integrations/google-calendar/connect` (server redirect to Google OAuth). The "Disconnect" button calls `DELETE /api/integrations/google-calendar`.

Expose `googleCalendarConnected: boolean` and `googleCalendarEmail: string | null` from `GET /api/user/settings`. Derive these from a DB lookup for the token (or add a service call).

### Meeting Scheduling UI

In `app/listings/[id]/page.tsx`, when the listing has an associated opportunity:

- Show "Schedule Meeting" button (for status IDENTIFIED/CONTACTED)
- Show meeting summary if already scheduled (date, location, "Update" / "Cancel meeting" options)

**`MeetingModal` component** (`src/components/MeetingModal.tsx`):
- `<input type="datetime-local">` for date/time
- Text input for location
- Radio/select for meetingType (Buy / Sell)
- Submit calls POST; cancel button calls DELETE with confirmation
- On `CALENDAR_AUTH_REQUIRED` response: show toast "Reconnect Google Calendar in Settings"

### Encryption

Use existing `encrypt()` / `decrypt()` from `@/lib/crypto` for both `accessToken` and `refreshToken`. These tokens are credentials — never store plaintext.

### Environment Variables

Add to `.env.example` and GCP Secret Manager (production):
```
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/integrations/google-calendar/callback
```

In GCP: OAuth credentials come from the Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID (Web Application type). Add production redirect URI there as well.

### Graceful Degradation

If `GOOGLE_CALENDAR_CLIENT_ID` is not set in env, the "Connect Google Calendar" button should be hidden/disabled with a tooltip "Not configured". The meeting scheduling flow works regardless — meeting fields are stored whether or not Calendar is connected.

### Error Handling

Use existing `handleError()` from `@/lib/errors`. For calendar-specific errors:
- Token expired / revoked → `CALENDAR_AUTH_REQUIRED` (401)
- Google API error (5xx) → `ExternalServiceError` → 503
- Opportunity not found → `NotFoundError` → 404

### Auth Pattern

All new API routes use `getCurrentUserId()` from `@/lib/auth` (Firebase session cookie). Follow the standard `if (!userId) throw new UnauthorizedError(...)` pattern.

### Project Structure Notes

New files:
```
src/lib/google-calendar.ts              — service (OAuth, event CRUD, token refresh)
src/lib/google-calendar-token-store.ts  — encrypted token DB wrapper
src/components/MeetingModal.tsx         — meeting scheduling modal
app/api/integrations/google-calendar/connect/route.ts
app/api/integrations/google-calendar/callback/route.ts
app/api/integrations/google-calendar/route.ts
app/api/opportunities/[id]/meeting/route.ts
```

Modified files:
```
prisma/schema.prisma                    — GoogleCalendarToken model + Opportunity meeting fields
app/settings/page.tsx                   — Integrations section + ?tab=integrations query param
app/api/user/settings/route.ts          — expose googleCalendarConnected + googleCalendarEmail
app/api/opportunities/[id]/route.ts     — PASSED status → calendar deletion hook
app/listings/[id]/page.tsx              — meeting scheduling UI
helpers/secrets.py                      — add GOOGLE_CALENDAR_CLIENT_ID/SECRET (FR-INFRA-11)
.env.example                            — GOOGLE_CALENDAR_* vars
```

### References

- FacebookToken OAuth pattern: [Source: src/scrapers/facebook/token-store.ts]
- Encrypt/decrypt: [Source: src/lib/crypto.ts]
- Error hierarchy: [Source: src/lib/errors.ts]
- Auth middleware: [Source: src/lib/auth.ts]
- Settings API: [Source: app/api/user/settings/route.ts]
- Opportunity route: [Source: app/api/opportunities/[id]/route.ts]
- Epic 12 requirements: [Source: _bmad-output/planning-artifacts/epics.md#Epic-12-Stories]
- FR-MEET-01: [Source: _bmad-output/planning-artifacts/epics.md#functional-requirements]
- Prisma singleton: [Source: src/lib/db.ts]
- Google Calendar API docs: https://developers.google.com/calendar/api/v3/reference
- googleapis npm: https://www.npmjs.com/package/googleapis

## Acceptance Tests

File: `test/acceptance/features/E-012-meeting-logistics.feature`

**Sequential numbering:** E-012-S-1 through E-012-S-8 (Story 12.2 scenarios continue from S-9).

```gherkin
Feature: Google Calendar Integration
  Background:
    Given the user is authenticated with a PRO subscription

  @story-12-1 @FR-MEET-01 @E-012-S-1
  Scenario: User connects Google Calendar via OAuth
    Given the user navigates to Settings and the Integrations section
    And Google Calendar is not connected
    When the user clicks "Connect Google Calendar"
    Then the user is redirected to the Google OAuth consent screen requesting the "calendar.events" scope
    When the user grants consent and is redirected back to the app
    Then the Settings Integrations section shows "Connected" with the user's Google account email
    And no "Connect Google Calendar" button is visible

  @story-12-1 @FR-MEET-01 @E-012-S-2
  Scenario: Calendar event created when meeting is scheduled with time and location
    Given the user has Google Calendar connected
    And an opportunity exists with status "IDENTIFIED"
    When the user opens the Schedule Meeting modal on the listing detail page
    And enters meetingTime "2026-05-01T14:00:00" and meetingLocation "456 Oak Ave, Seattle, WA"
    And the browser timezone is "America/Los_Angeles"
    And submits the form
    Then the listing detail page displays the meeting date, time, and location
    And a Google Calendar event exists with title containing the listing title
    And the event start time is 2:00 PM and end time is 3:00 PM in the America/Los_Angeles timezone
    And the event location is "456 Oak Ave, Seattle, WA"

  @story-12-1 @FR-MEET-01 @E-012-S-3
  Scenario: Calendar event updated when meeting is rescheduled
    Given the user has Google Calendar connected
    And an opportunity has a scheduled meeting with a valid calendarEventId
    When the user opens the Schedule Meeting modal and updates the meetingTime to "2026-05-02T10:00:00"
    And submits the form
    Then the listing detail page shows the updated meeting date and time
    And the original Google Calendar event is updated in place (same event ID)
    And no duplicate calendar event is created

  @story-12-1 @FR-MEET-01 @E-012-S-4
  Scenario: Calendar event deleted when meeting is cancelled
    Given the user has Google Calendar connected
    And an opportunity has a scheduled meeting with a valid calendarEventId
    When the user clicks "Cancel meeting" on the listing detail page and confirms
    Then the listing detail page no longer shows any meeting information
    And the Google Calendar event is deleted
    And the opportunity record has null meetingTime, meetingLocation, and calendarEventId

  @story-12-1 @FR-MEET-01 @E-012-S-5
  Scenario: Calendar event deleted in background when opportunity transitions to PASSED
    Given the user has Google Calendar connected
    And an opportunity has a scheduled meeting with a valid calendarEventId
    When the user marks the opportunity as PASSED
    Then the PATCH response returns successfully without delay
    And the associated Google Calendar event is deleted in the background
    And no error toast is shown to the user

  @story-12-1 @FR-MEET-01 @E-012-S-6
  Scenario: Re-authentication prompt shown when Calendar token cannot be refreshed
    Given the user has Google Calendar connected with a revoked refresh token
    When the user schedules a meeting with valid meetingTime and meetingLocation
    Then the meeting data is saved to the database
    And a toast message "Reconnect Google Calendar in Settings" is displayed
    And the Settings Integrations section shows Google Calendar as disconnected

  @story-12-1 @FR-MEET-01 @E-012-S-7
  Scenario: Disconnect removes token from DB regardless of Google revoke outcome
    Given the user has Google Calendar connected
    And Google's revoke endpoint is unavailable
    When the user clicks "Disconnect" in Settings Integrations
    Then the Settings Integrations section shows Google Calendar as not connected
    And the GoogleCalendarToken row is removed from the database
    And the Connect button is visible again

  @story-12-1 @FR-MEET-01 @E-012-S-8
  Scenario: Meeting fields saved without error when Google Calendar is not connected
    Given the user does not have Google Calendar connected
    And an opportunity exists
    When the user schedules a meeting with valid meetingTime and meetingLocation
    Then the listing detail page displays the scheduled meeting date and location
    And no error or warning is shown to the user
    And the opportunity record has meetingTime and meetingLocation saved to the database
    And calendarEventId remains null
```

## Requirement Traceability

| FR | AC | Scenario Tag | Notes |
|---|---|---|---|
| FR-MEET-01 | AC1 — OAuth connect flow | `@E-012-S-1` | E2E: consent screen, settings UI |
| FR-MEET-01 | AC2 — Calendar event created on meeting schedule | `@E-012-S-2` | E2E: modal → DB → Google event |
| FR-MEET-01 | AC3 — Calendar event updated on reschedule | `@E-012-S-3` | E2E: same event ID, no duplicate |
| FR-MEET-01 | AC4 — Calendar event deleted on cancel | `@E-012-S-4` | E2E: null fields + event deletion |
| FR-MEET-01 | AC5 — PASSED status → calendar deletion hook | `@E-012-S-5` | E2E: fire-and-forget, no delay |
| FR-MEET-01 | AC6 — Token refresh; CALENDAR_AUTH_REQUIRED on failure | `@E-012-S-6` | E2E: toast + disconnected state |
| FR-MEET-01 | AC7 — Disconnect always removes DB token | `@E-012-S-7` | E2E: revoke failure, token deleted |
| FR-MEET-01 | AC8 — Graceful degradation when not connected | `@E-012-S-8` | E2E: no calendar call, no error |

Step definitions: `test/acceptance/step_definitions/E-12-meeting-logistics.steps.ts`

## What This Feature Does NOT Support (v1 Negative Requirements)

Document these explicitly — they are intentional, not oversights:

- **Primary calendar only** — writes to the user's primary Google Calendar; does not support selecting alternate calendars
- **No recurring events** — each meeting creates a single, non-recurring event
- **Write-only scope** — uses `calendar.events` scope only; cannot read existing events, check availability, or detect conflicts
- **No guest invites** — calendar events are personal reminders; no invite emails are sent to buyers/sellers
- **No alternative calendar providers** — Google Calendar only; Outlook, Apple Calendar, and other providers are out of scope for v1
- **No meeting duration customization** — all events are fixed at 1 hour; user cannot adjust duration
- **No conflict detection** — does not check whether the user already has a calendar event at the scheduled time
- **No meetingType values beyond 'buy' | 'sell'** — the type is binary and auto-derived from opportunity status
- **No two-way sync** — if the user deletes or edits the event in Google Calendar directly, the app is not notified (calendarEventId may become stale, which is handled via 404 re-creation)
- **No bulk meeting operations** — meeting scheduling and cancellation is per-opportunity only
- **No location geocoding** — location is stored and passed as free-text; no lat/lng lookup or validation
- **No Google Calendar push notifications** — the app does not subscribe to Google Calendar change webhooks

**Production deployment note:** The `calendar.events` scope is classified as a **Google OAuth Restricted Scope**. Development and internal testing (≤100 users) works without verification. Before public launch, a Google Security Assessment (4–6 weeks) is required. This is explicitly out of scope for this story but must be resolved before GA.

## Definition of Done

> Full gate definition: `_bmad-output/project-context.md` → _Story Definition of Done_

### Standard Gates
- [x] All tasks/subtasks `[x]`; every AC (AC1–AC8) satisfied; no `any` in production code
- [x] `make lint` passes — zero ESLint errors
- [x] `make build` passes — strict TypeScript
- [x] `make test` passes — all tests green, zero regressions; coverage ≥96% branches, ≥98% functions, ≥99% lines/statements
- [x] Unit tests added/updated for all new/changed logic
- [x] Every AC has a test at the correct level:
  - AC1, AC2, AC3, AC4, AC7 → UI-visible → full E2E Playwright tests (real browser, real UI interactions)
  - AC5 (PASSED hook), AC6 (token refresh), AC8 (graceful degradation) → service-level Jest tests

### Acceptance Test Gates
- [x] Full acceptance test suite written covering **every AC** (AC1–AC8) — no ACs skipped, no placeholder scenarios, no `@wip`/`@skip`/`@pending` tags
- [x] Every scenario in `test/acceptance/features/E-012-meeting-logistics.feature` is a genuine Playwright E2E journey — real pages, real UI elements, visible outcome assertions
- [x] Every scenario tagged with **ALL THREE**:
  - `@FR-MEET-01` — requirement traceability tag
  - `@story-12-1` — story tag (enables story-level filtering)
  - `@E-012-S-<N>` — globally unique sequential scenario number
- [x] RTM updated (`_bmad-output/test-artifacts/requirements-traceability-matrix.md`) — FR-MEET-01 row filled in with AC → feature file → scenario tag → step definition file
- [x] **FINAL GATE — last action before `Status → review`:**
  - `make test-ac STORY=12.1` executes and passes with zero failures, zero skipped
  - `make test-ac FEATURE=F012` executes and passes cleanly

### Tracking Gates
- [x] Story `Status` → `review`; `sprint-status.yaml` → `review`
- [x] `File List` updated with every new/modified/deleted file
- [x] Trello card moved to Done (trello-axovia)

### Story-Specific Gates
- [x] Timezone is captured from browser (`Intl.DateTimeFormat().resolvedOptions().timeZone`) and passed to Google Calendar API — verified by checking created event shows correct local time
- [x] Stale `calendarEventId` (404) is handled: update re-creates event, delete treats 404 as success
- [x] Meeting data is saved to DB even when Google Calendar API is unavailable (decoupled storage)
- [x] PASSED status transition triggers calendar event deletion (fire-and-forget) — verified by unit test
- [x] `GoogleCalendarToken` has `onDelete: Cascade` — verified in schema migration
- [x] Disconnect deletes token from DB even if Google revoke endpoint fails
- [x] CSRF state has 10-minute TTL enforced
- [x] Privacy policy page (`/privacy`) updated to mention Google Calendar integration (what data is written, how to revoke)
- [x] Handoff note written acknowledging that `calendar.events` is a Google restricted scope requiring Security Assessment before public launch

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- All 8 ACs implemented. 36 new unit tests + 8 acceptance scenarios, all green.
- `make test-ac STORY=12.1`: 8/8 pass. `make test-ac FEATURE=F12`: 8/8 pass.
- Fixed Makefile FEATURE filter to use `--tags "@epic-N"` (Cucumber v12 `paths` in profile was overriding CLI path args).
- Cucumber Expression issue: `America/Los_Angeles` (alternation) and `(same event ID)` (optional group) in step text required regex `/.../` syntax for those two step definitions.
- Privacy policy update (`/privacy` page) completed — added Google Calendar section to 4.1 Third-Party Service Providers.
- Code review (2026-04-11): Fixed 2 critical + 3 high + 3 medium issues:
  - Rewrote acceptance tests from file-inspection to genuine Playwright E2E + service-level (C-1)
  - Updated privacy policy page (C-2)
  - Removed dead `endTime` field from `CalendarEventInput` interface (H-1)
  - Renamed step definitions to `E-012-` convention (H-2)
  - Added `configured: boolean` to GET /integrations/google-calendar and UI graceful degradation (H-3)
  - Added `exchangeCode` unit tests and `endTime` computation assertion (M-1)
  - Fixed `hasValidToken` to use 5-minute refresh buffer matching `ensureValidToken` (M-3)

### File List

**New files:**
- `src/lib/google-calendar.ts`
- `src/lib/google-calendar-token-store.ts`
- `src/components/MeetingModal.tsx`
- `src/components/IntegrationsSettings.tsx`
- `app/api/integrations/google-calendar/connect/route.ts`
- `app/api/integrations/google-calendar/callback/route.ts`
- `app/api/integrations/google-calendar/route.ts`
- `app/api/opportunities/[id]/meeting/route.ts`
- `src/__tests__/google-calendar.test.ts`
- `src/__tests__/google-calendar-token-store.test.ts`
- `src/__tests__/google-calendar-meeting-route.test.ts`
- `src/__tests__/google-calendar-passed-hook.test.ts`
- `test/acceptance/features/E-012-meeting-logistics.feature`
- `test/acceptance/step_definitions/E-012-meeting-logistics.steps.ts`

**Modified files:**
- `prisma/schema.prisma`
- `app/settings/page.tsx`
- `app/api/user/settings/route.ts`
- `app/api/opportunities/[id]/route.ts`
- `app/api/integrations/google-calendar/route.ts`
- `app/listings/[id]/page.tsx`
- `app/api/opportunities/[id]/meeting/route.ts`
- `app/privacy/page.tsx`
- `helpers/secrets.py`
- `.env.example`
- `src/__tests__/api/user-settings.test.ts`
- `src/__tests__/google-calendar.test.ts`
- `src/lib/google-calendar.ts`
- `src/lib/google-calendar-token-store.ts`
- `src/components/IntegrationsSettings.tsx`
- `Makefile`
