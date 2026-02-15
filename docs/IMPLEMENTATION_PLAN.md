# Flipper AI - Agile Implementation Plan

**Version:** 1.0  
**Created:** February 3, 2026  
**Author:** ASPEN (AI Development Agent)  
**Sprint Duration:** 1 week

---

## 📊 Current State Analysis

### ✅ Already Implemented

- Database schema (Prisma/SQLite) with Listing, Opportunity, User models
- eBay API scraper with Browse API integration
- Craigslist scraper (location/category-based)
- Facebook Marketplace scraper (partial)
- Algorithmic value estimation engine
- Dashboard with listings, filters, bulk actions
- Opportunities tracking page
- Settings page with API key management
- User authentication (NextAuth.js)
- Search configurations API
- Integration & unit tests

### ❌ Gaps vs PRD

- No OfferUp/Mercari scrapers
- No real-time WebSocket updates
- No AI seller communication
- No resale listing generator
- No cross-platform posting
- No listing monitoring (SOLD detection)
- No Stripe payment integration
- No landing page or onboarding
- No notification system

---

## 🏗️ Epic Overview

| Epic | Name                       | Priority    | Complexity | Stories |
| ---- | -------------------------- | ----------- | ---------- | ------- |
| E1   | Multi-Marketplace Scanner  | 🔴 Critical | Medium     | 8       |
| E2   | AI Flippability Engine     | 🔴 Critical | High       | 7       |
| E3   | Seller Communication       | 🟡 High     | Medium     | 6       |
| E4   | Resale Listing Generator   | 🟡 High     | Medium     | 5       |
| E5   | Dashboard & Tracking       | 🟢 Medium   | Low        | 6       |
| E6   | User Management & Billing  | 🟡 High     | Medium     | 8       |
| E7   | Notifications & Monitoring | 🟢 Medium   | Medium     | 5       |

**Total Stories: 45**

---

## 📋 Epic 1: Multi-Marketplace Scanner

> Enable scanning of all major marketplaces for flip opportunities

### Feature 1.1: eBay Integration (✅ Complete)

Already implemented with Browse API.

### Feature 1.2: Craigslist Integration (✅ Complete)

Already implemented with location-based scraping.

### Feature 1.3: Facebook Marketplace Integration (🔄 Partial)

- **[E1-F3] Story 1.3.1:** Complete Facebook Marketplace scraper authentication
  - Acceptance: Can authenticate with Facebook Graph API
  - Points: 3
- **[E1-F3] Story 1.3.2:** Implement Facebook listing search with filters
  - Acceptance: Search by location, category, price range
  - Points: 3

### Feature 1.4: OfferUp Integration

- **[E1-F4] Story 1.4.1:** Set up OfferUp API/scraping infrastructure
  - Acceptance: Can fetch listings from OfferUp
  - Points: 5
- **[E1-F4] Story 1.4.2:** Parse and normalize OfferUp listing data
  - Acceptance: Listings saved to database with all fields
  - Points: 3
- **[E1-F4] Story 1.4.3:** Add OfferUp to scraper job system
  - Acceptance: OfferUp jobs tracked in ScraperJob model
  - Points: 2

### Feature 1.5: Mercari Integration

- **[E1-F5] Story 1.5.1:** Set up Mercari API client
  - Acceptance: Can authenticate and fetch from Mercari
  - Points: 5
- **[E1-F5] Story 1.5.2:** Implement Mercari search with filters
  - Acceptance: Search by keywords, category, condition
  - Points: 3
- **[E1-F5] Story 1.5.3:** Normalize Mercari data to Listing model
  - Acceptance: Full parity with other platforms
  - Points: 2

---

## 📋 Epic 2: AI Flippability Engine

> AI-powered analysis of listings to calculate flip potential

### Feature 2.1: Price Analysis

- **[E2-F1] Story 2.1.1:** Fetch eBay sold listings for price comparison
  - Acceptance: Get last 10 sold prices for similar items
  - Points: 5
- **[E2-F1] Story 2.1.2:** Calculate verified market value from sold data
  - Acceptance: Store verifiedMarketValue, marketDataSource fields
  - Points: 3
- **[E2-F1] Story 2.1.3:** Build price history aggregation service
  - Acceptance: Track average prices over time by category
  - Points: 5

### Feature 2.2: AI Item Identification

- **[E2-F2] Story 2.2.1:** Integrate Claude API for listing analysis
  - Acceptance: Can send listing to Claude, get structured response
  - Points: 5
- **[E2-F2] Story 2.2.2:** Extract brand/model/variant from listings
  - Acceptance: Populate identifiedBrand, identifiedModel, identifiedVariant
  - Points: 3
- **[E2-F2] Story 2.2.3:** Assess condition from description/images
  - Acceptance: AI-determined condition assessment stored
  - Points: 3

### Feature 2.3: Flippability Score Calculator

- **[E2-F3] Story 2.3.1:** Implement weighted scoring algorithm
  - Acceptance: Score calculated using PRD formula (price 30%, sales prob 25%, etc.)
  - Points: 5

---

## 📋 Epic 3: Seller Communication

> Automated message drafting and conversation management

### Feature 3.1: Message Drafting

- **[E3-F1] Story 3.1.1:** Create AI message template generator
  - Acceptance: Generate personalized purchase messages
  - Points: 3
- **[E3-F1] Story 3.1.2:** Support multiple message types (inquiry, offer, followup)
  - Acceptance: Different templates for different scenarios
  - Points: 3
- **[E3-F1] Story 3.1.3:** Add negotiation strategy suggestions
  - Acceptance: AI recommends offer amount based on listing analysis
  - Points: 3

### Feature 3.2: Conversation UI

- **[E3-F2] Story 3.2.1:** Build message inbox/outbox component
  - Acceptance: View all conversations in one place
  - Points: 5
- **[E3-F2] Story 3.2.2:** Implement message approval workflow
  - Acceptance: User must approve before messages are sent
  - Points: 3
- **[E3-F2] Story 3.2.3:** Add conversation status tracking
  - Acceptance: Track status (pending, responded, purchased, etc.)
  - Points: 2

---

## 📋 Epic 4: Resale Listing Generator

> Automatically create optimized resale listings

### Feature 4.1: Listing Content Generation

- **[E4-F1] Story 4.1.1:** Generate optimized titles from item data
  - Acceptance: SEO-friendly titles with keywords
  - Points: 3
- **[E4-F1] Story 4.1.2:** Create detailed descriptions with AI
  - Acceptance: Compelling descriptions highlighting value
  - Points: 3
- **[E4-F1] Story 4.1.3:** Calculate optimal pricing from market data
  - Acceptance: Suggest listing price for target profit margin
  - Points: 3

### Feature 4.2: Cross-Platform Posting

- **[E4-F2] Story 4.2.1:** Build eBay listing creation API integration
  - Acceptance: Can create draft listing on eBay
  - Points: 8
- **[E4-F2] Story 4.2.2:** Add multi-platform posting queue
  - Acceptance: Queue listings for multiple marketplaces
  - Points: 5

---

## 📋 Epic 5: Dashboard & Tracking

> Enhanced UI for managing flipping workflow

### Feature 5.1: Flippables Queue

- **[E5-F1] Story 5.1.1:** Create kanban-style opportunity board
  - Acceptance: Drag-drop cards between stages
  - Points: 5
- **[E5-F1] Story 5.1.2:** Add filtering by platform, score, profit
  - Acceptance: Advanced filters work across all views
  - Points: 3

### Feature 5.2: Inventory Management

- **[E5-F2] Story 5.2.1:** Track purchased items awaiting resale
  - Acceptance: Inventory view with purchase details
  - Points: 3
- **[E5-F2] Story 5.2.2:** Calculate holding costs and ROI
  - Acceptance: Show days held, estimated carrying cost
  - Points: 3

### Feature 5.3: Sales History & Analytics

- **[E5-F3] Story 5.3.1:** Build profit/loss dashboard
  - Acceptance: Show total profit, margins, trends
  - Points: 5
- **[E5-F3] Story 5.3.2:** Generate performance reports
  - Acceptance: Export weekly/monthly summaries
  - Points: 3

---

## 📋 Epic 6: User Management & Billing

> User accounts, subscription tiers, and payments

### Feature 6.1: User Settings

- **[E6-F1] Story 6.1.1:** Expand user profile with preferences
  - Acceptance: Save location, categories, notification prefs
  - Points: 2
- **[E6-F1] Story 6.1.2:** Add API key management for marketplace APIs
  - Acceptance: Securely store user's own eBay/Facebook tokens
  - Points: 3

### Feature 6.2: Subscription Tiers

- **[E6-F2] Story 6.2.1:** Define Free/Flipper/Pro tier limits
  - Acceptance: Rate limits enforced per tier
  - Points: 3
- **[E6-F2] Story 6.2.2:** Implement tier-based feature gating
  - Acceptance: Features locked based on subscription level
  - Points: 5

### Feature 6.3: Stripe Integration

- **[E6-F3] Story 6.3.1:** Set up Stripe Customer Portal
  - Acceptance: Users can manage billing
  - Points: 5
- **[E6-F3] Story 6.3.2:** Implement checkout flow for subscriptions
  - Acceptance: Users can subscribe to paid plans
  - Points: 5
- **[E6-F3] Story 6.3.3:** Handle webhooks for subscription events
  - Acceptance: Account upgraded/downgraded on payment events
  - Points: 5
- **[E6-F3] Story 6.3.4:** Add usage metering for API calls
  - Acceptance: Track scans/analyses per user per month
  - Points: 3

---

## 📋 Epic 7: Notifications & Monitoring

> Real-time alerts and listing health monitoring

### Feature 7.1: Listing Monitoring

- **[E7-F1] Story 7.1.1:** Detect when tracked listings sell (SOLD status)
  - Acceptance: Alert user when listing no longer available
  - Points: 5
- **[E7-F1] Story 7.1.2:** Track price changes on watched listings
  - Acceptance: Notify on price drops
  - Points: 3
- **[E7-F1] Story 7.1.3:** Warn before listings expire
  - Acceptance: 24h warning for expiring deals
  - Points: 2

### Feature 7.2: Notification System

- **[E7-F2] Story 7.2.1:** Build in-app notification center
  - Acceptance: Bell icon with unread count
  - Points: 3
- **[E7-F2] Story 7.2.2:** Add email notification preferences
  - Acceptance: Users can opt-in to email alerts
  - Points: 3

---

## 🗓️ Sprint Plan

### Sprint 1 (Week 1) - Core Scanner & AI Foundation

**Goal:** Complete marketplace coverage and AI integration

| Story                                       | Points | Priority |
| ------------------------------------------- | ------ | -------- |
| [E1-F3] Story 1.3.1: Facebook auth          | 3      | 🔴       |
| [E1-F3] Story 1.3.2: Facebook search        | 3      | 🔴       |
| [E2-F2] Story 2.2.1: Claude API integration | 5      | 🔴       |
| [E2-F1] Story 2.1.1: eBay sold listings     | 5      | 🔴       |
| [E2-F1] Story 2.1.2: Verified market value  | 3      | 🔴       |
| **Total**                                   | **19** |          |

### Sprint 2 (Week 2) - AI Analysis & Communication

**Goal:** Full AI analysis pipeline and message drafting

| Story                                        | Points | Priority |
| -------------------------------------------- | ------ | -------- |
| [E2-F2] Story 2.2.2: Brand/model extraction  | 3      | 🔴       |
| [E2-F2] Story 2.2.3: Condition assessment    | 3      | 🔴       |
| [E2-F3] Story 2.3.1: Weighted scoring        | 5      | 🔴       |
| [E3-F1] Story 3.1.1: AI message templates    | 3      | 🟡       |
| [E3-F1] Story 3.1.2: Multiple message types  | 3      | 🟡       |
| [E3-F1] Story 3.1.3: Negotiation suggestions | 3      | 🟡       |
| **Total**                                    | **20** |          |

### Sprint 3 (Week 3) - Communication UI & Payments

**Goal:** Conversation management and Stripe integration

| Story                                      | Points | Priority |
| ------------------------------------------ | ------ | -------- |
| [E3-F2] Story 3.2.1: Message inbox         | 5      | 🟡       |
| [E3-F2] Story 3.2.2: Approval workflow     | 3      | 🟡       |
| [E3-F2] Story 3.2.3: Conversation tracking | 2      | 🟡       |
| [E6-F3] Story 6.3.1: Stripe Portal         | 5      | 🟡       |
| [E6-F3] Story 6.3.2: Checkout flow         | 5      | 🟡       |
| **Total**                                  | **20** |          |

### Sprint 4 (Week 4) - Resale & Polish

**Goal:** Listing generator, monitoring, launch prep

| Story                                       | Points | Priority |
| ------------------------------------------- | ------ | -------- |
| [E4-F1] Story 4.1.1: Title generation       | 3      | 🟡       |
| [E4-F1] Story 4.1.2: Description generation | 3      | 🟡       |
| [E4-F1] Story 4.1.3: Optimal pricing        | 3      | 🟡       |
| [E7-F1] Story 7.1.1: SOLD detection         | 5      | 🟢       |
| [E7-F2] Story 7.2.1: Notification center    | 3      | 🟢       |
| [E6-F3] Story 6.3.3: Stripe webhooks        | 5      | 🟡       |
| **Total**                                   | **22** |          |

---

## 📦 Backlog (Future Sprints)

### Post-MVP Features

- [E1-F4] OfferUp integration (full)
- [E1-F5] Mercari integration (full)
- [E4-F2] Cross-platform posting
- [E5-F1] Kanban opportunity board
- [E5-F2] Inventory management
- [E5-F3] Analytics dashboard
- [E6-F2] Feature gating by tier
- [E7-F1] Price change monitoring
- [E7-F2] Email notifications

### Nice-to-Have

- Mobile app (React Native)
- Browser extension for quick saves
- Bulk import from CSV
- API access for power users
- Team collaboration features

---

## 🎯 Success Criteria

### MVP Launch Checklist

- [ ] eBay + Craigslist + Facebook scrapers working
- [ ] AI-powered flippability scoring
- [ ] Message drafting with approval
- [ ] Basic resale listing generation
- [ ] Stripe subscription checkout
- [ ] Dashboard with opportunities

### Quality Gates

- [ ] 80%+ unit test coverage
- [ ] E2E tests for critical flows
- [ ] Performance: <2s page loads
- [ ] Mobile-responsive UI
- [ ] Security audit passed

---

_Document generated by ASPEN | February 3, 2026_
