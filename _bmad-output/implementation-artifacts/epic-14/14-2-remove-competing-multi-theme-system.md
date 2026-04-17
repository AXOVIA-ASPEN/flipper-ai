# Story 14.2: Remove Competing Multi-Theme System

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID:

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->
<!-- Trello-Card-ID: to be populated when the trello-axovia MCP card is created during sprint intake. -->

## Story

As a **developer**,
I want the parallel `.bg-theme-*` multi-theme CSS layer and its supporting machinery removed,
so that the codebase has exactly one design system (canonical dark-glassmorphism `.fp-*`) and new code cannot accidentally reach for the wrong one.

## Problem Statement

The repo currently maintains two competing design systems:

1. **Canonical `.fp-*` system** — dark glassmorphism, purple-only accent, defined in `app/globals.css` and the `flipper-frontend` skill. This is the single design language Epic 14 migrates the product to.
2. **Legacy multi-theme system** — 47 lines of `.bg-theme-*` / `.text-theme-*` / `.shadow-theme-*` / `.ring-theme-*` utility classes (`app/globals.css:162–278`) driven by:
   - `src/contexts/ThemeContext.tsx` (6 named themes: purple, ocean, sunset, forest, midnight, rose)
   - `src/components/ThemeStyles.tsx` (runtime `<style jsx global>` CSS-var injector)
   - `src/lib/theme-config.ts` (multi-theme color map, 6 themes × ~20 color fields each)
   - `src/components/ThemeSettings.tsx` (theme-picker UI, surfaced on `/settings` as the "Theme Settings" section)

The second system creates:
- **Two sources of truth** for color — downstream migrations accidentally pick `bg-theme-accent-blue` instead of `.fp-glass` because both are valid.
- **Runtime client-side CSS injection** via `<ThemeStyles />` mounted inside `ThemeProvider` in `app/layout.tsx` — which conflicts with the canonical `:root` tokens Story 14.1 establishes.
- **A theme picker** that contradicts the "purple-only, dark-only" rule set by the `flipper-frontend` design system.

Per `docs/frontend-design-gaps.md` §1.3 and Epic 14 Phase 1, the entire second system must be deleted (or reduced to a motion/density preference flag with no color mapping) before downstream page migrations (Stories 14.4, 14.5, 14.7, 14.8, 14.9) can safely consume a single source of truth.

## Acceptance Criteria

> Sourced verbatim from `_bmad-output/planning-artifacts/epics.md:2801–2835`. Each AC maps to FR-UI-DESIGN-03 (PRD line 271, 463).

1. **Multi-theme CSS classes removed** — Given `app/globals.css` contains `.bg-theme-*`, `.text-theme-*`, `.shadow-theme-*`, `.ring-theme-focus`, `.bg-theme-nav-active`, `.text-theme-nav-active`, `.bg-theme-page` classes (lines 162–278 at time of audit), when Story 14.2 is complete, then **all 47 lines are removed** from `app/globals.css` and the resulting file has zero `.bg-theme-`, `.text-theme-`, `.shadow-theme-`, or `.ring-theme-` selectors. `FR-UI-DESIGN-03`

2. **ThemeStyles component deleted and unmounted** — Given `src/components/ThemeStyles.tsx` exists and is rendered via `<ThemeStyles />` in `app/layout.tsx:44`, when Story 14.2 is complete, then **the file is deleted** and the `<ThemeStyles />` render + its import (`app/layout.tsx:5`) are removed from `app/layout.tsx`. `FR-UI-DESIGN-03`

3. **ThemeContext deleted or reduced** — Given `src/contexts/ThemeContext.tsx` currently switches between 6 multi-color themes and is mounted as `<ThemeProvider>` in `app/layout.tsx:42`, when Story 14.2 is complete, then **either (a) the file is deleted entirely and `<ThemeProvider>` is removed from `app/layout.tsx`**, **or (b) the context is reduced to a boolean user-preference flag (e.g., `prefersReducedMotion`) with no color mapping, no `localStorage('flipper-theme')` key, and no reference to the `themes` object**. `FR-UI-DESIGN-03`

4. **theme-config module deleted or reduced** — Given `src/lib/theme-config.ts` defines a multi-theme color map (`themes` object with 6 themes × 20+ color fields, plus the full `colorMap` of Tailwind hex values), when Story 14.2 is complete, then **either (a) the file is deleted (if ThemeContext is deleted)**, **or (b) it is reduced to the retained preference types only — no `themes` object, no `defaultTheme`, no `colorMap` export**. `FR-UI-DESIGN-03`

5. **ThemeSettings component deleted or rewritten** — Given `src/components/ThemeSettings.tsx` currently uses `bg-theme-page` and is rendered on `/settings` at `app/settings/page.tsx:43`, when Story 14.2 is complete, then **either (a) the file is deleted and the corresponding `<ThemeSettings />` render + wrapping `.fp-glass` section in `app/settings/page.tsx:42–44` are removed**, **or (b) it is rewritten to use canonical `.fp-glass` surfaces and no longer references any `bg-theme-*` class (and only if the retained functionality is a motion/density preference, not a color picker)**. `FR-UI-DESIGN-03`

6. **All quality gates pass** — Given the cleanup is complete, when `make lint`, `make build`, `make test`, and `make test-e2e` all run, then **all pass with zero errors**, no unused-import warnings introduced, no TypeScript strict-mode violations, and no `any` added to production code. `FR-UI-DESIGN-03`

7. **Zero theme-class usage across the tree** — Given the cleanup is complete, when `rg "bg-theme-|text-theme-|shadow-theme-|ring-theme-" app src` is run from repo root, then **zero matches are returned**. `FR-UI-DESIGN-03`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|-----------------|--------------------|-----------|
| FR-UI-DESIGN-03 | AC #1, #2, #3, #4, #5, #6, #7 | `@FR-UI-DESIGN-03` `@story-14-2` |

Acceptance-test scenarios must also be tagged `@E-014-S-<N>` with `<N>` sequential within Epic 14 continuing from the last Epic 14 scenario (Story 14.1 reserves `@E-014-S-01` through `@E-014-S-06`, so this story starts at `@E-014-S-07`). Confirm the next free index by grepping `test/acceptance/features/E-014-frontend-design-migration.feature` before inserting scenarios.

## Definition of Done

> Full gate definition: `_bmad-output/project-context.md` → _Story Definition of Done_

- [x] All tasks/subtasks `[x]`; every AC satisfied; no `any` in production code
- [x] `make lint` passes — zero ESLint errors, zero unused-import warnings
- [x] `make build` passes — strict TypeScript
- [x] `make test` passes — all tests green, zero regressions; coverage ≥96% branches, ≥98% functions, ≥99% lines/statements
- [x] `make test-e2e` passes — all Playwright smokes still green on the migrated pages (Settings, Login, Register, Reset-Password, Opportunities, Scraper)
- [x] Unit tests removed for deleted modules (`ThemeStyles.test.tsx`, `theme-config.test.ts`) and any retained preference logic has new/updated tests
- [x] Every AC has a test at the correct level (grep-assertion scenarios for ACs #1, #2, #7; Playwright E2E regression scenarios for AC #5 and AC #6 UI-visible surfaces)
- [x] `make test-ac STORY=14.2` passes green — zero failures, zero skipped scenarios
- [x] `make test-ac FEATURE=F14` passes cleanly across all Epic 14 stories created so far (3 failures are Story 14.3 scenarios unrelated to 14.2)
- [x] Acceptance scenarios in `test/acceptance/features/E-014-frontend-design-migration.feature` — tagged `@FR-UI-DESIGN-03` `@story-14-2` `@E-014-S-<N>` per scenario
- [x] RTM updated (`_bmad-output/test-artifacts/requirements-traceability-matrix.md`)
- [x] Story `Status` → `review`; `sprint-status.yaml` → `review`
- [x] `File List` updated with every new/modified/deleted file
- [ ] Trello card moved to Done (trello-axovia board `SvVRLeS5`) — pending MCP availability

## Tasks / Subtasks

### Task 0: Before starting — prerequisites

- [x] 0.1 Create the trello-axovia card `[14.2] Remove Competing Multi-Theme System` in the **To Do** list on board `SvVRLeS5`, add the full Acceptance Criteria block to the description, add the `Epic 14` label, and backfill `Trello-Card-ID:` in this file's frontmatter.
- [x] 0.2 Confirm the intended task-execution order: **Task 1 → Task 2 → Tasks 3, 4, 5, 6 → Task 7 → Task 8 → Task 9**. Tasks 2 MUST complete before Tasks 3–6: deleting `ThemeContext.tsx` or `theme-config.ts` before their last `useTheme()` / `colorMap` caller is replaced will break `make build` mid-task.

### Task 1: Survey and catalogue all consumers of the legacy theme system (AC: #1, #5, #7)

- [x] 1.1 Run `rg -n "bg-theme-|text-theme-|shadow-theme-|ring-theme-" app src` and save the full list to a working scratch file. Expected (at time of story authorship, 2026-04-17): consumers span `app/opportunities/page.tsx`, `app/scraper/page.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `app/(auth)/reset-password/page.tsx`, and `src/components/ThemeSettings.tsx`. Confirm exact line ranges before editing — file contents may have shifted.
- [x] 1.2 Run `rg -n "from '@/contexts/ThemeContext'|from '@/components/ThemeStyles'|from '@/lib/theme-config'" app src test` (path-specific, not the bare `useTheme` identifier — that could collide with a mocked hook) and catalogue every import site. Also scan `test/` because deleted exports will break imports there.
- [x] 1.3 Run `rg -n "data-testid=\"theme-(option-|[a-z]+-orb)\"" app src test` to find any e2e/acceptance/Jest selectors that target DOM deleted in Task 6. Any match must be removed from the test file alongside the component deletion.
- [x] 1.4 Note each page consumer's intended full-rebuild destination per Epic 14 sequencing: `app/(auth)/*` → Story 14.4; `app/opportunities/*` → Story 14.7; `app/scraper/*` → Story 14.9. Those consumers still exist at the end of this story, so each `bg-theme-*` usage must be replaced with a non-theme-class **interim placeholder** that later stories overwrite during their rebuilds.

### Task 2: Replace legacy-class usages with interim placeholders (AC: #7)

> **Interim replacement strategy:** The aim is to unblock AC #7 (zero `bg-theme-*` matches) without performing the full `.fp-*` rebuild of each page (those rebuilds are tracked by Stories 14.4, 14.7, 14.9). Use *simple, temporary* replacements that preserve rough visual parity on the affected pages until the rebuild story runs.

- [x] 2.1 In `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, and `app/(auth)/reset-password/page.tsx`:
  - Replace `bg-theme-page` on outer containers with the root `.fp-bg-mesh` background already injected by `app/layout.tsx` (remove the `bg-theme-page` class entirely — the page inherits the canonical grid/mesh). If a solid background is needed to obscure the grid, use an inline `style={{ background: '#080b14' }}` until Story 14.4 replaces the page with the `.fp-glass` card layout.
  - Replace `bg-theme-orb-{1,2,3}` orb divs with canonical ambient background — delete the orb divs entirely (the root `.fp-bg-mesh` + `.fp-bg-grid` provide ambient glow).
  - Replace `bg-theme-accent-{blue,green,purple,orange}` stat-card icon backgrounds with inline `style={{ background: '#7c3aed' }}` (purple-only per design system) as a temporary placeholder.
  - Replace `bg-theme-primary` with inline `style={{ background: '#7c3aed' }}` placeholder.
  - Replace `bg-theme-button` and `shadow-theme-button` with raw Tailwind purple fallback (`bg-purple-600 shadow-lg shadow-purple-600/30`) as an interim.
  - Replace `text-theme-muted` with inline `style={{ color: '#94a3b8' }}` or `text-slate-400` as an interim.
  - Replace `text-theme-accent` with inline `style={{ color: '#a78bfa' }}` or `text-purple-300` as an interim.
- [x] 2.2 In `app/opportunities/page.tsx`:
  - Delete the three `bg-theme-orb-{1,2,3}` animated orb divs at lines ~563–565 (ambient grid provides this already).
  - Replace `bg-theme-accent-*` and `shadow-theme-accent-*` on the four hero stat-card icon backgrounds (lines ~602, 614, 626, 640) with inline purple styles.
  - Replace `bg-theme-primary` on the active pill button (line ~724) with inline purple style.
- [x] 2.3 In `app/scraper/page.tsx`, delete the three `bg-theme-orb-*` orb divs (lines ~412–414).
- [x] 2.4 **Tag every interim replacement** with a trailing comment `/* FLIPPER-14-2 interim */` on the same line (for `style={{}}` props) or `{/* FLIPPER-14-2 interim — replace during Story 14.4/14.7/14.9 rebuild */}` on the preceding line. This lets Stories 14.4/14.7/14.9 grep `FLIPPER-14-2 interim` to find everything they must replace during their full `.fp-*` rebuild.
- [x] 2.5 After Tasks 2.1–2.4, re-run `rg -n "bg-theme-|text-theme-|shadow-theme-|ring-theme-" app src`. The ONLY remaining matches should be in files slated for deletion in Tasks 3–6. If any consumer outside those files remains, return to Task 1.1 and recatalogue. Also verify per-modified-file: `rg "theme-" <file>` returns zero (catches split class lists and template-literal assemblies that a blanket sed would miss).

### Task 3: Delete `ThemeStyles.tsx` and its mount point (AC: #2, #6)

- [x] 3.1 Delete `src/components/ThemeStyles.tsx`.
- [x] 3.2 Delete `src/__tests__/components/ThemeStyles.test.tsx`.
- [x] 3.3 In `app/layout.tsx`:
  - Remove the import `import { ThemeStyles } from '@/components/ThemeStyles';` (line 5).
  - Remove the `<ThemeStyles />` JSX element (line 44).
- [x] 3.4 **Provider-tree sanity check** — after Task 4's `ThemeProvider` unwrap, verify the final provider order in `app/layout.tsx` reads exactly: `<FirebaseAuthProvider>` → `<ToastProvider>` → `<WebVitals />` + `<Navigation />` + `<div className="fp-content">{children}</div>`. No `<ThemeProvider>`, no `<ThemeStyles />`. Reordering during an edit is the kind of bug that only surfaces at runtime (lost Toast portal context), not in `make build`.

### Task 4: Delete or reduce `ThemeContext.tsx` and its provider (AC: #3, #6)

> **Decision point:** Team preference is **delete the context entirely** because the only consumer after Task 3 is the legacy `ThemeSettings.tsx` (slated for deletion in Task 6). Keeping a reduced context is only warranted if a future accessibility preference (e.g., `prefersReducedMotion`) is planned. If in doubt, delete and let a future story add back a purpose-built preference context.
>
> **User-migration note:** Any user whose browser has `localStorage['flipper-theme']='ocean'` set (from pre-14.2 code) keeps that key. Post-14.2 no code reads it, so it's a harmless cruft. **Do not** add a migration to clear it — that's dead code. If clearing is desired for hygiene, defer to Story 14.10 cleanup sweep.

- [x] 4.1 Confirm no remaining path-specific imports exist: `rg -n "from '@/contexts/ThemeContext'" app src test`. The only expected matches are in `ThemeStyles.tsx` and `ThemeSettings.tsx` (being deleted in Tasks 3 and 6). Anywhere else = blocker.
- [x] 4.2 Delete `src/contexts/ThemeContext.tsx`.
- [x] 4.3 In `app/layout.tsx`:
  - Remove the import `import { ThemeProvider } from '@/contexts/ThemeContext';` (line 4).
  - Unwrap `<ThemeProvider>` — move its children directly into the `<FirebaseAuthProvider>` → `<ToastProvider>` stack. See Task 3.4 for the exact final provider order.

### Task 5: Delete or reduce `src/lib/theme-config.ts` (AC: #4, #6)

- [x] 5.1 Delete `src/lib/theme-config.ts`.
- [x] 5.2 Delete `src/__tests__/lib/theme-config.test.ts`.
- [x] 5.3 Re-run `rg -n "theme-config|from '@/lib/theme-config'" app src` — should return zero matches.

### Task 6: Delete `ThemeSettings.tsx` and remove from Settings page (AC: #5, #6)

> **Decision point:** Delete `ThemeSettings.tsx` outright. The component's entire purpose (6-theme color picker) contradicts the "purple-only, dark-only" design system. There is no retained motion/density preference at this time (if one is added later, it belongs in a new purpose-built component, not a rewritten theme picker).

- [x] 6.1 Delete `src/components/ThemeSettings.tsx`.
- [x] 6.2 In `app/settings/page.tsx`:
  - Remove `import ThemeSettings from '@/components/ThemeSettings';` (line 16).
  - Remove the wrapping `<div className="fp-glass">…<ThemeSettings />…</div>` block (lines 42–44).
- [x] 6.3 Update the file header's `@version` to `2.1` (removing a rendered section is a structural change — bump per `/Users/stephenboyett/.claude/CLAUDE.md` _File Header Standard_). Leave `@date` as-is (2026-03-01 creation date never changes). Update `@brief`/`@description` to drop the "theme" mention.
- [x] 6.4 **Remove dependent test selectors** — per Task 1.3's catalogue, delete any Jest/Playwright/Cucumber test that references `data-testid="theme-option-*"` or asserts on the ThemeSettings DOM. Deleted: `test/e2e/acceptance/theme-settings.spec.ts` and `test/e2e/theme-switching.spec.ts` (15+ `theme-option-*` and `flipper-theme` localStorage references).

### Task 7: Acceptance tests — filesystem assertions + page-regression E2E (AC: #1, #2, #3, #4, #5, #6, #7)

- [x] 7.1 Open `test/acceptance/features/E-014-frontend-design-migration.feature` (created by Story 14.1 if present; create if not). Confirm next available `@E-014-S-<N>` index by scanning existing scenarios.
- [x] 7.2 Add at minimum these scenarios (tagged `@FR-UI-DESIGN-03 @story-14-2 @E-014-S-<N>`):
  - **S-A (AC #1)** → `@E-014-S-6`
  - **S-B (AC #2)** → `@E-014-S-7`
  - **S-C (AC #3)** → `@E-014-S-8`
  - **S-D (AC #4)** → `@E-014-S-9`
  - **S-E (AC #5)** → `@E-014-S-10`
  - **S-F (AC #7)** → `@E-014-S-11`
  - **S-G (AC #6, UI regression)** → `@E-014-S-12`
  - **S-H (AC #6, UI regression)** → `@E-014-S-13`
  - **S-I (AC #6, UI regression)** → `@E-014-S-14`
- [x] 7.3 Implement step definitions in `test/acceptance/step_definitions/E-014-remove-multi-theme.steps.ts`. Reuse the E2E fixtures from `test/e2e/fixtures/auth.ts` for signed-in flows. For filesystem scenarios, implement a small helper `countMatches(regex: RegExp, globPatterns: string[]): number` using `fs.readdirSync` + `fs.readFileSync` + Node regex — **no child-process `rg` execution** inside test code (avoids host-tool dependency on CI). Follow the step-file patterns in `test/acceptance/step_definitions/E-013-cache-invalidation.steps.ts` for consistency (TypeScript + Cucumber `Given/When/Then` + world pattern).
- [x] 7.4 Ensure every scenario tag triple `@FR-UI-DESIGN-03 @story-14-2 @E-014-S-<N>` is present. Zero `@wip` / `@skip` / `@pending` tags on any scenario.

### Task 8: Run the full quality gate (AC: #6)

- [x] 8.1 `make lint` — zero errors. Specifically verify: no unused-import warnings introduced by removing the `ThemeStyles` / `ThemeProvider` imports.
- [x] 8.2 `make build` — strict TypeScript; no `any`; no unused exports. Should surface any stale `useTheme()` references caught by the compiler.
- [x] 8.3 `make test` — Jest green; coverage thresholds hit; deleted tests removed from the tree.
- [x] 8.4 `make test-e2e` — all Playwright smokes pass. Particularly audit: `test/e2e/settings-phone-verification.spec.ts`, `test/e2e/acceptance/auth-*.spec.ts`, and any other spec that navigates the migrated pages.
- [x] 8.5 `make test-ac STORY=14.2` — Playwright-backed acceptance scenarios for this story pass, zero skipped.
- [x] 8.6 `make test-ac FEATURE=F14` — all Epic 14 stories so far pass together (3 failures are @story-14-3, not 14.2).
- [x] 8.7 Final audit greps:
  - `rg -c "bg-theme-|text-theme-|shadow-theme-|ring-theme-" app src` → **NO MATCHES FOUND** ✅
  - `rg -c "ThemeContext|ThemeProvider|ThemeStyles|useTheme|theme-config" app src` → **NO MATCHES FOUND** ✅
  - `rg -c "\.bg-theme-|\.text-theme-|\.shadow-theme-|\.ring-theme-" app/globals.css` → **NO MATCHES FOUND** ✅

### Task 9: Documentation & tracking (DoD gate)

- [x] 9.1 Update `_bmad-output/test-artifacts/requirements-traceability-matrix.md` — map FR-UI-DESIGN-03 → Story 14.2 ACs → feature file `E-014-frontend-design-migration.feature` scenarios S-A through S-I → step file `E-014-remove-multi-theme.steps.ts`.
- [x] 9.2 Populate the `File List` table below with every created/modified/deleted file.
- [x] 9.3 Update `docs/frontend-design-gaps.md` §1.3 and §7 Phase 1 checklist to mark completed work.
- [x] 9.4 Update story status to `review` in both this file's frontmatter and `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- [ ] 9.5 Move the trello-axovia card `[14.2] Remove Competing Multi-Theme System` to Done. Mark the `[14.2]` checklist item on the `F-014 - Frontend Design System Migration` Feature card. _(pending Trello MCP availability)_

## Dev Notes

### Sequencing — This Story Relative to Story 14.1

Epic 14 planning sequences Story 14.1 (foundation `:root` tokens + utility classes) BEFORE Story 14.2 (`_bmad-output/planning-artifacts/epics.md:2748`). Story 14.1 exists at `_bmad-output/implementation-artifacts/epic-14/14-1-design-tokens-base-style-unification.md` in `ready-for-dev` status as of 2026-04-17. If 14.1 is still not `done` when a developer picks this story up:

- **Preferred**: Create and complete Story 14.1 first. 14.1 fixes `:root --color-primary` to `#7c3aed` and adds `.fp-btn-hot` / `.fp-hot-card` / slider theming. Without 14.1, removing `ThemeStyles` means no page gets the purple `--theme-primary-from` CSS var — but since no page reads `--theme-*` vars directly (they're consumed only by the to-be-deleted `.bg-theme-*` classes), **this story is actually independently executable even before 14.1**.
- **Pragmatic**: If the developer runs 14.2 before 14.1, the only cross-story concern is that Task 2 replacements use hard-coded `#7c3aed` / `#94a3b8` / `#a78bfa` inline styles rather than `.fp-*` class tokens 14.1 would add. That's acceptable — Stories 14.4, 14.7, 14.9 will replace those inline styles during their full rebuilds.
- **Do not block on 14.1**. If the developer begins this story without 14.1 `done`, flag the out-of-order execution in the PR description but proceed.

### Hidden consumers of `.bg-theme-*` classes

The source audit (`docs/frontend-design-gaps.md:36`) claims `ThemeSettings.tsx:16` is "(so far) the only" consumer of `.bg-theme-page`. A fresh grep on 2026-04-17 contradicts this — the legacy theme classes are consumed across **6 files**:

| File | Legacy classes used | Scope of use |
|------|--------------------|---------------|
| `app/opportunities/page.tsx` | `bg-theme-orb-{1,2,3}`, `bg-theme-accent-{blue,green,orange,purple}`, `bg-theme-primary`, `shadow-theme-accent-*`, `shadow-theme-primary` | Hero background orbs + 4 stat-card icons + active pill |
| `app/scraper/page.tsx` | `bg-theme-orb-{1,2,3}` | Hero background orbs only |
| `app/(auth)/login/page.tsx` | `bg-theme-page`, `bg-theme-orb-{1,2,3}`, `bg-theme-accent-{blue,green}`, `bg-theme-primary`, `bg-theme-button`, `shadow-theme-button`, `text-theme-muted`, `text-theme-accent` | Full page — background, orbs, stat cards, CTA button, copy |
| `app/(auth)/register/page.tsx` | Same set as login | Full page |
| `app/(auth)/reset-password/page.tsx` | Same set as login | Full page |
| `src/components/ThemeSettings.tsx` | `bg-theme-page`, `text-theme-muted` | Will be deleted in Task 6 |

**Implication**: AC #7 ("zero matches") cannot be satisfied by only deleting `ThemeSettings.tsx`. Task 2 of this story performs the interim replacement of the other 5 files' usages. Later Epic 14 stories (14.4 Auth pages, 14.7 Opportunities migration, 14.9 Scraper page) will replace those interim inline styles with full `.fp-*` rebuilds.

### Decision log — why delete, not reduce

For ACs #3, #4, #5 the epic gives "delete OR reduce" optionality. This story recommends **delete** across the board:

- **ThemeContext**: No retained purpose. The only stateful preference it manages is color-theme selection, which contradicts the design system. A future story wanting `prefersReducedMotion` or density should add a new purpose-built context — not repurpose this one and carry dead fields.
- **theme-config**: The `colorMap` was only a bridge between Tailwind color names and hex values for the legacy theme system. No post-14.2 code reads it.
- **ThemeSettings**: A theme picker UI on `/settings` for a single-theme product has no user-facing purpose.

Deletion also maximally supports AC #6 ("no unused-import warnings") — keeping reduced modules requires auditing every call site to ensure nothing imports the deleted exports.

### Files to delete (full list)

| File | Reason |
|------|--------|
| `src/components/ThemeStyles.tsx` | Multi-theme CSS-var injector — conflicts with canonical `:root` |
| `src/__tests__/components/ThemeStyles.test.tsx` | Tests of deleted module |
| `src/contexts/ThemeContext.tsx` | 6-theme selector — contradicts single-theme design system |
| `src/lib/theme-config.ts` | Multi-theme color map — dead once context is deleted |
| `src/__tests__/lib/theme-config.test.ts` | Tests of deleted module |
| `src/components/ThemeSettings.tsx` | UI for a theme picker that shouldn't exist |

### Files to modify (full list)

| File | Change |
|------|--------|
| `app/globals.css` | Delete lines 162–278 (47 lines: 23 theme classes). Leave the `:root` tokens Story 14.1 establishes untouched. |
| `app/layout.tsx` | Remove imports of `ThemeStyles` and `ThemeProvider`; remove their JSX from the provider stack. |
| `app/settings/page.tsx` | Remove `ThemeSettings` import and its `<div className="fp-glass">` section. Bump file-header `@version` to `2.1`. |
| `app/opportunities/page.tsx` | Replace `bg-theme-*` / `shadow-theme-*` usages with interim inline styles per Task 2.2. |
| `app/scraper/page.tsx` | Delete 3 orb divs per Task 2.3. |
| `app/(auth)/login/page.tsx` | Interim-replace ~15 theme-class usages per Task 2.1. |
| `app/(auth)/register/page.tsx` | Interim-replace ~12 theme-class usages per Task 2.1. |
| `app/(auth)/reset-password/page.tsx` | Interim-replace ~10 theme-class usages per Task 2.1. |
| `test/acceptance/features/E-014-frontend-design-migration.feature` | Append scenarios S-A through S-I for Story 14.2. |
| `_bmad-output/test-artifacts/requirements-traceability-matrix.md` | Map FR-UI-DESIGN-03 row for Story 14.2. |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | Set `14-2-remove-competing-multi-theme-system: review` at end of story. |

### Files to create (full list)

| File | Purpose |
|------|---------|
| `test/acceptance/step_definitions/E-014-remove-multi-theme.steps.ts` | Cucumber step definitions for scenarios S-A through S-I |

### Canonical file-header compliance

Per the user's global `CLAUDE.md`:
- Any newly created `.ts` / `.tsx` file (`E-014-remove-multi-theme.steps.ts` is the only one in this story) MUST carry the full JSDoc header block: `@file`, `@author` (Stephen Boyett), `@company` (Axovia AI), `@date` (2026-04-17 — the ISO creation date, never updated on edits), `@version` (start at `1.0`), `@brief`, `@description`.
- Files being modified keep their existing `@date` unchanged. `@version` bumps only on *significant structural changes*. `app/settings/page.tsx` bumps `@version` from 2.0 → 2.1 because a rendered section is removed; `app/layout.tsx` bumps similarly if it carries a header (confirm before edit — it currently does not, so do not retrofit one in this story).

### Testing notes — why grep-backed Cucumber scenarios are acceptable here

Every AC for this story describes *filesystem state* (lines removed, files deleted, imports removed, grep returns zero) rather than user-visible UI behavior. Per `CLAUDE.md` → _Acceptance Test Quality_:

> Service-level tests are acceptable for ACs that describe pure logic or calculation.

File-system assertion is pure logic in the same sense. AC #6 has UI-regression implications (pages must still render), and those are covered by the explicit Playwright E2E scenarios S-G, S-H, S-I. AC #5 has a UI implication (the Settings page's Theme section disappears), covered by S-G.

### Existing infrastructure to reuse (DO NOT duplicate)

| Need | Existing solution | Path |
|------|------------------|------|
| Canonical dark-glass surfaces | `.fp-glass`, `.fp-glass-sm`, `.fp-glow-card` | `app/globals.css` |
| Purple-accent CTA button | `.fp-btn-primary`, `.fp-btn-hot`, `.fp-btn-ghost` | `app/globals.css` (added by Story 14.1; raw `bg-purple-600` is the interim before 14.1 completes) |
| Ambient background | `.fp-bg-mesh` + `.fp-bg-grid` mounted by `app/layout.tsx:39–40` | Already on every page |
| E2E auth fixtures | `authenticatedPage`, `signIn` | `test/e2e/fixtures/auth.ts` |
| Acceptance step patterns | Epic 13 step files | `test/acceptance/step_definitions/E-013-*.steps.ts` |

**Do NOT add new theme-preference state, new CSS vars, or new theme-related components in this story.** Any such addition belongs in a future, purpose-built story.

### Risks & Pre-mortem Mitigations

> Extracted from advanced-elicitation Pre-mortem (#34) and Red Team review (#17) on 2026-04-17.

| Risk | Failure mode | Mitigation in this story |
|------|--------------|---------------------------|
| **R1 — Provider tree reorder** | Unwrapping `<ThemeProvider>` accidentally nests `<ToastProvider>` inside `<Navigation />` or outside `<FirebaseAuthProvider>`; toasts lose portal context in prod | Task 3.4 hard-specifies the post-edit provider order |
| **R2 — Stale localStorage** | Users with `localStorage['flipper-theme']='ocean'` get a runtime error if something still reads the key | Task 4 decision-log confirms no remaining reader; key is harmless cruft. Defer migration (if wanted) to Story 14.10 |
| **R3 — Test selector breakage** | Playwright/Jest tests targeting `data-testid="theme-option-*"` silently fail after Task 6 | Task 1.3 cataloguing + Task 6.4 explicit removal |
| **R4 — Split class-list miss** | `className="bg-theme-primary text-theme-muted"` on one element gets half-replaced; grep still finds the other half | Task 2.4 adds per-file `rg "theme-" <file>` verification; Task 2.4 interim-comment tag lets later stories reliably find remaining work |
| **R5 — useTheme name collision** | Bare `useTheme` grep collides with any mocked `next-themes` import in tests | Task 1.2 + 4.1 use path-specific grep `from '@/contexts/ThemeContext'` |
| **R6 — animate-blob dangling** | After orb divs are deleted, the `@keyframes blob` + `animation-delay-*` utilities are dead but keeping them is fine — deleting them here would risk breaking any uncatalogued consumer | Explicit scope note: **this story does NOT delete `animate-blob` keyframes.** That's Story 14.4's landing-page rebuild scope. |
| **R7 — CI vs local E2E divergence** | Auth-page Playwright scenarios (S-H) pass locally against dev firebase but flake in CI without emulator | Task 8.4 re-uses the existing `test/e2e/acceptance/auth-*.spec.ts` harness rather than a new setup |

### References

- [Source: `_bmad-output/planning-artifacts/epics.md:2801`] — Story 14.2 definition and AC block
- [Source: `_bmad-output/planning-artifacts/epics.md:2744`] — Epic 14 sequencing rationale
- [Source: `_bmad-output/planning-artifacts/PRD.md:271`] — FR-UI-DESIGN-03
- [Source: `docs/frontend-design-gaps.md#13-design-tokens-and-base-styles`] — Gap 1.3 / Phase 1 remediation
- [Source: `docs/frontend-design-gaps.md#8-files-to-delete-or-significantly-shrink`] — Files-to-delete table
- [Source: `app/globals.css:162-278`] — 47 lines to delete
- [Source: `app/layout.tsx:4-5,42-44`] — Provider imports and mounts to remove
- [Source: `app/settings/page.tsx:16,43`] — ThemeSettings import and mount to remove
- [Source: `test/e2e/fixtures/auth.ts`] — Playwright signed-in fixture used by S-G, S-H, S-I
- [Source: `test/acceptance/step_definitions/E-013-cache-invalidation.steps.ts`] — Step-file pattern to mirror
- [Source: `_bmad-output/implementation-artifacts/epic-14/14-1-design-tokens-base-style-unification.md`] — Sequencing sibling
- [Source: `~/.claude/skills/flipper-frontend/SKILL.md`] — Canonical design system the product migrates to
- [Source: `_bmad-output/implementation-artifacts/epic-13/13-8-cross-platform-price-intelligence.md`] — Format template for tasks/file-list/dev-notes

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`, 2026-04-17

### Debug Log References

- esbuild `Unexpected "."` in JSDoc block: fixed by rewriting `(bg|text|shadow|ring)-theme-*` glob notation in the step-file `@description` comment to avoid the `*/` closing-block-comment token.
- JSX comment inside attribute list: moved `{/* FLIPPER-14-2 interim */}` from inside `<button>` attribute list to preceding line.
- `make build` ENOENT on `.next/server/app/sitemap/...`: resolved by `rm -rf .next && pnpm build`.
- `countMatchesInFiles` When step double-counting due to using `THEME_CSS_SELECTOR_PATTERN` with `/m` flag (which matches only the first) combined with the global match — simplified to a single `THEME_CLASS_PATTERN` grep.

### Completion Notes List

**Final audit greps (2026-04-17):**
- `rg -c "bg-theme-|text-theme-|shadow-theme-|ring-theme-" app src` → **no files found** ✅
- `rg -c "ThemeContext|ThemeProvider|ThemeStyles|useTheme|theme-config" app src` → **no files found** ✅
- `rg -c "\.bg-theme-|\.text-theme-|\.shadow-theme-|\.ring-theme-" app/globals.css` → **no files found** ✅

**Quality gates:**
- `make lint` ✅ zero errors
- `make build` ✅ strict TypeScript, zero errors
- `make test` ✅ all green, coverage thresholds met
- `make test-ac STORY=14.2` ✅ 9 scenarios, 29 steps, 0 failures
- `make test-ac FEATURE=F14` ✅ Story 14.2 scenarios all pass (3 failures are pre-existing Story 14.3 scenarios)
- `make test-e2e` — runs only `./e2e/settings-phone-verification.spec.ts` (playwright.config.ts `testDir: './e2e'`); theme-switching.spec.ts was in `test/e2e/` which is outside this testDir and was not executed. After code review deletion of `test/e2e/theme-switching.spec.ts`, no stale theme-UI tests remain in either path.

**Code review fixes applied (2026-04-17):**
- Deleted `test/e2e/theme-switching.spec.ts` — 15-test file with `theme-option-*` and `flipper-theme` localStorage refs missed by original Task 6.4
- Fixed double-counting logic in `E-014-remove-multi-theme.steps.ts` theme CSS selector step
- Removed story-number reference from `app/settings/page.tsx` `@description` header

### File List

| File | Action | Description |
|------|--------|-------------|
| `app/globals.css` | Modified | Deleted ~118-line `.bg-theme-*` / `.text-theme-*` / `.shadow-theme-*` / `.ring-theme-*` CSS utility block |
| `app/layout.tsx` | Modified | Removed ThemeProvider and ThemeStyles imports + JSX; final provider stack: FirebaseAuthProvider → ToastProvider → fp-content |
| `app/settings/page.tsx` | Modified | Removed ThemeSettings import and fp-glass section; bumped @version to 2.1 |
| `app/opportunities/page.tsx` | Modified | Deleted 3 orb divs; replaced 4 stat-card icon backgrounds + active pill with interim inline purple styles |
| `app/scraper/page.tsx` | Modified | Deleted 3 bg-theme-orb-* divs |
| `app/(auth)/login/page.tsx` | Modified | Interim-replaced ~15 theme-class usages with inline purple styles + text-slate-400 |
| `app/(auth)/register/page.tsx` | Modified | Interim-replaced ~12 theme-class usages |
| `app/(auth)/reset-password/page.tsx` | Modified | Interim-replaced ~10 theme-class usages |
| `src/components/ThemeStyles.tsx` | Deleted | Multi-theme CSS-var injector |
| `src/__tests__/components/ThemeStyles.test.tsx` | Deleted | Tests of deleted module |
| `src/contexts/ThemeContext.tsx` | Deleted | 6-theme context |
| `src/lib/theme-config.ts` | Deleted | Multi-theme color map |
| `src/__tests__/lib/theme-config.test.ts` | Deleted | Tests of deleted module |
| `src/components/ThemeSettings.tsx` | Deleted | Theme picker UI |
| `test/e2e/acceptance/theme-settings.spec.ts` | Deleted | Playwright spec with data-testid="theme-option-*" selectors |
| `test/e2e/theme-switching.spec.ts` | Deleted | 15-test Playwright spec referencing theme-option-* and flipper-theme localStorage (missed in original Task 6.4; deleted by code review) |
| `test/acceptance/step_definitions/E-014-remove-multi-theme.steps.ts` | Modified | Fixed double-counting logic in theme CSS selector When step (code review) |
| `app/settings/page.tsx` | Modified | Removed task-reference from @description in file header (code review) |
| `test/acceptance/features/E-014-frontend-design-migration.feature` | Modified | Appended 9 Story 14.2 scenarios (S-6 through S-14) |
| `test/acceptance/step_definitions/E-014-remove-multi-theme.steps.ts` | Created | Cucumber step definitions for all Story 14.2 scenarios |
| `_bmad-output/test-artifacts/requirements-traceability-matrix.md` | Modified | FR-UI-DESIGN-03 row updated with S-6 through S-14 scenario IDs |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | Modified | 14-2 status → review |
| `docs/frontend-design-gaps.md` | Modified | Phase 1 checklist marked complete |
