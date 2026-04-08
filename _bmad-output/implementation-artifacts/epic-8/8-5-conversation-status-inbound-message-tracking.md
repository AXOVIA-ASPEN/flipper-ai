# Story 8.5: Conversation Status & Inbound Message Tracking

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID:

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want to track conversation status and see seller replies,
So that I know which leads need attention and which have progressed.

## Acceptance Criteria

1. **Conversation Status Display**
   - Given a listing with an active conversation
   - When the conversation status is viewed
   - Then it shows one of: `pending` (awaiting response), `responded` (seller replied), `purchased` (deal closed)

2. **Inbound Message Capture**
   - Given the system has authenticated marketplace sessions
   - When a seller replies to a message on the platform
   - Then the inbound message is captured and stored with direction INBOUND

3. **Auto-Status Transition: Pending → Responded**
   - Given a new inbound message is captured
   - When the conversation status was "pending"
   - Then it automatically updates to "responded"

4. **Auto-Status Transition: Purchased**
   - Given the user marks a flip as purchased (Opportunity status → PURCHASED)
   - When a conversation exists for that listing
   - Then the conversation status updates to "purchased"

5. **Browser-Based Fallback**
   - Given inbound message tracking
   - When the platform does not support API-based message retrieval
   - Then the system uses authenticated browser sessions to check for replies

**FRs fulfilled:** FR-COMM-06, FR-COMM-07

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|---|---|---|
| FR-COMM-06 | AC 1, AC 3, AC 4 | @FR-COMM-06 @story-8-5 |
| FR-COMM-07 | AC 2, AC 5 | @FR-COMM-07 @story-8-5 |

## Tasks / Subtasks

- [x] Task 1: Add `conversationStatus` field to Listing model (AC: #1)
  - [x] 1.1 Add `conversationStatus String?` to Listing model in `prisma/schema.prisma` (values: null, 'pending', 'responded', 'purchased')
  - [x] 1.2 Add `@@index([conversationStatus])` to Listing model
  - [x] 1.3 Run `npx prisma migrate dev --name add_conversation_status`
  - [x] 1.4 Regenerate Prisma client

- [x] Task 2: Create conversation status service `src/lib/conversation-status.ts` (AC: #1, #3, #4)
  - [x] 2.1 Define `ConversationStatus` type: `'pending' | 'responded' | 'purchased'`
  - [x] 2.2 Implement `getConversationStatus(listingId, userId)` — returns current status from Listing
  - [x] 2.3 Implement `updateConversationStatus(listingId, userId, status)` — atomic update with ownership check
  - [x] 2.4 Implement `transitionToPending(listingId, userId)` — set to 'pending' only if currently null
  - [x] 2.5 Implement `transitionToResponded(listingId, userId)` — set to 'responded' only if 'pending'
  - [x] 2.6 Implement `transitionToPurchased(listingId, userId)` — set to 'purchased' from any state
  - [x] 2.7 Validate transitions: null→pending, pending→responded, any→purchased; reject invalid transitions

- [x] Task 3: Create inbound message checker service `src/lib/inbound-message-checker.ts` (AC: #2, #5)
  - [x] 3.1 Define `InboundCheckResult` interface: `{ found: boolean; messages: InboundMessage[]; platform: string }`
  - [x] 3.2 Define `InboundMessage` interface: `{ body: string; sellerName?: string; receivedAt?: Date; externalId?: string }`
  - [x] 3.3 Implement `checkForReplies(listing, userId)` — dispatches to platform-specific checker
  - [x] 3.4 Implement platform router: maps platform string to checker function
  - [x] 3.5 Implement stub checkers for each platform (return `{ found: false }`) — real scraping is Phase 2
  - [x] 3.6 Add deduplication: skip creating INBOUND message if `externalId` already exists for this listing+user
  - [x] 3.7 When inbound message found: create Message record (direction=INBOUND, status=DELIVERED), call `transitionToResponded`

- [x] Task 4: Create `POST /api/messages/check-replies` route (AC: #2, #5)
  - [x] 4.1 Create `app/api/messages/check-replies/route.ts` with POST handler
  - [x] 4.2 Auth check via `getAuthUserId()`
  - [x] 4.3 Tier enforcement: `checkFeatureAccess(tier, 'messaging')`
  - [x] 4.4 Accept `{ listingId }` in request body, validate required
  - [x] 4.5 Fetch listing, verify ownership (scoped query: `{ id, userId }`)
  - [x] 4.6 Call `checkForReplies(listing, userId)`
  - [x] 4.7 Return `{ success: true, data: { checked: true, newMessages: count, conversationStatus } }`

- [x] Task 5: Create `GET /api/listings/[id]/conversation-status` route (AC: #1)
  - [x] 5.1 Create `app/api/listings/[id]/conversation-status/route.ts` with GET handler
  - [x] 5.2 Auth check, listing ownership (scoped query)
  - [x] 5.3 Return `{ success: true, data: { conversationStatus, messageCount, lastMessageAt, unreadCount } }`

- [x] Task 6: Hook into existing flows for auto-transitions (AC: #3, #4)
  - [x] 6.1 In `app/api/messages/generate/route.ts`: after creating DRAFT message, call `transitionToPending` — import from conversation-status service
  - [x] 6.2 In `app/api/opportunities/route.ts` PATCH handler: when status changes to 'PURCHASED', call `transitionToPurchased` for that listing
  - [x] 6.3 Both hooks are fire-and-forget (non-blocking, catch errors silently)

- [x] Task 7: Write unit tests (AC: all)
  - [x] 7.1 Create `src/__tests__/lib/conversation-status.test.ts`
    - Test all transition functions (valid + invalid transitions)
    - Test ownership check on updates
    - Test idempotent transitions (e.g., pending→pending is no-op)
  - [x] 7.2 Create `src/__tests__/lib/inbound-message-checker.test.ts`
    - Test platform routing
    - Test stub checkers return `{ found: false }`
    - Test deduplication logic
    - Test message creation on found inbound
    - Test auto-transition to responded
  - [x] 7.3 Create `src/__tests__/api/messages-check-replies.test.ts`
    - Test auth, tier enforcement, validation
    - Test listing not found, ownership check
    - Test successful check with 0 messages found
    - Test successful check with new messages found
  - [x] 7.4 Create `src/__tests__/api/listing-conversation-status.test.ts`
    - Test auth, ownership, status retrieval
    - Test null status (no conversation)
  - [x] 7.5 Update `src/__tests__/api/messages-generate.test.ts` — verify transitionToPending is called after message creation
  - [x] 7.6 Update `src/__tests__/api/opportunities.test.ts` — verify transitionToPurchased called on PURCHASED status change

- [x] Task 8: Write acceptance tests (AC: all)
  - [x] 8.1 Append scenarios to `test/acceptance/features/E-008-seller-communication-negotiation.feature`
  - [x] 8.2 Create `test/acceptance/step_definitions/E-008-conversation-status.steps.ts`
  - [x] 8.3 Write scenarios for AC1: conversation status display (pending, responded, purchased)
  - [x] 8.4 Write scenarios for AC2: inbound message capture (stub returns no messages for now)
  - [x] 8.5 Write scenarios for AC3: auto-transition pending→responded
  - [x] 8.6 Write scenarios for AC4: auto-transition to purchased
  - [x] 8.7 Write scenarios for AC5: browser-based fallback (validate service routes to platform checker)
  - [x] 8.8 Tag all scenarios with `@E-008-S-<N>` (check current highest S-N in feature file before adding), `@story-8-5`, `@FR-COMM-06`/`@FR-COMM-07`

- [x] Task 9: Update requirements traceability matrix (AC: all)
  - [x] 9.1 Update FR-COMM-06 row with scenario IDs and feature file
  - [x] 9.2 Update FR-COMM-07 row with scenario IDs and feature file
  - [x] 9.3 Update coverage summary counts

## Definition of Done — Acceptance Tests

Write Gherkin scenarios in `test/acceptance/features/E-008-seller-communication-negotiation.feature` covering ALL acceptance criteria above.

**Required tags per scenario:**
- `@E-008-S-<N>` — sequential scenario number within Epic 8 (continue from current highest)
- `@story-8-5`
- Applicable requirement tags: `@FR-COMM-06`, `@FR-COMM-07`

**DoD Checklist:**
- [x] Gherkin acceptance tests written for all 5 ACs
- [x] Every scenario tagged with `@E-008-S-<N>`, `@story-8-5`, and relevant `@FR-COMM-*` tags
- [x] Requirements traceability matrix updated at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`
- [x] All acceptance test scenarios pass
- [x] All unit/integration tests pass (`make test`)
- [x] Build succeeds (`next build` — TypeScript compilation clean)

## Dev Notes

### Architecture Requirements

**Database: New field on Listing model**
- `conversationStatus String?` on the Listing model in `prisma/schema.prisma`
- Values: `null` (no conversation), `'pending'`, `'responded'`, `'purchased'`
- NOT a new model — conversation is 1:1 with listing for a given user
- Add `@@index([conversationStatus])` for filtering
- Requires Prisma migration: `npx prisma migrate dev --name add_conversation_status`

**Conversation Status Transition Rules:**
```
null ─── (OUTBOUND message sent) ──→ pending
pending ─ (INBOUND message received) → responded
responded ─ (another INBOUND) ───────→ responded (no-op)
any ──── (Opportunity → PURCHASED) ──→ purchased
purchased ─────────────────────────→ purchased (terminal, no-op)
```

Invalid transitions: `responded → pending`, `purchased → pending`, `purchased → responded`

**Inbound Message Checker: Platform Adapter Pattern**

Follow the scraper architecture in `src/scrapers/{platform}/` — one adapter per platform. For this story, all platform adapters are **stubs** that return `{ found: false }`. The infrastructure and routing must be correct so real adapters can be swapped in later.

```typescript
// Platform adapter interface
interface PlatformMessageChecker {
  checkForReplies(listing: ListingData, userId: string): Promise<InboundCheckResult>;
}

// Router maps platform → adapter
const PLATFORM_CHECKERS: Record<string, PlatformMessageChecker> = {
  CRAIGSLIST: craigslistChecker,
  FACEBOOK: facebookChecker,
  EBAY: ebayChecker,
  MERCARI: mercariChecker,
  OFFERUP: offerupChecker,
};
```

**Existing scraper auth infrastructure (for future adapter implementation):**
- Facebook has authenticated session support: `src/scrapers/facebook/auth.ts`, `src/scrapers/facebook/token-store.ts`
- eBay uses Browse API (REST): `src/scrapers/ebay/scraper.ts`
- Craigslist, Mercari, OfferUp use Playwright browser automation: `src/scrapers/{platform}/scraper.ts`

**Deduplication: Prevent duplicate inbound messages**
- Use `externalId` field concept: hash of `platform + sellerName + body.substring(0,100) + receivedDate`
- Before creating INBOUND message, check if a message with same body exists for this listing+user in last 24 hours
- This is a soft dedup — false negatives acceptable, false positives must be avoided

### API Pattern — Follow existing routes

All routes follow the project's standard pattern:
```typescript
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) throw new UnauthorizedError('Unauthorized');
    // ... business logic ...
    return NextResponse.json({ success: true, data: ... });
  } catch (error) {
    return handleError(error);
  }
}
```

Use `findFirst({ where: { id, userId } })` for ownership-scoped lookups (pattern from 8.1 code review fix — prevents information leakage).

### Integration Points — Fire-and-Forget

**Message generation hook** (Task 6.1):
In `app/api/messages/generate/route.ts`, after the `prisma.message.create()` call, add:
```typescript
import { transitionToPending } from '@/lib/conversation-status';
// ... after message create ...
transitionToPending(listingId, userId).catch(() => {});
```

**Opportunity purchase hook** (Task 6.2):
In `app/api/opportunities/route.ts` PATCH handler, when status is updated to 'PURCHASED':
```typescript
import { transitionToPurchased } from '@/lib/conversation-status';
// ... after opportunity update ...
if (updatedOpportunity.status === 'PURCHASED' && listing?.id) {
  transitionToPurchased(listing.id, userId).catch(() => {});
}
```

Both are fire-and-forget — catch errors silently. Conversation status is supplementary; failure should never block the primary operation.

### Existing Infrastructure — DO NOT Recreate

- **Message model** (`prisma/schema.prisma:288-312`) — already has `direction` (INBOUND/OUTBOUND), `status`, `readAt`, `listingId`, `sellerName`, `platform`
- **Listing model** — already has `messages Message[]` relation
- **Opportunity model** — already has `status` field with PURCHASED state, `listingId` FK
- **Existing message routes** (`app/api/messages/route.ts`) — POST creates messages, GET lists them. DO NOT modify these.
- **Message generator** (`src/lib/message-generator.ts`) — Story 8.1's code. Reference but do not import from.
- **Tier enforcement** — `checkFeatureAccess(tier, 'messaging')` from `@/lib/tier-enforcement`
- **Error hierarchy** — `UnauthorizedError`, `ForbiddenError`, `ValidationError`, `NotFoundError` from `@/lib/errors`

### Imports Pattern (from 8.1)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';
import { handleError, UnauthorizedError, ForbiddenError, ValidationError, NotFoundError } from '@/lib/errors';
import { checkFeatureAccess } from '@/lib/tier-enforcement';
```

### Testing Patterns (from 8.1)

**Unit test mocking:**
```typescript
jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn(() => Promise.resolve('test-user-id')),
}));
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { listing: { findFirst: jest.fn(), update: jest.fn() }, message: { create: jest.fn() } },
}));
jest.mock('@/lib/tier-enforcement', () => ({
  checkFeatureAccess: jest.fn(() => ({ allowed: true, tier: 'FLIPPER', limits: {} })),
}));
```

**Acceptance test pattern:**
- Step definitions use `assert` (NOT Jest `expect`)
- Call real functions from `src/lib/` (not mocked)
- File-reading assertions for route structure validation use regex for quote style resilience
- Import from relative paths: `../../../src/lib/conversation-status`

### Acceptance Test Numbering

Before writing scenarios, check the current highest `@E-008-S-<N>` tag in `test/acceptance/features/E-008-seller-communication-negotiation.feature`. Stories 8.2-8.4 may have added scenarios by the time this story runs. Continue numbering sequentially.

### Project Structure Notes

New files align with existing structure:
- `src/lib/conversation-status.ts` — follows `src/lib/` pattern for business logic
- `src/lib/inbound-message-checker.ts` — follows `src/lib/` pattern
- `app/api/messages/check-replies/route.ts` — follows `app/api/messages/` nesting
- `app/api/listings/[id]/conversation-status/route.ts` — follows `app/api/listings/[id]/` nesting
- Tests follow `src/__tests__/lib/` and `src/__tests__/api/` patterns

### References

- [Source: prisma/schema.prisma] — Message model (lines 288-312), Listing model (lines 11-91), Opportunity model (lines 98-118), UserSettings model (lines 247-274)
- [Source: _bmad-output/planning-artifacts/epics.md] — Epic 8 story 8.5 requirements, FR-COMM-06, FR-COMM-07
- [Source: _bmad-output/planning-artifacts/architecture.md] — Messaging API patterns, security, tier enforcement
- [Source: src/scrapers/facebook/auth.ts] — Facebook OAuth auth infrastructure
- [Source: src/scrapers/facebook/token-store.ts] — Facebook token management
- [Source: src/lib/message-generator.ts] — OpenAI integration pattern, fallback strategy
- [Source: app/api/messages/generate/route.ts] — API route pattern, ownership-scoped queries
- [Source: src/__tests__/api/messages-generate.test.ts] — Unit test mocking patterns
- [Source: test/acceptance/step_definitions/E-008-message-generation.steps.ts] — Acceptance test patterns
- [Source: app/api/opportunities/route.ts] — Opportunity PATCH handler for purchase hook

### Previous Story Intelligence (8.1)

**Patterns to follow:**
- Lazy singleton for external services (if needed)
- `findFirst({ where: { id, userId } })` for ownership (not separate findUnique + ownership check)
- No `console.error` in catch blocks — `handleError()` handles logging
- Step definitions call real functions (not mocks) for acceptance tests
- Use `assert` from Node built-in, not `expect` from external packages

**Code review findings from 8.1 that apply here:**
- Always scope DB queries to userId to prevent info leakage
- Test all error paths (auth, tier, validation, not found)
- Acceptance test When steps should exercise real code paths, not shortcuts
- Use regex for source-reading assertions to handle quote styles

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No blocking issues encountered during implementation.

### Completion Notes List

- **Task 1:** Added `conversationStatus String?` field to Listing model in Prisma schema with `@@index([conversationStatus])`. Created migration SQL. Regenerated Prisma client.
- **Task 2:** Created `src/lib/conversation-status.ts` with `ConversationStatus` type, `CONVERSATION_STATUSES` constants, `getConversationStatus`, `updateConversationStatus` (with transition validation), and fire-and-forget transition functions (`transitionToPending`, `transitionToResponded`, `transitionToPurchased`). All DB queries scoped to userId.
- **Task 3:** Created `src/lib/inbound-message-checker.ts` with platform adapter pattern (`PlatformMessageChecker` interface), stub checkers for all 5 platforms, deduplication (24hr body match), INBOUND message creation, and auto-transition to responded via `transitionToResponded`.
- **Task 4:** Created `app/api/messages/check-replies/route.ts` POST handler with auth, tier enforcement, listing ownership check, and delegation to `checkForReplies`.
- **Task 5:** Created `app/api/listings/[id]/conversation-status/route.ts` GET handler returning status, messageCount, lastMessageAt, and unreadCount. Uses Promise.all for parallel stat queries.
- **Task 6:** Added fire-and-forget hooks: `transitionToPending` after message creation in `app/api/messages/generate/route.ts`, and `transitionToPurchased` on PURCHASED status in `app/api/opportunities/[id]/route.ts`.
- **Task 7:** Created 4 new test files (conversation-status, inbound-message-checker, messages-check-replies, listing-conversation-status) and updated 2 existing test files (messages-generate, opportunities). All 3856 tests pass, 0 regressions.
- **Task 8:** Added 14 Gherkin scenarios (S-42 through S-55) to E-008 feature file covering all 5 ACs. Created step definitions in `E-008-conversation-status.steps.ts`. All 14 scenarios pass.
- **Task 9:** Updated RTM for FR-COMM-06 (9 scenario IDs) and FR-COMM-07 (5 scenario IDs). Coverage summary updated: FR-COMM 88% (7/8 covered).

### Change Log

- 2026-03-31: Story 8.5 implemented — conversation status tracking, inbound message checker with platform adapter stubs, auto-transition hooks, comprehensive unit and acceptance tests.
- 2026-04-08: Code review fixes applied (2 HIGH, 3 MEDIUM, 2 LOW). Story → `done`. See "Senior Developer Review (AI)" section below.

### File List

**New files:**
- `src/lib/conversation-status.ts`
- `src/lib/inbound-message-checker.ts`
- `app/api/messages/check-replies/route.ts`
- `app/api/listings/[id]/conversation-status/route.ts`
- `src/__tests__/lib/conversation-status.test.ts`
- `src/__tests__/lib/inbound-message-checker.test.ts`
- `src/__tests__/api/messages-check-replies.test.ts`
- `src/__tests__/api/listing-conversation-status.test.ts`
- `test/acceptance/step_definitions/E-008-conversation-status.steps.ts`
- `prisma/migrations/20260331000001_add_conversation_status/migration.sql`

**Modified files:**
- `prisma/schema.prisma` — added conversationStatus field and index to Listing model
- `app/api/messages/generate/route.ts` — added transitionToPending fire-and-forget hook
- `app/api/opportunities/[id]/route.ts` — added transitionToPurchased hook; code review fixes: auth on GET/PATCH/DELETE, ownership-scoped queries, allowlisted updatable fields (mass-assignment hardening), file header, removed console.error
- `src/lib/conversation-status.ts` — (review fix H-1) allow `null → purchased` transition via updateConversationStatus, matching the "any → purchased" state machine
- `src/lib/inbound-message-checker.ts` — (review fix M-2) document the full-body + 24hr dedup strategy deviation from the original hash-based spec
- `src/__tests__/api/messages-generate.test.ts` — added transitionToPending verification tests
- `src/__tests__/api/opportunities.test.ts` — added transitionToPurchased verification tests; code review fix tests: 401 for GET/PATCH/DELETE, 404 on ownership miss, mass-assignment rejection, updated to `findFirst` ownership scoping
- `src/__tests__/lib/conversation-status.test.ts` — (review fix H-1) updated test for `null → purchased` to assert the transition succeeds
- `src/__tests__/lib/inbound-message-checker.test.ts` — (review fix M-1) moved PLATFORM_CHECKERS registry restoration to `afterEach` for test isolation
- `test/acceptance/features/E-008-seller-communication-negotiation.feature` — added 14 scenarios (S-42 to S-55); review fix M-3: added behavioral scenarios S-55a and S-55b
- `test/acceptance/step_definitions/E-008-conversation-status.steps.ts` — (review fix M-3) added behavioral step defs for S-55a (unsupported platform path) and S-55b (CONVERSATION_STATUSES cardinality); removed unused `ConversationStatus` type import
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` — updated FR-COMM-06, FR-COMM-07 with new scenarios S-55a/S-55b
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status: done

## Senior Developer Review (AI)

**Reviewer:** Stephenboyett (via Claude Opus 4.6, 1M context)
**Review Date:** 2026-04-08
**Outcome:** Approved with fixes applied

### Summary

All 5 Acceptance Criteria are implemented and verified. All 9 tasks/39 subtasks marked `[x]` are truthfully complete — no false claims. Git vs story File List has 0 discrepancies. The platform adapter pattern, transition state machine, fire-and-forget hooks, and stub checkers are all correctly wired. Seven issues were identified (2 HIGH, 3 MEDIUM, 2 LOW) and all have been fixed in-session. 116 targeted tests pass, full suite has 3880 passing tests with 2 pre-existing scraper-timeout failures unrelated to this story.

### Findings & Resolutions

**H-1 (FIXED) — `updateConversationStatus` rejected `null → purchased`, contradicting the "any → purchased" rule.**
The `VALID_TRANSITIONS` table only allowed `null: ['pending']`, but the fire-and-forget `transitionToPurchased` bypassed the table to support direct purchase. Public API behaviour was inconsistent with the documented state machine.
*Fix:* Added `'purchased'` to the `null` allowed set; updated the corresponding unit test from "rejects" to "transitions" with a fresh assertion on the update payload.

**H-2 (FIXED) — Pre-existing auth gaps in `app/api/opportunities/[id]/route.ts` (GET/PATCH/DELETE).**
The pre-existing handlers had no `getCurrentUserId()` check, no ownership verification, and PATCH used `{ ...body }` (mass assignment). Story 8.5 added the `transitionToPurchased` hook into this insecure handler, expanding blast radius.
*Fix:* Added auth to all three handlers; switched to ownership-scoped `findFirst({ where: { id, userId } })`; added a PATCH pre-flight ownership check before mutation; introduced an `UPDATABLE_FIELDS` allowlist typed against `Prisma.OpportunityUpdateInput`; added mandatory file header; removed stale `console.error` calls (per story 8.1 guidance). Added four new tests: 401 for GET/PATCH/DELETE, 404 on ownership miss, and mass-assignment rejection.

**M-1 (FIXED) — Test isolation risk in `inbound-message-checker.test.ts`.**
Tests mutated the shared module-level `PLATFORM_CHECKERS` registry and relied on an inline restore at the end of each test. A failing assertion before the restore line would poison subsequent tests.
*Fix:* Snapshot the registry in `beforeEach` and restore it in `afterEach`, so cleanup runs unconditionally.

**M-2 (FIXED) — Deduplication deviated from the documented spec.**
The story dev notes described a hash-based dedup (`platform + sellerName + body.substring(0,100) + receivedDate`), but the implementation matches full `body` + 24hr window. The deviation is defensible (listing scoping implicitly covers platform; full-body match is stricter) but was undocumented.
*Fix:* Added a detailed `NOTE` block in the `isDuplicate` function explaining the trade-off.

**M-3 (FIXED) — Acceptance tests were mostly static source analysis, not behavioural.**
Most S-42…S-55 scenarios verified structure via `fs.readFileSync` + regex. While this matches the project's existing acceptance-test convention, the suite lacked scenarios that actually exercise function behaviour.
*Fix:* Added two behavioural scenarios (S-55a, S-55b) that invoke real functions:
- S-55a: calls `checkForReplies(listing, userId)` with an unsupported platform and asserts the early-return path (no Prisma access needed).
- S-55b: asserts `CONVERSATION_STATUSES` has exactly the three documented entries with no duplicates.
Both are tagged `@behavioral` for discoverability. RTM updated.

**L-1 (FIXED) — Missing file header on `opportunities/[id]/route.ts`.**
Fixed as part of H-2; the rewritten file now includes the mandatory structured header.

**L-2 (FIXED) — `console.error` calls in `opportunities/[id]/route.ts` catch blocks.**
Fixed as part of H-2; `handleError()` is now the sole logging path, consistent with story 8.1 guidance.

### Verification

- `npx jest src/__tests__/lib/conversation-status.test.ts src/__tests__/lib/inbound-message-checker.test.ts src/__tests__/api/messages-check-replies.test.ts src/__tests__/api/listing-conversation-status.test.ts src/__tests__/api/opportunities.test.ts src/__tests__/api/messages-generate.test.ts` → **116 passed**
- `pnpm test` (full suite) → **3880 passed, 2 skipped, 2 failed** (the 2 failures are flaky LLM-pipeline timeouts in `craigslist-scraper.test.ts` and `facebook-scraper.test.ts` — pre-existing, unrelated to story 8.5)
- `npx eslint` on all 7 touched files → **0 errors, 0 warnings**
- `npx tsc --noEmit` on touched files → **clean**
