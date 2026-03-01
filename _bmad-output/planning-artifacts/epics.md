---
stepsCompleted: [1, 2, 3, 4]
status: complete
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design.md
  - docs/IMPLEMENTATION_PLAN.md
  - HYBRID_ARCHITECTURE_PLAN.md
  - docs/LISTING-DECISION-LOGIC.md
  - docs/data-models.md
  - docs/security/SECURITY_AUDIT.md
  - docs/deployment/PRODUCTION_READINESS_REPORT.md
  - test/features/*.feature (9 existing BDD feature files, 71 scenarios)
---

# Flipper AI - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Flipper AI, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Definition of Done (DoD) — All Stories

**Every story in this project MUST meet ALL of the following criteria before it can be marked as `done`.** This DoD is mandatory and non-negotiable. Dev agents implementing stories MUST complete these items as part of the story implementation.

### Acceptance Test Requirements

1. **Gherkin Acceptance Tests:** Every Acceptance Criterion (AC) in a story MUST have at least one corresponding Gherkin scenario in the epic's `.feature` file. No AC may be left untested.

2. **Feature File Location & Naming:** Each epic has its own feature file at:
   ```
   test/acceptance/features/E-<NNN>-<epic-slug>.feature
   ```
   Examples:
   - `test/acceptance/features/E-001-production-infrastructure.feature`
   - `test/acceptance/features/E-002-user-registration-auth-onboarding.feature`
   - `test/acceptance/features/E-003-multi-marketplace-scanning.feature`
   - `test/acceptance/features/E-004-core-scoring-deal-evaluation.feature`
   - `test/acceptance/features/E-005-advanced-market-intelligence.feature`
   - `test/acceptance/features/E-006-flip-lifecycle-management-analytics.feature`
   - `test/acceptance/features/E-007-subscription-billing.feature`
   - `test/acceptance/features/E-008-seller-communication-negotiation.feature`
   - `test/acceptance/features/E-009-cross-platform-resale-listing.feature`
   - `test/acceptance/features/E-010-monitoring-email-notifications.feature`
   - `test/acceptance/features/E-011-push-sms-notifications.feature`
   - `test/acceptance/features/E-012-meeting-logistics.feature`

3. **Scenario Tagging — Three Required Tags Per Scenario:**
   Every Gherkin scenario MUST have ALL THREE of the following tags:

   - **`@E-<NNN>-S-<YYY>`** — Epic-scoped scenario ID. `NNN` = zero-padded epic number, `YYY` = sequential scenario number within that epic, starting at 1 and incrementing across ALL stories in the epic.
     - Example: `@E-001-S-1`, `@E-001-S-2`, ..., `@E-001-S-47`
     - Scenario numbers are global to the epic, NOT reset per story.

   - **`@story-<X>-<Y>`** — Story reference. `X` = epic number, `Y` = story number within the epic.
     - Example: `@story-1-1`, `@story-1-2`, ..., `@story-3-7`
     - A scenario MAY have multiple `@story-X-Y` tags if it tests acceptance criteria shared across stories.

   - **`@FR-<CATEGORY>-<NN>`** — Functional Requirement reference. Maps the scenario to the FR(s) it validates.
     - Example: `@FR-INFRA-11`, `@FR-SCAN-01`, `@FR-BILLING-03`
     - A scenario MAY have multiple `@FR-` tags if it covers multiple FRs.
     - NFRs use the tag format `@NFR-<CATEGORY>-<NN>` (e.g., `@NFR-SEC-02`, `@NFR-RELY-03`).

4. **Example Scenario (from Epic 1, Story 1.1):**
   ```gherkin
   # test/acceptance/features/E-001-production-infrastructure.feature

   Feature: Production Infrastructure & Secure Deployment
     As an operations team
     We need reliable infrastructure with proper secret management
     So that Flipper AI runs securely in production

     @E-001-S-1 @story-1-1 @FR-INFRA-11
     Scenario: Secrets are accessible via Secret Manager API
       Given a GCP project exists with Secret Manager API enabled
       When secrets are created with naming convention "{ENV}_{CATEGORY}_{KEY}"
       Then all secrets for the target environment are accessible via the Secret Manager API

     @E-001-S-2 @story-1-1 @FR-INFRA-12
     Scenario: secrets.py pulls production secrets when BUILD_ENV=production
       Given the "helpers/secrets.py" module exists
       When BUILD_ENV is set to "production"
       Then the module pulls all production secrets from GCP Secret Manager
       And sets them as environment variables

     @E-001-S-3 @story-1-1 @FR-INFRA-12
     Scenario: secrets.py pulls staging secrets when BUILD_ENV=staging
       Given the "helpers/secrets.py" module exists
       When BUILD_ENV is set to "staging"
       Then the module pulls all staging secrets from GCP Secret Manager
       And sets them as environment variables
   ```

5. **Requirements Traceability Matrix:** ALL scenarios MUST be tracked in:
   ```
   _bmad-output/test-artifacts/requirements-traceability-matrix.md
   ```
   This matrix maps every FR and NFR to its corresponding acceptance test scenarios, ensuring 100% coverage. The matrix format:

   | Requirement | Epic | Story | Scenario ID(s) | Feature File | Status |
   |---|---|---|---|---|---|
   | FR-INFRA-11 | Epic 1 | 1.1 | @E-001-S-1 | E-001-production-infrastructure.feature | Pending |
   | FR-INFRA-12 | Epic 1 | 1.1 | @E-001-S-2, @E-001-S-3, @E-001-S-4, @E-001-S-5 | E-001-production-infrastructure.feature | Pending |
   | FR-SCAN-01 | Epic 3 | 3.1 | @E-003-S-1, @E-003-S-2 | E-003-multi-marketplace-scanning.feature | Pending |

6. **100% Coverage Rule:** Every FR listed in the "FR Coverage Map" section below and every NFR in the "Non-Functional Requirements" section MUST appear in at least one scenario in the traceability matrix. Any gap is a blocker for story completion.

### Standard DoD Checklist (in addition to acceptance tests)

- [ ] All acceptance criteria are implemented and verified
- [ ] All Gherkin acceptance test scenarios are written in the epic's `.feature` file
- [ ] All scenarios are tagged with `@E-NNN-S-YYY`, `@story-X-Y`, and `@FR-XXX-NN` (or `@NFR-XXX-NN`)
- [ ] Requirements traceability matrix is updated in `_bmad-output/test-artifacts/requirements-traceability-matrix.md`
- [ ] Unit tests written for new business logic (`src/__tests__/`)
- [ ] No lint errors (`pnpm lint`)
- [ ] Build passes (`pnpm build`)
- [ ] All existing tests continue to pass (`pnpm test`)

---

## Requirements Inventory

### Functional Requirements

**FR-SCAN: Multi-Marketplace Scanner**

FR-SCAN-01: System shall scrape Craigslist listings using Playwright headless browser with custom user agent and selector fallbacks
FR-SCAN-02: System shall fetch eBay listings via Browse API v1 with OAuth token-based authentication
FR-SCAN-03: System shall scrape Facebook Marketplace listings via Graph API + Stagehand (Gemini-powered browser automation)
FR-SCAN-04: System shall scrape Mercari listings via reverse-engineered internal API (api.mercari.com/v2/search) as primary method, with authenticated Playwright browser automation as fallback. Shall detect 429 rate limits and apply exponential backoff
FR-SCAN-05: System shall scrape OfferUp listings via Playwright with anti-automation flags and resource blocking
FR-SCAN-06: System shall support configurable search filters: keywords, category, price range (min/max), location, radius
FR-SCAN-07: System shall save and load reusable search configurations (SearchConfig model: name, platform, location, keywords, price range, enabled flag)
FR-SCAN-08: System shall track scraping runs via ScraperJob model with status workflow: PENDING → RUNNING → COMPLETED/FAILED
FR-SCAN-09: System shall emit real-time SSE events during scraping (listing.found, job.progress, job.complete)
FR-SCAN-10: System shall apply anti-detection measures per platform (custom user agents, rate limiting, selector fallbacks, exponential backoff)
FR-SCAN-11: System shall extract listing data: title, description, asking price, condition, location, image URLs, external ID, platform URL
FR-SCAN-12: System shall deduplicate listings by [platform, externalId, userId] unique constraint
FR-SCAN-13: System shall pre-filter listings: skip price < 0 and sponsored listings. Items listed at price == 0 (FREE) shall be handled per user setting: "Free Item Handling" with options (a) include and flag for review, (b) auto-analyze flippability and include if score meets threshold, (c) skip entirely. Default: include and flag for review
FR-SCAN-14: System shall download and store listing images in Firebase Storage with structured paths (/{userId}/{platform}/{listingId}/{imageIndex}.{ext}) during scraping
FR-SCAN-15: System shall store image metadata (Firebase Storage path, original URL, dimensions, file size, content type) in Cloud SQL with listing foreign key reference
FR-SCAN-16: System shall serve listing images in the UI directly from Firebase Storage URLs stored in the database

**FR-SCORE: AI Flippability Score Engine**

FR-SCORE-01: System shall calculate algorithmic value score (0-100) using category multipliers, condition multiplier, brand boosts, and risk penalties
FR-SCORE-02: System shall detect item category from title/description (electronics, furniture, tools, video games, collectibles, clothing, sports, musical, automotive, appliances)
FR-SCORE-03: System shall apply brand boost keywords (Apple 1.2x, Samsung 1.15x, Sony 1.2x, Nintendo 1.25x, Dyson 1.3x, vintage/rare 1.4x, sealed 1.3x)
FR-SCORE-04: System shall apply risk penalty keywords (broken/damaged 0.3x, needs repair 0.4x, incomplete 0.6x, heavy use 0.75x, cosmetic wear 0.85x)
FR-SCORE-05: System shall calculate estimated market value: (askingPrice * categoryMultiplier * conditionMultiplier * boosts * penalties)
FR-SCORE-06: System shall calculate profit potential accounting for platform-specific fee rates (eBay ~13%, Mercari ~10%, Facebook Marketplace ~5%, OfferUp ~12.9%, Craigslist 0%) configurable in settings
FR-SCORE-07: System shall assign OPPORTUNITY status to listings with valueScore >= configurable threshold (default 70, adjustable in settings), NEW status otherwise
FR-SCORE-08: System shall identify items via LLM (GPT-4o-mini): extract brand, model, variant, year, condition, and generate optimized search query
FR-SCORE-09: System shall fetch verified market prices from eBay sold listings for LLM-identified items
FR-SCORE-10: System shall calculate true discount percentage against verified market value (not algorithmic estimate)
FR-SCORE-11: System shall assess sellability via LLM: demand level, expected days to sell, authenticity risk, condition risk, confidence level
FR-SCORE-12: System shall recommend offer price and listing price based on verified market data
FR-SCORE-13: System shall filter listings by undervalue threshold (default 50%) when LLM analysis is active — only save listings meeting threshold
FR-SCORE-14: System shall cache AI analysis results in AiAnalysisCache table with 24-hour TTL
FR-SCORE-15: System shall fall back to algorithmic scoring when AI APIs are unavailable
FR-SCORE-16: System shall perform structural item analysis via Claude Sonnet (Anthropic) as Tier 2 analysis
FR-SCORE-17: System shall search for and match comparable sold items (comps) using LLM-generated search queries, filtering for matching brand/model/condition — not just keyword overlap
FR-SCORE-18: System shall analyze sold volume for the identified item (number of sales in last 30/60/90 days) to assess market liquidity and demand trend (rising, stable, declining)
FR-SCORE-19: System shall analyze item completeness and physical state beyond simple condition: accessories included, cosmetic vs functional damage, original packaging, missing parts
FR-SCORE-20: System shall analyze seller reputation/rating on the source platform (where available via API or scraping) as a risk factor — low-rated sellers increase authenticity and accuracy risk
FR-SCORE-21: System shall analyze logistics difficulty: item size/weight category (small/shippable, large/local-pickup-only, fragile/special-handling), estimated shipping cost impact on profit, and local-only vs nationwide resale viability
FR-SCORE-22: System shall factor shipping/delivery costs into profit calculation — items requiring expensive shipping or local-only pickup reduce effective profit margin and resale audience

**FR-COMM: Seller Communication**

FR-COMM-01: System shall generate personalized purchase messages using AI (platform-appropriate tone)
FR-COMM-02: System shall support multiple message types: inquiry, offer, follow-up, negotiation
FR-COMM-03: System shall provide AI-powered negotiation strategy suggestions with recommended offer amounts
FR-COMM-04: System shall display message inbox with thread history per listing
FR-COMM-05: System shall implement message approval workflow: DRAFT → PENDING_APPROVAL → SENT → DELIVERED
FR-COMM-06: System shall track conversation status per listing (pending, responded, purchased)
FR-COMM-07: System shall support inbound message tracking (seller replies)
FR-COMM-08: System shall store messages with direction (INBOUND/OUTBOUND), status, body, listing reference, and parent thread ID

**FR-RELIST: Resale Listing Generator**

FR-RELIST-01: System shall generate SEO-optimized resale titles from item data using GPT-4o-mini
FR-RELIST-02: System shall generate platform-specific resale descriptions highlighting value using GPT-4o-mini
FR-RELIST-03: System shall calculate optimal listing price based on verified market data and target profit margin
FR-RELIST-04: System shall support cross-platform posting queue (PostingQueueItem model: targetPlatform, status, retryCount, maxRetries)
FR-RELIST-05: System shall track posting status workflow: PENDING → IN_PROGRESS → POSTED/FAILED with retry logic (max 3 retries)
FR-RELIST-06: System shall enforce unique constraint [listingId, targetPlatform, userId] to prevent duplicate postings
FR-RELIST-07: System shall fall back to algorithmic title/description templates when AI APIs are unavailable
FR-RELIST-08: System shall re-use stored Firebase Storage images when cross-posting listings to other platforms, avoiding re-download

**FR-DASH: Dashboard & Tracking**

FR-DASH-01: System shall display dashboard with listing inventory, stats cards, filters, and pagination
FR-DASH-02: System shall provide Kanban board with drag-and-drop cards across columns: IDENTIFIED → CONTACTED → PURCHASED → LISTED → SOLD → PASSED
FR-DASH-03: System shall capture purchase price when moving opportunity to PURCHASED status
FR-DASH-04: System shall capture resale URL when moving opportunity to LISTED status
FR-DASH-05: System shall capture final sale price and calculate actual profit (sale - purchase - fees) when moving to SOLD
FR-DASH-06: System shall provide advanced filtering by platform, score, profit, category, status
FR-DASH-07: System shall display analytics: total profit, flips completed, average profit per flip, success rate, best flip, profit by category, monthly trends, platform performance
FR-DASH-08: System shall support CSV/PDF export of performance reports
FR-DASH-09: System shall display inventory view for purchased items awaiting resale with holding cost calculations (days held, estimated carrying cost)
FR-DASH-10: System shall provide real-time dashboard updates via SSE events
FR-DASH-11: System shall display onboarding wizard (6 steps: welcome, marketplaces, categories, budget, location, complete)
FR-DASH-12: System shall persist onboarding progress server-side
FR-DASH-13: System shall display landing page with hero section, features, pricing tiers, and CTA

**FR-MONITOR: Listing Monitoring**

FR-MONITOR-01: System shall detect when tracked listings are sold (SOLD status detection)
FR-MONITOR-02: System shall track price changes on watched listings and notify on price drops
FR-MONITOR-03: System shall warn before listings expire (24-hour warning)
FR-MONITOR-04: System shall alert user when a tracked listing is no longer available

**FR-NOTIFY: Push Notifications & Email Alerts (Phase 2)**

FR-NOTIFY-01: System shall send push notification and email alert when a new flippable item is found, including: platform, buy price, estimated profit margin, flippability score, and brief item description
FR-NOTIFY-02: System shall send push notification when a new inbound message is received in an ongoing communication thread about an active flip
FR-NOTIFY-03: System shall send push notification and email alert when a new AI-generated draft message is ready for user review before sending
FR-NOTIFY-04: System shall send push notification when a message has been sent in an ongoing communication thread about an active flip
FR-NOTIFY-05: System shall send push notification and email alert when an active flip has been sold, including final sale price and profit
FR-NOTIFY-06: System shall send push notification when a prospective flip has been purchased successfully
FR-NOTIFY-07: System shall send push notification when a purchased item has been shipped
FR-NOTIFY-08: System shall send push notification when a review has been left about the user on any connected platform
FR-NOTIFY-09: System shall send push notification when a flip has gone cold — message thread has not received a response for a configurable duration (settings: "Flip Gone Cold Time" in hours, default 24h)
FR-NOTIFY-10: System shall send push notification when a flip is hot — message thread has received a configurable number of consecutive inbound messages before user has responded (settings: "Flip Turned Hot #" default 3), nudging user to review draft response
FR-NOTIFY-11: System shall send push notification when an active flip's listing price changes on the source platform, including old price, new price, direction indicator (red for increase, green for decrease), and updated estimated profit margin
FR-NOTIFY-12: System shall support user-configurable notification preferences per event type in Settings, with three independent toggles per event: push notification, email, and SMS text — all available for all event types
FR-NOTIFY-13: System shall integrate Twilio for SMS text notifications, sending to user's verified phone number configured in Settings

**FR-MEET: Meeting & Logistics (Phase 2)**

FR-MEET-01: System shall integrate with Google Calendar API (via OAuth configured in Settings) to automatically create calendar events when a meeting time and place is settled for buying or selling an item, including item details, counterparty info, and location
FR-MEET-02: System shall integrate with Google Maps SDK (configurable in Settings) to automatically generate a route from user's current location to the scheduled meeting location, calculated to depart at the right time to arrive on schedule

**FR-BILLING: User Management & Billing**

FR-BILLING-01: System shall authenticate users via NextAuth v5 with email/password credentials
FR-BILLING-02: System shall support OAuth login (Google, GitHub, Facebook) with Facebook OAuth additionally providing marketplace token for Graph API access
FR-BILLING-03: System shall enforce subscription tiers: FREE (10 scans/day, 1 marketplace), FLIPPER ($19/mo, unlimited scans, 3 marketplaces), PRO ($49/mo, all features)
FR-BILLING-04: System shall integrate Stripe Checkout for subscription purchases
FR-BILLING-05: System shall integrate Stripe Customer Portal for billing management
FR-BILLING-06: System shall handle Stripe webhooks for subscription events (upgrade, downgrade, cancel, payment failure)
FR-BILLING-07: System shall enforce feature gating based on subscription tier
FR-BILLING-08: System shall track API usage (scans/analyses) per user per month
FR-BILLING-09: System shall manage user settings: profile, notifications, AI preferences, API keys (encrypted at rest)
FR-BILLING-10: System shall protect login with hCaptcha
FR-BILLING-11: System shall support password reset via email (Resend transactional email)

**FR-INFRA: GCP Infrastructure**

FR-INFRA-01: System shall be containerized (Dockerfile) and deployed to Google Cloud Run
FR-INFRA-02: System shall use Cloud SQL (managed PostgreSQL) as the production database
FR-INFRA-03: System shall migrate from NextAuth v5 to Firebase Auth for social login and JWT token management as part of GCP infrastructure unification (replaces FR-BILLING-01 auth provider in production)
FR-INFRA-04: System shall serve static assets via Firebase Hosting with CDN
FR-INFRA-05: System shall auto-scale from 0 to N instances on Cloud Run based on demand
FR-INFRA-06: System shall deploy via GitHub Actions CI/CD pipeline to Cloud Run
FR-INFRA-07: System shall configure Cloud SQL connection from Cloud Run (Unix socket or Cloud SQL Auth Proxy)
FR-INFRA-08: System shall manage non-secret environment configuration (NODE_ENV, BUILD_ENV, feature flags) via Cloud Run service configuration. All secret values are managed exclusively through GCP Secret Manager per FR-INFRA-11
FR-INFRA-09: System shall configure CORS between Firebase Hosting frontend and Cloud Run backend
FR-INFRA-10: System shall implement health check endpoints for Cloud Run readiness/liveness probes
FR-INFRA-11: GCP Secret Manager is the sole source of truth for ALL secret values (API keys, database credentials, OAuth secrets, encryption keys, service tokens). No secret shall be defined in Cloud Run config, .env files, or any other location in production. The helpers/secrets.py module is the single extraction script — the only place GCP secret names are mapped — and all other code retrieves secrets through it
FR-INFRA-12: The helpers/secrets.py module shall use Python dataclasses to organize secrets by category (database, auth, API keys, payments, email, monitoring), pull from GCP Secret Manager based on BUILD_ENV (staging/production), and set the correct environment variables at build/deploy time
FR-INFRA-13: System shall use Firebase Storage for listing image binary storage with Cloud SQL storing image metadata (path, original URL, dimensions, file size, content type)
FR-INFRA-14: System shall integrate Firebase Cloud Messaging (FCM) for push notifications to web and mobile clients

### Non-Functional Requirements

NFR-PERF-01: Page loads < 2 seconds
NFR-PERF-02: Scraper completes single marketplace scan in < 60 seconds
NFR-PERF-03: AI analysis response < 10 seconds per listing
NFR-PERF-04: SSE events delivered within 1 second of trigger

NFR-SEC-01: All traffic over HTTPS
NFR-SEC-02: Passwords hashed with bcryptjs (12 rounds)
NFR-SEC-03: Rate limiting on all auth endpoints
NFR-SEC-04: Secure session management (JWT HttpOnly cookies)
NFR-SEC-05: Input validation and sanitization (Zod) on all API endpoints
NFR-SEC-06: API key encryption at rest (user-supplied OpenAI keys)
NFR-SEC-07: Security headers enforced (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
NFR-SEC-08: Stripe webhook signature verification
NFR-SEC-09: hCaptcha on login
NFR-SEC-10: No critical or high vulnerabilities in production dependencies

NFR-SCALE-01: Cloud Run auto-scaling (0 to N instances)
NFR-SCALE-02: Database connection pooling via Cloud SQL
NFR-SCALE-03: AI analysis caching (24-hour TTL via AiAnalysisCache)

NFR-RELY-01: Graceful degradation when AI APIs unavailable (fallback to algorithmic scoring)
NFR-RELY-02: Scraper retry logic with exponential backoff
NFR-RELY-03: Health check endpoints (/api/health, /api/health/ready, /api/health/metrics)
NFR-RELY-04: Structured logging via pino

NFR-TEST-01: 80%+ unit test coverage
NFR-TEST-02: E2E tests for all critical user flows (Playwright)
NFR-TEST-03: BDD acceptance tests for all functional requirements (pytest-bdd + Playwright)
NFR-TEST-04: Requirements traceability matrix with 100% FR/NFR coverage
NFR-TEST-05: CI/CD pipeline runs all test levels on every push/PR

NFR-UX-01: Mobile-responsive UI (mobile-first design)
NFR-UX-02: Accessible (WCAG AA compliance)
NFR-UX-03: Consistent design system (Tailwind CSS 4, lucide-react icons, custom theme system)
NFR-UX-04: Toast notification system for user feedback (success, error, info, alert, opportunity types)
NFR-UX-05: Global error boundary with retry logic

### Additional Requirements

**From Architecture:**
- AR-01: Prisma ORM v7.4 with 13 models must be maintained for all data access
- AR-02: Next.js App Router convention for all API routes (route.ts exports HTTP method handlers)
- AR-03: API responses follow consistent shape: `{ success, data/message }`
- AR-04: SSE streaming via `/api/events` endpoint for real-time updates
- AR-05: Sentry integration for error tracking and performance monitoring
- AR-06: Resend for transactional email delivery
- AR-07: Stagehand (Gemini) for AI-powered browser automation on Facebook Marketplace

**From UX Design:**
- UX-01: Navigation bar with Dashboard, Opportunities, Settings links using active state via `usePathname()`
- UX-02: Theme system with dark/light support via ThemeContext + CSS variables
- UX-03: Kanban board uses @hello-pangea/dnd for drag-and-drop interactions
- UX-04: 6-step onboarding wizard with WizardLayout (progress bar, back/next/skip)
- UX-05: 9 documented user flows covering complete lifecycle from registration to profit tracking
- UX-06: Skeleton loading screens for data-heavy pages
- UX-07: 14 pages total (3 public, 2 auth, 7 core app, 2 system)

**From Hybrid Architecture Plan:**
- HA-01: Cloud Run deployment using Dockerfile with gunicorn/next start
- HA-02: Cloud SQL PostgreSQL instance (db-f1-micro tier, us-central1 region)
- HA-03: Firebase Auth with email/password + Google + GitHub social login
- HA-04: Firebase Hosting for static assets with CDN
- HA-05: GitHub Actions CI/CD with Cloud Build for container image builds
- HA-06: CORS configuration between Firebase Hosting and Cloud Run origins
- HA-07: Environment variables managed via Cloud Run service configuration

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR-SCAN-01 | Epic 3 | Craigslist Playwright scraper |
| FR-SCAN-02 | Epic 3 | eBay Browse API v1 |
| FR-SCAN-03 | Epic 3 | Facebook Graph API + Stagehand |
| FR-SCAN-04 | Epic 3 | Mercari reverse-engineered API + Playwright fallback |
| FR-SCAN-05 | Epic 3 | OfferUp Playwright scraper |
| FR-SCAN-06 | Epic 3 | Configurable search filters |
| FR-SCAN-07 | Epic 3 | Saved search configurations |
| FR-SCAN-08 | Epic 3 | ScraperJob status tracking |
| FR-SCAN-09 | Epic 3 | SSE real-time events |
| FR-SCAN-10 | Epic 3 | Anti-detection measures |
| FR-SCAN-11 | Epic 3 | Listing data extraction |
| FR-SCAN-12 | Epic 3 | Deduplication |
| FR-SCAN-13 | Epic 3 | Pre-filtering + free item handling |
| FR-SCAN-14 | Epic 3 | Image download to Firebase Storage |
| FR-SCAN-15 | Epic 3 | Image metadata in Cloud SQL |
| FR-SCAN-16 | Epic 3 | Serve images in UI |
| FR-SCORE-01 | Epic 4 | Algorithmic value score (0-100) |
| FR-SCORE-02 | Epic 4 | Category detection |
| FR-SCORE-03 | Epic 4 | Brand boost keywords |
| FR-SCORE-04 | Epic 4 | Risk penalty keywords |
| FR-SCORE-05 | Epic 4 | Estimated market value calculation |
| FR-SCORE-06 | Epic 4 | Platform-specific fee rates |
| FR-SCORE-07 | Epic 4 | Configurable opportunity threshold |
| FR-SCORE-08 | Epic 4 | LLM item identification |
| FR-SCORE-09 | Epic 4 | Verified market prices from eBay sold |
| FR-SCORE-10 | Epic 4 | True discount percentage |
| FR-SCORE-11 | Epic 4 | LLM sellability assessment |
| FR-SCORE-12 | Epic 4 | Offer/listing price recommendations |
| FR-SCORE-13 | Epic 4 | Undervalue threshold filtering |
| FR-SCORE-14 | Epic 4 | AI analysis caching (24h TTL) |
| FR-SCORE-15 | Epic 4 | Algorithmic fallback |
| FR-SCORE-16 | Epic 5 | Claude Sonnet structural analysis |
| FR-SCORE-17 | Epic 5 | Comparable sold item matching |
| FR-SCORE-18 | Epic 5 | Sold volume / demand trend analysis |
| FR-SCORE-19 | Epic 5 | Item completeness / physical state |
| FR-SCORE-20 | Epic 5 | Seller reputation analysis |
| FR-SCORE-21 | Epic 5 | Logistics difficulty analysis |
| FR-SCORE-22 | Epic 5 | Shipping cost impact on profit |
| FR-COMM-01 | Epic 8 | AI purchase message generation |
| FR-COMM-02 | Epic 8 | Multiple message types |
| FR-COMM-03 | Epic 8 | AI negotiation strategy |
| FR-COMM-04 | Epic 8 | Message inbox with threads |
| FR-COMM-05 | Epic 8 | Message approval workflow |
| FR-COMM-06 | Epic 8 | Conversation status tracking |
| FR-COMM-07 | Epic 8 | Inbound message tracking |
| FR-COMM-08 | Epic 8 | Message storage model |
| FR-RELIST-01 | Epic 9 | AI resale title generation |
| FR-RELIST-02 | Epic 9 | AI resale description generation |
| FR-RELIST-03 | Epic 9 | Optimal listing price calculation |
| FR-RELIST-04 | Epic 9 | Cross-platform posting queue |
| FR-RELIST-05 | Epic 9 | Posting status workflow + retry |
| FR-RELIST-06 | Epic 9 | Duplicate posting prevention |
| FR-RELIST-07 | Epic 9 | Algorithmic fallback templates |
| FR-RELIST-08 | Epic 9 | Firebase image reuse for cross-posting |
| FR-DASH-01 | Epic 6 | Dashboard with inventory, stats, filters |
| FR-DASH-02 | Epic 6 | Kanban board drag-and-drop |
| FR-DASH-03 | Epic 6 | Capture purchase price |
| FR-DASH-04 | Epic 6 | Capture resale URL |
| FR-DASH-05 | Epic 6 | Capture sale price, calculate profit |
| FR-DASH-06 | Epic 6 | Advanced filtering |
| FR-DASH-07 | Epic 6 | Analytics display |
| FR-DASH-08 | Epic 6 | CSV/PDF export |
| FR-DASH-09 | Epic 6 | Inventory view with holding costs |
| FR-DASH-10 | Epic 6 | Real-time SSE dashboard updates |
| FR-DASH-11 | Epic 2 | Onboarding wizard |
| FR-DASH-12 | Epic 2 | Persist onboarding progress |
| FR-DASH-13 | Epic 2 | Landing page |
| FR-MONITOR-01 | Epic 10 | Detect listing sold |
| FR-MONITOR-02 | Epic 10 | Track price changes |
| FR-MONITOR-03 | Epic 10 | Listing expiration warning |
| FR-MONITOR-04 | Epic 10 | Listing unavailable alert |
| FR-NOTIFY-01 | Epic 10 | New flippable item alert (email) |
| FR-NOTIFY-02 | Epic 10 | Inbound message alert (email) |
| FR-NOTIFY-03 | Epic 10 | Draft message ready alert (email) |
| FR-NOTIFY-04 | Epic 10 | Message sent alert (email) |
| FR-NOTIFY-05 | Epic 10 | Flip sold alert (email) |
| FR-NOTIFY-06 | Epic 10 | Flip purchased alert (email) |
| FR-NOTIFY-07 | Epic 10 | Item shipped alert (email) |
| FR-NOTIFY-08 | Epic 10 | Review left alert (email) |
| FR-NOTIFY-09 | Epic 10 | Flip gone cold alert (email) |
| FR-NOTIFY-10 | Epic 10 | Flip hot alert (email) |
| FR-NOTIFY-11 | Epic 10 | Price change alert (email) |
| FR-NOTIFY-12 | Epic 10/11 | Configurable preferences (email in E10, push/SMS toggles in E11) |
| FR-NOTIFY-13 | Epic 11 | Twilio SMS integration |
| FR-MEET-01 | Epic 12 | Google Calendar integration |
| FR-MEET-02 | Epic 12 | Google Maps route generation |
| FR-BILLING-01 | Epic 2 | NextAuth email/password auth |
| FR-BILLING-02 | Epic 2 | OAuth login (Google, GitHub, Facebook) |
| FR-BILLING-03 | Epic 7 | Subscription tier enforcement |
| FR-BILLING-04 | Epic 7 | Stripe Checkout |
| FR-BILLING-05 | Epic 7 | Stripe Customer Portal |
| FR-BILLING-06 | Epic 7 | Stripe webhooks |
| FR-BILLING-07 | Epic 7 | Feature gating by tier |
| FR-BILLING-08 | Epic 7 | API usage tracking |
| FR-BILLING-09 | Epic 2 | User settings management |
| FR-BILLING-10 | Epic 2 | hCaptcha login protection |
| FR-BILLING-11 | Epic 2 | Password reset via Resend |
| FR-INFRA-01 | Epic 1 | Cloud Run containerized deployment |
| FR-INFRA-02 | Epic 1 | Cloud SQL PostgreSQL |
| FR-INFRA-03 | Epic 1 | Firebase Auth migration |
| FR-INFRA-04 | Epic 1 | Firebase Hosting CDN |
| FR-INFRA-05 | Epic 1 | Cloud Run auto-scaling |
| FR-INFRA-06 | Epic 1 | GitHub Actions CI/CD |
| FR-INFRA-07 | Epic 1 | Cloud SQL connection config |
| FR-INFRA-08 | Epic 1 | Non-secret env config |
| FR-INFRA-09 | Epic 1 | CORS configuration |
| FR-INFRA-10 | Epic 1 | Health check endpoints |
| FR-INFRA-11 | Epic 1 | GCP Secret Manager (sole source of truth) |
| FR-INFRA-12 | Epic 1 | helpers/secrets.py module |
| FR-INFRA-13 | Epic 1 | Firebase Storage for images |
| FR-INFRA-14 | Epic 1 | Firebase Cloud Messaging |

## Epic List

### Epic 1: Production Infrastructure & Secure Deployment
Users can access Flipper AI as a deployed, secure, always-on web application with proper secret management and all GCP/Firebase services configured.
**FRs covered:** FR-INFRA-01, FR-INFRA-02, FR-INFRA-03, FR-INFRA-04, FR-INFRA-05, FR-INFRA-06, FR-INFRA-07, FR-INFRA-08, FR-INFRA-09, FR-INFRA-10, FR-INFRA-11, FR-INFRA-12, FR-INFRA-13, FR-INFRA-14
**NFRs addressed:** NFR-SEC-01, NFR-SCALE-01, NFR-SCALE-02, NFR-RELY-03, NFR-RELY-04, NFR-TEST-05
**Implementation notes:** Cloud Run + Cloud SQL + Firebase Auth (migrating from NextAuth) + Firebase Hosting + Firebase Storage + FCM + Secret Manager + GitHub Actions CI/CD. All infrastructure in one epic to avoid scattered config.

### Epic 2: User Registration, Auth & Onboarding
Users can create accounts via email or OAuth (Google, GitHub, Facebook), complete a guided onboarding wizard, configure preferences, and access the landing page.
**FRs covered:** FR-BILLING-01, FR-BILLING-02, FR-BILLING-09, FR-BILLING-10, FR-BILLING-11, FR-DASH-11, FR-DASH-12, FR-DASH-13
**NFRs addressed:** NFR-SEC-02, NFR-SEC-03, NFR-SEC-04, NFR-SEC-05, NFR-SEC-06, NFR-SEC-07, NFR-SEC-09
**Implementation notes:** Mostly built. Landing page, registration, login, onboarding wizard, settings, hCaptcha, password reset all exist. Auth provider migration from NextAuth to Firebase Auth handled in Epic 1.

### Epic 3: Multi-Marketplace Scanning & Image Capture
Users can search across 5 marketplaces (Craigslist, eBay, Facebook, Mercari, OfferUp), configure and save searches, view real-time scan progress, and see listing images stored for later use.
**FRs covered:** FR-SCAN-01, FR-SCAN-02, FR-SCAN-03, FR-SCAN-04, FR-SCAN-05, FR-SCAN-06, FR-SCAN-07, FR-SCAN-08, FR-SCAN-09, FR-SCAN-10, FR-SCAN-11, FR-SCAN-12, FR-SCAN-13, FR-SCAN-14, FR-SCAN-15, FR-SCAN-16
**NFRs addressed:** NFR-PERF-02, NFR-PERF-04, NFR-RELY-02
**Implementation notes:** Craigslist and eBay scrapers mostly built. Mercari (reverse-engineered API), Facebook (Graph API + Stagehand), OfferUp (Playwright) need completion. Image capture to Firebase Storage is new.

### Epic 4: Core Scoring & Deal Evaluation
Users can evaluate flip potential with algorithmic scoring, AI-powered item identification, verified market prices, sellability analysis, and configurable thresholds.
**FRs covered:** FR-SCORE-01, FR-SCORE-02, FR-SCORE-03, FR-SCORE-04, FR-SCORE-05, FR-SCORE-06, FR-SCORE-07, FR-SCORE-08, FR-SCORE-09, FR-SCORE-10, FR-SCORE-11, FR-SCORE-12, FR-SCORE-13, FR-SCORE-14, FR-SCORE-15
**NFRs addressed:** NFR-PERF-03, NFR-SCALE-03, NFR-RELY-01
**Implementation notes:** Algorithmic tier (SCORE-01 through SCORE-07) built in value-estimator.ts. LLM tier (SCORE-08 through SCORE-15) partially built. Platform-specific fees and configurable threshold are updates to existing code.

### Epic 5: Advanced Market Intelligence
Users get deeper analysis with comparable sold item matching, market volume/demand trends, item completeness assessment, seller reputation scoring, logistics difficulty, and shipping cost impact.
**FRs covered:** FR-SCORE-16, FR-SCORE-17, FR-SCORE-18, FR-SCORE-19, FR-SCORE-20, FR-SCORE-21, FR-SCORE-22
**Implementation notes:** All new. Requires external API integrations: Apify (eBay sold comps/volume), Geoapify (logistics/distance), Shippo (shipping rates), GPT-4o/Claude Vision (condition analysis). Claude Sonnet structural analysis (SCORE-16) is built.

### Epic 6: Flip Lifecycle Management & Analytics
Users can track flips from discovery to sale on a Kanban board, view profit analytics, manage inventory with holding costs, filter and sort listings, and export performance reports.
**FRs covered:** FR-DASH-01, FR-DASH-02, FR-DASH-03, FR-DASH-04, FR-DASH-05, FR-DASH-06, FR-DASH-07, FR-DASH-08, FR-DASH-09, FR-DASH-10
**NFRs addressed:** NFR-UX-01, NFR-UX-02, NFR-UX-03, NFR-UX-04, NFR-UX-05
**Implementation notes:** Dashboard, Kanban, filtering, analytics mostly built. CSV/PDF export and holding cost calculations need implementation. Profit calc should use platform-specific fee rates from SCORE-06.

### Epic 7: Subscription & Billing
Users can subscribe to FREE/FLIPPER/PRO plans, manage billing through Stripe, with features gated by tier and usage tracked per month.
**FRs covered:** FR-BILLING-03, FR-BILLING-04, FR-BILLING-05, FR-BILLING-06, FR-BILLING-07, FR-BILLING-08
**NFRs addressed:** NFR-SEC-08
**Implementation notes:** Stripe integration mostly built. Full feature gating and usage metering need completion. Moved earlier in delivery order to enable revenue.

### Epic 8: Seller Communication & Negotiation
Users can contact sellers with AI-generated messages, negotiate prices with AI strategy suggestions, track conversation threads, and manage message approval workflows.
**FRs covered:** FR-COMM-01, FR-COMM-02, FR-COMM-03, FR-COMM-04, FR-COMM-05, FR-COMM-06, FR-COMM-07, FR-COMM-08
**Implementation notes:** Message model and basic messaging built. AI-powered message generation and negotiation strategy need implementation. Inbound message tracking requires authenticated marketplace sessions.

### Epic 9: Cross-Platform Resale Listing
Users can generate AI-optimized titles and descriptions, calculate optimal listing prices, post across multiple platforms using stored images, and track posting status with retry logic.
**FRs covered:** FR-RELIST-01, FR-RELIST-02, FR-RELIST-03, FR-RELIST-04, FR-RELIST-05, FR-RELIST-06, FR-RELIST-07, FR-RELIST-08
**Implementation notes:** Title/description generators and posting queue built. Firebase image reuse for cross-posting is new. Optimal pricing should tie to verified market data from Epic 4/5.

### Epic 10: Monitoring & Email Notifications
Users stay informed about their flips via email alerts — listing price changes, items sold, expiring listings, new opportunities found, message activity, flip gone cold/hot status, and configurable email preferences per event.
**FRs covered:** FR-MONITOR-01, FR-MONITOR-02, FR-MONITOR-03, FR-MONITOR-04, FR-NOTIFY-01, FR-NOTIFY-02, FR-NOTIFY-03, FR-NOTIFY-04, FR-NOTIFY-05, FR-NOTIFY-06, FR-NOTIFY-07, FR-NOTIFY-08, FR-NOTIFY-09, FR-NOTIFY-10, FR-NOTIFY-11, FR-NOTIFY-12 (email toggle only)
**Implementation notes:** All new. Monitoring requires background job scheduling (Cloud Scheduler or cron). Email delivery via Resend (already integrated). Notification preferences UI in Settings. FR-NOTIFY-12 delivers email toggle only; push/SMS toggles deferred to Epic 11.

### Epic 11: Push & SMS Notifications (Phase 2)
Users can receive push notifications and SMS text alerts for all flip events, with per-event channel toggles (push/email/SMS) in Settings.
**FRs covered:** FR-NOTIFY-12 (push + SMS toggles), FR-NOTIFY-13
**Implementation notes:** FCM configured in Epic 1. Requires client-side service worker for push. Twilio integration for SMS with verified phone number in Settings. Extends Epic 10's email notification framework with additional channels.

### Epic 12: Meeting & Logistics (Phase 2)
Users can schedule buy/sell meetups with automatic Google Calendar events and get driving directions via Google Maps, timed to arrive on schedule.
**FRs covered:** FR-MEET-01, FR-MEET-02
**Implementation notes:** Google Calendar API via OAuth configured in Settings. Google Maps SDK for route generation. Both require Google Cloud API keys and user OAuth consent.

---

## Epic 1 Stories: Production Infrastructure & Secure Deployment

### Story 1.1: GCP Project Setup & Secret Manager Module

As a **developer**,
I want a GCP Secret Manager integration with a single-source-of-truth Python module that pulls all secrets by environment,
So that no secrets are hardcoded, scattered, or duplicated across the codebase.

**Acceptance Criteria:**

**Given** a GCP project exists with Secret Manager API enabled
**When** secrets are created in Secret Manager with naming convention `{ENV}_{CATEGORY}_{KEY}` (e.g., `PRODUCTION_DATABASE_URL`, `STAGING_STRIPE_SECRET_KEY`)
**Then** all secrets for the target environment are accessible via the Secret Manager API

**Given** the `helpers/secrets.py` module exists
**When** `BUILD_ENV=production` is set
**Then** the module pulls all production secrets from GCP Secret Manager and sets them as environment variables

**Given** the `helpers/secrets.py` module exists
**When** `BUILD_ENV=staging` is set
**Then** the module pulls all staging secrets from GCP Secret Manager and sets them as environment variables

**Given** the `helpers/secrets.py` module uses Python dataclasses
**When** reviewing the module structure
**Then** secrets are organized by category: `DatabaseSecrets`, `AuthSecrets`, `ApiKeySecrets`, `PaymentSecrets`, `EmailSecrets`, `MonitoringSecrets`

**Given** any code in the project needs a secret value
**When** the developer looks for where GCP secret names are mapped
**Then** `helpers/secrets.py` is the only file that contains GCP secret name references

**Given** `BUILD_ENV` is not set or is invalid
**When** the secrets module is invoked
**Then** an error is raised with a clear message indicating valid BUILD_ENV values

**FRs fulfilled:** FR-INFRA-11, FR-INFRA-12

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-001-production-infrastructure.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-001-S-<N>` (sequential within Epic 1), `@story-1-1`, and `@FR-INFRA-11` / `@FR-INFRA-12` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 1.2: Cloud SQL Database Provisioning

As a **developer**,
I want the production database running on Cloud SQL (managed PostgreSQL),
So that the app has a reliable, scalable, and managed database with proper connection configuration.

**Acceptance Criteria:**

**Given** the GCP project from Story 1.1
**When** a Cloud SQL PostgreSQL instance is provisioned in `us-central1`
**Then** the instance is running on `db-f1-micro` tier with automated backups enabled

**Given** a Cloud SQL instance is running
**When** the Prisma schema is migrated against it
**Then** all 13+ models are created successfully and the database is ready for use

**Given** a Cloud Run service needs to connect to Cloud SQL
**When** the connection is configured
**Then** it uses either Unix socket or Cloud SQL Auth Proxy with the connection string pulled from Secret Manager via `helpers/secrets.py`

**Given** the database connection string is needed
**When** checking where it is defined
**Then** it exists only in GCP Secret Manager, retrieved by `helpers/secrets.py`

**Given** multiple Cloud Run instances are running
**When** they connect to Cloud SQL simultaneously
**Then** connection pooling is configured to prevent connection exhaustion

**FRs fulfilled:** FR-INFRA-02, FR-INFRA-07

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-001-production-infrastructure.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-001-S-<N>` (sequential within Epic 1, continuing from Story 1.1's last scenario number), `@story-1-2`, and `@FR-INFRA-02` / `@FR-INFRA-07` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 1.3: Containerize & Deploy to Cloud Run

As a **user**,
I want Flipper AI deployed and accessible online,
So that I can use the application from any device without running it locally.

**Acceptance Criteria:**

**Given** the Next.js application codebase
**When** `docker build` is run using the project Dockerfile
**Then** a container image is produced that starts the app with `next start` on the configured port

**Given** the container image is pushed to Google Container Registry / Artifact Registry
**When** deployed to Cloud Run
**Then** the service starts successfully and responds to HTTP requests

**Given** the Cloud Run service is deployed
**When** traffic increases beyond a single instance capacity
**Then** Cloud Run auto-scales from 0 to N instances based on demand

**Given** the Cloud Run service is deployed
**When** there is zero traffic for the configured idle period
**Then** Cloud Run scales down to 0 instances to minimize cost

**Given** the Cloud Run service configuration
**When** reviewing environment variables
**Then** only non-secret config values (NODE_ENV, BUILD_ENV, feature flags) are set directly; all secrets are injected via `helpers/secrets.py` from Secret Manager

**Given** the deployed application
**When** a user navigates to the Cloud Run URL
**Then** the application loads and is functional

**FRs fulfilled:** FR-INFRA-01, FR-INFRA-05, FR-INFRA-08

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-001-production-infrastructure.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-001-S-<N>` (sequential within Epic 1, continuing from previous stories), `@story-1-3`, and `@FR-INFRA-01` / `@FR-INFRA-05` / `@FR-INFRA-08` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 1.4: Firebase Auth Setup & Migration

As a **user**,
I want to log in with my email, Google, GitHub, or Facebook account,
So that I have secure and flexible authentication options.

**Acceptance Criteria:**

**Given** Firebase Auth is configured in the GCP project
**When** a user registers with email and password
**Then** the account is created in Firebase Auth and a JWT is issued

**Given** Firebase Auth is configured with OAuth providers
**When** a user logs in via Google, GitHub, or Facebook OAuth
**Then** the user is authenticated and a JWT is issued with proper claims

**Given** Facebook OAuth is configured
**When** a user logs in via Facebook
**Then** a marketplace access token is stored for Graph API access (in addition to authentication)

**Given** the app previously used NextAuth v5 for authentication
**When** Firebase Auth is fully configured
**Then** all authentication flows (register, login, password reset, OAuth) work through Firebase Auth instead of NextAuth

**Given** a valid Firebase Auth JWT
**When** the JWT is sent with API requests
**Then** the backend validates the token and identifies the user correctly

**Given** Firebase Auth credentials
**When** checking where they are stored
**Then** Firebase config values are pulled from Secret Manager via `helpers/secrets.py`

**FRs fulfilled:** FR-INFRA-03

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-001-production-infrastructure.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-001-S-<N>` (sequential within Epic 1, continuing from previous stories), `@story-1-4`, and `@FR-INFRA-03` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 1.5: Firebase Hosting & CORS Configuration

As a **user**,
I want fast page loads with static assets served from a CDN,
So that the application feels responsive regardless of my location.

**Acceptance Criteria:**

**Given** Firebase Hosting is configured
**When** static assets (JS bundles, CSS, images, fonts) are deployed
**Then** they are served via Firebase CDN with appropriate cache headers

**Given** the frontend is served from Firebase Hosting
**When** the frontend makes API requests to the Cloud Run backend
**Then** CORS headers are properly configured to allow cross-origin requests between Firebase Hosting and Cloud Run origins

**Given** CORS is configured
**When** a request comes from an unauthorized origin
**Then** the request is rejected with a 403 response

**Given** Firebase Hosting is deployed
**When** a user navigates to the application URL
**Then** the page loads with static assets served from the nearest CDN edge

**FRs fulfilled:** FR-INFRA-04, FR-INFRA-09

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-001-production-infrastructure.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-001-S-<N>` (sequential within Epic 1, continuing from previous stories), `@story-1-5`, and `@FR-INFRA-04` / `@FR-INFRA-09` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 1.6: Firebase Storage Configuration

As a **developer**,
I want Firebase Storage configured for listing image storage,
So that scraped images can be stored, served, and reused across the platform.

**Acceptance Criteria:**

**Given** Firebase Storage is enabled in the GCP project
**When** a storage bucket is created
**Then** it follows the naming convention and is in the same region as other GCP resources

**Given** Firebase Storage security rules are configured
**When** an authenticated user uploads or reads images within their user path (`/{userId}/...`)
**Then** the operation succeeds

**Given** Firebase Storage security rules are configured
**When** an unauthenticated user or a user accessing another user's path attempts access
**Then** the operation is denied

**Given** the structured path convention `/{userId}/{platform}/{listingId}/{imageIndex}.{ext}`
**When** an image is stored
**Then** the path follows this convention and the image is accessible via its Firebase Storage URL

**Given** Firebase Storage credentials
**When** checking where they are configured
**Then** credentials are pulled from Secret Manager via `helpers/secrets.py`

**FRs fulfilled:** FR-INFRA-13

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-001-production-infrastructure.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-001-S-<N>` (sequential within Epic 1, continuing from previous stories), `@story-1-6`, and `@FR-INFRA-13` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 1.7: Firebase Cloud Messaging Setup

As a **developer**,
I want FCM configured so the notification infrastructure is ready,
So that push notifications can be enabled in Phase 2 without re-deploying infrastructure.

**Acceptance Criteria:**

**Given** FCM is enabled in the Firebase project
**When** the FCM configuration is reviewed
**Then** server key and sender ID are stored in Secret Manager

**Given** the web application
**When** a service worker stub for FCM is created
**Then** it is registered at the correct scope and can receive FCM messages when activated in Phase 2

**Given** the FCM client SDK is included in the frontend
**When** a user grants notification permission (Phase 2)
**Then** a device token can be generated and stored

**Given** the FCM server SDK is available in the backend
**When** a notification needs to be sent (Phase 2)
**Then** the infrastructure supports sending to specific device tokens or topic subscriptions

**FRs fulfilled:** FR-INFRA-14

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-001-production-infrastructure.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-001-S-<N>` (sequential within Epic 1, continuing from previous stories), `@story-1-7`, and `@FR-INFRA-14` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 1.8: GitHub Actions CI/CD Pipeline

As a **developer**,
I want automated build, test, and deploy on every push and PR,
So that code quality is enforced and deployments are consistent and repeatable.

**Acceptance Criteria:**

**Given** a GitHub Actions workflow is configured
**When** a push is made to the `main` branch
**Then** the pipeline runs: lint, unit tests, build container image, deploy to Cloud Run production

**Given** a GitHub Actions workflow is configured
**When** a pull request is opened
**Then** the pipeline runs: lint, unit tests, build container image, deploy to Cloud Run staging (preview)

**Given** the CI pipeline is running
**When** any step fails (lint, test, build)
**Then** the deployment step is skipped and the failure is reported

**Given** the pipeline needs GCP credentials
**When** checking where service account keys are stored
**Then** they are configured as GitHub Actions secrets (not in the repository)

**Given** a successful deployment
**When** the pipeline completes
**Then** a health check is run against the deployed service to verify it is responding

**FRs fulfilled:** FR-INFRA-06
**NFRs addressed:** NFR-TEST-05

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-001-production-infrastructure.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-001-S-<N>` (sequential within Epic 1, continuing from previous stories), `@story-1-8`, and `@FR-INFRA-06` / `@NFR-TEST-05` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 1.9: Health Check & Monitoring Endpoints

As an **operations engineer**,
I want health check endpoints for Cloud Run probes and monitoring,
So that unhealthy instances are automatically replaced and system status is observable.

**Acceptance Criteria:**

**Given** the application is running
**When** Cloud Run sends a request to `/api/health`
**Then** a 200 response is returned with basic health status (up/down)

**Given** the application is running
**When** Cloud Run sends a request to `/api/health/ready`
**Then** a 200 is returned only if the database connection is active and all critical services are reachable; otherwise a 503

**Given** the application is running
**When** a request is made to `/api/health/metrics`
**Then** response includes: uptime, memory usage, database connection pool stats, and request count

**Given** the Cloud Run service configuration
**When** readiness and liveness probes are configured
**Then** they point to `/api/health/ready` and `/api/health` respectively with appropriate intervals

**Given** structured logging is configured
**When** the application logs events
**Then** logs use pino with JSON format, include request IDs, and are viewable in Cloud Logging

**FRs fulfilled:** FR-INFRA-10
**NFRs addressed:** NFR-RELY-03, NFR-RELY-04

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-001-production-infrastructure.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-001-S-<N>` (sequential within Epic 1, continuing from previous stories), `@story-1-9`, and `@FR-INFRA-10` / `@NFR-RELY-03` / `@NFR-RELY-04` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

## Epic 2 Stories: User Registration, Auth & Onboarding

### Story 2.1: Landing Page

As a **visitor**,
I want to see a compelling landing page with features, pricing, and a call-to-action,
So that I understand the product value and can sign up.

**Acceptance Criteria:**

**Given** an unauthenticated user navigates to `/`
**When** the page loads
**Then** a hero section is displayed with headline, subheadline, and primary CTA button

**Given** the landing page is loaded
**When** the user scrolls to the features section
**Then** key product features are displayed with icons and descriptions

**Given** the landing page is loaded
**When** the user scrolls to the pricing section
**Then** FREE, FLIPPER ($19/mo), and PRO ($49/mo) tiers are displayed with feature comparison

**Given** the landing page CTA button
**When** the user clicks "Get Started" or "Sign Up"
**Then** they are navigated to the registration page

**Given** the landing page
**When** viewed on mobile (< 768px)
**Then** the layout is responsive and all content is accessible

**FRs fulfilled:** FR-DASH-13
**NFRs addressed:** NFR-UX-01

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-002-user-registration-auth-onboarding.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-002-S-<N>` (sequential within Epic 2), `@story-2-1`, and `@FR-DASH-13` / `@NFR-UX-01` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 2.2: User Registration with Email

As a **new user**,
I want to register with my email and password,
So that I can create an account and start using Flipper AI.

**Acceptance Criteria:**

**Given** an unauthenticated user on the registration page
**When** they enter a valid email, password (min 8 chars, 1 uppercase, 1 number), and confirm password
**Then** an account is created and the user is redirected to the onboarding wizard

**Given** a user attempts to register
**When** hCaptcha verification is not completed
**Then** the registration form cannot be submitted

**Given** a user attempts to register
**When** the email is already associated with an existing account
**Then** an error message is displayed: "An account with this email already exists"

**Given** a user attempts to register
**When** the password does not meet complexity requirements
**Then** specific validation errors are displayed (e.g., "Must contain at least 1 uppercase letter")

**Given** a user attempts to register
**When** the password and confirm password fields do not match
**Then** an error message is displayed: "Passwords do not match"

**Given** the registration endpoint
**When** more than 5 registration attempts are made from the same IP in 1 minute
**Then** subsequent attempts are rate-limited with a 429 response

**FRs fulfilled:** FR-BILLING-01, FR-BILLING-10
**NFRs addressed:** NFR-SEC-02, NFR-SEC-03, NFR-SEC-09

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-002-user-registration-auth-onboarding.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-002-S-<N>` (sequential within Epic 2, continuing from previous stories), `@story-2-2`, and `@FR-BILLING-01` / `@FR-BILLING-10` / `@NFR-SEC-02` / `@NFR-SEC-03` / `@NFR-SEC-09` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 2.3: OAuth Login (Google, GitHub, Facebook)

As a **user**,
I want to log in with my Google, GitHub, or Facebook account,
So that I can access the app without creating a separate password.

**Acceptance Criteria:**

**Given** the login page
**When** the user clicks "Sign in with Google"
**Then** they are redirected to Google OAuth, and upon consent, an account is created/linked and they are logged in

**Given** the login page
**When** the user clicks "Sign in with GitHub"
**Then** they are redirected to GitHub OAuth, and upon consent, an account is created/linked and they are logged in

**Given** the login page
**When** the user clicks "Sign in with Facebook"
**Then** they are redirected to Facebook OAuth, and upon consent, an account is created/linked, they are logged in, AND a marketplace access token is captured and stored for Graph API access

**Given** a user logs in via OAuth
**When** an account already exists with the same email
**Then** the OAuth provider is linked to the existing account (not duplicated)

**Given** a valid OAuth session
**When** the JWT is issued
**Then** it is stored as an HttpOnly cookie and includes proper user claims

**FRs fulfilled:** FR-BILLING-02
**NFRs addressed:** NFR-SEC-04

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-002-user-registration-auth-onboarding.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-002-S-<N>` (sequential within Epic 2, continuing from previous stories), `@story-2-3`, and `@FR-BILLING-02` / `@NFR-SEC-04` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 2.4: Password Reset via Email

As a **user**,
I want to reset my password via email,
So that I can recover access to my account if I forget my password.

**Acceptance Criteria:**

**Given** a user on the login page
**When** they click "Forgot Password" and enter their registered email
**Then** a password reset email is sent via Resend with a time-limited token (1 hour expiry)

**Given** the user receives a password reset email
**When** they click the reset link within 1 hour
**Then** they are directed to a form to set a new password

**Given** the user is on the password reset form
**When** they enter a new password meeting complexity requirements and submit
**Then** the password is updated and they are redirected to the login page with a success message

**Given** a password reset link
**When** the link is clicked after the 1-hour expiry
**Then** an error message is displayed: "This reset link has expired. Please request a new one."

**Given** a user enters an unregistered email for password reset
**When** the form is submitted
**Then** the same success message is displayed (no information leakage about email existence)

**FRs fulfilled:** FR-BILLING-11

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-002-user-registration-auth-onboarding.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-002-S-<N>` (sequential within Epic 2, continuing from previous stories), `@story-2-4`, and `@FR-BILLING-11` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 2.5: Onboarding Wizard

As a **new user**,
I want to complete a guided setup wizard,
So that the app is configured for my preferred marketplaces, categories, budget, and location.

**Acceptance Criteria:**

**Given** a newly registered user
**When** they log in for the first time
**Then** they are redirected to the onboarding wizard at step 1 of 6

**Given** the onboarding wizard
**When** the user progresses through all 6 steps (welcome, marketplaces, categories, budget, location, complete)
**Then** each step's selections are saved and a progress bar reflects current step

**Given** the user is on step 3 of the wizard
**When** they close the browser and return later
**Then** their progress is persisted server-side and they resume at step 3

**Given** any step of the wizard
**When** the user clicks "Skip"
**Then** default values are applied for that step and they advance to the next step

**Given** the user completes step 6 (complete)
**When** they click "Get Started"
**Then** they are redirected to the dashboard and onboarding is marked as completed (wizard does not show again)

**Given** the onboarding wizard
**When** the user clicks "Back"
**Then** they return to the previous step with their prior selections preserved

**FRs fulfilled:** FR-DASH-11, FR-DASH-12

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-002-user-registration-auth-onboarding.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-002-S-<N>` (sequential within Epic 2, continuing from previous stories), `@story-2-5`, and `@FR-DASH-11` / `@FR-DASH-12` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 2.6: User Settings & Preferences

As a **user**,
I want to manage my profile, notification preferences, AI settings, and API keys,
So that I can customize the app to my needs.

**Acceptance Criteria:**

**Given** an authenticated user navigates to `/settings`
**When** the page loads
**Then** sections are displayed for: Profile, Notifications, AI Preferences, API Keys

**Given** the Profile section
**When** the user updates their display name or email
**Then** the changes are saved and a success toast is displayed

**Given** the API Keys section
**When** the user enters their OpenAI API key
**Then** the key is encrypted at rest before storage and displayed as masked (e.g., `sk-...xxxx`)

**Given** the API Keys section
**When** the user views a previously saved API key
**Then** only the last 4 characters are visible; the full key is never sent to the frontend

**Given** the Notifications section
**When** the user toggles notification preferences
**Then** the preferences are saved and applied to future notifications

**Given** the AI Preferences section
**When** the user configures preferred AI model or analysis depth
**Then** the settings are saved and used in subsequent scraping/analysis operations

**FRs fulfilled:** FR-BILLING-09
**NFRs addressed:** NFR-SEC-05, NFR-SEC-06

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-002-user-registration-auth-onboarding.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-002-S-<N>` (sequential within Epic 2, continuing from previous stories), `@story-2-6`, and `@FR-BILLING-09` / `@NFR-SEC-05` / `@NFR-SEC-06` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

## Epic 3 Stories: Multi-Marketplace Scanning & Image Capture

### Story 3.1: Craigslist Scraper

As a **user**,
I want to scrape Craigslist listings based on my search criteria,
So that I can find underpriced items on Craigslist for flipping.

**Acceptance Criteria:**

**Given** a user submits a Craigslist search via the scraper UI
**When** the scraper runs with keywords, category, price range, and location
**Then** Playwright launches a headless Chromium browser with a custom user agent

**Given** the scraper is running
**When** listings are found on the search results page
**Then** each listing's data is extracted using multiple selector fallbacks for resilience

**Given** a listing is extracted
**When** the scraper processes it
**Then** title, description, asking price, condition, location, image URLs, external ID, and platform URL are captured

**Given** the scraper completes
**When** results are returned
**Then** the browser is always closed in a finally block, regardless of success or failure

**Given** anti-detection measures
**When** the scraper runs
**Then** custom user agent rotation and rate limiting are applied

**FRs fulfilled:** FR-SCAN-01, FR-SCAN-10, FR-SCAN-11

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-003-multi-marketplace-scanning.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-003-S-<N>` (sequential within Epic 3), `@story-3-1`, and `@FR-SCAN-01` / `@FR-SCAN-10` / `@FR-SCAN-11` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 3.2: eBay Browse API Integration

As a **user**,
I want to search eBay listings via their official API,
So that I can find deals on eBay with reliable, structured data.

**Acceptance Criteria:**

**Given** a user submits an eBay search
**When** the API call is made to eBay Browse API v1 (`/item_summary/search`)
**Then** the request includes OAuth token authentication from Secret Manager

**Given** eBay search results are returned
**When** processing the response
**Then** listings are normalized to the standard format: title, price, condition, location, images, external ID, URL

**Given** eBay search filters
**When** the user specifies category, condition, or price range
**Then** the filters are mapped to eBay API parameters (categoryId, condition enum, priceRange)

**Given** the eBay OAuth token has expired
**When** a search is attempted
**Then** an appropriate error is returned and the user is notified to refresh their token

**FRs fulfilled:** FR-SCAN-02

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-003-multi-marketplace-scanning.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-003-S-<N>` (sequential within Epic 3, continuing from previous stories), `@story-3-2`, and `@FR-SCAN-02` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 3.3: Facebook Marketplace Scraper

As a **user**,
I want to search Facebook Marketplace listings,
So that I can find deals on Facebook's marketplace platform.

**Acceptance Criteria:**

**Given** a user has a valid Facebook OAuth token (captured during login)
**When** a Facebook Marketplace search is submitted
**Then** the system first attempts to search via Facebook Graph API using the token

**Given** the Graph API call fails or token is unavailable
**When** the fallback is triggered
**Then** Stagehand (Gemini-powered browser automation) is used to search Facebook Marketplace

**Given** Facebook search results
**When** processing results from either method
**Then** listings are normalized to the standard format with platform set to "FACEBOOK"

**Given** Facebook's anti-scraping protections
**When** the scraper detects blocking or rate limiting
**Then** exponential backoff is applied and the user is notified of delays

**FRs fulfilled:** FR-SCAN-03, FR-SCAN-10

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-003-multi-marketplace-scanning.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-003-S-<N>` (sequential within Epic 3, continuing from previous stories), `@story-3-3`, and `@FR-SCAN-03` / `@FR-SCAN-10` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 3.4: Mercari Scraper

As a **user**,
I want to search Mercari listings for underpriced items,
So that I can find deals on Mercari for flipping.

**Acceptance Criteria:**

**Given** a user submits a Mercari search
**When** the scraper runs
**Then** it first attempts the reverse-engineered internal API (`api.mercari.com/v2/search`) as the primary method

**Given** the internal API returns a 429 (rate limited) or fails
**When** the fallback is triggered
**Then** authenticated Playwright browser automation is used with stored user credentials from Secret Manager

**Given** Mercari search results from either method
**When** processing results
**Then** listings are normalized to the standard format with platform set to "MERCARI"

**Given** the Mercari internal API
**When** rate limit (429) is detected
**Then** exponential backoff is applied before retry or fallback to Playwright

**FRs fulfilled:** FR-SCAN-04, FR-SCAN-10

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-003-multi-marketplace-scanning.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-003-S-<N>` (sequential within Epic 3, continuing from previous stories), `@story-3-4`, and `@FR-SCAN-04` / `@FR-SCAN-10` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 3.5: OfferUp Scraper

As a **user**,
I want to search OfferUp listings for underpriced items,
So that I can find deals on OfferUp for flipping.

**Acceptance Criteria:**

**Given** a user submits an OfferUp search
**When** the scraper runs
**Then** Playwright launches with anti-automation flags disabled and resource blocking enabled (block images/fonts for speed)

**Given** OfferUp search results
**When** processing results
**Then** listings are normalized to the standard format with platform set to "OFFERUP"

**Given** OfferUp's anti-bot detection
**When** the scraper is detected
**Then** custom user agent rotation, human-like delays, and exponential backoff are applied

**FRs fulfilled:** FR-SCAN-05, FR-SCAN-10

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-003-multi-marketplace-scanning.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-003-S-<N>` (sequential within Epic 3, continuing from previous stories), `@story-3-5`, and `@FR-SCAN-05` / `@FR-SCAN-10` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 3.6: Search Configuration & Filters

As a **user**,
I want to save and reuse search configurations with customizable filters,
So that I can quickly re-run my favorite searches without re-entering criteria.

**Acceptance Criteria:**

**Given** the scraper UI
**When** the user configures a search with keywords, category, price range (min/max), location, and radius
**Then** all filter parameters are sent to the scraper endpoint and applied to the search

**Given** a configured search
**When** the user clicks "Save Search"
**Then** the configuration is saved as a SearchConfig (name, platform, location, keywords, price range, enabled flag)

**Given** the scraper UI
**When** the user opens saved searches
**Then** all saved SearchConfigs are listed with name and platform, and can be loaded with one click

**Given** a saved SearchConfig
**When** the user toggles the "enabled" flag off
**Then** the search is excluded from automated/batch scans but remains in the saved list

**Given** a saved SearchConfig
**When** the user clicks "Delete"
**Then** the configuration is permanently removed after confirmation

**FRs fulfilled:** FR-SCAN-06, FR-SCAN-07

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-003-multi-marketplace-scanning.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-003-S-<N>` (sequential within Epic 3, continuing from previous stories), `@story-3-6`, and `@FR-SCAN-06` / `@FR-SCAN-07` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 3.7: Scraper Job Management & Real-Time Events

As a **user**,
I want to see real-time progress of my scraping jobs,
So that I know what's happening without refreshing the page.

**Acceptance Criteria:**

**Given** a user initiates a scraping job
**When** the job is created
**Then** a ScraperJob record is created with status PENDING and transitions to RUNNING when execution begins

**Given** a scraping job is RUNNING
**When** each listing is found
**Then** an SSE event `listing.found` is emitted with the listing data in real-time

**Given** a scraping job is RUNNING
**When** progress milestones are reached (e.g., 25%, 50%, 75%)
**Then** an SSE event `job.progress` is emitted with percentage and listings found so far

**Given** a scraping job finishes
**When** all listings are processed
**Then** the ScraperJob status transitions to COMPLETED (or FAILED if errors occurred) and a `job.complete` SSE event is emitted

**Given** the scraper UI
**When** a job is running
**Then** the UI displays a live progress indicator updated by SSE events without page refresh

**FRs fulfilled:** FR-SCAN-08, FR-SCAN-09

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-003-multi-marketplace-scanning.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-003-S-<N>` (sequential within Epic 3, continuing from previous stories), `@story-3-7`, and `@FR-SCAN-08` / `@FR-SCAN-09` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 3.8: Listing Data Processing & Deduplication

As a **user**,
I want scraped listings deduplicated and pre-filtered,
So that I only see unique, valid listings worth reviewing.

**Acceptance Criteria:**

**Given** a listing is scraped
**When** it has the same [platform, externalId, userId] as an existing listing
**Then** the duplicate is skipped and the existing listing is not modified

**Given** a listing is scraped
**When** its price is less than 0
**Then** the listing is skipped and not stored

**Given** a listing is scraped
**When** it is identified as a sponsored listing
**Then** the listing is skipped and not stored

**Given** a listing is scraped with price == 0 (FREE)
**When** the user's "Free Item Handling" setting is "include and flag for review" (default)
**Then** the listing is stored and flagged for manual review

**Given** a listing is scraped with price == 0 (FREE)
**When** the user's "Free Item Handling" setting is "auto-analyze"
**Then** the listing is run through scoring and included only if it meets the flippability threshold

**Given** a listing is scraped with price == 0 (FREE)
**When** the user's "Free Item Handling" setting is "skip entirely"
**Then** the listing is discarded

**FRs fulfilled:** FR-SCAN-12, FR-SCAN-13

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-003-multi-marketplace-scanning.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-003-S-<N>` (sequential within Epic 3, continuing from previous stories), `@story-3-8`, and `@FR-SCAN-12` / `@FR-SCAN-13` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 3.9: Image Capture & Storage

As a **user**,
I want listing images captured and stored during scraping,
So that I can view them in the app and reuse them when cross-posting.

**Acceptance Criteria:**

**Given** a listing is scraped with image URLs
**When** images are processed
**Then** each image is downloaded and uploaded to Firebase Storage at `/{userId}/{platform}/{listingId}/{imageIndex}.{ext}`

**Given** an image is stored in Firebase Storage
**When** metadata is recorded
**Then** the Cloud SQL database stores: Firebase Storage path, original URL, dimensions, file size, and content type with a foreign key to the listing

**Given** a listing with stored images
**When** the user views the listing in the UI
**Then** images are served directly from Firebase Storage URLs stored in the database

**Given** image download fails for one image in a listing
**When** other images are available
**Then** the successful images are stored and the failed download is logged without blocking the listing save

**Given** a listing is a duplicate (already exists)
**When** the scraper encounters it
**Then** images are not re-downloaded

**FRs fulfilled:** FR-SCAN-14, FR-SCAN-15, FR-SCAN-16

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-003-multi-marketplace-scanning.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-003-S-<N>` (sequential within Epic 3, continuing from previous stories), `@story-3-9`, and `@FR-SCAN-14` / `@FR-SCAN-15` / `@FR-SCAN-16` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

## Epic 4 Stories: Core Scoring & Deal Evaluation

### Story 4.1: Algorithmic Value Score

As a **user**,
I want each scraped listing automatically scored for flip potential,
So that I can quickly identify which items are worth pursuing.

**Acceptance Criteria:**

**Given** a listing is scraped and stored
**When** the algorithmic scoring engine runs
**Then** a value score (0-100) is calculated using category multipliers, condition multiplier, brand boosts, and risk penalties

**Given** a listing title and description
**When** the category detection runs
**Then** the item is classified into one of: electronics, furniture, tools, video games, collectibles, clothing, sports, musical, automotive, appliances

**Given** a listing mentioning a known brand
**When** brand boost keywords are detected (Apple 1.2x, Samsung 1.15x, Sony 1.2x, Nintendo 1.25x, Dyson 1.3x, vintage/rare 1.4x, sealed 1.3x)
**Then** the appropriate boost multiplier is applied to the score

**Given** a listing with risk indicators
**When** risk penalty keywords are detected (broken/damaged 0.3x, needs repair 0.4x, incomplete 0.6x, heavy use 0.75x, cosmetic wear 0.85x)
**Then** the appropriate penalty multiplier is applied to the score

**Given** all multipliers are calculated
**When** the estimated market value is computed
**Then** it equals: askingPrice * categoryMultiplier * conditionMultiplier * boosts * penalties

**FRs fulfilled:** FR-SCORE-01, FR-SCORE-02, FR-SCORE-03, FR-SCORE-04, FR-SCORE-05

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-004-core-scoring-deal-evaluation.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-004-S-<N>` (sequential within Epic 4), `@story-4-1`, and `@FR-SCORE-01` / `@FR-SCORE-02` / `@FR-SCORE-03` / `@FR-SCORE-04` / `@FR-SCORE-05` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 4.2: Platform-Specific Fees & Opportunity Threshold

As a **user**,
I want profit calculated with correct platform fees and a configurable opportunity threshold,
So that I see accurate profit estimates and can tune what qualifies as an opportunity.

**Acceptance Criteria:**

**Given** a listing's estimated market value is calculated
**When** profit potential is computed
**Then** platform-specific fee rates are applied: eBay ~13%, Mercari ~10%, Facebook Marketplace ~5%, OfferUp ~12.9%, Craigslist 0%

**Given** platform fee rates
**When** the user navigates to Settings
**Then** fee rates per platform are displayed and editable

**Given** a listing's value score is calculated
**When** the score meets or exceeds the opportunity threshold
**Then** the listing status is set to OPPORTUNITY

**Given** the opportunity threshold
**When** the user navigates to Settings
**Then** the threshold is displayed (default 70) and adjustable via slider or number input

**Given** a listing's value score is below the threshold
**When** scoring completes
**Then** the listing status remains NEW

**FRs fulfilled:** FR-SCORE-06, FR-SCORE-07

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-004-core-scoring-deal-evaluation.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-004-S-<N>` (sequential within Epic 4, continuing from previous stories), `@story-4-2`, and `@FR-SCORE-06` / `@FR-SCORE-07` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 4.3: LLM Item Identification

As a **user**,
I want AI to identify exactly what an item is from its listing,
So that accurate market comparisons can be made.

**Acceptance Criteria:**

**Given** a listing passes the algorithmic score threshold
**When** LLM identification runs (GPT-4o-mini)
**Then** the system extracts: brand, model, variant, year, condition, and generates an optimized eBay search query

**Given** the LLM identification response
**When** results are parsed
**Then** each field (brand, model, variant, year, condition) is stored with the listing for downstream use

**Given** the LLM-generated search query
**When** it is used for market price lookup
**Then** the query is optimized for finding exact matching sold items (not generic category matches)

**Given** the LLM API is unavailable or returns an error
**When** identification is attempted
**Then** the system falls back to algorithmic scoring without LLM enhancement and logs the failure

**FRs fulfilled:** FR-SCORE-08

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-004-core-scoring-deal-evaluation.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-004-S-<N>` (sequential within Epic 4, continuing from previous stories), `@story-4-3`, and `@FR-SCORE-08` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 4.4: Verified Market Price Lookup

As a **user**,
I want to see verified market prices from actual sold items,
So that I know the true market value rather than an algorithmic estimate.

**Acceptance Criteria:**

**Given** an LLM-identified item with an optimized search query
**When** market price verification runs
**Then** eBay sold listings are fetched for matching items

**Given** sold listing data is retrieved
**When** market prices are analyzed
**Then** median, average, and price range are calculated from recent completed sales

**Given** a verified market price
**When** compared to the listing's asking price
**Then** a true discount percentage is calculated (e.g., "68% below market value")

**Given** verified market data exists
**When** the listing detail is displayed
**Then** both the algorithmic estimate and verified market value are shown, with verified value taking precedence

**FRs fulfilled:** FR-SCORE-09, FR-SCORE-10

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-004-core-scoring-deal-evaluation.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-004-S-<N>` (sequential within Epic 4, continuing from previous stories), `@story-4-4`, and `@FR-SCORE-09` / `@FR-SCORE-10` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 4.5: LLM Sellability Assessment

As a **user**,
I want AI to assess how easy an item will be to resell,
So that I can prioritize items with high demand and low risk.

**Acceptance Criteria:**

**Given** an LLM-identified item with verified market data
**When** sellability assessment runs via LLM
**Then** the system evaluates: demand level (high/medium/low), expected days to sell, authenticity risk, condition risk, and confidence level

**Given** the sellability assessment
**When** offer and listing prices are recommended
**Then** recommendations are based on verified market data and target profit margin

**Given** LLM analysis is active
**When** a listing's undervalue percentage is below the threshold (default 50%)
**Then** the listing is not saved to the database (filtered out)

**Given** the undervalue threshold
**When** the user checks Settings
**Then** the threshold is displayed and configurable (default 50%)

**FRs fulfilled:** FR-SCORE-11, FR-SCORE-12, FR-SCORE-13

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-004-core-scoring-deal-evaluation.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-004-S-<N>` (sequential within Epic 4, continuing from previous stories), `@story-4-5`, and `@FR-SCORE-11` / `@FR-SCORE-12` / `@FR-SCORE-13` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 4.6: AI Analysis Caching & Fallback

As a **user**,
I want AI analysis results cached and algorithmic scoring available as fallback,
So that performance is fast and the system works even when AI APIs are down.

**Acceptance Criteria:**

**Given** an AI analysis is completed for a listing
**When** the results are stored
**Then** they are cached in the AiAnalysisCache table with a 24-hour TTL

**Given** an analysis request for a previously analyzed listing
**When** the cache entry exists and is less than 24 hours old
**Then** the cached result is returned without making a new API call

**Given** a cache entry older than 24 hours
**When** a new analysis is requested
**Then** the cache is refreshed with a new API call

**Given** all AI APIs (OpenAI, Anthropic) are unavailable
**When** scoring is attempted
**Then** the system falls back to algorithmic scoring (SCORE-01 through SCORE-07) and the user is notified that AI analysis is temporarily unavailable

**Given** AI APIs recover after an outage
**When** new analyses are requested
**Then** the system resumes LLM-based analysis without manual intervention

**FRs fulfilled:** FR-SCORE-14, FR-SCORE-15

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-004-core-scoring-deal-evaluation.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-004-S-<N>` (sequential within Epic 4, continuing from previous stories), `@story-4-6`, and `@FR-SCORE-14` / `@FR-SCORE-15` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

## Epic 5 Stories: Advanced Market Intelligence

### Story 5.1: Claude Sonnet Structural Analysis

As a **user**,
I want deep structural analysis of items using Claude Sonnet,
So that I get a thorough Tier 2 assessment beyond initial identification.

**Acceptance Criteria:**

**Given** an item has been identified via GPT-4o-mini (Tier 1)
**When** Tier 2 analysis is triggered
**Then** Claude Sonnet (Anthropic) performs structural item analysis covering build quality, market positioning, and resale potential

**Given** Claude Sonnet analysis results
**When** they are returned
**Then** they supplement (not replace) the Tier 1 identification and are stored with the listing

**Given** the Claude Sonnet API is unavailable
**When** Tier 2 analysis is attempted
**Then** the system proceeds with Tier 1 results only and logs the failure

**FRs fulfilled:** FR-SCORE-16

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-005-advanced-market-intelligence.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-005-S-<N>` (sequential within Epic 5), `@story-5-1`, and `@FR-SCORE-16` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 5.2: Comparable Sold Item Matching

As a **user**,
I want to see actual comparable sold items for any listing,
So that I can verify the market value with real transaction data.

**Acceptance Criteria:**

**Given** an LLM-identified item
**When** comp matching runs
**Then** the system uses LLM-generated search queries to find sold items, filtering for matching brand, model, and condition — not just keyword overlap

**Given** comp results are found
**When** they are displayed
**Then** each comp shows: title, sold price, sold date, condition, and platform

**Given** comp matching finds fewer than 3 matches
**When** results are displayed
**Then** a low-confidence warning is shown to the user

**Given** no comps are found
**When** the listing is evaluated
**Then** the system flags it as "insufficient market data" and relies on algorithmic scoring

**FRs fulfilled:** FR-SCORE-17

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-005-advanced-market-intelligence.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-005-S-<N>` (sequential within Epic 5, continuing from previous stories), `@story-5-2`, and `@FR-SCORE-17` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 5.3: Sold Volume & Demand Trend Analysis

As a **user**,
I want to see how frequently an item sells and whether demand is trending up or down,
So that I can assess market liquidity before purchasing.

**Acceptance Criteria:**

**Given** an identified item with comp data
**When** volume analysis runs
**Then** the system counts sales in the last 30, 60, and 90 days

**Given** sales volume data
**When** the demand trend is calculated
**Then** it is classified as: rising (30-day > 60-day avg), stable (within 10%), or declining (30-day < 60-day avg)

**Given** volume and trend data
**When** the listing detail is displayed
**Then** the user sees: "X sold in last 30 days — Demand: Rising/Stable/Declining"

**Given** an item with zero sales in 90 days
**When** the analysis completes
**Then** the listing is flagged as "low liquidity" with a risk warning

**FRs fulfilled:** FR-SCORE-18

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-005-advanced-market-intelligence.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-005-S-<N>` (sequential within Epic 5, continuing from previous stories), `@story-5-3`, and `@FR-SCORE-18` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 5.4: Item Completeness & Seller Reputation Analysis

As a **user**,
I want to know if an item is complete and if the seller is trustworthy,
So that I can factor condition and seller reliability into my buying decision.

**Acceptance Criteria:**

**Given** a listing with images and description
**When** item completeness analysis runs (via GPT-4o Vision or Claude Vision)
**Then** the system assesses: accessories included/missing, cosmetic vs functional damage, original packaging presence, and missing parts

**Given** completeness analysis results
**When** displayed to the user
**Then** a completeness score is shown (e.g., "Complete with box", "Missing charger", "Cosmetic damage only")

**Given** a listing on a platform that exposes seller ratings (eBay, Mercari)
**When** the seller's profile data is available via API or scraping
**Then** seller rating, number of reviews, and account age are captured

**Given** a seller with low ratings (below platform average)
**When** risk assessment runs
**Then** the listing's authenticity risk and accuracy risk factors are increased

**Given** a platform that does not expose seller ratings (e.g., Craigslist)
**When** seller analysis runs
**Then** it is skipped gracefully with "Seller rating unavailable" noted

**FRs fulfilled:** FR-SCORE-19, FR-SCORE-20

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-005-advanced-market-intelligence.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-005-S-<N>` (sequential within Epic 5, continuing from previous stories), `@story-5-4`, and `@FR-SCORE-19` / `@FR-SCORE-20` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 5.5: Logistics & Shipping Cost Analysis

As a **user**,
I want to know the size, shipping difficulty, and delivery cost impact on profit,
So that I can avoid items where logistics eat all the profit.

**Acceptance Criteria:**

**Given** a listing's title, description, and images
**When** logistics analysis runs
**Then** the item is categorized as: small/shippable, large/local-pickup-only, or fragile/special-handling

**Given** a shippable item
**When** shipping cost estimation runs (via Shippo API)
**Then** estimated shipping costs for USPS, UPS, and FedEx are retrieved based on estimated weight and dimensions

**Given** shipping cost estimates
**When** profit is recalculated
**Then** shipping costs are subtracted from estimated profit and the adjusted margin is displayed

**Given** a large/local-pickup-only item
**When** logistics analysis runs
**Then** the system estimates distance from the user's location (via Geoapify) and flags whether the item is viable for local pickup

**Given** a local-pickup-only item
**When** the user's distance exceeds a configurable maximum (default 50 miles)
**Then** the listing is flagged as "outside pickup radius" with reduced resale viability

**Given** logistics and shipping data
**When** the listing detail is displayed
**Then** the user sees: item size category, estimated shipping cost, pickup distance (if local), and adjusted profit margin

**FRs fulfilled:** FR-SCORE-21, FR-SCORE-22

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-005-advanced-market-intelligence.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-005-S-<N>` (sequential within Epic 5, continuing from previous stories), `@story-5-5`, and `@FR-SCORE-21` / `@FR-SCORE-22` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

## Epic 6 Stories: Flip Lifecycle Management & Analytics

### Story 6.1: Dashboard with Listings & Stats

As a **user**,
I want a dashboard showing my listing inventory with stats and pagination,
So that I can see all my scraped listings at a glance with key metrics.

**Acceptance Criteria:**

**Given** an authenticated user navigates to `/dashboard`
**When** the page loads
**Then** stats cards are displayed showing: total listings, opportunities found, active flips, and total profit

**Given** the dashboard
**When** listings are loaded
**Then** they are displayed in a card/table layout with title, price, score, platform, status, and thumbnail image

**Given** more than 20 listings exist
**When** the dashboard loads
**Then** pagination controls are displayed with configurable page size (10/20/50)

**Given** the dashboard
**When** a user clicks on a listing card
**Then** they are navigated to the listing detail view

**FRs fulfilled:** FR-DASH-01

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-006-flip-lifecycle-management-analytics.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-006-S-<N>` (sequential within Epic 6), `@story-6-1`, and `@FR-DASH-01` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 6.2: Kanban Board with Lifecycle Tracking

As a **user**,
I want a Kanban board to track flips through their lifecycle with drag-and-drop,
So that I can visually manage each flip from discovery to sale.

**Acceptance Criteria:**

**Given** the opportunities page
**When** the Kanban view is selected
**Then** columns are displayed: IDENTIFIED → CONTACTED → PURCHASED → LISTED → SOLD → PASSED

**Given** an opportunity card
**When** the user drags it from IDENTIFIED to CONTACTED
**Then** the opportunity status is updated and persisted

**Given** an opportunity card being moved to PURCHASED
**When** the user drops it in the PURCHASED column
**Then** a modal prompts for the purchase price, which is required before the move completes

**Given** an opportunity card being moved to LISTED
**When** the user drops it in the LISTED column
**Then** a modal prompts for the resale URL where the item is listed

**Given** an opportunity card being moved to SOLD
**When** the user drops it in the SOLD column
**Then** a modal prompts for the final sale price, and the system calculates actual profit (sale price - purchase price - platform-specific fees)

**Given** an opportunity card
**When** the user drags it to PASSED
**Then** the opportunity is marked as passed/declined

**FRs fulfilled:** FR-DASH-02, FR-DASH-03, FR-DASH-04, FR-DASH-05

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-006-flip-lifecycle-management-analytics.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-006-S-<N>` (sequential within Epic 6, continuing from previous stories), `@story-6-2`, and `@FR-DASH-02` / `@FR-DASH-03` / `@FR-DASH-04` / `@FR-DASH-05` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 6.3: Advanced Filtering

As a **user**,
I want to filter listings by platform, score, profit, category, and status,
So that I can find specific items quickly in a large inventory.

**Acceptance Criteria:**

**Given** the dashboard or opportunities page
**When** the user opens the filter panel
**Then** filters are available for: platform (multi-select), score range (slider), profit range, category (multi-select), and status (multi-select)

**Given** filters are applied
**When** the listing view updates
**Then** only listings matching ALL active filters are displayed

**Given** active filters
**When** the user clears a specific filter
**Then** the results update to reflect remaining filters

**Given** active filters
**When** the user shares or bookmarks the URL
**Then** filter state is encoded in URL query parameters and restored on page load

**FRs fulfilled:** FR-DASH-06

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-006-flip-lifecycle-management-analytics.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-006-S-<N>` (sequential within Epic 6, continuing from previous stories), `@story-6-3`, and `@FR-DASH-06` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 6.4: Analytics Dashboard

As a **user**,
I want to see comprehensive analytics about my flipping performance,
So that I can understand my profitability and optimize my strategy.

**Acceptance Criteria:**

**Given** the user navigates to `/analytics`
**When** the page loads
**Then** the following metrics are displayed: total profit, flips completed, average profit per flip, success rate (sold/total)

**Given** the analytics page
**When** the user views the charts section
**Then** charts display: best flip (highest profit), profit by category (bar chart), monthly trends (line chart), and platform performance (comparison)

**Given** the analytics page
**When** no flips have been completed yet
**Then** a helpful empty state is shown with guidance on getting started

**Given** analytics data
**When** the user selects a date range filter
**Then** all metrics and charts update to reflect the selected period

**FRs fulfilled:** FR-DASH-07

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-006-flip-lifecycle-management-analytics.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-006-S-<N>` (sequential within Epic 6, continuing from previous stories), `@story-6-4`, and `@FR-DASH-07` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 6.5: Performance Report Export

As a **user**,
I want to export my performance data as CSV or PDF,
So that I can analyze it externally or share it with partners/accountants.

**Acceptance Criteria:**

**Given** the analytics page
**When** the user clicks "Export CSV"
**Then** a CSV file is downloaded containing: listing title, purchase price, sale price, fees, profit, platform, dates, and category

**Given** the analytics page
**When** the user clicks "Export PDF"
**Then** a formatted PDF report is generated with summary stats, charts, and detailed transaction table

**Given** the export function
**When** active filters or date range are applied
**Then** the export only includes data matching the current view

**FRs fulfilled:** FR-DASH-08

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-006-flip-lifecycle-management-analytics.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-006-S-<N>` (sequential within Epic 6, continuing from previous stories), `@story-6-5`, and `@FR-DASH-08` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 6.6: Inventory View & Real-Time Updates

As a **user**,
I want an inventory view for purchased items with holding costs and real-time dashboard updates,
So that I can track carrying costs and see changes as they happen.

**Acceptance Criteria:**

**Given** the user has items in PURCHASED status
**When** they view the inventory section
**Then** each item shows: title, purchase price, days held, estimated carrying cost (configurable daily rate), and current market value

**Given** an item has been held for 30+ days
**When** the inventory view is displayed
**Then** the item is visually flagged as "aging inventory" with the total holding cost prominently displayed

**Given** a scraping job completes or an opportunity status changes
**When** the dashboard is open
**Then** the dashboard updates in real-time via SSE events without requiring a page refresh

**Given** SSE connection drops
**When** the connection is lost
**Then** the UI shows a reconnection indicator and auto-reconnects with exponential backoff

**FRs fulfilled:** FR-DASH-09, FR-DASH-10

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-006-flip-lifecycle-management-analytics.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-006-S-<N>` (sequential within Epic 6, continuing from previous stories), `@story-6-6`, and `@FR-DASH-09` / `@FR-DASH-10` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

## Epic 7 Stories: Subscription & Billing

### Story 7.1: Subscription Tier Enforcement & Feature Gating

As a **user**,
I want clear subscription tiers with features gated by my plan,
So that I understand what I get at each level and can upgrade for more features.

**Acceptance Criteria:**

**Given** a FREE tier user
**When** they attempt to run more than 10 scans in a day
**Then** the scan is blocked with a message: "Daily scan limit reached. Upgrade to FLIPPER for unlimited scans."

**Given** a FREE tier user
**When** they attempt to scan a second marketplace
**Then** the scan is blocked with a message: "FREE plan supports 1 marketplace. Upgrade to FLIPPER for 3 marketplaces."

**Given** a FLIPPER tier user ($19/mo)
**When** they use the app
**Then** they have unlimited scans and access to 3 marketplaces but advanced features (Phase 2 notifications, calendar integration) are gated

**Given** a PRO tier user ($49/mo)
**When** they use the app
**Then** all features are unlocked with no usage restrictions

**Given** any user
**When** they encounter a gated feature
**Then** a contextual upgrade prompt is shown explaining what they gain by upgrading

**FRs fulfilled:** FR-BILLING-03, FR-BILLING-07

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-007-subscription-billing.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-007-S-<N>` (sequential within Epic 7), `@story-7-1`, and `@FR-BILLING-03` / `@FR-BILLING-07` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 7.2: Stripe Checkout & Customer Portal

As a **user**,
I want to subscribe to a plan and manage my billing through Stripe,
So that payment is secure and I can update my payment method or cancel anytime.

**Acceptance Criteria:**

**Given** a FREE user clicks "Upgrade" on a pricing plan
**When** the checkout flow initiates
**Then** a Stripe Checkout session is created and the user is redirected to Stripe's hosted checkout page

**Given** a successful Stripe payment
**When** the checkout completes
**Then** the user is redirected back to the app with their subscription tier updated immediately

**Given** an authenticated subscriber
**When** they click "Manage Billing" in Settings
**Then** they are redirected to the Stripe Customer Portal where they can update payment method, view invoices, or cancel

**Given** a Stripe Checkout session
**When** the user cancels or closes the checkout page
**Then** no subscription is created and the user remains on their current tier

**FRs fulfilled:** FR-BILLING-04, FR-BILLING-05

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-007-subscription-billing.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-007-S-<N>` (sequential within Epic 7, continuing from previous stories), `@story-7-2`, and `@FR-BILLING-04` / `@FR-BILLING-05` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 7.3: Stripe Webhook Handling

As a **system**,
I want to process Stripe webhook events for subscription lifecycle changes,
So that user accounts reflect their current subscription status in real-time.

**Acceptance Criteria:**

**Given** a Stripe webhook event `customer.subscription.created`
**When** it is received and signature-verified
**Then** the user's subscription tier is updated in the database

**Given** a Stripe webhook event `customer.subscription.updated` (upgrade or downgrade)
**When** it is processed
**Then** the user's tier and feature access are updated immediately

**Given** a Stripe webhook event `customer.subscription.deleted` (cancellation)
**When** it is processed
**Then** the user is downgraded to FREE tier at the end of their billing period

**Given** a Stripe webhook event `invoice.payment_failed`
**When** it is processed
**Then** the user is notified of the payment failure and given a grace period before downgrade

**Given** an incoming webhook request
**When** the Stripe signature verification fails
**Then** the request is rejected with 400 and logged as a potential security event

**FRs fulfilled:** FR-BILLING-06
**NFRs addressed:** NFR-SEC-08

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-007-subscription-billing.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-007-S-<N>` (sequential within Epic 7, continuing from previous stories), `@story-7-3`, and `@FR-BILLING-06` / `@NFR-SEC-08` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 7.4: API Usage Tracking & Metering

As a **user**,
I want to see how many scans and analyses I've used this month,
So that I can manage my usage within my plan limits.

**Acceptance Criteria:**

**Given** a user runs a scraping job
**When** the job completes
**Then** the scan count for the current month is incremented

**Given** a user triggers an AI analysis
**When** the analysis completes
**Then** the analysis count for the current month is incremented

**Given** an authenticated user
**When** they view their Settings or dashboard
**Then** current month usage is displayed: "X/10 scans used" (FREE) or "X scans this month" (paid)

**Given** a new calendar month begins
**When** the first request of the month is made
**Then** usage counters are reset to zero

**FRs fulfilled:** FR-BILLING-08

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-007-subscription-billing.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-007-S-<N>` (sequential within Epic 7, continuing from previous stories), `@story-7-4`, and `@FR-BILLING-08` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

## Epic 8 Stories: Seller Communication & Negotiation

### Story 8.1: AI Message Generation

As a **user**,
I want AI to generate personalized purchase messages for sellers,
So that I can quickly contact sellers with professional, platform-appropriate messages.

**Acceptance Criteria:**

**Given** a user selects a listing and clicks "Contact Seller"
**When** message generation runs
**Then** an AI-generated purchase message is created with platform-appropriate tone (casual for Craigslist, professional for eBay)

**Given** the message generation
**When** the user selects a message type (inquiry, offer, follow-up, negotiation)
**Then** the AI adapts the message content and tone for the selected type

**Given** a generated message
**When** displayed to the user
**Then** it is shown as a draft that can be edited before sending

**Given** the AI API is unavailable
**When** message generation is attempted
**Then** a template-based fallback message is generated with placeholder fields

**FRs fulfilled:** FR-COMM-01, FR-COMM-02

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-008-seller-communication-negotiation.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-008-S-<N>` (sequential within Epic 8), `@story-8-1`, and `@FR-COMM-01` / `@FR-COMM-02` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 8.2: AI Negotiation Strategy

As a **user**,
I want AI-powered negotiation suggestions with recommended offer amounts,
So that I can negotiate effectively and get the best deal.

**Acceptance Criteria:**

**Given** a listing with verified market data and asking price
**When** the user requests negotiation strategy
**Then** the AI suggests: initial offer amount, walk-away price, negotiation tactics, and counter-offer strategies

**Given** the AI negotiation suggestion
**When** recommended amounts are displayed
**Then** they are based on verified market data, item condition, and time-on-market

**Given** an active negotiation thread
**When** the user receives a counter-offer
**Then** the AI suggests whether to accept, counter, or walk away with reasoning

**FRs fulfilled:** FR-COMM-03

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-008-seller-communication-negotiation.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-008-S-<N>` (sequential within Epic 8, continuing from previous stories), `@story-8-2`, and `@FR-COMM-03` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 8.3: Message Inbox & Thread History

As a **user**,
I want a message inbox showing conversation threads per listing,
So that I can track all my seller communications in one place.

**Acceptance Criteria:**

**Given** the user navigates to `/messages`
**When** the page loads
**Then** a list of conversation threads is displayed, grouped by listing, with the most recent message preview

**Given** a conversation thread
**When** the user clicks on it
**Then** the full message history is displayed in chronological order with direction indicators (INBOUND/OUTBOUND)

**Given** a message in the system
**When** it is stored
**Then** it includes: direction (INBOUND/OUTBOUND), status, body, listing reference, and parent thread ID

**Given** the inbox
**When** a new message arrives in a thread
**Then** the thread moves to the top of the list with an unread indicator

**FRs fulfilled:** FR-COMM-04, FR-COMM-08

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-008-seller-communication-negotiation.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-008-S-<N>` (sequential within Epic 8, continuing from previous stories), `@story-8-3`, and `@FR-COMM-04` / `@FR-COMM-08` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 8.4: Message Approval Workflow

As a **user**,
I want to review and approve messages before they are sent,
So that I maintain control over all communications with sellers.

**Acceptance Criteria:**

**Given** an AI-generated message
**When** it is created
**Then** its status is set to DRAFT

**Given** a DRAFT message
**When** the user reviews and approves it
**Then** the status transitions to PENDING_APPROVAL (if configured) or directly to SENT

**Given** a PENDING_APPROVAL message
**When** the user confirms sending
**Then** the status transitions to SENT and the message is dispatched

**Given** a SENT message
**When** delivery is confirmed by the platform
**Then** the status transitions to DELIVERED

**Given** a DRAFT message
**When** the user edits it
**Then** changes are saved and the message remains in DRAFT until approved

**FRs fulfilled:** FR-COMM-05

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-008-seller-communication-negotiation.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-008-S-<N>` (sequential within Epic 8, continuing from previous stories), `@story-8-4`, and `@FR-COMM-05` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 8.5: Conversation Status & Inbound Message Tracking

As a **user**,
I want to track conversation status and see seller replies,
So that I know which leads need attention and which have progressed.

**Acceptance Criteria:**

**Given** a listing with an active conversation
**When** the conversation status is viewed
**Then** it shows one of: pending (awaiting response), responded (seller replied), purchased (deal closed)

**Given** the system has authenticated marketplace sessions
**When** a seller replies to a message on the platform
**Then** the inbound message is captured and stored with direction INBOUND

**Given** a new inbound message is captured
**When** the conversation status was "pending"
**Then** it automatically updates to "responded"

**Given** the user marks a flip as purchased
**When** the conversation exists
**Then** the conversation status updates to "purchased"

**Given** inbound message tracking
**When** the platform does not support API-based message retrieval
**Then** the system uses authenticated browser sessions to check for replies

**FRs fulfilled:** FR-COMM-06, FR-COMM-07

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-008-seller-communication-negotiation.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-008-S-<N>` (sequential within Epic 8, continuing from previous stories), `@story-8-5`, and `@FR-COMM-06` / `@FR-COMM-07` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

## Epic 9 Stories: Cross-Platform Resale Listing

### Story 9.1: AI Title & Description Generation

As a **user**,
I want AI-generated optimized titles and descriptions for resale listings,
So that my listings attract buyers and rank well in marketplace search.

**Acceptance Criteria:**

**Given** a purchased item ready for resale
**When** the user clicks "Generate Listing"
**Then** GPT-4o-mini generates an SEO-optimized title (max 80 chars for eBay) with key selling points

**Given** title generation
**When** the target platform is specified
**Then** the title follows platform-specific conventions (eBay: keyword-dense, FBMP: conversational, Mercari: concise)

**Given** a purchased item ready for resale
**When** description generation runs
**Then** GPT-4o-mini generates a platform-specific description highlighting value, condition, and key features

**Given** AI API unavailability
**When** title or description generation fails
**Then** algorithmic template fallbacks generate reasonable listings using item data fields

**Given** generated title and description
**When** displayed to the user
**Then** both are editable before posting

**FRs fulfilled:** FR-RELIST-01, FR-RELIST-02, FR-RELIST-07

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-009-cross-platform-resale-listing.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-009-S-<N>` (sequential within Epic 9), `@story-9-1`, and `@FR-RELIST-01` / `@FR-RELIST-02` / `@FR-RELIST-07` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 9.2: Optimal Listing Price Calculation

As a **user**,
I want the system to recommend an optimal listing price,
So that I maximize profit while remaining competitive.

**Acceptance Criteria:**

**Given** a purchased item with verified market data
**When** listing price calculation runs
**Then** the recommended price accounts for: verified market value, target profit margin, and platform-specific fees

**Given** the recommended price
**When** displayed to the user
**Then** it shows: recommended price, estimated profit after fees, and the target margin percentage

**Given** the user wants a different profit margin
**When** they adjust the target margin slider
**Then** the recommended price recalculates in real-time

**FRs fulfilled:** FR-RELIST-03

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-009-cross-platform-resale-listing.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-009-S-<N>` (sequential within Epic 9, continuing from previous stories), `@story-9-2`, and `@FR-RELIST-03` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 9.3: Cross-Platform Posting Queue

As a **user**,
I want to queue listings for posting across multiple platforms,
So that I can maximize exposure without manually creating each listing.

**Acceptance Criteria:**

**Given** a resale listing is ready
**When** the user selects target platforms (eBay, Mercari, FBMP, OfferUp)
**Then** a PostingQueueItem is created for each platform with status PENDING

**Given** a PostingQueueItem with status PENDING
**When** the posting job runs
**Then** the status transitions to IN_PROGRESS and the listing is submitted to the target platform

**Given** a successful posting
**When** the platform confirms
**Then** the status transitions to POSTED and the live listing URL is stored

**Given** a posting failure
**When** an error occurs
**Then** the status transitions to FAILED, the error is logged, and retry logic triggers (up to max 3 retries)

**Given** a listing and target platform combination
**When** a PostingQueueItem already exists for [listingId, targetPlatform, userId]
**Then** a duplicate posting is prevented by the unique constraint

**FRs fulfilled:** FR-RELIST-04, FR-RELIST-05, FR-RELIST-06

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-009-cross-platform-resale-listing.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-009-S-<N>` (sequential within Epic 9, continuing from previous stories), `@story-9-3`, and `@FR-RELIST-04` / `@FR-RELIST-05` / `@FR-RELIST-06` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 9.4: Image Reuse for Cross-Posting

As a **user**,
I want my stored listing images automatically attached when cross-posting,
So that I don't need to re-upload or re-download images for each platform.

**Acceptance Criteria:**

**Given** a listing with images stored in Firebase Storage
**When** the user creates a resale listing for another platform
**Then** the stored images are automatically attached from Firebase Storage URLs

**Given** images are reused for cross-posting
**When** the posting job runs
**Then** images are retrieved from Firebase Storage (not re-downloaded from the original listing URL)

**Given** the original listing images were not captured (pre-Epic 3 legacy)
**When** the user creates a resale listing
**Then** the system prompts to upload images manually or attempts to download from the original URL

**FRs fulfilled:** FR-RELIST-08

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-009-cross-platform-resale-listing.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-009-S-<N>` (sequential within Epic 9, continuing from previous stories), `@story-9-4`, and `@FR-RELIST-08` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

## Epic 10 Stories: Monitoring & Email Notifications

### Story 10.1: Background Job Scheduler

As a **system**,
I want a background job scheduler to periodically check listings and trigger events,
So that monitoring and notifications can run without user intervention.

**Acceptance Criteria:**

**Given** the Cloud Run deployment
**When** a scheduled job is configured (via Cloud Scheduler or cron)
**Then** it triggers a monitoring endpoint at configurable intervals (default: every 30 minutes)

**Given** the monitoring endpoint is triggered
**When** tracked listings need to be checked
**Then** the system batches listing checks to avoid rate limiting on source platforms

**Given** a monitoring check discovers a state change (price change, sold, expired, unavailable)
**When** the event is detected
**Then** a notification event is created in the database for downstream processing

**Given** the scheduler
**When** a job fails
**Then** it is retried with exponential backoff and failures are logged

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-010-monitoring-email-notifications.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-010-S-<N>` (sequential within Epic 10), `@story-10-1`, and relevant FR/NFR tags as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 10.2: Listing Monitoring Events

As a **user**,
I want the system to detect when my tracked listings change,
So that I can react to price drops, sold items, and expiring listings.

**Acceptance Criteria:**

**Given** a tracked listing on a source platform
**When** the monitoring job detects it has been sold
**Then** the listing status is updated to SOLD and a `listing.sold` event is created

**Given** a tracked listing
**When** the monitoring job detects a price change
**Then** the old price, new price, and change direction are recorded, and a `listing.price_changed` event is created

**Given** a tracked listing with a known expiry date
**When** the listing is within 24 hours of expiration
**Then** a `listing.expiring` event is created with the expiry timestamp

**Given** a tracked listing
**When** the monitoring job detects the listing is no longer available (removed, 404)
**Then** a `listing.unavailable` event is created and the user is alerted

**FRs fulfilled:** FR-MONITOR-01, FR-MONITOR-02, FR-MONITOR-03, FR-MONITOR-04

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-010-monitoring-email-notifications.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-010-S-<N>` (sequential within Epic 10, continuing from previous stories), `@story-10-2`, and `@FR-MONITOR-01` / `@FR-MONITOR-02` / `@FR-MONITOR-03` / `@FR-MONITOR-04` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 10.3: Flip Lifecycle Email Notifications

As a **user**,
I want email alerts for key flip lifecycle events,
So that I stay informed about new opportunities, purchases, and sales without checking the app.

**Acceptance Criteria:**

**Given** a new listing scores above the opportunity threshold
**When** the `opportunity.found` event is created
**Then** an email is sent via Resend containing: platform, buy price, estimated profit margin, flippability score, and brief item description

**Given** a flip is marked as sold
**When** the `flip.sold` event is created
**Then** an email is sent containing: item title, final sale price, actual profit, and platform

**Given** a flip is marked as purchased
**When** the `flip.purchased` event is created
**Then** an email is sent containing: item title, purchase price, and estimated profit

**Given** a purchased item is marked as shipped
**When** the `flip.shipped` event is created
**Then** an email is sent containing: item title, tracking info (if available), and destination platform

**Given** the user has disabled email notifications for a specific event type
**When** that event occurs
**Then** no email is sent for that event type

**FRs fulfilled:** FR-NOTIFY-01, FR-NOTIFY-05, FR-NOTIFY-06, FR-NOTIFY-07

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-010-monitoring-email-notifications.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-010-S-<N>` (sequential within Epic 10, continuing from previous stories), `@story-10-3`, and `@FR-NOTIFY-01` / `@FR-NOTIFY-05` / `@FR-NOTIFY-06` / `@FR-NOTIFY-07` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 10.4: Communication Email Notifications

As a **user**,
I want email alerts for message activity on my active flips,
So that I can respond promptly to seller messages and review AI drafts.

**Acceptance Criteria:**

**Given** a seller replies to a conversation thread
**When** the `message.received` event is created
**Then** an email is sent containing: seller name/handle, message preview, listing title, and a link to the thread

**Given** the AI generates a new draft message for user review
**When** the `message.draft_ready` event is created
**Then** an email is sent containing: listing title, draft message preview, and a link to review/approve

**Given** a message is successfully sent in a conversation thread
**When** the `message.sent` event is created
**Then** an email is sent containing: listing title, message preview, and delivery status

**FRs fulfilled:** FR-NOTIFY-02, FR-NOTIFY-03, FR-NOTIFY-04

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-010-monitoring-email-notifications.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-010-S-<N>` (sequential within Epic 10, continuing from previous stories), `@story-10-4`, and `@FR-NOTIFY-02` / `@FR-NOTIFY-03` / `@FR-NOTIFY-04` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 10.5: Smart Alert Email Notifications

As a **user**,
I want intelligent alerts for reviews, cold/hot flips, and price changes,
So that I can take action on time-sensitive situations.

**Acceptance Criteria:**

**Given** a review is left about the user on any connected platform
**When** the `review.received` event is created
**Then** an email is sent containing: platform, rating, review text preview, and a link to the review

**Given** a conversation thread has no response for the user's configured "Flip Gone Cold Time" (default 24 hours)
**When** the cold threshold is exceeded
**Then** an email is sent containing: listing title, time since last response, and a link to the conversation

**Given** a conversation thread receives consecutive inbound messages exceeding the user's "Flip Turned Hot #" threshold (default 3)
**When** the hot threshold is met
**Then** an email is sent containing: listing title, number of unread messages, and a prompt to review the draft response

**Given** an active flip's listing price changes on the source platform
**When** the `listing.price_changed` event is created
**Then** an email is sent containing: listing title, old price → new price (red for increase, green for decrease), and updated estimated profit margin

**FRs fulfilled:** FR-NOTIFY-08, FR-NOTIFY-09, FR-NOTIFY-10, FR-NOTIFY-11

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-010-monitoring-email-notifications.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-010-S-<N>` (sequential within Epic 10, continuing from previous stories), `@story-10-5`, and `@FR-NOTIFY-08` / `@FR-NOTIFY-09` / `@FR-NOTIFY-10` / `@FR-NOTIFY-11` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 10.6: Notification Preferences

As a **user**,
I want to configure which events trigger email notifications,
So that I only receive alerts that matter to me.

**Acceptance Criteria:**

**Given** the user navigates to Settings → Notifications
**When** the notification preferences section loads
**Then** each event type is listed with an email toggle (on/off)

**Given** the notification preferences
**When** the user toggles email off for "New flippable item found"
**Then** the preference is saved and no emails are sent for that event type going forward

**Given** default notification preferences
**When** a new user account is created
**Then** all email notification toggles are enabled by default

**Given** the notification preferences UI
**When** Phase 2 push/SMS toggles are not yet available
**Then** the UI shows email toggles only, with placeholder text for "Push" and "SMS" columns showing "Coming Soon"

**Given** the notification preferences
**When** the user configures "Flip Gone Cold Time" and "Flip Turned Hot #"
**Then** the values are saved and used by the monitoring system for cold/hot detection

**FRs fulfilled:** FR-NOTIFY-12 (email toggle only)

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-010-monitoring-email-notifications.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-010-S-<N>` (sequential within Epic 10, continuing from previous stories), `@story-10-6`, and `@FR-NOTIFY-12` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

## Epic 11 Stories: Push & SMS Notifications (Phase 2)

### Story 11.1: FCM Push Notification Client

As a **user**,
I want to receive push notifications in my browser,
So that I get instant alerts even when I'm not actively using the app.

**Acceptance Criteria:**

**Given** the app is loaded in a supported browser
**When** the user enables push notifications in Settings
**Then** the browser requests notification permission and a FCM device token is generated and stored

**Given** the user has granted notification permission
**When** a notification event occurs (any type from Epic 10)
**Then** a push notification is delivered to the browser via FCM with appropriate title and body

**Given** the FCM service worker (configured in Epic 1)
**When** the user is not actively on the Flipper AI tab
**Then** push notifications are still received and displayed as system notifications

**Given** the user has multiple devices/browsers
**When** they enable push on each
**Then** each device token is stored and notifications are delivered to all registered devices

**Given** the user disables push notifications for a specific event type in Settings
**When** that event occurs
**Then** no push notification is sent for that event type (email may still be sent per its own toggle)

**FRs fulfilled:** FR-NOTIFY-12 (push toggle)

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-011-push-sms-notifications.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-011-S-<N>` (sequential within Epic 11), `@story-11-1`, and `@FR-NOTIFY-12` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 11.2: Twilio SMS Integration

As a **user**,
I want to receive SMS text alerts for flip events,
So that I get critical notifications even when I'm away from my computer.

**Acceptance Criteria:**

**Given** the user navigates to Settings → Notifications
**When** they enter and verify their phone number
**Then** a verification SMS is sent via Twilio and the number is confirmed before enabling SMS alerts

**Given** a verified phone number
**When** the user enables SMS for a notification event type
**Then** future events of that type trigger an SMS via Twilio to the verified number

**Given** an SMS notification is triggered
**When** the message is composed
**Then** it is concise (< 160 chars) with key details: event type, item title, and one key metric (e.g., profit amount)

**Given** Twilio API failure
**When** an SMS cannot be delivered
**Then** the failure is logged and the email/push channels still function independently

**Given** the user has not verified a phone number
**When** they attempt to enable SMS toggles
**Then** the toggles are disabled with a prompt: "Verify your phone number to enable SMS alerts"

**FRs fulfilled:** FR-NOTIFY-13

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-011-push-sms-notifications.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-011-S-<N>` (sequential within Epic 11, continuing from previous stories), `@story-11-2`, and `@FR-NOTIFY-13` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 11.3: Multi-Channel Notification Preferences

As a **user**,
I want three independent toggles (push, email, SMS) per notification event,
So that I can customize exactly how I'm notified for each type of event.

**Acceptance Criteria:**

**Given** the Settings → Notifications page
**When** Phase 2 is deployed
**Then** each event type row shows three independent toggles: Email, Push, SMS

**Given** the three-toggle UI
**When** the user enables Push but disables Email and SMS for "Flip Sold"
**Then** sold events only trigger push notifications (no email, no SMS)

**Given** any combination of toggles
**When** an event occurs
**Then** notifications are sent only through the enabled channels for that event type

**Given** a user without push permission or without a verified phone number
**When** they view the notification preferences
**Then** the respective toggle is disabled with a tooltip explaining the prerequisite

**FRs fulfilled:** FR-NOTIFY-12 (complete — all three toggles)

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-011-push-sms-notifications.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-011-S-<N>` (sequential within Epic 11, continuing from previous stories), `@story-11-3`, and `@FR-NOTIFY-12` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

## Epic 12 Stories: Meeting & Logistics (Phase 2)

### Story 12.1: Google Calendar Integration

As a **user**,
I want buy/sell meetups automatically added to my Google Calendar,
So that I never miss a scheduled pickup or sale.

**Acceptance Criteria:**

**Given** the user navigates to Settings → Integrations
**When** they click "Connect Google Calendar"
**Then** a Google OAuth flow is initiated requesting calendar write access

**Given** Google Calendar is connected
**When** a meeting time and place is settled for buying or selling an item
**Then** a calendar event is automatically created with: event title (item name + buy/sell), date/time, location, item details, counterparty info, and a link to the listing

**Given** a calendar event is created
**When** the meeting is rescheduled in the app
**Then** the calendar event is updated to reflect the new time/location

**Given** a calendar event is created
**When** the flip is cancelled or the meeting is cancelled
**Then** the calendar event is deleted or marked as cancelled

**Given** Google Calendar OAuth token expires
**When** a calendar operation is attempted
**Then** the token is refreshed automatically, or the user is prompted to re-authorize if refresh fails

**FRs fulfilled:** FR-MEET-01

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-012-meeting-logistics.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-012-S-<N>` (sequential within Epic 12), `@story-12-1`, and `@FR-MEET-01` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.

---

### Story 12.2: Google Maps Route Generation

As a **user**,
I want automatic driving directions to my scheduled meetups,
So that I leave at the right time and arrive on schedule.

**Acceptance Criteria:**

**Given** a scheduled meeting with a location
**When** the user views the meeting details
**Then** a Google Maps route is displayed from their current location to the meeting location

**Given** a scheduled meeting time and route
**When** the estimated travel time is calculated
**Then** the system recommends a departure time to arrive on schedule (meeting time minus travel time minus configurable buffer, default 10 minutes)

**Given** the departure time recommendation
**When** the user has push or email notifications enabled for meetings
**Then** a "Time to leave" alert is sent at the recommended departure time

**Given** the user navigates to the meeting detail
**When** they click "Open in Maps"
**Then** Google Maps is opened with the route pre-loaded (deep link to Google Maps app or web)

**Given** Google Maps SDK is not configured
**When** the user views a meeting with a location
**Then** the address is displayed as text with a link to Google Maps (graceful degradation)

**FRs fulfilled:** FR-MEET-02

**DoD — Acceptance Tests Required:**
Write Gherkin scenarios in `test/acceptance/features/E-012-meeting-logistics.feature` covering ALL acceptance criteria above. Tag each scenario with `@E-012-S-<N>` (sequential within Epic 12, continuing from previous stories), `@story-12-2`, and `@FR-MEET-02` as applicable. Update the requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. See "Definition of Done (DoD) — All Stories" at the top of this file for full tagging rules and examples.
