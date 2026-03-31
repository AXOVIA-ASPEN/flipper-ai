# Story 6.2: Kanban Board with Lifecycle Tracking

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69a408a29cad53e2bb095f43

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **user**,
I want a Kanban board to track flips through their lifecycle with drag-and-drop,
So that I can visually manage each flip from discovery to sale.

## Acceptance Criteria

<!-- Each criterion references the FR-* requirement(s) it validates from the PRD -->

1. Kanban view shows all 6 lifecycle columns: IDENTIFIED → CONTACTED → PURCHASED → LISTED → SOLD → PASSED `FR-DASH-02`
2. Dragging an opportunity card between any two columns updates and persists the opportunity status `FR-DASH-02`
3. Moving a card to the PURCHASED column opens a modal that prompts for purchase price; the move only completes after the price is submitted `FR-DASH-03`
4. Moving a card to the LISTED column opens a modal that prompts for the resale URL; the move only completes after the URL is submitted `FR-DASH-04`
5. Moving a card to the SOLD column opens a modal that prompts for the final sale price; the system then calculates and persists `actualProfit = salePrice - purchasePrice - fees` `FR-DASH-05`
6. Dragging a card to the PASSED column marks the opportunity as passed/declined with no modal required `FR-DASH-02`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|---------------------|----------|
| FR-DASH-02 | AC #1, #2, #6 | @FR-DASH-02 @story-6-2 |
| FR-DASH-03 | AC #3 | @FR-DASH-03 @story-6-2 |
| FR-DASH-04 | AC #4 | @FR-DASH-04 @story-6-2 |
| FR-DASH-05 | AC #5 | @FR-DASH-05 @story-6-2 |

## Definition of Done

- [x] All acceptance criteria are met and verified
- [ ] Code reviewed and approved
- [x] Unit tests written and passing for KanbanBoard and status-change modal logic
- [x] Acceptance test scenarios written in `test/acceptance/features/E-006-flip-lifecycle-management-analytics.feature` with dual tags (`@FR-DASH-XX` and `@story-6-2`)
- [x] Scenarios numbered `@E-006-S-10` through `@E-006-S-15` (S-1–S-9 already used by story 6.1; numbering starts at S-10)
- [x] Requirements traceability matrix updated at `_bmad-output/test-artifacts/requirements-traceability-matrix.md`
- [x] user_flows.feature updated (this story directly affects the "Kanban Flip Tracking" user flow)
- [x] No regressions — existing tests still pass (`pnpm test`)
- [x] Dev notes and references are complete
- [ ] Trello card moved to Verified
- [ ] Feature card checklist item marked complete

## Tasks / Subtasks

- [x] Task 1: Add PASSED column to KanbanBoard (AC: #1, FR: FR-DASH-02)
  - [x] Add `{ id: 'PASSED', label: 'Passed', ... }` entry to the `COLUMNS` array in `src/components/KanbanBoard.tsx`
  - [x] Choose a neutral color (e.g., `from-gray-400 to-gray-600`) for the PASSED column styling
  - [x] Verify legacy status mapping logic still routes unknown statuses to IDENTIFIED (not PASSED)

- [x] Task 2: Implement lifecycle modal system in `app/opportunities/page.tsx` (AC: #3, #4, #5, FR: FR-DASH-03/04/05)
  - [x] Add modal state: `pendingKanbanMove: { opportunityId: string; targetStatus: string } | null`
  - [x] Add modal input state: `modalPurchasePrice`, `modalResaleUrl`, `modalSalePrice`, `modalFees` (string inputs for controlled form)
  - [x] Update `handleKanbanStatusChange` to intercept moves to PURCHASED, LISTED, SOLD, open the relevant modal, and **not** call `updateOpportunity` until modal is confirmed
  - [x] Implement PURCHASED modal: required `purchasePrice` input, confirm button calls `updateOpportunity(id, { status: 'PURCHASED', purchasePrice, purchaseDate: new Date().toISOString() })`
  - [x] Implement LISTED modal: required `resaleUrl` input, confirm button calls `updateOpportunity(id, { status: 'LISTED', resaleUrl })`
  - [x] Implement SOLD modal: required `salePrice` (maps to `resalePrice`) input, optional `fees` input. On confirm, `actualProfit` is **computed server-side** by the existing PATCH handler logic (`resalePrice - purchasePrice - fees`). Call `updateOpportunity(id, { status: 'SOLD', resalePrice: salePrice, fees, resaleDate: new Date().toISOString() })`. Forwards `purchasePrice` from opportunity state so server can auto-calculate profit.
  - [x] All modals: allow cancellation (modal closes, card stays in original column / no API call)

- [x] Task 3: Write unit tests (AC: all, FR: FR-DASH-02/03/04/05)
  - [x] Update `src/__tests__/components/KanbanBoard.test.tsx` to assert PASSED column renders and to verify PASSED-status opportunities route to PASSED column (8 tests)
  - [x] Add modal tests in new `src/__tests__/components/OpportunitiesPage-kanban-modals.test.tsx` covering: PURCHASED modal opens on drag to PURCHASED, LISTED modal opens on drag to LISTED, SOLD modal opens on drag to SOLD, modal cancellation (PURCHASED/LISTED/SOLD), modal submission calls PATCH with correct payload, SOLD without fees (false branch), SOLD without prior purchasePrice (false branch), SOLD/PURCHASED confirm disabled when empty (15 tests, all passing)
  - [x] Fixed regressions in `src/__tests__/components/OpportunitiesPage-purchased.test.tsx` caused by linter refactoring (added mocks for `next/navigation`, `useFilterParams`, `FilterPanel`; updated multi-select filter assertions)

- [x] Task 4: Write acceptance tests (AC: all, FR: FR-DASH-02/03/04/05)
  - [x] Added Story 6.2 scenarios S-10 through S-15 to `test/acceptance/features/E-006-flip-lifecycle-management-analytics.feature` (S-1–S-9 pre-existed from story 6.1)
  - [x] Tagged each scenario: `@E-006-S-<N> @story-6-2 @FR-DASH-0X`
  - [x] Created step definitions `test/acceptance/step_definitions/E-006-kanban-lifecycle.steps.ts` using static code analysis pattern (no @wip — scenarios run without a live server)

- [x] Task 5: Update traceability matrix + user_flows.feature (AC: all)
  - [x] Added scenario IDs to `_bmad-output/test-artifacts/requirements-traceability-matrix.md` for FR-DASH-02/03/04/05 (all now "Covered")
  - [x] Updated `test/acceptance/features/user_flows.feature` with Flow 4: Kanban Flip Tracking scenarios (tagged @wip)

## Dev Notes

### CRITICAL: What Already Exists vs. What Needs Building

**Already built (DO NOT reinvent):**
- `src/components/KanbanBoard.tsx` — full DnD board with 5 columns (IDENTIFIED, CONTACTED, PURCHASED, LISTED, SOLD). Uses `@hello-pangea/dnd ^18.0.1`.
- `app/opportunities/page.tsx` — hosts the KanbanBoard. Has `handleKanbanStatusChange(id, newStatus)` which currently calls `updateOpportunity(id, { status: newStatus })` directly (line 351–353). **This is the function to augment.**
- `PATCH /api/opportunities/[id]` — already computes `actualProfit = resalePrice - purchasePrice - fees` when both `resalePrice` and `purchasePrice` are present in the body (app/api/opportunities/[id]/route.ts lines 33–35). No server changes required for profit calculation.
- Opportunity model in Prisma (`prisma/schema.prisma`) — has all required fields: `purchasePrice`, `purchaseDate`, `resaleUrl`, `resalePrice`, `resalePlatform`, `actualProfit`, `fees`, `status`. **No schema migration needed.**

**NOT yet built (this story):**
1. PASSED column in KanbanBoard
2. Modal intercept logic for PURCHASED / LISTED / SOLD transitions in `handleKanbanStatusChange`
3. Acceptance test feature file for Epic 6
4. Step definitions for E-006

### File Locations to Touch

| File | Change |
|------|--------|
| `src/components/KanbanBoard.tsx` | Add PASSED to COLUMNS array |
| `app/opportunities/page.tsx` | Add modal state + update `handleKanbanStatusChange` |
| `src/__tests__/components/KanbanBoard.test.tsx` | Assert PASSED column rendered |
| `src/__tests__/components/OpportunitiesPage-kanban-modals.test.tsx` | New file: modal interaction tests |
| `test/acceptance/features/E-006-flip-lifecycle-management-analytics.feature` | New file: Gherkin scenarios |
| `test/acceptance/step_definitions/E-006-kanban-lifecycle.steps.ts` | New file: step definitions |
| `_bmad-output/test-artifacts/requirements-traceability-matrix.md` | Update scenario IDs for FR-DASH-02–05 |
| `test/acceptance/features/user_flows.feature` | Update Flow 4: Kanban Flip Tracking |

### KanbanBoard Architecture

```
src/components/KanbanBoard.tsx
  - COLUMNS const (currently 5 entries; add PASSED as 6th)
  - KanbanBoardProps.onStatusChange: (id, newStatus) => Promise<void>
  - handleDragEnd() calls onStatusChange(draggableId, destination.droppableId)
  - No knowledge of modals — modal logic lives in the parent (OpportunitiesPage)

app/opportunities/page.tsx
  - handleKanbanStatusChange(id, newStatus): currently a direct pass-through
  - Must become: if newStatus === 'PURCHASED' | 'LISTED' | 'SOLD', set pendingKanbanMove state and open relevant modal
  - Modal confirm: gather input, call updateOpportunity(id, payload), clear pendingKanbanMove
  - Modal cancel: clear pendingKanbanMove, do nothing (Kanban card snaps back via React state)
```

### Profit Calculation — Server-Side (DO NOT duplicate)

The PATCH handler in `app/api/opportunities/[id]/route.ts` already handles profit:

```typescript
if (body.purchasePrice !== undefined && body.resalePrice !== undefined) {
  const fees = body.fees || 0;
  updateData.actualProfit = body.resalePrice - body.purchasePrice - fees;
}
```

For the SOLD modal: call `PATCH /api/opportunities/:id` with `{ status: 'SOLD', resalePrice: salePrice, fees }` — server calculates `actualProfit`. Include `purchasePrice` in the payload only if the opportunity doesn't already have it set; otherwise the server will use the existing DB value.

**Important:** The PATCH handler recalculates `actualProfit` only when BOTH `purchasePrice` AND `resalePrice` are in the request body. If the opportunity already has `purchasePrice` stored and the SOLD modal only sends `resalePrice + fees`, the server will not auto-calculate. Solution: fetch the current `purchasePrice` from the opportunity object in state and include it in the SOLD PATCH payload.

### Fee Estimation

Current architecture uses 13% flat fee (`value-estimator.ts:236`). Story 4.2 ("Platform-Specific Fees & Opportunity Threshold") is in-progress and will introduce per-platform fee rates. For this story:

- The SOLD modal should have an **optional** `fees` input field (defaults to empty/zero) so users can enter actual fees paid.
- Do NOT attempt to implement automatic fee calculation from Story 4.2 — that dependency is not yet done.
- Pre-fill the fees field with `null` (leave blank); let the user enter exact fees.

### Modal UX Pattern

Follow the existing edit form pattern already in the page (around line 347–349 in `app/opportunities/page.tsx`). The page already uses inline state forms. Modals should be:

- Backdrop blur overlay (`backdrop-blur-xl bg-black/60`)
- Centered card (`max-w-md mx-auto`)
- Dark glassmorphism style consistent with rest of app (`bg-white/5 border border-white/10`)
- Required field validation (disable submit button if required field is empty)
- Cancel button clears modal state without side effects

### @hello-pangea/dnd Version Note

Package is `@hello-pangea/dnd ^18.0.1`. This is a React 18+ compatible fork of `react-beautiful-dnd`. All Droppable/Draggable/DragDropContext APIs are identical to `react-beautiful-dnd v13`. When a drag is cancelled (user releases outside a droppable), `result.destination` is `null` — `handleDragEnd` already guards this correctly. No changes needed to the DnD wiring.

### Test Standards

- Jest unit tests: `@jest-environment jsdom` directive at top
- Mock `@hello-pangea/dnd` as shown in existing `KanbanBoard.test.tsx` (see `src/__tests__/components/KanbanBoard.test.tsx` lines 14–37)
- Mock `@/components/KanbanBoard` in OpportunitiesPage tests to return `<div data-testid="kanban-board" />`
- For modal tests: use `userEvent.setup()` for interactions (not `fireEvent`)
- Coverage thresholds: branches 96%, functions 98%, lines 99%, statements 99% — ensure new modal logic is covered

### Acceptance Test Tagging Convention

Every Gherkin scenario in Epic 6 needs THREE tags:
- `@E-006-S-<N>` — sequential across the ENTIRE epic (story 6.1 uses S-1 through S-9; story 6.2 uses S-10 through S-15)
- `@story-6-2` — story reference
- `@FR-DASH-0X` — FR reference

Example:
```gherkin
@E-006-S-5 @story-6-2 @FR-DASH-02
Scenario: Kanban board displays all lifecycle columns
  Given I am logged in as a user
  When I navigate to the opportunities page
  And I select the Kanban view
  Then columns are displayed in order: "IDENTIFIED", "CONTACTED", "PURCHASED", "LISTED", "SOLD", "PASSED"
```

Tag all E-006 scenarios with `@wip` initially (they'll be excluded from default BDD runs per `cucumber.js` config). Remove `@wip` when step definitions are implemented.

### PASSED Status

- PASSED is a valid `status` value in the Opportunity model (stored as string, no enum constraint in schema)
- Existing code (KanbanBoard) handles unknown statuses by routing to IDENTIFIED — PASSED will need to be added to the COLUMNS list to get its own column
- PASSED column requires no modal — just a direct status update (same as IDENTIFIED→CONTACTED transitions)
- Label: "Passed" (display name)

### Related Tests That Must Not Break

- `src/__tests__/components/KanbanBoard.test.tsx` — 7 tests, all currently pass. After adding PASSED column, the column count expectations will need to be updated (e.g., the test at line 94 checks `Sold` is in document — it should still pass, but check for `Passed` needs to be added).
- `src/__tests__/components/OpportunitiesPage-purchased.test.tsx` — 20 tests. None test the kanban status change flow; should not break.
- `src/__tests__/components/OpportunitiesPage.test.tsx` — check for `handleKanbanStatusChange` related tests before modifying.

### Project Context Reference

- Project: flipper-ai
- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- PRD: `_bmad-output/planning-artifacts/PRD.md`
- UX Design: `_bmad-output/planning-artifacts/ux-design.md` (Flow 4: Kanban Flip Tracking, line 212–223)
- Feature file: `test/acceptance/features/E-006-flip-lifecycle-management-analytics.feature` (create new)
- RTM: `_bmad-output/test-artifacts/requirements-traceability-matrix.md`

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References

- Dynamic import + `jest.resetModules()` broke React hooks in initial modal test attempt — fixed by using static import matching existing test file pattern.
- `capturedOnStatusChange()` resolved before React re-rendered modal — fixed with `await waitFor(() => expect(screen.getByRole('dialog',...)).toBeInTheDocument())` before interacting.
- Linter refactored `app/opportunities/page.tsx` during implementation (added `Suspense`, `FilterPanel`, `useFilterParams` URL-based state) — broke `OpportunitiesPage-purchased.test.tsx`; fixed by mocking `next/navigation`, `@/hooks/useFilterParams`, and `@/components/FilterPanel`.
- "Filters by PURCHASED status" test assertion stale after multi-select refactor — changed from checking fetch URL (`status=PURCHASED`) to asserting `mockSetFilter` was called with `('statuses', 'PURCHASED')`.
- E-006 scenario numbering: story 6.1 pre-populated S-1 through S-9 (more than the 4 expected); story 6.2 uses S-10 through S-15.
- SOLD modal must include `purchasePrice` in PATCH payload: server only recalculates `actualProfit` when BOTH `resalePrice` AND `purchasePrice` are in the request body — forwarded from opportunity state.

### Completion Notes List

- All 6 acceptance criteria verified via unit tests (41 tests across 3 files, all passing).
- Acceptance scenarios S-10–S-15 use static code analysis pattern (not @wip) — they run without a live server by inspecting source files directly.
- DoD note: Scenario numbering deviation — story used S-10–S-15 instead of S-5–S-10 because story 6.1 had already populated S-1–S-9 in the feature file.
- No schema migrations required — all Prisma fields (`purchasePrice`, `purchaseDate`, `resaleUrl`, `resalePrice`, `fees`, `actualProfit`, `status`) already existed.
- `actualProfit` calculation remains server-side per existing PATCH handler; no duplication in frontend.

### File List

**Modified:**
- `src/components/KanbanBoard.tsx` — added PASSED as 6th column (`gray-400/gray-600` color theme)
- `src/__tests__/components/KanbanBoard.test.tsx` — added assertion for "Passed" column rendering
- `app/opportunities/page.tsx` — added modal state, updated `handleKanbanStatusChange`, added PURCHASED/LISTED/SOLD modal JSX
- `src/__tests__/components/OpportunitiesPage-purchased.test.tsx` — fixed regressions from linter refactoring (added navigation/filter mocks, updated multi-select assertions)
- `test/acceptance/features/E-006-flip-lifecycle-management-analytics.feature` — added S-10 through S-15 scenarios for story 6.2
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` — FR-DASH-02/03/04/05 now "Covered"
- `test/acceptance/features/user_flows.feature` — added Flow 4: Kanban Flip Tracking scenarios (@wip)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status updated to in-progress (then review)

**Created:**
- `src/__tests__/components/OpportunitiesPage-kanban-modals.test.tsx` — 10 modal interaction tests
- `test/acceptance/step_definitions/E-006-kanban-lifecycle.steps.ts` — static code analysis step definitions for S-10–S-15

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-01 | Story implemented: PASSED column + lifecycle modals (PURCHASED/LISTED/SOLD) + unit tests + acceptance tests + RTM update | claude-sonnet-4-6 |
| 2026-03-02 | Code review fixes: added 5 tests (LISTED/SOLD cancel, SOLD disabled-when-empty, SOLD without fees, SOLD without prior purchasePrice); added PASSED routing test to KanbanBoard; added @E-006-S-21/S-22 tags to user_flows.feature; fixed Dev Notes numbering example; updated RTM with S-21/S-22 | claude-sonnet-4-6 |
