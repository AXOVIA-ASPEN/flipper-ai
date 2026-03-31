# Story 9.3: Cross-Platform Posting Queue

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69cb881fd20fde65961f7403

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want to queue listings for posting across multiple platforms,
So that I can maximize exposure without manually creating each listing.

## Acceptance Criteria

1. **Platform Selection & Queue Creation (AC1)** — FR-RELIST-04
   - Given a resale listing is ready
   - When the user selects target platforms (eBay, Mercari, FBMP, OfferUp)
   - Then a PostingQueueItem is created for each platform with status PENDING

2. **Queue Processing — Status Transitions (AC2)** — FR-RELIST-05
   - Given a PostingQueueItem with status PENDING
   - When the posting job runs
   - Then the status transitions to IN_PROGRESS and the listing is submitted to the target platform

3. **Successful Posting — URL Storage (AC3)** — FR-RELIST-05
   - Given a successful posting
   - When the platform confirms
   - Then the status transitions to POSTED and the live listing URL is stored

4. **Failure Handling — Retry Logic (AC4)** — FR-RELIST-05
   - Given a posting failure
   - When an error occurs
   - Then the status transitions to FAILED, the error is logged, and retry logic triggers (up to max 3 retries)

5. **Duplicate Prevention (AC5)** — FR-RELIST-06
   - Given a listing and target platform combination
   - When a PostingQueueItem already exists for [listingId, targetPlatform, userId]
   - Then a duplicate posting is prevented by the unique constraint

**FRs fulfilled:** FR-RELIST-04, FR-RELIST-05, FR-RELIST-06

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|---|---|---|
| FR-RELIST-04 | AC 1 | @FR-RELIST-04 @story-9-3 |
| FR-RELIST-05 | AC 2, AC 3, AC 4 | @FR-RELIST-05 @story-9-3 |
| FR-RELIST-06 | AC 5 | @FR-RELIST-06 @story-9-3 |

## Tasks / Subtasks

### CRITICAL: Existing Code Inventory — DO NOT REBUILD

The following are **already built, tested, and production-ready**. DO NOT recreate these. Some require TARGETED MODIFICATIONS documented in tasks below:

| Component | File | Status | Modification Needed? |
|---|---|---|---|
| POST /api/posting-queue (single + batch) | `app/api/posting-queue/route.ts` | Complete | No |
| GET /api/posting-queue (list + filter) | `app/api/posting-queue/route.ts` | Complete | No |
| GET /api/posting-queue/:id | `app/api/posting-queue/[id]/route.ts` | Complete | No |
| PATCH /api/posting-queue/:id | `app/api/posting-queue/[id]/route.ts` | Complete | No |
| DELETE /api/posting-queue/:id | `app/api/posting-queue/[id]/route.ts` | Complete | No |
| POST /api/posting-queue/:id/retry | `app/api/posting-queue/[id]/retry/route.ts` | Complete | No |
| GET /api/posting-queue/stats | `app/api/posting-queue/stats/route.ts` | Complete | No |
| Queue processor (processQueue, processItem) | `src/lib/posting-queue-processor.ts` | Complete | **YES — Task 3** |
| getQueueStats() | `src/lib/posting-queue-processor.ts` | Complete | No |
| registerPoster() handler system | `src/lib/posting-queue-processor.ts` | Complete | No |
| Zod schemas (Create/Batch/Query/Update) | `src/lib/validations.ts` | Complete | No |
| PostingQueueItem Prisma model | `prisma/schema.prisma` | Complete | No |
| Feature gating (ebayCrossListing, PRO tier) | `app/api/posting-queue/route.ts` | Complete | No |
| All API unit tests | `src/__tests__/api/posting-queue*.test.ts` | Complete | No |
| Processor unit tests | `src/__tests__/lib/posting-queue-processor.test.ts` | Complete | **YES — Task 3** |

### Implementation Phases

Implement in order: **Phase 1 (backend: Tasks 3-4)** then **Phase 2 (frontend: Tasks 1-2, 5)**. This lets you validate backend processing before building UI.

---

### What This Story MUST Build

- [ ] **Task 1: Cross-Posts Dashboard Page** (AC: #1)
  - [ ] 1.1 Create `app/posting-queue/page.tsx` as a `'use client'` component directly (NOT a server component shell — match the pattern in `app/messages/page.tsx` which is `'use client'` at the page level)
  - [ ] 1.2 Build the dashboard in `app/posting-queue/page.tsx` (or extract to `src/components/posting-queue/PostingQueueDashboard.tsx` if it exceeds ~200 lines). Fetch from `/api/posting-queue` and `/api/posting-queue/stats` using `useState` + `useEffect` + `fetch` pattern (same as `app/messages/page.tsx`). Display stats summary at top (pending, in-progress, posted, failed, total) using small stat cards. **REQUIRED STATES**: (a) Auth redirect if unauthenticated, (b) Loading skeleton (5 placeholder cards), (c) Error banner with retry button, (d) Empty state: "No cross-posts yet. Go to Opportunities to cross-list items." with link to `/opportunities`, (e) Loaded state with items and stats
  - [ ] 1.3 Create `src/components/posting-queue/QueueItemCard.tsx` — renders one PostingQueueItem. Show: listing title, target platform badge, status pill (color-coded: PENDING=yellow, IN_PROGRESS=blue, POSTED=green, FAILED=red, CANCELLED=gray), askingPrice, listing thumbnail (first imageUrl — **IMPORTANT**: `imageUrls` is stored as a JSON string, not an array. Use `JSON.parse()` with try/catch to extract the first URL, following the same pattern as `getFirstImage()` in `KanbanBoard.tsx`), createdAt relative time. Actions: Retry button (for FAILED, show toast on success/failure), Cancel button (for PENDING, show confirmation dialog before DELETE), View URL link (for POSTED with `externalPostUrl`). **SECURITY**: For POSTED items, validate `externalPostUrl` scheme before rendering as `<a href>` — only allow `https://` and `http://` schemes. Reject `javascript:`, `data:`, `file:`, etc. For FAILED items: display `errorMessage` truncated to 2 lines with "Show more" expand toggle
  - [ ] 1.4 Inline filters directly in the dashboard component (do NOT create a separate QueueFilters file — two `<select>` dropdowns do not warrant their own component): status dropdown (all from `PostingStatusEnum`) and targetPlatform dropdown (all from `PlatformEnum`). Use URL search params for filter state via `useFilterParams` hook
  - [ ] 1.5 Pagination: reuse existing offset-based pattern. Default limit=50. Show total count
  - [ ] 1.6 "Process Queue" button at top of dashboard (next to stats) — calls `POST /api/posting-queue/process`. Show spinner during processing. On completion, display toast with results breakdown ("Processed 5 items: 3 posted, 2 failed"). Refresh queue list and stats. Disable button when no PENDING items exist

- [ ] **Task 2: Cross-Post Action from KanbanBoard** (AC: #1)
  - [ ] 2.1 Create `src/components/posting-queue/CrossPostModal.tsx` — `'use client'` modal. Props: `listingId: string`, `sourcePlatform: string`, `listingTitle: string`, `askingPrice?: number`, `onClose: () => void`, `onSuccess: () => void`
  - [ ] 2.2 Modal content: On mount, fetch `GET /api/posting-queue?listingId={listingId}` to determine which platforms already have queue items. Display checkboxes for each platform (EBAY, FACEBOOK_MARKETPLACE, OFFERUP, MERCARI) EXCEPT the source platform (hidden). Platforms with existing queue items show as disabled with "Already queued" note. Optional askingPrice field pre-populated from `askingPrice` prop. Submit calls `POST /api/posting-queue` with batch payload `{ listingId, platforms: [...selected], askingPrice }`. **EDGE CASES**: (a) If ALL non-source platforms already queued, show "This listing is already queued for all available platforms" with no submit button. (b) Disable submit button during API call (prevent double-click). (c) Show loading spinner on submit
  - [ ] 2.3 Show toast on success: "Queued for X platforms" with a link text "View in Cross-Posts" pointing to `/posting-queue`. Show error toast on failure. Use existing `useToast()` from `ToastProvider`
  - [ ] 2.4 Add "Cross-Post" button to KanbanBoard opportunity cards — **THIS REQUIRES MODIFYING `KanbanBoardProps`**: Add a new optional prop `onCrossPost?: (opportunity: Opportunity) => void`. The KanbanBoard calls `onCrossPost(opportunity)` when the button is clicked. Only show the button on PURCHASED and LISTED column cards. The PARENT component (`app/opportunities/page.tsx`) manages modal state: `const [crossPostTarget, setCrossPostTarget] = useState<Opportunity | null>(null)` and renders `<CrossPostModal>` when non-null. Pass the opportunity's listing data (id, platform, title, askingPrice) to the modal
  - [ ] 2.5 Feature gate: Create `GET /api/user/tier` lightweight endpoint returning `{ tier: string }`. The opportunities page fetches this on mount and only passes `onCrossPost` to KanbanBoard when tier is PRO+. This avoids the problem that the client-side session (Firebase) does not include `subscriptionTier` — it must come from the server. **IMPORTANT**: The existing `SessionProvider`/`getCurrentUser()` returns Firebase user data, NOT Prisma user data with `subscriptionTier`. There is no existing client-side mechanism for tier checks.

- [ ] **Task 3: Queue Processing — Backend Fixes + API Trigger** (AC: #2, #3, #4)

  **CRITICAL SECURITY FIX**: The existing `processQueue()` in `src/lib/posting-queue-processor.ts` fetches ALL pending items globally (no `userId` filter). This means any authenticated user calling the process endpoint would trigger processing of EVERY user's queue items. This MUST be fixed.

  - [ ] 3.1 **Modify `src/lib/posting-queue-processor.ts`** — Add `userId` parameter to `processQueue()`:
    ```typescript
    export async function processQueue(userId: string, batchSize = 10): Promise<ProcessResult>
    ```
    Add `userId` to the `where` clause in `findMany` so only the authenticated user's items are processed. Change return type from `number` to `ProcessResult`:
    ```typescript
    interface ProcessResult { processed: number; posted: number; failed: number; }
    ```
    Track posted/failed counts during the processing loop and return the breakdown.

  - [ ] 3.2 **Add concurrency guard**: Before calling the poster, re-check the item status:
    ```typescript
    const current = await prisma.postingQueueItem.findUnique({ where: { id: item.id } });
    if (!current || current.status !== 'IN_PROGRESS') return; // Already processed by another call
    ```
    This prevents two concurrent `processQueue()` calls from double-processing the same item.

  - [ ] 3.3 **Add per-item timeout**: Wrap the poster call with `Promise.race()`:
    ```typescript
    const POSTER_TIMEOUT_MS = 30_000; // 30 seconds
    const result = await Promise.race([
      poster(item.listing, item),
      new Promise<PostingResult>((_, reject) =>
        setTimeout(() => reject(new Error('Posting timed out')), POSTER_TIMEOUT_MS)
      ),
    ]);
    ```
    This prevents a hung poster from blocking the entire queue run.

  - [ ] 3.4 **Add stuck item recovery**: At the start of `processQueue()`, reset any items stuck in IN_PROGRESS for > 5 minutes (stale from crashes/timeouts):
    ```typescript
    await prisma.postingQueueItem.updateMany({
      where: { userId, status: 'IN_PROGRESS', updatedAt: { lt: fiveMinutesAgo } },
      data: { status: 'PENDING' },
    });
    ```

  - [ ] 3.5 Create `app/api/posting-queue/process/route.ts` — POST endpoint:
    - Auth required via `getAuthUserId()`
    - Feature gate: check `ebayCrossListing` access (same as POST /api/posting-queue)
    - Call `ensurePostersRegistered()` (see Task 4) before `processQueue(userId)`
    - Rate limit: implement inline in the handler using a simple timestamp check against the user's last process time. The existing `rate-limiter.ts` uses IP+pathname keying and middleware — it does NOT support per-user keying needed here. Do NOT try to reuse it. Instead, add a `lastProcessedAt` check: query the user's most recent IN_PROGRESS or recently updated queue item. If a process ran within the last 60 seconds, return 429
    - Return `{ success: true, data: { processed: N, posted: N, failed: N } }`

  - [ ] 3.6 Update `src/__tests__/lib/posting-queue-processor.test.ts` — update tests for the new `userId` parameter, `ProcessResult` return type, concurrency guard, timeout, and stuck item recovery
  - [ ] 3.7 Create `src/__tests__/api/posting-queue-process.test.ts` — tests for: auth (401), feature gate (403), successful processing with result breakdown, rate limiting (429), empty queue (processed: 0)

- [ ] **Task 4: Platform Posting Handlers — Stub Registration** (AC: #2, #3, #4)

  **IMPORTANT**: Stubs return `{ success: false }` which triggers retry logic. With default maxRetries=3, every `processQueue()` call will cycle stubs through retries until permanently FAILED. This is expected behavior for stubs — users will see items fail with a clear "not yet implemented" message.

  - [ ] 4.1 Create `src/lib/platform-posters/index.ts` — single file containing ALL stub registrations using a factory pattern. Do NOT create 4 separate files for identical stubs:
    ```typescript
    import { registerPoster, type PlatformPoster } from '@/lib/posting-queue-processor';

    function createStubPoster(platformLabel: string): PlatformPoster {
      return async () => ({
        success: false,
        errorMessage: `${platformLabel} posting not yet implemented`,
      });
    }

    let registered = false;

    export function ensurePostersRegistered(): void {
      if (registered) return;
      registerPoster('EBAY', createStubPoster('eBay'));
      registerPoster('FACEBOOK_MARKETPLACE', createStubPoster('Facebook Marketplace'));
      registerPoster('MERCARI', createStubPoster('Mercari'));
      registerPoster('OFFERUP', createStubPoster('OfferUp'));
      registered = true;
    }
    ```
    **WHY `ensurePostersRegistered()` instead of import side-effect**: In Next.js on Vercel (serverless), module-level state can be cleared between Lambda invocations. An import side-effect that mutates the `platformPosters` registry in `posting-queue-processor.ts` may not survive cold starts. The explicit `ensurePostersRegistered()` function is called at the top of the process route handler, guaranteeing registration before every `processQueue()` call. The `registered` flag prevents redundant re-registration in hot Lambda instances.

  - [ ] 4.2 Create `src/__tests__/lib/platform-posters.test.ts` — test: `ensurePostersRegistered()` registers all 4 platforms, calling it twice is idempotent, each stub returns `{ success: false }` with descriptive error message

- [ ] **Task 5: Navigation Integration** (AC: #1)
  - [ ] 5.1 Add "Cross-Posts" link to `src/components/Navigation.tsx` — position after Messages (or after Opportunities if Messages link doesn't exist yet). Use `Send` or `ArrowUpFromLine` icon from `lucide-react`. **NO badge count** — the Navigation component currently has zero data fetching and zero `useEffect`/`useState`. Adding a fetch for badge count would fire a network request on every page navigation across the entire app. Just add the link with icon, matching the exact pattern of the other nav items. Badge can be added in a future story when a proper notification system exists
  - [ ] 5.2 User-facing label: "Cross-Posts" (NOT "Posting Queue" — users think "cross-post this item", not "manage my posting queue")

- [ ] **Task 6: Acceptance Tests** (AC: #1-5)
  - [ ] 6.1 Create (or append to) `test/acceptance/features/E-009-cross-platform-resale-listing.feature` with scenarios for Story 9.3. Continue `@E-009-S-<N>` numbering from Stories 9.1 and 9.2 scenarios (check existing file for last number, or start after those stories' counts)
  - [ ] 6.2 Required scenarios (minimum — add more if ACs warrant):
    - `@E-009-S-<N> @story-9-3 @FR-RELIST-04` — Platform selection creates PostingQueueItems
    - `@E-009-S-<N+1> @story-9-3 @FR-RELIST-05` — Queue processing transitions PENDING to IN_PROGRESS to POSTED
    - `@E-009-S-<N+2> @story-9-3 @FR-RELIST-05` — Failed posting triggers retry, eventually FAILED after max retries
    - `@E-009-S-<N+3> @story-9-3 @FR-RELIST-06` — Duplicate posting prevention via unique constraint
    - `@E-009-S-<N+4> @story-9-3 @FR-RELIST-05` — User-scoped processing (only processes authenticated user's items)
  - [ ] 6.3 Create step definitions in `test/acceptance/step_definitions/E-009-cross-platform-resale-listing.steps.ts` (or append to existing)
  - [ ] 6.4 Update RTM at `_bmad-output/test-artifacts/requirement-traceability-matrix.md`

- [ ] **Task 7: Unit Tests for New Code** (AC: #1-5)
  - [ ] 7.1 Create `src/__tests__/components/PostingQueueDashboard.test.tsx` — test rendering, stats display, filter interaction, empty state, loading state, error state. **CRITICAL**: Add `/** @jest-environment jsdom */` pragma at the top of this file. The project's `jest.config.js` defaults to `testEnvironment: 'node'`, which does not provide a DOM. Component tests using `@testing-library/react` require jsdom. Without this pragma, all React component tests will fail with `document is not defined`
  - [ ] 7.2 Create `src/__tests__/components/CrossPostModal.test.tsx` — test platform selection, source platform exclusion, already-queued platform detection, batch submission, error handling, loading state. **CRITICAL**: Add `/** @jest-environment jsdom */` pragma
  - [ ] 7.3 Ensure all new code in `src/lib/` and `app/api/` meets coverage thresholds: branches 96%, functions 98%, lines 99%, statements 99%

## Dev Notes

### Architecture Pattern — Extensible Handler Registration

The posting queue uses a **strategy pattern** with `registerPoster()`:

```typescript
// src/lib/posting-queue-processor.ts (ALREADY EXISTS)
export type PlatformPoster = (
  listing: Listing,
  queueItem: PostingQueueItem
) => Promise<PostingResult>;

export function registerPoster(platform: string, poster: PlatformPoster): void;
```

New platform handlers implement `PlatformPoster` and call `registerPoster()`. The processor calls the registered handler for `item.targetPlatform`. If no handler found, item is marked FAILED.

**Registration pattern**: Use `ensurePostersRegistered()` from `src/lib/platform-posters/index.ts` (explicit call, NOT import side-effect). Call this at the top of any code path that invokes `processQueue()`. This is robust against serverless cold starts where module-level state may be reset.

### State Machine

```
PENDING -> IN_PROGRESS -> POSTED (success)
                       -> PENDING (retriable failure, retryCount < maxRetries)
                       -> FAILED (final failure or max retries exceeded)
PENDING -> CANCELLED (user cancels via DELETE)
FAILED -> PENDING (manual retry via /api/posting-queue/:id/retry)
IN_PROGRESS -> PENDING (stuck item recovery, > 5 min stale)
```

Constraint: IN_PROGRESS items cannot be deleted (409 Conflict).

### Key Constants

| Constant | Value | Source |
|---|---|---|
| Default batch size | 10 items/run | `posting-queue-processor.ts` |
| Max batch creation | 5 platforms | `validations.ts` (CreatePostingQueueBatchSchema) |
| Default max retries | 3 | `prisma/schema.prisma` (PostingQueueItem.maxRetries) |
| Default pagination | 50, max 200 | `validations.ts` (PostingQueueQuerySchema) |
| Max title length | 200 chars | `validations.ts` |
| Max description length | 5000 chars | `validations.ts` |
| Feature gate | ebayCrossListing | PRO tier+ only |
| Poster timeout | 30 seconds | process route (Task 3.3) |
| Stuck item threshold | 5 minutes | process route (Task 3.4) |
| Process rate limit | 1 per 60s/user | process route (Task 3.5) |

### Auth Pattern

All posting-queue endpoints use `getAuthUserId()` from `src/lib/auth-middleware.ts`. This returns a Prisma user `id` (cuid) or `null`. Throw `UnauthorizedError` if null. The POST endpoint also checks `checkFeatureAccess(subscriptionTier, 'ebayCrossListing')` from `src/lib/tier-enforcement.ts`.

**Client-side tier check**: The Firebase session (`SessionProvider` / `getCurrentUser()`) returns Firebase user data, NOT the Prisma user with `subscriptionTier`. There is NO existing client-side mechanism for tier checks. Task 2.5 creates a new `/api/user/tier` endpoint for this purpose.

### Validation Pattern

All request validation uses Zod schemas from `src/lib/validations.ts`:
- `validateQuery(schema, searchParams)` for GET query params
- `validateBody(schema, body)` for POST/PATCH bodies
- Schemas: `PostingQueueQuerySchema`, `CreatePostingQueueItemSchema`, `CreatePostingQueueBatchSchema`, `UpdatePostingQueueItemSchema`

### Duplicate Prevention

The Prisma unique constraint `@@unique([listingId, targetPlatform, userId])` prevents duplicates at the DB level. The API uses `upsert` — if a duplicate exists, it's a no-op (batch) or updates fields (single).

### Security Guardrails

- **XSS via externalPostUrl**: Platform posters return `externalPostUrl` which is rendered as a link. Validate URL scheme — only allow `https://` and `http://`. Reject `javascript:`, `data:`, `file:` schemes
- **XSS via listing data**: Listing titles and descriptions originate from scraped marketplace data (user-generated content). React JSX escapes by default. NEVER use innerHTML or set HTML from unescaped database fields
- **IDOR via processQueue()**: The processor MUST filter by authenticated userId. The global processQueue() (without userId) must NOT be exposed to user-facing endpoints
- **Error message leakage**: The `errorMessage` field stores raw error strings. These could contain internal details. Display to users but do not log sensitive details in user-facing error messages

### Database Model Reference

```prisma
model PostingQueueItem {
  id              String    @id @default(cuid())
  userId          String
  listingId       String
  targetPlatform  String
  status          String    @default("PENDING")
  askingPrice     Float?
  title           String?
  description     String?
  externalPostId  String?
  externalPostUrl String?
  errorMessage    String?
  retryCount      Int       @default(0)
  maxRetries      Int       @default(3)
  scheduledAt     DateTime?
  postedAt        DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([listingId, targetPlatform, userId])
}
```

### Frontend Patterns to Follow

- **Page pattern**: `'use client'` directly in `app/` page file (match `app/messages/page.tsx` — NOT a server component shell)
- **Data fetching**: `useState` + `useEffect` + `fetch` (no SWR/React Query in this codebase)
- **Filtering**: Use `useFilterParams` hook for URL-based filter state
- **Toasts**: Use `useToast()` from `ToastProvider` for success/error feedback
- **Nav integration**: Follow `src/components/Navigation.tsx` existing pattern — icons from `lucide-react`, no data fetching in nav
- **Tailwind classes**: layout then spacing then color ordering. Dark mode via `dark:` prefix
- **imageUrls parsing**: The `Listing.imageUrls` field is a `String?` containing JSON-encoded array. Use `JSON.parse()` with try/catch (see `getFirstImage()` in `KanbanBoard.tsx` for the pattern)
- **Component tests**: Add `/** @jest-environment jsdom */` pragma to any `.test.tsx` file that renders React components

### Cross-Story Dependencies

- **Story 9.1** (AI Title and Description Generation): Generates `title` and `description` fields that can be passed when creating PostingQueueItems. If 9.1 is not yet implemented, user can manually enter title/description or leave blank
- **Story 9.2** (Optimal Listing Price Calculation): Generates `askingPrice`. If not yet implemented, user enters price manually
- **Story 9.4** (Image Reuse): Firebase Storage images attached to postings. This story does not need to handle images — 9.4 will extend the posting handlers to attach images
- **Epic 10, Story 10.1** (Background Job Scheduler): `processQueue()` will eventually be called by a cron job. The `scheduledAt` field on PostingQueueItem exists in the schema and is respected by `processQueue()`, but this story does NOT add a `scheduledAt` datetime picker to the UI — that will be useful only after Epic 10 adds automatic scheduling

### Files to Create

| File | Type | Purpose |
|---|---|---|
| `app/posting-queue/page.tsx` | Page | Cross-Posts dashboard (`'use client'`) |
| `src/components/posting-queue/QueueItemCard.tsx` | Component | Single queue item display |
| `src/components/posting-queue/CrossPostModal.tsx` | Component | Platform selection modal |
| `app/api/posting-queue/process/route.ts` | API | Queue processing trigger |
| `app/api/user/tier/route.ts` | API | Client-side tier check |
| `src/lib/platform-posters/index.ts` | Module | Stub factory + ensurePostersRegistered() |

### Files to Modify

| File | Change |
|---|---|
| `src/lib/posting-queue-processor.ts` | Add `userId` param, `ProcessResult` return type, concurrency guard, timeout, stuck item recovery |
| `src/__tests__/lib/posting-queue-processor.test.ts` | Update tests for new signature and behaviors |
| `src/components/Navigation.tsx` | Add "Cross-Posts" nav link |
| `src/components/KanbanBoard.tsx` | Add `onCrossPost` prop, Cross-Post button on PURCHASED/LISTED cards |
| `app/opportunities/page.tsx` | Add CrossPostModal state, pass `onCrossPost` to KanbanBoard, render modal |

### Testing Standards

- Jest `testEnvironment: 'node'` (global default), `maxWorkers: 1`, `forceExit: true`
- **Component tests MUST add `/** @jest-environment jsdom */` pragma** — the global `node` environment has no DOM
- Coverage thresholds: branches 96%, functions 98%, lines 99%, statements 99%
- Mock pattern: mock `@/lib/db` (Prisma), `@/lib/auth-middleware` (getAuthUserId), `@/lib/tier-enforcement` (checkFeatureAccess)
- Use `jest.fn()` for Prisma methods, return typed mock data matching schema
- Component tests: use `@testing-library/react`, mock `fetch` for API calls

### Project Structure Notes

- Alignment: follows `app/` + `src/components/` split pattern
- New `src/lib/platform-posters/` directory is a single file (stubs), not a multi-file directory. When real implementations come, each platform gets its own file
- API route at `app/api/posting-queue/process/route.ts` nests under existing posting-queue route group
- `app/api/user/tier/route.ts` is a lightweight utility endpoint (pattern: auth check then return tier)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.3] — Acceptance criteria and FRs
- [Source: _bmad-output/planning-artifacts/epics.md#FR-RELIST] — FR-RELIST-04, FR-RELIST-05, FR-RELIST-06
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — PostingQueueItem model
- [Source: _bmad-output/planning-artifacts/architecture.md#AI Integration Architecture] — Content generation patterns
- [Source: _bmad-output/planning-artifacts/ux-design.md#Flow 3c] — Cross-listing in resale lifecycle
- [Source: src/lib/posting-queue-processor.ts] — Existing processor with registerPoster() pattern
- [Source: app/api/posting-queue/route.ts] — Existing CRUD endpoints with feature gating
- [Source: src/lib/validations.ts] — Zod schemas for PostingQueue
- [Source: src/lib/tier-enforcement.ts] — Feature gating (ebayCrossListing)
- [Source: src/lib/subscription-tiers.ts] — PRO tier has ebayCrossListing=true
- [Source: prisma/schema.prisma#PostingQueueItem] — Database model with unique constraint
- [Source: app/messages/page.tsx] — Reference pattern for 'use client' page with data fetching
- [Source: src/components/KanbanBoard.tsx] — Reference for card rendering, getFirstImage(), opportunity interface

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
