# Story 9.2: Optimal Listing Price Calculation

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69cb8002fab7890daddcc634

## Story

As a **user**,
I want the system to recommend an optimal listing price,
So that I maximize profit while remaining competitive.

## Acceptance Criteria

1. **AC-1: Optimal price from verified market data**
   **Given** a purchased item with verified market data
   **When** listing price calculation runs
   **Then** the recommended price accounts for: verified market value, target profit margin, platform-specific fees, and estimated shipping costs

2. **AC-2: Price breakdown display**
   **Given** the recommended price
   **When** displayed to the user
   **Then** it shows (in this priority order): estimated profit after fees, recommended price, best platform recommendation, fee breakdown per platform, and market value comparison

3. **AC-3: Real-time margin adjustment**
   **Given** the user wants a different profit margin
   **When** they adjust the target margin slider or numeric input
   **Then** the recommended price recalculates in real-time (client-side, no API call per change)

4. **AC-4: Edge case handling**
   **Given** an item with zero purchase price, no market data, or a margin+fee combination that exceeds 100%
   **When** listing price calculation runs
   **Then** the system handles gracefully: market-based pricing for free items, clear fallback messaging for missing data, and validation errors for impossible margin+fee combinations

5. **AC-5: Pre-purchase price projection**
   **Given** an item in IDENTIFIED or CONTACTED status (not yet purchased)
   **When** the user requests price calculation
   **Then** the system uses `askingPrice` as the cost basis and labels the output as "Projected" (not "Recommended")

**FRs fulfilled:** FR-RELIST-03

## Requirement Traceability

| FR | AC | Test Tag |
|---|---|---|
| FR-RELIST-03 | AC-1 | @E-009-S-TBD @story-9-2 @FR-RELIST-03 |
| FR-RELIST-03 | AC-2 | @E-009-S-TBD @story-9-2 @FR-RELIST-03 |
| FR-RELIST-03 | AC-3 | @E-009-S-TBD @story-9-2 @FR-RELIST-03 |
| FR-RELIST-03 | AC-4 | @E-009-S-TBD @story-9-2 @FR-RELIST-03 |
| FR-RELIST-03 | AC-5 | @E-009-S-TBD @story-9-2 @FR-RELIST-03 |

## Tasks / Subtasks

- [ ] Task 1: Create listing price calculator service (AC: 1, 4, 5)
  - [ ] 1.1 Create `src/lib/listing-price-calculator.ts` with `calculateOptimalListingPrice()` function
  - [ ] 1.2 Inputs: `listingId`, `targetPlatform`, `targetMarginPercent` (default 30%), `userId`
  - [ ] 1.3 Fetch listing data including `verifiedMarketValue`, `estimatedShippingCost`, `purchasePrice` (from Opportunity), and user's platform fee rate from `UserSettings`
  - [ ] 1.4 Price formula: `recommendedPrice = (costBasis + shippingCost) / (1 - feeRateDecimal - targetMarginDecimal)` — ensures target margin AFTER fees and shipping
  - [ ] 1.5 **CRITICAL validation:** Before calculation, validate `feeRateDecimal + targetMarginDecimal < 1.0`. If not, throw `ValidationError('Target margin plus platform fees cannot equal or exceed 100%')`. This prevents division by zero or negative prices.
  - [ ] 1.6 **Competitive cap:** If `verifiedMarketValue` exists AND `compMatchConfidence !== 'insufficient'`, cap at `verifiedMarketValue * marketCapPercent` (default 0.95, passed as parameter). If capped price falls below `costBasis`, show loss warning — never silently recommend a loss-making price.
  - [ ] 1.7 **Free item handling (AC-4):** When `purchasePrice` is 0 or null AND no Opportunity exists, use market-based pricing: `verifiedMarketValue * (1 - feeRateDecimal) * 0.85` (price at 85% of after-fee market value). Skip ROI integration for zero-cost items.
  - [ ] 1.8 **Cost basis fallback chain:** `Opportunity.purchasePrice` > `Listing.askingPrice`. When using `askingPrice`, set `isProjected: true` on the result.
  - [ ] 1.9 Return `ListingPriceResult` interface: `{ recommendedPrice, estimatedFees, estimatedProfit, estimatedShippingCost, targetMarginPercent, feeRatePercent, verifiedMarketValue, costBasis, isProjected, marketDataAvailable, lossWarning, aiRecommendedPrice, priceBreakdown }`
  - [ ] 1.10 Include `Listing.recommendedList` (LLM price) as `aiRecommendedPrice` in the response for comparison. If formula price and LLM price differ by >15%, include `priceDiscrepancyNote` explaining the difference.
  - [ ] 1.11 Round all monetary values to cents: `Math.round(x * 100) / 100`
  - [ ] 1.12 Add fee rate guard: if any fee rate after dividing by 100 is still > 1.0, throw `ConfigurationError` (indicates someone stored a decimal instead of percentage)

- [ ] Task 2: Add multi-platform price comparison (AC: 1, 2)
  - [ ] 2.1 Add `calculateMultiPlatformPrices()` function that returns optimal prices for ALL supported platforms in a single call
  - [ ] 2.2 Use platform fee rates from `UserSettings`: eBay 13%, Mercari 10%, Facebook 5%, OfferUp 12.9%, Craigslist 0%
  - [ ] 2.3 Return array of `ListingPriceResult` per platform, sorted by highest estimated profit
  - [ ] 2.4 Include `bestPlatform` recommendation based on highest net profit after fees
  - [ ] 2.5 Gray out / mark as `impossible: true` any platform where `feeRate + targetMargin >= 100%` — don't throw, just flag in the per-platform result

- [ ] Task 3: Create API endpoint (AC: 1, 2, 5)
  - [ ] 3.1 Create `app/api/listings/[id]/optimal-price/route.ts` with GET and POST handlers
  - [ ] 3.2 GET: Calculate optimal prices for all platforms with default 30% margin
  - [ ] 3.3 POST: Accept `{ targetPlatform, targetMarginPercent, marketCapPercent }` for custom calculation
  - [ ] 3.4 Auth: `getCurrentUserId()` from `@/lib/auth`, verify listing ownership via `userId`
  - [ ] 3.5 Response: `{ success: true, data: { prices: ListingPriceResult[], bestPlatform: string, isProjected: boolean } }`
  - [ ] 3.6 Error handling: `NotFoundError` for missing listing, `ValidationError` for margin where `margin + feeRate >= 100%` for ALL platforms
  - [ ] 3.7 Feature gate: Use `checkFeatureAccess()` from `@/lib/tier-enforcement` (NOT `hasFeatureAccess`). Pattern: `const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } }); const featureCheck = checkFeatureAccess(user?.subscriptionTier, 'priceHistory'); if (!featureCheck.allowed) throw new ForbiddenError(featureCheck.reason);`
  - [ ] 3.8 Allow pre-purchase calculation (IDENTIFIED/CONTACTED status) — return `isProjected: true` in response

- [ ] Task 4: Create PriceCalculator React component (AC: 2, 3, 4, 5)
  - [ ] 4.1 Create `src/components/PriceCalculator.tsx` — client component with margin slider + numeric input
  - [ ] 4.2 **Information hierarchy (top to bottom):** (1) Estimated Profit as hero number (largest, green), (2) Recommended List Price (second largest), (3) Best Platform badge, (4) Margin control, (5) Per-platform fee breakdown table, (6) Market value comparison bar
  - [ ] 4.3 Margin control: slider (5%-80%, step 1%, default 30%) paired with a numeric input field for precision. Numeric input is primary on mobile. Dynamically cap slider maximum per-platform at `floor((1 - feeRateDecimal) * 100) - 1` to prevent impossible combinations.
  - [ ] 4.4 Real-time recalculation on slider/input change — perform calculation client-side (no API call on each change; use the formula with data fetched once). Show "last updated" timestamp on data, with "Refresh" button to re-fetch.
  - [ ] 4.5 Highlight best platform with text label + icon (not color alone — accessible for color-blind users)
  - [ ] 4.6 Show market comparison as horizontal bar visualization: market average vs your price vs lowest competitor, color-coded (green=below market, yellow=at market, red=above)
  - [ ] 4.7 **Error states:** Show warning banner when market data is estimated (not verified) with "Verify Market Value" action. Show red text when market cap forces margin below target. Gray out platforms where margin is impossible with tooltip explaining why.
  - [ ] 4.8 **Pre-purchase mode (AC-5):** When `isProjected: true`, show "Projected" badge/banner. If no purchase price, show input field for hypothetical purchase price with default of `askingPrice`.
  - [ ] 4.9 **Loss warning:** When competitive cap forces price below cost basis, display prominent warning: "Selling at competitive price results in a loss of $X. Options: list at competitive price (loss), or list at break-even price ($Y)."
  - [ ] 4.10 Show `aiRecommendedPrice` (LLM price) alongside formula price. If >15% difference, show note explaining why.
  - [ ] 4.11 **Accessibility:** `aria-label="Target profit margin"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext="X percent"`. Wrap recalculated values in `aria-live="polite"` region. Visible focus ring (`focus:ring-2 focus:ring-purple-400`). Enforce 44x44px slider thumb on mobile.
  - [ ] 4.12 Use Tailwind styling consistent with existing components (layout > spacing > color grouping)

- [ ] Task 5: Integrate into listing detail / posting flow (AC: 2, 3)
  - [ ] 5.1 Add a "Price & List" action section on listing detail page (`app/listings/[id]/page.tsx`) that appears when Opportunity status is PURCHASED or later (or when user wants pre-purchase projection)
  - [ ] 5.2 Render PriceCalculator within this section
  - [ ] 5.3 Add "List on [Platform]" CTA buttons per platform row in the calculator. These call `POST /api/posting-queue` with the calculated `askingPrice` pre-filled.
  - [ ] 5.4 Allow user to override the recommended price before submitting to the queue
  - [ ] 5.5 When auto-populating `PostingQueueItem.askingPrice`, use the optimal price for the specific target platform

- [ ] Task 6: Write unit tests (AC: 1, 2, 3, 4, 5)
  - [ ] 6.1 Test `calculateOptimalListingPrice()` — correct price with known inputs (purchase $50, eBay 13% fee, 30% margin → price ≈ $87.72)
  - [ ] 6.2 Test fee rate lookup from UserSettings mock
  - [ ] 6.3 Test verified market value cap (price capped at 95% of market value)
  - [ ] 6.4 Test fallback when no verified market value (uses `estimatedValue`)
  - [ ] 6.5 Test fallback when no purchase price (uses `askingPrice`, `isProjected: true`)
  - [ ] 6.6 Test `calculateMultiPlatformPrices()` — returns sorted array with correct `bestPlatform`
  - [ ] 6.7 Test edge cases: zero fee (Craigslist), 0% margin (break-even), margin+fee >= 100% validation error
  - [ ] 6.8 Test free item ($0 purchase) — uses market-based pricing, not cost-plus
  - [ ] 6.9 Test market cap below cost basis — returns `lossWarning: true` with loss amount
  - [ ] 6.10 Test fee rate guard — fee rate > 1.0 after division throws `ConfigurationError`
  - [ ] 6.11 Test shipping cost inclusion — profit calculation deducts `estimatedShippingCost`
  - [ ] 6.12 Test LLM price discrepancy note — triggered when formula vs `recommendedList` differ >15%
  - [ ] 6.13 Test `impossible: true` flagging when platform fee makes margin impossible
  - [ ] 6.14 Test IDENTIFIED status — returns `isProjected: true`, uses `askingPrice`
  - [ ] 6.15 Test API route: auth check, listing ownership, feature gating via `checkFeatureAccess()`, valid response shape
  - [ ] 6.16 Coverage target: maintain 96%+ branches, 98%+ functions, 99%+ lines/statements

- [ ] Task 7: Write Gherkin acceptance tests (DoD)
  - [ ] 7.1 Write scenarios in `test/acceptance/features/E-009-cross-platform-resale-listing.feature`
  - [ ] 7.2 Tag with `@E-009-S-<N>`, `@story-9-2`, `@FR-RELIST-03`
  - [ ] 7.3 Write step definitions in `test/acceptance/step_definitions/E-009-optimal-price.steps.ts`
  - [ ] 7.4 Update requirements traceability matrix

## Dev Notes

### Architecture & Patterns

- **Value estimator** (`src/lib/value-estimator.ts`): Algorithmic scoring engine. Score formula: `profitMargin * 100 + 50` (clamped 0-100). Default fee rate: 13%. Has `estimateValue()` → returns `estimatedValue`, `estimatedLow`, `estimatedHigh`, `profitPotential`. DO NOT duplicate this logic — reuse its category/brand/condition analysis for fallback value estimation.
- **Market value calculator** (`src/lib/market-value-calculator.ts`): Two-tier price lookup: (1) DB `PriceHistory` table, (2) Playwright eBay scrape fallback. Uses IQR outlier removal. Returns `verifiedMarketValue` (median of filtered prices). The `trueDiscountPercent` is calculated as `((verifiedValue - askingPrice) / verifiedValue) * 100`. DO NOT re-fetch market prices — use the `verifiedMarketValue` already stored on the Listing model.
- **ROI calculator** (`src/lib/roi-calculator.ts`): Computes ROI including carrying costs. Has `calculateROI(input)` → `ROIResult` with `grossProfit`, `netProfit`, `roiPercent`. Requires `purchaseDate` (Date, mandatory) and `purchasePrice > 0`. DO NOT use this for the core price calculation — simple inline profit math (`revenue - fees - cost - shipping`) is clearer. The ROI calculator can optionally be called as a supplementary display to show accumulated holding costs and annualized ROI for purchased items.
- **LLM analyzer** (`src/lib/llm-analyzer.ts`): Already produces `recommendedList` (recommended listing price) via OpenAI. Two-layer cache: L1 in-memory LRU, L2 `AiAnalysisCache` table with 24h TTL. The `recommendedList` field on the Listing model may already be populated — use it as a reference point but the optimal price calculator should compute its own price based on actual fee rates and target margins.
- **Description generator** (`src/lib/description-generator.ts`): Uses GPT-4o-mini for platform-specific descriptions. Already returns a `suggestedPrice` field — this story's calculator should be the authoritative price source, not the description generator.

### Price Calculation Formula

The core formula for optimal listing price that ensures the seller achieves their target profit margin AFTER platform fees and shipping:

```
costBasis = purchasePrice + estimatedShippingCost
recommendedPrice = costBasis / (1 - feeRateDecimal - targetMarginDecimal)
```

**CRITICAL VALIDATION:** Before calculating, check `feeRateDecimal + targetMarginDecimal < 1.0`. If `>= 1.0`, the denominator is zero or negative — throw `ValidationError`.

Where:
- `costBasis` = what the user paid + shipping (from `Opportunity.purchasePrice` + `Listing.estimatedShippingCost`)
- `feeRateDecimal` = platform fee as decimal (e.g., 0.13 for eBay's 13%)
- `targetMarginDecimal` = desired profit margin as decimal (e.g., 0.30 for 30%)

**Cost basis fallback chain:** `Opportunity.purchasePrice` > `Listing.askingPrice`. When using `askingPrice`, mark output as `isProjected: true`.

Example: Purchase $50, $8 shipping, eBay 13% fee, 30% margin target:
- `($50 + $8) / (1 - 0.13 - 0.30) = $58 / 0.57 = $101.75`
- Fees: $101.75 x 0.13 = $13.23
- Profit: $101.75 - $13.23 - $50 - $8 = $30.52

**Free item pricing ($0 purchase):** Use market-based formula instead: `verifiedMarketValue * (1 - feeRateDecimal) * 0.85`. Do NOT divide zero by anything.

**Competitive cap:** If `verifiedMarketValue` exists and `compMatchConfidence !== 'insufficient'`, cap at `verifiedMarketValue * marketCapPercent` (default 0.95). The cap percentage should be a named constant `DEFAULT_MARKET_CAP_PERCENT = 0.95` and passed as a parameter to `calculateOptimalListingPrice()`. If the capped price falls below `costBasis`, set `lossWarning: true` and include loss amount — never silently recommend a loss.

**Rounding:** All monetary values rounded to cents as final step: `Math.round(x * 100) / 100`.

### Platform Fee Rates (from UserSettings)

| Platform | Field | Default | Decimal |
|----------|-------|---------|---------|
| eBay | `feeRateEbay` | 13.0% | 0.13 |
| Mercari | `feeRateMercari` | 10.0% | 0.10 |
| Facebook | `feeRateFacebook` | 5.0% | 0.05 |
| OfferUp | `feeRateOfferup` | 12.9% | 0.129 |
| Craigslist | `feeRateCraigslist` | 0.0% | 0.00 |

**CRITICAL:** Fee rates are stored as PERCENTAGES in the database (e.g., `13.0`). Divide by 100 before using in calculations. These are user-configurable — always read from `UserSettings` via Prisma, never hardcode.

### Data Models (Prisma)

**Listing model** — fields to READ (not modify):
- `verifiedMarketValue` (Float?) — verified price from eBay sold data
- `estimatedValue` (Float?) — algorithmic estimate (fallback when no verified data)
- `recommendedList` (Float?) — LLM-suggested list price (include as `aiRecommendedPrice` for comparison)
- `askingPrice` (Float) — original seller's asking price (fallback cost basis for pre-purchase projection)
- `estimatedShippingCost` (Float?) — lowest carrier estimate in USD (from Story 5.5)
- `compMatchConfidence` (String?) — `'high' | 'medium' | 'low' | 'insufficient'` — defines "verified" threshold (exclude `insufficient`)

**Opportunity model** — fields to READ:
- `purchasePrice` (Float?) — what user actually paid (primary cost basis)
- `fees` (Float?) — recorded platform fees
- `status` (String) — IDENTIFIED/CONTACTED items use `askingPrice` and return `isProjected: true`; PURCHASED+ items use `purchasePrice`

**PostingQueueItem model** — fields to WRITE:
- `askingPrice` (Float?) — optimal price goes here when queuing for posting

**UserSettings model** — fields to READ:
- `feeRateEbay`, `feeRateMercari`, `feeRateFacebook`, `feeRateOfferup`, `feeRateCraigslist` (all Float, stored as %)
- `holdingCostDailyRate` (Float, default 2.0) — optionally display accumulated holding costs for purchased items as supplementary info

### API Route Pattern

Follow existing pattern from `app/api/listings/[id]/market-value/route.ts`:

```typescript
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new UnauthorizedError('Unauthorized');
    const { id } = await params;
    // ... business logic ...
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleError(error);
  }
}
```

- Auth: `getCurrentUserId()` from `@/lib/auth`
- Errors: Throw typed errors from `@/lib/errors` (`NotFoundError`, `ValidationError`, `UnauthorizedError`)
- Response: `{ success: true, data: ... }` or error via `handleError()`

### Feature Gating

Use `checkFeatureAccess()` from `src/lib/tier-enforcement.ts` (NOT `hasFeatureAccess` from `subscription-tiers.ts` — that function takes `(tier, feature)` not `(userId, feature)` and is synchronous):
- `priceHistory` feature required (available on FLIPPER and PRO tiers, not FREE)
- Pattern (matches all existing API routes):
  ```typescript
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } });
  const featureCheck = checkFeatureAccess(user?.subscriptionTier, 'priceHistory');
  if (!featureCheck.allowed) throw new ForbiddenError(featureCheck.reason);
  ```
- Note: `priceHistory` is being overloaded to gate pricing tools — semantically imperfect but matches current tier structure. Document as tech debt for future `pricingTools` feature gate.

### Testing Approach

Follow patterns from `src/__tests__/lib/llm-analyzer.test.ts` and `src/__tests__/lib/market-value-calculator.test.ts`:
- Mock `@/lib/db` (Prisma singleton) with `jest.mock('@/lib/db')`
- Mock `UserSettings` query to return configurable fee rates
- Mock `Listing` query with various states (with/without verifiedMarketValue, with/without opportunity)
- Test calculation accuracy with known inputs and expected outputs
- Test edge cases: zero fees (Craigslist), no market data, no purchase price
- `testEnvironment: 'node'`, `maxWorkers: 1`, `forceExit: true` (from jest.config.js)

### Anti-Patterns to Avoid

- **DO NOT** create a new Prisma client — use singleton from `@/lib/db`
- **DO NOT** hardcode fee rates — always read from `UserSettings`
- **DO NOT** re-fetch market value data — use `Listing.verifiedMarketValue` already stored
- **DO NOT** use `hasFeatureAccess()` directly — use `checkFeatureAccess()` from `@/lib/tier-enforcement` (see Feature Gating section)
- **DO NOT** use `any` type in production code (ESLint enforces this)
- **DO NOT** place the new module anywhere other than `src/lib/` for the service and `app/api/listings/[id]/optimal-price/` for the API route
- **DO NOT** skip validation of `feeRate + targetMargin < 1.0` — produces Infinity or negative prices
- **DO NOT** use `calculateROI()` for the core price calculation — it requires `purchaseDate` and throws on `purchasePrice <= 0`. Use simple inline profit math instead.
- **DO NOT** silently recommend a loss-making price when market cap forces price below cost basis — always warn the user
- **DO NOT** use color alone to convey information (best platform, warnings) — always pair with text/icons for accessibility

### Project Structure Notes

- New files:
  - `src/lib/listing-price-calculator.ts` — core calculation service
  - `app/api/listings/[id]/optimal-price/route.ts` — REST API endpoint
  - `src/components/PriceCalculator.tsx` — React client component
  - `src/__tests__/lib/listing-price-calculator.test.ts` — unit tests
  - `src/__tests__/api/optimal-price.test.ts` — API route tests
  - `test/acceptance/step_definitions/E-009-optimal-price.steps.ts` — acceptance test steps
- Modified files:
  - `test/acceptance/features/E-009-cross-platform-resale-listing.feature` — add scenarios (create if not exists)
  - `_bmad-output/test-artifacts/requirements-traceability-matrix.md` — update RTM
  - Listing detail view component (integrate PriceCalculator)
- Path alias: `@/*` → `./src/*`

### Dependencies

- **Epic 4** (Core Scoring) — `done`. Value estimator, market value calculator, and LLM analyzer are all complete.
- **Epic 5** (Market Intelligence) — `done`. Verified market data and comparable sales matching are available.
- **Story 9.1** (AI Title & Description) — `backlog`. Not required for this story. Description generator already exists and returns `suggestedPrice`, but this story provides the authoritative pricing.
- **Story 9.3** (Posting Queue) — `backlog`. PostingQueueItem model and basic API already exist. This story's output (`askingPrice`) feeds into the posting queue.

### References

- [Source: src/lib/value-estimator.ts] — Algorithmic scoring and value estimation
- [Source: src/lib/market-value-calculator.ts] — Verified market price lookup
- [Source: src/lib/roi-calculator.ts] — ROI and holding cost calculations
- [Source: src/lib/llm-analyzer.ts] — LLM analysis with recommendedList field
- [Source: src/lib/subscription-tiers.ts] — Tier definitions and feature flags
- [Source: src/lib/tier-enforcement.ts] — `checkFeatureAccess()` function for API route gating
- [Source: src/lib/errors.ts] — Error hierarchy (NotFoundError, ValidationError, etc.)
- [Source: src/lib/db.ts] — Prisma client singleton
- [Source: prisma/schema.prisma#Listing] — Listing model with verifiedMarketValue, estimatedValue, recommendedList
- [Source: prisma/schema.prisma#Opportunity] — Opportunity model with purchasePrice, fees
- [Source: prisma/schema.prisma#UserSettings] — Fee rate fields per platform
- [Source: prisma/schema.prisma#PostingQueueItem] — askingPrice field for queue items
- [Source: app/api/listings/[id]/market-value/route.ts] — API route pattern reference
- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.2] — Story requirements and acceptance criteria

## Definition of Done (DoD)

- [ ] All acceptance criteria (AC-1 through AC-5) are implemented and verified
- [ ] All Gherkin acceptance test scenarios are written in `test/acceptance/features/E-009-cross-platform-resale-listing.feature`
- [ ] All scenarios tagged with `@E-009-S-<N>`, `@story-9-2`, and `@FR-RELIST-03`
- [ ] Requirements traceability matrix updated in `_bmad-output/test-artifacts/requirements-traceability-matrix.md`
- [ ] Unit tests written for new business logic (`src/__tests__/lib/listing-price-calculator.test.ts`)
- [ ] Edge case tests: $0 items, impossible margins, market cap loss warnings, missing data fallbacks
- [ ] Accessibility: `aria-live` region, `aria-valuetext`, focus ring, 44px touch targets, no color-only info
- [ ] No lint errors (`pnpm lint`)
- [ ] Build passes (`pnpm build`)
- [ ] All existing tests continue to pass (`pnpm test`)
- [ ] Coverage thresholds maintained: branches 96%, functions 98%, lines 99%, statements 99%

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
