# Data Models - Flipper.ai

> Generated: 2026-02-27 | Scan Level: Deep | ORM: Prisma ^7.4.0 | DB: PostgreSQL

## Schema Overview

The database schema is defined in `prisma/schema.prisma` with 13 models covering user management, marketplace listings, opportunity tracking, messaging, and cross-platform posting.

---

## Core Business Models

### Listing
The central model representing scraped marketplace items with value analysis.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String? | Owner (nullable for legacy) |
| externalId | String | Platform-specific listing ID |
| platform | String | Source platform (craigslist, ebay, etc.) |
| url | String | Original listing URL |
| title | String | Listing title |
| description | String? | Full description text |
| askingPrice | Float | Seller's asking price |
| condition | String? | Item condition |
| location | String? | Seller location |
| imageUrls | String? | JSON array of image URLs |
| category | String? | Detected category |
| **Algorithmic Analysis** | | |
| estimatedValue | Float? | Estimated resale value |
| estimatedLow/High | Float? | Value range (low/high) |
| profitPotential | Float? | Estimated profit |
| profitLow/High | Float? | Profit range |
| valueScore | Float? | Score 0-100 |
| discountPercent | Float? | Algorithmic discount % |
| resaleDifficulty | String? | VERY_EASY to VERY_HARD |
| **LLM Identification** | | |
| identifiedBrand | String? | AI-detected brand |
| identifiedModel | String? | AI-detected model |
| identifiedVariant | String? | AI-detected variant |
| identifiedCondition | String? | AI-assessed condition |
| **LLM Market Analysis** | | |
| verifiedMarketValue | Float? | eBay-verified market value |
| sellabilityScore | Int? | LLM sellability 0-100 |
| demandLevel | String? | low/medium/high/very_high |
| expectedDaysToSell | Int? | Estimated days to sell |
| recommendedOffer | Float? | Suggested offer price |
| recommendedList | Float? | Suggested listing price |
| trueDiscountPercent | Float? | LLM-verified discount |
| resaleStrategy | String? | Recommended resale approach |
| llmAnalyzed | Boolean | Whether LLM analysis ran |
| status | String | NEW or OPPORTUNITY |

**Indexes:** userId, platform, status, valueScore, scrapedAt, llmAnalyzed, trueDiscountPercent
**Unique:** [platform, externalId, userId]

### Opportunity
Active flip opportunities linked to high-value listings.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| listingId | String (unique) | 1:1 link to Listing |
| purchasePrice | Float? | Actual purchase price |
| purchaseDate | DateTime? | When purchased |
| resalePrice | Float? | Actual resale price |
| resalePlatform | String? | Where sold |
| actualProfit | Float? | Calculated profit |
| fees | Float? | Platform/shipping fees |
| status | String | IDENTIFIED → CONTACTED → PURCHASED → LISTED → SOLD |

**Indexes:** userId, status, createdAt

### ScraperJob
Tracking records for scraping runs.

| Field | Type | Description |
|-------|------|-------------|
| platform | String | Target marketplace |
| status | String | PENDING → RUNNING → COMPLETED / FAILED |
| listingsFound | Int | Total listings scraped |
| opportunitiesFound | Int | High-value items found |
| errorMessage | String? | Error details if failed |

**Indexes:** userId, status, createdAt

### SearchConfig
Saved search configurations for automated scraping.

| Field | Type | Description |
|-------|------|-------------|
| name | String | Config display name |
| platform | String | Target marketplace |
| location | String | Search location |
| keywords | String? | Search keywords |
| minPrice/maxPrice | Float? | Price range filter |
| enabled | Boolean | Active flag |

### PriceHistory
Market value reference data from sold listings.

| Field | Type | Description |
|-------|------|-------------|
| productName | String | Product name for matching |
| platform | String | Data source platform |
| soldPrice | Float | Actual sold price |
| soldAt | DateTime | Sale date |

**Indexes:** productName, category

---

## User & Auth Models

### User
Core user model with subscription tracking.

| Field | Type | Description |
|-------|------|-------------|
| email | String (unique) | Login email |
| password | String? | bcrypt hash (nullable for OAuth) |
| subscriptionTier | String | FREE / FLIPPER / PRO |
| onboardingComplete | Boolean | Onboarding status |
| onboardingStep | Int | Current onboarding step (0-6) |

### Account
OAuth provider accounts (NextAuth adapter pattern).

### Session
Active user sessions (NextAuth).

### VerificationToken
Email verification tokens (NextAuth).

### UserSettings
User preferences and API key storage.

| Field | Type | Description |
|-------|------|-------------|
| openaiApiKey | String? | Encrypted OpenAI API key |
| llmModel | String | Default: gpt-4o-mini |
| discountThreshold | Int | Min discount % (default: 50) |
| autoAnalyze | Boolean | Auto-run LLM analysis |
| Notification fields | Boolean | Email notification preferences |

### FacebookToken
Stored Facebook OAuth tokens for marketplace scraping.

---

## Messaging & Posting Models

### Message
In-app messaging for seller communication.

| Field | Type | Description |
|-------|------|-------------|
| direction | String | INBOUND / OUTBOUND |
| status | String | DRAFT → PENDING_APPROVAL → SENT → DELIVERED |
| body | String | Message content |
| listingId | String? | Related listing |
| parentId | String? | Thread parent |

### AiAnalysisCache
Caches LLM analysis results to avoid repeated API calls.

| Field | Type | Description |
|-------|------|-------------|
| listingId | String | Related listing |
| analysisResult | String | JSON analysis data |
| expiresAt | DateTime | Cache expiration (24h) |

### PostingQueueItem
Cross-platform posting queue for resale listings.

| Field | Type | Description |
|-------|------|-------------|
| targetPlatform | String | Destination marketplace |
| status | String | PENDING → IN_PROGRESS → POSTED / FAILED |
| retryCount | Int | Current retry attempt |
| maxRetries | Int | Max retries (default: 3) |

**Unique:** [listingId, targetPlatform, userId]

---

## Entity Relationship Summary

```
User 1──* Listing 1──1 Opportunity
  │          │
  │          ├──* Message
  │          └──* PostingQueueItem
  │
  ├──1 UserSettings
  ├──* Account (OAuth)
  ├──* Session
  ├──* ScraperJob
  ├──* SearchConfig
  └──1 FacebookToken

Listing *──* AiAnalysisCache (cache layer)
PriceHistory (standalone market reference)
VerificationToken (standalone auth)
```
