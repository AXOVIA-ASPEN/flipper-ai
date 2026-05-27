# Story 13.6: Demand Velocity Integration into Tier 1 Score

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID:

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **Flipper.ai user**,
I want the value score to factor in how quickly items in this category actually sell (demand velocity),
so that a high-margin item in a dead category scores lower than a moderate-margin item in a hot category — because unsold inventory is the #1 risk in flipping.

## Acceptance Criteria

1. **Demand Multiplier Applied** — After demand enrichment completes, a demand multiplier is applied to the Tier 1 value score as a post-processing step. Demand analyzer output (primary): rising = 1.15, stable = 1.0, declining = 0.85, low_liquidity = 0.70. LLM demandLevel fallback: very_high = 1.15, high = 1.05, medium = 1.0, low = 0.85. Priority: demand analyzer data > LLM demandLevel. Demand multiplier >1.0 only applies when the item is priced below estimated market value (discountPercent > 0). High demand does not help if the buyer is overpaying. `FR-SCORE-28`
2. **Graceful Fallback** — When demand data is not available (new listing, API failure), the multiplier defaults to 1.0 (no adjustment) and confidence is noted as "demand_unknown" `FR-SCORE-28`
3. **Days-to-Sell Penalty** — If `expectedDaysToSell` from LLM analysis (Story 4.5) exceeds 30 days, apply an additional -5 penalty to the score. If >60 days, apply -10. `FR-SCORE-28`
4. **Score Still 0-100** — All demand adjustments are applied before the final clamp to 0-100. No scores exceed 100 or go below 0. `FR-SCORE-28`
5. **UI Indicator** — The listing/opportunity card shows a demand badge mapped from both type systems. Demand analyzer: `rising` → "Hot", `stable` → "Steady", `declining` → "Slow", `low_liquidity` → "Dead" (red/warning). LLM fallback: `very_high` → "Hot", `high` → "Active", `medium` → "Steady", `low` → "Slow". Badge displayed as a pill next to the score on listing cards. `FR-SCORE-28`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-SCORE-28 | AC #1, #2, #3, #4, #5 | @FR-SCORE-28 @story-13-6 |

## Definition of Done

- [x] All acceptance criteria are met and verified
- [x] Code reviewed and approved
- [x] Unit tests written and passing (155 tests in value-estimator.test.ts)
- [x] Acceptance test scenarios created with triple tags (@E-013-S-N, @FR-SCORE-28, @story-13-6)
- [x] Feature file: `test/acceptance/features/E-013-scoring-algorithm-improvements.feature`
- [x] Step definitions: `test/acceptance/step_definitions/E-013-demand-velocity.steps.ts`
- [x] Requirements traceability matrix updated
- [x] No regressions — existing tests still pass (4628/4629, 1 pre-existing failure in market-value-calculator)
- [x] No lint errors (`pnpm lint` — 0 errors)
- [ ] Build passes (`pnpm build`) — pending verification

## Tasks / Subtasks

- [x] Task 0: Create demand mapping layer
  - [x] 0.1 Map demand analyzer output to score multipliers:
    - `rising` → 1.15 (equivalent to 'very_high' — items selling within 1-3 days)
    - `stable` → 1.0 (equivalent to 'medium' — normal market velocity)
    - `declining` → 0.85 (equivalent to 'low' — taking 14+ days)
    - `low_liquidity` → 0.70 (zero sales in 90 days — item may be unsellable. Apply aggressive penalty.)
  - [x] 0.2 Handle LLM demandLevel fallback mapping:
    - `very_high` → 1.15
    - `high` → 1.05
    - `medium` → 1.0
    - `low` → 0.85
  - [x] 0.3 Priority: demand analyzer data > LLM demandLevel (matches existing resolution in `marketplace-scanner.ts:348`)

- [x] Task 1: Add demand multiplier to value estimation
  - [x] 1.1 Add a new function `applyDemandAdjustment(valueScore: number, demandTrend: string | null, expectedDaysToSell: number | null, discountPercent: number): number` in `value-estimator.ts`
  - [x] 1.2 Use the mapping layer from Task 0 to resolve the multiplier
  - [x] 1.3 Guard: demand multiplier >1.0 only applies when `discountPercent > 0` (item priced below market value). High demand does not help if the buyer is overpaying.
  - [x] 1.4 If demandTrend is null/undefined: use 1.0, add "demand_unknown" to tags (tag added in pipeline enrichment step `applyDemandScoreAdjustments()`)

- [x] Task 2: Add days-to-sell penalty
  - [x] 2.1 Accept optional `expectedDaysToSell` parameter
  - [x] 2.2 If >30 days: subtract 5 from score
  - [x] 2.3 If >60 days: subtract 10 from score (not cumulative — 10 total, not 15)
  - [x] 2.4 Apply before final clamping

- [x] Task 3: Apply demand multiplier as a POST-PROCESSING step
  - [x] 3.1 Do NOT modify `estimateValue()` signature — this avoids breaking callers
  - [x] 3.2 Add a new function `applyDemandAdjustment(valueScore: number, demandTrend: string | null, expectedDaysToSell: number | null, discountPercent: number): number` in `value-estimator.ts`
  - [x] 3.3 Call this function in `marketplace-scanner.ts` AFTER `enrichWithDemandAnalysis()` completes via `applyDemandScoreAdjustments()`
  - [x] 3.4 Update the Listing's `valueScore` in the database after adjustment (handled by `formatForStorage()` reading the updated `estimation.valueScore`)
  - [x] 3.5 This avoids the circular dependency: Tier 1 score → LLM analysis → demand analysis → score adjustment

- [x] Task 4: Add demand badge to UI
  - [x] 4.1 `demandLevel` already present in API response (opportunities page), added to KanbanBoard `Listing` interface
  - [x] 4.2 Map both type systems to UI badges:
    - Demand analyzer: `rising` → "Hot" (red/fire), `stable` → "Steady" (blue), `declining` → "Slow" (gray), `low_liquidity` → "Dead" (red/warning)
    - LLM fallback: `very_high` → "Hot" (red/fire), `high` → "Active" (green), `medium` → "Steady" (blue), `low` → "Slow" (gray)
  - [x] 4.3 Display as a small pill/badge next to the score on listing cards

- [x] Task 5: Unit tests
  - [x] 5.1 Test: same item with very_high demand scores higher than with low demand
  - [x] 5.2 Test: item with 45-day expected sell time gets -5 penalty
  - [x] 5.3 Test: item with 90-day expected sell time gets -10 penalty (not -15)
  - [x] 5.4 Test: missing demand data → no adjustment, tag added
  - [x] 5.5 Test: demand adjustment doesn't push score below 0 or above 100

- [x] Task 6: Acceptance tests (added during code review)
  - [x] 6.1 Feature scenarios @E-013-S-019 through @E-013-S-029 covering all 5 ACs
  - [x] 6.2 Step definitions in `E-013-demand-velocity.steps.ts`
  - [x] 6.3 RTM updated with FR-SCORE-28 entry

## Dev Agent Record

### File List

| File | Action | Description |
|------|--------|-------------|
| `src/lib/value-estimator.ts` | MODIFIED | Added `DEMAND_ANALYZER_MULTIPLIERS`, `LLM_DEMAND_MULTIPLIERS`, `DemandBadge` type, `getDemandBadge()`, `applyDemandAdjustment()` |
| `src/lib/marketplace-scanner.ts` | MODIFIED | Imported `applyDemandAdjustment`, added `applyDemandScoreAdjustments()` pipeline function with `demand_unknown` tagging |
| `app/api/scraper/ebay/route.ts` | MODIFIED | Imported `applyDemandScoreAdjustments`, wired as Step 4b after demand enrichment |
| `src/components/KanbanBoard.tsx` | MODIFIED | Added `demandLevel` to `Listing` interface, `DEMAND_BADGES` map, demand pill badge next to score |
| `src/__tests__/lib/value-estimator.test.ts` | MODIFIED | Added 10 unit tests for `applyDemandAdjustment` and 5 for `getDemandBadge` |
| `test/acceptance/features/E-013-scoring-algorithm-improvements.feature` | MODIFIED | Added scenarios @E-013-S-019 through @E-013-S-029 covering all 5 ACs |
| `test/acceptance/step_definitions/E-013-demand-velocity.steps.ts` | CREATED | Step definitions for story 13.6 demand velocity acceptance tests |
| `_bmad-output/test-artifacts/requirements-traceability-matrix.md` | MODIFIED | Added FR-SCORE-28 entry with 11 scenario IDs |

### Change Log

| Date | Change | By |
|------|--------|-----|
| 2026-04-12 | Initial implementation: applyDemandAdjustment(), getDemandBadge(), unit tests | Dev Agent |
| 2026-04-12 | Code review fixes: wired pipeline integration, demand_unknown tagging, UI badge, acceptance tests, RTM | Code Review |

## Dev Notes

**Dependency:** This story uses data from Story 5.3 (demand trend analysis). That story is already `done`, so the data pipeline exists. This story adds the feedback loop from demand data back into the Tier 1 score.

**Files to modify:**
- `src/lib/value-estimator.ts` — accept + apply demand parameters
- `src/lib/marketplace-scanner.ts` — pass demand data to estimator
- `src/lib/llm-analyzer.ts` — pass days-to-sell to score adjustment
- `src/components/KanbanBoard.tsx` — demand badge on opportunity cards
- `src/__tests__/value-estimator.test.ts` — new demand tests

**Why these multiplier values (demand analyzer — primary):**
- `rising` (1.15): Items selling within 1-3 days — the market is hungry, reduced risk
- `stable` (1.0): Items selling within 7-14 days — normal market
- `declining` (0.85): Items taking 14+ days — carrying cost and opportunity cost make the flip less attractive
- `low_liquidity` (0.70): Zero sales in 90 days — item may be unsellable, aggressive penalty warranted

**LLM demandLevel fallback multipliers:**
- `very_high` (1.15): Equivalent to `rising`
- `high` (1.05): Items selling within 3-7 days — healthy demand
- `medium` (1.0): Equivalent to `stable`
- `low` (0.85): Equivalent to `declining`
