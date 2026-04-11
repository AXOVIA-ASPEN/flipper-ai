@epic-11
Feature: Push & SMS Notifications (Phase 2)
  As a user
  I want push notifications delivered to my browser devices
  So that I get instant alerts even when I'm not actively using the app

  # ── Story 11.1: FCM Push Notification Client ────────────────────────────────

  # AC-1: Permission + Token Registration (FR-NOTIFY-12)

  @FR-NOTIFY-12 @story-11-1 @E-011-S-1
  Scenario: Device token is stored when permission is granted via the API
    Given an authenticated user
    When the user registers a device token "fcm-token-abc123" with userAgent "Chrome/120"
    Then the device token is stored in the database linked to that user
    And the response contains the device token id

  # AC-4: Multi-Device Fan-Out (FR-NOTIFY-12)

  @FR-NOTIFY-12 @story-11-1 @E-011-S-4
  Scenario: Multiple device tokens are each stored independently for the same user
    Given an authenticated user
    When the user registers device token "fcm-token-device-1" on device 1
    And the user registers device token "fcm-token-device-2" on device 2
    Then both tokens are stored in the database for that user

  # AC-2: Push Delivery when event occurs (FR-NOTIFY-12)

  @FR-NOTIFY-12 @story-11-1 @E-011-S-2
  Scenario: Push notification service fans out to all registered device tokens
    Given a user with push notifications enabled
    And the user has registered device tokens "token-x" and "token-y"
    When a push notification is sent for that user with title "Deal Found!" and body "MacBook Pro — 40% off"
    Then the service attempts FCM delivery to 2 devices

  # AC-3: Background delivery via Service Worker (FR-NOTIFY-12)

  @FR-NOTIFY-12 @story-11-1 @E-011-S-3
  Scenario: FCM service worker is registered at the root scope
    Given the app is running
    When the FCM service worker file is requested
    Then the file is served at "/firebase-messaging-sw.js"
    And the file imports the firebase-app-compat and firebase-messaging-compat scripts
    And the file initialises a firebase messaging instance

  # AC-5: Per-Event Push Toggle (FR-NOTIFY-12)

  @FR-NOTIFY-12 @story-11-1 @E-011-S-5
  Scenario: No push notification is sent when global push setting is disabled
    Given a user with push notifications disabled in settings
    And the user has a registered device token "token-disabled"
    When a push notification is sent for that user
    Then FCM does not deliver any notification

  # ── Story 11.2: Twilio SMS Integration ─────────────────────────────────────

  # AC-1: Phone Number Verification Flow (FR-NOTIFY-13)

  @FR-NOTIFY-13 @story-11-2 @E-011-S-7
  Scenario: Phone verification code is sent via Twilio
    Given an authenticated user with no verified phone number
    When the user requests a verification code for phone number "+12025551234"
    Then a 6-digit verification SMS is sent to that number via the SMS service
    And the phone number is stored as unverified in user settings

  @FR-NOTIFY-13 @story-11-2 @E-011-S-8
  Scenario: Correct verification code verifies the phone number
    Given the user has been sent a verification code
    When the user submits the correct 6-digit code
    Then the phone number is marked verified
    And the stored verification code is cleared

  @FR-NOTIFY-13 @story-11-2 @E-011-S-9
  Scenario: Expired verification code is rejected
    Given the user has a verification code that expired 11 minutes ago
    When the user submits that code
    Then the verify endpoint returns "Invalid or expired verification code"
    And the phone number remains unverified

  # AC-2: Event-Triggered SMS Sending (FR-NOTIFY-13)

  @FR-NOTIFY-13 @story-11-2 @E-011-S-10
  Scenario: SMS is sent when a flip event occurs with verified phone and master toggle ON
    Given the user has a verified phone number and SMS notifications enabled
    When a new-deal notification is dispatched for item "Vintage Camera" priced at 250 with estimated profit 100
    Then an SMS is sent containing the item title and asking price to the verified number

  # AC-3: Concise SMS Message Format (FR-NOTIFY-13)

  @FR-NOTIFY-13 @story-11-2 @E-011-S-11
  Scenario: SMS message body stays within 160 characters when the title is very long
    Given the user has a verified phone number and SMS notifications enabled
    When a new-deal notification is dispatched for item "A Very Long Listing Title That Would Normally Blow Through The SMS Character Limit Without Careful Truncation Of The Title Portion Of The Message Body So We Add Even More Text" priced at 500 with estimated profit 300
    Then the SMS body is 160 characters or fewer
    And the SMS body ends with a truncation marker

  # AC-4: Twilio Failure Resilience (FR-NOTIFY-13)

  @FR-NOTIFY-13 @story-11-2 @E-011-S-12
  Scenario: Twilio failure is swallowed without throwing
    Given the user has a verified phone number and SMS notifications enabled
    And the SMS provider is configured to fail on the next send
    When a new-deal notification is dispatched for item "Test Item" priced at 100 with estimated profit 50
    Then the notification call completes without throwing
    And the failure is logged but not raised

  # AC-5: Unverified Phone Gating (FR-NOTIFY-13)

  @FR-NOTIFY-13 @story-11-2 @E-011-S-13
  Scenario: SMS toggles are blocked until the phone number is verified
    Given an authenticated user with no verified phone number
    When the user attempts to enable SMS notifications via the settings API
    Then the settings API rejects the update with a verification-required error
    And no SMS is dispatched for any flip event

  # ── Story 11.3: Multi-Channel Notification Preferences ──────────────────────

  # AC-1: Per-event push and SMS fields exist in settings schema (FR-NOTIFY-12)

  @FR-NOTIFY-12 @story-11-3 @E-011-S-14
  Scenario: All 24 per-event push and SMS toggle fields are returned by the settings API
    Given a user with push notifications enabled and a verified phone number
    When the settings data is loaded for that user
    Then the settings include all 12 push per-event toggle fields
    And the settings include all 12 SMS per-event toggle fields

  # AC-2: Per-event toggle persists across round-trips (FR-NOTIFY-12)

  @FR-NOTIFY-12 @story-11-3 @E-011-S-15
  Scenario: Disabling push for Flip Lifecycle Updates persists in user settings
    Given a user with push notifications enabled and all per-event push toggles on
    When the user disables push for flip lifecycle updates
    Then the setting is stored as false for that user
    And re-loading settings confirms pushNotifySoldItems is false

  # AC-4: Push column gating — browser permission required (FR-NOTIFY-12)

  @FR-NOTIFY-12 @story-11-3 @E-011-S-16
  Scenario: Push service skips delivery when pushNotifyFlipGoneCold is false even with master push on
    Given the user has push notifications master toggle enabled
    And the user has pushNotifyFlipGoneCold set to false
    And the user has a device token "token-cold-test" for testing
    When a push notification is dispatched for the flipGoneCold event
    Then FCM does not deliver any notification for that event

  # AC-4: SMS column gating — phone must be verified (FR-NOTIFY-12)

  @FR-NOTIFY-12 @story-11-3 @E-011-S-17
  Scenario: SMS is skipped when per-event smsNotifyNewDeals is false
    Given the user has a verified phone number and SMS master toggle enabled
    And the user has smsNotifyNewDeals set to false
    When a new-deal SMS notification is dispatched
    Then no SMS is sent to that user

  # AC-3: Master push toggle off disables all per-event push (FR-NOTIFY-12)

  @FR-NOTIFY-12 @story-11-3 @E-011-S-18
  Scenario: Push delivery is blocked when the master pushNotifications toggle is off
    Given the user has push notifications master toggle disabled
    And the user has a device token "token-master-off" for testing
    And the user has all per-event push toggles enabled
    When a push notification is dispatched for the newDeals event
    Then FCM does not deliver any notification for that event

  # AC-3: Master SMS toggle off disables all per-event SMS (FR-NOTIFY-12)

  @FR-NOTIFY-12 @story-11-3 @E-011-S-19
  Scenario: SMS delivery is blocked when the master smsNotifications toggle is off
    Given the user has a verified phone number with master SMS toggle disabled
    And the user has all per-event SMS toggles enabled
    When a new-deal SMS notification is dispatched
    Then no SMS is sent to that user

  # AC-2: Per-event SMS toggle persists (FR-NOTIFY-12)

  @FR-NOTIFY-12 @story-11-3 @E-011-S-20
  Scenario: Disabling SMS for Flip Gone Cold is stored and re-loaded correctly
    Given a user with push notifications enabled and a verified phone number
    When the user disables SMS for flip gone cold
    Then the setting is stored as false for smsNotifyFlipGoneCold
    And re-loading settings confirms smsNotifyFlipGoneCold is false

  # AC-3: Channel routing — only enabled channels receive the event (FR-NOTIFY-12)

  @FR-NOTIFY-12 @story-11-3 @E-011-S-21
  Scenario: SMS is skipped for an event when its per-event toggle is false but master is on
    Given the user has a verified phone number and SMS master toggle enabled
    And the user has smsNotifyFlipTurnedHot set to false
    When a flip-turned-hot SMS notification is dispatched
    Then no SMS is sent to that user for the flip-turned-hot event
