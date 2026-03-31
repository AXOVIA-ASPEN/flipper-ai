# Epic 5: Advanced Market Intelligence
# Story 5.1 scenarios start at @E-005-S-1.
# When Stories 5.2-5.5 are implemented, append their scenarios sequentially.
@epic-5
Feature: Advanced Market Intelligence
  As a user
  I want Claude Sonnet Tier 2 structural analysis of marketplace listings
  So that I get deeper insight into build quality, market positioning, and resale potential

  # =====================================================================
  # Story 5.1: Claude Sonnet Structural Analysis
  # AC #1: Tier 2 structural analysis performed after Tier 1 identification
  # AC #2: Claude results supplement Tier 1; stored on Listing record
  # AC #3: Graceful degradation when Claude API is unavailable
  # =====================================================================

  # S-1: enrichOpportunitiesWithClaudeTier2 exists and calls analyzeListingData
  @E-005-S-1 @FR-SCORE-16 @story-5-1
  Scenario: marketplace-scanner exports enrichOpportunitiesWithClaudeTier2 and enriches listings
    Given the marketplace-scanner source at "src/lib/marketplace-scanner.ts"
    When I inspect the claude-analyzer exported functions
    Then "enrichOpportunitiesWithClaudeTier2" is exported as a function
    And it imports "analyzeListingData" from the claude-analyzer module
    And the AnalyzedListing interface has an optional "claudeAnalysis" field

  # S-2: formatForStorage persists claudeAnalysis confidence/reasoning with Claude taking priority
  @E-005-S-2 @FR-SCORE-16 @story-5-1
  Scenario: formatForStorage stores analysisConfidence and analysisReasoning from Claude with priority over Tier 1
    Given the marketplace-scanner source at "src/lib/marketplace-scanner.ts"
    When I inspect the "formatForStorage" function
    Then "analysisConfidence" is populated from claudeAnalysis with fallback to sellabilityAnalysis
    And "analysisReasoning" is populated from claudeAnalysis with fallback to sellabilityAnalysis

  # S-3: All 5 scraper routes wire Tier 2 and write AiAnalysisCache
  @E-005-S-3 @FR-SCORE-16 @story-5-1
  Scenario: All scraper routes wire Claude Tier 2 and cache results in AiAnalysisCache
    Given the eBay scraper route at "app/api/scraper/ebay/route.ts"
    When I inspect the scraper POST handlers
    Then the eBay route calls "enrichOpportunitiesWithClaudeTier2"
    And the eBay route writes to "aiAnalysisCache" after saving each listing
    And the Craigslist route at "app/api/scraper/craigslist/route.ts" calls "enrichOpportunitiesWithClaudeTier2"
    And the Facebook route at "app/api/scraper/facebook/route.ts" calls "enrichOpportunitiesWithClaudeTier2"
    And the Mercari route at "app/api/scraper/mercari/route.ts" calls "enrichOpportunitiesWithClaudeTier2"
    And the OfferUp route at "app/api/scraper/offerup/route.ts" calls "enrichOpportunitiesWithClaudeTier2"

  # =====================================================================
  # Story 5.4: Item Completeness & Seller Reputation Analysis
  # AC #1: Vision-based completeness analysis with GPT-4o; completenessLabel stored
  # AC #2: Completeness label displayed in the opportunities listing detail
  # AC #3: Seller rating captured and stored for eBay and Mercari
  # AC #4: Low seller rating escalates authenticityRisk to 'high'
  # AC #5: Platforms without seller data (Craigslist, FB, OfferUp) skipped gracefully
  # =====================================================================

  # S-4: analyzeItemCompleteness exported from item-completeness-analyzer, uses gpt-4o Vision
  @E-005-S-4 @FR-SCORE-19 @story-5-4
  Scenario: item-completeness-analyzer exports analyzeItemCompleteness using GPT-4o Vision
    Given the item-completeness-analyzer module at "src/lib/item-completeness-analyzer.ts"
    When I inspect the completeness analyzer exports
    Then "analyzeItemCompleteness" is exported as a function
    And "CompletenessAnalysisResult" is exported as an interface
    And it uses the "gpt-4o" model for Vision analysis
    And it returns null immediately for empty imageUrls

  # S-5: completenessLabel displayed on opportunities page (AC #2)
  @E-005-S-5 @FR-SCORE-19 @story-5-4
  Scenario: Opportunities page displays completeness label in listing detail
    Given the opportunities page at "app/opportunities/page.tsx"
    When I inspect the Listing interface and completeness display
    Then the Listing interface includes "completenessLabel" as a nullable string
    And the page renders completenessLabel in the market details section

  # S-6: seller-reputation-analyzer exported with EBAY and MERCARI thresholds (AC #3)
  @E-005-S-6 @FR-SCORE-20 @story-5-4
  Scenario: seller-reputation-analyzer exports reputation analysis with platform thresholds
    Given the seller-reputation-analyzer module at "src/lib/seller-reputation-analyzer.ts"
    When I inspect the seller reputation analyzer exports
    Then "analyzeSellerReputation" is exported as a function
    And "SellerReputationResult" is exported as an interface
    And it defines a reputation threshold for "EBAY"
    And it defines a reputation threshold for "MERCARI"

  # S-7: enrichWithCompletenessAndReputation escalates authenticityRisk on low seller rating (AC #4)
  @E-005-S-7 @FR-SCORE-20 @story-5-4
  Scenario: enrichWithCompletenessAndReputation escalates authenticityRisk for low-rated sellers
    Given the completeness and reputation pipeline in "src/lib/marketplace-scanner.ts"
    When I inspect the enrichWithCompletenessAndReputation function
    Then "enrichWithCompletenessAndReputation" is exported as a function
    And it imports "analyzeSellerReputation" from the seller-reputation-analyzer
    And it escalates authenticityRisk to "high" when riskEscalation is true

  # S-8: CRAIGSLIST, FACEBOOK_MARKETPLACE, OFFERUP are skipped gracefully (AC #5)
  @E-005-S-8 @FR-SCORE-20 @story-5-4
  Scenario: Seller analysis skipped gracefully for platforms without rating data
    Given the seller-reputation-analyzer module at "src/lib/seller-reputation-analyzer.ts"
    When I inspect the skip platforms configuration
    Then "CRAIGSLIST" is listed as a skip platform
    And "FACEBOOK_MARKETPLACE" is listed as a skip platform
    And "OFFERUP" is listed as a skip platform

  # =====================================================================
  # Story 5.2: Comparable Sold Item Matching
  # AC #1: Uses LLM search query + brand/model filter (not just keyword overlap)
  # AC #2: Each comp shows title, sold price, sold date, condition, and platform
  # AC #3: Fewer than 3 matches → low-confidence warning shown to user
  # AC #4: No comps → "insufficient market data" flag, relies on algorithmic scoring
  # =====================================================================

  # S-9: comp-matcher exports filterByBrandModel and findComparableSales (AC #1)
  @E-005-S-9 @FR-SCORE-17 @story-5-2
  Scenario: comp-matcher exports brand/model filtering and comparable sales lookup
    Given the comp-matcher module at "src/lib/comp-matcher.ts"
    When I inspect the comp-matcher exports
    Then "findComparableSales" is exported as a function
    And "filterByBrandModel" is exported as a function
    And it imports "fetchMarketPrice" from the market-price module

  # S-10: CompMatchResult contains ComparableSale with required display fields (AC #2)
  @E-005-S-10 @FR-SCORE-17 @story-5-2
  Scenario: CompMatchResult contains ComparableSale with all required display fields
    Given the comp-matcher module at "src/lib/comp-matcher.ts"
    When I inspect the comp-matcher type definitions
    Then "CompMatchResult" is exported as an interface
    And "ComparableSale" is exported as an interface
    And the "ComparableSale" interface includes the "soldPrice" field
    And the "ComparableSale" interface includes the "soldDate" field
    And the "ComparableSale" interface includes the "platform" field

  # S-11: calcConfidence returns low for fewer than 3 comps (AC #3)
  @E-005-S-11 @FR-SCORE-17 @story-5-2
  Scenario: Low confidence indicated when fewer than 3 comparable sales found
    Given the comp-matcher module at "src/lib/comp-matcher.ts"
    When I inspect the comp-matcher exports
    Then "calcConfidence" is exported as a function
    And the opportunities page at "app/opportunities/page.tsx" renders a confidence badge for comparable sales

  # S-12: Insufficient data flag when no comps found (AC #4)
  @E-005-S-12 @FR-SCORE-17 @story-5-2
  Scenario: Insufficient market data flag when no comparable sales found
    Given the comp-matcher module at "src/lib/comp-matcher.ts"
    When I inspect the comp-matcher type definitions
    Then "CompMatchResult" includes an "insufficientData" boolean field
    And the opportunities page at "app/opportunities/page.tsx" shows an insufficient data state

  # =====================================================================
  # Story 5.3: Sold Volume & Demand Trend Analysis
  # AC #1: Volume counting in 30/60/90-day windows via SoldListing.soldDate
  # AC #2: Demand trend classified as rising / stable / declining
  # AC #3: UI displays demand summary on opportunities and dashboard pages
  # AC #4: Zero 90-day sales flags as low_liquidity; risk warning shown
  # =====================================================================

  # S-13: Volume counting across cumulative windows (AC #1)
  @E-005-S-13 @FR-SCORE-18 @story-5-3
  Scenario: Volume analysis counts sold items across cumulative time windows
    Given the demand-analyzer module at "src/lib/demand-analyzer.ts"
    When demand analysis runs with 8 sales in last 30 days, 3 in days 31-60, and 2 in days 61-90
    Then soldVolume30Days is 8
    And soldVolume60Days is 11
    And soldVolume90Days is 13

  # S-14: Rising demand classification (AC #2)
  @E-005-S-14 @FR-SCORE-18 @story-5-3
  Scenario: Rising demand classified when 30-day rate exceeds 60-day average by more than 10%
    Given the demand-analyzer module at "src/lib/demand-analyzer.ts"
    When demand analysis runs with 20 sales in last 30 days and 5 in days 31-60
    Then the demand trend is "rising"
    And the item is not flagged as low liquidity

  # S-15: Declining demand classification (AC #2)
  @E-005-S-15 @FR-SCORE-18 @story-5-3
  Scenario: Declining demand classified when 30-day rate trails 60-day average by more than 10%
    Given the demand-analyzer module at "src/lib/demand-analyzer.ts"
    When demand analysis runs with 3 sales in last 30 days and 15 in days 31-60
    Then the demand trend is "declining"
    And the item is not flagged as low liquidity

  # S-16: Low liquidity flag (AC #4 — computation)
  @E-005-S-16 @FR-SCORE-18 @story-5-3
  Scenario: Zero sales in 90 days flags item as low_liquidity with isLowLiquidity true
    Given the demand-analyzer module at "src/lib/demand-analyzer.ts"
    When demand analysis runs on an item with no sold listings in the past 90 days
    Then the demand trend is "low_liquidity"
    And the item is flagged as low liquidity

  # S-17: UI display of demand data and low-liquidity warning (AC #3 + AC #4 UI)
  @E-005-S-17 @FR-SCORE-18 @story-5-3
  Scenario: Opportunities page displays demand level, sold volumes, and low-liquidity warning
    Given the opportunities page at "app/opportunities/page.tsx"
    When I inspect the demand display implementation
    Then the Listing interface includes "soldVolume30Days" as a nullable number
    And the Listing interface includes "soldVolume60Days" as a nullable number
    And the Listing interface includes "soldVolume90Days" as a nullable number
    And the page renders demand level information in the market details section
    And the page shows a low-liquidity warning element

  # =====================================================================
  # Story 5.5: Logistics & Shipping Cost Analysis
  # AC #1: classifyItemLogistics uses GPT-4o-mini; falls back to category defaults
  # AC #2: estimateShippingCosts uses Shippo; gracefully returns null if unconfigured
  # AC #3: calculateDistance uses Geoapify; gracefully returns null if unconfigured
  # AC #4: analyzeLogistics orchestrates all three; never throws
  # AC #5: enrichWithLogisticsAnalysis wired in all 5 scraper routes
  # AC #6: UI displays logistics data on opportunities and dashboard pages
  # =====================================================================

  # S-18: logistics-classifier uses GPT-4o-mini with category fallback (AC #1)
  @E-005-S-18 @FR-SCORE-21 @story-5-5
  Scenario: logistics-classifier uses GPT-4o-mini and falls back to category defaults
    Given the logistics-classifier module at "src/lib/logistics-classifier.ts"
    When I inspect the logistics classifier exports
    Then "classifyItemLogistics" is exported as a function
    And "LogisticsClassification" is exported as an interface
    And it uses the "gpt-4o-mini" model for logistics classification
    And it defines a CATEGORY_SIZE_DEFAULTS fallback map

  # S-19: shipping-estimator uses Shippo SDK; graceful degradation (AC #2)
  @E-005-S-19 @FR-SCORE-22 @story-5-5
  Scenario: shipping-estimator uses Shippo SDK and returns null when unconfigured
    Given the shipping-estimator module at "src/lib/shipping-estimator.ts"
    When I inspect the shipping estimator exports
    Then "estimateShippingCosts" is exported as a function
    And "ShippingEstimates" is exported as an interface
    And it imports "Shippo" from the shippo package
    And it returns null gracefully when SHIPPO_API_TOKEN is not set

  # S-20: distance-calculator uses Geoapify geocoding + Haversine (AC #3)
  @E-005-S-20 @FR-SCORE-21 @story-5-5
  Scenario: distance-calculator uses Geoapify geocoding with in-memory cache
    Given the distance-calculator module at "src/lib/distance-calculator.ts"
    When I inspect the distance calculator exports
    Then "calculateDistance" is exported as a function
    And "DistanceResult" is exported as an interface
    And "clearGeocodeCache" is exported as a function
    And it uses the Geoapify geocoding API
    And it returns null gracefully when GEOAPIFY_API_KEY is not set

  # S-21: logistics-analyzer orchestrates all three modules; never throws (AC #4)
  @E-005-S-21 @FR-SCORE-21 @FR-SCORE-22 @story-5-5
  Scenario: logistics-analyzer orchestrates classification, shipping, and distance
    Given the logistics-analyzer module at "src/lib/logistics-analyzer.ts"
    When I inspect the logistics analyzer exports
    Then "analyzeLogistics" is exported as a function
    And "LogisticsAnalysisResult" is exported as an interface
    And it imports "classifyItemLogistics" from the logistics-classifier
    And it imports "estimateShippingCosts" from the shipping-estimator
    And it imports "calculateDistance" from the distance-calculator
    And it has a safe default fallback that never throws

  # S-22: enrichWithLogisticsAnalysis wired in all 5 scraper routes (AC #5)
  @E-005-S-22 @FR-SCORE-21 @story-5-5
  Scenario: All scraper routes call logistics analysis and persist results
    Given the eBay scraper route at "app/api/scraper/ebay/route.ts"
    When I inspect the logistics wiring in scraper routes
    Then the eBay route calls "enrichWithLogisticsAnalysis"
    And the Craigslist route at "app/api/scraper/craigslist/route.ts" calls "analyzeLogistics"
    And the Facebook route at "app/api/scraper/facebook/route.ts" calls "analyzeLogistics"
    And the Mercari route at "app/api/scraper/mercari/route.ts" calls "analyzeLogistics"
    And the OfferUp route at "app/api/scraper/offerup/route.ts" calls "analyzeLogistics"

  # S-23: UI displays logistics data and outside-pickup-radius warning (AC #6)
  @E-005-S-23 @FR-SCORE-21 @FR-SCORE-22 @story-5-5
  Scenario: Opportunities page displays logistics data and outside-pickup-radius warning
    Given the opportunities page at "app/opportunities/page.tsx"
    When I inspect the logistics display implementation
    Then the Listing interface includes "sizeCategory" as a nullable string
    And the Listing interface includes "outsidePickupRadius" as a nullable boolean
    And the page renders a size category row in the market details section
    And the page shows an outside-pickup-radius warning element
