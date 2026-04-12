# Story 13.2: Structured JSON Response Format for LLM Analysis

Status: review
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

- [ ] All acceptance criteria are met and verified
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing (coverage thresholds: 96% branches, 98% functions, 99% lines)
- [ ] Acceptance test scenarios created with triple tags (@E-013-S-N, @FR-SCORE-24, @story-13-2)
- [ ] Feature file: `test/acceptance/features/E-013-scoring-algorithm-improvements.feature`
- [ ] Step definitions: `test/acceptance/step_definitions/E-013-structured-json.steps.ts`
- [ ] Requirements traceability matrix updated
- [ ] No regressions — existing tests still pass
- [ ] No lint errors (`pnpm lint`)
- [ ] Build passes (`pnpm build`)

## Tasks / Subtasks

- [ ] Task 1: Update OpenAI API calls
  - [ ] 1.1 Add `response_format: { type: "json_object" }` to the `openai.chat.completions.create()` call in `analyzeSellability()` (~line 210)
  - [ ] 1.2 Ensure system prompt includes "Respond with valid JSON" (required by OpenAI when using json_object mode)
  - [ ] 1.3 Replace regex extraction with direct `JSON.parse(response.choices[0].message.content)`
  - [ ] 1.4 Verify `max_tokens: 800` is sufficient for the full JSON schema. Add a `finish_reason` check — if `finish_reason === 'length'`, log a warning and increase `max_tokens` to 1200.

- [ ] Task 2: Add retry logic
  - [ ] 2.1 Wrap JSON.parse in try/catch
  - [ ] 2.2 On failure: retry once with simplified prompt ("Return ONLY a JSON object with these fields: ...")
  - [ ] 2.3 On second failure: log to Sentry, fall back to algorithmic scoring (existing fallback path from Story 4.6)

- [ ] Task 3: Remove deprecated regex extraction
  - [ ] 3.1 Remove the inline regex extraction (`responseText.match(/\{[\s\S]*\}/)`) at ~line 231 and the associated null check
  - [ ] 3.2 Clean up any try/catch blocks that were working around regex failures

- [ ] Task 4: Unit tests
  - [ ] 4.1 Mock OpenAI response with valid JSON — verify direct parse works
  - [ ] 4.2 Mock OpenAI response with invalid JSON — verify retry fires
  - [ ] 4.3 Mock double failure — verify algorithmic fallback activates
  - [ ] 4.4 Verify Sentry capture on parse failure
  - [ ] 4.5 Test: response has `content: null` — verify defensive check remains and fallback activates

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
