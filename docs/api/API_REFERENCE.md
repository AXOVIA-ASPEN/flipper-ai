# 🐧 Flipper AI — API Reference

**Author:** Stephen Boyett  
**Company:** Axovia AI  
**Version:** 1.0.0  
**Last Updated:** February 15, 2026

---

## Overview

Flipper AI exposes a RESTful API built on Next.js App Router. All endpoints (except `/api/health` and `/api/auth`) require authentication via NextAuth.js session cookies.

**Base URL:** `https://your-domain.com/api`

---

## Authentication

All protected endpoints use session-based auth (NextAuth.js). Include session cookies with requests.

### `POST /api/auth/register`
Create a new user account.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ | User email |
| `password` | string | ✅ | Password (min 8 chars) |
| `name` | string | ❌ | Display name |

### `GET/POST /api/auth/[...nextauth]`
NextAuth.js catch-all route. Handles sign-in, sign-out, session, and OAuth callbacks.

### Facebook OAuth
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/facebook/authorize` | GET | Initiate Facebook OAuth flow |
| `/api/auth/facebook/callback` | GET | Handle OAuth callback |
| `/api/auth/facebook/status` | GET | Check Facebook connection status |
| `/api/auth/facebook/disconnect` | POST | Disconnect Facebook account |

---

## Health

### `GET /api/health`
No auth required. Returns server status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-15T14:00:00.000Z",
  "uptime": 86400
}
```

---

## Listings

### `GET /api/listings`
List scraped marketplace listings with filters.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `platform` | string | Filter by marketplace (ebay, craigslist, facebook, offerup, mercari) |
| `status` | string | Listing status filter |
| `minScore` | number | Minimum value score |
| `location` | string | Location search (contains) |
| `category` | string | Item category |
| `minPrice` | number | Minimum asking price |
| `maxPrice` | number | Maximum asking price |
| `dateFrom` | string | Scraped after (ISO date) |
| `dateTo` | string | Scraped before (ISO date) |
| `limit` | number | Results per page (default: 20) |
| `offset` | number | Pagination offset |

**Response:**
```json
{
  "listings": [...],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

### `POST /api/listings`
Create a listing manually.

**Body:** Title, platform, asking price, description, image URLs, location.

### `GET /api/listings/[id]`
Get a single listing by ID.

### `PATCH /api/listings/[id]`
Update a listing.

### `DELETE /api/listings/[id]`
Delete a listing.

### `GET /api/listings/[id]/market-value`
Get market value analysis for a listing (eBay comps, estimated value).

### `GET /api/listings/ebay`
Search eBay listings directly.

---

## Opportunities

### `GET /api/opportunities`
List flip opportunities with stats.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status (NEW, WATCHING, PURCHASED, LISTED, SOLD, PASSED) |
| `limit` | number | Results per page |
| `offset` | number | Pagination offset |

**Response:**
```json
{
  "opportunities": [...],
  "total": 45,
  "limit": 20,
  "offset": 0,
  "stats": {
    "_sum": { "actualProfit": 1250.00, "purchasePrice": 3000.00, "resalePrice": 4250.00 },
    "_count": 45
  }
}
```

### `POST /api/opportunities`
Create a new flip opportunity from a listing.

### `GET /api/opportunities/[id]`
Get opportunity details with linked listing.

### `PATCH /api/opportunities/[id]`
Update opportunity status, prices, notes.

### `DELETE /api/opportunities/[id]`
Delete an opportunity.

---

## AI Analysis

### `POST /api/analyze/[listingId]`
Run AI analysis on a listing. Uses Claude/GPT to identify brand, model, condition, estimate resale value, and generate flip recommendations.

**Response:**
```json
{
  "analysis": {
    "brand": "Sony",
    "model": "WH-1000XM5",
    "condition": "Like New",
    "estimatedValue": { "low": 180, "mid": 220, "high": 260 },
    "recommendation": "BUY",
    "confidence": 0.92,
    "reasoning": "..."
  }
}
```

---

## Messages

### `GET /api/messages`
List seller/buyer messages.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `direction` | string | INBOUND or OUTBOUND |
| `status` | string | Message status |
| `listingId` | string | Filter by listing |
| `search` | string | Search body/subject/seller |
| `sortBy` | string | Sort field (createdAt, status, direction, sellerName) |
| `sortOrder` | string | asc or desc |
| `limit` | number | Max 100 |
| `offset` | number | Pagination offset |

### `POST /api/messages`
Send a message to a seller.

---

## Scraper Jobs

### `GET /api/scraper-jobs`
List scraper jobs.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Job status |
| `platform` | string | Marketplace platform |
| `limit` | number | Results per page |

### `POST /api/scraper-jobs`
Create a new scraper job.

### `GET /api/scraper-jobs/[id]`
Get job details and results.

### `DELETE /api/scraper-jobs/[id]`
Cancel/delete a scraper job.

---

## Scrapers (Direct)

Run marketplace scrapers directly. All require auth.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scraper/ebay` | POST | Scrape eBay listings |
| `/api/scraper/craigslist` | POST | Scrape Craigslist listings |
| `/api/scraper/facebook` | POST | Scrape Facebook Marketplace |
| `/api/scraper/offerup` | POST | Scrape OfferUp listings |
| `/api/scraper/mercari` | POST | Scrape Mercari listings |
| `/api/scrape/facebook` | POST | Legacy Facebook scrape endpoint |

**Common Body:**
```json
{
  "query": "nintendo switch",
  "location": "San Francisco",
  "maxResults": 20,
  "minPrice": 50,
  "maxPrice": 300
}
```

---

## Search Configs

### `GET /api/search-configs`
List saved search configurations.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `enabled` | string | "true" to filter active only |

### `POST /api/search-configs`
Create a new search configuration (auto-run searches).

### `GET /api/search-configs/[id]`
Get config details.

### `PATCH /api/search-configs/[id]`
Update a search config.

### `DELETE /api/search-configs/[id]`
Delete a search config.

---

## User Settings

### `GET /api/user/settings`
Get current user's settings (LLM model, thresholds, API keys masked).

### `PATCH /api/user/settings`
Update settings.

**Body:**
```json
{
  "llmModel": "gpt-4o-mini",
  "discountThreshold": 50,
  "autoAnalyze": true,
  "openaiApiKey": "sk-..."
}
```

### `POST /api/user/settings/validate-key`
Validate an OpenAI API key before saving.

---

## Images

### `GET /api/images/proxy`
Proxy external listing images to avoid CORS/hotlinking issues.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `url` | string | Image URL to proxy |

---

## Price History

### `GET /api/price-history`
Get price history data for market trend analysis.

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "error": "Error description",
  "details": { ... }
}
```

| Status | Meaning |
|--------|---------|
| 400 | Invalid request / validation error |
| 401 | Not authenticated |
| 403 | Forbidden |
| 404 | Resource not found |
| 429 | Rate limited |
| 500 | Internal server error |

---

## Rate Limiting

API endpoints are rate-limited per user session. Exceeding limits returns `429 Too Many Requests`.

---

## Notes

- All timestamps are ISO 8601 UTC
- Monetary values are in USD (decimal)
- Pagination uses `limit`/`offset` pattern
- IDs are UUIDs (Prisma)
