Feature: Automated Seller Communication
  As a flipper
  I want AI to draft messages to sellers
  So I can quickly negotiate purchases

  Background:
    Given I am logged in
    And I have identified a flip opportunity

  Scenario: Generate initial outreach message
    Given an opportunity:
      | Title          | Vintage Nintendo 64 Console |
      | Price          | $75                         |
      | Seller         | John (Craigslist)           |
      | Location       | 5 miles away                |
      | Asking Offer   | Yes (OBO)                   |
    When I click "Draft Message"
    Then the AI should generate a message containing:
      | Element              | Required |
      | Polite greeting      | Yes      |
      | Item reference       | Yes      |
      | Interest statement   | Yes      |
      | Pickup availability  | Yes      |
      | Contact info request | Yes      |
    And the tone should be friendly and professional
    And it should NOT include lowball offers

  Scenario: User approves and sends message
    Given an AI-drafted message is ready
    When I review the message
    And I click "Approve & Send"
    Then the message should be sent to the seller
    And the opportunity status should change to "Contacted"
    And the conversation should appear in my inbox

  Scenario: User edits AI-drafted message
    Given an AI-drafted message is displayed
    When I click "Edit"
    And I modify the pickup time to "Saturday afternoon"
    And I click "Send Edited Message"
    Then the modified message should be sent
    And my edits should be saved as a template preference

  Scenario: Track conversation thread
    Given I have sent an initial message
    And the seller has replied "Yes, it's available. Can you pick up tomorrow?"
    When I navigate to the Messages page
    Then I should see the full conversation thread
    And the seller's reply should be marked as unread
    And I should see a "Draft Reply" button

  Scenario: AI suggests response to seller question
    Given the seller asks "What's your best offer?"
    When I click "Draft Reply"
    Then the AI should analyze my profit margins
    And suggest a counteroffer between list price and my max budget
    And include negotiation rationale in the message

  Scenario: Schedule pickup with calendar integration
    Given the seller agrees to sell
    And they say "Can you pick up this Saturday?"
    When I click "Schedule Pickup"
    Then a calendar event should be created
    And I should be able to set a reminder
    And the event should include:
      | Field    | Content                |
      | Title    | Pickup: [Item Name]    |
      | Location | [Seller Address]       |
      | Notes    | Seller: [Contact Info] |

  Scenario: Alert if tracked item sells before purchase
    Given I am negotiating with a seller
    And the listing is still active on the marketplace
    When the listing status changes to "SOLD"
    Then I should receive an urgent notification
    And the opportunity should be marked as "Missed"
    And it should move to the "Lost Opportunities" section
