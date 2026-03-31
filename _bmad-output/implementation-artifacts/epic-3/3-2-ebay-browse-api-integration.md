# Story 3.2: eBay Browse API Integration

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69a42afaa5ae2ad2dd6a0739

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **user**,
I want to search eBay listings via their official Browse API,
so that I can find deals on eBay with reliable, structured data.

## Acceptance Criteria

<!-- Each criterion MUST reference the FR-* requirement(s) it validates from the PRD -->

1. Given a user submits an eBay search, when the API call is made to eBay Browse API v1 (`/item_summary/search`), then the request includes OAuth token authentication from the `EBAY_OAUTH_TOKEN` environment variable `FR-SCAN-02`
2. Given eBay search results are returned, when processing the response, then listings are normalized to the standard `RawListing` format: title, price, condition, location, images, external ID, URL `FR-SCAN-02`
3. Given eBay search filters, when the user specifies category, condition, or price range, then the filters are mapped to eBay API parameters (categoryId, condition enum, priceRange filter string) `FR-SCAN-02`
4. Given the eBay OAuth token has expired or is missing, when a search is attempted, then an appropriate `ExternalServiceError` is returned and the user is notified to refresh their token `FR-SCAN-02`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-SCAN-02 | AC #1, #2, #3, #4 | @FR-SCAN-02 @story-3-2 |

## Definition of Done

- [ ] All acceptance criteria are met and verified
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing
- [ ] Acceptance test scenarios created with dual tags (@FR-SCAN-02 and @story-3-2)
- [ ] Feature file: `test/acceptance/features/E-003-multi-marketplace-scanning.feature`
- [ ] user_flows.feature updated (if story affects user flows)
- [ ] No regressions -- existing tests still pass
- [ ] Dev notes and references are complete
- [ ] Story-specific documentation updated (if applicable)
- [ ] Trello card moved to Verified
- [ ] Feature card checklist item marked complete

## Tasks / Subtasks

- [x] Task 1: Extract eBay scraper logic into dedicated module (AC: #1-#4, FR: FR-SCAN-02)
  - [x] 1.1 Create `src/scrapers/ebay/types.ts` with `EbayItemSummary`, `EbaySearchResponse`, `EbayScraperConfig` interfaces
  - [x] 1.2 Create `src/scrapers/ebay/scraper.ts` — extract `callEbayApi()`, `buildFilterString()`, `convertEbayItemsToNormalized()` from route
  - [x] 1.3 Create `src/scrapers/ebay/index.ts` with public exports
  - [x] 1.4 Refactor `app/api/scraper/ebay/route.ts` to use the extracted module (thin route pattern)
- [x] Task 2: Implement eBay Browse API integration via extracted module (AC: #1, #3, FR: FR-SCAN-02)
  - [x] 2.1 Implement `callEbayApi()` with proper OAuth Bearer token header and `X-EBAY-C-MARKETPLACE-ID` header
  - [x] 2.2 Implement `buildFilterString()` for `buyingOptions:{FIXED_PRICE}`, price range `[min..max]`, conditions `{USED}`, and `soldItemsOnly:true`
  - [x] 2.3 Support all 6 categories: Electronics (293), Clothing (11450), Collectibles (12576), Musical Instruments (6000), Video Games (888), Antiques (281)
  - [x] 2.4 Support conditions: NEW, OPEN_BOX, CERTIFIED_REFURBISHED, EXCELLENT_REFURBISHED, VERY_GOOD_REFURBISHED, USED
  - [x] 2.5 Support configurable `limit` (1-50, default 20) and `fieldgroups=EXTENDED` for rich data
- [x] Task 3: Implement response normalization to RawListing (AC: #2, FR: FR-SCAN-02)
  - [x] 3.1 Implement `convertEbayItemsToNormalized()` mapping all EbayItemSummary fields to RawListing
  - [x] 3.2 Extract all image URLs (primary `image.imageUrl` + `additionalImages[].imageUrl`)
  - [x] 3.3 Build location string from `itemLocation` (city, stateOrProvince, country)
  - [x] 3.4 Build seller feedback note: `"Seller feedback: X% (N ratings)"`
  - [x] 3.5 Detect category via eBay categories array or `detectCategory()` fallback
  - [x] 3.6 Parse price from `price.value` string to float
- [x] Task 4: Implement token error handling (AC: #4, FR: FR-SCAN-02)
  - [x] 4.1 Validate `EBAY_OAUTH_TOKEN` env var exists before making API calls
  - [x] 4.2 Handle 401/403 responses as token expiry — throw `ExternalServiceError('eBay Browse API', 'OAuth token expired or invalid')`
  - [x] 4.3 Handle 429 rate limit — throw `RateLimitError` with retryable flag
  - [x] 4.4 Return clear error messaging for missing token via GET endpoint status check
- [x] Task 5: Integrate with marketplace-scanner canonical processor (AC: #1-#4)
  - [x] 5.1 Use `analyzeListing()` from `marketplace-scanner.ts` for consistent analysis
  - [x] 5.2 Use `meetsViabilityCriteria()` for opportunity filtering (valueScore >= 70)
  - [x] 5.3 Use `formatForStorage()` for database-ready format
  - [x] 5.4 Use `generateScanSummary()` for consistent response format
  - [x] 5.5 Emit SSE events via `sseEmitter.emit({ type: 'listing.found', ... })` for each opportunity
- [x] Task 6: Write unit tests (AC: all)
  - [x] 6.1 Create `src/__tests__/scrapers/ebay/scraper.test.ts`
  - [x] 6.2 Test `buildFilterString()` with various filter combinations (price, condition, category, sold)
  - [x] 6.3 Test `convertEbayItemsToNormalized()` with full and partial eBay responses
  - [x] 6.4 Test price parsing edge cases (missing price, currency variations)
  - [x] 6.5 Test image URL collection (primary only, primary + additional, no images)
  - [x] 6.6 Test location formatting (full address, partial, missing)
  - [x] 6.7 Test seller feedback note building (with/without feedback data)
  - [x] 6.8 Test token validation (missing, expired)
  - [x] 6.9 Mock `fetch` for API call tests — do NOT make real HTTP calls
  - [x] 6.10 Test error handling (401, 403, 429, 500 responses)
- [x] Task 7: Write Gherkin acceptance tests (AC: all)
  - [x] 7.1 Add scenarios to `test/acceptance/features/E-003-multi-marketplace-scanning.feature`
  - [x] 7.2 Write scenarios for each AC with dual tags (@FR-SCAN-02 and @story-3-2)
  - [x] 7.3 Update `test/acceptance/features/user_flows.feature` if eBay scraping adds a new user flow

## Dev Notes

### CRITICAL: Existing Implementation Analysis

A fully functional eBay scraper **already exists** at `app/api/scraper/ebay/route.ts`. **DO NOT rewrite from scratch.** Refactor and enhance the existing implementation.

**What already works:**
- eBay Browse API v1 integration with OAuth Bearer token authentication
- `callEbayApi()` function calling `/item_summary/search` endpoint
- `buildFilterString()` for `buyingOptions:{FIXED_PRICE}`, price range, conditions, `soldItemsOnly`
- `convertEbayItemsToNormalized()` mapping eBay responses to `RawListing` format
- Support for 6 categories (Electronics, Clothing, Collectibles, Musical, Video Games, Antiques)
- Support for 6 conditions (NEW, OPEN_BOX, CERTIFIED_REFURBISHED, EXCELLENT_REFURBISHED, VERY_GOOD_REFURBISHED, USED)
- GET endpoint returning platform status, supported categories, and supported conditions
- POST endpoint handling scrape requests with keywords, categoryId, condition, price range, limit
- Fetching BOTH active listings and sold listings (for PriceHistory)
- Database upsert with `[platform, externalId, userId]` unique constraint
- ScraperJob creation and status tracking (PENDING -> RUNNING -> COMPLETED/FAILED)
- SSE event emission for real-time listing notifications
- LLM analysis pipeline integration
- Seller feedback score/percentage note building
- Auction detection note
- Field groups: `EXTENDED` for rich data

**What needs enhancement for this story:**
1. **Module Extraction** — Scraper logic is inline in the route file. Extract to `src/scrapers/ebay/` module matching the `src/scrapers/facebook/` pattern.
2. **Error Handling Standardization** — Current error handling uses generic `Error`. Migrate to `ExternalServiceError`, `RateLimitError`, `ConfigurationError` from `@/lib/errors.ts`.
3. **Token Expiry Detection** — Current code throws generic error on missing token. Add specific handling for 401/403 API responses indicating expired tokens.
4. **Canonical Integration** — Verify integration with `marketplace-scanner.ts` functions (`analyzeListing()`, `meetsViabilityCriteria()`, `formatForStorage()`, `generateScanSummary()`).
5. **Unit Test Coverage** — No existing unit tests for eBay scraper. Must achieve 96%+ branch coverage.
6. **Acceptance Tests** — No existing BDD tests for eBay flow.

### Architecture Compliance

**Required Patterns (from architecture.md and project-context.md):**

- **API Route Pattern:** `app/api/scraper/ebay/route.ts` exports `POST` and `GET` handlers — route stays thin, delegates to scraper module
- **Error Handling:** Use `handleError()` from `@/lib/errors.ts`. Throw `ExternalServiceError` for API failures, `RateLimitError` for 429s, `ConfigurationError` for missing token. Return RFC 7807 compliant errors.
- **Auth:** Call `getAuthUserId()` from `@/lib/auth-middleware.ts` at route entry (POST only, GET is public for status)
- **Database:** Use Prisma singleton from `@/lib/db.ts` — never instantiate new PrismaClient
- **SSE Events:** Use `sseEmitter` from `@/lib/sse-emitter.ts` — emit `listing.found` events
- **Response Format:** `{ success: true, ... }` on success; `handleError(error)` on failure
- **TypeScript:** Strict mode, no `any`. Use `interface` for public APIs.
- **No Playwright** — eBay uses official REST API, not browser scraping

**eBay API Contract (Browse API v1):**
```
Endpoint: GET https://api.ebay.com/buy/browse/v1/item_summary/search
Headers:
  Authorization: Bearer {EBAY_OAUTH_TOKEN}
  Content-Type: application/json
  X-EBAY-C-MARKETPLACE-ID: EBAY_US
Query Params:
  q: search keywords
  category_ids: eBay category ID
  filter: buyingOptions:{FIXED_PRICE},price:[min..max],conditions:{CONDITION}
  limit: 1-50 (default 20)
  fieldgroups: EXTENDED
  sort: -price (price descending)
```

**eBay OAuth Token:**
- Grant types: `client_credentials` (1000/day), `authorization_code` (10000/day), `refresh_token` (50000/day)
- Endpoint: `POST https://api.ebay.com/identity/v1/oauth2/token`
- Token stored in `EBAY_OAUTH_TOKEN` env var (not in database)
- Token lifecycle managed externally (user responsibility to refresh)

### Library & Framework Requirements

| Library | Version | Purpose |
|---------|---------|---------|
| next | 16.x | API route framework |
| prisma | ^7.x | Database ORM |
| typescript | ^5 | Type safety |
| zod | latest | Request validation |

**No additional libraries needed.** eBay integration uses native `fetch` — no HTTP client library required. No Playwright needed (API-based, not scraping).

### File Structure Requirements

**Files to CREATE:**
- `src/scrapers/ebay/scraper.ts` — Core API integration logic extracted from route
- `src/scrapers/ebay/types.ts` — TypeScript interfaces (EbayItemSummary, EbaySearchResponse, EbayScraperConfig)
- `src/scrapers/ebay/index.ts` — Public exports
- `src/__tests__/scrapers/ebay/scraper.test.ts` — Unit tests

**Files to MODIFY:**
- `app/api/scraper/ebay/route.ts` — Refactor to thin route, delegate to scraper module

**Files to REUSE (DO NOT MODIFY):**
- `src/lib/marketplace-scanner.ts` — Use `RawListing` interface, `analyzeListing()`, `meetsViabilityCriteria()`, `formatForStorage()`, `generateScanSummary()`
- `src/lib/value-estimator.ts` — Already integrated via marketplace-scanner
- `src/lib/sse-emitter.ts` — Already integrated for real-time events
- `src/lib/errors.ts` — Use `ExternalServiceError`, `RateLimitError`, `ConfigurationError`, `handleError()`
- `src/lib/auth-middleware.ts` — Use `getAuthUserId()` for POST route auth
- `src/lib/db.ts` — Prisma singleton
- `src/lib/llm-analyzer.ts` — LLM analysis pipeline (optional enhancement)
- `src/lib/market-price.ts` — eBay market data lookups
- `prisma/schema.prisma` — No schema changes needed

### Existing Key Interfaces to Follow

**RawListing (from marketplace-scanner.ts) — target normalization format:**
```typescript
interface RawListing {
  externalId: string;        // eBay itemId
  url: string;               // itemWebUrl
  title: string;             // item title
  description?: string | null; // shortDescription
  askingPrice: number;       // price.value parsed to float
  condition?: string | null; // eBay condition string
  location?: string | null;  // Built from itemLocation
  sellerName?: string | null; // seller.username
  sellerContact?: string | null; // Seller feedback note
  imageUrls?: string[];      // Primary + additional images
  category?: string | null;  // From eBay categories or detectCategory()
  postedAt?: Date | null;    // itemCreationDate
}
```

**EbayItemSummary (from eBay Browse API v1):**
```typescript
interface EbayItemSummary {
  itemId: string;
  title: string;
  shortDescription?: string;
  itemWebUrl: string;
  price?: { value?: string; currency?: string };
  buyingOptions?: string[];
  condition?: string;
  image?: { imageUrl: string };
  additionalImages?: Array<{ imageUrl: string }>;
  seller?: {
    username?: string;
    feedbackScore?: number;
    feedbackPercentage?: string;
  };
  itemLocation?: {
    city?: string;
    stateOrProvince?: string;
    country?: string;
    postalCode?: string;
  };
  categories?: Array<{ categoryId?: string; categoryName?: string }>;
  itemCreationDate?: string;
  itemEndDate?: string;
}
```

**SSE Event Shape:**
```typescript
await sseEmitter.emit({
  type: 'listing.found',
  data: {
    id: savedListing.id,
    platform: 'EBAY',
    title: item.title,
    askingPrice: item.askingPrice,
    estimatedValue: estimation.estimatedValue,
    profitPotential: estimation.profitPotential,
    valueScore: estimation.valueScore,
    category: detectedCategory,
    url: item.url,
    imageUrl: item.imageUrls?.[0],
    isOpportunity: estimation.valueScore >= 70,
    userId,
  },
});
```

**ScraperJob Status Flow:**
```
PENDING -> RUNNING -> COMPLETED | FAILED
```

**Database Upsert Pattern:**
```typescript
await prisma.listing.upsert({
  where: {
    platform_externalId_userId: {
      platform: 'EBAY',
      externalId: item.externalId,
      userId,
    },
  },
  create: listingData,
  update: listingData,
});
```

### Supported Categories

| Category ID | Label |
|-------------|-------|
| 293 | Electronics |
| 11450 | Clothing, Shoes & Accessories |
| 12576 | Collectibles |
| 6000 | Musical Instruments & Gear |
| 888 | Video Games & Consoles |
| 281 | Antiques |

### Supported Conditions

| Condition | Label |
|-----------|-------|
| NEW | New |
| OPEN_BOX | Open Box |
| CERTIFIED_REFURBISHED | Certified Refurbished |
| EXCELLENT_REFURBISHED | Excellent - Refurbished |
| VERY_GOOD_REFURBISHED | Very Good - Refurbished |
| USED | Used |

### eBay Filter String Format

```
buyingOptions:{FIXED_PRICE},price:[10..100],conditions:{USED}
```

- `buyingOptions:{FIXED_PRICE}` is ALWAYS included (required)
- `soldItemsOnly:true` added for historical sold data queries
- Price range: `price:[min..max]` where `*` means unbounded
- Multiple filters comma-separated

### Test Requirements

- **Unit tests:** `src/__tests__/scrapers/ebay/scraper.test.ts`
- **Acceptance tests:** `test/acceptance/features/E-003-multi-marketplace-scanning.feature`
- Every scenario tagged: `@FR-SCAN-02 @story-3-2`
- **Coverage thresholds:** branches 96%, functions 98%, lines 99%, statements 99%
- **Jest config:** `maxWorkers: 1`, `ts-jest` transform
- Mock `fetch` — do NOT make real HTTP calls to eBay API in unit tests
- Test all error paths: missing token, expired token (401), rate limited (429), server error (500)

### Project Structure Notes

- **Path alias:** `@/*` maps to `./src/*`
- **Scraper modules:** Follow `src/scrapers/facebook/` directory pattern
- **API routes:** `app/api/scraper/ebay/route.ts` — keep route thin, delegate to scraper module
- **No new Prisma models needed** — Listing, ScraperJob, SearchConfig, PriceHistory, ListingImage already exist
- **No schema changes needed** — all required fields exist in current schema

### Anti-Pattern Prevention

1. **DO NOT** create a new Prisma client instance — use `import prisma from '@/lib/db'`
2. **DO NOT** build custom value estimation — use existing `value-estimator.ts` via `marketplace-scanner.ts`
3. **DO NOT** create custom SSE infrastructure — use existing `sseEmitter` from `@/lib/sse-emitter.ts`
4. **DO NOT** create custom error classes — use existing from `@/lib/errors.ts`
5. **DO NOT** inline all logic in route.ts — extract to `src/scrapers/ebay/` module
6. **DO NOT** use `any` type — define proper TypeScript interfaces in `types.ts`
7. **DO NOT** use Playwright for eBay — eBay uses official REST API, not browser scraping
8. **DO NOT** install HTTP client libraries (axios, got, etc.) — use native `fetch`
9. **DO NOT** make real HTTP calls in unit tests — mock `fetch` globally
10. **DO NOT** store OAuth tokens in the database — use environment variable `EBAY_OAUTH_TOKEN`
11. **DO NOT** implement token refresh logic — token lifecycle is managed externally

### Previous Story Intelligence (from Story 3.1)

Story 3.1 (Craigslist Scraper) established these patterns that 3.2 MUST follow:
- **Module structure:** `src/scrapers/{platform}/` with `scraper.ts`, `types.ts`, `index.ts`
- **Thin route pattern:** API route delegates to scraper module
- **Canonical processing:** Use `marketplace-scanner.ts` for all analysis and formatting
- **Error handling:** Standardized `AppError` subclasses with `handleError()`
- **Test structure:** `src/__tests__/scrapers/{platform}/scraper.test.ts`
- **Acceptance tests:** All in `E-003-multi-marketplace-scanning.feature` with dual tags
- **ScraperJob tracking:** Always create job record and update status on completion/failure

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic-3-Story-3.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Scraper-Architecture]
- [Source: app/api/scraper/ebay/route.ts -- existing implementation]
- [Source: src/lib/marketplace-scanner.ts -- canonical processor]
- [Source: src/scrapers/facebook/ -- reference module structure]
- [Source: src/lib/ebay-inventory.ts -- eBay Sell/Inventory API reference]
- [Source: eBay Browse API v1 docs -- https://developer.ebay.com/develop/guides-v2/inventory-discovery-and-refresh]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Initial test run: 59/60 passed — fixed feedbackScore=0 expectation (nullish coalescing preserves 0)
- Existing route tests: 2/55 failed due to intentional error handling migration (INTERNAL_ERROR → CONFIGURATION_ERROR, generic → EXTERNAL_SERVICE_ERROR). Updated tests to match new standardized error types.
- Full regression run: 147/148 suites pass (2866 tests). 1 pre-existing failure in facebook-scraper (Stagehand dependency issue, unrelated).

### Completion Notes List
- Extracted eBay scraper logic from monolithic route into `src/scrapers/ebay/` module (types, scraper, index) following Craigslist scraper pattern from Story 3.1
- Standardized error handling: ConfigurationError for missing token, ExternalServiceError for 401/403 API failures, RateLimitError for 429 responses
- Normalized eBay items to RawListing format with seller feedback note in `sellerContact` field (was previously in non-existent `additionalNotes` field)
- Route refactored to thin pattern: imports from `@/scrapers/ebay`, delegates all scraper logic to module
- 60 new unit tests covering all extracted functions (buildFilterString, callEbayApi, parseEbayPrice, collectImageUrls, formatLocation, buildSellerNote, convertEbayItemsToNormalized, getEbayToken, fetchEbayListings, fetchSoldListings)
- Updated 2 existing route tests to expect new standardized error codes
- Added 6 Gherkin acceptance scenarios with dual tags (@FR-SCAN-02 @story-3-2)
- Marketplace-scanner integration verified: processListings, formatForStorage, generateScanSummary, SSE events all working through route

### File List
**New files:**
- `src/scrapers/ebay/types.ts` — EbayItemSummary, EbaySearchResponse, EbayScraperConfig interfaces; SUPPORTED_CATEGORIES, SUPPORTED_CONDITIONS, EBAY_API_DEFAULTS constants
- `src/scrapers/ebay/scraper.ts` — Core API integration: buildFilterString, getEbayToken, callEbayApi, fetchEbayListings, fetchSoldListings, formatLocation, buildSellerNote, parseEbayPrice, collectImageUrls, convertEbayItemsToNormalized
- `src/scrapers/ebay/index.ts` — Public exports barrel file
- `src/__tests__/scrapers/ebay/scraper.test.ts` — 60 unit tests for all scraper module functions

**Modified files:**
- `app/api/scraper/ebay/route.ts` — Refactored to thin route, delegates to scraper module, uses standardized errors
- `src/__tests__/api/ebay-scraper.test.ts` — Updated 2 tests to expect CONFIGURATION_ERROR and EXTERNAL_SERVICE_ERROR
- `test/acceptance/features/E-003-multi-marketplace-scanning.feature` — Added 6 eBay scenarios with @FR-SCAN-02 @story-3-2 dual tags
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Status: in-progress → review
- `_bmad-output/implementation-artifacts/epic-3/3-2-ebay-browse-api-integration.md` — Tasks marked complete, dev record updated

### Change Log
- 2026-03-01: Extracted eBay scraper to `src/scrapers/ebay/` module, standardized error handling, added 60 unit tests and 6 BDD scenarios. Route refactored to thin pattern. All acceptance criteria met.
