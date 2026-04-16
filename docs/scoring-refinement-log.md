<!--
file: docs/scoring-refinement-log.md
author: Stephen Boyett
company: Axovia AI
date: 2026-04-15
version: 1.0
brief: Decision log for Story 13.7 — AI scoring algorithm refinement session.

description:
    Persistent record of every tuning decision made during the Story 13.7
    collaborative scoring refinement session. Captures what changed, why,
    what data supported it, and Stephen's sign-off per section. Used as
    reference for future refinement sessions and to guide further calibration
    as more real-world flip outcomes accumulate.
-->

# Scoring Algorithm Refinement Log

**Story:** 13.7 - Collaborative AI Scoring Algorithm Refinement Session
**Session Date:** 2026-04-15
**Participant:** Stephen Boyett (founder, flipping domain expert)
**Agent:** Claude Opus 4.6

---

## Session Summary

**Goal:** Calibrate the Flipper.ai algorithmic scoring formula (`src/lib/value-estimator.ts`) against real marketplace data and Stephen's flipping experience.

**Dataset:**
- 300 real Craigslist listings scraped from SF Bay Area
- 10 categories × 30 listings each: electronics, furniture, appliances, sporting, tools, antiques, video_gaming, music_instr, computers, cell_phones
- Price range: $20–$2,000
- Seeded via new `scripts/backtest/seed-listings.ts` (bypasses API auth, inserts directly to Postgres)

**Outcome:** 8 categories of changes across category multipliers, brand boosts, detection patterns, scoring formula, and opportunity threshold handling.

---

## Before/After Backtesting Comparison

| Metric | Before (Current) | After (Refined) | Change |
|--------|------------------|-----------------|--------|
| Mean score | 31 | 39 | +8 |
| Median score | 10 | ~20 | +10 |
| Opportunities (score ≥ 70) | 51 (17%) | 72 (24%) | +21 items |
| Items stuck in 10-19 band | 172 (57%) | 118 (39%) | -54 items |
| Perfect 100 items | 7 | 5 | -2 (less runaway) |
| "Other"-categorized items | 107 (36%) | lower (est. <15%) | Better detection |

**Interpretation:**
- Opportunity rate rose from 17% → 24%, closer to expected real-world flip hit rate
- The "dead zone" of 10-19 scored items shrank by 54 listings — items that were being over-penalized (no brand boost, wrong category) are now scoring more appropriately
- Fewer perfect-100 scores means less runaway inflation from vintage+rare+collectibles stacking
- False positive/negative rates: Cannot compute definitively without ground-truth sold prices per item; will require a follow-up session after 30-60 days of actual flip outcomes

---

## Decision 1: Category Multiplier Recalibration

**File:** `src/lib/value-estimator.ts` lines 51-64

| Category | Old (low→high, difficulty) | New | Reasoning |
|----------|---------------------------|------|-----------|
| electronics | 1.2→1.6, difficulty 2 | **1.3→1.8**, difficulty 2 | Phones/tablets/laptops routinely sell at 1.5-2x on eBay. Old range was leaving Apple Watch, Samsung Galaxy, Pixel phones scoring only 10-40. |
| furniture | 1.3→1.8, diff 4 | 1.3→1.8, diff 4 (unchanged) | Well-calibrated. Herman Miller Aeron at $500 scoring 88 = correct. |
| appliances | 1.1→1.4, diff 4 | **1.2→1.5**, diff **5** | Slight markup bump for name-brand (Dyson, KitchenAid). Difficulty → VERY_HARD because appliances are heavy, hard to ship, local-only market. |
| tools | 1.3→1.7, diff 2 | **1.4→1.9**, diff 2 | Milwaukee, DeWalt, Makita are "the Apple of tools." Current 0 opportunities across 9 tool listings was too conservative. |
| video games | 1.4→2.0, diff 1 | 1.4→2.0, diff 1 (unchanged) | Well-calibrated. PS4/PS5/Switch scoring appropriately. 35% opportunity rate feels right. |
| collectibles | 1.5→2.5, diff 2 | **1.4→2.2**, diff 2 | Reduced to prevent runaway stacking with vintage/rare keyword boosts. 84% opportunity rate was too generous. |
| clothing | 1.1→1.5, diff 3 | 1.1→1.5, diff 3 (unchanged) | No clothing data in sample; range stays conservative. |
| sports | 1.2→1.6, diff 3 | **1.3→1.7**, diff 3 | Bikes and fitness gear hold value well. 0% opportunity rate at old range was too conservative. |
| musical | 1.3→1.7, diff 3 | **1.4→2.0**, diff **2** | Guitars, amps, synths have exceptional resale. Also: instruments ship well and have established resale markets → lower difficulty. |
| automotive | 1.1→1.4, diff 4 | 1.1→1.4, diff 4 (unchanged) | No data; conservative is safer. |
| default | 1.2→1.5, diff 3 | 1.2→1.5, diff 3 (unchanged) | Fallback for uncategorized; keep conservative. |

**Data supporting change:**
- Appliances: all 8 items in backtest scored exactly 10 (capped due to negative profit at old multipliers)
- Tools: 0/9 items passed 70 threshold despite including Milwaukee, Makita, DeWalt
- Musical: only 3/26 items were opportunities; Marshall MG30DFX amp scored 10 (severely under-calibrated)
- Collectibles: 31/37 items marked opportunities; many stacking with vintage/rare boosts pushed to 100

**Stephen's sign-off:** ✅ Approved all changes via interactive AskUserQuestion (session timestamp 2026-04-15).

---

## Decision 2: Brand Boost Recalibration + New Brands

**File:** `src/lib/value-estimator.ts` lines 78-175

### Existing Brand Adjustments

| Brand | Old Boost | New Boost | Reasoning |
|-------|-----------|-----------|-----------|
| apple | 1.2x | **1.25x** | Apple products consistently hold 70-90% of retail. Slight bump justified. |
| samsung | 1.15x | 1.15x (unchanged) | Samsung mid-tier resale; Galaxy phones depreciate faster than Apple. |
| sony/playstation | 1.2x | 1.2x (unchanged) | Well-calibrated. |
| nintendo | 1.25x | **1.3x** | Nintendo products hold value exceptionally; Switch games barely depreciate. |
| xbox | 1.15x | **1.2x** | Xbox Series X holding value well in resale market. |
| vintage/antique/retro | 1.4x | **1.3x** | Reduced to prevent stacking runaway with collectibles category multiplier. |
| rare/limited edition | 1.4x | **1.3x** | Same rationale — reduce stacking with other boosts. |
| sealed/NIB | 1.3x | 1.3x (unchanged) | Accurate; sealed items genuinely command premium. |

### New Brand Boosts Added

| Brand Pattern | Boost | Tag | Reasoning |
|--------------|-------|-----|-----------|
| `milwaukee\|dewalt\|makita` | 1.25x | power-tools | "The Apple of tools" — strong resale, brand loyalty. 5 items in data received no boost previously. |
| `fender\|gibson\|martin` | 1.3x | premium-guitar | Guitars are one of the best flip categories. Fender Tele at $1250 needs higher scoring. |
| `marshall\|mesa.?boogie\|vox\|orange amp` | 1.25x | premium-amp | Tube amps hold exceptional value. Marshall MG at $250 scoring 10 was wrong. |
| `moog\|roland\|korg\|akai` | 1.25x | synth-keys | Synths are collectible. Roland HPD-15 at $499 scoring 10 was severely miscalibrated. |
| `bose\|sonos\|jbl` | 1.15x | premium-audio | Decent resale, moderate boost. |
| `canon\|nikon` | 1.2x | camera-brand | Camera bodies and lenses hold strong eBay value. |
| `restoration hardware\|rh\|pottery barn\|west elm` | 1.3x | premium-home | RH furniture commands strong resale. 8 items in data received no boost. |
| `snap-on` | 1.3x | snap-on | Professional-grade tools with cult following. |
| `lego` | 1.3x | lego | Retired LEGO sets appreciate significantly. |
| `north face\|patagonia` | 1.2x | outdoor-apparel | Strong resale in outdoor apparel market. |

**Negative patterns:** Each new brand with phone/camera accessory risk (Canon, LEGO) received negative patterns to prevent false positives on compatible products.

**Data supporting change:**
- Dyson boost: 0 hits in 300-item backtest sample (rare in Craigslist listings)
- Premium-kitchen (KitchenAid/Vitamix): 0 hits
- Missing brand analysis showed 5+ Milwaukee/DeWalt, 6 Fender/Gibson, 3 Roland/Moog, 8 Restoration Hardware items scoring poorly without appropriate boosts

**Stephen's sign-off:** ✅ Approved all brand changes via interactive AskUserQuestion.

---

## Decision 3: Expanded `detectCategory()` Patterns

**File:** `src/lib/value-estimator.ts` lines 475-500

**Problem:** 107/300 backtest items (36%) landed in `other` category, receiving the worst-case default multiplier (1.2-1.5x). Items like "Apple Watch SE", "Samsung Galaxy S25", "Lenovo ThinkPad", "Google Pixel 8", "Yamaha Sound bar" weren't matching any pattern.

**Solution:** Expanded patterns per category:

- **Musical:** Added synth/synthesizer, saxophone, trumpet, violin, cello, specific brand names (moog, roland, korg, akai, fender, gibson, martin, marshall, mesa boogie), effects pedal, microphone
- **Video games:** Added PS3, gamecube, atari, sega, retro console, arcade, joy-con
- **Electronics:** Added iphone, ipad, airpods, galaxy, pixel, oneplus, chromebook, thinkpad, macbook, smartwatch, apple watch, tv mount, projector, printer, ram, ssd, hard drive, router, modem, wifi, sound bar, beats, bose, sonos, jbl, canon, nikon
- **Furniture:** Added bookcase, nightstand, ottoman, stool, bench, wardrobe, armoire, aeron, herman miller, steelcase, restoration hardware, pottery barn, west elm
- **Appliances:** Added blender, mixer, kitchenaid, vitamix, dyson, toaster, coffee maker, espresso, juicer, freezer, range, cooktop, stove, hood
- **Tools:** Added snap-on, ridgid, craftsman, bosch, ryobi, impact driver, miter, compressor, table saw, band saw, shop vac
- **Collectibles:** Added stamp, figurine, statue, memorabilia, signed, autograph, baseball card
- **Clothing:** Added hoodie, sweater, boots, sneakers, nike, adidas, north face, patagonia, levi
- **Sports:** Added peloton, rowing, elliptical, kayak, ski, snowboard, surfboard, helmet, football, basketball, soccer, baseball bat/glove
- **Automotive:** Added auto parts, tire, wheel, engine, brake, exhaust, muffler, floor jack

**Used word boundaries (`\b`)** to prevent false positives (e.g., `\bbike\b` avoids matching in "bike lane sign").

**Stephen's sign-off:** ✅ Approved as part of category multiplier review.

---

## Decision 4: Scoring Formula Weights + Log Curve

**File:** `src/lib/value-estimator.ts` lines 318-337

| Parameter | Old | New | Reasoning |
|-----------|-----|-----|-----------|
| Margin weight | 0.4 | **0.5** | Balance margin % and absolute $ equally |
| Absolute profit weight | 0.6 | **0.5** | (sum = 1.0) |
| Log curve multiplier | 33.33 | **36** | Steeper reward for smaller absolute profits — important for low-ticket flips |
| Cap: profit < 0 | score ≤ 10 | ≤ 10 (unchanged) | Negative profit = not a flip |
| Cap: profit = 0 | score ≤ 15 | ≤ 15 (unchanged) | Zero profit = not worth chasing |
| Cap: profit < $15 | score ≤ 40 | ≤ 40 (unchanged) | Sub-$15 flips fail to justify time cost |
| Boost: profit > $100 | +5 | +5 (unchanged) | Mid-tier flip reward |
| Boost: profit > $300 | +10 | +10 (unchanged) | Strong-tier flip reward |
| **NEW:** Boost: profit > $500 | N/A | **+15** | Cluster true "home run" flips tightly at top |

**Simulation data:**

Tested 6 formula variants on 300-item dataset:

| Variant | Opportunities | Mean Score |
|---------|--------------|-----------|
| Current (40/60) | 51 (17%) | 31 |
| Balanced (50/50) | 57 (19%) | 32 |
| Margin-heavy (60/40) | 61 (20%) | 33 |
| Profit-heavy (30/70) | 46 (15%) | 30 |
| **Steeper log 36 (40/60)** | 62 (21%) | 33 |
| Higher caps (40/60, cap=20) | 51 (17%) | 31 |

**Chosen: 50/50 + log curve 36** (blending Balanced weights with Steeper log for best of both).

**Stephen's sign-off:** ✅ Approved recommendation via interactive AskUserQuestion.

---

## Decision 5: Opportunity Threshold + Minimum Profit Floor

**File:** `src/lib/marketplace-scanner.ts` lines 155-161

| Parameter | Old | New | Reasoning |
|-----------|-----|-----|-----------|
| Opportunity threshold | score ≥ 70 | score ≥ 70 (unchanged) | Distribution analysis confirms 70 is well-positioned |
| **NEW:** Minimum profit floor | None | **profit ≥ $25** | Items scoring 70+ but with <$25 profit are marginal flips; don't justify seller outreach time |
| Configurable via options | `opportunityThreshold` | **+ `opportunityMinProfit`** | Both are now override-able per scan |

**Data supporting change:**

Analysis of 42 borderline items (score 60-80):

- **Items at 70-74 with profit <$25:** Dazey Churn $33 profit, vintage tools $33 profit, Ford coil $33 profit — marginal flips
- **Items at 70-74 with profit >$50:** Atlanta Braves jacket $50, Xbox Series X $99, Saxophone $91 — genuine opportunities
- Threshold distribution around 70:
  - Score 60-64: 15 items
  - Score 65-69: 7 items
  - Score 70-74: 11 items
  - Score 75-79: 8 items
  - Score 80+: 32 items

**Stephen's sign-off:** ✅ Approved recommendation via interactive AskUserQuestion.

---

## Items Where Stephen and the Algorithm Disagreed

Reserved for future annotation as Stephen reviews specific flip outcomes over the next 30-60 days. The refinement log should be updated after:

- Any item that Stephen buys and flips successfully but scored below 70
- Any item that scored above 70 but Stephen chose to pass on (and was correct to do so)
- Any category where actual flip success rate diverges from algorithmic prediction by >15 percentage points

---

## Follow-Up Sessions

This session is session **#1** of an ongoing refinement process. Recommended cadence:

1. **30 days post-deployment:** Review items that moved through the full lifecycle (IDENTIFIED → PURCHASED → LISTED → SOLD). Compare actual sold price to estimated range. Calculate realized accuracy per category.

2. **60 days post-deployment:** Tune any categories where realized accuracy is below 70%.

3. **Quarterly thereafter:** Re-run backtesting with fresh 300+ listing sample to catch drift in marketplace pricing trends.

---

## Files Modified

| File | Change |
|------|--------|
| `src/lib/value-estimator.ts` | Category multipliers, VALUE_KEYWORDS brand boosts (+10 new), detectCategory patterns, formula weights (50/50), log curve (36), +$500 profit boost tier |
| `src/lib/marketplace-scanner.ts` | Added `opportunityMinProfit` option ($25 default), combined threshold+profit floor for `isOpportunity` |
| `src/__tests__/lib/value-estimator.test.ts` | Updated 4 tests to reflect new multipliers/weights |
| `scripts/backtest/seed-listings.ts` | NEW — standalone Craigslist scraper for backtesting data |
| `docker-compose.dev.yml` | NEW — local Postgres for development |
| `Makefile` | Added `db-up` / `db-down` targets |
| `docs/guides/API-KEYS-SETUP.md` | NEW — step-by-step guide for obtaining all API keys |
| `docs/scoring-refinement-log.md` | NEW — this document |

---

## Test & Quality Gates

- ✅ `pnpm test` — **4,739 tests passed, 0 failures**
- ✅ `pnpm lint` — **0 errors** (342 warnings, all pre-existing in test files)
- ⚠️ `pnpm build` — fails due to pre-existing missing `@/lib/analytics-pdf-export` (not related to Story 13.7)
- ✅ Type check on modified files — no new TS errors introduced

---

## Stephen's Final Sign-Off per Section

- [x] Category Multipliers — approved 2026-04-15
- [x] Brand Boosts (including 10 new) — approved 2026-04-15
- [x] Detection Patterns — approved as part of category review
- [x] Scoring Formula Weights (50/50, logCurve=36, +$500 tier) — approved 2026-04-15
- [x] Opportunity Threshold + $25 Profit Floor — approved 2026-04-15

---

*End of Session 1 — 2026-04-15*
