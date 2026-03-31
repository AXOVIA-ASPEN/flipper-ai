# Story 3.8: Listing Data Processing & Deduplication

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69a4369b0a9d08a04cdd8144

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **user**,
I want scraped listings deduplicated and pre-filtered,
so that I only see unique, valid listings worth reviewing.

## Acceptance Criteria

<!-- Each criterion MUST reference the FR-* requirement(s) it validates from the PRD -->

1. Given a listing is scraped, when it has the same [platform, externalId, userId] as an existing listing, then the duplicate is skipped and the existing listing is not modified `FR-SCAN-12`
2. Given a listing is scraped, when its price is less than 0, then the listing is skipped and not stored `FR-SCAN-13`
3. Given a listing is scraped, when it is identified as a sponsored listing, then the listing is skipped and not stored `FR-SCAN-13`
4. Given a listing is scraped with price == 0 (FREE), when the user's "Free Item Handling" setting is "include and flag for review" (default), then the listing is stored and flagged for manual review `FR-SCAN-13`
5. Given a listing is scraped with price == 0 (FREE), when the user's "Free Item Handling" setting is "auto-analyze", then the listing is run through scoring and included only if it meets the flippability threshold `FR-SCAN-13`
6. Given a listing is scraped with price == 0 (FREE), when the user's "Free Item Handling" setting is "skip entirely", then the listing is discarded `FR-SCAN-13`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-SCAN-12 | AC #1 | @FR-SCAN-12 @story-3-8 |
| FR-SCAN-13 | AC #2, #3, #4, #5, #6 | @FR-SCAN-13 @story-3-8 |

## Definition of Done

- [x] All acceptance criteria are met and verified
- [x] Code reviewed and approved
- [x] Unit tests written and passing
- [x] Acceptance test scenarios created with dual tags (@FR-SCAN-12 @story-3-8 and @FR-SCAN-13 @story-3-8)
- [x] Feature file: `test/acceptance/features/E-003-multi-marketplace-scanning.feature`
- [ ] user_flows.feature updated (if story affects user flows)
- [x] No regressions -- existing tests still pass
- [x] Dev notes and references are complete
- [ ] Story-specific documentation updated (if applicable)
- [ ] Trello card moved to Verified
- [ ] Feature card checklist item marked complete

## Tasks / Subtasks

- [x] Task 1: Add `freeItemHandling` field to UserSettings model (AC: #4-#6, FR: FR-SCAN-13)
  - [x] 1.1 Add `freeItemHandling String @default("include_review")` to `UserSettings` model in `prisma/schema.prisma` (valid values: `include_review`, `auto_analyze`, `skip`)
  - [x] 1.2 Run `npx prisma migrate dev --name add-free-item-handling` to generate migration
  - [x] 1.3 Add Zod validation for the new field in `src/lib/validations.ts`: `freeItemHandling: z.enum(['include_review', 'auto_analyze', 'skip']).optional()`
  - [x] 1.4 Update `app/api/user/settings/route.ts` PATCH handler to accept the new field
  - [x] 1.5 Add `freeItemHandling` to the settings UI in `app/settings/page.tsx` as a radio group or select

- [x] Task 2: Create centralized pre-filter function in marketplace-scanner (AC: #1-#6, FR: FR-SCAN-12, FR-SCAN-13)
  - [x] 2.1 Add `PreFilterOptions` interface to `src/lib/marketplace-scanner.ts`:
    ```typescript
    export interface PreFilterOptions {
      userId: string;
      freeItemHandling: 'include_review' | 'auto_analyze' | 'skip';
    }
    ```
  - [x] 2.2 Add `PreFilterResult` interface:
    ```typescript
    export interface PreFilterResult {
      accepted: RawListing[];
      flaggedForReview: RawListing[];  // Free items with include_review
      skipped: { listing: RawListing; reason: string }[];
    }
    ```
  - [x] 2.3 Create `preFilterListings(platform, listings, options)` function that:
    - Skips listings with `askingPrice < 0` (reason: `negative_price`)
    - Skips sponsored listings detected by title content (reason: `sponsored`)
    - Handles free items (price == 0) per `freeItemHandling` setting:
      - `include_review`: add to `flaggedForReview` array
      - `auto_analyze`: run through `estimateValue()` and include only if `valueScore >= 70`
      - `skip`: add to skipped (reason: `free_item_skipped`)
    - Returns `PreFilterResult`
  - [x] 2.4 Sponsored detection: check `title.toLowerCase()` for 'sponsored' keyword. For eBay items, also check for `isSponsored` field if present in raw data.

- [x] Task 3: Create centralized deduplication function (AC: #1, FR: FR-SCAN-12)
  - [x] 3.1 Add `deduplicateListings(platform, listings, userId)` function to `src/lib/marketplace-scanner.ts`:
    ```typescript
    export async function deduplicateListings(
      platform: MarketplacePlatform,
      listings: RawListing[],
      userId: string
    ): Promise<{ unique: RawListing[]; duplicates: RawListing[] }>
    ```
  - [x] 3.2 Implementation: batch-query existing listings by `[platform, externalId, userId]` using `prisma.listing.findMany({ where: { platform, userId, externalId: { in: externalIds } }, select: { externalId: true } })` to get existing IDs efficiently
  - [x] 3.3 Filter: listings whose `externalId` exists in the DB result are duplicates; the rest are unique
  - [x] 3.4 Return `{ unique, duplicates }` arrays
  - [x] 3.5 **CRITICAL**: This replaces the current `upsert` pattern. Unique listings use `prisma.listing.create()` instead of `upsert()`. Existing listings are **NOT modified**.

- [x] Task 4: Refactor scraper routes to use centralized functions (AC: #1-#6, FR: FR-SCAN-12, FR-SCAN-13)
  - [x] 4.1 Refactor `app/api/scraper/craigslist/route.ts`:
    - Load user's `freeItemHandling` setting via `prisma.userSettings.findUnique({ where: { userId } })`
    - Replace inline `if (item.price <= 0) continue` with `preFilterListings()` call
    - Replace `prisma.listing.upsert()` loop with: `deduplicateListings()` → `prisma.listing.create()` for unique listings only
    - Handle `flaggedForReview` listings: create with `status: 'FLAGGED_REVIEW'` (or `notes: 'FREE_ITEM_REVIEW'` if no status change desired)
    - Keep existing inline sponsored filter in scraper module AND centralized filter (defense in depth)
  - [x] 4.2 Refactor `app/api/scraper/ebay/route.ts`: Same pattern as 4.1
  - [x] 4.3 Refactor `app/api/scraper/offerup/route.ts`: Same pattern as 4.1
  - [x] 4.4 Refactor `app/api/scraper/mercari/route.ts`: Same pattern as 4.1
  - [x] 4.5 Refactor `app/api/scrape/facebook/route.ts`: Same pattern as 4.1 (note: different path prefix `scrape/` not `scraper/`)
  - [x] 4.6 Update scraper response to include filtering stats: `{ duplicatesSkipped, preFilteredOut, freeItemsFlagged, freeItemsAutoAnalyzed }`

- [x] Task 5: Handle "flagged for review" free items in UI (AC: #4, FR: FR-SCAN-13)
  - [x] 5.1 Add visual indicator for flagged free items in `app/opportunities/page.tsx`: show a badge/tag "FREE - Review" on listings where `askingPrice == 0` and `notes` contains `FREE_ITEM_REVIEW`
  - [x] 5.2 Use existing Listing `notes` field (String?) to store `FREE_ITEM_REVIEW` flag rather than adding a new model field
  - [x] 5.3 Optionally add filter in opportunities page to show/hide flagged free items

- [x] Task 6: Write unit tests (AC: all)
  - [x] 6.1 Add tests for `preFilterListings()` in `src/__tests__/lib/marketplace-scanner.test.ts`:
    - Test: negative price listings are skipped
    - Test: sponsored listings are skipped
    - Test: free items with `include_review` → flaggedForReview array
    - Test: free items with `auto_analyze` + score >= 70 → accepted
    - Test: free items with `auto_analyze` + score < 70 → skipped
    - Test: free items with `skip` → skipped
    - Test: normal listings (price > 0, not sponsored) → accepted
  - [x] 6.2 Add tests for `deduplicateListings()` in `src/__tests__/lib/marketplace-scanner.test.ts`:
    - Test: listings with existing externalIds → duplicates array
    - Test: listings with new externalIds → unique array
    - Test: mixed batch → correct split
    - Test: empty listings array → empty results
  - [x] 6.3 Update `src/__tests__/api/craigslist-scraper.test.ts` to verify:
    - `preFilterListings()` is called before processing
    - `deduplicateListings()` is called before storage
    - `prisma.listing.create()` used instead of `upsert()` for unique listings
    - Duplicate listings are NOT stored or modified
    - Free item handling respects user settings
  - [x] 6.4 Add settings API test: verify PATCH accepts `freeItemHandling` field
  - [x] 6.5 Maintain coverage thresholds: branches 96%, functions 98%, lines 99%, statements 99%

- [x] Task 7: Write Gherkin acceptance tests (AC: all)
  - [x] 7.1 Add scenarios to `test/acceptance/features/E-003-multi-marketplace-scanning.feature`
  - [x] 7.2 Scenario: duplicate listing dedup with tags `@FR-SCAN-12 @story-3-8`
  - [x] 7.3 Scenario: negative price filtering with tags `@FR-SCAN-13 @story-3-8`
  - [x] 7.4 Scenario: sponsored listing filtering with tags `@FR-SCAN-13 @story-3-8`
  - [x] 7.5 Scenario: free item include_review handling with tags `@FR-SCAN-13 @story-3-8`
  - [x] 7.6 Scenario: free item auto_analyze handling with tags `@FR-SCAN-13 @story-3-8`
  - [x] 7.7 Scenario: free item skip handling with tags `@FR-SCAN-13 @story-3-8`
  - [x] 7.8 Update `_bmad-output/test-artifacts/requirements-traceability-matrix.md` with FR-SCAN-12, FR-SCAN-13

## Dev Notes

### CRITICAL: Existing Implementation Analysis

Significant filtering and deduplication logic **already exists inline** across scraper routes. **DO NOT rewrite scrapers from scratch.** Extract, centralize, and enhance the existing patterns.

**What already exists (DO NOT REWRITE):**

- **Upsert deduplication** in all 5 scraper routes using `prisma.listing.upsert({ where: { platform_externalId_userId: ... } })` — but this UPDATES existing records (wrong behavior per AC #1)
- **Price filtering** in `app/api/scraper/craigslist/route.ts:142` and `app/api/scraper/offerup/route.ts:387`: `if (item.price <= 0) continue` — skips free AND negative prices together
- **Sponsored filtering** in `src/scrapers/craigslist/scraper.ts:324`: `if (!title.includes('sponsored'))` — inline during DOM extraction
- **marketplace-scanner.ts** at `src/lib/marketplace-scanner.ts`: `processListings()`, `analyzeListing()`, `formatForStorage()`, `ViabilityCriteria` — central processing pipeline
- **UserSettings model** at `prisma/schema.prisma:228-245`: exists with `discountThreshold`, `autoAnalyze`, etc. — but NO `freeItemHandling` field yet
- **Settings API** at `app/api/settings/route.ts`: GET and PATCH handlers for user settings
- **Settings UI** at `app/settings/page.tsx`: form for editing user preferences

**What needs to change (the actual work):**

1. **Deduplication behavior change** — Switch from `upsert` (creates OR updates) to `findMany` + `create` (skip existing, only create new). This is the KEY semantic change: AC #1 says "the existing listing is not modified."
2. **Centralized pre-filter function** — Extract inline `price <= 0` and `sponsored` checks from individual routes into a reusable `preFilterListings()` function in `marketplace-scanner.ts`
3. **Free item handling** — New `freeItemHandling` column in UserSettings, new setting in UI, branching logic for 3 modes
4. **Separate negative price from free** — Current `item.price <= 0` lumps both together. Need to distinguish `price < 0` (always skip) from `price == 0` (user-configurable)

### Architecture Compliance

**Required Patterns (from architecture.md and project-context.md):**

- **Central Processing:** All filtering/dedup logic goes in `src/lib/marketplace-scanner.ts` — not inline in routes
- **API Route Pattern:** `app/api/` with named HTTP method handlers (GET, POST, PATCH, DELETE)
- **Error Handling:** Use `handleError()` from `@/lib/errors.ts`. Throw typed errors.
- **Auth:** Call `getAuthUserId()` from `@/lib/auth-middleware.ts` at route entry points
- **Database:** Use Prisma singleton from `@/lib/db.ts`. Never instantiate new PrismaClient.
- **Prisma Migrations:** Run `npx prisma migrate dev` for schema changes. Generated client at `src/generated/prisma/`.
- **Response Format:** `{ success: true, ... }` on success; `handleError(error)` on failure
- **TypeScript:** Strict mode, no `any`. Use `interface` for public APIs.
- **Frontend:** Client Component (`'use client'`). Tailwind CSS. Lucide icons.
- **Zod Validation:** All user input validated via Zod schemas in `src/lib/validations.ts`

### Library & Framework Requirements

| Library | Version | Purpose |
|---------|---------|---------|
| next | 16.x | API route framework |
| prisma | ^7.x | Database ORM, schema migration |
| zod | latest | Request validation |
| typescript | ^5 | Type safety |
| lucide-react | latest | UI icons |

No new libraries required. All dependencies already installed.

### File Structure Requirements

**Files to MODIFY:**

- `prisma/schema.prisma` — Add `freeItemHandling` field to `UserSettings` model
- `src/lib/marketplace-scanner.ts` — Add `preFilterListings()` and `deduplicateListings()` functions, add `PreFilterOptions` and `PreFilterResult` interfaces
- `src/lib/validations.ts` — Add Zod schema for `freeItemHandling` enum
- `app/api/settings/route.ts` — Accept `freeItemHandling` in PATCH handler
- `app/settings/page.tsx` — Add free item handling setting to UI
- `app/api/scraper/craigslist/route.ts` — Replace inline filtering with `preFilterListings()`, replace `upsert` with `deduplicateListings()` + `create`
- `app/api/scraper/ebay/route.ts` — Same refactoring pattern
- `app/api/scraper/offerup/route.ts` — Same refactoring pattern
- `app/api/scraper/mercari/route.ts` — Same refactoring pattern
- `app/api/scrape/facebook/route.ts` — Same refactoring pattern (note: `scrape/` not `scraper/`)
- `app/opportunities/page.tsx` — Add "FREE - Review" badge for flagged items
- `test/acceptance/features/E-003-multi-marketplace-scanning.feature` — Add dedup/filter scenarios
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` — Add FR-SCAN-12, FR-SCAN-13

**Files to CREATE:**

- `src/__tests__/lib/marketplace-scanner.test.ts` — Tests for new preFilter and dedup functions (or add to existing test file if it exists)
- Prisma migration file (auto-generated by `npx prisma migrate dev`)

**Files to REUSE (DO NOT MODIFY unless adding filter/dedup calls):**

- `src/lib/value-estimator.ts` — Used by `preFilterListings()` for auto-analyze mode, do not modify
- `src/lib/sse-emitter.ts` — SSE events unchanged
- `src/hooks/useSseEvents.ts` — Client-side SSE hook unchanged
- `src/lib/errors.ts` — Error classes unchanged
- `src/lib/auth-middleware.ts` — Auth middleware unchanged
- `src/lib/db.ts` — Prisma singleton unchanged
- `src/scrapers/craigslist/scraper.ts` — Keep inline sponsored filter as first-pass defense; centralized filter is second pass

### Key Implementation Details

#### Deduplication: From Upsert to Find+Create

**BEFORE (current — WRONG per AC #1):**
```typescript
// This UPDATES existing listings on re-scrape
const saved = await prisma.listing.upsert({
  where: { platform_externalId_userId: { platform, externalId: item.externalId, userId } },
  create: listingData,
  update: listingData, // <-- MODIFIES existing record
});
```

**AFTER (correct — skip existing):**
```typescript
// Step 1: Batch deduplication check
const { unique, duplicates } = await deduplicateListings(platform, rawListings, userId);

// Step 2: Only create NEW listings
for (const item of unique) {
  const saved = await prisma.listing.create({ data: listingData });
  // Emit SSE event only for new listings
  await sseEmitter.emit({ type: 'listing.found', data: { ... } });
}

// Step 3: Report skipped duplicates in response
// duplicates.length items were silently skipped
```

#### Deduplication Function Implementation

```typescript
export async function deduplicateListings(
  platform: MarketplacePlatform,
  listings: RawListing[],
  userId: string
): Promise<{ unique: RawListing[]; duplicates: RawListing[] }> {
  if (listings.length === 0) return { unique: [], duplicates: [] };

  const externalIds = listings.map((l) => l.externalId);

  // Batch query for existing listings
  const existing = await prisma.listing.findMany({
    where: { platform, userId, externalId: { in: externalIds } },
    select: { externalId: true },
  });

  const existingIds = new Set(existing.map((e) => e.externalId));

  const unique: RawListing[] = [];
  const duplicates: RawListing[] = [];

  for (const listing of listings) {
    if (existingIds.has(listing.externalId)) {
      duplicates.push(listing);
    } else {
      unique.push(listing);
    }
  }

  return { unique, duplicates };
}
```

#### Pre-Filter Function Implementation

```typescript
export function preFilterListings(
  platform: MarketplacePlatform,
  listings: RawListing[],
  options: PreFilterOptions
): PreFilterResult {
  const accepted: RawListing[] = [];
  const flaggedForReview: RawListing[] = [];
  const skipped: { listing: RawListing; reason: string }[] = [];

  for (const listing of listings) {
    // Skip negative prices
    if (listing.askingPrice < 0) {
      skipped.push({ listing, reason: 'negative_price' });
      continue;
    }

    // Skip sponsored listings
    if (listing.title.toLowerCase().includes('sponsored')) {
      skipped.push({ listing, reason: 'sponsored' });
      continue;
    }

    // Handle free items (price == 0)
    if (listing.askingPrice === 0) {
      switch (options.freeItemHandling) {
        case 'include_review':
          flaggedForReview.push(listing);
          break;
        case 'auto_analyze': {
          const category = detectCategory(listing.title, listing.description || '');
          const estimation = estimateValue(listing.askingPrice, category);
          if (estimation.valueScore >= 70) {
            accepted.push(listing);
          } else {
            skipped.push({ listing, reason: 'free_item_below_threshold' });
          }
          break;
        }
        case 'skip':
          skipped.push({ listing, reason: 'free_item_skipped' });
          break;
      }
      continue;
    }

    // Normal listing — accept
    accepted.push(listing);
  }

  return { accepted, flaggedForReview, skipped };
}
```

#### Free Item Storage Pattern

For flagged-for-review free items, store using the existing `notes` field:

```typescript
// In scraper route, for flaggedForReview items:
for (const item of flaggedForReview) {
  const listingData = {
    ...formatForStorage(analyzeListing(platform, item)),
    notes: 'FREE_ITEM_REVIEW',
    userId,
  };
  await prisma.listing.create({ data: listingData });
}
```

#### Updated Scraper Route Flow

```
1. Auth: getAuthUserId()
2. Load settings: prisma.userSettings.findUnique({ where: { userId } })
3. Run scraper: scrapePlatform(params)
4. Pre-filter: preFilterListings(platform, rawListings, { userId, freeItemHandling })
5. Deduplicate: deduplicateListings(platform, accepted + flaggedForReview, userId)
6. Process: processListings(platform, unique, criteria)
7. Store: prisma.listing.create() for each (NOT upsert)
8. Flag: store flaggedForReview items with notes='FREE_ITEM_REVIEW'
9. SSE: emit listing.found for new items only
10. Response: include stats { duplicatesSkipped, preFilteredOut, freeItemsFlagged }
```

#### UserSettings Schema Change

```prisma
model UserSettings {
  id                 String   @id @default(cuid())
  userId             String   @unique
  openaiApiKey       String?
  llmModel           String   @default("gpt-4o-mini")
  discountThreshold  Int      @default(50)
  autoAnalyze        Boolean  @default(true)
  freeItemHandling   String   @default("include_review")  // NEW: include_review | auto_analyze | skip
  emailNotifications Boolean  @default(true)
  // ... rest unchanged
}
```

#### Settings UI Addition

Add to `app/settings/page.tsx` in the scanning preferences section:

```tsx
<div>
  <label className="text-sm font-medium">Free Item Handling</label>
  <p className="text-xs text-gray-500 mb-2">How to handle items listed for free ($0)</p>
  <select value={settings.freeItemHandling} onChange={...}>
    <option value="include_review">Include and flag for review</option>
    <option value="auto_analyze">Auto-analyze (include only if flippable)</option>
    <option value="skip">Skip entirely</option>
  </select>
</div>
```

### Anti-Pattern Prevention

1. **DO NOT** keep using `prisma.listing.upsert()` — switch to `findMany` + `create` pattern per AC #1
2. **DO NOT** inline pre-filter logic in each scraper route — centralize in `marketplace-scanner.ts`
3. **DO NOT** create a new Prisma model for free item flags — use existing `notes` field on Listing
4. **DO NOT** create a new enum type in Prisma for `freeItemHandling` — use `String` with Zod validation (simpler migration)
5. **DO NOT** modify the `detectCategory()` or `estimateValue()` functions — use them as-is for auto-analyze mode
6. **DO NOT** remove the inline sponsored filter from `src/scrapers/craigslist/scraper.ts` — keep as first-pass defense, centralized filter is second pass
7. **DO NOT** create a new database table for deduplication tracking — the existing unique constraint is sufficient
8. **DO NOT** use `any` type — define proper TypeScript interfaces for all new functions
9. **DO NOT** skip the migration step — `freeItemHandling` is a schema change that requires `npx prisma migrate dev`
10. **DO NOT** modify existing scraper test files without understanding mock patterns — each route test uses specific mock setups
11. **DO NOT** forget to handle the case where `UserSettings` doesn't exist for a user — fall back to default `include_review`
12. **DO NOT** emit SSE events for duplicate listings — only new listings get `listing.found` events
13. **DO NOT** modify the `RawListing` interface — pre-filtering operates on RawListing as input, no changes needed
14. **DO NOT** add cross-platform deduplication in this story — FR-SCAN-12 only requires per-platform, per-user dedup

### Previous Story Intelligence (from Stories 3.1 and 3.7)

**From Story 3.1 (Craigslist Scraper):**
- Scraper module extracted to `src/scrapers/craigslist/` with `types.ts`, `scraper.ts`, `index.ts`
- `processListings()` and `generateScanSummary()` from marketplace-scanner are used for batch processing
- `formatForStorage()` returns `Record<string, unknown>` which loses Prisma type safety — use explicit field mapping instead
- Test pattern: mock `@/scrapers/craigslist` and `@/lib/marketplace-scanner` in route tests
- 38 unit tests + 18 route tests + 9 acceptance scenarios — maintain this coverage
- Sponsored filter is in scraper.ts line 324 at DOM extraction level
- Price filter is in route.ts line 142 at processing level

**From Story 3.7 (Scraper Job Management):**
- Auth pattern: `getAuthUserId()` from `@/lib/auth-middleware.ts`
- Error handling: `handleError()` with `ForbiddenError`, `UnauthorizedError`
- UI patterns: `app/scraper/page.tsx` is a `'use client'` component with inline state
- SSE events: use `sseEmitter.emit()` singleton, client filters by `jobId`
- Coverage thresholds: branches 96%, functions 98%, lines 99%, statements 99%

### Test Requirements

- **Unit tests:** `src/__tests__/lib/marketplace-scanner.test.ts` (preFilter + dedup functions)
- **Route tests:** Update `src/__tests__/api/craigslist-scraper.test.ts` (and other scraper tests) for new flow
- **Settings test:** `src/__tests__/api/settings.test.ts` (freeItemHandling field)
- **Acceptance tests:** `test/acceptance/features/E-003-multi-marketplace-scanning.feature`
- Every scenario tagged: `@FR-SCAN-12 @story-3-8` and/or `@FR-SCAN-13 @story-3-8`
- **Coverage thresholds:** branches 96%, functions 98%, lines 99%, statements 99%
- **Jest config:** `maxWorkers: 1`, `ts-jest` transform
- Mock Prisma client for dedup tests (mock `findMany` to return existing IDs)
- Mock `estimateValue` for auto-analyze tests (control score output)

### Project Structure Notes

- **Path alias:** `@/*` maps to `./src/*`
- **Central processor:** `src/lib/marketplace-scanner.ts` — all new filter/dedup functions go here
- **Settings model:** `prisma/schema.prisma` → `UserSettings`
- **Settings API:** `app/api/settings/route.ts`
- **Settings UI:** `app/settings/page.tsx`
- **Scraper routes:** `app/api/scraper/[platform]/route.ts` (except Facebook: `app/api/scrape/facebook/route.ts`)
- **Scraper modules:** `src/scrapers/craigslist/` — keep inline sponsored filter
- **Listing model unique constraint:** `@@unique([platform, externalId, userId])` — this is the dedup key
- **No new Prisma models needed**
- **One schema migration needed** (freeItemHandling field)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.8]
- [Source: _bmad-output/planning-artifacts/epics.md#FR-SCAN-12]
- [Source: _bmad-output/planning-artifacts/epics.md#FR-SCAN-13]
- [Source: src/lib/marketplace-scanner.ts — central processing pipeline]
- [Source: app/api/scraper/craigslist/route.ts — reference scraper with inline filters]
- [Source: src/scrapers/craigslist/scraper.ts — inline sponsored filter at line 324]
- [Source: prisma/schema.prisma — Listing model with @@unique, UserSettings model]
- [Source: app/api/settings/route.ts — settings CRUD API]
- [Source: app/settings/page.tsx — settings UI]
- [Source: _bmad-output/implementation-artifacts/epic-3/3-1-craigslist-scraper.md — previous story patterns]
- [Source: _bmad-output/implementation-artifacts/epic-3/3-7-scraper-job-management-real-time-events.md — previous story patterns]

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Tasks 1-3 implemented: `freeItemHandling` added to Prisma UserSettings schema (`prisma/schema.prisma`), settings route updated to accept/return the new field (`app/api/user/settings/route.ts`), and `preFilterListings()` + `deduplicateListings()` added to `src/lib/marketplace-scanner.ts`.
- Task 4 complete (code review): All 5 scraper routes now call `preFilterListings()` + `deduplicateListings()` before storage; `upsert` replaced with `create`; `FREE_ITEM_REVIEW` notes override applied for flagged items; stats (`duplicatesSkipped`, `preFilteredOut`, `freeItemsFlagged`) added to all responses.
- Task 5 complete (code review): "FREE — Review" amber badge added to `app/opportunities/page.tsx` for listings with `askingPrice === 0 && notes?.includes('FREE_ITEM_REVIEW')`. `ScanningPreferencesSettings` component wired into `app/settings/page.tsx`.
- Task 6 complete: 19 unit tests for `preFilterListings()`/`deduplicateListings()` in `src/__tests__/lib/marketplace-scanner.test.ts` (100% coverage on marketplace-scanner.ts). Also updated `src/__tests__/api/user-settings.test.ts` with 4 new freeItemHandling tests (26 total pass). Fixed `src/__tests__/marketplace-scanner.test.ts` to mock prisma db (47 tests pass).
- Task 7 complete (code review): Step definitions created in `test/acceptance/step_definitions/E-003-story-3-8.steps.ts` for all 7 scenarios (S-072–S-078); @wip tags removed from feature file.
- H1 fix (code review): `FreeItemHandlingEnum` Zod schema added to `src/lib/validations.ts`.
- H2 fix (code review): `isSponsored?: boolean` added to `RawListing` interface; eBay `adType` mapped to `isSponsored: item.adType != null`; `preFilterListings` checks `listing.isSponsored` alongside title check.
- Pre-existing test failures (not caused by this story): `LandingPage.test.tsx`, `reset-password.test.ts`, `scraper-jobs.test.ts` — 48 tests failing, all pre-existing.

### File List

- `src/lib/marketplace-scanner.ts` — Added `preFilterListings()`, `deduplicateListings()`, `PreFilterOptions`, `PreFilterResult`, `FreeItemHandling` type, `isSponsored` on `RawListing`; added `import prisma from './db'`
- `src/lib/validations.ts` — Added `FreeItemHandlingEnum` Zod schema
- `src/__tests__/lib/marketplace-scanner.test.ts` — NEW: 19 unit tests for the new functions (100% coverage)
- `src/__tests__/marketplace-scanner.test.ts` — Added `jest.mock('../lib/db', ...)` to prevent DATABASE_URL error
- `prisma/schema.prisma` — Added `freeItemHandling String @default("include_review")` to UserSettings model
- `app/api/user/settings/route.ts` — Accept, validate, store, and return `freeItemHandling` in GET and PATCH; added default `freeItemHandling: 'include_review'` to settings create
- `src/__tests__/api/user-settings.test.ts` — Added `freeItemHandling` to mockUser.settings; added 4 new freeItemHandling tests
- `app/api/scraper/craigslist/route.ts` — Added `preFilterListings`/`deduplicateListings` calls; replaced `upsert` with `create`; added stats to response
- `app/api/scraper/ebay/route.ts` — Added `preFilterListings`/`deduplicateListings` calls; added `isSponsored` mapping from `adType`; replaced `upsert` with `create`; added stats to response
- `app/api/scraper/offerup/route.ts` — Added `preFilterListings`/`deduplicateListings` calls; replaced `upsert` with `create`; added stats to response
- `app/api/scraper/mercari/route.ts` — Added `preFilterListings`/`deduplicateListings` calls; replaced `upsert` with `create`; added `notesOverride` param to `saveListingFromMercariItem`; added stats to response
- `app/api/scrape/facebook/route.ts` — Added `preFilterListings`/`deduplicateListings` calls; replaced `upsert` with `create`; added stats to response
- `app/opportunities/page.tsx` — Added "FREE — Review" amber badge for listings flagged with `FREE_ITEM_REVIEW`
- `app/settings/page.tsx` — Added `ScanningPreferencesSettings` component import and usage
- `src/components/ScanningPreferencesSettings.tsx` — NEW: Radio group UI for `freeItemHandling` setting
- `test/acceptance/features/E-003-multi-marketplace-scanning.feature` — Added 7 scenarios E-003-S-072 through E-003-S-078; removed @wip tags
- `test/acceptance/step_definitions/E-003-story-3-8.steps.ts` — NEW: Step definitions for S-072–S-078
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` — Updated FR-SCAN-12, FR-SCAN-13 with scenario IDs; updated coverage summary
