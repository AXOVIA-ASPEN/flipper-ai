Feature: User Authentication & Billing
  As a flipper
  I want to create an account and manage my subscription
  So I can access premium features

  Background:
    Given the application is running

  Scenario: Sign up for free account
    When I visit the landing page
    And I click "Get Started Free"
    Then I should see a registration form
    When I enter:
      | Field           | Value                    |
      | Email           | newuser@example.com      |
      | Password        | SecurePass123!           |
      | Confirm Pass    | SecurePass123!           |
    And I accept the terms of service
    And I click "Create Account"
    Then I should receive a verification email
    And I should be redirected to the onboarding flow

  Scenario: Email verification
    Given I signed up with "newuser@example.com"
    And I received a verification email
    When I click the verification link
    Then my account should be activated
    And I should be redirected to the dashboard
    And I should see a "Welcome to Flipper AI!" message

  Scenario: Login with existing account
    Given I have a verified account
    When I visit the login page
    And I enter my email and password
    And I click "Sign In"
    Then I should be logged in
    And I should see my dashboard

  Scenario: Free tier limitations
    Given I am on the free tier
    And I have used 10 scans today
    When I try to start scan #11
    Then I should see an upgrade prompt
    And the prompt should show:
      | Info                | Value                |
      | Current Plan        | Free                 |
      | Scans Used Today    | 10/10                |
      | Recommended Plan    | Flipper ($19/mo)     |
      | Benefit             | Unlimited scans      |
    And I should be able to click "Upgrade Now"

  Scenario: Upgrade to paid tier (Flipper)
    Given I am logged in to a free account
    When I click "Upgrade" from the dashboard
    Then I should see the pricing page
    When I select the "Flipper" plan ($19/mo)
    And I click "Subscribe"
    Then I should be redirected to Stripe Checkout
    When I enter valid payment information
    And I complete the purchase
    Then my account should be upgraded to "Flipper"
    And I should receive a confirmation email
    And my dashboard should show "Unlimited scans"

  Scenario: Subscription management
    Given I am subscribed to the "Flipper" plan
    When I navigate to Account Settings
    And I click "Manage Subscription"
    Then I should see:
      | Field              | Value                        |
      | Current Plan       | Flipper ($19/mo)             |
      | Next Billing Date  | [30 days from signup]        |
      | Payment Method     | •••• 4242 (Visa)             |
    And I should have options to:
      | Action                | Available |
      | Upgrade to Pro        | Yes       |
      | Update Payment Method | Yes       |
      | Cancel Subscription   | Yes       |

  Scenario: Cancel subscription
    Given I am subscribed to a paid plan
    When I navigate to subscription management
    And I click "Cancel Subscription"
    Then I should see a confirmation modal
    And the modal should warn about feature loss
    When I confirm cancellation
    Then my subscription should be set to cancel at period end
    And I should retain access until the billing date
    And I should see a message "Your plan will downgrade to Free on [date]"

  Scenario: Access control for premium features
    Given I am on the free tier
    When I try to access the "Auto-Listing" feature
    Then I should see a paywall modal
    And the modal should say "This feature requires Flipper or Pro plan"
    And I should be able to click "Upgrade" to subscribe

  Scenario Outline: Feature availability by tier
    Given I am subscribed to the "<Tier>" plan
    When I check my available features
    Then I should <Access> to "<Feature>"

    Examples:
      | Tier        | Feature              | Access   |
      | Free        | eBay Scanning        | have     |
      | Free        | AI Messaging         | not have |
      | Free        | Auto-Listing         | not have |
      | Flipper     | eBay Scanning        | have     |
      | Flipper     | AI Messaging         | have     |
      | Flipper     | Auto-Listing         | not have |
      | Pro Flipper | eBay Scanning        | have     |
      | Pro Flipper | AI Messaging         | have     |
      | Pro Flipper | Auto-Listing         | have     |
      | Pro Flipper | Priority Support     | have     |
