Feature: Multi-Marketplace Scanning
  As a flipper
  I want to scan multiple marketplaces for items
  So I can find flip opportunities across platforms

  Background:
    Given I am logged in as a free user
    And the database is seeded with test data

  Scenario: Scan eBay for electronics
    When I navigate to the scanner page
    And I select "eBay" as the marketplace
    And I select "Electronics" as the category
    And I set price range to "$50-$500"
    And I click "Start Scan"
    Then I should see a "Scanning eBay..." progress indicator
    And within 10 seconds, results should be displayed
    And each result should show:
      | Field           | Present |
      | Title           | Yes     |
      | Price           | Yes     |
      | Marketplace     | Yes     |
      | Thumbnail       | Yes     |
      | Flippability    | Yes     |
    And results should be sorted by flippability score descending

  Scenario: Real-time alert for high-value opportunity
    Given I have an active scan running for "Craigslist"
    And I have notifications enabled
    When a new listing appears with flippability score > 80
    Then I should receive a browser notification
    And the notification should show the item title and score
    And clicking the notification should navigate to the item detail page

  Scenario: Filter scan results by flippability score
    Given I have scan results displayed
    When I set the flippability filter to "70+ only"
    Then only items with score >= 70 should be visible
    And the count badge should update to show filtered count

  Scenario: Save custom search configuration
    When I navigate to the scanner page
    And I configure:
      | Marketplace    | Category    | Price Range | Keywords  |
      | Facebook       | Furniture   | $0-$200     | vintage   |
    And I click "Save Search"
    And I enter search name "Vintage Furniture FB"
    Then the search should be saved to my configurations
    And I should be able to re-run it from the dashboard

  Scenario: Free tier scan limit enforcement
    Given I am on the free tier
    And I have used 10 scans today
    When I try to start another scan
    Then I should see an upgrade modal
    And the scan should not execute
    And the modal should show pricing tiers
