# Data Models - Flipper.ai

> Generated: 2026-02-27 | Scan Level: Deep | ORM: Prisma ^7.4.0 | DB: PostgreSQL

## Schema Overview

The database schema is defined in `prisma/schema.prisma` with 20 models covering user management, marketplace listings, opportunity tracking, messaging, notifications, scheduling, and cross-platform posting.

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
| **Monitoring & Logistics** | | |
| lastMonitoredAt | DateTime? | Round-robin fairness for monitoring (Story 10.1) |
| estimatedExpiresAt | DateTime? | Computed expiry: postedAt + platform default (Story 10.2) |
| conversationStatus | String? | null, 'pending', 'responded', or 'purchased' (Story 8.5) |
| soldVolume30Days | Int? | Units sold in last 30 days (Story 5.3) |
| soldVolume60Days | Int? | Units sold in last 60 days |
| soldVolume90Days | Int? | Units sold in last 90 days |
| completenessLabel | String? | "Complete with box", "Missing charger", etc. (Story 5.4) |
| sellerRating | Float? | Feedback % or star rating 0-5 (Story 5.4) |
| sellerReviewCount | Int? | Number of seller reviews |
| sellerAccountAgeDays | Int? | Seller account age in days |
| sizeCategory | String? | 'small_shippable', 'large_local_only', 'fragile_special_handling' (Story 5.5) |
| shippingEstimatesJson | String? | JSON: { usps, ups, fedex, lowestCost } |
| estimatedShippingCost | Float? | Lowest carrier estimate in USD |
| pickupDistanceMiles | Float? | Miles from user home to seller |
| outsidePickupRadius | Boolean? | Exceeds user's maxPickupRadiusMiles |
| adjustedProfitMargin | Float? | profitPotential minus estimatedShippingCost |

**Relations:** User?, ListingImage[], Message[], NotificationEvent[], Opportunity?, PostingQueueItem[]
**Indexes:** userId, platform, status, valueScore, scrapedAt, llmAnalyzed, trueDiscountPercent, conversationStatus, estimatedExpiresAt
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
| meetingTime | DateTime? | Scheduled meeting date and time (Story 12.1) |
| meetingLocation | String? | Meeting address or description |
| meetingType | String? | 'buy' or 'sell' |
| calendarEventId | String? | Google Calendar event ID for update/delete |

**Indexes:** userId, status, createdAt, [meetingTime, meetingLocation]

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

### Account (Removed)
Legacy OAuth provider accounts from a former auth adapter. Removed from the Prisma schema. Authentication is now handled by Firebase Auth with session cookies (see `src/lib/firebase/session.ts`).

### Session (Removed)
Legacy session model. Removed from Prisma schema. Sessions are now managed via Firebase Auth `__session` cookies with 5-day TTL.

### VerificationToken (Removed)
Legacy email verification tokens. Removed from Prisma schema. Email verification is now handled by Firebase Auth.

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

### DeviceToken
FCM push notification device tokens per user-device pair (Story 11.1).

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String | Owner user |
| token | String | FCM device token |
| userAgent | String? | Browser/OS identification for display in Settings |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last updated |

**Relations:** User (onDelete: Cascade)
**Unique:** [userId, token]
**Indexes:** userId, token

### GoogleCalendarToken
Google Calendar OAuth tokens storing encrypted access and refresh tokens (Story 12.1).

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String (unique) | Owner user (1:1) |
| accessToken | String | AES-256 encrypted access token |
| refreshToken | String | AES-256 encrypted refresh token |
| expiresAt | DateTime | Token expiration time |
| calendarEmail | String? | Google account email for display in Settings |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last updated |

**Relations:** User (onDelete: Cascade)
**Indexes:** userId, expiresAt

### PasswordResetToken
Password reset flow tokens with hashed values and expiration (Story 2.x).

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String | Owner user |
| tokenHash | String (unique) | Hashed reset token |
| expiresAt | DateTime | Token expiration time |
| createdAt | DateTime | Creation timestamp |

**Relations:** User (onDelete: Cascade)
**Indexes:** userId

### ListingImage
Image storage management for listing photos (Story 3.x).

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| listingId | String | Parent listing |
| imageIndex | Int | Ordered position within listing |
| originalUrl | String | Original source URL |
| storagePath | String | Cloud storage path |
| storageUrl | String | Public-facing storage URL |
| fileSize | Int | File size in bytes |
| contentType | String | MIME type (e.g., image/jpeg) |
| width | Int? | Image width in pixels |
| height | Int? | Image height in pixels |
| uploadedAt | DateTime | Upload timestamp |

**Relations:** Listing (onDelete: Cascade)
**Unique:** [listingId, imageIndex]
**Indexes:** listingId

### UsageRecord
Subscription usage tracking per user per month (Story 7.x).

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String | Owner user |
| type | String | "SCAN" or "ANALYSIS" |
| count | Int | Usage count for the period (default: 0) |
| periodStart | DateTime | First day of the month (e.g., 2026-03-01T00:00:00Z) |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last updated |

**Relations:** User (onDelete: Cascade)
**Unique:** [userId, type, periodStart]
**Indexes:** [userId, type, periodStart]

---

## Monitoring & Notification Models

### MonitoringJob
Background monitoring job tracking for listing re-check runs (Story 10.1).

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| status | String | PENDING, RUNNING, COMPLETED, or FAILED |
| startedAt | DateTime? | When the job started executing |
| completedAt | DateTime? | When the job finished |
| listingsChecked | Int | Number of listings checked this run |
| eventsCreated | Int | Notification events created |
| errorsEncountered | Int | Errors encountered during run |
| totalListings | Int | Expected total for progress reporting |
| platformStats | Json? | Per-platform breakdown: { craigslist: { checked, parsed, events }, ... } |
| skippedPlatforms | Json? | Platforms skipped and why (circuit breaker, budget) |
| completedEarly | Boolean | True if terminated by max duration cap |
| canaryWarning | Boolean | True if any platform failed parse canary |
| errorMessage | String? | Error details if failed |
| retryCount | Int | Number of retry attempts |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last updated |

**Indexes:** status
**Constraint:** Partial unique index on status WHERE status = 'RUNNING' (enforced via raw SQL migration — prevents concurrent runs)

### NotificationEvent
Notification events queue for downstream processors (Stories 10.1, 10.3-10.5).

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String | Target user |
| listingId | String? | Related listing (nullable) |
| eventType | String | Event type: listing.sold, listing.price_changed, listing.expiring, listing.unavailable, opportunity.found, flip.purchased, flip.listed, flip.sold |
| payload | Json | Event data: { oldPrice?, newPrice?, expiryDate?, listingTitle, listingUrl, platform } |
| deduplicationKey | String? | Idempotency key: ${listingId}:${eventType}:${hourBucket} |
| status | String | PENDING, PROCESSING, PROCESSED, or FAILED |
| retryCount | Int | Number of retry attempts |
| errorMessage | String? | Error details if failed |
| processedAt | DateTime? | When the event was processed |
| createdAt | DateTime | Creation timestamp |

**Relations:** User (onDelete: Cascade), Listing? (onDelete: SetNull)
**Unique:** [userId, listingId, eventType, deduplicationKey]
**Indexes:** [userId, status], [status, createdAt], [eventType, status], createdAt

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
  │          ├──* PostingQueueItem
  │          ├──* ListingImage
  │          └──* NotificationEvent
  │
  ├──1 UserSettings
  ├──1 GoogleCalendarToken
  ├──* DeviceToken
  ├──* PasswordResetToken
  ├──* UsageRecord
  ├──* ScraperJob
  ├──* SearchConfig
  ├──* NotificationEvent
  └──1 FacebookToken

MonitoringJob (standalone — tracks background monitoring runs)
Listing *──* AiAnalysisCache (cache layer)
PriceHistory (standalone market reference)

Note: Account, Session, and VerificationToken models (legacy, removed)
are no longer in the schema. Auth is handled by Firebase Auth with session cookies.
```
