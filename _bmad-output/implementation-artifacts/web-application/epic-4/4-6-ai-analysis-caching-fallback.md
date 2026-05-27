# Story 4.6: AI Analysis Caching & Fallback

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69a45d7ee7f86ed9ae445bbb

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **user**,
I want AI analysis results cached and algorithmic scoring available as fallback,
so that performance is fast and the system works even when AI APIs are down.

## Acceptance Criteria

<!-- Each criterion MUST reference the FR-* requirement(s) it validates from the PRD -->

1. When an AI analysis (Claude or OpenAI) is completed for a listing, the result is stored in the `AiAnalysisCache` database table with a 24-hour TTL (`expiresAt = now + 24h`). `FR-SCORE-14`
2. When an analysis is requested for a listing that already has a valid cache entry (less than 24 hours old), the cached result is returned without making a new API call. `FR-SCORE-14`
3. When a cache entry is older than 24 hours (expired), a new API call is made and the cache is refreshed with the new result. `FR-SCORE-14`
4. When all AI APIs (OpenAI and Anthropic) are unavailable or return errors, the system falls back to algorithmic scoring (using `estimateValue()` from `value-estimator.ts`), and the API response includes `"isAiFallback": true` to notify the caller. `FR-SCORE-15`
5. When AI APIs recover after an outage, the next analysis request automatically resumes LLM-based analysis without any manual intervention — the system retries the live API and, on success, stores the result in cache. `FR-SCORE-15`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-SCORE-14 | AC #1 — Results stored with 24-hour TTL | @FR-SCORE-14 @story-4-6 |
| FR-SCORE-14 | AC #2 — Cache hit returns without API call | @FR-SCORE-14 @story-4-6 |
| FR-SCORE-14 | AC #3 — Expired cache triggers refresh | @FR-SCORE-14 @story-4-6 |
| FR-SCORE-15 | AC #4 — All APIs down → algorithmic fallback with isAiFallback flag | @FR-SCORE-15 @story-4-6 |
| FR-SCORE-15 | AC #5 — APIs recover → LLM analysis resumes automatically | @FR-SCORE-15 @story-4-6 |

## Definition of Done

- [ ] All acceptance criteria are met and verified
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing (cache hit, cache miss, expired, fallback, recovery paths)
- [ ] Acceptance test scenarios created with dual tags (`@FR-SCORE-14` + `@story-4-6`, `@FR-SCORE-15` + `@story-4-6`)
- [ ] BDD scenarios added to `test/acceptance/features/E-004-core-scoring-deal-evaluation.feature`
- [ ] user_flows.feature updated if story affects user flows (unlikely here — backend only)
- [ ] No regressions — existing `claude-analyzer` and `llm-analyzer` tests still pass
- [ ] `app/api/analyze/[listingId]/route.ts` no longer returns 501
- [ ] Dev notes and references are complete
- [ ] Trello card moved to Verified
- [ ] Feature card checklist item marked complete

## Tasks / Subtasks

- [x] Task 1: Add `analysisType` field to `AiAnalysisCache` schema and migrate (AC: #1, FR: FR-SCORE-14)
  - [x] Add `analysisType String @default("claude")` to `AiAnalysisCache` in `prisma/schema.prisma`
  - [x] Add `@@unique([listingId, analysisType])` or use upsert logic to avoid duplicates
  - [x] Run `npx prisma migrate dev --name add-analysis-type-to-cache`
- [x] Task 2: Add in-memory L1 caching to `claude-analyzer.ts` (AC: #2, FR: FR-SCORE-14)
  - [x] Import `analysisCache` from `@/lib/cache`
  - [x] In `getCachedAnalysis()`: check `analysisCache.get(listingId)` before DB query
  - [x] In `cacheAnalysis()`: after DB write, also call `analysisCache.set(listingId, result)`
  - [x] Ensure L1 cache key is distinct per analysisType (e.g., `claude:${listingId}`)
- [x] Task 3: Add DB + L1 caching to `llm-analyzer.ts` (AC: #1, #2, #3, FR: FR-SCORE-14)
  - [x] Add `getCachedSellabilityAnalysis(listingId)` helper using `AiAnalysisCache` with `analysisType = "openai"`
  - [x] Add `cacheSellabilityAnalysis(listingId, result)` helper
  - [x] Wrap `analyzeSellability()` to check cache first; return cached result on hit
  - [x] Use L1 cache key `openai:${listingId}` for in-memory layer
- [x] Task 4: Implement `/api/analyze/[listingId]` endpoint (replaces 501 stub) (AC: #2, #4, FR: FR-SCORE-14, FR-SCORE-15)
  - [x] `GET /api/analyze/[listingId]` — return cached analysis or trigger new analysis
  - [x] Authenticate with `getAuthUserId()` from `@/lib/auth-middleware` (throws `UnauthorizedError` on null)
  - [x] Verify listing belongs to authenticated user (query Prisma, check `userId`)
  - [x] L1 check → L2 DB check → Claude API call → on failure, return algorithmic fallback
  - [x] Include `isAiFallback: boolean` in all responses
  - [x] Use `handleError()` from `@/lib/errors` for all error cases (including auth via `UnauthorizedError`)
  - [x] Remove the dead import for unused error classes (`ValidationError`, `NotFoundError`, etc. currently imported but unused)
- [x] Task 5: Implement algorithmic fallback helper (AC: #4, FR: FR-SCORE-15)
  - [x] Extract a `getAlgorithmicFallback(listing)` helper (or inline in route) that calls `estimateValue()` from `@/lib/value-estimator`
  - [x] Map `EstimationResult` fields to a unified `AnalysisResponse` shape with `isAiFallback: true`
  - [x] Log fallback events via `console.error` with API error details
- [x] Task 6: Implement auto-recovery (AC: #5, FR: FR-SCORE-15)
  - [x] No manual flag needed — the route always attempts the live API first
  - [x] On API success after a previous failure: store in cache and return LLM result normally
  - [x] Add a cache-invalidation helper `DELETE /api/analyze/[listingId]` (optional, for admin use)
- [x] Task 7: Write unit tests (maintain 96%+ branch / 98%+ function coverage thresholds)
  - [x] Test: cache hit → no API call (`claude-analyzer.test.ts`)
  - [x] Test: cache miss → API called → result cached
  - [x] Test: expired cache → new API call → cache refreshed
  - [x] Test: API throws → fallback returns algorithmic result with `isAiFallback: true`
  - [x] Test: API recovers → next call returns LLM result with `isAiFallback: false`
  - [x] Test: `llm-analyzer.ts` cache paths (hit, miss, expired)
  - [x] New route test file: `src/__tests__/api/analyze-listingId.test.ts`
- [x] Task 8: Write BDD acceptance tests
  - [x] Add scenarios to `test/acceptance/features/E-004-scoring-and-deal-evaluation.feature`
  - [x] Create step defs in `test/acceptance/step_definitions/E-004-ai-caching.steps.ts`
  - [x] Tag each scenario with both `@FR-SCORE-14`/`@FR-SCORE-15` AND `@story-4-6`
  - [x] Update `_bmad-output/test-artifacts/requirements-traceability-matrix.md`

## Dev Notes

### 🔴 CRITICAL: The `/api/analyze/[listingId]` Route Is a 501 Stub

`app/api/analyze/[listingId]/route.ts` **currently returns HTTP 501 for both GET and POST** with message: `"Analysis endpoint temporarily unavailable during database migration"`. This is the primary deliverable of this story — replace it with a working implementation.

**The file already imports** (some unused): `handleError`, `ValidationError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`. Clean up unused imports while implementing.

### 🔴 CRITICAL: AiAnalysisCache Has No `analysisType` Field

The current `AiAnalysisCache` Prisma model:
```prisma
model AiAnalysisCache {
  id             String   @id @default(cuid())
  listingId      String
  analysisResult String      // JSON — currently assumed to be ClaudeAnalysisResult
  createdAt      DateTime @default(now())
  expiresAt      DateTime
  @@index([listingId])
  @@index([expiresAt])
}
```

`claude-analyzer.ts` uses `findFirst({ where: { listingId } })` — if we also store OpenAI results under the same `listingId`, that query becomes ambiguous (returns whichever was created last).

**Required schema change:**
```prisma
model AiAnalysisCache {
  id             String   @id @default(cuid())
  listingId      String
  analysisType   String   @default("claude")   // "claude" | "openai" | "algorithmic"
  analysisResult String
  createdAt      DateTime @default(now())
  expiresAt      DateTime

  @@unique([listingId, analysisType])           // prevent duplicate cache entries
  @@index([listingId])
  @@index([expiresAt])
}
```

After adding the field, update `getCachedAnalysis()` and `cacheAnalysis()` in `claude-analyzer.ts` to pass `analysisType: "claude"`.

### Existing Code to Extend (Do NOT Rewrite)

| File | Current State | What to Change |
|------|--------------|----------------|
| `src/lib/claude-analyzer.ts` | Has DB caching (L2 only), no L1 | Add `analysisCache` L1 hit/set |
| `src/lib/llm-analyzer.ts` | No caching at all | Add L1 + L2 cache check/write |
| `src/lib/cache.ts` | `analysisCache` LRU exists (30min, 100 items) | Import and use — do NOT create another |
| `app/api/analyze/[listingId]/route.ts` | 501 stub | Full implementation |
| `prisma/schema.prisma` | AiAnalysisCache missing `analysisType` | Add field + unique constraint |

### Cache Architecture (Three-Tier, Already Partially Exists)

```
Request for listing analysis
        │
        ▼
L1: analysisCache (in-memory LRU, 30min TTL)
    key: "claude:{listingId}" or "openai:{listingId}"
        │ miss
        ▼
L2: AiAnalysisCache (PostgreSQL, 24h TTL)
    where: listingId = X AND analysisType = "claude"|"openai"
    filter: expiresAt > now()
        │ miss or expired
        ▼
AI API Call (Anthropic claude-sonnet-4-5 OR OpenAI gpt-4o-mini)
        │ error / unavailable
        ▼
Algorithmic Fallback: estimateValue() from @/lib/value-estimator
    Returns EstimationResult, wrapped with isAiFallback: true
```

### Cache Key Convention

Use string prefixes to namespace L1 cache entries:
- Claude results: `"claude:{listingId}"`
- OpenAI results: `"openai:{listingId}"`

### API Endpoint Implementation Guide

```typescript
// app/api/analyze/[listingId]/route.ts
export async function GET(request: NextRequest, { params }) {
  try {
    const { listingId } = await params;
    const userId = await requireAuth();                      // throws UnauthorizedError if not logged in

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundError('Listing not found');
    if (listing.userId !== userId) throw new ForbiddenError('Access denied');

    // L1 in-memory cache check
    const l1 = analysisCache.get(`claude:${listingId}`) as ClaudeAnalysisResult | undefined;
    if (l1) return NextResponse.json({ success: true, data: { ...l1, isAiFallback: false }, source: 'cache-l1' });

    // Try Claude (with L2 DB caching built into analyzeListing())
    try {
      const result = await analyzeListing(listingId);       // already checks/writes L2 DB cache
      analysisCache.set(`claude:${listingId}`, result);     // write to L1
      return NextResponse.json({ success: true, data: { ...result, isAiFallback: false }, source: 'ai' });
    } catch (aiError) {
      // All AI unavailable — fallback to algorithmic
      const estimation = estimateValue(listing.title, listing.description, listing.askingPrice, listing.platform as Platform);
      return NextResponse.json({ success: true, data: { ...estimation, isAiFallback: true }, source: 'algorithmic' });
    }
  } catch (error) {
    return handleError(error, request.url);
  }
}
```

### Auth Pattern

Use `requireAuth()` from `@/lib/auth`:
```typescript
import { requireAuth } from '@/lib/auth';
const userId = await requireAuth(); // throws UnauthorizedError if unauthenticated
```

### Error Classes

Import from `@/lib/errors`:
- `UnauthorizedError` — user not logged in
- `NotFoundError` — listing doesn't exist
- `ForbiddenError` — listing belongs to another user
- `handleError(error, request.url)` — converts AppError to RFC 7807 NextResponse

### Algorithmic Fallback: estimateValue() Signature

From `src/lib/value-estimator.ts`:
```typescript
export function estimateValue(
  title: string,
  description: string | null,
  askingPrice: number,
  platform?: string
): EstimationResult
```

Returns `EstimationResult` with: `estimatedValue`, `valueScore`, `profitPotential`, `confidence`, `resaleDifficulty`, `reasoning`, etc.

### llm-analyzer.ts Caching Note

`analyzeSellability()` requires `ItemIdentification` and `MarketPrice` inputs (results from stories 4-3 and 4-4). The cache key should be `listingId`-based, but the input data is computed externally. The recommended approach:
- Cache the `SellabilityAnalysis` result in `AiAnalysisCache` with `analysisType = "openai"` and `listingId = listingId`
- Cache read: `findFirst({ where: { listingId, analysisType: "openai", expiresAt: { gt: now } } })`
- Cache write: `upsert` on `[listingId, analysisType]` unique constraint

### Coverage Thresholds

Jest enforces:
- Branches: 96%
- Functions: 98%
- Lines: 99%
- Statements: 99%

All new code paths (cache hit, miss, fallback) **must have unit tests**. Use `jest.mock()` for:
- `@/lib/db` (prisma) — mock `aiAnalysisCache.findFirst`, `aiAnalysisCache.create`, `aiAnalysisCache.upsert`
- `@anthropic-ai/sdk` — mock Anthropic client
- `openai` — mock OpenAI client

### Dependencies on Earlier Epic 4 Stories

This story depends on:
- **Story 4-1** (`value-estimator.ts`): `estimateValue()` is the fallback — already implemented ✅
- **Story 4-3** (`llm-identifier.ts`): `identifyItem()` used upstream — file exists ✅
- **Story 4-4** (`market-price.ts`): `fetchMarketPrice()` used upstream — file exists ✅
- **Story 4-5** (`llm-analyzer.ts`): `analyzeSellability()` to cache — file exists ✅

Stories 4-4 and 4-5 are in `backlog` status (story files not yet created) but their implementation code already exists in the codebase. This story can be developed independently since it wraps existing code with caching and fallback logic.

### Test Requirements

- Unit tests in `src/__tests__/`:
  - Update `src/__tests__/lib/claude-analyzer.test.ts` — add L1 cache hit/miss scenarios
  - Update `src/__tests__/lib/llm-analyzer.test.ts` — add DB cache hit/miss scenarios
  - New: `src/__tests__/api/analyze-listingId.test.ts` — route handler tests
- Acceptance test scenarios in `test/acceptance/features/E-004-core-scoring-deal-evaluation.feature`
- Step definitions in `test/acceptance/step_definitions/E-004-ai-caching.steps.ts`

**BDD Scenario Tags:**
- Every scenario: `@FR-SCORE-14 @story-4-6` or `@FR-SCORE-15 @story-4-6`
- Sequential `@E-004-S-<N>` tags: continue numbering from last story 4-5 scenario

**BDD Scenarios to Cover:**
```gherkin
Scenario: AI analysis result is cached on first analysis
  Given a listing exists in the database
  And no cache entry exists for that listing
  When the analysis endpoint is called
  Then the AI API is called once
  And the result is stored in AiAnalysisCache with expiresAt 24 hours from now

Scenario: Cached result returned without API call
  Given a listing has a valid cache entry less than 24 hours old
  When the analysis endpoint is called
  Then no AI API call is made
  And the cached result is returned

Scenario: Expired cache triggers refresh
  Given a listing has a cache entry older than 24 hours
  When the analysis endpoint is called
  Then a new AI API call is made
  And the cache entry is updated with fresh results

Scenario: All AI APIs unavailable triggers algorithmic fallback
  Given all AI APIs are unavailable
  When the analysis endpoint is called for a listing
  Then the response uses algorithmic scoring
  And the response includes "isAiFallback": true

Scenario: AI APIs recover after outage
  Given a previous analysis returned algorithmic fallback
  And the AI API is now available
  When the analysis endpoint is called
  Then the AI API is called successfully
  And the response includes "isAiFallback": false
```

### Project Structure Notes

Files to create or modify:
```
MODIFY:
  prisma/schema.prisma                                    — add analysisType field
  src/lib/claude-analyzer.ts                              — add L1 cache, pass analysisType to DB
  src/lib/llm-analyzer.ts                                 — add DB cache (L1 + L2)
  app/api/analyze/[listingId]/route.ts                    — replace 501 stub
MODIFY (tests):
  src/__tests__/lib/claude-analyzer.test.ts               — L1 cache scenarios
  src/__tests__/lib/llm-analyzer.test.ts                  — DB cache scenarios
  test/acceptance/features/E-004-core-scoring-deal-evaluation.feature — add scenarios
CREATE:
  src/__tests__/api/analyze-listingId.test.ts             — route handler tests
  test/acceptance/step_definitions/E-004-ai-caching.steps.ts
```

**Do NOT create:**
- A new cache utility (use existing `@/lib/cache`)
- A new Prisma model (extend `AiAnalysisCache`)
- A scheduled cache cleanup job (out of scope; index on `expiresAt` is enough for now)

### References

- [Source: `src/lib/claude-analyzer.ts`] — existing DB cache implementation (L2)
- [Source: `src/lib/llm-analyzer.ts`] — OpenAI sellability analysis (no cache yet)
- [Source: `src/lib/cache.ts`] — `analysisCache` LRU (L1), `withCache()` helper
- [Source: `app/api/analyze/[listingId]/route.ts`] — 501 stub to replace
- [Source: `prisma/schema.prisma` lines 286–295] — `AiAnalysisCache` model
- [Source: `src/lib/value-estimator.ts`] — `estimateValue()` for algorithmic fallback
- [Source: `_bmad-output/planning-artifacts/PRD.md#FR-SCORE-14`]
- [Source: `_bmad-output/planning-artifacts/PRD.md#FR-SCORE-15`]
- [Source: `_bmad-output/planning-artifacts/architecture.md`] — AI integration section, three-tier AI pipeline

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- Prisma `analysisType` field added to `AiAnalysisCache` with `@@unique([listingId, analysisType])`
- Prisma client needed manual sync: `prisma generate` updates `src/generated/prisma/` but not `node_modules/.prisma/client/index.d.ts` in pnpm virtual store. Manually copied updated `index.d.ts` to fix TypeScript build errors.
- Deleted `src/__tests__/api/analyze.test.ts` (old 501 stub tests superseded by new route implementation)
- Added `jest.mock('@/lib/db', ...)` to existing `src/__tests__/llm-analyzer.test.ts` because `llm-analyzer.ts` now imports `@/lib/db` for caching
- LandingPage.test.tsx has 31 pre-existing failures (useRouter missing AppRouter context) — unrelated to Story 4.6, present before this story began

### Completion Notes List
- All Tasks 1–8 complete
- Tests: 3329 passing, 31 pre-existing LandingPage failures (unrelated), coverage thresholds met (exit code 0)
- Lint: 0 errors (297 pre-existing warnings)
- Build: passing after Prisma client type sync

### Code Review Fixes (applied during review)
- **H-1 fixed**: `app/api/analyze/[listingId]/route.ts` — replaced raw inline JSON 401 responses in GET and DELETE with `throw new UnauthorizedError(...)`, routing all auth errors through `handleError()` for consistency. Added `UnauthorizedError` to errors import.
- **H-2 fixed**: `src/__tests__/llm-analyzer.test.ts` — added `jest.mock('@/lib/cache', ...)` to prevent real LRU cache state from bleeding between tests (llm-analyzer.ts now imports `analysisCache`).
- **C-1 fixed**: All task checkboxes updated from `[ ]` to `[x]`.
- **M-3 fixed**: Task 8 Dev Notes filename corrected from `E-004-core-scoring-deal-evaluation.feature` to `E-004-scoring-and-deal-evaluation.feature`.

### File List
**Modified:**
- `prisma/schema.prisma` — added `analysisType` field + `@@unique([listingId, analysisType])` to `AiAnalysisCache`
- `src/lib/claude-analyzer.ts` — added L1 in-memory cache (L1 check before DB, L1 write after DB hit and API call)
- `src/lib/llm-analyzer.ts` — added `getCachedSellabilityAnalysis()`, `cacheSellabilityAnalysis()` with L1+L2 caching
- `app/api/analyze/[listingId]/route.ts` — replaced 501 stub with full GET + DELETE implementation
- `src/__tests__/lib/claude-analyzer.test.ts` — added 3 L1 cache tests (L1 hit, L2→L1 population, API→L1 population)
- `src/__tests__/llm-analyzer.test.ts` — added `jest.mock('@/lib/db', ...)` for caching compat
- `test/acceptance/features/E-004-scoring-and-deal-evaluation.feature` — added 5 BDD scenarios (S-029 through S-033)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status updated to `review`

**Created:**
- `src/__tests__/lib/llm-analyzer.test.ts` — 27 tests for getCachedSellabilityAnalysis, cacheSellabilityAnalysis, analyzeSellability, quickDiscountCheck, runFullAnalysis
- `src/__tests__/api/analyze-listingId.test.ts` — 13 tests for GET + DELETE route handlers
- `test/acceptance/step_definitions/E-004-ai-caching.steps.ts` — BDD step definitions for S-029–S-033

**Deleted:**
- `src/__tests__/api/analyze.test.ts` — old 501 stub tests (superseded)
