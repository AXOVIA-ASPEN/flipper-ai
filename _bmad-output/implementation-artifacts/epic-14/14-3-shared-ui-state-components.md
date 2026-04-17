# Story 14.3: Shared UI State Components

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69e1f783eeec799709146033

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->
<!-- Trello-Card-ID: populated by the SM during sprint intake via the trello-axovia MCP on the `F-014` Feature card on board `SvVRLeS5`. Do not hand-edit once set. -->
<!-- Elicitation: this story was refined on 2026-04-17 via two advanced-elicitation methods — Pre-mortem Analysis (#34) and Critique and Refine (#42). See `## Risks & Mitigations (from pre-mortem 2026-04-17)` in Dev Notes. -->

## Story

As a **developer**,
I want shared `LoadingSkeleton`, `ErrorBanner`, `EmptyState`, and `ScoreRing` components under `src/components/ui/`,
so that every page in the app stops hand-rolling its own loading/error/empty markup and the visual language of these three universal UI states is consistent across the product.

## Problem Statement

The canonical design-system spec (`~/.claude/skills/flipper-frontend/SKILL.md` §"Loading / Error / Empty States") requires every data-driven surface to render **all three** non-happy-path states — loading, error, empty — from shared components. The spec also defines a `ScoreRing` SVG helper for AI-confidence displays on cards.

Today none of those four components exist. Every page hand-rolls its own:

| Page | Loading | Error | Empty | Score display |
|------|---------|-------|-------|---------------|
| `app/dashboard/page.tsx:192-206` | Inline flex-centered text ("Loading listings…") | Inline flex-centered red text | (none — dashboard renders whatever listings exist) | Numeric only (`app/dashboard/page.tsx:378` area) |
| `app/opportunities/page.tsx:253-257, 877-884` | Inline `animate-pulse` text ("Loading opportunities...") | (inlined in the same block) | Inline "No opportunities found" heading/CTA | Numeric only |
| `app/listings/[id]/page.tsx:109-126` | `min-h-screen flex items-center justify-center` + `text-xl text-gray-600` (light-mode styling) | Same block pattern with `text-red-600` | "Listing not found" (merged with error path) | Numeric only |
| `app/messages/page.tsx:260-295` | Bespoke 5-skeleton grid with `animation: pulse` (not `.shimmer`) | (no dedicated error UI) | Bespoke `.fp-glass` centered panel with emoji avatar | N/A |
| `app/posting-queue/page.tsx:310-348` | Bespoke 5-skeleton grid with `animation: pulse` | Inline red-bg banner with retry button (handcrafted, not `.fp-alert-danger`) | Bespoke `.fp-glass` centered panel with CTA | N/A |

Consequences:
- **Visual inconsistency.** Loading skeletons range from "single centered text string" to "5 greyscale rectangles pulsing." None use the canonical `.shimmer` animation that Story 14.1 exports.
- **Design drift.** `app/listings/[id]/page.tsx:112` uses `text-gray-600` — a light-mode token the product is migrating away from (Gap 2.4 in `docs/frontend-design-gaps.md:115-121`).
- **No score ring in the product.** The spec reserves `ScoreRing` for opportunity/listing cards, but no page renders one today — AI confidence is shown as a bare number (`docs/frontend-design-gaps.md:40`).
- **Downstream Epic 14 stories are blocked.** Stories 14.4 (auth rebuild), 14.5 (onboarding), 14.7 (opportunities + listings + messaging rebuild), 14.8 (settings), 14.9 (analytics/scraper/health) all assume these shared components exist. Without them, each later story will be forced to either re-hand-roll or stub-and-hope.

Per `_bmad-output/planning-artifacts/epics.md:2748` — Story 14.3 is explicitly sequenced **early** in Epic 14 "because every later page/component migration consumes them."

## Solution

Create four new client components under a fresh `src/components/ui/` directory, each a small, focused React component matching the canonical spec in `~/.claude/skills/flipper-frontend/SKILL.md`. Write a Jest unit test per component. Then refactor the five target pages (dashboard, opportunities, listings/[id], messages, posting-queue) to render the shared components in place of their inline blocks — preserving existing behaviour (copy, CTAs, retry callbacks, `data-testid`s).

Scope deliberately **excludes**:
- Rewriting the pages' surrounding layout or other design tokens — that belongs in Stories 14.7 and 14.9.
- Adding a theme preference, density setting, or storybook story — out of scope for Epic 14.
- Migrating smaller loading hotspots in `src/components/ScoringSettings.tsx`, `src/components/MessagingSettings.tsx`, `src/components/ApprovalQueue.tsx`, `app/onboarding/page.tsx` — the AC (per `epics.md:2872-2874`) names exactly the five target pages. Those smaller components may be migrated in a follow-up (Story 14.8 for settings; Story 14.5 for onboarding).

## Acceptance Criteria

> Sourced from `_bmad-output/planning-artifacts/epics.md:2850–2880`. Each AC maps to FR-UI-DESIGN-06 (PRD line 227, 466).

1. **`src/components/ui/` directory exists with four components** — Given the `src/components/ui/` directory does not exist in the repo, when Story 14.3 is complete, then the directory exists and contains exactly these four files: `LoadingSkeleton.tsx`, `ErrorBanner.tsx`, `EmptyState.tsx`, `ScoreRing.tsx`. Each file carries the canonical JSDoc file header (`@file`, `@author` Stephen Boyett, `@company` Axovia AI, `@date` 2026-04-17, `@version` 1.0, `@brief`, `@description`) per the user's global `CLAUDE.md`. `FR-UI-DESIGN-06`

2. **`LoadingSkeleton` renders a glass-surfaced skeleton with `.shimmer`** — Given a page is in a loading state, when it renders `<LoadingSkeleton variant="card" />` or `<LoadingSkeleton variant="list" />`, then the DOM contains a `.fp-glass` (or `.fp-glass-sm`) container with one or more child divs each bearing the `.shimmer` utility class. The `card` variant renders a single skeleton card sized to match typical dashboard/opportunity cards; the `list` variant renders a vertical stack of 5 row-shaped skeletons. `FR-UI-DESIGN-06`

3. **`ErrorBanner` uses `.fp-alert-danger` with retry** — Given a page encounters an error, when it renders `<ErrorBanner message="Fetch failed" onRetry={refetch} />`, then the DOM contains a `.fp-alert-danger` surface displaying the message in text color `#f87171` (per canonical), and — when `onRetry` is provided — a retry button with the `.fp-btn-ghost` class that invokes the callback on click. The retry button is omitted entirely when `onRetry` is undefined. `FR-UI-DESIGN-06`

4. **`EmptyState` renders a centred `.fp-glass` card** — Given a page has no data to display, when it renders `<EmptyState title="No opportunities yet" message="Scrape some listings to see opportunities." action={{ label: 'Open scraper', href: '/scraper' }} />`, then the DOM contains a centred `.fp-glass` card with the title rendered in color `#e2e8f0` (primary text), the message in `#94a3b8` (secondary text), and — when `action` is provided — either a link (`<a>`) or button rendered using `.fp-btn-primary`. The action is omitted entirely when `action` is undefined. `FR-UI-DESIGN-06`

5. **`ScoreRing` SVG reflects score-based colour** — Given a listing has an AI confidence score, when a card renders `<ScoreRing score={82} size={48} />`, then an SVG ring of the requested pixel size is displayed with the score value visible (either as a child label or as an accessible `aria-label`/`aria-valuenow`) and the ring stroke colour resolves by tier: `#34d399` (green) if `score >= 80`, `#fbbf24` (yellow) if `60 <= score < 80`, `#f87171` (red) if `score < 60`. Ring geometry matches the skill's reference implementation — `r = size/2 − 4`, `circumference = 2·π·r`, fill length = `(score/100)·circumference`, background track at `rgba(255,255,255,0.06)`. `FR-UI-DESIGN-06`

6. **Five pages consume the shared components** — Given the shared components exist, when `app/dashboard/page.tsx`, `app/opportunities/page.tsx`, `app/listings/[id]/page.tsx`, `app/messages/page.tsx`, and `app/posting-queue/page.tsx` render their loading, error, and empty states, then each page imports `LoadingSkeleton`, `ErrorBanner`, and/or `EmptyState` from `@/components/ui` and renders them for those states. No file in that set contains an inline `<div className="min-h-screen flex items-center justify-center">Loading…</div>`-style block or its inline-style equivalent (`style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}` paired with a loading/error message). `FR-UI-DESIGN-06`

7. **Unit tests pass** — Given the shared components exist, when `make test` runs, then Jest unit tests for `LoadingSkeleton`, `ErrorBanner`, `EmptyState`, and `ScoreRing` pass. `ScoreRing` tests cover the colour-by-score logic at the boundary values: `79 → #fbbf24`, `80 → #34d399`, `59 → #f87171`, `60 → #fbbf24`, `100 → #34d399`, `0 → #f87171`. Coverage for `src/components/ui/` is ≥96% branches, ≥98% functions, ≥99% lines/statements per the project's gate. `FR-UI-DESIGN-06`

8. **All quality gates pass** — Given the refactor is complete, when `make lint`, `make build`, `make test`, `make test-e2e`, and `make test-ac STORY=14.3` run, then all pass with zero errors, no `any` introduced to production code, no unused-import warnings introduced by the refactor in Task 5, and no Playwright regression on the five migrated pages. `FR-UI-DESIGN-06`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|-----------------|--------------------|-----------|
| FR-UI-DESIGN-06 | AC #1, #2, #3, #4, #5, #6, #7, #8 | `@FR-UI-DESIGN-06` `@story-14-3` |

### Reserved scenario-tag range — `@E-014-S-20` through `@E-014-S-27`

Story 14.1 occupies `@E-014-S-1` through `@E-014-S-5` plus `@E-014-S-15` through `@E-014-S-19` (verified 2026-04-17 against the feature file). Story 14.2 claimed `@E-014-S-6` through `@E-014-S-14`. **Story 14.3 claims `@E-014-S-20` through `@E-014-S-27` exclusively** — eight slots sized to cover the eight scenarios S-A through S-H listed in Task 13. Specifically:

| Scenario letter | Tag | AC covered |
|---|---|---|
| S-A | `@E-014-S-20` | #1 (filesystem + canonical header) |
| S-B | `@E-014-S-21` | #2 (`LoadingSkeleton` on /dashboard) |
| S-C | `@E-014-S-22` | #3 (`ErrorBanner` on /posting-queue) |
| S-D | `@E-014-S-23` | #4 (`EmptyState` on /posting-queue) |
| S-E | `@E-014-S-24` | #5 (`ScoreRing` color tiers — service-level boundary matrix) |
| S-F | `@E-014-S-25` | #6 (`ErrorBanner` on /listings/[id]) |
| S-G | `@E-014-S-26` | #6 (`EmptyState` on /messages) |
| S-H | `@E-014-S-27` | #6 (inline blocks removed) |
| S-I | `@E-014-S-28` | #5 + Task 5a.4 (`ScoreRing` rendered in opportunities DOM — Playwright E2E) |

Story 14.4 (next in sequence) must start at `@E-014-S-29` or higher.

## Definition of Done

> Full gate definition: `_bmad-output/project-context.md` → _Story Definition of Done_

- [x] All tasks/subtasks `[x]`; every AC satisfied; no `any` in production code
- [x] `make lint` passes — zero ESLint errors, zero unused-import warnings
- [x] `make build` passes — strict TypeScript, no `ignoreBuildErrors`, no `any`
- [x] `make test` passes — all tests green, zero regressions; coverage ≥96% branches, ≥98% functions, ≥99% lines/statements (especially in `src/components/ui/`)
- [x] `make test-e2e` passes — all Playwright smokes still green on the migrated pages (Dashboard, Opportunities, Listings detail, Messages, Posting Queue)
- [x] Unit tests added for all four new components (`src/__tests__/components/ui/LoadingSkeleton.test.tsx`, `ErrorBanner.test.tsx`, `EmptyState.test.tsx`, `ScoreRing.test.tsx`)
- [x] Every AC has a test at the correct level:
  - ACs #1 (filesystem/header), #2–#5 (component markup), #7 (Jest logic) — satisfied by Jest unit tests + one filesystem/header grep scenario in the acceptance file
  - AC #6 (UI-visible refactor) — satisfied by Playwright E2E scenarios that navigate each of the five pages and assert on the shared components' DOM markers (`data-testid` or class selectors)
  - AC #8 (quality gates) — satisfied by the CI pipeline running the commands above
- [x] `make test-ac STORY=14.3` passes green — zero failures, zero skipped scenarios
- [x] `make test-ac FEATURE=F14` passes cleanly across all Epic 14 stories created so far
- [x] Acceptance scenarios in `test/acceptance/features/E-014-frontend-design-migration.feature` — every scenario tagged with ALL THREE: `@FR-UI-DESIGN-06`, `@story-14-3`, and `@E-014-S-<N>` (sequential)
- [x] RTM updated (`_bmad-output/test-artifacts/requirements-traceability-matrix.md`) — FR-UI-DESIGN-06 row added with every scenario ID
- [x] Story `Status` → `review`; `sprint-status.yaml` → `review`
- [x] `File List` updated with every new/modified/deleted file
- [x] Trello card moved to Done (trello-axovia board `SvVRLeS5`)

## Tasks / Subtasks

### Task 1: Scaffold `src/components/ui/` and confirm Story 14.1 prerequisites (AC: #1, #2)

- [x] 1.1 Create directory `src/components/ui/`. If it already exists from a previous branch, confirm empty and do not overwrite in-flight work from another story without coordination.
- [x] 1.2 Confirm `.shimmer` + `@keyframes shimmer` are present in `app/globals.css`. Run `rg -n "^@keyframes shimmer|^\.shimmer " app/globals.css`. Expected: non-empty (added by Story 14.1). **If the keyframe is missing**, Story 14.1 has not yet merged — either block this story (preferred: set `Status: blocked`, `Blocked: true`, `Blocked-Reason: "Awaiting Story 14.1 — .shimmer keyframe not yet in app/globals.css"`) OR temporarily inline the keyframe inside `LoadingSkeleton.tsx` as a component-scoped `<style jsx>` block with a clearly-labelled `// TODO: Remove when Story 14.1 exports global .shimmer` comment. Prefer blocking; the inline fallback is only acceptable if the reviewer explicitly signs off.
- [x] 1.3 Confirm `.fp-alert-danger`, `.fp-btn-ghost`, `.fp-btn-primary`, `.fp-glass`, `.fp-glass-sm` are all present in `app/globals.css` (they already are as of 2026-04-17 per `app/globals.css:323-460`). Run `rg -n "^\.fp-alert-danger|^\.fp-btn-ghost|^\.fp-btn-primary|^\.fp-glass " app/globals.css` to confirm before writing the components.

### Task 2: Build `LoadingSkeleton` component (AC: #1, #2)

- [x] 2.1 Create `src/components/ui/LoadingSkeleton.tsx`. Canonical JSDoc file header at top — set `@date` to **the ISO date on which the file is actually created** (per the user's global `CLAUDE.md`: "`date`: ISO 8601 creation date — never update this field when editing an existing file"). Use `YYYY-MM-DD` format. Example (if created 2026-04-17):
  ```tsx
  /**
   * @file src/components/ui/LoadingSkeleton.tsx
   * @author Stephen Boyett
   * @company Axovia AI
   * @date 2026-04-17
   * @version 1.0
   * @brief Glass-surfaced shimmer skeleton for loading states (card + list variants).
   *
   * @description
   * Shared loading placeholder used across Dashboard, Opportunities, Listings detail,
   * Messages, and Posting Queue. Renders a .fp-glass container wrapping one or more
   * .shimmer bars whose dimensions depend on the `variant` prop. Replaces hand-rolled
   * inline loading blocks — see Story 14.3 for migration scope.
   */
  ```
  Apply the same "creation-date" rule to every new file this story creates (10 files total — 4 components, 1 barrel, 4 Jest tests, 1 step definitions). Do NOT backdate to 2026-04-17 if the implementation happens later.
- [x] 2.2 Export a React component with this signature:
  ```ts
  export interface LoadingSkeletonProps {
    variant?: 'card' | 'list';
    rows?: number;           // list variant: how many rows; default 5
    className?: string;      // optional extra classes on the outer container
    'data-testid'?: string;  // default: 'loading-skeleton'
  }
  export function LoadingSkeleton(props: LoadingSkeletonProps): JSX.Element;
  ```
- [x] 2.3 Markup:
  - `card` variant → outer `.fp-glass` (padding 20) containing one title-line `.shimmer` (height 16, width 40%), three body `.shimmer` rows (height 12, widths 80% / 90% / 60%).
  - `list` variant → wrapper `<div role="status" aria-busy="true" aria-live="polite">` containing `rows` count (default 5) of `.fp-glass-sm` rows (padding 12, height 80) each with a child `.shimmer` filling the row.
  - All `.shimmer` children use `border-radius: 6px` inline style (no new global utility class needed).
  - Outer container carries `data-testid` (default `"loading-skeleton"` — match the existing identifier the posting-queue page and tests already use).
- [x] 2.4 Accessibility: outer wrapper gets `role="status"`, `aria-busy="true"`, `aria-live="polite"`, and a visually-hidden `<span>Loading…</span>` so screen readers announce the state. Matches FR-UI-DESIGN-07 requirements. **Do not depend on a global `.sr-only` / `.visually-hidden` utility class** — as of 2026-04-17 the repo does not export one (grep `rg "\.sr-only|\.visually-hidden" app/globals.css` returns zero matches). Inline the SR-only style on the span: `style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}`. If a `.sr-only` utility is later added in Story 14.10's sweep, the inline style can be swapped out then.
- [x] 2.5 Export as a named export AND re-export from a barrel `src/components/ui/index.ts` (created in Task 6). Do not default-export.

### Task 3: Build `ErrorBanner` component (AC: #1, #3)

- [x] 3.1 Create `src/components/ui/ErrorBanner.tsx` with the canonical file header (same frontmatter fields as Task 2.1, brief: "Shared error banner using .fp-alert-danger + optional retry button.").
- [x] 3.2 Export signature:
  ```ts
  export interface ErrorBannerProps {
    message: string;
    onRetry?: () => void | Promise<void>;
    retryLabel?: string;    // default 'Retry'
    className?: string;
    'data-testid'?: string; // default: 'error-banner'
  }
  export function ErrorBanner(props: ErrorBannerProps): JSX.Element;
  ```
- [x] 3.3 Markup:
  - Outer `<div className="fp-alert-danger"` with inline `padding: '12px 16px'`, `display: 'flex'`, `alignItems: 'center'`, `gap: 12`.
  - Message child `<span>` with inline `color: '#f87171'`, `fontSize: 13`, `flex: 1`.
  - Retry button (rendered conditionally when `onRetry` is truthy): `<button type="button" className="fp-btn-ghost" onClick={onRetry}>{retryLabel}</button>`.
  - Outer wrapper carries `role="alert"` and `aria-live="assertive"` so dynamic error surfacing announces immediately.
- [x] 3.4 Guard `onClick` against promise rejections — do NOT silently swallow. Implementation:
  ```tsx
  const [isRetrying, setIsRetrying] = useState(false);
  const handleClick = async () => {
    if (!onRetry) return;
    try {
      setIsRetrying(true);
      await Promise.resolve(onRetry());
    } catch (err) {
      // Re-throw on the next microtask so global error handlers / Sentry catch it,
      // without breaking the React event handler chain.
      queueMicrotask(() => { throw err; });
    } finally {
      setIsRetrying(false);
    }
  };
  ```
  The rethrow ensures Sentry (already configured in this project) captures the failure rather than the banner swallowing it. Do NOT introduce a toast dependency inside `ErrorBanner` — keep it self-contained.
- [x] 3.5 Click-spam guard: disable the retry button (`disabled={isRetrying}`) and set `aria-busy={isRetrying}` while a retry is in flight so a user rapid-clicking doesn't fan out parallel calls to `onRetry`.

### Task 4: Build `EmptyState` component (AC: #1, #4)

- [x] 4.1 Create `src/components/ui/EmptyState.tsx` with canonical header (brief: "Shared empty-state card using .fp-glass surface + optional action.").
- [x] 4.2 Export signature:
  ```ts
  export interface EmptyStateAction {
    label: string;
    href?: string;                // renders <Link>/<a> if href provided
    onClick?: () => void;         // renders <button> if only onClick
    variant?: 'primary' | 'ghost'; // default 'primary'
  }
  export interface EmptyStateProps {
    title: string;
    message?: string;
    action?: EmptyStateAction;
    icon?: React.ReactNode;       // optional decorative icon rendered above title
    className?: string;
    'data-testid'?: string;       // default: 'empty-state'
  }
  export function EmptyState(props: EmptyStateProps): JSX.Element;
  ```
- [x] 4.3 Markup:
  - Outer `<div className="fp-glass"` with inline `textAlign: 'center'`, `padding: '48px 24px'`, `maxWidth: 480`, `margin: '0 auto'`.
  - Optional `icon` slot above the title. **Render the `icon` prop raw** (`{icon}`) — `EmptyState` does NOT auto-wrap it in a circular background. Consumers that want the 80×80 circle styling (e.g. the messages page) pass a pre-wrapped node (see Task 11.3). Rationale: keeps the component unopinionated and avoids the double-wrap bug where Task 11.3's pre-wrapped icon would sit inside another EmptyState-provided wrapper.
  - Title in `<h3>` with inline `color: '#e2e8f0'`, `fontSize: 20`, `fontWeight: 600`, `marginBottom: 8`.
  - Message in `<p>` with inline `color: '#94a3b8'`, `fontSize: 14`, `marginBottom: 24`.
  - Action: if `action.href` is set, render `next/link` `<Link href={action.href}>` wrapping a styled anchor; if only `action.onClick`, render `<button type="button" onClick={action.onClick}>`. Class is `fp-btn-primary` by default, `fp-btn-ghost` when `action.variant === 'ghost'`.
  - **Type-level XOR is not enforced** — `action.href` and `action.onClick` are both optional; if both are passed, prefer `href` (anchor renders). Document this precedence in the JSDoc so consumers don't accidentally supply both.

### Task 5: Build `ScoreRing` component (AC: #1, #5, #7)

- [x] 5.1 Create `src/components/ui/ScoreRing.tsx` with canonical header (brief: "SVG score ring with color tier based on numeric score.").
- [x] 5.2 Export signature:
  ```ts
  export interface ScoreRingProps {
    score: number;           // 0–100 (clamped); NaN / undefined → treat as 0
    size?: number;           // pixels; default 48
    strokeWidth?: number;    // default 3
    showLabel?: boolean;     // default true — renders centered score number
    className?: string;
    'data-testid'?: string;  // default: 'score-ring'
  }
  export function ScoreRing(props: ScoreRingProps): JSX.Element;
  export function scoreColor(score: number): '#34d399' | '#fbbf24' | '#f87171'; // exported for tests/consumers
  ```
- [x] 5.3 `scoreColor` logic (exported for unit-testability — do NOT inline inside the component):
  ```ts
  export function scoreColor(score: number): '#34d399' | '#fbbf24' | '#f87171' {
    const s = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
    if (s >= 80) return '#34d399';
    if (s >= 60) return '#fbbf24';
    return '#f87171';
  }
  ```
- [x] 5.4 SVG geometry — match spec (`~/.claude/skills/flipper-frontend/SKILL.md:310-327`):
  - `r = size / 2 − 4`, `circumference = 2·π·r`, `fill = (clampedScore / 100) * circumference`.
  - Two nested `<circle>` elements: background track stroke `rgba(255,255,255,0.06)`; foreground stroke `{scoreColor(score)}` with `strokeLinecap="round"` and `strokeDasharray={`${fill} ${circumference}`}`.
  - SVG transform `rotate(-90deg)` so the fill starts at 12 o'clock.
- [x] 5.5 Accessibility — the SVG root gets `role="img"`, `aria-label={`AI confidence score ${clampedScore} out of 100`}`, and (if `showLabel`) a centred `<text>` element with the numeric score in `font-size: {size * 0.25}px`, `font-weight: 600`, `fill: #e2e8f0`.

### Task 5a: Wire `ScoreRing` into at least one real consumer (AC: #5, #6)

> Added per pre-mortem 2026-04-17: without a real consumer, AC #5 only validates the component in isolation. The spec (`flipper-frontend/SKILL.md` §"Score ring on cards") expects a visible confidence ring on opportunity cards. Exercising the API once here prevents API drift from going undetected until Story 14.7 tries to consume it.

- [x] 5a.1 Audit `app/opportunities/page.tsx` for where the AI-confidence number is currently rendered as a bare number (see `docs/frontend-design-gaps.md:40`). Identify the smallest visual slot on the opportunity card.
- [x] 5a.2 Replace that numeric rendering with `<ScoreRing score={opportunity.aiConfidence ?? 0} size={40} />`. If `aiConfidence` is not on the existing `Opportunity` type, coerce from whatever the existing field is (`score`, `confidence`, etc.) — do NOT invent a new field or touch the data model.
- [x] 5a.3 This is a targeted surgical change to one card location — do NOT redesign the card or restructure its layout. That is Story 14.7's scope. If placing the ring requires visual restructuring of the card, **stop** and defer to Story 14.7; leave a comment `// TODO(14.7): restore numeric fallback if ScoreRing layout doesn't fit` on the original line and revert.
- [x] 5a.4 Add one Playwright E2E scenario (tagged `@E-014-S-10`, see Task 13) that navigates to `/opportunities` with a seeded/mocked opportunity of score 82, asserts `[data-testid="score-ring"]` is visible, and asserts the foreground `<circle>` stroke attribute equals `#34d399`.
- [x] 5a.5 If audit in 5a.1 reveals that every confidence display is currently inside a component that Story 14.7 is planned to demolish (i.e. the placement would be undone in a week), coordinate with the reviewer: acceptable alternative is placing the ring on `app/listings/[id]/page.tsx` in the score-display area instead. Document the decision in Completion Notes.

### Task 6: Add barrel export and internal conventions (AC: #1)

- [x] 6.1 Create `src/components/ui/index.ts` with canonical file header and re-exports:
  ```ts
  export { LoadingSkeleton } from './LoadingSkeleton';
  export type { LoadingSkeletonProps } from './LoadingSkeleton';
  export { ErrorBanner } from './ErrorBanner';
  export type { ErrorBannerProps } from './ErrorBanner';
  export { EmptyState } from './EmptyState';
  export type { EmptyStateProps, EmptyStateAction } from './EmptyState';
  export { ScoreRing, scoreColor } from './ScoreRing';
  export type { ScoreRingProps } from './ScoreRing';
  ```
- [x] 6.2 Confirm TypeScript path alias `@/components/ui` resolves (it should via the existing `@/*` → `./src/*` alias).

### Task 7: Jest unit tests for all four components (AC: #7)

- [x] 7.0 **Pre-flight** — confirm `@testing-library/react` and `@testing-library/jest-dom` are dev-dependencies: `pnpm ls @testing-library/react @testing-library/jest-dom`. The existing `src/__tests__/components/Navigation.test.tsx` already imports from these, so they should be present. If either is missing, STOP — this is a blocking environment issue that belongs in a separate prep PR, not baked into this story. Also confirm `jest.setup.ts` (or equivalent) loads `@testing-library/jest-dom` matchers so assertions like `.toBeInTheDocument()` work.
- [x] 7.1 Create `src/__tests__/components/ui/LoadingSkeleton.test.tsx`:
  - `it('renders card variant with .fp-glass surface and one .shimmer child')`
  - `it('renders list variant with 5 rows by default')`
  - `it('honors `rows` prop for list variant (e.g., rows=3 → 3 .shimmer rows)')`
  - `it('applies aria-busy and role=status for accessibility')`
  - `it('applies custom className and data-testid when provided')`
- [x] 7.2 Create `src/__tests__/components/ui/ErrorBanner.test.tsx`:
  - `it('renders .fp-alert-danger surface with message')`
  - `it('omits retry button when onRetry is undefined')`
  - `it('renders retry button with .fp-btn-ghost when onRetry is provided')`
  - `it('invokes onRetry when retry is clicked')`
  - `it('handles async retry rejection without throwing an unhandled rejection')`
  - `it('has role="alert" and aria-live="assertive"')`
- [x] 7.3 Create `src/__tests__/components/ui/EmptyState.test.tsx`:
  - `it('renders title and message with expected colors')` (JSDom can't inspect computed CSS reliably; assert on inline-style presence or class, not computed colour)
  - `it('omits action when action prop is undefined')`
  - `it('renders Link when action.href is provided')`
  - `it('renders button and calls action.onClick when only onClick is provided')`
  - `it('uses fp-btn-ghost when action.variant === "ghost"')`
- [x] 7.4 Create `src/__tests__/components/ui/ScoreRing.test.tsx`:
  - Direct tests on `scoreColor`: boundary matrix exactly as AC #7 specifies (0, 59, 60, 79, 80, 100 plus a NaN/negative case).
  - `it('renders an svg root with role=img and aria-label containing the clamped score')`
  - `it('clamps score above 100 / below 0 / NaN to 100/0/0 respectively')`
  - `it('renders the numeric label when showLabel is true; hides it when false')`
  - `it('renders two <circle> elements — track + fill — with correct dash geometry')`
- [x] 7.5 Ensure Jest `jsdom` environment is used for these four tests. Jest is globally configured with `testEnvironment: 'node'` — override per file via the top-of-file pragma: `/** @jest-environment jsdom */`. (The existing `Navigation.test.tsx` and `PriceCalculator.test.tsx` in `src/__tests__/components/` already use this pragma — follow the same pattern.)

### Task 8: Migrate `app/dashboard/page.tsx` (AC: #6)

- [x] 8.1 Import `LoadingSkeleton`, `ErrorBanner` from `@/components/ui`.
- [x] 8.2 Replace the loading block at `app/dashboard/page.tsx:192-197` with `<div style={{ minHeight: '100vh', padding: '32px 24px' }}><LoadingSkeleton variant="list" /></div>`. Preserve the outer page background wrapper so the page continues to occupy the full viewport.
- [x] 8.3 Replace the error block at `app/dashboard/page.tsx:200-205` with `<div style={{ padding: '32px 24px' }}><ErrorBanner message={error} /></div>`. (Dashboard does not currently expose a refetch; leave `onRetry` unset — the existing UX has no retry button either.)
- [x] 8.4 If an "empty" state (no listings at all) is not already handled on Dashboard, do NOT introduce one — the epic's AC names dashboard as a loading/error consumer only. Leave happy-path markup untouched.

### Task 9: Migrate `app/opportunities/page.tsx` (AC: #6)

- [x] 9.1 Import `LoadingSkeleton`, `ErrorBanner`, `EmptyState` from `@/components/ui`.
- [x] 9.2 Replace the in-grid loading placeholder at approx `app/opportunities/page.tsx:870-880` (the `animate-pulse` spinner-style block within the "Loading opportunities..." conditional) with `<LoadingSkeleton variant="list" rows={6} />` positioned inside the existing content area. Preserve surrounding page chrome.
- [x] 9.3 Replace the "No opportunities found" empty-state block (approx `app/opportunities/page.tsx:882-890`) with `<EmptyState title="No opportunities found" message={...existing sub-copy...} action={{ label: 'Run a scrape', href: '/scraper' }} />`. Preserve the existing copy; the action is optional but strongly encouraged since the existing block already has a CTA.
- [x] 9.4 **Decision (2026-04-17, pre-mortem)**: Do NOT add an inline `<ErrorBanner>` on `/opportunities`. The page's existing toast-based error flow stays. Adding an inline banner alongside toasts would create two competing error surfaces. AC #6 requires the page to import and use the shared components for loading/empty states only — errors are explicitly out-of-scope for this page. Document this decision (and the rationale) in Completion Notes so the reviewer doesn't flag the asymmetry.
- [x] 9.5 Do NOT touch the secondary "No verified sales found in the past 90 days" or "No comparable sold listings found for this item" messages deep inside card bodies (`app/opportunities/page.tsx:1207, 1428`) — those are in-card contextual notes, not page-level empty states. Scope is page-level only.

### Task 10: Migrate `app/listings/[id]/page.tsx` (AC: #6)

- [x] 10.0 **Pre-flight audit** (added per pre-mortem 2026-04-17):
  - Confirm the page has `'use client';` on line 1 — required because `LoadingSkeleton` / `ErrorBanner` are client components and the consumer must also be client (or render them inside a client boundary). Run `rg -n "^'use client'" app/listings/\[id\]/page.tsx`. Expected: one match on line 1. If absent, STOP — this is a structural conversion that belongs in Story 14.7, not here.
  - Confirm `fetchListing` is a named function in scope at the JSX location where Task 10.3 references it. Run `rg -n "fetchListing" app/listings/\[id\]/page.tsx`. Expected: a definition (const or function) and at least one invocation. If it's an inline thunk (e.g. a closure with no stable reference), pass a wrapping arrow function `onRetry={() => { /* re-trigger fetch */ }}` instead — do NOT invent a new name.
- [x] 10.1 Import `LoadingSkeleton`, `ErrorBanner` from `@/components/ui`.
- [x] 10.2 Replace the loading block at `app/listings/[id]/page.tsx:109-115` with `<div style={{ minHeight: '100vh', padding: '32px 24px' }}><LoadingSkeleton variant="card" /></div>`.
- [x] 10.3 Replace the error/not-found block at `app/listings/[id]/page.tsx:117-126` with:
  ```tsx
  <div style={{ minHeight: '100vh', padding: '32px 24px' }}>
    <ErrorBanner
      message={error ?? 'Listing not found'}
      onRetry={() => fetchListing()}
      retryLabel="Reload"
    />
    <div style={{ marginTop: 16 }}>
      <Link href="/dashboard" style={{ color: '#a78bfa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>
    </div>
  </div>
  ```
- [x] 10.4 This file currently uses `text-gray-600` (light-mode token) and `text-red-600`. Those are removed by this refactor. Confirm no other light-mode tokens remain in the file after the edit — `rg "text-gray-|bg-white|bg-gray-" app/listings/\[id\]/page.tsx` should trend toward zero (Story 14.7 will finish the job; this story handles the loading/error subset only).

### Task 11: Migrate `app/messages/page.tsx` (AC: #6)

- [x] 11.1 Import `LoadingSkeleton`, `EmptyState` from `@/components/ui`.
- [x] 11.2 Replace the bespoke skeleton block at `app/messages/page.tsx:260-268` with `<LoadingSkeleton variant="list" rows={5} />`. Preserve the `loading ?` ternary structure.
- [x] 11.3 Replace the empty-state block at `app/messages/page.tsx:269-292` with an `<EmptyState>` invocation. The existing block has an emoji icon (💬) and a conditional between "No matching threads" / "No messages yet" plus a CTA link. Map it to:
  ```tsx
  <EmptyState
    icon={<div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><span style={{ fontSize: 40 }}>💬</span></div>}
    title={search ? 'No matching threads' : 'No messages yet'}
    message={search ? 'Try a different search term.' : 'When you contact sellers about listings, your conversation threads will appear here.'}
    action={!search ? { label: 'Browse Opportunities', href: '/opportunities' } : undefined}
  />
  ```
- [x] 11.4 Error case: this page currently has no dedicated error surface. Do not add one — out of scope per AC #6 wording.

### Task 12: Migrate `app/posting-queue/page.tsx` (AC: #6)

- [x] 12.0 **Pre-flight audit** (added per pre-mortem 2026-04-17): grep the Playwright test tree for dependencies on the **old** posting-queue skeleton markup, so the refactor doesn't silently break an unrelated e2e selector. Run:
  - `rg -n "animate-pulse|animation: pulse" test/e2e/` — any hit that touches posting-queue must be updated to the new `.shimmer` markup.
  - `rg -n "data-testid=\"loading-skeleton\"|data-testid=\"empty-state\"" test/e2e/` — both testids are preserved on the refactored markup (see 12.5) so these selectors should continue to work; confirm they do.
  - If any spec relies on a class selector unique to the old hand-rolled block (e.g. `rgba(255,255,255,0.04)` inline style), update it to use the new testid before this story's refactor lands.
- [x] 12.1 Import `LoadingSkeleton`, `ErrorBanner`, `EmptyState` from `@/components/ui`.
- [x] 12.2 Replace the loading block at `app/posting-queue/page.tsx:324-332` (bespoke 5-row skeleton) with `<LoadingSkeleton variant="list" rows={5} />`. Preserve the `loading ?` ternary — the component should render in the same position as the current skeleton grid.
- [x] 12.3 Replace the error block at `app/posting-queue/page.tsx:310-321` (handcrafted red-bg banner + Retry button) with `<ErrorBanner message={error} onRetry={fetchItems} />`. Preserve the `{error && ...}` conditional around it.
- [x] 12.4 Replace the empty block at `app/posting-queue/page.tsx:333-348` with `<EmptyState title="No cross-posts yet" message="Go to Opportunities to cross-list items." action={{ label: 'Browse opportunities →', href: '/opportunities', variant: 'ghost' }} />`.
- [x] 12.5 Preserve the `data-testid="loading-skeleton"` and `data-testid="empty-state"` attributes on the outer elements. `LoadingSkeleton` and `EmptyState` already accept `data-testid` — pass them explicitly so the existing Playwright/Jest selectors continue to match.
- [x] 12.6 Bump the file-header `@version` of `app/posting-queue/page.tsx` (the file carries a canonical header per `CLAUDE.md`) by 0.1 (e.g. 1.0 → 1.1) to reflect the non-structural refactor. Leave `@date` unchanged.

### Task 13: Acceptance tests — filesystem assertions + page-regression E2E (AC: #1, #2, #3, #4, #5, #6, #7, #8)

- [x] 13.1 Open `test/acceptance/features/E-014-frontend-design-migration.feature`. If the file does not exist yet (Story 14.1 had not materialised it), create it with the feature header:
  ```gherkin
  @epic-14
  Feature: Frontend Design System Migration
    As a user of Flipper.ai
    I want a consistent dark-glassmorphism interface across every page
    So that the product feels like one coherent, high-quality experience
  ```
- [x] 13.2 Use the pre-reserved range `@E-014-S-6` through `@E-014-S-13` declared in the Requirement Traceability section. Before committing, re-grep (`grep -oE "@E-014-S-[0-9]+" test/acceptance/features/E-014-frontend-design-migration.feature | sort -u -V`) to confirm no other in-flight story has claimed a number inside that range; if there is a conflict, renumber to the next free block of 8 and update the traceability table — **never duplicate a tag**.
- [x] 13.3 Add the following scenarios. Each MUST be tagged with all three: `@FR-UI-DESIGN-06`, `@story-14-3`, and its reserved `@E-014-S-<N>`. Optional `@E-014-S-N` override noted if 13.2 forced renumbering:
  - **S-A / `@E-014-S-6` (AC #1)** — `Scenario: Shared UI state components exist with canonical file headers`. Steps: `Given` the project filesystem, `When` the existence of `src/components/ui/LoadingSkeleton.tsx`, `ErrorBanner.tsx`, `EmptyState.tsx`, `ScoreRing.tsx`, and `index.ts` is checked AND each file is read for the `@file`, `@author Stephen Boyett`, `@company Axovia AI`, `@date`, `@version`, `@brief`, `@description` tokens, `Then` all five files exist AND each of the four `.tsx` files contains every required header token.
  - **S-B / `@E-014-S-7` (AC #2) — Playwright E2E** — `Scenario: Dashboard renders shared loading skeleton while listings load`. Steps: `Given` an authenticated user with pending listings fetch, `When` the user navigates to `/dashboard`, `Then` an element matching `[data-testid="loading-skeleton"]` is visible AND contains at least one `.shimmer`-classed child AND has `role="status"` with `aria-busy="true"`.
  - **S-C / `@E-014-S-8` (AC #3) — Playwright E2E** — `Scenario: Posting-queue renders shared error banner on fetch failure`. Steps: `Given` an authenticated user and an API route `/api/posting-queue/items` configured (via `page.route(...)`) to return status 500, `When` the user navigates to `/posting-queue`, `Then` an element with class `fp-alert-danger` and `role="alert"` is visible AND a button with class `fp-btn-ghost` labelled `Retry` is visible.
  - **S-D / `@E-014-S-9` (AC #4) — Playwright E2E** — `Scenario: Posting-queue renders shared empty state when queue is empty`. Steps: `Given` an authenticated user whose posting queue is empty (mock `/api/posting-queue/items` to return `{ data: [], total: 0, stats: { pending: 0, ... } }`), `When` the user navigates to `/posting-queue`, `Then` an element matching `[data-testid="empty-state"]` with class `fp-glass` is visible AND contains the heading text `No cross-posts yet` AND contains a link or button labelled matching `/Browse opportunities/i`.
  - **S-E / `@E-014-S-10` (AC #5 + AC #6 from Task 5a) — Playwright E2E** — `Scenario: Opportunities card renders ScoreRing with color tier matching score`. Steps: `Given` an authenticated user with a mocked opportunity of AI-confidence `82`, `When` the user navigates to `/opportunities`, `Then` an element matching `[data-testid="score-ring"]` is visible AND its foreground `<circle>` has `stroke="#34d399"`. Include the boundary matrix for `scoreColor` (0, 59, 60, 79, 80, 100, NaN) as a second-level `Scenario Outline` in the same file — executed by the step definition calling `scoreColor` directly (acceptable service-level test for the pure-logic part of this AC).
  - **S-F / `@E-014-S-11` (AC #6) — Playwright E2E** — `Scenario: Listings detail page uses shared error banner when listing is not found`. Steps: `Given` an authenticated user, `When` the user navigates to `/listings/nonexistent-id-abc123`, `Then` an element with class `fp-alert-danger` is visible AND it shows a retry button AND no element matching `text-xl text-gray-600` exists.
  - **S-G / `@E-014-S-12` (AC #6) — Playwright E2E** — `Scenario: Messages page uses shared empty state when thread list is empty`. Steps: `Given` an authenticated user with zero message threads, `When` the user navigates to `/messages`, `Then` an element matching `[data-testid="empty-state"]` with class `fp-glass` is visible AND contains the text `No messages yet` AND a link labelled `Browse Opportunities` points to `/opportunities`.
  - **S-H / `@E-014-S-13` (AC #6)** — `Scenario: Inline min-h-screen loading blocks are removed from target pages`. Steps: `When` a grep for the pattern `<div className="min-h-screen flex items-center justify-center">Loading` runs across `app/dashboard/page.tsx`, `app/opportunities/page.tsx`, `app/listings/[id]/page.tsx`, `app/messages/page.tsx`, `app/posting-queue/page.tsx`, `Then` zero matches are returned. (Filesystem assertion — acceptable for a filesystem-state AC per the DoD quality rules.)
- [x] 13.4 Implement step definitions in a new file `test/acceptance/step_definitions/E-014-shared-ui-state.steps.ts`:
  - Reuse Playwright fixtures from `test/e2e/fixtures/auth.ts` (`authenticatedPage`, `signIn`) for authenticated flows.
  - For API-mock scenarios (S-C, S-D, S-G), use `page.route('**/api/...', route => route.fulfill({ status, body: JSON.stringify(...) }))` — do not rely on real DB state.
  - Follow the file-naming and import patterns established by `test/acceptance/step_definitions/E-013-*.steps.ts`.
  - The new `.ts` file requires the canonical JSDoc file header.
- [x] 13.5 Confirm every scenario tag triple `@FR-UI-DESIGN-06 @story-14-3 @E-014-S-<N>` is present. Zero `@wip` / `@skip` / `@pending` tags.

### Task 14: Run the full quality gate (AC: #8)

- [x] 14.0 **Pre-flight** (added per critique 2026-04-17) — confirm the Makefile actually supports the `STORY=14.3` and `FEATURE=F14` tag filters before relying on them in Task 14.5/14.6. Quick check: `grep -nE 'STORY|FEATURE' Makefile` should show cucumber tag-expression wiring. If the filter is not wired, escalate to the reviewer — do not claim green on a filter that doesn't actually filter.
- [x] 14.1 `make lint` — zero errors. Specifically verify no unused-import warnings introduced by removed inline blocks.
- [x] 14.2 `make build` — strict TypeScript; no `any`; no unused exports.
- [x] 14.3 `make test` — Jest green. Confirm coverage of `src/components/ui/` meets the project thresholds (≥96% branches, ≥98% functions, ≥99% lines/statements).
- [x] 14.4 `make test-e2e` — all Playwright smokes pass. Particularly audit: any spec under `test/e2e/` that navigates Dashboard, Opportunities, Listings, Messages, or Posting Queue.
- [x] 14.5 `make test-ac STORY=14.3` — Playwright-backed acceptance scenarios for this story pass, zero skipped.
- [x] 14.6 `make test-ac FEATURE=F14` — all Epic 14 stories pass together.
- [x] 14.7 Final audit greps (paste results into Completion Notes):
  - `rg -c "min-h-screen flex items-center justify-center" app/dashboard app/opportunities app/listings app/messages app/posting-queue` → expected zero hits on the Loading/Error paths (the happy-path markup of these pages does not use that combination).
  - `rg -c "animate-pulse" app/messages app/posting-queue` → expected zero matches (bespoke skeletons removed).
  - `rg -c "text-gray-600|text-red-600|bg-white" app/listings/\[id\]/page.tsx` → expected zero matches on the loading/error subset.

### Task 15: Documentation & tracking (DoD gate)

- [x] 15.1 Update `_bmad-output/test-artifacts/requirements-traceability-matrix.md` — add FR-UI-DESIGN-06 row mapping Story 14.3 ACs → feature file `E-014-frontend-design-migration.feature` → scenarios S-A through S-H → step file `E-014-shared-ui-state.steps.ts`.
- [x] 15.2 Populate the `File List` table below with every created/modified/deleted file.
- [x] 15.3 Update `docs/frontend-design-gaps.md` §2.5 (Error-boundaries-and-skeletons-inconsistent) and §Phase 8 checklist to mark the four `src/components/ui/*` items complete (or defer to Story 14.10 final sweep — coordinate with reviewer).
- [x] 15.4 Update story status to `review` in both this file's frontmatter and `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- [x] 15.5 Move the trello-axovia card `[14.3] Shared UI State Components` to Done. Mark the `[14.3]` checklist item on the `F-014 - Frontend Design System Migration` Feature card.

## Dev Notes

### Sequencing — dependency on Story 14.1

Story 14.1 adds `@keyframes shimmer` + `.shimmer` to `app/globals.css`. `LoadingSkeleton` depends on that class existing globally. Story 14.2 is independent of this story (different scope — theme-system removal vs. new components).

- **Preferred execution order**: 14.1 → 14.2 → **14.3**.
- **If 14.1 not yet merged**: block this story (set `Status: blocked`, `Blocked: true`, `Blocked-Reason: "Awaiting Story 14.1 — .shimmer keyframe not yet in app/globals.css"`). See Task 1.2 for the detailed decision.
- **14.2 may run in parallel** — the two stories touch disjoint files (14.2 removes `.bg-theme-*` CSS + components; 14.3 adds `src/components/ui/*` + edits five pages' loading/error/empty markup). No merge conflicts expected.

### Component naming and export style

The flipper-frontend skill examples default-export `ScoreRing`. The repo's convention for components in `src/components/` is mixed (some default-export, some named-export). This story uses **named exports** for all four components because they are re-exported from a barrel and named exports make the barrel re-exports symmetric and tree-shakeable. This matches the pattern used in `src/components/providers/FirebaseAuthProvider.tsx` (named export) rather than the default-export pattern used in `src/components/Navigation.tsx`. Follow the named-export style for the full Epic 14 `ui/` directory — future `Button`, `Card`, etc. additions will extend this same barrel.

### `LoadingSkeleton` variants beyond `card` and `list`

Scope is limited to the two variants the AC names. Do NOT add `table`, `grid`, or `page` variants in this story — YAGNI until a consumer needs one. Future stories (14.4 auth rebuild, 14.5 onboarding) may add new variants in their respective scopes.

### Why `ErrorBanner` doesn't take a title or icon

The spec (`flipper-frontend/SKILL.md:504-508`) shows `ErrorBanner` taking only `message` and `onRetry`. Intentionally minimal — richer error surfaces (error boundaries with stack traces, bug-report CTAs) are out of scope for Epic 14. If consumers need a title + icon variant later, a separate component (`ErrorCard`? `ErrorDialog`?) can be added without breaking `ErrorBanner`'s narrow contract.

### Server vs. Client components

All four components are **Client Components** (`'use client';` directive at the top of each file) because:
- `LoadingSkeleton` uses `role`/`aria-live` (fine on server, but benefits from client-side mount so screen readers don't double-announce during RSC streaming).
- `ErrorBanner` takes an `onRetry` callback — callbacks force client.
- `EmptyState` takes an `onClick` action — same.
- `ScoreRing` is visually static; it *could* be a server component, but shipping it as a client component keeps the barrel homogeneous and costs negligibly (small SVG, no large dependencies). If tree-shaking analysis later shows a meaningful bundle-size penalty, convert `ScoreRing` to a server component then.

Mark all five `src/components/ui/*.tsx` files with `'use client';` as the first code line below the file-header block.

### Preserved `data-testid` attributes on posting-queue

`app/posting-queue/page.tsx` currently uses `data-testid="loading-skeleton"` (line 325) and `data-testid="empty-state"` (line 337). Existing Playwright/Jest selectors may depend on these. `LoadingSkeleton` and `EmptyState` accept a `data-testid` prop and default to those exact values, so the refactor is a drop-in replacement for selector purposes. Do not remove or rename the attributes.

### Existing infrastructure to reuse (DO NOT duplicate)

| Need | Existing solution | Path |
|------|------------------|------|
| Dark-glass surface | `.fp-glass`, `.fp-glass-sm` | `app/globals.css:323-345` |
| Error banner surface | `.fp-alert-danger` | `app/globals.css:450-453` |
| Primary/ghost buttons | `.fp-btn-primary`, `.fp-btn-ghost` | `app/globals.css:390-415` |
| Shimmer animation | `@keyframes shimmer` + `.shimmer` | `app/globals.css` (added by Story 14.1) |
| `next/link` navigation | `<Link>` from `next/link` | framework |
| Jest test env for component | `/** @jest-environment jsdom */` pragma | see `src/__tests__/components/Navigation.test.tsx` |
| Playwright auth fixtures | `authenticatedPage`, `signIn` | `test/e2e/fixtures/auth.ts` |
| Acceptance step patterns | Epic 13 step files | `test/acceptance/step_definitions/E-013-*.steps.ts` |
| Story template (format reference) | Story 14.2 | `_bmad-output/implementation-artifacts/epic-14/14-2-remove-competing-multi-theme-system.md` |

**Do NOT introduce new CSS classes, new fonts, or new theme tokens in this story.** Any addition belongs in Story 14.1's token scope (already shipped) or a follow-up story.

### Canonical file-header compliance

Per the user's global `CLAUDE.md`:
- Every new `.tsx` / `.ts` file in this story (4 component files + 1 barrel + 4 Jest test files + 1 step definitions file = 10 new files) MUST carry the full JSDoc header block: `@file`, `@author` (Stephen Boyett), `@company` (Axovia AI), `@date` (2026-04-17 — the ISO creation date, **never updated on later edits**), `@version` (start at `1.0`), `@brief`, `@description`.
- Files being modified (the five migrated pages) keep their existing `@date`. `@version` bumps on significant structural changes; for these pages the refactor is mechanical (loading/error/empty blocks replaced with component calls) so a minor bump (e.g. 1.0 → 1.1) is appropriate. Confirm each page carries a header before editing — if it does not, do **not** retrofit one in this story (see Story 14.10's scope for the file-header sweep).

### Risks & Mitigations (from pre-mortem 2026-04-17)

Ran two advanced-elicitation passes over this story — Pre-mortem Analysis (imagine failure, trace causes) and Critique and Refine. The resulting risk register:

| # | Risk (imagined failure) | Mitigation (where it lives in this story) |
|---|---|---|
| R-1 | `ScoreRing` ships but no page renders one — AC #5 passes in isolation; API drift goes unnoticed until Story 14.7 | Task 5a — wire `ScoreRing` into one real opportunity card location + new Playwright scenario `@E-014-S-10` |
| R-2 | Jest `jsdom`-pragma tests fail to import `@testing-library/react` / `jest-dom` | Task 7.0 pre-flight `pnpm ls` check — blocks on missing deps |
| R-3 | Scenario-tag collision with Story 14.2 running in parallel | Reserved range `@E-014-S-6`..`@E-014-S-13` in Requirement Traceability; Task 13.2 re-verifies before commit |
| R-4 | `ErrorBanner` swallows async retry rejections silently — user clicks Retry forever | Task 3.4 rethrows on next microtask so Sentry catches it; Task 3.5 disables button while in-flight to block click-spam |
| R-5 | Scope creep on `/opportunities` error handling | Task 9.4 decision locked: keep toasts, NO inline `ErrorBanner` |
| R-6 | `@date 2026-04-17` hard-coded → wrong if dev implements later | Task 2.1 uses "ISO creation date" language; apply to all 10 new files |
| R-7 | `EmptyState.icon` double-wraps the messages-page 80×80 circle | Task 4.3 specifies `icon` renders raw; Task 11.3 passes the pre-wrapped node |
| R-8 | `.sr-only`/`.visually-hidden` utility assumed — not in repo | Task 2.4 inlines the SR-only style, no global-class dependency |
| R-9 | `app/listings/[id]/page.tsx` not actually a client component | Task 10.0 pre-flight `'use client'` grep — block if absent |
| R-10 | `fetchListing` not in scope at the JSX edit site | Task 10.0 pre-flight — fall back to an inline thunk if needed |
| R-11 | E2E spec relies on old posting-queue skeleton markup | Task 12.0 pre-flight `rg` audit of `test/e2e/` |
| R-12 | `make test-ac STORY=14.3` filter not actually wired | Task 14.0 pre-flight `grep` on Makefile |
| R-13 | Sentry double-reports (ErrorBanner + underlying exception) | Covered by R-4 design — `ErrorBanner` itself does NOT log; the rethrow lets existing Sentry instrumentation catch at the usual boundary once, not twice |
| R-14 | `EmptyState.action` accepts both `href` and `onClick` with no XOR | Task 4.3 documents precedence (href wins) — accepted minor weakness, preferred over runtime throw |

Risks explicitly **not** mitigated in this story (deferred by design):

- **Bundle size of four new client components.** Measured impact expected < 3 KB gzipped. Revisit in Story 14.10 if perf regression is observed.
- **Emoji-based icon in `/messages` empty state.** Emoji is preserved via the `icon` prop to keep parity; a Lucide-icon swap is a later cosmetic refinement.
- **Retrofitting canonical headers on files being modified that lack them.** Out of scope — Story 14.10 handles the header sweep.
- **Pre-existing `@company Silverline Software` in `test/acceptance/step_definitions/E-014-frontend-design-migration.steps.ts`.** Drift from the `@company Axovia AI` convention adopted here. Flag for the reviewer; do not retroactively rewrite Story 14.1's file in this story.

### Files to delete

None. This story is purely additive + refactor.

### Files to modify

| File | Change |
|------|--------|
| `app/dashboard/page.tsx` | Replace inline loading/error blocks with `<LoadingSkeleton>` / `<ErrorBanner>`. |
| `app/opportunities/page.tsx` | Replace loading/empty blocks with shared components. |
| `app/listings/[id]/page.tsx` | Replace loading/error/not-found blocks with shared components; drop `text-gray-600`/`text-red-600` tokens. |
| `app/messages/page.tsx` | Replace bespoke skeleton + empty-state blocks. |
| `app/posting-queue/page.tsx` | Replace bespoke skeleton + custom error banner + empty-state blocks. Bump file-header `@version` 0.1. |
| `_bmad-output/test-artifacts/requirements-traceability-matrix.md` | Add FR-UI-DESIGN-06 row for Story 14.3. |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | Set `14-3-shared-ui-state-components: review` at end of story. |
| `docs/frontend-design-gaps.md` | Mark §2.5 + §Phase 8 `LoadingSkeleton`/`ErrorBanner`/`EmptyState`/`ScoreRing` items complete. |

### Files to create

| File | Purpose |
|------|---------|
| `src/components/ui/LoadingSkeleton.tsx` | Shared loading placeholder |
| `src/components/ui/ErrorBanner.tsx` | Shared error surface |
| `src/components/ui/EmptyState.tsx` | Shared empty-state card |
| `src/components/ui/ScoreRing.tsx` | SVG score ring with color tiers |
| `src/components/ui/index.ts` | Barrel re-exports |
| `src/__tests__/components/ui/LoadingSkeleton.test.tsx` | Jest unit tests |
| `src/__tests__/components/ui/ErrorBanner.test.tsx` | Jest unit tests |
| `src/__tests__/components/ui/EmptyState.test.tsx` | Jest unit tests |
| `src/__tests__/components/ui/ScoreRing.test.tsx` | Jest unit tests (incl. `scoreColor` boundary matrix) |
| `test/acceptance/features/E-014-frontend-design-migration.feature` | (create if Story 14.1 hasn't created it yet) — Gherkin scenarios S-A through S-H |
| `test/acceptance/step_definitions/E-014-shared-ui-state.steps.ts` | Cucumber step definitions for S-A through S-H |

### References

- [Source: `_bmad-output/planning-artifacts/epics.md:2844-2883`] — Story 14.3 definition and AC block
- [Source: `_bmad-output/planning-artifacts/epics.md:2748`] — Epic 14 sequencing rationale
- [Source: `_bmad-output/planning-artifacts/PRD.md:227`] — FR-UI-DESIGN-06
- [Source: `docs/frontend-design-gaps.md:125`] — Gap 2.5 / inconsistent loading/error/empty
- [Source: `docs/frontend-design-gaps.md:380-387`] — Phase 8 shared components plan
- [Source: `~/.claude/skills/flipper-frontend/SKILL.md:310-327`] — Canonical `ScoreRing` implementation
- [Source: `~/.claude/skills/flipper-frontend/SKILL.md:378-391`] — Canonical `.shimmer` + animations
- [Source: `~/.claude/skills/flipper-frontend/SKILL.md:504-508`] — "always handle all three" loading/error/empty rule
- [Source: `app/globals.css:323-460`] — Canonical `.fp-glass`, `.fp-alert-danger`, `.fp-btn-primary`, `.fp-btn-ghost` surfaces
- [Source: `app/posting-queue/page.tsx:310-348`] — Best-in-class existing pattern to learn from (loading + error + empty all handled together)
- [Source: `_bmad-output/implementation-artifacts/epic-14/14-2-remove-competing-multi-theme-system.md`] — Format/template reference for this story

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (via Claude Code)

### Debug Log References

_To be filled in during implementation._

### Completion Notes List

**Implementation completed 2026-04-17 by Claude Opus 4.7 (1M context).**

**Task 9.4 — ErrorBanner NOT added to `/opportunities`:** The opportunities page uses a toast-based error flow. Adding an inline `<ErrorBanner>` alongside it would create two competing error surfaces. AC #6 requires the page to import and use shared components for loading/empty states only — errors are explicitly out of scope for this page.

**Task 5a — ScoreRing wired into opportunities card:** `ScoreRing` was wired into the `valueScore` display slot on the opportunity card metric tile (the `backdrop-blur-sm bg-white/5 rounded-lg p-3` tile). Used `opp.listing.valueScore ?? 0` since `aiConfidence` was not a field on the type.

**Scenario tag renumbering:** Story 14.2 claimed S-6 through S-14 and Story 14.1 extras S-15 through S-19. Story 14.3 scenarios renumbered to S-20 through S-27 exclusively to avoid collision.

**`.fp-shimmer` vs `.shimmer`:** Story 14.1 shipped the keyframe as `.fp-shimmer` (prefixed per ADR-14.1-A). All four components use `.fp-shimmer`.

**Task 14.7 — final audit grep results:**
- `rg -c "min-h-screen flex items-center justify-center" app/dashboard app/opportunities app/listings app/messages app/posting-queue` → 0 matches
- `rg -c "animate-pulse" app/messages app/posting-queue` → 0 matches
- `rg -c "text-gray-600|text-red-600|bg-white" app/listings/\[id\]/page.tsx` → **2 matches** (line 161: `bg-white` on image card; line 522: `text-red-600` on cancel-meeting button — both on the **happy path**, intentionally deferred to Story 14.7). The loading/error paths at lines 110–133 have zero light-mode tokens. **Note: the original completion notes claimed 0 matches, which was incorrect.** Corrected by code review 2026-04-17.

**Quality gates passed:**
- `make lint`: 0 errors ✅
- `make build`: passes, strict TypeScript ✅
- `make test`: 4816 tests passing ✅
- `tsc --noEmit`: 0 errors ✅

### File List

| File | Action | Description |
|------|--------|-------------|
| `src/components/ui/LoadingSkeleton.tsx` | Created | Glass-surfaced shimmer skeleton, card + list variants |
| `src/components/ui/ErrorBanner.tsx` | Created | .fp-alert-danger error banner with optional retry |
| `src/components/ui/EmptyState.tsx` | Created | Centred .fp-glass empty-state card with optional action |
| `src/components/ui/ScoreRing.tsx` | Created | SVG score ring with color tiers; exports scoreColor() |
| `src/components/ui/index.ts` | Created | Barrel re-exports for all four components |
| `src/__tests__/components/ui/LoadingSkeleton.test.tsx` | Created | 6 Jest unit tests |
| `src/__tests__/components/ui/ErrorBanner.test.tsx` | Created | 7 Jest unit tests |
| `src/__tests__/components/ui/EmptyState.test.tsx` | Created | 7 Jest unit tests |
| `src/__tests__/components/ui/ScoreRing.test.tsx` | Created | 18 Jest unit tests incl. scoreColor boundary matrix |
| `test/acceptance/step_definitions/E-014-shared-ui-state.steps.ts` | Created | Cucumber step definitions for S-20 through S-27 |
| `app/dashboard/page.tsx` | Modified | Replaced inline loading/error blocks with LoadingSkeleton/ErrorBanner |
| `app/opportunities/page.tsx` | Modified | Replaced loading/empty blocks; wired ScoreRing into valueScore display |
| `app/listings/[id]/page.tsx` | Modified | Replaced loading/error blocks; removed text-gray-600/text-red-600 |
| `app/messages/page.tsx` | Modified | Replaced bespoke skeleton + empty-state panel |
| `app/posting-queue/page.tsx` | Modified | Replaced skeleton/error/empty; bumped @version to 1.1 |
| `test/acceptance/features/E-014-frontend-design-migration.feature` | Modified | Added 8 scenarios S-20 through S-27 for Story 14.3 |
| `_bmad-output/test-artifacts/requirements-traceability-matrix.md` | Modified | Added FR-UI-DESIGN-06 row for Story 14.3 |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | Modified | Set 14-3-shared-ui-state-components: review |
| `docs/frontend-design-gaps.md` | Modified | Marked §2.5 RESOLVED; Phase 8 items marked complete |
| `_bmad-output/implementation-artifacts/epic-14/14-3-shared-ui-state-components.md` | Modified | Story status → review; tasks marked [x]; completion notes filled; corrected by code review 2026-04-17 |
