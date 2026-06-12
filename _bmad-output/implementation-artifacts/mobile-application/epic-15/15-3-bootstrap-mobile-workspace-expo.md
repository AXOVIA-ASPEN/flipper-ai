# Story 15.3: Bootstrap `mobile/` Workspace with Expo + Expo Router + NativeWind

Status: blocked
Blocked: true
Blocked-Reason: HUMAN REVIEW GATE — Stephen must review and approve the mobile architecture overview (docs/architecture/mobile-architecture-overview.html) before ANY Epic 15+ mobile development starts. Do not begin implementation while this gate is in place. To lift: after approval, set Blocked: false, clear this reason, set Status: ready-for-dev (all five Epic 15 stories carry this same gate).
Trello-Card-ID: 6a16b88f26eb9e3799eda732

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **developer**,
I want a working Expo SDK 53+ mobile workspace with file-based routing (expo-router) and NativeWind-powered design tokens,
so that I can build app screens against the canonical Flipper dark-glassmorphism design system using familiar Tailwind utility classes — with the Metro bundler running and TypeScript strict mode green.

## Problem Statement

Story 15.1 declared the `mobile` workspace glob; Story 15.2 created `@shared/types` and `@shared/design-tokens`. Nothing exists under `mobile/` yet. This story bootstraps the actual Expo app: the entry layout, a first screen, NativeWind v4 wired to `@shared/design-tokens`, strict TypeScript, and the canonical file-header standard enforced on every `.ts`/`.tsx`.

This is the last **plumbing** story before features begin (Epic 16 = CI/CD, Epic 17 = auth bridge). It must produce a binary that boots and renders — "Hello Flipper Mobile" — on both iOS Simulator and Android Emulator, styled with the same purple-on-dark tokens as the web.

## Solution

1. Bootstrap `mobile/` with `create-expo-app` (TypeScript template + expo-router). Entry is `mobile/app/_layout.tsx`; `mobile/app/index.tsx` renders the "Hello Flipper Mobile" screen.
2. Configure NativeWind v4 in `mobile/tailwind.config.ts`, consuming `@shared/design-tokens` so `className="fp-glass fp-btn-primary"`-style utilities resolve to native styles matching the web's visual output.
3. Wire `mobile/tsconfig.json` to extend the base config, with `@/*` → `mobile/src/*` and `@shared/*` → `packages/*/src` (single wildcard per ADR-15.1-C — TS5062 forbids two `*`); `pnpm --filter mobile typecheck` exits 0.
4. Enforce the canonical JSDoc file header on every `mobile/**/*.{ts,tsx}`.

Bar: `pnpm --filter mobile dev` starts Metro; the screen renders on both platforms (Maestro smoke flow); `pnpm --filter mobile typecheck` is clean; headers present.

## Acceptance Criteria

1. **Expo app boots with file-based routing** — Given the configured monorepo (Story 15.1), when `mobile/` is bootstrapped with `create-expo-app` (TypeScript template + expo-router), then `mobile/app/_layout.tsx` exists (root layout), `mobile/app/index.tsx` renders a "Hello Flipper Mobile" screen, and `pnpm --filter mobile dev` starts the Metro bundler without error. `FR-MOBILE-FOUNDATION-02`

2. **NativeWind resolves shared tokens to native styles** — Given the shared design tokens (`@shared/design-tokens`, Story 15.2), when NativeWind v4 is configured in `mobile/tailwind.config.ts` consuming those tokens, then className strings (e.g. `className="fp-glass fp-btn-primary"`, or the token-backed utilities `bg-background text-text`) resolve to native styles whose color values match the web's canonical output — `background` resolves to `#080b14`, primary to `#7c3aed` — sampled via a component snapshot/render test. `FR-MOBILE-FOUNDATION-06`

3. **TypeScript strict passes** — Given TypeScript strict mode, when `pnpm --filter mobile typecheck` runs, then it exits 0 with zero errors. `mobile/tsconfig.json` extends the project base, declares `@/*` → `mobile/src/*` and `@shared/*` → `packages/*/src` (single wildcard per ADR-15.1-C), and `strict: true`. `FR-MOBILE-FOUNDATION-03`

4. **File headers on every mobile source file** — Given the project File Header Standard, when any `.ts`/`.tsx` file is created under `mobile/`, then it begins with the canonical JSDoc file header: `@file`, `@author Stephen Boyett`, `@description`, and `@Copyright © 2026 Axovia LLC. All Rights Reserved.` (TS/TSX use the `@`-prefixed JSDoc tag form). `FR-MOBILE-FOUNDATION-07`

## Requirement Traceability

| FR | Acceptance Criteria | Test Tag |
|----|---------------------|----------|
| FR-MOBILE-FOUNDATION-02 | AC #1 | `@FR-MOBILE-FOUNDATION-02` `@story-15-3` `@E-015-S-7` |
| FR-MOBILE-FOUNDATION-06 | AC #2 | `@FR-MOBILE-FOUNDATION-06` `@story-15-3` `@E-015-S-8` |
| FR-MOBILE-FOUNDATION-03 | AC #3 | `@FR-MOBILE-FOUNDATION-03` `@story-15-3` `@E-015-S-9` |
| FR-MOBILE-FOUNDATION-07 | AC #4 | `@FR-MOBILE-FOUNDATION-07` `@story-15-3` `@E-015-S-10` |

## Tasks / Subtasks

- [ ] **Task 1: Bootstrap the Expo workspace** (AC #1)
  - [ ] 1.1 In `mobile/`, scaffold with `create-expo-app` using the TypeScript template and add `expo-router` (Expo SDK 53+, managed workflow). Confirm the generated `mobile/package.json` `name` is `mobile` (or `@flipper/mobile`) so the workspace resolves.
  - [ ] 1.2 Ensure expo-router entry: `mobile/app/_layout.tsx` (root `Stack`/`Slot` layout) and `mobile/app/index.tsx` rendering a `Text` "Hello Flipper Mobile" on a dark background. Mirror the web App Router route-group convention in comments ((tabs)/(auth) groups arrive in later epics).
  - [ ] 1.3 Configure Metro for the monorepo: `mobile/metro.config.js` must add the workspace root to `watchFolders` and resolve hoisted `node_modules` (use `expo/metro-config` + the standard pnpm-monorepo Metro tweaks so `@shared/*` and hoisted deps resolve).
  - [ ] 1.4 `pnpm install` at the root resolves the `mobile` workspace; `pnpm --filter mobile dev` (alias for `expo start`) starts Metro without error.

- [ ] **Task 2: Configure TypeScript** (AC #3)
  - [ ] 2.1 Create/adjust `mobile/tsconfig.json` extending `expo/tsconfig.base` AND the project base where compatible; `strict: true`; `paths`: `@/*` → `./src/*` (i.e. `mobile/src/*`), `@shared/*` → `../packages/*/src` (single wildcard per ADR-15.1-C — two `*` in a substitution is a TS5062 config error). No `baseUrl` unless Expo's base requires one (if it does, mirror Expo's default).
  - [ ] 2.2 Create `mobile/src/` for non-route code (components, hooks, lib). Add a tiny pure util (e.g. `mobile/src/lib/greeting.ts`) to anchor the Jest sample test in Story 15.4 and prove `@/*` resolution.
  - [ ] 2.3 Add `typecheck` script to `mobile/package.json`: `tsc --noEmit`. `pnpm --filter mobile typecheck` exits 0.

- [ ] **Task 3: Wire NativeWind v4 to shared tokens** (AC #2)
  - [ ] 3.1 Install NativeWind v4 + tailwindcss in the `mobile` workspace; add the NativeWind Babel/Metro plugin per NativeWind v4 setup.
  - [ ] 3.2 Create `mobile/tailwind.config.ts` that imports `tokens` from `@shared/design-tokens` and maps them into `theme.extend.colors` (`background`, `surface`, `primary`, `secondary`, `accent`, `text`, `textSecondary`, `border`, `success`, `warning`, `error`), plus spacing/radius/typography from the token object.
  - [ ] 3.3 Define a small set of canonical `.fp-*` component utilities for native (e.g. `fp-glass`, `fp-btn-primary`) via NativeWind's preset/`@layer components` equivalent or a shared style map — enough to satisfy AC #2's sample. Full `.fp-*` parity is built out per-screen in later epics; this story proves the wiring resolves token values correctly.
  - [ ] 3.4 Create `mobile/global.css` (NativeWind entry) and import it in `_layout.tsx` per NativeWind v4 docs.
  - [ ] 3.5 Set the app background to the token `background` (`#080b14`) so the first screen reads as Flipper dark.

- [ ] **Task 4: Enforce file headers** (AC #4)
  - [ ] 4.1 Add the canonical JSDoc header to every `.ts`/`.tsx` created under `mobile/` (`_layout.tsx`, `index.tsx`, `metro.config.js` uses the shell/JS comment form, `tailwind.config.ts`, `src/lib/greeting.ts`). `@author Stephen Boyett`, `@Copyright © 2026 Axovia LLC. All Rights Reserved.`
  - [ ] 4.2 Note: generated `create-expo-app` files must be retro-fitted with headers. Config files that are JS (not TS) use the appropriate comment form; `.ts`/`.tsx` use JSDoc `@`-tags.

- [ ] **Task 5: Sample-render / snapshot test for token resolution** (AC #2)
  - [ ] 5.1 Add a `@testing-library/react-native` render test (under `mobile/src/__tests__/`, or wire fully in Story 15.4 and keep a minimal one here) that renders a component using `className="bg-background"` and asserts the resolved style color is `#080b14` (and a primary-styled element resolves `#7c3aed`). This is the service/component-level proof for AC #2.
  - [ ] 5.2 If the full mobile Jest harness isn't ready until 15.4, gate this so 15.3's AC #2 proof is the snapshot test and 15.4 formalizes the harness. Coordinate the dependency in Dev Notes.

- [ ] **Task 6: Maestro smoke flow** (AC #1)
  - [ ] 6.1 Create `mobile/.maestro/smoke.yaml` — boot the dev client and assert the "Hello Flipper Mobile" text is visible.
  - [ ] 6.2 Document the run command (`maestro test mobile/.maestro/smoke.yaml`) for both iOS Simulator and Android Emulator. (CI execution of Maestro is wired in Epic 16; this story delivers the flow + local-run proof.)

- [ ] **Task 7: Acceptance scenarios** (AC #1–#4)
  - [ ] 7.1 In `test/acceptance/features/E-015-mobile-foundation.feature`:
    - `@E-015-S-7 @story-15-3 @FR-MOBILE-FOUNDATION-02` — assert `mobile/app/_layout.tsx` and `mobile/app/index.tsx` exist; `index.tsx` contains "Hello Flipper Mobile"; `mobile/package.json` has a `dev` script invoking expo. (A Maestro boot flow covers the live render on both platforms.)
    - `@E-015-S-8 @story-15-3 @FR-MOBILE-FOUNDATION-06` — component render/snapshot proof that `bg-background` resolves to `#080b14` and primary to `#7c3aed` via NativeWind + `@shared/design-tokens`.
    - `@E-015-S-9 @story-15-3 @FR-MOBILE-FOUNDATION-03` — run `pnpm --filter mobile typecheck`; assert exit 0.
    - `@E-015-S-10 @story-15-3 @FR-MOBILE-FOUNDATION-07` — assert every `mobile/**/*.{ts,tsx}` begins with the canonical header (`@author Stephen Boyett`, `@Copyright © 2026 Axovia LLC`).
  - [ ] 7.2 Add steps to `E-015-mobile-foundation.steps.ts`. AC #1 (filesystem + Maestro), AC #2 (component render — correct level for "resolves to native styles"), AC #3 (exit-code), AC #4 (filesystem header scan).

- [ ] **Task 8: RTM + administrivia**
  - [ ] 8.1 RTM rows for FR-MOBILE-FOUNDATION-02/-06/-03/-07 → Story 15.3.
  - [ ] 8.2 `make test-ac STORY=15.3` green; web `make test`/`make build`/`make lint` still green (no regression).
  - [ ] 8.3 `Status: review`; `sprint-status.yaml`: `15-3-bootstrap-mobile-workspace-expo: review`.
  - [ ] 8.4 File List; Trello → Done (`SvVRLeS5`).

## Dev Notes

### Current ground truth (verified)

- `mobile/` does NOT exist. Story 15.1 added the `mobile` workspace glob and `@shared/*` alias; Story 15.2 created `@shared/types` + `@shared/design-tokens`.
- Web `tsconfig.json`: `moduleResolution: "bundler"`, `strict: true`, no `baseUrl`, `paths: { "@/*": ["./src/*"] }`. The mobile alias mirrors `@/*` → `mobile/src/*`.
- Canonical tokens (web `:root`): primary `#7c3aed`, background `#080b14`, surface `#0f1524`, etc. (full list in Story 15.2). `@shared/design-tokens` is the single source the mobile Tailwind config consumes.
- Project File Header Standard: TS/TSX use `@`-prefixed JSDoc tags; company for this client = **Axovia LLC**; year **2026**.

### pnpm + Metro monorepo gotchas

NativeWind/Expo in a pnpm workspace needs Metro configured to (a) watch the monorepo root, and (b) resolve hoisted `node_modules`. Use `expo/metro-config`'s `getDefaultConfig` then add `config.watchFolders = [workspaceRoot]` and `config.resolver.nodeModulesPaths`. pnpm's symlinked store sometimes needs `config.resolver.unstable_enableSymlinks = true` / `disableHierarchicalLookup`. Test `pnpm --filter mobile dev` early.

### NativeWind v4 specifics

NativeWind v4 changed setup vs v2 (CSS-first, `global.css`, `metro` + `babel` plugins, `cssInterop`). Pull current setup from the NativeWind v4 docs (context7 / official site) — do not rely on v2 instructions. The `tailwind.config.ts` `content` globs must cover `mobile/app/**` and `mobile/src/**`.

### Project Structure Notes

New (all under `mobile/`): `app/_layout.tsx`, `app/index.tsx`, `metro.config.js`, `babel.config.js`, `tailwind.config.ts`, `global.css`, `tsconfig.json`, `package.json`, `app.json`/`app.config.ts`, `src/lib/greeting.ts`, `src/__tests__/*`, `.maestro/smoke.yaml`. Plus E-015 feature/steps additions, RTM, sprint-status.

### Files to Read Before Starting

1. Story 15.1 + 15.2 files — confirm the `@shared/*` alias and the two shared packages exist and export what this story imports.
2. `app/globals.css` `:root` — token values to verify NativeWind resolves identically.
3. `~/.claude/CLAUDE.md` §File Header Standard — TS/TSX `@`-tag form; `@Copyright © 2026 Axovia LLC`.
4. epics-mobile-app.md §Story 15.3 + §DoD (Maestro smoke flow requirement).
5. NativeWind v4 + Expo SDK 53 docs (latest).

### References

- Epic + story spec: `epics-mobile-app.md` §Story 15.3; FRs -02, -03, -06, -07
- Expo Router: https://docs.expo.dev/router/introduction/
- NativeWind v4: https://www.nativewind.dev/
- Maestro: https://maestro.mobile.dev/
- Trello `SvVRLeS5` (trello-axovia)

## Pre-Mortem Risk Analysis

- **A — Metro can't resolve `@shared/*` or hoisted deps in the pnpm workspace.** Most common bootstrap failure. _Mitigation:_ configure `watchFolders` + `nodeModulesPaths` + symlink resolution early (Task 1.3); smoke `pnpm --filter mobile dev` before building anything else.
- **B — NativeWind v2 instructions followed by mistake.** v4 setup is materially different. _Mitigation:_ Dev Notes pins v4; pull live docs.
- **C — Token color mismatch (web vs native).** Tailwind color string parsing (e.g. `rgba(255,255,255,0.09)` border) can differ. _Mitigation:_ AC #2 render test asserts exact resolved values; keep tokens as the single source.
- **D — File-header validator gap.** `make check-headers` does not exist yet (Story 15.4 introduces a header check). _Mitigation:_ this story's AC #4 is proven by a filesystem-scan acceptance scenario, not by `make check-headers`; 15.4 formalizes the make target.
- **E — `tsconfig` strict conflicts between Expo base and project base.** _Mitigation:_ extend Expo's base primarily; layer `strict: true` + paths on top; resolve any conflicts toward strictness.
- **F — Jest mobile harness not ready (it's Story 15.4).** _Mitigation:_ Task 5.2 keeps a minimal render test here; 15.4 formalizes `jest-expo`.

## Decisions and Rationale (ADRs)

- **ADR-15.3-A — expo-router (file-based) from day one.** _Decision:_ use expo-router rather than React Navigation directly. _Rationale:_ mirrors the web App Router mental model (route groups `(tabs)`/`(auth)`), per FR-MOBILE-FOUNDATION-02. _Consequences:_ later epics add route groups under `mobile/app/`.
- **ADR-15.3-B — NativeWind v4 over StyleSheet.** _Decision:_ consume shared tokens via Tailwind utilities. _Rationale:_ FR-MOBILE-FOUNDATION-06; keeps the design language and authoring model aligned with web. _Consequences:_ a small native `.fp-*` utility layer is maintained alongside the web CSS; both source from `@shared/design-tokens`.
- **ADR-15.3-C — Minimal Jest render test now, full harness in 15.4.** _Decision:_ AC #2 proof is a single render test; the `jest-expo` harness is formalized in Story 15.4. _Rationale:_ avoids double-owning the test config; keeps 15.3 focused on bootstrap. _Consequences:_ 15.3 → 15.4 dependency for the full test scaffold.

## Dev Agent Guardrails

- **Do NOT touch web application code** (`app/`, `src/`) — mobile workspace only.
- **Do NOT hardcode token hex values** in mobile — consume `@shared/design-tokens`.
- **Do NOT follow NativeWind v2 setup** — v4 only.
- **Do NOT skip file headers** on any generated/new `mobile` `.ts`/`.tsx`.
- **Do NOT add `baseUrl`** unless Expo's base config requires it; if so, mirror Expo's value exactly.
- **Do NOT use `any`** in mobile source.
- **Do NOT commit acceptance scenarios as `@wip`/`@skip`.**
- **Do NOT mock the `typecheck` exit-code scenario** — run the real command.

## Previous Story Intelligence

Story 15.2 created `@shared/types` and `@shared/design-tokens` and added `@shared/*` to Jest `moduleNameMapper` — reuse that mapping pattern for the mobile Jest config in 15.4. Story 15.1 verified `pnpm install` tolerates the (then-empty) `mobile` glob; now the glob resolves to a real package for the first time. If install or alias resolution breaks, suspect 15.1/15.2 config first.

## Git Intelligence Summary

`2caa167 pushing epic 14 and mobile app initial plan` is the relevant commit (added the mobile plan). No prior `mobile/` code exists, so no conflict risk. Epic 14 froze the `:root` tokens this story mirrors via `@shared/design-tokens`.

## Latest Tech Information

- **Expo SDK 53+** — managed workflow; expo-router is the default navigation; `expo start` runs Metro. New-arch (Fabric/TurboModules) is default-on in recent SDKs — verify NativeWind v4 compatibility.
- **NativeWind v4** — CSS-first config, `global.css`, `cssInterop`, Metro + Babel plugins. Materially different from v2.
- **Metro + pnpm** — requires `watchFolders` + `nodeModulesPaths` + symlink resolution for monorepos.
- **Maestro** — YAML flows; `maestro test <flow>`; runs against simulators/emulators and (Epic 16) CI.

## Project Context Reference

- BMAD gate + Trello (`SvVRLeS5`, trello-axovia): `_bmad-output/project-context.md`
- Triple-tag rule + Maestro requirement: epics-mobile-app.md §DoD
- File-header standard (`@Copyright © 2026 Axovia LLC`): `~/.claude/CLAUDE.md`

## Definition of Done

> Full gate: `_bmad-output/project-context.md` + `epics-mobile-app.md` §DoD.

- [ ] All tasks `[x]`; every AC satisfied; no `any` in production code
- [ ] `pnpm --filter mobile typecheck` exits 0 (strict)
- [ ] `pnpm --filter mobile dev` starts Metro; Maestro smoke flow renders "Hello Flipper Mobile" on iOS Simulator AND Android Emulator
- [ ] NativeWind resolves `@shared/design-tokens` values identically to web (`#080b14`, `#7c3aed`) — render test passes
- [ ] Every `mobile/**/*.{ts,tsx}` has the canonical file header (`@Copyright © 2026 Axovia LLC`)
- [ ] Web `make lint`/`make build`/`make test` still green (zero regression)
- [ ] Every AC tested at the correct level (component render for token AC, filesystem/exit-code for the rest, Maestro for live render)
- [ ] `make test-ac STORY=15.3` passes green
- [ ] Scenarios in `E-015-mobile-foundation.feature` triple-tagged
- [ ] RTM updated; `Status` → `review`; `sprint-status.yaml` → `review`; File List updated
- [ ] Trello card → Done (`SvVRLeS5`, trello-axovia)

## Story Completion Status

- Comprehensive developer guide created.
- Delivers the first booting Flipper mobile binary; unblocks Story 15.4 (test/lint scaffolding) and Epic 16 (CI/CD pipeline).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
