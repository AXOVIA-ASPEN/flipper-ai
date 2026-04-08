# Story 9.1: AI Title & Description Generation

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID:

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want AI-generated optimized titles and descriptions for resale listings,
So that my listings attract buyers and rank well in marketplace search.

## Acceptance Criteria

1. **SEO-Optimized Title Generation**
   - Given a purchased item ready for resale
   - When the user clicks "Generate Listing"
   - Then GPT-4o-mini generates an SEO-optimized title (max 80 chars for eBay) with key selling points

2. **Platform-Specific Title Conventions**
   - Given title generation
   - When the target platform is specified
   - Then the title follows platform-specific conventions (eBay: keyword-dense, FBMP: conversational, Mercari: concise)

3. **Platform-Specific Description Generation**
   - Given a purchased item ready for resale
   - When description generation runs
   - Then GPT-4o-mini generates a platform-specific description highlighting value, condition, and key features

4. **Algorithmic Fallback**
   - Given AI API unavailability
   - When title or description generation fails
   - Then algorithmic template fallbacks generate reasonable listings using item data fields

5. **Editable Draft Display**
   - Given generated title and description
   - When displayed to the user
   - Then both are editable before posting

**FRs fulfilled:** FR-RELIST-01, FR-RELIST-02, FR-RELIST-07

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|---|---|---|
| FR-RELIST-01 | AC 1, AC 2 | @FR-RELIST-01 @story-9-1 |
| FR-RELIST-02 | AC 3 | @FR-RELIST-02 @story-9-1 |
| FR-RELIST-07 | AC 4 | @FR-RELIST-07 @story-9-1 |

## Tasks / Subtasks

- [x] Task 1: Create unified resale content generation endpoint `POST /api/listings/[id]/generate-resale-content` (AC: #1, #2, #3, #4)
  - [x] 1.1 Create `app/api/listings/[id]/generate-resale-content/route.ts` with POST handler
  - [x] 1.2 Auth check via `getAuthUserId()`
  - [x] 1.3 Tier enforcement: `checkFeatureAccess(tier, 'ebayCrossListing')`
  - [x] 1.4 Accept `{ platform?: string, useLLM?: boolean }` in request body; `platform` defaults to `'all'`, `useLLM` defaults to `true`
  - [x] 1.5 Fetch listing with identification fields (brand, model, variant, condition, category, askingPrice, etc.)
  - [x] 1.6 Verify listing ownership (scoped query: `{ id, userId }`)
  - [x] 1.7 Build `TitleGeneratorInput` and `DescriptionGeneratorInput` from listing data directly (see Dev Notes — do NOT use `fromIdentification()` as signatures differ between modules and require `ItemIdentification` not raw listing data)
  - [x] 1.8 **Normalize platform casing:** Listing model stores UPPERCASE (`CRAIGSLIST`, `EBAY`), generators expect lowercase (`ebay`, `mercari`). Apply `.toLowerCase()` before passing to any generator function
  - [x] 1.9 When `platform='all'` AND `useLLM=true`: loop over `['ebay', 'mercari', 'facebook', 'offerup']` and call `generateLLMTitle()` + `generateLLMDescription()` for each (WARNING: `generateTitlesForAllPlatforms()` is algorithmic-only — it ignores `useLLM` param despite the story's earlier claim)
  - [x] 1.10 When `platform='all'` AND `useLLM=false`: use `generateTitlesForAllPlatforms()` + `generateDescriptionsForAllPlatforms()` (these are synchronous, algorithmic-only)
  - [x] 1.11 When `platform` is specific: call `generateLLMTitle()`/`generateAlgorithmicTitle()` + `generateLLMDescription()`/`generateAlgorithmicDescription()` based on `useLLM`
  - [x] 1.12 Handle `platform='craigslist'`: generators don't include Craigslist — map to `'generic'` style
  - [x] 1.13 Return `{ success: true, data: { titles, descriptions, primary: { title, description }, source: 'ai'|'template' } }`

- [x] Task 2: Integrate auto-generation into PostingQueueItem creation (AC: #1, #3)
  - [x] 2.1 In `app/api/posting-queue/route.ts` POST handler: when `title` and `description` are NOT provided in the request body, auto-generate using existing generators
  - [x] 2.2 Build generator input from the associated listing's identification fields
  - [x] 2.3 Call `generateAlgorithmicTitle()` + `generateAlgorithmicDescription()` (algorithmic = fast, no API key needed, suitable for batch creation)
  - [x] 2.4 Populate the PostingQueueItem's `title` and `description` fields with generated content
  - [x] 2.5 Ensure this works for both single-platform and batch-platform creation modes
  - [x] 2.6 **Normalize platform casing**: PostingQueueItem `targetPlatform` is UPPERCASE but generators expect lowercase — call `.toLowerCase()` before passing to generator functions
  - [x] 2.7 Handle Craigslist mapping: if `targetPlatform === 'CRAIGSLIST'`, pass `'generic'` to generator functions

- [x] Task 3: Integrate ResaleContentEditor into listing detail page (AC: #5)
  - [x] 3.1 Create `src/components/ResaleContentEditor.tsx` (Client Component)
  - [x] 3.2 Props: `listingId: string`, `platform: string`, `initialTitle?: string`, `initialDescription?: string`, `onSave: (title, description) => void`
  - [x] 3.3 "Generate" button calls `POST /api/listings/[id]/generate-resale-content` with selected platform
  - [x] 3.4 Display generated title in `<input>` (editable, shows char count vs platform limit)
  - [x] 3.5 Display generated description in `<textarea>` (editable, shows word count vs platform limit)
  - [x] 3.6 Platform selector dropdown to switch platform and regenerate
  - [x] 3.7 "Use Algorithmic" / "Use AI" toggle (maps to `useLLM` param)
  - [x] 3.8 Loading state during generation, error toast on failure
  - [x] 3.9 "Save to Queue" button calls onSave callback with current title/description
  - [x] 3.10 Dark mode support (follow `app/dashboard/page.tsx` pattern)
  - [x] 3.11 Integrate into `app/listings/[id]/page.tsx` — add a "Generate Resale Listing" section below the AI Analysis block, conditionally rendered when `listing.opportunity?.status` is `PURCHASED` or later
  - [x] 3.12 Platform char limits displayed next to title input: eBay 80, Mercari 40, Facebook 99, OfferUp 70 — highlight red when exceeded
  - [x] 3.13 Description word count displayed next to textarea: eBay 500, Mercari 200, Facebook 250, OfferUp 200 — highlight red when exceeded

- [x] Task 4: Write unit tests for the resale content endpoint (AC: #1, #2, #3, #4)
  - [x] 4.1 Create `src/__tests__/api/listing-generate-resale-content.test.ts`
  - [x] 4.2 Test auth (401), tier enforcement (403), validation, listing not found (404)
  - [x] 4.3 Test listing ownership check (scoped query)
  - [x] 4.4 Test `platform='all'` calls multi-platform generators
  - [x] 4.5 Test `platform='ebay'` calls single-platform generators
  - [x] 4.6 Test `useLLM=false` uses algorithmic generators
  - [x] 4.7 Test fallback when OpenAI key missing (still returns content via algorithmic)
  - [x] 4.8 Test response shape matches expected contract
  - [x] 4.9 Test `platform='craigslist'` maps to `'generic'` generator platform
  - [x] 4.10 Test listing without identification data returns content with warnings array
  - [x] 4.11 Test `useLLM=true` + `platform='all'` calls LLM per-platform (not `generateTitlesForAllPlatforms`)
  - [x] 4.12 Test UPPERCASE platform input is normalized to lowercase before generators

- [x] Task 5: Write unit tests for posting queue auto-generation (AC: #1, #3)
  - [x] 5.1 Update `src/__tests__/api/posting-queue.test.ts`
  - [x] 5.2 Test: POST without title/description auto-generates from listing data
  - [x] 5.3 Test: POST with explicit title/description uses provided values (no generation)
  - [x] 5.4 Test: batch creation auto-generates platform-specific titles for each target
  - [x] 5.5 Test: auto-generation normalizes platform casing (EBAY → ebay)
  - [x] 5.6 Test: auto-generation maps CRAIGSLIST → generic platform
  - [x] 5.7 Test: auto-generation handles listing with null identification fields gracefully

- [x] Task 6: Write acceptance tests (AC: all)
  - [x] 6.1 Create `test/acceptance/features/E-009-cross-platform-resale-listing.feature`
  - [x] 6.2 Create `test/acceptance/step_definitions/E-009-title-description-generation.steps.ts`
  - [x] 6.3 Write scenarios for AC1: SEO-optimized title generation (eBay max 80 chars)
  - [x] 6.4 Write scenarios for AC2: platform-specific title conventions (eBay, Facebook, Mercari, OfferUp)
  - [x] 6.5 Write scenarios for AC3: platform-specific description generation
  - [x] 6.6 Write scenarios for AC4: algorithmic fallback when AI unavailable
  - [x] 6.7 Write scenarios for AC5: editable draft display (generated content is mutable)
  - [x] 6.8 Tag all scenarios with `@E-009-S-<N>` (sequential starting from 1), `@story-9-1`, and `@FR-RELIST-01`/`@FR-RELIST-02`/`@FR-RELIST-07`

- [x] Task 7: Update requirements traceability matrix (AC: all)
  - [x] 7.1 Update FR-RELIST-01 row with scenario IDs and feature file
  - [x] 7.2 Update FR-RELIST-02 row with scenario IDs and feature file
  - [x] 7.3 Update FR-RELIST-07 row with scenario IDs and feature file
  - [x] 7.4 Update coverage summary counts

## Definition of Done — Acceptance Tests

Write Gherkin scenarios in `test/acceptance/features/E-009-cross-platform-resale-listing.feature` covering ALL acceptance criteria above.

**Required tags per scenario:**
- `@E-009-S-<N>` — sequential scenario number within Epic 9
- `@story-9-1`
- Applicable requirement tags: `@FR-RELIST-01`, `@FR-RELIST-02`, `@FR-RELIST-07`

**DoD Checklist:**
- [x] Gherkin acceptance tests written for all 5 ACs
- [x] Every scenario tagged with `@E-009-S-<N>`, `@story-9-1`, and relevant `@FR-RELIST-*` tags
- [x] Requirements traceability matrix updated at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`
- [x] All acceptance test scenarios pass
- [x] All unit/integration tests pass (`make test`)
- [x] Build succeeds (`make build`)

## Dev Notes

### CRITICAL: Existing Infrastructure — DO NOT RECREATE

The title and description generators **already exist** with full algorithmic + LLM support. You MUST reuse them:

| File | Lines | What It Does | Status |
|---|---|---|---|
| `src/lib/title-generator.ts` | 217 | Algorithmic + LLM title generation, all 5 platforms | EXISTS — unit tests passing |
| `src/lib/description-generator.ts` | 251 | Algorithmic + LLM description generation, all 5 platforms | EXISTS — unit tests passing |
| `app/api/listings/[id]/description/route.ts` | ~120 | Single-platform description generation for a listing | EXISTS — generates title+description |
| `app/api/posting-queue/route.ts` | ~180 | Posting queue CRUD (GET/POST) | EXISTS — accepts optional title/description |
| `src/lib/posting-queue-processor.ts` | 142 | Background queue processor with platform adapters | EXISTS |
| `src/lib/validations.ts` | ~167 | Zod schemas for PostingQueueItem | EXISTS |
| `src/__tests__/lib/title-generator.test.ts` | — | Unit tests for title generator | EXISTS |
| `src/__tests__/lib/description-generator.test.ts` | — | Unit tests for description generator | EXISTS |
| `src/__tests__/api/posting-queue.test.ts` | — | API route tests for posting queue | EXISTS |

**What needs to be BUILT (the gap):**
1. A **unified resale content endpoint** that generates both title AND description for one or all platforms in a single call
2. **Auto-generation integration** in the posting queue creation flow (populate title/description when not provided)
3. A **ResaleContentEditor component** for the review/edit UI
4. **Acceptance tests** — the E-009 feature file does not exist yet

### CRITICAL GOTCHAS — Advanced Elicitation Findings

**G1 — `generateTitlesForAllPlatforms()` and `generateDescriptionsForAllPlatforms()` are ALGORITHMIC ONLY**
Despite the story's AC1 mentioning GPT-4o-mini, these multi-platform functions (title-generator.ts:116-125, description-generator.ts:137-149) ONLY call the algorithmic generators — they never invoke the LLM. For the `useLLM=true` + `platform='all'` case, you MUST loop over platforms and call `generateLLMTitle()` + `generateLLMDescription()` individually for each.

**G2 — `fromIdentification()` signatures DIFFER between modules — do NOT use**
`title-generator.ts::fromIdentification(id: ItemIdentification)` takes just the identification object. `description-generator.ts::fromIdentification(id: ItemIdentification, askingPrice: number, extras?: {...})` requires price and extras. Both expect `ItemIdentification` from `llm-identifier.ts`, not raw Listing fields. Build inputs directly from listing data instead.

**G3 — Platform casing mismatch: Listing=UPPERCASE, generators=lowercase**
Listing model stores `platform: 'CRAIGSLIST'` (uppercase). Generators use `'ebay'`, `'mercari'`, etc. (lowercase). `PLATFORM_LIMITS` and `PLATFORM_STYLES` are keyed lowercase. Always `.toLowerCase()` before passing to generators.

**G4 — Craigslist NOT in generator platform arrays**
`generateTitlesForAllPlatforms()` generates for `['ebay', 'mercari', 'facebook', 'offerup']` — no Craigslist. Same for descriptions. But Craigslist IS a valid target platform in the PostingQueueItem. Map `'craigslist'` to `'generic'` when calling generators.

**G5 — Existing `/api/listings/[id]/description` does NOT use generator modules**
This route builds its OWN OpenAI prompt inline (lines 63-86) and has its OWN fallback function. It does NOT import from `title-generator.ts` or `description-generator.ts`. Do NOT follow this endpoint's pattern for the new endpoint. Use the generator modules.

**G6 — No rate limiting exists for LLM generation endpoints**
`src/lib/rate-limiter.ts` has configs for `/api/analyze` and `/api/scrape` but NO entry for generate-resale-content. Add a config: `'/api/listings': { limit: 10, windowSeconds: 60 }` or similar to prevent abuse of the OpenAI-calling endpoint.

**G7 — PostingQueueItem title max 200 chars (Zod) ≠ platform char limits**
The Zod validation in `validations.ts` allows `title.max(200)` but eBay titles must be ≤80 chars. The DB accepts 200 but the platform rejects >80. The generator enforces the platform limit internally, but if a user edits the title in the UI to exceed the platform limit, the save should still work (DB allows it) but warn the user.

**G8 — Listing detail page has NO resale generation UI currently**
`app/listings/[id]/page.tsx` shows AI analysis, comparable sales, and Opportunity status but no "Generate Listing" button. Task 3.11 adds the ResaleContentEditor integration here. Only show it when the listing has an Opportunity with status `PURCHASED`, `LISTED`, or `SOLD` (not IDENTIFIED or PASSED).

**G9 — Listings without identification data**
If `identifiedBrand`, `identifiedModel`, `identifiedCondition` are all null (listing not yet AI-analyzed), the generators still work but produce generic titles like "Item - good". The endpoint should return a warning in the response: `warnings: ['Listing has not been AI-analyzed. Run analysis first for better results.']`

**G10 — `description-generator.ts` always adds shipping note**
The algorithmic generator always appends a shipping note (line 117-119). For Craigslist and FBMP it says "Local pickup available", for others "Ships quickly with tracking". This is correct behavior but the user should know it's auto-included and can be edited out.

### Architecture Requirements

**Existing Generator Functions (from `title-generator.ts`):**
```typescript
generateAlgorithmicTitle(input: TitleGeneratorInput, platform?: string): GeneratedTitle  // SYNC
generateLLMTitle(input: TitleGeneratorInput, platform?: string): Promise<GeneratedTitle>  // ASYNC, falls back to algorithmic
generateTitlesForAllPlatforms(input: TitleGeneratorInput): TitleGeneratorResult  // SYNC, ALGORITHMIC ONLY (no useLLM param!)
fromIdentification(id: ItemIdentification): TitleGeneratorInput  // DO NOT USE — build input from listing fields directly
```

**Existing Generator Functions (from `description-generator.ts`):**
```typescript
generateAlgorithmicDescription(input: DescriptionGeneratorInput, platform?: string): GeneratedDescription  // SYNC
generateLLMDescription(input: DescriptionGeneratorInput, platform?: string): Promise<GeneratedDescription>  // ASYNC, falls back to algorithmic
generateDescriptionsForAllPlatforms(input: DescriptionGeneratorInput): DescriptionGeneratorResult  // SYNC, ALGORITHMIC ONLY
fromIdentification(id: ItemIdentification, askingPrice: number, extras?: {...}): DescriptionGeneratorInput  // Different signature! DO NOT USE
```

**Platform Character Limits (from `title-generator.ts`):**
- eBay: 80 chars
- Mercari: 40 chars
- Facebook: 99 chars
- OfferUp: 70 chars
- Generic: 80 chars

**Platform Description Styles (from `description-generator.ts`):**
- eBay: 500 words max, professional/detailed, structured sections
- Mercari: 200 words max, casual/friendly, concise paragraphs
- Facebook: 250 words max, conversational/local, short paragraphs
- OfferUp: 200 words max, casual/direct, bullet points preferred
- Generic: 300 words max, clear/informative, structured paragraphs

### Building Generator Inputs from Listing Data

The listing model has `identifiedBrand`, `identifiedModel`, `identifiedVariant`, `identifiedCondition`, `category` fields populated by Epic 4's LLM identification. Build inputs directly — do NOT use `fromIdentification()` (see G2).

```typescript
// Fetch listing with Opportunity data for purchase price
const listing = await prisma.listing.findFirst({
  where: { id, userId },
  include: { opportunity: { select: { purchasePrice: true, status: true } } },
});

// Check identification data completeness — warn if missing
const hasIdentification = listing.identifiedBrand || listing.identifiedModel;
const warnings: string[] = [];
if (!hasIdentification) {
  warnings.push('Listing has not been AI-analyzed. Run analysis first for better results.');
}

const titleInput: TitleGeneratorInput = {
  brand: listing.identifiedBrand || null,
  model: listing.identifiedModel || null,
  variant: listing.identifiedVariant || null,
  condition: listing.identifiedCondition || listing.condition || 'good',
  category: listing.category || null,
  keywords: listing.tags ? listing.tags.split(',').map(t => t.trim()) : [],
};

const descInput: DescriptionGeneratorInput = {
  brand: listing.identifiedBrand || null,
  model: listing.identifiedModel || null,
  variant: listing.identifiedVariant || null,
  condition: listing.identifiedCondition || listing.condition || 'good',
  category: listing.category || null,
  askingPrice: listing.recommendedList || listing.verifiedMarketValue || listing.askingPrice,
  originalPrice: listing.askingPrice, // original asking price from the marketplace
  defects: [],
  features: [],
  sellerNotes: listing.notes || null,
};

// Normalize platform for generators: UPPERCASE → lowercase, CRAIGSLIST → generic
function normalizeGeneratorPlatform(platform: string): string {
  const lower = platform.toLowerCase();
  return lower === 'craigslist' ? 'generic' : lower;
}
```

### Tier Enforcement

Cross-listing is gated to **PRO tier only**:
```typescript
// src/lib/subscription-tiers.ts
FREE:    { ebayCrossListing: false }
FLIPPER: { ebayCrossListing: false }
PRO:     { ebayCrossListing: true }
```

Use `checkFeatureAccess(tier, 'ebayCrossListing')` on all resale content endpoints.

### PostingQueueItem Schema (already exists)

```prisma
model PostingQueueItem {
  id              String    @id @default(cuid())
  userId          String
  listingId       String
  targetPlatform  String
  status          String    @default("PENDING")
  askingPrice     Float?
  title           String?           // ← Populate with generated title
  description     String?           // ← Populate with generated description
  externalPostId  String?
  externalPostUrl String?
  errorMessage    String?
  retryCount      Int       @default(0)
  maxRetries      Int       @default(3)
  scheduledAt     DateTime?
  postedAt        DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  @@unique([listingId, targetPlatform, userId])
}
```

**No schema migration needed** — `title` and `description` fields already exist and are nullable.

### Posting Queue Auto-Generation Logic (Task 2)

In `app/api/posting-queue/route.ts` POST handler, the listing is ALREADY fetched (line 96-101 for batch, line 146-151 for single). Add auto-generation AFTER the listing fetch and BEFORE the `upsert()` call:

```typescript
import { generateAlgorithmicTitle } from '@/lib/title-generator';
import { generateAlgorithmicDescription } from '@/lib/description-generator';
import type { TitleGeneratorInput } from '@/lib/title-generator';
import type { DescriptionGeneratorInput } from '@/lib/description-generator';

// Helper: normalize UPPERCASE platform to lowercase generator platform
function toGeneratorPlatform(platform: string): string {
  const lower = platform.toLowerCase();
  return lower === 'craigslist' ? 'generic' : lower;
}

// If title/description not provided, auto-generate from listing data
// NOTE: listing is already fetched at this point in the existing code
let effectiveTitle = title;
let effectiveDescription = description;

if (!effectiveTitle || !effectiveDescription) {
  const titleInput: TitleGeneratorInput = {
    brand: listing.identifiedBrand || null,
    model: listing.identifiedModel || null,
    variant: listing.identifiedVariant || null,
    condition: listing.identifiedCondition || listing.condition || 'good',
    category: listing.category || null,
  };
  const descInput: DescriptionGeneratorInput = {
    ...titleInput,
    askingPrice: listing.recommendedList || listing.verifiedMarketValue || listing.askingPrice,
    originalPrice: listing.askingPrice,
    sellerNotes: listing.notes || null,
  };

  const genPlatform = toGeneratorPlatform(targetPlatform);

  if (!effectiveTitle) {
    effectiveTitle = generateAlgorithmicTitle(titleInput, genPlatform).title;
  }
  if (!effectiveDescription) {
    effectiveDescription = generateAlgorithmicDescription(descInput, genPlatform).description;
  }
}
```

**IMPORTANT:** The existing listing fetch (`findFirst`) only selects `{ id, platform, userId }` — you must ADD the identification fields (`identifiedBrand`, `identifiedModel`, `identifiedVariant`, `identifiedCondition`, `condition`, `category`, `askingPrice`, `recommendedList`, `verifiedMarketValue`, `notes`) to the select clause.

Use **algorithmic** (not LLM) for auto-generation in the queue to keep it fast and API-key-independent. Users who want AI-generated content use the explicit `generate-resale-content` endpoint first.

For **batch mode**, the auto-generation must run per-platform inside the `filteredPlatforms.map()` loop since each platform gets a different title.

### Existing API Endpoint — Do NOT Duplicate or Follow

`POST /api/listings/[id]/description` already exists BUT has a **critical anti-pattern**: it builds its OWN inline OpenAI prompt (lines 63-86), uses `response_format: { type: 'json_object' }`, has its OWN `generateFallbackDescription()` function, and does NOT import from `title-generator.ts` or `description-generator.ts`. This is DUPLICATED LOGIC that should have used the generator modules.

The NEW endpoint `POST /api/listings/[id]/generate-resale-content` MUST use the generator modules. Do NOT copy the inline prompt pattern from the existing description route.

**Differences from existing endpoint:**
- Uses generator modules (`title-generator.ts`, `description-generator.ts`) — NOT inline prompts
- Returns content for ALL platforms in one call (when `platform='all'`)
- Returns structured `{ titles, descriptions, primary, warnings, source }` format
- Explicit `useLLM` toggle
- Includes platform character/word limits in response metadata

### Imports Pattern

```typescript
// API route
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';
import { handleError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { checkFeatureAccess } from '@/lib/tier-enforcement';
import { generateTitlesForAllPlatforms, generateAlgorithmicTitle, generateLLMTitle } from '@/lib/title-generator';
import { generateDescriptionsForAllPlatforms, generateAlgorithmicDescription, generateLLMDescription } from '@/lib/description-generator';
import type { TitleGeneratorInput } from '@/lib/title-generator';
import type { DescriptionGeneratorInput } from '@/lib/description-generator';
```

### Testing Patterns

**Unit test mocking (from 8.1 patterns):**
```typescript
jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn(() => Promise.resolve('test-user-id')),
}));
jest.mock('@/lib/db', () => ({ __esModule: true, default: { ... } }));
jest.mock('@/lib/tier-enforcement', () => ({
  checkFeatureAccess: jest.fn(() => ({ allowed: true, tier: 'PRO', limits: {} })),
}));
jest.mock('@/lib/title-generator');
jest.mock('@/lib/description-generator');
```

**Acceptance test pattern:**
- Step definitions use `assert` (NOT `expect` from external packages)
- Call real generator functions from `src/lib/` (they work without API key via algorithmic fallback)
- Use regex for source-reading assertions
- Import from relative paths: `../../../src/lib/title-generator`

### Project Structure Notes

New files:
- `app/api/listings/[id]/generate-resale-content/route.ts` — follows existing `app/api/listings/[id]/` nesting
- `src/components/ResaleContentEditor.tsx` — follows `src/components/` pattern
- `src/__tests__/api/listing-generate-resale-content.test.ts` — follows `src/__tests__/api/` pattern
- `test/acceptance/features/E-009-cross-platform-resale-listing.feature` — NEW feature file for Epic 9
- `test/acceptance/step_definitions/E-009-title-description-generation.steps.ts` — follows E-NNN naming

Modified files:
- `app/api/posting-queue/route.ts` — add auto-generation logic + expand listing select fields
- `src/__tests__/api/posting-queue.test.ts` — add auto-generation tests
- `app/listings/[id]/page.tsx` — integrate ResaleContentEditor below AI Analysis section
- `src/lib/rate-limiter.ts` — add rate limit config for `/api/listings` LLM generation (10/min)

### References

- [Source: src/lib/title-generator.ts] — Existing title generator: `generateAlgorithmicTitle` (SYNC), `generateLLMTitle` (ASYNC+fallback), `generateTitlesForAllPlatforms` (SYNC, algorithmic ONLY)
- [Source: src/lib/description-generator.ts] — Existing description generator: same pattern, `fromIdentification` has DIFFERENT signature (requires askingPrice + extras)
- [Source: app/api/listings/[id]/description/route.ts] — Existing endpoint with INLINE OpenAI prompt — DO NOT follow this pattern, use generator modules instead
- [Source: app/api/posting-queue/route.ts] — Existing posting queue CRUD. Lines 96-101 (batch) and 146-151 (single) fetch listing but only select `{ id, platform, userId }` — must expand select for auto-generation
- [Source: src/lib/posting-queue-processor.ts] — Background queue processor with platform adapters
- [Source: prisma/schema.prisma:327-353] — PostingQueueItem model with nullable title/description
- [Source: prisma/schema.prisma:98-121] — Opportunity model with status field (IDENTIFIED→PURCHASED→LISTED→SOLD→PASSED)
- [Source: src/lib/subscription-tiers.ts:39-73] — ebayCrossListing: FREE=false, FLIPPER=false, PRO=true
- [Source: src/lib/tier-enforcement.ts:93-108] — checkFeatureAccess() function
- [Source: src/lib/validations.ts:128-167] — Zod schemas: title max 200 chars (but eBay limit is 80!), desc max 5000
- [Source: src/lib/rate-limiter.ts:26-30] — Endpoint rate limit configs — NO entry for listings/generate yet
- [Source: app/listings/[id]/page.tsx] — Listing detail page — AI Analysis section at lines 217-261, Opportunity link at lines 290-298. ResaleContentEditor goes between these
- [Source: src/components/Navigation.tsx] — Nav has Dashboard, Opportunities, Messages, Settings
- [Source: _bmad-output/planning-artifacts/epics.md] — Epic 9 requirements, FR-RELIST-01/02/07
- [Source: _bmad-output/planning-artifacts/architecture.md] — API patterns, security, testing standards

### Previous Story Intelligence

**From Epic 8 Story 8.1 (AI Message Generation):**
- Same OpenAI integration pattern: lazy singleton, gpt-4o-mini, temperature 0.3-0.4, JSON responses
- Same fallback strategy: algorithmic templates when API unavailable, marked with `isFallback: true`
- Use `findFirst({ where: { id, userId } })` for ownership-scoped lookups (prevents info leakage)
- No `console.error` in catch blocks — `handleError()` handles logging
- Acceptance test When steps should exercise real code paths, not shortcuts

**Code review pattern from 8.1 that applies here:**
- Always scope DB queries to userId
- Test all error paths (auth, tier, validation, not found)
- Use regex for source-reading assertions in acceptance tests

## Dev Agent Record

### Agent Model Used

claude-opus-4-6 (1M context)

### Debug Log References

- Jest unit suite: `npx jest --no-coverage` → 187 suites, 3919 tests passed
- Cucumber acceptance: `npx cucumber-js --profile acceptance --tags "@story-9-1"` → 14 scenarios passed (Scenario Outline expands E-009-S-3 to 4 rows; 11 base scenarios)
- Production build: `make build` → success, new endpoint registered as `ƒ /api/listings/[id]/generate-resale-content`
- Lint scoped to changed files: 0 errors

### Completion Notes List

- Implemented unified `POST /api/listings/[id]/generate-resale-content` endpoint that supports per-platform LLM, multi-platform LLM (loops over `[ebay, mercari, facebook, offerup]` because `generateTitlesForAllPlatforms()` is algorithmic-only), algorithmic-only mode, and Craigslist→generic mapping. Returns `{ titles, descriptions, primary, limits, source, warnings }`.
- Wired auto-generation into `app/api/posting-queue/route.ts` for both single and batch creation paths. Listing select expanded to include identification fields. New `ListingForGeneration` type and `resolveTitleAndDescription()` helper keep the auto-generation logic deduped between paths.
- Added `src/components/ResaleContentEditor.tsx` (Client Component) with platform selector, AI/algorithmic toggle, live char/word counts vs platform limits (red when exceeded), warnings panel, and dark-mode classes. Integrated into `app/listings/[id]/page.tsx` rendered conditionally when `listing.opportunity.status` is one of `PURCHASED|LISTED|SOLD`.
- Added rate-limit config for `/api/listings/` (trailing slash) with 10/min limit. Trailing slash is intentional — it only matches `/api/listings/<id>/...` so existing rate-limiter tests that use bare `/api/listings` continue to pass via `DEFAULT_CONFIG`.
- Wrote 17 unit tests for the new endpoint (auth/tier/validation/ownership/all generator branches/casing/Craigslist mapping/warnings/response shape/error path) and 5 unit tests for posting queue auto-generation (single, explicit-content passthrough, batch, Craigslist→generic, null identification fields). All passing.
- Wrote `test/acceptance/features/E-009-cross-platform-resale-listing.feature` with 11 scenarios (one Scenario Outline → 4 rows = 14 total) tagged `@FR-RELIST-01`, `@FR-RELIST-02`, `@FR-RELIST-07`, `@story-9-1`, and sequential `@E-009-S-N`. New step definitions in `test/acceptance/step_definitions/E-009-title-description-generation.steps.ts` exercise the real generator modules and assert API route structure.
- Updated requirements traceability matrix: FR-RELIST coverage 0/8 → 3/8 (38%); Total FR coverage 49/111 → 52/111 (47%); Grand Total 54/141 → 57/141 (40%).

### Code Review Fixes (2026-04-08)

An adversarial code review surfaced 2 HIGH and 3 MEDIUM issues that were fixed in-place before marking the story done:

- **H1 — Dead rate-limit config.** `src/lib/rate-limiter.ts` had a `/api/listings/` entry (added for G6) but nothing in production code actually called `rateLimit()` — middleware does not wire it, and the route handler did not either. A PRO user could have hammered the OpenAI-calling endpoint with no throttle. Fix: `app/api/listings/[id]/generate-resale-content/route.ts` now calls `rateLimit(ip, pathname, userId)` immediately after auth and throws `RateLimitError` (→ 429) when blocked. Two new tests (`returns 429 when the rate limiter blocks the request`, `invokes the rate limiter with the request pathname and authenticated user id`) lock the wiring in.
- **H2 — `FACEBOOK_MARKETPLACE` platform normalization gap.** The G3 gotcha only covered `CRAIGSLIST → generic`; it missed that the schema enum `FACEBOOK_MARKETPLACE` naïvely lowercases to `facebook_marketplace`, which is not a key in `PLATFORM_LIMITS` / `PLATFORM_STYLES`. Result: Facebook descriptions were using the generic template and emitting `"Ships quickly with tracking"` instead of the correct `"Local pickup available..."` — exactly backwards for Facebook Marketplace, which is a local-pickup-first platform. Facebook titles were also capped at 80 chars instead of 99. Fix: introduce `GENERATOR_PLATFORM_MAP = { facebook_marketplace: 'facebook', craigslist: 'generic' }` in both `app/api/posting-queue/route.ts` and `app/api/listings/[id]/generate-resale-content/route.ts`. Two regression tests in `posting-queue.test.ts` cover single-target and batch `FACEBOOK_MARKETPLACE` paths.
- **M1 — Missing component test coverage.** `src/components/ResaleContentEditor.tsx` shipped without any test file, inconsistent with the rest of Epic 8/9 components. Fix: added `src/__tests__/components/ResaleContentEditor.test.tsx` with 10 tests covering initial render, platform switching and dynamic char/word limit counters, over-limit red highlighting, Generate fetch contract, response mapping, warnings display, error rendering, useLLM checkbox, onSave callback contract, and Save-button disabled state.
- **M2 — Unused opportunity fetch + UI-only business rule.** The generate-resale-content endpoint was selecting `opportunity: { purchasePrice, status }` but never reading either field, and the "only when PURCHASED/LISTED/SOLD" rule from Dev Note G8 was enforced in the React page only. A PRO user could bypass the UI guard with a direct HTTP call. Fix: endpoint now throws `ForbiddenError` unless `listing.opportunity.status ∈ { PURCHASED, LISTED, SOLD }`. Five new tests cover the gate (no opportunity → 403, IDENTIFIED → 403, and an `it.each` loop that asserts the three allowed statuses all return 200).
- **M3 — Task 4.7 fallback assertion.** The API test file had no route-level smoke for the LLM-fallback path (the fallback itself is tested at the `title-generator.test.ts` module level). Added a route-level test (`still returns a 200 with template source when the LLM mocks silently fall back`) so the endpoint contract is asserted end-to-end.

Test impact after fixes:
- `listing-generate-resale-content.test.ts`: 17 → 25 passing tests
- `posting-queue.test.ts`: 27 → 29 passing tests
- `ResaleContentEditor.test.tsx`: 0 → 10 passing tests (new file)

LOW-severity follow-ups deferred (non-blocking, no behavioural regression):
- L1 — `ResaleContentEditor` craigslist platform-matching fallback is accidental-but-correct (single-request payloads always contain exactly one entry).
- L2 — Legacy `app/api/listings/[id]/description/route.ts` with inline OpenAI prompt (G5 anti-pattern) still exists; it is not imported by any new code and should be deprecated or removed in a dedicated tech-debt story.
- L3 — Story G8 references a `PASSED` opportunity status that is not in `OpportunityStatusEnum`; doc drift only, the code uses the correct status set.
- L4 — `primary.platform` may report `'generic'` when the caller requested `craigslist` (single-platform path). Minor API contract cosmetic; consider stamping the requested platform in a future iteration.
- L5 — Inconsistent `handleError(error)` vs `handleError(error, request.url)` arg usage across Epic 8/9 routes. Worth a sweeping alignment PR.

### File List

**Created:**
- `app/api/listings/[id]/generate-resale-content/route.ts`
- `src/components/ResaleContentEditor.tsx`
- `src/__tests__/api/listing-generate-resale-content.test.ts`
- `src/__tests__/components/ResaleContentEditor.test.tsx` *(added during code review — M1 fix, 10 tests covering render, platform switching, char/word limits, Generate fetch, warnings, errors, useLLM toggle, onSave, Save disabled state)*
- `test/acceptance/features/E-009-cross-platform-resale-listing.feature`
- `test/acceptance/step_definitions/E-009-title-description-generation.steps.ts`

**Modified:**
- `app/api/listings/[id]/generate-resale-content/route.ts` *(code review fixes: H1 — wire `rateLimit()` into the handler so the `/api/listings/` config is actually enforced; H2 — `GENERATOR_PLATFORM_MAP` handles `facebook_marketplace → facebook` in addition to `craigslist → generic`; M2 — enforce opportunity-status gate on PURCHASED/LISTED/SOLD instead of relying on UI-only guard)*
- `app/api/posting-queue/route.ts` (auto-generate title/description from listing data when not provided; expanded listing select) *(code review fix: H2 — `toGeneratorPlatform()` now uses `GENERATOR_PLATFORM_MAP` so `FACEBOOK_MARKETPLACE` normalizes to `facebook` and FBMP descriptions correctly say "Local pickup available" instead of the generic "Ships quickly with tracking" fallback)*
- `app/listings/[id]/page.tsx` (integrated ResaleContentEditor below price grid for purchased opportunities)
- `src/lib/rate-limiter.ts` (added `/api/listings/` rate-limit config — trailing slash to scope to sub-routes)
- `src/__tests__/api/listing-generate-resale-content.test.ts` *(code review: added 8 tests — 2 rate-limit, 2 opportunity-gate 403, 3 opportunity-status allowed paths via `it.each`, 1 M3 fallback smoke)*
- `src/__tests__/api/posting-queue.test.ts` (5 new tests for auto-generation) *(code review: added 2 tests for the H2 regression — single and batch `FACEBOOK_MARKETPLACE` assert descriptions contain "local pickup" and respect the 99-char title limit)*
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` (FR-RELIST-01/02/07 marked Covered)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (9-1 status: ready-for-dev → in-progress → review → done)
- `_bmad-output/implementation-artifacts/epic-9/9-1-ai-title-description-generation.md` (this file)

## Change Log

| Date | Change | Author |
|---|---|---|
| 2026-03-31 | Story created by create-story workflow | SM Agent |
| 2026-03-31 | Advanced elicitation: 10 findings applied (3 critical, 4 medium, 3 low). Fixed multi-platform LLM logic, platform casing normalization, fromIdentification signature mismatch, Craigslist mapping, rate limiting gap, listing detail page integration, inline prompt anti-pattern warning, identification data warnings | SM Agent |
| 2026-04-08 | Adversarial code review: 2 HIGH + 3 MEDIUM fixed in-place. H1 — wired `rateLimit()` into the generate-resale-content handler (config existed but was dead). H2 — `GENERATOR_PLATFORM_MAP` maps `facebook_marketplace → facebook` in both posting-queue and generate-resale-content routes (G3 gap). M1 — added 10-test ResaleContentEditor component suite. M2 — enforce PURCHASED/LISTED/SOLD opportunity-status gate on the endpoint (not just the UI). M3 — added route-level smoke for LLM fallback path. Story Status: review → done. | Code Review Agent |
| 2026-04-08 | Implemented all 7 tasks: new generate-resale-content endpoint, posting-queue auto-generation, ResaleContentEditor component + listing page integration, 17 endpoint tests + 5 posting-queue tests, 11 acceptance scenarios, RTM update. All Jest tests (3919) and acceptance tests (14) pass. Build succeeds. | Dev Agent (Opus 4.6) |
