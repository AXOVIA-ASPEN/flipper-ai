# Story 13.8: Cross-Platform Price Intelligence Agent

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69dc5f821541f4eec36144b7

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **Flipper.ai user**,
I want the AI scoring to verify item values by searching real sold/active prices across all 5 marketplaces (eBay, Mercari, Facebook Marketplace, Craigslist, OfferUp),
so that scores reflect actual market reality instead of hardcoded category multipliers — making the difference between a $300 guitar being scored 10 (wrong) and 85 (correct, because Strats sell for $500-800 on eBay).

## Problem Statement

The current Tier 1 scoring uses static category multipliers (e.g., electronics = 1.2-1.6x asking price) to estimate market value. This produces wildly inaccurate scores when:
- An item is priced well below market (DeWalt drill at $60 scores 10, but sells for $120+ on eBay)
- An item is in a category with wide price variance (guitars range from $50 to $5,000)
- The multiplier doesn't match current market conditions (seasonal, supply/demand shifts)

The Tier 2 LLM analysis already uses eBay sold data, but only for items that PASS the Tier 1 threshold (70+). Items scored incorrectly low by Tier 1 never reach Tier 2 — they're filtered out before the real data is consulted.

## Solution

Create a **Cross-Platform Price Intelligence** service that:
1. Searches multiple platforms for comparable sold AND active listings
2. Aggregates pricing data with platform-appropriate weighting
3. Produces a **verified market value** that replaces the category multiplier estimate
4. Runs as an enrichment step that can re-score items initially filtered out by Tier 1

## Acceptance Criteria

1. **Multi-Platform Search** — Given an item title and category, the service queries at least 2 platforms for comparable pricing data. eBay sold data is primary (verified transactions). Mercari sold data is secondary. Facebook/Craigslist/OfferUp active listings provide supplementary context. `FR-SCORE-30`

2. **Weighted Price Aggregation** — Sold data is weighted 2x vs active listing data when computing the market value estimate. eBay sold data is weighted highest (most reliable). The aggregation uses IQR filtering (Story 13.1) on each platform's data before combining. `FR-SCORE-30`

3. **Confidence Scoring** — The price intelligence result includes a confidence level based on data quality: `high` (10+ sold comps from 2+ platforms), `medium` (5+ comps from 1+ platform), `low` (fewer than 5 comps or active-only data). `FR-SCORE-30`

4. **Tier 1 Score Override** — When cross-platform data is available, the verified market value REPLACES the category-multiplier estimate in the value score calculation. The algorithmic multipliers become the fallback only when platform data is unavailable. `FR-SCORE-30`

5. **Second-Pass Rescue** — Items that scored below the opportunity threshold (70) on Tier 1 but have verified market data showing 40%+ discount are automatically re-scored and promoted to opportunity status. This prevents the false-negative problem where good deals are filtered out by inaccurate multipliers. `FR-SCORE-30`

6. **Platform-Specific Fee Adjustment** — When comparing prices across platforms, fees are normalized: eBay (13%), Mercari (10%), Facebook (5%), OfferUp (12.9%), Craigslist (0%). A $100 eBay sold price and a $95 Mercari sold price represent different net values. `FR-SCORE-30`

7. **Caching** — Cross-platform price lookups are cached in the `PriceHistory` table with platform source. Cache TTL: 24 hours for sold data, 6 hours for active listing data (prices change faster). `FR-SCORE-30`

8. **Performance Budget** — The full cross-platform lookup completes within 30 seconds. Individual platform failures do not block the overall result — partial data is used with reduced confidence. `FR-SCORE-30`

## Requirement Traceability

> **NOTE:** FR-SCORE-30 is a NEW functional requirement to be added to the PRD before implementation. It covers: "The scoring algorithm shall verify market values using real pricing data from multiple marketplace platforms, replacing static category multipliers as the primary value estimation method."

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-SCORE-30 | AC #1-#8 | @FR-SCORE-30 @story-13-8 |

## Definition of Done

- [x] All acceptance criteria are met and verified
- [x] Code reviewed and approved
- [x] Unit tests written and passing (38 tests, coverage thresholds met)
- [x] No regressions — existing tests still pass (4632 tests, 194 suites)
- [x] No lint errors (`pnpm lint`)
- [x] Build passes (TypeScript strict — zero errors in modified files)
- [x] Dev notes and references are complete

## Tasks / Subtasks

- [x] Task 1: Create cross-platform price intelligence service
  - [x] 1.1 Create `src/lib/cross-platform-price.ts` as the main orchestration module
  - [x] 1.2 Define `CrossPlatformPriceResult` interface
  - [x] 1.3 Implement `fetchCrossPlatformPrice(searchQuery: string, category?: string): Promise<CrossPlatformPriceResult | null>`

- [x] Task 2: Implement per-platform data fetchers
  - [x] 2.1 **eBay sold** — Reuses `fetchMarketPrice()` from `market-price.ts`
  - [x] 2.2 **Mercari sold** — Accepts injected `mercariSoldFn` fetcher
  - [x] 2.3 **Facebook active** — Accepts injected `facebookPricesFn` fetcher
  - [x] 2.4 **Craigslist active** — Accepts injected `craigslistPricesFn` fetcher
  - [x] 2.5 **OfferUp active** — Accepts injected `offerupPricesFn` fetcher
  - [x] 2.6 Each fetcher runs with a 10-second timeout. Failures are skipped gracefully.

- [x] Task 3: Implement weighted aggregation
  - [x] 3.1 Normalize all prices to net value: `netPrice = price * (1 - platformFeeRate)`
  - [x] 3.2 Apply IQR filtering (from Story 13.1 `filterOutliers()`) to each platform's prices independently
  - [x] 3.3 Weight sold data 2x vs active data using `weightedMedian()`
  - [x] 3.4 Compute confidence from total comp count and platform diversity

- [x] Task 4: Implement Tier 1 score override
  - [x] 4.1 `applyPriceIntelligenceOverride()` function exists in cross-platform-price.ts
  - [x] 4.2 Wired via `enrichWithCrossPlatformPrice()` in marketplace-scanner.ts
  - [x] 4.3 Recalculation happens in the scoring pipeline via enrichment step
  - [x] 4.4 Override function preserves original score for comparison

- [x] Task 5: Implement second-pass rescue
  - [x] 5.1 `shouldRescueItem()` function exists in cross-platform-price.ts
  - [x] 5.2 `rescueUndervaluedItems()` in marketplace-scanner.ts implements rescue pass
  - [x] 5.3 Rescued items promoted to opportunity status (`isOpportunity: true`)
  - [x] 5.4 `rescued_by_market_data` tag applied to rescued items

- [x] Task 6: Caching in PriceHistory
  - [x] 6.1 `getCachedPrices()` / `storePrices()` / `buildResultFromCache()` in cross-platform-price.ts
  - [x] 6.2 PriceHistory lookup before fetching (24h TTL sold, 6h TTL active)
  - [x] 6.3 `dataType` field added to PriceHistory schema with index

- [x] Task 7: Parallel execution with performance budget
  - [x] 7.1 Run all 5 platform fetches in parallel using `Promise.allSettled()`
  - [x] 7.2 Wrap each in a 10-second timeout (`Promise.race` with timeout)
  - [x] 7.3 Total pipeline timeout: 30 seconds. Returns whatever data is available.
  - [x] 7.4 Track per-platform fetch times via `fetchTimeMs`

- [x] Task 8: Unit tests (38 passing)
  - [x] 8.1 Test: eBay sold data returns accurate median (mock fetcher)
  - [x] 8.2 Test: multi-platform aggregation weights sold 2x vs active
  - [x] 8.3 Test: single platform failure doesn't block result
  - [x] 8.4 Test: all platforms fail → returns null gracefully
  - [x] 8.5 Test: confidence levels based on comp count and platform diversity
  - [x] 8.6 Test: IQR filtering applied per-platform before aggregation
  - [x] 8.7 Test: fee normalization produces correct net prices
  - [x] 8.8 Test: cache hit returns stored data without fetching
  - [x] 8.9 Test: second-pass rescue promotes items with verified discount >40%
  - [x] 8.10 Test: score override replaces multiplier-based estimate with verified value
  - [x] 8.11 Test: items with low confidence data keep algorithmic score
  - [x] 8.12 Test: 30-second timeout returns partial data

### Review Follow-ups (AI Code Review — 2026-04-12)

- [x] [AI-Review][CRITICAL] Wire `fetchCrossPlatformPrice` into marketplace-scanner.ts scan pipeline (AC #1 integration)
- [x] [AI-Review][CRITICAL] Wire `applyPriceIntelligenceOverride` into scoring flow after Tier 1 (AC #4)
- [x] [AI-Review][CRITICAL] Implement second-pass rescue in marketplace-scanner.ts with `rescued_by_market_data` tag (AC #5)
- [x] [AI-Review][CRITICAL] Implement PriceHistory caching with 24h/6h TTL, add `dataType` to schema (AC #7)
- [x] [AI-Review][CRITICAL] Write acceptance test scenarios for all 8 ACs (@FR-SCORE-30 @story-13-8)
- [x] [AI-Review][HIGH] Add eBay Browse API fallback in createEbayFetcher (Task 2.1 — currently only uses Playwright scraper)
- [x] [AI-Review][MEDIUM] Add test for cache hit (Task 8.8, blocked by Task 6)

## Dev Notes

### Architecture: Where This Fits in the Pipeline

```
Raw Listing
  ↓
[Tier 1: Algorithmic] → estimateValue() → initial valueScore (fast, <1ms)
  ↓
[NEW: Cross-Platform Price Intelligence] → fetchCrossPlatformPrice()
  • Parallel: eBay sold + Mercari sold + FB active + CL active + OfferUp active
  • IQR filter per platform → weighted aggregation → verified market value
  • If verified value available: OVERRIDE Tier 1 estimate, recalculate score
  ↓
Is valueScore >= threshold? (with override applied)
  YES → continue to Tier 2 LLM analysis
  NO but rescued? → promote to opportunity
  NO → skip
  ↓
[Tier 2: LLM Analysis] → already has eBay sold data from cross-platform step
  (bonus: LLM prompt can now include multi-platform context)
```

### Existing Infrastructure to Reuse (DO NOT DUPLICATE)

| Need | Existing Solution | File |
|------|------------------|------|
| eBay sold prices (scraping) | `fetchMarketPrice()` | `src/lib/market-price.ts` |
| eBay sold prices (API) | `fetchSoldListings()` | `src/scrapers/ebay/scraper.ts` |
| Mercari sold prices | `fetchSoldListings()` | `src/scrapers/mercari/scraper.ts` |
| Facebook active listings | `scrapeFacebookMarketplace()` | `src/scrapers/facebook/scraper.ts` |
| Craigslist active listings | `scrapeCraigslist()` | `src/scrapers/craigslist/scraper.ts` |
| OfferUp active listings | `scrapeOfferUp()` | `src/scrapers/offerup/scraper.ts` |
| IQR outlier filtering | `filterOutliers()` | `src/lib/market-price.ts` |
| Price history storage | `PriceHistory` model | `prisma/schema.prisma` |
| Price history service | `fetchAndStorePriceHistory()` | `src/lib/price-history-service.ts` |
| Platform fee rates | User settings / defaults | `src/lib/subscription-tiers.ts` |

**CRITICAL: Do NOT create new scraper functions.** Call the existing ones. The scrapers handle anti-detection, rate limiting, and error handling. Your job is to orchestrate them in parallel and aggregate results.

### Platform Fee Rates (from UserSettings defaults)

| Platform | Fee Rate | Source |
|----------|---------|--------|
| eBay | 13.0% | `feeRateEbay` default |
| Mercari | 10.0% | `feeRateMercari` default |
| Facebook | 5.0% | `feeRateFacebook` default |
| OfferUp | 12.9% | `feeRateOfferup` default |
| Craigslist | 0.0% | `feeRateCraigslist` default |

### Weighted Median Calculation

```typescript
function weightedMedian(items: { price: number; weight: number }[]): number {
  const sorted = [...items].sort((a, b) => a.price - b.price);
  const totalWeight = sorted.reduce((sum, i) => sum + i.weight, 0);
  let cumulative = 0;
  for (const item of sorted) {
    cumulative += item.weight;
    if (cumulative >= totalWeight / 2) return item.price;
  }
  return sorted[sorted.length - 1]?.price ?? 0;
}
```

### Performance Considerations

- Each scraper opens a Playwright browser context. Running 5 simultaneously could be memory-intensive.
- Consider: run eBay + Mercari (sold data, highest value) first, then conditionally run FB/CL/OfferUp (active data, lower value) only if sold data is insufficient (<5 comps).
- The eBay Browse API (`src/scrapers/ebay/scraper.ts`) is faster and cheaper than Playwright scraping (`src/lib/market-price.ts`). Prefer API when available.

### PriceHistory Schema Extension

The current `PriceHistory` model stores `platform` (String) and `soldPrice` (Float). May need:
- `dataType String @default("sold")` — to distinguish sold vs active listing data
- Or use a convention: `platform = "FACEBOOK_ACTIVE"` vs `platform = "EBAY_SOLD"`

### Second-Pass Rescue Logic

This is the key innovation. Currently, a guitar listed at $300 gets scored ~10 by Tier 1 (bad multiplier) and is never sent to Tier 2 (LLM + eBay data). With the rescue pass:

1. Guitar scores 10 on Tier 1 (category multiplier says it's not a deal)
2. Cross-platform search finds: eBay sold median = $650, Mercari sold median = $580
3. Verified market value = ~$615 after fee normalization
4. True discount = (615 - 300) / 615 = 51% → well above 40% threshold
5. Re-score: profitPotential = $615 * 0.87 - $300 = $235 → valueScore recalculated to ~80+
6. Item promoted to opportunity with tag `rescued_by_market_data`

This single feature could double the accuracy of deal detection.

### Files to Create

- `src/lib/cross-platform-price.ts` — main orchestration service

### Files to Modify

- `src/lib/value-estimator.ts` — add score override function when verified data available
- `src/lib/marketplace-scanner.ts` — integrate cross-platform fetch into scan pipeline, add rescue pass
- `src/lib/price-history-service.ts` — extend to store multi-platform data
- `prisma/schema.prisma` — add `dataType` to `PriceHistory` if needed
- `src/__tests__/` — new test file for cross-platform service + updates to existing tests

## Dev Agent Record

### File List

| File | Action | Description |
|------|--------|-------------|
| `src/lib/cross-platform-price.ts` | Created | Cross-platform price intelligence service: multi-platform fetching, weighted aggregation, confidence scoring, caching, score override, rescue logic |
| `src/lib/marketplace-scanner.ts` | Modified | Added `crossPlatformPrice` and `rescuedByMarketData` to AnalyzedListing type; added enrichWithCrossPlatformPrice() and rescueUndervaluedItems() pipeline steps |
| `app/api/scraper/ebay/route.ts` | Modified | Wired enrichWithCrossPlatformPrice() and rescueUndervaluedItems() into scan pipeline after Tier 1, before Tier 2 |
| `src/__tests__/lib/cross-platform-price.test.ts` | Created | Unit tests for cross-platform price service (38 tests: aggregation, confidence, override, rescue, caching, fee normalization) |
| `prisma/schema.prisma` | Modified | Added `dataType` field and composite index to PriceHistory model |
| `test/acceptance/features/E-013-scoring-algorithm-improvements.feature` | Modified | Added 13 scenarios for Story 13.8 (S-046 through S-058) |
| `test/acceptance/step_definitions/E-013-cross-platform-price.steps.ts` | Created | Step definitions for all Story 13.8 acceptance scenarios |
| `src/generated/prisma/` | Regenerated | Prisma client regenerated with PriceHistory.dataType field |

### Change Log

| Date | Change | By |
|------|--------|----|
| 2026-04-12 | Initial implementation: service module + unit tests (Tasks 1-3, 7-8) | Dev Agent |
| 2026-04-12 | Code review: fixed calculateConfidence AC#3 compliance, added rawPrices/netPrices distinction, added timeout test | AI Code Review |
| 2026-04-12 | Addressed all 7 code review findings: pipeline integration (Tasks 4-5), PriceHistory caching with dataType (Task 6), eBay Browse API fallback, cache hit test (8.8), 13 acceptance test scenarios | Dev Agent |
| 2026-04-12 | Code review #2: wired pipeline calls into eBay route (H1), removed `as any` cast from storePrices (H2), improved S-057 cache test (H3), fixed File List (M1-M3) | AI Code Review |

### Review Notes (AI Code Review #2 — 2026-04-12)

**Status: Approved — all HIGH and MEDIUM issues fixed, all tests pass**

All 8 ACs verified. 4716 tests pass (0 regressions). Zero lint errors.
Issues fixed: pipeline wiring (H1), `any` cast removal (H2), cache test improvement (H3), File List corrections (M1-M3).

### Review Notes (AI Code Review #1 — 2026-04-12)

**Status: Changes Requested — returned to in-progress**

The core service module (`cross-platform-price.ts`) is well-structured with clean separation of concerns. However, the story is approximately **50% complete** — the service exists in isolation but is never called from the scoring pipeline.

**What's done well:**
- Clean architecture: fetcher injection pattern, IQR reuse, weighted median
- Comprehensive unit tests for the service itself (36 tests)
- Proper timeout handling with `Promise.allSettled` + `Promise.race`

**What's missing (must complete before next review):**
- Pipeline integration (AC #4, #5): wire into marketplace-scanner.ts
- Caching (AC #7): PriceHistory schema extension + TTL logic
- Acceptance tests: zero scenarios for @story-13-8
- eBay Browse API fallback in fetcher (Task 2.1 spec)

**Code fixes applied during review:**
- H1: `calculateConfidence` — changed `||` to `&&` for 5+ comp threshold (AC #3 compliance)
- H3: Renamed `prices` → `rawPrices`, added `netPrices` field for clarity
- M1: Added missing 30-second timeout partial-data test
