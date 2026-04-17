# Story 14.5: Onboarding Wizard Dark Migration

Status: in-progress
Blocked: false
Blocked-Reason:
Trello-Card-ID:

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->
<!-- Trello-Card-ID: populated during sprint intake when the trello-axovia card is created. -->

## Story

As a **new user**,
I want the onboarding wizard to use the same dark glassmorphism design as the rest of the app,
so that my first in-product experience is visually coherent and doesn't feel like a separate product.

## Problem Statement

The onboarding wizard (`app/onboarding/page.tsx` + `src/components/Onboarding/`) is the first
in-product screen a new user sees after registration. It currently uses a **light-mode blue/white
palette** that is completely alien to the dark-glassmorphism design shipping everywhere else in
Flipper.ai. Concretely:

| File | Non-canonical patterns |
|------|------------------------|
| `WizardLayout.tsx` | `bg-gradient-to-br from-blue-50 to-indigo-100` page bg; `bg-white rounded-2xl shadow-xl` card; `bg-blue-600` progress fill + next button; `bg-gray-200` progress track; `text-gray-*` throughout |
| `app/onboarding/page.tsx` | `bg-gradient-to-br from-blue-50 to-indigo-100` loading screen; `text-gray-600` loading copy |
| `StepWelcome.tsx` | `text-gray-800` / `text-gray-600` copy; `bg-blue-50`, `bg-green-50`, `bg-purple-50` feature mini-cards |
| `StepMarketplaces.tsx` | Selected: `border-blue-500 bg-blue-50`; unselected: `border-gray-200 bg-white`; `text-gray-800` labels; `text-blue-500` checkmark; `text-amber-600` warning |
| `StepCategories.tsx` | Same blue/gray selection pattern + `text-blue-500` checkmark |
| `StepBudget.tsx` | Selected: `border-blue-500 bg-blue-500` radio dot + card bg; unselected: `border-gray-*` |
| `StepLocation.tsx` | `border border-gray-300 focus:ring-blue-500` input; `border-blue-500 bg-blue-50 text-blue-700` radius buttons; `text-gray-*` throughout |
| `StepComplete.tsx` | `bg-blue-600 hover:bg-blue-700` CTA; `text-gray-*` throughout |

This story's scope is **visual + file-header updates, zero logic changes**. All business logic
(step routing, `saveStep()`, marketplace toggles, budget selection, ZIP persistence, router
navigation) is preserved exactly. No shared helpers or new abstractions are introduced.

## Acceptance Criteria

> Sourced verbatim from `_bmad-output/planning-artifacts/epics.md:2926–2961`.
> Each AC is independently testable; test level pinned per CLAUDE.md DoD.

1. **WizardLayout uses canonical dark design** — Given `WizardLayout.tsx` currently uses
   `bg-gradient-to-br from-blue-50 to-indigo-100`, `bg-white rounded-2xl shadow-xl`, `bg-blue-600`
   buttons, `bg-gray-200` progress track, `bg-blue-600` progress fill, and `text-gray-*` copy, when
   Story 14.5 is complete, then:
   (a) the outer wrapper has **no** `bg-gradient-*` / `bg-blue-*` / `bg-white` class — the root
   `.fp-bg-mesh` shows through;
   (b) the card container is `className="fp-glass"` (not `bg-white rounded-2xl shadow-xl`);
   (c) the progress track uses `className="fp-prog-track"`;
   (d) the progress fill uses `className="fp-prog-fill"` with
   `style={{ width: \`${progress}%\`, background: 'linear-gradient(90deg,#7c3aed,#8b5cf6)' }}`;
   (e) the Continue/next button uses `className="fp-btn-primary"`;
   (f) the Back button uses `className="fp-btn-ghost"`;
   (g) step-counter and Skip text use `style={{ color: '#94a3b8' }}`;
   (h) the title `<h1>` uses `style={{ color: '#e2e8f0' }}`.
   `FR-UI-DESIGN-02`

2. **Six step components use canonical glass selection cards** — Given the six step components
   (`StepWelcome`, `StepBudget`, `StepCategories`, `StepLocation`, `StepMarketplaces`, `StepComplete`),
   when Story 14.5 is complete, then each selection card (marketplace rows, category grid, budget
   rows) renders with `className="fp-glass-sm rounded-xl cursor-pointer"` (border via inline style,
   NOT `border-2` className) for the unselected state and inline
   `style={{ border: '2px solid rgba(109,40,217,0.5)', background: 'rgba(109,40,217,0.1)' }}` for
   the selected state — zero `bg-blue-50`, `border-blue-500`, `text-blue-700`, `border-gray-200`,
   `text-gray-800`, or `bg-white` on any selection card. `FR-UI-DESIGN-02`

3. **Onboarding form inputs use `.fp-input`** — Given the form inputs in `StepLocation.tsx`
   (ZIP code `<input>`) and the radius chip buttons, when the user types or interacts, then:
   (a) the ZIP `<input>` has `className="fp-input"` (no manual `border border-gray-300
   focus:ring-blue-500`);
   (b) radius chip buttons in the selected state use inline `style={{ border: '2px solid rgba(109,40,217,0.5)', background: 'rgba(109,40,217,0.1)', color: '#e2e8f0' }}` and in the unselected state use `className="fp-glass-sm"` with `style={{ color: '#94a3b8' }}`.
   A Playwright scenario confirms the ZIP input is focusable and its focus ring is purple.
   `FR-UI-DESIGN-02`

4. **No green selection indicators — all accent is purple** — Given that `StepMarketplaces.tsx`
   currently uses `text-blue-500` for selected checkmarks and `StepWelcome.tsx` uses `bg-green-50` for
   the "AI-powered insights" mini-card, when Story 14.5 is complete, then:
   (a) all selection-state checkmarks / radio dots use `style={{ color: '#8b5cf6' }}` (purple) —
   zero `text-blue-500` or `text-green-*`;
   (b) all feature mini-cards in `StepWelcome.tsx` use `className="fp-glass-sm"` — zero
   `bg-blue-50`, `bg-green-50`, `bg-purple-50`.
   `FR-UI-DESIGN-02` `FR-UI-DESIGN-04`

5. **Zero raw palette matches in the Onboarding folder** — Given the rebuilt Onboarding components,
   when the following grep commands are run:
   ```
   rg "(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|pink|rose|emerald|amber|yellow|red|orange|gray)-[0-9]" src/components/Onboarding
   rg "bg-(white|gray-[0-9])" src/components/Onboarding
   rg "border-gray-[0-9]" src/components/Onboarding
   ```
   then **all return zero matches**. Additionally:
   ```
   rg "(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|pink|rose|emerald|amber|yellow|red|orange|gray)-[0-9]" app/onboarding
   rg "bg-(white|gray-[0-9])" app/onboarding
   ```
   also return **zero matches** (loading screen in `app/onboarding/page.tsx` included).
   > Note: `gray` is explicitly included in the first grep (the original epics.md AC omits it but
   > `text-gray-*` / `border-gray-*` are equally banned). Inline hex values (`style={{ color: '#94a3b8' }}`)
   > are the canonical replacement and are NOT matched by the rg pattern.
   The pre-edit baseline counts are captured in the Dev Agent Record for reviewer comparison.
   `FR-UI-DESIGN-02`

6. **Full E2E Playwright journey renders canonical design and lands on `/dashboard`** — Given a
   new-user session authenticated via test credentials, when a Playwright E2E scenario navigates
   to `/onboarding` and completes all 6 steps (clicking "Continue" on steps 1–5, clicking "Go to
   Dashboard" on step 6), then:
   (a) on each step, the page has no `bg-gradient-*` class on the outermost wrapper (confirmed via
   DOM query);
   (b) the progress bar element has `classList` containing `fp-prog-fill` and its computed
   `background` includes `rgb(124, 58, 237)` (purple);
   (c) every "Continue" button has `classList` containing `fp-btn-primary`;
   (d) on step 6, the "Go to Dashboard" button has `classList` containing `fp-btn-primary`;
   (e) the scenario ends with the browser URL at `/` (dashboard redirect).
   `FR-UI-DESIGN-02`

7. **Quality gates pass** — Given the updated files, when `make lint`, `make build`, `make test`,
   `make test-ac STORY=14.5`, and `make test-ac FEATURE=F14` run, then all pass with zero errors,
   zero skipped scenarios, zero regressions on other Epic 14 stories' scenarios.
   Coverage: branches ≥96%, functions ≥98%, lines ≥99%, statements ≥99%.
   `FR-UI-DESIGN-02`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|-----------------|--------------------|-----------|
| FR-UI-DESIGN-02 (`.fp-*` canonical utility classes) | AC #1–#7 | `@FR-UI-DESIGN-02` `@story-14-5` `@E-014-S-<N>` |
| FR-UI-DESIGN-04 (green reserved for profit/financial) | AC #4 | `@FR-UI-DESIGN-04` `@story-14-5` `@E-014-S-<N>` |

**Scenario-number allocation:** The highest `@E-014-S-<N>` tag in
`test/acceptance/features/E-014-frontend-design-migration.feature` at story-authorship time is
`@E-014-S-28` (Stories 14.1–14.3). Story 14.5 **reserves `@E-014-S-29` through `@E-014-S-35`** (7
scenarios). Before appending scenarios, Task 8.1 performs an atomic reservation: grep the feature
file for the current max, write `# Story 14.5 reserves @E-014-S-29..@E-014-S-35 — appended
2026-04-17` as a comment at the top of the file, then append the scenarios.

## Tasks / Subtasks

### Task 0: Prerequisites — confirm upstream stories are done

- [ ] 0.1 **Block on Story 14.1** — verify `sprint-status.yaml` shows
  `14-1-design-tokens-base-style-unification: done` (or at minimum `review`). If not, set
  `Status: blocked`, `Blocked: true`, `Blocked-Reason: "Story 14.1 (fp-prog-track / fp-prog-fill /
  fp-btn-primary / fp-glass) must be done — WizardLayout rebuild depends on all four classes"`.
- [ ] 0.2 **Confirm Story 14.2 is done** — verify `14-2-remove-competing-multi-theme-system: done`.
  The onboarding folder was never on the `.bg-theme-*` system, so this is a soft check — no interim
  placeholders to replace. If 14.2 is `review` or `done`, proceed.
- [ ] 0.3 **No dependency on 14.3** — `LoadingSkeleton` / `ErrorBanner` / `EmptyState` /
  `ScoreRing` are not used in the onboarding wizard. Do NOT import them here. Proceed independently.
- [ ] 0.4 **Confirm Trello board and create card** — read `_bmad-output/project-context.md` for
  `Trello MCP Server: trello-axovia` + `Trello Board ID: SvVRLeS5`. Create card
  `[14.5] Onboarding Wizard Dark Migration` in the **To Do** list with the full AC block in the
  description; add `Epic 14` label; backfill `Trello-Card-ID:` in this file's frontmatter. If an
  F-014 Feature card does not exist yet, create it; add checklist item for this story.
- [ ] 0.5 **Verify WizardLayout is used only by `/onboarding`** — run
  `rg "WizardLayout" app/ src/ --include="*.tsx" --include="*.ts" -l`. Expected: exactly one match
  (`app/onboarding/page.tsx`). If any other file imports `WizardLayout`, the visual rebuild affects
  an unintended surface — flag it in Completion Notes and confirm with the story author before
  proceeding. This check prevents a silent regression on an unaudited consumer page.

### Task 1: Survey + pre-edit baseline

- [ ] 1.1 Read each target file in full:
  - `app/onboarding/page.tsx` (158 lines)
  - `src/components/Onboarding/WizardLayout.tsx` (110 lines)
  - `src/components/Onboarding/StepWelcome.tsx` (40 lines)
  - `src/components/Onboarding/StepMarketplaces.tsx` (67 lines)
  - `src/components/Onboarding/StepCategories.tsx` (67 lines)
  - `src/components/Onboarding/StepBudget.tsx` (64 lines)
  - `src/components/Onboarding/StepLocation.tsx` (76 lines)
  - `src/components/Onboarding/StepComplete.tsx` (45 lines)
- [ ] 1.2 Run pre-edit grep baseline (capture output into Dev Agent Record):
  ```bash
  rg -c "(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|pink|rose|emerald|amber|yellow|red|orange|gray)-[0-9]" src/components/Onboarding app/onboarding
  rg -c "bg-(white|gray-[0-9])" src/components/Onboarding app/onboarding
  rg -c "border-gray-[0-9]" src/components/Onboarding
  ```
  Expected: several hits in each file; zero `fp-*` hits. The extended `gray` pattern is new vs. the
  epics.md AC — it catches `text-gray-*` and `border-gray-*` which the original AC greps would miss.
- [ ] 1.3 Confirm the `fp-prog-track`, `fp-prog-fill`, `fp-btn-primary`, `fp-btn-ghost`, `fp-glass`,
  `fp-glass-sm`, `fp-input` classes all exist in `app/globals.css` (Story 14.1 gate). If ANY is
  absent, STOP and set story blocked on 14.1.

### Task 2: Rebuild `app/onboarding/page.tsx` loading screen (AC #1 partial, AC #5)

The loading state (lines 112–121) is the only non-component code with palette issues:

- [ ] 2.1 Replace the loading wrapper:
  ```tsx
  // BEFORE
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div className="text-center">
      <div className="text-4xl mb-4 animate-spin">🐧</div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>

  // AFTER
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="text-4xl mb-4 animate-spin">🐧</div>
      <p style={{ color: '#94a3b8' }}>Loading...</p>
    </div>
  </div>
  ```
- [ ] 2.2 Update file header to use the canonical format (CLAUDE.md global rule):
  ```tsx
  /**
   * @file app/onboarding/page.tsx
   * @author Stephen Boyett
   * @company Axovia AI
   * @date 2026-04-17
   * @version 1.1
   * @brief Onboarding wizard page — dark-migrated in Story 14.5.
   *
   * @description
   * Multi-step wizard guiding new users through initial setup (6 steps).
   * Progress is persisted to /api/user/onboarding so refreshes resume correctly.
   * Visual rebuild to canonical .fp-* dark glassmorphism — all business logic unchanged.
   */
  ```

### Task 3: Rebuild `WizardLayout.tsx` (AC #1)

- [ ] 3.1 Update file header (canonical format, version 1.1, date 2026-04-17).
- [ ] 3.2 Replace the outer wrapper (line 40):
  ```tsx
  // BEFORE
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">

  // AFTER
  <div className="min-h-screen flex items-center justify-center p-4">
  ```
  The root layout's `.fp-bg-mesh` + `.fp-bg-grid` (injected by `app/layout.tsx`) show through; no
  page-level background override.
- [ ] 3.3 Replace the card container (line 41):
  ```tsx
  // BEFORE
  <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">

  // AFTER
  <div className="fp-glass w-full max-w-lg p-8">
  ```
- [ ] 3.4 Replace step counter text (line 45):
  ```tsx
  // BEFORE
  <span className="text-sm font-medium text-gray-500">

  // AFTER
  <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>
  ```
- [ ] 3.5 Replace Skip button (lines 49–57):
  ```tsx
  // BEFORE
  <button … className="text-sm text-gray-400 hover:text-gray-600 underline" aria-label="Skip onboarding">

  // AFTER
  <button … className="text-sm underline" style={{ color: '#94a3b8' }} aria-label="Skip onboarding">
  ```
  (No `fp-btn-ghost` here — the Skip is an inline text link, not a contained button. Underline +
  muted color is the canonical pattern for destructive-skip actions.)
- [ ] 3.6 Replace the progress bar track (lines 61–73):
  ```tsx
  // BEFORE
  <div
    role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Onboarding progress"
    className="w-full bg-gray-200 rounded-full h-2"
  >
    <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
  </div>

  // AFTER
  <div
    role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Onboarding progress"
    className="fp-prog-track w-full"
  >
    <div
      className="fp-prog-fill"
      style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #7c3aed, #8b5cf6)' }}
    />
  </div>
  ```
  `fp-prog-track` provides `height: 6px`, `border-radius: 9999px`, `background: rgba(255,255,255,0.06)`.
  `fp-prog-fill` provides `height: 100%`, `border-radius: 9999px`, `transition`. The inline purple
  gradient matches the design system accent color.
- [ ] 3.7 Replace title `<h1>` (line 77):
  ```tsx
  // BEFORE
  <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>

  // AFTER
  <h1 className="text-2xl font-bold mb-6" style={{ color: '#e2e8f0' }}>{title}</h1>
  ```
- [ ] 3.8 Replace Back button (lines 85–91):
  ```tsx
  // BEFORE
  <button … className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
    ← Back
  </button>

  // AFTER
  <button … className="fp-btn-ghost text-sm">
    ← Back
  </button>
  ```
- [ ] 3.9 Replace Next button (lines 97–104):
  ```tsx
  // BEFORE
  <button … className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
    {nextLabel}
  </button>

  // AFTER
  <button … className="fp-btn-primary text-sm">
    {nextLabel}
  </button>
  ```
  `fp-btn-primary:disabled` already applies `opacity: 0.45; cursor: not-allowed` — no manual
  `disabled:opacity-50 disabled:cursor-not-allowed` needed.
  **Critical:** the `disabled={nextDisabled}` prop MUST remain on the `<button>` element — only the
  `className` changes. Do not remove the prop while cleaning up the old class string.
- [ ] 3.10 Verify: `rg "(blue|gray|white|indigo)-[0-9]" src/components/Onboarding/WizardLayout.tsx`
  returns zero matches.

### Task 4: Rebuild `StepWelcome.tsx` (AC #2, AC #4)

- [ ] 4.1 Update file header (canonical, version 1.1).
- [ ] 4.2 Replace welcome heading (line 16):
  ```tsx
  // BEFORE  <h2 className="text-xl font-semibold text-gray-800 mb-2">
  // AFTER   <h2 className="text-xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>
  ```
- [ ] 4.3 Replace body copy paragraph (line 19):
  ```tsx
  // BEFORE  <p className="text-gray-600">
  // AFTER   <p style={{ color: '#94a3b8' }}>
  ```
- [ ] 4.4 Replace all three feature mini-cards (lines 24–37). Each card was `bg-blue-50`, `bg-green-50`,
  `bg-purple-50`. All become `fp-glass-sm`:
  ```tsx
  // BEFORE  <div className="p-4 bg-blue-50 rounded-xl">
  // AFTER   <div className="fp-glass-sm p-4 rounded-xl">

  // BEFORE  <div className="p-4 bg-green-50 rounded-xl">
  // AFTER   <div className="fp-glass-sm p-4 rounded-xl">

  // BEFORE  <div className="p-4 bg-purple-50 rounded-xl">
  // AFTER   <div className="fp-glass-sm p-4 rounded-xl">
  ```
- [ ] 4.5 Replace card body copy (line 27, 31, 35):
  ```tsx
  // BEFORE  <p className="text-xs font-medium text-gray-700">…</p>
  // AFTER   <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>…</p>
  ```

### Task 5: Rebuild `StepMarketplaces.tsx` (AC #2, AC #4, AC #5)

**Pattern for all selection card components:** The canonical selected/unselected state uses
`className` for layout + `style` for palette-dependent overrides. This avoids Tailwind palette
class pollution while keeping the hover transition.

- [ ] 5.1 Update file header (canonical, version 1.1).
- [ ] 5.2 Replace description paragraph (line 35):
  ```tsx
  // BEFORE  <p className="text-gray-600 text-sm">
  // AFTER   <p className="text-sm" style={{ color: '#94a3b8' }}>
  ```
- [ ] 5.3 Replace the selection `<label>` pattern (lines 40–58). The conditional className becomes:
  ```tsx
  <label
    key={id}
    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors fp-glass-sm"
    style={
      isSelected
        ? { border: '2px solid rgba(109,40,217,0.5)', background: 'rgba(109,40,217,0.1)' }
        : { border: '2px solid rgba(255,255,255,0.06)' }
    }
  >
  ```
  The `fp-glass-sm` class provides `backdrop-filter: blur(16px)` + canonical glass bg. The inline
  `style` provides both the border (overriding `fp-glass-sm`'s 1px border via inline specificity) and
  the selection affordance. **Do NOT add `border-2`** to className — the inline `style.border`
  shorthand already sets width+style+color, making `border-2` dead code that invites confusion.
  Remove the old ternary className string entirely.
- [ ] 5.4 Replace label text (line 56):
  ```tsx
  // BEFORE  <span className="font-medium text-gray-800">{label}</span>
  // AFTER   <span className="font-medium" style={{ color: '#e2e8f0' }}>{label}</span>
  ```
- [ ] 5.5 Replace checkmark (line 57):
  ```tsx
  // BEFORE  {isSelected && <span className="ml-auto text-blue-500">✓</span>}
  // AFTER   {isSelected && <span className="ml-auto" style={{ color: '#8b5cf6' }}>✓</span>}
  ```
- [ ] 5.6 Replace warning text (lines 62–64):
  ```tsx
  // BEFORE  <p className="text-sm text-amber-600">Select at least one marketplace to continue.</p>
  // AFTER   <p className="text-sm" style={{ color: '#fbbf24' }}>Select at least one marketplace to continue.</p>
  ```
  (`#fbbf24` = `--fp-yellow` CSS var; inline hex bypasses the Tailwind palette grep ban.)
- [ ] 5.7 Verify: `rg "(blue|gray|white|amber|green)-[0-9]" src/components/Onboarding/StepMarketplaces.tsx`
  returns zero matches.

### Task 6: Rebuild `StepCategories.tsx` (AC #2, AC #4, AC #5)

- [ ] 6.1 Update file header (canonical, version 1.1).
- [ ] 6.2 Replace description paragraph:
  ```tsx
  // BEFORE  <p className="text-gray-600 text-sm">
  // AFTER   <p className="text-sm" style={{ color: '#94a3b8' }}>
  ```
- [ ] 6.3 Replace the grid `<label>` selection pattern (same pattern as Task 5.3 — no `border-2` in className):
  ```tsx
  <label
    key={id}
    className="flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-colors fp-glass-sm"
    style={
      isSelected
        ? { border: '2px solid rgba(109,40,217,0.5)', background: 'rgba(109,40,217,0.1)' }
        : { border: '2px solid rgba(255,255,255,0.06)' }
    }
  >
  ```
- [ ] 6.4 Replace label text:
  ```tsx
  // BEFORE  <span className="text-sm font-medium text-gray-800">{label}</span>
  // AFTER   <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{label}</span>
  ```
- [ ] 6.5 Replace checkmark:
  ```tsx
  // BEFORE  {isSelected && <span className="ml-auto text-blue-500 text-xs">✓</span>}
  // AFTER   {isSelected && <span className="ml-auto text-xs" style={{ color: '#8b5cf6' }}>✓</span>}
  ```

### Task 7: Rebuild `StepBudget.tsx` (AC #2, AC #5)

- [ ] 7.1 Update file header (canonical, version 1.1).
- [ ] 7.2 Replace description paragraph:
  ```tsx
  // BEFORE  <p className="text-gray-600 text-sm">
  // AFTER   <p className="text-sm" style={{ color: '#94a3b8' }}>
  ```
- [ ] 7.3 Replace the radio `<label>` selection pattern (same pattern as Task 5.3 — no `border-2` in className):
  ```tsx
  <label
    key={id}
    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors fp-glass-sm"
    style={
      isSelected
        ? { border: '2px solid rgba(109,40,217,0.5)', background: 'rgba(109,40,217,0.1)' }
        : { border: '2px solid rgba(255,255,255,0.06)' }
    }
  >
  ```
- [ ] 7.4 Replace the radio dot visual indicator (lines 52–55):
  ```tsx
  // BEFORE
  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`} />

  // AFTER
  <div
    className="w-4 h-4 rounded-full border-2 flex-shrink-0"
    style={
      isSelected
        ? { borderColor: '#7c3aed', background: '#7c3aed' }
        : { borderColor: 'rgba(255,255,255,0.15)', background: 'transparent' }
    }
  />
  ```
- [ ] 7.5 Replace label text:
  ```tsx
  // BEFORE  <span className="font-medium text-gray-800">{label}</span>
  // AFTER   <span className="font-medium" style={{ color: '#e2e8f0' }}>{label}</span>
  ```

### Task 8: Rebuild `StepLocation.tsx` (AC #3, AC #5)

- [ ] 8.1 Update file header (canonical, version 1.1).
- [ ] 8.2 Replace description:
  ```tsx
  // BEFORE  <p className="text-gray-600 text-sm">
  // AFTER   <p className="text-sm" style={{ color: '#94a3b8' }}>
  ```
- [ ] 8.3 Replace ZIP label (line 29):
  ```tsx
  // BEFORE  <label htmlFor="zip-code" className="block text-sm font-medium text-gray-700 mb-1">
  // AFTER   <label htmlFor="zip-code" className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
  ```
- [ ] 8.4 Replace ZIP input (lines 34–44):
  ```tsx
  // BEFORE
  <input … className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="ZIP code" />

  // AFTER
  <input … className="fp-input" aria-label="ZIP code" />
  ```
  (`fp-input` provides `width: 100%`, `padding`, `border`, `border-radius: 8px`,
  `background: rgba(255,255,255,0.04)`, `color: #e2e8f0`, `placeholder: #475569`, and the purple
  focus ring via `.fp-input:focus`.)
- [ ] 8.5 Replace radius label (line 49):
  ```tsx
  // BEFORE  <label className="block text-sm font-medium text-gray-700 mb-2">
  // AFTER   <label className="block text-sm font-medium mb-2" style={{ color: '#94a3b8' }}>
  ```
- [ ] 8.6 Replace radius chip buttons (lines 53–66). Remove the ternary className; use `fp-glass-sm`
  base with inline style overrides:
  ```tsx
  <button
    key={r}
    type="button"
    onClick={() => onRadiusChange(r)}
    className="px-3 py-1.5 text-sm rounded-lg fp-glass-sm transition-colors"
    style={
      radius === r
        ? { border: '2px solid rgba(109,40,217,0.5)', background: 'rgba(109,40,217,0.1)', color: '#e2e8f0', fontWeight: 500 }
        : { border: '2px solid rgba(255,255,255,0.06)', color: '#94a3b8' }
    }
    aria-pressed={radius === r}
  >
    {r} mi
  </button>
  ```
- [ ] 8.7 Replace hint text (line 71):
  ```tsx
  // BEFORE  <p className="text-xs text-gray-400">
  // AFTER   <p className="text-xs" style={{ color: '#475569' }}>
  ```

### Task 9: Rebuild `StepComplete.tsx` (AC #1, AC #5)

- [ ] 9.1 Update file header (canonical, version 1.1).
- [ ] 9.2 Replace "You're all set!" heading (line 22):
  ```tsx
  // BEFORE  <h2 className="text-xl font-bold text-gray-900 mb-2">
  // AFTER   <h2 className="text-xl font-bold mb-2" style={{ color: '#e2e8f0' }}>
  ```
- [ ] 9.3 Replace body copy (line 23):
  ```tsx
  // BEFORE  <p className="text-gray-600">
  // AFTER   <p style={{ color: '#94a3b8' }}>
  ```
- [ ] 9.4 Replace "Go to Dashboard" button (lines 29–35):
  ```tsx
  // BEFORE
  <button … className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">

  // AFTER
  <button … className="fp-btn-primary w-full py-3 px-6 font-semibold">
  ```
- [ ] 9.5 Replace settings link (lines 36–40):
  ```tsx
  // BEFORE  <Link href="/settings" className="block text-sm text-gray-500 hover:text-gray-700 underline">
  // AFTER   <Link href="/settings" className="block text-sm underline transition-colors" style={{ color: '#475569' }}>
  ```
  > Hover state: the original used `hover:text-gray-700` (Tailwind). We cannot use that (banned
  > palette class). Instead, rely on the browser's native `:hover` link underline affordance — the
  > underline + tertiary color is sufficient for a de-emphasized secondary link. If the code-reviewer
  > requests a hover state, add `onMouseEnter={() => e.currentTarget.style.color = '#e2e8f0'}
  > onMouseLeave={() => e.currentTarget.style.color = '#475569'}` — but defer this unless flagged;
  > `transition-colors` is retained so any future CSS-class hover override animates correctly.

### Task 10: Post-edit verification (AC #5)

- [ ] 10.1 Run the AC #5 greps and confirm **zero matches**:
  ```bash
  rg "(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|pink|rose|emerald|amber|yellow|red|orange|gray)-[0-9]" src/components/Onboarding
  rg "bg-(white|gray-[0-9])" src/components/Onboarding
  rg "border-gray-[0-9]" src/components/Onboarding
  rg "(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|pink|rose|emerald|amber|yellow|red|orange|gray)-[0-9]" app/onboarding
  rg "bg-(white|gray-[0-9])" app/onboarding
  ```
  The `gray` extension catches `text-gray-*` and `border-gray-*` that the original epics.md AC
  greps would miss. Capture zero-match output into Dev Agent Record for reviewer sign-off.
- [ ] 10.2 Run `make lint` — zero ESLint errors.
- [ ] 10.3 Run `make build` — strict TypeScript, zero errors.
- [ ] 10.4 Run `make test` — all Jest tests green, coverage thresholds met.

### Task 11: Write acceptance tests (AC #1–#7)

> **Scenario-number reservation** (before appending any scenarios):
> 1. `grep -o '@E-014-S-[0-9]*' test/acceptance/features/E-014-frontend-design-migration.feature | sort -t- -k4 -n | tail -1`
>    → confirm max is S-28
> 2. Add `# Story 14.5 reserves @E-014-S-29..@E-014-S-35 — appended 2026-04-17` comment to feature file
> 3. Then append scenarios below.

- [ ] 11.0 **E2E fixture prerequisite** — Scenario S-35 (full 6-step flow) requires a test user
  whose `onboardingComplete` is `false` in the database. If the shared E2E test account has already
  completed onboarding, `app/onboarding/page.tsx:68–71` redirects immediately to `/` and the scenario
  fails spuriously. Before writing the test, confirm one of:
  (a) a dedicated "fresh user" test fixture exists (email pattern `e2e-onboarding-*@test.flipper`
  or similar, created via `/api/auth/register` in the test's `Before` hook and deleted in `After`);
  (b) or the step `the user navigates to "/onboarding"` performs a `PATCH /api/user/onboarding` reset
  call first (sets `onboardingComplete: false`, `onboardingStep: 1`) if the reset endpoint exists;
  (c) or document this as a known limitation and mark S-35 with `@manual` if no programmatic reset
  is available. Resolve during implementation; do not ship a flaky test.
- [ ] 11.1 Write Gherkin scenarios in
  `test/acceptance/features/E-014-frontend-design-migration.feature` (append after Story 14.3):

  ```gherkin
  # ── Story 14.5: Onboarding Wizard Dark Migration ──────────────────────────────
  # Story 14.5 reserves @E-014-S-29..@E-014-S-35 — appended 2026-04-17

  @E-014-S-29 @FR-UI-DESIGN-02 @story-14-5
  Scenario: WizardLayout card uses fp-glass and no light-mode background
    Given a test user is authenticated
    When the user navigates to "/onboarding"
    Then the page wrapper has no class matching "bg-gradient-to-br" or "bg-blue" or "bg-white" or "bg-indigo"
    And an element with class "fp-glass" is visible within the onboarding card

  @E-014-S-30 @FR-UI-DESIGN-02 @story-14-5
  Scenario: Progress bar uses fp-prog-track and fp-prog-fill with purple gradient
    Given a test user is authenticated
    When the user navigates to "/onboarding"
    Then the progress bar container has class "fp-prog-track"
    And the progress fill element has class "fp-prog-fill"
    And the progress fill computed background includes rgb(124, 58, 237)

  @E-014-S-31 @FR-UI-DESIGN-02 @story-14-5
  Scenario: Navigation buttons use fp-btn-primary and fp-btn-ghost
    Given a test user is authenticated
    When the user navigates to "/onboarding"
    Then the Continue button has class "fp-btn-primary"
    When the user advances to step 2
    Then the Back button has class "fp-btn-ghost"

  @E-014-S-32 @FR-UI-DESIGN-02 @FR-UI-DESIGN-04 @story-14-5
  Scenario: Selection cards use fp-glass-sm with purple accent and no blue or green
    Given a test user is authenticated
    When the user navigates to "/onboarding" and advances to the Marketplaces step
    And the user selects the "eBay" marketplace card
    Then the eBay card has a border color containing rgba(109,40,217
    And the eBay card has a background color containing rgba(109,40,217
    And no selection card has a class containing "blue" or "green"

  @E-014-S-33 @FR-UI-DESIGN-02 @story-14-5
  Scenario: ZIP input uses fp-input class with purple focus ring
    Given a test user is authenticated
    When the user navigates to "/onboarding" and advances to the Location step
    Then the ZIP input has class "fp-input"
    When the user focuses the ZIP input
    Then the ZIP input has a box-shadow containing rgba(109,40,217

  @E-014-S-34 @FR-UI-DESIGN-02 @story-14-5
  Scenario: Zero palette matches in Onboarding components
    Given the file "src/components/Onboarding/WizardLayout.tsx" exists
    When searching for raw Tailwind palette classes "(blue|cyan|teal|sky|indigo|pink|rose|emerald|amber|yellow|red|orange|gray)-[0-9]" in "src/components/Onboarding"
    Then the match count is 0
    When searching for "bg-(white|gray-[0-9])" in "src/components/Onboarding"
    Then the match count is 0
    When searching for "border-gray-[0-9]" in "src/components/Onboarding"
    Then the match count is 0

  @E-014-S-35 @FR-UI-DESIGN-02 @story-14-5
  Scenario: Full 6-step onboarding wizard completes and lands on dashboard
    Given a test user is authenticated and has not completed onboarding
    When the user navigates to "/onboarding"
    And the user completes step 1 by clicking "Continue"
    And the user selects at least one marketplace and clicks "Continue"
    And the user selects at least one category and clicks "Continue"
    And the user selects a budget range and clicks "Continue"
    And the user enters a valid ZIP code and clicks "Continue"
    And the user clicks "Go to Dashboard" on step 6
    Then the browser navigates to "/"
    And no step during the journey had a class "bg-gradient-to-br" on the outermost wrapper
  ```

- [ ] 11.2 Write step definitions in
  `test/acceptance/step_definitions/E-014-frontend-design-migration.steps.ts`
  (extend the existing file). Implement:
  - `the page wrapper has no class matching {string}` — query `document.querySelector('.min-h-screen')`, assert classList excludes the given strings (comma-split, check each).
  - `an element with class {string} is visible` — `page.locator('.fp-glass').first().isVisible()`.
  - `the progress bar container has class {string}` — `page.locator('[role="progressbar"]').getAttribute('class')`.
  - `the progress fill computed background includes {string}` — `page.evaluate()` to get `getComputedStyle` of the fill element.
  - `the Continue button has class {string}` — `page.locator('button:has-text("Continue")').getAttribute('class')`.
  - `the Back button has class {string}` — `page.locator('button:has-text("← Back")').getAttribute('class')`.
  - `the user advances to step 2` — `page.click('button:has-text("Continue")')`.
  - `the user navigates to "/onboarding" and advances to the Marketplaces step` — navigate + click Continue once.
  - `the user selects the {string} marketplace card` — `page.click(\`label:has-text("${name}")\`)`.
  - `the eBay card has a border color containing {string}` — `page.evaluate` on the label's `style.border`.
  - `no selection card has a class containing {string}` — assert `page.locator('[class*="blue"],[class*="green"]')` within `.space-y-3` = 0.
  - `the user navigates to "/onboarding" and advances to the Location step` — navigate + Continue ×3.
  - `the ZIP input has class {string}` — `page.locator('#zip-code').getAttribute('class')`.
  - `the ZIP input has a box-shadow containing {string}` — `page.evaluate(() => getComputedStyle(document.querySelector('#zip-code')).boxShadow)`.
  - Grep-based steps: `searching for … in …` uses `countMatches(pattern, dir)` helper (established by Story 14.2 — reuse the existing helper from the step-definitions file).
  - Full wizard flow steps: sequential `page.click` + `page.fill` calls.
- [ ] 11.3 Run `make test-ac STORY=14.5` — all 7 scenarios pass green, zero skipped.
- [ ] 11.4 Run `make test-ac FEATURE=F14` — all Epic 14 stories pass, no regressions.

### Task 12: RTM update and story finalization

- [ ] 12.1 Update `_bmad-output/test-artifacts/requirements-traceability-matrix.md`:
  - Add rows for FR-UI-DESIGN-02 (Story 14.5 row) and FR-UI-DESIGN-04 (Story 14.5 row).
  - Map: FR → AC → `E-014-frontend-design-migration.feature` → scenario tags `@E-014-S-29` through
    `@E-014-S-35` → step definition file `E-014-frontend-design-migration.steps.ts`.
- [ ] 12.2 Update `File List` table below with all new/modified/deleted files.
- [ ] 12.3 Set story `Status: review` in this file's frontmatter.
- [ ] 12.4 Update `sprint-status.yaml`: set `14-5-onboarding-wizard-dark-migration: review`.
- [ ] 12.5 Move Trello card `[14.5]` to the **Done** list (trello-axovia, board SvVRLeS5).

## Dev Notes

### Architecture Context

This is a **visual-only rebuild**. The business-logic layer (API calls, router navigation, state
management) must not change. The blast radius is exactly 8 files:

| File | Change Type |
|------|-------------|
| `app/onboarding/page.tsx` | Visual (loading screen only) |
| `src/components/Onboarding/WizardLayout.tsx` | Full visual rebuild |
| `src/components/Onboarding/StepWelcome.tsx` | Palette + card classes |
| `src/components/Onboarding/StepMarketplaces.tsx` | Palette + selection state |
| `src/components/Onboarding/StepCategories.tsx` | Palette + selection state |
| `src/components/Onboarding/StepBudget.tsx` | Palette + selection state + radio dot |
| `src/components/Onboarding/StepLocation.tsx` | Input class + radius chips |
| `src/components/Onboarding/StepComplete.tsx` | Button + text palette |

### Design System Reference (globals.css)

All canonical classes used in this story are confirmed present in `app/globals.css`:

| Class | Line | Notes |
|-------|------|-------|
| `.fp-glass` | ~209 | `background: rgba(255,255,255,0.04)`, `backdrop-filter: blur(24px)`, `border: 1px solid rgba(255,255,255,0.09)`, `border-radius: 16px` |
| `.fp-glass-sm` | ~224 | Same but `backdrop-filter: blur(16px)`, `border-radius: 12px` |
| `.fp-btn-primary` | ~276 | Purple gradient, white text, `border-radius: 10px`. `disabled` → `opacity: 0.45; cursor: not-allowed` |
| `.fp-btn-ghost` | ~293 | Muted glass background, `color: #94a3b8`, subtle border |
| `.fp-input` | ~303 | Dark glass input, `color: #e2e8f0`, purple focus ring (`border-color: rgba(109,40,217,0.5)`, `background: rgba(109,40,217,0.06)`) |
| `.fp-prog-track` | ~364 | `height: 6px`, `border-radius: 9999px`, `background: rgba(255,255,255,0.06)` |
| `.fp-prog-fill` | ~365 | `height: 100%`, `border-radius: 9999px`, `transition: width 0.4s cubic-bezier(...)` |

### Selection Card Pattern (shared across 4 step components)

The canonical selected/unselected affordance replaces every `border-blue-500 bg-blue-50` with:
- **Selected**: `style={{ border: '2px solid rgba(109,40,217,0.5)', background: 'rgba(109,40,217,0.1)' }}`
- **Unselected**: `className="fp-glass-sm"` + `style={{ border: '2px solid rgba(255,255,255,0.06)' }}`

This pattern is consistent with the design system's intent: glass surface at rest, purple-tinted
at selected state. The rgba border-color matches `--fp-glow-purple: rgba(109,40,217,0.35)` from `:root`.

### Root Layout Background

`app/layout.tsx` injects `.fp-bg-mesh` + `.fp-bg-grid` + `.fp-content` as fixed-position layers
for every page. The onboarding wizard currently overrides this with its own `bg-gradient-to-br`.
After this story, `WizardLayout`'s outer div becomes transparent (`min-h-screen flex items-center
justify-center p-4`) so the root layout's ambient layers show through correctly.

**Do NOT modify `app/layout.tsx` in this story.** It already provides the correct layers.

### Previous Story Intelligence (Story 14.4 patterns)

Story 14.4 (Landing Page + Auth Pages Rebuild, currently `in-progress`) established these patterns
for this story to follow consistently:

1. **No page-level bg override** — the outer wrapper gets no `bg-*` class; the root layout's
   `.fp-bg-mesh` is the sole ambient background.
2. **Inline hex for body copy** — `style={{ color: '#94a3b8' }}` for secondary, `style={{ color: '#e2e8f0' }}` for primary, `style={{ color: '#475569' }}` for tertiary/placeholder text.
3. **Warning state** — inline `style={{ color: '#fbbf24' }}` for yellow/amber warnings (bypasses Tailwind palette grep ban).
4. **fp-glass-sm for icon containers** — the same pattern Story 14.4 uses for feature-icon circles is used here for step mini-cards.
5. **Selection state via inline style** — Story 14.4 uses inline hex for radius chips; this story applies the same pattern to the radius buttons in `StepLocation` and the selection cards everywhere.

### Testing Architecture

- Jest tests (`src/__tests__/`): No new Jest tests required. This is a pure visual rebuild with no
  extracted business-logic helpers. If a shared `<SelectionCard>` component is extracted
  (not required by this story), add a Jest test for it then. Coverage thresholds unchanged.
- Acceptance tests: 7 Playwright E2E scenarios in the existing
  `test/acceptance/features/E-014-frontend-design-migration.feature`. Step definitions extend the
  existing `test/acceptance/step_definitions/E-014-frontend-design-migration.steps.ts`.
- The `countMatches(pattern, dir)` grep helper from Story 14.2's step-definitions file is reused
  for the zero-palette-match scenario (S-34).

### File Header Convention (CLAUDE.md mandatory)

Every file touched in this story must have a canonical TypeScript header:
```tsx
/**
 * @file <relative/path/from/root.tsx>
 * @author Stephen Boyett
 * @company Axovia AI
 * @date <original creation date — do NOT change>
 * @version 1.1
 * @brief <one-line description including "dark-migrated in Story 14.5">
 *
 * @description
 * <Original description, updated to note canonical .fp-* design as of Story 14.5.>
 */
```
The original files use an informal `/** WizardLayout — … Author: ASPEN … */` style. Replace with
the canonical format but preserve the original creation date (unknown → use `2026-04-17` as the
story date; if the dev finds an earlier date in git log, use that instead).

### Project Structure Notes

- Path alias: `@/components/Onboarding/WizardLayout` → `src/components/Onboarding/WizardLayout.tsx`
- Onboarding page: `app/onboarding/page.tsx` (App Router page, `'use client'`)
- No new files are expected. All changes are in-place edits to existing files.
- The acceptance feature file already exists at `test/acceptance/features/E-014-frontend-design-migration.feature` — append to it, do NOT create a new file.

### References

- Canonical design classes: `app/globals.css:209–366` — `.fp-glass`, `.fp-glass-sm`, `.fp-btn-primary`, `.fp-btn-ghost`, `.fp-input`, `.fp-prog-track`, `.fp-prog-fill`
- Story 14.1 (foundation): `_bmad-output/implementation-artifacts/epic-14/14-1-design-tokens-base-style-unification.md`
- Story 14.2 (theme removal): `_bmad-output/implementation-artifacts/epic-14/14-2-remove-competing-multi-theme-system.md` — grep helper in its step-definitions file
- Story 14.4 (landing + auth rebuild — in-progress): `_bmad-output/implementation-artifacts/epic-14/14-4-landing-page-auth-pages-rebuild.md` — established patterns this story follows
- Epic source: `_bmad-output/planning-artifacts/epics.md:2926–2961`
- Design audit: `docs/frontend-design-gaps.md` (audit date 2026-04-17)
- FR-UI-DESIGN-02: `_bmad-output/planning-artifacts/PRD.md` (`.fp-*` canonical utility classes on every page/component)
- FR-UI-DESIGN-04: green reserved for profit/financial indicators only

## Definition of Done

> Full gate definition: `_bmad-output/project-context.md` → _Story Definition of Done_

- [ ] All tasks/subtasks `[x]`; every AC satisfied; no `any` in production code
- [ ] `make lint` passes — zero ESLint errors
- [ ] `make build` passes — strict TypeScript, zero errors
- [ ] `make test` passes — all Jest unit tests green, zero regressions; coverage ≥96% branches, ≥98% functions, ≥99% lines/statements
- [ ] No new Jest unit tests required (pure visual rebuild, no extracted logic) — existing coverage unaffected
- [ ] Every AC has a test at the correct level: all 6 behavior ACs are UI-visible → Playwright E2E scenarios; AC #5 (grep) → grep-based scenario using `countMatches` helper; AC #7 (quality gates) → shell exit-code checks
- [ ] `make test-ac STORY=14.5` passes green — zero failures, zero skipped scenarios
- [ ] `make test-ac FEATURE=F14` passes green — no regressions on Stories 14.1–14.3
- [ ] 7 acceptance scenarios in `test/acceptance/features/E-014-frontend-design-migration.feature`, each triple-tagged `@FR-UI-DESIGN-<NN>` `@story-14-5` `@E-014-S-<N>` (S-29 through S-35)
- [ ] RTM updated (`_bmad-output/test-artifacts/requirements-traceability-matrix.md`)
- [ ] Story `Status` → `review`; `sprint-status.yaml` → `review`
- [ ] `File List` table updated with every modified file
- [ ] Trello card `[14.5]` moved to Done (trello-axovia, board SvVRLeS5). F-014 Feature-card checklist item marked complete.
- [ ] Manual visual sanity check at 360px, 768px, 1280px — wizard card reflows, no horizontal scroll, progress bar visible at all breakpoints

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Pre-edit baseline captured in Task 1.2 (see grep output section when dev runs story)
- Post-edit zero-match confirmation captured in Task 10.1 for reviewer sign-off
- Scenario-number reservation comment added before appending scenarios (Task 11.1 protocol)

### File List

| File | Change | Notes |
|------|--------|-------|
| `app/onboarding/page.tsx` | Modified | Loading screen: remove light-mode bg gradient; update header to canonical format |
| `src/components/Onboarding/WizardLayout.tsx` | Modified | Full dark migration: glass card, fp-prog-track/fill, fp-btn-primary/ghost |
| `src/components/Onboarding/StepWelcome.tsx` | Modified | fp-glass-sm mini-cards; canonical text colors |
| `src/components/Onboarding/StepMarketplaces.tsx` | Modified | Glass selection cards; purple checkmark; inline warning yellow |
| `src/components/Onboarding/StepCategories.tsx` | Modified | Glass selection cards; purple checkmark |
| `src/components/Onboarding/StepBudget.tsx` | Modified | Glass selection cards; purple radio dot |
| `src/components/Onboarding/StepLocation.tsx` | Modified | fp-input on ZIP; glass radius chips; canonical labels |
| `src/components/Onboarding/StepComplete.tsx` | Modified | fp-btn-primary CTA; canonical text colors |
| `test/acceptance/features/E-014-frontend-design-migration.feature` | Modified | Append 7 scenarios @E-014-S-29 through @E-014-S-35 |
| `test/acceptance/step_definitions/E-014-frontend-design-migration.steps.ts` | Modified | Extend with step definitions for new scenarios |
| `_bmad-output/test-artifacts/requirements-traceability-matrix.md` | Modified | Add FR-UI-DESIGN-02 + FR-UI-DESIGN-04 rows for Story 14.5 |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | Modified | `14-5-onboarding-wizard-dark-migration: review` |
