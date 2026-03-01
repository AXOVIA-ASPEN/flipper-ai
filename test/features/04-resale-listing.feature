Feature: Resale Listing Generator
  As a flipper
  I want AI to create optimized resale listings
  So I can quickly list items after purchase

  Background:
    Given I am logged in
    And I have purchased an item to flip

  Scenario: Auto-generate eBay listing
    Given I have purchased:
      | Item        | Sony WH-1000XM5 Headphones |
      | Buy Price   | $200                       |
      | Condition   | Like New                   |
      | Photos      | 5 images                   |
    And the target profit margin is 40%
    When I click "Create Sell Listing"
    And I select "eBay" as the platform
    Then the AI should generate:
      | Field           | Generated                                      |
      | Title           | Sony WH-1000XM5 Wireless Headphones - Like New |
      | Category        | Electronics > Headphones                       |
      | Description     | Full product description with features         |
      | Price           | $315-$325 (based on market analysis)           |
      | Shipping        | Free shipping calculated                       |
      | Return Policy   | 30-day returns accepted                        |
    And all photos should be included
    And SEO keywords should be optimized

  Scenario: Cross-platform posting
    Given I have created a listing for eBay
    When I select "Also post to Facebook Marketplace"
    Then the listing should be adapted for Facebook format
    And platform-specific fields should be adjusted:
      | eBay Field      | Facebook Field      |
      | Shipping        | Local pickup/ship   |
      | Handling time   | Meet-up location    |
      | Return policy   | (Not applicable)    |
    And both listings should be posted simultaneously

  Scenario: Price optimization based on demand
    Given the item "iPad Pro 11-inch"
    And recent sold listings show high demand (10+ sold in last 3 days)
    When the AI calculates the list price
    Then the suggested price should be at the upper end of the range
    And I should see a confidence indicator "High Demand - Price Aggressively"

  Scenario: Automated photo enhancement
    Given I upload photos of a vintage lamp
    And the photos are slightly dim
    When the listing generator processes the images
    Then the photos should be automatically brightened
    And backgrounds should be neutralized (white/gray)
    And the main image should be cropped to focus on the item

  Scenario: Clone existing listing for similar item
    Given I successfully sold an item "Canon EOS Rebel T7"
    And I purchase another similar item "Canon EOS Rebel SL3"
    When I create a new listing
    And I select "Clone from previous listing"
    Then the title, description, and settings should be copied
    And the model name should be auto-updated to "SL3"
    And I should review before posting

  Scenario: Track listing performance
    Given I have posted an item for $150
    And it has been listed for 5 days
    And I have received 3 views but no offers
    When I view the listing analytics
    Then I should see:
      | Metric          | Value               |
      | Views           | 3                   |
      | Watchers        | 0                   |
      | Avg time to sell| 7 days (category)   |
      | Recommendation  | Consider lowering   |
    And I should have the option to "Reduce Price by 10%"
