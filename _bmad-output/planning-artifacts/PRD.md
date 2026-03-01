# Flipper AI - Product Requirements Document

**Author:** Stephen Boyett
**Company:** Axovia AI
**Version:** 3.0
**Date:** February 27, 2026
**Original Version:** 2.0 (February 3, 2026)

> v3.0 updates: Corrected technical architecture to match actual implementation. Added current state analysis. Preserved all original requirements.

---

## Executive Summary

**Flipper AI** is an AI-powered marketplace arbitrage tool that helps users find, analyze, and flip items for profit across multiple online marketplaces. The tool automates the entire flipping workflow — from discovery to purchase communication to resale listing.

**Tagline:** _Find. Flip. Profit._

---

## Problem Statement

Flipping items for profit is time-consuming and requires:

- Manually searching multiple marketplaces
- Estimating resale value based on experience
- Tracking listings and price changes
- Communicating with sellers
- Creating resale listings

Most flippers miss opportunities because they can't monitor enough listings fast enough.

---

## Solution

Flipper AI automates the entire flipping workflow:

1. **Multi-Marketplace Scanning** — Continuously monitors eBay, Craigslist, Facebook Marketplace, and others
2. **AI Flippability Scoring** — Analyzes each item using price history, sales probability, and market demand
3. **Automated Seller Communication** — Drafts and manages conversations with sellers
4. **Smart Resale Listings** — Automatically creates optimized sell listings at target prices
5. **Real-time Monitoring** — Tracks listings to ensure items don't sell before purchase

---

## Target Users

### Primary: Side Hustlers & Part-Time Flippers

- Looking for extra income
- Limited time for manual searching
- Want data-driven decisions

### Secondary: Professional Resellers

- High-volume operations
- Need efficiency tools
- Value automation

---

## Key Features

### FR-SCAN: Multi-Marketplace Scanner

- **Supported Platforms:** eBay, Craigslist, Facebook Marketplace, OfferUp, Mercari
- **Real-time Alerts:** Instant notifications for high-flippability items via SSE
- **Custom Filters:** Category, price range, location, keywords
- **Search Configs:** Saved and reusable search configurations

### FR-SCORE: AI Flippability Score Engine

Analyzes each listing using a hybrid algorithmic + LLM pipeline:

| Factor                 | Weight | Data Source                          |
| ---------------------- | ------ | ------------------------------------ |
| Price vs. Market Value | 30%    | eBay sold listings, price guides     |
| Sales Probability      | 25%    | Historical sales data, demand trends |
| Profit Margin          | 20%    | Buy price vs. expected sell price    |
| Time to Sell           | 15%    | Average days on market               |
| Condition Assessment   | 10%    | Listing description analysis         |

**Output:** Flippability Score (0-100) + Confidence Level

**Three-Tier AI Pipeline:**
- Tier 1: Item Identification (GPT-4o-mini) — brand, model, condition extraction
- Tier 2: Item Analysis (Claude Sonnet) — structural analysis, flippability
- Tier 3: Sellability Analysis (GPT-4o-mini) — market verification, pricing

**Known Scoring Limitations (from `docs/LISTING-DECISION-LOGIC.md`):**

The current algorithmic scoring has critical accuracy issues:

1. **Circular logic:** `estimatedValue = askingPrice * categoryMultiplier` — the system guesses market value from the asking price rather than verifying against actual sold data
2. **No real market validation:** Comparable eBay URLs are generated but never fetched for actual prices
3. **All listings saved:** No filtering threshold — database fills with low-value noise
4. **Condition defaults to "good":** Condition is not extracted from listings

**Target state:** LLM-verified market analysis pipeline where:
- LLM identifies exact product (brand, model, variant, specs)
- eBay sold prices are fetched for verified market value
- Only listings 50%+ undervalued (vs verified market price) are saved
- Sellability score includes demand level, days to sell, risk factors

**Value Estimation Formula (current algorithmic):**
- Category multipliers: 1.1x-2.5x depending on category
- Condition multiplier: 0.40 (poor) to 1.0 (new)
- Brand boosts: Apple 1.2x, Nintendo 1.25x, Dyson 1.3x, vintage/rare 1.4x
- Risk penalties: broken 0.3x, needs repair 0.4x, incomplete 0.6x
- Score = profitMargin * 100 + 50 (capped 0-100)
- OPPORTUNITY status if valueScore >= 70

### FR-COMM: Automated Seller Communication

- **Message Drafting:** AI generates personalized outreach messages
- **Conversation Management:** Full chat history in UI
- **Pickup Scheduling:** Integrates user availability for local pickups
- **Approval Flow:** User approves messages before sending

### FR-RELIST: Resale Listing Generator

- **Auto-create Listings:** Generates title, description, photos
- **Price Optimization:** Sets price based on market analysis
- **Cross-platform Posting:** List on multiple marketplaces
- **AI-Generated Content:** Platform-specific descriptions via GPT-4o-mini

### FR-DASH: Dashboard & Tracking

- **Flippables Queue:** Items identified but not yet contacted
- **Active Negotiations:** Ongoing conversations
- **Inventory:** Purchased items awaiting resale
- **Sales History:** Completed flips with P&L
- **Kanban Board:** Drag-and-drop opportunity management
- **Real-time Updates:** SSE-based live notifications

### FR-MONITOR: Listing Monitoring

- **SOLD Detection:** Alerts if a tracked item sells
- **Price Changes:** Notifies of price drops
- **Listing Expiry:** Warns before listings expire

### FR-BILLING: User Management & Billing

- **Subscription Tiers:** Free, Flipper ($19/mo), Pro ($49/mo), Enterprise
- **Stripe Integration:** Checkout, Customer Portal, webhooks
- **Feature Gating:** Tier-based access controls
- **Usage Metering:** Track scans/analyses per user

### FR-INFRA: GCP Infrastructure

- **Containerized Deployment:** Next.js on Cloud Run
- **Managed Database:** Cloud SQL (PostgreSQL)
- **Authentication:** Firebase Auth integration
- **Auto-scaling:** 0 to N instances on Cloud Run
- **CI/CD:** GitHub Actions deployment pipeline

---

## User Flow

```
[Marketplaces] ──scan──> [AI Analysis] ──score──> [Flippables Queue]
                                                         |
                                                  (User reviews)
                                                         |
                         ┌───────────────────────────────┘
                         v
                  [Draft Message] ──approve──> [Send to Seller]
                         |
                         v
                  [Negotiate] <──> [Seller Responses]
                         |
                  (Purchase confirmed)
                         |
                         v
                  [Create Sell Listing] ──post──> [Marketplaces]
                         |
                  (Item sells)
                         |
                         v
                    [Profit!]
```

---

## Pricing

| Tier            | Price  | Features                                         |
| --------------- | ------ | ------------------------------------------------ |
| **Free**        | $0/mo  | 10 scans/day, 1 marketplace, manual messaging    |
| **Flipper**     | $19/mo | Unlimited scans, 3 marketplaces, AI messaging    |
| **Pro Flipper** | $49/mo | All marketplaces, auto-listing, priority support |
| **Enterprise**  | Custom | API access, team features, custom integrations   |

---

## Technical Architecture

### Frontend

- **Framework:** Next.js 16 (App Router, Server Components)
- **UI Library:** React 19
- **Styling:** Tailwind CSS 4
- **Real-time:** Server-Sent Events (SSE)
- **Drag & Drop:** @hello-pangea/dnd (Kanban board)

### Backend

- **API:** Next.js API Routes (App Router)
- **Database:** PostgreSQL via Prisma ORM v7.4 (13 models)
- **Auth:** NextAuth v5 (credentials + OAuth)
- **Validation:** Zod schema validation
- **Email:** Resend transactional email

### AI Integration

- **Primary AI:** OpenAI GPT-4o-mini (identification, analysis, descriptions)
- **Secondary AI:** Anthropic Claude Sonnet (structural analysis)
- **Browser AI:** Stagehand (Gemini-powered browser automation)
- **Caching:** AiAnalysisCache table with 24-hour TTL

### Scraping

- **Engine:** Playwright (headless Chromium)
- **Platforms:** Craigslist, eBay (Browse API), Facebook (Graph API + Stagehand), Mercari (internal API), OfferUp (Playwright)
- **Anti-Detection:** Custom user agents, selector fallbacks, rate limiting

### Infrastructure (Planned — Epic 1)

- **Compute:** Google Cloud Run (containerized Next.js)
- **Database:** Cloud SQL (managed PostgreSQL)
- **Auth Layer:** Firebase Auth (social login, JWT)
- **CDN/Hosting:** Firebase Hosting (static assets)
- **Monitoring:** Sentry (error tracking, performance)
- **CI/CD:** GitHub Actions (5 workflows)

### Integrations

- eBay Browse API v1 (OAuth)
- Facebook Graph API (Marketplace)
- Craigslist (Playwright scraping)
- OfferUp (Playwright scraping)
- Mercari (internal API + Playwright)
- Stripe (subscriptions, webhooks)

---

## Current Implementation State (as of Feb 27, 2026)

### Implemented

- Database schema (Prisma/PostgreSQL) with 13 models
- eBay API scraper with Browse API integration
- Craigslist scraper (Playwright, location/category-based)
- Facebook Marketplace scraper (Graph API + Stagehand)
- Mercari scraper (internal API + Playwright)
- OfferUp scraper (Playwright)
- Algorithmic value estimation engine (0-100 scoring)
- Three-tier AI analysis pipeline (OpenAI + Anthropic)
- AI-generated resale descriptions and titles
- Dashboard with listings, filters, bulk actions
- Kanban-style opportunity board
- Opportunities tracking page
- Settings page with API key management
- User authentication (NextAuth v5)
- Search configurations API
- Stripe subscription integration (checkout, webhooks, portal)
- SSE real-time event streaming
- Health check endpoints
- Sentry error monitoring
- 199+ tests (Jest unit + Playwright E2E + Cucumber BDD)
- 5 CI/CD pipelines (GitHub Actions)

### Gaps vs PRD

**Infrastructure:**
- No GCP infrastructure (still local/Vercel — Cloud Run, Cloud SQL, Firebase Auth planned)

**Scoring Accuracy:**
- Algorithmic scoring uses circular logic (no verified market prices)
- LLM pipeline exists but needs real market data integration (eBay sold prices)
- No filtering threshold enforcement (all listings saved regardless of quality)

**Features Not Yet Functional:**
- No listing monitoring (SOLD detection, price change alerts)
- No notification system (in-app or email)
- No message approval workflow (UI exists at `/messages` but approval flow incomplete)
- No cross-platform posting execution (queue model exists, posting not implemented)
- No inventory management view (data tracked in Opportunity model but no dedicated UI)
- No feature gating by subscription tier (tiers defined but not enforced)

**Partially Implemented:**
- Landing page EXISTS at `/` (hero, features, pricing, CTA)
- Onboarding wizard EXISTS at `/onboarding` (6-step wizard)
- Analytics page EXISTS at `/analytics` (profit/loss, trends, category breakdown)
- Messages page EXISTS at `/messages` (AI-generated messages, thread view)
- Seller communication partially works (message drafting exists, full conversation management incomplete)

---

## Success Metrics

| Metric                    | Target (3 months) |
| ------------------------- | ----------------- |
| MAU                       | 1,000             |
| Paid Subscribers          | 100               |
| MRR                       | $2,500            |
| Avg Flippability Accuracy | 80%               |
| User Profit (avg)         | $500/mo           |

---

## Non-Functional Requirements

### NFR-PERF: Performance
- NFR-PERF-01: Page loads < 2 seconds
- NFR-PERF-02: Scraper completes single marketplace scan in < 60 seconds
- NFR-PERF-03: AI analysis response < 10 seconds per listing
- NFR-PERF-04: SSE events delivered within 1 second of trigger

### NFR-SEC: Security
- NFR-SEC-01: All traffic over HTTPS
- NFR-SEC-02: Passwords hashed with bcryptjs (12 rounds)
- NFR-SEC-03: Rate limiting on all auth endpoints
- NFR-SEC-04: Secure session management (JWT HttpOnly cookies)
- NFR-SEC-05: Input validation and sanitization (Zod)
- NFR-SEC-06: API key encryption at rest
- NFR-SEC-07: Security headers (CSP, HSTS, X-Frame-Options)
- NFR-SEC-08: Stripe webhook signature verification
- NFR-SEC-09: hCaptcha on login

### NFR-SCALE: Scalability
- NFR-SCALE-01: Cloud Run auto-scaling (0 to N instances)
- NFR-SCALE-02: Database connection pooling via Cloud SQL
- NFR-SCALE-03: AI analysis caching (24-hour TTL)

### NFR-RELY: Reliability
- NFR-RELY-01: Graceful degradation when AI APIs unavailable (fallback to algorithmic scoring)
- NFR-RELY-02: Scraper retry logic with exponential backoff
- NFR-RELY-03: Health check endpoints for monitoring
- NFR-RELY-04: Structured logging via pino

### NFR-TEST: Testing
- NFR-TEST-01: 80%+ unit test coverage
- NFR-TEST-02: E2E tests for all critical user flows
- NFR-TEST-03: BDD acceptance tests for all functional requirements
- NFR-TEST-04: Requirements traceability matrix with 100% FR/NFR coverage

### NFR-UX: Usability
- NFR-UX-01: Mobile-responsive UI
- NFR-UX-02: Accessible (WCAG AA compliance)
- NFR-UX-03: Consistent design system (Tailwind CSS 4)

---

## Risks & Mitigations

| Risk                          | Mitigation                                                    |
| ----------------------------- | ------------------------------------------------------------- |
| Marketplace TOS violations    | Comply with APIs, rate limiting, no scraping where prohibited |
| Low flippability accuracy     | Continuous model training, user feedback loop                 |
| Seller communication failures | Human-in-the-loop approval, fallback to manual                |
| Competition                   | Focus on UX and multi-marketplace advantage                   |
| AI API costs                  | Caching layer, batch processing, algorithmic fallbacks        |
| GCP migration risk            | Incremental migration, Option C (Next.js on Cloud Run)        |

---

## Branding

- **Mascot:** Flipper the Penguin
- **Colors:** Arctic Blue (#0EA5E9), Ice White, Deep Ocean (#0C4A6E)
- **Tone:** Friendly, smart, trustworthy
- **Domain:** flipper.ai (if available) or getflipper.ai

---

## Existing Test Baseline (as of Feb 27, 2026)

Understanding the current test coverage is critical for planning the acceptance test suite.

### Test Inventory

| Level | Tool | Count | Location |
|-------|------|-------|----------|
| Unit | Jest | ~124 | `src/__tests__/` |
| Component | Jest + Testing Library | ~14 | `src/__tests__/` |
| Integration | Jest + Prisma | ~8 | `src/__tests__/` |
| Security | Jest | 3 | `src/__tests__/` |
| E2E | Playwright | ~67 specs | `e2e/` |
| Acceptance | Playwright | 8 suites | `e2e/acceptance/` |
| BDD | Cucumber/Gherkin | 9 features | `features/` |
| **Total** | | **~199** | |

### Existing BDD Features (Cucumber)

1. `01-marketplace-scanning.feature` — Multi-marketplace search
2. `02-ai-analysis.feature` — AI-powered profit analysis
3. `03-seller-communication.feature` — Messaging and negotiation
4. `04-resale-listing.feature` — Cross-platform listing creation
5. `05-dashboard-tracking.feature` — Analytics and KPIs
6. `06-user-auth-billing.feature` — Authentication and payments
7. `07-notifications-monitoring.feature` — Real-time alerts
8. `08-complete-flip-journey.feature` — Full end-to-end workflow
9. `09-real-time-notifications.feature` — SSE/WebSocket notifications

### User Journeys Covered

All 5 primary user journeys have E2E test coverage:
1. Sign Up & Onboarding
2. Marketplace Scanning
3. Listing Management
4. Communication & Negotiation
5. Inventory & Sales

### Security Posture (from Security Audit Feb 17, 2026)

- 0 critical vulnerabilities
- 0 high vulnerabilities in production dependencies
- 2 high vulnerabilities in test/dev dependencies (Stagehand transitive)
- Production security checklist: 11/11 controls passed (CSP, HSTS, CORS, rate limiting, input validation, auth hardening, API key validation, session security, env validation, CSRF, Next.js patched)

### CI/CD Pipelines (5 GitHub Actions)

1. `ci.yml` — Lint + unit tests + integration tests on every push/PR
2. `playwright-tests.yml` — Full E2E suite across Chromium/Firefox/WebKit
3. `vercel-deploy.yml` — Auto-deploy to Vercel
4. `deploy-firebase.yml` — Firebase Hosting backup deployment
5. `health-check.yml` — Periodic production health checks

---

## Data Model Summary (13 Prisma Models)

### Core Business
- **Listing** — Scraped items with algorithmic + LLM analysis fields (identifiedBrand, verifiedMarketValue, sellabilityScore, etc.)
- **Opportunity** — Active flips with status workflow: IDENTIFIED → CONTACTED → PURCHASED → LISTED → SOLD
- **ScraperJob** — Scraping run tracking: PENDING → RUNNING → COMPLETED/FAILED
- **SearchConfig** — Saved search configurations (name, platform, location, keywords, price range)
- **PriceHistory** — Market value reference data from sold listings

### User & Auth
- **User** — Core user with subscriptionTier (FREE/FLIPPER/PRO) and onboarding state
- **Account** — OAuth provider accounts (NextAuth adapter)
- **Session** — Active sessions (NextAuth)
- **VerificationToken** — Email verification (NextAuth)
- **UserSettings** — Preferences, encrypted OpenAI API key, discount threshold, notification prefs
- **FacebookToken** — Stored Facebook OAuth tokens for marketplace access

### Features
- **Message** — In-app messaging: direction (INBOUND/OUTBOUND), status workflow (DRAFT → PENDING_APPROVAL → SENT → DELIVERED), thread support via parentId
- **AiAnalysisCache** — LLM result cache with 24-hour TTL
- **PostingQueueItem** — Cross-platform posting queue: status (PENDING → IN_PROGRESS → POSTED/FAILED), retry logic

---

_Document originally created by ASPEN | February 3, 2026_
_Updated to v3.0 by BMAD workflow | February 27, 2026_
_Enriched with listing decision logic, test baseline, data models, and security posture | February 27, 2026_
