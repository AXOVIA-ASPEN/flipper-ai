# Story 6.3: Advanced Filtering

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69a467b064cb6cf1d0d86178

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **user**,
I want to filter listings by platform, score, profit, category, and status,
so that I can find specific items quickly in a large inventory.

## Acceptance Criteria

<!-- Each criterion MUST reference the FR-* requirement(s) it validates from the PRD -->

1. When the user opens the filter panel on the dashboard or opportunities page, filters are available for: platform (multi-select), score range (slider), profit range (min/max inputs), category (multi-select), and status (multi-select) `FR-DASH-06`
2. When filters are applied, only listings matching ALL active filters are displayed (AND logic across all filter types) `FR-DASH-06`
3. When the user clears a specific filter, the results update immediately to reflect the remaining active filters without clearing other active filters `FR-DASH-06`
4. When the user navigates away and returns, or shares/bookmarks the URL, filter state is encoded in URL query parameters and fully restored on page load `FR-DASH-06`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-DASH-06 | AC #1 | @FR-DASH-06 @story-6-3 |
| FR-DASH-06 | AC #2 | @FR-DASH-06 @story-6-3 |
| FR-DASH-06 | AC #3 | @FR-DASH-06 @story-6-3 |
| FR-DASH-06 | AC #4 | @FR-DASH-06 @story-6-3 |

## Definition of Done

- [x] All acceptance criteria are met and verified
- [x] Code reviewed and approved
- [x] Unit tests written and passing with coverage thresholds met (93% branches, 99% functions, 98% lines)
- [x] Acceptance test scenarios created with triple tags (@E-006-S-N, @FR-DASH-06 and @story-6-3)
- [x] Feature file: `test/acceptance/features/E-006-flip-lifecycle-management-analytics.feature` (create if new, append if exists)
- [x] Step definitions: `test/acceptance/step_definitions/E-006-advanced-filtering.steps.ts`
- [x] Requirements traceability matrix updated at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`
- [x] user_flows.feature NOT impacted (filtering is not a core user flow)
- [x] No regressions — existing dashboard, opportunities page, and API tests still pass
- [x] No lint errors (`pnpm lint`)
- [x] Build passes (`pnpm build`)
- [x] No schema changes required (filtering is query-only)
- [x] Dev notes and references are complete
- [ ] Trello card moved to Verified
- [ ] Feature card checklist item marked complete

## Tasks / Subtasks

- [x] Task 1: Extend `src/hooks/useFilterParams.ts` for multi-select support (AC: #3, #4, FR: FR-DASH-06)
  - [x]1.1 Add three new multi-select fields to `FilterState` interface:
    ```typescript
    export interface FilterState {
      // Existing single-value fields (keep for backward compat):
      status: string;
      location: string;
      category: string;
      minPrice: string;
      maxPrice: string;
      dateFrom: string;
      dateTo: string;
      platform: string;
      minScore: string;
      maxScore: string;
      minProfit: string;
      maxProfit: string;
      // NEW: multi-select fields (comma-separated values in URL):
      platforms: string;   // e.g. "CRAIGSLIST,EBAY"
      categories: string;  // e.g. "electronics,furniture"
      statuses: string;    // e.g. "IDENTIFIED,PURCHASED"
    }
    ```
  - [x]1.2 Add to `DEFAULT_FILTERS`:
    ```typescript
    platforms: '',
    categories: '',
    statuses: '',
    ```
  - [x]1.3 Add to `useMemo` filters read block:
    ```typescript
    platforms: searchParams.get('platforms') || DEFAULT_FILTERS.platforms,
    categories: searchParams.get('categories') || DEFAULT_FILTERS.categories,
    statuses: searchParams.get('statuses') || DEFAULT_FILTERS.statuses,
    ```
  - [x]1.4 Add to `updateURL` callback:
    ```typescript
    if (newFilters.platforms) params.set('platforms', newFilters.platforms);
    if (newFilters.categories) params.set('categories', newFilters.categories);
    if (newFilters.statuses) params.set('statuses', newFilters.statuses);
    ```
  - [x]1.5 Update `activeFilterCount` to count multi-select fields:
    ```typescript
    if (filters.platforms) count++;
    if (filters.categories) count++;
    if (filters.statuses) count++;
    ```
  - [x]1.6 Add two helper functions for toggling multi-select values:
    ```typescript
    /**
     * Toggles a value in a comma-separated filter string.
     * Returns the new comma-separated string.
     */
    export function toggleMultiSelectValue(current: string, value: string): string {
      const values = current ? current.split(',').filter(Boolean) : [];
      const idx = values.indexOf(value);
      if (idx === -1) {
        return [...values, value].join(',');
      }
      return values.filter((v) => v !== value).join(',');
    }

    /**
     * Returns whether a value is active in a comma-separated filter string.
     */
    export function isMultiSelectActive(current: string, value: string): boolean {
      return current ? current.split(',').filter(Boolean).includes(value) : false;
    }
    ```
  - [x]1.7 Export both helpers from `useFilterParams.ts`

- [x] Task 2: Create `src/components/FilterPanel.tsx` — shared filter panel component (AC: #1, #3, FR: FR-DASH-06)
  - [x]2.1 The component accepts these props:
    ```typescript
    interface FilterPanelProps {
      filters: FilterState;
      setFilter: (key: keyof FilterState, value: string) => void;
      setFilters: (newFilters: Partial<FilterState>) => void;
      clearFilters: () => void;
      activeFilterCount: number;
      /** Show status filter? Dashboard shows listing statuses; opportunities shows opportunity statuses */
      statusOptions?: Array<{ value: string; label: string }>;
    }
    ```
  - [x]2.2 **Platform multi-select** — clickable chip buttons for each platform:
    ```tsx
    const PLATFORM_OPTIONS = [
      { value: 'CRAIGSLIST', label: 'Craigslist' },
      { value: 'FACEBOOK_MARKETPLACE', label: 'Facebook' },
      { value: 'EBAY', label: 'eBay' },
      { value: 'OFFERUP', label: 'OfferUp' },
      { value: 'MERCARI', label: 'Mercari' },
    ];
    // Each chip: onClick → setFilter('platforms', toggleMultiSelectValue(filters.platforms, platform.value))
    // Active state: isMultiSelectActive(filters.platforms, platform.value)
    ```
  - [x]2.3 **Score range slider** — two `<input type="range">` inputs side by side (0–100):
    ```tsx
    <div>
      <label>Score Range: {filters.minScore || 0} – {filters.maxScore || 100}</label>
      <div className="flex gap-2 items-center">
        <input type="range" min="0" max="100" value={filters.minScore || '0'}
          onChange={(e) => setFilter('minScore', e.target.value === '0' ? '' : e.target.value)} />
        <input type="range" min="0" max="100" value={filters.maxScore || '100'}
          onChange={(e) => setFilter('maxScore', e.target.value === '100' ? '' : e.target.value)} />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>0</span><span>100</span>
      </div>
    </div>
    ```
  - [x]2.4 **Profit range** — two number inputs (existing pattern, no change needed):
    ```tsx
    <input type="number" placeholder="Min $" value={filters.minProfit}
      onChange={(e) => setFilter('minProfit', e.target.value)} />
    <input type="number" placeholder="Max $" value={filters.maxProfit}
      onChange={(e) => setFilter('maxProfit', e.target.value)} />
    ```
  - [x]2.5 **Category multi-select** — clickable chips for common categories + text input for "other":
    ```typescript
    const CATEGORY_OPTIONS = [
      'electronics', 'furniture', 'appliances', 'tools',
      'video games', 'collectibles', 'clothing', 'sports',
      'musical', 'automotive',
    ];
    // Each chip: onClick → setFilter('categories', toggleMultiSelectValue(filters.categories, cat))
    ```
  - [x]2.6 **Status multi-select** — render the `statusOptions` prop as clickable chips. Calling components pass appropriate status options:
    - Dashboard uses listing statuses: `NEW`, `OPPORTUNITY`
    - Opportunities page uses opportunity statuses: `IDENTIFIED`, `CONTACTED`, `PURCHASED`, `LISTED`, `SOLD`, `PASSED`
  - [x]2.7 **Active filter chips** — show currently active filter values as removable chips at the top of the panel:
    ```tsx
    {/* Active platform chips */}
    {filters.platforms.split(',').filter(Boolean).map(p => (
      <button key={p} onClick={() => setFilter('platforms', toggleMultiSelectValue(filters.platforms, p))}>
        {p} ×
      </button>
    ))}
    ```
  - [x]2.8 **Clear all filters** button: calls `clearFilters()` — already handled by `useFilterParams`
  - [x]2.9 Style: match the existing frosted glass aesthetic from `app/opportunities/page.tsx` (use `backdrop-blur-xl bg-white/10 rounded-xl border border-white/20`)

- [x] Task 3: Update `app/api/listings/route.ts` GET to support all filters (AC: #2, FR: FR-DASH-06)
  - [x]3.1 Read all filter params from `searchParams`:
    ```typescript
    const platform = searchParams.get('platform') || undefined;      // legacy single
    const platforms = searchParams.get('platforms') || undefined;     // new multi
    const minScore = searchParams.get('minScore') || searchParams.get('min_score');
    const maxScore = searchParams.get('maxScore');
    const minProfit = searchParams.get('minProfit');
    const maxProfit = searchParams.get('maxProfit');
    const category = searchParams.get('category');
    const categories = searchParams.get('categories');
    const status = searchParams.get('status');
    const statuses = searchParams.get('statuses');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    ```
  - [x]3.2 Build Prisma `where` clause with ALL active filters:
    ```typescript
    const where: Prisma.ListingWhereInput = { userId };

    // Platform (multi takes precedence over single)
    const platformList = platforms ? platforms.split(',').filter(Boolean)
      : platform ? [platform] : null;
    if (platformList?.length) where.platform = { in: platformList };

    // Score range
    if (minScore || maxScore) {
      where.valueScore = {
        ...(minScore ? { gte: parseFloat(minScore) } : {}),
        ...(maxScore ? { lte: parseFloat(maxScore) } : {}),
      };
    }

    // Profit range
    if (minProfit || maxProfit) {
      where.profitPotential = {
        ...(minProfit ? { gte: parseFloat(minProfit) } : {}),
        ...(maxProfit ? { lte: parseFloat(maxProfit) } : {}),
      };
    }

    // Category (multi takes precedence over single)
    const categoryList = categories ? categories.split(',').filter(Boolean)
      : category ? [category] : null;
    if (categoryList?.length) where.category = { in: categoryList };

    // Status (multi takes precedence over single)
    const statusList = statuses ? statuses.split(',').filter(Boolean)
      : status && status !== 'all' ? [status] : null;
    if (statusList?.length) where.status = { in: statusList };
    ```
  - [x]3.3 Add pagination to the query:
    ```typescript
    const skip = (page - 1) * limit;
    const [listings, total] = await prisma.$transaction([
      prisma.listing.findMany({ where, orderBy: { scrapedAt: 'desc' }, skip, take: limit,
        include: { images: { take: 1, select: { storageUrl: true } } } }),
      prisma.listing.count({ where }),
    ]);
    ```
  - [x]3.4 Return paginated response shape:
    ```typescript
    return NextResponse.json({
      success: true,
      listings,
      total,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
    ```
  - [x]3.5 **Note:** `Prisma.ListingWhereInput` requires importing `Prisma` from `@/generated/prisma` — use `import type { Prisma } from '@/generated/prisma'` for type safety

- [x] Task 4: Update `app/api/opportunities/route.ts` GET to support all filters (AC: #2, FR: FR-DASH-06)
  - [x]4.1 Read filter params (same set as Task 3.1 minus price params, plus opportunity status)
  - [x]4.2 Build `where` clause targeting the nested `listing` relation:
    ```typescript
    const where: Prisma.OpportunityWhereInput = { userId };
    const listingWhere: Prisma.ListingWhereInput = {};

    // Opportunity status (multi-select)
    const statusList = statuses ? statuses.split(',').filter(Boolean)
      : status && status !== 'all' ? [status] : null;
    if (statusList?.length) where.status = { in: statusList };

    // Platform filter (nested on listing)
    const platformList = platforms ? platforms.split(',').filter(Boolean)
      : platform ? [platform] : null;
    if (platformList?.length) listingWhere.platform = { in: platformList };

    // Score range (on listing)
    if (minScore || maxScore) {
      listingWhere.valueScore = {
        ...(minScore ? { gte: parseFloat(minScore) } : {}),
        ...(maxScore ? { lte: parseFloat(maxScore) } : {}),
      };
    }

    // Profit range (on listing)
    if (minProfit || maxProfit) {
      listingWhere.profitPotential = {
        ...(minProfit ? { gte: parseFloat(minProfit) } : {}),
        ...(maxProfit ? { lte: parseFloat(maxProfit) } : {}),
      };
    }

    // Category (on listing)
    const categoryList = categories ? categories.split(',').filter(Boolean)
      : category ? [category] : null;
    if (categoryList?.length) listingWhere.category = { in: categoryList };

    // Apply listing filters if any exist
    if (Object.keys(listingWhere).length > 0) {
      where.listing = listingWhere;
    }
    ```
  - [x]4.3 Add pagination and stats calculation:
    ```typescript
    const skip = (page - 1) * limit;
    const [opportunities, total] = await prisma.$transaction([
      prisma.opportunity.findMany({
        where, include: { listing: { include: { images: { take: 1 } } } },
        orderBy: { createdAt: 'desc' }, skip, take: limit,
      }),
      prisma.opportunity.count({ where }),
    ]);

    // Stats calculated over ALL matching opportunities (not just current page)
    const allMatching = await prisma.opportunity.findMany({
      where, select: { purchasePrice: true, salePrice: true, status: true,
        listing: { select: { profitPotential: true } } },
    });
    const stats = {
      totalOpportunities: total,
      totalProfit: allMatching.reduce((sum, o) =>
        sum + (o.salePrice && o.purchasePrice ? (o.salePrice - o.purchasePrice) : 0), 0),
      totalInvested: allMatching.reduce((sum, o) => sum + (o.purchasePrice || 0), 0),
      totalRevenue: allMatching.reduce((sum, o) => sum + (o.salePrice || 0), 0),
    };
    ```
  - [x]4.4 Return response with stats and pagination (matches current shape expected by opportunities page)

- [x] Task 5: Migrate `app/opportunities/page.tsx` from local state to `useFilterParams` (AC: #3, #4, FR: FR-DASH-06)
  - [x]5.1 Remove these local state declarations:
    ```typescript
    // REMOVE these:
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [platformFilter, setPlatformFilter] = useState<string>('all');
    const [minScore, setMinScore] = useState<string>('');
    const [maxScore, setMaxScore] = useState<string>('');
    const [minProfit, setMinProfit] = useState<string>('');
    const [maxProfit, setMaxProfit] = useState<string>('');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    ```
  - [x]5.2 Add `useFilterParams` hook (already used by dashboard):
    ```typescript
    const { filters, setFilter, setFilters, clearFilters, activeFilterCount } = useFilterParams();
    ```
  - [x]5.3 Update `useEffect` dependency from local state to `filters`:
    ```typescript
    useEffect(() => {
      fetchOpportunities();
    }, [filters]);
    ```
  - [x]5.4 Update `fetchOpportunities()` to build params from `filters` object:
    ```typescript
    async function fetchOpportunities() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.statuses) params.set('statuses', filters.statuses);
        else if (filters.status && filters.status !== 'all') params.set('status', filters.status);
        if (filters.platforms) params.set('platforms', filters.platforms);
        else if (filters.platform && filters.platform !== 'all') params.set('platform', filters.platform);
        if (filters.minScore) params.set('minScore', filters.minScore);
        if (filters.maxScore) params.set('maxScore', filters.maxScore);
        if (filters.minProfit) params.set('minProfit', filters.minProfit);
        if (filters.maxProfit) params.set('maxProfit', filters.maxProfit);
        if (filters.categories) params.set('categories', filters.categories);
        else if (filters.category) params.set('category', filters.category);
        // ...
      }
    }
    ```
  - [x]5.5 Replace the existing inline filter panel with the new `<FilterPanel>` component:
    - Pass `statusOptions` with opportunity lifecycle statuses: `IDENTIFIED`, `CONTACTED`, `PURCHASED`, `LISTED`, `SOLD`, `PASSED`
    - Preserve the "More Filters" toggle (`showAdvancedFilters` can stay as local UI state — it controls panel visibility only, not filter values)
    - Keep the `searchTerm` as local state since it's a client-side text search (not URL-persisted, not server-side filtered)
  - [x]5.6 Update `filteredOpportunities` client-side search:
    - The server now handles all filter params; client-side only needs to apply `searchTerm`
    - Remove the client-side status/platform/score/profit checks that duplicate server filtering
    ```typescript
    const filteredOpportunities = opportunities.filter((opp) => {
      if (!searchTerm) return true;
      const normalized = searchTerm.toLowerCase();
      return opp.listing.title.toLowerCase().includes(normalized)
        || opp.listing.platform.toLowerCase().includes(normalized)
        || (opp.listing.category || '').toLowerCase().includes(normalized);
    });
    ```

- [x] Task 6: Update `app/dashboard/page.tsx` to add filter panel UI (AC: #1, FR: FR-DASH-06)
  - [x]6.1 The dashboard already uses `useFilterParams` and passes filter params to the API. But it currently has NO filter panel UI visible to the user. Add the `<FilterPanel>` component.
  - [x]6.2 Add a "Filters" button/section above the listings grid:
    ```tsx
    {/* Filter Panel */}
    <div className="mb-6">
      <FilterPanel
        filters={filters}
        setFilter={setFilter}
        setFilters={setFilters}
        clearFilters={clearFilters}
        activeFilterCount={activeFilterCount}
        statusOptions={[
          { value: 'NEW', label: 'New' },
          { value: 'OPPORTUNITY', label: 'Opportunity' },
        ]}
      />
    </div>
    ```
  - [x]6.3 Update `fetchListings()` in dashboard to send all filter params (currently it iterates `filters` object entries generically — verify the parameter names match the API):
    - The existing code does `Object.entries(filters).forEach(...)` which may send `platforms`, `categories`, `statuses` correctly to the API once the API supports them
    - Verify no `'all'` value is sent for `status` or `platform` default values

- [x] Task 7: Write unit tests (AC: #1–4, FR: FR-DASH-06)
  - [x]7.1 Create `src/__tests__/hooks/useFilterParams.test.ts`:
    - `toggleMultiSelectValue('CRAIGSLIST', 'EBAY')` → `'CRAIGSLIST,EBAY'`
    - `toggleMultiSelectValue('CRAIGSLIST,EBAY', 'CRAIGSLIST')` → `'EBAY'`
    - `toggleMultiSelectValue('', 'EBAY')` → `'EBAY'`
    - `isMultiSelectActive('CRAIGSLIST,EBAY', 'EBAY')` → `true`
    - `isMultiSelectActive('CRAIGSLIST,EBAY', 'MERCARI')` → `false`
    - `isMultiSelectActive('', 'EBAY')` → `false`
    - `clearFilters()` resets all fields to defaults including new multi-select fields
    - URL encoding: setting `platforms = 'CRAIGSLIST,EBAY'` encodes correctly in URL
  - [x]7.2 Create `src/__tests__/api/listings.test.ts` (or extend existing):
    - GET with `platforms=CRAIGSLIST,EBAY` → returns only listings from those platforms
    - GET with `minScore=70&maxScore=90` → returns only listings with score in range
    - GET with `minProfit=50` → returns only listings with profit >= 50
    - GET with `categories=electronics,tools` → returns only listings in those categories
    - GET with `statuses=NEW` → returns only NEW listings
    - GET with multiple filters → applies AND logic across all
    - GET with `page=2&limit=10` → returns correct page with pagination metadata
    - GET with no filters → returns all user's listings (unchanged behavior)
  - [x]7.3 Create `src/__tests__/api/opportunities.test.ts` (or extend existing):
    - GET with `statuses=IDENTIFIED,PURCHASED` → returns only opportunities in those statuses
    - GET with `platforms=EBAY` → returns only opportunities from eBay listings
    - GET with `minScore=80` → returns only opportunities with listing score >= 80
    - GET with `minProfit=100` → returns only opportunities with profit >= 100
    - GET with multiple filters → AND logic
    - Pagination works correctly
    - Stats reflect ALL matching opportunities, not just current page
  - [x]7.4 Verify all existing tests still pass
  - [x]7.5 Verify coverage thresholds: 96% branches, 98% functions, 99% lines

- [x] Task 8: Write BDD acceptance tests (AC: #1–4, FR: FR-DASH-06)
  - [x]8.1 Create or append to `test/acceptance/features/E-006-flip-lifecycle-management-analytics.feature`
  - [x]8.2 **IMPORTANT: Scenario numbering.** This feature file is shared across all Epic 6 stories. Check the file for the last used `@E-006-S-N` number. Stories 6.1 (4 ACs → ~4 scenarios) and 6.2 (6 ACs → ~6 scenarios) would bring us to ~@E-006-S-10 before 6.3's scenarios begin. Verify actual file content.
  - [x]8.3 Write scenarios:
    ```gherkin
    @E-006-S-N @story-6-3 @FR-DASH-06
    Scenario: Platform multi-select filter shows only matching listings
      Given I have opportunities from "CRAIGSLIST" and "EBAY"
      When I select "CRAIGSLIST" and "EBAY" in the platform filter
      Then only CRAIGSLIST and EBAY opportunities are displayed
      And OFFERUP opportunities are not displayed

    @E-006-S-N @story-6-3 @FR-DASH-06
    Scenario: Score range filter limits results
      Given I have opportunities with scores 60, 75, and 90
      When I set the minimum score filter to 70
      Then only opportunities with score 75 and 90 are displayed

    @E-006-S-N @story-6-3 @FR-DASH-06
    Scenario: Multiple filters apply AND logic
      Given I have opportunities with mixed platforms and scores
      When I filter by platform "EBAY" and minimum score 80
      Then only eBay opportunities with score >= 80 are displayed

    @E-006-S-N @story-6-3 @FR-DASH-06
    Scenario: Clearing one filter preserves others
      Given I have active filters for platform "EBAY" and minimum score 80
      When I clear the platform filter
      Then opportunities from all platforms with score >= 80 are displayed

    @E-006-S-N @story-6-3 @FR-DASH-06
    Scenario: Filter state persists in URL on navigation
      Given I have set a platform filter for "CRAIGSLIST"
      When I navigate away and return
      Then the CRAIGSLIST filter is still active
      And only CRAIGSLIST opportunities are displayed
    ```
  - [x]8.4 Create step definitions in `test/acceptance/step_definitions/E-006-advanced-filtering.steps.ts`
  - [x]8.5 Update requirements traceability matrix at `_bmad-output/test-artifacts/requirements-traceability-matrix.md` — add FR-DASH-06 row

- [x] Task 9: Final verification (all ACs)
  - [x]9.1 Run `pnpm lint` — no errors
  - [x]9.2 Run `pnpm build` — build passes
  - [x]9.3 Run `pnpm test` — all tests pass, coverage thresholds met
  - [x]9.4 Run acceptance tests: `CUCUMBER_TAGS="@story-6-3" make test-acceptance`
  - [x]9.5 Manual check: open `/opportunities` and verify all 5 filter types work correctly
  - [x]9.6 Manual check: apply filters, copy URL, open in new tab — filters restore correctly
  - [x]9.7 Manual check: clear one filter at a time — others remain active

## Dev Notes

### CRITICAL: What Already Exists — Do NOT Reinvent

**`src/hooks/useFilterParams.ts` — Already built and working:**
```typescript
// FilterState already has most needed fields:
export interface FilterState {
  status: string;      // single-value legacy
  platform: string;    // single-value legacy
  category: string;    // single-value legacy
  minScore: string;
  maxScore: string;
  minProfit: string;
  maxProfit: string;
  location: string;
  minPrice: string;
  maxPrice: string;
  dateFrom: string;
  dateTo: string;
}

// Key methods:
setFilter(key: keyof FilterState, value: string) → updates URL
setFilters(partial: Partial<FilterState>) → updates multiple at once
clearFilters() → resets all to defaults
activeFilterCount: number → count of active non-default filters
```
**Story 6.3 extends this** with `platforms`, `categories`, `statuses` multi-select fields. The hook already handles URL serialization correctly — just add the new fields.

**`app/opportunities/page.tsx` — Existing filter state (TO BE REPLACED):**

The opportunities page currently uses LOCAL React state for filters:
```typescript
const [statusFilter, setStatusFilter] = useState<string>('all');  // REMOVE
const [platformFilter, setPlatformFilter] = useState<string>('all');  // REMOVE
const [minScore, setMinScore] = useState<string>('');  // REMOVE
const [maxScore, setMaxScore] = useState<string>('');  // REMOVE
const [minProfit, setMinProfit] = useState<string>('');  // REMOVE
const [maxProfit, setMaxProfit] = useState<string>('');  // REMOVE
```
This is the **primary gap** causing filters to NOT be URL-persistent. These must be replaced with `useFilterParams`.

**`app/dashboard/page.tsx` — Already uses `useFilterParams` but lacks filter UI:**

The dashboard (lines 1-250) already:
- Imports `useFilterParams` from `@/hooks/useFilterParams`
- Calls `useEffect(() => fetchListings(), [filters])`
- Passes `filters` to `/api/listings` via URL params

But there is **no visible filter panel rendered** in the dashboard UI. Story 6.3 adds the filter panel.

**`app/api/listings/route.ts` — Current minimal filter support:**
```typescript
// Currently only handles:
const platform = searchParams.get('platform') || undefined;  // single value
const minScore = searchParams.get('min_score');  // different param name!
// Nothing else!
```
Note the existing `min_score` param name (underscore) vs the hook's `minScore` (camelCase). The dashboard passes `minScore` (from the hook) but the API reads `min_score`. This is a **pre-existing bug** to fix in Task 3.

**`app/api/opportunities/route.ts` — NO filter support:**
```typescript
// Currently only handles 'limit' param — nothing else
```
The opportunities page currently does client-side filtering of the returned array. This works for small datasets but is inefficient and unreliable for URL-persistence.

**DO NOT:**
- Reinvent the URL state management — `useFilterParams` already handles it perfectly
- Add new npm packages for range sliders — use native `<input type="range">`
- Add full-text search to the API routes (searchTerm stays as client-side filter for UX responsiveness)
- Make any schema changes — filtering is query-only
- Add a filtering hook separate from `useFilterParams` — extend it instead

**DO:**
1. Extend `useFilterParams` with `platforms`, `categories`, `statuses` multi-select fields + two helper functions
2. Create `FilterPanel.tsx` as a reusable component used by both pages
3. Fix the `min_score` vs `minScore` param name mismatch in `/api/listings`
4. Add full filter support to both API routes using Prisma where clauses
5. Replace local filter state in opportunities page with `useFilterParams`

### Multi-Select Implementation Pattern

The multi-select filter approach uses comma-separated URL param values:
```
/opportunities?platforms=CRAIGSLIST,EBAY&statuses=IDENTIFIED,PURCHASED&minScore=70
```

**Frontend toggle (from `toggleMultiSelectValue` helper):**
```typescript
// User clicks "EBAY" platform chip:
setFilter('platforms', toggleMultiSelectValue(filters.platforms, 'EBAY'));
// If filters.platforms was 'CRAIGSLIST' → becomes 'CRAIGSLIST,EBAY'
// If filters.platforms was 'CRAIGSLIST,EBAY' → becomes 'CRAIGSLIST' (deselect)
```

**API parsing:**
```typescript
const platformList = platforms ? platforms.split(',').filter(Boolean) : null;
if (platformList?.length) where.platform = { in: platformList };
```

**Visual state (from `isMultiSelectActive` helper):**
```typescript
// Is "EBAY" chip highlighted?
const isActive = isMultiSelectActive(filters.platforms, 'EBAY');
```

### Score Range Slider UI Pattern

Use two range inputs side-by-side (no library needed):
```tsx
<div className="space-y-2">
  <div className="flex justify-between text-xs text-blue-200/70">
    <span>Score: {filters.minScore || '0'} – {filters.maxScore || '100'}</span>
  </div>
  <div className="flex gap-3 items-center">
    <label className="text-xs text-blue-200/70 w-8">Min</label>
    <input
      type="range" min="0" max="100" step="5"
      value={filters.minScore || '0'}
      onChange={(e) => setFilter('minScore', e.target.value === '0' ? '' : e.target.value)}
      className="flex-1 accent-blue-500"
    />
  </div>
  <div className="flex gap-3 items-center">
    <label className="text-xs text-blue-200/70 w-8">Max</label>
    <input
      type="range" min="0" max="100" step="5"
      value={filters.maxScore || '100'}
      onChange={(e) => setFilter('maxScore', e.target.value === '100' ? '' : e.target.value)}
      className="flex-1 accent-blue-500"
    />
  </div>
</div>
```

### Prisma Type Import

The API routes need `Prisma` namespace for typed where clauses:
```typescript
// In route.ts files:
import type { Prisma } from '@/generated/prisma';
// NOT from '@prisma/client' — project uses custom output path
```

### API Route — AND Logic for Filtering

All active filters use AND logic (Prisma `where` clauses compose naturally as AND). Example with all filters active:
```typescript
const where: Prisma.ListingWhereInput = {
  userId: userId,                              // always required
  platform: { in: ['CRAIGSLIST', 'EBAY'] },   // platforms filter
  valueScore: { gte: 70, lte: 95 },            // score range
  profitPotential: { gte: 50 },                // profit filter
  category: { in: ['electronics', 'tools'] },  // categories filter
  status: { in: ['OPPORTUNITY'] },              // status filter
};
// Prisma AND semantics: listing must match ALL conditions
```

### Pagination Response Shape

The API routes need to return pagination metadata so the frontend can render pagination controls. Match the shape already expected by `app/dashboard/page.tsx`:
```typescript
// From dashboard page (lines 99-103):
setPagination(data.pagination || {
  page: 1,
  limit: 20,
  total: data.total || 0,
  totalPages: Math.ceil((data.total || 0) / 20),
});
```
Return: `{ success: true, listings, total, pagination: { page, limit, total, totalPages } }`

### Pre-existing `min_score` Parameter Bug

The dashboard passes `minScore` (camelCase) from `useFilterParams`, but `app/api/listings/route.ts` reads `min_score` (underscore). Fix in Task 3 by reading BOTH:
```typescript
const minScore = searchParams.get('minScore') || searchParams.get('min_score');
```
This maintains backward compatibility with any existing code that uses `min_score`.

### Opportunities Page — filteredOpportunities Refactor

Current code on opportunities page (line ~355):
```typescript
const filteredOpportunities = opportunities.filter((opp) => {
  const matchesStatus = statusFilter === 'all' || opp.status === statusFilter;
  const matchesPlatform = platformFilter === 'all' || opp.listing.platform === platformFilter;
  // ... etc
});
```
After Task 5, remove ALL filter logic here (server handles it). Keep only `searchTerm` client-side filter:
```typescript
const filteredOpportunities = searchTerm
  ? opportunities.filter((opp) =>
      opp.listing.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  : opportunities;
```

### BDD Scenario Numbering

Epic 6 shares one feature file. Estimate prior story scenario counts:
- Story 6.1 (4 ACs): ~4 scenarios → @E-006-S-1 through @E-006-S-4
- Story 6.2 (6 ACs): ~6 scenarios → @E-006-S-5 through @E-006-S-10
- **Story 6.3 (5 scenarios): starts at ~@E-006-S-11** (verify actual file content)

**ALWAYS check** `test/acceptance/features/E-006-flip-lifecycle-management-analytics.feature` before writing scenarios.

### Existing Test Coverage — DO NOT BREAK

| Test File | Tests | Must Pass |
|-----------|-------|-----------|
| `src/__tests__/api/craigslist-scraper.test.ts` | Existing | Yes |
| `src/__tests__/api/user-settings.test.ts` | Existing | Yes |
| `src/__tests__/marketplace-scanner.test.ts` | Existing | Yes |
| `src/__tests__/lib/marketplace-scanner.test.ts` | Existing | Yes |

### Files To Create

| File | Purpose |
|------|---------|
| `src/components/FilterPanel.tsx` | Shared filter panel with multi-select chips, range sliders, profit range inputs |
| `src/__tests__/hooks/useFilterParams.test.ts` | Unit tests for `toggleMultiSelectValue`, `isMultiSelectActive`, and hook behavior |
| `src/__tests__/api/listings.test.ts` | Unit tests for full filter support in GET /api/listings |
| `src/__tests__/api/opportunities.test.ts` | Unit tests for full filter support in GET /api/opportunities |
| `test/acceptance/step_definitions/E-006-advanced-filtering.steps.ts` | BDD step definitions for Story 6.3 |

### Files To Modify

| File | Change |
|------|--------|
| `src/hooks/useFilterParams.ts` | Add `platforms`, `categories`, `statuses` fields; add `toggleMultiSelectValue` and `isMultiSelectActive` helpers |
| `app/api/listings/route.ts` | Add full filter support: platforms (multi), categories, statuses, score/profit ranges, pagination; fix `min_score` param name |
| `app/api/opportunities/route.ts` | Add full filter support: statuses (multi), platforms, score/profit ranges, categories, pagination |
| `app/opportunities/page.tsx` | Replace local filter state with `useFilterParams`; replace inline filter panel with `<FilterPanel>` component |
| `app/dashboard/page.tsx` | Add `<FilterPanel>` component to UI (API already receives filter params) |
| `_bmad-output/test-artifacts/requirements-traceability-matrix.md` | Add FR-DASH-06 row |

### Files To NOT Modify

| File | Reason |
|------|--------|
| `prisma/schema.prisma` | No schema changes needed — filtering is query-only |
| `src/lib/value-estimator.ts` | Scoring logic — not in scope |
| `src/lib/marketplace-scanner.ts` | Scanner pipeline — not in scope |
| `src/components/KanbanBoard.tsx` | Kanban display — Story 6.2 scope |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-6.3]
- [Source: _bmad-output/planning-artifacts/epics.md#FR-DASH-06 — "advanced filtering by platform, score, profit, category, status"]
- [Source: src/hooks/useFilterParams.ts — existing URL filter state hook to extend]
- [Source: app/opportunities/page.tsx lines ~228-243 — local filter state to replace]
- [Source: app/opportunities/page.tsx lines ~569-652 — existing filter panel UI to refactor]
- [Source: app/dashboard/page.tsx lines 4-70 — already uses useFilterParams, needs filter UI added]
- [Source: app/api/listings/route.ts lines 19-25 — minimal filter support to extend]
- [Source: app/api/opportunities/route.ts lines 19-26 — no filter support, to be built]
- [Source: _bmad-output/planning-artifacts/architecture.md — API patterns, Prisma singleton usage]

### Git Intelligence

Recent commit style: `emoji [CATEGORY] Description` (e.g., `✅ [TEST] Fix Dashboard component tests`)
Coverage strictly enforced: 96% branches, 98% functions, 99% lines — new API route logic and hook helpers need full test coverage. No new npm packages needed for this story.

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List

| File | Change |
|------|--------|
| `src/hooks/useFilterParams.ts` | Modified — added `platforms`, `categories`, `statuses` fields; `toggleMultiSelectValue` and `isMultiSelectActive` helpers |
| `src/components/FilterPanel.tsx` | Created — shared filter panel with platform chips, score sliders, profit range, category chips, status chips |
| `app/api/listings/route.ts` | Modified — full filter support: platforms (multi), categories, statuses, score/profit ranges, pagination; fixed `min_score` param name |
| `app/api/opportunities/route.ts` | Modified — full filter support: statuses (multi), platforms, score/profit ranges, categories, pagination |
| `app/opportunities/page.tsx` | Modified — replaced local filter state with `useFilterParams`; replaced inline panel with `<FilterPanel>` |
| `app/dashboard/page.tsx` | Modified — added `<FilterPanel>` to UI |
| `src/__tests__/hooks/useFilterParams.test.ts` | Created — unit tests for `toggleMultiSelectValue`, `isMultiSelectActive`, hook URL encoding/clearing |
| `src/__tests__/api/listings.test.ts` | Modified — added filter tests: platforms, score range, profit range, categories, statuses, AND logic, pagination |
| `src/__tests__/api/opportunities.test.ts` | Modified — added filter tests: statuses, platforms, score/profit range, AND logic, stats-over-all-matching |
| `test/acceptance/features/E-006-flip-lifecycle-management-analytics.feature` | Modified — added S-16 through S-20 scenarios for Story 6.3 |
| `test/acceptance/step_definitions/E-006-advanced-filtering.steps.ts` | Created — BDD step definitions for S-16 through S-20 |
| `_bmad-output/test-artifacts/requirements-traceability-matrix.md` | Modified — added FR-DASH-06 row with scenario IDs |
