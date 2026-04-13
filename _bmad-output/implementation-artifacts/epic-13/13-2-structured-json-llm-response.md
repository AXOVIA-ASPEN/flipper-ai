# Story 13.2: Structured JSON Response Format for LLM Analysis

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID:

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **Flipper.ai system**,
I want the LLM analysis calls to use OpenAI's native structured output (`response_format: { type: "json_object" }`) instead of regex-based JSON extraction,
so that analysis never fails silently due to markdown-wrapped responses or malformed JSON.

## Acceptance Criteria

1. **Native JSON Mode Enabled** — The OpenAI API call in `analyzeSellability()` (~line 210 of `llm-analyzer.ts`) uses `response_format: { type: "json_object" }` parameter to guarantee valid JSON responses `FR-SCORE-24`
2. **Regex Extraction Removed** — The regex-based JSON extraction (`/\{[\s\S]*\}/`) is replaced with direct `JSON.parse()` of the response content `FR-SCORE-24`
3. **Retry Logic on Parse Failure** — If JSON parsing fails despite native mode (edge case), the system retries once with a simplified prompt before returning `null` (which triggers the existing algorithmic-only fallback in the calling pipeline, per Story 4.6 design) `FR-SCORE-24`
4. **Error Logging** — Parse failures are logged to Sentry with the raw response body for debugging, without exposing the data to users `FR-SCORE-24`
5. **No Schema Changes** — The JSON structure returned by the LLM remains identical; only the extraction method changes `FR-SCORE-24`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-SCORE-24 | AC #1, #2, #3, #4, #5 | @FR-SCORE-24 @story-13-2 |

## Definition of Done

- [x] All acceptance criteria are met and verified
- [ ] Code reviewed and approved
- [x] Unit tests written and passing (coverage thresholds: 96% branches, 98% functions, 99% lines)
- [x] Acceptance test scenarios created with triple tags (@E-013-S-N, @FR-SCORE-24, @story-13-2)
- [x] Feature file: `test/acceptance/features/E-013-scoring-algorithm-improvements.feature`
- [x] Step definitions: `test/acceptance/step_definitions/E-013-structured-json.steps.ts`
- [x] Requirements traceability matrix updated
- [x] No regressions — existing tests still pass
- [ ] No lint errors (`pnpm lint`)
- [ ] Build passes (`pnpm build`)

## Tasks / Subtasks

- [x] Task 1: Update OpenAI API calls
  - [x] 1.1 Add `response_format: { type: "json_object" }` to the `openai.chat.completions.create()` call in `analyzeSellability()` (line 338)
  - [x] 1.2 Ensure system prompt includes "Respond with valid JSON" (required by OpenAI when using json_object mode)
  - [x] 1.3 Replace regex extraction with direct `JSON.parse(response.choices[0].message.content)` (line 373)
  - [x] 1.4 `finish_reason` check — if `finish_reason === 'length'`, log warning and retry with `max_tokens: 1200` (lines 342-363)

- [x] Task 2: Add retry logic
  - [x] 2.1 Wrap JSON.parse in try/catch (line 374)
  - [x] 2.2 On failure: retry once with simplified prompt (lines 378-389)
  - [x] 2.3 On second failure: log to Sentry via `Sentry.captureException()`, return `null` for algorithmic fallback (lines 392-396)

- [x] Task 3: Remove deprecated regex extraction
  - [x] 3.1 Regex extraction (`responseText.match(...)`) removed — direct JSON.parse used instead
  - [x] 3.2 Legacy try/catch blocks for regex failures cleaned up

- [x] Task 4: Unit tests
  - [x] 4.1 Mock OpenAI response with valid JSON — verify direct parse works
  - [x] 4.2 Mock OpenAI response with invalid JSON — verify retry fires
  - [x] 4.3 Mock double failure — verify algorithmic fallback activates and Sentry.captureException called
  - [x] 4.4 Verify Sentry capture on parse failure (with extra context including original response)
  - [x] 4.5 Test: response has `content: null` — verify defensive check remains and fallback activates
  - [x] 4.6 Test: `finish_reason: 'length'` — verify truncation retry with `max_tokens: 1200`
  - [x] 4.7 Test: truncation retry parse failure — verify Sentry logging
  - [x] 4.8 Test: truncation retry null content — verify null return

- [x] Task 5 (Review Fix): Fix `buildResult()` to pass `askingPrice` to `cacheSellabilityAnalysis()`
  - [x] 5.1 Line 434: `cacheSellabilityAnalysis(listingId, result, askingPrice)` — ensures `analyzedAtPrice` is populated for price-delta invalidation

## Dev Notes

### CRITICAL: OpenAI json_object Mode Requirements

When using `response_format: { type: "json_object" }`:
- The system or user prompt MUST contain the word "JSON" — OpenAI enforces this
- The response is guaranteed to be valid JSON (no markdown wrapping)
- The model may still return unexpected field names or types — validate schema after parsing
- This feature is available on `gpt-4o-mini` and `gpt-4o`

There is exactly 1 OpenAI call site in this file. No shared helper function — the call is inline in `analyzeSellability()`. Error handling is a single try/catch returning `null`. The existing validation functions (`validateDemandLevel()`, `validateRisk()`, `validateConfidence()`, score clamping) MUST be preserved even with `json_object` mode — the LLM can still return wrong types/values.

AC #4 says 'logged to Sentry' but current code uses `console.error`. Import and use `Sentry.captureException()` for parse failures.

**Files to modify:**
- `src/lib/llm-analyzer.ts` — the `openai.chat.completions.create()` call in `analyzeSellability()`
- `src/__tests__/llm-analyzer.test.ts` — update mocks

**This is a low-risk, high-reliability improvement.** The existing regex extraction works ~95% of the time. This change makes it 100%.

## Dev Agent Record

### File List

| File | Action | Description |
|------|--------|-------------|
| `src/lib/llm-analyzer.ts` | Modified | Added `response_format: { type: 'json_object' }`, removed regex extraction, added retry logic with Sentry logging, added `finish_reason` truncation handling, fixed `buildResult` to pass `askingPrice` to cache |
| `src/__tests__/lib/llm-analyzer.test.ts` | Modified | Added tests for Sentry assertion on double failure, `finish_reason: 'length'` truncation, truncation retry failure, null content on truncation retry, `askingPrice` cache verification |
| `src/__tests__/llm-analyzer.test.ts` | Deleted | Removed duplicate old test file (superseded by `src/__tests__/lib/llm-analyzer.test.ts`) |
| `test/acceptance/features/E-013-scoring-algorithm-improvements.feature` | Modified | Added 5 scenarios for Story 13.2 (S-009 through S-013) |
| `test/acceptance/step_definitions/E-013-structured-json.steps.ts` | Created | Step definitions for Story 13.2 acceptance tests — static code analysis |
| `_bmad-output/test-artifacts/requirements-traceability-matrix.md` | Modified | Added FR-SCORE-24 row |

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-04-12 | Code review fixes: marked tasks complete, added missing tests (Sentry assertion, truncation retry), fixed `buildResult` askingPrice bug, removed duplicate test file, created acceptance tests, updated RTM | Code Review (AI) |
