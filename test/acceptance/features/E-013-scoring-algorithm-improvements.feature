@epic-13
Feature: Scoring Algorithm Improvements — IQR Outlier Filtering
  As a Flipper.ai user
  I want market price calculations to exclude extreme outlier prices
  So that AI scores reflect realistic resale values

  # =====================================================================
  # Story 13.1: IQR Outlier Filtering on eBay Sold Prices
  # AC #1: IQR filtering applied to sold prices (1.5x fencing)
  # AC #2: Minimum sample size fallback (< 4 remaining → unfiltered, confidence low)
  # AC #3: Outlier count exposed in response
  # AC #4: Backtesting — false-positive reduction (manual validation)
  # AC #5: No regression on valid deals (manual validation)
  # =====================================================================

  # S-001: Extreme outlier is removed by IQR filtering
  @E-013-S-001 @FR-SCORE-23 @story-13-1
  Scenario: IQR filtering removes extreme high outlier from sold prices
    Given a set of eBay sold prices [95, 100, 105, 110, 90, 1000, 98, 102]
    When IQR outlier filtering is applied
    Then the price 1000 should be excluded from filtered results
    And the outliers removed count should be 1
    And the low sample size flag should be false

  # S-002: Both low and high outliers are removed
  @E-013-S-002 @FR-SCORE-23 @story-13-1
  Scenario: IQR filtering removes both low and high outliers
    Given a set of eBay sold prices [1, 95, 100, 105, 110, 98, 102, 500]
    When IQR outlier filtering is applied
    Then the price 1 should be excluded from filtered results
    And the price 500 should be excluded from filtered results
    And the outliers removed count should be 2

  # S-003: No outliers present — all prices retained
  @E-013-S-003 @FR-SCORE-23 @story-13-1
  Scenario: IQR filtering retains all prices when no outliers exist
    Given a set of eBay sold prices [100, 105, 110, 115, 120]
    When IQR outlier filtering is applied
    Then all 5 prices should be retained
    And the outliers removed count should be 0
    And the low sample size flag should be false

  # S-004: Fewer than 4 input prices triggers low sample size fallback
  @E-013-S-004 @FR-SCORE-23 @story-13-1
  Scenario: Minimum sample size fallback when fewer than 4 prices provided
    Given a set of eBay sold prices [100, 200, 300]
    When IQR outlier filtering is applied
    Then all 3 prices should be retained
    And the outliers removed count should be 0
    And the low sample size flag should be true

  # S-005: Filtering leaves fewer than 4 prices triggers fallback
  @E-013-S-005 @FR-SCORE-23 @story-13-1
  Scenario: Fallback when filtering would leave fewer than 4 prices
    Given a set of eBay sold prices [100, 105, 110, 1, 10000]
    When IQR outlier filtering is applied
    Then all 5 prices should be retained
    And the outliers removed count should be 0
    And the low sample size flag should be true

  # S-006: All identical prices (IQR = 0) are handled correctly
  @E-013-S-006 @FR-SCORE-23 @story-13-1
  Scenario: Identical prices produce zero IQR and no outliers
    Given a set of eBay sold prices [50, 50, 50, 50, 50]
    When IQR outlier filtering is applied
    Then all 5 prices should be retained
    And the outliers removed count should be 0
    And the low sample size flag should be false

  # S-007: Outlier count is exposed in market price response
  @E-013-S-007 @FR-SCORE-23 @story-13-1
  Scenario: Market price response includes outliersRemoved count
    Given a set of eBay sold prices [95, 100, 105, 110, 90, 1000, 98, 102]
    When IQR outlier filtering is applied
    Then the outliers removed count should be 1
    And the low sample size flag should be false

  # S-008: Low sample size forces confidence to low in market value calculator
  @E-013-S-008 @FR-SCORE-23 @story-13-1
  Scenario: Low sample size sets confidence to low in downstream consumer
    Given a set of eBay sold prices [100, 200, 300]
    When IQR outlier filtering is applied
    Then the low sample size flag should be true
    And downstream confidence should be set to "low"

  # =====================================================================
  # Story 13.2: Structured JSON Response Format for LLM Analysis
  # AC #1: Native JSON mode enabled (response_format: json_object)
  # AC #2: Regex extraction removed, direct JSON.parse used
  # AC #3: Retry logic on parse failure with simplified prompt
  # AC #4: Error logging to Sentry on parse failures
  # AC #5: No schema changes — JSON structure unchanged
  # =====================================================================

  # S-009: OpenAI call uses native json_object response format
  @E-013-S-009 @FR-SCORE-24 @story-13-2
  Scenario: OpenAI API call uses native JSON response format
    Given the llm-analyzer source file at "src/lib/llm-analyzer.ts"
    When I inspect the analyzeSellability OpenAI call configuration
    Then it should include response_format with type "json_object"
    And the system prompt should contain the word "JSON"

  # S-010: Regex-based JSON extraction has been removed
  @E-013-S-010 @FR-SCORE-24 @story-13-2
  Scenario: Regex-based JSON extraction is replaced with direct JSON.parse
    Given the llm-analyzer source file at "src/lib/llm-analyzer.ts"
    When I search for regex-based JSON extraction patterns
    Then no regex extraction pattern should be found
    And direct JSON.parse should be used for response parsing

  # S-011: Retry logic fires on JSON parse failure
  @E-013-S-011 @FR-SCORE-24 @story-13-2
  Scenario: System retries with simplified prompt when JSON parsing fails
    Given the llm-analyzer source file at "src/lib/llm-analyzer.ts"
    When I inspect the JSON parse error handling in analyzeSellability
    Then there should be a retry with a simplified prompt on parse failure
    And on second failure it should return null for algorithmic fallback

  # S-012: Parse failures are logged to Sentry
  @E-013-S-012 @FR-SCORE-24 @story-13-2
  Scenario: Parse failures are logged to Sentry with raw response body
    Given the llm-analyzer source file at "src/lib/llm-analyzer.ts"
    When I inspect the error logging in the retry catch block
    Then Sentry.captureException should be called with the error
    And the extra context should include the original response text

  # S-013: JSON response schema is unchanged
  @E-013-S-013 @FR-SCORE-24 @story-13-2
  Scenario: LLM response JSON schema remains identical
    Given the llm-analyzer source file at "src/lib/llm-analyzer.ts"
    When I inspect the SellabilityAnalysis interface and buildResult function
    Then all original fields should be preserved in the response schema
    And the buildResult validation functions should still be applied

  # =====================================================================
  # Story 13.5: Brand Regex Refinement — Title-Only Matching + Negative Patterns
  # AC #1: Brand boost patterns applied to listing title only
  # AC #2: Negative patterns suppress false-positive boosts
  # AC #3: Risk/condition keywords remain full-text (title + description)
  # AC #4: Sealed/NIB matches title OR first 100 chars of description
  # AC #5: Genuine brands still receive correct boost (no regression)
  # =====================================================================

  # S-014: Brand boost applied to title only, not description
  @E-013-S-014 @FR-SCORE-27 @story-13-5
  Scenario: VALUE_KEYWORDS match against listing title only
    Given a listing with title "Generic Phone" and description "Apple iPhone compatible charger included"
    When the value estimator scores the listing at price 100 condition "good" category "electronics"
    Then the result tags should not contain "apple"

  # S-015: Negative patterns suppress false brand boosts
  @E-013-S-015 @FR-SCORE-27 @story-13-5
  Scenario: Negative patterns prevent false-positive brand boosts
    Given a listing with title "Phone case compatible with Nintendo Switch" and description ""
    When the value estimator scores the listing at price 10 condition "new" category "electronics"
    Then the result tags should not contain "nintendo"
    And a listing with title "Modern lamp, vintage-style design" and description ""
    When the value estimator scores the listing at price 50 condition "new" category "furniture"
    Then the result tags should not contain "vintage"
    And a listing with title "Rarely used blender" and description ""
    When the value estimator scores the listing at price 30 condition "like new" category "appliances"
    Then the result tags should not contain "rare"

  # S-016: Risk keywords still match full text (title + description)
  @E-013-S-016 @FR-SCORE-27 @story-13-5
  Scenario: RISK_KEYWORDS match against both title and description
    Given a listing with title "PS5 Console" and description "slightly scratched on top, works great"
    When the value estimator scores the listing at price 400 condition "good" category "video games"
    Then the result tags should contain "cosmetic-wear"
    And a listing with title "Gaming Console" and description "Broken, for parts only"
    When the value estimator scores the listing at price 200 condition "poor" category "video games"
    Then the result tags should contain "for-parts"

  # S-017: Sealed/NIB contextual — title or first 100 chars only
  @E-013-S-017 @FR-SCORE-27 @story-13-5
  Scenario: Sealed boost requires title or first 100 characters of description
    Given a listing with title "Sealed iPhone 15" and description ""
    When the value estimator scores the listing at price 800 condition "new" category "electronics"
    Then the result tags should contain "sealed"
    And a listing with title "Used iPhone 15" and description that mentions "sealed" after 150 characters
    When the value estimator scores the listing at price 500 condition "good" category "electronics"
    Then the result tags should not contain "sealed"

  # S-018: Genuine brands still receive correct boost (no regression)
  @E-013-S-018 @FR-SCORE-27 @story-13-5
  Scenario: True brand names in title still receive brand boost
    Given a listing with title "Nintendo Switch OLED 64GB" and description ""
    When the value estimator scores the listing at price 300 condition "excellent" category "video games"
    Then the result tags should contain "nintendo"
    And a listing with title "Vintage Pyrex Mixing Bowl" and description ""
    When the value estimator scores the listing at price 30 condition "good" category "collectibles"
    Then the result tags should contain "vintage"

  # =====================================================================
  # Story 13.6: Demand Velocity Integration into Tier 1 Score
  # AC #1: Demand multiplier applied (rising=1.15, stable=1.0, declining=0.85, low_liquidity=0.70)
  # AC #2: Graceful fallback — null demand → multiplier 1.0, "demand_unknown" tag
  # AC #3: Days-to-sell penalty (>30 → -5, >60 → -10, not cumulative)
  # AC #4: Score clamped 0-100 after all adjustments
  # AC #5: UI demand badge displayed as a pill next to score
  # =====================================================================

  # S-019: Rising demand boosts underpriced items (AC #1)
  @E-013-S-019 @FR-SCORE-28 @story-13-6
  Scenario: Rising demand boosts score for items priced below market value
    Given a value score of 70 with demand trend "rising" and discount percent 30
    When demand velocity adjustment is applied
    Then the adjusted score should be 81
    And the adjusted score should be greater than 70

  # S-020: Declining demand penalizes score (AC #1)
  @E-013-S-020 @FR-SCORE-28 @story-13-6
  Scenario: Declining demand penalizes the value score
    Given a value score of 70 with demand trend "declining" and discount percent 30
    When demand velocity adjustment is applied
    Then the adjusted score should be 60
    And the adjusted score should be less than 70

  # S-021: Low liquidity applies aggressive penalty (AC #1)
  @E-013-S-021 @FR-SCORE-28 @story-13-6
  Scenario: Low liquidity items receive aggressive score penalty
    Given a value score of 70 with demand trend "low_liquidity" and discount percent 30
    When demand velocity adjustment is applied
    Then the adjusted score should be 49

  # S-022: Rising demand does NOT boost overpriced items (AC #1 guard)
  @E-013-S-022 @FR-SCORE-28 @story-13-6
  Scenario: Rising demand does not boost score when item is overpriced
    Given a value score of 70 with demand trend "rising" and discount percent -10
    When demand velocity adjustment is applied
    Then the adjusted score should be 70

  # S-023: LLM demandLevel fallback (AC #1 priority)
  @E-013-S-023 @FR-SCORE-28 @story-13-6
  Scenario: LLM demandLevel fallback applies correct multipliers
    Given a value score of 70 with demand trend "very_high" and discount percent 30
    When demand velocity adjustment is applied
    Then the adjusted score should be 81
    Given a value score of 70 with demand trend "high" and discount percent 30
    When demand velocity adjustment is applied
    Then the adjusted score should be 74

  # S-024: Null demand defaults to 1.0 and adds demand_unknown tag (AC #2)
  @E-013-S-024 @FR-SCORE-28 @story-13-6
  Scenario: Missing demand data defaults to no adjustment with demand_unknown tag
    Given a value score of 70 with no demand data and discount percent 30
    When demand velocity adjustment is applied via the pipeline enrichment
    Then the adjusted score should be 70
    And the listing tags should contain "demand_unknown"

  # S-025: Days-to-sell >30 penalty (AC #3)
  @E-013-S-025 @FR-SCORE-28 @story-13-6
  Scenario: Items expected to sell in over 30 days receive a 5-point penalty
    Given a value score of 70 with demand trend "stable" and expected days to sell 45
    When demand velocity adjustment is applied
    Then the adjusted score should be 65

  # S-026: Days-to-sell >60 penalty is not cumulative (AC #3)
  @E-013-S-026 @FR-SCORE-28 @story-13-6
  Scenario: Items expected to sell in over 60 days receive 10 penalty not 15
    Given a value score of 70 with demand trend "stable" and expected days to sell 90
    When demand velocity adjustment is applied
    Then the adjusted score should be 60

  # S-027: Score clamped to 0-100 (AC #4)
  @E-013-S-027 @FR-SCORE-28 @story-13-6
  Scenario: Demand adjustments do not push score outside 0-100 range
    Given a value score of 99 with demand trend "rising" and discount percent 50
    When demand velocity adjustment is applied
    Then the adjusted score should be at most 100
    Given a value score of 5 with demand trend "low_liquidity" and expected days to sell 90
    When demand velocity adjustment is applied
    Then the adjusted score should be at least 0

  # S-028: UI demand badge rendered on listing card (AC #5)
  @E-013-S-028 @FR-SCORE-28 @story-13-6
  Scenario: Demand badge maps correctly for all demand trend types
    Given the value-estimator module at "src/lib/value-estimator.ts"
    When I inspect the getDemandBadge function
    Then "rising" should map to badge label "Hot"
    And "stable" should map to badge label "Steady"
    And "declining" should map to badge label "Slow"
    And "low_liquidity" should map to badge label "Dead"
    And "very_high" should map to badge label "Hot"
    And "high" should map to badge label "Active"

  # S-029: UI demand badge component exists in KanbanBoard (AC #5)
  @E-013-S-029 @FR-SCORE-28 @story-13-6
  Scenario: KanbanBoard renders demand badge pill next to score
    Given the KanbanBoard component source at "src/components/KanbanBoard.tsx"
    When I inspect the demand badge rendering
    Then the component should render a demand badge element with testid "demand-badge"
    And the Listing interface should include "demandLevel"

  # =====================================================================
  # Story 13.4: Weighted Scoring — Margin Percentage + Absolute Profit
  # AC #1: Weighted formula: marginScore*0.4 + absoluteProfitScore*0.6
  # AC #2: Low-value caps: <$15 profit → max 40, $0 → max 15, negative → max 10
  # AC #3: High-value boosts: >$100 → +5, >$300 → +10 (exclusive, not cumulative)
  # AC #4: Backward compatibility — valueScore remains 0-100 integer
  # AC #5: Score distribution improves (fewer items clustered at extremes)
  # =====================================================================

  # S-030: Weighted formula combines margin and absolute profit (AC #1)
  @E-013-S-030 @FR-SCORE-26 @story-13-4
  Scenario: Value score uses weighted formula with 40% margin + 60% absolute profit
    Given the value-estimator source file at "src/lib/value-estimator.ts"
    When I inspect the estimateValue function scoring logic
    Then the formula should compute marginScore from profitMargin
    And the formula should compute absoluteProfitScore using a logarithmic curve
    And the final weighted score should use 0.4 weight for margin and 0.6 for absolute profit

  # S-031: Negative profit capped at score 10 (AC #2)
  @E-013-S-031 @FR-SCORE-26 @story-13-4
  Scenario: Items with negative profit are capped at score 10
    Given a listing with title "Broken item" and description "For parts only, not working"
    When the value estimator scores the listing at price 1000 condition "poor" category "electronics"
    Then the profit potential should be negative
    And the value score should be at most 10

  # S-032: Zero profit capped at score 15 (AC #2)
  @E-013-S-032 @FR-SCORE-26 @story-13-4
  Scenario: Items with zero profit are capped at score 15
    Given a listing with title "Generic item" and description ""
    When the value estimator scores the listing at price 10 condition "good" category "default" with fee rate 0
    Then the profit potential should be 0
    And the value score should be at most 15

  # S-033: Low profit (<$15) capped at score 40 (AC #2)
  @E-013-S-033 @FR-SCORE-26 @story-13-4
  Scenario: Items with less than 15 dollars profit are capped at score 40
    Given a listing with title "Generic item" and description ""
    When the value estimator scores the listing at price 30 condition "new" category "default" with fee rate 0
    Then the profit potential should be less than 15
    And the value score should be at most 40

  # S-034: High-value boost +5 for >$100 profit (AC #3)
  @E-013-S-034 @FR-SCORE-26 @story-13-4
  Scenario: Items with over 100 dollars profit receive a 5 point boost
    Given a listing with title "Apple MacBook Pro" and description ""
    When the value estimator scores the listing at price 300 condition "good" category "electronics"
    Then the profit potential should be greater than 100
    And the value score should reflect the high-value boost

  # S-035: High-value boost +10 for >$300 profit, exclusive not cumulative (AC #3)
  @E-013-S-035 @FR-SCORE-26 @story-13-4
  Scenario: Items with over 300 dollars profit receive 10 point boost not 15
    Given a listing with title "Vintage Rare Limited Edition sealed" and description ""
    When the value estimator scores the listing at price 100 condition "new" category "collectibles"
    Then the profit potential should be greater than 300
    And the value score should be at most 100

  # S-036: valueScore remains integer 0-100 (AC #4)
  @E-013-S-036 @FR-SCORE-26 @story-13-4
  Scenario: Value score output remains an integer between 0 and 100
    Given a listing with title "iPhone 12 Pro" and description "Excellent condition Apple phone"
    When the value estimator scores the listing at price 200 condition "excellent" category "electronics"
    Then the value score should be an integer between 0 and 100

  # S-037: Score distribution shows improved spread (AC #5)
  @E-013-S-037 @FR-SCORE-26 @story-13-4
  Scenario: Score distribution across diverse items populates at least 3 score buckets
    Given a diverse set of 20 listings spanning multiple categories and price ranges
    When the value estimator scores all listings
    Then scores should populate at least 3 of the 5 score buckets 0-20 21-40 41-60 61-80 81-100

  # S-038: High-absolute-profit beats high-margin-low-profit (AC #1 behavior)
  @E-013-S-038 @FR-SCORE-26 @story-13-4
  Scenario: A 300 dollar item with 150 dollar profit scores higher than a 5 dollar item with high margin
    Given a listing with title "Apple MacBook Pro" and description "" at price 300
    And a listing with title "Generic cable" and description "" at price 5
    When both listings are scored with condition "good" and category "electronics"
    Then the high-profit listing should score higher than the high-margin listing

  # =====================================================================
  # Story 13.3: Cache Invalidation on Price Changes
  # AC #1: Price delta >15% triggers full cache invalidation + fresh analysis
  # AC #2: L1 cache eviction on price delta detection
  # AC #3: Stale analysis marker displayed in UI (5-15% change)
  # AC #4: analyzedAtPrice stored with cache entries
  # AC #5: Unchanged prices (±5%) continue to use cached analysis
  # =====================================================================

  # S-039: Price unchanged (within 5%) uses cached analysis (AC #5)
  @E-013-S-039 @FR-SCORE-25 @story-13-3
  Scenario: Cache hit when price changes less than 5%
    Given a cached AI analysis for listing "listing-stable" at price 200
    When the listing is re-checked with current price 205
    Then the cached analysis should be returned
    And the stale analysis flag should be false

  # S-040: Price change >15% triggers full invalidation (AC #1)
  @E-013-S-040 @FR-SCORE-25 @story-13-3
  Scenario: Full cache invalidation when price drops more than 15%
    Given a cached AI analysis for listing "listing-price-drop" at price 200
    When the listing is re-checked with current price 160
    Then no cached analysis should be returned
    And the stale analysis flag should be false

  # S-041: Price change 5-15% returns cached with stale flag (AC #3)
  @E-013-S-041 @FR-SCORE-25 @story-13-3
  Scenario: Stale flag when price changes between 5% and 15%
    Given a cached AI analysis for listing "listing-stale" at price 200
    When the listing is re-checked with current price 220
    Then the cached analysis should be returned
    And the stale analysis flag should be true

  # S-042: Null analyzedAtPrice (legacy entry) treated as expired (AC #4)
  @E-013-S-042 @FR-SCORE-25 @story-13-3
  Scenario: Legacy cache entry with null analyzedAtPrice is treated as expired
    Given a cached AI analysis for listing "listing-legacy" with null analyzedAtPrice
    When the listing is re-checked with current price 200
    Then no cached analysis should be returned

  # S-043: Zero analyzedAtPrice always invalidates (AC #1)
  @E-013-S-043 @FR-SCORE-25 @story-13-3
  Scenario: Cache entry with zero analyzedAtPrice always invalidates
    Given a cached AI analysis for listing "listing-free" at price 0
    When the listing is re-checked with current price 50
    Then no cached analysis should be returned

  # S-044: analyzedAtPrice is stored when caching analysis (AC #4)
  @E-013-S-044 @FR-SCORE-25 @story-13-3
  Scenario: Cache write includes analyzedAtPrice
    Given a fresh AI analysis is cached for listing "listing-new" at price 300
    Then the cache entry should have analyzedAtPrice set to 300

  # S-045: Background refresh deduplication prevents concurrent storms (AC #2)
  @E-013-S-045 @FR-SCORE-25 @story-13-3
  Scenario: Deduplication lock prevents concurrent refresh storms
    Given listing "listing-dedup" is marked as refreshing
    When another refresh is attempted for listing "listing-dedup"
    Then the refresh should be skipped because it is already in progress

  # =====================================================================
  # Story 13.8: Cross-Platform Price Intelligence Agent
  # AC #1: Multi-platform search — queries 2+ platforms for comps
  # AC #2: Weighted aggregation — sold 2x vs active 1x, IQR per platform
  # AC #3: Confidence scoring — high/medium/low based on comp count + diversity
  # AC #4: Tier 1 score override — verified value replaces multiplier estimate
  # AC #5: Second-pass rescue — items below threshold with 40%+ verified discount promoted
  # AC #6: Platform-specific fee adjustment — normalized net values
  # AC #7: Caching — PriceHistory with 24h sold / 6h active TTL
  # AC #8: Performance budget — 30s total, partial data on individual failures
  # =====================================================================

  # S-046: Multi-platform search returns data from 2+ platforms (AC #1)
  @E-013-S-046 @FR-SCORE-30 @story-13-8
  Scenario: Cross-platform search queries multiple platforms and aggregates results
    Given eBay sold prices of [100, 110, 120, 130, 140] for "DeWalt Drill"
    And Mercari sold prices of [95, 105, 115] for "DeWalt Drill"
    When cross-platform price intelligence is fetched for "DeWalt Drill"
    Then the result should contain data from at least 2 platforms
    And total sold comps should be at least 5

  # S-047: Weighted aggregation weights sold 2x vs active 1x (AC #2)
  @E-013-S-047 @FR-SCORE-30 @story-13-8
  Scenario: Sold data is weighted 2x versus active listing data in aggregation
    Given eBay sold prices of [200] for "Fender Guitar"
    And Facebook active prices of [150] for "Fender Guitar"
    When cross-platform price intelligence is fetched for "Fender Guitar"
    Then the verified market value should be closer to the sold price than the active price

  # S-048: IQR filtering applied per-platform before aggregation (AC #2)
  @E-013-S-048 @FR-SCORE-30 @story-13-8
  Scenario: IQR outlier filtering removes extreme prices per platform
    Given eBay sold prices of [100, 105, 110, 115, 120, 5000] for "Test Item"
    When cross-platform price intelligence is fetched for "Test Item"
    Then the verified market value should be between 80 and 150

  # S-049: Confidence high for 10+ sold comps from 2+ platforms (AC #3)
  @E-013-S-049 @FR-SCORE-30 @story-13-8
  Scenario: High confidence when 10+ sold comparables from 2+ platforms
    Given eBay sold prices of [100, 110, 120, 130, 140, 105, 115] for "Popular Item"
    And Mercari sold prices of [95, 105, 115, 125] for "Popular Item"
    When cross-platform price intelligence is fetched for "Popular Item"
    Then the confidence level should be "high"

  # S-050: Confidence medium for 5+ comps from 1 platform (AC #3)
  @E-013-S-050 @FR-SCORE-30 @story-13-8
  Scenario: Medium confidence when 5+ sold comparables from 1 platform
    Given eBay sold prices of [100, 110, 120, 130, 140] for "Common Item"
    When cross-platform price intelligence is fetched for "Common Item"
    Then the confidence level should be "medium"

  # S-051: Confidence low for fewer than 5 comps (AC #3)
  @E-013-S-051 @FR-SCORE-30 @story-13-8
  Scenario: Low confidence when fewer than 5 sold comparables
    Given eBay sold prices of [100, 110] for "Rare Item"
    When cross-platform price intelligence is fetched for "Rare Item"
    Then the confidence level should be "low"

  # S-052: Tier 1 override replaces multiplier with verified value (AC #4)
  @E-013-S-052 @FR-SCORE-30 @story-13-8
  Scenario: Verified market value overrides Tier 1 algorithmic score
    Given an item "Fender Stratocaster" at asking price 300 with Tier 1 score 10
    And cross-platform verified market value of 600 with confidence "high"
    When the price intelligence override is applied
    Then the overridden score should be greater than 70
    And the override flag should be true

  # S-053: Low confidence does not override Tier 1 score (AC #4)
  @E-013-S-053 @FR-SCORE-30 @story-13-8
  Scenario: Low confidence data does not override algorithmic score
    Given an item "Unknown Widget" at asking price 100 with Tier 1 score 50
    And cross-platform verified market value of 500 with confidence "low"
    When the price intelligence override is applied
    Then the score should remain 50
    And the override flag should be false

  # S-054: Second-pass rescue promotes undervalued items (AC #5)
  @E-013-S-054 @FR-SCORE-30 @story-13-8
  Scenario: Item below threshold is rescued when verified discount exceeds 40%
    Given an item at asking price 300 with verified market value 600
    When the rescue check is applied with threshold 40
    Then the item should be rescued
    And the rescue tag "rescued_by_market_data" should be present

  # S-055: Second-pass does not rescue items with insufficient discount (AC #5)
  @E-013-S-055 @FR-SCORE-30 @story-13-8
  Scenario: Item is not rescued when verified discount is below 40%
    Given an item at asking price 400 with verified market value 600
    When the rescue check is applied with threshold 40
    Then the item should not be rescued

  # S-056: Platform fees normalized correctly across all platforms (AC #6)
  @E-013-S-056 @FR-SCORE-30 @story-13-8
  Scenario: Platform-specific fee rates produce correct net prices
    Given raw prices of [100] on each platform
    When platform fee normalization is applied
    Then eBay net price should be 87
    And Mercari net price should be 90
    And Facebook net price should be 95
    And OfferUp net price should be 87
    And Craigslist net price should be 100

  # S-057: Cache returns stored data without re-fetching (AC #7)
  @E-013-S-057 @FR-SCORE-30 @story-13-8
  Scenario: Cached price data is returned without calling platform fetchers
    Given cached eBay sold prices of [200, 210, 220, 230, 240] for "Cached Item"
    When cross-platform price intelligence is fetched for "Cached Item"
    Then the result should use cached data
    And no platform fetchers should be invoked

  # S-058: Individual platform failure does not block result (AC #8)
  @E-013-S-058 @FR-SCORE-30 @story-13-8
  Scenario: Single platform failure returns partial results gracefully
    Given eBay sold prices of [100, 110, 120] for "Resilient Item"
    And Mercari fetcher throws an error
    When cross-platform price intelligence is fetched for "Resilient Item"
    Then the result should still contain eBay data
    And the result should not be null
