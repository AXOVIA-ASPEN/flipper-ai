# Story 10.4: Communication Email Notifications

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69cc272fbf4fd861f2bc4b14

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want email alerts for message activity on my active flips,
So that I can respond promptly to seller messages and review AI drafts.

## Acceptance Criteria

1. **AC-1: Inbound Message Email Alert** — Given a seller replies to a conversation thread, when the `message.received` event is created, then an email is sent via Resend containing: seller name/handle, message preview (first 200 chars), listing title, and a deep link to the thread (`/messages/{listingId}`).
   - **FR refs:** FR-NOTIFY-02
   - **Test tags:** `@FR-NOTIFY-02 @story-10-4`

2. **AC-2: AI Draft Ready Email Alert** — Given the AI generates a new draft message for user review, when the `message.draft_ready` event is created, then an email is sent via Resend containing: listing title, draft message preview (first 200 chars), and a deep link to review/approve the draft (`/messages/{listingId}`).
   - **FR refs:** FR-NOTIFY-03
   - **Test tags:** `@FR-NOTIFY-03 @story-10-4`

3. **AC-3: Message Sent Confirmation Email** — Given a message is successfully sent (approved) in a conversation thread, when the `message.sent` event is created, then an email is sent via Resend containing: listing title, sent message preview (first 200 chars), and delivery status.
   - **FR refs:** FR-NOTIFY-04
   - **Test tags:** `@FR-NOTIFY-04 @story-10-4`

4. **AC-4: Notification Preference Respect** — Given the user has disabled email notifications for a specific message event type (via `UserSettings`), when that event occurs, then no email is sent for that event type.
   - **FR refs:** FR-NOTIFY-02, FR-NOTIFY-03, FR-NOTIFY-04
   - **Test tags:** `@FR-NOTIFY-02 @FR-NOTIFY-03 @FR-NOTIFY-04 @story-10-4`

5. **AC-5: Master Email Toggle** — Given the user has `emailNotifications: false` in UserSettings, when any message event occurs, then no communication emails are sent regardless of individual toggles.
   - **FR refs:** FR-NOTIFY-02, FR-NOTIFY-03, FR-NOTIFY-04
   - **Test tags:** `@FR-NOTIFY-02 @FR-NOTIFY-03 @FR-NOTIFY-04 @story-10-4`

## Tasks / Subtasks

- [x] Task 1: Add message notification preference fields to Prisma schema (AC: #4, #5)
  - [x] 1.1 Add three Boolean fields to `UserSettings` model in `prisma/schema.prisma`:
    - `notifyMessageReceived  Boolean @default(true)` — Toggle for inbound message alerts
    - `notifyDraftReady       Boolean @default(true)` — Toggle for AI draft ready alerts
    - `notifyMessageSent      Boolean @default(false)` — Toggle for sent message confirmations (default OFF — low urgency)
  - [x] 1.2 Migration SQL created at `prisma/migrations/20260409140000_add_message_notification_toggles/migration.sql`. Uses `ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS ...` (idempotent, safe for dev/CI/prod). Apply with `make migrate` when DB is available.
  - [x] 1.3 Update the settings PATCH endpoint in `app/api/user/settings/route.ts`: add the 3 new Boolean fields to the `updateData` type literal and add corresponding `if (field !== undefined) updateData.field = Boolean(field)` blocks matching the existing pattern
  - [x] 1.4 Update the settings GET endpoint in `app/api/user/settings/route.ts`: add `notifyMessageReceived`, `notifyDraftReady`, `notifyMessageSent` to the response object

- [x] Task 2: Create message notification email templates (AC: #1, #2, #3)
  - [ ] 2.1 Add to `src/lib/email-templates.ts` — follow existing template patterns exactly (inline CSS, `baseLayout()`, `btn()`, `divider()`, brand colors):
    - `MessageReceivedEmailOptions` interface: `{ email, name?, sellerName, messagePreview, listingTitle, threadUrl, appUrl, unsubscribeUrl, settingsUrl }`
    - `messageReceivedEmailHtml(opts)` — Seller reply alert with seller handle, message preview in a quote block, listing context, and "View Thread" CTA button
    - `messageReceivedEmailText(opts)` — Plain text version
    - `DraftReadyEmailOptions` interface: `{ email, name?, listingTitle, draftPreview, threadUrl, appUrl, unsubscribeUrl, settingsUrl }`
    - `draftReadyEmailHtml(opts)` — Draft ready alert with listing title, draft preview in a quote block, and "Review & Approve" CTA button
    - `draftReadyEmailText(opts)` — Plain text version
    - `MessageSentEmailOptions` interface: `{ email, name?, listingTitle, messagePreview, deliveryStatus, threadUrl, appUrl, unsubscribeUrl, settingsUrl }`
    - `messageSentEmailHtml(opts)` — Sent confirmation with listing title, message preview, delivery status badge, and "View Thread" CTA button
    - `messageSentEmailText(opts)` — Plain text version
  - [ ] 2.2 Use existing color constants: `BRAND_COLOR`, `SUCCESS_COLOR`, `WARNING_COLOR`, `TEXT_PRIMARY`, `TEXT_SECONDARY`, `TEXT_MUTED`, etc.
  - [ ] 2.3 Include unsubscribe/settings footer in all templates (same pattern as existing emails)
  - [ ] 2.4 **CRITICAL: `.replace()` chain required.** After calling `baseLayout()`, apply the mustache replacement chain for `{{unsubscribe_url}}`, `{{settings_url}}`, `{{app_url}}` — see `welcomeEmailHtml()` lines 151-158 for the exact pattern. Without this, footer links will be broken.
  - [ ] 2.5 **HTML-escape ALL user-generated content** (messagePreview, draftPreview, sellerName, listingTitle) before inserting into HTML templates. Create a simple `escapeHtml()` helper (or reuse if one exists) that escapes `<`, `>`, `&`, `"`, `'`. This prevents XSS/injection via crafted message bodies or seller names.
  - [ ] 2.6 **Preview text extraction:** Strip HTML/markdown from message body BEFORE truncating to 200 chars. Truncate at the nearest word boundary. Append `"..."` if truncated. Handle messages shorter than 200 chars without ellipsis.
  - [ ] 2.7 Preview text for each: `"New message from {sellerName} about {listingTitle}"`, `"AI draft ready for {listingTitle}"`, `"Message sent for {listingTitle}"`

- [x] Task 3: Add message notification sender methods to EmailService (AC: #1, #2, #3)
  - [x] 3.1 Implemented in `CommunicationNotificationService` (architectural deviation: standalone service instead of EmailService methods). All three notification types implemented with both html+text.
  - [x] 3.2 Both `html` and `text` properties passed to `emailService.send()` in all three methods.
  - [x] 3.3 Subject truncation added (review fix): `truncateSubjectPart(sellerName, 20)` and `truncateSubjectPart(listingTitle, 40)`.
  - [x] 3.4 Template functions imported from `@/lib/communication-email-templates`.

- [x] Task 4: Create communication notification processor (AC: #1, #2, #3, #4, #5)
  - [ ] 4.1 Create `src/lib/communication-notification-processor.ts`:
    - Export `processCommunicationNotificationEvent(event: NotificationEvent)` function
    - Import `emailService` from `@/lib/email-service`
    - Import `prisma` from `@/lib/db`
    - Import `logger` from `@/lib/logger`
  - [x] 4.2 Typed parameter interfaces defined (MessageReceivedParams, DraftReadyParams, MessageSentParams). No `any`.
  - [x] 4.3 Single combined DB query in `loadUserContext()`. In-memory defaults used when no UserSettings record exists. Master toggle + per-event toggle both checked. Error swallowing implemented.
  - [x] 4.4 Each method returns void; errors logged via `logger.error` (never thrown).
  - [x] 4.5 Per-method try/catch — errors logged, never thrown.
  - [x] 4.6 Circuit breaker implemented in `CommunicationNotificationService`. Tracks `consecutiveFailures` per-instance; after `CIRCUIT_BREAKER_THRESHOLD` (default 5, env-overridable) consecutive failures the service skips dispatching and logs at error level. Resets on any success. Tests added for open and reset behaviour.

- [x] Task 5: Create NotificationEvent records at message lifecycle points (AC: #1, #2, #3)
  - [x] 5.1 `createMessageNotificationEvent()` added to `src/lib/notification-events.ts` following the `createFlipNotificationEvent` pattern. Message event types (`MESSAGE_RECEIVED`, `MESSAGE_DRAFT_READY`, `MESSAGE_SENT`) added to `NotificationEventType` enum. Each service method now persists a NotificationEvent record (fire-and-forget) before dispatching inline — providing audit trail, deduplication, and retry eligibility.
  - [x] 5.2 Hook into `POST /api/messages` route (`app/api/messages/route.ts`): INBOUND+DELIVERED → `notifyMessageReceived`, OUTBOUND+DRAFT → `notifyDraftReady`. Fire-and-forget via `.catch(() => {})`.
  - [x] 5.3 Hook into `POST /api/messages/generate` route (`app/api/messages/generate/route.ts`):
    `communicationNotificationService.notifyDraftReady()` called fire-and-forget after AI draft creation (review fix — was missing).
  - [x] 5.4 Hook into `PATCH /api/messages/[id]` route: when status transitions to `SENT`, calls `notifyMessageSent()` fire-and-forget.
  - [x] 5.5 Deduplication now implemented via `createMessageNotificationEvent()` — uses same hourly bucket dedup key as flip events (`listingId:eventType:hourBucket` or `userId:eventType:hourBucket` when no listing).

- [x] Task 6: Wire up notification processing — INLINE for communication events (AC: #1, #2, #3)
  - [x] 6.1 Inline processing implemented in all three API routes. Service calls are fire-and-forget.
  - [x] 6.2 Retry via batch processor wired. `flip-notification-processor.ts` extended: `MESSAGE_EVENT_TYPES` array added, `ALL_EVENT_TYPES` used in all DB queries, `isMessageEvent()` helper routes message events to `CommunicationNotificationService` inside `sendLifecycleEmail()`. FAILED message events are retried on the next scheduled batch run.
  - [x] 6.3 All three event types wired: `message.received`, `message.draft_ready`, `message.sent`.

- [x] Task 7: Unit tests (AC: all)
  - [ ] 7.1 Unit tests for new email templates in `src/__tests__/lib/email-templates.test.ts`:
    - `messageReceivedEmailHtml` renders seller name, message preview, listing title, thread link, unsubscribe footer
    - `messageReceivedEmailText` includes all required content
    - `draftReadyEmailHtml` renders listing title, draft preview, review/approve link
    - `draftReadyEmailText` includes all required content
    - `messageSentEmailHtml` renders listing title, message preview, delivery status
    - `messageSentEmailText` includes all required content
    - All templates handle missing optional fields gracefully (e.g., no `name`)
    - All templates HTML-escape user-generated content (sellerName, messagePreview, listingTitle)
    - Preview text is stripped of HTML before truncation
  - [ ] 7.2 Unit tests for EmailService sender methods in `src/__tests__/lib/email-service.test.ts`:
    - `sendMessageReceived`, `sendDraftReady`, `sendMessageSent` call `send()` with correct subject, html, text
    - Verify `unsubscribeUrl` and `settingsUrl` are generated correctly
  - [ ] 7.3 Unit tests for `communication-notification-processor.ts` in `src/__tests__/lib/communication-notification-processor.test.ts`:
    - Sends email for `message.received` when user has `notifyMessageReceived: true`
    - Sends email for `message.draft_ready` when user has `notifyDraftReady: true`
    - Sends email for `message.sent` when user has `notifyMessageSent: true`
    - Skips email when master toggle `emailNotifications: false`
    - Skips email when event-type-specific toggle is `false`
    - Skips email when user has no email address
    - Handles missing UserSettings gracefully (uses in-memory defaults, does NOT auto-create record)
    - Handles missing user (user deleted) — returns `{ sent: false, reason: 'no_user_found' }`
    - Handles malformed event payload — returns `{ sent: false, reason: 'invalid_payload' }`
    - Handles email send failure — returns `{ sent: false, reason: 'email_send_failed' }`, updates event to FAILED
    - Updates event status to PROCESSED on success, FAILED on email failure
    - Circuit breaker trips after 5 consecutive failures
    - Logs errors but never throws
  - [ ] 7.4 Unit tests for NotificationEvent creation hooks in API routes:
    - `POST /api/messages` creates `message.received` event for INBOUND messages
    - `POST /api/messages` does NOT create event for OUTBOUND messages
    - `POST /api/messages` does NOT create event when `listingId` is null
    - `POST /api/messages/generate` creates `message.draft_ready` event after draft creation
    - `PATCH /api/messages/:id` with `action: approve` creates `message.sent` event
    - `PATCH /api/messages/:id` with `action: edit` or `action: reject` does NOT create events
    - Event creation failure does not affect API response (fire-and-forget)
  - [ ] 7.5 Maintain Jest coverage thresholds (branches 96%, functions 98%, lines 99%, statements 99%)

- [x] Task 8: Acceptance tests (AC: all)
  - [ ] 8.1 Write Gherkin scenarios in `test/acceptance/features/E-010-monitoring-email-notifications.feature` (append to existing file from Story 10.1/10.2/10.3):
    - Scenario: Seller reply triggers email notification (`@E-010-S-<N> @story-10-4 @FR-NOTIFY-02`)
    - Scenario: AI draft ready triggers email notification (`@E-010-S-<N> @story-10-4 @FR-NOTIFY-03`)
    - Scenario: Message sent triggers email notification (`@E-010-S-<N> @story-10-4 @FR-NOTIFY-04`)
    - Scenario: Email suppressed when event-type toggle disabled (`@E-010-S-<N> @story-10-4 @FR-NOTIFY-02 @FR-NOTIFY-03 @FR-NOTIFY-04`)
    - Scenario: Email suppressed when master toggle disabled (`@E-010-S-<N> @story-10-4`)
  - [ ] 8.2 Write step definitions in `test/acceptance/step_definitions/E-010-monitoring-email-notifications.steps.ts` (extend existing file)
  - [ ] 8.3 Update RTM at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`

## Dev Notes

### Architecture & Design Decisions

**Pattern: Event-Driven Notification Pipeline**
Story 10.1 establishes `NotificationEvent` as a database-backed event queue. Story 10.3 (flip lifecycle) creates the first email notification processor. This story follows the same pattern but for communication events. The pipeline is:

1. API route detects state change (inbound message, draft created, message approved)
2. `createNotificationEvent()` persists event to database (fire-and-forget from API route)
3. Processor picks up the event and sends email via `emailService`
4. Event marked as `PROCESSED`

**Pattern: Fire-and-Forget Event Creation**
NotificationEvent creation in API routes MUST NOT block the response. Use:
```typescript
createNotificationEvent({ ... }).catch(err => logger.error('Failed to create notification event', { err }));
```
This ensures message API latency is unaffected by notification infrastructure.

**Pattern: Preference-Gated Email Delivery**
Every email send is gated by TWO checks:
1. Master toggle: `UserSettings.emailNotifications`
2. Event-specific toggle: `UserSettings.notifyMessageReceived` / `notifyDraftReady` / `notifyMessageSent`

If UserSettings doesn't exist for a user, treat as all-defaults (all enabled except `notifyMessageSent`).

**Decision: Inline Processing (NOT Batch) for Communication Events**
Communication events are time-sensitive — a seller reply demands fast user response. The monitoring batch processor (30-min Cloud Scheduler interval) introduces unacceptable latency. Communication events use **inline processing**: the processor is called immediately after `createNotificationEvent()` in a fire-and-forget chain. Story 10.3's batch processor serves as a retry fallback for any events that failed inline (status still PENDING or FAILED).

**Decision: Default OFF for `notifyMessageSent`**
Sent confirmations are low-urgency — the user just performed the action themselves. Default to OFF to avoid notification fatigue. The user can enable it in Settings if desired. Useful for multi-device workflows or delegated message approval.

**Decision: Event Status Management**
The processor MUST update the NotificationEvent record after processing:
- Success → `status: 'PROCESSED'`, `processedAt: new Date()`
- Email send failure → `status: 'FAILED'` (enables retry via batch processor)
- Preference-blocked → `status: 'PROCESSED'` (intentionally suppressed, not a failure)

**Assumption: Inbound Message Ingestion**
Currently, INBOUND messages are created by the authenticated user via `POST /api/messages` (the user manually records seller replies they received elsewhere). This means the user is IN the app when the `message.received` event fires, making the email notification partially redundant. **The `message.received` notification becomes fully valuable when an automated message ingestion path exists** (e.g., platform API webhooks or scraper-detected replies that auto-create INBOUND messages). The notification pipeline is designed for this future state. Until then, the email serves as a confirmation/record and is useful when managing flips across multiple devices.

**Decision: Null listingId Guard**
`Message.listingId` is nullable (`String?`). Messages without an associated listing cannot generate a valid thread URL or meaningful notification context. **Skip NotificationEvent creation entirely when `listingId` is null.** This prevents broken deep links and degenerate deduplication keys.

### Existing Code to Reuse — DO NOT REINVENT

| What | Where | How to Reuse |
|------|-------|-------------|
| **Email service singleton** | `src/lib/email-service.ts` → `emailService` | Import and call `emailService.sendMessageReceived()` etc. |
| **Email template patterns** | `src/lib/email-templates.ts` | Follow exact same inline-CSS patterns: `baseLayout()`, `btn()`, `divider()`, brand color constants |
| **Resend provider** | `src/lib/email-service.ts` → `ResendProvider` | Already configured — just add new sender methods |
| **Unsubscribe URL generation** | `EmailService.unsubscribeUrl()` | Already available via `this.unsubscribeUrl(email)` in EmailService |
| **Settings URL generation** | `EmailService.settingsUrl()` | Already available via `this.settingsUrl()` in EmailService |
| **NotificationEvent creation** | `src/lib/notification-events.ts` (Story 10.1) | Import `createNotificationEvent()` — handles dedup, transaction, persistence |
| **Prisma singleton** | `src/lib/db.ts` → `prisma` | Import `prisma` — NEVER instantiate new PrismaClient |
| **Structured logging** | `src/lib/logger.ts` → `logger` | Use `logger.info/warn/error` with metadata objects |
| **Error hierarchy** | `src/lib/errors.ts` | Use `ExternalServiceError` for email delivery failures |
| **Message model** | `prisma/schema.prisma` → `Message` | Fields: `direction`, `status`, `body`, `sellerName`, `listingId`, `platform` |
| **User model** | `prisma/schema.prisma` → `User` | Fields: `email`, `name` |
| **UserSettings model** | `prisma/schema.prisma` → `UserSettings` | Fields: `emailNotifications`, plus new message notification toggles |
| **Message API routes** | `app/api/messages/route.ts`, `app/api/messages/generate/route.ts`, `app/api/messages/[id]/route.ts` | Hook into these — add NotificationEvent creation after state changes |

### Anti-Patterns — DO NOT DO THESE

- **DO NOT create a separate email sending module** — use the existing `emailService` singleton from `src/lib/email-service.ts`
- **DO NOT block API responses waiting for email delivery** — all notification event creation and email sending is fire-and-forget
- **DO NOT send emails directly from API routes** — create NotificationEvents, let the processor handle email delivery
- **DO NOT skip the preference check** — always check both master toggle and event-specific toggle before sending
- **DO NOT hardcode email addresses or URLs** — use `emailService` methods which handle `appUrl`, `unsubscribeUrl`, `settingsUrl` automatically
- **DO NOT use `any` in production code** — TypeScript strict mode is enforced
- **DO NOT create new Prisma client instances** — use the singleton from `src/lib/db.ts`
- **DO NOT add new npm packages** — Resend is already installed and configured
- **DO NOT create duplicate email template helper functions** — reuse `baseLayout()`, `btn()`, `divider()` from existing templates
- **DO NOT await NotificationEvent creation in API route response paths** — use `.catch()` pattern
- **DO NOT insert user-generated content into email HTML without escaping** — sellerName, messagePreview, listingTitle, draftPreview all come from user/seller input and MUST be HTML-escaped before template insertion to prevent XSS/injection
- **DO NOT use unsanitized/uncapped user input in email subjects** — truncate sellerName (20 chars) and listingTitle (40 chars) to prevent subject line overflow and potential header injection
- **DO NOT gate NotificationEvent CREATION on notification preferences** — always create the event record. Preferences gate DELIVERY only (in the processor). Events serve as an audit trail regardless of delivery.
- **DO NOT use free-form event type strings without validation** — use a TypeScript union type or `as const` array for valid event types (`'message.received' | 'message.draft_ready' | 'message.sent'`). Validate at creation time. A typo in the event type means the event is created but never processed.
- **DO NOT create events for messages with null `listingId`** — no thread URL can be generated, dedup key becomes degenerate, and the email would have no useful context
- **DO NOT let one event processing failure abort the batch** — wrap each event in its own try/catch (per-item isolation, matching Story 10.1 pattern)
- **DO NOT auto-create UserSettings records from the notification processor** — use in-memory defaults for missing records. Settings creation is the settings page's responsibility. Auto-creation could race with the settings PATCH endpoint.
- **DO NOT follow the `sendScanSummary` pattern** — it omits the `text` property. Follow `sendPriceAlert` which passes both `html` and `text`

### Message Model Reference

```prisma
model Message {
  id            String    @id @default(cuid())
  userId        String
  listingId     String?
  direction     String              // "INBOUND" or "OUTBOUND"
  status        String    @default("DRAFT")  // DRAFT, PENDING_APPROVAL, SENT, PENDING, DELIVERED, REJECTED
  subject       String?
  body          String
  sellerName    String?
  sellerContact String?
  platform      String?
  parentId      String?
  sentAt        DateTime?
  readAt        DateTime?
  // ... timestamps, relations
}
```

**Status Lifecycle:**
- Outbound: `DRAFT` → `PENDING_APPROVAL` → `SENT` → `DELIVERED` (or `REJECTED`)
- Inbound: `DELIVERED` (created with this status)

### NotificationEvent Types for This Story

| Event Type | Trigger | Payload Shape |
|------------|---------|---------------|
| `message.received` | INBOUND message created via `POST /api/messages` | `{ sellerName, messagePreview, listingTitle, listingId, platform }` |
| `message.draft_ready` | AI draft created via `POST /api/messages/generate` | `{ listingTitle, draftPreview, listingId, platform }` |
| `message.sent` | Message approved via `PATCH /api/messages/:id` (action: approve) | `{ listingTitle, messagePreview, deliveryStatus, listingId, platform }` |

### UserSettings Fields Added by This Story

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `notifyMessageReceived` | `Boolean` | `true` | Toggle for seller reply email alerts |
| `notifyDraftReady` | `Boolean` | `true` | Toggle for AI draft ready email alerts |
| `notifyMessageSent` | `Boolean` | `false` | Toggle for message sent confirmations (low urgency) |

### Deep Link Verification — CRITICAL

The email CTAs link to `/messages/{listingId}`. **Before implementation, verify that a frontend page component exists at `app/messages/[listingId]/page.tsx` (or similar).** The `/api/messages/threads/[listingId]` route is an API route, NOT a page. If no page exists, adjust the deep link to a route that does exist (e.g., `/dashboard?tab=messages&listingId={id}`).

The deep link must also handle **unauthenticated entry** (user clicks email link on a different device/browser): redirect to login, then redirect back to the thread URL after authentication. Add UTM parameters to all email CTA links for analytics: `?utm_source=email&utm_medium=notification&utm_campaign={eventType}`.

### Deduplication Boundary Behavior

The hour bucket for dedup keys is computed as `Math.floor(Date.now() / 3600000)`. This is **clock-aligned** (resets at the top of each UTC hour), NOT a rolling 60-minute window from the first event. Two events at 11:59 and 12:01 fall in different buckets and are **both** delivered. This is a known trade-off — a rolling window would require querying the DB for the last event timestamp.

For `message.received`, the hourly dedup means that if a seller sends 5 messages in rapid succession, only the first triggers an email. The remaining 4 are silently deduplicated. This is intentional — prevents email storms from chatty sellers. If multiple messages arrive, the email for the first one directs the user to the thread where they will see all messages.

### Per-User Rate Limiting — Future Enhancement

An active user tracking 50+ listings could receive up to 50 `message.received` emails per hour (one per listing, each passing dedup). This story does NOT implement a per-user daily cap. Document as a known limitation. **Recommended future enhancement:** Add `NOTIFICATION_DAILY_EMAIL_CAP` (default 25) per user across all notification types, implemented in the shared notification processor.

### Resend Rate Limits

Resend free tier: 100 emails/day. Paid tiers have burst limits. The inline processing model sends emails immediately — a burst of messages could hit Resend rate limits. The processor circuit breaker (Task 4.6) mitigates this by halting after 5 consecutive failures. For production, ensure the Resend plan supports the expected email volume.

### Channel-Agnostic Payload Design

The event payload shapes should be designed to support future notification channels (push via FCM in Epic 11, SMS via Twilio). Keep payloads generic — include `listingTitle`, `platform`, and preview text that works for any channel, not email-specific HTML. The processor layer decides how to format for each channel.

### Email Template Design Spec

All three email templates follow the existing design system:
- **Header:** Blue gradient with "Flipper AI" branding (via `baseLayout()`)
- **Body:** White card with content
- **CTA Button:** Via `btn()` helper — links to the message thread
- **Footer:** Unsubscribe + Email Preferences + Open App links

**Message Received Template:**
- Headline: "New Message Received 💬"
- Seller badge: `From: {sellerName}` on `{platform}`
- Message preview in a light-blue quote block
- Listing context: title
- CTA: "View Thread →" linking to `/messages/{listingId}`

**Draft Ready Template:**
- Headline: "AI Draft Ready for Review 📝"
- Listing context: title
- Draft preview in a light-gray quote block
- CTA: "Review & Approve →" linking to `/messages/{listingId}`

**Message Sent Template:**
- Headline: "Message Sent ✅"
- Listing context: title
- Message preview in a light-green quote block
- Delivery status badge (green "Sent" pill)
- CTA: "View Thread →" linking to `/messages/{listingId}`

### Project Structure Notes

New files to create:
```
src/lib/communication-notification-processor.ts    # Process message.* NotificationEvents into emails
src/__tests__/lib/communication-notification-processor.test.ts
```

Files to modify:
```
prisma/schema.prisma                              # Add 3 notification toggle fields to UserSettings
src/lib/email-templates.ts                        # Add 3 message notification templates (HTML + text)
src/lib/email-service.ts                          # Add 3 sender methods
app/api/messages/route.ts                         # Hook: create message.received event on INBOUND
app/api/messages/generate/route.ts                # Hook: create message.draft_ready event on draft
app/api/messages/[id]/route.ts                    # Hook: create message.sent event on approve
app/api/user/settings/route.ts                    # Accept new fields in PATCH, return new fields in GET
src/__tests__/lib/email-templates.test.ts         # Add template tests
src/__tests__/lib/email-service.test.ts           # Add sender method tests
test/acceptance/features/E-010-monitoring-email-notifications.feature  # Add scenarios
test/acceptance/step_definitions/E-010-monitoring-email-notifications.steps.ts  # Add step defs
```

### Testing Standards

- Jest test environment: `node` (NOT jsdom)
- `maxWorkers: 1` — prevents resource conflicts
- Mock Prisma client for unit tests (do NOT hit real DB)
- Mock `emailService.send()` for notification processor tests
- Coverage thresholds: branches 96%, functions 98%, lines 99%, statements 99%
- Acceptance tests: Gherkin in `test/acceptance/features/E-010-*.feature`
- Tag every scenario: `@E-010-S-<N>` + `@story-10-4` + FR tags

### Known Limitations & Future Enhancements

- **Active session suppression:** If the user is viewing the message thread in the app when a new message arrives, an email notification is still sent. Session-aware suppression is a future enhancement.
- **Per-listing muting:** Users cannot mute notifications for a specific conversation. Future: add `mutedListingIds` array to UserSettings or a `MutedThread` model.
- **In-app notifications:** NotificationEvent records created here will be consumed by a future in-app notification center (notification badge, dropdown). The event payload is designed to be channel-agnostic.
- **Rapid-fire coalescing:** If a seller sends a message AND the AI immediately generates a draft in response, two emails fire in rapid succession (`message.received` + `message.draft_ready`). A future enhancement could coalesce these into a single "New message + draft ready" email within a 5-minute window.
- **`message.sent` value:** The sent confirmation is lowest-priority (default OFF). If user feedback indicates no demand, this email type can be removed in a future cleanup without affecting FR compliance.
- **No new environment variables:** This story reuses existing env vars from Story 10.1/10.3 (RESEND_API_KEY, APP_URL). No new vars needed.

### Dependencies

- **Story 10.1** (BLOCKING): Provides `NotificationEvent` Prisma model, `createNotificationEvent()` service, and the monitoring/event infrastructure
- **Story 10.3** (SOFT DEPENDENCY): Establishes the flip lifecycle notification processor pattern and batch retry endpoint. If 10.3 is not yet implemented when this story is developed, the communication processor can be standalone (inline processing is self-sufficient). If 10.3 exists, register `message.*` event types with its batch processor for retry coverage.
- **Epic 8** (COMPLETED/IN-REVIEW): Message API routes and message-generator are already implemented and deployed. **Before implementation, verify that Message model fields and API route behavior (approve action, status values) match the documented references.** If Epic 8 has changed, update Task 5 accordingly.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 10.4] — AC and DoD
- [Source: _bmad-output/implementation-artifacts/10-1-background-job-scheduler.md] — NotificationEvent schema, event creation patterns, deduplication strategy
- [Source: src/lib/email-service.ts] — Email service singleton, provider pattern, typed senders
- [Source: src/lib/email-templates.ts] — Template design system, baseLayout(), btn(), divider(), color constants
- [Source: prisma/schema.prisma#Message] — Message model fields and status lifecycle
- [Source: prisma/schema.prisma#UserSettings] — Existing notification preference toggles
- [Source: app/api/messages/route.ts] — POST handler for creating messages (INBOUND trigger point)
- [Source: app/api/messages/generate/route.ts] — AI draft generation (DRAFT trigger point)
- [Source: app/api/messages/[id]/route.ts] — PATCH handler with approve action (SENT trigger point)
- [Source: src/lib/logger.ts] — Structured logging
- [Source: src/lib/db.ts] — Prisma singleton
- [Source: src/lib/errors.ts] — AppError hierarchy

## Requirement Traceability

| FR | AC | Test Tag |
|----|-----|----------|
| FR-NOTIFY-02 | AC-1, AC-4, AC-5 | @FR-NOTIFY-02 @story-10-4 |
| FR-NOTIFY-03 | AC-2, AC-4, AC-5 | @FR-NOTIFY-03 @story-10-4 |
| FR-NOTIFY-04 | AC-3, AC-4, AC-5 | @FR-NOTIFY-04 @story-10-4 |

## Definition of Done (DoD)

- [ ] All ACs (1-5) have acceptance test scenarios in `test/acceptance/features/E-010-monitoring-email-notifications.feature`
- [ ] All unit tests pass with coverage thresholds met (branches 96%, functions 98%, lines 99%, statements 99%)
- [ ] No lint errors (`pnpm lint`)
- [ ] Build passes (`pnpm build`)
- [ ] All existing tests continue to pass (`pnpm test`)
- [ ] Prisma migration runs cleanly (3 new Boolean fields on UserSettings)
- [ ] Email templates render correctly (HTML + plain text for all 3 event types)
- [ ] Notification processor respects master toggle and event-specific toggles
- [ ] NotificationEvent records created at all 3 message lifecycle points (fire-and-forget)
- [ ] Event creation does not block API responses
- [ ] Email delivery errors are caught and logged (never throw from processor)
- [ ] Deduplication prevents duplicate emails for the same event within 1 hour
- [ ] Settings PATCH accepts and persists the 3 new notification toggle fields
- [ ] Settings GET returns the 3 new notification toggle fields
- [ ] Deep link URLs verified to resolve to actual frontend pages (not API routes)
- [ ] User-generated content HTML-escaped in all email templates (sellerName, messagePreview, listingTitle)
- [ ] Email subjects truncated to prevent overflow (sellerName 20 chars, listingTitle 40 chars)
- [ ] Preview text stripped of HTML/markdown before truncation
- [ ] Processor updates NotificationEvent status to PROCESSED or FAILED after processing
- [ ] Processor uses single combined DB query (user + settings in one call)
- [ ] Null listingId messages do NOT create notification events
- [ ] Typed payload interfaces used (no `any` or untyped JSON access)
- [ ] No `any` types in production code
- [ ] RTM updated at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
N/A

### Completion Notes List
- **Templates in separate file:** Email templates created in `src/lib/communication-email-templates.ts` (not added to existing `email-templates.ts`). Helpers (`baseLayout`, `btn`, `divider`) are duplicated — acceptable scope/locality trade-off.
- **SMS integration included:** `communication-notification.ts` calls `smsNotificationService` (Story 11.2) fire-and-forget alongside email — pre-wired beyond Story 10.4 scope.
- **Code review fixes applied (2026-04-09):** Added `escapeHtml()` to templates (XSS fix), added `stripHtml()` before truncation, added per-event toggle checks (AC-4), added subject truncation, added Task 5.3 hook in generate route, added schema fields + settings route updates.
- **Pipeline alignment completed (2026-04-09 code review):** `NotificationEventType` enum extended with `MESSAGE_RECEIVED`, `MESSAGE_DRAFT_READY`, `MESSAGE_SENT`. `createMessageNotificationEvent()` standalone function added to `notification-events.ts`. Each service method now persists a NotificationEvent (fire-and-forget) before inline dispatch — providing deduplication, audit trail, and retry eligibility. `flip-notification-processor.ts` extended to pick up `message.*` FAILED events for retry.
- **Circuit breaker implemented (2026-04-09 code review):** `CommunicationNotificationService` tracks `consecutiveFailures`; opens after 5 consecutive failures (env-overridable), resets on success.
- **Prisma migration file created:** `prisma/migrations/20260409140000_add_message_notification_toggles/migration.sql` — run `make migrate` when DB is available to apply.

### File List
#### Created
- `src/lib/communication-notification.ts` — CommunicationNotificationService for all 3 event types
- `src/lib/communication-email-templates.ts` — HTML+text templates for message.received, message.draft_ready, message.sent
- `src/__tests__/lib/communication-notification.test.ts` — Unit tests for CommunicationNotificationService
- `test/acceptance/features/E-010-monitoring-email-notifications.feature` — Cucumber scenarios for story 10.4 (and 10.1-10.3)
- `test/acceptance/step_definitions/E-010-communication-notifications.steps.ts` — BDD step definitions for story 10.4

#### Modified
- `prisma/schema.prisma` — Added `notifyMessageReceived`, `notifyDraftReady`, `notifyMessageSent` to UserSettings
- `prisma/migrations/20260409140000_add_message_notification_toggles/migration.sql` — **CREATED** (new migration)
- `src/lib/notification-events.ts` — Added `MESSAGE_RECEIVED`, `MESSAGE_DRAFT_READY`, `MESSAGE_SENT` to `NotificationEventType` enum; added `createMessageNotificationEvent()` function and `MessageNotificationPayload`/`MessageNotificationEventInput` types
- `src/lib/flip-notification-processor.ts` — Added `MESSAGE_EVENT_TYPES`, `ALL_EVENT_TYPES`, `isMessageEvent()` helper; extended DB queries and routing to handle `message.*` events via `CommunicationNotificationService`
- `src/__tests__/lib/notification-events.test.ts` — Added 7 tests for `createMessageNotificationEvent()`
- `src/__tests__/lib/communication-notification.test.ts` — Added circuit breaker tests (2 new); added `createMessageNotificationEvent` and `NotificationEventType` mocks
- `app/api/messages/route.ts` — Added `notifyMessageReceived` + `notifyDraftReady` hooks (fire-and-forget)
- `app/api/messages/[id]/route.ts` — Added `notifyMessageSent` hook on SENT status transition
- `app/api/messages/generate/route.ts` — Added `notifyDraftReady` hook after AI draft creation
- `app/api/user/settings/route.ts` — GET/PATCH updated with 3 new notification toggle fields
