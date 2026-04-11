@epic-9
Feature: Cross-Platform Resale Listing
  As a user
  I want AI-generated optimized titles and descriptions for resale listings
  So that my listings attract buyers and rank well in marketplace search

  # ── Story 9.1: AI Title & Description Generation ──────────────────────────

  # AC1: SEO-Optimized Title Generation (FR-RELIST-01)

  @FR-RELIST-01 @story-9-1 @E-009-S-1
  Scenario: Title generator produces an SEO-optimized eBay title with brand and model
    Given a purchased item with brand "Apple" model "iPhone 14" variant "256GB" condition "good"
    When the title generator runs for platform "ebay"
    Then the generated title is at most 80 characters
    And the generated title contains "Apple"
    And the generated title contains "iPhone 14"

  @FR-RELIST-01 @story-9-1 @E-009-S-2
  Scenario: eBay title respects the 80-character platform cap for long product names
    Given a purchased item with brand "Samsung" model "Galaxy S24 Ultra Titanium Black" variant "512GB Unlocked" condition "like_new"
    When the title generator runs for platform "ebay"
    Then the generated title is at most 80 characters

  # AC2: Platform-Specific Title Conventions (FR-RELIST-01)

  @FR-RELIST-01 @story-9-1 @E-009-S-3
  Scenario Outline: Each marketplace title respects its platform character cap
    Given a purchased item with brand "Sony" model "WH-1000XM5" variant "" condition "good"
    When the title generator runs for platform "<platform>"
    Then the generated title is at most <limit> characters

    Examples:
      | platform | limit |
      | ebay     | 80    |
      | mercari  | 40    |
      | facebook | 99    |
      | offerup  | 70    |

  # AC3: Platform-Specific Description Generation (FR-RELIST-02)

  @FR-RELIST-02 @story-9-1 @E-009-S-4
  Scenario: Description generator produces a non-empty eBay description with condition details
    Given a purchased item with brand "Apple" model "MacBook Pro" variant "M2 16GB" condition "like_new" and asking price 1200
    When the description generator runs for platform "ebay"
    Then the generated description is non-empty
    And the generated description mentions the condition

  @FR-RELIST-02 @story-9-1 @E-009-S-5
  Scenario: Facebook Marketplace description includes a local-pickup note
    Given a purchased item with brand "IKEA" model "Standing Desk" variant "" condition "good" and asking price 150
    When the description generator runs for platform "facebook"
    Then the generated description mentions "Local pickup"

  @FR-RELIST-02 @story-9-1 @E-009-S-6
  Scenario: Mercari description ships rather than offers local pickup
    Given a purchased item with brand "Nintendo" model "Switch OLED" variant "" condition "like_new" and asking price 250
    When the description generator runs for platform "mercari"
    Then the generated description mentions "Ships"

  # AC4: Algorithmic Fallback (FR-RELIST-07)

  @FR-RELIST-07 @story-9-1 @E-009-S-7
  Scenario: Title generator falls back to algorithmic when no API key is configured
    Given the OpenAI API key is not configured
    And a purchased item with brand "Bose" model "QuietComfort 45" variant "" condition "good"
    When the title generator runs for platform "ebay" using LLM mode
    Then a title is still produced

  @FR-RELIST-07 @story-9-1 @E-009-S-8
  Scenario: Description generator falls back to algorithmic when no API key is configured
    Given the OpenAI API key is not configured
    And a purchased item with brand "Bose" model "QuietComfort 45" variant "" condition "good" and asking price 180
    When the description generator runs for platform "ebay" using LLM mode
    Then a description is still produced

  # AC5: Editable Draft Display (FR-RELIST-01, FR-RELIST-02)

  @FR-RELIST-01 @FR-RELIST-02 @story-9-1 @E-009-S-9
  Scenario: Generated content is returned as editable string fields
    Given a purchased item with brand "Apple" model "iPad Pro" variant "11 inch" condition "good" and asking price 600
    When the title generator runs for platform "ebay"
    And the description generator runs for platform "ebay"
    Then both the title and description are mutable strings

  # API and route structural assertions

  @FR-RELIST-01 @FR-RELIST-02 @FR-RELIST-07 @story-9-1 @E-009-S-10
  Scenario: The generate-resale-content API route exists at the expected path
    Given the resale content generation API endpoint exists at "app/api/listings/[id]/generate-resale-content/route.ts"
    Then the resale content route returns the unified shape with titles, descriptions, primary, source, and warnings

  @FR-RELIST-01 @story-9-1 @E-009-S-11
  Scenario: The posting queue auto-generates title and description from listing data
    Given the posting queue route exists at "app/api/posting-queue/route.ts"
    Then the posting queue route imports the algorithmic title and description generators

  # ── Story 9.2: Optimal Listing Price Calculation ──────────────────────────

  # AC-1: Optimal price from verified market data (FR-RELIST-03)

  @FR-RELIST-03 @story-9-2 @E-009-S-12
  Scenario: Optimal price formula achieves the target margin after fees and shipping
    Given a purchased item with cost basis 50 and shipping cost 8
    When the optimal price calculator runs for platform "ebay" with target margin 30
    Then the recommended price equals 101.75
    And the estimated fees equal 13.23
    And the estimated profit equals 30.52

  @FR-RELIST-03 @story-9-2 @E-009-S-13
  Scenario: Recommended price is capped at 95% of verified market value
    Given a purchased item with cost basis 50 and shipping cost 8
    And verified market value 90 with comp confidence "high"
    When the optimal price calculator runs for platform "ebay" with target margin 30
    Then the recommended price equals 85.5
    And the result is flagged as capped by market

  # AC-2: Price breakdown display (FR-RELIST-03)

  @FR-RELIST-03 @story-9-2 @E-009-S-14
  Scenario: Multi-platform comparison sorts platforms by estimated profit
    Given a purchased item with cost basis 50 and shipping cost 8
    When the multi-platform price calculator runs with target margin 30
    Then five platform results are returned
    And the results are sorted by estimated profit descending
    And a best platform is recommended

  # AC-3: Real-time margin adjustment (FR-RELIST-03)

  @FR-RELIST-03 @story-9-2 @E-009-S-15
  Scenario: PriceCalculator client recalculation matches the server formula
    Given a purchased item with cost basis 50 and shipping cost 8
    When the PriceCalculator client recalculates for margin 25 on platform "ebay"
    Then the client recommended price equals the server formula price for margin 25

  # AC-4: Edge case handling (FR-RELIST-03)

  @FR-RELIST-03 @story-9-2 @E-009-S-16
  Scenario: Margin plus platform fee exceeding 100% throws a validation error
    Given a purchased item with cost basis 50 and shipping cost 8
    When the optimal price calculator runs for platform "ebay" with target margin 90
    Then a validation error is raised about margin plus fees

  @FR-RELIST-03 @story-9-2 @E-009-S-17
  Scenario: Free item ($0 cost basis) uses market-based pricing instead of cost-plus
    Given a free item with verified market value 100
    When the optimal price calculator runs for platform "ebay" with target margin 30
    Then the recommended price equals 73.95
    And the result is flagged as free-item pricing

  @FR-RELIST-03 @story-9-2 @E-009-S-18
  Scenario: Market cap forcing price below cost basis emits a loss warning
    Given a purchased item with cost basis 50 and shipping cost 8
    And verified market value 60 with comp confidence "high"
    When the optimal price calculator runs for platform "ebay" with target margin 30
    Then the result has loss warning true
    And the loss amount is greater than 0

  # AC-5: Pre-purchase price projection (FR-RELIST-03)

  @FR-RELIST-03 @story-9-2 @E-009-S-19
  Scenario: Pre-purchase listings use askingPrice as cost basis and label result as projected
    Given a listing with no opportunity and asking price 60 and shipping cost 8
    When the optimal price calculator runs for platform "ebay" with target margin 30
    Then the result is marked as projected
    And the cost basis equals 68

  # API route structural assertions

  @FR-RELIST-03 @story-9-2 @E-009-S-20
  Scenario: The optimal-price API route exists at the expected path
    Given the optimal price API endpoint exists at "app/api/listings/[id]/optimal-price/route.ts"
    Then the optimal price route exports GET and POST handlers
    And the optimal price route enforces priceHistory feature access

  # ── Story 9.3: Cross-Platform Posting Queue ───────────────────────────────

  # AC1: Platform Selection & Queue Creation (FR-RELIST-04)

  @FR-RELIST-04 @story-9-3 @E-009-S-21
  Scenario: Platform selection creates a PostingQueueItem per target platform
    Given a resale listing ready to cross-post
    When the user selects platforms "EBAY,MERCARI"
    Then a posting queue item exists for each selected platform with status "PENDING"
    And no posting queue item is created for the source platform

  # AC2 & AC3: Queue Processing — PENDING -> IN_PROGRESS -> POSTED (FR-RELIST-05)

  @FR-RELIST-05 @story-9-3 @E-009-S-22
  Scenario: Queue processing transitions items from PENDING through POSTED on success
    Given a pending posting queue item for platform "EBAY"
    And a successful platform poster registered for "EBAY"
    When the posting queue processor runs for the authenticated user
    Then the item status transitions through "IN_PROGRESS" to "POSTED"
    And the posted item stores the external post URL returned by the poster

  # AC4: Failure Handling — Retry Logic (FR-RELIST-05)

  @FR-RELIST-05 @story-9-3 @E-009-S-23
  Scenario: Failing posts are retried up to maxRetries before being marked FAILED
    Given a pending posting queue item for platform "EBAY" with retry count 3 and max retries 3
    And a failing platform poster registered for "EBAY"
    When the posting queue processor runs for the authenticated user
    Then the item status becomes "FAILED"
    And the error message is persisted on the queue item

  # AC5: Duplicate Prevention (FR-RELIST-06)

  @FR-RELIST-06 @story-9-3 @E-009-S-24
  Scenario: Batch posting skips a platform already queued for the listing
    Given a pending posting queue item already exists for "EBAY"
    When the user batch-selects platforms "EBAY,MERCARI"
    Then exactly one additional queue item is created for "MERCARI"
    And the existing "EBAY" queue item is left untouched

  # User-scoped processing guard (FR-RELIST-05)

  @FR-RELIST-05 @story-9-3 @E-009-S-25
  Scenario: The queue processor only touches items belonging to the authenticated user
    Given a pending posting queue item for user A on platform "EBAY"
    And a pending posting queue item for user B on platform "EBAY"
    And a successful platform poster registered for "EBAY"
    When the posting queue processor runs for user A
    Then the user A item becomes "POSTED"
    And the user B item remains "PENDING"

  # Process API endpoint and platform poster stubs

  @FR-RELIST-05 @story-9-3 @E-009-S-26
  Scenario: The posting queue process API route exists at the expected path
    Given the process API endpoint exists at "app/api/posting-queue/process/route.ts"
    Then the process route imports ensurePostersRegistered from the platform-posters module

  @FR-RELIST-04 @story-9-3 @E-009-S-27
  Scenario: The platform posters module registers stubs for all four target platforms
    Given the platform posters module exists at "src/lib/platform-posters/index.ts"
    When ensurePostersRegistered is invoked
    Then stubs are registered for EBAY, FACEBOOK_MARKETPLACE, MERCARI, and OFFERUP
    And each stub returns success false with a descriptive error message

  # ── Story 9.4: Image Reuse for Cross-Posting ──────────────────────────────

  # AC-1: Automatic image attachment from Firebase Storage (FR-RELIST-08)

  @FR-RELIST-08 @story-9-4 @E-009-S-28
  Scenario: Eager-loaded Firebase Storage images are attached to the platform poster
    Given a pending posting queue item for platform "EBAY" with 2 Firebase Storage images
    And a listing-capturing successful platform poster registered for "EBAY"
    When the posting queue processor runs for the authenticated user
    Then the platform poster receives a listing with 2 images
    And the images are sorted by imageIndex ascending

  # AC-2: Images retrieved from eager-loaded relation without N+1 queries (FR-RELIST-08)

  @FR-RELIST-08 @story-9-4 @E-009-S-29
  Scenario: Batch processing of multiple queue items for the same listing runs a single image query
    Given 2 pending posting queue items for platforms "EBAY,MERCARI" sharing one listing
    And a listing-capturing successful platform poster registered for "EBAY"
    And a listing-capturing successful platform poster registered for "MERCARI"
    When the posting queue processor runs for the authenticated user
    Then only one findMany call resolves both queue items with images

  # Defense-in-depth ownership assertion (FR-RELIST-08)

  @FR-RELIST-08 @story-9-4 @E-009-S-30
  Scenario: Queue item whose listing belongs to a different user is marked FAILED
    Given a pending posting queue item whose listing belongs to a different user
    And a listing-capturing successful platform poster registered for "EBAY"
    When the posting queue processor runs for the authenticated user
    Then the ownership-mismatch item status becomes "FAILED"
    And the ownership-mismatch error message is persisted on the queue item

  # AC-3: Fallback for legacy listings (FR-RELIST-08)

  @FR-RELIST-08 @story-9-4 @E-009-S-31
  Scenario: Listings without ListingImage records fall back to the legacy imageUrls column
    Given a pending posting queue item whose listing has only legacy imageUrls
    And a listing-capturing successful platform poster registered for "EBAY"
    And the legacy image downloader returns one captured image
    When the posting queue processor runs for the authenticated user
    Then the legacy image downloader is invoked once
    And the platform poster receives a listing with 1 image

  @FR-RELIST-08 @story-9-4 @E-009-S-32
  Scenario: Legacy image download failure does not block queue processing
    Given a pending posting queue item whose listing has only legacy imageUrls
    And a listing-capturing successful platform poster registered for "EBAY"
    And the legacy image downloader throws an error
    When the posting queue processor runs for the authenticated user
    Then the legacy-fallback item status becomes "POSTED"

  # Computed imageStatus field on API responses (FR-RELIST-08)

  @FR-RELIST-08 @story-9-4 @E-009-S-33
  Scenario: The posting queue API imageStatus helper reports all three states
    Given the posting queue image status helper exists at "src/lib/posting-queue-image-status.ts"
    Then the helper returns "available" when the listing has ListingImage records
    And the helper returns "legacy-fallback" when only the legacy imageUrls column is populated
    And the helper returns "manual-upload-required" when neither source has URLs

  # Structural assertion: PlatformPoster type accepts ListingWithImages

  @FR-RELIST-08 @story-9-4 @E-009-S-34
  Scenario: The posting queue processor eager-loads images in its findMany include
    Given the posting queue processor exists at "src/lib/posting-queue-processor.ts"
    Then the processor source declares the PlatformPoster type accepts ListingWithImages
    And the processor source eagerly loads images ordered by imageIndex
