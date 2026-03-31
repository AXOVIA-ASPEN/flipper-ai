Feature: Notifications & Listing Monitoring
  As a flipper
  I want to be alerted about important events
  So I never miss opportunities or sales

  Background:
    Given I am logged in
    And I have notifications enabled

  Scenario: Browser notification for new high-score opportunity
    Given I have the app open in a browser tab
    And I have an active scan running
    When a listing appears with flippability score > 85
    Then I should see a browser notification
    And the notification should say "🔥 New flip opportunity! Score: [score]"
    And clicking it should open the item detail page

  Scenario: Email notification for seller response
    Given I have sent a message to a seller
    And I have email notifications enabled
    When the seller responds to my message
    Then I should receive an email notification
    And the email should include:
      | Element         | Present |
      | Item Name       | Yes     |
      | Seller Message  | Yes     |
      | Reply Link      | Yes     |
    And clicking "Reply Now" should open the conversation

  Scenario: Slack/Discord integration (Pro tier)
    Given I am on the Pro Flipper plan
    And I have connected my Slack workspace
    When a listing with score > 90 is found
    Then a message should be posted to my #flips channel
    And the message should include:
      | Field              | Format                     |
      | Item Title         | Bold text                  |
      | Marketplace        | Badge/emoji                |
      | Price              | $XXX                       |
      | Flippability Score | XX/100 with emoji (🔥/⚡)  |
      | Link               | "View Opportunity" button  |

  Scenario: Price drop alert
    Given I am watching a listing priced at $300
    And the seller has not reduced the price in 3 days
    When the seller drops the price to $250
    Then I should receive a notification
    And it should say "Price drop! [Item] now $250 (was $300)"
    And I should be prompted to "Contact Seller Now"

  Scenario: SOLD alert for tracked listing
    Given I am negotiating with a seller
    And the listing is active on Facebook Marketplace
    When another buyer purchases the item
    And the listing status changes to "SOLD"
    Then I should receive an urgent notification
    And the subject should be "⚠️ Missed Opportunity"
    And the opportunity should be moved to "Lost Opportunities"
    And I should see analytics on how many opportunities I've missed

  Scenario: Listing expiration warning
    Given I am tracking a Craigslist listing
    And Craigslist posts expire after 30 days
    And the listing is 28 days old
    When the system checks listing ages
    Then I should receive a warning "This listing expires in 2 days"
    And I should be prompted to contact the seller urgently

  Scenario: Notification preferences management
    Given I navigate to Settings > Notifications
    Then I should be able to toggle:
      | Notification Type         | Default |
      | New Opportunities (90+)   | On      |
      | New Opportunities (80-89) | On      |
      | New Opportunities (70-79) | Off     |
      | Seller Responses          | On      |
      | Price Drops               | On      |
      | Sold Alerts               | On      |
      | Weekly Summary Email      | On      |
    And changes should save automatically

  Scenario: Daily/Weekly summary email
    Given I have "Weekly Summary Email" enabled
    And it is Monday at 9 AM
    When the system generates my weekly summary
    Then I should receive an email containing:
      | Section                  | Data                           |
      | Opportunities Found      | Count and avg flippability     |
      | Items Contacted          | Count                          |
      | Purchases Made           | Count and total spent          |
      | Items Sold               | Count and total profit         |
      | Top Opportunity Missed   | Item with highest score        |
    And I should see a "View Full Report" link

  Scenario: In-app notification center
    Given I have received 5 notifications today
    And I haven't viewed them all
    When I click the notification bell icon
    Then I should see a dropdown with all notifications
    And unread notifications should be marked with a dot
    And I should be able to:
      | Action              | Outcome                       |
      | Click notification  | Navigate to related page      |
      | Mark as read        | Remove unread indicator       |
      | Mark all as read    | Clear all unread indicators   |
      | Delete notification | Remove from list              |

  Scenario: Quiet hours (Do Not Disturb)
    Given I have set quiet hours from 10 PM to 8 AM
    When a new opportunity is found at 11 PM
    Then browser/push notifications should be suppressed
    But email notifications should still be sent
    And I should see the opportunity in my queue when I log in
