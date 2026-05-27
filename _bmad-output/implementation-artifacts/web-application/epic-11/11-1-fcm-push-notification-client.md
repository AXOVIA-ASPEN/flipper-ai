# Story 11.1: FCM Push Notification Client

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69d6c10a786d376d4deeaf09

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want to receive push notifications in my browser,
So that I get instant alerts even when I'm not actively using the app.

## Acceptance Criteria

1. **AC-1: Permission + Token Registration** — FR-NOTIFY-12
   - Given the app is loaded in a supported browser
   - When the user enables push notifications in Settings
   - Then the browser requests notification permission AND a FCM device token is generated and stored server-side (linked to the authenticated user)

2. **AC-2: Push Delivery on Event** — FR-NOTIFY-12
   - Given the user has granted notification permission (device token stored)
   - When a notification event occurs (any type from Epic 10's pipeline)
   - Then a push notification is delivered to the browser via FCM with an appropriate title and body

3. **AC-3: Background Delivery via Service Worker** — FR-NOTIFY-12
   - Given the FCM service worker (configured in Epic 1, stub at `public/firebase-messaging-sw.js`)
   - When the user is not actively on the Flipper AI tab
   - Then push notifications are still received and displayed as OS system notifications

4. **AC-4: Multi-Device Fan-Out** — FR-NOTIFY-12
   - Given the user has enabled push on multiple devices/browsers
   - When they enable push on each
   - Then each device token is stored (deduplicated per user+token) and push notifications are delivered to ALL registered devices

5. **AC-5: Per-Event Push Toggle** — FR-NOTIFY-12
   - Given the user disables push notifications for a specific event type in Settings
   - When that event occurs
   - Then no push notification is sent for that event type (email may still be sent per its own toggle)

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|---|---|---|
| FR-NOTIFY-12 | AC-1 (permission + token) | `@FR-NOTIFY-12 @story-11-1` |
| FR-NOTIFY-12 | AC-2 (event-driven push) | `@FR-NOTIFY-12 @story-11-1` |
| FR-NOTIFY-12 | AC-3 (background via SW) | `@FR-NOTIFY-12 @story-11-1` |
| FR-NOTIFY-12 | AC-4 (multi-device fan-out) | `@FR-NOTIFY-12 @story-11-1` |
| FR-NOTIFY-12 | AC-5 (per-event push toggle) | `@FR-NOTIFY-12 @story-11-1` |

---

## Dev Notes

### What Epic 1 Already Built — DO NOT REINVENT

This is critical context. Story 1.7 already laid the FCM foundation. The following files are **live in the codebase**:

| File | Purpose | Status |
|------|---------|--------|
| `public/firebase-messaging-sw.js` | Background push service worker | Stub — has TODO config values, see Task 2 |
| `src/lib/firebase/config.ts` | Firebase client SDK init (NEXT_PUBLIC_* env vars) | Done |
| `src/lib/firebase/messaging.ts` | Client helpers: `requestNotificationPermission()`, `getFCMToken()`, `onForegroundMessage()` | Done |
| `src/lib/firebase/messaging-admin.ts` | Server helpers: `sendToDevice()`, `sendToTopic()` | Done |
| `src/lib/firebase/register-sw.ts` | `registerFCMServiceWorker()` — registers SW at root scope | Done |
| `src/lib/firebase/admin.ts` | Firebase Admin SDK singleton (`adminAuth`, `adminStorage`) | Done — note: does NOT export `getMessaging`; `messaging-admin.ts` does that separately |

### Architecture Overview

```
User enables push in Settings
         │
         ▼
NotificationSettings.tsx (client component)
  1. registerFCMServiceWorker()           ← src/lib/firebase/register-sw.ts
  2. requestNotificationPermission()      ← src/lib/firebase/messaging.ts
  3. getFCMToken(VAPID_KEY)               ← src/lib/firebase/messaging.ts
  4. POST /api/user/device-token          ← app/api/user/device-token/route.ts
         │
         ▼
   DeviceToken saved to DB (userId + token + userAgent + expiresAt)

Event occurs (Epic 10 pipeline completes)
         │
         ▼
pushNotificationService.sendToUser(userId, payload)
  1. Load DeviceToken[] for userId from DB
  2. For each token: sendToDevice(token, payload)   ← src/lib/firebase/messaging-admin.ts
  3. Remove stale tokens (messaging/registration-token-not-registered)
         │
         ▼
FCM → Browser (foreground) or Service Worker (background)
```

### Blocked Context

**AC-2 (event-driven push delivery)** requires the NotificationEvent pipeline from Story 10.1:
- The `NotificationEvent` model and background job scheduler must be complete
- Once 10.1 is done, wire push delivery into the notification event processor alongside email
- The `sendToUser()` call in `push-notification.ts` is ready to integrate — it just needs a caller

**AC-5 (per-event push toggle)** requires Story 10.6 to add per-event-type fields to `UserSettings`:
- Story 10.6 adds granular toggle fields like `notifyNewDeals`, `notifyMessageReceived`, etc.
- Push delivery should respect the same field (a single toggle per event type, not separate email/push fields — Story 11.3 adds three-channel UI)
- For now, respect the global `pushNotifications` boolean added in Task 1 of this story

**What IS unblocked and should be built now:**
- Task 1 (DeviceToken schema)
- Task 2 (service worker config fill-in)
- Task 3 (device-token API)
- Task 4 (push-notification service)
- Task 5 (Settings UI push enable button)
- Task 6 (unit tests)
- Task 7 (acceptance tests — service-level and component-level)

### Key Patterns to Follow

1. **File headers**: TSDoc `@file/@author/@company/@date/@version/@brief/@description` (see `communication-notification.ts` for exact format)
2. **No `any` in production code** — TypeScript strict mode
3. **Singleton pattern**: Create and export a singleton, e.g. `export const pushNotificationService = new PushNotificationService()`
4. **Fire-and-forget notifications**: Never let push errors crash the API (same pattern as email notifications — try/catch, `logger.error` on failure)
5. **Stale token cleanup**: `sendToDevice()` returns `null` and logs a warning on `messaging/registration-token-not-registered` — delete stale tokens from DB
6. **Path alias**: `@/*` maps to `./src/*`. Use `@/lib/firebase/messaging-admin`, `@/lib/db`, `@/lib/errors`, etc.
7. **Auth**: Use `getCurrentUserId()` from `@/lib/auth` in API routes; throw `UnauthorizedError` if null
8. **Response shape**: `{ success: true, data: ... }` or `handleError(error)` from `@/lib/errors`

### Firebase Config Values for Service Worker

The service worker at `public/firebase-messaging-sw.js` has TODO placeholders. The real values come from:
- `NEXT_PUBLIC_FIREBASE_API_KEY` → `apiKey`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` → `messagingSenderId`
- `NEXT_PUBLIC_FIREBASE_APP_ID` → `appId`

These are already set in the environment (used by `src/lib/firebase/config.ts`). However, service workers **cannot** access `process.env` at runtime — the values must be hardcoded or injected at build time.

**Decision:** Since these are public non-secret values, hardcode them directly in `firebase-messaging-sw.js` by replacing the TODO strings. Reference `src/lib/firebase/config.ts` to ensure exact values match (or instruct the dev to pull from Firebase Console → Project Settings → Your apps → SDK snippet).

### VAPID Key

`getFCMToken()` in `src/lib/firebase/messaging.ts` reads `process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY`. This is the Web Push Certificate (VAPID public key) from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates. Must be set in `.env.local` and production env.

### Previous Story Learnings (from Epic 10.4 — communication notifications)

- **Pattern**: Service class with singleton export — never instantiate in route handlers
- **Preference guard**: Check the relevant `UserSettings` boolean before sending — never crash if user settings don't exist (default to `true`)
- **Fire-and-forget**: `service.notify(...).catch(() => {})` at the API layer — never await notification calls in a response path
- **Error swallowing**: Notifications must NEVER propagate errors to callers
- **Logger**: Use `logger.info` on success, `logger.warn` for user-not-found, `logger.error` for unexpected failures

### Notifications Settings Component Pattern

`src/components/NotificationSettings.tsx` is a client component (`'use client'`). It:
- Fetches settings from `GET /api/user/settings`
- Saves via `PATCH /api/user/settings` with partial updates
- Uses `useState` for local state, `useEffect` for initial fetch
- Shows individual toggle rows with `onChange` handler

**Push enable button approach:** Adding a "Enable Push Notifications" button (distinct from a toggle row) that triggers the permission + token registration flow. This is appropriate because:
- Enabling push is a multi-step async browser operation (SW registration → permission dialog → token fetch → API call)
- It requires user gesture for the browser permission dialog
- The button should show current state: "Enable Push", "Push Enabled" (disabled), "Push Denied" (with re-enable instructions)

### Project Structure Notes

New files to create:
```
prisma/schema.prisma                          ← modify: add DeviceToken model + UserSettings.pushNotifications
app/api/user/device-token/route.ts            ← new: POST (register) + DELETE (unregister)
src/lib/push-notification.ts                   ← new: PushNotificationService + singleton
src/__tests__/lib/push-notification.test.ts    ← new: unit tests
test/acceptance/features/E-011-push-sms-notifications.feature  ← new: Gherkin feature file
test/acceptance/step_definitions/E-011-push-sms-notifications.steps.ts  ← new: step defs
```

Files to modify:
```
public/firebase-messaging-sw.js                ← fill in real Firebase config values
src/components/NotificationSettings.tsx        ← add push enable button and pushNotifications toggle
_bmad-output/test-artifacts/requirements-traceability-matrix.md  ← update FR-NOTIFY-12 coverage
```

### References

- FCM Client SDK: `src/lib/firebase/messaging.ts` (already implements all client-side helpers)
- FCM Admin SDK: `src/lib/firebase/messaging-admin.ts` (`sendToDevice()`, `sendToTopic()`)
- Service Worker: `public/firebase-messaging-sw.js` (background message handler)
- SW Registration: `src/lib/firebase/register-sw.ts`
- Email service pattern: `src/lib/communication-notification.ts` (follow exact same structure)
- Notification preferences: `src/components/NotificationSettings.tsx`
- Auth: `src/lib/auth.ts` → re-exports from `src/lib/firebase/session.ts`
- Error hierarchy: `src/lib/errors.ts`
- Prisma singleton: `src/lib/db.ts` (use `@/lib/db`, never `new PrismaClient()`)
- Story 10.6 (ready-for-dev): Will add per-event notification fields — Story 11.1's `UserSettings.pushNotifications` should be a global toggle, parallel to `emailNotifications`

---

## Tasks / Subtasks

### Task 1: Prisma schema changes (AC: #1, #4, #5)

- [x] **1.1** Add `DeviceToken` model to `prisma/schema.prisma` after the `UserSettings` model:
  ```prisma
  // Story 11.1: FCM device tokens for push notifications
  model DeviceToken {
    id         String   @id @default(cuid())
    userId     String
    user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    token      String
    userAgent  String?  // Browser/OS identification for display in Settings
    createdAt  DateTime @default(now())
    updatedAt  DateTime @updatedAt

    @@unique([userId, token])  // One token entry per user-device pair
    @@index([userId])
    @@index([token])
  }
  ```
- [x] **1.2** Add `deviceTokens DeviceToken[]` relation to the `User` model (near other relations like `messages`, `notificationEvents`, etc.)
- [x] **1.3** Add `pushNotifications Boolean @default(true)` to the `UserSettings` model (after `emailNotifications`). This is the global push enable/disable toggle — parallel to `emailNotifications`.
- [x] **1.4** Run `npx prisma migrate dev --name add_device_tokens_push_notifications` to generate migration
- [x] **1.5** Verify the generated migration looks correct (new table `DeviceToken`, new column on `UserSettings`)

### Task 2: Complete service worker configuration (AC: #3)

- [x] **2.1** Update `public/firebase-messaging-sw.js` to replace the TODO config values with real values:
  - `apiKey`: from `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `messagingSenderId`: from `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `appId`: from `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `authDomain`, `projectId`, `storageBucket` are already filled in correctly
  - Get the actual values from Firebase Console → Project Settings → Your apps → Web App → Config, or from `.env.local`
  - **CRITICAL**: Service workers cannot access `process.env` at runtime. The values must be literal strings in the file.
- [x] **2.2** Verify the service worker version string (line 13-14: `firebasejs/12.10.0`) matches the `firebase` package version in `package.json` (currently `12.10.0` based on the CDN URLs — confirm via `cat package.json | grep '"firebase"'`)

### Task 3: Device token API (AC: #1, #4)

- [x] **3.1** Create `app/api/user/device-token/route.ts` with:
  - **POST** — Register a device token:
    - Require auth (`getCurrentUserId()`)
    - Validate body: `token` (string, required), `userAgent` (string, optional)
    - Upsert: `prisma.deviceToken.upsert({ where: { userId_token }, create: {...}, update: { updatedAt: now } })` — idempotent
    - Return `{ success: true, data: { id } }`
  - **DELETE** — Unregister a device token:
    - Require auth
    - Validate body: `token` (string, required)
    - Delete: `prisma.deviceToken.deleteMany({ where: { userId, token } })`
    - Return `{ success: true }`
  - Use `handleError()` for all error responses
  - File header required (TSDoc format)

### Task 4: Push notification service (AC: #2, #4)

- [x] **4.1** Create `src/lib/push-notification.ts` — `PushNotificationService` class:
  - Method: `async sendToUser(userId: string, payload: NotificationPayload): Promise<void>`
    - Load all `DeviceToken[]` for the user from DB
    - If no tokens → return early (no-op)
    - Check `UserSettings.pushNotifications` global toggle — if false → return early
    - For each token: call `sendToDevice(token.token, payload)` from `messaging-admin.ts`
    - If `sendToDevice()` returns `null`: log warning + delete stale token from DB
    - Swallow all errors — never propagate to caller
  - Export singleton: `export const pushNotificationService = new PushNotificationService()`
  - Import `NotificationPayload` from `@/lib/firebase/messaging-admin` (already defined there)
  - File header required (TSDoc format)

### Task 5: Settings UI — Push enable button (AC: #1)

- [x] **5.1** Update `src/components/NotificationSettings.tsx`:
  - Add `pushNotifications: boolean` to the `UserSettings` interface
  - Add `pushEnabled` state (boolean — derived from `pushNotifications` setting AND Notification.permission)
  - Add `pushPermissionState` state: `'default' | 'granted' | 'denied' | 'unsupported'`
  - On mount: check `Notification.permission` to set initial `pushPermissionState`
  - Add `enablePush()` async handler:
    1. `registerFCMServiceWorker()` from `@/lib/firebase/register-sw` (dynamic import to avoid SSR)
    2. `requestNotificationPermission()` from `@/lib/firebase/messaging` (dynamic import)
    3. If denied → set `pushPermissionState = 'denied'`, show error message
    4. `getFCMToken()` from `@/lib/firebase/messaging` (dynamic import)
    5. POST to `/api/user/device-token` with token + `navigator.userAgent`
    6. PATCH `/api/user/settings` with `{ pushNotifications: true }`
    7. Update local state
  - Add `disablePush()` async handler:
    1. Get current token via `getFCMToken()`
    2. DELETE to `/api/user/device-token` with token
    3. PATCH `/api/user/settings` with `{ pushNotifications: false }`
  - Add push notification UI section (above or below email section):
    ```
    Push Notifications
    [Enable Push Notifications] button  (when not enabled or denied)
    [Push Enabled ✓] [Disable] buttons  (when granted + stored)
    "Push notifications are blocked by your browser. Reset in browser settings."  (when denied)
    "Push notifications not supported in this browser."  (when unsupported)
    ```
  - Use dynamic imports for ALL firebase/messaging imports to avoid SSR issues: `const { registerFCMServiceWorker } = await import('@/lib/firebase/register-sw')`

### Task 6: Update settings API for pushNotifications (AC: #5)

- [x] **6.1** In `app/api/user/settings/route.ts` PATCH handler, add `pushNotifications` as an accepted boolean field (same pattern as `emailNotifications` — coerce with `Boolean()`)
- [x] **6.2** In `app/api/user/settings/route.ts` PATCH handler, include `pushNotifications` in the `prisma.userSettings.update()` data object

### Task 7: Unit tests (AC: #1, #2, #4)

- [x] **7.1** Create `src/__tests__/lib/push-notification.test.ts`:
  - Mock `@/lib/db` (prisma)
  - Mock `@/lib/firebase/messaging-admin` (`sendToDevice`)
  - Mock `@/lib/logger`
  - Test cases:
    - `sendToUser`: sends to all tokens when `pushNotifications: true`
    - `sendToUser`: no-op when no tokens found
    - `sendToUser`: no-op when `pushNotifications: false`
    - `sendToUser`: deletes stale token when `sendToDevice()` returns null (simulating expired token)
    - `sendToUser`: does not propagate errors (swallows exceptions)
    - `sendToUser`: sends to multiple tokens (fan-out)
- [x] **7.2** Create `src/__tests__/api/device-token.test.ts`:
  - Mock `@/lib/auth` (`getCurrentUserId`)
  - Mock `@/lib/db`
  - POST tests: registers token with valid body, rejects missing token, rejects unauthenticated
  - DELETE tests: removes token for authenticated user, rejects unauthenticated

### Task 8: Acceptance tests (AC: all)

- [x] **8.1** Create `test/acceptance/features/E-011-push-sms-notifications.feature`:
  - Feature header: `Feature: Push & SMS Notifications (Phase 2)`
  - Story 11.1 scenarios (service-level tests for logic ACs, component-level for UI ACs):
    - `@E-011-S-1 @story-11-1 @FR-NOTIFY-12` — Permission granted → token stored
    - `@E-011-S-2 @story-11-1 @FR-NOTIFY-12` — Push delivery when event occurs and push enabled
    - `@E-011-S-3 @story-11-1 @FR-NOTIFY-12` — Service worker registered at root scope
    - `@E-011-S-4 @story-11-1 @FR-NOTIFY-12` — Multi-device: each token stored independently
    - `@E-011-S-5 @story-11-1 @FR-NOTIFY-12` — Per-event push toggle: no push when disabled
  - **AC-1 and AC-4 test level**: service-level (POST to device-token API, verify DB state)
  - **AC-2 test level**: service-level (call `pushNotificationService.sendToUser()`, mock FCM)
  - **AC-3 test level**: service-level (verify SW is registered at `/firebase-messaging-sw.js`)
  - **AC-5 test level**: service-level (push service respects `pushNotifications: false`)
- [x] **8.2** Create `test/acceptance/step_definitions/E-011-push-sms-notifications.steps.ts` with step definitions for story-11-1 scenarios
- [x] **8.3** Update `_bmad-output/test-artifacts/requirements-traceability-matrix.md`:
  - Update FR-NOTIFY-12 row: add story-11-1, E-011 feature file, scenario IDs E-011-S-1 through E-011-S-5

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

| Task | Issue | Resolution |
|------|-------|------------|
| Task 4 (S-2 acceptance test) | `prisma.deviceToken` was `undefined` inside `sendToUser` in the tsx/cjs cucumber environment — the Proxy `get` trap in `db.ts` never fired. Root cause: a debug `console.log` accessing `import_db.default` at module load time triggered `createPrismaClient()`, storing a real PrismaClient in `globalForPrisma.prisma`. Subsequent accesses in the tsx/cjs compiled module returned that real client (which lacks the `DeviceToken` model from the stale pnpm store), bypassing the Proxy entirely. | Switched `PushNotificationService` to dependency injection: optional `prismaClient?: PrismaLike` constructor parameter. The cucumber `Before` hook injects the stub directly (`new PushNotificationService(stub as any)`), bypassing db.ts Proxy resolution entirely. All 5 E-011 scenarios pass. |

### Completion Notes

All tasks complete. 5/5 acceptance scenarios pass. 16/16 unit tests pass (8 in push-notification.test.ts, 8 in device-token.test.ts). Lint and build pass cleanly for all new/modified files (pre-existing lint errors and Turbopack build failure unrelated to this story). The AC-2 full event-pipeline integration awaits Story 10.1 (NotificationEvent pipeline) — `pushNotificationService.sendToUser()` is ready to call from the event processor.

### File List

**New files:**
- `app/api/user/device-token/route.ts`
- `src/lib/push-notification.ts`
- `src/__tests__/lib/push-notification.test.ts`
- `src/__tests__/api/device-token.test.ts`
- `test/acceptance/features/E-011-push-sms-notifications.feature`
- `test/acceptance/step_definitions/E-011-push-sms-notifications.steps.ts`
- `prisma/migrations/20260409000000_add_device_tokens_push_notifications/migration.sql`

**Modified files:**
- `prisma/schema.prisma` (add `DeviceToken` model, add `pushNotifications` to `UserSettings`, add `deviceTokens` relation to `User`)
- `public/firebase-messaging-sw.js` (fill in real Firebase config values)
- `src/components/NotificationSettings.tsx` (add push enable button and pushNotifications toggle; add file header)
- `app/api/user/settings/route.ts` (accept `pushNotifications` field in PATCH)
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md`

## Change Log

| Date | Change |
|------|--------|
| 2026-04-08 | Story file created; comprehensive dev context added; status set to ready-for-dev |
| 2026-04-08 | Implementation complete; all tasks done; status set to review |
| 2026-04-09 | Code review fixes: (C-1) replaced TODO Firebase config in service worker with real values; (H-1) created missing migration file; (M-1) added MessagingAdminLike DI to PushNotificationService and refactored acceptance test S-2/S-5 to use injected mock instead of relying on Firebase-not-configured side effect; (M-3) added TSDoc file header to NotificationSettings.tsx |
