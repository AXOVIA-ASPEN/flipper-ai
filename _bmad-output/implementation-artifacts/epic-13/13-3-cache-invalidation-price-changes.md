# Story 13.3: Cache Invalidation on Price Changes

Status: review
Blocked: false
Blocked-Reason:
Trello-Card-ID:

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **Flipper.ai user**,
I want the AI analysis cache to automatically invalidate when a listing's price changes significantly,
so that I see up-to-date scoring that reflects the current asking price, not a stale 24-hour-old analysis.

## Acceptance Criteria

1. **Price Delta Detection** — When a listing is re-scraped and the asking price has changed by more than 15% from the cached analysis price, the L2 cache entry is invalidated and a fresh analysis is triggered `FR-SCORE-25`
2. **L1 Cache Eviction** — The in-memory LRU cache entry is also evicted when a price delta is detected `FR-SCORE-25`
3. **Stale Analysis Marker** — If a cached analysis exists but was computed at a different price, the UI displays an "Analysis may be outdated" indicator until a fresh analysis completes `FR-SCORE-25`
4. **Price Stored with Cache** — The `AiAnalysisCache` record stores the `askingPrice` at analysis time so price deltas can be computed on cache lookup `FR-SCORE-25`
5. **No Extra API Calls for Unchanged Prices** — Listings re-scraped at the same price (±5%) continue to use the cached analysis without additional LLM calls `FR-SCORE-25`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-SCORE-25 | AC #1, #2, #3, #4, #5 | @FR-SCORE-25 @story-13-3 |

## Definition of Done

- [ ] All acceptance criteria are met and verified
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing (coverage thresholds: 96% branches, 98% functions, 99% lines)
- [ ] Acceptance test scenarios created with triple tags (@E-013-S-N, @FR-SCORE-25, @story-13-3)
- [ ] Feature file: `test/acceptance/features/E-013-scoring-algorithm-improvements.feature`
- [ ] Step definitions: `test/acceptance/step_definitions/E-013-cache-invalidation.steps.ts`
- [ ] Requirements traceability matrix updated
- [ ] No regressions — existing tests still pass
- [ ] No lint errors (`pnpm lint`)
- [ ] Build passes (`pnpm build`)

## Tasks / Subtasks

- [ ] Task 1: Add `analyzedAtPrice` to cache schema
  - [ ] 1.1 Add `analyzedAtPrice Float?` to `AiAnalysisCache` model in `prisma/schema.prisma`
  - [ ] 1.2 Create migration: `make migrate`
  - [ ] 1.3 Populate `analyzedAtPrice` on all cache write/upsert operations in `llm-analyzer.ts`
  - [ ] 1.4 Update ALL cache write sites across the codebase (7 files beyond llm-analyzer.ts) to include `analyzedAtPrice` in create/upsert operations. Without this, cache entries from scraper routes will always have null `analyzedAtPrice`, triggering unnecessary re-analyses.

- [ ] Task 2: Implement price delta check on cache retrieval
  - [ ] 2.1 In `getCachedSellabilityAnalysis()`, compare `currentAskingPrice` vs `cachedEntry.analyzedAtPrice`
  - [ ] 2.2 Calculate delta: `cached === 0 ? Infinity : Math.abs(current - cached) / cached`. If cached is 0 (free listing), always invalidate.
  - [ ] 2.3 If delta > 0.15 (15%): return cache miss (invalidate), delete L1 entry
  - [ ] 2.4 If delta <= 0.05 (5%): return cache hit (unchanged)
  - [ ] 2.5 If delta between 5-15%: return cache hit but flag `staleAnalysis: true`

- [ ] Task 3: Expose staleness to UI
  - [ ] 3.1 Add `staleAnalysis?: boolean` to the analysis response type
  - [ ] 3.2 In the opportunity/listing detail component, show a subtle "Analysis may be outdated — refreshing..." banner when `staleAnalysis` is true
  - [ ] 3.3 Fire-and-forget async refresh with a per-listing deduplication lock (in-memory Set of listingIds currently refreshing). Do NOT evict L1 during refresh — serve stale until refresh completes, then update both L1 and L2. Prevent infinite recursion by skipping the delta check during refresh writes.

- [ ] Task 4: Unit tests
  - [ ] 4.1 Test: price unchanged (±3%) → cache hit
  - [ ] 4.2 Test: price dropped 20% → cache invalidation, fresh analysis triggered
  - [ ] 4.3 Test: price increased 10% → cache hit with stale flag
  - [ ] 4.4 Test: `analyzedAtPrice` is null (legacy cache entry) → treat as expired
  - [ ] 4.5 Test: rapid price changes (3 changes in 1 minute) — verify deduplication lock prevents concurrent refresh storms

## Dev Notes

**Files to modify:**
- `prisma/schema.prisma` — add `analyzedAtPrice` field to `AiAnalysisCache`
- `src/lib/llm-analyzer.ts` — cache write (store price) + cache read (delta check)
- `src/lib/claude-analyzer.ts` — cache upsert must include `analyzedAtPrice`
- `src/lib/negotiation-strategy.ts` — cache upsert must include `analyzedAtPrice`
- `app/api/scraper/craigslist/route.ts` — cache create must include `analyzedAtPrice`
- `app/api/scraper/ebay/route.ts` — cache create must include `analyzedAtPrice`
- `app/api/scraper/facebook/route.ts` — cache create must include `analyzedAtPrice`
- `app/api/scraper/mercari/route.ts` — cache create must include `analyzedAtPrice`
- `app/api/scraper/offerup/route.ts` — cache create must include `analyzedAtPrice`
- Listing detail UI component — stale analysis banner

**Price delta thresholds:**
- <5% change: no action (normal marketplace price fluctuation)
- 5-15% change: serve cached but flag as stale, trigger background refresh
- >15% change: full invalidation, new analysis required

**Migration note:** Existing cache rows will have `analyzedAtPrice: null`. Treat null as "unknown" → always re-analyze (equivalent to expired).
