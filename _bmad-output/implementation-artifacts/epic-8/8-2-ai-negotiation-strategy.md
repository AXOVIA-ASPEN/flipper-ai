# Story 8.2: AI Negotiation Strategy

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69cb70a7158067cddedad244

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want AI-powered negotiation suggestions with recommended offer amounts,
So that I can negotiate effectively and get the best deal.

## Acceptance Criteria

1. **AI Negotiation Strategy Generation**
   - Given a listing with verified market data and asking price
   - When the user requests negotiation strategy
   - Then the AI suggests: initial offer amount, walk-away price, negotiation tactics, and counter-offer strategies

2. **Market Data-Driven Recommendations**
   - Given the AI negotiation suggestion
   - When recommended amounts are displayed
   - Then they are based on verified market data, item condition, and time-on-market

3. **Counter-Offer Analysis**
   - Given an active negotiation thread
   - When the user receives a counter-offer
   - Then the AI suggests whether to accept, counter, or walk away with reasoning

4. **Algorithmic Fallback**
   - Given the AI API is unavailable
   - When negotiation strategy is requested
   - Then the system generates a rule-based strategy using market data fields from the Listing model

**FRs fulfilled:** FR-COMM-03

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|---|---|---|
| FR-COMM-03 | AC 1, AC 2, AC 3, AC 4 | @FR-COMM-03 @story-8-2 |

## Tasks / Subtasks

- [x] Task 1: Create `src/lib/negotiation-strategy.ts` module (AC: #1, #2, #4)
  - [x] 1.1 Define TypeScript interfaces: `NegotiationStrategyInput`, `NegotiationStrategy`, `CounterOfferAnalysis`
  - [x] 1.2 Implement lazy singleton OpenAI client (reuse pattern from `message-generator.ts` lines 85-96)
  - [x] 1.3 Build negotiation analysis prompt with market data context (verifiedMarketValue, demandLevel, daysListed, condition, negotiable flag)
  - [x] 1.4 Implement `generateNegotiationStrategy()` — returns initial offer, walk-away price, tactics, counter-offer suggestions
  - [x] 1.5 Implement `analyzeCounterOffer()` — takes seller counter-offer, returns accept/counter/walk-away recommendation
  - [x] 1.6 Implement `generateFallbackStrategy()` — algorithmic fallback using Listing model fields when API unavailable
  - [x] 1.7 Add JSON response parsing with validation guards (numeric range checks, sanity bounds)
  - [x] 1.8 Implement dual-layer cache: L1 in-memory keyed `negotiation:{listingId}`, L2 via `AiAnalysisCache` with `analysisType='negotiation'` and 4-hour TTL

- [x] Task 2: Create `POST /api/listings/[id]/negotiation-strategy` route (AC: #1, #2)
  - [x] 2.1 Create `app/api/listings/[id]/negotiation-strategy/route.ts` with POST handler
  - [x] 2.2 Add auth check via `getAuthUserId()`
  - [x] 2.3 Add tier enforcement: `checkFeatureAccess(tier, 'messaging')`
  - [x] 2.4 Validate listing exists and user owns it
  - [x] 2.5 Fetch listing with market data fields (verifiedMarketValue, askingPrice, condition, daysListed, negotiable, demandLevel, sellabilityScore, recommendedOffer)
  - [x] 2.6 Check if listing has verified market data; if not, return error with guidance to run analysis first
  - [x] 2.7 Call `generateNegotiationStrategy()` and return strategy response
  - [x] 2.8 Return response shape: `{ success: true, data: { strategy: {...}, isFallback: boolean } }`

- [x] Task 3: Create `POST /api/listings/[id]/counter-offer-analysis` route (AC: #3)
  - [x] 3.1 Create `app/api/listings/[id]/counter-offer-analysis/route.ts` with POST handler
  - [x] 3.2 Add auth + tier enforcement (same pattern as Task 2)
  - [x] 3.3 Validate request body: `counterOfferPrice` (required, numeric, finite, > 0, <= 999999)
  - [x] 3.4 Fetch listing with market data fields
  - [x] 3.5 Call `analyzeCounterOffer()` and return recommendation
  - [x] 3.6 Return response shape: `{ success: true, data: { recommendation: 'accept'|'counter'|'walkaway', suggestedCounterPrice?: number, reasoning: string, confidence: string } }`

- [x] Task 4: Write unit tests for negotiation-strategy module (AC: #1, #2, #3, #4)
  - [x] 4.1 Create `src/__tests__/negotiation-strategy.test.ts`
  - [x] 4.2 Test `generateNegotiationStrategy()` with full market data — verify output structure and field types
  - [x] 4.3 Test strategy with high-demand items (demandLevel='very_high') — initial offer should be closer to asking
  - [x] 4.4 Test strategy with stale/aging listings (daysListed > 30) — offer should be more aggressive
  - [x] 4.5 Test strategy with non-negotiable listings (negotiable=false) — tactics should reflect firm-price caution
  - [x] 4.6 Test strategy with no market comparables (verifiedMarketValue=null) — fallback to estimatedValue
  - [x] 4.7 Test strategy with overpriced listing (askingPrice > verifiedMarketValue) — walk-away price logic
  - [x] 4.8 Test `analyzeCounterOffer()` — accept when counter is at/below walk-away, counter when above, walk-away when unreasonable
  - [x] 4.9 Test `generateFallbackStrategy()` — verify algorithmic output when OpenAI unavailable
  - [x] 4.10 Test fallback when API key missing (should not throw, returns isFallback=true)
  - [x] 4.11 Test fallback when OpenAI call fails (network error, rate limit)
  - [x] 4.12 Test JSON parsing: malformed response triggers fallback
  - [x] 4.13 Test LLM response validation: negative offer price clamped to 0, offer > asking clamped to asking * 0.95
  - [x] 4.14 Test cache integration: L1 hit, L2 hit, full miss
  - [x] 4.15 Test numeric input validation: NaN, Infinity, negative values rejected

- [x] Task 5: Write acceptance tests (AC: #1, #2, #3, #4)
  - [x] 5.1 Add Story 8.2 scenarios to `test/acceptance/features/E-008-seller-communication-negotiation.feature`
  - [x] 5.2 Write scenarios for AC1: negotiation strategy with initial offer, walk-away, tactics
  - [x] 5.3 Write scenarios for AC2: strategy based on verified market data, condition, time-on-market
  - [x] 5.4 Write scenarios for AC3: counter-offer analysis (accept/counter/walk-away)
  - [x] 5.5 Write scenarios for AC4: algorithmic fallback when AI unavailable
  - [x] 5.6 Create step definitions `test/acceptance/step_definitions/E-008-negotiation-strategy.steps.ts`
  - [x] 5.7 Tag all scenarios with @E-008-S-<N> (continue numbering from 8.1's S-17+), @story-8-2, @FR-COMM-03

- [x] Task 6: Update requirements traceability matrix (AC: all)
  - [x] 6.1 Update FR-COMM-03 row with scenario IDs and feature file
  - [x] 6.2 Update coverage summary counts

## Definition of Done — Acceptance Tests

Write Gherkin scenarios in `test/acceptance/features/E-008-seller-communication-negotiation.feature` covering ALL acceptance criteria above.

**Required tags per scenario:**
- `@E-008-S-<N>` — sequential scenario number within Epic 8 (continue from Story 8.1's last number)
- `@story-8-2`
- Applicable requirement tags: `@FR-COMM-03`

**DoD Checklist:**
- [x] Gherkin acceptance tests written for all 4 ACs
- [x] Every scenario tagged with `@E-008-S-<N>`, `@story-8-2`, and `@FR-COMM-03`
- [x] Requirements traceability matrix updated at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`
- [x] All acceptance test scenarios pass
- [x] All unit/integration tests pass (`make test`)
- [x] Build succeeds (`make build`)

## Dev Notes

### Architecture Requirements — CRITICAL

**This story creates a NEW library module** (`src/lib/negotiation-strategy.ts`) and **two new API routes**. It does NOT modify the existing `message-generator.ts` or `llm-analyzer.ts` — it consumes data they produce.

### Distinction from Story 8.1

Story 8.1's `message-generator.ts` already supports `messageType='negotiation'` for generating outbound negotiation *messages* (the text a buyer sends). **Story 8.2 is strategy analysis** — it tells the user *what number to propose and why*, not *how to phrase it*. Different purpose, different module, different endpoints.

Eventually, 8.2 strategy output should feed into 8.1 message generation via `additionalContext`, but that integration is NOT in scope for this story.

### New Module: `src/lib/negotiation-strategy.ts`

**Follow these existing patterns exactly:**
- **OpenAI client**: Lazy singleton (same as `message-generator.ts` lines 85-96). Do NOT create a new client instance per call.
- **Model**: `gpt-4o-mini`, `temperature: 0.3`, request JSON-only responses
- **JSON extraction**: Parse with `/\{[\s\S]*\}/` regex (same as `message-generator.ts` line 171)
- **Error handling**: `try-catch` around OpenAI call → fall back to algorithmic strategy on ANY error (same as `message-generator.ts` lines 136-190)
- **Caching**: Dual-layer — L1 in-memory LRU keyed `negotiation:{listingId}`, L2 via `AiAnalysisCache` with `analysisType='negotiation'` (same pattern as `llm-analyzer.ts` lines 92-150). Use **4-hour TTL** (not 24h — negotiation data is more time-sensitive).

### TypeScript Interfaces

```typescript
export interface NegotiationStrategyInput {
  listingId: string;
  askingPrice: number;
  verifiedMarketValue: number | null;   // from llm-analyzer (Story 5.1)
  estimatedValue: number | null;        // from value-estimator (Story 4.1) — fallback
  condition: string | null;
  daysListed: number | null;
  negotiable: boolean | null;           // from value-estimator keyword detection
  demandLevel: string | null;           // 'low' | 'medium' | 'high' | 'very_high'
  sellabilityScore: number | null;      // 0-100
  platform: string;
  recommendedOffer: number | null;      // existing static recommendation (Story 5.1)
}

export interface NegotiationStrategy {
  initialOfferPrice: number;            // first offer to send
  walkAwayPrice: number;                // maximum to pay (profit floor)
  negotiationTactics: string[];         // e.g. ["cite comparable prices", "note listing age"]
  counterOfferSuggestions: CounterOfferStep[];
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
  isFallback: boolean;
}

export interface CounterOfferStep {
  roundNumber: number;                  // 1 = first counter, 2 = second, etc.
  ifSellerCountersAt: string;           // description of scenario
  suggestedResponse: number;            // our counter price
  reasoning: string;
}

export interface CounterOfferAnalysis {
  recommendation: 'accept' | 'counter' | 'walkaway';
  suggestedCounterPrice: number | null; // only if recommendation='counter'
  reasoning: string;
  confidence: 'low' | 'medium' | 'high';
  profitAtThisPrice: number;            // estimated profit if accepted
}
```

### LLM Response Validation — MANDATORY

The LLM can return nonsensical values. Apply these guards after JSON parsing:

```typescript
// Clamp initialOfferPrice: must be > 0 and < askingPrice
initialOfferPrice = Math.max(1, Math.min(parsed.initialOfferPrice, askingPrice * 0.95));

// Clamp walkAwayPrice: must be > 0 and <= askingPrice
walkAwayPrice = Math.max(1, Math.min(parsed.walkAwayPrice, askingPrice));

// walkAwayPrice must be >= initialOfferPrice
walkAwayPrice = Math.max(walkAwayPrice, initialOfferPrice);

// Ensure confidence is valid enum
confidence = ['low', 'medium', 'high'].includes(parsed.confidence) ? parsed.confidence : 'medium';

// Ensure tactics is array of strings
negotiationTactics = Array.isArray(parsed.negotiationTactics) 
  ? parsed.negotiationTactics.filter(t => typeof t === 'string').slice(0, 5)
  : ['Make a fair initial offer based on market data'];
```

### Algorithmic Fallback Strategy

When OpenAI is unavailable, compute strategy from Listing model fields:

```typescript
function generateFallbackStrategy(input: NegotiationStrategyInput): NegotiationStrategy {
  const marketValue = input.verifiedMarketValue ?? input.estimatedValue ?? input.askingPrice;
  const isNegotiable = input.negotiable !== false;
  const isAging = (input.daysListed ?? 0) > 14;
  const isHighDemand = input.demandLevel === 'high' || input.demandLevel === 'very_high';
  
  // Base offer: 75-90% of asking depending on conditions
  let offerPercent = 0.85;
  if (isAging) offerPercent -= 0.05;       // aging = more aggressive
  if (isHighDemand) offerPercent += 0.05;  // high demand = less room
  if (!isNegotiable) offerPercent = 0.95;  // firm price = close to asking
  
  const initialOffer = Math.round(input.askingPrice * offerPercent);
  const walkAway = Math.round(Math.min(input.askingPrice, marketValue * 0.87)); // 13% fee margin
  
  return { initialOfferPrice: initialOffer, walkAwayPrice: walkAway, ... isFallback: true };
}
```

### API Route Pattern

Follow `app/api/messages/generate/route.ts` exactly:

1. `getAuthUserId()` → `UnauthorizedError` if null
2. `checkFeatureAccess(tier, 'messaging')` → `ForbiddenError` if not allowed
3. Validate request body
4. `prisma.listing.findUnique()` with `select:` (minimal fields)
5. Verify `listing.userId === userId` → `ForbiddenError`
6. Call strategy function
7. Return `{ success: true, data: { ... } }`
8. `catch (error) { return handleError(error); }`

### Numeric Input Validation — REQUIRED

The counter-offer analysis endpoint accepts `counterOfferPrice` from the user. Validate:
```typescript
if (!Number.isFinite(counterOfferPrice) || counterOfferPrice <= 0 || counterOfferPrice > 999999) {
  throw new ValidationError('Counter-offer price must be a positive number under $1,000,000');
}
```

### Database — NO Migration Needed

Persist negotiation strategy results in existing `AiAnalysisCache` table:
- `analysisType = 'negotiation'`
- `analysisResult = JSON.stringify(NegotiationStrategy)`
- `expiresAt = now + 4 hours`

The `@@unique([listingId, analysisType])` constraint means one cached negotiation strategy per listing. This is correct — re-requesting strategy for the same listing returns cached result within TTL.

### Edge Cases to Handle

| Case | Behavior |
|---|---|
| `verifiedMarketValue` is null (scoring not run) | Fall back to `estimatedValue`; if also null, fall back to `askingPrice` as reference |
| `askingPrice` is 0 | Return `ValidationError('Listing has no asking price')` |
| `negotiable` is false ("firm price") | Strategy should note seller is unlikely to negotiate; initial offer closer to asking (95%) |
| Listing is overpriced (`askingPrice > verifiedMarketValue`) | Strategy should recommend waiting or making offer at market value |
| `daysListed` is null or 0 | Treat as "new listing" — less aggressive initial offer |
| No `demandLevel` data | Default to 'medium' for offer calculations |
| LLM returns offer > asking price | Clamp to `askingPrice * 0.95` |
| LLM returns negative offer | Clamp to `1` |

### AC #3 Scope Note

AC #3 (counter-offer analysis) requires detecting that a seller has responded with a counter-offer. **Inbound message capture is Story 8.5's responsibility.** For this story:
- Implement the `analyzeCounterOffer()` function and `/api/listings/[id]/counter-offer-analysis` endpoint
- The endpoint accepts the counter-offer price as **manual user input** (user types what the seller offered)
- When Story 8.5 ships, inbound messages will auto-detect counter-offers and trigger this analysis

### Files Established by Story 8.1 — DO NOT MODIFY

These files were created in Story 8.1 and should not be changed:
- `src/lib/message-generator.ts` — Message generation library
- `app/api/messages/generate/route.ts` — Message generation endpoint
- `src/__tests__/message-generator.test.ts` — Message generation tests

### Reusable Imports

```typescript
// Auth & errors
import { getAuthUserId } from '@/lib/auth';
import { UnauthorizedError, ForbiddenError, ValidationError, NotFoundError } from '@/lib/errors';
import { handleError } from '@/lib/errors';

// Database
import { prisma } from '@/lib/db';

// Tier enforcement
import { checkFeatureAccess } from '@/lib/subscription-tiers';

// OpenAI (create lazy singleton, do NOT import from message-generator or llm-analyzer)
import OpenAI from 'openai';

// Cache (if using shared LRU cache)
import { analysisCache } from '@/lib/cache';  // verify this export exists; if not, create local LRU
```

### Platform Fee Rates (for profit calculations in strategy)

From `value-estimator.ts`:
- eBay: 13%
- Mercari: 10%
- Facebook Marketplace: 5%
- OfferUp: 12.9%
- Craigslist: 0% (local cash)
- Default: 13%

Walk-away price should factor in platform fees: `walkAway = marketValue * (1 - feeRate) - minimumAcceptableProfit`

### Boundary Values & Thresholds

These are the exact numeric boundaries from existing code that negotiation logic must respect:

| Field | Min | Default | Max | Source |
|---|---|---|---|---|
| `valueScore` | 0 | 50 | 100 | `value-estimator.ts:246` (clamped) |
| `sellabilityScore` | 0 | 50 | 100 | `llm-analyzer.ts:242` (clamped) |
| `profitPotential` | negative (cap score to 10) | — | $200+ (boost score +20) | `value-estimator.ts:249-252` |
| `discountPercent` | negative (overpriced) | 50% (user setting default) | unbounded | `value-estimator.ts:234` |
| `feeRate` | 0% (Craigslist) | 13% (eBay) | 13% | `value-estimator.ts:239` |
| `askingPrice` | 0.01 | — | 999999 | No explicit bounds; validate in route |
| `daysListed` | 0 (new listing) | — | 365+ | Schema line 44; no bounds |
| `expectedDaysToSell` | 1 | 14 | 365+ | `llm-analyzer.ts:244` |

**Aging thresholds for negotiation tactics** (define in this story):
- `daysListed <= 3`: "Hot/New" — less aggressive offers (seller has leverage)
- `daysListed 4-14`: "Normal" — standard negotiation approach
- `daysListed 15-30`: "Aging" — moderately aggressive (-5% from base offer)
- `daysListed > 30`: "Stale" — aggressive offers (-10% from base); seller likely motivated

**Minimum worthwhile flip** (at 13% eBay fee):
- Must clear `askingPrice * 0.13` in fees + minimum $10 profit to justify effort
- Walk-away price must never exceed: `verifiedMarketValue * (1 - feeRate) - 10`

### LLM Prompt Design

**System prompt** (use this structure):
```
You are an expert marketplace negotiation strategist. Analyze the listing economics
and seller signals to recommend an optimal offer strategy. Base your recommendations
on verified market data, item condition, and listing age. Always respond with valid
JSON only. Be conservative — it's better to offer slightly too low than overpay.
```

**User prompt data points to include:**
1. Asking price vs. verified market value (+ discount %)
2. Item condition and completeness
3. Days listed (time-on-market pressure)
4. Demand level and sold volume (30/60/90 day)
5. Seller reputation (rating, review count, account age)
6. Platform-specific norms (Craigslist = always negotiate, eBay = Best Offer feature)
7. Negotiable flag (seller indicated flexibility)
8. Shipping cost impact on profit margins

**Requested JSON schema from LLM:**
```json
{
  "initialOfferPrice": 80,
  "walkAwayPrice": 95,
  "negotiationTactics": ["cite comparable sold prices", "note listing age"],
  "counterOfferSuggestions": [
    {
      "roundNumber": 1,
      "ifSellerCountersAt": "seller counters at $110",
      "suggestedResponse": 88,
      "reasoning": "Meet halfway; comparable items sold at $85-90"
    }
  ],
  "confidence": "high",
  "reasoning": "Item is 25% below verified market value of $130..."
}
```

**Max tokens**: 600 (prompt ~1150 tokens input, ~600 output; cost ~$0.0005/call with gpt-4o-mini)

### Error Taxonomy for Endpoints

| Error | HTTP | When | Error Class |
|---|---|---|---|
| Not authenticated | 401 | No session cookie | `UnauthorizedError` |
| FREE tier user | 403 | `checkFeatureAccess` fails | `ForbiddenError` |
| User doesn't own listing | 403 | `listing.userId !== userId` | `ForbiddenError` |
| Missing listingId | 422 | Route param missing | `ValidationError` |
| Invalid counterOfferPrice | 422 | NaN, negative, > 999999 | `ValidationError` |
| Listing not found | 404 | `findUnique` returns null | `NotFoundError` |
| No market data available | 422 | `verifiedMarketValue` and `estimatedValue` both null | `ValidationError` with guidance |
| `askingPrice` is 0 | 422 | Listing has no price | `ValidationError` |
| OpenAI API failure | — | Network/rate-limit/auth error | Falls back silently to algorithmic strategy |
| OpenAI returns bad JSON | — | Parse failure | Falls back silently to algorithmic strategy |

**Retryable errors** (include `retryable: true` in response): `RATE_LIMITED`, `SERVICE_UNAVAILABLE`, `EXTERNAL_SERVICE_ERROR`

### Observability & Logging

The project uses **Pino structured logger** (`src/lib/logger.ts`) and **in-memory metrics** (`src/lib/metrics.ts`). Follow existing patterns:

```typescript
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/metrics';
import { captureError } from '@/lib/error-tracker';

// Track API latency
const end = logger.timed('negotiation_strategy_generation');
try {
  const strategy = await generateNegotiationStrategy(input);
  metrics.increment('negotiation_strategy_generated');
  if (strategy.isFallback) metrics.increment('negotiation_fallback_used');
  end(); // logs duration
  return strategy;
} catch (error) {
  metrics.increment('negotiation_generation_error');
  captureError(error, { route: '/api/listings/[id]/negotiation-strategy', userId });
  end();
  throw error;
}
```

**Metrics to track:**
- `negotiation_strategy_generated` — successful generations (counter)
- `negotiation_fallback_used` — algorithmic fallback activations (counter)
- `negotiation_cache_hit` / `negotiation_cache_miss` — cache performance (counters)
- `negotiation_counter_offer_analyzed` — counter-offer endpoint calls (counter)
- `negotiation_generation_error` — failures (counter)

### Zod Validation Schemas

The project uses Zod for validation (`src/lib/validations.ts`). Add schemas for request bodies:

```typescript
import { z } from 'zod';

export const NegotiationStrategyRequestSchema = z.object({
  maxBudget: z.coerce.number().min(0).optional(),
  negotiationContext: z.string().max(2000).optional(),
});

export const CounterOfferAnalysisRequestSchema = z.object({
  counterOfferPrice: z.coerce.number().min(0.01).max(999999),
  ourPreviousOffer: z.coerce.number().min(0.01).max(999999),
});
```

### Testing Patterns — Mock Setup

Follow the established mock patterns exactly:

**OpenAI mock** (from `message-generator.test.ts` lines 24-33):
```typescript
const mockCreate = jest.fn();
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }));
});
```

**Dual-layer cache mock** (from `llm-analyzer.test.ts` lines 7-24):
```typescript
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    aiAnalysisCache: {
      findFirst: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
  },
}));

jest.mock('@/lib/cache', () => ({
  analysisCache: {
    get: jest.fn().mockReturnValue(undefined),
    set: jest.fn(),
    delete: jest.fn(),
  },
}));
```

**Coverage thresholds** (from `jest.config.js`): branches 93%, functions 99%, lines 98%, statements 98%. New code must maintain these.

### Backward Compatibility — Confirmed Safe

- Adding `analysisType='negotiation'` to `AiAnalysisCache` does NOT affect existing queries — `llm-analyzer.ts` explicitly filters `analysisType: 'openai'` (line 104) and `claude-analyzer.ts` filters `analysisType: 'claude'`
- New API routes `/api/listings/[id]/negotiation-strategy` and `/counter-offer-analysis` don't conflict with existing routes (`/api/listings/[id]/description`, `/api/listings/[id]/market-value`)
- Each module maintains its own OpenAI singleton — no cross-module interference

### Hot Item / Bidding War Detection

If seller's counter-offer **exceeds asking price** (bidding war scenario):
```typescript
if (sellerCounterPrice > askingPrice * 1.1 && demandLevel === 'very_high') {
  return {
    recommendation: 'walkaway',
    reasoning: 'Seller counter exceeds asking price with very high demand — price escalation detected. Risk of overpaying.',
    confidence: 'high',
  };
}
```

### Market Data Freshness Check

Before generating strategy, validate market data is not stale:
```typescript
// If verifiedMarketValue is >14 days old, add low-confidence warning
const marketDataAge = listing.marketDataDate
  ? Math.floor((Date.now() - listing.marketDataDate.getTime()) / (1000 * 60 * 60 * 24))
  : null;

if (marketDataAge !== null && marketDataAge > 14) {
  // Still generate strategy but set confidence to 'low' and add warning
  strategy.confidence = 'low';
  strategy.reasoning += ' Note: Market data is ' + marketDataAge + ' days old — recommendations may not reflect current market.';
}
```

### Cache TTL Configuration

Make the cache TTL configurable via environment variable:
```typescript
const NEGOTIATION_CACHE_TTL_HOURS = parseInt(process.env.NEGOTIATION_STRATEGY_CACHE_TTL_HOURS || '4', 10);
```

### Cost Estimate

- **Per call**: ~$0.0005 (gpt-4o-mini, 1150 input + 600 output tokens)
- **Expected cache hit rate**: 65% (users revisit listings within 4h window)
- **At 2000 PRO users, 2 calls/user/day**: ~$23/month after caching
- **gpt-4o alternative**: 27x more expensive ($630/month) — not justified for structured JSON output

### Data Available from Listing Model (25+ fields)

The negotiation prompt can leverage all of these populated fields:

**Market Data**: `verifiedMarketValue`, `estimatedValue`, `estimatedLow`, `estimatedHigh`, `trueDiscountPercent`, `demandLevel`, `soldVolume30Days`, `soldVolume60Days`, `soldVolume90Days`

**Seller Data**: `sellerName`, `sellerRating`, `sellerReviewCount`, `sellerAccountAgeDays`

**Item Condition**: `condition`, `identifiedCondition`, `completenessLabel`, `authenticityRisk`

**Logistics**: `shippable`, `estimatedShippingCost`, `sizeCategory`, `pickupDistanceMiles`

**Price Strategy**: `askingPrice`, `recommendedOffer`, `recommendedList`, `negotiable`, `daysListed`, `expectedDaysToSell`, `resaleStrategy`

### Compliance Note

The privacy policy (`app/privacy/page.tsx`) mentions Gemini API but does NOT explicitly mention OpenAI for negotiation features. A privacy policy update is needed (separate task, not blocking for this story). The negotiation response should include a disclaimer field:
```typescript
disclaimer: 'AI-generated suggestion for informational purposes only. Not financial advice.'
```

## Project Structure Notes

- New routes follow existing pattern: `app/api/listings/[id]/description/route.ts` and `app/api/listings/[id]/market-value/route.ts` are peers
- New module `src/lib/negotiation-strategy.ts` follows existing `src/lib/message-generator.ts` and `src/lib/llm-analyzer.ts` pattern
- No conflicts or variances with unified project structure

### References

- [Source: src/lib/message-generator.ts] — OpenAI lazy singleton, JSON extraction, fallback patterns
- [Source: src/lib/llm-analyzer.ts] — Dual-layer cache, sellability analysis prompt, market data integration
- [Source: src/lib/value-estimator.ts] — Boundary values, fee rates, negotiability detection, profit calculation
- [Source: src/lib/errors.ts] — Error hierarchy, RFC 7807 response format, retryable error codes
- [Source: src/lib/logger.ts] — Pino structured logging with timed() method
- [Source: src/lib/metrics.ts] — In-memory metrics with counters, gauges, histograms
- [Source: src/lib/error-tracker.ts] — Sentry integration with captureError()
- [Source: src/lib/validations.ts] — Zod schema patterns for request validation
- [Source: src/lib/subscription-tiers.ts] — Tier limits, checkFeatureAccess() function
- [Source: src/lib/claude-analyzer.ts] — Alternative LLM pattern (viable future optimization)
- [Source: prisma/schema.prisma] — Listing model fields, AiAnalysisCache model, Message model
- [Source: app/api/messages/generate/route.ts] — Route pattern (auth, tier, validate, fetch, generate, persist, respond)
- [Source: src/__tests__/message-generator.test.ts] — OpenAI mock pattern
- [Source: src/__tests__/llm-analyzer.test.ts] — Dual-layer cache mock pattern

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — clean implementation with no blocking issues.

### Completion Notes List

- Created `src/lib/negotiation-strategy.ts` with full AI-powered negotiation strategy generation including:
  - OpenAI gpt-4o-mini integration with lazy singleton pattern
  - Dual-layer cache (L1 in-memory LRU + L2 AiAnalysisCache with 4h TTL)
  - LLM response validation with numeric clamping and enum guards
  - Algorithmic fallback strategy with aging thresholds (hot/normal/aging/stale)
  - Counter-offer analysis with accept/counter/walkaway recommendations
  - Bidding war detection for high-demand items
  - Platform-specific fee rate calculations
  - Structured logging, metrics tracking, and error capture
- Created POST `/api/listings/[id]/negotiation-strategy` route with auth, tier enforcement, ownership validation
- Created POST `/api/listings/[id]/counter-offer-analysis` route with numeric input validation (Zod-style)
- 34 unit tests covering all ACs: AI generation, fallback, validation, caching, edge cases
- 13 acceptance test scenarios (S-17 through S-29) with dual-tagging @FR-COMM-03 @story-8-2
- All 177 test suites pass (3741 tests), build succeeds, no lint errors in new code
- Requirements traceability matrix updated for FR-COMM-03

## File List

- `src/lib/negotiation-strategy.ts` — NEW: Negotiation strategy generation library (OpenAI + fallback + caching)
- `app/api/listings/[id]/negotiation-strategy/route.ts` — NEW: POST strategy endpoint
- `app/api/listings/[id]/counter-offer-analysis/route.ts` — NEW: POST counter-offer analysis endpoint
- `src/__tests__/negotiation-strategy.test.ts` — NEW: 37 unit tests covering all ACs + freshness check
- `src/__tests__/api/negotiation-strategy.test.ts` — NEW: 14 route-level tests (auth, tier, validation, success)
- `src/__tests__/api/counter-offer-analysis.test.ts` — NEW: 12 route-level tests (auth, tier, body validation, success)
- `test/acceptance/features/E-008-seller-communication-negotiation.feature` — MODIFIED: Added 13 Story 8.2 scenarios (S-17 through S-29)
- `test/acceptance/step_definitions/E-008-negotiation-strategy.steps.ts` — NEW: Step definitions for negotiation scenarios
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` — MODIFIED: FR-COMM-03 coverage updated
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIED: 8-2 status → review
- `_bmad-output/implementation-artifacts/epic-8/8-2-ai-negotiation-strategy.md` — MODIFIED: Tasks marked complete, DoD, status, change log

## Senior Developer Review (AI)

**Reviewer:** Stephenboyett
**Date:** 2026-03-31
**Outcome:** Approved with fixes applied

### Issues Found & Fixed

| # | Severity | Issue | Fix |
|---|---|---|---|
| H-1 | HIGH | Undeclared variable `aiUnavailableForNegotiation` in step defs (line 90) — implicit global, never consumed | Declared with `let`, reset in `Given` steps |
| H-2 | HIGH | Counter-offer step defs duplicate library logic inline instead of calling actual function | Exported `generateFallbackCounterAnalysis()`, step now calls it directly |
| M-1 | MEDIUM | Market Data Freshness Check from Dev Notes not implemented (marketDataDate >14d → low confidence) | Added `applyMarketDataFreshnessCheck()`, added `marketDataDate` to interface/routes/select |
| M-2 | MEDIUM | No route-level API tests for either endpoint | Created 14 + 12 route tests covering auth, tier, validation, listing lookup, success |
| M-3 | MEDIUM | `request.json()` parse error returns 500 instead of 422 | Added try-catch returning `ValidationError('Invalid request body')` |

### Remaining (Low, not fixed)

- L-1: Zod validation schemas from Dev Notes not used (manual validation works correctly)
- L-2: Negotiation strategy POST accepts no request body (optional `maxBudget`/`negotiationContext` not implemented — not in ACs)
- L-3: Resolved by H-2 fix (`generateFallbackCounterAnalysis` now exported)

### Test Results After Fix

- 180 test suites, 3794 tests passed, 0 failures
- 63 tests across negotiation/counter-offer files (37 unit + 14 route + 12 route)
- TypeScript strict mode: 0 new errors in changed files

## Change Log

| Date | Change | Author |
|---|---|---|
| 2026-03-31 | Story created with 10-method advanced elicitation analysis | SM Agent |
| 2026-03-31 | Applied 20 additional elicitation methods (boundary values, state machine, prompt engineering, error taxonomy, observability, API contract, testability, backward compatibility, cognitive load, tech debt, stakeholder impact, competitive benchmarking, constraint analysis, regulatory compliance, cost-benefit, scenario planning, risk-value matrix, accessibility, SWOT, root cause analysis) | SM Agent |
| 2026-03-31 | Implementation complete: negotiation-strategy module, 2 API routes, 34 unit tests, 13 acceptance tests. All tests pass. Status → review. | Dev Agent (Claude Opus 4.6) |
| 2026-03-31 | Code review: Fixed 2 HIGH + 3 MEDIUM issues. Added market data freshness check, route-level API tests (26 new), body parsing error handling, exported fallback function, fixed step def variable. 3 LOW items noted but not blocking. | Review Agent (Claude Opus 4.6) |
