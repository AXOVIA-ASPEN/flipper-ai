# Story 10.3: Flip Lifecycle Email Notifications

Status: ready-for-dev
Blocked: true
Blocked-Reason: Depends on Story 10.1 (NotificationEvent model + notification-events service) which is ready-for-dev but not yet implemented. Cannot create or consume NotificationEvent records without the schema and service layer from 10.1.
Trello-Card-ID: 69cc20257d9e32b489d1d351

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want email alerts for key flip lifecycle events,
So that I stay informed about new opportunities, purchases, and sales without checking the app.

## Acceptance Criteria

1. **AC-1: Opportunity Found Email** — Given a new listing scores above the opportunity threshold, when the `opportunity.found` event is created, then an email is sent via Resend containing: platform, buy price, estimated profit margin, flippability score, and brief item description.
   - **FR refs:** FR-NOTIFY-01
   - **Test tags:** `@FR-NOTIFY-01 @story-10-3`

2. **AC-2: Flip Sold Email** — Given a flip is marked as sold, when the `flip.sold` event is created, then an email is sent containing: item title, final sale price, actual profit, ROI percentage, and platform.
   - **FR refs:** FR-NOTIFY-05
   - **Test tags:** `@FR-NOTIFY-05 @story-10-3`

3. **AC-3: Flip Purchased Email** — Given a flip is marked as purchased, when the `flip.purchased` event is created, then an email is sent containing: item title, purchase price, and estimated profit.
   - **FR refs:** FR-NOTIFY-06
   - **Test tags:** `@FR-NOTIFY-06 @story-10-3`

4. **AC-4: Flip Listed Email** — Given a purchased item transitions from PURCHASED to LISTED (meaning it has been shipped to or listed on the destination resale platform), when the `flip.listed` event is created, then an email is sent containing: item title, destination platform, and listing URL (if available).
   - **FR refs:** FR-NOTIFY-07
   - **Test tags:** `@FR-NOTIFY-07 @story-10-3`
   - **NOTE:** The original PRD references "flip shipped" but the Opportunity model has no SHIPPED status. The lifecycle is `IDENTIFIED → CONTACTED → PURCHASED → LISTED → SOLD`. The PURCHASED→LISTED transition fulfills this requirement since listing an item implies it has been prepared/shipped to the resale platform. If a dedicated SHIPPED status is needed, it must be added to the Opportunity model as a prerequisite (schema migration).

5. **AC-5: Notification Preference Respected** — Given the user has disabled email notifications for a specific event type, when that event occurs, then no email is sent for that event type. Additionally, if the user's `notifyFrequency` is set to `daily` or `weekly`, `opportunity.found` events are deferred (marked PROCESSED with `skippedReason: 'deferred_to_digest'`) instead of sending individual emails.
   - **FR refs:** FR-NOTIFY-01, FR-NOTIFY-05, FR-NOTIFY-06, FR-NOTIFY-07
   - **Test tags:** `@FR-NOTIFY-01 @FR-NOTIFY-05 @FR-NOTIFY-06 @FR-NOTIFY-07 @story-10-3`

## Tasks / Subtasks

- [ ] Task 0: Prerequisites and Schema Verification (AC: all)
  - [ ] 0.1 Verify NotificationEvent model exists (from Story 10.1) with fields: `status`, `eventType`, `payload`, `userId`, `listingId`, `deduplicationKey`, `processedAt`. If `retryCount Int @default(0)` and `errorMessage String?` fields are missing, ADD them to the schema via migration. These are required for retry logic.
  - [ ] 0.2 Verify `createNotificationEvent()` function exists in `src/lib/notification-events.ts` (from Story 10.1).
  - [ ] 0.3 Verify Opportunity model statuses. Confirm lifecycle is: `IDENTIFIED → CONTACTED → PURCHASED → LISTED → SOLD → PASSED`. There is NO `SHIPPED` status — the PURCHASED→LISTED transition serves as the "shipped/listed" event trigger (AC-4).
  - [ ] 0.4 Check `app/api/opportunities/[id]/route.ts` PATCH handler. If it lacks `requireAuth()` or `getCurrentUserId()`, or if it blindly forwards `body` to `prisma.opportunity.update()` without status transition detection, these must be fixed as a prerequisite (see Task 4 prerequisites).

- [ ] Task 1: Create email templates (AC: #1, #2, #3, #4)
  - [ ] 1.1 Add 4 email template pairs (HTML + text) in `src/lib/email-templates.ts`. Every template MUST have both HTML and text versions — do not repeat the gap where `scanSummaryEmailText` was missing.
    - `opportunityFoundEmailHtml(data)` / `opportunityFoundEmailText(data)` — platform, buy price, estimated profit, flippability score + label, item title, item image
    - `flipSoldEmailHtml(data)` / `flipSoldEmailText(data)` — item title, sale price, actual profit, ROI percentage, days to flip, platform
    - `flipPurchasedEmailHtml(data)` / `flipPurchasedEmailText(data)` — item title, purchase price, estimated profit, platform
    - `flipListedEmailHtml(data)` / `flipListedEmailText(data)` — item title, destination platform, listing URL (if available)
  - [ ] 1.2 Use existing design system from `email-templates.ts`: `BRAND_COLOR`, `SUCCESS_COLOR`, `TEXT_PRIMARY`, etc. constants, `baseLayout()`, `btn()`, and `divider()` helpers. NOTE: These are module-private — new templates MUST be added inside `email-templates.ts`, NOT in a separate file.
  - [ ] 1.3 Use distinct visual tones: opportunity.found = amber/urgency (act fast), flip.purchased = blue/brand (confirmation), flip.listed = teal/progress (in transit), flip.sold = green/celebration (achievement).
  - [ ] 1.4 All numeric values must use `?? 0` before `.toFixed()` for null safety. Truncate item titles to 100 chars. Sanitize HTML entities in user-provided content (title, description).
  - [ ] 1.5 Include `List-Unsubscribe` and `List-Unsubscribe-Post` headers in all notification emails for RFC 8058 compliance (Gmail/Yahoo requirement). Use Resend SDK's `headers` option.
  - [ ] 1.6 Include relative timestamp in templates: "Found X minutes ago" for opportunity, "Purchased today" for flip.purchased, etc. Derive from `NotificationEvent.createdAt`.

- [ ] Task 2: Add typed sender methods to EmailService (AC: #1, #2, #3, #4)
  - [ ] 2.1 Add `sendOpportunityFound(to, data)` method to `EmailService` in `src/lib/email-service.ts`. Follow existing `sendPriceAlert()` pattern (lines 193-209). Sender methods accept `Omit<TemplateOptions, 'appUrl' | 'unsubscribeUrl' | 'settingsUrl'>` and construct URLs internally using `this.appUrl`.
  - [ ] 2.2 Add `sendFlipSold(to, data)` method.
  - [ ] 2.3 Add `sendFlipPurchased(to, data)` method.
  - [ ] 2.4 Add `sendFlipListed(to, data)` method.
  - [ ] 2.5 Define TypeScript interfaces for each email data payload (no `any`). Place alongside existing interfaces in `email-service.ts`. The EmailService constructs `opportunityUrl` internally — data contracts should NOT include it.

- [ ] Task 3: Create flip lifecycle notification processor (`src/lib/flip-notification-processor.ts`) (AC: #1, #2, #3, #4, #5)
  - [ ] 3.1 Create `processFlipLifecycleNotifications()` — query NotificationEvent records: `WHERE eventType IN ('opportunity.found', 'flip.sold', 'flip.purchased', 'flip.listed') AND status = 'PENDING' AND createdAt > now() - NOTIFICATION_MAX_EVENT_AGE_HOURS ORDER BY createdAt ASC LIMIT BATCH_SIZE`. Also query retry-eligible failed events: `OR (status = 'FAILED' AND retryCount < MAX_RETRIES AND createdAt > now() - NOTIFICATION_MAX_EVENT_AGE_HOURS)`. Events older than `NOTIFICATION_MAX_EVENT_AGE_HOURS` (default 48) are stale — mark as PROCESSED with `{ skippedReason: 'stale' }`. Include user and settings in the initial query to avoid N+1: `prisma.notificationEvent.findMany({ where: {...}, include: { user: { include: { settings: true } } }, orderBy: { createdAt: 'asc' }, take: BATCH_SIZE })`.
    - Function signature: `async function processFlipLifecycleNotifications(): Promise<{ processed: number; sent: number; skipped: { preferenceDisabled: number; frequencyDeferred: number; rateLimited: number; stale: number; userDeleted: number }; failed: number; errors: Array<{ eventId: string; error: string }> }>`
  - [ ] 3.2 For each event: check user existence (if null, mark PROCESSED with `skippedReason: 'user_deleted'`). Load user email from `user.email`. Check `settings.emailNotifications` (master toggle). Check type-specific toggle. Check `settings.notifyFrequency` for opportunity.found events. If all checks pass, send email. Mark event PROCESSED with `processedAt: new Date()` and metadata: `{ processedAction: 'sent' | 'skipped', skippedReason?: string, resendMessageId?: string }`. On successful send, store the Resend `messageId` in the event payload for idempotency tracking.
  - [ ] 3.3 Map event types to user preference fields:
    - `opportunity.found` → `notifyNewDeals`
    - `flip.sold` → `notifySoldItems`
    - `flip.purchased` → `notifySoldItems` (reuse — purchase is part of flip lifecycle. KNOWN LIMITATION: users cannot separately toggle purchased vs. sold notifications. Document as tech debt for Story 10.6.)
    - `flip.listed` → `notifySoldItems` (reuse — same limitation as above)
    - Also check master toggle: `emailNotifications`
    - Also check `notifyFrequency`: if NOT `'instant'`, defer `opportunity.found` events (mark PROCESSED with `skippedReason: 'deferred_to_digest'`). Lifecycle events (`flip.sold`, `flip.purchased`, `flip.listed`) always send instantly regardless of frequency (low-volume, user-initiated).
  - [ ] 3.4 Implement batch processing with configurable batch size (`NOTIFICATION_PROCESSOR_BATCH_SIZE`, default 50). Process events in FIFO order. Each event processed in its own try/catch — never let one failure abort the batch.
  - [ ] 3.5 Per-user email rate limiting: `NOTIFICATION_PROCESSOR_MAX_EMAILS_PER_USER_PER_HOUR` (default 10). Track emails sent per user in this run + query recent PROCESSED events for the user. If a user exceeds this limit, defer remaining events to the next run (leave PENDING, do NOT mark as FAILED).
  - [ ] 3.6 Opportunity digest aggregation: when the processor finds more than `OPPORTUNITY_DIGEST_THRESHOLD` (default 5) pending `opportunity.found` events for a single user, combine into a single "N new opportunities found" email listing the top 5 by `valueScore`. Mark all aggregated events as PROCESSED. Use existing `sendDigest()` pattern as reference.
  - [ ] 3.7 Provider circuit breaker: track consecutive send failures. After `NOTIFICATION_PROVIDER_FAILURE_THRESHOLD` (default 3) consecutive failures with the same error class (429, 503, network), abort the batch run. Leave remaining events PENDING (do NOT mark as FAILED — preserve retry budget). Log `notification.provider.circuit_breaker` with `{ failureCount, errorClass, eventsRemaining }`.
  - [ ] 3.8 On email send failure: increment `retryCount` on the NotificationEvent, set status to FAILED, record error in `errorMessage` field. Events exceeding `NOTIFICATION_PROCESSOR_MAX_RETRIES` (default 3) remain FAILED permanently. When a failure is classified as a provider rate limit (HTTP 429), do NOT increment `retryCount` — leave event PENDING to preserve retry budget for genuine per-event failures.
  - [ ] 3.9 On retry of a FAILED event, check if a `resendMessageId` already exists in the payload — if so, skip re-sending (idempotency guard against DB-update-after-send crashes).
  - [ ] 3.10 Add inter-email delay: `NOTIFICATION_PROCESSOR_SEND_DELAY_MS` (default 100) between Resend API calls to stay within Resend's 10/second default rate limit.
  - [ ] 3.11 Track elapsed time. Abort cleanly at `NOTIFICATION_PROCESSOR_MAX_DURATION_MS` (default 240000 — 4 minutes, leaving 60s buffer for Cloud Run's 300s timeout).
  - [ ] 3.12 Structured audit logging for every event: `logger.info('notification.processed', { eventId, eventType, userId, action: 'sent' | 'skipped' | 'failed', reason?, resendMessageId?, duration })`. If failure rate > 50% in a single run, log at ERROR: `notification.delivery.degraded`.
  - [ ] 3.13 Use optimistic locking for status updates: `UPDATE ... WHERE id = ? AND status = 'PENDING'`. Check affected rowCount > 0 before sending. This prevents double-processing if another run overlaps.
  - [ ] 3.14 Import `emailService` singleton from `src/lib/email-service.ts`. Import `prisma` from `src/lib/db.ts`. Import `logger` from `src/lib/logger.ts`. Set per-email timeout of 10s via `AbortController` on Resend API calls.

- [ ] Task 4: Hook notification event creation into flip lifecycle transitions (AC: #1, #2, #3, #4)
  - [ ] 4.0 **PREREQUISITE: Harden opportunity PATCH endpoint.** Before hooking events into `app/api/opportunities/[id]/route.ts`, the route MUST: (a) Add `requireAuth()` or `getCurrentUserId()` and verify user owns the opportunity. (b) Add Zod validation for allowed PATCH fields. (c) Fetch the current opportunity BEFORE updating to detect status transitions (compare `previous.status` vs `body.status`). (d) Validate status transitions are legal (e.g., IDENTIFIED→PURCHASED is not valid — must go through CONTACTED). Only create notification events when a valid status transition occurs.
  - [ ] 4.1 **Opportunity Found**: Create a shared helper `emitOpportunityFoundEvent(listing: Listing, userId: string)` in `src/lib/notification-events.ts` to avoid duplicating hook logic across 5 scraper routes. Call it from ALL 5 scraper routes (craigslist, ebay, facebook, mercari, offerup) after a successful `prisma.listing.upsert()` that sets status to `'OPPORTUNITY'`. Only create the event if the listing was NEWLY created (not an update to an existing OPPORTUNITY listing — check upsert result or previous status). Place the hook AFTER the existing SSE emit. Use `await createNotificationEvent()` inside the existing per-listing try/catch (scraper is already slow; 1-2ms overhead is negligible). Pass `listingId: savedListing.id` (Prisma cuid, NOT `externalId`). Payload: `{ platform, askingPrice, estimatedValue, profitPotential, valueScore, flippabilityLabel, listingTitle, imageUrl: savedListing.imageUrls?.split(',')[0] ?? null }`.
  - [ ] 4.2 **Flip Purchased**: In the opportunity PATCH endpoint, when `previous.status !== 'PURCHASED' AND body.status === 'PURCHASED'`, create `flip.purchased` event. Read userId from `opportunity.userId` (if null, skip with warning log). Payload: `{ listingTitle, purchasePrice, estimatedProfit, platform }`. Use fire-and-forget: `createNotificationEvent({...}).catch(err => logger.error('notification.event.creation_failed', { err, eventType: 'flip.purchased' }))` to avoid adding latency to user-facing response.
  - [ ] 4.3 **Flip Listed**: In the opportunity PATCH endpoint, when `previous.status !== 'LISTED' AND body.status === 'LISTED'`, create `flip.listed` event. Payload: `{ listingTitle, destinationPlatform: body.resalePlatform ?? 'Unknown', listingUrl: body.resaleUrl ?? null }`. Fire-and-forget pattern.
  - [ ] 4.4 **Flip Sold**: In the opportunity PATCH endpoint, when `previous.status !== 'SOLD' AND body.status === 'SOLD'`, create `flip.sold` event. Before creating, validate that `body.resalePrice` is present and numeric — if missing, log warning and skip event creation (the sold email requires `actualProfit`). Payload: `{ listingTitle, salePrice: body.resalePrice, actualProfit: body.resalePrice - opportunity.purchasePrice - fees, purchasePrice: opportunity.purchasePrice, roiPercent: ((profit / purchasePrice) * 100), daysToFlip: daysBetween(opportunity.purchasedAt, new Date()), platform }`. Fire-and-forget pattern.
  - [ ] 4.5 All event creation calls MUST use `createNotificationEvent()` from Story 10.1's `src/lib/notification-events.ts`. DO NOT create events by direct Prisma insert. All try/catch blocks MUST use `logger.error` (NOT `console.error`) with `{ userId, listingId, eventType, error }` metadata.

- [ ] Task 5: Create notification processing API endpoint (`app/api/notifications/process/route.ts`) (AC: all)
  - [ ] 5.1 POST handler — triggers notification processing run. Completes synchronously within request lifecycle. Auth: API key via `NOTIFICATION_PROCESSOR_API_KEY` (MUST be a DIFFERENT key from `MONITORING_API_KEY`) with `crypto.timingSafeEqual()`. Compare buffer lengths first — return 401 on mismatch before calling `timingSafeEqual()`. If `NOTIFICATION_PROCESSOR_API_KEY` is not set, return 503 Service Unavailable. Rate-limit auth failures: after 5 failed attempts from same IP within 1 minute, return 429 for 5 minutes.
  - [ ] 5.2 Call `processFlipLifecycleNotifications()` from Task 3.
  - [ ] 5.3 Return summary: `{ success: true, data: { processed, sent, skipped: { preferenceDisabled, frequencyDeferred, rateLimited, stale, userDeleted }, failed, duration } }`.
  - [ ] 5.4 Guard against concurrent runs: create a lightweight lock record (reuse `MonitoringJob` model with `type: 'notification_processing'` or create a dedicated partial unique index). Use the same atomic create pattern as Story 10.1 — attempt `prisma.create()`, catch P2002 unique violation, return HTTP 409. Clear lock (mark job COMPLETED/FAILED) when processing finishes.
  - [ ] 5.5 Cloud Scheduler: MUST use a SEPARATE schedule from the monitoring job. Recommended interval: every 5 minutes (`NOTIFICATION_PROCESSOR_INTERVAL_MINUTES`, default 5). Offset by 2.5 minutes from the monitoring job to avoid database connection contention. This provides ~14,400 events/day throughput at batch_size=50. If 3 consecutive runs process a full batch (all 50 events consumed), log `notification.backlog.warning`.

- [ ] Task 6: Unit tests (AC: all)
  - [ ] 6.1 Unit tests for all 4 email templates — verify HTML contains expected data fields, text fallback is readable, numeric fields handle null/undefined gracefully, HTML entities are sanitized
  - [ ] 6.2 Unit tests for all 4 EmailService sender methods — verify correct template selection, Resend API call shape, `List-Unsubscribe` header present
  - [ ] 6.3 Unit tests for `processFlipLifecycleNotifications()` — event consumption, preference checking, `notifyFrequency` checking, email dispatch, per-user rate limiting, opportunity digest aggregation, provider circuit breaker, error handling, batch processing, stale event filtering, retry with retryCount, idempotency guard (resendMessageId check)
  - [ ] 6.4 Unit tests for notification event creation hooks — verify correct event type and payload for each lifecycle transition, verify userId source, verify deduplication key, verify fire-and-forget pattern in PATCH hooks
  - [ ] 6.5 Unit tests for API route — auth (valid key, invalid key, missing key, buffer length mismatch), concurrent run guard (409), rate limiting, response shape, 503 when key not configured
  - [ ] 6.6 Create a `MockEmailCapture` test utility that wraps NullProvider and stores all sent emails in an array for assertion: `expect(capture.sentEmails).toHaveLength(1); expect(capture.sentEmails[0].subject).toContain('sold')`
  - [ ] 6.7 Maintain Jest coverage thresholds (branches 96%, functions 98%, lines 99%, statements 99%)

- [ ] Task 7: Acceptance tests (AC: all)
  - [ ] 7.1 Write Gherkin scenarios in `test/acceptance/features/E-010-monitoring-email-notifications.feature`
  - [ ] 7.2 Write step definitions in `test/acceptance/step_definitions/E-010-monitoring-email-notifications.steps.ts`
  - [ ] 7.3 Tag scenarios: `@E-010-S-<N>` (continue numbering from Story 10.2) + `@story-10-3` + `@FR-NOTIFY-01` / `@FR-NOTIFY-05` / `@FR-NOTIFY-06` / `@FR-NOTIFY-07` as applicable
  - [ ] 7.4 Include scenarios for: failed email retried on next run, concurrent processor returns 409, batch size limit reached, per-user rate limit hit, opportunity digest aggregation, stale event skipped, provider circuit breaker triggers, notifyFrequency='daily' defers opportunity events
  - [ ] 7.5 Update RTM at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`

## Dev Notes

### Architecture & Design Decisions

**Pattern: Event Queue → Processor → Email (Decoupled)**
Story 10.1 establishes the NotificationEvent model as a persistent event queue. This story consumes those events:
1. Lifecycle transitions (scraper finds opportunity, user marks purchased/listed/sold) create NotificationEvent records
2. A scheduled processor (every 5 min) queries PENDING events by type
3. Processor checks user preferences + frequency, sends email via Resend, marks event PROCESSED

This decoupling means: email failures don't block lifecycle transitions; events are durable (survive process restarts); retry is automatic; same processor endpoint is triggered by Cloud Scheduler.

**Delivery Guarantee: At-Least-Once**
If the processor crashes after sending an email but before marking the event PROCESSED, the email will be re-sent on the next run. This is acceptable for all four event types (duplicate notifications are a minor annoyance, not a data integrity issue). Mitigation: store Resend `messageId` in event payload; on retry, check if messageId exists before re-sending.

**Snapshot-of-Truth: Event Payloads**
The processor MUST render emails from NotificationEvent payload data, NOT re-query current Opportunity/Listing values. The payload is the point-in-time snapshot at event creation. If the listing price changes between event creation and processing, the email correctly reflects the state when the opportunity was discovered.

**AC-4: LISTED vs. SHIPPED**
The Opportunity model status lifecycle is `IDENTIFIED → CONTACTED → PURCHASED → LISTED → SOLD → PASSED`. There is NO `SHIPPED` status. The PURCHASED→LISTED transition fulfills the "shipped/listed" requirement from the PRD (FR-NOTIFY-07). When an item transitions to LISTED, it implies the item has been prepared and listed on the destination resale platform. The event type is `flip.listed` (not `flip.shipped`).

**Event Types — Story 10.3 vs. Story 10.2**
- **Story 10.2 events** (listing monitoring): `listing.sold`, `listing.price_changed`, `listing.expiring`, `listing.unavailable` — detected by background monitoring job
- **Story 10.3 events** (flip lifecycle): `opportunity.found`, `flip.sold`, `flip.purchased`, `flip.listed` — triggered by user actions or scraper pipeline

These are DIFFERENT event domains. Story 10.3 events are created inline (in API route handlers), not by the monitoring job.

**Notification Preferences Mapping**
Existing `UserSettings` fields cover the needed toggles:
- `emailNotifications` — master toggle (if false, no emails for ANY event)
- `notifyNewDeals` → `opportunity.found`
- `notifySoldItems` → `flip.sold`, `flip.purchased`, `flip.listed` (all part of flip lifecycle)
- `notifyFrequency` — if not `'instant'`, defer `opportunity.found` to digest pipeline (Story 10.5). Lifecycle events always send instantly.

KNOWN LIMITATION: `notifySoldItems` controls purchased, listed, AND sold email types. Users cannot independently toggle these. This is documented as tech debt for Story 10.6 to address by adding granular toggles (`notifyFlipPurchased`, `notifyFlipListed`). When 10.6 adds these fields, update the preference mapping in the processor.

**Scaling Parameters**
At current settings (batch_size=50, 5-min interval), max throughput is ~14,400 events/day. For 100 active users at 3 scans/day with 10 opportunities each, that's ~3,000 events/day — well within capacity. Monitor `processed` count per run and alert when batches are consistently full (backlog growth indicator). If throughput is insufficient, increase batch size or decrease interval before considering migration to Cloud Pub/Sub.

**CRITICAL: Execution Environment**
The notification processor endpoint MUST run on Cloud Run (Vercel has 30s `maxDuration`). Cloud Run timeout: 300s. The processor has a 240s internal max duration (60s buffer).

### Existing Code to Reuse — DO NOT REINVENT

| What | Where | How to Reuse |
|------|-------|-------------|
| **Email service (singleton)** | `src/lib/email-service.ts` | Add 4 new sender methods following `sendPriceAlert()` pattern. Use `Omit<Options, 'appUrl'\|'unsubscribeUrl'\|'settingsUrl'>` — service constructs URLs internally. |
| **Email templates + design system** | `src/lib/email-templates.ts` | Use `BRAND_COLOR`, `SUCCESS_COLOR`, `TEXT_PRIMARY`, `baseLayout()`, `btn()`, `divider()`. Templates MUST be added inside this file (helpers are module-private). |
| **NotificationEvent creation** | `src/lib/notification-events.ts` (Story 10.1) | Use `createNotificationEvent()` — do NOT create events by direct Prisma insert |
| **NotificationEvent model** | `prisma/schema.prisma` (Story 10.1) | Query PENDING events by eventType, update status to PROCESSED/FAILED |
| **User notification preferences** | `UserSettings` model (schema lines 254-260) | Check `emailNotifications` (master), type-specific toggle, AND `notifyFrequency` |
| **Batch processing pattern** | `src/lib/posting-queue-processor.ts` | Mirror batch processing with retry, per-item try/catch (lines 85-96), retryCount pattern |
| **Error hierarchy** | `src/lib/errors.ts` | Use `ExternalServiceError` for Resend failures, `ValidationError` for bad payloads |
| **Prisma singleton** | `src/lib/db.ts` | Import `prisma` — NEVER instantiate new PrismaClient. 2-connection pool. |
| **Structured logging** | `src/lib/logger.ts` | Use `logger.info/warn/error` with metadata objects. Use `logger.timed()` for durations. |
| **API route pattern** | Any `app/api/*/route.ts` | Follow NextResponse.json + handleError() pattern |
| **Opportunity model** | `prisma/schema.prisma` (lines 98-121) | Statuses: IDENTIFIED → CONTACTED → PURCHASED → LISTED → SOLD → PASSED. `userId` is `String?` (optional). |
| **Scraper opportunity creation** | `app/api/scraper/craigslist/route.ts` (line 558) | Hook after listing upsert with status OPPORTUNITY. SSE emit is at ~line 592. |

### Anti-Patterns — DO NOT DO THESE

- **DO NOT create a new email provider or SDK integration** — Resend is integrated via `email-service.ts`. Use the existing singleton.
- **DO NOT create external HTML email template files** — all templates are inline in `email-templates.ts`.
- **DO NOT send emails directly from API route handlers** — create NotificationEvent records; the processor handles delivery.
- **DO NOT create events by direct `prisma.notificationEvent.create()`** — use `createNotificationEvent()` which handles deduplication and validation.
- **DO NOT check notification preferences at event creation time** — events are always created; the processor decides whether to send.
- **DO NOT use `any` in production code** — TypeScript strict mode is enforced.
- **DO NOT add npm packages for email templating (mjml, react-email, etc.)** — inline HTML templates are the established pattern.
- **DO NOT process ALL pending events in one run without bounds** — cap with batch size and max duration.
- **DO NOT ignore the master toggle** — if `emailNotifications` is false, skip ALL email types.
- **DO NOT ignore `notifyFrequency`** — if not `'instant'`, defer opportunity.found events.
- **DO NOT block lifecycle transitions if event creation fails** — wrap in try/catch, log with `logger.error`, continue. The transition is primary; notification is secondary.
- **DO NOT use `console.error`** — use `logger.error` with structured metadata for all error logging in hooks and processor.
- **DO NOT re-query Opportunity/Listing tables in the processor** — use event payload data (snapshot-of-truth).
- **DO NOT duplicate the event creation hook across 5 scraper routes** — extract a shared `emitOpportunityFoundEvent()` helper.
- **DO NOT mark events as FAILED when the failure is a provider rate limit (429)** — leave PENDING to preserve retry budget.
- **DO NOT create a `flip.shipped` event type** — the Opportunity model has no SHIPPED status. Use `flip.listed` for the PURCHASED→LISTED transition.

### Email Template Data Contracts

```typescript
interface OpportunityFoundEmailData {
  platform: string;          // e.g., "Craigslist", "eBay"
  buyPrice: number;          // Asking price
  estimatedProfit: number;   // Estimated profit margin
  flippabilityScore: number; // 0-100 value score
  flippabilityLabel: string; // 'Fair' | 'Good' | 'Great' | 'Excellent' (computed from score)
  itemTitle: string;         // Brief item description
  imageUrl?: string;         // First listing image URL (from imageUrls field)
  // opportunityUrl constructed by EmailService using this.appUrl + opportunityId
}

interface FlipSoldEmailData {
  itemTitle: string;
  salePrice: number;         // Final sale price
  actualProfit: number;      // Actual profit (sale - purchase - fees)
  roiPercent: number;        // Return on investment: (profit / purchasePrice) * 100
  daysToFlip?: number;       // Days from purchase to sale
  platform: string;          // Platform where sold
  purchasePrice: number;     // Original purchase price
}

interface FlipPurchasedEmailData {
  itemTitle: string;
  purchasePrice: number;
  estimatedProfit: number;   // Projected profit
  platform: string;          // Source platform
}

interface FlipListedEmailData {
  itemTitle: string;
  destinationPlatform: string; // Where the item is being listed/sold
  listingUrl?: string;         // URL of the resale listing (if available)
}
```

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `NOTIFICATION_PROCESSOR_API_KEY` | (required, 32+ chars) | Auth token for notification processor. MUST be DIFFERENT from MONITORING_API_KEY. Store in GCP Secret Manager. |
| `NOTIFICATION_PROCESSOR_BATCH_SIZE` | 50 | Max events processed per run |
| `NOTIFICATION_PROCESSOR_MAX_RETRIES` | 3 | Max retry attempts for permanently failed events |
| `NOTIFICATION_PROCESSOR_SEND_DELAY_MS` | 100 | Delay between Resend API calls (ms) to stay within rate limits |
| `NOTIFICATION_PROCESSOR_MAX_DURATION_MS` | 240000 | Max run duration (4 min) before graceful abort |
| `NOTIFICATION_PROCESSOR_MAX_EMAILS_PER_USER_PER_HOUR` | 10 | Per-user email rate limit |
| `NOTIFICATION_PROCESSOR_INTERVAL_MINUTES` | 5 | Scheduling interval (docs/reference, configured in Cloud Scheduler) |
| `NOTIFICATION_PROVIDER_FAILURE_THRESHOLD` | 3 | Consecutive failures before provider circuit breaker trips |
| `NOTIFICATION_MAX_EVENT_AGE_HOURS` | 48 | Max event age — older events marked stale and skipped |
| `OPPORTUNITY_DIGEST_THRESHOLD` | 5 | Number of opportunity events per user before aggregating into digest |
| `APP_BASE_URL` | `http://localhost:3000` | Base URL for deep links in emails |

### Project Structure Notes

New files to create:
```
src/lib/flip-notification-processor.ts          # Processor: consume events, check prefs, send email
app/api/notifications/process/route.ts          # POST — trigger notification processing (Cloud Scheduler target)
src/__tests__/lib/flip-notification-processor.test.ts
src/__tests__/lib/email-templates-flip.test.ts  # Tests for new email templates
src/__tests__/api/notifications/process/route.test.ts
```

Files to modify:
```
src/lib/email-templates.ts                      # Add 4 template pairs (HTML + text) using existing design system
src/lib/email-service.ts                        # Add 4 typed sender methods + interfaces
src/lib/notification-events.ts                  # Add shared emitOpportunityFoundEvent() helper + flip event types
app/api/opportunities/[id]/route.ts             # PREREQUISITE: Add auth, Zod validation, status transition detection. THEN add event hooks.
app/api/scraper/craigslist/route.ts             # Hook: call emitOpportunityFoundEvent() after OPPORTUNITY upsert
app/api/scraper/ebay/route.ts                   # Hook: call emitOpportunityFoundEvent()
app/api/scraper/facebook/route.ts               # Hook: call emitOpportunityFoundEvent()
app/api/scraper/mercari/route.ts                # Hook: call emitOpportunityFoundEvent()
app/api/scraper/offerup/route.ts                # Hook: call emitOpportunityFoundEvent()
.env.example                                    # Add all NOTIFICATION_* env vars
```

Schema additions (if not present from Story 10.1):
```
prisma/schema.prisma                            # Add retryCount Int @default(0) and errorMessage String? to NotificationEvent
```

### Known Gaps & Future Work

- **Event retention**: PROCESSED events accumulate indefinitely. Future story: purge events older than 30 days. Without this, the NotificationEvent table will grow unboundedly.
- **Email bounce handling**: Hard bounces waste retry budget. Future story: add `emailBounced` flag to User and Resend webhook for bounce/complaint detection.
- **Unsubscribe token security**: Existing `unsubscribeUrl()` uses unsigned base64 (trivially forgeable). Future security story: HMAC-signed tokens.
- **SPF/DKIM/DMARC**: Verify domain authentication in Resend dashboard BEFORE deploying to production.
- **Observability**: Future story: Resend webhook for delivery/open/bounce tracking. Dashboard for email delivery rates, queue depth, processing latency.
- **SMS extension**: When Epic 11 (Push & SMS) is implemented, the same NotificationEvent records can be consumed by a separate SMS processor. The processor function is named `processFlipLifecycleNotifications()` (channel-agnostic) with email-specific dispatch internally. A parallel `processPushNotifications()` can be added without refactoring the event model.
- **CAN-SPAM physical address**: Email templates should include company mailing address in footer. Verify with legal.

### Testing Standards

- Jest test environment: `node` (NOT jsdom)
- `maxWorkers: 1` — prevents resource conflicts
- Mock Prisma client for unit tests (do NOT hit real DB)
- Mock Resend API calls (use NullProvider or jest.mock)
- Use `MockEmailCapture` utility for capturing sent emails in tests
- Coverage thresholds: branches 96%, functions 98%, lines 99%, statements 99%
- Acceptance tests: Gherkin in `test/acceptance/features/E-010-monitoring-email-notifications.feature`
- Tag every scenario: `@E-010-S-<N>` + `@story-10-3` + relevant `@FR-NOTIFY-*` tags

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 10.3] — AC and DoD
- [Source: _bmad-output/implementation-artifacts/10-1-background-job-scheduler.md] — NotificationEvent model, event queue pattern, processor architecture
- [Source: src/lib/email-service.ts] — Existing email service singleton — EXTEND with new sender methods
- [Source: src/lib/email-templates.ts] — Existing email template design system — EXTEND with new templates (helpers are module-private: `baseLayout`, `btn`, `divider`)
- [Source: src/lib/notification-events.ts (Story 10.1)] — createNotificationEvent() — use for all event creation
- [Source: src/lib/posting-queue-processor.ts] — Batch processing with retryCount pattern (lines 85-96)
- [Source: prisma/schema.prisma#UserSettings (lines 254-260)] — Notification preference toggles + notifyFrequency
- [Source: prisma/schema.prisma#Opportunity (lines 98-121)] — Lifecycle statuses, userId is optional
- [Source: app/api/scraper/craigslist/route.ts (line 558)] — Opportunity creation trigger point
- [Source: app/api/opportunities/[id]/route.ts] — PATCH handler (needs auth + validation prerequisite)
- [Source: src/lib/listing-tracker.ts] — Existing listing state detection
- [Source: src/lib/errors.ts] — AppError hierarchy
- [Source: src/lib/logger.ts] — Pino structured logging, logger.timed()
- [Source: src/lib/db.ts] — Prisma singleton, 2-connection pool

## Requirement Traceability

| FR | AC | Test Tag | Description |
|----|-----|----------|-------------|
| FR-NOTIFY-01 | AC-1 | @FR-NOTIFY-01 @story-10-3 | Opportunity found email with platform, price, profit, score |
| FR-NOTIFY-05 | AC-2 | @FR-NOTIFY-05 @story-10-3 | Flip sold email with title, sale price, profit, ROI%, platform |
| FR-NOTIFY-06 | AC-3 | @FR-NOTIFY-06 @story-10-3 | Flip purchased email with title, purchase price, estimated profit |
| FR-NOTIFY-07 | AC-4 | @FR-NOTIFY-07 @story-10-3 | Flip listed email with title, destination platform, listing URL |
| FR-NOTIFY-01,05,06,07 | AC-5 | @story-10-3 | User preference + frequency toggles disable/defer emails per event type |

## Definition of Done (DoD)

- [ ] All ACs (1-5) have acceptance test scenarios in `test/acceptance/features/E-010-monitoring-email-notifications.feature`
- [ ] All unit tests pass with coverage thresholds met (branches 96%, functions 98%, lines 99%, statements 99%)
- [ ] No lint errors (`pnpm lint`)
- [ ] Build passes (`pnpm build`)
- [ ] All existing tests continue to pass (`pnpm test`)
- [ ] 4 email templates created (HTML + text) using existing design system with `List-Unsubscribe` headers
- [ ] 4 typed sender methods added to EmailService following `Omit` pattern
- [ ] Notification processor consumes PENDING events and sends emails via Resend
- [ ] Processor respects user notification preferences (master toggle + type-specific + notifyFrequency)
- [ ] Per-user email rate limiting prevents flooding (default 10/hour)
- [ ] Opportunity digest aggregation when > 5 events pending for same user
- [ ] Provider circuit breaker stops batch on consecutive Resend failures
- [ ] Stale events (> 48 hours) skipped and marked
- [ ] Event creation hooks in scraper routes via shared helper (not duplicated 5x)
- [ ] Opportunity PATCH hardened with auth, Zod validation, and status transition detection BEFORE event hooks
- [ ] Event creation failures do not block lifecycle transitions (try/catch with logger.error)
- [ ] Events always created regardless of notification preferences (processor filters)
- [ ] Retry logic uses `retryCount` field with max retries cap
- [ ] Idempotency guard checks for existing `resendMessageId` before re-sending
- [ ] Concurrent run guard via database-level atomic lock
- [ ] Processing endpoint authenticated with dedicated API key (not shared with monitoring)
- [ ] Max run duration enforced (240s) with clean abort
- [ ] Structured audit logging for every processed event
- [ ] No `any` types in production code
- [ ] RTM updated at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
