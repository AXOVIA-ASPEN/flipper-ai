# Story 6.6: Inventory View & Real-Time Updates

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69a46b81ac1a319e426f580d

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a user,
I want an inventory view for purchased items with holding costs and real-time dashboard updates,
So that I can track carrying costs and see changes as they happen.

## Acceptance Criteria

<!-- Each criterion MUST reference the FR-* requirement(s) it validates from the PRD -->

1. **Inventory view shows PURCHASED items with holding cost details**: Given the user has items in PURCHASED status, when they view the inventory section, then each item shows title, purchase price, days held, estimated carrying cost (at the user's configurable daily holding cost rate), and current market value (from the linked listing's `estimatedValue`). `FR-DASH-09`

2. **Aging inventory flagging (30+ days)**: Given an item has been held for 30 or more days, when the inventory view is displayed, then the item is visually flagged as "aging inventory" with the total holding cost prominently displayed. `FR-DASH-09`

3. **Real-time dashboard updates via SSE**: Given a scraping job completes or an opportunity status changes, when the dashboard is open, then the dashboard data refreshes automatically via SSE events without requiring a manual page refresh. `FR-DASH-10`

4. **SSE reconnection with exponential backoff**: Given the SSE connection drops, when the connection is lost, then the UI shows a reconnection indicator and auto-reconnects with exponential backoff (already implemented in `useSseEvents` hook). `FR-DASH-10`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-DASH-09 | AC #1 — Inventory view with holding costs per PURCHASED item | @FR-DASH-09 @story-6-6 |
| FR-DASH-09 | AC #2 — Aging inventory visual flag at 30+ days held | @FR-DASH-09 @story-6-6 |
| FR-DASH-10 | AC #3 — Dashboard refreshes on SSE events | @FR-DASH-10 @story-6-6 |
| FR-DASH-10 | AC #4 — SSE reconnection indicator and exponential backoff | @FR-DASH-10 @story-6-6 |

## Definition of Done

- [x] All acceptance criteria are met and verified
- [x] Code reviewed and approved
- [x] Unit tests written and passing (holding cost utility — 100% coverage)
- [x] Acceptance test scenarios created with dual tags (`@FR-DASH-09 @story-6-6` and `@FR-DASH-10 @story-6-6`)
- [ ] user_flows.feature updated (if story affects user flows)
- [x] No regressions — existing tests still pass (`make test` green)
- [x] Dev notes and references are complete
- [x] Prisma migration created and applied (`make migrate` or `make db-sync`)
- [ ] Trello card moved to Verified
- [ ] Feature card checklist item marked complete

## Tasks / Subtasks

- [x] **Task 1: Schema migration — add `holdingCostDailyRate` to UserSettings** (AC: #1, FR: FR-DASH-09)
  - [x] 1.1 Add `holdingCostDailyRate Float @default(2.0)` to `UserSettings` model in `prisma/schema.prisma`
  - [x] 1.2 Run `make migrate` (interactive) to create migration, or `make db-sync` (CI/non-interactive)
  - [x] 1.3 Update `app/api/user/settings/route.ts` GET response to include `holdingCostDailyRate`
  - [x] 1.4 Update PATCH handler to accept `holdingCostDailyRate` with validation: Float, must be 0–100
  - [x] 1.5 Add "Holding Cost Rate ($/day)" input to `src/components/ScoringSettings.tsx`

- [x] **Task 2: Create holding cost utility** (AC: #1, #2, FR: FR-DASH-09)
  - [x] 2.1 Create `src/lib/holding-cost.ts` with three pure exported functions
  - [x] 2.2 Write unit tests in `src/__tests__/lib/holding-cost.test.ts` with 100% branch coverage

- [x] **Task 3: Add Inventory tab to opportunities page** (AC: #1, #2, FR: FR-DASH-09)
  - [x] 3.1 Add "Inventory" as a third view option in `app/opportunities/page.tsx`
  - [x] 3.2 Filter existing opportunities data client-side for `status === 'PURCHASED'`
  - [x] 3.3 Fetch user's `holdingCostDailyRate` from `GET /api/user/settings` on page load
  - [x] 3.4 Compute `daysHeld` and `carryingCost` from `opportunity.purchaseDate`
  - [x] 3.5 Render inventory cards with title, purchase price, days held, carrying cost, market value
  - [x] 3.6 Aging badge and bold red carrying cost for items ≥ 30 days
  - [x] 3.7 Empty state text when no PURCHASED items

- [x] **Task 4: Wire SSE real-time updates into the dashboard** (AC: #3, #4, FR: FR-DASH-10)
  - [x] 4.1 Import `useSseEvents` from `@/hooks/useSseEvents` in `app/dashboard/page.tsx`
  - [x] 4.2 Call hook with `eventTypes: ['listing.found', 'opportunity.created', 'opportunity.updated']`
  - [x] 4.3 useEffect on `events[0]?.receivedAt` to call `fetchListings()` on new events
  - [x] 4.4 Connection status indicator: green "Live" / amber pulsing "Reconnecting…"
  - [x] 4.5 Dismissible amber SSE error banner for `lastError`

- [x] **Task 5: BDD acceptance tests** (AC: #1–#4, FR: FR-DASH-09/DASH-10)
  - [x] 5.1 Appended 4 scenarios to `test/acceptance/features/E-006-flip-lifecycle-management-analytics.feature`
  - [x] 5.2 Dual-tagged: `@FR-DASH-09 @story-6-6` (ACs 1–2) and `@FR-DASH-10 @story-6-6` (ACs 3–4)
  - [x] 5.3 Created `test/acceptance/step_definitions/E-006-inventory-view.steps.ts`

- [x] **Task 6: Final verification**
  - [x] 6.1 `make lint` — 0 errors (292 pre-existing warnings)
  - [x] 6.2 `make build` — clean TypeScript strict-mode build
  - [x] 6.3 `make test` — 173 suites, 3588 passing, 0 failures
  - [x] 6.4 `make test-acceptance TAGS=@story-6-6` — 4/4 BDD scenarios pass
  - [ ] 6.5 Manual: mark an opportunity PURCHASED in the UI, open inventory tab, verify holding cost display
  - [ ] 6.6 Manual: open dashboard, trigger a scraper run, verify listings refresh without page reload

---

## Dev Notes

### Overview

This story has two independent subsystems:

1. **Inventory View (FR-DASH-09)**: A new "Inventory" tab in `app/opportunities/page.tsx` that shows PURCHASED items with computed holding costs and aging flags.
2. **SSE Real-Time Updates (FR-DASH-10)**: Wire the **pre-built** `useSseEvents` hook into `app/dashboard/page.tsx` to trigger automatic data refreshes and show a connection status indicator.

---

### Subsystem 1: Inventory View

#### Schema Change Required — `holdingCostDailyRate`

`UserSettings` does NOT currently have this field. Add it before any UI work:

```prisma
// prisma/schema.prisma — UserSettings model (currently ends around line 255)
// Add after feeRateCraigslist:
holdingCostDailyRate  Float    @default(2.0)  // $2.00/day holding cost
```

Run `make migrate` after editing, or `make db-sync` for non-interactive CI environments.

**Settings API update (`app/api/user/settings/route.ts`)**

GET response already returns all settings fields — add `holdingCostDailyRate: settings.holdingCostDailyRate` to both GET and PATCH response objects.

PATCH validation — use the same pattern as existing fee rate fields (lines 154–162):

```typescript
if (holdingCostDailyRate !== undefined) {
  const rate = parseFloat(holdingCostDailyRate);
  if (!isFinite(rate) || rate < 0 || rate > 100) {
    throw new ValidationError('holdingCostDailyRate must be a number between 0 and 100');
  }
  updateData.holdingCostDailyRate = rate;
}
```

**Settings UI (`app/settings/page.tsx`)**

Add to the "Scoring & Fees" section (which already has `feeRateEbay`, `feeRateMercari`, etc.). Label: "Holding Cost Rate ($/day)". Helper text: "Daily cost to hold purchased inventory (storage, opportunity cost)". Use `type="number" step="0.01" min="0" max="100"`.

---

#### Holding Cost Utility

Create `src/lib/holding-cost.ts` as a pure-function utility module. `date-fns` is already installed (used in `app/opportunities/page.tsx` via `formatDistanceToNow`).

```typescript
import { differenceInCalendarDays } from 'date-fns';

/** Number of calendar days between purchaseDate and now. Never negative. */
export function calculateDaysHeld(purchaseDate: Date, now: Date = new Date()): number {
  return Math.max(0, differenceInCalendarDays(now, purchaseDate));
}

/** Total estimated carrying cost at the given daily rate. */
export function calculateCarryingCost(daysHeld: number, dailyRate: number): number {
  return daysHeld * dailyRate;
}

/** Returns true if the item has been held at or beyond the threshold (default 30 days). */
export function isAgingInventory(daysHeld: number, thresholdDays: number = 30): boolean {
  return daysHeld >= thresholdDays;
}
```

**Unit test requirements** (`src/__tests__/lib/holding-cost.test.ts`):

- `calculateDaysHeld`: same-day (0), exactly 1 day, 30 days, large gap (365 days), future purchase date (should return 0 not negative)
- `calculateCarryingCost`: zero days, 30 days @ $2/day = $60, fractional rate
- `isAgingInventory`: 0 days (false), 29 days (false), 30 days (true), 31 days (true), custom threshold

All three are pure functions — 100% branch coverage is achievable and expected.

---

#### Inventory Tab in Opportunities Page

`app/opportunities/page.tsx` currently has two view modes toggled via `viewMode` state (Kanban and List), using `LayoutGrid` and `List` icons from `lucide-react`. Extend to three modes: `'kanban' | 'list' | 'inventory'`.

**Data source**: The opportunities page already fetches all user opportunities. Filter client-side:
```typescript
const purchasedItems = opportunities.filter(opp => opp.status === 'PURCHASED');
```

Ensure the API call to `/api/opportunities` includes `listing` relation data (title, estimatedValue, purchaseDate etc.). Check the existing `include` in that API — if `listing` is not already included, add it.

**Holdings cost rate**: Fetch from `GET /api/user/settings` once on page load (alongside existing opportunity fetch). Store as `holdingCostRate` state (default `2.0` while loading).

**Inventory card layout** (one card per PURCHASED opportunity):

```
┌─────────────────────────────────────────────────┐
│  [⚠️ AGING INVENTORY badge if 30+ days]          │
│  Title: iPhone 14 Pro (cracked screen)           │
│  Purchase Price:  $85.00                         │
│  Market Value:    $340.00                        │
│  Days Held:       34 days                        │
│  Carrying Cost:   $68.00  ← bold + red if aging  │
└─────────────────────────────────────────────────┘
```

For `purchaseDate`, use `opportunity.purchaseDate` (DateTime? in Prisma, may be null). When null, show "N/A" for days held and carrying cost.

---

### Subsystem 2: SSE Real-Time Updates

#### Pre-Built Infrastructure (Nothing New Needed)

The full SSE stack is already built:

| Component | Location | Status |
|-----------|----------|--------|
| SSE endpoint | `app/api/events/route.ts` | ✅ Built |
| SSE emitter singleton | `src/lib/sse-emitter.ts` | ✅ Built |
| React hook | `src/hooks/useSseEvents.ts` | ✅ Built |
| Event emission | Various scrapers/routes | ✅ Built |

Story 6.6 just needs to **wire** the hook into the dashboard. No new infrastructure.

#### Hook API (Read Before Wiring)

```typescript
// src/hooks/useSseEvents.ts — exported return type
export interface UseSseEventsReturn<T = unknown> {
  events: SseNotification<T>[];   // ring buffer, newest first, max 50
  isConnected: boolean;
  lastError: string | null;
  clearEvents: () => void;
}
```

There is **no `onEvent` callback** — the hook is purely reactive. Trigger refreshes using a `useEffect` on the most recent event's timestamp:

```typescript
// In app/dashboard/page.tsx — inside Dashboard() component
const { events, isConnected, lastError } = useSseEvents({
  eventTypes: ['listing.found', 'opportunity.created', 'opportunity.updated'],
  maxEvents: 20,
});

// Refresh listings when new SSE events arrive
const lastEventTime = events[0]?.receivedAt;
useEffect(() => {
  if (lastEventTime !== undefined) {
    fetchListings();
  }
}, [lastEventTime]);  // eslint-disable-line react-hooks/exhaustive-deps
```

Using `events[0]?.receivedAt` as the dependency avoids double-firing. The `useSseEvents` hook already handles exponential backoff reconnection internally — AC #4 is satisfied by the hook itself; the UI just needs to expose the `isConnected` state.

#### Connection Status Indicator

Add near the dashboard header (same row as page title or near the scan button):

```tsx
{/* Connection status indicator */}
<div className="flex items-center gap-1.5 text-sm">
  {isConnected ? (
    <>
      <span className="w-2 h-2 rounded-full bg-green-500" />
      <span className="text-green-600 font-medium">Live</span>
    </>
  ) : (
    <>
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      <span className="text-amber-600 font-medium">Reconnecting…</span>
    </>
  )}
</div>
```

For `lastError`: show a dismissible amber banner at the top of the dashboard content area when `lastError !== null`. Do not use `alert()`.

---

### Opportunity Model Reference

```prisma
model Opportunity {
  id             String    @id @default(cuid())
  userId         String?
  listingId      String    @unique
  purchasePrice  Float?       // what user paid
  purchaseDate   DateTime?    // when user bought it
  purchaseNotes  String?
  resalePrice    Float?
  resalePlatform String?
  resaleUrl      String?
  resaleDate     DateTime?
  actualProfit   Float?
  fees           Float?
  status         String    @default("IDENTIFIED")
  // Valid status values: IDENTIFIED | PURCHASED | LISTED | SOLD | PASSED
  notes          String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  listing        Listing   @relation(...)
  user           User?     @relation(...)
}
```

The holding cost inventory query:
```typescript
prisma.opportunity.findMany({
  where: { userId, status: 'PURCHASED' },
  include: { listing: { select: { title: true, estimatedValue: true, platform: true } } },
  orderBy: { purchaseDate: 'asc' },  // oldest first → easier to spot aging inventory
})
```

---

### Test Files Summary

| File | Purpose |
|------|---------|
| `src/__tests__/lib/holding-cost.test.ts` | Unit tests — 100% coverage of pure utility functions |
| `test/acceptance/features/E-006-flip-lifecycle.feature` | BDD — 4 scenarios for ACs 1–4 |
| `test/acceptance/step_definitions/E-006-inventory-view.steps.ts` | Step definitions using Playwright |

**Scenario numbering**: Story 6.5 noted scenarios start around `@E-006-S-020`. With 3 scenarios in 6.5 (S-020–S-022), assign story 6.6 scenarios `@E-006-S-023` through `@E-006-S-026`. Verify against existing feature file numbering.

**BDD tags**: Every scenario must have BOTH `@FR-DASH-09 @story-6-6` (for AC1/AC2) or `@FR-DASH-10 @story-6-6` (for AC3/AC4).

---

### Files to Create / Modify

| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | **MODIFY** | Add `holdingCostDailyRate Float @default(2.0)` to `UserSettings` |
| `app/api/user/settings/route.ts` | **MODIFY** | Add `holdingCostDailyRate` to GET response + PATCH validation |
| `app/settings/page.tsx` | **MODIFY** | Add holding cost rate input in Scoring & Fees section |
| `src/lib/holding-cost.ts` | **CREATE** | `calculateDaysHeld`, `calculateCarryingCost`, `isAgingInventory` |
| `app/opportunities/page.tsx` | **MODIFY** | Add Inventory tab (3rd view mode), holding cost display, aging flag |
| `app/dashboard/page.tsx` | **MODIFY** | Wire `useSseEvents`, connection status indicator, auto-refresh on events |
| `src/__tests__/lib/holding-cost.test.ts` | **CREATE** | Unit tests — 100% coverage |
| `test/acceptance/features/E-006-flip-lifecycle.feature` | **CREATE** | 4 BDD scenarios dual-tagged |
| `test/acceptance/step_definitions/E-006-inventory-view.steps.ts` | **CREATE** | Playwright-based step defs |

---

### Architecture Compliance

Per project conventions:
- **AR-02**: All new API routes in `app/api/` with named HTTP method exports ✓ (no new routes needed)
- **AR-04**: SSE via `/api/events` — already existing, wire via `useSseEvents` hook ✓
- **TypeScript strict mode**: No `any` in production code; use `interface` for public APIs
- **Prisma**: Singleton from `@/lib/db` — do not instantiate new `PrismaClient` in route handlers
- **Error handling**: Throw `AppError` subclasses (`ValidationError`, `UnauthorizedError`), catch with `handleError(error)`
- **Path alias**: `@/*` → `./src/*` — use for all imports from `src/`

---

### References

- [PRD: FR-DASH-09 — inventory view with holding costs](_bmad-output/planning-artifacts/PRD.md)
- [PRD: FR-DASH-10 — real-time SSE dashboard updates](_bmad-output/planning-artifacts/PRD.md)
- [Epic 6 stories](_bmad-output/planning-artifacts/epics.md)
- [Pre-built SSE hook](src/hooks/useSseEvents.ts)
- [Pre-built SSE emitter](src/lib/sse-emitter.ts)
- [Pre-built SSE endpoint](app/api/events/route.ts)
- [Dashboard page to modify](app/dashboard/page.tsx)
- [Opportunities page to modify](app/opportunities/page.tsx)
- [UserSettings API to extend](app/api/user/settings/route.ts)
- [Prisma schema](prisma/schema.prisma)
- [Previous story for context](_bmad-output/implementation-artifacts/epic-6/6-5-performance-report-export.md)

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Holding cost tests used local Date constructors (`new Date(year, month, day, ...)`) to avoid UTC/timezone issues with `differenceInCalendarDays`
- Dashboard tests required `jest.mock('@/hooks/useSseEvents', ...)` because `EventSource` is not available in jsdom
- A pre-existing Cucumber expression parse error in `E-006-performance-report-export.steps.ts` (slash in URL treated as alternation) was fixed by converting to regex syntax
- Settings UI update landed in `src/components/ScoringSettings.tsx` (not `app/settings/page.tsx` directly, since settings uses component composition)

### File List

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Modified — added `holdingCostDailyRate Float @default(2.0)` to UserSettings |
| `app/api/user/settings/route.ts` | Modified — added holdingCostDailyRate to GET/PATCH |
| `src/components/ScoringSettings.tsx` | Modified — added holding cost rate input |
| `src/lib/holding-cost.ts` | Created — calculateDaysHeld, calculateCarryingCost, isAgingInventory |
| `app/opportunities/page.tsx` | Modified — added Inventory tab (3rd view mode) |
| `app/dashboard/page.tsx` | Modified — wired useSseEvents, connection status, error banner |
| `src/__tests__/lib/holding-cost.test.ts` | Created — 17 tests, 100% branch coverage |
| `src/__tests__/components/Dashboard.test.tsx` | Modified — added jest.mock for useSseEvents |
| `test/acceptance/features/E-006-flip-lifecycle-management-analytics.feature` | Modified — appended S-30 through S-33 |
| `test/acceptance/step_definitions/E-006-inventory-view.steps.ts` | Created — step defs for S-30–S-33 |
| `test/acceptance/step_definitions/E-006-performance-report-export.steps.ts` | Fixed — escaped / in URL step expression |

### Senior Developer Review (AI)

**Reviewer:** claude-opus-4-6 | **Date:** 2026-03-08

**Issues Found:** 3 High, 4 Medium, 3 Low
**Issues Fixed:** 6 (3 High + 3 Medium)

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| H-1 | HIGH | Missing file headers on 3 created files (CLAUDE.md mandatory) | Fixed — added structured headers to holding-cost.ts, holding-cost.test.ts, E-006-inventory-view.steps.ts |
| H-2 | HIGH | User settings test has zero coverage for holdingCostDailyRate | Fixed — added 7 tests covering GET response, PATCH valid/boundary/invalid values |
| H-3 | HIGH | Dashboard test has no tests for SSE UI elements (AC #3, #4) | Fixed — added 4 tests for Live/Reconnecting indicator, error banner, dismiss |
| M-1 | MEDIUM | parseFloat vs Number inconsistency in settings validation | Fixed — changed to Number() for consistency with fee rate validation |
| M-2 | MEDIUM | Inconsistent error response patterns (llmModel/notifyFrequency) | Not fixed — pre-existing issue, out of story scope |
| M-3 | MEDIUM | Settings fetch failure silently uses default holdingCostRate | Fixed — added console.warn for debug visibility |
| M-4 | MEDIUM | No deduplication of concurrent fetchListings() calls | Not fixed — minor, low-risk, would require debounce abstraction |
| L-1 | LOW | calculateCarryingCost accepts negative inputs | Not fixed — caller validated |
| L-2 | LOW | user_flows.feature DoD item unchecked | Not fixed — noted for follow-up |
| L-3 | LOW | holding-cost.ts file header (subset of H-1) | Fixed via H-1 |

**Files modified during review:**
- `src/lib/holding-cost.ts` — added file header
- `src/__tests__/lib/holding-cost.test.ts` — added file header
- `test/acceptance/step_definitions/E-006-inventory-view.steps.ts` — added file header
- `app/api/user/settings/route.ts` — changed parseFloat to Number
- `app/opportunities/page.tsx` — added console.warn on settings fetch failure
- `src/__tests__/api/user-settings.test.ts` — added holdingCostDailyRate to mockUser, added 7 test cases
- `src/__tests__/components/Dashboard.test.tsx` — added 4 SSE UI tests
