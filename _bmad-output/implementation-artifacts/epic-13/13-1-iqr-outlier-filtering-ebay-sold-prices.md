# Story 13.1: IQR Outlier Filtering on eBay Sold Prices

Status: review
Blocked: false
Blocked-Reason:
Trello-Card-ID:

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **Flipper.ai user**,
I want the market price calculations to exclude extreme outlier prices from eBay sold data,
so that my AI scores reflect realistic resale values rather than being inflated by rare collector premiums or deflated by damaged-item fire sales.

## Acceptance Criteria

<!-- Each criterion MUST reference the FR-* requirement(s) it validates from the PRD -->

1. **IQR Filtering Applied to Sold Prices** — When eBay sold prices are fetched, prices outside 1.5x the interquartile range (Q1 - 1.5×IQR to Q3 + 1.5×IQR) are excluded before calculating median, average, low, and high statistics `FR-SCORE-23`
2. **Minimum Sample Size** — If fewer than 4 valid prices remain after filtering, the system falls back to using all prices unfiltered and marks confidence as "low" `FR-SCORE-23`
3. **Outlier Count Exposed** — The market price response includes an `outliersRemoved` count so the AI analysis layer and UI can factor in data quality `FR-SCORE-23`
4. **Existing Scores Improve** — Backtesting against 100+ previously scored items shows a reduction in false-positive high scores (items scored 70+ that would not have been profitable based on realistic median) `FR-SCORE-23`
5. **No Regression on Valid Deals** — Items that were correctly identified as opportunities before filtering continue to score 70+ after filtering (no false negatives introduced) `FR-SCORE-23`

(Note: AC #4 and #5 are manual validation tasks. Document results in the PR description rather than Cucumber scenarios.)

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-SCORE-23 | AC #1, #2, #3, #4, #5 | @FR-SCORE-23 @story-13-1 |

## Definition of Done

- [ ] All acceptance criteria are met and verified
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing (coverage thresholds: 96% branches, 98% functions, 99% lines)
- [ ] Acceptance test scenarios created with triple tags (@E-013-S-N, @FR-SCORE-23, @story-13-1)
- [ ] Feature file: `test/acceptance/features/E-013-scoring-algorithm-improvements.feature`
- [ ] Step definitions: `test/acceptance/step_definitions/E-013-iqr-outlier-filtering.steps.ts`
- [ ] Requirements traceability matrix updated
- [ ] No regressions — existing tests still pass
- [ ] No lint errors (`pnpm lint`)
- [ ] Build passes (`pnpm build`)
- [ ] Dev notes and references are complete

## Tasks / Subtasks

- [ ] Task 1: Implement IQR filtering utility
  - [ ] 1.1 Create `filterOutliers(prices: number[])` in `src/lib/market-price.ts`; reconcile with existing IQR logic in `src/lib/market-value-calculator.ts` (lines 160-171) to share a single implementation — do NOT duplicate
  - [ ] 1.2 Calculate Q1 (25th percentile) and Q3 (75th percentile)
  - [ ] 1.3 Calculate IQR = Q3 - Q1
  - [ ] 1.4 Filter: keep prices where Q1 - 1.5×IQR <= price <= Q3 + 1.5×IQR
  - [ ] 1.5 Return `{ filteredPrices, outliersRemoved }` 
  - [ ] 1.6 If filtered count < 4, return original prices + set `outliersRemoved: 0` + flag `lowSampleSize: true`
  - [ ] 1.7 Add `lowSampleSize: boolean` to the return type so downstream consumers can set confidence to 'low'

- [ ] Task 2: Integrate filtering into market price statistics
  - [ ] 2.1 Apply `filterOutliers()` before calculating `medianPrice`, `avgPrice`, `lowPrice`, `highPrice`
  - [ ] 2.2 Add `outliersRemoved: number` to the market price return type
  - [ ] 2.3 If `lowSampleSize`, set confidence to "low" in downstream consumers

- [ ] Task 3: Update LLM analyzer to use filtered data
  - [ ] 3.1 Pass `outliersRemoved` count to the LLM prompt context

- [ ] Task 4: Unit tests
  - [ ] 4.1 Test IQR calculation with known datasets (normal, skewed, single outlier, all outliers)
  - [ ] 4.2 Test minimum sample size fallback (3 prices, 2 prices, 1 price)
  - [ ] 4.3 Test that median changes appropriately when outliers removed
  - [ ] 4.4 Test edge case: all identical prices (IQR = 0)
  - [ ] 4.5 Test exactly 4 prices where 1 is an outlier — after filtering, 3 remain (below minimum), verify fallback triggers
  - [ ] 4.6 Test with max scraper output (20 items) — verify IQR isn't overly aggressive on small N

- [ ] Task 5: Backtest validation
  - [ ] 5.1 Run 100+ previously scored items through updated pipeline
  - [ ] 5.2 Compare old vs new scores — document false positive reduction
  - [ ] 5.3 Verify no false negatives introduced (good deals still score 70+)

## Dev Notes

### CRITICAL: Do Not Break Existing Scores for Active Users

The IQR filtering should improve accuracy, not radically change every score. If backtesting shows >20% of previously correct scores now fail, the filtering thresholds need adjustment.

**Files to modify:**
- `src/lib/market-price.ts` — add `filterOutliers()`, integrate into stats calculation
- `src/lib/market-value-calculator.ts` — reconcile duplicate IQR logic to share single implementation
- `src/lib/marketplace-scanner.ts`
- `src/lib/llm-analyzer.ts` — pass outlier count to prompt context
- `src/__tests__/market-price.test.ts` — add comprehensive outlier filtering tests

**IQR Reference:**
- Q1 = value at 25th percentile of sorted array
- Q3 = value at 75th percentile
- IQR = Q3 - Q1
- Lower fence = Q1 - 1.5 × IQR
- Upper fence = Q3 + 1.5 × IQR
- Any value outside fences is an outlier

**Percentile method:** Use nearest-rank percentile method (`Math.floor(n * 0.25)`) to match existing implementation in `market-value-calculator.ts`.

**Edge case: Bimodal distributions** (e.g., "iPhone 13" returns both 128GB and 1TB models). IQR filtering may incorrectly remove the higher-capacity variant. This is acceptable for v1 — the LLM layer should catch this via item identification (Story 4.3).
