# Story 13.9: Centralized Prompts + Multi-Provider AI — Plan Integration & Acceptance Coverage

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID: 6a2b91f09e219a6a3b0f1ffe

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As **Stephen (the founder)**,
I want the already-implemented centralized prompt registry and multi-provider AI router (`src/lib/ai/`) formally integrated into the BMAD plan with PRD requirements, acceptance scenarios, and RTM traceability — codifying the **production** routing table (Groq-primary) as canonical,
so that the AI layer powering every AI feature (scoring, messaging, listing copy, identification, negotiation) is requirement-backed and regression-protected, and so the upcoming Epic 30 Python/LangGraph conversion has an authoritative behavioral contract to port against.

## Context

The design spec `docs/superpowers/specs/2026-04-12-centralized-prompts-multi-provider-ai-design.md` (Status: Approved) was **fully implemented on 2026-04-12 outside BMAD tracking**, then deliberately evolved. A plan-integration audit on 2026-06-12 confirmed the findings below, after which the spec doc was **removed from the repo (2026-06-12)** — this story and the BMAD plan are now the canonical record; the spec remains recoverable via git history.

- ✅ Implemented: full `src/lib/ai/` module — `completeAI()` router, 4 provider adapters (Groq, Gemini, OpenAI, Anthropic), 12/12 prompts registered in `src/lib/ai/prompts/`, all 10 consumer files migrated (zero inline `new OpenAI(` clients remain), `GROQ_API_KEY` in `.env.example` + `config/secretmanager.yaml`, plus additions beyond the spec (`providers/errors.ts`, `providers/error-mapping.ts`)
- ✅ Unit coverage: 9 test files under `src/__tests__/lib/ai/` (router, error handling, all adapters, factory, registry, interpolation)
- ❌ Missing: any story in the plan, any dedicated PRD FRs (only incidental FR-PERF-03 / FR-RELY-01 coverage), dedicated acceptance scenarios, RTM rows

**Two intentional drifts from the spec are codified by this story (the spec is historical; production is canonical):**

1. **Routing:** the spec's table is Gemini-primary; production is **Groq-primary for all 10 text-only tasks** (Groq → Gemini → OpenAI), Anthropic-primary for `claudeAnalysis`, OpenAI-primary for `itemCompleteness` (vision; Gemini Vision fallback). Documented in CHANGELOG and `project-context.md`.
2. **Testing:** the spec's "mock the SDK / mock `@/lib/ai`" strategy is **superseded** by the hard never-mock-AI policy (CLAUDE.md + `project-context.md`). All acceptance scenarios in this story exercise the real provider chain or inspect real source — no stubs, no interception.

This story closes the traceability and verification gaps. It is **not** a re-implementation story.

## Acceptance Criteria

1. **PRD requirements added** — A new `FR-AI-*` family is added to the PRD:
   - `FR-AI-01`: All AI prompt text shall be centralized in a typed prompt registry (`src/lib/ai/prompts/`); consumer modules shall contain no inline prompt text and no direct provider SDK clients.
   - `FR-AI-02`: Every AI task shall route through `completeAI(taskName, context)` with a per-task preferred provider and ordered fallback chain. Canonical routing: Groq-primary for all text-only tasks; Anthropic-primary for `claudeAnalysis`; OpenAI-primary for `itemCompleteness` (vision) with Gemini Vision fallback.
   - `FR-AI-03`: When every provider in a task's chain is unavailable, the router shall throw `AIProviderUnavailableError` and consumers shall degrade gracefully to algorithmic-only behavior.
   - `FR-AI-04`: Provider availability shall be driven by environment keys (`GROQ_API_KEY` mandatory primary; `GOOGLE_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` optional fallbacks), documented in `.env.example` and `config/secretmanager.yaml`. `FR-AI-01` `FR-AI-02` `FR-AI-03` `FR-AI-04`
2. **Registry completeness** — Acceptance scenario asserts all 12 prompt names are registered and retrievable (`getAllPromptNames()` returns exactly the 12 canonical names; `getPrompt()` throws a descriptive error for unknown names). Service-level, no mocking. `FR-AI-01`
3. **No inline AI clients in consumers** — Source-inspection scenarios assert the 10 migrated consumer files contain no `new OpenAI(`, `new Anthropic(`, or inline system-prompt text, and import from `@/lib/ai`. `FR-AI-01`
4. **Canonical routing table enforced** — Service-level scenarios assert each registered `PromptConfig`'s `provider` + `fallbacks` match the canonical production routing table (Groq-primary ×10, Anthropic for `claudeAnalysis`, OpenAI for `itemCompleteness`), so any future routing change must consciously update the scenario. `FR-AI-02`
5. **Live router round-trip** — One service-level scenario calls the real `completeAI()` on a low-token text task with the real Groq key and asserts the response contains non-empty `content`, a `provider` identifier, and a `model` identifier. Tagged `@serial` with a lifted timeout per the AI-flake root-cause rules. **Real AI call — never mocked.** `FR-AI-02`
6. **Graceful degradation contract** — Scenario(s) assert `AIProviderUnavailableError` is exported and that provider `isAvailable()` returns false when its key is absent from the environment (availability logic is config-driven, exercised without network interception). `FR-AI-03`
7. **Env/secret documentation** — Scenario asserts `GROQ_API_KEY` is documented in `.env.example` and present in `config/secretmanager.yaml` scopes. `FR-AI-04`
8. **RTM updated** — RTM gains rows mapping FR-AI-01..04 → this story's ACs → new scenario tags → `E-013-scoring-algorithm-improvements.feature`. `FR-AI-01` `FR-AI-02` `FR-AI-03` `FR-AI-04`

## Requirement Traceability

> **NOTE:** FR-AI-01 through FR-AI-04 are NEW functional requirements to be added to the PRD as part of this story (AC #1) — precedent: Story 13.7 / FR-SCORE-29. The `FR-AI-*` namespace is verified unused as of 2026-06-12.

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-AI-01 | AC #2, #3 | @FR-AI-01 @story-13-9 |
| FR-AI-02 | AC #4, #5 | @FR-AI-02 @story-13-9 |
| FR-AI-03 | AC #6 | @FR-AI-03 @story-13-9 |
| FR-AI-04 | AC #7 | @FR-AI-04 @story-13-9 |

## Tasks / Subtasks

- [ ] Add FR-AI-01..04 to PRD Requirements Inventory (AC #1)
- [ ] Write Gherkin scenarios in `test/acceptance/features/E-013-scoring-algorithm-improvements.feature`, continuing the epic's zero-padded sequential numbering from `@E-013-S-072` (current max is `@E-013-S-071`) (ACs #2–#7)
- [ ] Tag every scenario with ALL THREE: `@FR-AI-<NN>`, `@story-13-9`, `@E-013-S-<NNN>`; tag the live-call scenario `@serial` (ACs #2–#7)
- [ ] Implement step definitions (service-level + source-inspection; live Groq call with lifted timeout — NO mocking, NO interception) (ACs #2–#7)
- [ ] Update RTM (AC #8)
- [ ] Update `sprint-status.yaml`; move Trello card per workflow

## Definition of Done

- [ ] All ACs implemented and passing at the named test level
- [ ] All FR/AC dual-tag coverage in test files: `@FR-AI-<NN> @story-13-9` + `@E-013-S-<NNN>`
- [ ] **Never-mock-AI policy honored** — zero stubs, zero `jest.mock('@/lib/ai')`, zero network interception introduced
- [ ] `make lint` — zero ESLint errors
- [ ] `make build` — strict TypeScript passes
- [ ] `make test` — all unit tests green, zero regressions
- [ ] `make test-ac STORY=13.9` passes with zero failures, zero skipped scenarios
- [ ] `make test-ac FEATURE=F13` passes cleanly (no regressions in Epic 13)
- [ ] RTM updated to map FR-AI-01..04 → ACs → scenarios
- [ ] `sprint-status.yaml` updated to reflect story completion
- [ ] Trello card moved per status (trello-axovia, board SvVRLeS5)
- [ ] No `Blocked: true` remaining in story frontmatter

## File List

_Existing files under verification (no changes expected unless drift found):_
- `src/lib/ai/index.ts`, `src/lib/ai/providers/*`, `src/lib/ai/prompts/*`
- `src/__tests__/lib/ai/**`
- `.env.example`, `config/secretmanager.yaml`

_Files to create/modify:_
- `_bmad-output/planning-artifacts/PRD.md` (add FR-AI-01..04)
- `test/acceptance/features/E-013-scoring-algorithm-improvements.feature` (new scenarios)
- `test/acceptance/step_definitions/E-013-ai-router.steps.ts` (new)
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## References

- Design spec: `docs/superpowers/specs/2026-04-12-centralized-prompts-multi-provider-ai-design.md` (removed 2026-06-12 — BMAD plan is canonical; recoverable via git history)
- Never-mock-AI policy: `CLAUDE.md` § *AI testing — NEVER MOCK*; `_bmad-output/project-context.md`
- Related stories: 13.2 (structured JSON LLM response), 4.6 (AI analysis caching & fallback)
- Plan-integration audit: party-mode session 2026-06-12
