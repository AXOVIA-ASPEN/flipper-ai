Feature: Dashboard & Opportunity Tracking
  As a flipper
  I want a centralized dashboard to track my flips
  So I can manage my entire operation in one place

  Background:
    Given I am logged in
    And I have data across multiple stages

  Scenario: View flippables queue
    Given I have 15 identified opportunities
    And 5 have score > 80
    And 10 have score between 70-80
    When I navigate to the dashboard
    Then I should see the "Flippables Queue" section
    And items should be sorted by score (highest first)
    And I should see filter options:
      | Filter         | Options                    |
      | Score Range    | 90+, 80-89, 70-79, <70     |
      | Marketplace    | All, eBay, FB, Craigslist  |
      | Category       | All, Electronics, etc.     |
      | Shippable      | Yes, No, All               |
    And each card should show a "Contact Seller" button

  Scenario: Active negotiations section
    Given I have 3 ongoing conversations with sellers
    And 1 seller hasn't replied in 48 hours
    And 1 seller just sent a message 10 minutes ago
    When I view the "Active Negotiations" section
    Then conversations should be sorted by last activity
    And unread messages should have a notification badge
    And stale conversations (48h+) should be highlighted in yellow

  Scenario: Inventory management
    Given I have purchased 4 items awaiting resale:
      | Item              | Purchase Date | Cost | Listed | Status      |
      | Nintendo Switch   | 2 days ago    | $180 | Yes    | Active      |
      | Dyson Vacuum      | 5 days ago    | $220 | Yes    | 3 watchers  |
      | Canon Camera      | 1 week ago    | $300 | No     | Not listed  |
      | Vintage Radio     | 2 weeks ago   | $50  | Yes    | Sold!       |
    When I navigate to "My Inventory"
    Then I should see all 4 items
    And the "Not listed" item should be highlighted
    And the "Sold!" item should show profit calculation
    And total inventory value should be displayed

  Scenario: Sales history and profit tracking
    Given I have completed 10 flips in the last month
    When I navigate to "Sales History"
    Then I should see a table of completed flips:
      | Column           | Present |
      | Item Name        | Yes     |
      | Buy Price        | Yes     |
      | Sell Price       | Yes     |
      | Net Profit       | Yes     |
      | ROI %            | Yes     |
      | Days to Sell     | Yes     |
    And I should see summary stats:
      | Metric               | Calculated |
      | Total Profit         | Sum        |
      | Avg ROI              | Average    |
      | Avg Days to Sell     | Average    |
      | Success Rate         | Sold/Total |
    And I should be able to export as CSV

  Scenario: Visual profit/loss chart
    Given I have sales data for the last 3 months
    When I view the dashboard analytics section
    Then I should see a line chart showing:
      | Axis   | Data                       |
      | X-axis | Weeks (last 12 weeks)      |
      | Y-axis | Cumulative profit ($)      |
    And hovering over data points should show weekly breakdown
    And I should see a trend indicator (↑ improving, ↓ declining)

  Scenario: Quick actions from dashboard
    Given I am viewing the dashboard
    When I see a high-score opportunity
    Then I should be able to:
      | Action              | Outcome                        |
      | Quick Contact       | Opens message draft modal      |
      | Save for Later      | Moves to "Saved" section       |
      | Mark as Purchased   | Moves to Inventory             |
      | Dismiss             | Removes from queue             |
    And each action should update the UI immediately

  Scenario: Real-time updates via WebSocket
    Given I have the dashboard open
    And a background scan is running
    When a new opportunity is found with score > 85
    Then the dashboard should update automatically
    And a toast notification should appear
    And the new item should slide into the queue with animation
    And the total count badge should increment
