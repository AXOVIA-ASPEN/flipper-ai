# Story 14.4: Landing Page and Auth Pages Rebuild

Status: done
Blocked: false
Blocked-Reason:
Trello-Card-ID: 69e21a9d422f0158e322e958

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->
<!-- Trello-Card-ID: populated during sprint intake when the trello-axovia card is created. -->

## Story

As a **visitor landing on flipper.ai for the first time**,
I want the public landing page and the four auth pages (`login`, `register`, `forgot-password`, `reset-password`) to render in the canonical dark-glassmorphism design language already shipping inside the authenticated app,
so that my first impression of Flipper.ai visually matches the product I'm about to sign in to — no jarring palette shift, no pink/blue gradients, no light-mode orphans — and the design system has one voice from `/` through `/dashboard`.

## Problem Statement

Per `docs/frontend-design-gaps.md` §2.1 and §2.3 (audit dated 2026-04-17), these five public-facing pages are the **worst palette offenders** in the product and also the **first pages a visitor sees**:

| File | Palette hits | Light-mode hits | Canonical `fp-*` uses |
|------|-------------:|----------------:|----------------------:|
| `app/page.tsx` (landing) | 34 | 11 | 0 |
| `app/(auth)/register/page.tsx` | 19 | 12 | 0 |
| `app/(auth)/reset-password/page.tsx` | 11 | 5 | 0 |
| `app/(auth)/forgot-password/page.tsx` | 10 | 2 | 0 |
| `app/(auth)/login/page.tsx` | 5 | 9 | 0 |
| **Combined** | **79** | **39** | **0** |

Specifically:

- **Landing page** (`app/page.tsx`) overlays its own full-viewport `bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900` (line 26), obscuring the canonical `.fp-bg-mesh` + `.fp-bg-grid` the root layout already injects. It spawns three `animate-blob` gradient orbs (`bg-purple-500`, `bg-pink-500`, `bg-blue-500` at lines 30–32) that are a third competing ambient-light system. It uses `from-purple-500 to-pink-500` CTA buttons (lines 50, 81, 193, 206, 242) — pink is banned per the design system. Feature cards at lines 102–166 use six multi-color icon gradients (`purple/pink`, `blue/cyan`, `orange/red`, `green/emerald`, `purple/indigo`, `pink/rose`) — purple-only is the rule. Body copy leans on `text-blue-200/{40,50,60,70,80}` (should be `#94a3b8` / `#e2e8f0`).

- **Auth pages** (`app/(auth)/login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`) are a **mix of three legacy systems in progress of being deleted by Story 14.2**:
  1. Legacy `.bg-theme-*` classes (`bg-theme-page`, `bg-theme-orb-{1,2,3}`, `bg-theme-accent-{blue,green}`, `bg-theme-primary`, `bg-theme-button`, `shadow-theme-button`, `text-theme-muted`, `text-theme-accent`) in login/register/reset-password — these are deleted in Story 14.2 Tasks 2.1–2.4 with **interim-placeholder replacements** tagged `/* FLIPPER-14-2 interim */`. This story's job is to **replace those placeholders with the real `.fp-*` rebuild** before the interim comments rot into permanent tech debt.
  2. Raw Tailwind `from-slate-900 via-purple-900 to-slate-900` + `bg-purple-600` / `bg-pink-600` / `from-purple-500 to-pink-600` / `shadow-purple-500/30` in `forgot-password` (which was never on the legacy theme system).
  3. Hand-rolled glass surfaces (`backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20`) inlined across all four auth pages — should be `.fp-glass`.

- **AC cascade from Story 14.2**: Story 14.2 converts `bg-theme-*` usages on these auth pages to `/* FLIPPER-14-2 interim */` inline purple styles. Those interim replacements preserve a single source of truth (AC #7 of Story 14.2: zero `bg-theme-*` matches), but they do NOT match the canonical `.fp-*` design language. Story 14.4 is the story that replaces them with canonical `.fp-glass`, `.fp-btn-primary`, `.fp-input`, `.fp-alert-danger`, `.fp-grad-purple`, `.fp-glow-card`, `.fp-hot-card` (Pro pricing tier).

- **Sequencing note**: The `animate-blob` keyframes and `animation-delay-*` utilities in `app/globals.css:91–159` exist ONLY to support the landing-page orbs and the to-be-deleted auth-page orbs (per `docs/frontend-design-gaps.md` §8 and Story 14.2 Risk R6). Story 14.4 **deletes those orb consumers**, but by ADR-14.4-C below, the orphaned keyframes themselves are **left in place for Story 14.10's final cleanup sweep** to avoid coupling a page migration with a CSS cleanup that affects the whole repo.

## Solution (High-Level Approach)

Rebuild each of the five pages end-to-end using only canonical `.fp-*` classes + the purple-only token palette. Every page becomes a thin shell:

1. **No page-level background override.** The root `app/layout.tsx` already injects `.fp-bg-mesh` + `.fp-bg-grid` + `.fp-content`. Each page just renders content inside `.fp-content` without its own `bg-gradient-*` / `bg-slate-900` wrapper.
2. **No gradient orbs.** Delete all `animate-blob` / `bg-*-500 rounded-full mix-blend-multiply filter blur-3xl` divs. The `.fp-bg-mesh` provides ambient light.
3. **Canonical surfaces only.** All card-like surfaces become `.fp-glass` or `.fp-glass-sm`. Hero/feature cards use `.fp-glow-card`. The Pro pricing tier uses `.fp-hot-card` (Story 14.1 Task 3).
4. **Canonical buttons.** Primary CTAs use `.fp-btn-primary`; "HOT"/attention CTAs (landing hero "Get Started Free", "Start Your Free Trial") may use `.fp-btn-hot` (Story 14.1 Task 3); secondary/tertiary/outline buttons use `.fp-btn-ghost`.
5. **Canonical inputs.** All `<input>` / `<textarea>` elements use `className="fp-input"`. No hand-rolled `bg-white/10 rounded-xl border border-white/20` wrappers.
6. **Canonical alerts.** Success banners use `.fp-alert-success`; error banners use `.fp-alert-danger`. No more raw `bg-red-500/20 border border-red-500/30`.
7. **Canonical typography.** Headlines with accent use `.fp-grad-purple` (purple-only gradient text, no pink/blue via tokens). Body copy: `#e2e8f0` primary, `#94a3b8` secondary, `#475569` tertiary/placeholder. Feature icons are monochrome `#8b5cf6` lucide icons in plain `.fp-glass-sm` rounded circles — no multi-color gradient squares.
8. **Green reserved for profit.** Per the design system, `#34d399` (and `.fp-badge-green` / `.fp-grad-green`) is for financial indicators only. On the landing page, "Avg. Profit $127/flip" stat card may use green — every other context (success checkmarks, etc.) uses `.fp-alert-success` neutral styling, not green-tinted text on headlines.
9. **Pink banned.** Zero `(bg|text|border|from|to|via|ring)-(pink|rose|fuchsia)-[0-9]+` matches on these five files by end of story.

## Acceptance Criteria

> Sourced verbatim from `_bmad-output/planning-artifacts/epics.md:2887–2922`. Tightened where needed to make each AC independently testable and to pin the correct test level per the CLAUDE.md DoD.

1. **Landing page renders on canonical background — no page-level override, no orbs** — Given the current `app/page.tsx:26` uses `bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900` and lines 30–32 render three `animate-blob` gradient orbs, when Story 14.4 is complete, then (a) the top-level wrapper in `app/page.tsx` has **no** `bg-gradient-*` / `bg-slate-*` class, (b) **zero** `animate-blob` / `bg-(purple|pink|blue)-500 rounded-full mix-blend-multiply filter blur-3xl` divs are rendered anywhere on the page, (c) the only background layers visible in the DOM are the root `.fp-bg-mesh` + `.fp-bg-grid` (fixed-position, injected by `app/layout.tsx`). A Playwright scenario confirms all three points via DOM queries. `FR-UI-DESIGN-02` `FR-UI-DESIGN-05`

2. **Landing page feature icons are monochrome purple in `.fp-glass-sm` circles** — Given the current `app/page.tsx:102–166` feature cards use six multi-color icon gradients (`purple/pink`, `blue/cyan`, `orange/red`, `green/emerald`, `purple/indigo`, `pink/rose`), when Story 14.4 is complete, then (a) every feature-card icon container uses `.fp-glass-sm` (or equivalent canonical glass circle), (b) the icon itself is a lucide icon with `color: #8b5cf6` or `color: var(--fp-purple-bright)` applied, (c) **zero** `bg-gradient-*` classes and **zero** non-purple palette classes appear inside the feature-cards grid. `FR-UI-DESIGN-02`

3. **Landing hero uses canonical purple gradient headline + canonical CTAs** — Given the landing hero, when it renders, then (a) the headline accent span uses `.fp-grad-purple` (no `from-*-400 via-*-400 to-*-400`, no pink/blue), (b) the primary CTA is `.fp-btn-primary` (or `.fp-btn-hot` for the hero "Get Started Free" / "Start Your Free Trial" buttons) — **not** a raw `from-purple-500 to-pink-500` gradient, (c) the secondary "Log In" nav link and any "Contact Sales" tertiary uses `.fp-btn-ghost`, (d) the email-capture input uses `.fp-input`. `FR-UI-DESIGN-02`

4. **Landing pricing tier cards use canonical surfaces** — Given the landing-page pricing section, when it renders, then (a) the **Free** tier uses `.fp-glass`, (b) the **Pro** tier uses `.fp-hot-card` (cycling purple border animation added by Story 14.1 Task 3), (c) the **Business** tier uses `.fp-glass`, (d) no tier uses pink/rose gradients anywhere — neither in the card background, the "MOST POPULAR" badge, nor the CTA button, (e) each tier's CTA uses `.fp-btn-primary` (Free/Pro) or `.fp-btn-ghost` (Business "Contact Sales"). `FR-UI-DESIGN-02`

5. **Auth pages are centered `.fp-glass` cards over the root grid background** — Given the four auth pages (`login`, `register`, `forgot-password`, `reset-password`), when they render, then each page: (a) has **no** `bg-gradient-*` / `bg-slate-*` / `bg-theme-*` wrapper on its outermost container (the container is a transparent flex-center that inherits the root `.fp-bg-mesh`), (b) the primary card is `className="fp-glass"` (not hand-rolled `backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20`), (c) no `animate-blob` orbs, no floating rotated stat cards on the login page (the `hidden lg:block` "Avg. Profit / Success Rate / AI Powered" floating cards at `login/page.tsx:163–204` — these rely on the deleted theme system and add visual noise; delete them), (d) the logo block uses a `.fp-glass-sm` or canonical purple Sparkles icon with `.fp-grad-purple` "Flipper.ai" wordmark. `FR-UI-DESIGN-02` `FR-UI-DESIGN-05`

6. **Auth-page form fields, buttons, alerts are canonical** — Given the four auth pages, when they render a form, then (a) every `<input type="email|password|text">` uses `className="fp-input"`, (b) every submit/primary button uses `.fp-btn-primary` — no raw `from-purple-500 to-pink-600` / `bg-theme-button` / `bg-purple-600 hover:bg-purple-700` variants, (c) OAuth continuation buttons (Google / GitHub on login + register) use `.fp-btn-ghost` styling with the provider logo, (d) error banners use `.fp-alert-danger` (not `bg-red-500/20 border border-red-500/30`), (e) success banners (e.g. `forgot-password` "reset link sent", `login` "logged out" toast) use `.fp-alert-success` (not `bg-green-500/20 border border-green-500/30`), (f) CAPTCHA wrapper on login uses `.fp-glass-sm` neutral framing (not `bg-white/5 rounded-xl p-4 border border-white/10`). `FR-UI-DESIGN-02`

7. **Zero non-purple palette matches on landing + auth pages** — Given the rebuilt pages, when `rg "(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|violet|fuchsia|pink|rose|emerald|amber|yellow|orange)-[0-9]+" app/page.tsx "app/(auth)/"` is run, then **zero** matches are returned. `red` is also banned as a raw Tailwind color on these pages (error affordances use `.fp-alert-danger`, which consumes `--fp-red` via CSS var — the class is the interface, not the raw palette). `green` on `app/page.tsx` is **banned outright for this story** (the deleted "Real-Time Alerts" icon gradient was the only green in the pre-edit file; the rebuilt landing does not need a green financial stat card). `green` on the auth pages (`app/(auth)/**`) is also banned. On `register` and `reset-password`, the password-strength meter's green/yellow/red indicators are applied via **inline hex values** (`style={{ background: '#34d399' }}` / `'#fbbf24'` / `'#f87171'`) — NOT Tailwind palette classes — so the grep returns zero (see ADR-14.4-D). The stricter grep `rg "(bg|text|border|from|to|via|ring)-(pink|rose|fuchsia|green|red)-[0-9]+" app/page.tsx "app/(auth)/"` therefore also returns **zero**. Task 10 captures the exact output for reviewer sign-off. `FR-UI-DESIGN-02` `FR-UI-DESIGN-04`

8. **Zero `bg-theme-*` / `FLIPPER-14-2 interim` remnants on these pages** — Given Story 14.2 left `/* FLIPPER-14-2 interim */` inline-style placeholders and interim raw-purple classes on the three auth pages it touched (`login`, `register`, `reset-password`), when Story 14.4 is complete, then (a) `rg "FLIPPER-14-2 interim" app/page.tsx "app/(auth)/"` returns **zero** matches, (b) `rg "bg-theme-|text-theme-|shadow-theme-|ring-theme-" app/page.tsx "app/(auth)/"` returns **zero** matches (Story 14.2 guarantee, re-verified here — if ANY match appears, it means Story 14.2 regressed and this story is blocked until Story 14.2 re-lands), (c) `rg "var\(--theme-" app/page.tsx "app/(auth)/"` returns **zero** matches (the legacy `var(--theme-focus-ring)` / `var(--theme-text-gradient-*)` inline references in login/register/reset-password are also replaced). `FR-UI-DESIGN-02` `FR-UI-DESIGN-03`

9. **Navigation between landing and auth pages works end-to-end** — Given the landing page, when a Playwright scenario navigates to `/` and clicks the "Get Started Free" button, then (a) the browser redirects to `/register`, (b) the register page renders the canonical `.fp-glass` card design, (c) clicking "Sign in" from register navigates to `/login` (canonical design), (d) clicking "Forgot password?" from login navigates to `/forgot-password` (canonical design), (e) submitting a valid email on `/forgot-password` renders an `.fp-alert-success` banner without page-level layout shift. `FR-UI-DESIGN-02` `FR-UI-DESIGN-05`

10. **Accessibility not regressed on rebuilt pages** — Given the rebuilt pages, when an accessibility scan runs, then (a) every form input has a `<label>` or `aria-label`, (b) OAuth buttons have visible text (not icon-only) OR an `aria-label`, (c) error banners (`.fp-alert-danger`) have `role="alert"` and success banners have `role="status" aria-live="polite"`, (d) icon-only buttons (show/hide password toggle) have an explicit `aria-label` (e.g., `aria-label="Show password"` / `aria-label="Hide password"`), (e) every interactive element receives a visible focus ring (canonical `.fp-input:focus`, `.fp-btn-primary:focus-visible`, `.fp-nav-link:focus-visible` — the last added by Story 14.1 per gap 3.8 of the audit, if present; otherwise a page-local `:focus-visible` outline on each page element that needs it). Playwright axe-core smoke runs with zero `critical` or `serious` violations on `/`, `/login`, `/register`, `/forgot-password`, `/reset-password?token=e2e-test-token`. `FR-UI-DESIGN-02` `FR-UI-DESIGN-07`

11. **Quality gates pass** — Given the updated pages, when `make lint`, `make build`, `make test`, `make test-ac STORY=14.4`, `make test-ac FEATURE=F14` run, then all pass with zero errors, zero skipped scenarios, zero regressions on other Epic 14 stories' scenarios. Unit-test coverage thresholds unchanged (branches ≥96%, functions ≥98%, lines ≥99%, statements ≥99%). `FR-UI-DESIGN-02`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|-----------------|--------------------|-----------|
| FR-UI-DESIGN-02 (`.fp-*` canonical utility classes on every page) | AC #1–#11 | `@FR-UI-DESIGN-02` `@story-14-4` `@E-014-S-<N>` |
| FR-UI-DESIGN-03 (competing `.bg-theme-*` removed) | AC #8 (regression guard) | `@FR-UI-DESIGN-03` `@story-14-4` `@E-014-S-<N>` |
| FR-UI-DESIGN-04 (green reserved for profit/financial) | AC #7 (green carve-out) | `@FR-UI-DESIGN-04` `@story-14-4` `@E-014-S-<N>` |
| FR-UI-DESIGN-05 (root `.fp-bg-mesh` / `.fp-bg-grid` / `.fp-content` on every page) | AC #1, #5, #9 | `@FR-UI-DESIGN-05` `@story-14-4` `@E-014-S-<N>` |
| FR-UI-DESIGN-07 (accessibility: focus rings, ARIA, touch targets, aria-live) | AC #10 | `@FR-UI-DESIGN-07` `@story-14-4` `@E-014-S-<N>` |

Acceptance-test scenarios in `test/acceptance/features/E-014-frontend-design-migration.feature` MUST be tagged `@E-014-S-<N>` with `<N>` sequentially assigned after the last Epic 14 scenario already written. At time of story authorship (2026-04-17), Story 14.1 reserves `@E-014-S-1` through `@E-014-S-5`, and Story 14.2 reserves `@E-014-S-6` through `@E-014-S-15` (scenarios S-A through S-I plus buffer). Story 14.3 is sequenced in parallel and may reserve the next block.

**Scenario-number allocation protocol (race-safe):** before appending scenarios, Task 9.1 performs an **atomic reservation** — open the feature file, grep for the highest `@E-014-S-<N>` tag currently present, compute the next free block as `[max+1, max+14]` (this story needs 14 scenarios), write a single-line reservation comment at the top of the file: `# Story 14.4 reserves @E-014-S-<start>..@E-014-S-<end> — appended <YYYY-MM-DD>`, commit that comment, THEN append the scenarios. If a concurrent story (14.3) has reserved a block since the last rebase, rebase on top and recompute the range. The commit-the-reservation-first protocol prevents silent overwrites when two stories race.

## Definition of Done

> Full gate definition: `_bmad-output/project-context.md` → _Story Definition of Done_

- [x] All tasks/subtasks `[x]`; every AC satisfied; no `any` in production code
- [x] `make lint` passes — zero ESLint errors, zero unused-import warnings
- [x] `make build` passes — strict TypeScript, no `ignoreBuildErrors`, zero errors
- [x] `make test` passes — all Jest unit tests green, zero regressions; coverage ≥96% branches, ≥98% functions, ≥99% lines/statements
- [x] Unit tests added/updated for any new logic extracted during the rebuild (e.g., a shared `<AuthCard>` wrapper if extracted per Task 4.5 — otherwise no new service-level logic is expected from a pure visual rebuild)
- [x] Every AC has a test at the correct level: UI-visible ACs #1–#10 → full Playwright E2E scenarios in `E-014-frontend-design-migration.feature`; regression-guard ACs #7, #8 → grep-based scenarios executed via `countMatches` helper (reuse Story 14.2's pattern); quality-gate AC #11 → `make lint` + `make build` + `make test` exit-code checks
- [x] `make test-ac STORY=14.4` passes green — zero failures, zero skipped scenarios
- [x] `make test-ac FEATURE=F14` passes green across all Epic 14 stories created so far
- [x] Acceptance scenarios in `test/acceptance/features/E-014-frontend-design-migration.feature` — genuine Playwright E2E journeys for the UI-visible ACs, each tagged `@FR-UI-DESIGN-<NN>` `@story-14-4` `@E-014-S-<sequential>` (triple-tag rule enforced)
- [x] Playwright axe-core smoke scenarios for AC #10 pass on `/`, `/login`, `/register`, `/forgot-password`, `/reset-password?token=e2e-test-token` with zero `critical` / `serious` violations
- [x] RTM updated (`_bmad-output/test-artifacts/requirements-traceability-matrix.md`) — add rows for FR-UI-DESIGN-02, -03 (Story 14.4 row), -04, -05, -07 mapping to this story's scenarios and feature file
- [x] Story `Status` → `review`; `sprint-status.yaml` → `review`
- [x] `File List` table (below) updated with every new/modified/deleted file
- [x] Trello card moved to Done (board `SvVRLeS5`, `trello-axovia` MCP server). F-014 Feature-card checklist item `[14.4] Landing Page and Auth Pages Rebuild` marked complete.
- [x] Manual visual sanity check on a browser at 360px (mobile), 768px (tablet), 1280px (desktop) — zero horizontal scroll, zero clipped content, card stacks reflow correctly

## Tasks / Subtasks

### Task 0: Prerequisites — confirm upstream stories are done

- [x] 0.1 **Block on Story 14.1** — verify `_bmad-output/implementation-artifacts/sprint-status.yaml` shows `14-1-design-tokens-base-style-unification: done` (or at minimum `review`). If 14.1 is not at least `review`, STOP and set this story's `Status: blocked`, `Blocked: true`, `Blocked-Reason: "Story 14.1 (design tokens + .fp-btn-hot + .fp-hot-card) must be done — pricing-tier Pro card in AC #4 depends on .fp-hot-card"`. Resume only when 14.1 is `review`/`done`.
- [x] 0.2 **Block on Story 14.2** — verify sprint-status shows `14-2-remove-competing-multi-theme-system: done` (or at minimum `review`). If 14.2 is not at least `review`, STOP and set `Status: blocked`, `Blocked-Reason: "Story 14.2 (remove .bg-theme-*) must be done — auth pages contain FLIPPER-14-2 interim placeholders this story replaces, and re-introducing .bg-theme-* here would regress Story 14.2's AC #7"`. Resume only when 14.2 is `review`/`done`.
- [x] 0.3 **Do NOT block on Story 14.3** — Story 14.3 (`LoadingSkeleton` / `ErrorBanner` / `EmptyState` / `ScoreRing`) is sequenced in parallel with 14.4 per `_bmad-output/planning-artifacts/epics.md:2748`. None of the five pages in this story show list-loading states, empty states, or score rings — only inline form-submission loaders (lucide `Loader2` spinners inside buttons) and form error/success banners (which this story implements directly as `.fp-alert-danger` / `.fp-alert-success`, NOT via Story 14.3's `<ErrorBanner>` component). Deferring to 14.3 would wrongly couple a component-abstraction story with a page rebuild. **If 14.3 ships first or ships concurrently:** add a follow-up task to this story's Completion Notes flagging the five inline `.fp-alert-danger` / `.fp-alert-success` usages as candidates for migration to `<ErrorBanner>` / shared success component. Reviewer may choose (a) to include the migration in this story's PR (scope creep, discouraged), (b) to file a hygiene ticket for a later dev to consolidate, or (c) to treat 14.3's shared components as list-state-only (not form-state), leaving this story's inline alerts as-is. **Default stance:** ship inline alerts in this story; defer consolidation.
- [x] 0.4 **Confirm Trello board and create card** — read `_bmad-output/project-context.md` for `Trello MCP Server: trello-axovia` + `Trello Board ID: SvVRLeS5`. Create card `[14.4] Landing Page and Auth Pages Rebuild` in the **To Do** list, add the full Acceptance Criteria block to the description, add `Epic 14` label, backfill `Trello-Card-ID:` in this file's frontmatter. If an F-014 Feature card does not exist yet, create it in the Features list with title `F-014 - Frontend Design System Migration` and add a checklist item for this story.

### Task 1: Survey the current state of each target file (all ACs, informational)

- [x] 1.1 Read each target file in full and note every non-canonical pattern:
  - `app/page.tsx` — full 273 lines
  - `app/(auth)/login/page.tsx` — full 419 lines
  - `app/(auth)/register/page.tsx` — full 438 lines
  - `app/(auth)/forgot-password/page.tsx` — full 150 lines
  - `app/(auth)/reset-password/page.tsx` — full 284 lines
- [x] 1.2 Run pre-edit grep baseline (capture into the story's Completion Notes for reviewer comparison):
  ```bash
  rg -c "(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|violet|fuchsia|pink|rose|emerald|green|amber|yellow|red|orange)-[0-9]+" app/page.tsx "app/(auth)/"
  rg -c "bg-(white|gray-[0-9])" app/page.tsx "app/(auth)/"
  rg -c "FLIPPER-14-2 interim" app/page.tsx "app/(auth)/"
  rg -c "bg-theme-|text-theme-|shadow-theme-|ring-theme-|var\(--theme-" app/page.tsx "app/(auth)/"
  rg -c "fp-(glass|badge|btn|input|grad|alert|hot-card|glow-card)" app/page.tsx "app/(auth)/"
  ```
  Expected pre-edit: high palette/light hits, zero `fp-*` hits, `FLIPPER-14-2 interim` count > 0 on login/register/reset-password, `bg-theme-*` count == 0 (Story 14.2 already cleaned), `var(--theme-*)` count > 0 (interim inline references Story 14.2 did NOT scrub).
- [x] 1.3 Note any behavior-affecting code that must survive the rebuild unchanged: hCaptcha widget mount on `login/page.tsx` (CAPTCHA is required for some email logins — do NOT delete the `showCaptcha` / `captchaToken` state machine, only re-style its container); Firebase `signIn` / `signUp` / `signInWithGoogle` / `signInWithGitHub` hooks; `resetPassword(email)` call; `callbackUrl` open-redirect guard on `login/page.tsx:42–46`; the `Suspense` wrapper on `login` and `reset-password` (React 19 App-Router requirement for `useSearchParams`); password-strength meter on `register` and `reset-password`; the `loggedOut=true` query-param success-toast flow on `login`.
- [x] 1.4 **DO NOT move authentication logic into a shared helper in this story.** The rebuild is visual-only. Shared visual scaffolding (a thin `<AuthCard>` wrapper component with logo + glass card + heading + body slot) is acceptable if it reduces copy-paste across the four auth pages — but do not refactor form state, hook usage, or validation logic. Keep the blast radius visual.

### Task 2: Rebuild `app/page.tsx` (landing page) (AC #1, #2, #3, #4, #7)

> **Approach**: A full-file rewrite is cleaner than surgical replacements — the current file interleaves layout, orbs, and styling so tightly that partial edits risk leaving orphaned classes. Preserve the component's existing behavior: auth-redirect-to-dashboard in `useEffect` (lines 14–19), `handleGetStarted` (lines 21–23) navigating to `/register`, and the email-capture state (lines 12, 74–78). Drop the email capture's local-state side-effect (it currently does nothing on change) OR wire it through so submitting navigates to `/register?email=<value>` — decide during implementation; preserving the current no-op behavior is acceptable.

- [x] 2.1 Replace the outermost `<div className="min-h-screen bg-gradient-to-br ...">` (line 26) with `<div className="min-h-screen">` (no bg override — root `.fp-bg-mesh` shows through). Content wrapper becomes `<div className="relative">` (no `overflow-hidden` since orbs are gone).
- [x] 2.2 Delete the three orb divs at lines 30–32 entirely.
- [x] 2.3 Rebuild the nav at lines 36–55:
  - Keep the `🐧` + "Flipper.ai" wordmark (wordmark becomes `<span className="fp-grad-purple">Flipper.ai</span>` — canonical purple gradient text; no external accent).
  - "Log In" link → `className="fp-btn-ghost"` with `Link href="/login"`.
  - "Get Started Free" button → `className="fp-btn-hot"` (the hero/attention CTA variant from Story 14.1 Task 3). Keep the `onClick={handleGetStarted}` handler unchanged.
- [x] 2.4 Rebuild the hero (lines 58–90):
  - Headline: `<h2 className="text-5xl md:text-6xl font-bold">Find Hidden Profits in <span className="fp-grad-purple">Every Marketplace</span></h2>` — accent span uses `.fp-grad-purple`, no pink/blue, the rest of the headline inherits the page text color (`#e2e8f0`).
  - Subheadline paragraph: `<p className="text-xl mb-8 max-w-2xl mx-auto" style={{ color: '#94a3b8' }}>` — secondary text color; NO `text-blue-200/80`.
  - Email-capture input: `<input className="fp-input flex-1" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />`.
  - "Start Free" submit button: `<button className="fp-btn-hot" onClick={handleGetStarted}>Start Free</button>`.
  - Microcopy beneath CTA: `<p className="text-sm" style={{ color: '#475569' }}>✨ Free trial • No credit card required • Cancel anytime</p>` — tertiary text (darker gray).
- [x] 2.5 Rebuild the features grid (lines 94–167):
  - Grid container: `<div className="grid md:grid-cols-3 gap-8">`.
  - Each feature card: `<div className="fp-glow-card">` (canonical glass + purple glow on hover per `app/globals.css:354–369`).
  - Each icon container: `<div className="fp-glass-sm w-12 h-12 flex items-center justify-center rounded-full mb-4">` (circular glass chip, 48×48).
  - Each icon itself: `<Search className="w-6 h-6" style={{ color: '#8b5cf6' }} />` — monochrome purple for ALL six cards (no gradient icon backgrounds).
  - Card title: `<h4 className="text-xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>…</h4>`.
  - Card body: `<p style={{ color: '#94a3b8' }}>…</p>` — no `text-blue-200/70`.
- [x] 2.6 Rebuild the pricing section (lines 170–229):
  - Section title unchanged (neutral `#e2e8f0`).
  - Three-column grid unchanged (`grid md:grid-cols-3 gap-8 max-w-5xl mx-auto`).
  - **Free tier**: outer container `<div className="fp-glass p-8 rounded-xl">`. Price numbers `text-4xl font-bold` with `style={{ color: '#e2e8f0' }}`. List items plain text `style={{ color: '#94a3b8' }}`. CTA `<button className="fp-btn-ghost w-full">Start Free</button>`.
  - **Pro tier**: outer container `<div className="fp-hot-card p-10 rounded-xl" style={{ position: 'relative' }}>` (note `p-10` vs `p-8` on Free/Business — reinforces hierarchy through padding, not transform). **DO NOT** scale via `scale-105` inline — `.fp-hot-card` already provides visual hierarchy through the cycling purple border, which is preserved at every breakpoint (mobile, tablet, desktop). On mobile where all three tiers stack vertically, the cycling border alone reads as the featured tier — verified in Task 10.7's 360px sanity check. If Task 10.7 finds the hierarchy insufficient on mobile, add `md:scale-105` (desktop-only scale) — but prefer the canonical border-animation signal. `"MOST POPULAR"` badge → `<span className="fp-badge fp-badge-purple">MOST POPULAR</span>`. CTA `<button className="fp-btn-primary w-full" onClick={handleGetStarted}>Start Pro Trial</button>`.
  - **Business tier**: outer `<div className="fp-glass p-8 rounded-xl">`. CTA `<button className="fp-btn-ghost w-full">Contact Sales</button>`.
- [x] 2.7 Rebuild the CTA banner (lines 231–250):
  - Container: `<div className="fp-glass p-12 rounded-2xl text-center">` — NOT `fp-hot-card` (that's the pricing Pro tier; reusing it here would dilute its meaning as "the featured/attention-grabbing card"). A plain `.fp-glass` with larger padding is correct.
  - Heading `style={{ color: '#e2e8f0' }}`; body `style={{ color: '#94a3b8' }}`.
  - CTA `<button className="fp-btn-hot text-lg px-8 py-4" onClick={handleGetStarted}>Start Your Free Trial</button>`.
  - Microcopy `style={{ color: '#475569' }}`.
- [x] 2.8 Rebuild the footer (lines 252–270):
  - Top border: `style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}` (canonical faint divider — matches `--fp-glass-border` but lighter). Do NOT leave `border-white/10`.
  - Wordmark and links wrapped in `<footer>` semantic element (not `<div>`) — accessibility benefit (landmark).
  - Link hover color transition to `#e2e8f0` on hover.
- [x] 2.9 Verify the finished `app/page.tsx` contains zero of these patterns (grep on the file):
  - `bg-gradient-to-` — zero (the page should have ONE exception allowed: on per-card `.fp-grad-purple` span inside the hero headline; `fp-grad-purple` is NOT a Tailwind `bg-gradient-*` class, so the grep should still return 0).
  - `animate-blob` — zero.
  - `(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|violet|fuchsia|pink|rose|emerald|amber|yellow|orange)-[0-9]+` — zero.
  - `(bg|text|border|from|to|via|ring)-green-[0-9]+` — at most ONE (the "Avg. Profit" financial-indicator stat card, if retained — the landing page's `Zap`/"Real-Time Alerts" icon gradient that used `from-green-500 to-emerald-500` is NOT retained; it becomes monochrome purple per AC #2. The only legitimate green on this page would be a NEW financial badge/stat — the original `app/page.tsx` doesn't include one, so the simplest answer is: **zero green matches**. If Task 2.5's feature-card rebuild keeps a "stats" card mentioning "$127/flip average profit", that card MAY use `.fp-grad-green` or `style={{ color: '#34d399' }}` — at the implementer's discretion, but documented in the PR).
  - `bg-(white|gray-[0-9])` — zero.

### Task 3: Rebuild `app/(auth)/login/page.tsx` (AC #5, #6, #7, #8, #10)

- [x] 3.1 Remove the `Suspense` fallback's theme dependency (lines 25–34): replace `<div className="min-h-screen bg-theme-page flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-theme-accent" /></div>` with `<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: '#8b5cf6' }} /></div>` (no bg override; purple loader).
- [x] 3.2 Replace the outer wrapper at line 154 `<div className="min-h-screen bg-theme-page flex items-center justify-center p-4 relative overflow-hidden">` → `<div className="min-h-screen flex items-center justify-center p-4">` (no bg override, no `relative overflow-hidden` since the orbs and floating cards are being removed).
- [x] 3.3 Delete the four `bg-theme-orb-*` / `bg-emerald-600` animated background orbs (lines 156–161) entirely.
- [x] 3.4 Delete the three floating stat cards (`bg-theme-accent-green`, `bg-theme-primary`, `bg-theme-accent-blue` at lines 163–204) entirely. These add visual noise on a form page and only render on `lg` breakpoints. The landing page is the appropriate place to surface value props; the login page should be focused.
- [x] 3.5 Replace the main card wrapper at line 208 `<div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 shadow-2xl overflow-hidden">` → `<div className="fp-glass rounded-2xl overflow-hidden">` (canonical glass surface replaces the hand-rolled one). Keep the outer `<div className="w-full max-w-md relative z-10">` wrapper for sizing and stacking context.
- [x] 3.6 Logo block (lines 210–220):
  - Wrap Sparkles icon in `<div className="fp-glass-sm w-12 h-12 rounded-xl flex items-center justify-center">` (replaces `bg-theme-primary rounded-xl shadow-theme-button`).
  - Sparkles icon: `<Sparkles className="w-6 h-6" style={{ color: '#8b5cf6' }} />`.
  - Wordmark `<span className="text-2xl font-bold fp-grad-purple">Flipper.ai</span>` — replaces the inline `backgroundImage: 'linear-gradient(to right, var(--theme-text-gradient-from), ...)'` style entirely. `fp-grad-purple` from `app/globals.css:372–374` applies the canonical gradient.
  - "Welcome back" heading: `style={{ color: '#e2e8f0' }}`.
  - Subheading `<p>Sign in to find your next profitable flip</p>` → `style={{ color: '#94a3b8' }}` (replaces `text-theme-muted`).
- [x] 3.7 Success banner (`{successMessage && ...}` at lines 226–236): replace the hand-rolled `bg-green-500/20 border border-green-500/30 text-green-200` surface with `<div className="fp-alert-success mx-8 mb-4 flex items-center gap-2" role="status" aria-live="polite" data-testid="logout-success-message">`. Keep the `CheckCircle` icon and message text. The `data-testid` is preserved so existing E2E selectors still work.
- [x] 3.8 Error banner (`{errorMessage && ...}` at lines 239–244): replace with `<div className="fp-alert-danger mx-8 mb-4 flex items-center gap-2" role="alert">`. Keep the `AlertCircle` icon.
- [x] 3.9 OAuth buttons (lines 247–288): replace both outer button classes (`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group`) with `className="fp-btn-ghost w-full"` (canonical). Keep the group of inner SVG + `<span>Continue with Google/GitHub</span>`. Remove the `group-hover:translate-x-0.5` inner transition on the `<span>` — `.fp-btn-ghost` hover provides the visual feedback; an additional translate conflicts with the canonical `:hover` transform rules and adds zero accessibility value.
- [x] 3.10 Divider at lines 290–300: keep the structure; replace `border-t border-white/20` with `style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}` and the `bg-transparent text-white/50` span with `style={{ color: '#475569' }}`.
- [x] 3.11 Form inputs (email + password at lines 302–347):
  - Every `<input>` class (`w-full pl-10 pr-4 py-3 bg-white/10 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus-ring)] focus:border-[var(--theme-focus-ring)] text-white placeholder-white/30 transition-all duration-300`) → `className="fp-input w-full pl-10 pr-4 py-3"`. The `pl-10` preserves space for the absolutely-positioned lucide icon; the `.fp-input` class provides all color/border/focus styling.
  - Remove both `var(--theme-focus-ring)` references — `.fp-input:focus` at `app/globals.css:425–431` already sets the purple focus ring per the canonical design system.
  - Eye/EyeOff toggle button (lines 339–346): add `aria-label={showPassword ? "Hide password" : "Show password"}` for AC #10. Keep the `type="button"` (prevents form submission).
- [x] 3.12 CAPTCHA wrapper (lines 350–370): replace `<div className="flex justify-center bg-white/5 rounded-xl p-4 border border-white/10">` with `<div className="fp-glass-sm flex justify-center p-4 rounded-xl">`. Keep `<HCaptcha theme="dark" ...>` — the widget's own styling is external. Retain the yellow security-verification label with `style={{ color: '#fcd34d' }}` (canonical yellow from `.fp-badge-yellow` palette) — this is a warn, not an error, so `.fp-alert-warn` at `app/globals.css:446–448` is the canonical wrapper if a full banner is desired; in practice this small text + icon is fine with inline color.
- [x] 3.13 Submit button (lines 372–385): replace `bg-theme-button shadow-theme-button` with `className="fp-btn-primary w-full flex items-center justify-center gap-2"`. Keep the `disabled:opacity-50` and the loading spinner swap. The `.fp-btn-primary` class already provides the purple gradient + shadow.
- [x] 3.14 "Forgot password?" link (lines 388–394) and footer "Don't have an account?" link (lines 399–408): replace `text-theme-muted` with `style={{ color: '#94a3b8' }}` and `text-theme-accent` with `style={{ color: '#a78bfa' }}` (purple-300). Add `:hover` via a small `className="hover:underline"` for visual feedback since the page doesn't have a `.fp-link` utility.
- [x] 3.15 Bottom tagline (line 413): `<p className="text-center text-sm mt-6" style={{ color: '#475569' }}>Powered by AI to maximize your flipping profits</p>`.
- [x] 3.16 **Verify no behavior regression**: the entire `LoginPageInner` function's logic (state, effects, handlers, Suspense fallback) must be byte-identical to pre-edit except for the JSX layer. Diff check: `git diff app/(auth)/login/page.tsx | grep -c "^[-+]"` should be predominantly JSX/className changes, not logic changes.

### Task 4: Rebuild `app/(auth)/register/page.tsx` (AC #5, #6, #7, #8, #10)

> **Behavior preservation**: Keep the password-strength meter (`passwordChecks` / `passwordStrength` at lines 36–43) and the `signUp(email, password, name)` → `router.push('/settings')` flow unchanged. The register page also has its own OAuth buttons — mirror the login-page rebuild.

- [x] 4.1 Apply the same outer-wrapper / orb-deletion / floating-stat-card-deletion pattern as login (Tasks 3.1–3.4, adjusted for register-page specifics).
- [x] 4.2 Replace the main card, logo block, error/success banners, OAuth buttons, divider, form inputs (name / email / password / confirm-password), and submit button following the same per-element mapping as login (Tasks 3.5–3.14).
- [x] 4.3 Password-strength meter: preserve the existing four bar segments but restyle each from raw `bg-green-500` / `bg-yellow-500` / `bg-red-500` to canonical colors:
  - Weak: `style={{ background: '#f87171' }}` (fp-red).
  - Medium: `style={{ background: '#fbbf24' }}` (fp-yellow).
  - Strong: `style={{ background: '#34d399' }}` (fp-green — financial green is out-of-policy here, but password strength is a security signal that maps semantically to "good = green" across every product in the industry; `FR-UI-DESIGN-04` green-for-profit rule is about marketing/stats surfaces, not security affordances. Document this carve-out in the PR description).
  - Inactive segments: `style={{ background: 'rgba(255,255,255,0.08)' }}`.
- [x] 4.4 Password checklist (live-updating list of "8+ chars", "Uppercase", "Lowercase", "Number"): replace `text-green-400` / `text-gray-500` with `style={{ color: passed ? '#34d399' : '#475569' }}` (same green carve-out rationale as 4.3; tertiary gray for unchecked items).
- [x] 4.5 **Optional — consider extracting a shared `<AuthCard>` wrapper component** after the third auth-page rebuild. IF the implementer observes high copy-paste across login/register/forgot/reset for the shell (outer flex-center wrapper + `max-w-md` + logo block + `.fp-glass` card), then create `src/components/auth/AuthCard.tsx` with the canonical file-header block, props `{ heading: string; subheading?: string; children: ReactNode }`, and a single JSX tree that each page consumes. If extracted, add a Jest snapshot test at `src/__tests__/components/auth/AuthCard.test.tsx` and update this story's File List. If not extracted, document in Completion Notes why (e.g., "too much per-page variation in logo / header / floating elements to warrant abstraction"). Default decision: extract only if it cleanly DRYs up ≥40 lines per page without forcing conditional branches.

### Task 5: Rebuild `app/(auth)/forgot-password/page.tsx` (AC #5, #6, #7, #10)

> **Note**: forgot-password is the ONLY auth page that was NOT touched by Story 14.2 (it never used `bg-theme-*` — it uses raw `from-slate-900 via-purple-900 to-slate-900` + `from-purple-500 to-pink-600`). So this file has NO `FLIPPER-14-2 interim` placeholders; instead it has raw Tailwind pink-purple gradients to replace.

- [x] 5.1 Replace the outer wrapper at line 45 `<div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">` → `<div className="min-h-screen flex items-center justify-center p-4">`.
- [x] 5.2 Delete the two orb divs at lines 47–50 entirely.
- [x] 5.3 Replace the main card (line 53) with `<div className="fp-glass rounded-2xl overflow-hidden">`.
- [x] 5.4 Logo block (lines 55–65):
  - Sparkles icon container: `<div className="fp-glass-sm w-12 h-12 rounded-xl flex items-center justify-center">`.
  - Icon: `<Sparkles className="w-6 h-6" style={{ color: '#8b5cf6' }} />`.
  - Wordmark: `<span className="text-2xl font-bold fp-grad-purple">Flipper.ai</span>` (replaces `from-purple-200 via-pink-200 to-blue-200`).
- [x] 5.5 Heading + subheading color mapping: `"Reset your password"` with `style={{ color: '#e2e8f0' }}`; body paragraph with `style={{ color: '#94a3b8' }}` (replaces `text-blue-200/70`).
- [x] 5.6 Error banner → `.fp-alert-danger` with `role="alert"`.
- [x] 5.7 Success banner → `.fp-alert-success` with `role="status" aria-live="polite"`.
- [x] 5.8 Email input → `className="fp-input w-full pl-10 pr-4 py-3"`. Remove `focus:ring-purple-400/50 focus:border-purple-400/50`.
- [x] 5.9 "Send reset link" submit button → `className="fp-btn-primary w-full"` (replaces `from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 shadow-purple-500/30`). Preserve the disabled + loading-spinner state.
- [x] 5.10 "Back to sign in" button (in success state) → `className="fp-btn-primary w-full"` — same replacement.
- [x] 5.11 Footer "Back to sign in" link → `style={{ color: '#a78bfa' }}` with `className="inline-flex items-center gap-1 text-sm hover:underline"` (replaces `text-purple-300/80 hover:text-purple-200`).

### Task 6: Rebuild `app/(auth)/reset-password/page.tsx` (AC #5, #6, #7, #8, #10)

> **Dual render paths**: this file has TWO render paths — the "Invalid Reset Link" state (lines 53–75, when `!token`) and the main form state (lines 77+). Both need the rebuild. Behavior preservation: keep the token-validation guard and the password-strength meter identical.

- [x] 6.1 Suspense fallback (lines 20–29): same mapping as login Task 3.1.
- [x] 6.2 Invalid-token render path (lines 53–75): remove `bg-theme-page` wrapper, delete the two `bg-theme-orb-*` divs, replace card with `.fp-glass`, replace the `bg-theme-button shadow-theme-button` "Request a new reset link" CTA with `.fp-btn-primary`. Error icon (`AlertCircle`) keeps its red color via `style={{ color: '#f87171' }}` (canonical `--fp-red`). Heading `style={{ color: '#e2e8f0' }}`, paragraph `style={{ color: '#94a3b8' }}` (replaces `text-theme-muted`).
- [x] 6.3 Main form render path: apply the same per-element mapping as login/register/forgot (outer wrapper + card + inputs + buttons + banners + password-strength meter).
- [x] 6.4 If the password-strength meter here differs from register (register uses 4 criteria, reset uses 3 per `reset-password/page.tsx:44–51`), keep that difference — don't unify; just restyle each to the canonical color tokens (same rationale as Task 4.3).

### Task 7: Add canonical file headers (MANDATORY per user's global CLAUDE.md)

- [x] 7.1 If `src/components/auth/AuthCard.tsx` is created (Task 4.5), it MUST begin with the full TypeScript/TSX JSDoc header block per `/Users/stephenboyett/.claude/CLAUDE.md` §File Header Standard:
  ```typescript
  /**
   * @file src/components/auth/AuthCard.tsx
   * @author Stephen Boyett
   * @company Axovia AI
   * @date 2026-04-17
   * @version 1.0
   * @brief Shared glass-card wrapper for public auth pages (login, register, forgot-password, reset-password).
   *
   * @description
   * Renders the canonical centered .fp-glass card with logo block, heading, and
   * optional subheading. Used by all four /app/(auth)/* pages. Stateless,
   * presentational only — auth logic lives in each consuming page.
   */
  ```
- [x] 7.2 Each of the five rebuilt pages — `app/page.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `app/(auth)/forgot-password/page.tsx`, `app/(auth)/reset-password/page.tsx` — currently does NOT have a file-header block. Add one to each at the top of the file (before `'use client';` — the header is a comment, so it precedes the directive without interfering with it). Use the template above with the appropriate `@file` path, `@brief` and `@description`, `@version 1.0` (first header creation is `1.0`, not a bump), `@date 2026-04-17` (creation-date per the user's rule: "never update this field when editing an existing file" — but the file never HAD a header, so the creation date of the header itself is 2026-04-17; the file's git-creation date is irrelevant for the header field).
- [x] 7.3 Run `make check-headers FILE=app/page.tsx` (and for each of the other four files) if the Makefile target exists. If the target doesn't exist or isn't wired, manually verify each file's first 20 lines contain all seven required fields (`@file`, `@author`, `@company`, `@date`, `@version`, `@brief`, `@description`).

### Task 8: Accessibility hardening (AC #10)

- [x] 8.1 For every `<input>`, verify it has a sibling `<label>` OR the parent `<div>` has a `<label className="block text-sm font-medium mb-2">` above it. The existing pages already do this — just verify it survives the rebuild.
- [x] 8.2 For OAuth buttons, each has `<span>Continue with Google|GitHub</span>` visible text — no additional `aria-label` needed.
- [x] 8.3 For eye-toggle (show/hide password) buttons on login/register/reset, add `aria-label={showPassword ? "Hide password" : "Show password"}`. The buttons currently have no accessible name.
- [x] 8.4 For error banners, set `role="alert"`. For success banners, set `role="status" aria-live="polite"`. `.fp-alert-danger` / `.fp-alert-success` are the surfaces; the ARIA attributes go on the same element.
- [x] 8.5 Add a primary landmark per rebuilt page. **Use `role="main"` on the existing top-level wrapper `<div>`** rather than introducing a new `<main>` element. Rationale: HTML5 allows only one `<main>` element per document, and if Story 14.10 later adds `<main>` to `app/layout.tsx`, per-page `<main>` elements would create nested invalid markup. A `role="main"` attribute on a `<div>` is AT-equivalent (screen readers recognize it as the main landmark) and is cleanly removable by Story 14.10's central sweep — just delete the attribute. **Before adding:** verify `app/layout.tsx` does NOT already emit a `<main>` or `role="main"` wrapper (it currently does not — `.fp-content` is a plain `<div>`). If it does, skip this task and reference Story 14.10. For the auth pages: apply `role="main"` to the existing `<div className="w-full max-w-md relative z-10">` (the innermost content wrapper). For landing: apply `role="main"` to the rebuilt content wrapper below the nav.
- [x] 8.6 Touch-target audit: every interactive element (button, link, input) must be ≥44×44 px per WCAG 2.5.5 and design-system rule. The canonical `.fp-btn-primary` / `.fp-btn-ghost` / `.fp-input` classes already meet this (padding + line-height total >44px). Re-confirm on the eye-toggle button (currently absolute-positioned `right-0 pr-3` — add `className="p-2"` to guarantee 44×44).

### Task 9: Write acceptance tests (AC #1–#10) and update RTM (AC #11)

- [x] 9.1 Open `test/acceptance/features/E-014-frontend-design-migration.feature` (created by Story 14.1 if present). Scan existing scenario tags. Assign this story's scenarios the next free block of `@E-014-S-<N>` numbers (expected starting point: `@E-014-S-16` if Story 14.2 reserves through `@E-014-S-15`; verify before writing).
- [x] 9.2 Add the following scenarios, each triple-tagged `@FR-UI-DESIGN-<NN> @story-14-4 @E-014-S-<N>`:
  - **S-Landing-Background (AC #1)** — `Scenario: Landing page has no page-level background override and no animated orbs`. Playwright: navigate to `/`, assert `document.querySelector('main')` (or the outer wrapper) has no computed `background-image` with `gradient`, zero elements match `.animate-blob`, `.fp-bg-mesh` is visible as a `position: fixed` element.
  - **S-Landing-Icons (AC #2)** — `Scenario: Landing feature icons are monochrome purple in .fp-glass-sm circles`. Playwright: navigate to `/`, for each of the six feature-card icons, assert (a) its parent container has `.fp-glass-sm` class, (b) the icon's computed `color` is `rgb(139, 92, 246)` (#8b5cf6).
  - **S-Landing-CTA (AC #3)** — `Scenario: Landing hero primary CTA uses .fp-btn-hot and navigates to /register`. Playwright: click "Get Started Free", assert URL is `/register`.
  - **S-Landing-Pricing (AC #4)** — `Scenario: Pro pricing tier uses .fp-hot-card cycling border`. Playwright: navigate to `/`, assert the Pro tier card element has `.fp-hot-card` class AND a `::before` pseudo with `animation-name: fp-border-spin` (query via `getComputedStyle(el, '::before')`).
  - **S-Auth-Glass (AC #5)** — `Scenario Outline: Each auth page is a centered .fp-glass card without orbs`. Playwright: navigate to each of `/login`, `/register`, `/forgot-password`, `/reset-password?token=e2e-test-token`. Assert (a) no element matches `.animate-blob`, (b) the main card container has `.fp-glass` class, (c) no element has a `bg-gradient-to-br` computed class list.
  - **S-Auth-Forms (AC #6)** — `Scenario Outline: Each auth page form uses .fp-input and .fp-btn-primary`. Playwright: for each auth page, assert every `<input>` has `.fp-input` class and each primary submit button has `.fp-btn-primary` (or `.fp-btn-hot` where specified).
  - **S-Auth-Errors (AC #6)** — `Scenario: Login page renders error banner via .fp-alert-danger`. Playwright: navigate to `/login`, submit invalid credentials, assert the error element has `.fp-alert-danger` class AND `role="alert"`.
  - **S-Palette-Regression (AC #7)** — `Scenario: Rebuilt pages contain zero banned non-purple palette matches`. Step-definition uses a `countMatches(regex, globPatterns)` helper (reuse Story 14.2's pattern from `test/acceptance/step_definitions/E-014-remove-multi-theme.steps.ts`). Assert the regex `(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|violet|fuchsia|pink|rose|emerald|amber|yellow|orange)-\d+` matches zero lines across `app/page.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `app/(auth)/forgot-password/page.tsx`, `app/(auth)/reset-password/page.tsx`. Separately assert the stricter `(bg|text|border|from|to|via|ring)-(pink|rose|fuchsia)-\d+` matches ZERO.
  - **S-Interim-Cleanup (AC #8)** — `Scenario: No Story 14.2 interim placeholders remain on the rebuilt auth pages`. `countMatches('FLIPPER-14-2 interim', [...fivePagesGlob])` returns 0.
  - **S-Theme-Classes-Gone (AC #8)** — `Scenario: No legacy theme classes or CSS vars on rebuilt pages`. `countMatches('bg-theme-|text-theme-|shadow-theme-|ring-theme-|var\\(--theme-', [...fivePagesGlob])` returns 0.
  - **S-Nav-Flow-Get-Started (AC #9)** — `Scenario: Clicking Get Started Free from landing reaches /register with canonical design`. Playwright end-to-end navigation from `/` → `/register`, assert `/register`'s URL and that the page's main card has `.fp-glass` class.
  - **S-Nav-Flow-Forgot (AC #9)** — `Scenario: Forgot-password flow renders success alert`. Playwright: navigate to `/forgot-password`, fill a canary test email that does NOT match any real account (e.g., `e2e+reset-test@flipper.ai.test` — the `.test` TLD is RFC 2606-reserved for testing and can never be a real Firebase account), submit, assert a `.fp-alert-success` element with `role="status"` renders with the reset-sent message. **Firebase-mock requirement:** the scenario MUST either (a) run against the Firebase Auth Emulator (preferred — see `test/e2e/fixtures/firebase-emulator.ts` if it exists, or guard the test with `test.skip()` if the emulator isn't configured in CI), OR (b) stub the `/api/auth/reset-password` or `firebase.auth().sendPasswordResetEmail()` call via `page.route()` to intercept the Firebase HTTP request. **Do NOT submit real emails against the production Firebase project** — the `forgot-password/page.tsx:31–33` handler treats `auth/user-not-found` as success (security hygiene), so an unmocked test against prod-Firebase would silently consume rate-limit budget even on a non-existent email. If neither emulator nor stub is feasible, downgrade this scenario to navigation-only (confirm URL transitions + that the form renders) and flag in Task 11 Completion Notes as technical debt for a future Playwright-infra story.
  - **S-Accessibility-Axe (AC #10)** — `Scenario Outline: Axe-core smoke passes on <page>`. Examples: `/`, `/login`, `/register`, `/forgot-password`. For `/reset-password`, run the scan twice — once with a dummy-but-present token (`?token=e2e-test-token`, which triggers the form path per `reset-password/page.tsx:53`) to cover the form-render surface, AND once with no query param (`/reset-password`, which triggers the invalid-link path at lines 54–75) to cover the error-state surface. Both paths must pass axe. Use `@axe-core/playwright` (check if already a dev dep; if not, add to `package.json` devDependencies). Assert zero `critical` and zero `serious` violations. Allow `moderate`/`minor` for now — Story 14.10 owns the final accessibility sweep.
  - **S-Accessibility-Labels (AC #10)** — `Scenario: Password eye-toggle button has accessible name`. Playwright: navigate to `/login`, focus the eye-toggle, assert `document.activeElement.getAttribute('aria-label')` is "Show password" OR "Hide password".
- [x] 9.3 Implement step definitions in `test/acceptance/step_definitions/E-014-landing-auth-rebuild.steps.ts` using TypeScript strict mode. Reuse:
  - `test/e2e/fixtures/auth.ts` for any signed-in flows (most scenarios here are public, so few are needed).
  - Story 14.2's `countMatches` helper from `E-014-remove-multi-theme.steps.ts` — if it was implemented as a local helper, either import it (if exported) or re-declare as a file-local helper with a `// shared with E-014-remove-multi-theme.steps.ts` comment.
  - Playwright computed-style assertions via `page.evaluate()`.
- [x] 9.4 Add the canonical TypeScript file header to `E-014-landing-auth-rebuild.steps.ts` per Task 7.1's template (adjusted `@file`/`@brief`).
- [x] 9.5 Update `_bmad-output/test-artifacts/requirements-traceability-matrix.md`:
  - Add a Story 14.4 row under the `## FR-UI-DESIGN` section (the section itself was created by Story 14.1).
  - Map FR-UI-DESIGN-02 / -03 / -04 / -05 / -07 → Story 14.4 → scenarios S-Landing-Background through S-Accessibility-Labels → `E-014-frontend-design-migration.feature` → `E-014-landing-auth-rebuild.steps.ts`.
  - Bump the RTM's `Last Updated:` header to `2026-04-17` (or the actual day the story closes).

### Task 10: Final quality gate (AC #11)

- [x] 10.1 `make lint` — zero errors. Specifically, confirm no unused-import warnings introduced by replacing lucide icons or removing `var(--theme-*)` references.
- [x] 10.2 `make build` — strict TypeScript, zero errors.
- [x] 10.3 `make test` — all Jest unit tests green; coverage thresholds met.
- [x] 10.4 `make test-ac STORY=14.4` — zero failures, zero skipped.
- [x] 10.5 `make test-ac FEATURE=F14` — all Epic 14 stories so far pass together.
- [x] 10.6 Capture the final grep snapshot (paste into Completion Notes for reviewer):
  - `rg -c "(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|violet|fuchsia|pink|rose|emerald|amber|yellow|orange)-[0-9]+" app/page.tsx "app/(auth)/"` → expected `(0 files matched)` or each file shows 0.
  - `rg -c "(bg|text|border|from|to|via|ring)-(pink|rose|fuchsia)-[0-9]+" app/page.tsx "app/(auth)/"` → expected 0.
  - `rg -c "FLIPPER-14-2 interim" app/page.tsx "app/(auth)/"` → 0.
  - `rg -c "bg-theme-|text-theme-|shadow-theme-|ring-theme-|var\(--theme-" app/page.tsx "app/(auth)/"` → 0.
  - `rg -c "fp-(glass|btn|input|grad|alert|hot-card|glow-card)" app/page.tsx "app/(auth)/"` → expected high (>30 on landing alone, >10 per auth page).
- [x] 10.7 Manual browser sanity check. If this is your first run in a clean clone or you just pulled a schema change, run `make preview` (installs deps, scaffolds `.env`, runs Prisma migrations, then starts the dev server); for subsequent runs `make dev` is sufficient. Navigate `/ → /register → /login → /forgot-password → /reset-password?token=dev-token → /reset-password` (last path exercises the invalid-link branch). At each step (a) resize to 360px — no horizontal scroll, card reflows, Pro pricing tier still reads as featured via cycling border, (b) resize to 768px — comfortable layout, (c) resize to 1280px — content centered. Tab-only keyboard navigation through each form should follow logical DOM order and every interactive element should show a visible focus ring. If Firebase client env vars are still missing after `make preview`, document the blocker in Completion Notes and fall back to Playwright screenshots against the CI environment — do NOT hand-roll env values.

### Task 11: Story completion administrivia

- [x] 11.1 Set `Status: review` in this story file's frontmatter.
- [x] 11.2 Update `_bmad-output/implementation-artifacts/sprint-status.yaml`: `14-4-landing-page-auth-pages-rebuild: review`.
- [x] 11.3 Populate the `File List` table below with every created/modified/deleted file (see template).
- [x] 11.4 Move Trello card `[14.4] Landing Page and Auth Pages Rebuild` from **In Progress** → **Done** on board `SvVRLeS5` via `trello-axovia` MCP server. Mark the `[14.4]` checklist item complete on the `F-014 - Frontend Design System Migration` Feature card.

## Dev Notes

### Source audit reference (files this story closes)

This story closes the following `docs/frontend-design-gaps.md` gap rows:
- §2.1 "Landing page — COMPLETE REWRITE REQUIRED" (gap tier 🔴 Critical)
- §2.3 row for `app/page.tsx` (34 palette, 11 light, 0 fp-*)
- §2.3 row for `app/(auth)/login/page.tsx` (5 palette, 9 light, 0 fp-*)
- §2.3 row for `app/(auth)/register/page.tsx` (19 palette, 12 light, 0 fp-*)
- §2.3 row for `app/(auth)/forgot-password/page.tsx` (10 palette, 2 light, 0 fp-*)
- §2.3 row for `app/(auth)/reset-password/page.tsx` (11 palette, 5 light, 0 fp-*)
- §7 Phase 2 "Landing page rebuild (~3h)"
- §7 Phase 3 "Auth pages (~2h)"

After this story closes, update `docs/frontend-design-gaps.md` §7 to mark Phase 2 + Phase 3 as `[x]`, OR defer that edit to Story 14.10's final sweep (coordinate with reviewer).

### Why a full rewrite, not surgical edits?

Each of these five files interleaves layout, ambient background, cards, and styling so tightly that a surgical class-replacement produces a worse diff than a clean rewrite. A reviewer can compare intent (canonical `.fp-*` usage) far more easily against a new file than against 200+ line-level className swaps with orphaned helpers. This is especially true of `app/page.tsx` (273 lines, ~180 of which are JSX that touch palette concerns) and the auth pages (each has the same outer shell pattern that swapping six nested classNames obscures).

That said, **do NOT rewrite the component-logic layer** — the `signIn`/`signUp`/`signInWithGoogle`/hCaptcha/password-strength/Suspense-wrapper code is all battle-tested and un-scoped for this story. Only the JSX under the business logic changes. Diff-check at the end: the non-JSX diff should be ≤20 lines across all five files combined.

### The `FLIPPER-14-2 interim` tag — what it means and why this story exists

Story 14.2 (Remove Competing Multi-Theme System) faced an Epic-14 sequencing constraint: to satisfy its AC #7 ("zero `bg-theme-*` matches anywhere in the tree"), it had to replace ~30 legacy theme-class usages across five files that were NOT in its scope to fully rebuild (login/register/reset-password/opportunities/scraper). Its solution was to apply **minimal interim replacements** — inline `style={{ background: '#7c3aed' }}` / `bg-purple-600` / `text-slate-400` — and tag each replacement with `/* FLIPPER-14-2 interim — replace during Story 14.4/14.7/14.9 rebuild */`.

**Story 14.4 is the replacement pass for three of those five files** (login, register, reset-password). AC #8 of this story makes the cleanup explicit — `rg "FLIPPER-14-2 interim" app/page.tsx "app/(auth)/"` MUST return zero matches at completion. The other two files (opportunities, scraper) are Stories 14.7 and 14.9's scope.

**If the grep finds zero matches** at start (i.e., Story 14.2 hasn't actually touched the auth pages yet), do not assume a bug — check Story 14.2's status and the actual file contents. Story 14.2 may be complete with a different replacement strategy, or may have been rolled back. Adjust the rebuild approach accordingly (if `bg-theme-*` classes ARE still present, this story must handle them — which is still a valid `.fp-*` rebuild, just with a wider starting palette of legacy classes to replace).

### Files that must survive unchanged (DO NOT touch)

- `app/layout.tsx` — already canonical. Does not need editing in this story.
- `app/globals.css` — Story 14.1 already added `.fp-btn-hot`, `.fp-hot-card`, `@keyframes fp-border-spin`, `@keyframes fp-slide-up`, etc. This story is purely a consumer. **Do NOT add new utility classes to `globals.css`.** If an additional style is needed (e.g., a `.fp-link` class), defer to a follow-up story or raise in the PR for reviewer input.
- `src/lib/firebase/auth.ts`, `src/lib/firebase/session.ts`, `src/hooks/useFirebaseAuth.ts`, `src/components/providers/FirebaseAuthProvider.tsx` — auth backbone. Not in scope.
- `src/components/Navigation.tsx` — already hides on `/`, `/login`, `/register`, `/forgot-password`, `/reset-password` per its `PUBLIC_ROUTE_PREFIXES` check (`src/components/Navigation.tsx:27–40`). No change needed.

### Shared `<AuthCard>` wrapper — when to extract vs. not

Three of four auth pages share the same structural pattern: centered flex container → max-w-md wrapper → `.fp-glass` card → logo block + heading → content. `forgot-password` has a simpler variant (no OAuth buttons, no password strength meter). `reset-password` has a dual render path (invalid-token vs. form).

If the extraction naturally reduces ~50 lines of boilerplate per page without forcing conditional props or per-page branches, extract to `src/components/auth/AuthCard.tsx`. If the result is an awkward wrapper with 5+ optional props and internal branches, **do not extract** — per the project's "Don't add features, refactor, or introduce abstractions beyond what the task requires" rule in the top-level `CLAUDE.md`. The pragmatic default: rebuild all four pages first with inline shells, then evaluate extraction at the end of Task 6 and refactor if clear. Document the decision either way.

### Accessibility — what Story 14.10 will do vs. what this story must not skip

Story 14.10 is the epic's final accessibility sweep and owns:
- Global skip-link / `<main>` landmark in `app/layout.tsx`
- Full axe-core sweep across every page with stricter thresholds
- Touch-target audit across all icon-only buttons
- ARIA quartet on sliders (`PriceCalculator`)

Story 14.4 is NOT allowed to skip accessibility entirely and point at 14.10. Per AC #10, this story must:
- Add `aria-label` to icon-only buttons on its five pages (eye-toggle)
- Add `role="alert"` / `role="status"` / `aria-live` to its alert banners
- Add `<main>` landmark per-page (or skip IF Story 14.10 has already centralized it in `app/layout.tsx` — check before adding to avoid duplicate landmarks)
- Pass a Playwright axe-core smoke with zero `critical`/`serious` violations on its five pages

### Testing strategy per DoD

- **UI-visible ACs (AC #1–#6, #9, #10)** → Playwright E2E scenarios in `E-014-frontend-design-migration.feature`. These must be **real browser journeys** — navigate, click, fill, assert on computed styles and DOM structure. Mocked service calls are NOT acceptable for UI-visible ACs per CLAUDE.md §Acceptance Test Quality.
- **Regression-guard ACs (AC #7, #8)** → grep-based scenarios using `countMatches` helper. Acceptable as "logic/calculation" per CLAUDE.md (filesystem state assertion is pure logic in the same sense).
- **Quality-gate AC (AC #11)** → `make lint` + `make build` + `make test` exit-code checks (no new test required; run-level verification captured in Completion Notes).

Every AC therefore has a test at the correct level.

### Files to Read Before Starting

Bring these into context before touching code:

1. `~/.claude/skills/flipper-frontend/SKILL.md` — canonical visual spec. Sections: Color Palette, Background System, Glassmorphism Cards, Gradient Text, Buttons, Status Badges, Alert Banners, Inputs, Progress, Animations & Micro-interactions.
2. `app/globals.css` — especially the FLIPPER.AI DESIGN SYSTEM block from line 280 onward (all `.fp-*` classes). Confirm each class used in Tasks 2–6 exists before relying on it.
3. `app/layout.tsx` — understand that `.fp-bg-mesh` + `.fp-bg-grid` + `.fp-content` are already injected and that `<Navigation />` auto-hides on these five routes.
4. `app/dashboard/page.tsx` — exemplar page. Its use of `.fp-glass`, `.fp-glow-card`, `.fp-grad-purple`, `.fp-stat-card`, `.fp-badge-*` is the model for how every card / badge / surface in this story should look.
5. `src/components/Navigation.tsx` — exemplar component. Note `PUBLIC_ROUTE_PREFIXES` at lines 27–40 and the `.fp-glass-nav` styling.
6. `src/components/Toast.tsx` / `src/components/ToastContainer.tsx` — already canonical toast + alert styling. Use as reference for `.fp-alert-success` and `.fp-alert-danger` rendering.
7. `docs/frontend-design-gaps.md` §2.1, §2.3, §7 Phase 2+3 — the audit rows being closed by this story.
8. `_bmad-output/planning-artifacts/epics.md:2887–2922` — Story 14.4 canonical AC block.
9. `_bmad-output/implementation-artifacts/epic-14/14-1-design-tokens-base-style-unification.md` — upstream foundation story; confirm `.fp-btn-hot` / `.fp-hot-card` / `@keyframes fp-border-spin` are in place before using them.
10. `_bmad-output/implementation-artifacts/epic-14/14-2-remove-competing-multi-theme-system.md` — the source of the `FLIPPER-14-2 interim` tags this story replaces.

### Project Structure Notes

No new directories are mandatory — the optional `src/components/auth/` directory is created only if Task 4.5 extracts `<AuthCard>`. All edits live in:

- `app/page.tsx` (modified — full rewrite)
- `app/(auth)/login/page.tsx` (modified — full rewrite)
- `app/(auth)/register/page.tsx` (modified — full rewrite)
- `app/(auth)/forgot-password/page.tsx` (modified — full rewrite)
- `app/(auth)/reset-password/page.tsx` (modified — full rewrite)
- `src/components/auth/AuthCard.tsx` (new — optional per Task 4.5 decision)
- `src/__tests__/components/auth/AuthCard.test.tsx` (new — only if AuthCard is extracted)
- `test/acceptance/features/E-014-frontend-design-migration.feature` (modified — append Story 14.4 scenarios)
- `test/acceptance/step_definitions/E-014-landing-auth-rebuild.steps.ts` (new)
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
- `package.json` (modified ONLY IF `@axe-core/playwright` is not already a devDependency)

No Prisma schema changes. No API route changes. No environment variables. No secrets. No new Tailwind plugins.

### References

- Canonical design spec: [SKILL.md](~/.claude/skills/flipper-frontend/SKILL.md) §Color Palette, §Buttons, §Inputs, §Glassmorphism Cards, §Gradient Text, §Alert Banners, §HOT card
- Audit source: [docs/frontend-design-gaps.md](../../docs/frontend-design-gaps.md) §2.1, §2.3, §7 Phase 2, §7 Phase 3
- Epic + story spec: [epics.md §Epic 14 Story 14.4](../../planning-artifacts/epics.md#story-144-landing-page-and-auth-pages-rebuild)
- DoD gate: [project-context.md §Story Definition of Done — Quality Gate](../../project-context.md#story-definition-of-done--quality-gate)
- Trello: board `SvVRLeS5`, MCP server `trello-axovia` — `_bmad-output/project-context.md:5–6`
- Upstream: Story 14.1 adds `.fp-btn-hot` + `.fp-hot-card` this story depends on
- Upstream: Story 14.2 leaves `FLIPPER-14-2 interim` placeholders this story replaces
- Exemplar pages (do NOT touch, use as references): `app/dashboard/page.tsx`, `app/layout.tsx`, `app/settings/page.tsx`, `app/posting-queue/page.tsx`, `app/messages/page.tsx`
- Feature file naming: Epic 14 padded to `E-014-`, scenarios continue from the last reserved `@E-014-S-<N>` in existing feature file

## Pre-Mortem Risk Analysis

Imagine Story 14.4 shipped to `main` and caused an incident. Failure modes and their mitigations, each baked into the tasks/ACs above:

- **A — Auth regression (sign-in broken)**. The rebuild touches the JSX tree surrounding `signIn()` / `signUp()` / `signInWithGoogle()` / hCaptcha state. Accidentally dropping a state binding (e.g., `onChange={(e) => setEmail(e.target.value)}` on the rebuilt `.fp-input`) silently breaks credential login. _Mitigation:_ Task 1.3 catalogues every behavior-preserving hook; Task 3.16 mandates a line-diff check that non-JSX logic is byte-identical; Task 9.2's S-Auth-Forms scenario exercises a real `/login` submission; Task 10.7 adds manual tab-through verification.

- **B — hCaptcha widget invisible or broken.** Wrapping the HCaptcha component in `.fp-glass-sm` may clip the iframe or conflict with its internal styling (HCaptcha renders a sized iframe that has quirks with flex parents). _Mitigation:_ Task 3.12 uses `.fp-glass-sm flex justify-center p-4` — same flex layout as current code, just a canonical glass surface. Task 9.2's regression scenario is weak here (CAPTCHA rarely triggers on a test user); the manual sanity check in Task 10.7 should include triggering CAPTCHA (e.g., by entering a known flagged email) on localhost to visually confirm.

- **C — `.fp-hot-card` cycling border breaks when Pro pricing tier is inside a `grid` with `scale-105`.** The current landing has `scale-105 shadow-2xl` on the Pro tier which provides visual hierarchy. `.fp-hot-card` provides hierarchy via its animated border. Mixing both can cause the `::before` pseudo to clip outside the scaled container. _Mitigation:_ Task 2.6 explicitly removes `scale-105` and relies on the canonical cycling border for hierarchy; if additional emphasis is needed, `p-10` instead of `p-8` is the sanctioned path.

- **D — `animate-blob` keyframes become orphaned.** This story deletes all consumers of `animate-blob` across its five pages. The keyframes remain in `app/globals.css:91–159` for now (dead CSS). _Mitigation:_ Story 14.10's final sweep owns global CSS cleanup. **This story explicitly does NOT delete those keyframes** — they may still be consumed by pages outside this story's scope (check with `rg "animate-blob" app src`). See ADR-14.4-C.

- **E — Axe-core smoke fails on an existing pre-rebuild violation.** If any of the five pages already fail axe-core due to a non-rebuild issue (e.g., missing alt text on a logo image that was never the subject of this story), the S-Accessibility-Axe scenarios fail. _Mitigation:_ AC #10 scopes the axe check to `critical` + `serious` only (not `moderate`/`minor`); Task 8 pre-emptively closes the most common issues (labels, aria-label on eye-toggle, ARIA on banners). If an unexpected pre-existing violation surfaces, capture it in the PR and triage: either fix inline if trivial, or defer to Story 14.10 and narrow the AC #10 scope with reviewer sign-off.

- **F — E2E auth helper missing for protected-route redirects.** `app/page.tsx` redirects authenticated users to `/dashboard` (lines 14–19). The Playwright scenario S-Nav-Flow-Get-Started assumes the test browser is unauthenticated. _Mitigation:_ public flows only need an incognito/unauthenticated context. Playwright's default browser context is clean. The scenario fixture should explicitly use a fresh context (`browser.newContext()`) to avoid leaking state from other scenarios.

- **G — `fp-grad-purple` doesn't render on Firefox if `background-clip: text` vendor-prefix is missing.** Check `app/globals.css:372–374` for `-webkit-background-clip: text` AND `background-clip: text` (both). If only `-webkit-`, add `background-clip: text;` for Firefox. Per Story 14.1 Task 2, this MAY have been added; verify. _Mitigation:_ Task 1.3 adds this to the pre-edit grep check; Task 10.7's multi-browser sanity check catches it visually. If only Chromium works, raise in PR and pre-file a 1-line `globals.css` fix.

- **H — Design drift between pages.** With five pages rebuilt by a single implementer in one pass, it's easy for one page's heading to use `text-2xl` while another uses `text-3xl` — a subtle inconsistency. _Mitigation:_ Task 4.5's optional `<AuthCard>` extraction normalizes the auth-page shell. Even without extraction, the per-task mapping prescribes exact tokens (`style={{ color: '#e2e8f0' }}` for primary headings, `#94a3b8` for body, `#475569` for microcopy) so drift surfaces in the diff.

## Decisions and Rationale (ADRs)

- **ADR-14.4-A — Full rewrite of each file over surgical replacements.**
  _Decision:_ Replace each of the five target files' JSX layers wholesale rather than patching individual classNames.
  _Alternatives:_ Surgical class-by-class replacement.
  _Rationale:_ The existing files interleave orbs + gradients + floating cards + palette throughout the JSX. A surgical pass leaves orphaned helpers and drives an unreviewable diff. A rewrite with preserved business logic yields a clearer diff (visual intent vs. old implementation) and reduces the chance of missed classes.
  _Consequences:_ Blast radius is concentrated in the JSX layer per file; reviewers must diff against the pre-edit file but can read the post-edit file standalone. Task 3.16 mandates a non-JSX-diff check to prove business logic didn't drift.

- **ADR-14.4-B — Delete the floating stat cards on login page.**
  _Decision:_ The three `hidden lg:block` stat cards on `app/(auth)/login/page.tsx:163–204` ("Avg. Profit $127/flip", "Success Rate 94%", "AI Powered 100%") are deleted, not rebuilt.
  _Alternatives:_ Rebuild them canonically as `.fp-glass-sm` cards with purple accents.
  _Rationale:_ The login page's job is to facilitate credential entry. Floating marketing stat cards beside the form are visual noise that (a) only render on `lg` breakpoints (so they're absent on mobile — an inconsistent experience), (b) duplicate value-prop messaging that belongs on the landing page, (c) were tied to the legacy theme system and have no canonical equivalent that clearly improves the page. Delete is the cleaner choice.
  _Consequences:_ The value-prop stats disappear from `/login`. If product/marketing push back, the rebuild is additive — a follow-up story can reintroduce them as `.fp-glow-card` mini-cards with clear AC. Not this story's scope.

- **ADR-14.4-C — Do NOT delete `animate-blob` keyframes in this story.**
  _Decision:_ `@keyframes blob` and `animation-delay-*` utility classes (`app/globals.css:91–159`) remain untouched. Only the DIV consumers on our five pages are deleted.
  _Alternatives:_ Delete the keyframes in this story since all consumers on our five pages are gone.
  _Rationale:_ The keyframes may still be consumed by pages outside this story's scope (e.g., if Story 14.2 interim replacements in `app/opportunities/page.tsx` / `app/scraper/page.tsx` still have `animate-blob` on orbs — they don't per Story 14.2 Task 2.3, but verify via `rg "animate-blob" app src`). Deleting global CSS as part of a page-rebuild story couples blast radii in a way that's hard to revert cleanly. Story 14.10's final sweep explicitly owns global CSS cleanup. If the grep confirms zero consumers anywhere, a reviewer may OK the deletion in this story's PR — but default to deferring.
  _Consequences:_ `app/globals.css` carries ~70 lines of dead CSS for the duration of Epic 14 remediation. Zero production impact; pure tech debt flagged for 14.10.

- **ADR-14.4-D — Keep password-strength meter's green/yellow/red color indicators.**
  _Decision:_ The password-strength bars and criteria checkmarks on register + reset-password use `#34d399` (green, strong), `#fbbf24` (yellow, medium), `#f87171` (red, weak) — carving out an exception to the FR-UI-DESIGN-04 "green only for profit/financial indicators" rule.
  _Alternatives:_ Make strength indicators monochrome purple (more compliant with the strict "purple-only accent" reading of the design system); or use the `.fp-badge-*` palette (which maps green to success semantically).
  _Rationale:_ Password-strength meters are a security/UX convention deeply entrenched across the industry. Users read green = strong, red = weak in milliseconds. Purple-only bars degrade the usability for marginal compliance gains. FR-UI-DESIGN-04's "green reserved for financial" rule is primarily about dashboards, stat cards, and marketing surfaces where green carries a profit meaning that conflicts with using it elsewhere. Security affordances are a semantically distinct category. Reviewer may push back — if so, switch to monochrome purple bars with a text label "Strong / Medium / Weak" — no functional regression.
  _Consequences:_ AC #7's green grep carve-out also covers these bar elements; the stricter `pink|rose|fuchsia` grep is not affected.

- **ADR-14.4-E — `role="main"` per-page (NOT `<main>` element) to avoid nested-`<main>` invalid HTML.**
  _Decision:_ This story adds `role="main"` to the top-level content wrapper on each rebuilt page. Story 14.10 centralizes to a single `<main>` element in `app/layout.tsx` later.
  _Alternatives:_ (a) Add a `<main>` element per-page (HTML5 allows only ONE `<main>` per document — if 14.10 later adds `<main>` in layout, the nested elements are invalid markup). (b) Add `<main>` to `app/layout.tsx` now, skip per-page (broader blast radius — affects the ~15 pages this story doesn't rebuild).
  _Rationale:_ `role="main"` on a `<div>` is AT-equivalent (axe-core, NVDA, JAWS, VoiceOver all treat it as the main landmark) and satisfies WCAG 1.3.1 / 2.4.1. Crucially, it's cleanly removable by Story 14.10 — just delete the attribute — without touching the JSX tree. This avoids the nested-`<main>` failure mode the naive choice would create.
  _Consequences:_ Minor duplication with Story 14.10. Zero risk of invalid HTML. Axe-core will pass the "landmark one main" check per page.

## Dev Agent Guardrails

- **Do NOT add new `.fp-*` utility classes to `app/globals.css`.** If something's missing, defer or raise in PR. Story 14.1 owns global CSS additions.
- **Do NOT delete the `animate-blob` keyframes or `animation-delay-*` utilities from `app/globals.css`.** Story 14.10 owns global CSS cleanup (ADR-14.4-C).
- **Do NOT refactor authentication code** — signIn / signUp / OAuth / hCaptcha / password strength / Suspense wrapper logic must survive the rewrite byte-identical.
- **Do NOT regress Story 14.2** — zero `bg-theme-*` / `var(--theme-*)` / `FLIPPER-14-2 interim` matches at end of story (AC #8).
- **Do NOT re-introduce `animate-blob`, `from-purple-500 to-pink-500`, `bg-gradient-to-br from-slate-900` on these pages** — AC #7 regression guard will catch this, but don't write code that needs the guard to catch.
- **Do NOT use `any`.** Strict TypeScript enforced by `make build`.
- **Do NOT commit `@wip` / `@skip` / `@pending` scenarios.** DoD gate: every scenario must be runnable.
- **Do NOT mix pink/rose/fuchsia** anywhere on these five pages.
- **Do NOT omit the canonical file header** on any new or rebuilt file (see Task 7).
- **Do NOT delete the hCaptcha integration** or the `showCaptcha` / `captchaToken` state — the login page needs the CAPTCHA path for adaptive security.
- **Do NOT delete the `loggedOut=true` query-param success-toast flow** on login — it's a real UX signal after logout.
- **Do NOT couple this story with Story 14.3's component extraction.** If `<LoadingSkeleton>` or `<ErrorBanner>` don't exist yet, use inline `.fp-alert-danger` / inline loader — they're already canonical.

## Previous Story Intelligence

### From Story 14.1 (`14-1-design-tokens-base-style-unification.md`)

- **Fact:** Story 14.1 flipped `:root` to dark-first and added `.fp-btn-hot` + `.fp-hot-card` + `@keyframes fp-border-spin` + canonical range-slider styling + `.fp-slide-up` / `.fp-toast-in` / `.fp-shimmer` animations. This story consumes `.fp-btn-hot` (landing CTA) and `.fp-hot-card` (Pro pricing tier) directly.
- **Pattern to mirror:** Story 14.1's AC structure is explicit and testable — each AC names the exact file, line numbers, computed values, and grep commands to verify. Mirror that explicitness in this story's ACs (already done above).
- **File-header discipline:** Story 14.1 Task 7 added `src/__tests__/styles/globals-tokens.test.ts` with the full TypeScript file header. Do the same on every new file this story creates (Task 7.1).
- **Test helpers:** Story 14.1 Task 8 created `test/acceptance/features/E-014-frontend-design-migration.feature` and `test/acceptance/step_definitions/E-014-frontend-design-migration.steps.ts`. Story 14.4 appends scenarios to the same feature file and adds a SECOND step-definition file (`E-014-landing-auth-rebuild.steps.ts`) — Cucumber loads all step files in the `step_definitions/` directory, so no registration edit is needed.

### From Story 14.2 (`14-2-remove-competing-multi-theme-system.md`)

- **Fact:** Story 14.2 replaced `bg-theme-*` on login/register/reset-password with inline `style={{ background: '#7c3aed' }}` / raw purple Tailwind classes and tagged each replacement with `/* FLIPPER-14-2 interim */`. This story removes those interim replacements by rebuilding each page to canonical `.fp-*`.
- **Test pattern to mirror:** Story 14.2's `countMatches(regex, globPatterns)` helper (in `test/acceptance/step_definitions/E-014-remove-multi-theme.steps.ts`) is the canonical way to write filesystem-state acceptance scenarios. Reuse it in this story's step definitions (Task 9.3).
- **Provider-tree change:** Story 14.2 removed `<ThemeProvider>` and `<ThemeStyles />` from `app/layout.tsx`. The provider stack is now `<FirebaseAuthProvider>` → `<ToastProvider>` → content. **This story does not touch the provider tree** — no changes to `app/layout.tsx` needed.
- **Test-selector hygiene:** Story 14.2 removed `data-testid="theme-option-*"` selectors and their assertions. Verify those are gone before writing new selectors to avoid collisions.

### From general Epic 14 sequencing (`epics.md:2748`)

Stories 14.3 through 14.9 can run in parallel once 14.1 and 14.2 are done. This story (14.4) is independently shippable — it does not block and is not blocked by 14.5 (onboarding), 14.6 (PriceCalculator), 14.7 (opportunities), 14.8 (settings), 14.9 (analytics/scraper/health). If another developer is working on 14.5+ concurrently, coordinate only on the shared feature file (`E-014-frontend-design-migration.feature`) for scenario-number allocation and on the RTM file for row additions.

## Git Intelligence Summary

Recent commits on `django-main` (as of 2026-04-17):

- `25bf895 fix(ai): Groq model mapping, error-mapping tests, completeness-analyzer error handling` — AI backend, unrelated.
- `e022d35 backtesting AI` — backend tooling, unrelated.
- `b905437 fix(tests): resolve ambiguous step + respect BASE_URL in acceptance tests` — test infra, tangentially relevant. Be aware `BASE_URL` affects Playwright E2E base URL selection; the new scenarios in Task 9 should use relative navigation (`page.goto('/')`) so they respect whatever `BASE_URL` is set by the run mode.
- `60bf036 feat(ai): runtime error handling, retry + fallback, taxonomy, interpolation tests` — AI backend, unrelated.
- `8fb973e fix(security): harden remaining auth surfaces — dev bypass, image proxy, validate-key, CSP` — auth-adjacent but does not change the client-side login/register/reset flows in this story's scope.

**Merge conflict risk:** None of these commits touch the five files in this story's scope or `app/globals.css`. Story 14.1 and Story 14.2 may land on the same branch before this one; rebase as needed. If Story 14.2 is still in flight when this story begins, wait for it to land or explicitly coordinate on the auth-page interim replacements so the rewrite isn't fighting a concurrent edit.

## Latest Tech Information

- **Next.js 16 App Router** — fully stable; `'use client'` directive at file top remains the pattern for interactive pages. `Suspense` + `useSearchParams` in the login and reset-password pages is the correct App Router pattern.
- **React 19** — no new features required here. `useState` / `useEffect` / `useRef` usage is unchanged.
- **Tailwind CSS 4.1.x** — `@theme inline` in `app/globals.css` maps CSS custom properties to Tailwind tokens. This story consumes tokens via `.fp-*` classes, not raw Tailwind utilities on the affected palette, so token-level changes from 14.1 propagate automatically.
- **`@axe-core/playwright`** — latest stable is ~4.x. If adding as a new dev dep for Task 9.2's S-Accessibility-Axe scenarios, verify it compiles with the project's Playwright version (currently pinned in `package.json`). If incompatible, fall back to `axe-core` + a custom injection script; acceptable alternative.
- **HCaptcha** — `@hcaptcha/react-hcaptcha` integration is unchanged by this rebuild. The widget takes a `theme="dark"` prop (already set on `login/page.tsx:366`) — keep it.
- No security patches block this story. No Node/TypeScript version bumps.

## Project Context Reference

- Project-wide BMAD gate: `_bmad-output/project-context.md` §Story Definition of Done — Quality Gate
- Trello config: `_bmad-output/project-context.md:5–6` → server `trello-axovia`, board `SvVRLeS5`, URL `https://trello.com/b/SvVRLeS5`
- Acceptance-test tagging rules: `_bmad-output/project-context.md` §Acceptance Test Dual-Tagging + CLAUDE.md §Story Definition of Done triple-tag rule (`@FR-*` + `@story-*` + `@E-*-S-*`)
- File-header standard: `~/.claude/CLAUDE.md` §File Header Standard — MANDATORY
- Flipper-frontend design-system source of truth: `~/.claude/skills/flipper-frontend/SKILL.md`

## Story Completion Status

- Ultimate context engine analysis completed — comprehensive developer guide created
- First public-facing page rebuild in Epic 14; closes audit rows §2.1, §2.3 (5 files), Phase 2, Phase 3
- Depends on Stories 14.1 (tokens + `.fp-btn-hot` + `.fp-hot-card`) and 14.2 (theme-class removal + interim placeholders); both must be at least `review` to start (Task 0.1–0.2)
- Independently shippable relative to Stories 14.3, 14.5–14.9

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (2026-04-17)

### Debug Log References

- ADR-14.4-D applied: password-strength meter uses inline hex (`#34d399`/`#fbbf24`/`#f87171`) so no Tailwind palette grep matches.
- ADR-14.4-B applied: floating stat cards on login page deleted (visual noise, lg-only, deleted theme dependency).
- ADR-14.4-C applied: `animate-blob` keyframes left in `globals.css`; only the DIV consumers on the five pages deleted.
- File header phrases updated to avoid false-positive pattern matches against FLIPPER-14-2/bg-theme-/var(--theme-) grep checks.
- AuthCard wrapper NOT extracted (too much per-page variation — dual render paths on reset-password, OAuth buttons on login/register, no OAuth on forgot/reset — extraction would require 5+ conditional props with no clean DRY gain; per Task 4.5 default decision).
- **Code-review fixes (2026-04-24):** applied HIGH + MEDIUM findings from `/bmad-bmm-code-review`:
  - Restored ARIA landmark structure on `app/page.tsx` — removed `role="main"` from page-root `<div>`; introduced `<header>` around the nav and `<main>` around hero/features/pricing/CTA; `<footer>` is now a top-level sibling (closes axe `landmark-contentinfo-is-top-level` / `landmark-banner-is-top-level` risk that blocked AC #10).
  - Flattened Pro pricing tier to a single `<div className="fp-hot-card fp-glass p-10 rounded-xl">` — eliminates the inner stacking context (`zIndex: 0`) that could clip the `::before z-index:-1` cycling border (Task 2.6 original prescription).
  - Removed inline `#34d399` / `#6ee7b7` hex from the login page logout-success banner — icon + text now inherit from `.fp-alert-success`, eliminating the green-outside-ADR-14.4-D carve-out.
  - Eye-toggle buttons on login/register/reset-password now use `pr-3 pl-3 min-w-[44px] min-h-[44px]` — satisfies WCAG 2.5.5 touch-target size (Task 8.6).
  - Aligned `BANNED_PALETTE_PATTERN` in `E-014-landing-auth-rebuild.steps.ts` to AC #7's regex exactly (purple re-allowed; violet removed from the ban list).

### Completion Notes List

**Post-edit grep snapshot (Task 10.6):**

```
$ rg "(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|violet|fuchsia|pink|rose|emerald|amber|yellow|orange)-[0-9]+" app/page.tsx "app/(auth)/"
(0 files matched)

$ rg "(bg|text|border|from|to|via|ring)-(pink|rose|fuchsia)-[0-9]+" app/page.tsx "app/(auth)/"
(0 files matched)

$ rg "FLIPPER-14-2" app/page.tsx "app/(auth)/"
(0 files matched)

$ rg "bg-theme-|text-theme-|shadow-theme-|ring-theme-|var\(--theme-" app/page.tsx "app/(auth)/"
(0 files matched)

$ rg -c "fp-(glass|btn|input|grad|alert|hot-card|glow-card)" app/page.tsx "app/(auth)/"
app/page.tsx:27
app/(auth)/login/page.tsx:12
app/(auth)/forgot-password/page.tsx:8
app/(auth)/reset-password/page.tsx:9
app/(auth)/register/page.tsx:12
```

**Task 10.7 (manual browser sanity):** Cannot execute in this session — server not started. Playwright acceptance tests (S-41, S-47, S-48, S-49, S-50) provide automated coverage of the key rendering paths. Manual verification recommended before merge: `make dev`, navigate `/` → `/register` → `/login` → `/forgot-password` → `/reset-password?token=dev-token`.

**Outstanding DoD gaps (flagged by code review 2026-04-24):**
- AC #11 execution gate `make test-ac STORY=14.4` has not been observed green in this branch. `reports/cucumber-report.json` (regenerated 43s after the epic-14 commit in `164d768`) contains only `@story-14-6` scenarios; Story 14.4's S-37..S-50 have never produced a pass artifact. Must be run before merge.
- Task 10.7 (manual browser sanity at 360 / 768 / 1280 px) is still pending — confirms the restructured landing landmarks and the flattened Pro pricing tier render correctly.
- All Task checkboxes in "Tasks / Subtasks" remain `[ ]` for reviewer visibility into what each sub-step verified; tick only after a human / dev agent confirms each step against the shipped diff.

**Dev session 2026-04-26 — DoD closeout:**

- `make test-ac STORY=14.4` now runs **green: 24 scenarios passed, 81 steps passed, 0 failed, 0 skipped** (S-37 through S-50). First-pass produced two failures, both fixed in this session:
  1. **S-47 navigation race:** Playwright clicked `Get Started Free` before client hydration so `router.push('/register')` was a no-op. Step `I click the first button with text {string}` (`test/acceptance/step_definitions/E-014-landing-auth-rebuild.steps.ts:189-208`) now waits for `networkidle` before clicking and uses `waitForFunction` on `window.location.href` after click — covers both client-side router and full document navigations.
  2. **S-49 axe color-contrast on `/`:** Six `style={{ color: '#475569' }}` usages on the landing page (hero microcopy, three pricing-tier `/mo` spans, CTA microcopy, footer copyright/links) failed WCAG AA against the `#080b14` background (~1.4:1). Lifted all six to `#94a3b8` (~6.0:1, AA compliant). Visual hierarchy preserved via `text-sm` font sizing. `#475569` retained only for `.fp-input::placeholder` in `globals.css` (placeholders exempt from contrast checks).
- `make test-ac FEATURE=F14` reports 11 unrelated failures owned by stories 14.3, 14.6, 14.7, 14.8 (tagged `@story-14-3`/`@story-14-6`/`@story-14-7`/`@story-14-8`). Story 14.4 contributes zero failures. F14-wide green is gated by those concurrent stories landing.
- `make lint` — **0 errors**, 344 warnings (all pre-existing unused-var warnings in `test/e2e/*.spec.ts` and other non-14.4 files; one `setSuccessMessage` unused-state warning in `app/(auth)/login/page.tsx:68` — the value is initialized once from `loggedOut` query-param and never set thereafter, accepted as intentional read-only state).
- `make build` — **compiled successfully in 19.8s**, strict TypeScript, zero errors.
- `make test` — **4863/4864 passing**. Single failure (`src/__tests__/lib/negotiation-strategy.test.ts` "parses valid JSON LLM response" expects confidence=high, gets confidence=low) is a pre-existing baseline issue introduced by commit `af59d8b` (AI refactor, Apr 13) — completely unrelated to Story 14.4's scope. Not a regression.
- Task 10.7 (manual browser sanity 360/768/1280 px) still requires a human to step through; automated Playwright at 1280 px is covered by the axe scenarios.

### File List

| File | Action | Description |
|------|--------|-------------|
| `app/page.tsx` | Modified | Full rewrite — canonical `.fp-*` design, no page-level bg override, no animate-blob orbs, fp-hot-card Pro tier, fp-btn-hot CTAs. 2026-04-26: lifted `#475569` → `#94a3b8` on six visible-text spans (hero microcopy, `/mo` price subtexts, CTA microcopy, footer links + copyright) to clear axe color-contrast violation. |
| `app/(auth)/login/page.tsx` | Modified | Full rewrite — fp-glass card, fp-input/fp-btn-primary/fp-btn-ghost, fp-alert-danger/success, no floating stat cards, aria-label on eye-toggle |
| `app/(auth)/register/page.tsx` | Modified | Full rewrite — fp-glass card, 4-criteria strength meter with inline hex, fp-alert-danger, fp-btn-ghost OAuth buttons |
| `app/(auth)/forgot-password/page.tsx` | Modified | Full rewrite — fp-glass card, fp-alert-danger/success with role/aria-live, no raw pink gradients |
| `app/(auth)/reset-password/page.tsx` | Modified | Full rewrite — both render paths canonical, 3-criteria strength meter with inline hex, fp-glass card |
| `test/acceptance/features/E-014-frontend-design-migration.feature` | Modified | Appended 14 scenarios (@E-014-S-37 through @E-014-S-50) covering all 10 ACs |
| `test/acceptance/step_definitions/E-014-landing-auth-rebuild.steps.ts` | Created | New step definitions for S-37–S-50: filesystem counters, DOM class assertions, axe-core smoke, eye-toggle aria-label. 2026-04-26: hardened `I click the first button with text` step — waits for `networkidle` before click, then `waitForFunction` on `window.location.href` after click (covers both client-side router and full document navigation). |
| `_bmad-output/test-artifacts/requirements-traceability-matrix.md` | Modified | Added FR-UI-DESIGN-02, -03, -04, -05, -07 rows for Story 14.4 |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | Modified | 14-4-landing-page-auth-pages-rebuild: review |
| `package.json` | Modified | Added `@axe-core/playwright` (^4.11.1) devDependency for S-49 axe-core acceptance scenarios (Task 9.2) |
