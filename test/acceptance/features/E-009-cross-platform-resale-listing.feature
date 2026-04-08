@epic-9
Feature: Cross-Platform Resale Listing
  As a user
  I want AI-generated optimized titles and descriptions for resale listings
  So that my listings attract buyers and rank well in marketplace search

  # ── Story 9.1: AI Title & Description Generation ──────────────────────────

  # AC1: SEO-Optimized Title Generation (FR-RELIST-01)

  @FR-RELIST-01 @story-9-1 @E-009-S-1
  Scenario: Title generator produces an SEO-optimized eBay title with brand and model
    Given a purchased item with brand "Apple" model "iPhone 14" variant "256GB" condition "good"
    When the title generator runs for platform "ebay"
    Then the generated title is at most 80 characters
    And the generated title contains "Apple"
    And the generated title contains "iPhone 14"

  @FR-RELIST-01 @story-9-1 @E-009-S-2
  Scenario: eBay title respects the 80-character platform cap for long product names
    Given a purchased item with brand "Samsung" model "Galaxy S24 Ultra Titanium Black" variant "512GB Unlocked" condition "like_new"
    When the title generator runs for platform "ebay"
    Then the generated title is at most 80 characters

  # AC2: Platform-Specific Title Conventions (FR-RELIST-01)

  @FR-RELIST-01 @story-9-1 @E-009-S-3
  Scenario Outline: Each marketplace title respects its platform character cap
    Given a purchased item with brand "Sony" model "WH-1000XM5" variant "" condition "good"
    When the title generator runs for platform "<platform>"
    Then the generated title is at most <limit> characters

    Examples:
      | platform | limit |
      | ebay     | 80    |
      | mercari  | 40    |
      | facebook | 99    |
      | offerup  | 70    |

  # AC3: Platform-Specific Description Generation (FR-RELIST-02)

  @FR-RELIST-02 @story-9-1 @E-009-S-4
  Scenario: Description generator produces a non-empty eBay description with condition details
    Given a purchased item with brand "Apple" model "MacBook Pro" variant "M2 16GB" condition "like_new" and asking price 1200
    When the description generator runs for platform "ebay"
    Then the generated description is non-empty
    And the generated description mentions the condition

  @FR-RELIST-02 @story-9-1 @E-009-S-5
  Scenario: Facebook Marketplace description includes a local-pickup note
    Given a purchased item with brand "IKEA" model "Standing Desk" variant "" condition "good" and asking price 150
    When the description generator runs for platform "facebook"
    Then the generated description mentions "Local pickup"

  @FR-RELIST-02 @story-9-1 @E-009-S-6
  Scenario: Mercari description ships rather than offers local pickup
    Given a purchased item with brand "Nintendo" model "Switch OLED" variant "" condition "like_new" and asking price 250
    When the description generator runs for platform "mercari"
    Then the generated description mentions "Ships"

  # AC4: Algorithmic Fallback (FR-RELIST-07)

  @FR-RELIST-07 @story-9-1 @E-009-S-7
  Scenario: Title generator falls back to algorithmic when no API key is configured
    Given the OpenAI API key is not configured
    And a purchased item with brand "Bose" model "QuietComfort 45" variant "" condition "good"
    When the title generator runs for platform "ebay" using LLM mode
    Then a title is still produced

  @FR-RELIST-07 @story-9-1 @E-009-S-8
  Scenario: Description generator falls back to algorithmic when no API key is configured
    Given the OpenAI API key is not configured
    And a purchased item with brand "Bose" model "QuietComfort 45" variant "" condition "good" and asking price 180
    When the description generator runs for platform "ebay" using LLM mode
    Then a description is still produced

  # AC5: Editable Draft Display (FR-RELIST-01, FR-RELIST-02)

  @FR-RELIST-01 @FR-RELIST-02 @story-9-1 @E-009-S-9
  Scenario: Generated content is returned as editable string fields
    Given a purchased item with brand "Apple" model "iPad Pro" variant "11 inch" condition "good" and asking price 600
    When the title generator runs for platform "ebay"
    And the description generator runs for platform "ebay"
    Then both the title and description are mutable strings

  # API and route structural assertions

  @FR-RELIST-01 @FR-RELIST-02 @FR-RELIST-07 @story-9-1 @E-009-S-10
  Scenario: The generate-resale-content API route exists at the expected path
    Given the resale content generation API endpoint exists at "app/api/listings/[id]/generate-resale-content/route.ts"
    Then the resale content route returns the unified shape with titles, descriptions, primary, source, and warnings

  @FR-RELIST-01 @story-9-1 @E-009-S-11
  Scenario: The posting queue auto-generates title and description from listing data
    Given the posting queue route exists at "app/api/posting-queue/route.ts"
    Then the posting queue route imports the algorithmic title and description generators

  # ── Story 9.2: Optimal Listing Price Calculation ──────────────────────────

  # AC-1: Optimal price from verified market data (FR-RELIST-03)

  @FR-RELIST-03 @story-9-2 @E-009-S-12
  Scenario: Optimal price formula achieves the target margin after fees and shipping
    Given a purchased item with cost basis 50 and shipping cost 8
    When the optimal price calculator runs for platform "ebay" with target margin 30
    Then the recommended price equals 101.75
    And the estimated fees equal 13.23
    And the estimated profit equals 30.52

  @FR-RELIST-03 @story-9-2 @E-009-S-13
  Scenario: Recommended price is capped at 95% of verified market value
    Given a purchased item with cost basis 50 and shipping cost 8
    And verified market value 90 with comp confidence "high"
    When the optimal price calculator runs for platform "ebay" with target margin 30
    Then the recommended price equals 85.5
    And the result is flagged as capped by market

  # AC-2: Price breakdown display (FR-RELIST-03)

  @FR-RELIST-03 @story-9-2 @E-009-S-14
  Scenario: Multi-platform comparison sorts platforms by estimated profit
    Given a purchased item with cost basis 50 and shipping cost 8
    When the multi-platform price calculator runs with target margin 30
    Then five platform results are returned
    And the results are sorted by estimated profit descending
    And a best platform is recommended

  # AC-3: Real-time margin adjustment (FR-RELIST-03)

  @FR-RELIST-03 @story-9-2 @E-009-S-15
  Scenario: PriceCalculator client recalculation matches the server formula
    Given a purchased item with cost basis 50 and shipping cost 8
    When the PriceCalculator client recalculates for margin 25 on platform "ebay"
    Then the client recommended price equals the server formula price for margin 25

  # AC-4: Edge case handling (FR-RELIST-03)

  @FR-RELIST-03 @story-9-2 @E-009-S-16
  Scenario: Margin plus platform fee exceeding 100% throws a validation error
    Given a purchased item with cost basis 50 and shipping cost 8
    When the optimal price calculator runs for platform "ebay" with target margin 90
    Then a validation error is raised about margin plus fees

  @FR-RELIST-03 @story-9-2 @E-009-S-17
  Scenario: Free item ($0 cost basis) uses market-based pricing instead of cost-plus
    Given a free item with verified market value 100
    When the optimal price calculator runs for platform "ebay" with target margin 30
    Then the recommended price equals 73.95
    And the result is flagged as free-item pricing

  @FR-RELIST-03 @story-9-2 @E-009-S-18
  Scenario: Market cap forcing price below cost basis emits a loss warning
    Given a purchased item with cost basis 50 and shipping cost 8
    And verified market value 60 with comp confidence "high"
    When the optimal price calculator runs for platform "ebay" with target margin 30
    Then the result has loss warning true
    And the loss amount is greater than 0

  # AC-5: Pre-purchase price projection (FR-RELIST-03)

  @FR-RELIST-03 @story-9-2 @E-009-S-19
  Scenario: Pre-purchase listings use askingPrice as cost basis and label result as projected
    Given a listing with no opportunity and asking price 60 and shipping cost 8
    When the optimal price calculator runs for platform "ebay" with target margin 30
    Then the result is marked as projected
    And the cost basis equals 68

  # API route structural assertions

  @FR-RELIST-03 @story-9-2 @E-009-S-20
  Scenario: The optimal-price API route exists at the expected path
    Given the optimal price API endpoint exists at "app/api/listings/[id]/optimal-price/route.ts"
    Then the optimal price route exports GET and POST handlers
    And the optimal price route enforces priceHistory feature access
