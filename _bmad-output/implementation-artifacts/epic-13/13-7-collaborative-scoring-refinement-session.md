# Story 13.7: Collaborative AI Scoring Algorithm Refinement Session

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID:

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As **Stephen (the founder)**,
I want to conduct an in-depth, interactive refinement session with the AI agent to review, challenge, and improve the scoring algorithm using real marketplace data and my domain expertise,
so that the scoring formula is calibrated against real-world flipping knowledge — not just theoretical multipliers — and I have deep understanding and ownership of how my product scores items.

## Acceptance Criteria

1. **Backtesting Report Generated** — The AI agent runs the current scoring algorithm against 200+ real listings from the database. If fewer than 200 exist, the agent must run targeted scans across all 5 marketplaces and multiple categories to reach the minimum, or document why a smaller sample (minimum 50) is sufficient for meaningful statistics. The agent produces a detailed backtesting report showing: score distribution histogram, false positive rate (scored 70+ but would not profit), false negative rate (scored <70 but would profit), and per-category accuracy breakdown `FR-SCORE-29`
2. **Category Multiplier Review** — Each of the 11 category multiplier ranges is reviewed interactively with Stephen. For each category, the agent presents: current multiplier, sample scored items, eBay sold data for that category, and asks Stephen whether the multiplier feels right based on his flipping experience. Multipliers are adjusted based on Stephen's input. `FR-SCORE-29`
3. **Brand Boost Review** — Each brand boost keyword and multiplier is reviewed with Stephen. The agent presents examples of true positives and false positives for each brand pattern, and Stephen decides whether to adjust, add, or remove patterns. `FR-SCORE-29`
4. **Scoring Formula Tuning** — The weighted scoring formula (margin vs absolute profit weights, logarithmic curve parameters, cap thresholds) is reviewed with Stephen using side-by-side comparisons of how specific items score under different parameter values. Stephen selects the parameters that best match his intuition. `FR-SCORE-29`
5. **Threshold Calibration** — The 70-point opportunity threshold is validated against backtesting data. The agent presents "borderline" items (scored 65-75) and asks Stephen: "Would you buy this?" Threshold is adjusted if Stephen's judgment systematically disagrees. `FR-SCORE-29`
6. **Existing Data Re-Scored** — After all refinements are implemented, all existing Listings in the database are re-scored with the updated algorithm. Any Opportunities whose valueScore drops below the threshold are flagged in the refinement log with a note about whether they should be kept or archived. `FR-SCORE-29`
7. **Refinements Implemented** — All agreed-upon changes from the session are implemented in code, tests updated, and existing test suite passes. `FR-SCORE-29`
8. **Decision Log Documented** — Every tuning decision made during the session is documented with rationale in a `docs/scoring-refinement-log.md` file, including: what was changed, why, what data supported it, and Stephen's reasoning. `FR-SCORE-29`

## Requirement Traceability

> **NOTE:** FR-SCORE-29 is a NEW functional requirement to be added to the PRD before implementation. It covers: "The scoring algorithm shall be calibrated against real-world resale data and domain expertise through an interactive refinement process."

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-SCORE-29 | AC #1, #2, #3, #4, #5, #6, #7, #8 | @FR-SCORE-29 @story-13-7 |

## Definition of Done

- [ ] All acceptance criteria are met and verified
- [ ] Backtesting report generated and reviewed with Stephen
- [ ] Category multipliers reviewed and adjusted per Stephen's input
- [ ] Brand boosts reviewed and adjusted per Stephen's input
- [ ] Scoring formula weights tuned with Stephen's approval
- [ ] Opportunity threshold validated or adjusted
- [ ] All code changes from refinements implemented
- [ ] Unit tests updated and passing
- [ ] `docs/scoring-refinement-log.md` created with all decisions documented
- [ ] No regressions — existing tests still pass
- [ ] No lint errors (`pnpm lint`)
- [ ] Build passes (`pnpm build`)
- [ ] Before/after backtesting comparison generated. False positive and false negative rates must not increase by more than 5 percentage points vs. pre-session baseline. Any regression must be acknowledged and documented with Stephen's explicit sign-off.
- [ ] Stephen explicitly confirms each section is finalized (category multipliers, brand boosts, formula weights, threshold). The refinement log contains Stephen's sign-off statement per section.

## Tasks / Subtasks

- [ ] Task 1: Generate backtesting dataset
  - [ ] 1.1 Query 200+ listings from the database (or run fresh scans across categories)
  - [ ] 1.2 For each listing: run current scoring algorithm, look up eBay sold prices, calculate actual profitability
  - [ ] 1.3 Generate report: score distribution, accuracy metrics, per-category breakdown
  - [ ] 1.4 Present report to Stephen with visualizations

- [ ] Task 2: Interactive category multiplier review
  - [ ] 2.1 For each of 11 categories: present current multiplier, 5 sample items with scores, eBay sold data
  - [ ] 2.2 Ask Stephen: "Based on your experience, does [category] typically sell for [low]-[high]x the listing price?"
  - [ ] 2.3 Discuss seasonal factors (e.g., "Would you adjust these for summer vs winter?")
  - [ ] 2.4 Discuss regional factors (e.g., "Does furniture flip better in your metro?")
  - [ ] 2.5 Record adjustments with rationale
  - [ ] 2.6 If fewer than 10 sold comps exist for a category, note the data sparsity and weight Stephen's experiential judgment more heavily than statistical analysis for that category.

- [ ] Task 3: Interactive brand boost review
  - [ ] 3.1 For each brand pattern: show 3 true positives and any known false positives
  - [ ] 3.2 Ask Stephen: "Is [brand] still premium in the resale market? Should the boost be higher/lower?"
  - [ ] 3.3 Ask: "What brands are missing? What do you see sell well that we don't detect?"
  - [ ] 3.4 Ask: "What brands are overrated for resale that we should reduce?"
  - [ ] 3.5 Add new brand patterns Stephen identifies
  - [ ] 3.6 Record all changes

- [ ] Task 4: Scoring formula tuning session
  - [ ] 4.1 Present 10 "calibration items" — items with known outcomes
  - [ ] 4.2 For each: show score under current formula, then under 3 alternative parameter sets
  - [ ] 4.3 Ask Stephen: "Which score feels right for this item? Why?"
  - [ ] 4.4 Tune margin/absolute weights (40/60 vs 30/70 vs 50/50)
  - [ ] 4.5 Tune logarithmic curve steepness
  - [ ] 4.6 Tune cap thresholds ($10, $15, $50 minimum profit caps)

- [ ] Task 5: Threshold calibration
  - [ ] 5.1 Present 20 "borderline" items scoring 60-80
  - [ ] 5.2 For each: ask Stephen "Would you buy this at the listed price?"
  - [ ] 5.3 If Stephen says "yes" to items scoring <70 → threshold may be too high
  - [ ] 5.4 If Stephen says "no" to items scoring >70 → threshold may be too low
  - [ ] 5.5 Calculate optimal threshold from Stephen's responses
  - [ ] 5.6 Discuss whether threshold should vary by category
  - [ ] 5.7 If eBay sold data is unavailable for some categories (niche/local items), skip those listings from accuracy metrics and document the data gap. Do not extrapolate from insufficient data.

- [ ] Task 6: Implement all refinements
  - [ ] 6.1 Update `value-estimator.ts` with all agreed category multiplier changes
  - [ ] 6.2 Update brand patterns (adds, removes, multiplier adjustments)
  - [ ] 6.3 Update scoring formula parameters if changed
  - [ ] 6.4 Update opportunity threshold if changed
  - [ ] 6.5 Update all affected unit tests
  - [ ] 6.6 Run full test suite — zero regressions

- [ ] Task 7: Document decisions
  - [ ] 7.1 Create `docs/scoring-refinement-log.md` with the project's mandatory file header (author: Stephen Boyett, company: Axovia AI, date, version, brief, description per CLAUDE.md convention)
  - [ ] 7.2 For each decision: what changed, old value → new value, reasoning, data that supported it
  - [ ] 7.3 Include backtesting before/after comparison
  - [ ] 7.4 Note any items where Stephen and the algorithm disagreed and why

## Dev Notes

### THIS IS AN INTERACTIVE STORY — NOT A STANDARD DEV STORY

This story is designed to be executed as a **real-time conversation between Stephen and the AI agent**. It is NOT a "write code and submit" story. The agent's role is:

1. **Present data** — show Stephen real items, real scores, real sold prices
2. **Ask questions** — elicit Stephen's domain expertise through specific, concrete examples
3. **Challenge assumptions** — when Stephen says "that multiplier is too low," ask "what data from your flipping experience supports that?"
4. **Propose alternatives** — show how different parameters affect specific items Stephen cares about
5. **Document everything** — every decision, every rationale, every disagreement

### Elicitation Techniques to Use

- **Concrete examples over abstract discussion**: "Look at this $45 KitchenAid mixer scored 82 — is that right?" beats "Do you think kitchen appliance multipliers are correct?"
- **Calibration anchoring**: Start with items Stephen has personally flipped. "You bought X for $Y and sold for $Z. Would you want the algorithm to score that as ___?"
- **Counterfactual probing**: "If this item were in [different city/season], would you still buy it? Should the score change?"
- **Extreme case testing**: Present the highest and lowest scored items. "Does this deserve to be our #1 recommendation? Why or why not?"
- **Category walk-through**: Go category by category. For each, ask "In your experience, what's the typical markup you see for [category]?"

### Expected Session Duration

This is a 2-4 hour interactive session, likely spread across multiple Claude Code conversations. Each conversation should pick up where the last left off using `docs/scoring-refinement-log.md` as the persistent state.

### Files That May Change

- `src/lib/value-estimator.ts` — category multipliers, brand patterns, formula weights, thresholds
- `src/__tests__/value-estimator.test.ts` — all score assertions
- `docs/scoring-refinement-log.md` — new file, decision log
- Possibly `src/lib/llm-analyzer.ts` — if LLM prompt parameters change

### Pre-Requisites

**HARD DEPENDENCY:** Stories 13.1 through 13.4 must be complete before this session begins (these change the scoring formula and data pipeline). Stories 13.5 and 13.6 are recommended but not blocking — if started before those complete, a brief follow-up session should be conducted after 13.5-13.6 land to review brand patterns and demand integration.
