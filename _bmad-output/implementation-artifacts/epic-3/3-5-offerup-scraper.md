# Story 3.5: OfferUp Scraper

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69a4307cd563958ae0cb669c

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **user**,
I want to search OfferUp listings for underpriced items,
so that I can find deals on OfferUp for flipping.

## Acceptance Criteria

<!-- Each criterion MUST reference the FR-* requirement(s) it validates from the PRD -->

1. Given a user submits an OfferUp search, when the scraper runs, then Playwright launches with anti-automation flags disabled and resource blocking enabled (block images/fonts for speed) `FR-SCAN-05`
2. Given OfferUp search results, when processing results, then listings are normalized to the standard `RawListing` format with platform set to "OFFERUP" `FR-SCAN-05`
3. Given OfferUp's anti-bot detection, when the scraper is detected, then custom user agent rotation, human-like delays, and exponential backoff are applied `FR-SCAN-10`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-SCAN-05 | AC #1, #2 | @FR-SCAN-05 @story-3-5 |
| FR-SCAN-10 | AC #3 | @FR-SCAN-10 @story-3-5 |

## Definition of Done

- [x] All acceptance criteria are met and verified
- [x] Code reviewed and approved
- [x] Unit tests written and passing (55 tests: 39 module + 16 route)
- [x] Acceptance test scenarios created with dual tags (@FR-SCAN-05 and @story-3-5)
- [x] Feature file: `test/acceptance/features/E-003-multi-marketplace-scanning.feature`
- [x] user_flows.feature updated (if story affects user flows) -- N/A, no new user flow
- [x] No regressions -- existing tests still pass
- [x] Dev notes and references are complete
- [x] Story-specific documentation updated (if applicable)
- [ ] Trello card moved to Verified
- [ ] Feature card checklist item marked complete

## Tasks / Subtasks

- [x] Task 1: Extract OfferUp scraper into dedicated module (AC: #1-#2, FR: FR-SCAN-05)
  - [x] 1.1 Create `src/scrapers/offerup/types.ts` with `OfferUpItem`, `OfferUpSearchParams`, `OfferUpScrapeResult`, `CATEGORY_MAPPING`, `SUPPORTED_LOCATIONS`, `USER_AGENTS`, `SCRAPER_CONFIG` (move from route.ts)
  - [x] 1.2 Create `src/scrapers/offerup/scraper.ts` -- extract `scrapeOfferUpWithPlaywright()`, `parsePrice()`, `extractListingId()`, `withRetry()`, resource blocking logic, listing extraction/normalization
  - [x] 1.3 Create `src/scrapers/offerup/index.ts` with public exports (follow `src/scrapers/craigslist/index.ts` pattern)
  - [x] 1.4 Refactor `app/api/scraper/offerup/route.ts` to thin route delegating to extracted module
- [x] Task 2: Upgrade anti-detection measures (AC: #3, FR: FR-SCAN-10)
  - [x] 2.1 Replace hardcoded Chrome 121 UA with pool of 6+ rotating UAs (Chrome 130+) -- copy `USER_AGENTS` pattern from `src/scrapers/craigslist/types.ts`
  - [x] 2.2 Add `page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }) })` for headless detection bypass
  - [x] 2.3 Add viewport randomization (width 1280-1920, height 800-1080) -- copy `getRandomViewport()` pattern from craigslist scraper
  - [x] 2.4 Add randomized human-like delays between page load and extraction (500ms-2s) -- copy `randomDelay()` from craigslist
  - [x] 2.5 Add rate-limit delay after extraction (1s-2s) before returning results
- [x] Task 3: Add session timeout and improve error handling (AC: #1, #3, FR: FR-SCAN-05, FR-SCAN-10)
  - [x] 3.1 Wrap scrape operation in `Promise.race` with 60s session timeout -- follow craigslist `sessionTimeout` pattern
  - [x] 3.2 Use `RateLimitError` from `@/lib/errors.ts` when OfferUp blocks/captchas are detected (maps to HTTP 429)
  - [x] 3.3 Use `ExternalServiceError('OfferUp', message)` only for unexpected scraping failures (DOM errors, Playwright crashes, etc.)
  - [x] 3.4 Use `ValidationError` for missing location (instead of manual 400 response)
  - [x] 3.5 Use `handleError()` in route catch block (instead of manual JSON error responses)
  - [x] 3.6 Return structured `OfferUpScrapeResult` from scraper module (success/error/failureReason) -- follow craigslist pattern
- [x] Task 4: Integrate with marketplace-scanner canonical processor (AC: #2, FR: FR-SCAN-05)
  - [x] 4.1 Add `toRawListing()` function converting `OfferUpItem` to `RawListing` format with explicit null for sellerContact and search location fallback
  - [x] 4.2 Use `processListings('OFFERUP', rawListings, criteria, { emitEvents: false, userId })` with manual SSE emission after DB save
  - [x] 4.3 Opportunity filtering handled via `analyzed.isOpportunity` (set internally by `processListings` which calls `meetsViabilityCriteria` — explicit direct call not added to avoid redundancy with batch processor)
  - [x] 4.4 Use `formatForStorage()` with explicit type casts for Prisma compatibility, manual userId merge, image caching, location normalization
  - [x] 4.5 Use `generateScanSummary()` for consistent response format
  - [x] 4.6 Add `hasRunningJob(userId, 'OFFERUP')` concurrent job guard with ConflictError
- [x] Task 5: Update unit tests (AC: all)
  - [x] 5.1 Create `src/__tests__/scrapers/offerup/scraper.test.ts` -- 39 tests for extracted module
  - [x] 5.2 Test `parsePrice()` with 11 cases including $500, $1,500, Free, free, negotiable, empty
  - [x] 5.3 Test `extractListingId()` with 5 cases including /item/detail/123, trailing URL, fallback
  - [x] 5.4 Test `getRandomUserAgent()` returns from pool, verified pool size >= 6
  - [x] 5.5 Test `toRawListing()` mapping with full and partial OfferUpItem data
  - [x] 5.6 Test `scrapeOfferUp()` success path with mocked Playwright
  - [x] 5.7 Test `scrapeOfferUp()` block/captcha detection
  - [x] 5.8 Test `scrapeOfferUp()` session timeout (60s via fake timers)
  - [x] 5.9 Test exponential backoff in `withRetry()` (5 cases)
  - [x] 5.10 Test viewport randomization (width/height within bounds)
  - [x] 5.11 All tests mock playwright and sleep -- no real browsers or HTTP calls
  - [x] 5.12 Rewrote `src/__tests__/api/offerup-scraper.test.ts` -- 16 route tests with updated mocks
  - [x] 5.13 Mock migration: all mocks target marketplace-scanner exports with UPPERCASE resaleDifficulty
  - [x] 5.14 Error response assertions updated to RFC 7807 format
  - [x] 5.15 Coverage thresholds maintained -- 55 total tests, all passing
- [x] Task 6: Write Gherkin acceptance tests (AC: all)
  - [x] 6.1 Added 10 scenarios (@E-003-S-034 thru @E-003-S-043) to E-003-multi-marketplace-scanning.feature
  - [x] 6.2 All scenarios dual-tagged with @FR-SCAN-05 @story-3-5 or @FR-SCAN-10 @story-3-5
  - [x] 6.3 user_flows.feature not updated -- OfferUp scraping does not add a distinct user flow (mirrors existing scraping flow)
  - [x] 6.4 Updated requirements-traceability-matrix.md -- FR-SCAN-05 and FR-SCAN-10 entries updated with new scenario IDs

## Dev Notes

### CRITICAL: Existing Implementation Analysis

A fully functional OfferUp scraper **already exists** at `app/api/scraper/offerup/route.ts` (586 lines). **DO NOT rewrite from scratch.** Refactor and enhance the existing implementation.

**What already works:**
- `scrapeOfferUpWithPlaywright()` -- full Playwright-based scraping with headless Chromium
- `parsePrice()` -- handles "$1,234", "Free", empty strings
- `extractListingId()` -- extracts numeric ID from `/item/detail/{id}` URLs with fallbacks
- `withRetry()` -- retry wrapper with exponential backoff (2s base delay, 3 max retries)
- Resource blocking -- blocks images, fonts, analytics, tracking via `context.route()`
- Anti-automation flags: `--disable-blink-features=AutomationControlled`, `--disable-dev-shm-usage`, `--no-sandbox`
- Category mapping (14 categories: electronics, furniture, appliances, sporting, tools, jewelry, antiques, video_gaming, music_instr, computers, cell_phones, vehicles, clothing, toys)
- Supported locations (15 major metros)
- Multiple DOM selector patterns for listing extraction (data-testid, class-based, link-based with parent container traversal)
- Captcha/block detection via page content inspection
- ScraperJob creation and status tracking (RUNNING -> COMPLETED/FAILED)
- SSE event emission via `sseEmitter.emit({ type: 'listing.found', ... })`
- Direct `estimateValue()` and `detectCategory()` from value-estimator
- `generatePurchaseMessage()` for seller communication
- Image downloading and caching via `downloadAndCacheImages()`
- Location normalization via `normalizeLocation()`
- Database upsert by `[platform, externalId, userId]` unique constraint
- GET endpoint returning platform info, supported categories/locations, rate limits
- POST endpoint with auth check, location validation, scraper job lifecycle
- Existing unit tests at `src/__tests__/api/offerup-scraper.test.ts` (818 lines, comprehensive)

**What needs enhancement for this story:**
1. **Module Extraction** -- Scraper logic is inline in route (586 lines). Extract to `src/scrapers/offerup/` module matching `src/scrapers/craigslist/` pattern.
2. **User Agent Rotation (OUTDATED)** -- Hardcoded to single Chrome 121 UA string. Need pool of 6+ rotating UAs with Chrome 130+ versions.
3. **Headless Detection Bypass (MISSING)** -- No `navigator.webdriver` override. Add `page.addInitScript()` to set `webdriver` to false.
4. **Viewport Randomization (MISSING)** -- Fixed at 1920x1080. Need randomization (1280-1920 x 800-1080).
5. **Human-Like Delays (PARTIAL)** -- Has fixed 2s rate-limit delay but no randomized human-like delays between page load and extraction.
6. **Session Timeout (MISSING)** -- No hard session timeout. Need 60s `Promise.race` wrapper per craigslist pattern.
7. **Error Handling (PARTIAL)** -- Uses `handleError()` for auth errors but manual JSON responses for other errors. Must standardize all errors.
8. **Canonical Integration (MISSING)** -- Calls `estimateValue()` directly instead of `analyzeListing()` from `marketplace-scanner.ts`.
9. **Structured Result (MISSING)** -- Returns raw data instead of structured `OfferUpScrapeResult` with success/error/failureReason.
10. **Acceptance Tests (MISSING)** -- No BDD tests for OfferUp flow.

### SCOPE EXCLUSION: LLM Pipeline

This story does **NOT** include LLM-based analysis. The `analyzeListing()` function in `marketplace-scanner.ts` uses `estimateValue()` (algorithmic scoring) — NOT the LLM analyzer from `src/lib/llm-analyzer.ts`. The existing Craigslist route (`app/api/scraper/craigslist/route.ts`) has diverged and added LLM pipeline integration beyond what `marketplace-scanner.ts` provides — **DO NOT copy the LLM pipeline from the Craigslist route.** LLM enrichment is covered by Epic 4 (Stories 4.3-4.6). This story stays on the algorithmic path only.

### Architecture Compliance

**Required Patterns (from architecture.md and project-context.md):**

- **API Route Pattern:** `app/api/scraper/offerup/route.ts` exports `POST` and `GET` handlers -- route stays thin, delegates to scraper module
- **Error Handling:** Use `handleError()` from `@/lib/errors.ts`. Throw `ExternalServiceError` for scraping failures, `RateLimitError` for blocks/captchas, `ValidationError` for bad input. Return RFC 7807 compliant errors.
- **Auth:** Call `getAuthUserId()` from `@/lib/auth-middleware.ts` at POST route entry
- **Database:** Use Prisma singleton from `@/lib/db.ts` -- never instantiate new PrismaClient
- **SSE Events:** Use `sseEmitter` from `@/lib/sse-emitter.ts` -- emit `listing.found` events
- **Response Format:** `{ success: true, ... }` on success; `handleError(error)` on failure
- **TypeScript:** Strict mode, no `any`. Use `interface` for public APIs.
- **Scraping Strategy:** Playwright-only (OfferUp has no API)

**Scraper Module Pattern (follow `src/scrapers/craigslist/` structure):**
```
src/scrapers/offerup/
  index.ts         # Public exports
  scraper.ts       # Core scraping logic (Playwright + anti-detection)
  types.ts         # OfferUpItem, OfferUpSearchParams, OfferUpScrapeResult, constants
```

### Library & Framework Requirements

| Library | Version | Purpose |
|---------|---------|---------|
| playwright | ^1.57.0 | Browser automation (primary scraping method) |
| next | 16.x | API route framework |
| prisma | ^7.x | Database ORM |
| typescript | ^5 | Type safety |

**OfferUp Scraping Notes:**
- No official API -- Playwright browser automation only
- Search URL: `https://offerup.com/search/{location}?q={query}&price_min={min}&price_max={max}&catid={category}`
- Rate limiting: 2s delay between requests (existing), will enhance with randomized delays
- Anti-bot: captcha detection, Access Denied pages -- detect via `page.content()` inspection
- Resource blocking: images, fonts, analytics, tracking routes aborted for speed
- Listing extraction: multiple DOM selector patterns with fallback chain

**Playwright Usage Notes:**
- Use `chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage', '--no-sandbox'] })`
- Always close browser in `finally` block
- Navigate to `https://offerup.com/search/{location}?...`
- Use `page.evaluate()` for in-browser DOM extraction
- Set 30s navigation timeout with 60s hard session timeout
- Add `page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }) })` for headless detection bypass
- Viewport randomization: width 1280-1920, height 800-1080
- Human-like delays: 500ms-2s between interactions
- Block unnecessary resources: `context.route('**/*.{png,jpg,...}', route => route.abort())`

### File Structure Requirements

**Files to CREATE:**
- `src/scrapers/offerup/scraper.ts` -- Core scraping logic extracted from route
- `src/scrapers/offerup/types.ts` -- TypeScript interfaces and constants
- `src/scrapers/offerup/index.ts` -- Public exports
- `src/__tests__/scrapers/offerup/scraper.test.ts` -- Unit tests for extracted module

**Files to MODIFY:**
- `app/api/scraper/offerup/route.ts` -- Refactor to thin route delegating to scraper module
- `src/__tests__/api/offerup-scraper.test.ts` -- Update imports for thin route (or migrate entirely to new location)
- `test/acceptance/features/E-003-marketplace-scanning.feature` -- Add OfferUp acceptance scenarios
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` -- Add FR-SCAN-05, FR-SCAN-10 entries

**Files to REUSE (DO NOT MODIFY):**
- `src/lib/marketplace-scanner.ts` -- Use `RawListing` interface, `processListings()` (batch), `meetsViabilityCriteria()`, `formatForStorage()`, `generateScanSummary()`. Also exports `analyzeListing()` but prefer `processListings()` for batch processing.
- `src/lib/value-estimator.ts` -- Already integrated via marketplace-scanner (stop calling directly)
- `src/lib/sse-emitter.ts` -- Already integrated for real-time events
- `src/lib/errors.ts` -- Use `ExternalServiceError`, `RateLimitError`, `ValidationError`, `handleError()`
- `src/lib/auth-middleware.ts` -- Use `getAuthUserId()` for POST route auth
- `src/lib/db.ts` -- Prisma singleton
- `src/lib/sleep.ts` -- Existing sleep utility (already used in current implementation)
- `src/lib/image-service.ts` -- `downloadAndCacheImages()`, `normalizeLocation()`
- `prisma/schema.prisma` -- No schema changes needed (`platform` is a plain `String` field — use `'OFFERUP'` string value directly)

### Existing Key Interfaces to Follow

**RawListing (from marketplace-scanner.ts) -- target normalization format:**
```typescript
interface RawListing {
  externalId: string;        // extractListingId(item.url)
  url: string;               // item.url (https://offerup.com/item/detail/{id})
  title: string;             // item.title
  description?: string | null; // item.description
  askingPrice: number;       // item.price (from parsePrice)
  condition?: string | null; // item.condition
  location?: string | null;  // item.location or search location fallback
  sellerName?: string | null; // item.sellerName
  sellerContact?: string | null; // MUST be explicit null (not undefined) — OfferUp handles messaging internally
  imageUrls?: string[];      // item.imageUrls
  category?: string | null;  // null (detected by detectCategory in analyzer)
  postedAt?: Date | null;    // item.postedAt
}
```

**OfferUpItem (currently defined inline in route -- move to types.ts):**
```typescript
interface OfferUpItem {
  title: string;
  price: number;
  url: string;
  location: string;
  externalId: string;
  description?: string;
  imageUrls?: string[];
  postedAt?: Date;
  condition?: string;
  sellerName?: string;
}
```

**OfferUpSearchParams (new -- follow CraigslistSearchParams pattern):**
```typescript
interface OfferUpSearchParams {
  location: string;
  category?: string;
  keywords?: string;
  minPrice?: number;
  maxPrice?: number;
}
```

**OfferUpScrapeResult (new -- follow CraigslistScrapeResult pattern):**
```typescript
interface OfferUpScrapeResult {
  success: boolean;
  listings: OfferUpItem[];
  totalFound: number;
  scrapedAt: Date;
  error?: string;
  failureReason?: 'selector_failure_suspected' | 'navigation_error' | 'timeout' | 'blocked' | 'unknown';
}
```

**SSE Event Shape — MANUAL EMISSION REQUIRED:**

**WARNING:** The canonical `analyzeListing()` SSE event shape (when `emitEvents: true`) differs significantly from the existing working event shape. The canonical event emits `{ id: externalId, askingPrice, estimatedValue, profitPotential, valueScore, category, isOpportunity, userId }` — but the existing OfferUp route emits `{ id: savedListing.id, price, discount, imageUrl, location }` which includes the DB-assigned ID, cached image URLs, and normalized location. **Use `emitEvents: false`** in `processListings()` and emit events manually after DB save to preserve the richer event data:

```typescript
// After DB upsert, emit SSE event with DB-assigned ID and cached data
await sseEmitter.emit({
  type: 'listing.found',
  data: {
    id: savedListing.id,        // DB-assigned ID (not externalId)
    platform: 'OFFERUP',
    title: item.title,
    price: item.price,
    discount: estimation.discountPercent,
    url: item.url,
    imageUrl: cachedImageUrls[0] || item.imageUrls?.[0],
    location: normalizedLoc.normalized,
  },
});
```

**ScraperJob Status Flow:**
```
RUNNING -> COMPLETED | FAILED
```

**Database Upsert Pattern (already implemented -- keep as-is):**
```typescript
await prisma.listing.upsert({
  where: {
    platform_externalId_userId: {
      platform: 'OFFERUP',
      externalId: item.externalId,
      userId,
    },
  },
  create: listingData,
  update: listingData,
});
```

### Category Mapping (14 categories, already defined)

| Key | OfferUp Slug |
|-----|-------------|
| electronics | electronics |
| furniture | home-garden |
| appliances | appliances |
| sporting | sporting-goods |
| tools | tools-machinery |
| jewelry | jewelry-accessories |
| antiques | antiques-collectibles |
| video_gaming | video-games |
| music_instr | musical-instruments |
| computers | computers-accessories |
| cell_phones | cell-phones |
| vehicles | cars-trucks |
| clothing | clothing-shoes |
| toys | toys-games |

### Supported Locations (15 major metros, already defined)

tampa-fl, orlando-fl, miami-fl, jacksonville-fl, sarasota-fl, los-angeles-ca, san-francisco-ca, new-york-ny, chicago-il, seattle-wa, austin-tx, denver-co, phoenix-az, atlanta-ga, dallas-tx

### Exponential Backoff Strategy (already implemented via `withRetry()`)

```
Attempt 1: Immediate
Attempt 2: Wait 2s
Attempt 3: Wait 4s
Attempt 4: Wait 6s
(MAX_RETRIES = 3, base delay = 2s, multiplier = attempt index)
If all fail -> throw last error
```

### Test Requirements

- **Unit tests:** `src/__tests__/scrapers/offerup/scraper.test.ts`
- **Acceptance tests:** `test/acceptance/features/E-003-marketplace-scanning.feature`
- Every scenario tagged: `@FR-SCAN-05 @story-3-5` (and/or `@FR-SCAN-10 @story-3-5`)
- **Coverage thresholds:** branches 96%, functions 98%, lines 99%, statements 99%
- **Jest config:** `maxWorkers: 1`, `ts-jest` transform
- Mock `playwright` for all browser tests -- do NOT launch real browsers
- Test all error paths: scrape success, block/captcha detection, session timeout, retry exhaustion, selector failure
- Existing tests (818 lines) cover most route-level behavior -- focus new tests on extracted module functions

### Project Structure Notes

- **Path alias:** `@/*` maps to `./src/*`
- **Scraper modules:** Follow `src/scrapers/craigslist/` directory pattern (index.ts, scraper.ts, types.ts)
- **API routes:** `app/api/scraper/offerup/route.ts` -- keep route thin, delegate to scraper module
- **No new Prisma models needed** -- Listing, ScraperJob, SearchConfig already exist
- **No schema changes needed** -- `platform` is a plain `String` field in the Prisma schema (NOT an enum). Use the string value `'OFFERUP'` directly.
- **Existing tests** at `src/__tests__/api/offerup-scraper.test.ts` -- keep for route tests, add module tests at new location

### Anti-Pattern Prevention

1. **DO NOT** create a new Prisma client instance -- use `import prisma from '@/lib/db'`
2. **DO NOT** call `estimateValue()` or `detectCategory()` directly -- use `processListings()` from `marketplace-scanner.ts` for batch canonical pipeline (it calls `analyzeListing()` internally)
3. **DO NOT** create custom SSE infrastructure -- use existing `sseEmitter` from `@/lib/sse-emitter.ts`
4. **DO NOT** create custom error classes -- use existing from `@/lib/errors.ts` (`ExternalServiceError`, `RateLimitError`, `ValidationError`)
5. **DO NOT** inline all logic in route.ts -- extract to `src/scrapers/offerup/` module
6. **DO NOT** use `any` type -- define proper TypeScript interfaces in `types.ts`
7. **DO NOT** use outdated user agent strings -- Chrome 121 is stale; use Chrome 130+ versions in rotation pool
8. **DO NOT** skip session timeout -- must have 60s hard limit via `Promise.race`
9. **DO NOT** skip `navigator.webdriver` override -- add `page.addInitScript()` for headless bypass
10. **DO NOT** use fixed viewport -- randomize within 1280-1920 x 800-1080
11. **DO NOT** launch real Playwright browsers in unit tests -- mock everything
12. **DO NOT** forget to close the browser -- always use `finally` block for Playwright cleanup
13. **DO NOT** install HTTP client libraries (axios, got, etc.) -- OfferUp is Playwright-only, no `fetch` needed
14. **DO NOT** remove existing `downloadAndCacheImages()` / `normalizeLocation()` integration -- keep image caching and location normalization
15. **DO NOT** remove the `sleep` import from `@/lib/sleep` -- it's used in `withRetry()` and already mocked in tests. When extracting to the scraper module, the `sleep` import must move to `src/scrapers/offerup/scraper.ts` since `withRetry()` lives there now.
16. **DO NOT** use `undefined` for nullable RawListing fields -- use explicit `null` for `sellerContact`, `sellerName`, `description`, `condition`, `category`, `postedAt` to avoid Prisma type mismatches
17. **DO NOT** skip the `hasRunningJob()` concurrent job guard -- check before launching a new scrape to prevent duplicate jobs for the same user/platform
18. **DO NOT** copy LLM pipeline code from the Craigslist route -- that route has diverged beyond the canonical `marketplace-scanner.ts` pipeline. LLM enrichment is Epic 4 scope.

### Previous Story Intelligence (from Stories 3.1-3.4)

Stories 3.1 (Craigslist), 3.2 (eBay), 3.3 (Facebook), 3.4 (Mercari) established these patterns that 3.5 MUST follow:
- **Module structure:** `src/scrapers/{platform}/` with `scraper.ts`, `types.ts`, `index.ts`
- **Thin route pattern:** API route delegates to scraper module, route only handles HTTP concerns
- **Canonical processing:** Use `marketplace-scanner.ts` for all analysis and formatting — prefer `processListings()` (batch) over individual `analyzeListing()` calls. Use `formatForStorage()` + manual `userId` merge, and `generateScanSummary()` for response.
- **Error handling:** Standardized `AppError` subclasses with `handleError()` -- NOT manual JSON error responses
- **Test structure:** `src/__tests__/scrapers/{platform}/scraper.test.ts`
- **Acceptance tests:** All in `E-003-marketplace-scanning.feature` with dual tags
- **ScraperJob tracking:** Always create job record and update status on completion/failure
- **Anti-detection:** User agent rotation, headless detection bypasses, human-like delays, viewport randomization
- **Story 3.1 pattern:** Craigslist Playwright-only scraper with session timeout, structured result, random viewport, random delays
- **Story 3.4 pattern:** Mercari API-primary with Playwright-fallback, exponential backoff
- **Story 3.5 follows 3.1 pattern:** Playwright-only like Craigslist (OfferUp has no API)

### Key Differences from Craigslist (Story 3.1)

While OfferUp follows the same Playwright-only pattern as Craigslist, there are differences:
- **URL structure:** OfferUp uses `https://offerup.com/search/{location}?...` (not `{location}.craigslist.org/search/...`)
- **Location format:** OfferUp uses `city-state` (e.g., `tampa-fl`) vs Craigslist's bare city (e.g., `tampa`)
- **Category handling:** OfferUp uses URL query param `catid` vs Craigslist's URL path `/search/{category_path}`
- **Image caching:** OfferUp route already uses `downloadAndCacheImages()` -- Craigslist does not (yet)
- **Location normalization:** OfferUp route already uses `normalizeLocation()` -- preserve this
- **Existing features to preserve:** Image caching, location normalization, category validation, location validation

### Integration Pitfalls (from adversarial analysis)

These are verified integration risks that WILL cause bugs if not handled:

1. **`formatForStorage()` omits `userId`:** The function at `marketplace-scanner.ts:244` returns all listing fields EXCEPT `userId`. The Prisma upsert requires `userId` for the composite unique constraint `[platform, externalId, userId]`. Merge it: `{ ...formatForStorage(analyzed), userId }`.

2. **Image caching happens OUTSIDE the canonical pipeline:** `formatForStorage()` serializes `imageUrls` to JSON but doesn't download/cache images. Run `downloadAndCacheImages()` from `@/lib/image-service.ts` BEFORE building storage data, then override `imageUrls` with the cached URLs.

3. **Location normalization happens OUTSIDE the canonical pipeline:** `formatForStorage()` passes through `listing.location` as-is. Run `normalizeLocation()` from `@/lib/image-service.ts` separately, then override `location` in the storage data with the normalized value.

4. **`resaleDifficulty` values are UPPERCASE:** The `DIFFICULTY_ORDER` map in `marketplace-scanner.ts` uses `'VERY_EASY'`, `'EASY'`, `'MODERATE'`, `'HARD'`, `'VERY_HARD'`. Test mocks must use these exact uppercase values — NOT lowercase (`'medium'`, `'easy'`).

5. **Error HTTP status codes:** `RateLimitError` → HTTP 429 (for blocks/captcha), `ExternalServiceError` → HTTP 502 (for unexpected failures), `ValidationError` → HTTP 422 (for bad input). Do NOT conflate these.

6. **Craigslist route has diverged:** `app/api/scraper/craigslist/route.ts` now includes LLM pipeline integration, image caching middleware, and other features beyond what `marketplace-scanner.ts` provides. Copy only the MODULE EXTRACTION pattern (types.ts/scraper.ts/index.ts), NOT the route's pipeline code.

### Known Limitations (document for future stories)

- **No proxy rotation:** IP-level anti-detection is out of scope
- **Single-page scraping:** Current implementation scrapes one page of results (up to 50 listings). Pagination is out of scope.
- **No authenticated sessions:** Uses anonymous browsing. OfferUp personalization requires login.
- **DOM selector fragility:** OfferUp may change their HTML structure at any time. Multiple selector fallbacks provide resilience.
- **Image thumbnails only:** Full-size image download is covered by Story 3.9.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic-3-Story-3.5]
- [Source: _bmad-output/planning-artifacts/epics.md#FR-SCAN-05]
- [Source: _bmad-output/planning-artifacts/epics.md#FR-SCAN-10]
- [Source: _bmad-output/planning-artifacts/architecture.md#Scraper-Architecture]
- [Source: app/api/scraper/offerup/route.ts -- existing implementation (586 lines)]
- [Source: src/__tests__/api/offerup-scraper.test.ts -- existing unit tests (818 lines)]
- [Source: src/lib/marketplace-scanner.ts -- canonical processor (RawListing, analyzeListing)]
- [Source: src/scrapers/craigslist/ -- reference module structure (closest pattern)]
- [Source: src/lib/errors.ts -- standardized error handling]
- [Source: src/lib/image-service.ts -- downloadAndCacheImages, normalizeLocation]
- [Source: src/lib/sleep.ts -- sleep utility]
- [Source: _bmad-output/implementation-artifacts/epic-3/3-4-mercari-scraper.md -- previous story patterns]
- [Source: _bmad-output/implementation-artifacts/epic-3/3-1-craigslist-scraper.md -- closest architectural pattern]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- TypeScript fix: Added `SCRAPER_CONFIG` to route imports (was missing in GET handler)
- TypeScript fix: `formatForStorage()` returns `Record<string, unknown>` — used explicit field-by-field type casting (following Mercari route pattern) instead of spread
- Jest fix: Used `npx jest --testPathPatterns` instead of `pnpm test --` to avoid flag parsing issue
- Review fix: `randomDelay` changed from raw `setTimeout` to `sleep` — eliminates real 500ms–2s delays in test runs
- Review fix: Catch block now excludes `RateLimitError` and `ExternalServiceError` to prevent double job FAILED update
- Review fix: BDD step defs created (`E-003-offerup-scraper.steps.ts`); @wip removed from all 10 scenarios
- Review fix: Craigslist step defs updated to derive types.ts path dynamically; core scraping logic step now generic

### Completion Notes List
- Extracted 586-line inline route into modular structure (types.ts + scraper.ts + index.ts + thin route)
- Upgraded UA pool from single Chrome 121 to 6 rotating Chrome 130+ agents
- Added navigator.webdriver override, viewport randomization, human-like delays, rate-limit delays
- Added 60s session timeout via Promise.race
- Integrated with marketplace-scanner canonical pipeline (processListings, formatForStorage, generateScanSummary)
- Manual SSE emission after DB save preserves DB-assigned IDs, cached images, normalized locations
- All 55 OfferUp tests pass (39 scraper module + 16 route)
- Full suite: no new regressions (pre-existing eBay failures only)
- 10 Gherkin acceptance test scenarios added (E-003-S-034 thru E-003-S-043) with step definitions
- Requirements traceability matrix updated (FR-SCAN-05 covered, FR-SCAN-10 updated)

### File List

**Created:**
- `src/scrapers/offerup/types.ts` — Interfaces (OfferUpItem, OfferUpSearchParams, OfferUpScrapeResult) and constants (CATEGORY_MAPPING, SUPPORTED_LOCATIONS, USER_AGENTS, SCRAPER_CONFIG)
- `src/scrapers/offerup/scraper.ts` — Core scraping logic: parsePrice, extractListingId, getRandomUserAgent, getRandomViewport, withRetry, hasRunningJob, scrapeOfferUp, toRawListing
- `src/scrapers/offerup/index.ts` — Barrel exports
- `src/__tests__/scrapers/offerup/scraper.test.ts` — 39 unit tests for extracted module

**Modified:**
- `app/api/scraper/offerup/route.ts` — Refactored to thin route delegating to scraper module
- `src/__tests__/api/offerup-scraper.test.ts` — Rewritten with updated mocks for thin route (16 tests)
- `test/acceptance/features/E-003-marketplace-scanning.feature` — Superseded by new multi-marketplace feature file
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` — Updated FR-SCAN-04, FR-SCAN-05, FR-SCAN-10 entries
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Updated 3-5 status
- `test/acceptance/step_definitions/E-003-craigslist-scraper.steps.ts` — Fixed generic step defs to work cross-platform (viewport, core scraping logic)
- `_bmad-output/implementation-artifacts/epic-3/3-5-offerup-scraper.md` — This file

**Created (additional):**
- `test/acceptance/features/E-003-multi-marketplace-scanning.feature` — New feature file with 10 OfferUp scenarios (E-003-S-034 thru E-003-S-043)
- `test/acceptance/step_definitions/E-003-offerup-scraper.steps.ts` — Step definitions for all 10 OfferUp scenarios
