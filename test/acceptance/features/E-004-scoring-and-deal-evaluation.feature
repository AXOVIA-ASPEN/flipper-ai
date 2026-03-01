@epic-4 @scoring @deal-evaluation
Feature: LLM Sellability Assessment and Deal Evaluation
  As a flipper
  I want the system to analyze listings using AI
  So that I can focus on the best opportunities

  Background:
    Given I am logged in as a verified user
    And my discount threshold is set to 50%

  @fr-SCORE-11 @story-4-5
  Scenario: System evaluates sellability with all required fields
    Given an LLM-identified item "iPhone 15 Pro 256GB"
    And verified market data shows median price of $800
    And the listing price is $350
    When the sellability assessment runs
    Then the system should evaluate and store:
      | Field               | Type                        |
      | demandLevel         | high/medium/low/very_high   |
      | expectedDaysToSell  | number                      |
      | authenticityRisk    | high/medium/low             |
      | conditionRisk       | high/medium/low             |
      | confidence          | high/medium/low             |
    And all fields should be saved to the Listing record

  @fr-SCORE-12 @story-4-5
  Scenario: System recommends prices based on market data and platform fees
    Given an LLM-identified item "Canon EOS R5"
    And verified market data shows median price of $2000
    And the listing price is $900
    And the target platform fee rate is 13%
    When the sellability assessment runs
    Then the recommended offer price should be calculated based on market data
    And the recommended listing price should factor in the 13% platform fee
    And the recommendations should target the configured profit margin

  @fr-SCORE-13 @story-4-5
  Scenario: System filters out listings below discount threshold
    Given my discount threshold is set to 50%
    And a listing "MacBook Pro 2023" is priced at $1200
    And verified market data shows median price of $2000
    When LLM analysis calculates the discount percentage
    Then the discount percentage should be 40%
    And the listing should NOT be saved to the database
    And the system should skip further analysis

  @fr-SCORE-13 @story-4-5
  Scenario: System saves listings that meet discount threshold
    Given my discount threshold is set to 50%
    And a listing "PlayStation 5" is priced at $200
    And verified market data shows median price of $450
    When LLM analysis calculates the discount percentage
    Then the discount percentage should be 55.6%
    And the listing should be saved to the database
    And all sellability fields should be populated

  @fr-SCORE-13 @story-4-5
  Scenario: User views and configures discount threshold in Settings
    Given I am on the Settings page
    When I view the "Undervalue Discount Threshold" section
    Then I should see the current threshold value displayed
    And the default threshold should be 50%
    And I should be able to adjust the threshold using a slider
    And I should be able to enter a specific percentage value

  @fr-SCORE-13 @story-4-5
  Scenario: User changes discount threshold to be more selective
    Given I am on the Settings page
    And my current discount threshold is 50%
    When I change the threshold to 70%
    And I save my settings
    Then the new threshold should be stored in UserSettings
    And future LLM analyses should use 70% as the minimum discount
    And I should see a success message

  @fr-SCORE-13 @story-4-5
  Scenario: User changes discount threshold to be less selective
    Given I am on the Settings page
    And my current discount threshold is 50%
    When I change the threshold to 30%
    And I save my settings
    Then the new threshold should be stored in UserSettings
    And future LLM analyses should use 30% as the minimum discount
    And more listings should pass the filter

  @fr-SCORE-13 @story-4-5 @edge-case
  Scenario: System handles threshold boundary conditions
    Given my discount threshold is set to 50%
    And a listing is priced at exactly 50% of market value
    When LLM analysis runs
    Then the listing should meet the threshold
    And the listing should be saved to the database

  @fr-SCORE-11 @fr-SCORE-12 @integration
  Scenario: Complete sellability assessment workflow
    Given a new Craigslist listing is found: "iPad Pro 12.9 128GB"
    And the asking price is $400
    And the market median price is $900
    And my discount threshold is 50%
    When the scraper processes the listing
    Then the system should:
      | Step                        | Action                                      |
      | 1. Quick discount check     | Pass (55% discount >= 40% quick threshold)  |
      | 2. LLM identification       | Identify brand, model, condition            |
      | 3. Market price lookup      | Fetch eBay sold listings                    |
      | 4. Sellability analysis     | Run full LLM assessment                     |
      | 5. Threshold check          | Pass (55% >= 50%)                           |
      | 6. Save to database         | Store with all sellability fields           |
    And the listing should have:
      | Field                    | Expected                              |
      | verifiedMarketValue      | ~$900 (adjusted for condition)        |
      | trueDiscountPercent      | ~55%                                  |
      | demandLevel              | high or medium                        |
      | expectedDaysToSell       | numeric value                         |
      | authenticityRisk         | low or medium                         |
      | conditionRisk            | low or medium                         |
      | recommendedOfferPrice    | < $400                                |
      | recommendedListPrice     | > $900 (to cover fees)                |
      | meetsThreshold           | true                                  |

  @fr-SCORE-11 @error-handling
  Scenario: System handles LLM analysis failure gracefully
    Given a listing that passes the quick discount check
    When the LLM analysis API returns an error
    Then the system should log the error
    And the listing should still be saved with basic data
    And sellability fields should be null or default values
    And the user should not see an error message
