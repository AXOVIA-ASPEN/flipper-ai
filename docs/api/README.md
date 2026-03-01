# Flipper AI - API Documentation

**Generated:** 2026-03-01T19:18:00.104Z  
**Total Endpoints:** 53

---

## Table of Contents

- [Analytics](#analytics)
- [Analyze](#analyze)
- [Auth](#auth)
- [Checkout](#checkout)
- [Descriptions](#descriptions)
- [Diagnostics](#diagnostics)
- [Docs](#docs)
- [Events](#events)
- [Health](#health)
- [Images](#images)
- [Inventory](#inventory)
- [Listings](#listings)
- [Messages](#messages)
- [Opportunities](#opportunities)
- [Posting-queue](#posting-queue)
- [Price-history](#price-history)
- [Reports](#reports)
- [Scrape](#scrape)
- [Scraper](#scraper)
- [Scraper-jobs](#scraper-jobs)
- [Search-configs](#search-configs)
- [User](#user)
- [Webhooks](#webhooks)

---

## Analytics

### `GET` /api/analytics/profit-loss

**Description:** GET /api/analytics/profit-loss

**Query Parameters:**
- `granularity` (optional)

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## Analyze

### `GET, POST` /api/analyze/:listingId

**Description:** API Route: POST /api/analyze/[listingId]

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## Auth

### `POST` /api/auth/captcha-required

**Description:** API route to check if CAPTCHA is required for login

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `GET` /api/auth/facebook/authorize

**Description:** Facebook OAuth Authorization Endpoint

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `GET` /api/auth/facebook/callback

**Description:** Facebook OAuth Callback Endpoint

**Query Parameters:**
- `code` (optional)
- `state` (optional)
- `error` (optional)

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `POST` /api/auth/facebook/disconnect

**Description:** Facebook OAuth Disconnect Endpoint

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `GET` /api/auth/facebook/status

**Description:** Facebook OAuth Status Endpoint

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `POST` /api/auth/facebook/token

**Description:** POST /api/auth/facebook/token

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `POST` /api/auth/register

**Description:** User Registration API Route

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `POST` /api/auth/session

**Description:** POST /api/auth/session

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `POST` /api/auth/signout

**Description:** POST /api/auth/signout

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## Checkout

### `POST` /api/checkout

**Description:** POST /api/checkout — Create a Stripe Checkout session for subscription upgrade.

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `POST` /api/checkout/portal

**Description:** POST /api/checkout/portal — Create a Stripe Customer Portal session.

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## Descriptions

### `POST` /api/descriptions

**Description:** POST /api/descriptions

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## Diagnostics

### `GET` /api/diagnostics

**Description:** Diagnostics API Route

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## Docs

### `GET` /api/docs

**Description:** GET /api/docs - Serve OpenAPI 3.0 specification

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## Events

### `GET` /api/events

**Description:** GET /api/events — Server-Sent Events endpoint

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## Health

### `GET` /api/health

**Description:** Health check endpoint - lightweight liveness probe

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `GET` /api/health/metrics

**Description:** Metrics endpoint - exposes application metrics

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `GET` /api/health/ready

**Description:** Readiness probe - checks that all dependencies are available

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## Images

### `GET` /api/images/proxy

**Description:** Image Proxy API

**Query Parameters:**
- `url` (optional)
- `cache` (optional)

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## Inventory

### `GET` /api/inventory/roi

**Description:** GET /api/inventory/roi - Get ROI data for user's purchased items

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## Listings

### `GET, POST` /api/listings

**Description:** Listings API Route

**Authentication:** 🔒 Required

**Query Parameters:**
- `platform` (optional)
- `min_score` (optional)

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `GET, PATCH, DELETE` /api/listings/:id

**Description:** Single Listing API Route

**Authentication:** 🔒 Required

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### PATCH

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### DELETE

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `POST` /api/listings/:id/description

**Description:** No description

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `POST` /api/listings/:id/market-value

**Description:** No description

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `GET, POST` /api/listings/ebay

**Description:** POST /api/listings/ebay

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `GET, POST` /api/listings/track

**Description:** No description

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## Messages

### `GET, POST` /api/messages

**Description:** No description

**Query Parameters:**
- `direction` (optional)
- `status` (optional)
- `listingId` (optional)
- `search` (optional)
- `sortBy` (optional)
- `sortOrder` (optional)
- `limit` (optional)
- `offset` (optional)

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `GET, PATCH, DELETE` /api/messages/:id

**Description:** No description

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### PATCH

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### DELETE

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## Opportunities

### `GET` /api/opportunities

**Description:** Opportunities API Route

**Authentication:** 🔒 Required

**Query Parameters:**
- `limit` (optional)

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `GET, PATCH, DELETE` /api/opportunities/:id

**Description:** No description

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### PATCH

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### DELETE

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## Posting-queue

### `GET, POST` /api/posting-queue

**Description:** No description

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `GET, PATCH, DELETE` /api/posting-queue/:id

**Description:** No description

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### PATCH

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### DELETE

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `POST` /api/posting-queue/:id/retry

**Description:** No description

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `GET` /api/posting-queue/stats

**Description:** No description

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## Price-history

### `GET, POST` /api/price-history

**Description:** No description

**Query Parameters:**
- `productName` (optional)
- `category` (optional)
- `limit` (optional)

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## Reports

### `GET, POST` /api/reports/generate

**Description:** POST /api/reports/generate - Generate performance report

**Query Parameters:**
- `period` (optional)
- `format` (optional)
- `userId` (optional)

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## Scrape

### `GET, POST` /api/scrape/facebook

**Description:** No description

**Authentication:** 🔒 Required

**Query Parameters:**
- `jobId` (optional)
- `limit` (optional)

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## Scraper

### `GET, POST` /api/scraper/craigslist

**Description:** No description

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `GET, POST` /api/scraper/ebay

**Description:** Convert eBay items to normalized listing format for marketplace-scanner

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `GET, POST` /api/scraper/facebook

**Description:** Build the search query parameters for Facebook Graph API

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `GET, POST` /api/scraper/mercari

**Description:** Mercari Scraper API Route

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `GET, POST` /api/scraper/offerup

**Description:** No description

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## Scraper-jobs

### `GET, POST` /api/scraper-jobs

**Description:** No description

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `GET, PATCH, DELETE` /api/scraper-jobs/:id

**Description:** No description

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### PATCH

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### DELETE

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## Search-configs

### `GET, POST` /api/search-configs

**Description:** No description

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `GET, PATCH, DELETE` /api/search-configs/:id

**Description:** No description

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### PATCH

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### DELETE

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## User

### `GET, POST` /api/user/onboarding

**Description:** POST /api/user/onboarding — Save onboarding step progress or mark complete.

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `GET, PATCH` /api/user/settings

**Description:** Get or create the current user with settings

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### PATCH

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `POST` /api/user/settings/validate-key

**Description:** No description

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

### `GET, POST` /api/user/unsubscribe

**Description:** Email Unsubscribe Endpoint

**Query Parameters:**
- `token` (optional)
- `token` (optional)
- `resubscribe` (optional)

#### GET

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## Webhooks

### `POST` /api/webhooks/stripe

**Description:** POST /api/webhooks/stripe — Handle Stripe webhook events.

#### POST

**Request Body:**
```json
{
  // See TypeScript types for schema
}
```

**Response:**
```json
{
  "success": true,
  // Additional fields based on endpoint
}
```

---

## Authentication

Most endpoints require authentication. Include credentials via:

- **Cookie:** Session cookie (automatic in browser)
- **Header:** `Authorization: Bearer <token>` (API access)

**401 Unauthorized:** No valid credentials
**403 Forbidden:** Valid credentials but insufficient permissions

## Error Codes

| Code | Meaning |
|------|----------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error |

