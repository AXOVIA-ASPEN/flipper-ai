# Listing Decision Logic

This document describes the current decision-making process for determining whether scraped listings should be saved and how they are scored for flip potential.

## Current Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SCRAPING PHASE                                     │
│  Playwright scrapes Craigslist → Extracts up to 50 listings per search      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRE-FILTER (Minimal)                                 │
│  • Skip listings with price <= 0                                            │
│  • Skip sponsored listings                                                  │
│  └─ ALL other listings proceed to analysis                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VALUE ESTIMATION                                     │
│  For EACH listing, calculate:                                               │
│  • estimatedValue (market value)                                            │
│  • discountPercent (how undervalued)                                        │
│  • profitPotential (after 13% fees)                                         │
│  • valueScore (0-100 opportunity score)                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE SAVE                                        │
│  ALL listings saved with status:                                            │
│  • "OPPORTUNITY" if valueScore >= 70                                        │
│  • "NEW" if valueScore < 70                                                 │
│  └─ No filtering based on discount percentage                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Value Estimation Formula

### Step 1: Category Multiplier

Each category has a resale markup range:

| Category     | Low Multiplier | High Multiplier | Difficulty |
| ------------ | -------------- | --------------- | ---------- |
| electronics  | 1.2x           | 1.6x            | 2 (Easy)   |
| furniture    | 1.3x           | 1.8x            | 4 (Hard)   |
| appliances   | 1.1x           | 1.4x            | 4 (Hard)   |
| tools        | 1.3x           | 1.7x            | 2 (Easy)   |
| video games  | 1.4x           | 2.0x            | 1 (V.Easy) |
| collectibles | 1.5x           | 2.5x            | 2 (Easy)   |
| clothing     | 1.1x           | 1.5x            | 3 (Mod)    |
| sports       | 1.2x           | 1.6x            | 3 (Mod)    |
| musical      | 1.3x           | 1.7x            | 3 (Mod)    |
| automotive   | 1.1x           | 1.4x            | 4 (Hard)   |
| default      | 1.2x           | 1.5x            | 3 (Mod)    |

### Step 2: Condition Multiplier

| Condition | Multiplier |
| --------- | ---------- |
| new       | 1.0        |
| like new  | 0.92       |
| excellent | 0.85       |
| good      | 0.75       |
| fair      | 0.60       |
| poor      | 0.40       |

**Note**: Condition is currently not extracted from listings, defaults to "good" (0.75x).

### Step 3: Value Boost Keywords

Keywords that INCREASE estimated value:

| Pattern                       | Boost | Tag               |
| ----------------------------- | ----- | ----------------- |
| apple, iphone, ipad, macbook  | 1.2x  | apple             |
| samsung, galaxy               | 1.15x | samsung           |
| sony, playstation, ps5, ps4   | 1.2x  | sony              |
| nintendo, switch              | 1.25x | nintendo          |
| xbox, microsoft               | 1.15x | xbox              |
| dyson                         | 1.3x  | dyson             |
| kitchenaid, vitamix           | 1.25x | premium-kitchen   |
| herman miller, steelcase      | 1.4x  | premium-furniture |
| pioneer, ddj                  | 1.2x  | dj-equipment      |
| vintage, antique, retro       | 1.4x  | vintage           |
| sealed, new in box, nib, bnib | 1.3x  | sealed            |
| rare, limited edition         | 1.4x  | rare              |

**Boosts are multiplicative**: An "Apple iPhone sealed" would get 1.2 × 1.3 = 1.56x boost.

### Step 4: Risk Penalty Keywords

Keywords that DECREASE estimated value:

| Pattern                     | Penalty | Tag           |
| --------------------------- | ------- | ------------- |
| broken, damaged, parts only | 0.3x    | for-parts     |
| needs repair, not working   | 0.4x    | needs-repair  |
| scratched, dented, worn     | 0.85x   | cosmetic-wear |
| missing, incomplete         | 0.6x    | incomplete    |
| old, used heavily           | 0.75x   | heavy-use     |

### Step 5: Calculate Estimated Market Value

```
baseLow  = askingPrice × categoryLow  × conditionMult × valueBoost × riskPenalty
baseHigh = askingPrice × categoryHigh × conditionMult × valueBoost × riskPenalty

estimatedValue = (baseLow + baseHigh) / 2
```

### Step 6: Calculate Discount Percent

```
discountPercent = ((estimatedValue - askingPrice) / estimatedValue) × 100
```

**Example**:

- Asking: $100
- Estimated Value: $150
- Discount: ((150 - 100) / 150) × 100 = **33%** undervalued

### Step 7: Calculate Profit Potential

```
feeRate = 0.13  (13% platform fees for eBay/Mercari)

profitLow  = estimatedLow  × (1 - feeRate) - askingPrice
profitHigh = estimatedHigh × (1 - feeRate) - askingPrice
profitPotential = (profitLow + profitHigh) / 2
```

### Step 8: Calculate Value Score (0-100)

```
profitMargin = profitPotential / askingPrice
valueScore = profitMargin × 100 + 50  (capped 0-100)

Adjustments:
  if profitPotential < $10  → cap score at 30
  if profitPotential < $0   → cap score at 10
  if profitPotential > $100 → add 10 to score
  if profitPotential > $200 → add 10 more to score
```

### Step 9: Opportunity Status Decision

```
if valueScore >= 70:
    status = "OPPORTUNITY"
else:
    status = "NEW"
```

---

## Critical Problem: No Real Market Validation

### The Current System is Guessing

The current `estimateValue()` function **does NOT verify actual market prices**. It simply:

1. Takes the asking price
2. Multiplies by category factors (1.2x - 2.5x)
3. Adjusts for keywords
4. Calls this the "estimated market value"

**This is circular logic**: `estimatedValue = askingPrice × multiplier`

A $100 item in "electronics" gets estimated at $120-$160, regardless of what that item actually sells for. The system has no way to know if:

- A "Sony TV" is a $50 Trinitron from 2003 or a $2000 OLED from 2024
- An "iPhone" is a cracked iPhone 6 or a mint iPhone 15 Pro
- "Vintage" means valuable antique or worthless old junk

### What's Actually Needed: LLM + Market Data

To truly determine if a listing is undervalued, we need:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TRUE MARKET VALIDATION                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. IDENTIFY THE ITEM (LLM)                                                 │
│     • Parse title/description to identify exact product                     │
│     • Extract: brand, model, year, condition, specs                         │
│     • Example: "iPhone 13 Pro 256GB Space Gray, excellent condition"        │
│                                                                              │
│  2. FETCH ACTUAL SOLD PRICES (Web Scraping/API)                            │
│     • eBay completed listings for this exact item                           │
│     • Calculate: median sold price, price range, days to sell               │
│     • Example: "iPhone 13 Pro 256GB sells for $580-$650, avg 3 days"        │
│                                                                              │
│  3. ASSESS SELLABILITY (LLM + Data)                                        │
│     • Current demand level (search volume, recent sales count)              │
│     • Condition impact on price                                             │
│     • Seasonality factors                                                   │
│     • Example: "High demand, sells quickly, 95% sellability score"          │
│                                                                              │
│  4. CALCULATE TRUE DISCOUNT                                                 │
│     • Compare asking price to verified market value                         │
│     • Factor in platform fees and shipping costs                            │
│     • Example: "Asking $400, market $620, true discount = 35%"             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The Comparable URLs Are Unused

The system generates eBay sold listing URLs:

```typescript
comparableUrls: [
  { url: "https://www.ebay.com/sch/...&LH_Sold=1", label: "eBay Sold Listings" },
  ...
]
```

But it **never fetches these URLs** to get actual prices. They're just provided for manual user verification.

---

## Current Problems (Additional)

### 1. ALL Listings Are Saved

Currently, every scraped listing (except price=0) is saved to the database regardless of flip potential. This causes:

- Database bloat with low-value listings
- Noise in the dashboard
- Wasted storage on items with no flip potential

### 2. Discount Percent Not Used for Filtering

The `discountPercent` field is calculated but not used for any filtering decisions. Items only 10% below market value are saved alongside 60% undervalued gems.

### 3. "Discount" Is Not Real

The `discountPercent` is calculated from a **guessed** estimated value, not from verified market data. A 50% "discount" might be meaningless.

### 4. Score Formula Quirks

The valueScore formula produces counterintuitive results:

| Asking | Est. Value | Profit | Profit Margin | Raw Score | Adjusted    |
| ------ | ---------- | ------ | ------------- | --------- | ----------- |
| $100   | $120       | $4.40  | 4.4%          | 54        | 30 (capped) |
| $100   | $150       | $30.50 | 30.5%         | 80        | 80          |
| $100   | $200       | $74.00 | 74%           | 100       | 100         |
| $100   | $100       | -$13   | -13%          | 37        | 10 (capped) |

---

## Proposed Change: 50% Undervalue Threshold

### New Decision Logic

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRE-FILTER                                          │
│  Skip if:                                                                   │
│  • price <= 0                                                               │
│  • sponsored listing                                                        │
│  • discountPercent < 50  ← NEW: Must be 50%+ undervalued                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                              Only 50%+ undervalued
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SAVE TO DATABASE                                    │
│  All filtered listings become opportunities worth investigating            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What 50% Undervalued Means

For an item to be saved, the asking price must be **at most half** of the estimated market value:

```
discountPercent >= 50

Which means:
askingPrice <= estimatedValue × 0.5
```

| Asking | Est. Value | Discount % | Saved? |
| ------ | ---------- | ---------- | ------ |
| $50    | $100       | 50%        | ✅ Yes |
| $40    | $100       | 60%        | ✅ Yes |
| $60    | $100       | 40%        | ❌ No  |
| $100   | $150       | 33%        | ❌ No  |
| $100   | $200       | 50%        | ✅ Yes |
| $100   | $250       | 60%        | ✅ Yes |

### Implementation Location

File: `src/app/api/scraper/craigslist/route.ts`

```typescript
// Line ~231-234: Add filter before saving
for (const item of listings) {
  if (item.price <= 0) continue;

  const detectedCategory = detectCategory(item.title, item.description || null);
  const estimation = estimateValue(...);

  // NEW: Skip if not undervalued by at least 50%
  if (estimation.discountPercent < 50) {
    continue;  // Don't save to database
  }

  // Only save listings that meet the threshold
  await prisma.listing.upsert({...});
}
```

### Benefits

1. **Database Quality**: Only high-potential opportunities stored
2. **Cleaner Dashboard**: No noise from marginal listings
3. **Focus**: Users see only actionable opportunities
4. **Storage**: Reduced database size

### Considerations

1. **May miss edge cases**: Some valuable items might not trigger enough keyword boosts
2. **Algorithmic estimation limitations**: Formula may underestimate certain items
3. **Suggestion**: Log skipped listings count for visibility

---

---

## Proper Implementation: LLM-Verified Market Analysis

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 1: SCRAPE                                   │
│  Playwright scrapes Craigslist → Raw listings (title, price, images, URL)  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 2: LLM ITEM IDENTIFICATION                         │
│  For each listing, LLM extracts:                                            │
│  • Exact product: brand, model, variant, specs                              │
│  • Condition assessment from description/photos                             │
│  • Search query for market lookup                                           │
│  • Initial "is this worth investigating?" score                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                         Only promising items proceed
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 3: MARKET PRICE VERIFICATION                       │
│  Fetch actual sold prices from eBay API or scraping:                       │
│  • Recent sold listings for this exact item                                 │
│  • Calculate: median price, price range, volume                             │
│  • Days on market / sell-through rate                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 4: LLM SELLABILITY ANALYSIS                        │
│  Given market data, LLM assesses:                                           │
│  • True discount percentage (vs verified market price)                      │
│  • Sellability score (demand, competition, seasonality)                     │
│  • Risk factors (condition, authenticity, shipping)                         │
│  • Recommended offer price and resale strategy                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                         Only 50%+ undervalued items
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 5: SAVE TO DATABASE                                │
│  Store only verified opportunities with:                                    │
│  • Verified market value (not guessed)                                      │
│  • True discount percentage                                                 │
│  • Sellability score with reasoning                                         │
│  • Comparable sold listings as evidence                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Implementation Components

#### 1. LLM Item Identifier (`src/lib/llm-identifier.ts`)

```typescript
interface ItemIdentification {
  brand: string | null;
  model: string | null;
  variant: string | null; // "256GB", "Blue", etc.
  year: number | null;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  conditionNotes: string;
  searchQuery: string; // Optimized query for eBay search
  worthInvestigating: boolean; // Quick filter
  reasoning: string;
}

async function identifyItem(
  title: string,
  description: string | null,
  imageUrls: string[] | null
): Promise<ItemIdentification>;
```

#### 2. Market Price Fetcher (`src/lib/market-price.ts`)

```typescript
interface MarketPrice {
  source: 'ebay_api' | 'ebay_scrape';
  soldListings: SoldListing[];
  medianPrice: number;
  lowPrice: number;
  highPrice: number;
  avgDaysToSell: number;
  salesVolume: number; // Listings sold in last 30 days
  lastUpdated: Date;
}

interface SoldListing {
  title: string;
  price: number;
  soldDate: Date;
  condition: string;
  url: string;
}

async function fetchMarketPrice(
  searchQuery: string,
  category?: string
): Promise<MarketPrice | null>;
```

#### 3. LLM Sellability Analyzer (`src/lib/llm-analyzer.ts`)

```typescript
interface SellabilityAnalysis {
  // Verified values
  verifiedMarketValue: number;
  trueDiscountPercent: number;

  // Sellability
  sellabilityScore: number; // 0-100
  demandLevel: 'low' | 'medium' | 'high' | 'very_high';
  expectedDaysToSell: number;

  // Risk assessment
  authenticityRisk: 'low' | 'medium' | 'high';
  conditionRisk: 'low' | 'medium' | 'high';

  // Recommendations
  recommendedOfferPrice: number;
  recommendedListPrice: number;
  resaleStrategy: string;

  // Evidence
  comparableSales: SoldListing[];
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
}

async function analyzeSellability(
  listing: ScrapedListing,
  identification: ItemIdentification,
  marketData: MarketPrice
): Promise<SellabilityAnalysis>;
```

### eBay Market Data Options

#### Option A: eBay Browse API (Recommended)

- Official API access
- Requires eBay developer account
- Rate limited but reliable
- Can search completed/sold listings

#### Option B: eBay Scraping

- Use Playwright to scrape sold listings page
- More fragile (HTML changes)
- No rate limits from eBay
- Can be blocked

#### Option C: Third-Party APIs

- Services like Terapeak, Keepa (Amazon)
- PriceCharting for video games
- Usually paid services

### Cost Analysis

| Component          | Cost per Listing | Notes                      |
| ------------------ | ---------------- | -------------------------- |
| LLM Identification | ~$0.001          | Gemini Flash, ~500 tokens  |
| eBay Price Fetch   | ~$0.00           | API free tier or scraping  |
| LLM Analysis       | ~$0.002          | Gemini Flash, ~1000 tokens |
| **Total**          | **~$0.003**      | $0.15 per 50 listings      |

With 50% filter, only ~10 items analyzed deeply = **$0.03 per scrape**.

### Database Schema Updates

```prisma
model Listing {
  // ... existing fields

  // LLM Identification
  identifiedBrand     String?
  identifiedModel     String?
  identifiedVariant   String?
  identifiedCondition String?

  // Verified Market Data
  verifiedMarketValue Float?
  marketDataSource    String?   // "ebay_api", "ebay_scrape", etc.
  marketDataDate      DateTime?
  comparableSalesJson String?   // JSON array of sold listings

  // Sellability
  sellabilityScore    Int?
  demandLevel         String?
  expectedDaysToSell  Int?
  authenticityRisk    String?

  // Analysis metadata
  llmAnalyzed         Boolean   @default(false)
  analysisDate        DateTime?
  analysisConfidence  String?
}
```

---

## Summary

| Aspect                 | Current                            | With LLM + Market Verification |
| ---------------------- | ---------------------------------- | ------------------------------ |
| Market value source    | Guessed (askingPrice × multiplier) | Verified (eBay sold data)      |
| Accuracy               | Low (~30%?)                        | High (~85%+)                   |
| Filter threshold       | None (all saved)                   | 50% true undervalue            |
| Sellability assessment | None                               | LLM-powered                    |
| Listings saved         | ~50 per scrape                     | ~3-10 verified opportunities   |
| Database quality       | Noise                              | Signal only                    |
| Cost per scrape        | $0                                 | ~$0.03                         |
