# Story 10.4: Communication Email Notifications

Status: review
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69d6c2ccebb7c1e54bcf5dfd

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want email alerts for message activity on my active flips,
So that I can respond promptly to seller messages and review AI drafts.

## Acceptance Criteria

1. **Message Received Notification (AC1)** — FR-NOTIFY-02
   - Given a seller replies to a conversation thread
   - When the `message.received` event is created (INBOUND message with status DELIVERED)
   - Then an email is sent containing: seller name/handle, message preview, listing title, and a link to the thread

2. **Draft Ready Notification (AC2)** — FR-NOTIFY-03
   - Given the AI generates a new draft message for user review
   - When the `message.draft_ready` event is created (OUTBOUND message with status DRAFT)
   - Then an email is sent containing: listing title, draft message preview, and a link to review/approve

3. **Message Sent Notification (AC3)** — FR-NOTIFY-04
   - Given a message is successfully sent in a conversation thread
   - When the `message.sent` event is created (OUTBOUND message with status SENT)
   - Then an email is sent containing: listing title, message preview, and delivery status

**FRs fulfilled:** FR-NOTIFY-02, FR-NOTIFY-03, FR-NOTIFY-04

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|---|---|---|
| FR-NOTIFY-02 | AC 1 | @FR-NOTIFY-02 @story-10-4 |
| FR-NOTIFY-03 | AC 2 | @FR-NOTIFY-03 @story-10-4 |
| FR-NOTIFY-04 | AC 3 | @FR-NOTIFY-04 @story-10-4 |

## Tasks / Subtasks

### Dev Notes

**Architecture approach:**
Story 10.1 (Background Job Scheduler) and 10.2 (Listing Monitoring Events) add infrastructure for the monitoring pipeline (Cloud Scheduler → database events → processing). Story 10.4 does NOT depend on that pipeline — communication events are triggered synchronously when messages are created/updated, making them ideal for direct email dispatch from the API layer.

**Event model design:**
Rather than requiring the `NotificationEvent` DB model from Story 10.1, Story 10.4 fires emails directly from the message API routes. When a message transitions to the relevant state, the API calls `communicationNotificationService.notify(event)`. This keeps the email logic decoupled via a service layer, ready for Story 10.1's event queue when it is built.

**Notification preference guard:**
Story 10.6 will add granular per-event-type toggles. For now, respect the existing `UserSettings.emailNotifications` boolean (already in schema). If `emailNotifications === false`, skip sending.

**Integration points:**
- `app/api/messages/route.ts` POST → fires `message.received` (INBOUND/DELIVERED) or `message.draft_ready` (OUTBOUND/DRAFT)
- `app/api/messages/[id]/route.ts` PATCH → fires `message.sent` (OUTBOUND/SENT, when status transitions to SENT)
- Email service: `emailService` singleton from `@/lib/email-service`
- User email: look up `user.email` from Prisma via `userId`
- Thread link: `/messages?listingId={listingId}` (existing messages inbox UI)

**Test approach:**
- Unit tests: `src/__tests__/lib/communication-notification.test.ts` — service logic, template rendering, preference guard, no-op when `emailNotifications: false`
- Integration tests (within unit test file): API route tests patching `emailService` to verify notification calls
- Acceptance tests: service-level (logic ACs, no UI needed for these notification triggers)

**Key patterns to follow:**
- File headers: TSDoc `@file/@author/@company/@date/@version/@brief/@description`
- No `any` in production code
- `emailService` is a singleton — mock it in tests with `jest.spyOn`
- Follow existing email template pattern in `email-templates.ts` (inline styles, `baseLayout`, `btn`, `divider` helpers)

---

### What This Story MUST Build

- [x] **Task 1: Communication notification service** (AC: #1, #2, #3)
  - [x] 1.1 Create `src/lib/communication-notification.ts` — Service that handles the three communication notification types. Export a singleton `communicationNotificationService`. Methods:
    - `notifyMessageReceived(params)` — AC1
    - `notifyDraftReady(params)` — AC2
    - `notifyMessageSent(params)` — AC3
    Each method: loads `UserSettings` for `emailNotifications` guard, fetches user email, renders template, calls `emailService.send()`. Swallows errors (notifications must never crash the API).
  - [x] 1.2 Create `src/lib/communication-email-templates.ts` — Three HTML + text email templates:
    - `messageReceivedEmailHtml/Text(opts)` — sellerName, messagePreview, listingTitle, threadUrl
    - `draftReadyEmailHtml/Text(opts)` — listingTitle, draftPreview, reviewUrl
    - `messageSentEmailHtml/Text(opts)` — listingTitle, messagePreview, deliveryStatus
    Follow the exact pattern from `email-templates.ts`: use `baseLayout()`, `btn()`, `divider()` helpers; inline all styles; include unsubscribe + settings footer links.

- [x] **Task 2: Wire notifications into message API routes** (AC: #1, #2, #3)
  - [x] 2.1 Modify `app/api/messages/route.ts` POST handler — After successful message creation, call the appropriate notification method based on direction+status:
    - `direction === 'INBOUND' && status === 'DELIVERED'` → `notifyMessageReceived()`
    - `direction === 'OUTBOUND' && status === 'DRAFT'` → `notifyDraftReady()`
    Call is fire-and-forget: `communicationNotificationService.notifyX(...).catch(() => {})` — never await or let it block response.
  - [x] 2.2 Modify `app/api/messages/[id]/route.ts` PATCH handler — After successful status update to `SENT` on an OUTBOUND message, call `communicationNotificationService.notifyMessageSent()`. Same fire-and-forget pattern.

- [x] **Task 3: Unit tests** (AC: #1, #2, #3)
  - [x] 3.1 Create `src/__tests__/lib/communication-notification.test.ts`:
    - `notifyMessageReceived`: sends email when `emailNotifications: true`, skips when `false`, includes sellerName/preview/link
    - `notifyDraftReady`: sends email when enabled, skips when disabled, includes draft preview/review link
    - `notifyMessageSent`: sends email when enabled, skips when disabled, includes delivery status
    - Error swallowing: emailService throw does NOT propagate
    - User not found: silently skips (no crash)
  - [x] 3.2 Create `src/__tests__/api/messages-notifications.test.ts` — API-level tests verifying that POST `/api/messages` triggers the correct notification method (mock `communicationNotificationService`), and PATCH `/api/messages/[id]` triggers `notifyMessageSent` on SENT transition.

- [x] **Task 4: Acceptance tests** (AC: #1, #2, #3)
  - [x] 4.1 Create `test/acceptance/features/E-010-monitoring-email-notifications.feature` with 7 scenarios for story-10-4 tagged `@E-010-S-<N>`, `@story-10-4`, and `@FR-NOTIFY-0{2,3,4}`.
  - [x] 4.2 Create `test/acceptance/step_definitions/E-010-communication-notifications.steps.ts` with step definitions for all story-10-4 scenarios.
  - [x] 4.3 Update `_bmad-output/test-artifacts/requirements-traceability-matrix.md` with FR-NOTIFY-02, FR-NOTIFY-03, FR-NOTIFY-04 coverage.

## Dev Agent Record

### Implementation Plan

Built a decoupled notification service layer (`CommunicationNotificationService`) that fires emails for the three communication events. Used fire-and-forget pattern at the API layer to ensure notifications never block or crash the response. Respected the existing `emailNotifications` UserSettings flag as the preference guard. Templates follow the exact same inline-CSS pattern as `email-templates.ts` for visual consistency. All new code achieves 100% coverage.

### Debug Log

| Task | Issue | Resolution |
|------|-------|------------|
| 2 | Initial approach used `?.` on listing join but TypeScript infers listing as non-null in PATCH updated record | Used `?? null` fallback to normalize the type |

### Completion Notes

All three ACs satisfied:
- **AC1 (FR-NOTIFY-02):** `notifyMessageReceived` fires on `POST /api/messages` when `direction=INBOUND` + `status=DELIVERED`. Email contains seller name, message preview, listing title, thread link.
- **AC2 (FR-NOTIFY-03):** `notifyDraftReady` fires on `POST /api/messages` when `direction=OUTBOUND` + `status=DRAFT`. Email contains listing title, draft preview, review link.
- **AC3 (FR-NOTIFY-04):** `notifyMessageSent` fires on `PATCH /api/messages/[id]` when updated status transitions to `SENT`. Email contains listing title, message preview, delivery status.

Tests: 26 unit (service), 8 unit (API triggers), 7 acceptance scenarios (42 steps) — all passing.
Coverage: 100% statements/branches/functions/lines on both new library files.

## File List

**Created:**
- `src/lib/communication-email-templates.ts` — HTML + text templates for 3 event types
- `src/lib/communication-notification.ts` — CommunicationNotificationService singleton
- `src/__tests__/lib/communication-notification.test.ts` — 26 service unit tests
- `src/__tests__/api/messages-notifications.test.ts` — 8 API trigger tests
- `test/acceptance/features/E-010-monitoring-email-notifications.feature` — 7 scenarios
- `test/acceptance/step_definitions/E-010-communication-notifications.steps.ts` — step defs
- `_bmad-output/implementation-artifacts/epic-10/10-4-communication-email-notifications.md` — this file

**Modified:**
- `app/api/messages/route.ts` — added notification import + fire-and-forget calls in POST
- `app/api/messages/[id]/route.ts` — added notification import + notifyMessageSent in PATCH
- `src/__tests__/api/messages.test.ts` — added communicationNotificationService mock
- `src/__tests__/api/messages-id.test.ts` — added communicationNotificationService mock
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status: in-progress
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` — FR-NOTIFY-02/03/04 covered

## Change Log

| Date | Change |
|------|--------|
| 2026-04-08 | Story file created; status set to in-progress |
| 2026-04-08 | All tasks complete; all tests passing; status set to review |
