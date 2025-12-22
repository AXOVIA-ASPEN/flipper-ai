# Flipper.ai Implementation Plan

## Test Coverage Analysis

### Summary
- **175 Jest unit tests** (4 test suites, all passing)
- **25 Playwright E2E tests** (3 spec files)
- **Code Coverage**: `value-estimator.ts` at 100% (statements, branches, functions, lines)

---

## Completed Features: Test Coverage Map

### 1. Value Estimation Engine
**File**: `src/lib/value-estimator.ts`
**Test File**: `src/__tests__/lib/value-estimator.test.ts`
**Coverage**: 100% (all metrics)

| Function | Tests | Status |
|----------|-------|--------|
| `estimateValue()` | 76 tests | ✅ Complete |
| `detectCategory()` | 56 tests | ✅ Complete |
| `generatePurchaseMessage()` | 16 tests | ✅ Complete |

**Tested Behaviors**:
- ✅ All 16 output fields returned correctly
- ✅ Category multipliers (electronics, collectibles, furniture, etc.)
- ✅ Condition multipliers (new, like new, excellent, good, fair, poor)
- ✅ Brand detection (Apple, Samsung, Sony, Nintendo, Dyson, etc.)
- ✅ Risk keyword penalties (broken, parts only, needs repair)
- ✅ Negotiable/OBO detection
- ✅ Shippable vs local-only detection
- ✅ Profit calculations with 13% platform fee
- ✅ Value score 0-100 calculation
- ✅ Discount percent calculation
- ✅ Resale difficulty levels
- ✅ Comparable URL generation (eBay, Facebook, Mercari)
- ✅ Reasoning and notes generation
- ✅ Tags array generation
- ✅ Edge cases (null values, empty strings, special chars)
- ✅ Purchase message generation (negotiable/non-negotiable)

**NOT Tested**:
- (None - 100% coverage)

---

### 2. Listings API
**Files**: `src/app/api/listings/route.ts`, `src/app/api/listings/[id]/route.ts`
**Test File**: `src/__tests__/api/listings.test.ts`
**Coverage**: ~85% (estimated - Prisma mocked)

| Endpoint | Tests | Status |
|----------|-------|--------|
| `GET /api/listings` | 8 tests | ✅ Complete |
| `POST /api/listings` | 19 tests | ✅ Complete |
| `GET /api/listings/[id]` | 4 tests | ✅ Complete |
| `PATCH /api/listings/[id]` | 5 tests | ✅ Complete |
| `DELETE /api/listings/[id]` | 3 tests | ✅ Complete |

**Tested Behaviors (GET)**:
- ✅ Default pagination (limit 50, offset 0)
- ✅ Filter by platform
- ✅ Filter by status
- ✅ Filter by minimum score
- ✅ Custom pagination (limit/offset)
- ✅ Order by scrapedAt descending
- ✅ Include opportunity relation
- ✅ Multiple filters combined
- ✅ Database error handling (500)

**Tested Behaviors (POST)**:
- ✅ Create listing with value estimation
- ✅ Missing required field validation (externalId, platform, url, title, askingPrice)
- ✅ Allow askingPrice of 0
- ✅ Auto-detect category when not provided
- ✅ Use provided category when given
- ✅ Calculate all value estimation fields
- ✅ Generate comparable URLs (JSON)
- ✅ Generate purchase request message
- ✅ Set status to OPPORTUNITY for high scores (≥70)
- ✅ Set status to NEW for low scores
- ✅ Store imageUrls as JSON string
- ✅ Store tags as JSON string
- ✅ Handle postedAt date conversion
- ✅ Upsert by platform_externalId
- ✅ Detect shippable/non-shippable items
- ✅ Detect negotiable items
- ✅ Database error handling (500)
- ✅ Handle missing optional fields

**NOT Tested**:
- ❌ Integration tests with real database

---

### 3. Opportunities API
**Files**: `src/app/api/opportunities/route.ts`, `src/app/api/opportunities/[id]/route.ts`
**Test File**: `src/__tests__/api/opportunities.test.ts`
**Coverage**: ~90% (estimated - Prisma mocked)

| Endpoint | Tests | Status |
|----------|-------|--------|
| `GET /api/opportunities` | 3 tests | ✅ Complete |
| `POST /api/opportunities` | 5 tests | ✅ Complete |
| `GET /api/opportunities/[id]` | 2 tests | ✅ Complete |
| `PATCH /api/opportunities/[id]` | 5 tests | ✅ Complete |
| `DELETE /api/opportunities/[id]` | 3 tests | ✅ Complete |

**Tested Behaviors**:
- ✅ Return opportunities with aggregated stats (totalProfit, totalInvested, totalRevenue)
- ✅ Filter by status
- ✅ Create opportunity from listing ID
- ✅ Missing listingId validation (400)
- ✅ Get single opportunity with listing relation
- ✅ 404 for non-existent opportunity
- ✅ Update opportunity fields
- ✅ Auto-calculate actualProfit (resalePrice - purchasePrice - fees)
- ✅ Delete opportunity and reset listing status
- ✅ All error handling (500)
- ✅ Listing not found handling on POST (404)
- ✅ Duplicate opportunity prevention (409)
- ✅ Status transitions (IDENTIFIED → CONTACTED → PURCHASED → LISTED → SOLD)
- ✅ Purchase/resale date handling in PATCH payloads

**NOT Tested**:
- (None - coverage added)

---

### 4. Dashboard Page
**File**: `src/app/page.tsx`  
**Test File**: `e2e/dashboard.spec.ts`  
**Coverage**: Playwright E2E (20+ scenarios covering gallery, filters, loading, and actions)

| Feature | Tests | Status |
|---------|-------|--------|
| Core layout & quick actions | 7 tests | ✅ Complete |
| Image gallery modal & navigation | 9 tests | ✅ Complete |
| Listings filtering & search | 3 tests | ✅ Complete |
| Refresh/navigation shortcuts | 2 tests | ✅ Complete |
| Mark as Opportunity action | 1 test | ✅ Complete |
| Loading & empty states | 2 tests | ✅ Complete |

**Tested Behaviors**:
- ✅ Header displays "Flipper.ai" with animated stats cards
- ✅ Listings table renders with thumbnails, badges, and actions
- ✅ Quick actions (Scrape Craigslist, View Opportunities) navigate correctly
- ✅ Search input filters table rows client-side
- ✅ Status filter sends API requests with the correct `status` query parameter
- ✅ Mark as Opportunity button triggers `/api/opportunities` POST and refresh
- ✅ Image gallery modal open/close via button, X, and backdrop
- ✅ Gallery next/previous controls and thumbnail jump navigation
- ✅ Loading spinner and empty state messaging render appropriately

**NOT Tested**:
- ❌ API/network error UI states (component currently logs to console only)
- ❌ Pagination behavior (feature not implemented yet)

---

### 5. Opportunities Page
**File**: `src/app/opportunities/page.tsx`  
**Test File**: `e2e/opportunities.spec.ts`  
**Coverage**: Playwright E2E (30+ scenarios including edit/delete workflows)

| Feature | Tests | Status |
|---------|-------|--------|
| Page layout & stats cards | 2 tests | ✅ Complete |
| Filters & search | 3 tests | ✅ Complete |
| Navigation between pages | 2 tests | ✅ Complete |
| Opportunity detail cards | 5 tests | ✅ Complete |
| Edit mode workflow | 7 tests | ✅ Complete |
| Delete confirmation & API calls | 5 tests | ✅ Complete |
| Metadata & purchase message display | 2 tests | ✅ Complete |

**Tested Behaviors**:
- ✅ Header, subtitle, stats cards, and empty state display
- ✅ Status filter buttons highlight active filters and search input updates
- ✅ Identified filter triggers server fetch with `status=IDENTIFIED` and hides mismatched cards
- ✅ Navigation between dashboard and opportunities
- ✅ Pricing labels, status badges, and action buttons render when data exists
- ✅ Edit button opens form populated with existing data (status, prices, notes)
- ✅ Status dropdown cycles through IDENTIFIED → SOLD options
- ✅ Purchase price, resale price, fees, platform, notes fields accept updates
- ✅ Save and Cancel buttons close the form appropriately
- ✅ Delete button shows confirmation dialog and triggers DELETE request
- ✅ Opportunity cards render listing images, tags, seller info, comparable URLs, and AI purchase message with copy-to-clipboard state
- ✅ LLM identification, verified market data, and recommended actions display with purchase message + comparable sold listings

**NOT Tested**:
- (None - major UI flows now covered in Playwright)

---

### 6. Scraper Page
**File**: `src/app/scraper/page.tsx`  
**Test File**: `e2e/scraper.spec.ts`  
**Coverage**: Playwright E2E (11 tests covering form, execution, results, and history)

| Feature | Tests | Status |
|---------|-------|--------|
| Form elements & selectors | 5 tests | ✅ Complete |
| Start scraping (loading state) | 1 test | ✅ Complete |
| Form validation/option lists | 3 tests | ✅ Complete |
| Results summary & listings preview | 1 test | ✅ Complete |
| Error handling | 1 test | ✅ Complete |
| Job history list & refresh | 1 test | ✅ Complete |

**Tested Behaviors**:
- ✅ All form inputs selectable (platform, location, category, keywords, price range)
- ✅ Start Scraping button enters loading state and calls `/api/scraper/craigslist`
- ✅ Successful scrape displays status banner, saved count, and listing preview cards
- ✅ Error response surfaces failure message and detailed error text
- ✅ Saved listings preview shows image/price/link rows and overflow "+N more" indicator
- ✅ Recent job history list renders, including completed/failed badges, counts, and errors
- ✅ Refresh icon re-requests job history data

**NOT Tested**:
- ❌ Form validation error messaging (no current UI feedback for invalid inputs)
- ❌ Cancel scraping action (feature not implemented)

---

### 7. Craigslist Scraper API
**File**: `src/app/api/scraper/craigslist/route.ts`  
**Test File**: `src/__tests__/api/craigslist-scraper.test.ts`  
**Coverage**: Jest unit tests with mocked Playwright + Prisma interactions

**Tested Behaviors**:
- ✅ GET endpoint returns supported platforms, categories, and locations
- ✅ POST validates required location/category fields
- ✅ Playwright browser lifecycle mocked (launch → context → page → close)
- ✅ Listing extraction logic and JSON payload mapping
- ✅ Image URL, price, and location parsing with fallbacks
- ✅ Prisma upsert + scraper job create/update flows
- ✅ Empty result handling and success responses
- ✅ Error handling paths surface 400/500 responses

**NOT Tested**:
- ❌ Rate limiting/backoff behavior (not implemented)
- ❌ Multi-selector fallback depth beyond primary selectors
- ❌ Full Playwright integration (covered via mocks only)

---

### 8. Database Layer
**File**: `src/lib/db.ts`
**Test File**: None (excluded from coverage)
**Coverage**: N/A - Excluded

**Note**: Database client is mocked in all tests. No integration tests with real SQLite database.

---

### 9. eBay Scraper API
**File**: `src/app/api/scraper/ebay/route.ts`  
**Test File**: `src/__tests__/api/ebay-scraper.test.ts`  
**Coverage**: Jest unit tests with mocked fetch + Prisma interactions

**Tested Behaviors**:
- ✅ GET metadata endpoint returns supported categories, conditions, and usage guidance
- ✅ Validation for required OAuth token, keywords, and invalid filters surfaces explicit errors
- ✅ Fixed-price search ingests listings, runs value estimator, and stores/upserts opportunities
- ✅ Sold-listing fetch persists comparable sales both on the listing and in `PriceHistory`
- ✅ Error handling for upstream API failures and Prisma writes returns 500 responses with details

**NOT Tested**:
- ❌ Pagination over 50 results (Browse API limit)  
- ❌ Marketplace overrides beyond `EBAY_US`
- ❌ Auction-only ingestion paths (currently annotate alongside fixed-price)

---

## Test Gaps Summary

### Critical (Must Fix)
| Feature | Gap | Priority |
|---------|-----|----------|
| (None) | — | — |

### Important (Should Fix)
| Feature | Gap | Priority |
|---------|-----|----------|
| Listings API | No integration tests with the SQLite DB | P1 |
| Dashboard | Missing user-facing error state messaging/tests | P1 |
| Scraper Page | Cancel scraping flow not implemented/tested | P1 |

### Nice to Have
| Feature | Gap | Priority |
|---------|-----|----------|
| All APIs | End-to-end integration tests | P2 |
| All Pages | Error state testing | P2 |
| All Pages | Loading state testing | P2 |
| All Pages | Accessibility testing | P2 |

---

## Recommended Test Additions

### Immediate (Before Phase 1)
1. **Listings API integration tests** - Run Prisma against SQLite to validate CRUD with real data
2. **Dashboard error UX** - Add UI messaging for failed listing fetches and cover with Playwright tests
3. **Scraper cancel/validation flows** - Implement cancel button + validation feedback, then add tests

### With Each Phase
- Every new API endpoint must have unit tests
- Every new page feature must have E2E tests
- Maintain 80%+ coverage on business logic

---

## Current State Summary

### Completed Features
- Dashboard with listings management, filtering, search, image gallery
- Opportunities lifecycle tracking (IDENTIFIED → CONTACTED → PURCHASED → LISTED → SOLD)
- Craigslist scraper with 12 locations and 11 categories
- Value estimation engine with category/brand/condition scoring
- Complete API CRUD for listings and opportunities
- SQLite database with Prisma ORM
- Test suite: 175 unit tests + 25 E2E tests

### Stubbed Features (Database exists, no API/UI)
- SearchConfig (saved searches)
- ScraperJob (job history tracking)
- PriceHistory (market trends)
- Multi-platform scrapers (Facebook, eBay, OfferUp marked "coming soon")

---

## Phase 1: Complete MVP Foundation

**Goal**: Finish all stubbed features to have a fully functional single-platform application.

### 1.1 Settings Page & Search Configurations

#### 1.1.1 SearchConfig API
- [x] Create `GET /api/search-configs` - List all saved searches
- [x] Create `POST /api/search-configs` - Create new search config
- [x] Create `GET /api/search-configs/[id]` - Get single config
- [x] Create `PATCH /api/search-configs/[id]` - Update config
- [x] Create `DELETE /api/search-configs/[id]` - Delete config
- [x] Add validation with Zod schemas

#### 1.1.2 Settings Page UI
- [x] Create `/src/app/settings/page.tsx`
- [x] Build search config list view with enable/disable toggles
- [x] Create search config form (name, platform, location, category, keywords, price range)
- [x] Add edit/delete functionality
- [x] Show last run timestamp for each config
- [x] Add "Run Now" button per config

#### 1.1.3 Integration
- [x] Connect scraper page to use saved configs
- [x] Add "Save as Config" button on scraper page
- [x] Show saved configs as quick-select options

### 1.2 Scraper Job History

#### 1.2.1 ScraperJob API
- [x] Create `GET /api/scraper-jobs` - List job history with pagination
- [x] Create `POST /api/scraper-jobs` - Create job record (internal use)
- [x] Create `GET /api/scraper-jobs/[id]` - Get job details
- [x] Update Craigslist scraper to create job records

#### 1.2.2 Job Tracking Integration
- [x] Wrap scraper execution with job lifecycle (PENDING → RUNNING → COMPLETED/FAILED)
- [x] Track listings found and opportunities identified per job
- [x] Store error messages on failure
- [x] Record start/completion timestamps

#### 1.2.3 Job History UI
- [x] Add "History" tab to scraper page
- [x] Display job list with status badges
- [x] Show job details modal (items found, duration, errors)
- [x] Add filters by status and date range

### 1.3 Enhanced Dashboard

#### 1.3.1 Batch Operations
- [x] Add multi-select checkboxes to listings table
- [x] Implement bulk status updates
- [x] Add bulk delete with confirmation
- [x] Implement bulk "Add to Opportunities"

#### 1.3.2 Improved Filtering
- [x] Add date range filter (scraped date)
- [x] Add location filter
- [x] Add category filter
- [x] Add price range slider
- [x] Persist filter state in URL params

#### 1.3.3 Export Functionality
- [ ] Add CSV export for listings
- [ ] Add CSV export for opportunities
- [ ] Include all analysis fields in export

### 1.4 User Authentication & API Key Management

> **NOTE**: Another agent is currently working on this section (authentication setup, UI, and integration). Coordinate before making changes here.

**Goal**: Enable user accounts with secure storage of personal API keys for LLM-powered analysis.

#### 1.4.1 Authentication Setup
- [ ] Install and configure NextAuth.js
- [ ] Add User model to Prisma schema (id, email, name, image, createdAt)
- [ ] Implement OAuth providers (Google, GitHub)
- [ ] Add email/password authentication option
- [ ] Create login/register pages
- [ ] Add session provider to app layout
- [ ] Protect API routes with authentication middleware

#### 1.4.2 User Settings Model
- [x] Create UserSettings model in Prisma schema:
  ```prisma
  model UserSettings {
    id              String   @id @default(cuid())
    userId          String   @unique
    user            User     @relation(fields: [userId], references: [id])
    openaiApiKey    String?  // Encrypted
    llmModel        String?  @default("gpt-4o-mini")
    discountThreshold Int?   @default(50)
    autoAnalyze     Boolean  @default(true)
    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt
  }
  ```
- [x] Add encryption for API key storage (use crypto module with app secret)
- [x] Create migration for new models
- [x] Generate Prisma client

#### 1.4.3 User Settings API
- [x] Create `GET /api/user/settings` - Get current user's settings
- [x] Create `PATCH /api/user/settings` - Update settings (including API key)
- [x] Create `POST /api/user/settings/validate-key` - Test if OpenAI key is valid
- [x] Add API key decryption utility for backend use
- [x] Implement secure API key masking for frontend display (show only last 4 chars)

#### 1.4.4 Settings Page UI
- [ ] Add "Account" section to `/settings` page
- [ ] Display user profile info (name, email, avatar)
- [ ] Add "API Keys" section with:
  - [ ] OpenAI API key input with show/hide toggle
  - [ ] "Test Key" button to validate
  - [ ] Status indicator (valid/invalid/not set)
  - [ ] Link to OpenAI API key creation page
- [ ] Add "Analysis Preferences" section:
  - [ ] LLM model selector (gpt-4o-mini, gpt-4o, gpt-4-turbo)
  - [ ] Minimum discount threshold slider (default 50%)
  - [ ] Auto-analyze toggle for new listings
- [ ] Add logout button

#### 1.4.5 Backend LLM Integration
- [ ] Update `src/lib/llm-identifier.ts` to accept API key parameter
- [ ] Update `src/lib/llm-analyzer.ts` to accept API key parameter
- [ ] Update scraper route to:
  - [ ] Fetch user's API key from UserSettings
  - [ ] Decrypt and pass to LLM functions
  - [ ] Fall back to env var if user key not set (for development)
- [ ] Add user context to scraper jobs (track which user ran the scrape)
- [ ] Update Listing model to include userId for data isolation

#### 1.4.6 Data Isolation
- [ ] Add userId field to Listing, Opportunity, ScraperJob, SearchConfig models
- [ ] Update all API routes to filter by authenticated user
- [ ] Migrate existing data to default user (for development)
- [ ] Add authorization checks to prevent cross-user data access

#### 1.4.7 Testing
- [ ] Add auth mocking utilities for tests
- [ ] Test API key encryption/decryption
- [ ] Test settings CRUD operations
- [ ] Test protected route access
- [ ] E2E tests for login/logout flow
- [ ] E2E tests for API key management

---

## Phase 2: Multi-Platform Scraping

**Goal**: Expand scraping to cover all major marketplace platforms.

### 2.1 Facebook Marketplace Scraper

#### 2.1.1 Research & Authentication
- [ ] Research Facebook Marketplace scraping strategies
- [ ] Evaluate authentication requirements
- [ ] Document rate limiting and anti-bot measures
- [ ] Decide: Browserbase cloud vs local Playwright

#### 2.1.2 Scraper Implementation
- [ ] Create `/api/scraper/facebook/route.ts`
- [ ] Implement login/session management
- [ ] Build listing extraction logic
- [ ] Handle pagination and infinite scroll
- [ ] Extract: title, price, location, condition, seller info, images

#### 2.1.3 Platform-Specific Adaptations
- [ ] Add Facebook-specific category mappings
- [ ] Update value estimator for Facebook condition terms
- [ ] Handle local-only vs shipping availability

#### 2.1.4 Testing & Reliability
- [ ] Add E2E tests for Facebook scraper
- [ ] Implement retry logic with exponential backoff
- [ ] Add rate limiting protection
- [ ] Handle session expiration gracefully

### 2.2 OfferUp Scraper

#### 2.2.1 Implementation
- [ ] Create `/api/scraper/offerup/route.ts`
- [ ] Research OfferUp page structure
- [ ] Build listing extraction (title, price, condition, location, images)
- [ ] Handle authentication if required

#### 2.2.2 Platform Adaptations
- [ ] Map OfferUp categories to internal schema
- [ ] Handle OfferUp-specific fields (shipping available, firm price)
- [ ] Extract seller ratings and history

### 2.3 eBay Scraper

#### 2.3.1 Strategy Decision
- [x] Evaluate: API vs scraping approach (Browse API selected for reliability and structured data)
- [x] Research eBay Browse API for listings (fixed-price focus with optional filters)
- [x] Document eBay partner program requirements (OAuth token required via `EBAY_OAUTH_TOKEN`)

#### 2.3.2 Implementation (Scraping Approach)
- [x] Create `/api/scraper/ebay/route.ts`
- [x] Focus on "Buy It Now" listings (Browse API filtered to `buyingOptions:{FIXED_PRICE}`)
- [x] Extract auction details if applicable (annotate listings that also expose auctions)
- [x] Handle seller reputation data (surface feedback score/percent in listing notes)

#### 2.3.3 eBay Sold Data Integration
- [x] Scrape completed/sold listings for price validation (Browse API `soldItemsOnly`)
- [x] Store in PriceHistory model
- [x] Integrate with value estimator for accuracy (verified market value + true discount stored on listing)

### 2.4 Unified Scraper Interface

#### 2.4.1 Abstraction Layer
- [ ] Create `BaseScraper` interface with common methods
- [ ] Standardize output format across all platforms
- [ ] Implement platform-specific adapters
- [ ] Add platform detection from URLs

#### 2.4.2 UI Updates
- [ ] Remove "coming soon" badges
- [ ] Enable platform dropdown selection
- [ ] Add platform-specific options (e.g., eBay auction filters)
- [ ] Show platform logos/icons

---

## Phase 3: Automation & Scheduling

**Goal**: Enable hands-off operation with scheduled scraping and notifications.

### 3.1 Background Job System

#### 3.1.1 Job Queue Infrastructure
- [ ] Evaluate options: cron jobs, Vercel cron, external queue (BullMQ, Inngest)
- [ ] Implement job queue for scraping tasks
- [ ] Add job retry logic with backoff
- [ ] Handle concurrent job limits

#### 3.1.2 Scheduled Scraping
- [ ] Add schedule configuration to SearchConfig (hourly, daily, custom cron)
- [ ] Implement scheduler to trigger saved searches
- [ ] Track last run and next scheduled run
- [ ] Add enable/disable per schedule

#### 3.1.3 Job Management
- [ ] Create job dashboard showing scheduled/running/completed jobs
- [ ] Add manual job trigger capability
- [ ] Implement job cancellation
- [ ] Show estimated next run time

### 3.2 Notification System

#### 3.2.1 Notification Preferences
- [ ] Add notification settings to settings page
- [ ] Support email notifications
- [ ] Support browser push notifications
- [ ] Support Discord/Slack webhooks

#### 3.2.2 Alert Triggers
- [ ] Alert on high-score opportunities (configurable threshold)
- [ ] Alert on specific keyword matches
- [ ] Alert on price drops (compare to previous scrape)
- [ ] Digest emails (daily/weekly summary)

#### 3.2.3 Implementation
- [ ] Create notification service abstraction
- [ ] Implement email provider integration (Resend, SendGrid)
- [ ] Add webhook delivery with retries
- [ ] Build notification history log

### 3.3 Auto-Actions

#### 3.3.1 Auto-Opportunity Creation
- [ ] Automatically create opportunities for listings above score threshold
- [ ] Make threshold configurable per search config
- [ ] Add auto-category rules

#### 3.3.2 Duplicate Detection
- [ ] Detect cross-platform duplicates (same item on multiple sites)
- [ ] Link duplicate listings together
- [ ] Show best price across platforms

---

## Phase 4: AI Integration & Enhanced Analysis

**Goal**: Leverage AI for smarter analysis and automation.

### 4.1 AI-Powered Value Estimation

#### 4.1.1 LLM Integration
- [ ] Integrate Google Gemini API for analysis
- [ ] Create prompt templates for value estimation
- [ ] Implement structured output parsing
- [ ] Add fallback to algorithmic estimation on API failure

#### 4.1.2 Enhanced Analysis
- [ ] AI-generated detailed item descriptions
- [ ] Authenticity risk assessment (counterfeit detection)
- [ ] Demand prediction (how fast will it sell)
- [ ] Optimal pricing recommendations

#### 4.1.3 Image Analysis
- [ ] Use vision models to analyze listing images
- [ ] Detect condition from photos
- [ ] Identify brand/model from images
- [ ] Flag missing/low-quality images

### 4.2 Price History & Market Intelligence

#### 4.2.1 PriceHistory Population
- [ ] Regularly scrape eBay sold listings for price data
- [ ] Store by product category and condition
- [ ] Build moving averages and trends

#### 4.2.2 Market Insights
- [ ] Show price trends over time
- [ ] Identify seasonal patterns
- [ ] Detect hot/cooling markets by category
- [ ] Calculate days-to-sell estimates

#### 4.2.3 Comparable Analysis
- [ ] Auto-fetch comparable sold items
- [ ] Display comps alongside listings
- [ ] Calculate price deviation from market

### 4.3 Smart Recommendations

#### 4.3.1 Opportunity Ranking
- [ ] ML-based opportunity scoring
- [ ] Factor in historical success rates
- [ ] Personalize based on user preferences/history

#### 4.3.2 Deal Alerts
- [ ] "Best deals right now" homepage section
- [ ] Price anomaly detection (unusually low prices)
- [ ] Time-sensitive opportunity flags

---

## Phase 5: User Experience & Polish

**Goal**: Professional UX with mobile support and accessibility.

### 5.1 Mobile Experience

#### 5.1.1 Responsive Optimization
- [ ] Audit all pages for mobile breakpoints
- [ ] Optimize tables for mobile (card view)
- [ ] Ensure touch-friendly interactions
- [ ] Test on actual devices

#### 5.1.2 PWA Features
- [ ] Add service worker for offline access
- [ ] Implement app manifest
- [ ] Add install prompt
- [ ] Cache critical assets

### 5.2 Performance Optimization

#### 5.2.1 Frontend Performance
- [ ] Implement virtual scrolling for large lists
- [ ] Add image lazy loading
- [ ] Optimize bundle size
- [ ] Add loading skeletons

#### 5.2.2 Backend Performance
- [ ] Add database indexes for common queries
- [ ] Implement API response caching
- [ ] Optimize Prisma queries
- [ ] Add pagination everywhere

### 5.3 Dashboard Enhancements

#### 5.3.1 Data Visualization
- [ ] Add profit/opportunity charts
- [ ] Show scraping activity timeline
- [ ] Category distribution pie chart
- [ ] Score distribution histogram

#### 5.3.2 Customization
- [ ] Customizable dashboard widgets
- [ ] Save custom filter presets
- [ ] Column visibility toggles
- [ ] Dark mode support

### 5.4 Communication Features

#### 5.4.1 Seller Contact Management
- [ ] Template library for seller messages
- [ ] Track contact history per listing
- [ ] Integration with email/SMS

#### 5.4.2 Purchase Request Enhancement
- [ ] Improve AI message generation
- [ ] A/B test message templates
- [ ] Track response rates

---

## Phase 6: Production Readiness

**Goal**: Deploy to production with proper infrastructure and monitoring.

### 6.1 Database Migration

#### 6.1.1 Production Database
- [ ] Evaluate options: Turso, PlanetScale, Supabase
- [ ] Migrate from SQLite to production DB
- [ ] Set up connection pooling
- [ ] Configure read replicas if needed

#### 6.1.2 Data Management
- [ ] Implement data backup strategy
- [ ] Add data retention policies
- [ ] Create data export tools
- [ ] GDPR compliance considerations

### 6.2 Authentication & Multi-tenancy

#### 6.2.1 User Authentication
- [ ] Add authentication (NextAuth.js or Clerk)
- [ ] Implement user registration/login
- [ ] Add OAuth providers (Google, GitHub)
- [ ] Session management

#### 6.2.2 Multi-user Support
- [ ] Add user ID to all models
- [ ] Implement data isolation
- [ ] Add team/workspace support
- [ ] Role-based permissions

### 6.3 Infrastructure

#### 6.3.1 Deployment
- [ ] Deploy to Vercel
- [ ] Configure environment variables
- [ ] Set up custom domain
- [ ] Implement CI/CD pipeline

#### 6.3.2 Monitoring & Observability
- [ ] Add error tracking (Sentry)
- [ ] Implement logging (Axiom, LogTail)
- [ ] Set up uptime monitoring
- [ ] Create operational dashboards

#### 6.3.3 Security
- [ ] Security audit
- [ ] Rate limiting on API endpoints
- [ ] Input validation hardening
- [ ] Secrets management

### 6.4 Scalability

#### 6.4.1 Scraper Scaling
- [ ] Implement scraper worker pool
- [ ] Add proxy rotation
- [ ] Handle CAPTCHA challenges
- [ ] Geographic distribution

#### 6.4.2 API Optimization
- [ ] Add Redis caching layer
- [ ] Implement API versioning
- [ ] Add GraphQL option
- [ ] WebSocket for real-time updates

---

## Phase 7: Advanced Features (Future)

**Goal**: Differentiated features for power users and monetization.

### 7.1 Inventory Management

- [ ] Track purchased inventory
- [ ] Storage location tracking
- [ ] Photography workflow integration
- [ ] Listing creation automation

### 7.2 Cross-Platform Listing

- [ ] Auto-list to multiple platforms
- [ ] Price synchronization
- [ ] Inventory sync across platforms
- [ ] Order management

### 7.3 Financial Tracking

- [ ] Expense tracking (gas, shipping, supplies)
- [ ] Tax reporting features
- [ ] Profit/loss statements
- [ ] ROI analysis by category

### 7.4 Community Features

- [ ] Share successful flips
- [ ] Pricing guidance from community
- [ ] Sourcing tips and locations
- [ ] Leaderboards and achievements

---

## Priority Matrix

| Phase | Impact | Effort | Priority |
|-------|--------|--------|----------|
| Phase 1.1-1.2: Settings + Job History | High | Medium | P0 - Done ✅ |
| Phase 1.4: User Auth + API Keys | High | Medium | P0 - Immediate |
| Phase 1.3: Enhanced Dashboard | Medium | Medium | P1 - Next |
| Phase 2: Multi-Platform | Very High | High | P1 - Next |
| Phase 3: Automation | High | Medium | P1 - Next |
| Phase 4: AI Integration | Medium | High | P2 - Soon |
| Phase 5: UX Polish | Medium | Medium | P2 - Soon |
| Phase 6: Production | Critical | Medium | P2 - Soon |
| Phase 7: Advanced | Medium | Very High | P3 - Future |

---

## Recommended Execution Order

1. **Phase 1.1-1.2** (Settings + Job History) - Complete the MVP ✅
2. **Phase 1.4** (User Auth + API Keys) - Enable personalized LLM analysis
3. **Phase 1.3** (Enhanced Dashboard) - Batch operations and exports
4. **Phase 2.1** (Facebook Marketplace) - Biggest market opportunity
5. **Phase 3.1-3.2** (Scheduling + Notifications) - Automation value
6. **Phase 2.2-2.3** (OfferUp + eBay) - Platform coverage
7. **Phase 4.1** (AI Value Estimation enhancements) - Accuracy improvement
8. **Phase 5** (UX Polish) - User retention
9. **Phase 4.2-4.3** (Market Intelligence) - Advanced features
10. **Phase 6** (Production Infrastructure) - Scale and reliability
11. **Phase 7** (Advanced Features) - Power user features

---

## Success Metrics

### MVP (Phase 1)
- All CRUD operations functional
- 100% test coverage on new APIs
- Settings page fully operational

### Authentication & API Keys (Phase 1.4)
- Users can register/login with OAuth or email
- API keys encrypted at rest, never exposed in logs
- LLM analysis works with user-provided keys
- Data properly isolated per user
- Settings page allows key management with validation

### Multi-Platform (Phase 2)
- Successfully scraping from 3+ platforms
- <5% error rate on scrapes
- Cross-platform duplicate detection working

### Automation (Phase 3)
- Scheduled jobs running reliably
- Notifications delivered within 5 minutes
- Zero missed scheduled runs

### Production (Phase 6)
- 99.9% uptime
- <500ms API response times
- Zero data loss events
