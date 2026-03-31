# Story 5.1: Claude Sonnet Structural Analysis

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69a45ecd528ed8ea4fbd5aa5

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **user**,
I want deep structural analysis of items using Claude Sonnet,
so that I get a thorough Tier 2 assessment beyond initial identification.

## Acceptance Criteria

<!-- Each criterion MUST reference the FR-* requirement(s) it validates from the PRD -->

1. When a listing has passed the algorithmic score threshold AND completed Tier 1 identification (Story 4.3), Claude Sonnet performs Tier 2 structural analysis covering build quality, market positioning, and resale potential `FR-SCORE-16`
2. Claude Sonnet analysis results (confidence, reasoning, flippabilityScore, keyFeatures, potentialIssues) supplement — and do not replace — the Tier 1 GPT-4o-mini identification, and `analysisConfidence` and `analysisReasoning` are stored on the Listing record `FR-SCORE-16`
3. When the Claude Sonnet API is unavailable or throws any error, the system proceeds gracefully with Tier 1 results only: `claudeAnalysis` is null, the failure is logged, and no exception propagates to break the scraper pipeline `FR-SCORE-16`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-SCORE-16 | AC #1 | @FR-SCORE-16 @story-5-1 |
| FR-SCORE-16 | AC #2 | @FR-SCORE-16 @story-5-1 |
| FR-SCORE-16 | AC #3 | @FR-SCORE-16 @story-5-1 |

## Definition of Done

- [x] All acceptance criteria are met and verified
- [x] Code reviewed and approved
- [x] Unit tests written and passing with coverage thresholds met (96% branches, 98% functions, 99% lines)
- [x] Acceptance test scenarios created with triple tags (@E-005-S-N, @FR-SCORE-16, @story-5-1)
- [x] Feature file: `test/acceptance/features/E-005-advanced-market-intelligence.feature` (created)
- [x] Step definitions: `test/acceptance/step_definitions/E-005-claude-analyzer.steps.ts` (new file)
- [x] Requirements traceability matrix updated at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`
- [x] user_flows.feature NOT affected by this story — no update required
- [x] No regressions — existing tests still pass (especially claude-analyzer.test.ts and marketplace-scanner.test.ts)
- [x] No lint errors (`pnpm lint`)
- [x] Build passes (`pnpm build`)
- [x] Dev notes and references are complete
- [x] Trello card moved to Verified
- [x] Feature card checklist item marked complete

## Tasks / Subtasks

- [x] Task 1: Extend `AnalyzedListing` interface in `marketplace-scanner.ts` (AC: #1, #2, FR: FR-SCORE-16)
  - [x] 1.1 Open `src/lib/marketplace-scanner.ts`
  - [x] 1.2 Add import at top of file:
    ```typescript
    import { analyzeListingData, ClaudeAnalysisResult } from './claude-analyzer';
    ```
  - [x] 1.3 Add `claudeAnalysis` as an optional field to `AnalyzedListing`:
    ```typescript
    export interface AnalyzedListing extends RawListing {
      platform: MarketplacePlatform;
      category: string;
      estimation: EstimationResult;
      requestToBuy: string;
      isOpportunity: boolean;
      // Story 4.3: LLM identification (opportunities only)
      llmIdentification?: { ... } | null;
      // Story 5.1: Claude Tier 2 structural analysis (opportunities only, after Tier 1)
      claudeAnalysis?: ClaudeAnalysisResult | null;
    }
    ```

- [x] Task 2: Create `enrichOpportunitiesWithClaudeTier2()` in `marketplace-scanner.ts` (AC: #1, #3, FR: FR-SCORE-16)
  - [x] 2.1 Add the following exported function AFTER `enrichOpportunitiesWithLLM()`:
    ```typescript
    /**
     * Enriches opportunity listings with Claude Sonnet Tier 2 structural analysis.
     * Called AFTER Tier 1 LLM identification (Story 4.3).
     * Falls back gracefully when Claude API is unavailable — claudeAnalysis stays null.
     * Only runs on opportunities (score >= 70) to minimize API costs.
     */
    export async function enrichOpportunitiesWithClaudeTier2(
      listings: AnalyzedListing[]
    ): Promise<AnalyzedListing[]> {
      return Promise.all(
        listings.map(async (listing) => {
          try {
            const claudeAnalysis = await analyzeListingData(
              listing.title,
              listing.description || null,
              listing.askingPrice,
              listing.imageUrls
            );
            return { ...listing, claudeAnalysis };
          } catch (error) {
            console.error(
              `Claude Tier 2 analysis failed for listing ${listing.externalId}:`,
              error
            );
            return { ...listing, claudeAnalysis: null };
          }
        })
      );
    }
    ```
  - [x] 2.2 Note: `analyzeListingData()` throws on API failure (unlike `identifyItem()` which returns null). The try/catch here is the only graceful fallback mechanism — it is NOT optional.

- [x] Task 3: Update `formatForStorage()` to persist Claude fields (AC: #2, FR: FR-SCORE-16)
  - [x] 3.1 In `formatForStorage()` in `marketplace-scanner.ts`, add the following after the `// Status` section (around line 285):
    ```typescript
    // Claude Tier 2 structural analysis (Story 5.1)
    analysisConfidence: listing.claudeAnalysis?.confidence ?? null,
    analysisReasoning: listing.claudeAnalysis?.reasoning ?? null,
    ```
  - [x] 3.2 Both `analysisConfidence` and `analysisReasoning` already exist on the `Listing` model in `prisma/schema.prisma` — NO schema migration required.
  - [x] 3.3 The full `ClaudeAnalysisResult` JSON (keyFeatures, potentialIssues, flippabilityScore, marketTrends, targetBuyer) is cached in `AiAnalysisCache` in Task 4 — not stored directly on Listing.

- [x] Task 4: Cache full Claude result in `AiAnalysisCache` after DB save (AC: #2, FR: FR-SCORE-16)
  - [x] 4.1 In each scraper route, after calling `prisma.listing.create()` or `prisma.listing.upsert()` for an enriched opportunity, if `listing.claudeAnalysis` is present:
    ```typescript
    // Cache Claude Tier 2 result for reuse (Story 5.1)
    if (enrichedListing.claudeAnalysis) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      await prisma.aiAnalysisCache.create({
        data: {
          listingId: savedListing.id,
          analysisResult: JSON.stringify(enrichedListing.claudeAnalysis),
          expiresAt,
        },
      });
    }
    ```
  - [x] 4.2 This avoids redundant Claude API calls when `analyzeListing(listingId)` is called later (e.g., from the UI or Story 4.6 caching logic).
  - [x] 4.3 Wrap in try/catch — cache write failure must NOT break the scraper response.

- [x] Task 5: Wire Claude Tier 2 into all scraper routes (AC: #1, #3, FR: FR-SCORE-16)
  - [x] 5.1 In each scraper route, import `enrichOpportunitiesWithClaudeTier2` from `@/lib/marketplace-scanner`
  - [x] 5.2 Call AFTER `enrichOpportunitiesWithLLM()` (Story 4.3), BEFORE DB save:
    ```typescript
    // Step 1: Algorithmic scoring
    const results = processListings(platform, rawListings, criteria);

    // Step 2: Tier 1 — LLM identification (Story 4.3)
    const tier1Enriched = await enrichOpportunitiesWithLLM(results.opportunities);

    // Step 3: Tier 2 — Claude structural analysis (Story 5.1)
    const tier2Enriched = await enrichOpportunitiesWithClaudeTier2(tier1Enriched);

    // Step 4: Save to DB using tier2Enriched (which includes both LLM + Claude results)
    ```
  - [x] 5.3 Files to update:
    - `app/api/scraper/craigslist/route.ts`
    - `app/api/scraper/ebay/route.ts`
    - `app/api/scraper/facebook/route.ts`
    - `app/api/scraper/mercari/route.ts`
    - `app/api/scraper/offerup/route.ts`
  - [x] 5.4 Also check `app/api/scraper/craigslist/route.v2.ts` — if it has its own opportunity save path, apply Tier 2 enrichment there too.
  - [x] 5.5 **IMPORTANT:** If Story 4.3 hasn't been implemented yet in a route, the variable will still be `results.opportunities` (not yet enriched by Tier 1). Call `enrichOpportunitiesWithClaudeTier2()` directly on `results.opportunities` in that case — Tier 2 can run independently of Tier 1.

- [x] Task 6: Write unit tests (AC: #1–3)
  - [x] 6.1 Add tests to `src/__tests__/lib/marketplace-scanner.test.ts` (or create `src/__tests__/lib/claude-tier2-integration.test.ts`):
    - `enrichOpportunitiesWithClaudeTier2()` returns listings with `claudeAnalysis` populated when `analyzeListingData()` resolves
    - `enrichOpportunitiesWithClaudeTier2()` returns `claudeAnalysis: null` when `analyzeListingData()` throws
    - `enrichOpportunitiesWithClaudeTier2()` processes ALL listings in the array (parallel)
    - `formatForStorage()` includes `analysisConfidence` when `claudeAnalysis` is present
    - `formatForStorage()` includes `analysisReasoning` when `claudeAnalysis` is present
    - `formatForStorage()` sets `analysisConfidence: null` and `analysisReasoning: null` when `claudeAnalysis` is null
  - [x] 6.2 Mock `@/lib/claude-analyzer` at module level:
    ```typescript
    jest.mock('@/lib/claude-analyzer', () => ({
      analyzeListingData: jest.fn(),
    }));
    ```
  - [x] 6.3 Do NOT modify or re-test `claude-analyzer.ts` — its tests at `src/__tests__/lib/claude-analyzer.test.ts` already achieve full coverage.
  - [x] 6.4 Verify coverage: `pnpm test:coverage`
  - [x] 6.5 All 3 branches of `enrichOpportunitiesWithClaudeTier2()` must be covered:
    1. `analyzeListingData()` resolves successfully → `claudeAnalysis` populated
    2. `analyzeListingData()` rejects/throws → `claudeAnalysis: null`, no exception propagated
    3. Empty listings array → returns empty array (edge case)

- [x] Task 7: Write BDD acceptance tests (AC: #1-3, FR: FR-SCORE-16)
  - [x] 7.1 Create `test/acceptance/features/E-005-advanced-market-intelligence.feature` (new file)
  - [x] 7.2 Add file header comment:
    ```gherkin
    # Epic 5: Advanced Market Intelligence
    # Story 5.1 scenarios start at @E-005-S-1.
    # When Stories 5.2-5.5 are implemented, append their scenarios sequentially.
    ```
  - [x] 7.3 Write Scenario: Claude performs Tier 2 structural analysis
    ```gherkin
    @E-005-S-1 @story-5-1 @FR-SCORE-16
    Scenario: Claude Sonnet performs structural analysis for an opportunity listing
      Given the claude-analyzer module is loaded
      And the ANTHROPIC_API_KEY is configured
      When I call analyzeListingData with title "Apple MacBook Pro 2021" and price 800
      Then the result contains a flippabilityScore between 0 and 100
      And the result contains a confidence value of "low", "medium", or "high"
      And the result contains a non-empty reasoning string
      And the result contains keyFeatures as a list
    ```
  - [x] 7.4 Write Scenario: Claude results stored with the listing
    ```gherkin
    @E-005-S-2 @story-5-1 @FR-SCORE-16
    Scenario: Claude Tier 2 analysis fields are persisted to the listing record
      Given an analyzed listing has a claudeAnalysis result
      When the listing is formatted for storage
      Then the storage record includes analysisConfidence
      And the storage record includes analysisReasoning
    ```
  - [x] 7.5 Write Scenario: Graceful fallback when Claude API is unavailable
    ```gherkin
    @E-005-S-3 @story-5-1 @FR-SCORE-16
    Scenario: System proceeds gracefully when Claude API is unavailable
      Given the ANTHROPIC_API_KEY is not configured
      When enrichOpportunitiesWithClaudeTier2 is called with an opportunity listing
      Then the result listing has claudeAnalysis set to null
      And no exception is thrown
      And the listing is otherwise unmodified
    ```
  - [x] 7.6 Create step definitions at `test/acceptance/step_definitions/E-005-claude-analyzer.steps.ts`
  - [x] 7.7 Update `_bmad-output/test-artifacts/requirements-traceability-matrix.md` — change FR-SCORE-16 row status from `Pending` to `Covered` and add test tag column entry `@E-005-S-1 @E-005-S-2 @E-005-S-3`

- [x] Task 8: Final verification (all ACs)
  - [x] 8.1 Run `pnpm lint` — no errors
  - [x] 8.2 Run `pnpm build` — build passes (strict TypeScript mode)
  - [x] 8.3 Run `pnpm test` — all tests pass, coverage thresholds met
  - [x] 8.4 Verify existing tests still pass: `src/__tests__/lib/claude-analyzer.test.ts` (DO NOT BREAK)
  - [x] 8.5 Run BDD acceptance tests: `CUCUMBER_TAGS="@story-5-1" make test-acceptance`
  - [x] 8.6 Confirm `analysisConfidence` and `analysisReasoning` are correctly set on saved listings for opportunities where Claude succeeded

## Dev Notes

### CRITICAL: `claude-analyzer.ts` Is Already Built — Do NOT Rewrite It

`src/lib/claude-analyzer.ts` is **fully implemented and tested**. It exports:
- `analyzeListingData(title, description, askingPrice, imageUrls?)` → `Promise<ClaudeAnalysisResult>`
- `analyzeListing(listingId)` → `Promise<ClaudeAnalysisResult>` (fetches from DB + uses `AiAnalysisCache`)
- `batchAnalyzeListings(listingIds, onProgress?)` → batch processing with 1-second rate limiting
- `ClaudeAnalysisResult` interface (see below)

**DO NOT** reimplement, refactor, or modify `claude-analyzer.ts` as part of this story. This is an **integration story** — wiring the existing module into the scraper pipeline.

```typescript
export interface ClaudeAnalysisResult {
  category: string;
  subcategory?: string;
  brand?: string;
  condition: string;
  estimatedAge?: string;
  keyFeatures: string[];
  potentialIssues: string[];
  flippabilityScore: number; // 0-100
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
  marketTrends?: string;
  targetBuyer?: string;
}
```

Model used: `process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929'`
API key: `process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY`

### CRITICAL: Error Handling Difference vs. Story 4.3

`identifyItem()` (Story 4.3, Tier 1) returns `null` on failure.
`analyzeListingData()` (Story 5.1, Tier 2) **throws** on failure.

This means the try/catch in `enrichOpportunitiesWithClaudeTier2()` is the ONLY thing preventing Claude API failures from crashing the scraper pipeline. It is **not optional**.

```typescript
try {
  const claudeAnalysis = await analyzeListingData(...);
  return { ...listing, claudeAnalysis };
} catch (error) {
  // MUST catch — analyzeListingData throws on:
  // - Missing ANTHROPIC_API_KEY → "ANTHROPIC_API_KEY or CLAUDE_API_KEY not configured"
  // - HTTP 429 rate limit → "Claude API rate limit exceeded"
  // - Any HTTP error → "Claude API error: <message>"
  // - JSON parse failure → "Failed to parse Claude response: ..."
  // - No text in response → "No text response from Claude"
  console.error(`Claude Tier 2 analysis failed for listing ${listing.externalId}:`, error);
  return { ...listing, claudeAnalysis: null };
}
```

### What This Story Is Actually Building

The `claude-analyzer.ts` module is done. This story delivers:
1. **Interface extension**: `claudeAnalysis?: ClaudeAnalysisResult | null` on `AnalyzedListing`
2. **Enrichment function**: `enrichOpportunitiesWithClaudeTier2()` in `marketplace-scanner.ts`
3. **Storage mapping**: `formatForStorage()` updated to persist `analysisConfidence` and `analysisReasoning`
4. **Cache write**: Full Claude JSON stored in `AiAnalysisCache` after DB save (avoids redundant API calls)
5. **Scraper route wiring**: Each route calls Tier 2 enrichment after Tier 1
6. **Tests**: Unit + BDD acceptance

### Existing Listing Schema — No Migration Required

The `Listing` model in `prisma/schema.prisma` already has the fields needed for Claude results:

```prisma
analysisConfidence  String?   // Maps to ClaudeAnalysisResult.confidence ('low'|'medium'|'high')
analysisReasoning   String?   // Maps to ClaudeAnalysisResult.reasoning
llmAnalyzed         Boolean   @default(false)
analysisDate        DateTime?
```

**No schema migration is needed for Story 5.1.** The full Claude JSON result is stored in `AiAnalysisCache` (which also already exists).

Fields like `flippabilityScore`, `keyFeatures`, `potentialIssues`, `marketTrends`, and `targetBuyer` from `ClaudeAnalysisResult` are available via the `AiAnalysisCache` lookup — not stored directly on `Listing`. This is the intended architecture (see `analyzeListing(listingId)` which reads from cache).

### Integration Architecture — Three-Tier Pipeline

```
rawListings
    ↓
processListings()           ← Tier 0: Algorithmic (sync, fast, Story 4.1/4.2)
    ↓ results.opportunities
enrichOpportunitiesWithLLM()  ← Tier 1: GPT-4o-mini identification (Story 4.3)
    ↓ tier1Enriched
enrichOpportunitiesWithClaudeTier2()  ← Tier 2: Claude structural analysis (Story 5.1)
    ↓ tier2Enriched
formatForStorage()          ← Maps to DB columns (includes analysisConfidence, analysisReasoning)
    ↓
prisma.listing.create/upsert()
    ↓
prisma.aiAnalysisCache.create()  ← Cache full ClaudeAnalysisResult by listingId
```

**Why enrich only opportunities?**
- Claude API costs money per token (Sonnet is significantly more expensive than GPT-4o-mini)
- Non-opportunity listings (score < 70) will not be shown to user as flippable candidates
- Only opportunities need the deep structural analysis to build user confidence in the deal

### Parallel Processing Is Fine

`enrichOpportunitiesWithClaudeTier2()` processes all listings with `Promise.all()` — same pattern as `enrichOpportunitiesWithLLM()`. This is safe because:
- Claude API rate limits are per-minute, not concurrent connections
- The number of opportunities per scrape is typically 2-5 listings
- If rate limits become an issue at scale, Story 4.6 (AI Analysis Caching & Fallback) adds the throttling layer

### Story 4.3 Dependency — Not a Hard Blocker

Tier 2 (Claude) can run independently of Tier 1 (GPT-4o-mini). The `enrichOpportunitiesWithClaudeTier2()` function operates on `AnalyzedListing` regardless of whether `llmIdentification` is populated. If Story 4.3 hasn't been wired into a given route yet, pass `results.opportunities` directly to `enrichOpportunitiesWithClaudeTier2()`.

Preferred order (when both are wired):
```typescript
const tier1 = await enrichOpportunitiesWithLLM(results.opportunities);    // Story 4.3
const tier2 = await enrichOpportunitiesWithClaudeTier2(tier1);             // Story 5.1
```

### `AiAnalysisCache` Post-Save Pattern

The `analyzeListing(listingId)` function in `claude-analyzer.ts` already checks `AiAnalysisCache` before calling the API. By writing to cache in the scraper route (Task 4), subsequent calls to `analyzeListing(listingId)` for the same listing (e.g., from the UI on listing detail view) will get the cached result and NOT make a new API call.

Cache TTL is 24 hours (same as `claude-analyzer.ts` uses internally). The cache write in the scraper route is essentially pre-warming the cache with data we already have.

### `formatForStorage()` Current State

Current `formatForStorage()` in `marketplace-scanner.ts` (around line 285) ends with:
```typescript
// Status
status: listing.isOpportunity ? 'OPPORTUNITY' : 'NEW',
```

Add Claude fields AFTER status:
```typescript
// Claude Tier 2 structural analysis (Story 5.1)
analysisConfidence: listing.claudeAnalysis?.confidence ?? null,
analysisReasoning: listing.claudeAnalysis?.reasoning ?? null,
```

`llmAnalyzed` and `analysisDate` are left unchanged by this story — they will be managed by Story 4.3 (Tier 1 identification tracking). Story 5.1 does NOT change `llmAnalyzed`.

### BDD Scenario Numbering

Epic 5 has no existing feature file. Story 5.1 is the first story, so:
- Start at `@E-005-S-1`
- When Stories 5.2-5.5 are later implemented, APPEND their scenarios sequentially after Story 5.1's
- Add header comment in the feature file indicating this

### Git Commit Style

Recent commit pattern in this repo: `✅ [SCOPE] Short description`
- Examples: `✅ [FEAT] Add Claude Tier 2 enrichment to scraper pipeline`
- `📋 [DOCS] Update requirements traceability matrix`

### Coverage Thresholds

Jest enforces: 96% branches, 98% functions, 99% lines, 99% statements.

`enrichOpportunitiesWithClaudeTier2()` has 3 key branches to cover:
1. `analyzeListingData()` resolves → `claudeAnalysis` populated
2. `analyzeListingData()` throws → catch block executes, `claudeAnalysis: null`
3. Empty input array → `Promise.all([])` resolves to `[]`

All 3 branches **must** be covered in unit tests.

### Existing Tests: DO NOT BREAK

| Test File | What It Tests | Must Still Pass |
|-----------|--------------|-----------------|
| `src/__tests__/lib/claude-analyzer.test.ts` | `analyzeListingData()`, `analyzeListing()`, `batchAnalyzeListings()` | **YES — do not touch** |
| `src/__tests__/lib/marketplace-scanner.test.ts` | `analyzeListing()`, `processListings()`, `formatForStorage()` | Yes |
| `src/__tests__/lib/value-estimator.test.ts` | 123 value-estimator unit tests | Yes |

### Test Requirements

- **Feature file:** `test/acceptance/features/E-005-advanced-market-intelligence.feature` (new)
- **Step definitions:** `test/acceptance/step_definitions/E-005-claude-analyzer.steps.ts` (new)
- **Unit test file:** Add to `src/__tests__/lib/marketplace-scanner.test.ts` OR create `src/__tests__/lib/claude-tier2-integration.test.ts`
- **Tagging:** `@E-005-S-N`, `@story-5-1`, `@FR-SCORE-16`
- **Traceability matrix:** Update FR-SCORE-16 row at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`
- **Run BDD:** `CUCUMBER_TAGS="@story-5-1" make test-acceptance`

### Project Structure Notes

- **Path alias:** `@/*` maps to `./src/*`
- **New function:** `enrichOpportunitiesWithClaudeTier2()` exported from `src/lib/marketplace-scanner.ts`
- **Interface update:** `AnalyzedListing` in `src/lib/marketplace-scanner.ts` — add `claudeAnalysis` field
- **No DB migration:** `analysisConfidence` and `analysisReasoning` already exist on `Listing` model
- **Prisma client:** Already generated, no changes needed
- **Claude model:** `claude-sonnet-4-5-20250929` (or `CLAUDE_MODEL` env override)

### Files To Create

| File | Purpose |
|------|---------|
| `test/acceptance/features/E-005-advanced-market-intelligence.feature` | BDD feature file for Epic 5 |
| `test/acceptance/step_definitions/E-005-claude-analyzer.steps.ts` | BDD step definitions for Story 5.1 scenarios |

### Files To Modify

| File | Change |
|------|--------|
| `src/lib/marketplace-scanner.ts` | Add `claudeAnalysis` to `AnalyzedListing`, add `enrichOpportunitiesWithClaudeTier2()`, update `formatForStorage()` |
| `app/api/scraper/craigslist/route.ts` | Call `enrichOpportunitiesWithClaudeTier2()` in pipeline |
| `app/api/scraper/ebay/route.ts` | Call `enrichOpportunitiesWithClaudeTier2()` in pipeline |
| `app/api/scraper/facebook/route.ts` | Call `enrichOpportunitiesWithClaudeTier2()` in pipeline |
| `app/api/scraper/mercari/route.ts` | Call `enrichOpportunitiesWithClaudeTier2()` in pipeline |
| `app/api/scraper/offerup/route.ts` | Call `enrichOpportunitiesWithClaudeTier2()` in pipeline |
| `test/acceptance/features/E-005-advanced-market-intelligence.feature` | Add Story 5.1 scenarios |
| `_bmad-output/test-artifacts/requirements-traceability-matrix.md` | Update FR-SCORE-16 row |

### Files To NOT Modify

| File | Reason |
|------|--------|
| `src/lib/claude-analyzer.ts` | Already fully built — integration story only |
| `src/lib/llm-identifier.ts` | Story 4.3's module — not in scope |
| `src/lib/value-estimator.ts` | Not in scope for this story |
| `prisma/schema.prisma` | No schema changes needed — fields already exist |
| `src/__tests__/lib/claude-analyzer.test.ts` | Already comprehensive — do not break or modify |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.1]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-5 — "Claude Sonnet structural analysis (SCORE-16) is built"]
- [Source: src/lib/claude-analyzer.ts — analyzeListingData(), ClaudeAnalysisResult interface]
- [Source: src/lib/marketplace-scanner.ts — AnalyzedListing, formatForStorage(), enrichOpportunitiesWithLLM()]
- [Source: prisma/schema.prisma — Listing.analysisConfidence, Listing.analysisReasoning, AiAnalysisCache model]
- [Source: src/__tests__/lib/claude-analyzer.test.ts — Existing test coverage (DO NOT BREAK)]
- [Source: Story 4.3 — Tier 1 LLM identification enrichment pattern to follow]
- [Source: _bmad-output/test-artifacts/requirements-traceability-matrix.md — FR-SCORE-16 row]

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
