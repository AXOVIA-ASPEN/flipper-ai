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
| `GET /api/listings/[id]` | 0 tests | ❌ Missing |
| `PATCH /api/listings/[id]` | 0 tests | ❌ Missing |
| `DELETE /api/listings/[id]` | 0 tests | ❌ Missing |

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
- ❌ `GET /api/listings/[id]` - single listing fetch
- ❌ `PATCH /api/listings/[id]` - update listing
- ❌ `DELETE /api/listings/[id]` - delete listing
- ❌ Integration tests with real database

---

### 3. Opportunities API
**Files**: `src/app/api/opportunities/route.ts`, `src/app/api/opportunities/[id]/route.ts`
**Test File**: `src/__tests__/api/opportunities.test.ts`
**Coverage**: ~90% (estimated - Prisma mocked)

| Endpoint | Tests | Status |
|----------|-------|--------|
| `GET /api/opportunities` | 3 tests | ✅ Complete |
| `POST /api/opportunities` | 3 tests | ✅ Complete |
| `GET /api/opportunities/[id]` | 2 tests | ✅ Complete |
| `PATCH /api/opportunities/[id]` | 3 tests | ✅ Complete |
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

**NOT Tested**:
- ❌ Duplicate opportunity prevention (listing already has opportunity)
- ❌ Listing not found handling on POST
- ❌ Status transitions validation
- ❌ Date field handling (purchaseDate, resaleDate)

---

### 4. Dashboard Page
**File**: `src/app/page.tsx`
**Test File**: `e2e/dashboard.spec.ts`
**Coverage**: E2E only (7 tests)

| Feature | Tests | Status |
|---------|-------|--------|
| View dashboard | 1 test | ✅ Basic |
| Stats cards display | 1 test | ✅ Basic |
| Quick actions section | 1 test | ✅ Basic |
| Search input | 1 test | ✅ Basic |
| Status filter dropdown | 1 test | ✅ Basic |
| Refresh button | 1 test | ✅ Basic |
| Navigate to scraper | 1 test | ✅ Basic |

**Tested Behaviors**:
- ✅ Header displays "Flipper.ai"
- ✅ Stats cards visible (Total Listings, Opportunities, Potential Profit, Avg Score)
- ✅ Listings table visible with columns
- ✅ Quick actions visible (Scrape Craigslist, View Opportunities)
- ✅ Search input accepts text
- ✅ Status filter options exist
- ✅ Refresh button clickable
- ✅ Navigation to /scraper works

**NOT Tested**:
- ❌ Image gallery modal open/close
- ❌ Image navigation (prev/next)
- ❌ "Mark as Opportunity" button functionality
- ❌ Actual filtering behavior (API calls)
- ❌ Actual search behavior (API calls)
- ❌ Loading states
- ❌ Error states
- ❌ Empty state display
- ❌ Pagination behavior

---

### 5. Opportunities Page
**File**: `src/app/opportunities/page.tsx`
**Test File**: `e2e/opportunities.spec.ts`
**Coverage**: E2E only (10 tests)

| Feature | Tests | Status |
|---------|-------|--------|
| View page layout | 1 test | ✅ Basic |
| Empty state | 1 test | ✅ Basic |
| Status filter buttons | 2 tests | ✅ Basic |
| Search input | 1 test | ✅ Basic |
| Navigation | 2 tests | ✅ Basic |
| View pricing info | 1 test | ⚠️ Conditional |
| Status badges | 1 test | ⚠️ Conditional |
| Action buttons | 1 test | ⚠️ Conditional |

**Tested Behaviors**:
- ✅ Header and subtitle display
- ✅ Stats cards visible (Total Opportunities, Invested, Revenue, Profit)
- ✅ Back button navigation
- ✅ All status filter buttons visible
- ✅ Search input works
- ✅ Navigate from dashboard to opportunities
- ⚠️ Pricing labels (conditional on data)
- ⚠️ Edit/View buttons (conditional on data)

**NOT Tested**:
- ❌ Edit mode form submission
- ❌ Edit form field validation
- ❌ Delete confirmation dialog
- ❌ Delete API call
- ❌ Status update via edit
- ❌ Profit calculation display
- ❌ Purchase price/resale price input
- ❌ Fees input
- ❌ Notes editing
- ❌ Image display in opportunity card

---

### 6. Scraper Page
**File**: `src/app/scraper/page.tsx`
**Test File**: `e2e/scraper.spec.ts`
**Coverage**: E2E only (8 tests)

| Feature | Tests | Status |
|---------|-------|--------|
| Form elements visible | 1 test | ✅ Complete |
| Location selection | 1 test | ✅ Complete |
| Category selection | 1 test | ✅ Complete |
| Keywords input | 1 test | ✅ Complete |
| Price range inputs | 1 test | ✅ Complete |
| Start scraping | 1 test | ⚠️ Partial |
| Platform options | 1 test | ✅ Complete |
| Back navigation | 1 test | ✅ Complete |

**Tested Behaviors**:
- ✅ All form fields visible (platform, location, category, keywords, prices)
- ✅ Location dropdown options (sarasota, tampa, sfbay, newyork)
- ✅ Category dropdown options (electronics, furniture, video_gaming, music_instr)
- ✅ Platform options (craigslist enabled, facebook disabled)
- ✅ Input fields accept values
- ✅ Start button triggers loading state
- ✅ Back navigation works

**NOT Tested**:
- ❌ Actual scraping API call
- ❌ Scraping results display
- ❌ Error handling during scrape
- ❌ Scraped items preview
- ❌ "Saved X listings" count display
- ❌ Form validation
- ❌ Loading spinner states
- ❌ Cancel scraping

---

### 7. Craigslist Scraper API
**File**: `src/app/api/scraper/craigslist/route.ts`
**Test File**: None
**Coverage**: ❌ No tests

**NOT Tested**:
- ❌ POST /api/scraper/craigslist endpoint
- ❌ Playwright browser automation
- ❌ Listing extraction logic
- ❌ Multi-selector fallback strategy
- ❌ Image URL extraction
- ❌ Price parsing
- ❌ Location extraction
- ❌ Database upsert on scrape
- ❌ Error handling
- ❌ Rate limiting behavior

---

### 8. Database Layer
**File**: `src/lib/db.ts`
**Test File**: None (excluded from coverage)
**Coverage**: N/A - Excluded

**Note**: Database client is mocked in all tests. No integration tests with real SQLite database.

---

## Test Gaps Summary

### Critical (Must Fix)
| Feature | Gap | Priority |
|---------|-----|----------|
| Listings API | Missing tests for GET/PATCH/DELETE by ID | P0 |
| Craigslist Scraper | No tests at all | P0 |
| Dashboard | No tests for image gallery modal | P1 |
| Opportunities Page | No tests for edit/delete functionality | P1 |

### Important (Should Fix)
| Feature | Gap | Priority |
|---------|-----|----------|
| Listings API | No integration tests | P1 |
| Opportunities API | Missing duplicate prevention tests | P1 |
| Dashboard | No filtering/search behavior tests | P1 |
| Scraper Page | No actual scraping result tests | P1 |

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
1. **Listings API [id] tests** - Add unit tests for single listing operations
2. **Craigslist Scraper tests** - Mock Playwright, test extraction logic
3. **Dashboard E2E** - Add image gallery and filtering tests
4. **Opportunities E2E** - Add edit form and delete tests

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
- [ ] Create `GET /api/search-configs` - List all saved searches
- [ ] Create `POST /api/search-configs` - Create new search config
- [ ] Create `GET /api/search-configs/[id]` - Get single config
- [ ] Create `PATCH /api/search-configs/[id]` - Update config
- [ ] Create `DELETE /api/search-configs/[id]` - Delete config
- [ ] Add validation with Zod schemas

#### 1.1.2 Settings Page UI
- [ ] Create `/src/app/settings/page.tsx`
- [ ] Build search config list view with enable/disable toggles
- [ ] Create search config form (name, platform, location, category, keywords, price range)
- [ ] Add edit/delete functionality
- [ ] Show last run timestamp for each config
- [ ] Add "Run Now" button per config

#### 1.1.3 Integration
- [ ] Connect scraper page to use saved configs
- [ ] Add "Save as Config" button on scraper page
- [ ] Show saved configs as quick-select options

### 1.2 Scraper Job History

#### 1.2.1 ScraperJob API
- [ ] Create `GET /api/scraper-jobs` - List job history with pagination
- [ ] Create `POST /api/scraper-jobs` - Create job record (internal use)
- [ ] Create `GET /api/scraper-jobs/[id]` - Get job details
- [ ] Update Craigslist scraper to create job records

#### 1.2.2 Job Tracking Integration
- [ ] Wrap scraper execution with job lifecycle (PENDING → RUNNING → COMPLETED/FAILED)
- [ ] Track listings found and opportunities identified per job
- [ ] Store error messages on failure
- [ ] Record start/completion timestamps

#### 1.2.3 Job History UI
- [ ] Add "History" tab to scraper page
- [ ] Display job list with status badges
- [ ] Show job details modal (items found, duration, errors)
- [ ] Add filters by status and date range

### 1.3 Enhanced Dashboard

#### 1.3.1 Batch Operations
- [ ] Add multi-select checkboxes to listings table
- [ ] Implement bulk status updates
- [ ] Add bulk delete with confirmation
- [ ] Implement bulk "Add to Opportunities"

#### 1.3.2 Improved Filtering
- [ ] Add date range filter (scraped date)
- [ ] Add location filter
- [ ] Add category filter
- [ ] Add price range slider
- [ ] Persist filter state in URL params

#### 1.3.3 Export Functionality
- [ ] Add CSV export for listings
- [ ] Add CSV export for opportunities
- [ ] Include all analysis fields in export

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
- [ ] Evaluate: API vs scraping approach
- [ ] Research eBay Browse API for listings
- [ ] Document eBay partner program requirements

#### 2.3.2 Implementation (Scraping Approach)
- [ ] Create `/api/scraper/ebay/route.ts`
- [ ] Focus on "Buy It Now" listings
- [ ] Extract auction details if applicable
- [ ] Handle seller reputation data

#### 2.3.3 eBay Sold Data Integration
- [ ] Scrape completed/sold listings for price validation
- [ ] Store in PriceHistory model
- [ ] Integrate with value estimator for accuracy

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
| Phase 1: Complete MVP | High | Medium | P0 - Immediate |
| Phase 2: Multi-Platform | Very High | High | P0 - Immediate |
| Phase 3: Automation | High | Medium | P1 - Next |
| Phase 4: AI Integration | Medium | High | P2 - Soon |
| Phase 5: UX Polish | Medium | Medium | P2 - Soon |
| Phase 6: Production | Critical | Medium | P1 - Next |
| Phase 7: Advanced | Medium | Very High | P3 - Future |

---

## Recommended Execution Order

1. **Phase 1.1-1.2** (Settings + Job History) - Complete the MVP
2. **Phase 2.1** (Facebook Marketplace) - Biggest market opportunity
3. **Phase 6.1-6.2** (Database + Auth) - Enable production use
4. **Phase 3.1-3.2** (Scheduling + Notifications) - Automation value
5. **Phase 2.2-2.3** (OfferUp + eBay) - Platform coverage
6. **Phase 4.1** (AI Value Estimation) - Accuracy improvement
7. **Phase 5** (UX Polish) - User retention
8. **Phase 4.2-4.3** (Market Intelligence) - Advanced features
9. **Phase 7** (Advanced Features) - Power user features

---

## Success Metrics

### MVP (Phase 1)
- All CRUD operations functional
- 100% test coverage on new APIs
- Settings page fully operational

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
