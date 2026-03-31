# Story 10.1: Background Job Scheduler

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69cb879722d106d9ecee271b

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **system**,
I want a background job scheduler to periodically check listings and trigger events,
So that monitoring and notifications can run without user intervention.

## Acceptance Criteria

1. **AC-1: Scheduled Monitoring Trigger** — Given the Cloud Run deployment, when a scheduled job is configured (via Cloud Scheduler or cron), then it triggers a monitoring endpoint at configurable intervals (default: every 30 minutes). The entire monitoring run completes within the HTTP request lifecycle (synchronous).
   - **FR refs:** Infrastructure foundation — no FRs directly fulfilled. Enables FR-MONITOR-* and FR-NOTIFY-* in subsequent stories.
   - **Test tag:** `@story-10-1`

2. **AC-2: Batch Listing Checks** — Given the monitoring endpoint is triggered, when tracked listings need to be checked, then the system batches listing checks per user using cursor-based pagination with a configurable batch size, limits each database query to the batch size, and applies per-platform inter-batch delays to avoid rate limiting on source platforms. A per-run listing cap ensures bounded execution time.
   - **FR refs:** Infrastructure foundation — no FRs directly fulfilled.
   - **Test tag:** `@story-10-1`

3. **AC-3: Notification Event Creation** — Given a monitoring check discovers a state change (price change, sold, expired, unavailable), when the event is detected, then a notification event is created in the database for downstream processing. The listing state update and event creation are atomic (single transaction). Events are deduplicated within a configurable time window.
   - **FR refs:** Infrastructure foundation — no FRs directly fulfilled.
   - **Test tag:** `@story-10-1`

4. **AC-4: Retry with Exponential Backoff** — Given the scheduler, when a job fails, then it is retried with exponential backoff and failures are logged via structured logging.
   - **FR refs:** Infrastructure foundation — no FRs directly fulfilled.
   - **Test tag:** `@story-10-1`

5. **AC-5: Concurrent Run Prevention** — Given a monitoring job is already running, when another trigger arrives, then the new trigger is rejected with HTTP 409 and the existing job continues. This guard uses a database-level constraint (not application-level read-then-write).
   - **FR refs:** Infrastructure foundation — no FRs directly fulfilled.
   - **Test tag:** `@story-10-1`

6. **AC-6: Stale Job Recovery** — Given a MonitoringJob has been in RUNNING status longer than the stale threshold (default 10 minutes), when a new monitoring trigger arrives, then the stale job is automatically transitioned to FAILED and the new run proceeds normally.
   - **FR refs:** Infrastructure foundation — no FRs directly fulfilled.
   - **Test tag:** `@story-10-1`

7. **AC-7: Monitoring Effectiveness Canary** — Given a monitoring run completes, when the ratio of successfully parsed listings (non-null price extraction) to total listings checked falls below 50% for any platform, then the job logs a `monitoring.canary.failure` error and sets a canaryWarning flag. Events are suppressed for that platform to prevent mass false positives.
   - **FR refs:** Infrastructure foundation — no FRs directly fulfilled.
   - **Test tag:** `@story-10-1`

## Tasks / Subtasks

- [ ] Task 1: Create Prisma models for monitoring infrastructure (AC: #1, #3, #5)
  - [ ] 1.1 Add `MonitoringJob` model (tracks scheduler runs — mirrors ScraperJob pattern). See schema below.
  - [ ] 1.2 Add `NotificationEvent` model (stores detected state changes for downstream processing). See schema below.
  - [ ] 1.3 Add `lastMonitoredAt DateTime?` field to the `Listing` model for round-robin fairness
  - [ ] 1.4 Add `notificationEvents NotificationEvent[]` relation to both `User` and `Listing` models
  - [ ] 1.5 Create a raw SQL migration for the partial unique index: `CREATE UNIQUE INDEX monitoring_job_running_unique ON "MonitoringJob" (status) WHERE status = 'RUNNING'` — this prevents concurrent RUNNING jobs at the database level
  - [ ] 1.6 Run `npx prisma migrate dev` to generate migration

- [ ] Task 2: Implement monitoring job service (`src/lib/monitoring-job.ts`) (AC: #1, #2, #4, #5, #6)
  - [ ] 2.1 Create `MonitoringJobService` with `startJob()`, `completeJob()`, `failJob()` lifecycle. Wrap all Prisma calls in try/catch — on `PrismaClientKnownRequestError` or `PrismaClientInitializationError`, throw `ExternalServiceError('database', error.message)`.
  - [ ] 2.2 Implement batch listing fetcher — query tracked listings per user (status NOT "SOLD"/"PASSED"), ordered by `lastMonitoredAt ASC` (least recently checked first), using cursor-based pagination (`findMany` with `cursor` + `take`), batch into groups of `MONITORING_BATCH_SIZE` (default 20). Group by platform before batching for efficient delay scheduling.
  - [ ] 2.3 Implement inter-batch delay (`MONITORING_BATCH_DELAY_MS`, default 1500ms) between platform-specific batches. eBay API batches need no delay.
  - [ ] 2.4 Implement exponential backoff retry logic (base 1s, max `MONITORING_MAX_RETRIES` retries (default 2 per listing — reserve higher retry budget for Cloud Scheduler level), max 4s delay)
  - [ ] 2.5 Implement atomic job creation guard: use `prisma.monitoringJob.create()` inside a try/catch. If a partial unique index violation occurs (`PrismaClientKnownRequestError` code `P2002`), return HTTP 409 CONFLICT with "A monitoring job is already running." DO NOT use `findFirst` + `create` — this is a TOCTOU race condition.
  - [ ] 2.6 Implement stale job recovery: before starting a new run, query for any `MonitoringJob` with `status = 'RUNNING'` AND `startedAt` older than `MONITORING_STALE_JOB_TIMEOUT_MS` (default 10 min). Automatically transition to FAILED with `errorMessage: 'Reaped: exceeded maximum run duration'`. Log at `logger.warn` level. This runs BEFORE the atomic create.
  - [ ] 2.7 Implement per-run listing cap: `MONITORING_MAX_LISTINGS_PER_RUN` (default 500). Query only this many listings per run, ordered by `lastMonitoredAt ASC`. Log summary: `{ totalEligible, checkedThisRun, skippedUntilNextRun }`.
  - [ ] 2.8 Implement platform circuit breaker: track consecutive failures per platform within a run. After `MONITORING_PLATFORM_FAILURE_THRESHOLD` (default 3) consecutive failures, skip remaining listings for that platform. Log at `logger.error`: `{ platform, consecutiveFailures, skippedListings }`. Continue processing other platforms.
  - [ ] 2.9 Implement max run duration cap: check elapsed time via `logger.timed()` before each batch. If `MONITORING_MAX_RUN_DURATION_MS` (default 10 min) exceeded, mark job COMPLETED with `completedEarly: true` and `{ reason: 'max_duration_exceeded', batchesCompleted, batchesRemaining }`. This ensures the job finishes well before the next scheduled trigger.
  - [ ] 2.10 Per-platform request budgets: max `MONITORING_MAX_CHECKS_PER_PLATFORM` (default 50) listing checks per platform per cycle. Excess listings deferred to next run via `lastMonitoredAt` ordering.
  - [ ] 2.11 Every individual listing check MUST be wrapped in its own try/catch. On failure, log at `logger.warn` with `{ listingId, platform, error }`, increment error counter, continue to next listing. Never let one listing failure abort the batch.

- [ ] Task 3: Extend listing state checker in `src/lib/listing-tracker.ts` (AC: #2, #3, #7)
  - [ ] 3.1 **CRITICAL: `src/lib/listing-tracker.ts` already implements `detectSoldStatus()`, `extractCurrentPrice()`, `getTrackableListings()`, `processListingCheck()`, and `runTrackingCycle()`. DO NOT create a separate `listing-monitor.ts`. Extend the existing module.**
  - [ ] 3.2 Add `createNotificationEventsForStateChanges()` — wraps existing state detection with NotificationEvent creation in a `prisma.$transaction()`.
  - [ ] 3.3 Add platform-specific response classification: distinguish "genuinely removed" (HTTP 404/410, explicit "deleted"/"flagged" text) from "access denied" (HTTP 403/429, CAPTCHA pages). Map access-denied to `RateLimitError`, NOT to `listing.unavailable`. On rate limit detection: trigger platform circuit breaker, do NOT create any NotificationEvent.
  - [ ] 3.4 Add price change minimum delta threshold: ignore changes where `abs(newPrice - oldPrice) < max(MONITORING_PRICE_CHANGE_MIN_DELTA, oldPrice * MONITORING_PRICE_CHANGE_MIN_PERCENT / 100)`. Reuse existing `parsePrice()` for normalization across all platforms.
  - [ ] 3.5 Implement anomaly detection: if >MONITORING_ANOMALY_THRESHOLD_PERCENT (default 30%) of a platform's checked listings are detected as "unavailable" in one run, suppress event creation for that platform. Log at `logger.error`: `'Possible selector breakage'`, `{ platform, unavailableCount, totalChecked }`. Set `canaryWarning: true` on the MonitoringJob.
  - [ ] 3.6 For eBay: use Browse API batch search with `item_ids` filter (up to 20 items/request). Reuse `callEbayApi` from `src/scrapers/ebay/scraper.ts`. Track daily call count against `EBAY_MONITORING_DAILY_BUDGET` (default 2000). Skip eBay listings and log warning when budget exhausted.
  - [ ] 3.7 Track parse success rate per platform during each run. Store in `platformStats` JSON on MonitoringJob.
  - [ ] 3.8 Update `lastMonitoredAt` on each checked listing (inside the transaction).

- [ ] Task 4: Implement notification event service (`src/lib/notification-events.ts`) (AC: #3)
  - [ ] 4.1 Create `createNotificationEvent()` — persists event with type, payload, userId, listingId, deduplicationKey
  - [ ] 4.2 Define event types enum: `listing.sold`, `listing.price_changed`, `listing.expiring`, `listing.unavailable`
  - [ ] 4.3 Include old/new values in event payload for price changes. Keep payloads lean: `{ eventType, oldPrice?, newPrice?, expiryDate?, listingTitle, listingUrl, platform }`. Max 8KB.
  - [ ] 4.4 Include expiry timestamp in payload for expiring listings
  - [ ] 4.5 Implement event deduplication: compute `deduplicationKey` as `${listingId}:${eventType}:${hourBucket}` (hour-truncated timestamp). The `@@unique` constraint on `[userId, listingId, eventType, deduplicationKey]` prevents duplicates within the same hour. Catch `P2002` (unique violation) gracefully — log at `debug` level, skip creation.
  - [ ] 4.6 Listing state update + event creation MUST be in a single `prisma.$transaction()`. If the transaction fails, the listing retains its old state and will be re-checked next run.

- [ ] Task 5: Create monitoring API endpoint (`app/api/monitoring/run/route.ts`) (AC: #1, #4, #5, #6)
  - [ ] 5.1 POST handler — triggers a monitoring run. The run completes synchronously within the request lifecycle. Return results on completion.
  - [ ] 5.2 Auth (v1): Validate `Authorization: Bearer <key>` header against `MONITORING_API_KEY` using `crypto.timingSafeEqual()` to prevent timing attacks. Key must be 32+ characters. Return 401 for missing/invalid key — do NOT reveal endpoint existence. Log all auth failures at `error` level with source IP. Add rate limiting: reject if a successful run completed less than `MONITORING_INTERVAL_MINUTES / 2` ago.
  - [ ] 5.3 Guard against concurrent runs — delegate to `MonitoringJobService` atomic create (Task 2.5). Return 409 on conflict.
  - [ ] 5.4 Return job ID, status, and summary stats in response: `{ success: true, data: { jobId, status, listingsChecked, eventsCreated, duration } }`
  - [ ] 5.5 Validate incoming request with a Zod schema (even if body is minimal). Return `400 BAD_REQUEST` via `handleError()` with `ValidationError` for parse failures.

- [ ] Task 6: Cloud Scheduler configuration & env vars (AC: #1)
  - [ ] 6.1 Document Cloud Scheduler setup (HTTP target → `/api/monitoring/run`). Configure retry policy: max 1 retry, 60s timeout.
  - [ ] 6.2 Document configuring Cloud Run ingress to `internal-and-cloud-load-balancing` so the monitoring endpoint is not publicly routable (defense in depth).
  - [ ] 6.3 Add ALL env vars to `.env.example` (see Environment Variables table below)
  - [ ] 6.4 Document v2 auth migration path: Cloud Scheduler OIDC token verification via `google-auth-library` `OAuth2Client.verifyIdToken()`. Add as a future story note.

- [ ] Task 7: Unit & integration tests (AC: all)
  - [ ] 7.1 Unit tests for `MonitoringJobService` lifecycle, atomic guard (P2002 handling), stale recovery, per-run cap, max duration, circuit breaker
  - [ ] 7.2 Unit tests for listing state detection with mocked responses — test sold, price_changed, expiring, unavailable, plus false positives (403→not unavailable, selector breakage→anomaly detection)
  - [ ] 7.3 Unit tests for `createNotificationEvent()` — deduplication, transactional integrity, event types, payload validation
  - [ ] 7.4 Unit tests for API route auth (valid key, invalid key, timing-safe), guard (409), rate limiting, Zod validation
  - [ ] 7.5 Maintain Jest coverage thresholds (branches 96%, functions 98%, lines 99%, statements 99%)

- [ ] Task 8: Acceptance tests (AC: all)
  - [ ] 8.1 Write Gherkin scenarios in `test/acceptance/features/E-010-monitoring-email-notifications.feature`
  - [ ] 8.2 Write step definitions in `test/acceptance/step_definitions/E-010-monitoring-email-notifications.steps.ts`
  - [ ] 8.3 Tag scenarios: `@E-010-S-1` through `@E-010-S-N` + `@story-10-1` (no FR tags — this story is infrastructure foundation only)
  - [ ] 8.4 Update RTM at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`

## Dev Notes

### Architecture & Design Decisions

**Pattern: External Scheduler → API Endpoint (NOT in-process cron)**
The scheduler itself lives OUTSIDE the Next.js process. Cloud Scheduler makes an HTTP POST to `/api/monitoring/run`. This is the correct pattern for Cloud Run because:
- Cloud Run instances are ephemeral — in-process schedulers (node-cron, Bull) lose state on cold starts
- Cloud Scheduler provides reliability, retry, and observability out of the box
- The API endpoint is stateless and horizontally scalable

**CRITICAL: Execution Environment Constraints**
- Vercel `maxDuration` is 30s — this endpoint MUST run on Cloud Run only (`--timeout=300s`). Add route exclusion in `vercel.json` if needed.
- Cloud Run default behavior throttles CPU after response. The monitoring run MUST complete synchronously within the request lifecycle — return results when done. Cloud Run's 300s timeout accommodates ~180 listings at 20/batch with 1.5s delays.
- DO NOT return a response and then continue processing in the background — Next.js API routes terminate when the response is sent. There is no `waitUntil()` equivalent in this stack.

**Pattern: Job Tracking via Database (mirrors ScraperJob)**
Follow the existing `ScraperJob` model pattern:
- Status lifecycle: `PENDING` → `RUNNING` → `COMPLETED` / `FAILED`
- Track `startedAt`, `completedAt`, `errorMessage`
- Atomic creation guard via partial unique index (NOT application-level `findFirst` + `create`)
- Stale job reaper for self-healing after process crashes
- Store `listingsChecked`, `eventsCreated`, `errorsEncountered`, `platformStats`

**Pattern: Notification Events as Database Records**
NotificationEvent records serve as an event queue for downstream processors (Story 10.3/10.4/10.5 will consume these):
- Events are immutable after creation
- Downstream processors query for unprocessed events via `WHERE status = 'PENDING' ORDER BY createdAt`
- Status: `PENDING` → `PROCESSED` / `FAILED`
- Decouples detection from delivery
- Deduplicated via `deduplicationKey` unique constraint (one event per type per listing per hour)

**DB Queue Scaling Boundaries**
- Expected load: < 1,000 events/day at launch. PostgreSQL handles this trivially.
- Event retention: processed events should be cleaned up after 30 days. Document as a future maintenance story.
- Revisit threshold: if event throughput exceeds ~1,000/minute or consumer latency requirements drop below 1 second, migrate to Cloud Pub/Sub. Current architecture supports ~10,000 events/day comfortably.

**Pattern: Lightweight HTTP Fetch for Monitoring (NOT Playwright)**
The production Dockerfile (`node:22-alpine`) does NOT include Chromium/Playwright. Individual listing state checks MUST use lightweight approaches:
- **Craigslist/OfferUp/Mercari:** Use Node.js `fetch()` with randomized User-Agent headers. Parse HTML response for sold status, price, and removal indicators.
- **eBay:** Browse API batch search with `item_ids` filter (up to 20 items/request). Already REST-based, no browser needed.
- **Facebook:** Graph API call if token available; otherwise skip (Graph API token managed in `src/scrapers/facebook/token-store.ts`).
- Memory budget per monitoring run: < 256MB. Never open a Playwright browser.

### Existing Code to Reuse — DO NOT REINVENT

| What | Where | How to Reuse |
|------|-------|-------------|
| **Listing state detection** | `src/lib/listing-tracker.ts` | **CRITICAL: Already implements `detectSoldStatus()`, `extractCurrentPrice()`, `getTrackableListings()`, `processListingCheck()`, `runTrackingCycle()`. EXTEND this module — do NOT create a parallel implementation.** |
| Job lifecycle pattern | `src/scrapers/*/scraper.ts` → ScraperJob | Mirror status transitions |
| Queue processing | `src/lib/posting-queue-processor.ts` | Mirror batch processing with delays and per-item try/catch (lines 85-96) |
| eBay API calls | `src/scrapers/ebay/scraper.ts` → `callEbayApi()` | Reuse for Browse API batch status checks |
| Price parsing | `src/scrapers/craigslist/scraper.ts` → `parsePrice()` | Normalize prices consistently across all platforms |
| Error hierarchy | `src/lib/errors.ts` | Use AppError subclasses: `ExternalServiceError`, `RateLimitError`, `ValidationError` |
| Prisma singleton | `src/lib/db.ts` | Import `prisma` — NEVER instantiate new PrismaClient. Pool is 2 connections per instance — keep queries short. |
| Structured logging | `src/lib/logger.ts` | Use `logger.info/warn/error` with metadata. Use `logger.timed()` for duration tracking. |
| API route pattern | Any `app/api/*/route.ts` | Follow NextResponse.json + handleError() pattern |
| Facebook token | `src/scrapers/facebook/token-store.ts` | Check for valid token before attempting Facebook listing checks |

### Anti-Patterns — DO NOT DO THESE

- **DO NOT use node-cron, Bull, Agenda, or any in-process scheduler** — Cloud Run instances are ephemeral
- **DO NOT return a response and then continue processing in the background** — Next.js terminates the function after response. Complete all work within the request lifecycle.
- **DO NOT create `src/lib/listing-monitor.ts`** — `src/lib/listing-tracker.ts` already implements listing state detection. Extend it.
- **DO NOT launch Playwright browsers for monitoring checks** — production container has no Chromium. Use lightweight `fetch()` for HTML-based platforms and Browse API for eBay.
- **DO NOT rely on application-level `findFirst` + `create` for concurrency guards** — this is a TOCTOU race. Use the database-level partial unique index.
- **DO NOT scrape listings synchronously one-by-one without batching** — batch with inter-batch delays
- **DO NOT treat HTTP 403/429 as "listing unavailable"** — rate limiting is transient, not a state change. Classify responses correctly.
- **DO NOT update listing state and create NotificationEvent in separate transactions** — use `prisma.$transaction()` for atomicity
- **DO NOT send notifications directly from the monitoring job** — create NotificationEvent records for downstream processing
- **DO NOT process all listings in a single run regardless of count** — cap per run via `MONITORING_MAX_LISTINGS_PER_RUN` and round-robin via `lastMonitoredAt`
- **DO NOT let a single listing failure abort the entire batch** — catch per-listing, log, continue
- **DO NOT add any npm packages for job scheduling** — the scheduler is external (Cloud Scheduler)
- **DO NOT use `any` in production code** — TypeScript strict mode is enforced
- **DO NOT rely solely on a static API key for production auth long-term** — plan OIDC migration (v2)

### Platform-Specific Listing Check Strategy

| Platform | Method | Cost/Check | Batch Support | Notes |
|----------|--------|-----------|---------------|-------|
| **Craigslist** | `fetch()` + HTML parse | ~200ms | No | Reuse `detectSoldStatus()` + `extractCurrentPrice()` from `listing-tracker.ts`. 404/410 = unavailable. Look for "deleted"/"flagged" text. |
| **eBay** | Browse API batch search | 1 API call / 20 items | Yes (item_ids filter) | **CRITICAL: 5,000 calls/day quota.** Allocate max `EBAY_MONITORING_DAILY_BUDGET` (default 2000) for monitoring. Track daily count. Skip when exhausted. |
| **Facebook** | Graph API (if token valid) | 1 API call | Possible | Check token validity first via `token-store.ts`. Skip if no valid token — do not fail. |
| **Mercari** | Internal API via `fetch()` | ~300ms | No | Status field in response: active/sold/deleted. Use browser-like headers. |
| **OfferUp** | `fetch()` + HTML parse | ~200ms | No | Look for "sold" badge or 404. Use anti-detection headers from existing scraper config. |

**Response Classification Rules:**
- HTTP 404/410, explicit "deleted"/"flagged"/"removed" text → `listing.unavailable` (genuine removal)
- HTTP 403/429, CAPTCHA page, "blocked"/"verify" text → `RateLimitError` (transient — trigger circuit breaker, no event)
- HTTP 200 with parseable price different from stored → `listing.price_changed` (after min delta check)
- HTTP 200 with "sold" indicator → `listing.sold`
- HTTP 200 but price extraction returns null → increment canary counter (possible selector breakage)

### Database Schema Additions

```prisma
model MonitoringJob {
  id                String    @id @default(cuid())
  status            String    @default("PENDING") // PENDING, RUNNING, COMPLETED, FAILED
  startedAt         DateTime?
  completedAt       DateTime?
  listingsChecked   Int       @default(0)
  eventsCreated     Int       @default(0)
  errorsEncountered Int       @default(0)
  totalListings     Int       @default(0)     // Expected total for progress reporting
  platformStats     Json?                     // { craigslist: { checked: 40, parsed: 38, events: 2 }, ... }
  skippedPlatforms  Json?                     // Platforms skipped and why (circuit breaker, budget)
  completedEarly    Boolean   @default(false) // True if terminated by max duration cap
  canaryWarning     Boolean   @default(false) // True if any platform failed parse canary
  errorMessage      String?
  retryCount        Int       @default(0)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([status])
  // Also: partial unique index via raw SQL migration (Task 1.5)
  // CREATE UNIQUE INDEX monitoring_job_running_unique ON "MonitoringJob" (status) WHERE status = 'RUNNING'
}

model NotificationEvent {
  id               String    @id @default(cuid())
  userId           String
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  listingId        String?
  listing          Listing?  @relation(fields: [listingId], references: [id], onDelete: SetNull)
  eventType        String    // listing.sold, listing.price_changed, listing.expiring, listing.unavailable
  payload          Json      // { oldPrice?, newPrice?, expiryDate?, listingTitle, listingUrl, platform }
  deduplicationKey String?   // ${listingId}:${eventType}:${hourBucket} — idempotency key
  status           String    @default("PENDING") // PENDING, PROCESSED, FAILED
  processedAt      DateTime?
  createdAt        DateTime  @default(now())

  @@unique([userId, listingId, eventType, deduplicationKey])
  @@index([userId, status])
  @@index([status, createdAt])  // Primary query path for downstream consumers
  @@index([eventType, status])
  @@index([createdAt])
}
```

**IMPORTANT:** Add `notificationEvents NotificationEvent[]` relation to both `User` and `Listing` models. Add `lastMonitoredAt DateTime?` to `Listing` model.

### Project Structure Notes

New files to create:
```
src/lib/monitoring-job.ts          # MonitoringJobService — job lifecycle, atomic guard, stale recovery, batch orchestration
src/lib/notification-events.ts     # createNotificationEvent() — event persistence with deduplication
app/api/monitoring/run/route.ts    # POST — trigger monitoring run (Cloud Scheduler target)
src/__tests__/lib/monitoring-job.test.ts
src/__tests__/lib/notification-events.test.ts
src/__tests__/api/monitoring/run/route.test.ts
test/acceptance/features/E-010-monitoring-email-notifications.feature
test/acceptance/step_definitions/E-010-monitoring-email-notifications.steps.ts
```

Files to modify:
```
src/lib/listing-tracker.ts         # EXTEND with NotificationEvent creation, platform response classification, anomaly detection
prisma/schema.prisma               # Add MonitoringJob, NotificationEvent models; add lastMonitoredAt to Listing
.env.example                       # Add all MONITORING_* and EBAY_MONITORING_* env vars
```

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `MONITORING_API_KEY` | (required, 32+ chars) | Auth token for Cloud Scheduler. Store in GCP Secret Manager. |
| `MONITORING_INTERVAL_MINUTES` | 30 | Scheduling interval (for docs/reference, configured in Cloud Scheduler) |
| `MONITORING_BATCH_SIZE` | 20 | Number of listings to check per batch |
| `MONITORING_BATCH_DELAY_MS` | 1500 | Delay between platform-specific batches (ms) |
| `MONITORING_MAX_RETRIES` | 2 | Max retry attempts per individual listing check |
| `MONITORING_MAX_LISTINGS_PER_RUN` | 500 | Cap on listings checked per run (fairness / time budget) |
| `MONITORING_MAX_CHECKS_PER_PLATFORM` | 50 | Max listing checks per platform per cycle |
| `MONITORING_MAX_RUN_DURATION_MS` | 600000 | Hard cap on run duration (10 min) before graceful termination |
| `MONITORING_STALE_JOB_TIMEOUT_MS` | 600000 | Time after which a RUNNING job is auto-reaped as stale |
| `MONITORING_PLATFORM_FAILURE_THRESHOLD` | 3 | Consecutive failures before platform circuit breaker trips |
| `MONITORING_ANOMALY_THRESHOLD_PERCENT` | 30 | % of "unavailable" detections that triggers selector breakage suppression |
| `MONITORING_PRICE_CHANGE_MIN_DELTA` | 1.0 | Minimum absolute dollar change to trigger price event |
| `MONITORING_PRICE_CHANGE_MIN_PERCENT` | 1 | Minimum percent change to trigger price event |
| `MONITORING_DEDUP_WINDOW_MINUTES` | 60 | Deduplication window (events with same key within this window are skipped) |
| `EBAY_MONITORING_DAILY_BUDGET` | 2000 | Max eBay Browse API calls allocated to monitoring per day |

### Testing Standards

- Jest test environment: `node` (NOT jsdom)
- `maxWorkers: 1` — prevents resource conflicts
- Mock Prisma client for unit tests (do NOT hit real DB)
- Mock `fetch()` responses for listing state checks
- Coverage thresholds: branches 96%, functions 98%, lines 99%, statements 99%
- Acceptance tests: Gherkin in `test/acceptance/features/E-010-*.feature`
- Tag every scenario: `@E-010-S-<N>` + `@story-10-1` (no FR tags — this is an infrastructure story with no FRs directly fulfilled)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 10.1] — AC and DoD
- [Source: _bmad-output/planning-artifacts/architecture.md#Scraper Architecture] — Platform scraping patterns
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — Prisma model patterns
- [Source: src/lib/listing-tracker.ts] — **CRITICAL: Existing listing state detection — EXTEND, do not duplicate**
- [Source: src/lib/posting-queue-processor.ts] — Queue processing with batch/retry + per-item error isolation (lines 85-96)
- [Source: src/scrapers/ebay/scraper.ts] — callEbayApi() for Browse API integration
- [Source: src/scrapers/craigslist/scraper.ts] — parsePrice() for price normalization, selector failure pattern
- [Source: src/scrapers/facebook/token-store.ts] — Facebook token validation
- [Source: src/lib/errors.ts] — AppError hierarchy (ExternalServiceError, RateLimitError)
- [Source: src/lib/logger.ts] — Pino structured logging, logger.timed()
- [Source: src/lib/db.ts] — Prisma singleton, 2-connection pool constraint
- [Source: app/api/health/route.ts] — System endpoint pattern
- [Source: app/api/scraper-jobs/route.ts] — Job CRUD API pattern
- [Source: config/docker/Dockerfile] — Production image is node:22-alpine (NO Playwright/Chromium)

## Requirement Traceability

Story 10.1 is infrastructure-only. No FRs are directly fulfilled. FR-MONITOR-01 through FR-MONITOR-04 will be fulfilled by Story 10.2. FR-NOTIFY-* will be fulfilled by Stories 10.3-10.5.

| Scope | AC | Test Tag |
|-------|-----|----------|
| Infrastructure foundation | AC-1 through AC-7 | @story-10-1 |

## Definition of Done (DoD)

- [ ] All ACs (1-7) have acceptance test scenarios in `test/acceptance/features/E-010-monitoring-email-notifications.feature`
- [ ] All unit tests pass with coverage thresholds met
- [ ] No lint errors (`pnpm lint`)
- [ ] Build passes (`pnpm build`)
- [ ] All existing tests continue to pass (`pnpm test`)
- [ ] Prisma migration runs cleanly (including partial unique index)
- [ ] API endpoint responds correctly to Cloud Scheduler trigger (synchronous completion)
- [ ] Atomic job creation guard: database-level partial unique index prevents concurrent RUNNING jobs
- [ ] Stale job recovery: orphaned RUNNING jobs are auto-failed after timeout
- [ ] Per-run listing cap prevents unbounded run duration
- [ ] Platform circuit breaker skips failing platforms without blocking others
- [ ] Anomaly detection suppresses mass false-positive "unavailable" events
- [ ] Listing state update + event creation are atomic (single transaction)
- [ ] Event deduplication prevents duplicate notifications
- [ ] Max run duration ensures job completes before next scheduled trigger
- [ ] Price change detection uses normalized floats with minimum delta threshold
- [ ] Rate-limited responses (403/429) are never interpreted as listing removal
- [ ] Batch processing respects rate limits with configurable delays
- [ ] Failed individual listing checks are logged and skipped (not abort batch)
- [ ] Structured logging via Pino for all job lifecycle events
- [ ] No `any` types in production code
- [ ] RTM updated at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
