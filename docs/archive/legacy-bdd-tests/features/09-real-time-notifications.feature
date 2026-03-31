# Feature: Real-time Notifications via SSE
#
# As a Flipper AI user
# I want to receive real-time push notifications in my browser
# So that I can act on high-value opportunities the moment they're discovered
#
# Author: Stephen Boyett
# Company: Axovia AI

@sse @real-time @notifications
Feature: Real-time Notifications via Server-Sent Events

  Background:
    Given I am logged in as a registered user
    And I am on the Flipper AI dashboard

  Scenario: Connect to real-time notification stream
    When my browser opens the SSE connection to "/api/events"
    Then I should receive an initial ping event within 3 seconds
    And the ping event should contain a timestamp
    And the connection status indicator should show "Connected"

  Scenario: Receive high-value listing alert
    Given my SSE connection is established
    And I have set my value threshold to 75
    When a scraper discovers a listing with value score 92
    Then I should receive an "alert.high-value" event within 5 seconds
    And the event data should contain:
      | field      | value |
      | valueScore | 92    |
      | title      | the listing title |
      | platform   | the source platform |
    And a toast notification should appear in the top-right corner
    And the notification should show the listing title and estimated profit

  Scenario: Receive new opportunity notification
    Given my SSE connection is established
    When a new flip opportunity is created with high profit potential
    Then I should receive an "opportunity.created" event
    And the opportunities counter in the sidebar should increment by 1
    And I should see a clickable notification linking to the opportunity

  Scenario: Receive scraper job completion notification
    Given my SSE connection is established
    When a scraper job for "EBAY" platform completes
    Then I should receive a "job.complete" event
    And the event data should include the number of listings found
    And the listings count in the dashboard should update in real-time

  Scenario: Notification persists across page navigation
    Given I receive a "listing.found" notification on the dashboard
    When I navigate to the opportunities page
    Then the notification badge count should still be visible
    And the notification should appear in the notification tray

  Scenario: Dismiss individual notifications
    Given I have received 3 push notifications
    When I click the X button on the first notification
    Then the first notification should be removed
    And 2 notifications should remain visible

  Scenario: Clear all notifications
    Given I have received 5 push notifications
    When I click "Clear All" in the notification tray
    Then all notifications should be removed
    And the notification badge should show 0

  Scenario: Auto-reconnect after connection drop
    Given my SSE connection is established
    When the connection is interrupted
    Then the connection status should show "Reconnecting..."
    And the client should attempt to reconnect within 2 seconds
    When the server becomes available again
    Then my connection should be re-established automatically
    And I should continue receiving notifications

  Scenario: Unauthenticated SSE request is rejected
    Given I am not logged in
    When my browser attempts to open "/api/events"
    Then the server should return a 401 Unauthorized response
    And no SSE stream should be established

  Scenario: Multiple browser tabs receive the same notifications
    Given I have two browser tabs open with Flipper AI
    And both tabs have active SSE connections
    When a high-value listing is discovered
    Then both tabs should receive the "alert.high-value" event simultaneously
    And both notification trays should update

  Scenario: Heartbeat keeps connection alive
    Given my SSE connection is established
    When 30 seconds pass with no notifications
    Then I should receive a heartbeat "ping" event
    And the connection should remain open
    And the connection status should remain "Connected"
