Feature: AI Flippability Scoring
  As a flipper
  I want items automatically scored for flip potential
  So I can focus on the best opportunities

  Background:
    Given I am logged in
    And the AI scoring engine is initialized

  Scenario: Calculate flippability score for underpriced item
    Given an eBay listing:
      | Title           | iPhone 14 Pro - Like New |
      | Price           | $400                     |
      | Condition       | Excellent                |
      | Seller Location | Local (10 miles)         |
      | Category        | Electronics              |
    And the market value for "iPhone 14 Pro" is $850
    When the AI analyzer evaluates the listing
    Then the flippability score should be between 85 and 95
    And the confidence level should be "High"
    And the estimated profit should be calculated as:
      | Buy Price      | $400  |
      | Market Value   | $850  |
      | Fees (15%)     | $127  |
      | Net Profit     | $323  |

  Scenario: Penalize risky items
    Given a Craigslist listing:
      | Title       | MacBook Pro - needs battery replacement |
      | Price       | $200                                     |
      | Description | Battery doesn't hold charge, otherwise works |
    When the AI analyzer evaluates the listing
    Then the flippability score should be below 60
    And the risk factors should include "needs repair"
    And the difficulty rating should be "Medium" or "High"

  Scenario: Boost score for high-demand brands
    Given a Facebook Marketplace listing:
      | Title    | Dyson V15 Vacuum - Sealed NIB |
      | Price    | $350                          |
      | Condition| New in box                    |
    When the AI analyzer evaluates the listing
    Then the flippability score should be above 80
    And the analysis should show "Brand: Dyson (high-value)"
    And the analysis should show "Sealed/NIB (low risk)"

  Scenario: Price history comparison
    Given an item titled "Sony WH-1000XM5 Headphones"
    And eBay sold listings show:
      | Price | Date       | Condition |
      | $320  | 2 days ago | Like New  |
      | $310  | 5 days ago | Like New  |
      | $330  | 1 week ago | Like New  |
    When I view the flippability analysis
    Then I should see a price history chart
    And the average sold price should be displayed as "$320"
    And the recommended list price should be "$315-$325"

  Scenario: Detect non-shippable items
    Given a listing with description "Local pickup only - no shipping"
    And the seller is 150 miles away
    When the AI analyzer evaluates the listing
    Then the "shippable" flag should be false
    And the difficulty rating should increase
    And a warning should show "Requires local pickup"

  Scenario Outline: Condition-based multipliers
    Given a listing with condition "<Condition>"
    And asking price of $100
    When the AI calculates estimated value
    Then the condition multiplier should be approximately <Multiplier>
    And the estimated resale value should be around <Estimate>

    Examples:
      | Condition  | Multiplier | Estimate |
      | New        | 2.5        | $250     |
      | Like New   | 2.0        | $200     |
      | Good       | 1.5        | $150     |
      | Fair       | 1.2        | $120     |
      | Poor       | 0.8        | $80      |
