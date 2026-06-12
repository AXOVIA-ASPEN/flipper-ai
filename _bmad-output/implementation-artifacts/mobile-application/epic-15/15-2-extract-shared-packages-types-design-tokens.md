# Story 15.2: Extract Shared `packages/types/` and `packages/design-tokens/`

Status: blocked
Blocked: true
Blocked-Reason: HUMAN REVIEW GATE — Stephen must review and approve the mobile architecture overview (docs/architecture/mobile-architecture-overview.html) before ANY Epic 15+ mobile development starts. Do not begin implementation while this gate is in place. To lift: after approval, set Blocked: false, clear this reason, set Status: ready-for-dev (all five Epic 15 stories carry this same gate).
Trello-Card-ID: 6a16b889be39ba599825c87f

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **developer**,
I want all shared TypeScript domain types and design tokens extracted into framework-agnostic `packages/types/` and `packages/design-tokens/` workspaces,
so that the web app and the mobile app consume one canonical definition — no type duplication, no token drift between the two design surfaces.

## Problem Statement

The epics doc assumes shared types live in a single `src/lib/types.ts`. **That file does not exist.** Domain types are spread across:

- **Prisma-generated types** at `src/generated/prisma` (the source of truth for `Listing`, `Opportunity`, `ScraperJob`, `User`, `Message`, plus enums like `LifecycleStage`, `MessageStatus`, `PostingStatus`) — generated, DO NOT EDIT.
- **Hand-written types/enums** scattered across ~40 modules in `src/lib/*.ts` (e.g. `subscription-tiers.ts` for `SubscriptionTier`).

Design tokens live as CSS custom properties in `app/globals.css` `:root` (confirmed values below). There is no JS/TS token module — web Tailwind reads the CSS variables directly via `@theme inline`.

The mobile app cannot import from `src/generated/prisma` (Prisma client is Node-only; it pulls in the query engine) and cannot read `app/globals.css` (React Native has no CSS). So we need **framework-agnostic** re-exports:

1. `packages/types/` — pure TypeScript type/enum declarations consumable by web (Node) AND mobile (React Native/Metro) with no runtime Prisma dependency.
2. `packages/design-tokens/` — a plain TS object mirroring the canonical `:root` values, consumable by Tailwind (web), NativeWind (mobile, Story 15.3), and any native styling layer.

## Solution

1. **`packages/types/`** — create a workspace package exporting the canonical domain types and enums as **structural types decoupled from Prisma's runtime**. Re-export Prisma's generated *types* (type-only `import type` — erased at compile time, no runtime engine pull-in) where they are the source of truth, and declare the hand-written ones (`SubscriptionTier`, `Notification`, `DeviceToken` shapes) explicitly. Export: `Listing`, `Opportunity`, `ScraperJob`, `User`, `SubscriptionTier`, `Message`, `PostingJob`, `Notification`, `DeviceToken`, and enums `LifecycleStage`, `MessageStatus`, `PostingStatus`.
2. **`packages/design-tokens/`** — create a workspace package exporting a typed `tokens` object with `colors`, `spacing`, `radius`, `typography`, `glass` (alpha levels), `animation`, mirroring the `app/globals.css` `:root` values **with identical hex/values**.
3. **Wire the web app to consume `packages/design-tokens/`** so the canonical `.fp-*` utilities resolve to the same values (proving the single-source-of-truth contract) without visual regression.

Bar: the `Opportunity` type imported from `@shared/types` is structurally identical to the prisma-generated one; `.fp-glass` background color equals the token value; existing web visual behavior is unchanged.

## Acceptance Criteria

1. **`packages/types/` exports the canonical domain model** — Given the existing types in `src/generated/prisma` and the hand-written types across `src/lib/*.ts`, when `packages/types/` is created as a workspace, then it exports `Listing`, `Opportunity`, `ScraperJob`, `User`, `SubscriptionTier`, `Message`, `PostingJob`, `Notification`, `DeviceToken`, plus enums `LifecycleStage`, `MessageStatus`, `PostingStatus`. The package has its own `package.json` (`name: "@shared/types"`), `tsconfig.json`, and a `src/index.ts` barrel. It pulls in **no runtime Prisma dependency** (type-only imports), so it is importable from a React Native bundle. `FR-MOBILE-FOUNDATION-04`

2. **`@shared/types` is structurally identical to the prisma source** — Given the canonical Prisma `Opportunity`/`Listing` types, when a TypeScript consumer imports `Opportunity` from `@shared/types` and assigns a prisma-generated `Opportunity` value to it (and vice-versa), then both directions type-check with zero errors (assignability proves structural identity). `FR-MOBILE-FOUNDATION-04`

3. **`packages/design-tokens/` mirrors the canonical `:root`** — Given the canonical design tokens in `app/globals.css` `:root`, when `packages/design-tokens/` is created as a workspace (`name: "@shared/design-tokens"`), then it exports a typed TypeScript `tokens` object with `colors`, `spacing`, `radius`, `typography`, `glass`, `animation`, and the color values are byte-identical to the CSS: `primary #7c3aed`, `secondary #8b5cf6`, `accent #fbbf24`, `background #080b14`, `surface #0f1524`, `text #e2e8f0`, `textSecondary #94a3b8`, `border rgba(255,255,255,0.09)`, `success #34d399`, `warning #fbbf24`, `error #f87171`. `FR-MOBILE-FOUNDATION-05`

4. **Web consumes the shared tokens with zero visual regression** — Given the web app's styling, when the web workspace consumes `packages/design-tokens/` (at minimum, a build-time assertion / generated source that the `:root` values equal the token object), then the existing canonical `.fp-*` utility classes resolve to identical values and existing visual behavior is unchanged — verified by a Playwright check that `document.body` `background-color` is still `rgb(8, 11, 20)` and `--color-primary` is still `#7c3aed` on `/dashboard`. `FR-MOBILE-FOUNDATION-05`

## Requirement Traceability

| FR | Acceptance Criteria | Test Tag |
|----|---------------------|----------|
| FR-MOBILE-FOUNDATION-04 | AC #1, #2 | `@FR-MOBILE-FOUNDATION-04` `@story-15-2` `@E-015-S-4` |
| FR-MOBILE-FOUNDATION-05 | AC #3, #4 | `@FR-MOBILE-FOUNDATION-05` `@story-15-2` `@E-015-S-5` `@E-015-S-6` |

## Tasks / Subtasks

- [ ] **Task 1: Scaffold `packages/types/`** (AC #1)
  - [ ] 1.1 Create `packages/types/package.json` — `name: "@shared/types"`, `version: "0.0.0"`, `private: true`, `main`/`types` pointing at `src/index.ts` (or a built `dist` if you add a build step — prefer source-only with `"types": "src/index.ts"` since both web (Next/Turbopack) and mobile (Metro) bundle TS directly).
  - [ ] 1.2 Create `packages/types/tsconfig.json` extending the root base, `strict: true`, no `baseUrl`.
  - [ ] 1.3 Create `packages/types/src/index.ts` (canonical JSDoc file header — `@author Stephen Boyett`, `@Copyright © 2026 Axovia LLC. All Rights Reserved.`). Use `import type { ... } from '@/generated/prisma'`-equivalent **type-only** re-exports for the Prisma-sourced models, and declare the hand-written shapes (`SubscriptionTier` from `src/lib/subscription-tiers.ts`, plus `Notification`, `DeviceToken`) explicitly.
  - [ ] 1.4 Map the Prisma path: the package needs to reference generated types without a runtime import. Options: (a) `import type` from a relative path to `../../src/generated/prisma`, or (b) re-declare the structural shapes. **Prefer (a) `import type`** — type-only imports are fully erased, so no Prisma runtime is bundled into mobile. Verify the erasure with `pnpm --filter @shared/types build` or a bundler dry-run.
  - [ ] 1.5 Export all required names from the barrel: `Listing`, `Opportunity`, `ScraperJob`, `User`, `SubscriptionTier`, `Message`, `PostingJob`, `Notification`, `DeviceToken`, `LifecycleStage`, `MessageStatus`, `PostingStatus`.

- [ ] **Task 2: Scaffold `packages/design-tokens/`** (AC #3)
  - [ ] 2.1 Create `packages/design-tokens/package.json` — `name: "@shared/design-tokens"`, same shape as Task 1.1.
  - [ ] 2.2 Create `packages/design-tokens/tsconfig.json` extending root base.
  - [ ] 2.3 Create `packages/design-tokens/src/index.ts` (canonical file header) exporting a typed `tokens` object. Source the values **verbatim** from `app/globals.css` `:root` (see Dev Notes for the exact block). Structure: `colors` (the 11 palette values), `spacing`, `radius`, `typography`, `glass` (alpha levels for `.fp-glass*` surfaces — read from the `.fp-glass` rules in `app/globals.css`), `animation` (durations/easings from the `@keyframes fp-*` + transition tokens).
  - [ ] 2.4 Export a TypeScript `as const` type so consumers get literal types (`tokens.colors.primary` is `"#7c3aed"`, not `string`).

- [ ] **Task 3: Wire web to consume the tokens + prove no drift** (AC #4)
  - [ ] 3.1 Add a build-time/test-time guard proving the `:root` CSS values equal `@shared/design-tokens`. Lowest-risk approach: a Jest test that reads `app/globals.css` as a string and asserts each `--color-*` value equals the corresponding `tokens.colors.*` value. (This does NOT require refactoring `globals.css` to be generated — that is a larger change deferred; see ADR-15.2-B.)
  - [ ] 3.2 Optionally expose `tokens` to the Tailwind config so future utilities can reference it; only if it introduces zero visual change. If risky, defer and rely on the Jest equality guard.

- [ ] **Task 4: Verify the monorepo still installs and web is unaffected** (AC #1, #4)
  - [ ] 4.1 `pnpm install` resolves the two new workspaces; exit 0.
  - [ ] 4.2 `make build` (web) — strict TS, exit 0. `make test` green. `make lint` zero errors.

- [ ] **Task 5: Write acceptance scenarios** (AC #1, #2, #3, #4)
  - [ ] 5.1 In `test/acceptance/features/E-015-mobile-foundation.feature`:
    - `@E-015-S-4 @story-15-2 @FR-MOBILE-FOUNDATION-04` — assert `packages/types/src/index.ts` exports all 12 required names (parse the barrel / compile a probe module that imports each and assigns a prisma value to the `@shared/types` `Opportunity` to prove structural identity — AC #2). The probe must `tsc --noEmit` clean.
    - `@E-015-S-5 @story-15-2 @FR-MOBILE-FOUNDATION-05` — assert `@shared/design-tokens` `tokens.colors` values equal the `app/globals.css` `:root` values (`.fp-glass` background alpha matches the token).
    - `@E-015-S-6 @story-15-2 @FR-MOBILE-FOUNDATION-05` — Playwright: load `/dashboard`; assert `document.body` background is `rgb(8, 11, 20)` and `--color-primary` is `#7c3aed` (no visual regression from token wiring).
  - [ ] 5.2 Add steps to `E-015-mobile-foundation.steps.ts`. AC #2/#3 are logic/structural (service-level: TS probe + value-equality). AC #4 is UI-visible → Playwright E2E.

- [ ] **Task 6: Update RTM + administrivia**
  - [ ] 6.1 RTM: rows for FR-MOBILE-FOUNDATION-04 (→ `@E-015-S-4`) and FR-MOBILE-FOUNDATION-05 (→ `@E-015-S-5, @E-015-S-6`).
  - [ ] 6.2 `make test-ac STORY=15.2` green.
  - [ ] 6.3 `Status: review`; `sprint-status.yaml`: `15-2-extract-shared-packages-types-design-tokens: review`.
  - [ ] 6.4 File List; Trello → Done (`SvVRLeS5`).

## Dev Notes

### Current ground truth (verified)

- **There is no `src/lib/types.ts`.** The epics doc's reference to it is aspirational. The real sources are `src/generated/prisma` (Prisma-generated, DO-NOT-EDIT, source of truth for most models + enums) and hand-written types in `src/lib/*.ts` (e.g. `src/lib/subscription-tiers.ts` → `SubscriptionTier`).
- Prisma client uses the `PrismaPg` driver adapter and is Node-only — **never import the runtime client into `packages/types/`**; use `import type` exclusively so the mobile bundle stays Prisma-free.
- Canonical `:root` tokens in `app/globals.css` (copy these **verbatim** into `@shared/design-tokens`):
  - `--color-primary: #7c3aed`, `--color-secondary: #8b5cf6`, `--color-accent: #fbbf24`
  - `--color-background: #080b14`, `--color-surface: #0f1524`
  - `--color-text: #e2e8f0`, `--color-text-secondary: #94a3b8`
  - `--color-border: rgba(255,255,255,0.09)`
  - `--color-success: #34d399`, `--color-warning: #fbbf24`, `--color-error: #f87171`
- `@shared/*` tsconfig alias was added in Story 15.1 (`packages/*/src` — single wildcard per ADR-15.1-C; TS5062 forbids two `*`). This story creates the packages that alias points at. **Consequence:** each package MUST expose its full public API through a `src/index.ts` barrel — deep imports (`@shared/types/listing`) do not resolve by design.

### Why `import type` only?

A `import type { Opportunity } from '../../src/generated/prisma'` is fully erased at compile time — it emits no `require`/`import` statement, so Metro will never try to bundle the Prisma query engine into the mobile app. If any value (not just type) is imported from the Prisma client into `@shared/types`, the mobile build breaks. Guard this in review.

### Project Structure Notes

New:
- `packages/types/{package.json,tsconfig.json,src/index.ts}`
- `packages/design-tokens/{package.json,tsconfig.json,src/index.ts}`
- token-equality Jest test under `src/__tests__/` (e.g. `src/__tests__/shared/design-tokens-parity.test.ts`)
- new scenarios in `test/acceptance/features/E-015-mobile-foundation.feature` + steps

Modified: `pnpm-lock.yaml`, RTM, sprint-status.yaml. Possibly Tailwind config (only if zero-risk).

### Files to Read Before Starting

1. `src/generated/prisma` (schema-generated index) — confirm exact exported type/enum names.
2. `prisma/schema.prisma` — model + enum source of truth.
3. `src/lib/subscription-tiers.ts` — `SubscriptionTier` definition.
4. `app/globals.css` lines 1–40 — the `:root` token block.
5. Story 15.1 file — confirms the `@shared/*` alias already exists in `tsconfig.json`.
6. epics-mobile-app.md §Story 15.2 + §DoD.

### References

- Epic + story spec: `epics-mobile-app.md` §Story 15.2; FRs FR-MOBILE-FOUNDATION-04, -05
- Prisma docs (type-only imports / generated client): https://www.prisma.io/docs
- DoD gate: `_bmad-output/project-context.md`; Trello `SvVRLeS5` (trello-axovia)

## Pre-Mortem Risk Analysis

- **A — Prisma runtime leaks into the mobile bundle.** A non-type import pulls in the query engine and breaks Metro. _Mitigation:_ `import type` only (Task 1.4); review guard; a bundler dry-run.
- **B — Token values drift from `:root` over time.** _Mitigation:_ the Jest parity test (Task 3.1) fails CI if `globals.css` and `@shared/design-tokens` diverge.
- **C — Structural mismatch between `@shared/types.Opportunity` and prisma's.** Re-declaring shapes by hand risks divergence. _Mitigation:_ prefer `import type` re-export over hand re-declaration; AC #2 assignability probe catches drift.
- **D — Workspace package resolution fails in Jest** (Jest doesn't know `@shared/*`). _Mitigation:_ add `@shared/*` to `jest.config.js` `moduleNameMapper` mirroring the tsconfig alias.

## Decisions and Rationale (ADRs)

- **ADR-15.2-A — Source-only packages (no build step).** _Decision:_ `@shared/types` and `@shared/design-tokens` ship raw `.ts` with `"types": "src/index.ts"`. _Rationale:_ both consumers (Turbopack, Metro) bundle TS directly; a `dist` build adds CI cost and a stale-artifact failure mode. _Consequences:_ consumers must include the package source in their TS `include`/transpile scope.
- **ADR-15.2-B — Keep `app/globals.css` hand-authored; guard parity with a test.** _Decision:_ do NOT generate `globals.css` from `@shared/design-tokens` in this story. _Rationale:_ generating CSS from tokens is a larger refactor with regression risk; a value-equality test gives the single-source-of-truth guarantee at far lower risk. _Consequences:_ a future story may generate the CSS; until then the parity test is the contract.
- **ADR-15.2-C — `import type` re-export over hand re-declaration.** _Decision:_ re-export Prisma types via `import type`. _Rationale:_ guarantees structural identity (AC #2) and zero runtime cost. _Consequences:_ `@shared/types` depends on the generated Prisma types existing at build time (they do — `prisma generate` runs in `build`).

## Dev Agent Guardrails

- **Do NOT import the Prisma runtime client** into `packages/types/`. Type-only imports exclusively.
- **Do NOT edit `src/generated/prisma`** — it is generated.
- **Do NOT change `app/globals.css` token values.** Mirror them; if you must touch globals.css, only to wire tokens with provably zero visual change.
- **Do NOT add a `baseUrl`** to any tsconfig.
- **Do NOT use `any`** in the token object or type barrel.
- **Do NOT commit acceptance scenarios as `@wip`/`@skip`.**
- **Do NOT duplicate types** — the whole point is one canonical definition.

## Previous Story Intelligence

Story 15.1 added the `mobile`/`packages/*` workspace globs and the `@shared/*` tsconfig alias. This story is the first to actually create `packages/*` content, so it exercises 15.1's plumbing for the first time — if `pnpm install` or alias resolution misbehaves, suspect 15.1's config. Epic 14 froze the canonical `:root` palette this story mirrors (`14-1-design-tokens-base-style-unification`).

## Git Intelligence Summary

`2caa167 pushing epic 14 and mobile app initial plan` introduced the mobile plan. Epic 14's `14-1` set the `:root` tokens. No recent commit touches `packages/` (it doesn't exist yet) or `src/generated/prisma`, so no conflict risk.

## Latest Tech Information

- **TypeScript `import type`** — erased completely at emit; the canonical way to share Prisma-generated types with a non-Node runtime.
- **Metro / NativeWind (Story 15.3)** will consume `@shared/design-tokens` as plain JS — keeping it a framework-agnostic `as const` object (no React Native imports) is essential so web can consume it too.

## Project Context Reference

- BMAD gate + Trello (`SvVRLeS5`, trello-axovia): `_bmad-output/project-context.md`
- Triple-tag rule: epics-mobile-app.md §DoD
- File-header standard (`@Copyright © 2026 Axovia LLC`): `~/.claude/CLAUDE.md`

## Definition of Done

> Full gate: `_bmad-output/project-context.md` + `epics-mobile-app.md` §DoD.

- [ ] All tasks `[x]`; every AC satisfied; no `any` in production code
- [ ] `make lint` / `make build` / `make test` green; web unaffected
- [ ] `packages/types/` exports all 12 names with no runtime Prisma dependency; `@shared/types.Opportunity` assignable to/from prisma's
- [ ] `packages/design-tokens/` values byte-identical to `app/globals.css` `:root`
- [ ] Every AC tested at the correct level (TS probe + parity test for logic ACs; Playwright for the no-regression UI AC)
- [ ] `make test-ac STORY=15.2` passes green
- [ ] Scenarios in `E-015-mobile-foundation.feature` triple-tagged
- [ ] RTM updated
- [ ] File headers on every new `.ts` (`@Copyright © 2026 Axovia LLC`)
- [ ] `Status` → `review`; `sprint-status.yaml` → `review`; File List updated
- [ ] Trello card → Done (`SvVRLeS5`, trello-axovia)

## Story Completion Status

- Comprehensive developer guide created.
- Creates the shared packages the entire mobile track imports; unblocks 15.3 (mobile consumes both packages).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
