# Story 4.1: Algorithmic Value Score

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69a4500b6de723bf97c3df49

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **user**,
I want each scraped listing automatically scored for flip potential,
so that I can quickly identify which items are worth pursuing.

## Acceptance Criteria

<!-- Each criterion MUST reference the FR-* requirement(s) it validates from the PRD -->

1. A value score (0-100) is calculated using category multipliers, condition multiplier, brand boosts, and risk penalties for every scraped listing `FR-SCORE-01`
2. Items are classified into one of: electronics, furniture, tools, video games, collectibles, clothing, sports, musical, automotive, appliances (plus "other" fallback) `FR-SCORE-02`
3. Brand boost keywords are detected and applied: Apple 1.2x, Samsung 1.15x, Sony 1.2x, Nintendo 1.25x, Dyson 1.3x, vintage/rare 1.4x, sealed 1.3x `FR-SCORE-03`
4. Risk penalty keywords are detected and applied: broken/damaged 0.3x, needs repair 0.4x, incomplete 0.6x, heavy use 0.75x, cosmetic wear 0.85x `FR-SCORE-04`
5. Estimated market value is computed as: askingPrice * categoryMultiplier * conditionMultiplier * boosts * penalties `FR-SCORE-05`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-SCORE-01 | AC #1 | @FR-SCORE-01 @story-4-1 |
| FR-SCORE-02 | AC #2 | @FR-SCORE-02 @story-4-1 |
| FR-SCORE-03 | AC #3 | @FR-SCORE-03 @story-4-1 |
| FR-SCORE-04 | AC #4 | @FR-SCORE-04 @story-4-1 |
| FR-SCORE-05 | AC #5 | @FR-SCORE-05 @story-4-1 |

## Definition of Done

- [x] All acceptance criteria are met and verified
- [x] Code reviewed and approved
- [x] Unit tests written and passing (existing 126 tests validated, 100% coverage confirmed)
- [x] Acceptance test scenarios created with triple tags (@E-004-S-N, @FR-SCORE-* and @story-4-1)
- [x] Feature file: `test/acceptance/features/E-004-scoring-and-deal-evaluation.feature` (7 scenarios, all passing)
- [x] Step definitions: `test/acceptance/step_definitions/E-004-algorithmic-value-score.steps.ts`
- [x] Requirements traceability matrix updated at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`
- [x] user_flows.feature updated (story does not affect user flows — no change needed)
- [x] No regressions -- existing value-estimator tests still pass (126 passing)
- [x] No lint errors in new files (pre-existing 25 errors in unrelated files)
- [x] Build: pre-existing failure in reset-password route (unrelated to this story)
- [x] Dev notes and references are complete
- [ ] Trello card moved to Verified
- [ ] Feature card checklist item marked complete

## Tasks / Subtasks

- [x] Task 1: Verify existing value-estimator.ts meets all ACs (AC: #1-5, FR: FR-SCORE-01 through FR-SCORE-05)
  - [x] 1.0 Run `pnpm test -- --testPathPattern=value-estimator` — all 126 tests pass (story referenced 123; 3 more added since story creation)
  - [x] 1.1 Confirm score range is 0-100 and formula matches `profitMargin * 100 + 50` with caps
  - [x] 1.2 Confirm all 10 categories + "other" are detected by `detectCategory()`
  - [x] 1.3 Confirm brand boost multipliers match AC #3 values (code has additional brands beyond AC minimum — this is acceptable)
  - [x] 1.4 Confirm risk penalty multipliers match AC #4 values exactly
  - [x] 1.5 Confirm estimated market value formula matches AC #5 (note: implementation uses baseLow/baseHigh range then averages — this satisfies the formula)
  - [x] 1.6 No discrepancies found — no code changes required
- [x] Task 2: Write BDD acceptance test scenarios (AC: #1-5, FR: FR-SCORE-01 through FR-SCORE-05)
  - [x] 2.1 Write feature file header in `test/acceptance/features/E-004-scoring-and-deal-evaluation.feature`
  - [x] 2.2 Write scenario for AC #1: value score calculation 0-100 (@E-004-S-1 @story-4-1 @FR-SCORE-01)
  - [x] 2.3 Write scenario for AC #2: category detection for all 10 categories (@E-004-S-2 @story-4-1 @FR-SCORE-02)
  - [x] 2.4 Write scenario for AC #3: brand boost keyword detection (@E-004-S-3 @story-4-1 @FR-SCORE-03)
  - [x] 2.5 Write scenario for AC #4: risk penalty keyword detection (@E-004-S-4 @story-4-1 @FR-SCORE-04)
  - [x] 2.6 Write scenario for AC #5: estimated market value calculation (@E-004-S-5 @story-4-1 @FR-SCORE-05)
  - [x] 2.7 Write edge case scenarios: S-6 (combined boosts+penalties), S-7 (extreme high-value with cap at 100)
- [x] Task 3: Write step definitions (AC: #1-5)
  - [x] 3.1 Create `test/acceptance/step_definitions/E-004-algorithmic-value-score.steps.ts`
  - [x] 3.2 Implement Given/When/Then steps calling `estimateValue()` and `detectCategory()` directly
  - [x] 3.3 Validated all assertions: 30/30 scenarios pass with concrete numeric assertions
- [x] Task 4: Update requirements traceability matrix (AC: #1-5)
  - [x] 4.1 Read existing matrix to understand format
  - [x] 4.2 Added FR-SCORE-01 through FR-SCORE-05 entries with scenario IDs @E-004-S-1 through @E-004-S-7
  - [x] 4.3 Last scenario number used: S-7. Story 4.2 should start at S-8.
- [x] Task 5: Validate existing unit tests and fill gaps (AC: #1-5)
  - [x] 5.1 All 126 unit tests pass (value-estimator)
  - [x] 5.2 Coverage: 100% statements, 100% branches, 100% functions, 100% lines — exceeds thresholds
  - [x] 5.3 No gaps identified — no new unit tests needed
- [x] Task 6: Final verification (all ACs)
  - [x] 6.1 `pnpm lint` -- no errors in Story 4.1 files (pre-existing errors in other files)
  - [x] 6.2 `pnpm build` -- pre-existing failure in unrelated reset-password route; no Story 4.1 build errors
  - [x] 6.3 `pnpm test` -- value-estimator: 126/126 pass; pre-existing failures in other modified test files
  - [x] 6.4 `pnpm exec cucumber-js --profile acceptance --tags "@story-4-1"` -- 30/30 scenarios pass

## Dev Notes

### CRITICAL: DO NOT REWRITE — VERIFY AND TEST ONLY

**The core algorithmic scoring engine is ALREADY FULLY IMPLEMENTED in `src/lib/value-estimator.ts` (415 lines).** It has been in production use by all marketplace scrapers since Epic 3 and has 123 passing unit tests with 99% coverage.

**DO NOT:**
- Create a new scoring module or rewrite value-estimator.ts
- Modify the existing scoring algorithm (that's for Stories 4.2-4.6)
- Change the hardcoded 13% fee rate (Story 4.2 handles platform-specific fees)
- Add new brand keywords or risk penalties (out of scope)

**DO:**
1. **Run existing tests FIRST:** `pnpm test -- --testPathPattern=value-estimator` — verify all 123 tests pass
2. **Verify** existing code matches all 5 acceptance criteria exactly
3. **Write BDD acceptance tests** (the feature file exists but is EMPTY — replace any placeholder content)
4. **Write step definitions** — import `estimateValue()` and `detectCategory()` DIRECTLY (pure functions, no HTTP server needed)
5. **Update traceability matrix** — check existing format in `_bmad-output/test-artifacts/requirements-traceability-matrix.md` first

### Existing Implementation Analysis

**File: `src/lib/value-estimator.ts` (415 lines)**

Three exported functions:
- `estimateValue(title, description, askingPrice, condition, category)` → `EstimationResult`
- `detectCategory(title, description)` → string
- `generatePurchaseMessage(title, askingPrice, negotiable, sellerName?)` → string

**Score Formula:**
```
profitMargin = profitPotential / askingPrice
valueScore = min(100, max(0, round(profitMargin * 100 + 50)))
```
With absolute profit thresholds:
- `profitPotential < 10` → cap at 30
- `profitPotential < 0` → cap at 10
- `profitPotential > 100` → boost +10
- `profitPotential > 200` → boost +10 more

**Estimated Market Value Formula:**
```
baseLow = askingPrice * category.low * conditionMultiplier * valueBoost * riskPenalty
baseHigh = askingPrice * category.high * conditionMultiplier * valueBoost * riskPenalty
estimatedValue = (baseLow + baseHigh) / 2
```

**Platform Fee Rate:** Hardcoded at 13% (eBay/Mercari). Note: Story 4.2 will make this platform-specific.

**Profit Calculation:**
```
profitLow = estimatedLow * (1 - 0.13) - askingPrice
profitHigh = estimatedHigh * (1 - 0.13) - askingPrice
profitPotential = (profitLow + profitHigh) / 2
```

### Category Detection (10 categories + "other")

| Category | Keywords | Resale Difficulty |
|----------|----------|-------------------|
| musical | guitar, piano, dj, amplifier | MODERATE (3) |
| video games | playstation, xbox, nintendo, switch | VERY_EASY (1) |
| electronics | phone, laptop, tv, camera, speaker | EASY (2) |
| furniture | couch, table, desk, bed | HARD (4) |
| appliances | washer, dryer, refrigerator, vacuum | HARD (4) |
| tools | drill, saw, power tools (DeWalt, Milwaukee) | EASY (2) |
| collectibles | vintage, antique, rare, limited | EASY (2) |
| clothing | shirt, pants, jacket, shoes | MODERATE (3) |
| sports | bike, fitness, golf, treadmill | MODERATE (3) |
| automotive | car, truck, motorcycle, parts, tires | HARD (4) |
| other | (default) | MODERATE (3) |

### Category Multipliers

| Category | Low Markup | High Markup |
|----------|-----------|-------------|
| electronics | 1.2x | 1.6x |
| furniture | 1.3x | 1.8x |
| appliances | 1.1x | 1.4x |
| tools | 1.3x | 1.7x |
| video games | 1.4x | 2.0x |
| collectibles | 1.5x | 2.5x |
| clothing | 1.1x | 1.5x |
| sports | 1.2x | 1.6x |
| musical | 1.3x | 1.7x |
| automotive | 1.1x | 1.4x |
| default | 1.2x | 1.5x |

### Brand Boost Keywords (VALUE_KEYWORDS)

| Brand/Indicator | Boost | Tag |
|-----------------|-------|-----|
| Apple | 1.2x | apple |
| Samsung | 1.15x | samsung |
| Sony/PlayStation | 1.2x | sony |
| Nintendo | 1.25x | nintendo |
| Xbox/Microsoft | 1.15x | xbox |
| Dyson | 1.3x | dyson |
| Premium kitchen (KitchenAid, Vitamix) | 1.25x | premium-kitchen |
| Premium furniture (Herman Miller, Steelcase) | 1.4x | premium-furniture |
| DJ Equipment (Pioneer, DDJ) | 1.2x | dj-equipment |
| Vintage/Antique | 1.4x | vintage |
| Sealed/New in Box | 1.3x | sealed |
| Rare/Limited Edition | 1.4x | rare |

**Note:** Multipliers are applied **multiplicatively** (can stack). E.g., sealed Apple iPhone = 1.2 * 1.3 = 1.56x.

### Risk Penalty Keywords (RISK_KEYWORDS)

| Risk Factor | Penalty | Tag | Difficulty Impact |
|-------------|---------|-----|-------------------|
| Broken / For Parts Only | 0.3x | for-parts | +1 |
| Needs Repair / Not Working | 0.4x | needs-repair | +1 |
| Scratched / Dented / Worn | 0.85x | cosmetic-wear | +1 |
| Missing / Incomplete | 0.6x | incomplete | +1 |
| Heavy Use / Old | 0.75x | heavy-use | +1 |

### Condition Multipliers

| Condition | Multiplier |
|-----------|-----------|
| new | 1.0x |
| like new | 0.92x |
| excellent | 0.85x |
| good | 0.75x |
| fair | 0.6x |
| poor | 0.4x |
| unknown/default | 0.75x |

### Confidence Assessment Logic

```
if (valueMatches.length > 0 && riskMatches.length === 0) → 'high'
else if (riskMatches.length > 0) → 'low'
else → 'medium'
```

### Comparable URLs Generated

4 platform links generated per listing:
1. eBay Sold Listings (verify actual sold prices)
2. eBay Active Listings (current market prices)
3. Facebook Marketplace (local resale options)
4. Mercari (alternative platform pricing)

### Known PRD Limitations (for awareness, NOT in scope for 4.1)

The PRD documents known scoring limitations:
1. **Circular logic:** estimatedValue derived from askingPrice (not verified market prices)
2. **No real market validation:** eBay URLs generated but not fetched
3. **Hardcoded fee rate:** 13% for all platforms (Story 4.2 addresses this)

These are addressed by later stories in Epic 4 (4.3-4.6) and Epic 5. Story 4.1 is specifically about formalizing the ALGORITHMIC tier.

### Test Requirements

- **Feature file:** `test/acceptance/features/E-004-core-scoring-deal-evaluation.feature` (exists but EMPTY - needs scenarios)
- **Step definitions:** `test/acceptance/step_definitions/E-004-algorithmic-value-score.steps.ts` (needs creation)
- **Tagging:** Every scenario tagged with `@E-004-S-<N>`, `@story-4-1`, and `@FR-SCORE-01` through `@FR-SCORE-05` as applicable
- **Existing unit tests:** `src/__tests__/lib/value-estimator.test.ts` (959 lines, 123 tests, 99% coverage)
- **Traceability matrix:** Update `_bmad-output/test-artifacts/requirements-traceability-matrix.md`

### Existing Unit Test Coverage (123 tests)

| Test Category | # Tests | Status |
|---------------|---------|--------|
| Basic estimation | 4 | Pass |
| Category multipliers | 5 | Pass |
| Condition multipliers | 5 | Pass |
| Value keywords (brand boosts) | 8 | Pass |
| Risk keywords (penalties) | 5 | Pass |
| Negotiable detection | 5 | Pass |
| Shippable detection | 6 | Pass |
| Profit calculations | 3 | Pass |
| Value score (0-100) | 6 | Pass |
| Discount percent | 2 | Pass |
| Resale difficulty | 5 | Pass |
| Comparable URLs | 6 | Pass |
| Reasoning & notes | 6 | Pass |
| Tags | 3 | Pass |
| Edge cases | 10 | Pass |
| detectCategory | 28 | Pass |
| generatePurchaseMessage | 12 | Pass |

### Where valueScore Is Currently Used in Production

1. **Craigslist Scraper** (`app/api/scraper/craigslist/route.v2.ts`): Filters `valueScore >= 70`
2. **OfferUp Scraper** (`app/api/scraper/offerup/route.ts`): Stores valueScore
3. **Mercari Scraper** (`app/api/scraper/mercari/route.ts`): Stores and filters
4. **Dashboard** (`app/dashboard/page.tsx`): Displays valueScore
5. **Opportunities** (`app/opportunities/page.tsx`): Shows valueScore or "—"

### Project Structure Notes

- **Source file:** `src/lib/value-estimator.ts` — DO NOT move, widely imported
- **Test file:** `src/__tests__/lib/value-estimator.test.ts` — existing comprehensive tests
- **Feature file:** `test/acceptance/features/E-004-scoring-and-deal-evaluation.feature` — S-1 through S-7 (Story 4.1 scenarios)
- **Step defs:** `test/acceptance/step_definitions/E-004-algorithmic-value-score.steps.ts` — needs creation
- **Traceability:** `_bmad-output/test-artifacts/requirements-traceability-matrix.md` — needs FR-SCORE entries
- **Path alias:** `@/lib/value-estimator` maps to `src/lib/value-estimator.ts`
- **DB schema:** `prisma/schema.prisma` — Listing model has all scoring fields (valueScore, estimatedValue, etc.)

### Database Fields (Listing model) Used by This Story

```prisma
valueScore          Float?        // 0-100 algorithmic score (indexed)
estimatedValue      Float?        // Market value estimate
estimatedLow        Float?        // Value range low
estimatedHigh       Float?        // Value range high
profitPotential     Float?        // Expected profit mid-point
profitLow           Float?        // Profit range low
profitHigh          Float?        // Profit range high
discountPercent     Float?        // % below market value
resaleDifficulty    String?       // VERY_EASY|EASY|MODERATE|HARD|VERY_HARD
tags                String?       // JSON array of tags (category, brand, condition)
```

### BDD Step Definition Patterns (from existing step defs)

Follow the pattern established in Epic 3 step definitions:
- Import from `@cucumber/cucumber` using `Given`, `When`, `Then`
- Use `assert` from Node.js for assertions
- Direct function calls for unit-level BDD (no HTTP server needed for algorithmic tests)
- Step definitions organized as: `E-004-algorithmic-value-score.steps.ts`
- **IMPORTANT:** Check existing step defs in `test/acceptance/step_definitions/` for any shared World/context patterns before writing new ones

**Example step definition pattern for this story:**
```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import { estimateValue, detectCategory } from '../../src/lib/value-estimator';

let result: ReturnType<typeof estimateValue>;
let category: string;

Given('a listing titled {string} priced at {int} in {string} condition', function (title: string, price: number, condition: string) {
  // Store inputs for When step
  this.title = title;
  this.price = price;
  this.condition = condition;
});

When('the algorithmic scoring engine runs', function () {
  const cat = detectCategory(this.title, null);
  result = estimateValue(this.title, null, this.price, this.condition, cat);
});

Then('the value score is between {int} and {int}', function (min: number, max: number) {
  assert(result.valueScore >= min && result.valueScore <= max,
    `Expected score ${min}-${max}, got ${result.valueScore}`);
});
```

### Scenario Numbering Convention

- Scenario IDs are `@E-004-S-<N>` where N is **epic-wide sequential** (NOT reset per story)
- Story 4.1 scenarios start at S-1
- Story 4.2 scenarios continue from where 4.1 left off (e.g., if 4.1 ends at S-7, 4.2 starts at S-8)
- This is critical for later stories — document the last scenario number in the Dev Agent Record

### Fee Rate Note

The current implementation uses a hardcoded 13% fee rate for all platforms. This is **intentionally NOT changed** in Story 4.1. Story 4.2 will introduce platform-specific fee rates (eBay ~13%, Mercari ~10%, Facebook ~5%, OfferUp ~12.9%, Craigslist 0%). Do not modify fee logic in this story.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic-4-Stories]
- [Source: _bmad-output/planning-artifacts/PRD.md#FR-SCORE]
- [Source: _bmad-output/planning-artifacts/architecture.md#AI-Integration-Architecture]
- [Source: src/lib/value-estimator.ts — Full implementation]
- [Source: src/__tests__/lib/value-estimator.test.ts — 123 unit tests]
- [Source: docs/LISTING-DECISION-LOGIC.md — Known limitations]

### Git Intelligence

Recent commits show Epic 1 wrap-up and test coverage improvements. Key patterns:
- Commit style: emoji prefix + category tag + description
- Coverage thresholds enforced: 96% branches, 98% functions, 99% lines
- Recent focus on fixing test mocks and achieving coverage targets
- Existing codebase is stable — no recent breaking changes to scoring

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4.6

### Debug Log References

- Import path issue: step defs at `test/acceptance/step_definitions/` require `../../../src/lib/value-estimator` (3 levels up), not 2.
- Story referenced 123 unit tests; actual count is 126 (3 added since story creation) — all pass.
- Feature file on disk: `E-004-scoring-and-deal-evaluation.feature` (not `E-004-core-scoring-deal-evaluation.feature` as story DoD states). Traceability matrix updated to reflect actual filename.
- Pre-existing build/lint failures: reset-password route and craigslist scraper tests have failures unrelated to Story 4.1.

### Completion Notes List

- No source code changes required — `src/lib/value-estimator.ts` already fully implements all 5 ACs.
- Verified value-estimator.ts against all ACs analytically and via 126 passing unit tests (100% coverage).
- Written 7 BDD scenarios (S-1 through S-7) covering all 5 ACs plus 2 edge cases.
- Step definitions use direct function calls to `estimateValue()` and `detectCategory()` — no server needed.
- All 30 acceptance scenario instances pass (Outline scenarios expand to multiple).
- Last Epic 4 scenario number used: **S-7**. Story 4.2 should start at **S-8**.
- FR-SCORE-01 through FR-SCORE-05 now marked "Covered" in requirements traceability matrix.

### File List

- `test/acceptance/features/E-004-scoring-and-deal-evaluation.feature` (created — 7 scenarios, all ACs covered)
- `test/acceptance/step_definitions/E-004-algorithmic-value-score.steps.ts` (created — 11 step definitions)
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` (updated — FR-SCORE-01 to FR-SCORE-05 marked Covered)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated — 4-1 status: ready-for-dev → review)
- `_bmad-output/implementation-artifacts/epic-4/4-1-algorithmic-value-score.md` (this file — status, tasks, record updated)

### Change Log

- 2026-03-01: Story 4.1 implemented. No source code changes. Added BDD acceptance tests (7 scenarios, 30 instances) and step definitions. Updated requirements traceability matrix. All value-estimator unit tests pass (126/126, 100% coverage).
