# Story 14.8: Settings and Component-Level Polish

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID:

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->
<!-- Trello-Card-ID: populated during sprint intake when the trello-axovia card is created. -->

## Story

As a **user opening the deep-dive panels of Flipper.ai** (settings, modals, approval queue, meeting scheduler, upgrade prompt, posting-queue cards, filter drawer),
I want every settings panel, modal, and secondary component rebuilt on the canonical dark-glassmorphism design system,
so that the entire working surface of the product speaks one visual language — not a second, lighter, bluer UI that appears the moment I leave the dashboard.

## Problem Statement

Per `docs/frontend-design-gaps.md` §2.3 (component audit) and direct `rg` measurement on the current branch (2026-04-17), the settings and secondary-component stack is the single largest remaining concentration of pre-design-system code in the repo. The headline numbers across the 16 files in scope:

| File | Lines | Palette violations | Light-mode violations | Canonical `fp-*` uses |
|------|------:|-------------------:|----------------------:|----------------------:|
| `src/components/NotificationSettings.tsx` | 1,198 | 22 | 22 | 0 |
| `src/components/BillingSettings.tsx` | 544 | 19 | 10 | 4 |
| `src/components/MessageApprovalCard.tsx` | 369 | 11 | 8 | 0 |
| `src/components/posting-queue/CrossPostModal.tsx` | 309 | 3 | 6 | 0 |
| `src/components/MeetingRouteCard.tsx` | 298 | 11 | 6 | 0 |
| `src/components/FilterPanel.tsx` | 294 | 2 | 3 | 8 |
| `src/components/ApprovalQueue.tsx` | 282 | 8 | 2 | 0 |
| `src/components/ScoringSettings.tsx` | 277 | 5 | 6 | 0 |
| `src/components/ResaleContentEditor.tsx` | 267 | 5 | 4 | 0 |
| `src/components/posting-queue/QueueItemCard.tsx` | 263 | 1 | 0 | 10 |
| `src/components/MeetingModal.tsx` | 203 | 4 | 5 | 0 |
| `src/components/MessagingSettings.tsx` | 149 | 5 | 4 | 0 |
| `src/components/UsageDisplay.tsx` | 143 | 4 | 6 | 0 |
| `src/components/IntegrationsSettings.tsx` | 128 | 3 | 1 | 0 |
| `src/components/LogisticsSettings.tsx` | 122 | 1 | 1 | 0 |
| `src/components/UpgradePrompt.tsx` | 94 | 5 | 0 | 0 |
| **Total** | **5,040** | **109** | **84** | **22** |

Observations that drive the rebuild plan:

- **`NotificationSettings.tsx` is the worst offender** (22 palette + 22 light-mode hits across 1,198 lines). It hand-rolls every surface with `bg-white dark:bg-gray-800 rounded-lg shadow`, uses `bg-blue-500` on toggle active states, `text-blue-600` on section headers, `bg-yellow-50 border-yellow-200 text-yellow-800` on quiet-hours warnings, and `bg-red-50 border-red-200` on danger confirmations. None of these surface classes map cleanly to a single `.fp-glass` swap because the file is structured around ~8 nested accordion/section components — each section needs its own `.fp-glass p-6` wrapper, and the inner form rows get the standard canonical label/input/helper-text treatment.
- **Toggle switches are the single most visible bug.** Every settings file that renders a toggle (`NotificationSettings`, `MessagingSettings`, `ScoringSettings`, `IntegrationsSettings`, `LogisticsSettings`) uses `peer-checked:bg-blue-500` or `data-[state=checked]:bg-blue-600` or a hand-rolled `bg-blue-500` on the active state. The AC explicitly calls out `#7c3aed` (purple) as the canonical active color. This is a one-line-per-file change but the aggregate impact on perceived polish is huge — toggles are the single interactive element a user touches most often in settings, and they currently scream "this is a different app than the dashboard".
- **`BillingSettings.tsx`** is partially migrated (4 `.fp-*` uses already present, likely from an earlier incidental pass), which means some sections already speak the canonical design while adjacent sections on the same page still use `bg-white dark:bg-gray-800`. This split-personality state is actually worse than the unmigrated state because the visual discontinuity lands inside a single viewport — one paragraph is dark glass, the next is a white card. The rebuild must complete the partial migration and remove the mixed state.
- **`MessageApprovalCard.tsx:202`** was already flagged in Story 14.7's ADR-14.7-I (the double-padding / double-font-weight bug where external utilities wrap `STATUS_COLORS[status]`). Story 14.7 drops the external utilities on that ONE line. This story picks up the rest of the card: the wrapper uses `bg-white dark:bg-gray-800`, the approve/reject buttons use `bg-green-600 hover:bg-green-700` and `bg-red-600 hover:bg-red-700`, the source-platform pill uses `bg-blue-100 text-blue-800`, and the counterparty name uses `text-gray-900 dark:text-gray-100`. All of this migrates to canonical.
- **`MeetingRouteCard.tsx`** (298 lines, 11 palette + 6 light-mode) is rendered on both the opportunities detail page (Story 14.7 excluded it from scope per that story's §9(e)) and the meetings view. It uses `bg-white` cards with `text-gray-600` copy, `bg-blue-50 border-blue-200` info banners for "next meeting at X", and `bg-amber-50 border-amber-200` for late/missed meetings. The info banners should collapse to `.fp-alert-info` and `.fp-alert-warn` respectively.
- **`FilterPanel.tsx`** already uses 8 canonical classes (likely the initial migration attempt). The remaining violations are 2 palette + 3 light-mode — small edits at specific line numbers that the developer can find via `rg` at implementation time.
- **`QueueItemCard.tsx`** is MOSTLY migrated (10 canonical classes, 1 palette, 0 light-mode). The 1 palette hit is likely a status-specific color that needs to collapse to a `.fp-badge-*` variant.
- **`UpgradePrompt.tsx`** has 5 palette + 0 light-mode — it's a modal that uses `bg-gradient-to-br from-blue-600 to-purple-600` (a mixed-accent gradient). Per ADR-14.7-C's "single accent" rule (inherited), this collapses to a pure purple gradient: `from-[#7c3aed] to-[#6d28d9]` or simply a `.fp-glass` surface with a purple primary CTA.
- **`CrossPostModal.tsx`** renders a multi-marketplace selector that currently uses `bg-white` list rows with `border-gray-200` dividers and `bg-blue-500` active-selection pills.
- **`UsageDisplay.tsx`** is the usage-meter component (FREE/PRO tier progress bars). It uses `bg-gray-200` for the track and `bg-blue-500` for the fill. The track should use `rgba(255,255,255,0.06)` (the canonical neutral divider tint) and the fill should use the purple gradient `linear-gradient(90deg, #7c3aed, #a78bfa)` — which is the canonical progress-bar treatment documented in the skill.

**ThemeSettings.tsx status (already handled, no work required in 14.8):** Verified via `git status` at story-authorship time — `src/components/ThemeSettings.tsx`, `src/contexts/ThemeContext.tsx`, `src/lib/theme-config.ts`, `src/components/ThemeStyles.tsx`, and their tests are all marked **deleted** (staged for deletion by Story 14.2, which has status `done` in `sprint-status.yaml:176`). The AC in `epics.md:3063–3065` that says "`ThemeSettings.tsx` either does not exist (preferred) or has been rewritten" is ALREADY satisfied by the preferred branch — the file does not exist. No action required from 14.8 on this AC; the acceptance scenario simply asserts the files do not exist in the repo post-Story-14.2-merge.

The `rg` regressions required by the DoD:

```bash
# Must return zero when the story is complete — palette (exclude purple/violet for design system)
rg "(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|fuchsia|pink|rose|emerald|amber|yellow|red|orange|green)-[0-9]+" \
  src/components/NotificationSettings.tsx src/components/BillingSettings.tsx src/components/IntegrationsSettings.tsx \
  src/components/MessagingSettings.tsx src/components/ScoringSettings.tsx src/components/LogisticsSettings.tsx \
  src/components/UsageDisplay.tsx src/components/MeetingModal.tsx src/components/MeetingRouteCard.tsx \
  src/components/ResaleContentEditor.tsx src/components/ApprovalQueue.tsx src/components/MessageApprovalCard.tsx \
  src/components/UpgradePrompt.tsx src/components/posting-queue/CrossPostModal.tsx src/components/FilterPanel.tsx \
  src/components/posting-queue/QueueItemCard.tsx

# Must return zero — light-mode surfaces
rg "bg-(white|gray-[0-9])" <same file list>
```

Green inline hex (`#34d399`, `#6ee7b7`) is permitted on profit/positive financial indicators per FR-UI-DESIGN-04 (e.g., "current plan saves you $X" in `BillingSettings`, positive deltas in `UsageDisplay`). Green Tailwind palette classes (`bg-green-*`, `text-green-*`) are NOT permitted.

Behavioral constraints that MUST survive the rebuild (visual-only migration):

- **Every settings form's save/cancel flow preserved.** The `handleSave`, `handleCancel`, dirty-state tracking, optimistic UI update, server-sync, and error-toast handlers in each settings component are not touched.
- **Toggle switch semantics preserved.** The `checked` / `onCheckedChange` contract, `aria-checked`, and `role="switch"` roles stay verbatim. Only the active-state background color and the thumb animation change.
- **`UsageDisplay` tier-gating logic preserved** — the FREE/PRO/ENTERPRISE branches, percentage calculation, "over-limit" warning state, and upgrade-CTA render condition are not touched.
- **`UpgradePrompt` stripe-checkout CTA preserved** — the `stripe.redirectToCheckout` call, the `priceId` prop, and the dismiss handler are not touched.
- **`CrossPostModal` marketplace selector semantics preserved** — multi-select state, tier-gated marketplace options (enterprise-only platforms hidden for FREE/PRO users), and the submit-to-queue handler are not touched.
- **`MeetingModal` / `MeetingRouteCard` scheduling semantics preserved** — timezone conversion, conflict detection, Google Calendar sync CTA, and the "copy meeting link" clipboard handler are not touched.
- **`ApprovalQueue` and `MessageApprovalCard` approve/reject/edit flows preserved** — the `onApprove` / `onReject` / `onEdit` callbacks, optimistic removal-from-queue, and the retry-on-failure handler are not touched.

## Solution (High-Level Approach)

Rebuild all 16 component files as a pure visual migration. The file list is long but the pattern is mechanical and repeats: outer wrapper `bg-white dark:bg-gray-800 rounded-lg shadow` → `.fp-glass p-6`, section headers `text-gray-900 dark:text-gray-100` → inline `#e2e8f0`, helper copy `text-gray-600 dark:text-gray-400` → inline `#94a3b8`, form inputs `bg-white border border-gray-300` → `.fp-input`, primary buttons `bg-blue-600` → `.fp-btn-primary`, secondary buttons `bg-gray-200` → `.fp-btn-ghost`, danger buttons `bg-red-600` → `.fp-btn-danger`, status pills `bg-yellow-100 text-yellow-800` → `.fp-badge .fp-badge-yellow`, info banners `bg-blue-50 border-blue-200 text-blue-900` → `.fp-alert-info`, warning banners `bg-amber-50 border-amber-200 text-amber-900` → `.fp-alert-warn`, danger banners `bg-red-50 border-red-200 text-red-900` → `.fp-alert-danger`, toggle `peer-checked:bg-blue-500` → `peer-checked:bg-[#7c3aed]`, progress tracks `bg-gray-200` → `background: rgba(255,255,255,0.06)`, progress fills `bg-blue-500` → `background: linear-gradient(90deg, #7c3aed, #a78bfa)`.

### File-by-file plan

1. **`NotificationSettings.tsx` (1,198 lines — the heavy lift).** The file is structured around ~8 nested section accordions (Email, Push, SMS, Quiet Hours, Preferences by Type, Digest, Webhooks, Test). Each section:
   - Outer wrapper → `.fp-glass p-6 mb-6`
   - Section header (h3) → `className="text-lg font-semibold mb-4"` + `style={{ color: '#e2e8f0' }}`
   - Description line → `style={{ color: '#94a3b8' }}`
   - Every form row's label → inline `#e2e8f0`, helper text `#94a3b8`, input `.fp-input w-full`
   - Every toggle switch → the canonical switch pattern: `<label className="relative inline-flex cursor-pointer items-center">` with `<div className="peer h-6 w-11 rounded-full bg-white/10 after:... peer-checked:bg-[#7c3aed]">` (the track inherits `rgba(255,255,255,0.06)` when unchecked and `#7c3aed` when checked; thumb is `#f1f5f9`)
   - Quiet Hours time picker → `.fp-input` styling
   - Quiet Hours "overnight wraps midnight" warning banner → `.fp-alert-warn`
   - "Delete all notification preferences" danger banner → `.fp-alert-danger`
   - Save/Cancel footer → `.fp-btn-primary` / `.fp-btn-ghost`
   
   This file expands from ~22 surface edits into a mechanical rebuild of each section's wrapper, with the form rows inside each section getting the same per-row canonical treatment. Expected diff size: ~500 lines changed (mostly className rewrites).

2. **`BillingSettings.tsx` (544 lines).** Current plan card, upgrade options cards, invoice history table, payment method card. Plan card → `.fp-glow-card p-6` with "Current Plan: Pro" header in `#e2e8f0`, plan price in `.fp-metric-num`, feature-list bullets in `#e2e8f0`. Upgrade options → three `.fp-glow-card` cards in a grid, purple accent on the "Most Popular" card (inline purple border `rgba(124,58,237,0.5)`). Invoice history → a canonical table per the 14.7 pattern (row dividers `rgba(255,255,255,0.06)`, header `#94a3b8`, cells `#e2e8f0`, status pills `.fp-badge-*`). Payment method → `.fp-glass p-6` with the masked card number in `#e2e8f0` and the "Update payment method" button as `.fp-btn-ghost`. "Cancel subscription" danger button → `.fp-btn-danger`.

3. **`IntegrationsSettings.tsx` (128 lines).** List of third-party integrations (Google Calendar, Zapier, webhook). Each integration card → `.fp-glass-sm p-4` with icon inline, name `#e2e8f0`, connection status pill `.fp-badge .fp-badge-green` (connected) / `.fp-badge .fp-badge-gray` (disconnected), action button `.fp-btn-ghost`. Active-integration indicator uses inline purple hex (`#8b5cf6`) on the icon.

4. **`MessagingSettings.tsx` (149 lines).** Auto-reply toggle, AI-draft approval requirement toggle, message signature textarea. Outer wrapper `.fp-glass p-6`. Toggles → canonical `#7c3aed` active state. Signature textarea → `.fp-input` with `min-h-[120px]`. "Preview signature" button → `.fp-btn-ghost`.

5. **`ScoringSettings.tsx` (277 lines).** Weight sliders for category/condition/brand/risk factors. Outer wrapper `.fp-glass p-6`. Each slider is an `<input type="range">` — the thumb MUST use the canonical purple thumb styling (already present in `app/globals.css` per Story 14.1 — verified `14-1-design-tokens-base-style-unification: done` in `sprint-status.yaml:175`). The weight value readout uses `.fp-metric-num text-sm`. "Reset to defaults" → `.fp-btn-ghost`. "Save weights" → `.fp-btn-primary`. Warning banner "changing weights will recompute all opportunity scores" → `.fp-alert-warn`.

6. **`LogisticsSettings.tsx` (122 lines).** Default pickup radius, preferred payment methods for buying, max-distance-to-drive. Simple form: `.fp-glass p-6` wrapper, `.fp-input` fields, `.fp-btn-primary` save button.

7. **`UsageDisplay.tsx` (143 lines).** Renders the usage meter component (scans-used / scans-limit for FREE, messages-drafted for PRO, etc). Outer wrapper `.fp-glass-sm p-4`. Progress bar track uses inline `style={{ background: 'rgba(255,255,255,0.06)', height: '8px', borderRadius: '4px' }}`, fill uses inline `style={{ background: 'linear-gradient(90deg, #7c3aed, #a78bfa)', height: '100%', width: \`${pct}%\`, borderRadius: '4px', transition: 'width 300ms ease' }}`. "You've used X of Y" label in `#94a3b8`. Over-limit warning state → the fill switches to `linear-gradient(90deg, #f87171, #fca5a5)` (red gradient) AND a `.fp-alert-warn` banner renders below the bar. Upgrade CTA link uses `#c4b5fd` inline with purple underline.

8. **`MeetingModal.tsx` (203 lines).** Modal dialog for scheduling a meeting with a seller. Modal backdrop inherits from the parent dialog harness; modal body → `.fp-glass p-8 max-w-2xl`. Date picker, time picker, timezone dropdown → `.fp-input`. "Add to calendar" CTA → `.fp-btn-primary`. Conflict warning ("you have another meeting at this time") → `.fp-alert-warn`. Success state after scheduling → `.fp-alert-success` banner with `#34d399` checkmark icon.

9. **`MeetingRouteCard.tsx` (298 lines).** Card showing an upcoming meeting with seller info, timestamp, location link. Wrapper → `.fp-glass p-6` (no hover glow — this is info display, not a clickable stat card). Seller name in `#e2e8f0`, time in `#c4b5fd` (purple, because upcoming meetings are a positive action-pending state), location link in `#94a3b8`. "Next meeting at X" info banner → `.fp-alert-info`. "Meeting late / missed" banner → `.fp-alert-warn`. Copy-link button → `.fp-btn-ghost`. "Reschedule" button → `.fp-btn-primary`.

10. **`ResaleContentEditor.tsx` (267 lines).** Rich-text-ish editor for generating resale listing copy (AI-assisted). Outer wrapper `.fp-glass p-6`. Textarea → `.fp-input min-h-[300px]`. "Generate with AI" button → `.fp-btn-primary` with purple inline accent. "Reset to template" → `.fp-btn-ghost`. Character count readout in `#94a3b8`. AI-generation loading state uses `<LoadingSkeleton variant="text" lines={4} />` (Story 14.3 component).

11. **`ApprovalQueue.tsx` (282 lines).** List of pending message drafts awaiting user approval. Outer wrapper layout-only (no palette). Each approval row delegates to `<MessageApprovalCard />` (item 12). Empty state ("no pending approvals") → `<EmptyState title="No pending approvals" message="AI-drafted messages will appear here for your review." />` (Story 14.3 component). Filter tabs at top ("All / Pending / Rejected") → three `.fp-btn-ghost` with `aria-pressed` active state styled inline purple.

12. **`MessageApprovalCard.tsx` (369 lines).** One card per pending message draft. Wrapper → `.fp-glass p-6`. Counterparty name in `#e2e8f0`, source-platform pill (eBay/Craigslist/etc.) → `.fp-badge .fp-badge-blue`. Draft message body in `#e2e8f0` with a `.fp-glass-sm p-4` inline wrapper (quoted-block look). Status pill uses `STATUS_COLORS[status]` — which Story 14.7's Task 4 rewrote to return canonical `.fp-badge .fp-badge-*` strings. Story 14.7's ADR-14.7-I already drops the external utility wrapper at line 202. This story picks up every other surface in the file — the approve button (→ `.fp-btn-primary`), the reject button (→ `.fp-btn-danger`), the edit button (→ `.fp-btn-ghost`), the "AI confidence: 87%" readout (`.fp-metric-num text-sm` in `#c4b5fd`), the draft-created-at timestamp (in `#94a3b8`).

13. **`UpgradePrompt.tsx` (94 lines).** Upgrade-to-Pro/Enterprise modal/sheet. Outer wrapper `.fp-glass p-8 max-w-lg` — no gradient background (single-accent rule inherited from FR-UI-DESIGN-04 + ADR-14.7-C). Header "Upgrade to Pro" in `#e2e8f0` with purple accent icon (`#8b5cf6`). Feature-comparison list with checkmarks (`#34d399` per feature). "Upgrade now — $X/month" CTA → `.fp-btn-primary` sized large (`py-3 px-6 text-base`).

14. **`CrossPostModal.tsx` (309 lines).** Modal for cross-posting a listing to multiple marketplaces. Body → `.fp-glass p-8 max-w-2xl`. Marketplace list → rows of `.fp-glass-sm p-3` with checkbox on left, marketplace icon + name in center, tier-gate badge on right (`.fp-badge .fp-badge-purple` "Pro" or `.fp-badge .fp-badge-yellow` "Enterprise"). Disabled rows (tier-gated out) use `opacity-50` + `cursor-not-allowed`. "Post to selected marketplaces" CTA → `.fp-btn-primary`.

15. **`FilterPanel.tsx` (294 lines).** Filter drawer already uses 8 canonical classes. The 2 palette + 3 light-mode hits are small edits. At implementation time the developer should `rg` each violation in this file and collapse to canonical. Likely targets: remaining `bg-white` on a filter-chip, `text-gray-700` on a label, `border-blue-500` on the active-filter ring.

16. **`QueueItemCard.tsx` (263 lines).** Posting-queue item card. Already 10 canonical uses, only 1 palette violation. At implementation time, find the violation via `rg "(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|fuchsia|pink|rose|emerald|amber|yellow|red|orange|green)-[0-9]+" src/components/posting-queue/QueueItemCard.tsx` and collapse to the nearest canonical class. Likely a status-specific color — map to the appropriate `.fp-badge-*` variant.

### Canonical toggle-switch pattern (used in 5 settings files)

Every toggle switch across `NotificationSettings`, `MessagingSettings`, `ScoringSettings`, `IntegrationsSettings`, and `LogisticsSettings` MUST use this exact markup (one canonical component, repeated):

```tsx
<label className="relative inline-flex cursor-pointer items-center">
  <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
  <div
    className="h-6 w-11 rounded-full after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-[#f1f5f9] after:transition-transform peer-checked:after:translate-x-5"
    style={{
      background: value ? '#7c3aed' : 'rgba(255,255,255,0.06)',
      transition: 'background-color 150ms ease',
    }}
    role="switch"
    aria-checked={value}
  />
  <span className="ml-3 text-sm" style={{ color: '#e2e8f0' }}>{label}</span>
</label>
```

Implementation notes:
- The inline `style` on the track (rather than `peer-checked:bg-[#7c3aed]`) is because Tailwind JIT requires arbitrary-value classes to appear as full string literals in the source; inline hex is scanner-proof.
- The `transition: 'background-color 150ms ease'` in the `style` object IS what drives the smooth color animation on toggle — React changes the `background` value; the browser applies the transition because the transition rule is stable across renders. Without this line the track color snaps.
- The thumb animation (`peer-checked:after:translate-x-5` + `after:transition-transform`) continues to animate via the checkbox's `:checked` state.
- `role="switch"` + `aria-checked` is WCAG AA mandatory for toggle semantics. AC #3 validates the purple active color; AC #18 validates the `role="switch"` + `aria-checked` pairing; AC #3 additionally validates that the track-color transition is present (not snapping).

### Typography rules applied everywhere (inherited from Stories 14.6 and 14.7)

- Primary copy: `#e2e8f0`
- Secondary/helper copy: `#94a3b8`
- Tertiary/placeholder: `#475569` or `#64748b`
- Profit/positive: `#34d399` / `#6ee7b7`
- Loss/danger: `#f87171` / `#fca5a5`
- Warning: `#fbbf24` / `#fcd34d`
- Purple accent (interactive/success-non-financial): `#8b5cf6` / `#c4b5fd`
- Purple CTA background: `#7c3aed` (hover `#6d28d9`)

### Inherited conventions (applied as rules, not re-argued)

These rules are already established upstream — the story applies them mechanically and does NOT re-litigate:

- **Single-accent surfaces per FR-UI-DESIGN-04 + ADR-14.7-C.** `UpgradePrompt.tsx`'s current `bg-gradient-to-br from-blue-600 to-purple-600` becomes pure `.fp-glass` with a single purple CTA. No mixed gradients, no per-card hover-glow colors.
- **Alert banners use `.fp-alert-*` variants.** Every hand-rolled `bg-blue-50 border-blue-200 text-blue-900` / `bg-amber-50 ...` / `bg-red-50 ...` / `bg-green-50 ...` banner collapses to `.fp-alert-info` / `.fp-alert-warn` / `.fp-alert-danger` / `.fp-alert-success` (all exported by Story 14.1's `app/globals.css`).
- **`app/settings/page.tsx` is out of scope.** This story migrates the children (the tab content components), not the 62-line page shell that routes between tabs. Shell-level visual work, if any, belongs in Story 14.9.
- **File headers are added during the edit if missing.** Per `~/.claude/CLAUDE.md` §File Header Standard. Story 14.10's file-header final gate then only audits files 14.8 did NOT touch. Header verification test is owned by 14.10, not 14.8.

### Architectural decisions (real trade-offs captured here)

- **ADR-14.8-A (toggle track uses inline `style` with explicit `transition: background-color 150ms ease`).** Tailwind's JIT compiler requires arbitrary-value classes (`bg-[#7c3aed]`) to appear in the source as full string literals; `peer-checked:bg-[#7c3aed]` can be fragile if PostCSS scan paths are narrow. Writing the color inline via `style={{ background: value ? '#7c3aed' : '...', transition: 'background-color 150ms ease' }}` is scanner-proof AND animates smoothly — React changes the `background` value; the browser applies the transition because the `transition` rule in the same style object is stable across renders. Pre-mortem finding F1 (track color snaps) is prevented by explicitly declaring the transition. Rejected alternatives: (a) `peer-checked:bg-[#7c3aed]` — fragile on JIT scan; (b) CSS variable pattern `--fp-toggle-bg` swapped via class — requires globals.css addition (Story 14.1 territory) and is overkill for a 5-file rollout.

- **ADR-14.8-B (settings components use `.fp-glass` per section, not one giant wrapper).** `NotificationSettings.tsx` currently renders one enormous card containing 8 sub-sections. The rebuild splits into 8 separate `.fp-glass p-6 mb-6` cards. Rationale: (a) matches the dashboard's "grid of cards" pattern; (b) makes vertical scanning easier — the eye locates a specific section by its card outline; (c) enables future per-section collapse/expand without fighting nested glass surfaces. Rejected alternative: one big `.fp-glass` with `<hr />` dividers — produces a monolithic block that feels dense. Inherits into every settings file with >1 logical section (`NotificationSettings`, `BillingSettings`, `ScoringSettings`).

- **ADR-14.8-C (progress bars use inline gradient in `style`, not a canonical `.fp-progress` utility).** The skill does not currently export `.fp-progress-track` / `.fp-progress-fill`. Adding them would be Story 14.1 territory. For this story, `UsageDisplay.tsx`'s progress uses inline `style={{ background: 'linear-gradient(90deg, #7c3aed, #a78bfa)' }}` on the fill and `rgba(255,255,255,0.06)` on the track. If Story 14.1 later adds canonical progress classes, a follow-up Epic 15 pass collapses the inline styles. Meanwhile, this inline gradient IS the canonical progress pattern for the product.

- **ADR-14.8-D (merge order with Story 14.7 — 14.7 merges first, 14.8 rebases).** Story 14.7's Task 4.4 drops the external `text-xs px-2 py-0.5 rounded font-medium` utilities on `MessageApprovalCard.tsx:202`. Story 14.8's Task 9 migrates the REST of the file. Both touch the same file; merge conflict is inevitable if sequenced wrong. **Decision: 14.7 merges to `main` first. 14.8's branch rebases on post-14.7 `main`.** The 14.8 implementer inherits 14.7's line-202 state and preserves it through the broader migration. If 14.7 is still in flight when 14.8 starts, 14.8's branch bases off 14.7's branch (not `main`) and lands after 14.7 via stacked PRs. This commitment resolves pre-mortem finding F2 and eliminates the "who goes first" ambiguity from the prior ADR draft.

- **ADR-14.8-E (`LoadingSkeleton` + `EmptyState` consumed in settings; `ErrorBanner` only in `ApprovalQueue`).** Settings-form errors are toast-surfaced (`useToast()` fires on save-failure); adding `<ErrorBanner>` inline above every settings form would be worse UX than a dismissable toast. The one exception is `ApprovalQueue`, where the "failed to load approvals" case uses `<ErrorBanner onRetry={refetch} />` because the list literally can't render without data. All other settings files: `<LoadingSkeleton>` for load states, toast for errors.

## Acceptance Criteria

> Sourced from `_bmad-output/planning-artifacts/epics.md:3043–3078`. Expanded so each AC is independently testable at the correct level (Jest for logic/regex ACs, Playwright E2E for UI-visible ACs) per CLAUDE.md DoD.

1. **Every settings component uses canonical surfaces (`.fp-glass` / `.fp-glass-sm`) for its wrapper(s)** — Given the settings files `NotificationSettings.tsx`, `BillingSettings.tsx`, `IntegrationsSettings.tsx`, `MessagingSettings.tsx`, `ScoringSettings.tsx`, `LogisticsSettings.tsx`, and `UsageDisplay.tsx`, when Story 14.8 is complete, then (a) each file's outer section wrappers use `.fp-glass p-6` (large settings cards) or `.fp-glass-sm p-4` (compact cards/usage meter), (b) `rg "bg-white" <each file>` returns **zero**, (c) a Jest unit test asserts each component renders at least one element with `.fp-glass` or `.fp-glass-sm` in its classList. `FR-UI-DESIGN-02`

2. **Every settings form input uses `.fp-input`** — Given the current settings forms use `bg-white border border-gray-300 rounded-md` (or equivalent) on `<input>`, `<select>`, and `<textarea>` elements, when Story 14.8 is complete, then every form input in the seven settings files uses `className="fp-input ..."` (any additional layout/sizing utilities allowed, no palette tokens permitted). `rg "<(input|select|textarea)[^>]*className[^>]*bg-(white|gray|blue)" <each file>` returns **zero**. `FR-UI-DESIGN-02`

3. **Every toggle switch uses purple (`#7c3aed`) as the active-state color with an explicit background-color transition, not blue, not snap** — Given every toggle in `NotificationSettings.tsx`, `MessagingSettings.tsx`, `ScoringSettings.tsx`, `IntegrationsSettings.tsx`, and `LogisticsSettings.tsx`, when Story 14.8 is complete, then (a) each toggle's checked/active-state track background is `#7c3aed` (verified via `rg "#7c3aed" <each file>` matching AND a Playwright `toHaveCSS('background-color', 'rgb(124, 58, 237)')` assertion on the track after toggling ON), (b) the track style object contains `transition: 'background-color 150ms ease'` so the color change animates (verified via `rg "transition.*background-color.*150ms" <each file>` returning at least one match per file that has toggles — pre-mortem finding F1), (c) no `bg-blue-*`, `peer-checked:bg-blue-*`, `data-[state=checked]:bg-blue-*` remain. `FR-UI-DESIGN-04`

4. **Settings primary buttons use `.fp-btn-primary`, secondary use `.fp-btn-ghost`, danger use `.fp-btn-danger`** — Given the current Save/Cancel/Delete/Reset buttons across the seven settings files, when Story 14.8 is complete, then (a) "Save"/"Update"/"Apply" buttons use `className="fp-btn-primary ..."`, (b) "Cancel"/"Reset to defaults"/"Preview" buttons use `.fp-btn-ghost`, (c) "Delete account"/"Cancel subscription"/"Remove integration" buttons use `.fp-btn-danger`, (d) `rg "bg-(blue|green|red|gray)-(5|6|7)[0-9]+" <each file>` returns **zero**. `FR-UI-DESIGN-02`

5. **`BillingSettings.tsx` invoice-history table uses canonical table styling** — Given the current table renders with `bg-gray-50` header and `border-b border-gray-200` rows, when Story 14.8 is complete, then (a) the header row uses inline `#94a3b8` text color and no background fill (canonical table header per 14.7), (b) data rows use `#e2e8f0` text with dividers `rgba(255,255,255,0.06)`, (c) invoice-status pills use `.fp-badge .fp-badge-green` (paid) / `.fp-badge .fp-badge-yellow` (pending) / `.fp-badge .fp-badge-red` (failed), (d) "Download PDF" action links use `#c4b5fd` inline with purple underline on hover. A Playwright E2E scenario loads `/settings` → Billing tab as a seeded-with-invoices user and asserts the table renders with the canonical surfaces. `FR-UI-DESIGN-02` `FR-UI-DESIGN-04`

6. **Every modal/card in the secondary-component stack uses canonical surfaces** — Given `MeetingModal.tsx`, `MeetingRouteCard.tsx`, `ResaleContentEditor.tsx`, `ApprovalQueue.tsx`, `MessageApprovalCard.tsx`, `UpgradePrompt.tsx`, `CrossPostModal.tsx`, `FilterPanel.tsx`, `QueueItemCard.tsx`, when Story 14.8 is complete, then each file's outermost wrapper uses `.fp-glass`, `.fp-glass-sm`, or `.fp-glow-card` as appropriate, and `rg "bg-white" <each file>` returns **zero**. `FR-UI-DESIGN-02`

7. **Every alert/info banner uses `.fp-alert-*` variants** — Given the current hand-rolled banners (`bg-blue-50 border-blue-200 text-blue-900`, `bg-amber-50 ...`, `bg-red-50 ...`, `bg-green-50 ...`) across all 16 files, when Story 14.8 is complete, then every banner uses `.fp-alert-info`, `.fp-alert-warn`, `.fp-alert-danger`, or `.fp-alert-success` (no hand-rolled). A Jest regex scan over the 16-file list asserts zero matches for `bg-(blue|amber|red|green)-50`. `FR-UI-DESIGN-02`

8. **`UpgradePrompt.tsx` collapses to single-accent glass** (single-accent rule from FR-UI-DESIGN-04 + ADR-14.7-C) — Given the current `bg-gradient-to-br from-blue-600 to-purple-600` background, when Story 14.8 is complete, then the outer wrapper uses `.fp-glass p-8 max-w-lg` with no gradient background, the header icon uses inline `#8b5cf6`, feature-comparison checkmarks use inline `#34d399`, the primary CTA uses `.fp-btn-primary` (which internally uses `#7c3aed`), and `rg "bg-gradient|from-blue|to-blue|from-purple|to-purple" src/components/UpgradePrompt.tsx` returns **zero**. A Playwright E2E scenario triggers the upgrade prompt (e.g., clicking "Upgrade to Pro" from `UsageDisplay`) and asserts the modal renders on a glass surface with a single purple CTA. `FR-UI-DESIGN-02` `FR-UI-DESIGN-04`

9. **`UsageDisplay.tsx` progress bar uses canonical purple gradient on fill, neutral track, with defined thresholds per ADR-14.8-C** — Given the current `bg-gray-200` track and `bg-blue-500` fill, when Story 14.8 is complete, then (a) the track uses inline `background: 'rgba(255,255,255,0.06)'`, (b) the fill uses inline `background: 'linear-gradient(90deg, #7c3aed, #a78bfa)'` when `used <= limit`, (c) the fill switches to `linear-gradient(90deg, #f87171, #fca5a5)` AND a `.fp-alert-warn` banner renders when `used > limit` (strict greater-than — `used === limit` is still the purple gradient, full fill, no banner), (d) a "warning approaching limit" state at `used >= limit * 0.9 && used <= limit` keeps the purple gradient but renders a lighter `.fp-alert-info` notice "You're approaching your limit". A Jest unit test renders `<UsageDisplay used={X} limit={Y} />` at (i) 50% — purple gradient, no banner; (ii) 95% — purple gradient + info banner; (iii) 100% exact — purple gradient full, no warn banner; (iv) 120% — red gradient + warn banner; and asserts fill `background` string + banner presence in each state. `FR-UI-DESIGN-02` `FR-UI-DESIGN-04`

10. **`MessageApprovalCard.tsx` uses canonical surfaces and preserves Story 14.7's line-202 fix** — Given Story 14.7's ADR-14.7-I already dropped the external utilities on line 202, when Story 14.8 is complete, then (a) the outer card uses `.fp-glass p-6`, (b) approve/reject/edit buttons use `.fp-btn-primary` / `.fp-btn-danger` / `.fp-btn-ghost`, (c) source-platform pill uses `.fp-badge .fp-badge-blue`, (d) status pill continues to use `STATUS_COLORS[status]` (from 14.7's rewrite) with NO external wrapper utilities — line 202's fix from 14.7 survives the 14.8 edit, (e) AI-confidence readout uses `.fp-metric-num text-sm` in `#c4b5fd`. Verified by `rg "STATUS_COLORS\[.*\]" src/components/MessageApprovalCard.tsx` showing it wrapped in a `className` that contains ONLY `STATUS_COLORS[...]` (no sibling padding/font utilities). `FR-UI-DESIGN-02`

11. **`ApprovalQueue.tsx` empty state uses `<EmptyState>`, error state uses `<ErrorBanner>`** — Given the current component renders a hand-rolled "no approvals yet" paragraph and a toast-only error path, when Story 14.8 is complete, then (a) empty state renders `<EmptyState title="No pending approvals" message="AI-drafted messages will appear here for your review." />`, (b) API-error state renders `<ErrorBanner message={error} onRetry={refetch} />`, (c) loading state renders `<LoadingSkeleton variant="list" count={3} />`. A Playwright E2E scenario seeds the user with zero approvals and asserts `<EmptyState>` renders; a second scenario forces a 500 on the approvals endpoint and asserts `<ErrorBanner>` renders with a retry button. `FR-UI-DESIGN-06`

12. **`MeetingRouteCard.tsx` banners use `.fp-alert-*` variants** — Given the current `bg-blue-50 border-blue-200 text-blue-900` "next meeting" banner and `bg-amber-50 border-amber-200 text-amber-900` "meeting late" banner, when Story 14.8 is complete, then the former uses `.fp-alert-info` and the latter uses `.fp-alert-warn`. `rg "bg-(blue|amber|red)-50" src/components/MeetingRouteCard.tsx` returns **zero**. `FR-UI-DESIGN-02`

13. **`ScoringSettings.tsx` sliders defer to Story 14.1's canonical thumb styling (no inline overrides)** — Given the current `<input type="range">` elements, when Story 14.8 is complete, then (a) **static check:** `rg "::(-webkit-slider-thumb|-moz-range-thumb)|style=\{\{[^}]*(appearance|WebkitAppearance|backgroundColor|accentColor)" src/components/ScoringSettings.tsx` returns **zero** (no inline thumb overrides in the component; styling comes exclusively from Story 14.1's globals.css), (b) **layout check:** a Playwright E2E scenario loads `/settings` → Scoring tab, asserts each slider is present and interactive (can receive focus, can be adjusted via arrow keys), and asserts the adjacent weight-readout text updates on slider move, (c) weight readouts use `.fp-metric-num text-sm`, (d) "Save weights" → `.fp-btn-primary`. Visual verification of the purple thumb is deferred to AC #19's layout scan; `accent-color` / computed-style testing of the thumb is explicitly NOT an AC because Chrome and Firefox render `::-webkit-slider-thumb` and `::-moz-range-thumb` differently and computed-style APIs don't expose pseudo-element paint. `FR-UI-DESIGN-02`

14. **`CrossPostModal.tsx` tier-gate badges use `.fp-badge-*` variants** — Given the current marketplace rows that use `bg-blue-100 text-blue-800` "Pro" pills and `bg-purple-100 text-purple-800` "Enterprise" pills, when Story 14.8 is complete, then "Pro" pills use `.fp-badge .fp-badge-purple` (non-financial tier confirmation → purple per FR-UI-DESIGN-04), "Enterprise" pills use `.fp-badge .fp-badge-yellow` (a "premium" signal distinct from standard Pro), and disabled/tier-gated rows use `opacity-50 cursor-not-allowed`. `rg "bg-(blue|purple)-100" src/components/posting-queue/CrossPostModal.tsx` returns **zero**. `FR-UI-DESIGN-02` `FR-UI-DESIGN-04`

15. **`FilterPanel.tsx` and `QueueItemCard.tsx` residual violations are cleaned to zero** — Given the two partially-migrated files currently have 2+3 and 1+0 violations respectively, when Story 14.8 is complete, then `rg "(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|fuchsia|pink|rose|emerald|amber|yellow|red|orange|green)-[0-9]+" src/components/FilterPanel.tsx src/components/posting-queue/QueueItemCard.tsx` returns **zero** and `rg "bg-(white|gray-[0-9])" <same two files>` returns **zero**. `FR-UI-DESIGN-02`

16. **`ThemeSettings.tsx` non-existence is verified (carryover from Story 14.2)** — Given Story 14.2 (`done`) already deleted `src/components/ThemeSettings.tsx`, `src/contexts/ThemeContext.tsx`, `src/lib/theme-config.ts`, `src/components/ThemeStyles.tsx`, and their test files, when Story 14.8 is complete, then `ls src/components/ThemeSettings.tsx src/contexts/ThemeContext.tsx src/lib/theme-config.ts src/components/ThemeStyles.tsx 2>&1` returns "No such file or directory" for all four paths. No work required; this AC is a verification gate. A Jest test at `src/__tests__/components/theme-removal.test.ts` uses `fs.existsSync(path.resolve(__dirname, '../../components/ThemeSettings.tsx'))` and asserts `false` for each of the four paths. (Previously the story called for `require.resolve` throwing `MODULE_NOT_FOUND`; that approach is fragile because Next.js/tsconfig path-aliases may resolve-and-throw with different error codes — `fs.existsSync` is deterministic and platform-agnostic. Red-team finding R8.) `FR-UI-DESIGN-03`

17. **Zero raw non-purple palette classes across the full story scope** — Given all 16 target files, when the combined `rg` runs (see Problem Statement §regression), then **zero** palette matches AND **zero** light-mode matches are returned. Task N (cleanup sweep) captures pre- and post-edit counts for each file into Completion Notes. `FR-UI-DESIGN-02`

18. **Accessibility — every toggle has `role="switch"` + `aria-checked`, modals trap focus, settings forms have labels-for-inputs** — Given an axe-core Playwright scan scoped to `/settings` (all tabs) and each modal (opened via scripted interaction: `MeetingModal`, `CrossPostModal`, `UpgradePrompt`), when Story 14.8 is complete, then (a) zero `critical` or `serious` violations on each scoped scan, (b) every toggle element has `role="switch"` and `aria-checked="true"`/`"false"` matching its visual state, (c) every modal traps focus within itself (Tab/Shift-Tab cycles within the modal, doesn't escape to the background page), (d) every `<input>`, `<select>`, `<textarea>` has an associated `<label>` via `htmlFor`/`id` pairing OR an `aria-label`, (e) the Escape key closes each modal and returns focus to the invoking element. `FR-UI-DESIGN-07`

19. **Migrated components render without catastrophic layout breakage — layout-level regression check, NOT pixel-perfect** — Given the rebuilt components, when a Playwright E2E scenario loads `/settings` and iterates through each tab (Profile, Notifications, Billing, Integrations, Messaging, Scoring, Logistics), then each tab renders without broken layout: (a) the main content container has a non-zero height AND non-zero width (assertable via `boundingBox()`), (b) no element has `overflow: visible` + content extending beyond the viewport (asserted by checking `document.body.scrollWidth` equals `window.innerWidth` at the target viewport), (c) the primary CTA button in each tab is visible and clickable (not occluded by another element). Same checks on each modal (`MeetingModal`, `CrossPostModal`, `UpgradePrompt`) opened via scripted interaction. **Explicitly NOT an AC:** pixel-perfect visual matching. `.fp-glass` uses `backdrop-filter: blur(...)` which headless Chrome renders with minor differences across versions, making screenshot diffs flaky. This AC's intent is "detect catastrophic breakage" (zero-height containers, off-screen overflow, occluded CTAs), not "matches a golden image". If screenshot-based visual regression is desired later, it belongs in Epic 15 visual-regression tooling, not Epic 14. `FR-UI-DESIGN-02`

20. **Quality gates pass** — Given the updated files, when `make lint`, `make build`, `make test`, `make test-ac STORY=14.8`, `make test-ac FEATURE=F14` all run, then all pass with zero errors, zero skipped scenarios, and zero regressions on other Epic 14 stories' scenarios. Unit-test coverage thresholds unchanged (branches ≥96%, functions ≥98%, lines ≥99%, statements ≥99%). `FR-UI-DESIGN-02`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|---|---|---|
| FR-UI-DESIGN-02 (Canonical dark-glassmorphism applied to every surface) | 1, 2, 4, 5, 6, 7, 8, 10, 12, 13, 15, 17, 19, 20 | `@FR-UI-DESIGN-02` |
| FR-UI-DESIGN-03 (Competing multi-theme system is fully removed — verification carryover from 14.2) | 16 | `@FR-UI-DESIGN-03` |
| FR-UI-DESIGN-04 (Color semantics: purple for non-financial accents, green reserved for profit, red for danger/urgency) | 3, 5, 8, 9, 14 | `@FR-UI-DESIGN-04` |
| FR-UI-DESIGN-06 (Shared UI state components — `LoadingSkeleton`, `ErrorBanner`, `EmptyState` — consumed in `ApprovalQueue`) | 11 | `@FR-UI-DESIGN-06` |
| FR-UI-DESIGN-07 (Accessibility — focus rings, `role="switch"`, `aria-checked`, focus trapping in modals, keyboard operability) | 18 | `@FR-UI-DESIGN-07` |

## Tasks / Subtasks

- [ ] **Task 1 — Establish toggle-switch canonical component (AC: #3, #18).**
  - [ ] 1.1 Audit existing toggle markup across `NotificationSettings`, `MessagingSettings`, `ScoringSettings`, `IntegrationsSettings`, `LogisticsSettings`; document current implementations.
  - [ ] 1.2 Define the canonical toggle pattern inline (per §Canonical toggle-switch pattern above). Decision: keep it inline per-file (since each toggle's `value` / `onChange` is locally-scoped) rather than extracting to a shared `<Toggle>` component in this story — extraction is Epic 15 structural territory.
  - [ ] 1.3 Migrate each toggle in each of the 5 files to the canonical pattern with inline purple active background, `role="switch"`, `aria-checked`.

- [ ] **Task 2 — Migrate `NotificationSettings.tsx` (AC: #1, #2, #3, #4, #7).**
  - [ ] 2.1 Wrap each of the ~8 top-level sections in `.fp-glass p-6 mb-6`.
  - [ ] 2.2 Replace every `text-gray-900 dark:text-gray-100` / `text-gray-600 dark:text-gray-400` with inline `#e2e8f0` / `#94a3b8`.
  - [ ] 2.3 Replace every form input (`<input>`, `<select>`, `<textarea>`) className with `fp-input`.
  - [ ] 2.4 Migrate every toggle per Task 1.
  - [ ] 2.5 Replace the quiet-hours overnight-wrap warning banner with `.fp-alert-warn`.
  - [ ] 2.6 Replace the "Delete all notification preferences" danger banner with `.fp-alert-danger`.
  - [ ] 2.7 Save/Cancel footer → `.fp-btn-primary` / `.fp-btn-ghost`.
  - [ ] 2.8 Add file header (per global JSDoc standard) if missing.

- [ ] **Task 3 — Migrate `BillingSettings.tsx` (AC: #1, #2, #4, #5, #7).**
  - [ ] 3.1 Current plan card → `.fp-glow-card p-6` with `.fp-metric-num` plan price.
  - [ ] 3.2 Upgrade options → 3-card grid, purple inline border on "Most Popular".
  - [ ] 3.3 Invoice history table per §Solution item 2 and AC #5.
  - [ ] 3.4 Payment method card → `.fp-glass p-6` with `.fp-btn-ghost` "Update".
  - [ ] 3.5 "Cancel subscription" → `.fp-btn-danger`.
  - [ ] 3.6 Verify the 4 existing canonical `.fp-*` uses are preserved through the migration (no accidental reversion).
  - [ ] 3.7 File header.

- [ ] **Task 4 — Migrate `IntegrationsSettings.tsx` + `MessagingSettings.tsx` + `LogisticsSettings.tsx` (AC: #1, #2, #3, #4, #7).**
  - [ ] 4.1 `IntegrationsSettings` — integration cards per §Solution item 3, `.fp-badge-green` / `.fp-badge-gray` status pills.
  - [ ] 4.2 `MessagingSettings` — auto-reply + approval toggles (Task 1), signature textarea `.fp-input`, preview/save buttons.
  - [ ] 4.3 `LogisticsSettings` — simple form migration.
  - [ ] 4.4 File headers on all three.

- [ ] **Task 5 — Migrate `ScoringSettings.tsx` (AC: #1, #2, #4, #7, #13).**
  - [ ] 5.1 Outer wrapper `.fp-glass p-6`; per-slider section `.fp-glass-sm p-4` if visually distinct, OR inline layout within the main card if tightly grouped.
  - [ ] 5.2 Sliders — verify no inline thumb-style override is present; let Story 14.1's canonical `::-webkit-slider-thumb` / `::-moz-range-thumb` rules drive rendering.
  - [ ] 5.3 Weight readouts → `.fp-metric-num text-sm`.
  - [ ] 5.4 "Reset to defaults" / "Save weights" → `.fp-btn-ghost` / `.fp-btn-primary`.
  - [ ] 5.5 "Changing weights recomputes all scores" warning → `.fp-alert-warn`.
  - [ ] 5.6 File header.

- [ ] **Task 6 — Migrate `UsageDisplay.tsx` (AC: #1, #9, #18).**
  - [ ] 6.1 Outer wrapper `.fp-glass-sm p-4`.
  - [ ] 6.2 Progress bar track → inline `rgba(255,255,255,0.06)`, fill → inline `linear-gradient(90deg, #7c3aed, #a78bfa)`.
  - [ ] 6.3 Over-limit: fill switches to red gradient AND `.fp-alert-warn` banner renders.
  - [ ] 6.4 Upgrade CTA link → `#c4b5fd` inline with purple underline.
  - [ ] 6.5 Add `role="progressbar"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow` on the progress element for AC #18.
  - [ ] 6.6 Jest unit test for the three states (50% / 95% / 120%).
  - [ ] 6.7 File header.

- [ ] **Task 7 — Migrate `MeetingModal.tsx` + `MeetingRouteCard.tsx` (AC: #6, #7, #12).**
  - [ ] 7.1 `MeetingModal` body → `.fp-glass p-8 max-w-2xl`; date/time/tz inputs → `.fp-input`; "Add to calendar" → `.fp-btn-primary`; conflict warning → `.fp-alert-warn`; success → `.fp-alert-success`.
  - [ ] 7.2 `MeetingRouteCard` wrapper → `.fp-glass p-6`; "next meeting" banner → `.fp-alert-info`; "meeting late" → `.fp-alert-warn`; copy-link → `.fp-btn-ghost`; reschedule → `.fp-btn-primary`.
  - [ ] 7.3 File headers on both.

- [ ] **Task 8 — Migrate `ResaleContentEditor.tsx` (AC: #1, #2, #4, #6).**
  - [ ] 8.1 Wrapper `.fp-glass p-6`; textarea `.fp-input min-h-[300px]`; generate-with-AI `.fp-btn-primary`; reset `.fp-btn-ghost`; character count `#94a3b8`.
  - [ ] 8.2 AI-generation loading → `<LoadingSkeleton variant="text" lines={4} />`.
  - [ ] 8.3 File header.

- [ ] **Task 9 — Migrate `ApprovalQueue.tsx` + `MessageApprovalCard.tsx` (AC: #6, #10, #11).**
  - [ ] 9.1 `ApprovalQueue` — filter tabs (`.fp-btn-ghost` + `aria-pressed`), empty state `<EmptyState>`, error `<ErrorBanner>`, loading `<LoadingSkeleton variant="list" count={3} />`.
  - [ ] 9.2 `MessageApprovalCard` — outer `.fp-glass p-6`; approve/reject/edit buttons → `.fp-btn-primary` / `.fp-btn-danger` / `.fp-btn-ghost`; source-platform pill → `.fp-badge .fp-badge-blue`; AI-confidence readout → `.fp-metric-num text-sm` in `#c4b5fd`.
  - [ ] 9.3 **Verify line 202's STATUS_COLORS fix from Story 14.7 survives the migration — do NOT re-add `text-xs px-2 py-0.5 rounded font-medium` external utilities around `STATUS_COLORS[status]`.** (Per ADR-14.8-D; branch must be rebased on post-14.7 `main`.)
  - [ ] 9.4 File headers on both.

- [ ] **Task 10 — Migrate `UpgradePrompt.tsx` (AC: #6, #8). Applies single-accent rule from FR-UI-DESIGN-04 + ADR-14.7-C.**
  - [ ] 10.1 Remove `bg-gradient-to-br from-blue-600 to-purple-600`; wrapper → `.fp-glass p-8 max-w-lg`.
  - [ ] 10.2 Header icon → inline `#8b5cf6`; feature-list checkmarks → inline `#34d399`.
  - [ ] 10.3 Primary CTA → `.fp-btn-primary py-3 px-6 text-base`.
  - [ ] 10.4 Verify `rg "bg-gradient|from-blue|to-blue" src/components/UpgradePrompt.tsx` returns zero.
  - [ ] 10.5 File header.

- [ ] **Task 11 — Migrate `CrossPostModal.tsx` (AC: #6, #14).**
  - [ ] 11.1 Body → `.fp-glass p-8 max-w-2xl`; marketplace rows → `.fp-glass-sm p-3`.
  - [ ] 11.2 Pro tier-gate pill → `.fp-badge .fp-badge-purple`; Enterprise → `.fp-badge .fp-badge-yellow`.
  - [ ] 11.3 Disabled rows → `opacity-50 cursor-not-allowed`; "Post to selected" → `.fp-btn-primary`.
  - [ ] 11.4 File header.

- [ ] **Task 12 — Clean up residual violations in `FilterPanel.tsx` + `QueueItemCard.tsx` (AC: #15).**
  - [ ] 12.1 `rg` each file for the remaining palette + light-mode hits; collapse to canonical.
  - [ ] 12.2 Re-verify `rg` counts are zero on both files.
  - [ ] 12.3 File headers.

- [ ] **Task 13 — Verify `ThemeSettings.tsx` non-existence (AC: #16).**
  - [ ] 13.1 Confirm via `ls` and `git ls-files` that `ThemeSettings.tsx`, `ThemeContext.tsx`, `theme-config.ts`, `ThemeStyles.tsx` are absent from the repo.
  - [ ] 13.2 Add a Jest test at `src/__tests__/components/theme-removal.test.ts` that asserts `require.resolve('@/components/ThemeSettings')` throws `MODULE_NOT_FOUND`.

- [ ] **Task 14 — Acceptance tests (AC: ALL).** Write ~10 new scenarios in `test/acceptance/features/E-014-frontend-design-migration.feature`. Each triple-tagged per CLAUDE.md DoD: `@FR-UI-DESIGN-<NN>` `@story-14-8` `@E-014-S-<sequential>`.
  - [ ] 14.1 S-N: "Settings page loads with every tab rendering on canonical glass surfaces" — navigates through Profile / Notifications / Billing / Integrations / Messaging / Scoring / Logistics, asserts at least one `.fp-glass` element per tab.
  - [ ] 14.2 S-N+1: "Toggle switches in settings use purple active state" — opens Notifications tab, toggles a switch, asserts computed `background-color: rgb(124, 58, 237)`.
  - [ ] 14.3 S-N+2: "Billing tab invoice history renders canonical table" — seeds invoices, asserts status pills are `.fp-badge-*` variants.
  - [ ] 14.4 S-N+3: "Upgrade prompt modal renders on single-accent glass" — triggers upgrade prompt from tier-gated CTA, asserts no gradient background and single `.fp-btn-primary` CTA.
  - [ ] 14.5 S-N+4: "Usage display progress bar fills with purple gradient" — renders UsageDisplay at 50% usage, asserts fill background string.
  - [ ] 14.6 S-N+5: "Cross-post modal tier-gate badges" — opens CrossPostModal, asserts Pro pill is `.fp-badge-purple`, Enterprise is `.fp-badge-yellow`.
  - [ ] 14.7 S-N+6: "Approval queue empty state renders `<EmptyState>`" — seeds zero approvals, asserts `<EmptyState>` is rendered with role="status".
  - [ ] 14.8 S-N+7: "Approval queue error state renders `<ErrorBanner>`" — forces 500 on `/api/approvals`, asserts `<ErrorBanner>` with retry button.
  - [ ] 14.9 S-N+8: "axe-core scan on /settings (every tab) returns zero critical/serious violations".
  - [ ] 14.10 S-N+9: "Modal focus trap — opens MeetingModal, asserts Tab cycles within modal and Escape closes it, focus returns to invoking element".
  
  Acceptance-test scenarios MUST be tagged `@E-014-S-<N>` with `<N>` sequentially assigned after the last Epic 14 scenario already present. At story authorship (2026-04-17) the max observed tag in the feature file is `@E-014-S-28`; stories 14.4–14.7 are ready-for-dev or in-progress but have not yet appended scenarios. True max at 14.8 implementation time may be higher — the implementer must `rg "@E-014-S-[0-9]+" test/acceptance/features/E-014-frontend-design-migration.feature | awk -F'-' '{print $NF}' | sort -n | tail -1` to determine the next free number.

- [ ] **Task 15 — Unit tests.**
  - [ ] 15.1 `UsageDisplay` four-state test (per Task 6.6 and AC #9): 50%, 95%, exact 100%, 120%. Asserts fill `background` string AND banner presence/absence per state.
  - [ ] 15.2 `MessageApprovalCard` render test — mocks a draft, asserts status pill className matches `/^fp-badge fp-badge-(red|blue|gray|yellow|purple|green)$/`; asserts line-202 `STATUS_COLORS[status]` has no adjacent utility classes in the rendered output (guard against 14.7 regression per Task 9.3).
  - [ ] 15.3 Smoke render test for every touched component — covers ALL 16 files (`NotificationSettings`, `BillingSettings`, `IntegrationsSettings`, `MessagingSettings`, `ScoringSettings`, `LogisticsSettings`, `UsageDisplay`, `MeetingModal`, `MeetingRouteCard`, `ResaleContentEditor`, `ApprovalQueue`, `MessageApprovalCard`, `UpgradePrompt`, `CrossPostModal`, `FilterPanel`, `QueueItemCard`). Each test renders the component with minimum props + required provider wrappers and asserts at least one `.fp-glass` / `.fp-glass-sm` / `.fp-glow-card` element is present in the DOM. Fast smoke — not exhaustive behavior coverage.
  - [ ] 15.4 `ThemeSettings` non-existence test (per Task 13.2 — uses `fs.existsSync`, NOT `require.resolve`).
  - [ ] 15.5 **Palette/light-mode regex scan test** — a single Jest test (`src/__tests__/lib/story-14-8-violations.test.ts`) iterates the 16-file list. For each file: `fs.readFileSync` the content, scope the scan to substrings that start with `className=` or `className={"'` (avoids false positives on test fixtures, comments, and non-className string literals), and assert the palette regex `/(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|fuchsia|pink|rose|emerald|amber|yellow|red|orange|green)-\d+/` and light-mode regex `/bg-(white|gray-\d+)/` both match zero times within `className=` scopes. On failure the error message includes: file path, line number, and the offending match string. Purpose: per-PR CI gate that runs faster than the full `make test-ac` and surfaces regressions immediately. This is additive to (not a replacement for) the `rg` verification in Completion Notes.

- [ ] **Task 16 — Cleanup sweep + Completion Notes capture (AC: #17).**
  - [ ] 16.1 Run the combined `rg` commands from §Problem Statement regression on all 16 files.
  - [ ] 16.2 Capture pre- and post-edit counts in Completion Notes.
  - [ ] 16.3 Ensure no new violations were introduced in adjacent files (e.g., imports-only touches to `app/settings/page.tsx`).

- [ ] **Task 17 — RTM + sprint status + Trello.**
  - [ ] 17.1 Update `_bmad-output/test-artifacts/requirements-traceability-matrix.md` with Story 14.8 rows (FR → AC → feature scenario tag → step definition file).
  - [ ] 17.2 Update `sprint-status.yaml:182` → `review`.
  - [ ] 17.3 Move trello-axovia card to Done list; mark Feature F-014 checklist item `[14.8]`.

## Dev Notes

### Relevant architecture patterns and constraints

- **Canonical design system tokens:** `app/globals.css` (post-Story-14.1). Purple primary: `#7c3aed`; hover: `#6d28d9`; accent: `#8b5cf6` / `#c4b5fd`; profit green: `#34d399` / `#6ee7b7`; danger red: `#f87171`; warning yellow: `#fbbf24`; text primary `#e2e8f0`; text secondary `#94a3b8`; divider `rgba(255,255,255,0.06)`.
- **Utility classes exported by Story 14.1:** `.fp-glass`, `.fp-glass-sm`, `.fp-glass-nav`, `.fp-glow-card`, `.fp-btn-primary`, `.fp-btn-ghost`, `.fp-btn-danger`, `.fp-btn-hot`, `.fp-badge`, `.fp-badge-red`, `.fp-badge-blue`, `.fp-badge-green`, `.fp-badge-yellow`, `.fp-badge-gray`, `.fp-badge-purple`, `.fp-input`, `.fp-alert-info`, `.fp-alert-warn`, `.fp-alert-danger`, `.fp-alert-success`, `.fp-metric-num`, `.fp-divider`, `.fp-bg-mesh`, `input[type=range]::-webkit-slider-thumb` + `::-moz-range-thumb`.
- **Shared UI state components (Story 14.3, `done`):** `src/components/ui/LoadingSkeleton.tsx`, `src/components/ui/ErrorBanner.tsx`, `src/components/ui/EmptyState.tsx`, all re-exported via `src/components/ui/index.ts`. Import: `import { LoadingSkeleton, ErrorBanner, EmptyState } from '@/components/ui';`.
- **Authentication:** Settings page is behind `requireAuth()`. All E2E scenarios must authenticate via the established Playwright helper (seeded Firebase session cookie).
- **Testing:** Jest `testEnvironment: 'node'`, `maxWorkers: 1`. Playwright E2E runs against the production server (via `start-server-and-test`). Acceptance tests live in `test/acceptance/features/E-014-frontend-design-migration.feature` (one feature file for the whole epic, per Epic 14 convention).
- **Coverage thresholds:** branches ≥96%, functions ≥98%, lines ≥99%, statements ≥99%. Adding new canonical classes without new branches typically does not lower coverage; the regression-risk surface is the `UsageDisplay` three-state gradient logic where the conditional has two branches (`<=100%` vs `>100%`) that must both be exercised.

### Source tree components to touch

```
src/components/
├── NotificationSettings.tsx     [PRIMARY — 1198 lines, 22+22 violations]
├── BillingSettings.tsx          [PRIMARY — 544 lines, 19+10 violations, 4 existing fp-* uses]
├── IntegrationsSettings.tsx     [128 lines, 3+1]
├── MessagingSettings.tsx        [149 lines, 5+4]
├── ScoringSettings.tsx          [277 lines, 5+6]
├── LogisticsSettings.tsx        [122 lines, 1+1]
├── UsageDisplay.tsx             [143 lines, 4+6]
├── MeetingModal.tsx             [203 lines, 4+5]
├── MeetingRouteCard.tsx         [298 lines, 11+6]
├── ResaleContentEditor.tsx      [267 lines, 5+4]
├── ApprovalQueue.tsx            [282 lines, 8+2]
├── MessageApprovalCard.tsx      [369 lines, 11+8 — preserve 14.7 line-202 fix]
├── UpgradePrompt.tsx            [94 lines, 5+0 — single-accent glass]
├── FilterPanel.tsx              [294 lines, 2+3, 8 existing fp-* uses]
└── posting-queue/
    ├── CrossPostModal.tsx       [309 lines, 3+6]
    └── QueueItemCard.tsx        [263 lines, 1+0, 10 existing fp-* uses]

src/__tests__/
├── components/
│   ├── NotificationSettings.test.tsx       [NEW or UPDATE — smoke render]
│   ├── BillingSettings.test.tsx            [NEW or UPDATE]
│   ├── UsageDisplay.test.tsx               [NEW — three-state gradient]
│   ├── MessageApprovalCard.test.tsx        [NEW or UPDATE]
│   ├── ApprovalQueue.test.tsx              [NEW or UPDATE — empty/error states]
│   ├── UpgradePrompt.test.tsx              [NEW or UPDATE]
│   ├── CrossPostModal.test.tsx             [NEW or UPDATE — tier-gate badges]
│   └── theme-removal.test.ts               [NEW — asserts ThemeSettings is gone]
└── lib/
    └── (no changes expected)

test/acceptance/
├── features/
│   └── E-014-frontend-design-migration.feature   [APPEND — ~10 new scenarios]
└── step_definitions/
    └── E-014-settings-polish.steps.ts            [NEW]
```

### Testing standards summary

- Write unit tests alongside each migrated component (Jest + React Testing Library).
- Write acceptance scenarios as genuine Playwright E2E journeys — no mocked service calls for UI-visible ACs per CLAUDE.md DoD.
- Every scenario triple-tagged: `@FR-UI-DESIGN-<NN>` `@story-14-8` `@E-014-S-<sequential>`.
- Use `role="..."` queries where possible (e.g., `getByRole('switch', { name: /email notifications/i })`) for accessibility-tested selectors.
- For screenshot-based layout-regression checks (AC #19), use `toHaveScreenshot({ maxDiffPixelRatio: 0.2 })` — NOT pixel-perfect — to detect broken layouts without flaking on minor rendering differences.

### Project Structure Notes

- **No new routes, no new server endpoints.** This story is 100% component-level visual migration. API routes are untouched.
- **No Prisma schema changes.** No DB migration needed.
- **No new external dependencies.** Everything needed is already in `package.json` (React 19, Tailwind CSS 4, Playwright, Jest).
- **No environment variable changes.** No `config/secretmanager.yaml` entries needed.

### Dependencies and sequencing

- **Upstream dependencies (all `done`):** Story 14.1 (canonical tokens + utilities), 14.2 (multi-theme system removed — `ThemeSettings.tsx` + `ThemeContext.tsx` + `theme-config.ts` already deleted), 14.3 (shared UI state components — `LoadingSkeleton`, `ErrorBanner`, `EmptyState` exported from `src/components/ui/`).
- **Parallel stories (no conflict):** 14.4 (landing/auth), 14.5 (onboarding), 14.6 (PriceCalculator), 14.9 (analytics/scraper/health/static) — disjoint file lists from 14.8.
- **One file overlap — `MessageApprovalCard.tsx` with Story 14.7.** Per ADR-14.8-D, the **committed merge order is: 14.7 merges to `main` first, then 14.8's branch rebases on post-14.7 `main`**. If 14.7 is still in flight when 14.8 begins implementation, 14.8's branch bases off 14.7's branch (not `main`) and lands after 14.7 via stacked PRs. No "either goes first" ambiguity — this is the single canonical sequence.
- **Blocks stories:** 14.9 (Analytics / Scraper / Health / Static pages) and 14.10 (Accessibility + file-header final gate). 14.10 especially — its "file-header compliance" audit will be lighter if 14.8 adds headers as it touches files (inherited convention).

### References

- Visual/token canon: [Source: `~/.claude/skills/flipper-frontend/SKILL.md`]
- Canonical `:root` + utility classes: [Source: `app/globals.css`]
- Shared UI state components (Story 14.3): [Source: `src/components/ui/*`]
- Epic 14 PRD + ACs: [Source: `_bmad-output/planning-artifacts/epics.md:2744–3147`]
- Story 14.6 patterns (table, loading/error/empty): [Source: `_bmad-output/implementation-artifacts/epic-14/14-6-pricecalculator-canonical-reference.md`]
- Story 14.7 patterns (messaging, KanbanBoard demand badges, STATUS_COLORS rewrite, MessageApprovalCard line 202): [Source: `_bmad-output/implementation-artifacts/epic-14/14-7-opportunities-listings-messaging-migration.md`]
- Page-level audit (2026-04-17): [Source: `docs/frontend-design-gaps.md`]
- DoD (Definition of Done): [Source: `_bmad-output/project-context.md` → _Story Definition of Done_; and `CLAUDE.md` → _Story Definition of Done — Quality Gate_]
- RTM: [Source: `_bmad-output/test-artifacts/requirements-traceability-matrix.md`]

## Definition of Done

> Full gate definition: `_bmad-output/project-context.md` → _Story Definition of Done_

- [ ] All tasks/subtasks `[x]`; every AC satisfied; no `any` in production code
- [ ] `make lint` passes — zero ESLint errors
- [ ] `make build` passes — strict TypeScript, no `ignoreBuildErrors`
- [ ] `make test` passes — all tests green, zero regressions; coverage ≥96% branches, ≥98% functions, ≥99% lines/statements
- [ ] Unit tests added/updated for every touched component (Task 15 — NotificationSettings smoke, BillingSettings smoke, UsageDisplay three-state, MessageApprovalCard, ApprovalQueue empty/error, UpgradePrompt, CrossPostModal tier-gates, theme-removal, 16-file regex scan)
- [ ] Every AC has a test at the correct level (logic/regex → Jest; UI-visible → Playwright E2E; no mocked service calls for UI ACs)
- [ ] ~10 acceptance scenarios in `test/acceptance/features/E-014-frontend-design-migration.feature` — genuine Playwright E2E journeys, each triple-tagged `@FR-UI-DESIGN-<NN>` `@story-14-8` `@E-014-S-<sequential>` (sequential number TBD at implementation time — `rg` max existing tag and increment)
- [ ] `make test-ac STORY=14.8` passes green (zero failures, zero skipped)
- [ ] `make test-ac FEATURE=F14` passes green (all Epic 14 stories green together)
- [ ] `rg` palette + light-mode counts on the 16 target files both return **zero**
- [ ] Toggle-switch active state is `#7c3aed` across all 5 settings files with toggles
- [ ] `ThemeSettings.tsx` + `ThemeContext.tsx` + `theme-config.ts` + `ThemeStyles.tsx` are absent from the repo (AC #16 verification)
- [ ] RTM updated (`_bmad-output/test-artifacts/requirements-traceability-matrix.md`)
- [ ] Story `Status` → `review`; `sprint-status.yaml:182` → `review`
- [ ] `File List` below populated with every new/modified/deleted file
- [ ] File headers added to every touched file if missing (per global JSDoc standard)
- [ ] Trello card moved to Done list (trello-axovia, Board SvVRLeS5); Feature F-014 checklist item `[14.8]` marked

## Dev Agent Record

### Agent Model Used

_To be filled at implementation time._

### Debug Log References

### Completion Notes List

### File List

_To be populated during implementation. Expected shape (all under `src/components/` unless noted):_

- Modified: `NotificationSettings.tsx`, `BillingSettings.tsx`, `IntegrationsSettings.tsx`, `MessagingSettings.tsx`, `ScoringSettings.tsx`, `LogisticsSettings.tsx`, `UsageDisplay.tsx`, `MeetingModal.tsx`, `MeetingRouteCard.tsx`, `ResaleContentEditor.tsx`, `ApprovalQueue.tsx`, `MessageApprovalCard.tsx`, `UpgradePrompt.tsx`, `FilterPanel.tsx`, `posting-queue/CrossPostModal.tsx`, `posting-queue/QueueItemCard.tsx`
- Modified: `test/acceptance/features/E-014-frontend-design-migration.feature` (append ~10 scenarios)
- New: `test/acceptance/step_definitions/E-014-settings-polish.steps.ts`
- New: `src/__tests__/components/UsageDisplay.test.tsx`
- New or Modified: unit tests per Task 15
- New: `src/__tests__/components/theme-removal.test.ts`
- Modified: `_bmad-output/test-artifacts/requirements-traceability-matrix.md`
- Modified: `_bmad-output/implementation-artifacts/sprint-status.yaml`
