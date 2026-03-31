# Story 5.2: Comparable Sold Item Matching

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69a4605b539e2970d71c6bcd

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **user**,
I want to see actual comparable sold items for any listing,
so that I can verify the market value with real transaction data.

## Acceptance Criteria

<!-- Each criterion MUST reference the FR-* requirement(s) it validates from the PRD -->

1. When comp matching runs on an LLM-identified item, the system uses LLM-generated search queries to find sold eBay items filtered for matching brand, model, and condition — not just keyword overlap `FR-SCORE-17`
2. When comp results are found, each comp shows: title, sold price, sold date, condition, and platform `FR-SCORE-17`
3. When comp matching finds fewer than 3 matches, a low-confidence warning is shown to the user `FR-SCORE-17`
4. When no comps are found, the listing is flagged as "insufficient market data" and the system relies on algorithmic scoring only `FR-SCORE-17`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-SCORE-17 | AC #1 | @FR-SCORE-17 @story-5-2 |
| FR-SCORE-17 | AC #2 | @FR-SCORE-17 @story-5-2 |
| FR-SCORE-17 | AC #3 | @FR-SCORE-17 @story-5-2 |
| FR-SCORE-17 | AC #4 | @FR-SCORE-17 @story-5-2 |

## Definition of Done

- [x] All acceptance criteria are met and verified
- [x] Code reviewed and approved
- [x] Unit tests written and passing with coverage thresholds met (96% branches, 98% functions, 99% lines)
- [x] Acceptance test scenarios created with triple tags (@E-005-S-N, @FR-SCORE-17, @story-5-2)
- [x] Feature file: `test/acceptance/features/E-005-advanced-market-intelligence.feature` (append to Story 5.1 file)
- [x] Step definitions: `test/acceptance/step_definitions/E-005-comparable-sold-items.steps.ts` (new file)
- [x] Requirements traceability matrix updated at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`
- [x] user_flows.feature NOT affected by this story — no update required
- [x] No regressions — existing tests still pass (especially market-price.test.ts and marketplace-scanner.test.ts)
- [x] No lint errors (`pnpm lint`)
- [ ] Build passes (`pnpm build`)
- [x] Dev notes and references are complete
- [ ] Trello card moved to Done (in review)
- [ ] Feature card checklist item marked complete

## Tasks / Subtasks

- [ ] Task 1: Add `parseSoldDate()` and fix null `soldDate` in `market-price.ts` (AC: #2, FR: FR-SCORE-17)
  - [ ] 1.1 Open `src/lib/market-price.ts`
  - [ ] 1.2 Add `parseSoldDate()` after the `median()` helper (around line 43):
    ```typescript
    /**
     * Parse eBay sold date text into a Date object.
     * eBay shows formats like: "Oct 15, 2024", "Sold Oct 15, 2024",
     * "2 days ago", "12h ago".
     * Returns null for unrecognized formats.
     */
    export function parseSoldDate(rawText: string): Date | null {
      if (!rawText) return null;
      const text = rawText.replace(/^sold\s*/i, '').trim();

      // "X days ago"
      const daysAgo = text.match(/^(\d+)\s*d(?:ays?)?\s*ago$/i);
      if (daysAgo) {
        const d = new Date();
        d.setDate(d.getDate() - parseInt(daysAgo[1], 10));
        return d;
      }

      // "Xh ago"
      const hoursAgo = text.match(/^(\d+)\s*h(?:ours?)?\s*ago$/i);
      if (hoursAgo) {
        return new Date(Date.now() - parseInt(hoursAgo[1], 10) * 60 * 60 * 1000);
      }

      // "Oct 15, 2024" — standard month-day-year
      const monthDate = text.match(/^[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}$/);
      if (monthDate) {
        const parsed = new Date(text);
        return isNaN(parsed.getTime()) ? null : parsed;
      }

      return null;
    }
    ```
  - [ ] 1.3 In the `listings.map()` step inside `fetchMarketPrice()` (around line 164), change:
    ```typescript
    soldDate: null, // Would need more parsing for actual date
    ```
    to:
    ```typescript
    soldDate: parseSoldDate(item.soldDate),
    ```
  - [ ] 1.4 Verify existing tests still pass: `pnpm test -- --testPathPattern="market-price"`

- [ ] Task 2: Create `src/lib/comp-matcher.ts` — Enhanced comp matching service (AC: #1, #2, #3, #4, FR: FR-SCORE-17)
  - [ ] 2.1 Create `src/lib/comp-matcher.ts` with the following content:
    ```typescript
    // Comparable sold item matching — finds and filters eBay sold comps
    // for LLM-identified items, verifying brand/model alignment.

    import { fetchMarketPrice, SoldListing } from './market-price';

    export interface ComparableSale {
      title: string;
      soldPrice: number;
      soldDate: Date | null;
      condition: string;
      platform: 'ebay';
      url: string;
    }

    export type CompConfidence = 'high' | 'medium' | 'low' | 'insufficient';

    export interface CompMatchResult {
      comps: ComparableSale[];
      confidence: CompConfidence;
      insufficientData: boolean;
      totalFetched: number;  // raw results before brand/model filtering
      searchQuery: string;
    }
    ```
  - [ ] 2.2 Add `filterByBrandModel()` helper:
    ```typescript
    /**
     * Returns true when a sold listing title matches the identified brand/model.
     * Used to weed out keyword-overlapping comps that are actually different items.
     * Falls back to accepting all comps when brand and model are both unknown.
     */
    export function filterByBrandModel(
      title: string,
      brand: string | null,
      model: string | null
    ): boolean {
      if (!brand && !model) return true; // no filters available — accept all
      const lower = title.toLowerCase();
      const brandMatch = brand ? lower.includes(brand.toLowerCase()) : true;
      const modelMatch = model ? lower.includes(model.toLowerCase()) : true;
      return brandMatch && modelMatch;
    }
    ```
  - [ ] 2.3 Add `calcConfidence()` helper:
    ```typescript
    export function calcConfidence(compCount: number): CompConfidence {
      if (compCount === 0) return 'insufficient';
      if (compCount <= 2) return 'low';
      if (compCount <= 4) return 'medium';
      return 'high';
    }
    ```
  - [ ] 2.4 Add main `findComparableSales()` function:
    ```typescript
    /**
     * Fetches eBay sold listings and filters for comps that match the identified brand + model.
     * Uses the LLM-generated searchQuery (from Story 4.3) for the eBay search.
     * Falls back to the listing title when no LLM identification is available.
     *
     * @param searchQuery  Optimized search query (from llm-identifier.ts identifiedSearchQuery)
     * @param brand        Identified brand from LLM identification (may be null)
     * @param model        Identified model from LLM identification (may be null)
     * @param category     Category hint for eBay category filter (optional)
     * @param rawComps     Pre-fetched SoldListing[] from Story 4.4 pipeline (avoids duplicate Playwright call)
     */
    export async function findComparableSales(
      searchQuery: string,
      brand: string | null,
      model: string | null,
      category?: string,
      rawComps?: SoldListing[]
    ): Promise<CompMatchResult | null> {
      try {
        let soldListings: SoldListing[];

        if (rawComps && rawComps.length > 0) {
          // Reuse comps fetched by Story 4.4 — avoid a second Playwright call
          soldListings = rawComps;
        } else {
          const marketData = await fetchMarketPrice(searchQuery, category);
          if (!marketData) return null;
          soldListings = marketData.soldListings;
        }

        const filtered = soldListings.filter((s) =>
          filterByBrandModel(s.title, brand, model)
        );

        const comps: ComparableSale[] = filtered.map((s) => ({
          title: s.title,
          soldPrice: s.price,
          soldDate: s.soldDate,
          condition: s.condition,
          platform: 'ebay' as const,
          url: s.url,
        }));

        return {
          comps,
          confidence: calcConfidence(comps.length),
          insufficientData: comps.length === 0,
          totalFetched: soldListings.length,
          searchQuery,
        };
      } catch (error) {
        console.error('Comp matching failed for query:', searchQuery, error);
        return null;
      }
    }
    ```
  - [ ] 2.5 No imports of Prisma — this is a pure service module.

- [ ] Task 3: Update Prisma schema — add `compMatchConfidence` (AC: #3, #4, FR: FR-SCORE-17)
  - [ ] 3.1 Open `prisma/schema.prisma`
  - [ ] 3.2 In the `Listing` model, add after `comparableSalesJson String?` (around line 53):
    ```prisma
    compMatchConfidence String?   // 'high' | 'medium' | 'low' | 'insufficient'
    ```
  - [ ] 3.3 Run migration:
    ```bash
    npx prisma migrate dev --name add-comp-match-confidence
    ```
  - [ ] 3.4 Verify Prisma client regenerated: `ls src/generated/prisma/` should show updated timestamp.

- [ ] Task 4: Extend `AnalyzedListing` and add `enrichWithCompMatches()` in `marketplace-scanner.ts` (AC: #1–4, FR: FR-SCORE-17)
  - [ ] 4.1 Open `src/lib/marketplace-scanner.ts`
  - [ ] 4.2 Add import at the top:
    ```typescript
    import { findComparableSales, CompMatchResult } from './comp-matcher';
    ```
  - [ ] 4.3 Add `compMatches` to `AnalyzedListing` interface (after `claudeAnalysis` from Story 5.1):
    ```typescript
    // Story 5.2: Comparable sold item matching (opportunities only, after market price lookup)
    compMatches?: CompMatchResult | null;
    ```
  - [ ] 4.4 Create `enrichWithCompMatches()` AFTER `enrichOpportunitiesWithClaudeTier2()`:
    ```typescript
    /**
     * Enriches opportunity listings with comparable sold item matches.
     * Uses identifiedSearchQuery (Story 4.3) and verifiedPrice.soldListings (Story 4.4)
     * to find and filter comps without redundant Playwright calls.
     * Falls back gracefully when comp matching fails — compMatches stays null.
     */
    export async function enrichWithCompMatches(
      listings: AnalyzedListing[]
    ): Promise<AnalyzedListing[]> {
      const enriched: AnalyzedListing[] = [];
      for (const listing of listings) {
        try {
          // Use LLM-optimized query (Story 4.3) or fall back to title
          const searchQuery = listing.llmIdentification?.searchQuery || listing.title;
          const brand = listing.llmIdentification?.brand ?? null;
          const model = listing.llmIdentification?.model ?? null;
          const category = listing.llmIdentification?.category || listing.category;

          // Reuse raw comps from Story 4.4 if available (avoids duplicate Playwright call)
          // verifiedPrice.soldListings is the raw SoldListing[] from fetchMarketPrice()
          const rawComps = (listing.verifiedPrice as any)?.rawSoldListings ?? undefined;

          const compMatches = await findComparableSales(
            searchQuery,
            brand,
            model,
            category,
            rawComps
          );
          enriched.push({ ...listing, compMatches });
        } catch (error) {
          console.error(`Comp matching failed for listing ${listing.externalId}:`, error);
          enriched.push({ ...listing, compMatches: null });
        }
        // Delay between Playwright calls if rawComps not available
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      return enriched;
    }
    ```
  - [ ] 4.5 Note: `for...of` loop (sequential) is intentional — avoids concurrent Playwright instances. The 500ms delay is skipped when `rawComps` is provided (no new Playwright call).
  - [ ] 4.6 Note: `(listing.verifiedPrice as any)?.rawSoldListings` accesses a field that Story 4.4 must add to `VerifiedPriceLookupResult` — see Dev Notes for coordination with Story 4.4.

- [ ] Task 5: Update `formatForStorage()` to map comp fields (AC: #1–4, FR: FR-SCORE-17)
  - [ ] 5.1 In `formatForStorage()` in `marketplace-scanner.ts`, add AFTER the verified market price section (Story 4.4):
    ```typescript
    // Comparable sold item matching (Story 5.2)
    // Overwrite comparableSalesJson with enhanced format (includes soldDate + platform)
    // if comp matching ran; otherwise preserve what Story 4.4 stored.
    comparableSalesJson: listing.compMatches
      ? JSON.stringify(listing.compMatches.comps)
      : (listing.verifiedPrice?.comparableSalesJson ?? null),
    compMatchConfidence: listing.compMatches?.confidence ?? null,
    ```
  - [ ] 5.2 `compMatchConfidence` is the new field added in Task 3. `comparableSalesJson` already exists on the Listing model.

- [ ] Task 6: Wire comp matching into all scraper routes (AC: #1, FR: FR-SCORE-17)
  - [ ] 6.1 Import `enrichWithCompMatches` from `@/lib/marketplace-scanner` in each route
  - [ ] 6.2 Call AFTER `enrichWithVerifiedMarketPrice()` (Story 4.4) in the pipeline:
    ```typescript
    // Step 1: Algorithmic scoring (Stories 4.1/4.2)
    const results = processListings(platform, rawListings, criteria);

    // Step 2: Tier 1 — LLM identification (Story 4.3)
    const tier1 = await enrichOpportunitiesWithLLM(results.opportunities);

    // Step 3: Tier 2 — Claude structural analysis (Story 5.1)
    const tier2 = await enrichOpportunitiesWithClaudeTier2(tier1);

    // Step 4: Verified market price (Story 4.4)
    const marketEnriched = await enrichWithVerifiedMarketPrice(tier2);

    // Step 5: Comparable sold item matching (Story 5.2)
    const compEnriched = await enrichWithCompMatches(marketEnriched);

    // Step 6: DB save
    for (const listing of compEnriched) {
      await prisma.listing.create({ data: formatForStorage(listing) });
    }
    ```
  - [ ] 6.3 Files to update:
    - `app/api/scraper/craigslist/route.ts`
    - `app/api/scraper/ebay/route.ts`
    - `app/api/scraper/facebook/route.ts`
    - `app/api/scraper/mercari/route.ts`
    - `app/api/scraper/offerup/route.ts`
  - [ ] 6.4 Also check `app/api/scraper/craigslist/route.v2.ts` — if it has its own save path, add comp matching there too.
  - [ ] 6.5 **If Stories 4.3, 5.1, or 4.4 are not yet wired into a route**, call `enrichWithCompMatches()` directly on `results.opportunities` — it falls back gracefully when `llmIdentification` and `verifiedPrice` are absent.

- [ ] Task 7: Update Opportunities page — display comp section (AC: #2, #3, #4, FR: FR-SCORE-17)
  - [ ] 7.1 Open `app/opportunities/page.tsx`
  - [ ] 7.2 Add `compMatchConfidence` and `comparableSalesJson` to the `Listing` type and API select clause
  - [ ] 7.3 Add a `ComparableSalesSection` inline component or JSX block in the listing detail area (after the existing market value section around line 735):
    ```tsx
    {/* Comparable Sales — Story 5.2 */}
    {listing.compMatchConfidence && (
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="text-sm font-semibold text-gray-700">Comparable Sales</h4>
          {listing.compMatchConfidence === 'insufficient' && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
              Insufficient Market Data
            </span>
          )}
          {(listing.compMatchConfidence === 'low') && (
            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
              Low Confidence
            </span>
          )}
        </div>
        {listing.compMatchConfidence === 'insufficient' ? (
          <p className="text-xs text-gray-500">
            No comparable sold items found. Algorithmic scoring is being used.
          </p>
        ) : (
          <div className="space-y-1">
            {JSON.parse(listing.comparableSalesJson || '[]').map((comp: any, i: number) => (
              <div key={i} className="text-xs flex justify-between gap-2 py-0.5 border-b border-gray-100">
                <span className="text-gray-700 truncate max-w-[200px]" title={comp.title}>
                  {comp.title}
                </span>
                <span className="text-green-700 font-medium whitespace-nowrap">${comp.soldPrice}</span>
                <span className="text-gray-400 whitespace-nowrap">
                  {comp.soldDate ? new Date(comp.soldDate).toLocaleDateString() : '—'}
                </span>
                <span className="text-gray-400 truncate">{comp.condition}</span>
                <span className="uppercase text-blue-500">{comp.platform}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
    ```
  - [ ] 7.4 Ensure `comparableSalesJson` and `compMatchConfidence` are included in the API query's `select` clause. Check that the existing opportunities query already fetches these fields from the listing relation — if not, add them.
  - [ ] 7.5 The low-confidence badge (AC #3) maps to `compMatchConfidence === 'low'`. The "insufficient market data" state (AC #4) maps to `compMatchConfidence === 'insufficient'`.

- [ ] Task 8: Write unit tests (AC: #1–4)
  - [ ] 8.1 Create `src/__tests__/lib/comp-matcher.test.ts`:
    - `parseSoldDate("Oct 15, 2024")` returns a valid Date in October 2024
    - `parseSoldDate("Sold Oct 15, 2024")` strips "Sold" prefix and returns same Date
    - `parseSoldDate("2 days ago")` returns a Date ~2 days before now
    - `parseSoldDate("12h ago")` returns a Date ~12 hours before now
    - `parseSoldDate("Unknown text")` returns `null`
    - `parseSoldDate("")` returns `null`
    - `filterByBrandModel("Apple iPhone 14 Pro", "Apple", "iPhone 14")` returns `true`
    - `filterByBrandModel("Samsung Galaxy S22", "Apple", "iPhone 14")` returns `false`
    - `filterByBrandModel("Some Listing", null, null)` returns `true` (no filter)
    - `calcConfidence(0)` returns `'insufficient'`
    - `calcConfidence(2)` returns `'low'`
    - `calcConfidence(3)` returns `'medium'`
    - `calcConfidence(5)` returns `'high'`
    - `findComparableSales()` returns comps filtered by brand+model when `fetchMarketPrice()` returns results
    - `findComparableSales()` returns `insufficientData: true` when all comps filtered out
    - `findComparableSales()` returns `null` when `fetchMarketPrice()` returns `null`
    - `findComparableSales()` uses `rawComps` when provided (no Playwright call)
    - `findComparableSales()` catches errors and returns `null`
  - [ ] 8.2 Mock `./market-price`:
    ```typescript
    jest.mock('@/lib/market-price', () => ({
      fetchMarketPrice: jest.fn(),
    }));
    ```
  - [ ] 8.3 Add tests to `src/__tests__/lib/marketplace-scanner.test.ts`:
    - `enrichWithCompMatches()` returns listings with `compMatches` populated when `findComparableSales()` resolves
    - `enrichWithCompMatches()` returns `compMatches: null` when `findComparableSales()` returns `null`
    - `enrichWithCompMatches()` handles exceptions without throwing
    - `enrichWithCompMatches()` uses `llmIdentification.searchQuery` when available
    - `enrichWithCompMatches()` falls back to `listing.title` when `llmIdentification` is absent
    - `formatForStorage()` maps `compMatches.comps` to `comparableSalesJson` (JSON string)
    - `formatForStorage()` maps `compMatches.confidence` to `compMatchConfidence`
    - `formatForStorage()` falls back to `verifiedPrice.comparableSalesJson` when `compMatches` is null
  - [ ] 8.4 Mock `@/lib/comp-matcher` at module level in scanner tests:
    ```typescript
    jest.mock('@/lib/comp-matcher', () => ({
      findComparableSales: jest.fn(),
    }));
    ```
  - [ ] 8.5 Verify coverage thresholds: `pnpm test:coverage`

- [ ] Task 9: Write BDD acceptance tests (AC: #1–4, FR: FR-SCORE-17)
  - [ ] 9.1 Append scenarios to `test/acceptance/features/E-005-advanced-market-intelligence.feature`
  - [ ] 9.2 **Scenario numbering:** Story 5.1 uses @E-005-S-1 through @E-005-S-3. **Start Story 5.2 at @E-005-S-4.**
  - [ ] 9.3 Write Scenario: LLM-filtered comp matching
    ```gherkin
    @E-005-S-4 @story-5-2 @FR-SCORE-17
    Scenario: Comp matching filters by brand and model not just keywords
      Given the comp-matcher module is loaded
      And fetchMarketPrice returns 5 sold listings including 3 matching "Apple iPhone 14 Pro" and 2 unrelated items
      When findComparableSales is called with searchQuery "Apple iPhone 14 Pro 256GB" and brand "Apple" and model "iPhone 14 Pro"
      Then the result contains 3 filtered comps
      And the confidence is "medium"
      And insufficientData is false
    ```
  - [ ] 9.4 Write Scenario: comp fields include sold date and platform
    ```gherkin
    @E-005-S-5 @story-5-2 @FR-SCORE-17
    Scenario: Each comparable sale includes required display fields
      Given the comp-matcher module is loaded
      And fetchMarketPrice returns a sold listing with title "Apple iPhone 14 Pro 256GB" sold on "Oct 15, 2024"
      When findComparableSales is called with matching brand and model
      Then the returned comp contains a non-null soldDate
      And the returned comp contains platform "ebay"
      And the returned comp contains condition
    ```
  - [ ] 9.5 Write Scenario: low-confidence warning when fewer than 3 matches
    ```gherkin
    @E-005-S-6 @story-5-2 @FR-SCORE-17
    Scenario: Low-confidence warning returned when fewer than 3 matches found
      Given the comp-matcher module is loaded
      And fetchMarketPrice returns 2 matching sold listings
      When findComparableSales is called
      Then the confidence is "low"
      And insufficientData is false
    ```
  - [ ] 9.6 Write Scenario: insufficient market data flag when no comps found
    ```gherkin
    @E-005-S-7 @story-5-2 @FR-SCORE-17
    Scenario: Insufficient market data flag set when no comparable sales found
      Given the comp-matcher module is loaded
      And fetchMarketPrice returns 5 results that do not match the brand "Obscure Brand"
      When findComparableSales is called with brand "Obscure Brand" and model "Unknown Model"
      Then insufficientData is true
      And the confidence is "insufficient"
      And comps is an empty array
    ```
  - [ ] 9.7 Create step definitions in `test/acceptance/step_definitions/E-005-comparable-sold-items.steps.ts`
  - [ ] 9.8 Update `_bmad-output/test-artifacts/requirements-traceability-matrix.md` — add FR-SCORE-17 row with test tag `@E-005-S-4 @E-005-S-5 @E-005-S-6 @E-005-S-7`

- [ ] Task 10: Final verification (all ACs)
  - [ ] 10.1 Run `pnpm lint` — no errors
  - [ ] 10.2 Run `pnpm build` — build passes (strict TypeScript mode)
  - [ ] 10.3 Run `pnpm test` — all tests pass, coverage thresholds met
  - [ ] 10.4 Run BDD acceptance tests: `CUCUMBER_TAGS="@story-5-2" make test-acceptance`
  - [ ] 10.5 Verify `compMatchConfidence` and `comparableSalesJson` are correctly set on saved opportunity listings
  - [ ] 10.6 Manual check: Opportunities page shows comp section with confidence badges

## Dev Notes

### Core Design: Three Things This Story Delivers

1. **Sold date parsing** — `parseSoldDate()` added to `market-price.ts` (small fix, AC #2 depends on it)
2. **`comp-matcher.ts`** — new service wrapping `market-price.ts` with brand/model filtering and confidence scoring
3. **Comp display in Opportunities UI** — shows individual sold comps with confidence indicators

**What this story is NOT:**
- Not a complete rewrite of `market-price.ts` — only a small additive date parsing change
- Not replacing Story 4.4's aggregate market value calculation — these are complementary
- Not a new Playwright scraper — it reuses `fetchMarketPrice()` from `market-price.ts`

### CRITICAL: market-price.ts Is Already Mostly Built — Minimal Change Required

`src/lib/market-price.ts` is 233 lines and **fully functional**. It exports:
- `fetchMarketPrice(searchQuery, category?)` → `Promise<MarketPrice | null>` — Playwright eBay scraping
- `fetchMarketPricesBatch([...])` → `Promise<(MarketPrice | null)[]>` — batch fetching
- `SoldListing` interface: `{title, price, soldDate: Date|null, condition, url, shippingCost}`
- `MarketPrice` interface: `{soldListings, medianPrice, lowPrice, highPrice, avgPrice, salesCount, ...}`
- `buildEbaySoldUrl()`, `parseEbayPrice()`, `median()`, `closeBrowser()`

**The only change needed (Task 1):** Add `parseSoldDate()` and fix the hardcoded `soldDate: null` in the `SoldListing` mapping. The raw date text IS being scraped (`item.soldDate` in `page.evaluate()`) but never parsed. This is the minimal change that enables AC #2.

**DO NOT** rewrite or restructure `market-price.ts`. Do NOT change `buildEbaySoldUrl()`, `parseEbayPrice()`, or `fetchMarketPrice()` logic.

### CRITICAL: Do NOT Call fetchMarketPrice() Twice for the Same Listing

Stories 4.4 and 5.2 both need eBay sold listings. Playwright scraping is slow (~5-10s per call). To avoid two Playwright calls per opportunity:

**Story 4.4** will be implemented first (it is `ready-for-dev`). When Story 5.2 runs, `listing.verifiedPrice` may contain the raw Playwright results. Story 5.2's `enrichWithCompMatches()` checks for `rawSoldListings` on `verifiedPrice` and passes them directly to `findComparableSales()`.

**Coordination with Story 4.4:** When Story 4.4 is implemented, the `VerifiedPriceLookupResult` interface in `market-value-calculator.ts` should include `rawSoldListings?: SoldListing[]` to expose the raw comp data for Story 5.2's reuse. If this field is not present by the time Story 5.2 is implemented, Story 5.2 will simply call `fetchMarketPrice()` independently. Both approaches work; the reuse approach is just more efficient.

```typescript
// In enrichWithCompMatches() — safe access pattern:
const rawComps = (listing.verifiedPrice as any)?.rawSoldListings ?? undefined;
// If rawComps is undefined, findComparableSales() calls fetchMarketPrice() itself
```

### Filtering Logic — "Not Just Keyword Overlap" (AC #1)

The LLM-generated `searchQuery` (from Story 4.3) already improves keyword quality. But without post-filtering, results still include near-miss items. For example:
- Searching "Apple iPhone 14 Pro 256GB" might return "Apple iPhone 14 (not Pro) 512GB" or "iPhone 14 Pro Case"

`filterByBrandModel()` enforces that both brand AND model appear in the comp title:
- `brand: "Apple", model: "iPhone 14 Pro"` → reject "Apple iPhone 14" and "iPhone 14 Pro Case"
- Only accept comps where both "apple" and "iphone 14 pro" appear (case-insensitive)

When brand or model is null (LLM identification not run, or item is unbranded), the filter is relaxed:
- Both null → accept all comps (keyword-only search, no additional filtering)
- Only brand → filter by brand only
- Only model → filter by model only

### Confidence Thresholds and Business Logic

| compMatchConfidence | Meaning | UI Display |
|--------------------|---------|------------|
| `high` | ≥ 5 matching comps | No warning — market data is solid |
| `medium` | 3–4 matching comps | No warning — acceptable confidence |
| `low` | 1–2 matching comps | "Low Confidence" badge (AC #3) |
| `insufficient` | 0 matching comps | "Insufficient Market Data" banner (AC #4) |

When `insufficient`: the listing still has `verifiedMarketValue` from Story 4.4 (if that ran), but the display should note reliance on algorithmic scoring.

### Scraper Pipeline Order — Story 5.2 Comes After Story 4.4

The full pipeline after all 5 stories in Epic 4 and Stories 5.1/5.2:

```
rawListings
    ↓
processListings()                    ← Tier 0: Algorithmic scoring (4.1/4.2)
    ↓ results.opportunities
enrichOpportunitiesWithLLM()         ← Tier 1: GPT-4o-mini identification (4.3)
    ↓ tier1Enriched
enrichOpportunitiesWithClaudeTier2() ← Tier 2: Claude structural analysis (5.1)
    ↓ tier2Enriched
enrichWithVerifiedMarketPrice()      ← Market price aggregation (4.4)
    ↓ marketEnriched
enrichWithCompMatches()              ← Comparable sold item matching (5.2) ← THIS STORY
    ↓ compEnriched
formatForStorage()
    ↓
prisma.listing.create/upsert()
```

If earlier stories haven't been wired into a route yet, the `enrichWithCompMatches()` call still works — it falls back to its own `fetchMarketPrice()` call when no prior enrichment data is available.

### Why comparableSalesJson Is Overwritten (Not a New Field)

Story 4.4 already stores top-5 comps in `comparableSalesJson` using `SoldListing` format (title, price, condition, url, shippingCost). Story 5.2 upgrades the format to `ComparableSale` (title, soldPrice, soldDate, condition, platform, url).

The overwrite in `formatForStorage()` is intentional: Story 5.2's comps are more valuable because they:
1. Are filtered by brand/model (not just keyword overlap)
2. Include `soldDate` (parsed from eBay text)
3. Include explicit `platform` field
4. Include confidence scoring

If Story 5.2 didn't run (e.g., `compMatches` is null), `comparableSalesJson` falls back to whatever Story 4.4 stored — no data is lost.

### Schema Migration Details

The only schema change in Story 5.2:
```prisma
// In Listing model, after line 53 (comparableSalesJson String?):
compMatchConfidence  String?   // 'high' | 'medium' | 'low' | 'insufficient'
```

Run: `npx prisma migrate dev --name add-comp-match-confidence`

After migration, the Prisma client in `src/generated/prisma/` is auto-regenerated by the `postinstall` hook. You can also manually regenerate: `npx prisma generate`.

All other fields needed (`comparableSalesJson`, `identifiedBrand`, `identifiedModel`, `identifiedCondition`, `identifiedSearchQuery`) already exist on the Listing model.

### Sold Date Parsing in market-price.ts — eBay Date Formats

eBay sold listings pages show dates in these formats:
- `"Oct 15, 2024"` — standard format (most common)
- `"Sold Oct 15, 2024"` — some listings show "Sold" prefix
- `"2 days ago"` — very recent sales
- `"12h ago"` — very recent sales (within a day)
- `""` — empty (no date available)

`parseSoldDate()` handles all four cases. For relative dates ("X days ago"), the result is an approximation but close enough for display purposes.

Dates earlier than ~90 days are unlikely in eBay completed listings (eBay typically shows 90-day history). `parseSoldDate()` returns `null` for any format it cannot recognize — this is safe and better than returning a wrong date.

### Opportunities Page — UI Architecture Notes

`app/opportunities/page.tsx` is the primary display surface for listing details. The comp section should be inserted in the listing detail area, after the market value section.

Key considerations for the UI:
- `comparableSalesJson` is a serialized JSON string — parse with `JSON.parse()` and handle parse errors
- `comp.soldDate` is stored as ISO string in JSON — wrap in `new Date()` for display
- Cap comp list display at 5 items (no scroll needed)
- Truncate long titles to ~50 characters with CSS `truncate` class

The opportunities page uses both an opportunity list view and an expanded detail view. Target the DETAIL view for comp display — users drilling into a specific opportunity will want comp verification data.

### Coverage Thresholds and New Test File

Jest enforces: 96% branches, 98% functions, 99% lines, 99% statements.

New file `src/lib/comp-matcher.ts` has these key branches to cover:
1. `rawComps` provided → skips `fetchMarketPrice()` call
2. `rawComps` not provided → calls `fetchMarketPrice()`
3. `fetchMarketPrice()` returns `null` → function returns `null`
4. All comps filtered out (brand/model mismatch) → `insufficientData: true`
5. `findComparableSales()` throws unexpected error → returns `null`
6. `filterByBrandModel()`: brand+model both provided, brand only, model only, neither
7. `calcConfidence()`: 0, 1-2, 3-4, 5+ counts

`parseSoldDate()` has branches for: "Sold" prefix, "X days ago", "Xh ago", standard month format, empty string, unrecognized format.

All branches **must** be covered in `src/__tests__/lib/comp-matcher.test.ts`.

### BDD Scenario Numbering

Story 5.1 created the E-005 feature file with scenarios @E-005-S-1, @E-005-S-2, @E-005-S-3.

**Story 5.2 scenarios start at @E-005-S-4** and run through @E-005-S-7 (4 scenarios).

When Story 5.3 is implemented, it will append starting at @E-005-S-8.

Do NOT renumber existing Story 5.1 scenarios.

### Existing Tests: DO NOT BREAK

| Test File | What It Tests | Must Still Pass |
|-----------|--------------|-----------------|
| `src/__tests__/lib/marketplace-scanner.test.ts` | Core scanner pipeline | Yes |
| `src/__tests__/lib/market-price.test.ts` (if exists) | `fetchMarketPrice()` and helpers | Yes — `parseSoldDate()` adds new tests, existing must still pass |
| `src/__tests__/lib/market-value-calculator.test.ts` | 17 market value tests | Yes |
| `src/__tests__/lib/value-estimator.test.ts` | 123 algorithmic score tests | Yes |
| `src/__tests__/lib/claude-analyzer.test.ts` | Claude analyzer | Yes |

### Test Mock Patterns

**In comp-matcher tests:**
```typescript
import { fetchMarketPrice } from '@/lib/market-price';
jest.mock('@/lib/market-price', () => ({
  fetchMarketPrice: jest.fn(),
}));

// Example mock setup:
(fetchMarketPrice as jest.Mock).mockResolvedValueOnce({
  soldListings: [
    { title: 'Apple iPhone 14 Pro 256GB Space Black', price: 650, soldDate: new Date('2024-10-15'), condition: 'Used', url: 'https://ebay.com/...', shippingCost: 0 },
    { title: 'Samsung Galaxy Unrelated', price: 300, soldDate: new Date('2024-10-10'), condition: 'Good', url: 'https://ebay.com/...', shippingCost: 5 },
  ],
  medianPrice: 650, lowPrice: 300, highPrice: 650, avgPrice: 475, salesCount: 2, ...
});
```

**In marketplace-scanner tests:**
```typescript
import { findComparableSales } from '@/lib/comp-matcher';
jest.mock('@/lib/comp-matcher', () => ({
  findComparableSales: jest.fn(),
}));
```

### Git Commit Style

Recent commit pattern: `✅ [SCOPE] Short description`
Examples for this story:
- `✅ [FEAT] Add comp-matcher service with brand/model filtering`
- `✅ [FEAT] Wire comparable sold item matching into scraper pipeline`
- `✅ [UI] Display comparable sales section on opportunities page`

### Project Structure Notes

- **Path alias:** `@/*` maps to `./src/*`
- **New function:** `enrichWithCompMatches()` exported from `src/lib/marketplace-scanner.ts`
- **New interface fields:** `compMatches?: CompMatchResult | null` on `AnalyzedListing`
- **DB migration:** `add-comp-match-confidence` — adds `compMatchConfidence String?` to Listing
- **Prisma client:** Auto-regenerated after migration; run `npx prisma generate` if needed

### Files To Create

| File | Purpose |
|------|---------|
| `src/lib/comp-matcher.ts` | New comp matching service with brand/model filtering |
| `src/__tests__/lib/comp-matcher.test.ts` | Unit tests for comp-matcher |
| `test/acceptance/step_definitions/E-005-comparable-sold-items.steps.ts` | BDD step definitions for Story 5.2 |

### Files To Modify

| File | Change |
|------|--------|
| `src/lib/market-price.ts` | Add `parseSoldDate()` function; fix `soldDate: null` → `parseSoldDate(item.soldDate)` |
| `prisma/schema.prisma` | Add `compMatchConfidence String?` to Listing model |
| `src/lib/marketplace-scanner.ts` | Add `compMatches` to `AnalyzedListing`; add `enrichWithCompMatches()`; update `formatForStorage()` |
| `app/api/scraper/craigslist/route.ts` | Add comp matching to pipeline |
| `app/api/scraper/ebay/route.ts` | Add comp matching to pipeline |
| `app/api/scraper/facebook/route.ts` | Add comp matching to pipeline |
| `app/api/scraper/mercari/route.ts` | Add comp matching to pipeline |
| `app/api/scraper/offerup/route.ts` | Add comp matching to pipeline |
| `app/api/scraper/craigslist/route.v2.ts` | Add comp matching if it has its own save path |
| `app/opportunities/page.tsx` | Add Comparable Sales section with confidence badges |
| `src/__tests__/lib/marketplace-scanner.test.ts` | Add `enrichWithCompMatches()` and `formatForStorage()` comp tests |
| `test/acceptance/features/E-005-advanced-market-intelligence.feature` | Append Story 5.2 scenarios @E-005-S-4 through @E-005-S-7 |
| `_bmad-output/test-artifacts/requirements-traceability-matrix.md` | Add FR-SCORE-17 row |

### Files To NOT Modify

| File | Reason |
|------|--------|
| `src/lib/market-value-calculator.ts` | Story 4.4's module — do not touch |
| `src/lib/llm-identifier.ts` | Story 4.3's module — do not touch |
| `src/lib/claude-analyzer.ts` | Story 5.1's module — do not touch |
| `src/lib/value-estimator.ts` | Algorithmic scoring — not in scope |
| `src/__tests__/lib/claude-analyzer.test.ts` | Already comprehensive — do not modify |
| `src/__tests__/lib/market-value-calculator.test.ts` | 17 existing tests must pass |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.2]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-5 — "Requires external API integrations: Apify (eBay sold comps/volume)"]
- [Source: src/lib/market-price.ts — fetchMarketPrice(), SoldListing interface, page.evaluate() date scraping]
- [Source: src/lib/marketplace-scanner.ts — AnalyzedListing interface, enrichOpportunitiesWithLLM() pattern, formatForStorage()]
- [Source: src/lib/llm-identifier.ts — ItemIdentification.searchQuery, brand, model, condition fields]
- [Source: prisma/schema.prisma — Listing.comparableSalesJson, Listing.identifiedBrand, Listing.identifiedModel]
- [Source: app/opportunities/page.tsx — Market detail section ~lines 735-745 for comp section insertion point]
- [Source: Story 4.3 — identifiedBrand, identifiedModel, identifiedSearchQuery as comp matching inputs]
- [Source: Story 4.4 — enrichWithVerifiedMarketPrice() pipeline position; rawSoldListings reuse opportunity]
- [Source: Story 5.1 — enrichOpportunitiesWithClaudeTier2() pipeline position; @E-005-S-3 last scenario]
- [Source: _bmad-output/test-artifacts/requirements-traceability-matrix.md — FR-SCORE-17 row to add]

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4.6

### Debug Log References
- No regressions introduced by Story 5.2 changes; pre-existing LandingPage and craigslist-demandLevel test failures confirmed to exist on clean main branch.

### Completion Notes List
- Task 9 scenario numbering adjusted: S-4 through S-8 already used by Story 5.4 (implemented first); Story 5.2 scenarios placed at S-9 through S-12.
- `rawComps` optimization: All 5 scraper routes pass `marketData.soldListings` (or `capturedMarketData.soldListings`) to `findComparableSales()` to avoid a second Playwright call.
- `capturedIdentification` pattern: Facebook, Mercari, and OfferUp routes hoist the LLM identification result to outer scope using the same `captured*` variable pattern already in use for `capturedMarketData`.
- eBay route uses centralized `enrichWithCompMatches()` from marketplace-scanner; other 4 routes call `findComparableSales()` inline due to their pipeline structure.
- Opportunities page handles both ComparableSale format (soldPrice/soldDate from Story 5.2) and legacy SoldListing format (price/soldAt from Story 4.4) in `parseComparableSales()`.

### File List
- `src/lib/comp-matcher.ts` — NEW: comp matching service
- `src/__tests__/lib/comp-matcher.test.ts` — NEW: unit tests (17 tests)
- `src/__tests__/lib/marketplace-scanner.test.ts` — MODIFIED: added mock + `enrichWithCompMatches()` test suite (6 tests)
- `src/lib/marketplace-scanner.ts` — MODIFIED: `enrichWithCompMatches()`, `formatForStorage()` comp fields, `AnalyzedListing.compMatches`
- `src/lib/market-price.ts` — MODIFIED: `parseSoldDate()` + fix `soldDate: null`
- `prisma/schema.prisma` — MODIFIED: `compMatchConfidence String?` on Listing model
- `src/generated/prisma/` — REGENERATED after schema migration
- `app/api/scraper/ebay/route.ts` — MODIFIED: pipeline wiring via `enrichWithCompMatches`
- `app/api/scraper/craigslist/route.ts` — MODIFIED: inline `findComparableSales()` call
- `app/api/scraper/facebook/route.ts` — MODIFIED: inline `findComparableSales()` call
- `app/api/scraper/mercari/route.ts` — MODIFIED: inline `findComparableSales()` call
- `app/api/scraper/offerup/route.ts` — MODIFIED: inline `findComparableSales()` call
- `app/opportunities/page.tsx` — MODIFIED: confidence badge + comp section with dual-format support
- `test/acceptance/features/E-005-advanced-market-intelligence.feature` — MODIFIED: appended S-9 through S-12
- `test/acceptance/step_definitions/E-005-comparable-sold-items.steps.ts` — NEW: BDD step definitions
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — UPDATED: story status → review
- `src/__tests__/lib/marketplace-scanner.test.ts` — MODIFIED (code review): added 7 `formatForStorage()` comp-field tests for Story 5.2 branch coverage
- `src/lib/marketplace-scanner.ts` — MODIFIED (code review): fixed unconditional 500ms delay in `enrichWithCompMatches()` — delay now skipped when `rawComps` pre-fetched
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` — MODIFIED (code review): corrected FR-SCORE coverage summary (10/22 covered, 45%)
