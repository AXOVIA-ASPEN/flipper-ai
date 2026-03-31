@epic-4
Feature: AI Scoring, Deal Evaluation & Verified Market Price
  As a user
  I want accurate deal evaluation with verified market prices
  So that I can make confident buying decisions based on real sold data

  # =====================================================================
  # Story 4.2: Platform-Specific Fees & Opportunity Threshold
  # AC #1: Platform fees applied to profit calculation
  # AC #2: Fee rates editable via Settings API
  # AC #3: Opportunity status set when score >= threshold
  # AC #4: Threshold configurable via Settings (default 70)
  # AC #5: Listing stays NEW when score < threshold
  # =====================================================================

  # S-8: marketplace-scanner exports getPlatformFeeRate and PLATFORM_FEE_DEFAULTS
  @E-004-S-008 @FR-SCORE-06 @story-4-2
  Scenario: marketplace-scanner exports getPlatformFeeRate helper and PLATFORM_FEE_DEFAULTS map
    Given the marketplace-scanner module at "src/lib/marketplace-scanner.ts"
    When I inspect the PATCH handler validation logic
    Then "getPlatformFeeRate" is exported as a function
    And "PLATFORM_FEE_DEFAULTS" is exported as a constant
    And the default fee rate for "EBAY" is 0.13
    And the default fee rate for "MERCARI" is 0.1
    And the default fee rate for "FACEBOOK_MARKETPLACE" is 0.05
    And the default fee rate for "OFFERUP" is 0.129
    And the default fee rate for "CRAIGSLIST" is 0.0

  # S-9: estimateValue accepts optional feeRate as 6th parameter
  @E-004-S-009 @FR-SCORE-06 @story-4-2
  Scenario: estimateValue accepts optional feeRate as sixth parameter and uses it in profit reasoning
    Given the value-estimator module at "src/lib/value-estimator.ts"
    When I inspect the estimateValue function signature
    Then it accepts an optional feeRate parameter as the sixth argument
    And when feeRate is 0.05 the profit reasoning mentions "5%"
    And when feeRate is 0.13 the profit reasoning mentions "13%"
    And when no feeRate is provided it defaults to 13% fee

  # S-10: Settings API validates and returns opportunityThreshold with schema support
  @E-004-S-010 @FR-SCORE-07 @story-4-2
  Scenario: Settings API validates opportunityThreshold and includes it in GET response and schema
    Given the user settings API route at "app/api/user/settings/route.ts"
    When I inspect the PATCH handler validation logic
    Then it validates opportunityThreshold must be an integer between 10 and 100
    And the GET handler returns opportunityThreshold in the response data
    And the UserSettings schema includes opportunityThreshold with default 70

  # S-11: OfferUp scraper uses getPlatformFeeRate and configurable opportunityThreshold
  @E-004-S-011 @FR-SCORE-06 @FR-SCORE-07 @story-4-2
  Scenario: OfferUp scraper uses getPlatformFeeRate and configurable opportunityThreshold
    Given the OfferUp scraper route file at "app/api/scraper/offerup/route.ts"
    When I inspect the OfferUp scraper POST handler
    Then it imports getPlatformFeeRate from marketplace-scanner
    And it extracts feeRate using getPlatformFeeRate with the OFFERUP platform
    And it extracts opportunityThreshold from userSettings with fallback to 70
    And the estimateValue call passes feeRate as the sixth argument

  # S-12: Listings below the opportunity threshold are not saved as OPPORTUNITY
  @E-004-S-012 @FR-SCORE-07 @story-4-2
  Scenario: Listings with value score below opportunityThreshold are skipped and not saved as OPPORTUNITY
    Given the OfferUp scraper route file at "app/api/scraper/offerup/route.ts"
    When I inspect the opportunity threshold guard logic
    Then it compares estimation.valueScore against opportunityThreshold not a hardcoded value
    And listings where valueScore is less than opportunityThreshold are not saved to the database
    And the Craigslist v2 route at "app/api/scraper/craigslist/route.v2.ts" uses opportunityThreshold for the same guard
    And the Facebook scraper route at "app/api/scraper/facebook/route.ts" uses opportunityThreshold for the same guard
    And the Mercari scraper route at "app/api/scraper/mercari/route.ts" uses opportunityThreshold for the same guard

  # =====================================================================
  # Story 4.4: Verified Market Price Lookup
  # AC #1-#2: lookupVerifiedMarketPrice exports and two-step DB+Playwright lookup
  # AC #3-#4: True discount calculation and UI surfacing
  # =====================================================================

  # S-16: market-value-calculator exports lookupVerifiedMarketPrice and VerifiedPriceLookupResult
  @E-004-S-016 @FR-SCORE-09 @story-4-4
  Scenario: market-value-calculator exports verified price lookup function and result type
    Given the market-value-calculator module at "src/lib/market-value-calculator.ts"
    When I inspect the market-value-calculator exported functions
    Then "lookupVerifiedMarketPrice" is exported as an async function
    And "VerifiedPriceLookupResult" is exported as an interface

  # S-17: Two-step lookup: DB first (calculateVerifiedMarketValue), Playwright fallback (fetchMarketPrice)
  @E-004-S-017 @FR-SCORE-09 @story-4-4
  Scenario: lookupVerifiedMarketPrice uses DB first then Playwright fallback
    Given the market-value-calculator module at "src/lib/market-value-calculator.ts"
    When I inspect the lookupVerifiedMarketPrice function body
    Then it calls calculateVerifiedMarketValue as the first lookup step
    And it calls fetchMarketPrice as the fallback when DB has insufficient data
    And it returns null for empty searchQuery
    And it returns null for askingPrice <= 0

  # S-18: marketplace-scanner exports enrichWithVerifiedMarketPrice
  @E-004-S-018 @FR-SCORE-09 @story-4-4
  Scenario: marketplace-scanner exports enrichWithVerifiedMarketPrice pipeline function
    Given the market-price-enrichment module is integrated in "src/lib/marketplace-scanner.ts"
    When I inspect the market-value-calculator exported functions
    Then "enrichWithVerifiedMarketPrice" is exported as an async function
    And the module imports lookupVerifiedMarketPrice from market-value-calculator
    And the module imports closeBrowser from market-price

  # S-19: formatForStorage maps all verified price fields to DB columns
  @E-004-S-019 @FR-SCORE-10 @story-4-4
  Scenario: formatForStorage maps verified price fields to database columns
    Given the market-price-enrichment module is integrated in "src/lib/marketplace-scanner.ts"
    When I inspect the market-value-calculator exported functions
    Then it maps verifiedMarketValue from verifiedPrice
    And it maps trueDiscountPercent from verifiedPrice
    And it maps marketDataSource from verifiedPrice
    And it maps marketDataDate from verifiedPrice
    And it maps comparableSalesJson from verifiedPrice

  # S-20: eBay scraper uses enrichWithVerifiedMarketPrice (centralized pipeline)
  @E-004-S-020 @FR-SCORE-09 @story-4-4
  Scenario: eBay scraper route uses enrichWithVerifiedMarketPrice from marketplace-scanner
    Given the market-price-enrichment module is integrated in "app/api/scraper/ebay/route.ts"
    When I inspect the Facebook scraper POST handler
    Then it imports enrichWithVerifiedMarketPrice from marketplace-scanner
    And it calls enrichWithVerifiedMarketPrice on the enriched opportunities array

  # S-21: Facebook scraper has inline lookupVerifiedMarketPrice + closeBrowser
  @E-004-S-021 @FR-SCORE-09 @story-4-4
  Scenario: Facebook scraper route has inline verified price lookup with browser cleanup
    Given the Facebook scraper route file at "app/api/scraper/facebook/route.ts"
    When I inspect the Facebook scraper POST handler
    Then it imports lookupVerifiedMarketPrice from market-value-calculator
    And it imports closeBrowser from market-price
    And it calls closeBrowser after the listings processing loop

  # S-22: Dashboard UI surfaces "Verified Value" when verifiedMarketValue is not null
  @E-004-S-022 @FR-SCORE-10 @story-4-4
  Scenario: Dashboard listing card shows Verified Value when verifiedMarketValue is available
    Given the dashboard page at "app/dashboard/page.tsx"
    When I inspect the Listing interface and value display
    Then the Listing interface includes verifiedMarketValue as nullable number
    And the Listing interface includes trueDiscountPercent as nullable number
    And the value card label shows "Verified Value" when verifiedMarketValue is not null

  # S-23: Opportunities page shows Verified Value with estimatedValue fallback
  @E-004-S-023 @FR-SCORE-10 @story-4-4
  Scenario: Opportunities page mini-stat card shows Verified Value with estimatedValue fallback
    Given the opportunities page at "app/opportunities/page.tsx"
    When I inspect the mini-stat card for market value
    Then it shows "Verified Value" label when verifiedMarketValue is not null
    And it displays verifiedMarketValue when available falling back to estimatedValue

  # =====================================================================
  # Story 4.5: LLM Sellability Assessment
  # AC #1: analyzeSellability accepts configurable discountThreshold
  # AC #2: All scraper routes read discountThreshold from userSettings
  # AC #3: Inline scrapers (FB, Mercari, OfferUp) run full LLM pipeline
  # AC #4: marketplace-scanner exports enrichWithSellabilityAnalysis
  # AC #5: formatForStorage maps all sellability fields
  # =====================================================================

  # S-24: buildAnalysisPrompt embeds discountThreshold and analyzeSellability accepts it as param
  @E-004-S-024 @FR-SCORE-11 @FR-SCORE-12 @story-4-5
  Scenario: analyzeSellability accepts configurable discountThreshold and embeds it in the prompt
    Given the llm-analyzer module at "src/lib/llm-analyzer.ts"
    When I inspect the analyzeSellability function signature
    Then it accepts discountThreshold as an optional 5th parameter
    And the buildAnalysisPrompt function embeds discountThreshold in the prompt text
    And the meetsThreshold field in the prompt uses the configured threshold not a hardcoded value

  # S-25: Craigslist reads discountThreshold from userSettings and passes it through
  @E-004-S-025 @FR-SCORE-12 @FR-SCORE-13 @story-4-5
  Scenario: Craigslist scraper reads discountThreshold from userSettings and uses it
    Given the Craigslist scraper route file at "app/api/scraper/craigslist/route.ts"
    When I inspect the Craigslist scraper POST handler
    Then it reads discountThreshold from userSettings with fallback to 50
    And it passes discountThreshold to the analyzeSellability call
    And it uses discountThreshold in the shouldSave threshold check

  # S-26: Facebook scraper imports and uses the LLM sellability pipeline
  @E-004-S-026 @FR-SCORE-11 @FR-SCORE-13 @story-4-5
  Scenario: Facebook scraper route imports analyzeSellability for LLM pipeline
    Given the scraper route file at "app/api/scraper/facebook/route.ts"
    When I inspect the route imports
    Then it imports "analyzeSellability" from "@/lib/llm-analyzer"
    And it imports "identifyItem" from "@/lib/llm-identifier"
    And it imports "quickDiscountCheck" from "@/lib/llm-analyzer"

  # S-27: marketplace-scanner formatForStorage maps all sellability analysis fields
  @E-004-S-027 @FR-SCORE-11 @FR-SCORE-12 @story-4-5
  Scenario: formatForStorage in marketplace-scanner maps all sellability analysis fields to DB columns
    Given the sellability module is integrated in "src/lib/marketplace-scanner.ts"
    When I inspect the route imports
    Then it maps sellabilityScore from sellabilityAnalysis
    And it maps demandLevel from sellabilityAnalysis
    And it maps expectedDaysToSell from sellabilityAnalysis
    And it maps authenticityRisk from sellabilityAnalysis
    And it maps recommendedOffer from sellabilityAnalysis
    And it maps resaleStrategy from sellabilityAnalysis
    And it maps analysisConfidence from sellabilityAnalysis
    And it maps analysisReasoning from sellabilityAnalysis

  # S-28: enrichWithSellabilityAnalysis exported from marketplace-scanner and used in eBay
  @E-004-S-028 @FR-SCORE-11 @FR-SCORE-13 @story-4-5
  Scenario: marketplace-scanner exports enrichWithSellabilityAnalysis and eBay uses it under hasLLM
    Given the sellability module is integrated in "src/lib/marketplace-scanner.ts"
    When I inspect the route imports
    Then "enrichWithSellabilityAnalysis" is exported as an async function
    And the eBay scraper route imports enrichWithSellabilityAnalysis from marketplace-scanner
    And the eBay scraper route calls enrichWithSellabilityAnalysis when LLM is active

  # =====================================================================
  # Story 4.6: AI Analysis Caching & Fallback
  # AC #1: Results stored in AiAnalysisCache with 24-hour TTL
  # AC #2: Cache hit returns without API call
  # AC #3: Expired cache triggers refresh
  # AC #4: All AI unavailable → algorithmic fallback with isAiFallback flag
  # AC #5: AI recovery → LLM analysis resumes automatically
  # =====================================================================

  # S-29: AiAnalysisCache schema has analysisType field and unique constraint
  @E-004-S-029 @FR-SCORE-14 @story-4-6
  Scenario: AiAnalysisCache schema supports analysisType with unique constraint per listing
    Given the Prisma schema at "prisma/schema.prisma"
    When I inspect the AiAnalysisCache model definition
    Then the AiAnalysisCache model has an "analysisType" field with default "claude"
    And it has a unique constraint on listingId and analysisType
    And claude-analyzer stores results with analysisType "claude"
    And llm-analyzer stores results with analysisType "openai"

  # S-30: /api/analyze/[listingId] route is fully implemented (not a 501 stub)
  @E-004-S-030 @FR-SCORE-14 @FR-SCORE-15 @story-4-6
  Scenario: analyze route returns real responses with cache and fallback support
    Given the analyze route file at "app/api/analyze/[listingId]/route.ts"
    When I inspect the GET handler implementation
    Then it does not return a 501 status code
    And it checks the L1 in-memory cache before calling the AI API
    And it includes "isAiFallback" in the response data shape
    And it returns source "cache-l1" on L1 hit
    And it returns source "ai" on successful AI call
    And it returns source "algorithmic" when AI throws and falls back

  # S-31: L1 in-memory cache is checked before DB and AI (cache hit path)
  @E-004-S-031 @FR-SCORE-14 @story-4-6
  Scenario: claude-analyzer implements two-tier cache with L1 in-memory and L2 database
    Given the claude-analyzer module at "src/lib/claude-analyzer.ts"
    When I inspect the getCachedAnalysis function
    Then it checks analysisCache.get before querying the database
    And it populates the L1 cache when a L2 database hit occurs
    And it uses the cache key prefix "claude:" for L1 entries
    And cacheAnalysis uses upsert with listingId_analysisType unique key

  # S-32: llm-analyzer implements L1 and L2 caching for OpenAI results
  @E-004-S-032 @FR-SCORE-14 @story-4-6
  Scenario: llm-analyzer exports getCachedSellabilityAnalysis and cacheSellabilityAnalysis helpers
    Given the llm-analyzer module at "src/lib/llm-analyzer.ts"
    When I inspect the module exports
    Then "getCachedSellabilityAnalysis" is exported as an async function
    And "cacheSellabilityAnalysis" is exported as an async function
    And getCachedSellabilityAnalysis uses cache key prefix "openai:"
    And cacheSellabilityAnalysis upserts with analysisType "openai"

  # S-33: All AI APIs unavailable triggers algorithmic fallback with isAiFallback: true
  @E-004-S-033 @FR-SCORE-15 @story-4-6
  Scenario: analyze route falls back to estimateValue when all AI APIs are unavailable
    Given the analyze route file at "app/api/analyze/[listingId]/route.ts"
    When I inspect the GET handler error handling
    Then it catches AI errors and calls estimateValue as fallback
    And it imports estimateValue from "@/lib/value-estimator"
    And the fallback response shape includes isAiFallback set to true
    And the fallback response shape includes source set to "algorithmic"
