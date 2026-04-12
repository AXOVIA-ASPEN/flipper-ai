# Story 13.4: Weighted Scoring — Margin Percentage + Absolute Profit

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID:

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **Flipper.ai user**,
I want the value score to account for BOTH profit margin percentage AND absolute dollar profit in a non-linear combination,
so that a $5 item with 200% margin doesn't outscore a $300 item with $150 actual profit — because flipping is labor-arbitrage and effort per flip is roughly constant.

## Acceptance Criteria

1. **Weighted Score Formula** — The value score combines margin percentage (existing) with absolute profit via a non-linear formula: `weightedScore = (marginScore × 0.4) + (absoluteProfitScore × 0.6)` where `absoluteProfitScore` uses a logarithmic curve anchored at $50 profit = 70 points `FR-SCORE-26`
2. **Low-Value Cap Adjusted** — Items with <$15 absolute profit potential are capped at score 40 regardless of margin (was: <$10 capped at 30). Items with exactly $0 profit are capped at score 15 (between negative profit cap of 10 and the <$15 profit cap of 40). `FR-SCORE-26`
3. **High-Value Boost Adjusted** — Items with >$100 absolute profit get a +5 boost (was: +10). Items with >$300 profit get +10 (new tier). Boosts are exclusive — apply the highest qualifying tier only (+5 OR +10, never both). This replaces the current boost structure (>$100 → +10, >$200 → +10 cumulative) with the new exclusive structure. This prevents inflation while still rewarding big wins. `FR-SCORE-26`
4. **Backward Compatibility** — The `valueScore` field remains 0-100 integer. No schema changes. The internal calculation method changes, but the output range and type are identical. `FR-SCORE-26`
5. **Score Distribution Improves** — After applying the new formula, the score distribution across a test dataset of 500+ items shows a more even spread (fewer items clustered at 0-20 or 90-100) compared to the current linear formula `FR-SCORE-26`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-SCORE-26 | AC #1, #2, #3, #4, #5 | @FR-SCORE-26 @story-13-4 |

## Definition of Done

- [ ] All acceptance criteria are met and verified
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing (coverage thresholds: 96% branches, 98% functions, 99% lines)
- [ ] Acceptance test scenarios created with triple tags (@E-013-S-N, @FR-SCORE-26, @story-13-4)
- [ ] Feature file: `test/acceptance/features/E-013-scoring-algorithm-improvements.feature`
- [ ] Step definitions: `test/acceptance/step_definitions/E-013-weighted-scoring.steps.ts`
- [ ] Requirements traceability matrix updated
- [ ] No regressions — existing tests still pass
- [ ] No lint errors (`pnpm lint`)
- [ ] Build passes (`pnpm build`)

## Tasks / Subtasks

- [ ] Task 1: Design the weighted scoring formula
  - [ ] 1.1 Define `marginScore`: existing formula `Math.min(100, Math.max(0, Math.round(profitMargin * 100 + 50)))` clamped 0-100
  - [ ] 1.2 Define `absoluteProfitScore`: `Math.min(100, Math.round(Math.log10(Math.max(1, profitPotential)) × 33.33))` — logarithmic curve where $10 profit ≈ 33, $50 ≈ 57, $100 ≈ 67, $500 ≈ 90, $1000 = 100
  - [ ] 1.3 Combined: `weightedScore = Math.round(marginScore × 0.4 + absoluteProfitScore × 0.6)`
  - [ ] 1.4 Apply caps: <$15 profit → max 40. Negative profit → max 10.
  - [ ] 1.5 Apply boosts: >$100 profit → +5. >$300 profit → +10. Clamped at 100.

- [ ] Task 2: Implement in value-estimator.ts
  - [ ] 2.1 Replace current linear formula with weighted formula in `estimateValue()`
  - [ ] 2.2 Keep old formula available as a commented reference
  - [ ] 2.3 Ensure `valueScore` output remains integer 0-100

- [ ] Task 3: Update unit tests
  - [ ] 3.1 Update all existing score assertion tests to match new formula outputs
  - [ ] 3.2 Add test: $5 item → $15 (200% margin) scores LOWER than $300 → $450 (50% margin, $150 profit)
  - [ ] 3.3 Add test: $50 item → $100 (100% margin, $50 profit) scores ~70
  - [ ] 3.4 Add test: $1000 item → $1100 (10% margin, $100 profit) scores ~55-65
  - [ ] 3.5 Add score distribution test across 20+ sample items
  - [ ] 3.6 Test $0.50 profit — verify absoluteProfitScore calculation with sub-dollar values
  - [ ] 3.7 Test profit at exact cap boundaries: $14.99, $15.00, $15.01
  - [ ] 3.8 Test that negative profit items still cap at 10

- [ ] Task 3.5: Audit ALL test files that assert on `valueScore`
  - Beyond `value-estimator.test.ts`, check: scraper tests (ebay, offerup, mercari, facebook, craigslist), marketplace-scanner.test.ts, opportunity-related tests, listing-related tests. Update score assertions to match new formula outputs. This is the highest-effort subtask.

- [ ] Task 4: Backtest and validate
  - [ ] 4.1 Run 500+ items through old and new formulas
  - [ ] 4.2 Compare score distributions (histogram)
  - [ ] 4.3 Verify 70+ threshold still captures genuinely profitable items
  - [ ] 4.4 Document any items that flipped score direction (was opportunity, now isn't, or vice versa)

## Dev Notes

### Why 60% Absolute / 40% Margin

Flipping is labor-arbitrage: the effort to buy, transport, photograph, list, and ship an item is roughly the same whether the item costs $10 or $300. A $150 profit on a $300 item is objectively more valuable than $10 profit on a $5 item, even though the margin is lower.

The 60/40 split prioritizes absolute profit while still rewarding margin (since high-margin items are often lower risk).

### Logarithmic Curve for Absolute Profit

Linear scaling would make $1000-profit items dominate. Logarithmic scaling means:
- $10 profit → score ~33 (decent but not exciting)
- $50 profit → score ~56 (solid opportunity)
- $100 profit → score ~66 (good opportunity)
- $500 profit → score ~89 (excellent opportunity)
- $1000 profit → score 100 (rare whale)

This matches the psychological reality of flipping: the difference between $50 and $100 profit feels bigger than between $500 and $550.

**Files to modify:**
- `src/lib/value-estimator.ts` — core formula change
- `src/__tests__/value-estimator.test.ts` — update all score assertions
- `src/lib/llm-analyzer.ts` — `quickDiscountCheck` uses scores — verify threshold still works with new distribution
