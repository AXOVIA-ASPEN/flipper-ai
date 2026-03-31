@epic-7
Feature: Subscription & Billing
  As a user
  I want clear subscription tiers with features gated by my plan
  So that I understand what I get at each level and can upgrade for more features

  @FR-BILLING-03 @story-7-1 @E-007-S-1 @wip
  Scenario: FREE tier user is blocked after daily scan limit
    Given a FREE tier user who has completed 10 scans today
    When the user attempts to start another scan
    Then the request is rejected with status 403
    And the response contains upgrade message "Daily scan limit reached"

  @FR-BILLING-03 @story-7-1 @E-007-S-2 @wip
  Scenario: FREE tier user is blocked from scanning a second marketplace
    Given a FREE tier user who has scanned on "CRAIGSLIST" today
    When the user attempts to scan on "EBAY"
    Then the request is rejected with status 403
    And the response contains upgrade message "FREE plan supports 1 marketplace"

  @FR-BILLING-03 @story-7-1 @E-007-S-3 @wip
  Scenario: FLIPPER tier user has unlimited scans
    Given a FLIPPER tier user who has completed 100 scans today
    When the user attempts to start another scan
    Then the scan job is created successfully

  @FR-BILLING-03 @story-7-1 @E-007-S-4 @wip
  Scenario: FLIPPER tier user can access up to 3 marketplaces
    Given a FLIPPER tier user who has scanned on 2 marketplaces today
    When the user attempts to scan on a third marketplace
    Then the scan job is created successfully

  @FR-BILLING-03 @story-7-1 @E-007-S-5 @wip
  Scenario: FLIPPER tier user is blocked from a 4th marketplace
    Given a FLIPPER tier user who has scanned on 3 marketplaces today
    When the user attempts to scan on a fourth marketplace
    Then the request is rejected with status 403

  @FR-BILLING-03 @story-7-1 @E-007-S-6 @wip
  Scenario: PRO tier user has unlimited scans and marketplaces
    Given a PRO tier user
    When the user attempts to start a scan on any marketplace
    Then the scan job is created successfully

  @FR-BILLING-07 @story-7-1 @E-007-S-7 @wip
  Scenario: FREE tier user sees upgrade prompt for messaging
    Given a FREE tier user
    When the user attempts to create a message
    Then the request is rejected with status 403
    And the response contains upgrade message "Messaging"

  @FR-BILLING-07 @story-7-1 @E-007-S-8 @wip
  Scenario: FREE tier user sees upgrade prompt for price history
    Given a FREE tier user
    When the user attempts to access price history
    Then the request is rejected with status 403
    And the response contains upgrade message "Price History"

  @FR-BILLING-03 @story-7-1 @E-007-S-9 @wip
  Scenario: Stripe webhook updates user tier on checkout completion
    Given a user with email "test@flipper.ai" on the FREE tier
    When a checkout.session.completed webhook fires for tier "PRO"
    Then the user's subscription tier is updated to "PRO" in the database

  @FR-BILLING-03 @story-7-1 @E-007-S-10 @wip
  Scenario: Stripe webhook downgrades user on subscription cancellation
    Given a user with email "cancel@flipper.ai" on the PRO tier
    When a customer.subscription.deleted webhook fires
    Then the user's subscription tier is updated to "FREE" in the database

  # ── Story 7.2: Stripe Checkout & Customer Portal ──────────────────────────

  @FR-BILLING-04 @story-7-2 @E-007-S-11
  Scenario: FREE user initiates Stripe Checkout for upgrade
    Given an authenticated FREE tier user
    When the user posts to "/api/checkout" with tier "FLIPPER"
    Then a Stripe Checkout session is created with mode "subscription"
    And the response contains a Stripe redirect URL

  @FR-BILLING-04 @story-7-2 @E-007-S-12
  Scenario: Successful checkout updates user subscription tier
    Given an authenticated FREE tier user with email "upgrader@flipper.ai"
    When a checkout.session.completed webhook fires for email "upgrader@flipper.ai" with tier "FLIPPER"
    Then the user's subscription tier is updated to "FLIPPER" in the database
    And the user is redirected back to settings with "?checkout=success&tier=FLIPPER"

  @FR-BILLING-04 @story-7-2 @E-007-S-13
  Scenario: Checkout rejects invalid subscription tier
    Given an authenticated FREE tier user
    When the user posts to "/api/checkout" with tier "INVALID"
    Then the checkout API responds with status 422
    And the checkout response contains error code "VALIDATION_ERROR"

  @FR-BILLING-05 @story-7-2 @E-007-S-14
  Scenario: Paid subscriber accesses Stripe Customer Portal
    Given an authenticated FLIPPER tier user with a Stripe customer account
    When the user posts to "/api/checkout/portal"
    Then a Stripe Customer Portal session is created
    And the response contains a Stripe Portal redirect URL

  @FR-BILLING-05 @story-7-2 @E-007-S-15
  Scenario: Customer Portal returns 404 for user without Stripe account
    Given an authenticated user with no Stripe customer record
    When the user posts to "/api/checkout/portal"
    Then the checkout API responds with status 404
    And the checkout response contains error code "NOT_FOUND"

  @FR-BILLING-04 @story-7-2 @E-007-S-16
  Scenario: Checkout cancel leaves subscription unchanged
    Given an authenticated FREE tier user
    When the user cancels the Stripe Checkout page
    Then no subscription is created
    And the user is redirected back to settings with "?checkout=cancelled"

  @FR-BILLING-04 @story-7-2 @E-007-S-17
  Scenario: Unauthenticated user cannot create checkout session
    Given an unauthenticated user
    When the user posts to "/api/checkout" with tier "FLIPPER"
    Then the checkout API responds with status 401
    And the checkout response contains error code "UNAUTHORIZED"

  @FR-BILLING-05 @story-7-2 @E-007-S-18
  Scenario: Unauthenticated user cannot access Customer Portal
    Given an unauthenticated user
    When the user posts to "/api/checkout/portal"
    Then the checkout API responds with status 401
    And the checkout response contains error code "UNAUTHORIZED"

  # ── Story 7.3: Stripe Webhook Handling ──────────────────────────────────────

  @FR-BILLING-06 @story-7-3 @E-007-S-19
  Scenario: Subscription created webhook updates user tier
    Given a registered user with email "created@flipper.ai" on the "FREE" tier
    When a valid Stripe webhook event "customer.subscription.created" is received for "created@flipper.ai" with tier "PRO"
    Then the webhook responds with status 200
    And the user's tier in the database is updated to "PRO"

  @FR-BILLING-06 @story-7-3 @E-007-S-20
  Scenario: Subscription updated webhook changes user tier
    Given a registered user with email "updated@flipper.ai" on the "FLIPPER" tier
    When a valid Stripe webhook event "customer.subscription.updated" is received for "updated@flipper.ai" with tier "PRO"
    Then the webhook responds with status 200
    And the user's tier in the database is updated to "PRO"

  @FR-BILLING-06 @story-7-3 @E-007-S-21
  Scenario: Subscription deleted webhook downgrades user to FREE
    Given a registered user with email "deleted@flipper.ai" on the "PRO" tier
    When a valid Stripe webhook event "customer.subscription.deleted" is received for "deleted@flipper.ai"
    Then the webhook responds with status 200
    And the user's tier in the database is updated to "FREE"

  @FR-BILLING-06 @story-7-3 @E-007-S-22
  Scenario: Payment failed webhook sends notification email
    Given a registered user with email "failed@flipper.ai" on the "PRO" tier
    When a valid Stripe webhook event "invoice.payment_failed" is received for "failed@flipper.ai"
    Then the webhook responds with status 200
    And a payment failure notification email is sent to "failed@flipper.ai"
    And a payment failure warning is logged for "failed@flipper.ai"

  @FR-BILLING-06 @story-7-3 @E-007-S-23
  Scenario: Payment failed webhook still returns 200 when email send fails
    Given a registered user with email "email-fail@flipper.ai" on the "PRO" tier
    When a valid Stripe webhook event "invoice.payment_failed" is received for "email-fail@flipper.ai" but the email service fails
    Then the webhook responds with status 200
    And the email failure is logged but does not cause a webhook error

  @NFR-SEC-08 @story-7-3 @E-007-S-24
  Scenario: Invalid webhook signature is rejected with 422
    Given an incoming Stripe webhook request with an invalid signature
    When the webhook handler processes the request
    Then the webhook responds with status 422
    And a security warning is logged for invalid signature

  @NFR-SEC-08 @story-7-3 @E-007-S-25
  Scenario: Missing webhook signature is rejected with 422
    Given an incoming Stripe webhook request with no signature header
    When the webhook handler processes the request
    Then the webhook responds with status 422

  @NFR-SEC-08 @story-7-3 @E-007-S-26
  Scenario: Webhook secret guard rejects requests in production when secret is not configured
    Given the STRIPE_WEBHOOK_SECRET environment variable is empty in production
    When a Stripe webhook request arrives
    Then the webhook responds with status 503
    And the response indicates the service is misconfigured

  @FR-BILLING-06 @story-7-3 @E-007-S-27
  Scenario: Subscription created webhook skips update when customer has no email
    Given a Stripe customer with no email address
    When a valid Stripe webhook event "customer.subscription.created" is received for a customer without email
    Then the webhook responds with status 200
    And no database update is performed

  # ── Story 7.4: API Usage Tracking & Metering ──────────────────────────────

  @FR-BILLING-08 @story-7-4 @E-007-S-28 @wip
  Scenario: Scan count incremented on job completion
    Given a user with a FREE subscription
    When a scraping job completes successfully
    Then the scan count for the current month is incremented by 1

  @FR-BILLING-08 @story-7-4 @E-007-S-29 @wip
  Scenario: Analysis count incremented on AI analysis
    Given a user triggers an AI analysis on a listing
    When the analysis completes successfully
    Then the analysis count for the current month is incremented by 1

  @FR-BILLING-08 @story-7-4 @E-007-S-30 @wip
  Scenario: FREE user sees usage with daily limit
    Given an authenticated FREE tier user
    When they request their usage data from the API
    Then the response contains scans used with a limit of 10
    And the response contains analyses used with no limit

  @FR-BILLING-08 @story-7-4 @E-007-S-31 @wip
  Scenario: Paid user sees usage without limit
    Given an authenticated FLIPPER tier user
    When they request their usage data from the API
    Then the response contains scans used with no limit
    And the response contains analyses used with no limit

  @FR-BILLING-08 @story-7-4 @E-007-S-32 @wip
  Scenario: Usage counters reset on new month
    Given a user with usage records from the previous month
    When the first day of a new month arrives
    Then the usage display shows zero for all counters
