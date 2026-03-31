# Story 6.1: Dashboard with Listings & Stats

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69a467858bfeee0c341646b9

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **user**,
I want a dashboard showing my listing inventory with accurate stats and pagination,
so that I can see all my scraped listings at a glance with key metrics about my flipping business.

## Acceptance Criteria

<!-- Each criterion MUST reference the FR-* requirement(s) it validates from the PRD -->

1. When an authenticated user navigates to `/dashboard`, stats cards are displayed showing: **total listings**, **opportunities found**, **active flips** (opportunities with status NOT IN [SOLD, PASSED]), and **total profit** (sum of `actualProfit` from SOLD opportunities) `FR-DASH-01`

2. Listings are displayed in a card layout with: title, price, value score, platform badge, status, and thumbnail image `FR-DASH-01`

3. When more than 20 listings exist, pagination controls are displayed with a configurable page size selector (10 / 20 / 50 per page) `FR-DASH-01`

4. When a user clicks on a listing card body, they are navigated to the internal listing detail view at `/listings/[id]` `FR-DASH-01`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-DASH-01 | AC #1 — Stats cards with correct aggregations | @FR-DASH-01 @story-6-1 |
| FR-DASH-01 | AC #2 — Card layout with required fields including status | @FR-DASH-01 @story-6-1 |
| FR-DASH-01 | AC #3 — Pagination with configurable page size | @FR-DASH-01 @story-6-1 |
| FR-DASH-01 | AC #4 — Click card → internal listing detail view | @FR-DASH-01 @story-6-1 |

## Definition of Done

- [x] All acceptance criteria are met and verified
- [x] Code reviewed and approved
- [x] Unit tests written and passing with coverage thresholds met (96% branches, 98% functions, 99% lines)
- [x] Acceptance test scenarios created with triple tags (@E-006-S-N, @FR-DASH-01, @story-6-1)
- [x] Feature file: `test/acceptance/features/E-006-flip-lifecycle-management-analytics.feature` (new file — Epic 6 feature file)
- [x] Step definitions: `test/acceptance/step_definitions/E-006-dashboard.steps.ts` (new file)
- [x] Requirements traceability matrix updated at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`
- [ ] `user_flows.feature` updated if the listing detail page navigation represents a new user flow
- [x] No regressions — existing tests still pass (especially `dashboard.test.tsx` if it exists, `user-settings.test.ts`)
- [x] No lint errors (`pnpm lint`)
- [ ] Build passes (`make build`) — pre-existing TS error in craigslist/route.ts (not from this story)
- [x] Dev notes and references are complete
- [ ] Trello card moved to Verified
- [ ] Feature card checklist item marked complete

## Tasks / Subtasks

- [x] **Task 1: Enhance `/api/listings` GET endpoint for stats + pagination** (AC: #1, #3, FR: FR-DASH-01)
  - [x] 1.1 Open `app/api/listings/route.ts`
  - [x] 1.2 Add `page` and `limit` query params (default: page=1, limit=20; allowed limits: 10, 20, 50)
  - [x] 1.3 Add server-side stats aggregation using Prisma:
    ```typescript
    const [totalListings, opportunitiesCount, activeFlipsCount, totalProfitAgg] = await Promise.all([
      prisma.listing.count({ where: { userId } }),
      prisma.opportunity.count({ where: { userId } }),
      prisma.opportunity.count({
        where: { userId, status: { notIn: ['SOLD', 'PASSED'] } },
      }),
      prisma.opportunity.aggregate({
        where: { userId, status: 'SOLD' },
        _sum: { actualProfit: true },
      }),
    ]);
    ```
  - [x] 1.4 Apply pagination with `skip` and `take` in `findMany`:
    ```typescript
    const skip = (page - 1) * limit;
    const listings = await prisma.listing.findMany({
      where,
      orderBy: { scrapedAt: 'desc' },
      skip,
      take: limit,
      include: { images: { take: 1, orderBy: { imageIndex: 'asc' } }, opportunity: { select: { id: true, status: true } } },
    });
    ```
  - [x] 1.5 Return updated response shape:
    ```typescript
    return NextResponse.json({
      success: true,
      listings,
      stats: {
        totalListings,
        opportunitiesFound: opportunitiesCount,
        activeFlips: activeFlipsCount,
        totalProfit: totalProfitAgg._sum.actualProfit ?? 0,
      },
      pagination: {
        page,
        limit,
        total: totalListings,
        totalPages: Math.ceil(totalListings / limit),
      },
    });
    ```

- [x] **Task 2: Enhance dashboard stats cards** (AC: #1, FR: FR-DASH-01)
  - [x] 2.1 Open `app/dashboard/page.tsx`
  - [x] 2.2 Update `DashboardStats` interface:
    ```typescript
    interface DashboardStats {
      totalListings: number;
      opportunitiesFound: number;
      activeFlips: number;
      totalProfit: number;
    }
    ```
  - [x] 2.3 Update `fetchListings()` to read `data.stats` from the API response instead of computing client-side:
    ```typescript
    setStats({
      totalListings: data.stats.totalListings,
      opportunitiesFound: data.stats.opportunitiesFound,
      activeFlips: data.stats.activeFlips,
      totalProfit: data.stats.totalProfit,
    });
    ```
  - [x] 2.4 Render 4 stat cards (replace existing 3-card grid with 4-column grid):
    - Total Listings (count)
    - Opportunities Found (count, purple)
    - Active Flips (count, blue)
    - Total Profit ($, green)

- [x] **Task 3: Add status badge and page size selector to listing cards** (AC: #2, #3, FR: FR-DASH-01)
  - [x] 3.1 Update `Listing` interface in `app/dashboard/page.tsx` to include `status: string`
  - [x] 3.2 Add status badge to each listing card (show the `listing.status` field):
    - NEW → gray badge
    - ANALYZED → blue badge
    - OPPORTUNITY → purple badge
  - [x] 3.3 Add page size selector UI element (10 / 20 / 50 buttons or `<select>`) above the listing grid
  - [x] 3.4 Wire page size selector to `setFilter('limit', value)` or equivalent URL param update
  - [x] 3.5 Update `fetchListings()` to pass `page` and `limit` as query params

- [x] **Task 4: Make listing cards clickable → navigate to `/listings/[id]`** (AC: #4, FR: FR-DASH-01)
  - [x] 4.1 Import `Link` from `next/link` in `app/dashboard/page.tsx`
  - [x] 4.2 Wrap the listing card `<div>` in a `<Link href={/listings/${listing.id}}>` — keep the ExternalLink and Star buttons functional (use `e.stopPropagation()` on their click handlers to prevent card navigation)
  - [x] 4.3 Create `app/listings/[id]/page.tsx` — internal listing detail page:
    - Fetch listing by ID from `/api/listings/[id]`
    - Show full listing details: title, platform, asking price, estimated value, profit potential, score, status, location, description, all images, AI analysis data (if available), and comparable sales
    - Include a "Back to Dashboard" link (`<Link href="/dashboard">`)
    - Include the "View on Marketplace" external link
    - If listing has an opportunity, show opportunity status and a link to `/opportunities`
    - Use RSC (React Server Component) pattern if auth can be handled server-side, otherwise 'use client'

- [x] **Task 5: Write acceptance tests** (FR: FR-DASH-01)
  - [x] 5.1 Create `test/acceptance/features/E-006-flip-lifecycle-management-analytics.feature` with scenarios covering all ACs
  - [x] 5.2 Create `test/acceptance/step_definitions/E-006-dashboard.steps.ts`
  - [x] 5.3 Tag all scenarios with `@E-006-S-1`, `@story-6-1`, `@FR-DASH-01`

- [x] **Task 6: Write unit tests** (FR: FR-DASH-01)
  - [x] 6.1 Update/create `src/__tests__/api/listings.test.ts` to cover new stats aggregation and pagination params
  - [x] 6.2 Update/create `src/__tests__/api/listing-detail.test.ts` for the new `/api/listings/[id]` GET endpoint (already exists — verify it returns the full listing with images and opportunity)

## Dev Notes

### What Already Exists — DO NOT REBUILD

The dashboard is substantially built. This story **enhances** existing code rather than creating from scratch:

| File | Current State | This Story's Change |
|------|--------------|---------------------|
| `app/dashboard/page.tsx` | Full dashboard with 3 stats cards + listing grid + pagination | Add 4th stat card (active flips), fix stats source (server-side), add status badge, page size selector, card click nav |
| `app/api/listings/route.ts` | GET works but returns all listings with no pagination, no stats | Add page/limit params, stats aggregation, include images+opportunity relations |
| `app/api/listings/[id]/route.ts` | GET/PATCH/DELETE for single listing | Used by the new detail page — verify it includes images and opportunity relations |
| `app/listings/[id]/page.tsx` | Does NOT exist | New page — listing detail view |
| `src/hooks/useFilterParams.ts` | FilterState includes page/limit fields? (check current code) | May need to add `limit` field for page size selector |

### Critical — Stats Aggregation Must Be Server-Side

**Current bug in dashboard**: The `opportunities` stat is computed client-side as `listings.filter(l => l.opportunity).length` which only counts opportunities on the CURRENT PAGE, not the total. After this story, ALL stats come from the server-side `stats` object in the API response.

**Active flips** = `prisma.opportunity.count({ where: { userId, status: { notIn: ['SOLD', 'PASSED'] } } })`
**Total profit** = `prisma.opportunity.aggregate({ where: { userId, status: 'SOLD' }, _sum: { actualProfit: true } })._sum.actualProfit ?? 0`

### Listing Status Values (from schema)

The `Listing.status` field defaults to `"NEW"`. Other values set by scraping pipeline:
- `NEW` — freshly scraped
- `ANALYZED` — algorithmic analysis complete
- `OPPORTUNITY` — value score ≥ 70 (or LLM-confirmed opportunity)

Display status badge using these values. Do NOT confuse with `Opportunity.status` (IDENTIFIED / CONTACTED / PURCHASED / LISTED / SOLD / PASSED).

### Page Size Selector

The `useFilterParams` hook manages URL state. The `limit` field is NOT currently in `FilterState`. Two options:
1. Add `limit` to `FilterState` in `useFilterParams.ts` and encode it in URL (preferred — enables shareable URLs with page size)
2. Use local state for page size (simpler but not URL-persistent)

**Preferred**: Option 1. Add `limit: string` to `FilterState` with default `'20'`. URL will reflect chosen page size.

### Existing `useFilterParams` hook

Located at `src/hooks/useFilterParams.ts`. Already handles `platform`, `status`, `minScore`, `minProfit`, `maxProfit`, `category`, `dateFrom`, `dateTo`, `page` (check if `page` is already there). Import and extend — do NOT rewrite.

### Image Helpers

Use `getListingImageUrl(listing as unknown as ListingWithImages)` from `@/lib/image-helpers` for thumbnail display (already used in dashboard). The function prefers Firebase Storage images (`listing.images[0].storageUrl`) then falls back to parsed `imageUrls` JSON.

### New Listing Detail Page — Architecture

```
app/listings/[id]/page.tsx    ← New RSC or Client Component
  ↓ fetches
app/api/listings/[id]/route.ts  ← Already exists (GET)
  ↓ queries
prisma.listing.findUnique({ include: { images: true, opportunity: true } })
```

Check `app/api/listings/[id]/route.ts` to confirm it includes `images` and `opportunity` relations in the response — if not, add `include: { images: true, opportunity: true }`.

### API Route Patterns

All API routes in `app/api/` follow:
- Success: `NextResponse.json({ success: true, ... })`
- Error: `return handleError(error)` from `@/lib/errors`
- Auth: `const userId = await getCurrentUserId()` — throws `UnauthorizedError` if not authenticated

Prisma singleton: always import from `@/lib/db`, never instantiate `new PrismaClient()`.

### Test Requirements

**Acceptance tests** (BDD/Cucumber):
- Feature file: `test/acceptance/features/E-006-flip-lifecycle-management-analytics.feature`
- Step definitions: `test/acceptance/step_definitions/E-006-dashboard.steps.ts`
- All scenarios tagged: `@E-006-S-<N>` (sequential within Epic 6, starting at @E-006-S-1), `@story-6-1`, `@FR-DASH-01`
- Run with: `make test-acceptance TAGS=@story-6-1`

**Unit tests** (Jest):
- Test file for API: `src/__tests__/api/listings.test.ts`
- Coverage thresholds must be maintained: 96% branches, 98% functions, 99% lines/statements
- Run with: `pnpm test -- --testPathPattern="listings"`

### Git Intelligence — Recent Patterns

Recent commits show the codebase actively extends scraper, API, and test infrastructure. Pattern:
- API routes follow `handleError()` error system (don't inline try/catch patterns)
- Stats aggregation: use `Promise.all()` for concurrent Prisma queries
- Component tests: mock `fetch` for API calls, mock `useRouter`/`useSearchParams` for Next.js navigation hooks

### Project Structure Notes

- Path alias `@/*` → `./src/*` (not `./app/*`)
- Tailwind CSS 4 — use standard utility classes, group as: layout → spacing → color
- Two-space indent, camelCase variables, PascalCase components, no `any` in production code
- `interface` for public API types, `type` for unions

### References

- [Source: FR-DASH-01 — _bmad-output/planning-artifacts/epics.md#L194]
- [Source: Story 6.1 — _bmad-output/planning-artifacts/epics.md#L1740]
- [Existing dashboard — app/dashboard/page.tsx]
- [Listings API — app/api/listings/route.ts]
- [Single listing API — app/api/listings/[id]/route.ts]
- [Filter hook — src/hooks/useFilterParams.ts]
- [Image helpers — src/lib/image-helpers.ts]
- [Prisma schema — prisma/schema.prisma (Listing, Opportunity models)]
- [Error system — src/lib/errors.ts]
- [Auth helpers — src/lib/auth.ts (getCurrentUserId)]

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Implemented server-side stats aggregation in `/api/listings` GET handler using `Promise.all` with 4 concurrent Prisma queries (listing.count, opportunity.count x2, opportunity.aggregate)
- Added pagination to `/api/listings` with `page`/`limit` params (validated limit ∈ {10, 20, 50}, skip/take applied to findMany)
- Updated `/api/listings` response shape to include `stats` and `pagination` objects; listings include `images` and `opportunity` relations
- Updated `/api/listings/[id]` GET to include `images: true, opportunity: true` in findUnique
- Rewrote `app/dashboard/page.tsx`: 4 stat cards (Total Listings, Opportunities Found, Active Flips, Total Profit), status badge on each card, page size selector (10/20/50), listing cards wrapped in `<Link>` to `/listings/[id]`, `e.stopPropagation()` on Star + ExternalLink buttons
- Added `page: string` and `limit: string` to `FilterState` in `useFilterParams.ts` with defaults '1' and '20' — fixes pre-existing test expectation
- Created `app/listings/[id]/page.tsx` — 'use client' component fetching from `/api/listings/[id]`, shows full listing details, AI analysis, comparable sales, opportunity link, Back to Dashboard link
- Created 9 acceptance test scenarios in `E-006-flip-lifecycle-management-analytics.feature` covering all 4 ACs
- Created step definitions in `E-006-dashboard.steps.ts` using static code analysis pattern
- Updated `src/__tests__/api/listings.test.ts` with new mocks for `listing.count`, `opportunity.count`, `opportunity.aggregate`; added 5 new test cases for pagination and stats
- Updated `src/__tests__/components/Dashboard.test.tsx` to include `stats` in mock API responses and updated "Opportunities Found" label test
- Updated requirements traceability matrix with FR-DASH-01 now covered by @E-006-S-1 through @E-006-S-9

### File List

**Modified:**
- `app/api/listings/route.ts` — Added stats aggregation, pagination params, images+opportunity include
- `app/api/listings/[id]/route.ts` — Added `include: { images: true, opportunity: true }` to GET
- `app/dashboard/page.tsx` — 4 stat cards, status badge, page size selector, clickable card navigation, `getListingImageUrl` usage
- `src/hooks/useFilterParams.ts` — Added `page: string` and `limit: string` to FilterState
- `src/__tests__/api/listings.test.ts` — New mocks + 5 new test cases for stats/pagination
- `src/__tests__/components/Dashboard.test.tsx` — Updated mock responses, fixed label test, removed stale `search`/`sort` fields from FilterState mock
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` — FR-DASH-01 now Covered
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status → review
- `_bmad-output/implementation-artifacts/epic-6/6-1-dashboard-with-listings-stats.md` — status → review

**Created:**
- `app/listings/[id]/page.tsx` — New listing detail page
- `test/acceptance/features/E-006-flip-lifecycle-management-analytics.feature` — Epic 6 BDD feature file
- `test/acceptance/step_definitions/E-006-dashboard.steps.ts` — Step definitions for story 6.1
- `src/__tests__/components/ListingDetail.test.tsx` — 16 unit tests for listing detail page component (code review fix)

## Change Log

- 2026-03-01: Story 6.1 implemented — server-side stats aggregation, pagination, 4 stat cards, status badge, page size selector, clickable card navigation, listing detail page, acceptance tests, unit tests
- 2026-03-01: Code review complete — fixed 3 HIGH + 3 MEDIUM issues: (H1) platform=all sentinel filter bug; (H2) valueScore added to listing cards (AC #2); (H3) PATCH mass assignment vulnerability patched with field whitelist; (M1) filteredCount for accurate pagination total; (M2) Dashboard test mock aligned with FilterState; (M3) 16 unit tests added for ListingDetail component
