@epic-3
Feature: Multi-Marketplace Scanning & Image Capture
  As a user
  I want to scrape Craigslist listings based on my search criteria
  So that I can find underpriced items for flipping

  Background:
    Given the Craigslist scraper module exists

  # AC #1: Playwright launches headless Chromium with custom user agent
  @E-003-S-001 @FR-SCAN-01 @story-3-1
  Scenario: Scraper module launches browser with anti-detection measures
    Given the scraper configuration at "src/scrapers/craigslist/scraper.ts"
    When I inspect the browser launch configuration
    Then it should launch Chromium in headless mode
    And it should pass "--disable-blink-features=AutomationControlled" as a launch argument
    And it should set a custom user agent from a rotation pool
    And the user agent pool should contain at least 5 entries
    And all user agents should reference Chrome version 130 or higher

  # AC #2: Multi-selector fallback extraction
  @E-003-S-002 @FR-SCAN-01 @story-3-1
  Scenario: Scraper uses multiple selector fallbacks for extraction
    Given the scraper extraction logic at "src/scrapers/craigslist/scraper.ts"
    When I inspect the DOM extraction selectors
    Then it should try ".cl-search-result" first
    And it should fall back to ".result-row"
    And it should fall back to ".gallery-card"
    And it should fall back to "li.cl-static-search-result"
    And it should filter out sponsored listings

  # AC #3: Complete data extraction
  @E-003-S-003 @FR-SCAN-11 @story-3-1
  Scenario: Scraper extracts all required listing fields
    Given the scraper types at "src/scrapers/craigslist/types.ts"
    When I inspect the CraigslistItem interface
    Then it should include a "title" field
    And it should include a "price" field of type number
    And it should include a "url" field
    And it should include a "location" field
    And it should include a "externalId" field
    And it should include an optional "description" field
    And it should include an optional "condition" field
    And it should include an optional "imageUrls" field

  # AC #4: Browser cleanup in finally block
  @E-003-S-004 @FR-SCAN-01 @story-3-1
  Scenario: Browser is always closed regardless of success or failure
    Given the scraper function at "src/scrapers/craigslist/scraper.ts"
    When I inspect the scrapeCraigslist function
    Then it should close the browser in a finally block
    And it should handle browser close errors gracefully

  # AC #5: Anti-detection with user agent rotation and rate limiting
  @E-003-S-005 @FR-SCAN-10 @story-3-1
  Scenario: Anti-detection measures are applied during scraping
    Given the scraper configuration at "src/scrapers/craigslist/scraper.ts"
    When I inspect the anti-detection features
    Then it should rotate user agents from a pool of current versions
    And it should add randomized delays between interactions
    And it should set navigator.webdriver to false via addInitScript
    And it should use randomized viewport dimensions between 1280x800 and 1920x1080

  # Additional coverage: Module structure
  @E-003-S-006 @FR-SCAN-01 @story-3-1
  Scenario: Scraper is organized as a proper module
    Given the scraper module directory at "src/scrapers/craigslist"
    When I inspect the scraper module structure
    Then "src/scrapers/craigslist/index.ts" should exist as the public entry point
    And "src/scrapers/craigslist/scraper.ts" should contain the core scraping logic
    And "src/scrapers/craigslist/types.ts" should contain TypeScript interfaces
    And the route at "app/api/scraper/craigslist/route.ts" should import from "@/scrapers/craigslist"

  # Additional coverage: Concurrent job guard
  @E-003-S-007 @FR-SCAN-01 @story-3-1
  Scenario: Only one Craigslist scraper job per user can run simultaneously
    Given the scraper module exports "hasRunningJob"
    When I inspect the concurrent job guard logic
    Then the route should check for existing RUNNING jobs before starting a new one
    And it should return a 403 error if a job is already running

  # Additional coverage: Zero-results detection
  @E-003-S-008 @FR-SCAN-01 @story-3-1
  Scenario: Scraper detects zero results as potential selector breakage
    Given the scraper response type includes "failureReason"
    When the page loads but no listings are extracted
    Then the scraper should return success as false
    And the failure reason should be "selector_failure_suspected"
    And the route should emit a "job.failed" SSE event

  # Additional coverage: Marketplace scanner integration
  @E-003-S-009 @FR-SCAN-01 @story-3-1
  Scenario: Route integrates with marketplace-scanner canonical processor
    Given the route at "app/api/scraper/craigslist/route.ts"
    When I inspect the analysis pipeline
    Then it should use "processListings" from marketplace-scanner for algorithmic analysis
    And it should use "generateScanSummary" for response formatting
    And it should include a summary with averageScore and categoryCounts in the response

  # =================================================================
  # Story 3.2: eBay Browse API Integration
  # =================================================================

  # AC #1: OAuth token authentication for eBay Browse API
  @E-003-S-010 @FR-SCAN-02 @story-3-2
  Scenario: eBay scraper authenticates with OAuth Bearer token
    Given the eBay scraper module at "src/scrapers/ebay/scraper.ts"
    When I inspect the callEbayApi function
    Then it should include an "Authorization" header with "Bearer" prefix and the EBAY_OAUTH_TOKEN
    And it should include "X-EBAY-C-MARKETPLACE-ID" header set to "EBAY_US"
    And it should call the eBay Browse API v1 endpoint "/item_summary/search"

  # AC #2: Response normalization to RawListing format
  @E-003-S-011 @FR-SCAN-02 @story-3-2
  Scenario: eBay listings are normalized to RawListing format
    Given the eBay scraper module at "src/scrapers/ebay/scraper.ts"
    When I inspect the convertEbayItemsToNormalized function
    Then it should map itemId to externalId
    And it should map itemWebUrl to url
    And it should map title to title
    And it should parse price.value to askingPrice as a float
    And it should map condition to condition
    And it should build location from itemLocation fields
    And it should collect primary and additional image URLs
    And it should map seller.username to sellerName

  # AC #3: eBay search filters mapped to API parameters
  @E-003-S-012 @FR-SCAN-02 @story-3-2
  Scenario: Search filters are mapped to eBay Browse API parameters
    Given the eBay scraper module at "src/scrapers/ebay/scraper.ts"
    When I inspect the buildFilterString function
    Then it should always include "buyingOptions:{FIXED_PRICE}"
    And it should map categoryId to the "category_ids" query parameter
    And it should map condition to "conditions:{CONDITION}" filter format
    And it should map price range to "price:[min..max]" filter format
    And it should support all 6 categories: Electronics, Clothing, Collectibles, Musical Instruments, Video Games, Antiques
    And it should support conditions: NEW, OPEN_BOX, CERTIFIED_REFURBISHED, EXCELLENT_REFURBISHED, VERY_GOOD_REFURBISHED, USED

  # AC #4: Token error handling
  @E-003-S-013 @FR-SCAN-02 @story-3-2
  Scenario: eBay scraper handles missing or expired OAuth token
    Given the eBay scraper module at "src/scrapers/ebay/scraper.ts"
    When I inspect the error handling logic
    Then it should throw ConfigurationError when EBAY_OAUTH_TOKEN is not set
    And it should throw ExternalServiceError on 401 or 403 API responses indicating expired token
    And it should throw RateLimitError on 429 API responses
    And the GET endpoint should return status "missing_token" when token is not configured

  # Module structure
  @E-003-S-014 @FR-SCAN-02 @story-3-2
  Scenario: eBay scraper is organized as a proper module
    Given the scraper module directory at "src/scrapers/ebay"
    When I inspect the eBay scraper module structure
    Then "src/scrapers/ebay/index.ts" should exist as the public entry point
    And "src/scrapers/ebay/scraper.ts" should contain the core API integration logic
    And "src/scrapers/ebay/types.ts" should contain TypeScript interfaces
    And the route at "app/api/scraper/ebay/route.ts" should import from "@/scrapers/ebay"

  # Marketplace scanner integration
  @E-003-S-015 @FR-SCAN-02 @story-3-2
  Scenario: eBay route integrates with marketplace-scanner canonical processor
    Given the route at "app/api/scraper/ebay/route.ts"
    When I inspect the eBay analysis pipeline
    Then it should use "processListings" from marketplace-scanner for viability analysis
    And it should use "formatForStorage" for database-ready format
    And it should use "generateScanSummary" for consistent response format
    And it should emit SSE events with emitEvents:true for real-time notifications

  # =================================================================
  # Story 3.3: Facebook Marketplace Scraper
  # =================================================================

  # AC #1: Graph API primary path with OAuth token
  @E-003-S-016 @FR-SCAN-03 @story-3-3
  Scenario: Facebook scraper uses Graph API as primary search method
    Given the Facebook route at "app/api/scraper/facebook/route.ts"
    When I inspect the Facebook Graph API integration
    Then it should call the Facebook Graph API v19.0 marketplace_search endpoint
    And it should use "getToken" from token-store for decrypted OAuth token retrieval
    And it should check token expiry before making API calls
    And it should include "access_token" as a query parameter

  # AC #2: Stagehand fallback when Graph API fails
  @E-003-S-017 @FR-SCAN-03 @story-3-3
  Scenario: Facebook scraper falls back to Stagehand when Graph API fails
    Given the Facebook route at "app/api/scraper/facebook/route.ts"
    When I inspect the Facebook fallback chain
    Then it should import "scrapeAndConvert" from the Stagehand scraper module
    And it should catch Graph API errors and attempt Stagehand fallback
    And it should map category IDs to Stagehand category names via CATEGORY_ID_TO_STAGEHAND_NAME
    And it should track the method used as "graph-api" or "stagehand" in the response

  # AC #3: RawListing normalization from both paths
  @E-003-S-018 @FR-SCAN-03 @story-3-3
  Scenario: Facebook listings are normalized to RawListing format from both paths
    Given the Facebook route at "app/api/scraper/facebook/route.ts"
    When I inspect the Facebook listing normalization
    Then it should have a "convertGraphApiToRawListing" function for Graph API results
    And it should map item.id to externalId for Graph API listings
    And it should parse price strings to numeric askingPrice values
    And it should format location from city, state, and zip fields

  # AC #3: Stagehand normalization
  @E-003-S-019 @FR-SCAN-03 @story-3-3
  Scenario: Stagehand scraper normalizes listings to RawListing format
    Given the Facebook scraper module at "src/scrapers/facebook/scraper.ts"
    When I inspect the Facebook Stagehand normalization
    Then it should have a "convertToRawListing" export for Stagehand results
    And it should generate external IDs from URL patterns or title-price hashes
    And it should handle price strings like "$1,299.99" and "Free"

  # AC #4: Exponential backoff on rate limiting
  @E-003-S-020 @FR-SCAN-10 @story-3-3
  Scenario: Facebook scraper applies exponential backoff on rate limits
    Given the Facebook route at "app/api/scraper/facebook/route.ts"
    When I inspect the Facebook rate limit handling
    Then it should detect HTTP 429 responses as rate limiting
    And it should apply exponential backoff with initial delay of 2000ms
    And it should cap backoff at 30000ms maximum
    And it should retry up to 3 times before failing

  # AC #4: Token expiry and auth error handling
  @E-003-S-021 @FR-SCAN-10 @story-3-3
  Scenario: Facebook scraper handles token expiry and auth errors
    Given the Facebook route at "app/api/scraper/facebook/route.ts"
    When I inspect the Facebook auth error handling
    Then it should detect 401 and 403 responses as token errors
    And it should emit SSE "job.failed" events on auth failures
    And it should throw UnauthorizedError for expired or revoked tokens
    And it should NOT retry on auth errors

  # Concurrent job guard
  @E-003-S-022 @FR-SCAN-10 @story-3-3
  Scenario: Only one Facebook scraper job per user can run simultaneously
    Given the Facebook route at "app/api/scraper/facebook/route.ts"
    When I inspect the Facebook concurrent job guard
    Then the route should check for RUNNING jobs with platform FACEBOOK_MARKETPLACE
    And it should throw ValidationError if a job is already running

  # Marketplace scanner integration
  @E-003-S-023 @FR-SCAN-03 @story-3-3
  Scenario: Facebook route integrates with marketplace-scanner canonical processor
    Given the Facebook route at "app/api/scraper/facebook/route.ts"
    When I inspect the Facebook analysis pipeline
    Then it should use "processListings" from marketplace-scanner for batch analysis
    And it should use "formatForStorage" for database-ready listing format
    And it should use "generateScanSummary" for response summary generation
    And it should pass emitEvents true and userId for SSE event emission
    And it should emit "job.progress" SSE events during listing saves
    And it should emit "job.complete" SSE events on successful completion

  # Module structure
  @E-003-S-024 @FR-SCAN-03 @story-3-3
  Scenario: Facebook scraper is organized as a proper module with token management
    Given the scraper module directory at "src/scrapers/facebook"
    When I inspect the Facebook scraper module structure
    Then "src/scrapers/facebook/index.ts" should exist as a public entry point
    And "src/scrapers/facebook/scraper.ts" should contain Stagehand scraping logic
    And "src/scrapers/facebook/types.ts" should contain Zod schemas and TypeScript interfaces
    And "src/scrapers/facebook/token-store.ts" should contain encrypted token management
    And "src/scrapers/facebook/auth.ts" should contain OAuth flow logic

  # Anti-detection: Stagehand jitter delay
  @E-003-S-025 @FR-SCAN-10 @story-3-3
  Scenario: Stagehand scraper applies anti-detection delay jitter
    Given the Facebook scraper module at "src/scrapers/facebook/scraper.ts"
    When I inspect the Facebook Stagehand anti-detection features
    Then it should add randomized delay jitter between detail page fetches
    And it should dismiss login popups via AI actions
    And it should close Stagehand in a finally block

  # =================================================================
  # Story 3.4: Mercari Scraper
  # =================================================================

  # AC #1: Internal API as primary scraping method
  @E-003-S-026 @FR-SCAN-04 @story-3-4
  Scenario: Mercari scraper uses internal API as primary method
    Given the Mercari scraper module at "src/scrapers/mercari/scraper.ts"
    When I inspect the Mercari API integration
    Then it should call the Mercari internal API at "https://www.mercari.com/v1/api"
    And it should use POST method to the "/search" endpoint
    And it should include browser-mimicking headers with "X-Platform" set to "web"
    And it should include "Sec-Fetch-Dest", "Sec-Fetch-Mode", and "Sec-Fetch-Site" headers

  # AC #2: Playwright fallback when API fails
  @E-003-S-027 @FR-SCAN-04 @story-3-4
  Scenario: Mercari scraper falls back to Playwright when API is blocked
    Given the Mercari scraper module at "src/scrapers/mercari/scraper.ts"
    When I inspect the Mercari Playwright fallback
    Then it should have a "scrapeMercariWithPlaywright" exported async function
    And it should launch Chromium with "--disable-blink-features=AutomationControlled"
    And it should navigate to "https://www.mercari.com/search/" with search params
    And it should extract listing data via page.evaluate DOM traversal
    And it should close the browser in a finally block
    And it should have a 60-second session timeout

  # AC #3: RawListing normalization
  @E-003-S-028 @FR-SCAN-04 @story-3-4
  Scenario: Mercari listings are normalized to RawListing format
    Given the Mercari scraper module at "src/scrapers/mercari/scraper.ts"
    When I inspect the Mercari listing normalization
    Then it should have a "convertMercariToRawListing" exported function
    And it should map item.id to externalId
    And it should map item.name to title
    And it should map item.price to askingPrice
    And it should use normalizeCondition for condition mapping
    And it should use formatLocation for location extraction
    And it should use collectImageUrls for image URL collection

  # AC #4: Exponential backoff on rate limiting
  @E-003-S-029 @FR-SCAN-10 @story-3-4
  Scenario: Mercari scraper applies exponential backoff on rate limits
    Given the Mercari scraper module at "src/scrapers/mercari/scraper.ts"
    When I inspect the Mercari rate limit handling
    Then it should detect HTTP 429 status as rate limiting
    And it should detect HTML responses as rate limiting via isRateLimitOrBlock
    And it should retry up to MAX_RETRIES times before Playwright fallback
    And it should apply exponential backoff with BACKOFF_BASE_MS base delay
    And it should throw RateLimitError when both API and Playwright fail

  # Anti-detection measures
  @E-003-S-030 @FR-SCAN-10 @story-3-4
  Scenario: Mercari scraper applies anti-detection measures
    Given the Mercari types at "src/scrapers/mercari/types.ts"
    When I inspect the Mercari anti-detection configuration
    Then the user agent pool should contain at least 6 entries
    And all Mercari user agents should reference Chrome version 130 or higher
    And viewport randomization should be configured between 1280-1920 width and 800-1080 height
    And it should include randomized Accept-Language header variants

  # Module structure
  @E-003-S-031 @FR-SCAN-04 @story-3-4
  Scenario: Mercari scraper is organized as a proper module
    Given the scraper module directory at "src/scrapers/mercari"
    When I inspect the Mercari scraper module structure
    Then "src/scrapers/mercari/index.ts" should exist as a public entry point
    And "src/scrapers/mercari/scraper.ts" should contain the Mercari scraping logic
    And "src/scrapers/mercari/types.ts" should contain TypeScript interfaces
    And the route at "app/api/scraper/mercari/route.ts" should import from "@/scrapers/mercari"

  # Marketplace scanner integration
  @E-003-S-032 @FR-SCAN-04 @story-3-4
  Scenario: Mercari route integrates with marketplace-scanner canonical processor
    Given the Mercari route at "app/api/scraper/mercari/route.ts"
    When I inspect the Mercari analysis pipeline
    Then it should use "analyzeListing" from marketplace-scanner
    And it should use "formatForStorage" for database-ready format
    And it should use "generateScanSummary" for consistent response format
    And it should emit SSE events via sseEmitter for real-time notifications

  # Standardized error handling
  @E-003-S-033 @FR-SCAN-04 @story-3-4
  Scenario: Mercari scraper uses standardized error handling
    Given the Mercari route at "app/api/scraper/mercari/route.ts"
    When I inspect the Mercari error handling
    Then it should use "handleError" from errors module for RFC 7807 responses
    And it should use ValidationError for missing keywords
    And the scraper should use ExternalServiceError for API failures
    And the scraper should use RateLimitError for rate limit detection

  # =================================================================
  # Story 3.5: OfferUp Scraper
  # =================================================================

  # AC #1: Playwright launches with anti-automation flags and resource blocking
  @E-003-S-034 @FR-SCAN-05 @story-3-5
  Scenario: OfferUp scraper launches browser with anti-detection measures
    Given the OfferUp scraper configuration at "src/scrapers/offerup/scraper.ts"
    When I inspect the OfferUp browser launch configuration
    Then it should launch Chromium in headless mode
    And it should pass "--disable-blink-features=AutomationControlled" as a launch argument
    And it should set a custom user agent from a rotation pool
    And the OfferUp user agent pool should contain at least 6 entries
    And all OfferUp user agents should reference Chrome version 130 or higher
    And it should block resource types including images, fonts, and analytics for speed

  # AC #2: Listings normalized to RawListing with platform "OFFERUP"
  @E-003-S-035 @FR-SCAN-05 @story-3-5
  Scenario: OfferUp listings are normalized to RawListing format
    Given the OfferUp scraper module at "src/scrapers/offerup/scraper.ts"
    When I inspect the toRawListing function
    Then it should map OfferUpItem fields to RawListing format
    And it should set sellerContact to explicit null
    And it should use the search location as fallback when listing location is empty
    And it should map externalId, url, title, askingPrice, condition, sellerName, imageUrls, and postedAt

  # AC #2: Complete data extraction types
  @E-003-S-036 @FR-SCAN-05 @story-3-5
  Scenario: OfferUp scraper extracts all required listing fields
    Given the OfferUp types at "src/scrapers/offerup/types.ts"
    When I inspect the OfferUpItem interface
    Then it should include a "title" field
    And it should include a "price" field of type number
    And it should include a "url" field
    And it should include a "location" field
    And it should include a "externalId" field
    And it should include an optional "description" field
    And it should include an optional "condition" field
    And it should include an optional "imageUrls" field

  # AC #3: Anti-detection measures - UA rotation, human-like delays, exponential backoff
  @E-003-S-037 @FR-SCAN-10 @story-3-5
  Scenario: OfferUp anti-detection measures are applied during scraping
    Given the OfferUp scraper configuration at "src/scrapers/offerup/scraper.ts"
    When I inspect the OfferUp anti-detection features
    Then it should rotate user agents from a pool of current Chrome versions
    And it should add randomized delays between interactions (500ms-2s)
    And it should set navigator.webdriver to false via addInitScript
    And it should use randomized viewport dimensions between 1280x800 and 1920x1080
    And it should add rate-limit delays after extraction (1s-2s)

  # AC #3: Exponential backoff on rate limiting
  @E-003-S-038 @FR-SCAN-10 @story-3-5
  Scenario: OfferUp scraper applies exponential backoff on rate limits
    Given the OfferUp scraper module at "src/scrapers/offerup/scraper.ts"
    When I inspect the OfferUp retry logic in withRetry
    Then the OfferUp scraper should retry up to 3 times before failing
    And it should apply exponential backoff with 2000ms base delay
    And it should detect captcha and "Access Denied" pages as blocks
    And it should throw the last error after all retries are exhausted

  # Module structure
  @E-003-S-039 @FR-SCAN-05 @story-3-5
  Scenario: OfferUp scraper is organized as a proper module
    Given the OfferUp scraper module directory at "src/scrapers/offerup"
    When I inspect the OfferUp scraper module structure
    Then "src/scrapers/offerup/index.ts" should exist as the public entry point
    And "src/scrapers/offerup/scraper.ts" should contain the core scraping logic
    And "src/scrapers/offerup/types.ts" should contain TypeScript interfaces
    And the route at "app/api/scraper/offerup/route.ts" should import from "@/scrapers/offerup"

  # Marketplace scanner integration
  @E-003-S-040 @FR-SCAN-05 @story-3-5
  Scenario: OfferUp route integrates with marketplace-scanner canonical processor
    Given the OfferUp route at "app/api/scraper/offerup/route.ts"
    When I inspect the OfferUp analysis pipeline
    Then it should use "processListings" from marketplace-scanner for batch analysis
    And the OfferUp route uses "formatForStorage" for database-ready listing storage
    And the OfferUp route uses "generateScanSummary" for scan summary response
    And it should emit SSE events via sseEmitter after DB save with DB-assigned IDs

  # Concurrent job guard
  @E-003-S-041 @FR-SCAN-05 @story-3-5
  Scenario: Only one OfferUp scraper job per user can run simultaneously
    Given the OfferUp scraper module exports "hasRunningJob"
    When I inspect the OfferUp concurrent job guard logic
    Then the route should check for existing RUNNING jobs with platform OFFERUP before starting
    And it should throw ConflictError if a job is already running

  # Session timeout
  @E-003-S-042 @FR-SCAN-10 @story-3-5
  Scenario: OfferUp scraper enforces session timeout
    Given the OfferUp scraper module at "src/scrapers/offerup/scraper.ts"
    When I inspect the OfferUp session timeout logic
    Then it should wrap the scrape operation in Promise.race with a 60-second timeout
    And it should return a failure result with failureReason "timeout" when exceeded
    And it should always close the browser in a finally block

  # Standardized error handling
  @E-003-S-043 @FR-SCAN-05 @story-3-5
  Scenario: OfferUp scraper uses standardized error handling
    Given the OfferUp route at "app/api/scraper/offerup/route.ts"
    When I inspect the OfferUp error handling
    Then it should use "handleError" from errors module for RFC 7807 responses
    And it should use ValidationError for missing location
    And it should use RateLimitError for block and captcha detection
    And it should use ExternalServiceError for unexpected scraping failures

  # =================================================================
  # Story 3.9: Image Capture & Storage
  # =================================================================

  # AC #1/#4/#5: Images captured to Firebase Storage during scraping
  @E-003-S-056 @FR-SCAN-14 @story-3-9
  Scenario: Images are captured to Firebase Storage during scraping
    Given the image capture service at "src/lib/image-capture.ts"
    When I inspect the captureListingImages function
    Then it should import "uploadImageFromUrl" from "@/lib/firebase/storage"
    And it should import "buildStoragePath" from "@/lib/firebase/storage"
    And it should use "Promise.allSettled" for parallel independent image processing
    And it should return an "ImageCaptureResult" with "captured" and "failed" arrays
    And the Craigslist route at "app/api/scraper/craigslist/route.ts" should call "captureListingImages" after saving a listing

  # AC #2: Image metadata stored in database
  @E-003-S-057 @FR-SCAN-15 @story-3-9
  Scenario: Image metadata is persisted in the database after upload
    Given the image capture service at "src/lib/image-capture.ts"
    When I inspect the saveImageMetadata function
    Then it should call "prisma.listingImage.createMany" with the captured image data
    And each record should include "listingId", "imageIndex", "originalUrl", "storagePath", "storageUrl", "fileSize", "contentType"
    And "width" and "height" should be set to null (deferred dimension extraction)
    And the "ListingImage" model at "prisma/schema.prisma" should have a foreign key to "Listing" with cascade delete

  # AC #3: Images served from Firebase Storage URLs
  @E-003-S-058 @FR-SCAN-16 @story-3-9
  Scenario: UI serves images from Firebase Storage URLs
    Given the image helpers module at "src/lib/image-helpers.ts"
    When I inspect the getListingImageUrl function
    Then it should return "images[0].storageUrl" when the images relation is populated
    And it should fall back to parsing the "imageUrls" JSON column when images is empty
    And it should return null when neither images nor imageUrls are available
    And "app/dashboard/page.tsx" should use "getListingImageUrl" for image display

  # AC #4: Partial image failure does not block listing save
  @E-003-S-059 @FR-SCAN-14 @story-3-9
  Scenario: Partial image failure does not block listing save
    Given the Craigslist route at "app/api/scraper/craigslist/route.ts"
    When I inspect the image capture error handling
    Then image capture failures should be logged via the logger module
    And the listing save should not be blocked when image capture fails
    And the response should include "imagesCaptured" and "imagesFailed" stats

  # AC #5: Duplicate listing skips image re-download
  @E-003-S-060 @FR-SCAN-14 @story-3-9
  Scenario: Duplicate listing skips image re-download
    Given the image capture service at "src/lib/image-capture.ts"
    When I inspect the hasExistingImages function
    Then it should query "prisma.listingImage.count" with the listingId
    And the Craigslist route should call "hasExistingImages" before "captureListingImages"
    And it should skip image capture entirely when "hasExistingImages" returns true

  # =================================================================
  # Story 3.7: Scraper Job Management & Real-Time Events
  # =================================================================

  # AC #1/#4: ScraperJob lifecycle (PENDING/RUNNING -> COMPLETED/FAILED)
  @E-003-S-061 @FR-SCAN-08 @story-3-7 @wip
  Scenario: ScraperJob is created and transitions through lifecycle states
    Given I am an authenticated user
    When I POST to "/api/scraper/craigslist" with a valid location and category
    Then a ScraperJob record should be created with status "RUNNING"
    And the job should have a non-null "startedAt" timestamp
    And when the scrape completes successfully the status transitions to "COMPLETED"
    And the job record should include "listingsFound" and "opportunitiesFound" counts
    And the job record should have a non-null "completedAt" timestamp

  # AC #4: Job transitions to FAILED on error
  @E-003-S-062 @FR-SCAN-08 @story-3-7 @wip
  Scenario: ScraperJob transitions to FAILED when an error occurs
    Given I am an authenticated user
    And the Craigslist page returns zero listings
    When I POST to "/api/scraper/craigslist" with a valid location
    Then a ScraperJob record should be created
    And when the scrape fails the status transitions to "FAILED"
    And the job record should include a non-null "errorMessage"

  # AC #2: SSE listing.found event emitted per listing
  @E-003-S-063 @FR-SCAN-09 @story-3-7 @wip
  Scenario: SSE listing.found events are emitted for each discovered listing
    Given I am an authenticated user connected to the SSE events stream
    When a scraping job is running on "CRAIGSLIST"
    Then each discovered listing should emit a "listing.found" SSE event
    And each "listing.found" event payload should include "title", "price", and "url"
    And each "listing.found" event payload should include "jobId"

  # AC #3: SSE job.progress events at milestones
  @E-003-S-064 @FR-SCAN-09 @story-3-7 @wip
  Scenario: SSE job.progress events are emitted at progress milestones
    Given I am an authenticated user connected to the SSE events stream
    And a scraping job finds 20 total listings on "CRAIGSLIST"
    When the job processes listings
    Then a "job.progress" event should be emitted when 5 listings are processed
    And a "job.progress" event should be emitted at the 25% milestone (5 of 20)
    And each "job.progress" event should include "percentage", "current", and "total" fields
    And duplicate events should not fire at milestones that overlap with interval checkpoints

  # AC #1: SSE job.started event emitted after job creation
  @E-003-S-065 @FR-SCAN-08 @story-3-7 @wip
  Scenario: SSE job.started event is emitted when a scrape begins
    Given I am an authenticated user connected to the SSE events stream
    When I initiate a scrape on "CRAIGSLIST"
    Then a "job.started" SSE event should be emitted
    And the "job.started" event payload should include "jobId", "platform", and "status"
    And the "status" field should be "RUNNING"

  # AC #4: SSE job.complete event emitted on success
  @E-003-S-066 @FR-SCAN-08 @story-3-7 @wip
  Scenario: SSE job.complete event is emitted when a scrape finishes successfully
    Given I am an authenticated user connected to the SSE events stream
    When a scraping job completes successfully on "CRAIGSLIST"
    Then a "job.complete" SSE event should be emitted
    And the "job.complete" event payload should include "jobId", "platform", "listingsFound", and "completedAt"
    And the "status" field should be "COMPLETED"

  # AC #4: SSE job.failed event emitted on failure
  @E-003-S-067 @FR-SCAN-08 @story-3-7 @wip
  Scenario: SSE job.failed event is emitted when a scrape fails
    Given I am an authenticated user connected to the SSE events stream
    When a scraping job fails due to a selector breakage on "CRAIGSLIST"
    Then a "job.failed" SSE event should be emitted
    And the "job.failed" event payload should include "jobId", "platform", and "errorMessage"
    And the "status" field should be "FAILED"

  # AC #5: Real-time progress indicator in scraper UI
  @E-003-S-068 @FR-SCAN-09 @story-3-7 @wip
  Scenario: Scraper page displays live progress indicator during scan
    Given I am authenticated and on the scraper page at "/scraper"
    When I submit a scrape request
    Then the UI should show a progress indicator while the scrape is running
    And the indicator should display the platform name and a progress bar
    And as "listing.found" SSE events arrive the live listing feed should update
    And when a "job.complete" event is received the progress bar should fill to 100%
    And the indicator border should change to green upon completion

  # Auth: Ownership validation on scraper-jobs [id] API
  @E-003-S-069 @FR-SCAN-08 @story-3-7 @wip
  Scenario: Unauthenticated requests to scraper-jobs [id] API are rejected
    Given I am not authenticated
    When I GET "/api/scraper-jobs/some-job-id"
    Then the response status should be 401
    When I PATCH "/api/scraper-jobs/some-job-id" with status "COMPLETED"
    Then the response status should be 401
    When I DELETE "/api/scraper-jobs/some-job-id"
    Then the response status should be 401

  # Auth: Cross-user job access prevention
  @E-003-S-070 @FR-SCAN-08 @story-3-7 @wip
  Scenario: Users cannot access scraper jobs belonging to other users
    Given I am authenticated as user "alice"
    And a scraper job exists belonging to user "bob"
    When alice tries to GET that job via "/api/scraper-jobs/[id]"
    Then the response status should be 403
    When alice tries to PATCH that job
    Then the response status should be 403
    When alice tries to DELETE that job
    Then the response status should be 403

  # Auth: Legacy null-userId jobs remain accessible
  @E-003-S-071 @FR-SCAN-08 @story-3-7 @wip
  Scenario: Legacy scraper jobs with null userId are accessible by any authenticated user
    Given I am authenticated
    And a scraper job exists with a null userId (legacy record)
    When I GET that job via "/api/scraper-jobs/[id]"
    Then the response status should be 200

  # ─── Story 3.8: Listing Data Processing & Deduplication ─────────────────────

  # AC #1: Duplicate listings are skipped and not re-saved
  @E-003-S-072 @FR-SCAN-12 @story-3-8
  Scenario: Duplicate listing is skipped — existing record not modified
    Given the deduplicateListings function exists in "src/lib/marketplace-scanner.ts"
    When I call deduplicateListings with a platform, a list of listings, and a userId
    And some of those listings already exist in the database for that platform and user
    Then the function returns a "unique" array excluding the already-stored listings
    And the function returns a "duplicates" array containing the already-stored listings
    And the existing database records are not modified

  # AC #1 scoping: dedup is per-platform and per-user
  @E-003-S-073 @FR-SCAN-12 @story-3-8
  Scenario: Deduplication is scoped to platform and user
    Given the deduplicateListings function exists in "src/lib/marketplace-scanner.ts"
    When the same externalId exists in the database for a different platform
    Then deduplicateListings for the original platform still treats it as unique
    When the same externalId exists in the database for a different userId
    Then deduplicateListings for the original userId still treats it as unique

  # AC #2: Negative-price listings are always skipped
  @E-003-S-074 @FR-SCAN-13 @story-3-8
  Scenario: Listings with negative price are filtered out
    Given the preFilterListings function exists in "src/lib/marketplace-scanner.ts"
    When I call preFilterListings with a listing whose askingPrice is -5
    Then the listing appears in the "skipped" array with reason "negative_price"
    And the listing does not appear in the "accepted" or "flaggedForReview" arrays

  # AC #3: Sponsored listings are always skipped
  @E-003-S-075 @FR-SCAN-13 @story-3-8
  Scenario: Listings with "sponsored" in the title are filtered out
    Given the preFilterListings function exists in "src/lib/marketplace-scanner.ts"
    When I call preFilterListings with a listing whose title contains "sponsored"
    Then the listing appears in the "skipped" array with reason "sponsored"
    And the listing does not appear in the "accepted" or "flaggedForReview" arrays

  # AC #4: Free items with include_review setting are flagged
  @E-003-S-076 @FR-SCAN-13 @story-3-8
  Scenario: Free items flagged for review when setting is include_review
    Given the preFilterListings function exists in "src/lib/marketplace-scanner.ts"
    When I call preFilterListings with a listing whose askingPrice is 0
    And the freeItemHandling option is "include_review"
    Then the listing appears in the "flaggedForReview" array
    And the listing does not appear in "accepted" or "skipped"

  # AC #5: Free items with auto_analyze pass scoring filter
  @E-003-S-077 @FR-SCAN-13 @story-3-8
  Scenario: Free items auto-analyzed and accepted only if score meets threshold
    Given the preFilterListings function exists in "src/lib/marketplace-scanner.ts"
    When I call preFilterListings with a free item and freeItemHandling "auto_analyze"
    And the value estimator returns a score of 80
    Then the listing appears in "accepted"
    When I call preFilterListings with a different free item and freeItemHandling "auto_analyze"
    And the value estimator returns a score of 40
    Then the listing appears in "skipped" with reason "free_item_below_threshold"

  # AC #6: Free items with skip setting are discarded
  @E-003-S-078 @FR-SCAN-13 @story-3-8
  Scenario: Free items discarded entirely when setting is skip
    Given the preFilterListings function exists in "src/lib/marketplace-scanner.ts"
    When I call preFilterListings with a listing whose askingPrice is 0
    And the freeItemHandling option is "skip"
    Then the listing appears in the "skipped" array with reason "free_item_skipped"
    And the listing does not appear in "accepted" or "flaggedForReview"
