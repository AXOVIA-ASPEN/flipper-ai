# Story 14.7: Opportunities + Listings Detail + Messaging Migration

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID:

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->
<!-- Trello-Card-ID: populated during sprint intake when the trello-axovia card is created. -->

## Story

As a **user working day-to-day in the Flipper.ai app**,
I want the three main working surfaces (`/opportunities`, `/listings/[id]`, `/messages`) rebuilt on the canonical dark-glassmorphism design system — including the Kanban board's demand badges, the listing detail page's loading / error / empty states, and the messaging components — so that every screen I touch on the way from "identified deal" → "purchased" → "listed" → "sold" → "messaged buyer" carries the same visual language,
so that the product stops feeling like three different apps bolted together and the dashboard I see at the top of every session is no longer the only part of Flipper.ai that looks like Flipper.ai.

## Problem Statement

Per `docs/frontend-design-gaps.md` §2.1 and the page-level audit conducted 2026-04-17, the three highest-traffic authenticated surfaces in the product ship with the worst palette/light-mode compliance on the entire site:

| File | Palette violations | Light-mode violations | Canonical `fp-*` uses |
|------|-------------------:|----------------------:|----------------------:|
| `app/opportunities/page.tsx` (1,860 lines) | 107 | 58 | 0 |
| `app/listings/[id]/page.tsx` (575 lines) | 53 | 6 | 0 |
| `app/messages/page.tsx` (316 lines) | 0 (computed) | 0 | 0 (none needed — already dark) |
| `src/components/KanbanBoard.tsx` (313 lines) | 7 | 0 | 8 |
| `src/components/messages/MessageBubble.tsx` (98 lines) | 10 | 2 | 0 |
| `src/components/messages/ThreadHeader.tsx` (90 lines) | 10 | 5 | 0 |
| `src/components/messages/ThreadItem.tsx` (147 lines) | 13 | 3 | 0 |
| `src/components/messages/utils.ts` (styling helper) | 5 | 0 | 0 |

Specifically:

- **Opportunities page** uses a hand-rolled "backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl" pattern on every stat card, filter panel, list-view card, Kanban column wrapper, and aging-inventory card (~30+ instances — lines 565, 592, 605, 618, 631, 648, 798, 821, 1066, 1125, 1131, 1139, 1145, 1156, 1166, …). This predates the `.fp-glass` / `.fp-glass-sm` canonical surfaces. Visually the current output is close to `.fp-glass` but diverges: the page uses blue-tinted text (`text-blue-200/80`, `text-blue-200/70`, `text-blue-300`, `placeholder-blue-200/50`), blue focus rings (`focus:ring-blue-400/50`), blue "tag active" states (`bg-blue-500/30`), and multicolor hover glows (`hover:shadow-blue-500/20`, `hover:shadow-orange-500/20`, `hover:shadow-green-500/20`, `hover:shadow-purple-500/20`). The stat cards mix four different glow colors; the aging-inventory banner uses `bg-amber-500/20 border-amber-400/40 text-amber-300`.
- **Listing detail page** currently has a loading state `<p className="text-gray-600">Loading listing...</p>` inside a white-ish fallback, and an error state `<p className="text-red-600">{error}</p>` hand-rolled. Despite Story 14.3 having landed `<LoadingSkeleton>`, `<ErrorBanner>`, and `<EmptyState>` (verified `14-3-shared-ui-state-components: review` in `sprint-status.yaml:177`), this page does not consume them. The page also has `bg-white`, `bg-gray-*`, and `text-gray-*` surfaces on the image gallery, the stat grid, the opportunity status panel, the comparable-sales table, and the meeting scheduler card.
- **Messaging components** are the most visibly broken. `MessageBubble.tsx` uses `bg-blue-100 dark:bg-blue-800` for outbound messages and `bg-gray-100 dark:bg-gray-700` for inbound — a light-mode-first pattern that renders pastel-blue bubbles on the dark canvas. `ThreadHeader.tsx` and `ThreadItem.tsx` follow the same pattern (`bg-white dark:bg-gray-800`, `text-gray-600 dark:text-gray-300`, `border-blue-500 bg-blue-50` for active selection). `src/lib/message-constants.ts` exports a `STATUS_COLORS` map with entries like `PENDING: 'bg-yellow-100 text-yellow-800'`, `APPROVED: 'bg-green-100 text-green-800'`, `REJECTED: 'bg-red-100 text-red-800'` — these are the only place the dark-mode `dark:` prefix is expected to carry the design, and it does not: `dark:bg-yellow-900 dark:text-yellow-200` is not a canonical `.fp-badge-*` match.
- **KanbanBoard's `DEMAND_BADGES` dict** at `src/components/KanbanBoard.tsx:36–47` is the only remaining Tailwind-palette hold-out in that file — the column headers themselves already use `.fp-badge fp-badge-blue` / `fp-badge-yellow` / etc. (lines 70–75), but the per-card demand badges (Hot/Steady/Slow/Dead/Active) still use raw `bg-red-500/20 text-red-300 border-red-500/30` tokens. This creates a split-personality look where the column chrome is canonical but the card chrome is not.
- **Opportunities list-view aging badges** (line 825) use `bg-amber-500/20 border-amber-400/40 text-amber-300` — this is a `.fp-badge-yellow` candidate.
- **Opportunities list-view demand pills** (inferred from lines 1093, 1126, 1132, 1140, 1146) use `text-blue-200/70` for labels — should be `#94a3b8`.

The `rg` regressions required by the DoD:

```bash
# Must return zero when the story is complete
rg "(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|pink|rose|emerald|amber|yellow|red|orange)-[0-9]+" \
  app/opportunities/page.tsx app/listings/\[id\]/page.tsx src/components/messages src/components/KanbanBoard.tsx \
  app/messages/page.tsx src/lib/message-constants.ts
```

Green is the ONE exception — `#34d399` / `#6ee7b7` are permitted inline (not as palette classes) on profit indicators (gain amounts, positive P&L, "sold for $X profit"). Per FR-UI-DESIGN-04, the `high` demand level collapses to `.fp-badge-purple` (NOT green) because "high demand" is a non-financial signal; `rising` collapses to `.fp-badge-red` (it's a trend warning — "this is hot, act fast", not a profit statement). This story resolves that ambiguity once in ADR-14.7-A and points all future demand-signal work at it.

Behavioral constraints that MUST survive the rebuild (this is a visual-only migration, zero business-logic change):

- **Drag-and-drop semantics on the Kanban board are preserved verbatim.** The `@hello-pangea/dnd` handlers, `onDragEnd` callback, optimistic UI update, and `onStatusChange` server sync are not touched. Cards still drag from Identified → Contacted → Purchased → Listed → Sold → Passed.
- **`onCrossPost` rendering logic is preserved** — the button still renders only on PURCHASED and LISTED columns and only when the prop is supplied (tier gating continues to live in the parent).
- **Filter and sort semantics on the opportunities page** (`useFilterParams`, `toggleMultiSelectValue`, `isMultiSelectActive`, sort-by state, view-toggle Kanban/List/Aging) are preserved verbatim. Only surface classes change.
- **Message thread state flow** — `REJECTED` bubbles still show muted + line-through styling (see `isRejected` branch at `MessageBubble.tsx:35`); just the colors change. The `direction` / `isOutbound` left/right layout is unchanged.
- **Listing detail page's `Suspense` fallback** — the outer `<Suspense fallback="Loading listing...">` wrapper at line 64 stays a simple text fallback (`<Suspense>` fallbacks render before React has hydrated; a full `<LoadingSkeleton>` would add JS weight to the critical path). The inner `loading` state (after the component mounts and starts fetching) IS the one that switches to `<LoadingSkeleton />`.

## Solution (High-Level Approach)

Rebuild all three surfaces as a pure visual migration: `.bg-white/10` glass-hacks → `.fp-glass`, raw `bg-blue-*` / `text-gray-*` → canonical inline hex + `.fp-*` classes, hand-rolled badges → `.fp-badge-*` variants, hand-rolled loading/error/empty → Story 14.3's shared components. Four files become the primary edit targets; four more become small-scope edits.

### Surface-by-surface plan

1. **Opportunities page header + stat strip** — header uses `.fp-glass-nav` (the canonical navigation glass variant that replaces `backdrop-blur-xl bg-white/10`). Four stat cards use `.fp-glow-card p-6` (this IS the canonical "group + hover + glow" stat card from the dashboard). ALL four cards converge on ONE glow color: purple (`rgba(139,92,246,*)`) — the multicolor glow mix (blue / purple / orange / green) violates the design spec's "single accent" rule. Icon tints stay purple per FR-UI-DESIGN-04.
2. **Opportunities filter/search panel** — wrap in `.fp-glass p-6`. Search input uses `.fp-input`. View-toggle (Kanban/List/Aging) uses three `.fp-btn-ghost` buttons with an `aria-pressed` active state styled inline (`background: rgba(124,58,237,0.15); color: #c4b5fd`) when active. Tag/category multi-select chips use `.fp-badge` with purple active state (`.fp-badge-purple` when active, `.fp-badge-gray` when inactive).
3. **Opportunities aging-inventory card(s)** — replace the `bg-amber-500/20 border-amber-400/40 rounded-full text-amber-300` pill with `<span className="fp-badge fp-badge-yellow">Aging</span>`. Card body uses `.fp-glass`. Carrying-cost numbers use `#f87171` inline (red-ish on loss) or `#94a3b8` (neutral on small amounts) — no palette classes.
4. **Opportunities list-view cards** — each opportunity card wraps in `.fp-glow-card` (hover glow is canonical on data cards per skill §Cards). Inline stat tiles (Asking Price / Market Value / Potential Profit / Value Score) use `.fp-glass-sm p-3`. Labels use `#94a3b8` inline; values use `#e2e8f0`; profit values use `#34d399`. The LLM Identification panel uses `.fp-glass-sm p-4`.
5. **Opportunities Kanban view** — the board wrapper itself is unstyled (handed to `<KanbanBoard />`). Any wrapping grid classes that currently carry palette tokens are collapsed to layout-only utilities.
6. **KanbanBoard per-card demand badges** — `DEMAND_BADGES` dict is rewritten so every entry's `className` is a `.fp-badge fp-badge-*` combination. Per ADR-14.7-A: `rising` → `fp-badge-red` (urgency/trend warning), `stable` → `fp-badge-blue` (neutral info), `declining` → `fp-badge-gray`, `low_liquidity` → `fp-badge-yellow` (caution), `very_high` → `fp-badge-red`, `high` → `fp-badge-purple` (non-financial success → purple per FR-UI-DESIGN-04), `medium` → `fp-badge-blue`, `low` → `fp-badge-gray`.
7. **Listing detail page loading / error / empty / not-found states** — consume `<LoadingSkeleton variant="card" />` (for the initial mounted loading state), `<ErrorBanner message={error} onRetry={refetch} />` (for fetch errors), `<EmptyState title="Listing not found" message="…" />` (for null-listing). The `<Suspense>` fallback at line 64 is left as a plain text (see behavioral constraint above).
8. **Listing detail page body surfaces** — the image gallery wrapper uses `.fp-glass`. The stat grid tiles (Asking Price / Estimated Value / Profit / Score) use `.fp-glass-sm p-4`. The opportunity-status panel uses `.fp-glass`. The comparable-sales table follows the pattern from Story 14.6 §Task 7 (row dividers inline `rgba(255,255,255,0.06)`, header `#94a3b8`, cells `#e2e8f0`). The meeting-scheduler card (`<MeetingRouteCard />` child) is NOT in scope — that's Story 14.8 (settings + modal polish).
9. **Messaging page (`app/messages/page.tsx`)** — ALREADY uses canonical surfaces (glass + `.fp-bg-mesh` inheritance). The edits here are minimal: ensure the three-column layout wrapper (sidebar / thread list / thread detail) is `.fp-glass` rather than hand-rolled, and ensure the "empty state" (no thread selected) uses `<EmptyState />`. Scenarios S-N+6 and S-N+7 exercise this.
10. **`MessageBubble.tsx`** — outbound bubbles become `.fp-glass-sm` with a purple tint (`style={{ background: 'rgba(124,58,237,0.15)' }}`), aligned right; inbound bubbles become `.fp-glass-sm` with a neutral tint (`style={{ background: 'rgba(255,255,255,0.04)' }}`), aligned left. Direction indicator copy uses inline `#c4b5fd` (outbound) / `#94a3b8` (inbound). Rejected bubbles lose the `text-gray-400` / `line-through` pair — replaced with `style={{ color: '#64748b', textDecoration: 'line-through' }}`. Status badge reaches into `STATUS_COLORS`, which is rewritten (see §11).
11. **`src/lib/message-constants.ts` — `STATUS_COLORS` rewrite** — every entry becomes a canonical `.fp-badge-*` class. Mapping: `PENDING` → `fp-badge fp-badge-yellow`; `APPROVED` → `fp-badge fp-badge-purple` (non-financial confirmation → purple per FR-UI-DESIGN-04); `SENT` / `DELIVERED` → `fp-badge fp-badge-blue`; `REJECTED` → `fp-badge fp-badge-red`; `READ` → `fp-badge fp-badge-gray`; plus whatever other statuses the dict defines. The export type (`Record<string, string>`) is unchanged so downstream consumers are transparent.
12. **`ThreadHeader.tsx` + `ThreadItem.tsx`** — the item list sidebar uses `.fp-glass-sm`; active/selected thread uses inline purple border (`border: '1px solid rgba(124,58,237,0.5)'`) and purple-tinted fill (`background: 'rgba(124,58,237,0.1)'`); unread indicator uses purple dot. Thread header gets `.fp-glass p-4` with the counterparty name in `#e2e8f0` and last-seen timestamp in `#94a3b8`.
13. **`src/components/messages/utils.ts`** — any color-returning helper (e.g., `getStatusColor(status)`) is normalized to return a `.fp-badge-*` class string.

### Typography rules applied everywhere (same as Story 14.6)

- Primary copy: `#e2e8f0`
- Secondary/helper copy: `#94a3b8`
- Tertiary/placeholder: `#475569` or `#64748b`
- Profit/positive: `#34d399` / `#6ee7b7`
- Loss/danger: `#f87171` / `#fca5a5`
- Warning: `#fbbf24` / `#fcd34d`
- Purple accent: `#8b5cf6` / `#c4b5fd`

### Architectural decisions

- **ADR-14.7-A (demand-level color mapping — the contentious one).** FR-UI-DESIGN-04 says green is reserved for profit/financial indicators. The current `DEMAND_BADGES.high` uses `bg-green-500/20 text-green-300` even though "high demand" is a product-signal, not a profit statement. Mapping `high` → `fp-badge-purple` aligns with FR-UI-DESIGN-04. `rising` / `very_high` stay red because they are trend-warnings (act fast) not success/profit. This is the canonical demand-badge map for the whole product; Story 14.9 inherits it and must not deviate. If a future PM wants "green for high demand" back, the argument has to be FR-UI-DESIGN-04 amendment first, code change second.
- **ADR-14.7-B (consuming Story 14.3 components is mandatory, not optional, for `app/listings/[id]/page.tsx`).** Story 14.3 is `review` as of story-authorship time — the components exist and ship. Unlike Story 14.6 (which authored its own fallback inline path because 14.3 might not land first), this story hard-adopts `<LoadingSkeleton>` / `<ErrorBanner>` / `<EmptyState>`. Rationale: 14.7 comes AFTER 14.6, so 14.3 is settled by the time 14.7 starts. Using shared components eliminates duplicated hand-rolled glass cards and gives 14.3 its first real-world usage regression guard.
- **ADR-14.7-C (single purple glow on stat cards, not multicolor).** The current opportunities-page stat cards mix four hover-glow colors (blue / purple / orange / green). The canonical pattern on the dashboard uses ONE accent color (purple) per card family. Multicolor glows signal "rainbow UI" — the antipattern the skill explicitly calls out. All four stat cards converge on `.fp-glow-card` (purple glow). If a reviewer wants per-card glow colors, they need to write a new canonical `.fp-glow-card-blue` / `.fp-glow-card-green` variant in Story 14.1 territory first — not in 14.7.
- **ADR-14.7-D (`MessageBubble` uses inline background tints, not `.fp-alert-*`).** `.fp-alert-warn` / `.fp-alert-danger` / `.fp-alert-success` are semantic banners (warnings, errors, successes). Chat bubbles are neither — they're message containers with directional intent, not alerts. Applying `.fp-alert-success` to an outbound bubble is semantically wrong and would inherit alert-style text color logic we don't want. `.fp-glass-sm` + inline `style={{ background: 'rgba(124,58,237,0.15)' }}` gives the correct visual (glass surface + purple identity) without the semantic drift.
- **ADR-14.7-E (STATUS_COLORS exports canonical class strings, NOT a lookup by status into inline hex).** The temptation is to "modernize" `STATUS_COLORS` to return a `{ bg, border, text }` object. Rejecting that: downstream consumers do `className={STATUS_COLORS[status]}`, which works for any string-returning function. Keeping the signature `Record<string, string>` means this is a surgical one-line-per-entry change inside `message-constants.ts` with zero ripple into consumers. Structural refactors go in a later Epic 15 hygiene pass, not here.
- **ADR-14.7-F (the opportunities page's 1,860 lines are rebuilt in-place, not split into child components).** The temptation is to extract `<OpportunitiesHeader>`, `<OpportunitiesStatsStrip>`, `<OpportunitiesFilterPanel>`, `<OpportunitiesListView>`, `<OpportunitiesAgingView>` as part of this rebuild. Rejecting that: splitting is a structural refactor crossing the visual-only boundary and would balloon the PR to 2000+ line diff with high merge-conflict risk against anything else on the branch. This story ships a big but mechanical diff. Extraction is Epic 15 territory.
- **ADR-14.7-G (light/dark `dark:` prefixes are dropped, not preserved).** Every `dark:bg-*` / `dark:text-*` class in the messaging components is deleted in the rebuild. Flipper.ai is dark-first (Story 14.1 set `:root` to dark; Story 14.2 deleted the competing theme layer); there is no light mode to fall back to. Keeping `dark:` prefixes in the rebuilt code would be dead weight AND a false signal to future maintainers that a light mode exists.
- **ADR-14.7-H (`.fp-glow-card:hover` is the canonical glow — removing `hover:shadow-*` utilities is CORRECT, not a regression).** Verified against `app/globals.css:240–256` after Story 14.1 landed (`done` as of story re-verification): `.fp-glow-card::before` + `.fp-glow-card:hover` produce the canonical purple glow via `box-shadow` on `:hover`. The multicolor `hover:shadow-blue-500/20` / `hover:shadow-orange-500/20` / etc. Tailwind utilities currently on `app/opportunities/page.tsx` stat cards are DUPLICATE hover glows on top of what `.fp-glow-card` already provides. Removing them is the canonical cleanup, not a UX regression. AC #3 asserts their absence; Task 9.2 removes them. If a reviewer says "the cards look less glowy after the rebuild" — they're comparing to the pre-Story 14.1 world; the new canonical glow is the correct baseline.
- **ADR-14.7-I (`STATUS_COLORS` external styling in `MessageApprovalCard` is double-styling and must be fixed as part of this story's scope).** Verified at story-authorship time: `src/components/MessageApprovalCard.tsx:202` wraps the `STATUS_COLORS[status]` value with externally-applied `text-xs px-2 py-0.5 rounded font-medium`. After Task 4 rewrites `STATUS_COLORS` to `'fp-badge fp-badge-*'` (which ALREADY carries padding, rounding, font-weight), the external utilities create a double-padding / double-font-weight visual bug. `MessageApprovalCard.tsx:202` MUST be updated in this story to drop the external utilities and use `className={STATUS_COLORS[status] || STATUS_COLORS.DRAFT}` directly. This pulls `MessageApprovalCard` into the story's file list; it is a 1-line change, not a rebuild. Task 4.4 captures this.

## Acceptance Criteria

> Sourced from `_bmad-output/planning-artifacts/epics.md:3004–3039`. Expanded so each AC is independently testable at the correct level (Jest for logic / regex ACs, Playwright E2E for UI-visible ACs) per CLAUDE.md DoD.

1. **Opportunities page has zero non-purple palette violations and zero light-mode violations** — Given `app/opportunities/page.tsx` currently produces 107 matches for `(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|pink|rose|emerald|amber|yellow|red|orange)-[0-9]+` and 58 matches for `bg-(white|gray-[0-9])`, when Story 14.7 is complete, then both counts are **0**. Green-on-profit inline hex (`#34d399` / `#6ee7b7`) is permitted; `bg-green-*` palette classes are not. Pre- and post-edit counts are recorded in Completion Notes for reviewer comparison. `FR-UI-DESIGN-02`

2. **Opportunities page header uses `.fp-glass-nav`** — Given the current header at `app/opportunities/page.tsx:565` uses `backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-2xl sticky top-0 z-10`, when Story 14.7 is complete, then the header root element has `className` containing `"fp-glass-nav"` and no `backdrop-blur-xl` / `bg-white/10` / `border-white/20` hand-rolled tokens remain on it. `FR-UI-DESIGN-02`

3. **Opportunities page stat cards converge on `.fp-glow-card` with a single purple accent** — Given the four stat cards at lines 592, 605, 618, 631 currently mix blue / purple / orange / green hover-glow colors, when Story 14.7 is complete, then each of the four cards uses `className="fp-glow-card p-6"` (or equivalent canonical variant), icon containers use `.fp-glass-sm` circular wrappers with purple (`#8b5cf6`) icons, labels use `#94a3b8` inline, and numbers use `#e2e8f0` / `.fp-metric-num` (green `#34d399` permitted on the profit-related metric card per FR-UI-DESIGN-04). No card carries `hover:shadow-blue-*` / `hover:shadow-orange-*` / `hover:shadow-green-*` — if per-card glow colors are wanted, that is Story 14.1 territory (new `.fp-glow-card-*` variants). `FR-UI-DESIGN-02` `FR-UI-DESIGN-04`

4. **Opportunities filter/search panel uses `.fp-glass` + `.fp-input`** — Given the filter panel wrapper at line 648, the search input at line 659 (`bg-white/10 rounded-lg border border-white/20 focus:ring-blue-400/50 text-white placeholder-blue-200/50`), and the view-toggle buttons at lines 668–694, when Story 14.7 is complete, then (a) the outer panel uses `className="fp-glass p-6 mb-6"`, (b) the search input uses `className="fp-input w-full pl-10 pr-4"` with icon inline-hex `#94a3b8`, (c) each view-toggle button uses `className="fp-btn-ghost"` + `aria-pressed={active}` and an inline `style={{ background: active ? 'rgba(124,58,237,0.15)' : undefined, color: active ? '#c4b5fd' : undefined }}` active state, (d) tag/category multi-select chips use `.fp-badge .fp-badge-purple` (active) / `.fp-badge .fp-badge-gray` (inactive). `FR-UI-DESIGN-02` `FR-UI-DESIGN-07`

5. **Opportunities aging-inventory pill and list-view cards use canonical surfaces** — Given the aging pill at line 825 (`bg-amber-500/20 border border-amber-400/40 rounded-full text-amber-300 text-xs font-semibold`) and the inventory cards at lines 821, 1066, and the inline stat tiles at 1125, 1131, 1139, 1145, 1156, 1166, when Story 14.7 is complete, then the pill is `<span className="fp-badge fp-badge-yellow">Aging</span>` (label text preserved), each card wrapper uses `.fp-glow-card` (list view) or `.fp-glass` (aging view — no hover glow on aging cards because they're warnings), and the inline stat tiles use `.fp-glass-sm p-3` with labels `#94a3b8`, values `#e2e8f0`, profit `#34d399` (inline hex). `FR-UI-DESIGN-02`

6. **KanbanBoard demand-badge mapping is canonical per ADR-14.7-A** — Given the current `DEMAND_BADGES` dict at `src/components/KanbanBoard.tsx:36–47`, when Story 14.7 is complete, then each entry's `className` is exactly:
   - `rising: 'fp-badge fp-badge-red'`
   - `stable: 'fp-badge fp-badge-blue'`
   - `declining: 'fp-badge fp-badge-gray'`
   - `low_liquidity: 'fp-badge fp-badge-yellow'`
   - `very_high: 'fp-badge fp-badge-red'`
   - `high: 'fp-badge fp-badge-purple'` (NOT green — non-financial success → purple per FR-UI-DESIGN-04)
   - `medium: 'fp-badge fp-badge-blue'`
   - `low: 'fp-badge fp-badge-gray'`
   
   A Jest unit test asserts the full dict shape and flags any deviation. `rg "(bg|text|border)-(red|blue|slate|amber|green)-[0-9]+" src/components/KanbanBoard.tsx` returns **zero** matches. `FR-UI-DESIGN-02` `FR-UI-DESIGN-04`

7. **Kanban drag-and-drop behavior preserved, card surface retains `.fp-glass` during drag (keyboard-driven drag)** — Given the existing `@hello-pangea/dnd` behavior, when a Playwright E2E scenario performs a **keyboard-driven** drag (Tab to card → Space to lift → ArrowRight repeatedly to move across columns → Space to drop) from the Identified column to the Purchased column, then (a) the card's status persists via the existing `onStatusChange` callback (verified by intercepting the `PATCH /api/opportunities/:id` request), (b) at drop-time the card element (`data-testid="kanban-card"`) has `fp-glass` in its classList, (c) the card lives in the Purchased column's DOM after the drop, (d) the card's `[data-testid="demand-badge"]` retains the same `fp-badge-*` class it had before the drag. **Rationale for keyboard-driven drag (see Red Team Finding R-2):** `@hello-pangea/dnd` does not respond reliably to Playwright's `page.mouse.move` / `page.dragAndDrop` in headless CI — the library uses pointer-event sensors with timing heuristics that ship-of-Theseus between browser versions. The library's own documentation recommends keyboard drag for automated tests. This approach ALSO satisfies AC #15(e) (keyboard operability) with the same scenario — two birds, one stone. `FR-UI-DESIGN-02` `FR-UI-DESIGN-07`

8. **Listing detail page consumes Story 14.3 shared components for loading, error, and empty states — with distinct 404-vs-5xx semantics** — Given `app/listings/[id]/page.tsx` currently hand-rolls loading as `<p className="text-gray-600">Loading listing...</p>` and error as `<p className="text-red-600">{error}</p>`, when Story 14.7 is complete, then (a) the inner mounted-loading state uses `<LoadingSkeleton variant="card" />`, (b) **HTTP 5xx / network failures** render `<ErrorBanner message={error} onRetry={refetch} />` (transient failure, retry makes sense), (c) **HTTP 404 responses specifically** render `<EmptyState title="Listing not found" message="This listing may have been removed or the link is incorrect." />` (terminal state, no retry CTA — retry on a 404 only amplifies the user's confusion), (d) the null-opportunity sub-state inside a valid listing uses inline `.fp-glass` copy, NOT `<EmptyState>` (a listing without an opportunity is expected data, not an empty app state), (e) the outer `<Suspense>` fallback at line 64 (pre-hydration) remains a plain text fallback by design (see behavioral constraint above), (f) `rg "text-(gray|red|yellow|blue|green)-[0-9]+" app/listings/\[id\]/page.tsx` returns **zero**. Test level is shifted from Jest to Playwright (see Advanced Elicitation Finding Q-4): E2E scenarios S-N+5 (5xx → ErrorBanner) and S-N+9 (404 → EmptyState) cover this — App Router pages with `useParams()` are painful to unit-test without Next.js-specific harness, and a full E2E against `/listings/<id>` gives higher-fidelity coverage at the same cost. `FR-UI-DESIGN-02` `FR-UI-DESIGN-06`

9. **Listing detail page body surfaces use `.fp-glass` / `.fp-glass-sm`** — Given the current page mixes `bg-white` / `bg-gray-50` / `bg-gray-100` on the image gallery, stat grid, opportunity-status panel, and comparable-sales table, when Story 14.7 is complete, then (a) the image gallery wrapper uses `.fp-glass p-4`, (b) the stat grid tiles use `.fp-glass-sm p-4` (4 tiles: Asking Price, Estimated Value, Profit Potential, Value Score — profit uses `#34d399`, others use `#e2e8f0`/`#94a3b8`), (c) the opportunity-status panel uses `.fp-glass p-6`, (d) the comparable-sales table follows Story 14.6 §Task 7 conventions (row dividers `rgba(255,255,255,0.06)`, header `#94a3b8`, cells `#e2e8f0`), (e) `<MeetingRouteCard>` and `<MeetingModal>` children are intentionally out of scope (Story 14.8 territory). `rg "bg-(white|gray-[0-9])" app/listings/\[id\]/page.tsx` returns **zero**. `FR-UI-DESIGN-02`

10. **`MessageBubble` outbound/inbound bubbles use `.fp-glass-sm` with canonical tints, no `dark:` prefixes** — Given the current `MessageBubble.tsx` uses `bg-blue-100 dark:bg-blue-800` (outbound) and `bg-gray-100 dark:bg-gray-700` (inbound), when Story 14.7 is complete, then (a) outbound bubbles have `className="fp-glass-sm max-w-[80%] sm:max-w-[70%] rounded-lg px-4 py-3"` + `style={{ background: 'rgba(124,58,237,0.15)' }}`, (b) inbound bubbles have `className="fp-glass-sm max-w-[80%] sm:max-w-[70%] rounded-lg px-4 py-3"` (default `.fp-glass-sm` tint is neutral), (c) direction label uses `#c4b5fd` (outbound) / `#94a3b8` (inbound) inline, (d) rejected state uses `style={{ color: '#64748b', textDecoration: 'line-through' }}`, (e) NO `dark:*` prefixes survive in the file (ADR-14.7-G), (f) body-copy color is `#e2e8f0` (rejected: `#64748b`). A Jest unit test asserts outbound-direction className and style.background, inbound-direction rendering, and rejected-state line-through. `FR-UI-DESIGN-02` `FR-UI-DESIGN-04`

11. **`STATUS_COLORS` map in `src/lib/message-constants.ts` returns canonical `.fp-badge-*` class strings** — Given the current dict exports entries like `PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'`, when Story 14.7 is complete, then each entry is a single canonical class string: `PENDING → 'fp-badge fp-badge-yellow'`, `APPROVED → 'fp-badge fp-badge-purple'` (non-financial confirmation → purple per FR-UI-DESIGN-04), `SENT → 'fp-badge fp-badge-blue'`, `DELIVERED → 'fp-badge fp-badge-blue'`, `REJECTED → 'fp-badge fp-badge-red'`, `READ → 'fp-badge fp-badge-gray'` (plus any other existing statuses — reviewer to fill remaining entries at implementation time; the rule is: every value starts with `'fp-badge fp-badge-'`). The exported TypeScript signature (`Record<string, string>`) is unchanged. A Jest unit test asserts every value matches `/^fp-badge fp-badge-(red|blue|gray|yellow|green|purple|orange)$/`. `FR-UI-DESIGN-02` `FR-UI-DESIGN-04`

12. **`ThreadHeader.tsx` and `ThreadItem.tsx` use canonical surfaces + purple active state** — Given the current thread-list and thread-header components use `bg-white dark:bg-gray-800`, `text-gray-600 dark:text-gray-300`, `border-blue-500 bg-blue-50` (active thread), when Story 14.7 is complete, then (a) each `ThreadItem` wrapper uses `className="fp-glass-sm p-3"`, (b) the active/selected thread has inline `style={{ border: '1px solid rgba(124,58,237,0.5)', background: 'rgba(124,58,237,0.1)' }}`, (c) the unread dot indicator uses `background: '#8b5cf6'` inline, (d) `ThreadHeader` uses `.fp-glass p-4` with counterparty name in `#e2e8f0` and last-seen timestamp in `#94a3b8`, (e) no `dark:*` prefixes remain in either file (ADR-14.7-G). A Playwright E2E scenario navigates to `/messages`, asserts the thread list renders, clicks an unread thread, and asserts the active-state border color matches `/rgba\(124,\s*58,\s*237/`. `FR-UI-DESIGN-02`

13. **`/messages` page renders three-column layout on canonical glass surfaces with `<EmptyState>` for no-thread-selected** — Given `app/messages/page.tsx` already renders a sidebar + thread-list + thread-detail layout, when Story 14.7 is complete, then (a) the outer layout wrapper uses layout-only Tailwind utilities (grid/flex) with no palette tokens, (b) each of the three column containers uses `.fp-glass` or `.fp-glass-sm` as appropriate, (c) when no thread is selected, the detail pane renders `<EmptyState title="No conversation selected" message="Select a thread from the list to see messages." />`, (d) `rg "(bg|text|border)-(blue|gray|white|red|yellow|green)-[0-9]+" app/messages/page.tsx` returns **zero**. A Playwright E2E scenario loads `/messages` as an authenticated user, asserts the three columns are present, and asserts the detail pane's empty state renders `<EmptyState>`. `FR-UI-DESIGN-02` `FR-UI-DESIGN-06`

14. **Zero raw non-purple palette classes across the full story scope** — Given all six target files, when `rg "(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|violet|fuchsia|pink|rose|emerald|amber|yellow|red|orange)-[0-9]+" app/opportunities/page.tsx "app/listings/\[id\]/page.tsx" app/messages/page.tsx src/components/KanbanBoard.tsx src/components/messages src/lib/message-constants.ts` runs, then **zero** matches are returned. `bg-white` / `bg-gray-[0-9]` stricter grep also returns **zero** on the same files. Task 11 captures pre- and post-edit counts into Completion Notes. `FR-UI-DESIGN-02`

15. **Accessibility — interactive elements keep focus rings, drag-and-drop is keyboard-operable, and empty-state messaging has semantic `role="status"`** — Given an axe-core Playwright scan scoped to `/opportunities`, `/listings/[id]`, and `/messages`, when Story 14.7 is complete, then (a) zero `critical` or `serious` violations are returned on each page's scoped scan, (b) the view-toggle Kanban/List/Aging buttons have `aria-pressed` set correctly on the active button (no `aria-current` — `aria-pressed` is the WAI-ARIA idiom for toggle buttons), (c) Kanban columns have `role="list"` and cards have `role="listitem"` OR the default `<ul>`/`<li>` structure that `@hello-pangea/dnd` already provides is preserved, (d) `<EmptyState>` on the messages page has `role="status"` + `aria-live="polite"` so screen readers announce "no conversation selected" on first render, (e) keyboard drag (Space to lift, arrow keys to move, Space to drop) still works on the Kanban (standard `@hello-pangea/dnd` behavior — this story must not regress it). `FR-UI-DESIGN-07`

16. **Quality gates pass** — Given the updated files, when `make lint`, `make build`, `make test`, `make test-ac STORY=14.7`, `make test-ac FEATURE=F14` all run, then all pass with zero errors, zero skipped scenarios, and zero regressions on other Epic 14 stories' scenarios. Unit-test coverage thresholds unchanged (branches ≥96%, functions ≥98%, lines ≥99%, statements ≥99%). `FR-UI-DESIGN-02`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|-----------------|---------------------|----------|
| FR-UI-DESIGN-02 (canonical `.fp-*` utility classes on every page/component) | AC #1–#14, #16 | `@FR-UI-DESIGN-02` `@story-14-7` `@E-014-S-<N>` |
| FR-UI-DESIGN-04 (green reserved for profit/financial indicators; non-financial success → purple) | AC #3, #6, #10, #11 | `@FR-UI-DESIGN-04` `@story-14-7` `@E-014-S-<N>` |
| FR-UI-DESIGN-06 (shared state components consumed, not hand-rolled) | AC #8, #13 | `@FR-UI-DESIGN-06` `@story-14-7` `@E-014-S-<N>` |
| FR-UI-DESIGN-07 (accessibility: focus rings, ARIA, keyboard nav, aria-live) | AC #4, #15 | `@FR-UI-DESIGN-07` `@story-14-7` `@E-014-S-<N>` |

Acceptance-test scenarios in `test/acceptance/features/E-014-frontend-design-migration.feature` MUST be tagged `@E-014-S-<N>` with `<N>` sequentially assigned after the last Epic 14 scenario already present. At story authorship (2026-04-17), the max observed tag in the feature file is `@E-014-S-27` (Story 14.3's final scenario) — Stories 14.4, 14.5, 14.6 are `ready-for-dev` but have not yet appended scenarios, so the true max at implementation time may be higher. Story 14.7's scenarios append 8 new tags.

**Scenario-number allocation protocol (race-safe)** — before appending scenarios, Task 9.1 performs an atomic reservation:
1. Read the feature file and run the regex `@E-014-S-[0-9]+` across it to find the current max.
2. Compute the next free block as `[max+1, max+8]` (this story needs 8 scenarios — see Task 9).
3. Write a single-line reservation comment at the top of the file: `# Story 14.7 reserves @E-014-S-<start>..@E-014-S-<end> — appended <YYYY-MM-DD>`.
4. Commit that comment first, then append the scenarios in a follow-up commit.
5. If a concurrent story rebased in a competing reservation, rebase and recompute.

## Definition of Done

> Full gate definition: `_bmad-output/project-context.md` → _Story Definition of Done_

- [ ] All tasks/subtasks `[x]`; every AC satisfied; no `any` in production code
- [ ] `make lint` passes — zero ESLint errors, zero unused-import warnings
- [ ] `make build` passes — strict TypeScript, no `ignoreBuildErrors`, zero errors
- [ ] `make test` passes — all Jest unit tests green, zero regressions; coverage ≥96% branches, ≥98% functions, ≥99% lines/statements
- [ ] Jest unit tests added for: (a) `KanbanBoard` demand-badge dict shape (AC #6), (b) `MessageBubble` outbound/inbound/rejected rendering (AC #10), (c) `STATUS_COLORS` every value matches the canonical regex (AC #11), (d) `ListingDetailPage` error-state renders `<ErrorBanner>` and null-listing renders `<EmptyState>` (AC #8)
- [ ] Every AC has a test at the correct level: AC #1, #2, #3 (partial), #4 (partial), #5, #6, #8 (unit), #9, #10, #11, #14 → Jest + regex regression tests; AC #3 card-class, #4 runtime active state, #7, #12, #13, #15 → Playwright E2E scenarios
- [ ] `make test-ac STORY=14.7` passes green — zero failures, zero skipped scenarios
- [ ] `make test-ac FEATURE=F14` passes green across all Epic 14 stories landed so far (14.1, 14.2, 14.3, and any of 14.4/14.5/14.6 that have merged)
- [ ] 9 acceptance scenarios in `test/acceptance/features/E-014-frontend-design-migration.feature` — genuine Playwright E2E journeys for UI-visible ACs (keyboard-driven Kanban drag, stat-card hover glow, filter toggle, messaging empty state, active-thread purple accents, listing-detail 5xx → ErrorBanner path, listing-detail 404 → EmptyState path, axe-scoped scans), each triple-tagged `@FR-UI-DESIGN-<NN>` `@story-14-7` `@E-014-S-<sequential>`
- [ ] Playwright axe-core smoke scenario for AC #15 passes on seeded `/opportunities`, `/listings/[id]`, `/messages` pages with zero `critical`/`serious` violations attributable to the pages' own subtrees
- [ ] RTM updated (`_bmad-output/test-artifacts/requirements-traceability-matrix.md`) — rows for FR-UI-DESIGN-02, -04, -06, -07 × Story 14.7 added
- [ ] Story `Status` → `review`; `sprint-status.yaml` → `review`
- [ ] `File List` table (below) updated with every new/modified/deleted file
- [ ] Trello card moved to Done (board `SvVRLeS5`, `trello-axovia` MCP server). F-014 Feature-card checklist item `[14.7] Opportunities + Listings Detail + Messaging Migration` marked complete
- [ ] Manual browser sanity check on `/opportunities` (Kanban + List + Aging views), `/listings/[id]` (seeded listing), and `/messages` (seeded thread pair) at 360px / 768px / 1280px — no horizontal scroll, Kanban drags on touch, thread-list active state visibly purple, aging pill legible

## Tasks / Subtasks

### Task 0: Prerequisites — confirm upstream stories are in the right state

- [ ] 0.1 **Confirm Story 14.1 is `review` or `done`** — verify `_bmad-output/implementation-artifacts/sprint-status.yaml` shows `14-1-design-tokens-base-style-unification` at `review` or `done`. Story 14.1 supplies the canonical `.fp-glow-card`, `.fp-glass-nav`, `.fp-btn-hot`, and slider rules that AC #3 / #4 / #7 depend on. If 14.1 is not at least `review`, STOP and set `Status: blocked`, `Blocked: true`, `Blocked-Reason: "Story 14.1 must be review/done — .fp-glow-card and .fp-glass-nav are dependencies for AC #2 and #3"`.
- [ ] 0.2 **Confirm Story 14.2 is `review` or `done`** — `rg "bg-theme-|text-theme-|shadow-theme-|var\(--theme-" app/opportunities app/listings app/messages src/components/messages src/components/KanbanBoard.tsx` must return zero matches. If matches are returned, Story 14.2's scrub missed these files — report as a 14.2 regression and block this story until 14.2 re-lands the cleanup.
- [ ] 0.3 **Confirm Story 14.3 is `review` or `done`** — this is a HARD dependency for AC #8 and #13 (unlike Story 14.6 where 14.3 was soft). Verify `src/components/ui/LoadingSkeleton.tsx`, `ErrorBanner.tsx`, and `EmptyState.tsx` all exist and that `src/components/ui/index.ts` (the barrel export referenced by `app/listings/[id]/page.tsx:14` as `import { LoadingSkeleton, ErrorBanner } from '@/components/ui'`) exports **all three** — run `grep -E "^export.*(LoadingSkeleton|ErrorBanner|EmptyState)" src/components/ui/index.ts` and confirm three distinct export lines. `EmptyState` is NOT currently imported at `app/listings/[id]/page.tsx:14` — Task 7 adds it to the import. If the barrel does not export `EmptyState`, BLOCK on 14.3 to surface the barrel gap; do not hand-roll substitutes (that creates duplicate code paths reviewers will reject).
- [ ] 0.5 **Verify canonical classes `.fp-glass-nav` and `.fp-glow-card` exist in `app/globals.css`** — `grep -n "fp-glass-nav\|fp-glow-card" app/globals.css` must return at least 2 class-definition lines (verified at story-authorship time at `app/globals.css:232` and `:240`). If Story 14.1's deliverable regressed and these classes are missing, AC #2 and AC #3 are unbuildable — BLOCK and re-open 14.1.
- [ ] 0.6 **Inventory existing `data-testid` attributes across the six target files** — record each testid into Completion Notes so the diff review can mechanically confirm none were removed. At story-authorship time the critical testids are: `opportunities/page.tsx` — `inventory-view`, `inventory-card`, `llm-identification`, `low-liquidity-warning`, `outside-pickup-radius-warning`, `market-insights`, `low-seller-rating-warning`, `recommendation-details`; `KanbanBoard.tsx` — `kanban-board`, `kanban-card`, `demand-badge`, `kanban-cross-post-button`; `listings/[id]/page.tsx` — `stale-analysis-banner`. Every one of these MUST survive the rebuild unchanged.
- [ ] 0.4 **Confirm Trello board and create card** — read `_bmad-output/project-context.md` for `Trello MCP Server: trello-axovia` + `Trello Board ID: SvVRLeS5`. Create a card titled `[14.7] Opportunities + Listings Detail + Messaging Migration` in the **To Do** list, paste the full Acceptance Criteria block (AC #1–#16) into the description, apply the `Epic 14` label, and backfill `Trello-Card-ID:` into this story's frontmatter. Confirm an F-014 Feature card exists; add `[14.7] Opportunities + Listings Detail + Messaging Migration` to its checklist.

### Task 1: Baseline survey — capture pre-edit state (informational, all ACs)

- [ ] 1.1 Run and save pre-edit grep baseline into Completion Notes for reviewer comparison:
  ```bash
  rg -c "(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|violet|fuchsia|pink|rose|emerald|amber|yellow|red|orange|gray|purple|white)-[0-9]+" \
    app/opportunities/page.tsx "app/listings/[id]/page.tsx" app/messages/page.tsx \
    src/components/KanbanBoard.tsx src/components/messages src/lib/message-constants.ts
  rg -c "bg-(white|gray-[0-9])" \
    app/opportunities/page.tsx "app/listings/[id]/page.tsx" app/messages/page.tsx \
    src/components/KanbanBoard.tsx src/components/messages
  rg -c "dark:" src/components/messages app/messages/page.tsx app/listings/\[id\]/page.tsx
  rg -c "fp-(glass|badge|btn|input|alert|metric-num|glow-card)" \
    app/opportunities/page.tsx "app/listings/[id]/page.tsx" app/messages/page.tsx \
    src/components/KanbanBoard.tsx src/components/messages src/lib/message-constants.ts
  ```
  Expected pre-edit: palette > 0 on every file except KanbanBoard (where it's only 7); light count > 0 on opportunities (58) and listing-detail (6) and messaging components; `dark:` count > 0 on messaging components; `fp-*` count already high on KanbanBoard (8) and zero or low on others.
- [ ] 1.2 Read each target file in full, identifying non-canonical surfaces, buttons, inputs, text colors, badges. Do NOT start editing yet — build a complete catalog. This is a mechanical visual migration; the diff quality depends on the catalog being exhaustive.
- [ ] 1.3 Confirm no behavior-affecting code will be touched: the `useFilterParams` / `toggleMultiSelectValue` / `isMultiSelectActive` helpers, the `calculateDaysHeld` / `calculateCarryingCost` / `isAgingInventory` helpers, the `@hello-pangea/dnd` drag handlers, the `fetch` pipelines, the `Suspense` boundaries, the `useToast` calls — ALL preserved verbatim. `useState`/`useEffect`/`useMemo`/`useCallback` hook structure unchanged.

### Task 2: Rebuild `KanbanBoard.tsx` demand-badge dict (AC #6)

- [ ] 2.1 Update the `DEMAND_BADGES` dict at lines 36–47 per ADR-14.7-A mapping (see AC #6 for the exact eight entries).
- [ ] 2.2 Bump the file header version: `@version` → next integer. Do NOT change `@date`.
- [ ] 2.3 Verify `rg "(bg|text|border)-(red|blue|slate|amber|green)-[0-9]+" src/components/KanbanBoard.tsx` returns zero. The column-chrome entries at lines 70–75 already use `.fp-badge-*` and are unchanged.

### Task 3: Rebuild `MessageBubble.tsx` (AC #10)

- [ ] 3.1 Outer bubble wrapper — replace the ternary `bg-blue-100 dark:bg-blue-800 / bg-gray-100 dark:bg-gray-700` with `className="fp-glass-sm max-w-[80%] sm:max-w-[70%] rounded-lg px-4 py-3"` plus `style={{ background: isOutbound ? 'rgba(124,58,237,0.15)' : undefined }}`.
- [ ] 3.2 Direction label — replace `text-blue-600 dark:text-blue-300 / text-gray-500 dark:text-gray-400` ternary with inline `style={{ color: isOutbound ? '#c4b5fd' : '#94a3b8' }}`. Preserve `aria-label` verbatim.
- [ ] 3.3 Status badge span — the current `text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[status]}` becomes `className={STATUS_COLORS[status] || 'fp-badge fp-badge-gray'}` (the `.fp-badge-*` classes from the rewritten `STATUS_COLORS` already carry padding/rounding/font-weight — drop the hand-rolled `text-xs px-1.5 py-0.5 rounded font-medium`). **CRITICAL (Red Team Finding R-3):** the fallback `'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'` at `MessageBubble.tsx:60` MUST also become `'fp-badge fp-badge-gray'` — leaving it in place would ship palette classes whenever `status` is unknown (e.g., future backend returns a new status key before `STATUS_COLORS` is updated) and silently fail the AC #14 regex regression guard.
- [ ] 3.4 Subject line — `text-gray-400 dark:text-gray-500 line-through / text-gray-600 dark:text-gray-300` ternary becomes `style={{ color: isRejected ? '#64748b' : '#94a3b8', textDecoration: isRejected ? 'line-through' : undefined }}`.
- [ ] 3.5 Body — `text-gray-400 dark:text-gray-500 line-through / text-gray-800 dark:text-gray-200` ternary becomes `style={{ color: isRejected ? '#64748b' : '#e2e8f0', textDecoration: isRejected ? 'line-through' : undefined }}`.
- [ ] 3.6 Timestamp — `text-gray-400 dark:text-gray-500` becomes `style={{ color: '#64748b' }}`.
- [ ] 3.7 Verify `rg "dark:|text-(gray|blue)-[0-9]+|bg-(gray|blue)-[0-9]+" src/components/messages/MessageBubble.tsx` returns zero.

### Task 4: Rewrite `src/lib/message-constants.ts` `STATUS_COLORS` map (AC #11)

- [ ] 4.1 Read the full file to enumerate EVERY status key currently in the dict. Map each to its canonical class:
  - `PENDING` → `'fp-badge fp-badge-yellow'`
  - `APPROVED` → `'fp-badge fp-badge-purple'`
  - `SENT` → `'fp-badge fp-badge-blue'`
  - `DELIVERED` → `'fp-badge fp-badge-blue'`
  - `READ` → `'fp-badge fp-badge-gray'`
  - `REJECTED` → `'fp-badge fp-badge-red'`
  - If additional statuses are discovered at implementation time (e.g., `DRAFT`, `QUEUED`, `FAILED`), assign: `DRAFT → fp-badge-gray`, `QUEUED → fp-badge-yellow`, `FAILED → fp-badge-red`. Record the full final mapping in Completion Notes.
- [ ] 4.2 Preserve the exported TypeScript signature (`Record<string, string>` or equivalent).
- [ ] 4.3 Bump file header version.
- [ ] 4.4 **Audit ALL `STATUS_COLORS` consumers for external double-styling** (per ADR-14.7-I) — run `rg -n "STATUS_COLORS" src/ app/` to enumerate every consumer. At story-authorship time the set is: `src/components/messages/MessageBubble.tsx` (handled in Task 3) and `src/components/MessageApprovalCard.tsx:202` (applies `text-xs px-2 py-0.5 rounded font-medium` externally). For EACH consumer, if it wraps `STATUS_COLORS[...]` with external padding/font/rounding utilities, delete those utilities — `.fp-badge` already provides them. Specifically at `MessageApprovalCard.tsx:202`: change `className={\`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${STATUS_COLORS[message.status] || STATUS_COLORS.DRAFT}\`}` to `className={\`flex-shrink-0 ${STATUS_COLORS[message.status] || STATUS_COLORS.DRAFT}\`}`. If a new consumer is found that was not in the story-authorship-time set, handle it the same way and add it to the File List.

### Task 5: Rebuild `ThreadItem.tsx` and `ThreadHeader.tsx` (AC #12)

- [ ] 5.1 `ThreadItem` outer wrapper — replace `bg-white dark:bg-gray-800 border` with `className="fp-glass-sm p-3"`. Active/selected state (current `border-blue-500 bg-blue-50`) becomes inline `style={{ border: isActive ? '1px solid rgba(124,58,237,0.5)' : undefined, background: isActive ? 'rgba(124,58,237,0.1)' : undefined }}` (where `isActive` is whatever the current prop / comparison is).
- [ ] 5.2 `ThreadItem` counterparty name — `text-gray-900 dark:text-white` becomes `style={{ color: '#e2e8f0' }}`.
- [ ] 5.3 `ThreadItem` last-message preview and timestamp — `text-gray-500 dark:text-gray-400` becomes `style={{ color: '#94a3b8' }}`.
- [ ] 5.4 `ThreadItem` unread-count badge (if present) — replace hand-rolled with `<span className="fp-badge fp-badge-purple">{unreadCount}</span>` OR an unread dot `<span style={{ background: '#8b5cf6', width: 8, height: 8, borderRadius: '50%', display: 'inline-block' }} aria-hidden="true" />`.
- [ ] 5.5 `ThreadHeader` outer wrapper — `bg-white dark:bg-gray-800 border-b` → `className="fp-glass p-4"`.
- [ ] 5.6 `ThreadHeader` counterparty name — inline `#e2e8f0`. Subtitle (last-seen / platform) — inline `#94a3b8`.
- [ ] 5.7 Remove ALL `dark:*` prefixes from both files (ADR-14.7-G).

### Task 6: Rebuild `app/messages/page.tsx` (AC #13)

- [ ] 6.1 Audit the page for any palette/light-mode classes on the three-column layout containers.
- [ ] 6.2 Apply `.fp-glass` to each of the three column containers (sidebar / thread list / detail pane). Layout utilities (grid / flex / gap) unchanged.
- [ ] 6.3 Replace the "no thread selected" empty state with `<EmptyState title="No conversation selected" message="Select a thread from the list to see messages." />` imported from `@/components/ui`.
- [ ] 6.4 Verify `rg "(bg|text|border)-(blue|gray|white|red|yellow|green)-[0-9]+" app/messages/page.tsx` returns zero.

### Task 7: Rebuild `app/listings/[id]/page.tsx` loading / error / empty states (AC #8)

- [ ] 7.1 Keep the outer `<Suspense>` fallback at line 64 AS A PLAIN TEXT fallback per the behavioral constraint. It renders pre-hydration; shipping `<LoadingSkeleton>` there would pull unnecessary JS into the critical path.
- [ ] 7.2 Inner loading state (after `ListingDetail` component mounts and begins fetching) — replace any `text-gray-*` loading paragraph with `<LoadingSkeleton variant="card" />`. The import at line 14 already includes `LoadingSkeleton`.
- [ ] 7.3 Error state — inspect the existing `fetchListing` / effect to determine how HTTP status is captured. Introduce (if not present) a `status` value on the error state so the render branch can distinguish **404** from **5xx / network**. Render path: 404 → `<EmptyState title="Listing not found" message="This listing may have been removed or the link is incorrect." />`; 5xx / network / unknown → `<ErrorBanner message={error} onRetry={refetch} />`. `ErrorBanner` is already imported at line 14; update the import to add `EmptyState`.
- [ ] 7.4 Verify the `refetch` callback exists or extract one from the existing mount effect — `<ErrorBanner>` requires an `onRetry` handler per Story 14.3. If the current effect is inline-anonymous, refactor minimally: lift the fetch into a named `const fetchListing = useCallback(...)` and call it from `useEffect(() => { fetchListing(); }, [fetchListing])`. This is the ONE allowed "logic touch" in an otherwise visual-only rebuild — justified because `<ErrorBanner onRetry>` is a non-negotiable contract from Story 14.3. Record this refactor in Completion Notes.
- [ ] 7.5 Verify `rg "text-(gray|red|yellow|blue|green)-[0-9]+" app/listings/\[id\]/page.tsx` returns zero.

### Task 8: Rebuild `app/listings/[id]/page.tsx` body surfaces (AC #9)

- [ ] 8.1 Image gallery wrapper — migrate to `.fp-glass p-4`.
- [ ] 8.2 Stat grid (Asking Price / Estimated Value / Profit Potential / Value Score) — each tile uses `.fp-glass-sm p-4`. Labels inline `#94a3b8`; values inline `#e2e8f0`; profit value inline `#34d399`; loss value inline `#f87171`.
- [ ] 8.3 Opportunity status panel (current opportunity status, purchase price, resale price, actual profit) — `.fp-glass p-6`. Follow Story 14.6 profit/loss typography rules.
- [ ] 8.4 Comparable-sales table — apply Story 14.6 §Task 7 conventions: row dividers `style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}`, header cells inline `#94a3b8`, body cells inline `#e2e8f0`, profit/loss cells per #8.2 rule.
- [ ] 8.5 Links and inline actions — replace `text-blue-600` / `text-blue-500` anchors with `style={{ color: '#c4b5fd' }}` + `:hover` style via a small utility class OR Tailwind `hover:opacity-80` fallback. `ExternalLink` and `ArrowLeft` icons tint to `#c4b5fd`.
- [ ] 8.6 Verify `rg "bg-(white|gray-[0-9])" app/listings/\[id\]/page.tsx` returns zero and `rg "(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|pink|rose|emerald|amber|yellow|red|orange)-[0-9]+" app/listings/\[id\]/page.tsx` returns zero.
- [ ] 8.7 `<MeetingRouteCard />` and `<MeetingModal />` children are OUT OF SCOPE — do not edit their internals here. Story 14.8 owns them.

### Task 9: Rebuild `app/opportunities/page.tsx` (AC #1–#5)

- [ ] 9.1 **Header** (line 565) — replace `backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-2xl sticky top-0 z-10` with `className="fp-glass-nav sticky top-0 z-10"`. Back-button hover state uses `.fp-btn-ghost` shape; icon tint `#c4b5fd`.
- [ ] 9.2 **Stat cards** (lines 592, 605, 618, 631) — each card uses `className="fp-glow-card p-6"`. Icon circle uses `className="fp-glass-sm"` with icon color `#8b5cf6`. Label `style={{ color: '#94a3b8' }}`. Number uses `className="fp-metric-num text-3xl font-bold"` with `style={{ color: '#e2e8f0' }}` except the profit card which uses `style={{ color: '#34d399' }}` per FR-UI-DESIGN-04. Drop all `hover:shadow-blue-*` / `hover:shadow-orange-*` / `hover:shadow-green-*` / `hover:shadow-purple-*` — `.fp-glow-card:hover` provides the canonical purple glow.
- [ ] 9.3 **Filter/search panel** (line 648) — wrapper to `.fp-glass p-6 mb-6`. Search input (line 659) to `.fp-input w-full pl-10 pr-4`. Search icon tint `#94a3b8`. View-toggle buttons (lines 668–694) to `.fp-btn-ghost` + `aria-pressed` + inline active-state (`background: 'rgba(124,58,237,0.15)', color: '#c4b5fd'` when active). Tag-chip filter buttons (line 725 and surrounding) to `.fp-badge` variants with purple active / gray inactive. "Clear filters" button (line 738) to `.fp-btn-ghost`.
- [ ] 9.4 **List-view cards** (line 1066 and inline stat tiles 1125, 1131, 1139, 1145, 1156, 1166) — card wrapper to `.fp-glow-card p-5`. Inline stat tiles to `.fp-glass-sm p-3` with label `#94a3b8` / value `#e2e8f0` / profit `#34d399`. LLM Identification panel (line 1166) to `.fp-glass-sm p-4`.
- [ ] 9.5 **Aging-inventory cards** (lines 821, 825) — outer card to `.fp-glass p-5` (no hover glow — this is a warning context, not an invitation). Aging pill (line 825) to `<span className="fp-badge fp-badge-yellow">Aging</span>` (or whatever the current label text is, preserved). Inline stats (lines 834, 840, 848, 854) use `#94a3b8` labels, `#e2e8f0` values; carrying cost uses `#f87171` (loss) or `#94a3b8` (neutral).
- [ ] 9.6 **Empty state** (line 798) — replace hand-rolled with `<EmptyState title="No opportunities yet" message="Start scraping a marketplace to find underpriced listings." />`.
- [ ] 9.7 **All copy** — any remaining `text-blue-200/*`, `text-blue-300`, `text-white`, `text-slate-*` instances converted to inline hex per the typography rule above.
- [ ] 9.8 Verify `rg "(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|pink|rose|emerald|amber|yellow|red|orange)-[0-9]+" app/opportunities/page.tsx` returns zero and `rg "bg-(white|gray-[0-9])" app/opportunities/page.tsx` returns zero.
- [ ] 9.9 Keep ALL `data-testid` attributes unchanged. Existing Playwright scenarios for `/opportunities` may reference them.

### Task 10: Acceptance-test scenarios (AC #3, #4, #7, #12, #13, #15)

- [ ] 10.1 **Reserve scenario-number block** — run the regex `@E-014-S-[0-9]+` on `test/acceptance/features/E-014-frontend-design-migration.feature` to find the current max. Reserve `[max+1, max+9]` (now 9 scenarios — S-N+9 added to split listing-detail error into 404 vs 5xx branches per Finding Q-3). Prepend a comment: `# Story 14.7 reserves @E-014-S-<start>..@E-014-S-<end> — appended <YYYY-MM-DD>`. Commit the reservation comment first, then append scenarios.
- [ ] 10.2 Append 9 scenarios under a `# Story 14.7:` section header. Each scenario carries triple-tag `@E-014-S-<N> @FR-UI-DESIGN-<NN> @story-14-7`. Proposed scenarios:
  1. **S-N+1 / FR-UI-DESIGN-02** — "Opportunities page stat cards use canonical fp-glow-card with purple glow **on hover**" — load `/opportunities`, assert all four stat-card elements have `fp-glow-card` in classList. Then for ONE card, call `page.hover()`, wait for the `::before` opacity transition (`await page.waitForFunction(...)` on computed opacity > 0.9 on the card's `::before`), then assert `getComputedStyle(card).boxShadow` matches `/rgba\(124,\s*58,\s*237/` OR `/rgb\(124,\s*58,\s*237\)/`. Per Red Team Finding R-1: `getComputedStyle` does NOT reflect `:hover` rules until the hover is actually simulated and paint is committed — skipping the hover step makes this scenario a false pass.
  2. **S-N+2 / FR-UI-DESIGN-02 / FR-UI-DESIGN-07** — "Opportunities view-toggle buttons expose aria-pressed" — load `/opportunities`, assert Kanban/List/Aging buttons each have `aria-pressed` attribute; exactly one has `aria-pressed="true"`. Click the List button; assert aria-pressed flips correctly.
  3. **S-N+3 / FR-UI-DESIGN-02** — "Opportunities source files have zero non-purple palette classes" — inside the step definition, `fs.readFileSync` each target file (`app/opportunities/page.tsx`, `src/components/KanbanBoard.tsx`) and count regex matches for the banned palette pattern; assert zero. (Source-file regex in-process, not `rg` subprocess — same reason as Story 14.6 S-N+2.)
  4. **S-N+4 / FR-UI-DESIGN-02 / FR-UI-DESIGN-07** — "Kanban card retains fp-glass during **keyboard-driven** drag-and-drop" — load `/opportunities`, switch to Kanban view, Tab to the first card in Identified, press Space to lift, press ArrowRight × 2 to move into Purchased, press Space to drop. Assert (a) during the lift the card's classList includes `fp-glass` (query via `document.activeElement`), (b) after drop the card element lives in the Purchased column's DOM tree, (c) the `PATCH /api/opportunities/:id` request was sent exactly once with body `{ status: 'PURCHASED' }` (captured via `page.waitForRequest`). This scenario doubles as keyboard-operability coverage for AC #15(e) — replaces the unreliable pointer drag simulation (Red Team Finding R-2).
  5. **S-N+5 / FR-UI-DESIGN-02 / FR-UI-DESIGN-06** — "Listing detail page **5xx** error renders ErrorBanner with working retry" — seed a 500 response on `/api/listings/[id]`, load `/listings/<seeded-id>`, assert `[data-testid="error-banner"]` is visible and contains the error message. Click the retry button; assert the network panel shows a second GET request to the same endpoint (proving `refetch` wires through correctly per Task 7.4).
  6. **S-N+6 / FR-UI-DESIGN-02 / FR-UI-DESIGN-06** — "Messages page empty state renders EmptyState with role=status" — load `/messages` as an authenticated user with zero selected thread, assert the detail pane contains an element with `role="status"` + `aria-live="polite"` and text matching "No conversation selected".
  7. **S-N+7 / FR-UI-DESIGN-02** — "Active thread in thread list uses purple accents" — load `/messages` with a seeded thread pair, click the first thread, assert the thread's wrapper has computed `border-top-color` / `border-right-color` / `border-bottom-color` / `border-left-color` ALL equal to `rgb(124, 58, 237)` (Red Team Finding R-4: never assert on the `border` shorthand — Chromium returns a whitespace-inconsistent string; per-side `border-*-color` is the deterministic probe). Also assert the computed `background-color` starts with `rgba(124, 58, 237` (the purple alpha fill).
  8. **S-N+8 / FR-UI-DESIGN-07** — "Axe-core scan returns zero critical/serious violations on all three pages" — load each of `/opportunities`, `/listings/[id]` (seeded), `/messages` (seeded); run axe-core scoped to the page's main content area; assert `result.violations.filter(v => ['critical','serious'].includes(v.impact)).length === 0` on all three pages. Fail the scenario if any page shows violations.
  9. **S-N+9 / FR-UI-DESIGN-02 / FR-UI-DESIGN-06** — "Listing detail page **404** renders EmptyState (NOT ErrorBanner)" — seed a 404 on `/api/listings/nonexistent-id`, navigate to `/listings/nonexistent-id`, assert (a) an `EmptyState` component is rendered with title text matching `/Listing not found/i`, (b) NO `[data-testid="error-banner"]` is present on the page, (c) no retry button is present (a 404 is terminal — retry would amplify confusion). This is the counterpart to S-N+5 and enforces the 404-vs-5xx split required by AC #8 (Stakeholder Finding Q-3).
- [ ] 10.3 Ensure each scenario is a genuine Playwright E2E journey. Scenario S-N+3 is the regression-guard-style file-read regex check (still executes against shipped source); all others are full UI interactions.

### Task 11: Jest unit test extensions (AC #6, #8, #10, #11)

- [ ] 11.1 Create or extend `src/__tests__/components/KanbanBoard.test.tsx` with a new `describe('Story 14.7 — demand-badge canonical mapping')` block. Inside:
  - `it('DEMAND_BADGES maps each key to the canonical .fp-badge combination')` — import `DEMAND_BADGES` (export it from `KanbanBoard.tsx` if not already — this is allowed because the test needs to assert dict shape; alternative is to make `DEMAND_BADGES` a separate exported constant in a helpers file, but inlining the export keeps Task 2 surgical). Assert each of the 8 keys maps to its expected `'fp-badge fp-badge-<color>'` value per AC #6.
  - `it('DEMAND_BADGES contains no raw Tailwind palette classes')` — regex-match every `className` value against `/\bfp-badge fp-badge-(red|blue|gray|yellow|green|purple|orange)\b/` and negative-match against `/bg-(red|blue|slate|amber|green)-[0-9]/`.
- [ ] 11.2 Create or extend `src/__tests__/components/messages/MessageBubble.test.tsx` with:
  - `it('outbound bubble has fp-glass-sm and purple background tint')` — render `<MessageBubble direction="OUTBOUND" status="SENT" body="hi" createdAt={new Date().toISOString()} />`, assert `screen.getByText('hi').closest('.fp-glass-sm')` is truthy, assert bubble wrapper inline `style.background` equals `'rgba(124,58,237,0.15)'`.
  - `it('inbound bubble has fp-glass-sm, no purple tint')` — similar with `direction="INBOUND"`; assert no inline `background` style is set (or that it is `undefined`).
  - `it('rejected bubble renders body with line-through and muted color')` — render with `status="REJECTED"`; assert body element inline `style.textDecoration === 'line-through'` and `style.color === '#64748b'`.
  - `it('no dark: prefixes remain in rendered className')` — inspect the full wrapper classlist; assert no substring matches `/dark:/`.
- [ ] 11.3 Create or extend `src/__tests__/lib/message-constants.test.ts`:
  - `it('every STATUS_COLORS value matches the canonical .fp-badge pattern')` — import `STATUS_COLORS`, iterate over `Object.values(STATUS_COLORS)`, assert each matches `/^fp-badge fp-badge-(red|blue|gray|yellow|green|purple|orange)$/`.
  - `it('includes required status keys')` — assert `STATUS_COLORS.PENDING`, `APPROVED`, `SENT`, `DELIVERED`, `READ`, `REJECTED` are all defined.
- [ ] 11.4 **Listing-detail error/empty coverage is at the Playwright E2E level, not Jest** (Stakeholder Finding Q-4). Rationale: `app/listings/[id]/page.tsx` uses `useParams()` from `next/navigation`, which requires Next.js App Router test harness that this repo's Jest config does not provide. A Jest unit test would need to mock `useParams`, `useRouter`, and manufacture the Suspense boundary — high-churn, low-fidelity. Scenarios S-N+5 (5xx → ErrorBanner + retry) and S-N+9 (404 → EmptyState, no retry) provide higher-fidelity coverage against the real rendered page. DO NOT create `src/__tests__/app/listings-detail.test.tsx` in this story. If `app/listings/[id]/page.tsx` later gets extracted into a pure `<ListingDetailView>` presentation component (Epic 15 territory), Jest coverage becomes viable — not in 14.7.

### Task 12: Regression guards + quality gates (AC #14, #16)

- [ ] 12.1 Run final grep set and capture into Completion Notes:
  ```bash
  # Must return 0
  rg -c "(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|violet|fuchsia|pink|rose|emerald|amber|yellow|red|orange)-[0-9]+" \
    app/opportunities/page.tsx "app/listings/[id]/page.tsx" app/messages/page.tsx \
    src/components/KanbanBoard.tsx src/components/messages src/lib/message-constants.ts
  rg -c "bg-(white|gray-[0-9])" \
    app/opportunities/page.tsx "app/listings/[id]/page.tsx" app/messages/page.tsx \
    src/components/KanbanBoard.tsx src/components/messages
  rg -c "dark:" src/components/messages app/messages/page.tsx "app/listings/[id]/page.tsx"

  # Should return >= 30 (diagnostic — measures canonical token adoption across the story scope)
  rg -c "fp-(glass|badge|btn|input|alert|metric-num|glow-card)" \
    app/opportunities/page.tsx "app/listings/[id]/page.tsx" app/messages/page.tsx \
    src/components/KanbanBoard.tsx src/components/messages src/lib/message-constants.ts
  ```
- [ ] 12.2 `make lint` — zero errors, zero unused-import warnings.
- [ ] 12.3 `make build` — strict TypeScript, zero errors.
- [ ] 12.4 `make test` — all Jest unit tests green (existing + new 14.7 suites). Coverage thresholds unchanged.
- [ ] 12.5 `make test-ac STORY=14.7` — all 8 new scenarios pass, zero skipped.
- [ ] 12.6 `make test-ac FEATURE=F14` — every Epic 14 story's scenarios pass cleanly.
- [ ] 12.7 Manual browser sanity check on `/opportunities` (Kanban + List + Aging view), `/listings/[id]` (seeded), `/messages` (seeded thread pair) at 360px / 768px / 1280px. Verify (a) Kanban drag works on touch, (b) view-toggle keyboard-focusable with visible ring, (c) thread list active state visibly purple, (d) listing-detail error path triggerable (simulate offline → error banner shows with working retry), (e) aging pill legible on dark, (f) no horizontal page scroll introduced.

### Task 13: RTM + sprint-status + Trello finalization (administrative)

- [ ] 13.1 Update `_bmad-output/test-artifacts/requirements-traceability-matrix.md` — add or update rows for:
  - `FR-UI-DESIGN-02 → Story 14.7 AC #1–#14, #16 → E-014-frontend-design-migration.feature scenarios @E-014-S-<reserved range> → test/acceptance/step_definitions/E-014-frontend-design-migration.steps.ts`
  - `FR-UI-DESIGN-04 → Story 14.7 AC #3, #6, #10, #11 → (same scenarios tagged @FR-UI-DESIGN-04 where applicable)`
  - `FR-UI-DESIGN-06 → Story 14.7 AC #8, #13 → (same scenarios tagged @FR-UI-DESIGN-06)`
  - `FR-UI-DESIGN-07 → Story 14.7 AC #4, #15 → (same scenarios tagged @FR-UI-DESIGN-07)`
- [ ] 13.2 Update `_bmad-output/implementation-artifacts/sprint-status.yaml`: `14-7-opportunities-listings-messaging-migration: backlog` → `14-7-opportunities-listings-messaging-migration: review` (on completion). Preserve ALL comments and STATUS DEFINITIONS block verbatim.
- [ ] 13.3 Update this story's frontmatter: `Status: review` (from `ready-for-dev`).
- [ ] 13.4 Update the `File List` table below with every modified/created file.
- [ ] 13.5 Move Trello card `[14.7] Opportunities + Listings Detail + Messaging Migration` from `To Do` to `Done` on board `SvVRLeS5` via `trello-axovia` MCP. Mark the matching checklist item on the F-014 Feature card as complete.

## File List

| Status | Path | Notes |
|--------|------|-------|
| Modified | `app/opportunities/page.tsx` | Full visual rebuild (1,860 lines): header → `.fp-glass-nav`, stat cards → `.fp-glow-card`, filter panel → `.fp-glass` + `.fp-input`, list/aging cards → `.fp-glow-card` / `.fp-glass`, empty state → `<EmptyState>`, all palette classes removed |
| Modified | `app/listings/[id]/page.tsx` | Loading/error/empty states consume Story 14.3 components; body surfaces → `.fp-glass` / `.fp-glass-sm`; all palette classes removed |
| Modified | `app/messages/page.tsx` | Three-column layout surfaces → `.fp-glass`; no-thread-selected empty state → `<EmptyState>` |
| Modified | `src/components/KanbanBoard.tsx` | `DEMAND_BADGES` dict canonicalized to `.fp-badge-*` per ADR-14.7-A; file header version bumped |
| Modified | `src/components/messages/MessageBubble.tsx` | Outbound/inbound/rejected bubbles → `.fp-glass-sm` + inline canonical hex; all `dark:` prefixes removed |
| Modified | `src/components/messages/ThreadHeader.tsx` | → `.fp-glass p-4` + inline canonical hex; all `dark:` prefixes removed |
| Modified | `src/components/messages/ThreadItem.tsx` | → `.fp-glass-sm p-3` + purple active-state border/fill; all `dark:` prefixes removed |
| Modified | `src/components/messages/utils.ts` | Color-returning helpers normalized to return canonical class strings |
| Modified | `src/lib/message-constants.ts` | `STATUS_COLORS` map values all `'fp-badge fp-badge-*'`; signature unchanged |
| Modified | `src/components/MessageApprovalCard.tsx` | 1-line fix at :202 — drop external `text-xs px-2 py-0.5 rounded font-medium` now that `STATUS_COLORS` values carry those styles via `.fp-badge` (ADR-14.7-I) |
| Created | `src/__tests__/components/messages/MessageBubble.test.tsx` | New unit test: outbound/inbound/rejected/no-dark-prefix assertions |
| Created | `src/__tests__/lib/message-constants.test.ts` | New unit test: STATUS_COLORS canonical-regex assertion |
| Modified | `src/__tests__/components/KanbanBoard.test.tsx` | New `Story 14.7` describe block: demand-badge dict assertions |
| Modified | `test/acceptance/features/E-014-frontend-design-migration.feature` | 8 new E2E scenarios under `# Story 14.7` section; triple-tagged |
| Modified | `test/acceptance/step_definitions/E-014-frontend-design-migration.steps.ts` | New step definitions for S-N+1…S-N+8 (Kanban drag, view-toggle aria-pressed, listing-detail error path, messages empty state, axe-scoped scans) |
| Modified | `_bmad-output/test-artifacts/requirements-traceability-matrix.md` | Rows added for FR-UI-DESIGN-02/-04/-06/-07 × Story 14.7 |
| Modified | `_bmad-output/implementation-artifacts/sprint-status.yaml` | `14-7-…: backlog` → `ready-for-dev` on story creation (this file), then `review` on DoD completion |
| Modified | `_bmad-output/implementation-artifacts/epic-14/14-7-opportunities-listings-messaging-migration.md` | Status flipped to `review`; Completion Notes appended |

## Completion Notes

_To be filled in during implementation. Record:_

- _Pre-edit grep counts (palette / light-mode / `dark:` / `fp-*`) vs. post-edit counts per file._
- _Full final `STATUS_COLORS` mapping after Task 4.1 (list every status key and its canonical class)._
- _Any demand-level keys discovered in KanbanBoard beyond the eight in AC #6 — if present, assign per ADR-14.7-A logic and document._
- _Scenario-number block actually allocated: @E-014-S-<start>..<end>._
- _Any deviations from the proposed 8 scenarios — additions, removals, renames._
- _Browser sanity-check results at 360px / 768px / 1280px with screenshots attached to Trello card._
- _Any file that turned out to be larger/smaller in scope than the catalog anticipated, and how the plan was adjusted mid-implementation._
- _Confirmation of the "green reserved for profit" outcome: list each place green hex (`#34d399` / `#6ee7b7`) appears post-edit and justify each as a financial/profit indicator._

## Dev Notes

> Notes for the implementing agent. Read before writing code.

1. **This is a visual-only rebuild across six primary files.** Do not refactor business logic. If the diff contains changes to `useState`, `useEffect`, `useMemo`, `useCallback` dependency arrays, `fetch` calls, `@hello-pangea/dnd` handlers, `useFilterParams`, `toggleMultiSelectValue`, `calculateDaysHeld`, `calculateCarryingCost`, or `isAgingInventory`, stop and re-read this note.
2. **Order of attack minimizes review risk.** Do small files first (KanbanBoard dict, `STATUS_COLORS`, `MessageBubble`, `ThreadHeader`, `ThreadItem`, `utils.ts`, `app/messages/page.tsx`), then `app/listings/[id]/page.tsx`, and save `app/opportunities/page.tsx` (1,860 lines) for last. If quality gates fail on any earlier task, fix before proceeding.
3. **Story 14.3 is a hard dependency.** If `LoadingSkeleton` / `ErrorBanner` / `EmptyState` are not in `src/components/ui/`, STOP and unblock 14.3 — do not inline substitutes.
4. **Green is for profit only.** `#34d399` / `#6ee7b7` inline hex is permitted ONLY on: actual profit numbers, positive P&L, "sold for $X" displays, and the profit column in the per-platform table. NOT on demand indicators, NOT on confirmation badges, NOT on success-state selections. When in doubt: use purple (`#8b5cf6` / `#c4b5fd`). ADR-14.7-A is the canonical demand-badge mapping.
5. **`dark:` prefixes are deleted, not preserved.** Flipper.ai is dark-first after Story 14.1. There is no light mode. Every `dark:bg-*` / `dark:text-*` in the messaging components is dead code once the base class is canonicalized.
6. **Data-testids stay put.** Every `data-testid` attribute across all six files is load-bearing for existing Playwright tests. Do not rename.
7. **Multicolor glow on stat cards is the antipattern.** If an art-direction stakeholder pushes back saying "the four-color stat cards look more interesting", the answer is: FR-UI-DESIGN-04 says green is for profit only, so only the profit card can be green-ish; the design system specifies one accent per card family; the "interesting" view is the dashboard post-14.7 — consistent and readable. If they still want it, Story 14.1 is the place to add new canonical variants.
8. **Do NOT refactor `app/opportunities/page.tsx` into child components in this story.** Extraction is a structural refactor (ADR-14.7-F). It deserves its own story in Epic 15. Keep this PR a visual-only mechanical diff.
9. **Scenario reservation is atomic and goes first.** Commit the reservation comment BEFORE appending scenarios. This is the only protection against a parallel Epic 14 story grabbing the same numbers.
10. **`<MeetingRouteCard>` and `<MeetingModal>` are Story 14.8 territory.** The listing-detail rebuild stops at the page's own surfaces. Don't touch the meeting components' internals here.

## Project Context Reference

- `_bmad-output/project-context.md` — Trello MCP `trello-axovia`, board `SvVRLeS5`, Story Definition of Done canonical source
- `_bmad-output/planning-artifacts/PRD.md` — FR-UI-DESIGN-02 (canonical `.fp-*`), FR-UI-DESIGN-04 (green for profit/financial only), FR-UI-DESIGN-06 (shared state components), FR-UI-DESIGN-07 (accessibility)
- `_bmad-output/planning-artifacts/epics.md:3004–3039` — Story 14.7 epic definition
- `docs/frontend-design-gaps.md` — 2026-04-17 audit; opportunities page + listing detail + messaging flagged as highest-priority light-mode / palette hold-outs
- `~/.claude/skills/flipper-frontend/SKILL.md` — Glassmorphism surfaces, badges, buttons, score ring, demand semantics
- `app/globals.css:294–602` — canonical `.fp-*` rules (`.fp-glass`, `.fp-glass-sm`, `.fp-glass-nav`, `.fp-glow-card`, `.fp-btn-primary`, `.fp-btn-ghost`, `.fp-input`, `.fp-badge`, `.fp-badge-purple/blue/red/yellow/green/gray/orange`, `.fp-alert-*`, `.fp-metric-num`)
- `src/components/ui/` — Story 14.3 shared components (`LoadingSkeleton`, `ErrorBanner`, `EmptyState`, `ScoreRing`) — hard dependency
- `_bmad-output/implementation-artifacts/epic-14/14-1-design-tokens-base-style-unification.md` — Story 14.1 (canonical tokens + `.fp-glow-card` dependency)
- `_bmad-output/implementation-artifacts/epic-14/14-2-remove-competing-multi-theme-system.md` — Story 14.2 (theme layer deleted; no `bg-theme-*` may leak into this story's scope)
- `_bmad-output/implementation-artifacts/epic-14/14-3-shared-ui-state-components.md` — Story 14.3 (LoadingSkeleton/ErrorBanner/EmptyState — hard dependency)
- `_bmad-output/implementation-artifacts/epic-14/14-6-pricecalculator-canonical-reference.md` — Story 14.6 (visual-only rebuild precedent, typography rules, table conventions, scenario-reservation protocol)
- `test/acceptance/features/E-014-frontend-design-migration.feature` — append 8 scenarios after atomic reservation
- `test/acceptance/step_definitions/E-014-frontend-design-migration.steps.ts` — append step definitions for S-N+1..S-N+8

## Advanced Elicitation Findings

Three elicitation methods were run against the initial draft of this story on 2026-04-17. Findings were folded back into the relevant ACs, ADRs, Tasks, and Scenarios above. Summary of what changed and why:

### Method 1 — Pre-Mortem Analysis ("This story failed in review — why?")

**Finding P-1: `.fp-glass-nav` and `.fp-glow-card` existence assumed without verification.** The draft's AC #2 and AC #3 depend on these canonical classes existing in `app/globals.css`. If Story 14.1 had regressed or shipped without them, the rebuild would fail with Tailwind "unknown utility" warnings at build time. **Applied:** Task 0.5 added — `grep -n "fp-glass-nav\|fp-glow-card" app/globals.css` pre-flight check that blocks the story if either class is missing. Verified at story-authorship: both present at lines 232 and 240.

**Finding P-2: Story 14.3's `EmptyState` is NOT in the existing listing-detail import.** `app/listings/[id]/page.tsx:14` currently imports `{ LoadingSkeleton, ErrorBanner }` but NOT `EmptyState`. The draft's Task 7.4 said "update the import to add `EmptyState`" as a one-liner — but if `src/components/ui/index.ts` (the 14.3 barrel) does not export `EmptyState`, the import would fail at build time. **Applied:** Task 0.3 expanded with an explicit `grep -E "^export.*(LoadingSkeleton|ErrorBanner|EmptyState)" src/components/ui/index.ts` check that blocks the story until the barrel exports all three.

**Finding P-3: Existing `data-testid` attributes were not inventoried in the draft.** Fifteen testids exist across the six target files; any accidental removal during the rebuild silently breaks existing Playwright scenarios (including several outside Epic 14). **Applied:** Task 0.6 added — enumerate testids into Completion Notes so the diff review can mechanically confirm preservation. Critical testids listed: `inventory-view`, `inventory-card`, `kanban-board`, `kanban-card`, `demand-badge`, `kanban-cross-post-button`, `stale-analysis-banner`, plus seven opportunities-page sub-testids.

**Finding P-4: `.fp-glow-card:hover` already provides canonical glow — "remove `hover:shadow-*`" needed justification.** A reviewer looking only at the diff would see four hover-glow classes removed without replacement and might request the change be reverted, thinking it regresses UX. **Applied:** ADR-14.7-H added, documenting that `.fp-glow-card::before` + `:hover` (verified at `app/globals.css:240–256` after Story 14.1 landed) IS the canonical replacement — the removed `hover:shadow-*` utilities were double-styling on top of it.

### Method 2 — Red Team Critique (adversarial review of proposed tests)

**Finding R-1: Scenario S-N+1 asserts hover `box-shadow` without simulating hover.** `getComputedStyle()` does not reflect `:hover` rules unless the element is actually under the pointer AND paint has committed. The draft would have been a silent false-pass in CI (hover rule never applied → default empty shadow passes the regex negation by accident, or the assertion would fail because the rule IS there but not active). **Applied:** S-N+1 rewritten to `page.hover()` first, wait for `::before` opacity transition to complete, THEN assert computed `box-shadow`.

**Finding R-2: `@hello-pangea/dnd` cannot be reliably drag-tested with Playwright's pointer API.** Library uses pointer-event sensors with timing heuristics that are notoriously inconsistent across headless browsers. The draft's S-N+4 (pointer drag) would be flaky in CI. **Applied:** S-N+4 rewritten to use **keyboard-driven** drag (Tab → Space → ArrowKeys → Space) — the library's own recommended automated-test pattern. AC #7 and AC #15(e) now share this one scenario, reducing test surface. Two birds, one stone.

**Finding R-3: `MessageBubble.tsx:60` fallback is `'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'` — palette classes the draft did not address.** Rewriting `STATUS_COLORS` entries to `.fp-badge-*` would not scrub the fallback, which ships whenever `status` is missing from the dict. Any future backend status key would silently fail the AC #14 palette-zero regression guard. **Applied:** Task 3.3 updated — fallback becomes `'fp-badge fp-badge-gray'`.

**Finding R-4: Scenario S-N+7 asserts on the `border` shorthand.** `getComputedStyle().border` returns a whitespace-inconsistent string across Chromium versions (`"1px solid rgb(…)"` vs `"rgb(…) 1px solid"` has been observed). **Applied:** S-N+7 rewritten to assert on per-side `border-*-color` (deterministic across browsers).

**Finding R-5: `STATUS_COLORS` consumers in `MessageApprovalCard.tsx:202` apply external padding/font utilities — after Task 4 these become double-styling.** Verified: `src/components/MessageApprovalCard.tsx:202` wraps the lookup with `text-xs px-2 py-0.5 rounded font-medium`. When `STATUS_COLORS.PENDING` goes from `'bg-yellow-100 text-yellow-800 …'` to `'fp-badge fp-badge-yellow'`, the `.fp-badge` class already provides all those utilities → visible double-padding / double-border-radius. **Applied:** ADR-14.7-I added; Task 4.4 added (audit ALL `STATUS_COLORS` consumers, strip external styling that `.fp-badge` already provides); File List now includes `MessageApprovalCard.tsx` as modified.

### Method 3 — Stakeholder Perspective Shift (backend/QA engineer reviewing the PR)

**Finding Q-1: Six files, ~2,400-line diff — review fatigue risk.** A reviewer facing this size PR on `/opportunities` alone (1,860 lines) is likely to rubber-stamp or get lost. **Applied:** Dev Notes §2 formalized a commit order ("small files first, opportunities last, fix quality-gate failures before advancing"). Task 11 also orders the Jest additions by file size so an early failure surfaces before the largest diff is in flight.

**Finding Q-2: `STATUS_COLORS` is consumed outside MessageBubble; external wrappers assume the old class shape.** See R-5. **Applied:** same fix (ADR-14.7-I + Task 4.4).

**Finding Q-3: AC #8 conflated 404 (terminal state) with 5xx (transient error).** Rendering `<ErrorBanner>` with a retry CTA on a 404 invites the user to retry a URL that will never work. Semantically, 404 is `<EmptyState>` territory; 5xx / network is `<ErrorBanner>` territory. **Applied:** AC #8 rewritten to split the two paths. Task 7.3 updated with the distinction; Task 7.4 captures the minimal `refetch` refactor justified by `<ErrorBanner onRetry>` being a non-negotiable 14.3 contract. A 9th scenario (S-N+9) added to cover the 404 → `<EmptyState>` branch; S-N+5 now explicitly scopes to 5xx.

**Finding Q-4: Jest coverage for `app/listings/[id]/page.tsx` is high-churn, low-fidelity.** App Router pages use `useParams()` from `next/navigation`; this repo's Jest config does not ship the Next.js Router test harness. A Jest test here requires manually mocking three hooks and a Suspense boundary per assertion — noisy and flaky. **Applied:** Task 11.4 rewritten to explicitly NOT create a Jest test for listings-detail; coverage is fully delegated to Playwright scenarios S-N+5 (5xx) and S-N+9 (404), which exercise the real rendered page. Removed `src/__tests__/app/listings-detail.test.tsx` from the File List.

### Net effect

- 2 new ADRs added (H — canonical hover glow rationale; I — STATUS_COLORS consumer audit)
- 2 ACs rewritten (#7 keyboard-driven drag; #8 404-vs-5xx split)
- 5 Tasks added or materially updated (0.3 expanded, 0.5, 0.6, 3.3, 4.4, 7.3, 7.4, 11.4)
- 3 Scenarios rewritten (S-N+1 hover before assert, S-N+4 keyboard drag, S-N+7 per-side border-color)
- 1 Scenario added (S-N+9 404 → EmptyState)
- 1 File added to scope (`src/components/MessageApprovalCard.tsx` — 1-line fix)
- 1 Jest test file removed from scope (listings-detail coverage shifted to Playwright)

Total scenario count went from 8 → 9; the scenario-number reservation block (Task 10.1) updated from `[max+1, max+8]` to `[max+1, max+9]`.

## Story Completion Status

_Auto-generated comprehensive context engine analysis completed 2026-04-17, advanced elicitation (Pre-Mortem + Red Team + Stakeholder Shift) applied same day. This story is a visual-only rebuild across seven files (six primary + `MessageApprovalCard.tsx` 1-line fix pulled in via ADR-14.7-I). Zero business-logic change; ONE minor logic touch allowed (lifting `fetchListing` into a `useCallback` to power `<ErrorBanner onRetry>`). Hard dependencies: Story 14.1 (canonical tokens — `done`), Story 14.3 (shared state components — `review`). Soft dependency: Story 14.6 (precedent for rebuild approach, scenario-reservation protocol). Blast radius: seven source files, three new/modified test files, one feature file, one steps file, two BMAD artifacts. Acceptance test count: 9 new E2E scenarios + ~12 new Jest assertions across three component/lib test files. ADR-14.7-A (demand-badge canonical mapping) is the most durable decision — it becomes the authority Story 14.9 and beyond inherit._
