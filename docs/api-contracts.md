# API Contracts - Flipper.ai

> Generated: 2026-02-27 | Scan Level: Deep | Project Type: Web (Next.js App Router)

## Overview

Flipper.ai exposes ~80+ API endpoints via Next.js App Router conventions. All routes live under `app/api/` and export HTTP method handlers (GET, POST, PATCH, DELETE). Responses follow a consistent `{ success, data/message }` shape.

**Authentication Types:**
- Session-based (NextAuth) — most endpoints
- Firebase Bearer Token — listings, opportunities
- Public — health, docs, unsubscribe
- Stripe webhook signature — billing webhooks

---

## Health & Monitoring

### `GET /api/health`
Lightweight liveness probe. Returns `{ status: 'ok', timestamp, uptime, version, environment }`.

### `GET /api/health/ready`
Readiness probe — checks database connectivity with latency measurement.

### `GET /api/health/metrics`
Application metrics (protected in production). Returns heap/RSS memory, error counts.

### `GET /api/diagnostics`
Debug deployment issues — checks env vars, Prisma client, database, bcrypt.

---

## Listings Management

### `GET /api/listings`
Get user's listings with optional `platform` and `min_score` filters. Returns `{ success, count, listings }`.

### `POST /api/listings`
Create new listing. Required: `platform, url, title, askingPrice`.

### `GET|PATCH|DELETE /api/listings/[id]`
Single listing CRUD. Verifies ownership before operations.

### `POST /api/listings/[id]/description`
Generate AI-powered resale description. Body: `{ platform, tone, includeSpecs }`. Uses gpt-4o-mini with algorithmic fallback. Supports eBay, Mercari, Facebook, OfferUp, Craigslist.

### `POST /api/listings/[id]/market-value`
Update listing with verified market value from eBay sold data.

### `GET|POST /api/listings/track`
Track active listings for price changes (placeholder — needs real page fetcher).

### `POST /api/listings/ebay`
Create draft eBay listing via Inventory API. Required: sku, title, description, categoryId, condition, price, imageUrls.

---

## Opportunities

### `GET /api/opportunities`
Get user's high-value opportunities. Params: `limit` (default: 25).

### `GET|PATCH|DELETE /api/opportunities/[id]`
Manage single opportunity. PATCH auto-calculates `actualProfit` from prices/fees. DELETE resets listing to 'NEW' status.

---

## Scrapers

### `GET|POST /api/scraper/craigslist`
Scrape Craigslist listings via Playwright. Body: `{ location, category, keywords, minPrice, maxPrice }`. Runs algorithmic estimation (always) + optional LLM pipeline (if OPENAI_API_KEY set). Saves items 50%+ undervalued (LLM) or score >= 70 (algo).

### `GET|POST /api/scraper/ebay`
Scrape eBay via Browse API. Requires EBAY_OAUTH_TOKEN. Body: `{ keywords, categoryId, condition, minPrice, maxPrice, limit }`. Fetches active + sold listings.

### `GET|POST /api/scraper/facebook`
Scrape Facebook Marketplace via Graph API. Requires user OAuth token. Body: `{ keywords, categoryId, location, minPrice, maxPrice, limit }`.

### `GET|POST /api/scraper/mercari`
Scrape Mercari via internal API + web scraping fallback. Body: `{ keywords, categoryId, condition, minPrice, maxPrice, limit, sortBy }`. Handles rate limiting (429).

### `GET|POST /api/scraper/offerup`
Scrape OfferUp via Playwright with anti-detection. Body: `{ location, category, keywords, minPrice, maxPrice }`. Includes CAPTCHA detection and 2-second rate limiting.

### `GET|POST /api/scrape/facebook`
Alternative Facebook scraper using centralized processing with viability criteria.

---

## Messages

### `GET|POST /api/messages`
GET: Query messages with filters (direction, status, listingId, search, pagination). POST: Create message with auto-status assignment.

### `GET|PATCH|DELETE /api/messages/[id]`
Manage single message. PATCH actions: approve, edit, reject. Only modifiable in DRAFT/PENDING states.

---

## Posting Queue

### `GET|POST /api/posting-queue`
Multi-platform cross-posting queue. POST supports single platform or batch (multiple platforms). Prevents posting to source platform.

### `GET|PATCH|DELETE /api/posting-queue/[id]`
Manage queue items. DELETE prevented if IN_PROGRESS.

### `POST /api/posting-queue/[id]/retry`
Retry failed postings. Respects maxRetries limit.

### `GET /api/posting-queue/stats`
Queue statistics.

---

## Descriptions

### `POST /api/descriptions`
Generate resale listing descriptions. Body: `{ brand, model, variant, condition, category, askingPrice, platform, useLLM }`. Supports single platform or "all". Uses gpt-4o-mini with algorithmic fallback.

---

## Analysis & Value

### `GET /api/analyze/[listingId]`
STUB (501) — needs Firebase migration.

### `GET|POST /api/price-history`
Fetch market price history. GET: query by productName, category. POST: fetch + store new history.

### `GET /api/inventory/roi`
Calculate ROI for purchased items (PURCHASED, LISTED, SOLD statuses).

### `GET /api/analytics/profit-loss`
Profit/loss analytics. Params: `granularity=weekly|monthly`.

---

## User Settings & Auth

### `GET|PATCH /api/user/settings`
User preferences: LLM model, discount threshold, notification settings. API key encrypted/masked.

### `POST /api/user/settings/validate-key`
Validate OpenAI API key via models.list() endpoint.

### `GET|POST /api/user/onboarding`
Track 6-step onboarding progress.

### `GET|POST /api/user/unsubscribe`
One-click email unsubscribe (no auth required). GET returns HTML, POST returns JSON.

---

## Authentication

### `POST /api/auth/register`
Create account. Body: `{ email, password, name }`. Hashes with bcryptjs (12 rounds). Auto-creates UserSettings.

### `POST /api/auth/captcha-required`
Check if CAPTCHA required for login.

### `GET|POST /api/auth/[...nextauth]`
NextAuth.js credential handling.

### Facebook OAuth
- `POST /api/auth/facebook/authorize` — Initiate OAuth flow
- `GET /api/auth/facebook/callback` — Handle callback
- `POST /api/auth/facebook/disconnect` — Revoke token
- `GET /api/auth/facebook/status` — Check auth status

---

## Billing & Stripe

### `POST /api/checkout`
Create Stripe checkout session. Body: `{ tier: 'FLIPPER'|'PRO' }`.

### `POST /api/checkout/portal`
Create Stripe billing portal session for subscription management.

### `POST /api/webhooks/stripe`
Handle Stripe webhook events: checkout.session.completed, subscription.updated, subscription.deleted.

---

## Streaming & Real-Time

### `GET /api/events`
Server-Sent Events (SSE) endpoint. Authenticated. Events: listing.found, job.complete, opportunity.created, alert.high-value. 30-second heartbeat.

---

## Search Configurations

### `GET|POST /api/search-configs`
CRUD for saved search configs. Platforms: CRAIGSLIST, FACEBOOK_MARKETPLACE, EBAY, OFFERUP.

### `GET|PATCH|DELETE /api/search-configs/[id]`
Single config management.

---

## Scraper Jobs

### `GET|POST /api/scraper-jobs`
Job tracking. Statuses: PENDING, RUNNING, COMPLETED, FAILED.

### `GET|PATCH|DELETE /api/scraper-jobs/[id]`
Single job management with status validation.

---

## Utility

### `GET /api/docs`
Serve OpenAPI 3.0 specification. Cached 1 hour.

### `GET|POST /api/reports/generate`
Generate reports (weekly/monthly/custom). Supports JSON and CSV output.

### `GET /api/images/proxy`
Proxy and cache external images. Max 5MB. Includes cache headers.
