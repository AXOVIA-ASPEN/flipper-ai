# Story 13.6: Demand Velocity Integration into Tier 1 Score

Status: ready-for-dev
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

- [ ] All acceptance criteria are met and verified
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing
- [ ] Acceptance test scenarios created with triple tags (@E-013-S-N, @FR-SCORE-28, @story-13-6)
- [ ] Feature file: `test/acceptance/features/E-013-scoring-algorithm-improvements.feature`
- [ ] Step definitions: `test/acceptance/step_definitions/E-013-demand-velocity.steps.ts`
- [ ] Requirements traceability matrix updated
- [ ] No regressions — existing tests still pass
- [ ] No lint errors (`pnpm lint`)
- [ ] Build passes (`pnpm build`)

## Tasks / Subtasks

- [ ] Task 0: Create demand mapping layer
  - [ ] 0.1 Map demand analyzer output to score multipliers:
    - `rising` → 1.15 (equivalent to 'very_high' — items selling within 1-3 days)
    - `stable` → 1.0 (equivalent to 'medium' — normal market velocity)
    - `declining` → 0.85 (equivalent to 'low' — taking 14+ days)
    - `low_liquidity` → 0.70 (zero sales in 90 days — item may be unsellable. Apply aggressive penalty.)
  - [ ] 0.2 Handle LLM demandLevel fallback mapping:
    - `very_high` → 1.15
    - `high` → 1.05
    - `medium` → 1.0
    - `low` → 0.85
  - [ ] 0.3 Priority: demand analyzer data > LLM demandLevel (matches existing resolution in `marketplace-scanner.ts:348`)

- [ ] Task 1: Add demand multiplier to value estimation
  - [ ] 1.1 Add a new function `applyDemandAdjustment(valueScore: number, demandTrend: string | null, expectedDaysToSell: number | null, discountPercent: number): number` in `value-estimator.ts`
  - [ ] 1.2 Use the mapping layer from Task 0 to resolve the multiplier
  - [ ] 1.3 Guard: demand multiplier >1.0 only applies when `discountPercent > 0` (item priced below market value). High demand does not help if the buyer is overpaying.
  - [ ] 1.4 If demandTrend is null/undefined: use 1.0, add "demand_unknown" to tags

- [ ] Task 2: Add days-to-sell penalty
  - [ ] 2.1 Accept optional `expectedDaysToSell` parameter
  - [ ] 2.2 If >30 days: subtract 5 from score
  - [ ] 2.3 If >60 days: subtract 10 from score (not cumulative — 10 total, not 15)
  - [ ] 2.4 Apply before final clamping

- [ ] Task 3: Apply demand multiplier as a POST-PROCESSING step
  - [ ] 3.1 Do NOT modify `estimateValue()` signature — this avoids breaking callers
  - [ ] 3.2 Add a new function `applyDemandAdjustment(valueScore: number, demandTrend: string | null, expectedDaysToSell: number | null): number` in `value-estimator.ts`
  - [ ] 3.3 Call this function in `marketplace-scanner.ts` AFTER `enrichWithDemandAnalysis()` completes (~line 348+)
  - [ ] 3.4 Update the Listing's `valueScore` in the database after adjustment
  - [ ] 3.5 This avoids the circular dependency: Tier 1 score → LLM analysis → demand analysis → score adjustment

- [ ] Task 4: Add demand badge to UI
  - [ ] 4.1 Add `demandBadge` to the listing/opportunity response API
  - [ ] 4.2 Map both type systems to UI badges:
    - Demand analyzer: `rising` → "Hot" (red/fire), `stable` → "Steady" (blue), `declining` → "Slow" (gray), `low_liquidity` → "Dead" (red/warning)
    - LLM fallback: `very_high` → "Hot" (red/fire), `high` → "Active" (green), `medium` → "Steady" (blue), `low` → "Slow" (gray)
  - [ ] 4.3 Display as a small pill/badge next to the score on listing cards

- [ ] Task 5: Unit tests
  - [ ] 5.1 Test: same item with very_high demand scores higher than with low demand
  - [ ] 5.2 Test: item with 45-day expected sell time gets -5 penalty
  - [ ] 5.3 Test: item with 90-day expected sell time gets -10 penalty (not -15)
  - [ ] 5.4 Test: missing demand data → no adjustment, tag added
  - [ ] 5.5 Test: demand adjustment doesn't push score below 0 or above 100

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
