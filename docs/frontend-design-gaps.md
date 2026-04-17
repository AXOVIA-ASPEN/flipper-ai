# Frontend Design Gaps — Audit Against `flipper-frontend` Design System

**Date:** 2026-04-17
**Auditor:** Claude Code (`bmad-party-mode` — Sally (UX) + Winston (architect))
**Canonical reference:** `~/.claude/skills/flipper-frontend/SKILL.md`
**Repo snapshot:** `django-main` branch, current working state

---

## TL;DR

The canonical design system (dark glassmorphism, purple-only accent, grid+mesh background, `.fp-*` utility classes) **is fully defined** in `app/globals.css` and **used correctly in a small handful of places** (dashboard, navigation, toasts, kanban columns). The rest of the product is built on a mix of competing systems:

- a light-mode default in `:root` (`--color-background: #ffffff`)
- a parallel multi-theme `bg-theme-*` class system (47 lines of `globals.css`)
- ad-hoc Tailwind gradients (`from-blue-500 to-pink-500`, `bg-gradient-to-br from-slate-900 via-purple-900`)
- full light-mode surfaces (`bg-white`, `bg-gray-50`, `text-gray-900`) inherited from early onboarding and settings work

| Metric | Count |
|---|---|
| Raw non-purple Tailwind palette usage (`bg-blue-500`, `text-pink-400`, `from-cyan-*`, `bg-amber-*`, etc.) | **464 occurrences across 44 files** |
| Light-mode surface usage (`bg-white`, `bg-gray-50..900`) | **278 occurrences across 37 files** |
| `fp-*` canonical design system usage | **135 occurrences across 12 files** |
| Approximate compliance ratio | **~15% canonical, ~85% non-compliant** |

This document enumerates the gaps, maps them to files and line ranges, scores severity, and proposes a phased remediation plan.

---

## 1. Design Tokens and Base Styles (`app/globals.css`)

| # | Gap | Severity | Location | Current | Spec |
|---|---|---|---|---|---|
| 1.1 | `:root` defaults to **light** theme | 🔴 Critical | `app/globals.css:3–32` | `--color-background: #ffffff; --color-text: #111827; --color-primary: #3b82f6;` | Dark-first: page bg `#080b14`, primary `#7c3aed`, primary text `#e2e8f0`. Skill is clear: "This is the canonical design language — apply it consistently". |
| 1.2 | Primary color is **blue**, not purple | 🔴 Critical | `app/globals.css:5` | `--color-primary: #3b82f6` | Should be `#7c3aed`. The rest of `--color-*` tokens cascade light colors into generated button/link/shadow theme variables. |
| 1.3 | Competing `bg-theme-*` multi-theme system | 🟠 High | `app/globals.css:162–278` | 47 lines defining `.bg-theme-primary`, `.bg-theme-page`, `.bg-theme-accent-blue`, `.text-theme-muted`, `.shadow-theme-primary`, etc. Driven by `ThemeContext` + `ThemeStyles.tsx`. | Spec defines a **single** dark-purple system. The multi-theme system creates two sources of truth and is used (so far) only by `ThemeSettings.tsx:16` (`bg-theme-page`). |
| 1.4 | Missing canonical animation tokens | 🟡 Medium | `app/globals.css:91–159` | Only has `blob`, `pulse-slow`, `glow`, `slide-in-right`. | Spec also defines `slideUp`, `toastIn`, `shimmer`, and `.metric-num` glow hover. Pages cannot use "staggered card entrance" because the animations don't exist as utility classes. |
| 1.5 | No `.fp-btn-hot` / `.hot-card` / `borderSpin` | 🟡 Medium | `app/globals.css` | Missing | Spec defines `.hot-card` cycling border animation (HOT/featured items) and `.btn-hot` CTA. These are needed for featured opportunities / hot deals. |
| 1.6 | No range slider theming | 🟡 Medium | `app/globals.css` | Missing | Spec provides full `input[type=range]` purple thumb styling. `PriceCalculator.tsx` uses a slider and falls back to browser default. |
| 1.7 | No score-ring helper | 🟢 Low | n/a | Missing | Spec defines the `ScoreRing` SVG component. Some cards show numeric scores (`Dashboard:378`) but no visual ring anywhere in the product. |
| 1.8 | Root layout injects page bg **inline** on `<body>` | 🟢 Low | `app/layout.tsx:38` | `style={{ background: '#080b14', ... }}` | Works, but creates a third source of truth for page bg alongside `:root --color-background` and `.fp-bg-mesh`. Safe to delete once `:root` is fixed (1.1). |

**Recommended fix order:** 1.2 → 1.1 → 1.3 → 1.4 → 1.5/1.6/1.7/1.8.

---

## 2. Pages — Palette and Layout Violations

The root `app/layout.tsx` correctly injects `.fp-bg-mesh` + `.fp-bg-grid` + `.fp-content` wrapper (`app/layout.tsx:39–49`), so all pages *inherit* the canonical background. Violations happen when a page **overlays its own background** that obscures the grid, or uses non-purple gradients on surface elements.

### 2.1 Landing page — **COMPLETE REWRITE REQUIRED** 🔴 Critical

**File:** `app/page.tsx`
**Palette violations:** 34 on this page alone
**Light surfaces:** 11

The entire landing page is a design-system violation:

- `app/page.tsx:26` — `bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900` (covers the grid, uses slate not `#080b14`)
- `app/page.tsx:30–32` — three animated gradient orbs (`bg-purple-500`, `bg-pink-500`, `bg-blue-500`) — the spec uses the ambient `.fp-bg-mesh` for this, no JS orbs
- `app/page.tsx:50` — `bg-gradient-to-r from-purple-500 to-pink-500` button gradient (pink banned; use `.fp-btn-primary`)
- `app/page.tsx:61` — `bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text` hero text gradient (should be `.fp-grad-purple`)
- `app/page.tsx:65,179,197,216,237,246,260,266` — `text-blue-200/{40,50,60,70,80}` for body copy (should be `#94a3b8` / `#475569`)
- Feature cards at `app/page.tsx:102–166` — six cards with `bg-gradient-to-br` icons in `purple/pink`, `blue/cyan`, `orange/red`, `green/emerald`, `purple/indigo`, `pink/rose`. All six violate the purple-only rule.
- `app/page.tsx:192` — Pro pricing card uses `bg-gradient-to-br from-purple-500/20 to-pink-500/20 ... border-2 border-purple-500` (pink banned)
- `app/page.tsx:233` — CTA box `from-purple-500/20 to-pink-500/20 ... border border-purple-500/30`
- `app/page.tsx:253` — footer border `border-white/10` should be `fp-divider` or `rgba(255,255,255,0.06)`

**Recommendation:** Rebuild the landing page as a `.fp-content` stack of `.fp-glass` + `.fp-glow-card` surfaces with `.fp-grad-purple` text accents, `.fp-btn-primary` / `.fp-btn-hot` CTAs, and *no* gradient orbs (the layout already provides `.fp-bg-mesh` ambient light). Keep feature icons as monochrome `#8b5cf6` lucide icons in a plain glass circle, not multicolor gradient squares.

### 2.2 Opportunities page — **largest volume offender** 🔴 Critical

**File:** `app/opportunities/page.tsx` (~2000+ lines)
**Palette violations:** 96
**Light surfaces:** 59

Hotspots (sampled — full remediation needs per-section pass):

- Heavy use of `bg-white dark:bg-gray-800` cards → should be `.fp-glass`
- Multicolor detail section gradients (`from-blue-500 to-cyan-500`, `from-green-500 to-emerald-500`) → purple-only
- Form inputs not using `.fp-input`
- Buttons using raw Tailwind `bg-blue-600 hover:bg-blue-700` → `.fp-btn-primary`
- Kanban toggle pill uses non-purple active state

This page is the **product's main UI surface**. Recommend treating this as a standalone remediation milestone of its own.

### 2.3 Other pages — partial compliance

| Page | Palette hits | Light-mode hits | Canonical fp-* uses | Status |
|---|---:|---:|---:|---|
| `app/dashboard/page.tsx` | 1 | 1 | 33 | ✅ Near-compliant (exemplar) |
| `app/layout.tsx` | 0 | 0 | 3 | ✅ Compliant |
| `app/messages/page.tsx` | 0 | 0 | 6 | ✅ Compliant |
| `app/settings/page.tsx` | 0 | 0 | 8 | ✅ Compliant (shell only; settings children are not) |
| `app/posting-queue/page.tsx` | 0 | 0 | 5 | ✅ Compliant |
| `app/page.tsx` (landing) | 34 | 11 | 0 | 🔴 Complete rewrite |
| `app/opportunities/page.tsx` | 96 | 59 | 0 | 🔴 Largest offender |
| `app/analytics/page.tsx` | 22 | 14 | 0 | 🔴 Needs rebuild |
| `app/scraper/page.tsx` | 46 | 30 | 0 | 🔴 Needs rebuild |
| `app/listings/[id]/page.tsx` | 22 | 6 | 0 | 🟠 Needs rebuild |
| `app/(auth)/login/page.tsx` | 5 | 9 | 0 | 🟠 Needs rebuild |
| `app/(auth)/register/page.tsx` | 19 | 12 | 0 | 🔴 Needs rebuild |
| `app/(auth)/forgot-password/page.tsx` | 10 | 2 | 0 | 🟠 Needs rebuild |
| `app/(auth)/reset-password/page.tsx` | 11 | 5 | 0 | 🟠 Needs rebuild |
| `app/messages/[listingId]/page.tsx` | 4 | 2 | 0 | 🟡 Medium |
| `app/onboarding/page.tsx` | 1 | 0 | 0 | 🟡 Medium (host only) |
| `app/health/page.tsx` | 16 | 8 | 0 | 🟡 Medium |
| `app/privacy/page.tsx` | 5 | 3 | 0 | 🟢 Low (public static) |
| `app/terms/page.tsx` | 6 | 3 | 0 | 🟢 Low (public static) |

**Takeaway:** Only 5 pages (`dashboard`, `layout`, `messages`, `settings`, `posting-queue`) are canonical. The other 14 pages need work.

### 2.4 Listings detail loading/error states leak light theme 🟡 Medium

**File:** `app/listings/[id]/page.tsx:110–121`
```tsx
<div className="text-xl text-gray-600">Loading listing...</div>
...
<div className="text-xl text-red-600">{error || 'Listing not found'}</div>
```
Should use `#94a3b8` for loading text and a `.fp-alert-danger` for errors.

### 2.5 Error boundaries and skeletons are inconsistent ✅ RESOLVED (Story 14.3)

~~There is no shared `<LoadingSkeleton>` / `<ErrorBanner>` / `<EmptyState>` component (the skill explicitly calls these out as "always handle all three"). Each page rolls its own: `app/dashboard/page.tsx:194–205` returns a flex-centered div; `app/listings/[id]/page.tsx:109–115` returns inline gray text; `app/opportunities/page.tsx` uses a different pattern again. No `.shimmer` loading state anywhere.~~

**Story 14.3 (2026-04-17):** Created `src/components/ui/{LoadingSkeleton,ErrorBanner,EmptyState,ScoreRing}.tsx` + barrel. Migrated Dashboard, Opportunities, Listings [id], Messages, and Posting Queue to use the shared components. `ScoreRing` wired into the Opportunities value-score card slot.

---

## 3. Components — Palette and Glassmorphism Violations

### 3.1 Worst offenders (by combined violation count)

| Component | Palette | Light-mode | Combined | Severity |
|---|---:|---:|---:|---|
| `NotificationSettings.tsx` | 22 | 22 | **44** | 🔴 Critical |
| `PriceCalculator.tsx` | 25 | 10 | **35** | 🔴 Critical |
| `BillingSettings.tsx` | 19 | 10 | **29** | 🔴 Critical |
| `MessageApprovalCard.tsx` | 11 | 8 | **19** | 🟠 High |
| `MeetingRouteCard.tsx` | 11 | 6 | **17** | 🟠 High |
| `ScoringSettings.tsx` | 5 | 6 | **11** | 🟠 High |
| `ApprovalQueue.tsx` | 8 | 2 | **10** | 🟠 High |
| `MeetingModal.tsx` | 4 | 5 | **9** | 🟠 High |
| `ResaleContentEditor.tsx` | 5 | 4 | **9** | 🟡 Medium |
| `UsageDisplay.tsx` | 4 | 6 | **10** | 🟠 High |
| `CrossPostModal.tsx` | 3 | 6 | **9** | 🟡 Medium |
| `FilterPanel.tsx` | 2 | 3 | **5** | 🟡 Medium |
| `IntegrationsSettings.tsx` | 3 | 1 | **4** | 🟡 Medium |
| `LogisticsSettings.tsx` | 1 | 1 | **2** | 🟢 Low |
| `MessagingSettings.tsx` | 5 | 4 | **9** | 🟡 Medium |
| `UpgradePrompt.tsx` | 5 | 0 | **5** | 🟡 Medium |
| `KanbanBoard.tsx` | 7 | 0 | **7** | 🟡 Medium (demand badges use `bg-red-500/20`, `bg-blue-500/20` instead of `.fp-badge-*`) |
| `messages/MessageBubble.tsx` | 2 | 2 | **4** | 🟡 Medium |
| `messages/ThreadItem.tsx` | 1 | 3 | **4** | 🟡 Medium |
| `messages/ThreadHeader.tsx` | 0 | 5 | **5** | 🟡 Medium |

### 3.2 Onboarding (whole folder is light-mode) 🔴 Critical

**Files:** `src/components/Onboarding/*` (7 files)
**Combined violations:** 22 (15 palette + 7 bg-white)

The onboarding wizard is the **first experience a new user has**, and it visually contradicts the rest of the product.

`src/components/Onboarding/WizardLayout.tsx:40–41`:
```tsx
<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
  <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
```

`:70`: `bg-blue-600 hover:bg-blue-700` (should be `.fp-btn-primary`)
`:67`: `bg-gray-200` progress track, `:70` `bg-blue-600` fill (should be `.fp-prog-track` + `.fp-prog-fill` with purple gradient)
`:77,88`: `text-gray-900`, `text-gray-600` (should be `#e2e8f0`, `#94a3b8`)

All step components (`StepWelcome`, `StepBudget`, `StepCategories`, `StepLocation`, `StepMarketplaces`, `StepComplete`) reuse `bg-blue-50 border-blue-500 text-blue-700` for selected items. Replace with `rgba(109,40,217,0.1)` fill, `rgba(109,40,217,0.5)` border, `#c4b5fd` text — or simply the `.fp-glass` surface with `.fp-badge-purple` selected indicator.

### 3.3 PriceCalculator — the feature that should showcase the design language 🔴 Critical

**File:** `src/components/PriceCalculator.tsx` (35 violations)
**Problem:** This is explicitly called out in the skill ("Real-Time Data Pattern" example uses this exact component) yet it contains:

- `bg-blue-50 border border-blue-200` info card at `:826`
- Raw `input[type=range]` without the purple thumb styling from the skill
- `bg-gray-100` / `bg-white` surfaces
- `text-blue-700` emphasis text

This component is a prime candidate to be a reference implementation — right now it demonstrates the opposite.

### 3.4 Cards not using `.fp-glass` 🟠 High

Pattern `bg-white dark:bg-gray-800 rounded-lg shadow` appears in:
- `MessageApprovalCard.tsx:175`
- `ResaleContentEditor.tsx:145`
- `NotificationSettings.tsx:282, 748, 726`
- `ApprovalQueue.tsx:199`
- `messages/ThreadHeader.tsx:31, 50`
- `MeetingRouteCard.tsx:231`
- `MessagingSettings.tsx` (multiple)

Replace all with `className="fp-glass"` or `.fp-glass-sm`.

### 3.5 KanbanBoard demand badges bypass `.fp-badge-*` 🟡 Medium

**File:** `src/components/KanbanBoard.tsx:38–47`
```tsx
rising:     { label: 'Hot',    className: 'bg-red-500/20 text-red-300 border-red-500/30' },
stable:     { label: 'Steady', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
declining:  { label: 'Slow',   className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
low_liquidity: { label: 'Dead', className: 'bg-amber-600/20 text-amber-400 border-amber-600/30' },
```
The rest of the file uses `.fp-badge-*` correctly (lines 69–76). These hand-rolled classes should be replaced with `.fp-badge fp-badge-red` / `fp-badge-blue` / `fp-badge-gray` / `fp-badge-yellow` for consistency.

### 3.6 Green usage for non-profit signals 🟡 Medium

Skill rule: `#34d399` green is for **financial indicators only**.

Violations:
- `src/components/Onboarding/*` uses green-ish as UX selection accent — should be purple
- `app/page.tsx:136` feature icon "Real-Time Alerts" uses `from-green-500 to-emerald-500` — not financial
- `KanbanBoard.tsx:44` demand `high` → `bg-green-500/20 text-green-300` — demand is not profit

### 3.7 Inputs not using `.fp-input` 🟠 High

Most form inputs across the app use raw Tailwind styling instead of the canonical class:
- All onboarding inputs
- `BillingSettings.tsx`, `IntegrationsSettings.tsx`, `MessagingSettings.tsx`, `NotificationSettings.tsx`, `ScoringSettings.tsx` form controls
- `LogisticsSettings.tsx` form controls
- `PriceCalculator.tsx` number inputs

Replace with `className="fp-input"` for text, number, email, password, url inputs.

### 3.8 Missing focus rings 🟡 Medium

Only 25 instances of `focus:ring-*` across the entire codebase; the spec requires focus rings on all interactive elements. Notable offenders: icon-only buttons in `FilterPanel.tsx:76–107`, onboarding buttons, all nav items in `Navigation.tsx` (which relies on `.fp-nav-link` but that class has no focus styling).

**Fix for `.fp-nav-link`:** add to `globals.css`
```css
.fp-nav-link:focus-visible {
  outline: 2px solid rgba(139,92,246,0.6);
  outline-offset: 2px;
}
```

### 3.9 Icon-only buttons missing `aria-label` 🟢 Low

Partial list (needs full audit):
- `Navigation.tsx:106` — icon items get implicit label from `hidden md:inline` text on desktop, but mobile collapses to icon-only with no aria-label.
- `FilterPanel.tsx:76,87,98,107` — badge close buttons (×)
- Various modal close/delete buttons

---

## 4. Component Hygiene — File Headers, `any`, Real-time Patterns

### 4.1 Missing file headers 🟡 Medium

Per `CLAUDE.md` **File Header Standard — MANDATORY**, every source file must begin with a structured header. 23 of 39 components are missing the full `@file/@author/@company/@date/@version/@brief/@description` block.

**Missing entirely or partial:**
```
src/components/Toast.tsx             ← has full header ✅
src/components/Navigation.tsx         ← has full header ✅
src/components/KanbanBoard.tsx       ← partial (3 lines only) ⚠
src/components/ToastContainer.tsx    ← partial
src/components/Onboarding/WizardLayout.tsx ← partial (wrong author "ASPEN")
src/components/ThemeStyles.tsx       ← missing
src/components/LogisticsSettings.tsx ← missing
src/components/MessageApprovalCard.tsx ← missing
src/components/ResaleContentEditor.tsx ← missing
src/components/messages/ThreadHeader.tsx  ← missing
src/components/messages/MessageBubble.tsx ← missing
src/components/messages/ThreadItem.tsx    ← missing
src/components/NotificationSettings.tsx   ← missing
src/components/UsageDisplay.tsx            ← missing
src/components/MessagingSettings.tsx       ← missing
src/components/UserMenu.tsx                ← missing
src/components/providers/SessionProvider.tsx      ← missing
src/components/providers/FirebaseAuthProvider.tsx ← missing
src/components/WebVitals.tsx               ← missing
src/components/posting-queue/CrossPostModal.tsx   ← missing
src/components/posting-queue/QueueItemCard.tsx    ← missing
src/components/Onboarding/Step*.tsx (6 files)     ← missing
src/components/PriceCalculator.tsx         ← needs verification
src/components/UpgradePrompt.tsx           ← missing
src/components/MeetingModal.tsx            ← missing
src/components/IntegrationsSettings.tsx   ← missing
src/components/MeetingRouteCard.tsx        ← missing
src/components/BillingSettings.tsx         ← missing
src/components/ApprovalQueue.tsx           ← missing
src/components/FilterPanel.tsx             ← missing
src/components/ScoringSettings.tsx         ← missing
src/components/ThemeSettings.tsx           ← missing
src/components/CheckoutResultBanner.tsx    ← needs verification
```

### 4.2 Safe toast DOM — ✅ compliant

No `.innerHTML` assignments found in any component. Toasts use `textContent` via the `<Toast>` component. Spec rule passes.

### 4.3 Real-time pattern — partial

- `app/dashboard/page.tsx:85–107` correctly fetches once + uses SSE for updates ✅
- `src/components/PriceCalculator.tsx` — spec explicitly documents this component as "fetch once, recalculate client-side" but actual implementation needs verification; worth a closer look during the PriceCalculator rebuild.

### 4.4 Server vs Client components — ✅ mostly compliant

Nearly every page under `app/` is `'use client'`. This is acceptable for this app given the auth + SSE reality, but `app/layout.tsx`, `app/sitemap.ts`, `app/privacy/page.tsx`, `app/terms/page.tsx` are correctly server components. No gap.

---

## 5. Accessibility Gaps

| # | Gap | Severity | Example |
|---|---|---|---|
| 5.1 | No skip-link / landmark region markup on layout | 🟡 Medium | `app/layout.tsx:33–55` has no `<main>` element; page content goes directly into `.fp-content` `<div>`. Screen readers cannot jump to main content. |
| 5.2 | Sliders missing full ARIA quartet | 🟡 Medium | `src/components/PriceCalculator.tsx` — sliders need `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext` per spec §5. |
| 5.3 | Color-only status indicators | 🟢 Low | Several places use green/yellow/red colored text without an accompanying icon or word. E.g. `Dashboard:220,225` "Live"/"Reconnecting" is paired with pulse dot ✅ — but other pages don't follow suit. |
| 5.4 | Touch targets <44px | 🟡 Medium | Icon-only close buttons (e.g. `Dashboard:240`) are 24×24. Spec requires 44×44 minimum. |
| 5.5 | `aria-live` on dynamic regions | 🟡 Medium | Only `Dashboard:216` uses `aria-live="polite"` for SSE status. PriceCalculator's recalculated output (which updates on every slider move) does not. |

---

## 6. Specific Patterns That Need Deletion

These are outright contradictions of the canonical system that should be removed wholesale, not refactored:

1. **`animate-blob` + `animation-delay-*` + orb divs in `app/page.tsx:30–32`** — replace with ambient `.fp-bg-mesh` (already on every page via layout).
2. **`globals.css:91–103` `@keyframes blob`** — no longer needed once landing page is rebuilt.
3. **`globals.css:162–278` `.bg-theme-*` classes and `ThemeStyles.tsx` dynamic CSS var injection** — single design system means one palette, not a theme switcher. `ThemeSettings.tsx` becomes either a "display density / accent style" chooser scoped to things like line height, or is deleted.
4. **`from-purple-X to-pink-X` / `from-green-X to-emerald-X` / `from-orange-X to-red-X` gradients** everywhere — spec is purple-only. Use `.fp-grad-purple` / solid `#7c3aed` / `.fp-btn-primary`.
5. **`bg-white dark:bg-gray-800` dual-theme CSS in components** — there is no "light mode" for logged-in surfaces. The app is dark-first.

---

## 7. Phased Remediation Plan

Ordered for **maximum user-visible impact per hour of work**.

### Phase 0 — Tokens (foundation; blocks everything else) — ~1h
- [ ] **Gap 1.2** Fix `--color-primary` to `#7c3aed` in `app/globals.css`
- [ ] **Gap 1.1** Invert `:root` defaults to dark (bg `#080b14`, text `#e2e8f0`, etc.)
- [ ] **Gap 1.4** Add missing animation keyframes: `@keyframes slideUp`, `toastIn`, `shimmer`, `fp-border-spin`, `.fp-metric-num` glow
- [ ] **Gap 1.5** Add `.fp-btn-hot`, `.fp-hot-card` classes
- [ ] **Gap 1.6** Add `input[type=range]` purple styling scoped to `.fp-content input[type=range]`

### Phase 1 — Remove competing theme system — ~1h ✅ COMPLETE (Story 14.2)
- [x] **Gap 1.3** Delete lines 162–278 of `globals.css` (all `.bg-theme-*`, `.text-theme-*`, `.shadow-theme-*`) — deleted
- [x] Delete `src/components/ThemeStyles.tsx` — deleted
- [x] Delete `src/contexts/ThemeContext.tsx` — deleted (no retained preference)
- [x] Remove `<ThemeStyles />` and `<ThemeProvider>` from `app/layout.tsx` — removed
- [x] Delete `ThemeSettings.tsx` and remove from `/settings` — deleted; `app/settings/page.tsx` updated
- [x] Delete `src/lib/theme-config.ts` — deleted
- [x] Interim-replace all 5 consumer pages (`login`, `register`, `reset-password`, `opportunities`, `scraper`) with `FLIPPER-14-2 interim` placeholders for Stories 14.4/14.7/14.9 rebuilds

### Phase 2 — Landing page rebuild — ~3h
- [ ] **Gap 2.1** Rewrite `app/page.tsx` using `.fp-glass` hero, `.fp-grad-purple` headline, `.fp-btn-primary` / `.fp-btn-hot` CTAs, `.fp-glow-card` feature cards (monochrome purple icons), `.fp-hot-card` Pro pricing tier, `.fp-alert-success` footer CTA
- [ ] Delete `animate-blob` usage
- [ ] Normalize all body copy to `#94a3b8` / `#e2e8f0`

### Phase 3 — Auth pages — ~2h
- [ ] Rebuild `app/(auth)/login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx` as centered `.fp-glass` cards over the root grid background
- [ ] Use `.fp-input` for form fields, `.fp-btn-primary` for submit, `.fp-alert-danger` for errors

### Phase 4 — Onboarding — ~2h
- [ ] **Gap 3.2** Rewrite `src/components/Onboarding/WizardLayout.tsx` — dark `.fp-glass` card, `.fp-prog-track` + `.fp-prog-fill` (purple gradient), `.fp-btn-primary` / `.fp-btn-ghost` nav buttons
- [ ] Update all 6 Step* components to use `.fp-glass-sm` selection cards with purple border on selection instead of `bg-blue-50 border-blue-500`

### Phase 5 — Opportunities page (largest surface) — ~4h
- [ ] **Gap 2.2** Top-to-bottom palette sweep of `app/opportunities/page.tsx`
- [ ] Replace all cards with `.fp-glass`; all buttons with `.fp-btn-*`; all badges with `.fp-badge-*`; all gradients with `.fp-grad-purple`
- [ ] Unify Kanban and list views on the same design tokens
- [ ] Replace loading/error/empty states with shared `.fp-glass` components (see Phase 8)

### Phase 6 — Listings detail — ~2h
- [ ] **Gap 2.4** Rebuild `app/listings/[id]/page.tsx` header, tabs, loading/error states
- [ ] Embed rebuilt `PriceCalculator` (Phase 7) and `ResaleContentEditor` (Phase 7)

### Phase 7 — High-traffic components — ~3h
- [ ] **Gap 3.3** `PriceCalculator.tsx` — canonical rebuild as the reference implementation. Purple slider, `.fp-glass` surface, live `aria-live` region
- [ ] **Gap 3.1** `NotificationSettings.tsx`, `BillingSettings.tsx`, `MessageApprovalCard.tsx`, `MeetingRouteCard.tsx`, `ScoringSettings.tsx`, `UsageDisplay.tsx`, `MeetingModal.tsx`, `ResaleContentEditor.tsx`, `ApprovalQueue.tsx`
- [ ] **Gap 3.4** All `bg-white dark:bg-gray-800` → `.fp-glass`
- [ ] **Gap 3.5** `KanbanBoard.tsx:38–47` demand badges → `.fp-badge-*`
- [ ] **Gap 3.7** All form inputs → `.fp-input`

### Phase 8 — Shared state components — ✅ COMPLETE (Story 14.3, 2026-04-17)
- [x] `src/components/ui/LoadingSkeleton.tsx` — uses `.fp-shimmer` animation
- [x] `src/components/ui/ErrorBanner.tsx` — uses `.fp-alert-danger`
- [x] `src/components/ui/EmptyState.tsx` — uses `.fp-glass` + illustrated empty copy
- [x] `src/components/ui/ScoreRing.tsx` — per skill spec §Score Ring; wired into Opportunities value-score card
- [x] Replace per-page inline states in Dashboard, Opportunities, Listings [id], Messages, Posting-queue

### Phase 9 — Analytics page rebuild — ~2h
- [ ] **File:** `app/analytics/page.tsx` — replace chart stroke/fill `#3b82f6` with `#7c3aed`; rebuild surrounding cards as `.fp-glass`

### Phase 10 — Scraper page rebuild — ~2h
- [ ] **File:** `app/scraper/page.tsx` (46 palette hits, 30 light-mode) — full pass

### Phase 11 — Messaging UI — ~1h
- [ ] `MessageBubble`, `ThreadHeader`, `ThreadItem` — purple accents, `.fp-glass-sm` cards

### Phase 12 — Accessibility sweep — ~2h
- [ ] **Gap 5.1** Wrap `{children}` in `<main>` in `app/layout.tsx`
- [ ] **Gap 5.2** Add ARIA quartet to all sliders
- [ ] **Gap 5.4** Upsize icon-only touch targets to ≥44×44
- [ ] **Gap 5.5** Add `aria-live="polite"` to PriceCalculator output region
- [ ] **Gap 3.8** Add focus ring to `.fp-nav-link:focus-visible`

### Phase 13 — File headers — ~1.5h
- [ ] **Gap 4.1** Add canonical `@file/@author/@company/@date/@version/@brief/@description` JSDoc block to the 23 components missing it

**Total estimate:** ~28–32 focused hours.

---

## 8. Files to Delete or Significantly Shrink

| File | Action | Reason |
|---|---|---|
| `src/components/ThemeStyles.tsx` | Delete | Multi-theme system contradicts single-source design |
| `src/contexts/ThemeContext.tsx` | Shrink or delete | Reduce to a motion/density preference if kept |
| `src/components/ThemeSettings.tsx` | Review | Only relevant if `ThemeContext` survives; if deleted, delete this page too |
| `src/lib/theme-config.ts` | Delete or shrink | Multi-theme color map is dead once system is unified |
| `app/globals.css` lines 162–278 | Delete | Competing theme classes |
| `app/globals.css` lines 91–159 `animate-blob` / `animation-delay-*` | Delete after landing rebuild | Only used by landing orbs |

---

## 9. Files Already Canonical (Do Not Touch)

- `app/layout.tsx` — correct root layout with `.fp-bg-mesh`, `.fp-bg-grid`, `.fp-content`
- `app/dashboard/page.tsx` — exemplar page; use as reference template
- `app/settings/page.tsx` — shell is compliant (children components are not)
- `app/posting-queue/page.tsx` — compliant
- `app/messages/page.tsx` — compliant
- `src/components/Navigation.tsx` — exemplar component
- `src/components/Toast.tsx` + `ToastContainer.tsx` — correct glassmorphism, safe DOM
- `src/components/UserMenu.tsx` (partial)
- `src/components/posting-queue/QueueItemCard.tsx` (partial — uses `fp-*` mostly)

Use these as reference implementations when rebuilding the rest.

---

## 10. Verification After Remediation

Each phase should end with:

```bash
make lint         # Zero ESLint errors
make build        # TypeScript strict — no `any`
make test         # Jest green
```

Additionally, re-run the audit:

```bash
# Non-purple palette hits should drop toward zero
rg -c "(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|violet|fuchsia|pink|rose|emerald|green|amber|yellow|red|orange)-[0-9]" src/components app

# Light-mode surface hits should drop toward zero
rg -c "bg-(white|gray-[0-9])" src/components app

# fp-* usage should grow
rg -c "fp-(glass|badge|btn|input|bg|grad|content|stat-card|alert)" app src/components
```

Compliance target: **canonical `fp-*` uses > non-canonical palette/light hits** across the whole `app/` + `src/components/` tree.

---

## Appendix — Measurement snapshot (2026-04-17)

Generated via ripgrep at time of audit:

```
Non-purple Tailwind palette (bg/text/border/from/to/via/ring-{blue|cyan|teal|sky|indigo|violet|fuchsia|pink|rose|emerald|green|amber|yellow|red|orange}-N):
  Pages:       298 occurrences across 15 files
  Components:  166 occurrences across 29 files
  TOTAL:       464 occurrences across 44 files

Light-mode surfaces (bg-white, bg-gray-0..900):
  Pages:       164 occurrences across 13 files
  Components:  114 occurrences across 24 files
  TOTAL:       278 occurrences across 37 files

Canonical fp-* usage:
  Pages:       100 occurrences across 6 files
  Components:   35 occurrences across 6 files
  TOTAL:       135 occurrences across 12 files

Compliance ratio: 135 / (135 + 742) = ~15%
```
