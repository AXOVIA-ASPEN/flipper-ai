# Flipper AI — User Flows Documentation

**Author:** Stephen Boyett  
**Company:** Axovia AI  
**Date:** February 17, 2026  
**Version:** 1.0

---

## Overview

This document outlines all user flows in Flipper AI, including screenshots captured by the E2E test suite. Visual verification is automated via Playwright.

Screenshots are stored in: `playwright-report/user-journey/`

---

## Flow 1: New User Onboarding

**Entry point:** `/register`  
**E2E test:** `e2e/registration.spec.ts`, `e2e/new-user-onboarding.spec.ts`

```
Landing Page (/) 
  → /register (fill name, email, password)
  → Verification email sent
  → /verify-email?token=...
  → /onboarding (optional setup wizard)
  → /dashboard (first-time experience)
```

**Key screenshots:**
- `01-login-page.png` — Login/register entry point
- `mobile-01-login.png` — Mobile-responsive login

**Acceptance criteria:**
- [ ] Form validation shows errors inline
- [ ] Password requirements displayed
- [ ] Email verification required before access
- [ ] Onboarding wizard skippable

---

## Flow 2: Returning User Login

**Entry point:** `/login`  
**E2E test:** `e2e/auth.spec.ts`, `e2e/session-management.spec.ts`

```
/login 
  → (credentials) → /dashboard
  → (forgotten password) → /forgot-password → email → /reset-password
  → (OAuth Google/Facebook) → /api/auth/callback → /dashboard
```

**Key screenshots:**
- `01-login-page.png`

---

## Flow 3: Core Flip Journey — Find → Buy → Sell

This is the primary value flow. Every other feature supports this loop.

```
Dashboard 
  → Configure Search (keywords, location, radius, price range)
  → Run Marketplace Scan (/scraper)
  → View Results (/opportunities)
  → AI Analysis (inline or modal)
  → Mark as Opportunity
  → Contact Seller (/messages → AI-generated message)
  → Negotiate / Accept
  → Mark as Purchased (Kanban: IDENTIFIED → PURCHASED)
  → List for Resale (cross-post to eBay/FBMP/OfferUp)
  → Track Listing (/opportunities → LISTED)
  → Sale Confirmed → Mark Sold (SOLD)
  → Profit recorded → /reports
```

### 3a. Marketplace Scan Sub-flow

```
/scraper
  ├── Select platforms (Craigslist, Facebook, eBay, OfferUp, Mercari)
  ├── Enter search keywords (e.g. "vintage camera", "gaming console")
  ├── Set location + radius
  ├── Set price range (min/max asking price)
  ├── Set minimum profit threshold
  ├── Click "Scan Now"
  ├── Real-time progress (SSE events / polling)
  └── Results appear in /opportunities
```

**Key screenshots:** `04-scraper-config.png`, `journey-02-scraper.png`

### 3b. AI Analysis Sub-flow

```
Listing card (in /opportunities)
  → Click "Analyze" 
  → LLM analysis request (Claude / GPT-4o)
  → Value score (0-100)
  → Estimated resale value ($)
  → Profit potential ($)
  → Recommendation: BUY / PASS / WATCH
  → Risk factors listed
  → Comparable sold listings (eBay links)
  → Suggested offer price
  → "Mark as Opportunity" CTA
```

**Key screenshots:** `05-ai-analysis.png`

### 3c. Seller Communication Sub-flow

```
/messages
  ├── AI generates initial message (platform-appropriate tone)
  ├── Human reviews + edits
  ├── Approve & Send
  ├── Reply tracking (INBOUND messages)
  ├── AI suggests negotiation responses
  └── Thread history per listing
```

**Key screenshots:** `06-seller-communication.png`, `journey-05-messages.png`

---

## Flow 4: Kanban Flip Tracking

**Entry point:** `/kanban`  
**E2E test:** `e2e/kanban-board.spec.ts`, `e2e/kanban-drag-drop.spec.ts`

```
Columns (left to right):
  IDENTIFIED → CONTACTED → PURCHASED → LISTED → SOLD → PASSED
```

**Actions:**
- Drag cards between columns
- Click card → view full details modal
- Update purchase price when moving to PURCHASED
- Add resale URL when moving to LISTED
- Record final sale price when moving to SOLD
- Auto-calculates actual profit (sale - purchase - fees)

**Key screenshots:** `07-kanban-tracking.png`, `journey-04-kanban.png`

---

## Flow 5: Reports & Analytics

**Entry point:** `/reports`  
**E2E test:** `e2e/reports.spec.ts`

```
/reports
  ├── Total profit (all time / this month / this week)
  ├── Total flips completed
  ├── Average profit per flip
  ├── Success rate (sold / attempted)
  ├── Best flip (most profit)
  ├── Profit by category (chart)
  ├── Monthly trend (bar chart)
  ├── Platform performance (which marketplace is best)
  └── Export: CSV / PDF
```

**Key screenshots:** `08-reports-analytics.png`, `journey-06-reports.png`

---

## Flow 6: Search Configuration (Saved Searches)

**Entry point:** `/saved-searches` or Settings  
**E2E test:** `e2e/saved-searches.spec.ts`, `e2e/search-config-crud.spec.ts`

```
/saved-searches
  ├── Create new search config
  │     ├── Name (e.g. "Tampa Vintage Electronics")
  │     ├── Keywords (with AND/OR logic)
  │     ├── Location + radius
  │     ├── Price range
  │     ├── Platforms
  │     ├── Min value score
  │     └── Category filter
  ├── Enable/disable auto-scan schedule
  ├── Edit existing config
  └── Delete config
```

---

## Flow 7: Settings & Profile

**Entry point:** `/settings`  
**E2E test:** `e2e/settings.spec.ts`

```
/settings
  ├── Profile (name, email, avatar)
  ├── Notifications (email, digest frequency)
  ├── AI Preferences (model, discount threshold)
  ├── API Keys (marketplace credentials)
  ├── Billing & Subscription (/billing)
  └── Account (password change, delete account)
```

**Key screenshots:** `09-settings.png`

---

## Flow 8: System Health Monitoring

**Entry point:** `/health`  
**E2E test:** `e2e/health-dashboard.spec.ts`

```
/health
  ├── Database connectivity status
  ├── LLM API status (Claude/OpenAI)
  ├── Email service status
  ├── Marketplace scrapers status
  ├── Response time metrics
  └── Auto-refresh every 30s
```

**Key screenshots:** `10-health-dashboard.png`

---

## Flow 9: Mobile Journey

Flipper AI is fully responsive. Key mobile flows:
- Login / registration
- Browse opportunities (card-based layout)
- Quick action: save listing, contact seller
- Kanban (horizontal scroll)

**Key screenshots:**
- `mobile-01-login.png`
- `mobile-02-dashboard.png`
- `mobile-03-opportunities.png`

---

## Complete E2E Journey Map

```
[User Registration]
       ↓
[Email Verification]
       ↓
[Dashboard] ────────────────────────────────────────────────┐
       ↓                                                      │
[Configure Search]                                           │
       ↓                                                      │
[Run Marketplace Scan] (Craigslist/FB/eBay/OfferUp/Mercari) │
       ↓                                                      │
[Browse Results] (/opportunities)                            │
       ↓                                                      │
[AI Analysis] (value score, profit estimate, recommendation) │
       ↓                                                      │
[Mark as Opportunity] → [Kanban: IDENTIFIED]                 │
       ↓                                                      │
[Contact Seller] (/messages → AI draft)                      │
       ↓                                                      │
[Negotiate] → [Accept Price]                                 │
       ↓                                                      │
[Mark Purchased] → [Kanban: PURCHASED]                       │
       ↓                                                      │
[Cross-post Listing] (/posting-queue → eBay, FBMP, OfferUp) │
       ↓                                                      │
[Track Resale] → [Kanban: LISTED]                            │
       ↓                                                      │
[Sale Confirmed] → [Kanban: SOLD]                            │
       ↓                                                      │
[Profit Recorded] ──────────────────────────────────────────┘
       ↓
[View in Reports] (/reports → total profit, trends)
```

---

## E2E Test Coverage Map

| Flow | Test File | Coverage |
|------|-----------|---------|
| New User Onboarding | `new-user-onboarding.spec.ts`, `registration.spec.ts` | ✅ |
| Login / Auth | `auth.spec.ts`, `session-management.spec.ts` | ✅ |
| Dashboard Overview | `dashboard.spec.ts` | ✅ |
| Marketplace Scan | `scraper.spec.ts`, `scraper-jobs-crud.spec.ts` | ✅ |
| AI Analysis | `ai-analysis.spec.ts` | ✅ |
| Opportunities List | `opportunities.spec.ts`, `opportunities-pagination.spec.ts` | ✅ |
| Seller Communication | `seller-communication.spec.ts`, `messages.spec.ts` | ✅ |
| Kanban Tracking | `kanban-board.spec.ts`, `kanban-drag-drop.spec.ts` | ✅ |
| Cross-listing | `ebay-cross-listing.spec.ts`, `posting-queue.spec.ts` | ✅ |
| Reports | `reports.spec.ts`, `inventory-roi.spec.ts` | ✅ |
| Settings | `settings.spec.ts` | ✅ |
| Saved Searches | `saved-searches.spec.ts`, `search-config-crud.spec.ts` | ✅ |
| Mobile Responsive | `mobile-responsive.spec.ts` | ✅ |
| Health Dashboard | `health-dashboard.spec.ts` | ✅ |
| **Visual Journey** | `user-journey-screenshots.spec.ts` | ✅ NEW |

---

## Running the Visual Journey Tests

```bash
# Run full visual journey (captures screenshots)
cd projects/flipper-ai
npx playwright test user-journey-screenshots --project=chromium

# With video recording
BASE_URL=http://localhost:3001 npx playwright test user-journey-screenshots --project=chromium --headed

# View report
npx playwright show-report

# Screenshots location
ls playwright-report/user-journey/
```

---

*Generated by ASPEN — February 17, 2026*
