# Story 8.1: AI Message Generation

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID:

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want AI to generate personalized purchase messages for sellers,
So that I can quickly contact sellers with professional, platform-appropriate messages.

## Acceptance Criteria

1. **Platform-Appropriate AI Message Generation**
   - Given a user selects a listing and clicks "Contact Seller"
   - When message generation runs
   - Then an AI-generated purchase message is created with platform-appropriate tone (casual for Craigslist, professional for eBay)

2. **Multiple Message Types**
   - Given the message generation
   - When the user selects a message type (inquiry, offer, follow-up, negotiation)
   - Then the AI adapts the message content and tone for the selected type

3. **Draft Display**
   - Given a generated message
   - When displayed to the user
   - Then it is shown as a draft that can be edited before sending

4. **Template Fallback**
   - Given the AI API is unavailable
   - When message generation is attempted
   - Then a template-based fallback message is generated with placeholder fields

**FRs fulfilled:** FR-COMM-01, FR-COMM-02

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|---|---|---|
| FR-COMM-01 | AC 1, AC 3, AC 4 | @FR-COMM-01 @story-8-1 |
| FR-COMM-02 | AC 2 | @FR-COMM-02 @story-8-1 |

## Tasks / Subtasks

- [x] Task 1: Create `src/lib/message-generator.ts` module (AC: #1, #2, #4)
  - [x] 1.1 Define TypeScript interfaces: `MessageGeneratorInput`, `GeneratedMessage`, `MessageType`
  - [x] 1.2 Implement platform tone mapping (casual for Craigslist/Facebook/OfferUp, professional for eBay/Mercari)
  - [x] 1.3 Build OpenAI prompt for message generation with system/user roles
  - [x] 1.4 Implement `generatePurchaseMessage()` async function using OpenAI gpt-4o-mini
  - [x] 1.5 Implement message type support: inquiry, offer, follow-up, negotiation
  - [x] 1.6 Implement `generateFallbackMessage()` template-based fallback for API unavailability
  - [x] 1.7 Add input validation and error handling

- [x] Task 2: Create `POST /api/messages/generate` route (AC: #1, #2, #3)
  - [x] 2.1 Create `app/api/messages/generate/route.ts` with POST handler
  - [x] 2.2 Add auth check via `getAuthUserId()`
  - [x] 2.3 Add tier enforcement for messaging feature
  - [x] 2.4 Validate request body (listingId required, optional messageType)
  - [x] 2.5 Fetch listing data from database
  - [x] 2.6 Call message generator and return draft message
  - [x] 2.7 Create message record in DB with DRAFT status

- [x] Task 3: Write unit tests for message-generator (AC: #1, #2, #4)
  - [x] 3.1 Create `src/__tests__/message-generator.test.ts`
  - [x] 3.2 Test platform tone mapping for all 5 platforms
  - [x] 3.3 Test all 4 message types produce appropriate content
  - [x] 3.4 Test fallback message generation when API key missing
  - [x] 3.5 Test fallback message generation when OpenAI call fails
  - [x] 3.6 Test input validation (missing listing data, invalid message type)
  - [x] 3.7 Test JSON parsing of LLM response

- [x] Task 4: Write acceptance tests (AC: #1, #2, #3, #4)
  - [x] 4.1 Create `test/acceptance/features/E-008-seller-communication-negotiation.feature`
  - [x] 4.2 Write scenarios for AC1: platform-appropriate message generation
  - [x] 4.3 Write scenarios for AC2: multiple message types
  - [x] 4.4 Write scenarios for AC3: draft display
  - [x] 4.5 Write scenarios for AC4: template fallback
  - [x] 4.6 Create step definitions `test/acceptance/step_definitions/E-008-message-generation.steps.ts`
  - [x] 4.7 Tag all scenarios with @E-008-S-<N>, @story-8-1, @FR-COMM-01/@FR-COMM-02

- [x] Task 5: Update requirements traceability matrix (AC: all)
  - [x] 5.1 Update FR-COMM-01 row with scenario IDs and feature file
  - [x] 5.2 Update FR-COMM-02 row with scenario IDs and feature file
  - [x] 5.3 Update coverage summary counts

- [x] Task 6: Write unit tests for POST /api/messages/generate route (Code Review)
  - [x] 6.1 Create `src/__tests__/api/messages-generate.test.ts`
  - [x] 6.2 Test auth check (401 on unauthenticated)
  - [x] 6.3 Test tier enforcement gate (403 for FREE tier)
  - [x] 6.4 Test validation (422 for missing listingId, invalid messageType)
  - [x] 6.5 Test listing not found (404)
  - [x] 6.6 Test listing scoped to user (ownership check)
  - [x] 6.7 Test successful generation (201 with message + metadata)
  - [x] 6.8 Test DRAFT OUTBOUND message creation in DB
  - [x] 6.9 Test askingPrice conversion and null handling

## Definition of Done — Acceptance Tests

Write Gherkin scenarios in `test/acceptance/features/E-008-seller-communication-negotiation.feature` covering ALL acceptance criteria above.

**Required tags per scenario:**
- `@E-008-S-<N>` — sequential scenario number within Epic 8
- `@story-8-1`
- Applicable requirement tags: `@FR-COMM-01`, `@FR-COMM-02`

**DoD Checklist:**
- [x] Gherkin acceptance tests written for all 4 ACs (16 scenarios, 71 steps)
- [x] Every scenario tagged with `@E-008-S-<N>`, `@story-8-1`, and relevant `@FR-COMM-*` tags
- [x] Requirements traceability matrix updated at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`
- [x] All acceptance test scenarios pass (16/16 scenarios, 71/71 steps — verified 2026-03-30)
- [x] All unit/integration tests pass — 38 unit + 14 API route tests (52 total for story)
- [x] API route unit tests added: `src/__tests__/api/messages-generate.test.ts` (14 tests)
- [ ] Build succeeds (`make build`) — not run locally (requires full env)

## Dev Notes

### Architecture Requirements
- Follow `src/lib/llm-analyzer.ts` pattern for OpenAI integration (lazy singleton, try-catch, null on failure)
- Follow `src/lib/title-generator.ts` pattern for algorithmic fallback alongside LLM
- Use `gpt-4o-mini` model with `temperature: 0.3` for deterministic output
- Request JSON-only responses from LLM
- Tier enforcement via `checkFeatureAccess(tier, 'messaging')` — FREE tier blocked

### Database
- Message model already exists in Prisma schema with all needed fields
- Use existing `app/api/messages/route.ts` POST handler pattern for creating draft messages
- Status flow: DRAFT → PENDING_APPROVAL → SENT → DELIVERED

### Platform Tone Guidelines
- **Craigslist**: Casual, brief, local pickup focus
- **Facebook Marketplace**: Friendly, conversational
- **eBay**: Professional, formal, shipping-aware
- **Mercari**: Professional, concise
- **OfferUp**: Casual, mobile-friendly, brief

### Message Types
- **inquiry**: General questions about the item
- **offer**: Making a purchase offer with price
- **follow-up**: Following up on a previous message
- **negotiation**: Counter-offer or price negotiation

## Dev Agent Record

### Implementation Plan
- Created `src/lib/message-generator.ts` following `llm-analyzer.ts` patterns (lazy OpenAI singleton, JSON-only response, try-catch with fallback)
- Created `app/api/messages/generate/route.ts` following existing messages API route patterns (auth, tier enforcement, validation, DB create)
- Platform tone mapping: CRAIGSLIST/OFFERUP=casual, FACEBOOK=friendly, EBAY/MERCARI=professional
- Four message types supported: inquiry, offer, follow-up, negotiation
- Fallback templates produce platform-appropriate messages with placeholder fields when AI unavailable

### Debug Log
- No issues encountered during implementation

### Completion Notes
- **Unit tests**: 38 tests in `src/__tests__/message-generator.test.ts` — all passing
- **Acceptance tests**: 16 scenarios / 71 steps in E-008 feature file — all passing
- **Regression**: Full test suite 175 suites, 3693 tests — no regressions
- **Coverage**: All coverage thresholds maintained (statements 98%+, branches 93%+, functions 99%+, lines 98%+)
- **Lint**: No ESLint errors in new files

## File List

- `src/lib/message-generator.ts` — NEW: AI message generation library
- `app/api/messages/generate/route.ts` — NEW: POST API endpoint (MODIFIED: code review fixes)
- `src/__tests__/message-generator.test.ts` — NEW: 38 unit tests
- `src/__tests__/api/messages-generate.test.ts` — NEW: 14 API route unit tests (code review)
- `test/acceptance/features/E-008-seller-communication-negotiation.feature` — NEW: 16 Gherkin scenarios
- `test/acceptance/step_definitions/E-008-message-generation.steps.ts` — NEW: step definitions (MODIFIED: code review fixes)
- `test/acceptance/step_definitions/E-006-performance-report-export.steps.ts` — MODIFIED: fixed broken `expect` import (code review)
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` — MODIFIED: FR-COMM-01, FR-COMM-02 covered
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIED: epic-8 and 8-1 to in-progress
- `_bmad-output/implementation-artifacts/epic-8/8-1-ai-message-generation.md` — NEW: story file

## Change Log

| Date | Change | Author |
|---|---|---|
| 2026-03-30 | Story created for implementation | Dev Agent |
| 2026-03-30 | Implemented message-generator.ts with AI + fallback support | Dev Agent |
| 2026-03-30 | Created POST /api/messages/generate route | Dev Agent |
| 2026-03-30 | Added 38 unit tests (all passing) | Dev Agent |
| 2026-03-30 | Added 16 acceptance test scenarios (all passing) | Dev Agent |
| 2026-03-30 | Updated RTM for FR-COMM-01, FR-COMM-02 | Dev Agent |
| 2026-03-30 | Story complete — status set to review | Dev Agent |
| 2026-03-31 | Code review: Fixed 6 issues (3H, 3M). Added 14 API route tests, fixed acceptance test AI path, fixed E-006 broken import, fixed info leakage, removed double logging, strengthened S-12 assertions | Reviewer |
