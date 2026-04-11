@epic-10
Feature: Monitoring & Email Notifications
  As a user
  I want email alerts for monitoring events and message activity
  So that I stay informed about listings and can respond promptly to sellers

  # ── Story 10.4: Communication Email Notifications ──────────────────────────

  # AC1: Message Received Notification (FR-NOTIFY-02)

  @FR-NOTIFY-02 @story-10-4 @E-010-S-1
  Scenario: Email is sent when a seller replies to a conversation thread
    Given a user with email notifications enabled
    And the seller "Alice" replies with body "Is this still available?" on listing "MacBook Pro"
    When the message.received notification is triggered
    Then the email service receives a send request
    And the email subject contains "Alice"
    And the email subject contains "MacBook Pro"
    And the email body contains the seller name "Alice"
    And the email body contains the message preview "Is this still available?"
    And the email body contains the listing title "MacBook Pro"
    And the email body contains a link to the thread

  @FR-NOTIFY-02 @story-10-4 @E-010-S-2
  Scenario: No email is sent when user has disabled email notifications
    Given a user with email notifications disabled
    When the message.received notification is triggered
    Then no email is sent

  @FR-NOTIFY-02 @story-10-4 @E-010-S-3
  Scenario: Email falls back gracefully when seller name is not provided
    Given a user with email notifications enabled
    And the seller "" replies with body "Hello" on listing "Sony Camera"
    When the message.received notification is triggered
    Then the email service receives a send request
    And the email body contains the seller name "Seller"

  # AC2: Draft Ready Notification (FR-NOTIFY-03)

  @FR-NOTIFY-03 @story-10-4 @E-010-S-4
  Scenario: Email is sent when AI generates a draft message for review
    Given a user with email notifications enabled
    And an AI draft "Would you take $350?" is ready for listing "Vintage Watch"
    When the message.draft_ready notification is triggered
    Then the email service receives a send request
    And the email subject contains "draft"
    And the email subject contains "Vintage Watch"
    And the email body contains the draft preview "Would you take $350?"
    And the email body contains the listing title "Vintage Watch"
    And the email body contains a review link

  @FR-NOTIFY-03 @story-10-4 @E-010-S-5
  Scenario: No draft-ready email is sent when user has disabled email notifications
    Given a user with email notifications disabled
    When the message.draft_ready notification is triggered
    Then no email is sent

  # AC3: Message Sent Notification (FR-NOTIFY-04)

  @FR-NOTIFY-04 @story-10-4 @E-010-S-6
  Scenario: Email is sent when a message is successfully sent
    Given a user with email notifications enabled
    And a message "Would you take $350?" was sent for listing "Vintage Watch"
    When the message.sent notification is triggered with delivery status "Delivered"
    Then the email service receives a send request
    And the email subject contains "sent"
    And the email subject contains "Vintage Watch"
    And the email body contains the message preview "Would you take $350?"
    And the email body contains the listing title "Vintage Watch"
    And the email body contains the delivery status "Delivered"

  @FR-NOTIFY-04 @story-10-4 @E-010-S-7
  Scenario: No sent-message email is sent when user has disabled email notifications
    Given a user with email notifications disabled
    When the message.sent notification is triggered with delivery status "Delivered"
    Then no email is sent

  # ── Story 10.1: Background Job Scheduler ──────────────────────────────────

  # AC-1: Scheduled Monitoring Trigger (infrastructure — no FR tags)

  @story-10-1 @E-010-S-8
  Scenario: The monitoring run API route exists at the expected path and exports a POST handler
    Given the monitoring run endpoint exists at "app/api/monitoring/run/route.ts"
    Then the monitoring route exports a POST handler
    And the monitoring route validates Authorization with timingSafeEqual

  @story-10-1 @E-010-S-9
  Scenario: The monitoring route source enforces a minimum API key length of 32 characters
    Given the monitoring run endpoint exists at "app/api/monitoring/run/route.ts"
    Then the monitoring route source enforces a minimum key length of 32

  # AC-2: Batch Listing Checks

  @story-10-1 @E-010-S-10
  Scenario: The listing tracker source orders by lastMonitoredAt ascending and supports a take limit
    Given the listing tracker source exists at "src/lib/listing-tracker.ts"
    Then the listing tracker source orders results by lastMonitoredAt ascending
    And the listing tracker source accepts a take parameter for cursor-based pagination

  # AC-3: Notification Event Creation

  @story-10-1 @E-010-S-11
  Scenario: buildDeduplicationKey encodes listingId, eventType, and current hour
    Given a listing id "listing-abc" and event type "listing.price_changed"
    When buildDeduplicationKey is called
    Then the dedup key contains "listing-abc"
    And the dedup key contains "listing.price_changed"
    And two calls within the same hour produce the same dedup key

  @story-10-1 @E-010-S-12
  Scenario: The notification-events source silently skips P2002 duplicate key violations
    Given the notification events source exists at "src/lib/notification-events.ts"
    Then the source catches P2002 errors without rethrowing
    And the source uses a deduplicationKey built from listingId, eventType, and hourBucket

  # AC-4: Retry with Exponential Backoff

  @story-10-1 @E-010-S-13
  Scenario: The monitoring service source wraps each listing check in a per-listing try/catch
    Given the monitoring job service source exists at "src/lib/monitoring-job.ts"
    Then the source contains per-listing error handling that does not abort the batch

  # AC-5: Concurrent Run Prevention

  @story-10-1 @E-010-S-14
  Scenario: The monitoring service source guards against concurrent runs via a P2002 catch
    Given the monitoring job service source exists at "src/lib/monitoring-job.ts"
    Then the source catches P2002 and throws an error with code "MONITORING_CONCURRENT"
    And the source does not use findFirst before create for the concurrency guard

  # AC-6: Stale Job Recovery

  @story-10-1 @E-010-S-15
  Scenario: The monitoring service source implements stale job recovery before each run
    Given the monitoring job service source exists at "src/lib/monitoring-job.ts"
    Then the source transitions stale RUNNING jobs to FAILED before starting a new run
    And the stale job error message is "Reaped: exceeded maximum run duration"

  # AC-7: Monitoring Effectiveness Canary

  @story-10-1 @E-010-S-16
  Scenario: Anomaly detection triggers when the unavailability ratio exceeds the threshold
    Given a platform with 10 checks and 4 marked unavailable
    When isAnomalyThresholdExceeded is evaluated at a 30 percent threshold
    Then the anomaly threshold is exceeded

  @story-10-1 @E-010-S-17
  Scenario: Anomaly detection requires at least 3 checks before triggering
    Given a platform with 2 checks and 2 marked unavailable
    When isAnomalyThresholdExceeded is evaluated at a 30 percent threshold
    Then the anomaly threshold is not exceeded

  # ── Story 10.2: Listing Monitoring Events ────────────────────────────────────

  # AC-1: Sold Detection (FR-MONITOR-01)

  @FR-MONITOR-01 @story-10-2 @E-010-S-18
  Scenario: Sold listing detected — status updated and sold event created
    Given the monitoring listing tracker module exists at "src/lib/listing-tracker.ts"
    Then the tracker source exports detectSoldStatus
    And the tracker source exports updateListingStateWithEvent with soldIndicator in StateChange

  # AC-2: Price Change Detection (FR-MONITOR-02)

  @FR-MONITOR-02 @story-10-2 @E-010-S-19
  Scenario: Price increase detected — event includes direction "increase" and changePercent
    Given the monitoring listing tracker module exists at "src/lib/listing-tracker.ts"
    Then the PriceChange interface includes a direction field
    And the tracker computes direction as "increase" for positive price change

  @FR-MONITOR-02 @story-10-2 @E-010-S-20
  Scenario: Price decrease detected — event includes direction "decrease"
    Given the monitoring listing tracker module exists at "src/lib/listing-tracker.ts"
    Then the tracker computes direction as "decrease" for negative price change

  @FR-MONITOR-02 @story-10-2 @E-010-S-21
  Scenario: Price change below threshold does not generate an event
    Given the monitoring listing tracker module exists at "src/lib/listing-tracker.ts"
    Then the tracker exports isPriceChangeMeaningful to guard price-change events

  # AC-3: Expiry Warning (FR-MONITOR-03)

  @FR-MONITOR-03 @story-10-2 @E-010-S-22
  Scenario: Craigslist listing approaching expiry creates an expiring event
    Given the listing expiry source exists at "src/lib/listing-expiry.ts"
    Then the source exports computeEstimatedExpiry
    And computeEstimatedExpiry returns a date 7 days after postedAt for CRAIGSLIST

  @FR-MONITOR-03 @story-10-2 @E-010-S-23
  Scenario: Listing not near expiry does not generate an expiring event
    Given the listing expiry source exists at "src/lib/listing-expiry.ts"
    Then getExpiringListings filters listings outside the 24-hour window

  @FR-MONITOR-03 @story-10-2 @E-010-S-24
  Scenario: Platform with no standard expiry (Mercari) returns null from computeEstimatedExpiry
    Given the listing expiry source exists at "src/lib/listing-expiry.ts"
    Then computeEstimatedExpiry returns null for MERCARI regardless of postedAt

  # AC-4: Unavailable Detection (FR-MONITOR-04)

  @FR-MONITOR-04 @story-10-2 @E-010-S-25
  Scenario: Listing genuinely removed (404) creates an unavailable event with reason "removed"
    Given the monitoring listing tracker module exists at "src/lib/listing-tracker.ts"
    Then classifyHttpResponse classifies 404 as removed

  @FR-MONITOR-04 @story-10-2 @E-010-S-26
  Scenario: Rate-limited response (403) is NOT treated as unavailable
    Given the monitoring listing tracker module exists at "src/lib/listing-tracker.ts"
    Then classifyHttpResponse classifies 403 as rate_limited

  @FR-MONITOR-04 @story-10-2 @E-010-S-27
  Scenario: Rate-limited response (429) is NOT treated as unavailable
    Given the monitoring listing tracker module exists at "src/lib/listing-tracker.ts"
    Then classifyHttpResponse classifies 429 as rate_limited

  # AC-5: Notification Events API

  @FR-MONITOR-01 @FR-MONITOR-02 @FR-MONITOR-03 @FR-MONITOR-04 @story-10-2 @E-010-S-28
  Scenario: GET /api/notifications route exists and exports a GET handler
    Given the notifications route exists at "app/api/notifications/route.ts"
    Then the notifications route exports a GET handler
    And the GET handler requires authentication

  @FR-MONITOR-01 @FR-MONITOR-02 @FR-MONITOR-03 @FR-MONITOR-04 @story-10-2 @E-010-S-29
  Scenario: GET /api/notifications supports offset/limit pagination
    Given the notifications route exists at "app/api/notifications/route.ts"
    Then the source uses page and limit query params with skip equal to page minus 1 times limit

  # AC-6: Mark Events Read

  @FR-MONITOR-01 @FR-MONITOR-02 @FR-MONITOR-03 @FR-MONITOR-04 @story-10-2 @E-010-S-30
  Scenario: PATCH /api/notifications/[id] route exists and exports a PATCH handler
    Given the notifications id route exists at "app/api/notifications/[id]/route.ts"
    Then the notifications id route exports a PATCH handler
    And the PATCH handler enforces ownership before updating

  # AC-7: SSE Real-Time Events

  @story-10-2 @E-010-S-31
  Scenario: SSE emitter type union includes all four monitoring event types
    Given the SSE emitter source exists at "src/lib/sse-emitter.ts"
    Then the SseEventType union includes "listing.sold"
    And the SseEventType union includes "listing.price_changed"
    And the SseEventType union includes "listing.expiring"
    And the SseEventType union includes "listing.unavailable"

  # ── Story 10.3: Flip Lifecycle Email Notifications ───────────────────────────

  # AC-1: Opportunity Found Email (FR-NOTIFY-01)

  @FR-NOTIFY-01 @story-10-3 @E-010-S-32
  Scenario: Opportunity found email is sent with platform, price, profit, score, and title
    Given a flip notification user with email notifications enabled and notifyNewDeals on
    And a pending "opportunity.found" event with platform "Craigslist" buy price 50 profit 80 score 85 title "Vintage Camera"
    When the flip lifecycle notification processor runs
    Then the result shows 1 email sent and 0 skipped
    And the sendOpportunityFound method was called with platform "Craigslist" and itemTitle "Vintage Camera"

  # AC-3: Flip Purchased Email (FR-NOTIFY-06)

  @FR-NOTIFY-06 @story-10-3 @E-010-S-33
  Scenario: Flip purchased email is sent with item title and purchase price
    Given a flip notification user with email notifications enabled and notifyNewDeals on
    And a pending "flip.purchased" event with itemTitle "Sony Headphones" purchasePrice 120 estimatedProfit 60 platform "Facebook"
    When the flip lifecycle notification processor runs
    Then the result shows 1 email sent and 0 skipped
    And the sendFlipPurchased method was called with itemTitle "Sony Headphones"

  # AC-4: Flip Listed Email (FR-NOTIFY-07)

  @FR-NOTIFY-07 @story-10-3 @E-010-S-34
  Scenario: Flip listed email is sent with destination platform and listing URL
    Given a flip notification user with email notifications enabled and notifyNewDeals on
    And a pending "flip.listed" event with itemTitle "iPad Pro" destinationPlatform "eBay" listingUrl "https://ebay.com/itm/12345"
    When the flip lifecycle notification processor runs
    Then the result shows 1 email sent and 0 skipped
    And the sendFlipListed method was called with destinationPlatform "eBay"

  # AC-2: Flip Sold Email (FR-NOTIFY-05)

  @FR-NOTIFY-05 @story-10-3 @E-010-S-35
  Scenario: Flip sold email is sent with sale price, actual profit, ROI percentage, and platform
    Given a flip notification user with email notifications enabled and notifyNewDeals on
    And a pending "flip.sold" event with itemTitle "MacBook Pro" salePrice 800 actualProfit 250 roiPercent 45 platform "eBay"
    When the flip lifecycle notification processor runs
    Then the result shows 1 email sent and 0 skipped
    And the sendFlipSold method was called with itemTitle "MacBook Pro" salePrice 800

  # AC-5: Notification Preference Respected

  @FR-NOTIFY-01 @FR-NOTIFY-05 @FR-NOTIFY-06 @FR-NOTIFY-07 @story-10-3 @E-010-S-36
  Scenario: Master emailNotifications toggle off suppresses all flip lifecycle emails
    Given a flip notification user with email notifications disabled
    And a pending "opportunity.found" event with platform "eBay" buy price 40 profit 50 score 75 title "Watch"
    And a pending "flip.sold" event with itemTitle "Watch" salePrice 90 actualProfit 40 roiPercent 100 platform "eBay"
    When the flip lifecycle notification processor runs
    Then the result shows 0 emails sent and 2 skipped due to preference disabled

  @FR-NOTIFY-01 @story-10-3 @E-010-S-37
  Scenario: notifyFrequency daily defers opportunity.found but flip.sold still sends instantly
    Given a flip notification user with email notifications enabled and notifyNewDeals on
    And the user notifyFrequency is "daily"
    And a pending "opportunity.found" event with platform "Craigslist" buy price 30 profit 40 score 72 title "Camera"
    And a pending "flip.sold" event with itemTitle "Camera" salePrice 70 actualProfit 30 roiPercent 100 platform "Craigslist"
    When the flip lifecycle notification processor runs
    Then the result shows 1 email sent
    And the result shows 1 event deferred due to frequency
    And the sendFlipSold method was called with itemTitle "Camera" salePrice 70

  @FR-NOTIFY-01 @story-10-3 @E-010-S-38
  Scenario: notifyNewDeals false suppresses opportunity.found emails but allows flip lifecycle
    Given a flip notification user with email notifications enabled and notifyNewDeals off
    And a pending "opportunity.found" event with platform "Mercari" buy price 20 profit 30 score 70 title "Toy"
    And a pending "flip.sold" event with itemTitle "Toy" salePrice 50 actualProfit 20 roiPercent 100 platform "Mercari"
    When the flip lifecycle notification processor runs
    Then the result shows 1 email sent and 1 skipped due to preference disabled
    And the sendFlipSold method was called with itemTitle "Toy" salePrice 50

  @FR-NOTIFY-01 @story-10-3 @E-010-S-39
  Scenario: More than 5 pending opportunity.found events for one user triggers digest aggregation
    Given a flip notification user with email notifications enabled and notifyNewDeals on
    And 6 pending "opportunity.found" events for the user each with valueScore 80
    When the flip lifecycle notification processor runs
    Then the result shows 1 email sent and 0 skipped
    And the sendDigest method was called once

  # ── Story 10.5: Smart Alert Email Notifications ──────────────────────────────

  # AC1: Review Received Alert (FR-NOTIFY-08)

  @FR-NOTIFY-08 @story-10-5 @E-010-S-40
  Scenario: The smart alert processor source exports processSmartAlertNotificationEvents
    Given the smart alert processor source exists at "src/lib/smart-alert-notification-processor.ts"
    Then the source exports "processSmartAlertNotificationEvents"
    And the source contains the event type "review.received"
    And the source contains the event type "listing.price_changed"

  @FR-NOTIFY-08 @story-10-5 @E-010-S-41
  Scenario: Email service exposes sendReviewReceived method
    Given the email service source exists at "src/lib/email-service.ts"
    Then the source exports "sendReviewReceived"
    And the source exports "sendFlipGoneCold"
    And the source exports "sendFlipTurnedHot"
    And the source exports "sendPriceChangeAlert"

  # AC2: Flip Gone Cold Alert (FR-NOTIFY-09)

  @FR-NOTIFY-09 @story-10-5 @E-010-S-42
  Scenario: Cold-hot detector source exports detectColdFlips with bidirectional logic
    Given the cold-hot detector source exists at "src/lib/cold-hot-detector.ts"
    Then the source exports "detectColdFlips"
    And the source contains bidirectional reason "user_not_replied"
    And the source contains bidirectional reason "seller_not_replied"

  @FR-NOTIFY-09 @story-10-5 @E-010-S-43
  Scenario: detectColdFlips returns user_not_replied when INBOUND message exceeds threshold
    Given the cold-hot detector is loaded with a mocked db
    And a listing "listing-1" has an INBOUND message from 30 hours ago
    When detectColdFlips is called with threshold 24
    Then the result contains a cold flip with reason "user_not_replied"
    And the result listing id is "listing-1"

  # AC3: Flip Turned Hot Alert (FR-NOTIFY-10)

  @FR-NOTIFY-10 @story-10-5 @E-010-S-44
  Scenario: Cold-hot detector source exports detectHotFlips
    Given the cold-hot detector source exists at "src/lib/cold-hot-detector.ts"
    Then the source exports "detectHotFlips"
    And the source counts consecutive INBOUND messages where readAt IS NULL

  @FR-NOTIFY-10 @story-10-5 @E-010-S-45
  Scenario: detectHotFlips returns hot flip when consecutive unread INBOUND messages meet threshold
    Given the cold-hot detector is loaded with a mocked db
    And a listing "listing-2" has 3 consecutive unread INBOUND messages
    When detectHotFlips is called with threshold 3
    Then the result contains a hot flip for listing "listing-2"
    And the hot flip consecutiveInboundCount is 3

  # AC4: Price Change Alert (FR-NOTIFY-11)

  @FR-NOTIFY-11 @story-10-5 @E-010-S-46
  Scenario: Smart alert processor handles listing.price_changed event type in phase 1
    Given the smart alert processor source exists at "src/lib/smart-alert-notification-processor.ts"
    Then the source contains the handler for "listing.price_changed"
    And the source validates direction as "increase" or "decrease"

  # AC5: User Preference Controls (FR-NOTIFY-08, FR-NOTIFY-09, FR-NOTIFY-10, FR-NOTIFY-11)

  @FR-NOTIFY-08 @FR-NOTIFY-09 @FR-NOTIFY-10 @FR-NOTIFY-11 @story-10-5 @E-010-S-47
  Scenario: UserSettings schema includes all six smart alert preference fields with defaults
    Given the Prisma schema exists at "prisma/schema.prisma"
    Then the schema includes field "notifyReviewReceived" with default "true"
    And the schema includes field "notifyFlipGoneCold" with default "true"
    And the schema includes field "notifyFlipTurnedHot" with default "true"
    And the schema includes field "notifyPriceChanges" with default "true"
    And the schema includes field "flipGoneColdHours" with default "24"
    And the schema includes field "flipTurnedHotCount" with default "3"

  # AC6/AC7: Deduplication and Rate Limiting (FR-NOTIFY-09, FR-NOTIFY-10, FR-NOTIFY-11)

  @FR-NOTIFY-09 @FR-NOTIFY-10 @FR-NOTIFY-11 @story-10-5 @E-010-S-48
  Scenario: Smart alert processor deduplicates events using a 4-hour time-windowed key
    Given the smart alert processor source exists at "src/lib/smart-alert-notification-processor.ts"
    Then the source contains deduplication window constant "DEDUP_WINDOW_MS"
    And the deduplication window equals 14400000 ms
    And the source catches P2002 errors to skip duplicate events

  @FR-NOTIFY-09 @FR-NOTIFY-10 @FR-NOTIFY-11 @story-10-5 @E-010-S-49
  Scenario: Smart alert processor caps alerts at 10 per user per cycle with hot alerts prioritised
    Given the smart alert processor source exists at "src/lib/smart-alert-notification-processor.ts"
    Then the source contains the constant "MAX_SMART_ALERTS_PER_USER_PER_CYCLE" with value 10
    And the source sorts hot flips before cold flips using a numeric priority field

  # ── Story 10.6: Notification Preferences UI ─────────────────────────────────

  # AC1: Notification Preferences Section Loads (FR-NOTIFY-12)

  @FR-NOTIFY-12 @story-10-6 @E-010-S-50
  Scenario: Notification preferences page shows all event categories with email toggles
    Given the NotificationSettings component source exists at "src/components/NotificationSettings.tsx"
    Then the source contains the category label "Flip Lifecycle"
    And the source contains the category label "Communication"
    And the source contains the category label "Smart Alerts"
    And the source contains the category label "Monitoring"
    And the source contains the category label "Digest"

  @FR-NOTIFY-12 @story-10-6 @E-010-S-51
  Scenario: NotificationSettings component exports all required notification row fields
    Given the NotificationSettings component source exists at "src/components/NotificationSettings.tsx"
    Then the source references the field "notifyNewDeals"
    And the source references the field "notifySoldItems"
    And the source references the field "notifyMessageReceived"
    And the source references the field "notifyDraftReady"
    And the source references the field "notifyMessageSent"
    And the source references the field "notifyReviewReceived"
    And the source references the field "notifyFlipGoneCold"
    And the source references the field "notifyFlipTurnedHot"
    And the source references the field "notifyListingUnavailable"
    And the source references the field "notifyExpiring"
    And the source references the field "notifyWeeklyDigest"

  # AC2: Toggle Email Off Per Event Type (FR-NOTIFY-12)

  @FR-NOTIFY-12 @story-10-6 @E-010-S-52
  Scenario: NotificationSettings component uses optimistic toggle with rollback pattern
    Given the NotificationSettings component source exists at "src/components/NotificationSettings.tsx"
    Then the source contains "previousSettings"
    And the source contains "setSettings(previousSettings)"
    And the source uses the PATCH method for saving toggles

  # AC3: Default Preferences for New Users (FR-NOTIFY-12)

  @FR-NOTIFY-12 @story-10-6 @E-010-S-53
  Scenario: Prisma schema includes notifyListingUnavailable with default true
    Given the Prisma schema exists at "prisma/schema.prisma"
    Then the schema includes field "notifyListingUnavailable" with default "true"

  @FR-NOTIFY-12 @story-10-6 @E-010-S-54
  Scenario: Settings API PATCH route handles notifyListingUnavailable as boolean
    Given the settings route source exists at "app/api/user/settings/route.ts"
    Then the source extracts "notifyListingUnavailable" from the request body
    And the source applies Boolean coercion to "notifyListingUnavailable"

  # AC4: Phase 2 Channel Placeholders (FR-NOTIFY-12)

  @FR-NOTIFY-12 @story-10-6 @E-010-S-55
  Scenario: NotificationSettings component renders Phase 2 Coming Soon placeholders for Push and SMS
    Given the NotificationSettings component source exists at "src/components/NotificationSettings.tsx"
    Then the source contains "Coming Soon"
    And the source renders disabled push toggle buttons for each event row
    And the source renders disabled SMS toggle buttons for each event row

  # AC5: Configurable Alert Thresholds (FR-NOTIFY-09, FR-NOTIFY-10, FR-NOTIFY-12)

  @FR-NOTIFY-09 @FR-NOTIFY-10 @FR-NOTIFY-12 @story-10-6 @E-010-S-56
  Scenario: NotificationSettings component exposes configurable threshold for Flip Gone Cold
    Given the NotificationSettings component source exists at "src/components/NotificationSettings.tsx"
    Then the source contains "flipGoneColdHours"
    And the source validates flipGoneColdHours minimum of 1 and maximum of 168

  @FR-NOTIFY-09 @FR-NOTIFY-10 @FR-NOTIFY-12 @story-10-6 @E-010-S-57
  Scenario: NotificationSettings component exposes configurable threshold for Flip Turned Hot
    Given the NotificationSettings component source exists at "src/components/NotificationSettings.tsx"
    Then the source contains "flipTurnedHotCount"
    And the source validates flipTurnedHotCount minimum of 1 and maximum of 20

  # ── Story 10.3: Task 7.4 — additional processor behaviour scenarios ──────────

  # Task 7.4 (i): Failed email is retried on next processor run

  @FR-NOTIFY-01 @FR-NOTIFY-05 @FR-NOTIFY-06 @FR-NOTIFY-07 @story-10-3 @E-010-S-58
  Scenario: Processor retries a FAILED event that has not exceeded MAX_RETRIES
    Given a flip notification user with email notifications enabled and notifyNewDeals on
    And a failed "opportunity.found" event with retryCount 1 below the max retry limit
    When the flip lifecycle notification processor runs
    Then the result shows 1 email sent

  # Task 7.4 (ii): Optimistic locking prevents double-processing

  @FR-NOTIFY-01 @FR-NOTIFY-05 @FR-NOTIFY-06 @FR-NOTIFY-07 @story-10-3 @E-010-S-59
  Scenario: Optimistic locking prevents double-processing when another run has already claimed the event
    Given a flip notification user with email notifications enabled and notifyNewDeals on
    And a pending "opportunity.found" event with platform "eBay" buy price 30 profit 40 score 75 title "Lamp"
    And the database reports the event was already claimed by another processor run
    When the flip lifecycle notification processor runs
    Then the result shows 0 emails sent

  # Task 7.4 (iii): Per-user rate limit hit

  @FR-NOTIFY-01 @FR-NOTIFY-05 @FR-NOTIFY-06 @FR-NOTIFY-07 @story-10-3 @E-010-S-60
  Scenario: Per-user email rate limit defers events when user exceeds hourly threshold
    Given a flip notification user with email notifications enabled and notifyNewDeals on
    And the user has already sent 10 emails in the last hour
    And a pending "opportunity.found" event with platform "Mercari" buy price 25 profit 35 score 72 title "Book"
    When the flip lifecycle notification processor runs
    Then the result shows 0 emails sent
    And the result shows 1 event rate limited

  # Task 7.4 (iv): Stale event skipped

  @FR-NOTIFY-01 @FR-NOTIFY-05 @FR-NOTIFY-06 @FR-NOTIFY-07 @story-10-3 @E-010-S-61
  Scenario: Events older than max event age are marked stale and skipped
    Given a flip notification user with email notifications enabled and notifyNewDeals on
    And a stale "opportunity.found" event created 72 hours ago
    When the flip lifecycle notification processor runs
    Then the result shows 0 emails sent
    And the result shows 1 stale event skipped

  # Task 7.4 (v): Provider circuit breaker triggers

  @FR-NOTIFY-01 @FR-NOTIFY-05 @FR-NOTIFY-06 @FR-NOTIFY-07 @story-10-3 @E-010-S-62
  Scenario: Provider circuit breaker halts the batch after 3 consecutive send failures
    Given a flip notification user with email notifications enabled and notifyNewDeals on
    And a pending "opportunity.found" event with platform "eBay" buy price 50 profit 70 score 82 title "Keyboard"
    And another pending "opportunity.found" event with platform "eBay" buy price 45 profit 60 score 78 title "Mouse"
    And another pending "opportunity.found" event with platform "eBay" buy price 40 profit 55 score 76 title "Monitor"
    And another pending "opportunity.found" event with platform "eBay" buy price 35 profit 50 score 74 title "Headset"
    And the email service will fail all sends with a provider error
    When the flip lifecycle notification processor runs
    Then the result shows 0 emails sent
    And the result shows 3 failed events

  # Task 7.4 (vi): Individual event failure does not abort the batch

  @FR-NOTIFY-01 @FR-NOTIFY-05 @FR-NOTIFY-06 @FR-NOTIFY-07 @story-10-3 @E-010-S-63
  Scenario: Individual event failure is recorded without aborting remaining events in the batch
    Given a flip notification user with email notifications enabled and notifyNewDeals on
    And a pending "opportunity.found" event with platform "Facebook" buy price 60 profit 80 score 88 title "Guitar"
    And another pending "opportunity.found" event with platform "Facebook" buy price 55 profit 75 score 85 title "Amp"
    And the email service will fail for the first send only
    When the flip lifecycle notification processor runs
    Then the result shows 1 email sent
    And the result shows 1 failed event
