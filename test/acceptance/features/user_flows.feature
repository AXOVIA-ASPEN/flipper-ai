@user-flows
Feature: User Flows
  Validates all user flow paths defined in _bmad-output/planning-artifacts/user-flows/user-flows.md

  # Scenarios to be generated from user-flows.md by dev agent
  # Every scenario MUST have dual tags: @FR-<num> AND @story-<epic>-<story>

  # Flow 4: Kanban Flip Tracking (Story 6.2)
  # The user drags opportunities through lifecycle stages, entering contextual data at each step.

  @wip @E-006-S-21 @story-6-2 @FR-DASH-02
  Scenario: User tracks a flip from discovery to sale using the Kanban board
    Given I am logged in as a user
    And I have an opportunity in IDENTIFIED status
    When I navigate to the opportunities page
    And I switch to Kanban view
    And I drag the opportunity card to the PURCHASED column
    And I enter a purchase price of "$120"
    And I confirm the purchase
    Then the opportunity status is updated to PURCHASED
    And I drag the card to the LISTED column
    And I enter a resale URL "https://ebay.com/item/123"
    And I confirm the listing
    Then the opportunity status is updated to LISTED
    And I drag the card to the SOLD column
    And I enter a sale price of "$250" and fees of "$30"
    And I confirm the sale
    Then the opportunity status is updated to SOLD
    And the actual profit is calculated as salePrice minus purchasePrice minus fees

  @wip @E-006-S-22 @story-6-2 @FR-DASH-02
  Scenario: User passes on an opportunity using the PASSED column
    Given I am logged in as a user
    And I have an opportunity in IDENTIFIED status
    When I navigate to the opportunities page
    And I switch to Kanban view
    And I drag the opportunity card to the PASSED column
    Then the opportunity status is updated to PASSED without any modal prompt

  # ── Flow 7: Subscription Upgrade (Story 7.2) ───────────────────────────────
  # FREE user discovers scan limits, upgrades via Stripe Checkout, gets unlocked.

  @story-7-2 @FR-BILLING-04
  Scenario: FREE user upgrades to Flipper after hitting scan limits
    Given I am logged in as a FREE tier user
    And I have used all 10 daily scans
    When I navigate to the settings page
    Then I see the scan progress bar at 100% with "Limit reached"
    And I see the "Upgrade to Flipper" button with a shimmer animation
    When I click "Upgrade to Flipper"
    Then a Stripe Checkout session is created for "FLIPPER"
    And I am redirected to the Stripe hosted checkout page
    When the Stripe payment completes successfully
    Then I am redirected back to settings with "?checkout=success&tier=FLIPPER"
    And a success toast says "Subscription activated!"
    And my subscription tier is updated to FLIPPER

  @story-7-2 @FR-BILLING-04
  Scenario: User cancels Stripe Checkout and keeps FREE tier
    Given I am logged in as a FREE tier user
    When I navigate to the settings page
    And I click "Upgrade to Flipper"
    And I close the Stripe Checkout page
    Then I am redirected back to settings with "?checkout=cancelled"
    And an info toast says "Checkout cancelled"
    And my subscription tier remains FREE

  @story-7-2 @FR-BILLING-05
  Scenario: Paid subscriber manages billing via Customer Portal
    Given I am logged in as a FLIPPER tier user
    When I navigate to the settings page
    Then I see the "Manage Billing" button in the header
    When I click "Manage Billing"
    Then a Stripe Customer Portal session is created
    And I am redirected to the Stripe Customer Portal to manage my subscription
