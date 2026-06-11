# Story 15.1: Convert Repo to pnpm Workspace Monorepo

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID: 6a16b8810240065f4faa6049

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **developer**,
I want the repository to be a pnpm workspace monorepo with a `mobile/` workspace and shared `packages/`,
so that the mobile app (Epics 15–29) can share types, design tokens, and tooling with the web app without duplication — and the existing web workspace keeps building and testing exactly as it does today.

## Problem Statement

The repo is **already a pnpm workspace**, but a single-package one. `pnpm-workspace.yaml` currently declares only the root:

```yaml
packages:
  - .
ignoredBuiltDependencies:
  - sharp
  - unrs-resolver
onlyBuiltDependencies:
  - '@prisma/engines'
  - '@swc/core'
  - bufferutil
  - esbuild
  - prisma
```

The mobile track needs two more workspace globs — `mobile` and `packages/*` — plus tsconfig path aliases so both web and mobile can import shared code via `@shared/types` and `@shared/design-tokens`. Neither `mobile/` nor `packages/` exists yet (`packages/` will be populated by Story 15.2, `mobile/` by Story 15.3). This story lays the **workspace plumbing only** — it does not create the shared packages or the Expo app; it makes the monorepo *able* to host them.

This is the **foundation story for the entire mobile track**. Stories 15.2 → 15.5 and Epics 16–29 all assume `pnpm install` resolves a multi-workspace tree and that `@shared/*` resolves in tsconfig.

## Solution

Three surgical, additive changes — zero changes to web application code:

1. **Extend `pnpm-workspace.yaml`** to declare `mobile` and `packages/*` alongside the existing `.`. Preserve the existing `ignoredBuiltDependencies` / `onlyBuiltDependencies` blocks verbatim.
2. **Create placeholder package scaffolding** so `pnpm install` resolves cleanly before 15.2/15.3 land: a minimal `packages/.gitkeep` is insufficient (pnpm needs at least one valid `package.json` per glob match, OR an empty glob that matches nothing — which is fine). The safe approach: leave `packages/` and `mobile/` absent and rely on pnpm tolerating zero-match globs (it does). **Decision (ADR-15.1-A):** declare the globs now; pnpm treats a glob that matches no directory as an empty set, so `pnpm install` stays green until 15.2/15.3 create real packages. No placeholder `package.json` files are committed.
3. **Add tsconfig path aliases** for `@shared/*` in the root `tsconfig.json` so web code can import shared packages once they exist. The mobile workspace gets its own tsconfig in Story 15.3 that re-declares the same alias.

Bar: `pnpm install` exits 0, `make build`, `make lint`, and `make test` on the web workspace are byte-for-byte unaffected.

## Acceptance Criteria

1. **Workspace globs declared** — Given the existing `pnpm-workspace.yaml` declares only `.`, when the file is edited, then it declares the workspaces `.`, `mobile`, and `packages/*`, AND the existing `ignoredBuiltDependencies` and `onlyBuiltDependencies` blocks are preserved unchanged. `pnpm install` (or `pnpm install --frozen-lockfile` in CI) resolves all workspaces and exits 0, producing a unified hoisted `node_modules`. `FR-MOBILE-FOUNDATION-01`

2. **Web workspace unaffected** — Given the monorepo conversion, when the existing root-level scripts run, then `make build`, `make test`, `make lint`, and `make dev` all operate against the web workspace exactly as before with zero new errors attributable to this story (verified: `make build` exits 0; `make test` green with unchanged coverage; `make lint` zero errors). `FR-MOBILE-FOUNDATION-01`

3. **Shared path aliases resolve** — Given the path-alias convention from CLAUDE.md (`@/*` → `./src/*`), when a developer imports from a shared package, then `tsconfig.json` declares `@shared/*` mapping to `packages/*/src/*` such that `import { Foo } from '@shared/types'` and `import { tokens } from '@shared/design-tokens'` type-resolve in the web workspace once those packages exist (Story 15.2). The existing `@/*` alias remains intact and unbroken. `FR-MOBILE-FOUNDATION-01`, `FR-MOBILE-FOUNDATION-03`

## Requirement Traceability

| FR | Acceptance Criteria | Test Tag |
|----|---------------------|----------|
| FR-MOBILE-FOUNDATION-01 | AC #1, #2, #3 | `@FR-MOBILE-FOUNDATION-01` `@story-15-1` `@E-015-S-1` `@E-015-S-2` |
| FR-MOBILE-FOUNDATION-03 | AC #3 | `@FR-MOBILE-FOUNDATION-03` `@story-15-1` `@E-015-S-3` |

## Tasks / Subtasks

- [ ] **Task 1: Extend `pnpm-workspace.yaml`** (AC #1)
  - [ ] 1.1 Edit `pnpm-workspace.yaml`. Change the `packages:` list from `[.]` to declare three entries: `.`, `mobile`, `packages/*`.
  - [ ] 1.2 Leave `ignoredBuiltDependencies` (`sharp`, `unrs-resolver`) and `onlyBuiltDependencies` (`@prisma/engines`, `@swc/core`, `bufferutil`, `esbuild`, `prisma`) blocks byte-for-byte unchanged.
  - [ ] 1.3 Run `pnpm install`. Confirm exit 0 and that the lockfile diff is minimal (no spurious dependency churn — the empty `mobile`/`packages/*` globs should add no packages).
  - [ ] 1.4 Run `pnpm install --frozen-lockfile` to confirm the committed lockfile is consistent (this is what CI runs).

- [ ] **Task 2: Add `@shared/*` tsconfig path alias** (AC #3)
  - [ ] 2.1 Edit root `tsconfig.json`. In `compilerOptions.paths`, add `"@shared/*": ["./packages/*/src/*"]` alongside the existing `"@/*": ["./src/*"]`. Do NOT add a `baseUrl` — the existing config works without one under `moduleResolution: "bundler"`; relative path arrays already resolve from the project root.
  - [ ] 2.2 Confirm `pnpm exec tsc --noEmit` (or `make build`) still passes — the new alias maps to a not-yet-existing directory, which is fine; TS only errors if code actually imports `@shared/*` before the package exists. No web code imports it yet.

- [ ] **Task 3: Verify web workspace is untouched** (AC #2)
  - [ ] 3.1 `make build` — strict TypeScript, exit 0.
  - [ ] 3.2 `make test` — all Jest unit tests green, coverage thresholds met (branches ≥96%, functions ≥98%, lines ≥99%, statements ≥99%).
  - [ ] 3.3 `make lint` — zero ESLint errors.
  - [ ] 3.4 `make dev` boots on port 3200 (smoke check; Ctrl-C after confirming the server starts).

- [ ] **Task 4: Write acceptance scenarios** (AC #1, #2, #3)
  - [ ] 4.1 Create `test/acceptance/features/E-015-mobile-foundation.feature` with a `Feature:` header for the mobile-foundation epic.
  - [ ] 4.2 Scenario `@E-015-S-1 @story-15-1 @FR-MOBILE-FOUNDATION-01` — Read `pnpm-workspace.yaml`; assert the `packages:` list contains `.`, `mobile`, and `packages/*`; assert `ignoredBuiltDependencies` and `onlyBuiltDependencies` blocks are still present.
  - [ ] 4.3 Scenario `@E-015-S-2 @story-15-1 @FR-MOBILE-FOUNDATION-01` — Run `pnpm install --frozen-lockfile` as a child process; assert exit code 0. (Tag this scenario `@serial` and `@slow`; lift its timeout — install can take >60s on a cold store.)
  - [ ] 4.4 Scenario `@E-015-S-3 @story-15-1 @FR-MOBILE-FOUNDATION-03` — Read `tsconfig.json`; assert `compilerOptions.paths` contains both `@/*` → `./src/*` and `@shared/*` → `packages/*/src/*`.
  - [ ] 4.5 Create the step-definition file `test/acceptance/step_definitions/E-015-mobile-foundation.steps.ts` (TypeScript strict). These are filesystem/exit-code assertions — the correct level for infra/tooling ACs (no UI surface exists yet).

- [ ] **Task 5: Update RTM** (AC #1)
  - [ ] 5.1 Open `_bmad-output/test-artifacts/requirements-traceability-matrix.md`. Add a `## FR-MOBILE-FOUNDATION: Mobile App Foundation, Expo & Monorepo (Epic 15)` section if absent.
  - [ ] 5.2 Add rows mapping FR-MOBILE-FOUNDATION-01 → Story 15.1 → `@E-015-S-1, @E-015-S-2`, and FR-MOBILE-FOUNDATION-03 → Story 15.1 → `@E-015-S-3`, feature file `E-015-mobile-foundation.feature`.
  - [ ] 5.3 Bump `Last Updated:` to today.

- [ ] **Task 6: Final quality gates + administrivia**
  - [ ] 6.1 `make lint`, `make build`, `make test` all green.
  - [ ] 6.2 `make test-ac STORY=15.1` — zero failures, zero skipped.
  - [ ] 6.3 Set `Status: review`; update `sprint-status.yaml`: `15-1-convert-repo-to-pnpm-workspace-monorepo: review`.
  - [ ] 6.4 Populate File List.
  - [ ] 6.5 Move Trello card → Done on board `SvVRLeS5` (trello-axovia).

## Dev Notes

### Current ground truth (verified at story-creation time)

- `pnpm-workspace.yaml` **exists** and declares `packages: [.]` plus the built-dependency allow/deny lists. This story EXTENDS it; do not recreate it from scratch.
- `package.json` `name` is `flipper-ai`; scripts: `dev` = `next dev -p 3200`, `build` = `prisma generate && prisma migrate deploy && next build`, `lint` = `eslint .`, `test` = `jest --no-coverage`.
- Root `tsconfig.json` has `compilerOptions.paths = { "@/*": ["./src/*"] }`, `moduleResolution: "bundler"`, `strict: true`, **no `baseUrl`**.
- `packages/` and `mobile/` directories do NOT exist yet.

### Why declare globs that match nothing?

pnpm tolerates workspace globs that match zero directories — `pnpm install` does not error on an empty `packages/*` or a missing `mobile`. This lets us land the workspace plumbing in 15.1 independently, so 15.2 (packages) and 15.3 (mobile) can be developed and reviewed as separate PRs without a flag-day dependency. See ADR-15.1-A.

### Why no `baseUrl`?

The existing config resolves `@/*` → `./src/*` with no `baseUrl` because `moduleResolution: "bundler"` resolves the path arrays relative to the `tsconfig.json` location. Adding a `baseUrl` now would change resolution semantics for the entire web app and risks regressions — out of scope. Mirror the existing pattern exactly.

### Project Structure Notes

Files touched:
- `pnpm-workspace.yaml` (modified — add `mobile`, `packages/*` globs)
- `tsconfig.json` (modified — add `@shared/*` path alias)
- `pnpm-lock.yaml` (modified — regenerated by `pnpm install`; should be a minimal diff)
- `test/acceptance/features/E-015-mobile-foundation.feature` (new — shared with Stories 15.2–15.5)
- `test/acceptance/step_definitions/E-015-mobile-foundation.steps.ts` (new)
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)

No Prisma changes. No API changes. No env vars. No new runtime dependencies.

### Files to Read Before Starting

1. `pnpm-workspace.yaml` — the file you are extending.
2. `tsconfig.json` — the alias block you are extending.
3. `_bmad-output/planning-artifacts/epics-mobile-app.md` §Epic 15 Story 15.1 + §"Definition of Done (DoD) — All Stories" (tagging rules).
4. `package.json` — confirm `packageManager` field and scripts before running `pnpm install`.

### References

- Epic + story spec: `_bmad-output/planning-artifacts/epics-mobile-app.md` §Story 15.1
- FR definitions: same file §"FR-MOBILE-FOUNDATION" (FR-01, FR-03)
- pnpm workspaces: https://pnpm.io/workspaces (globs, frozen-lockfile)
- DoD gate: `_bmad-output/project-context.md` §Story Definition of Done
- Trello: server `trello-axovia`, board `SvVRLeS5` (`_bmad-output/project-context.md:5–6`)
- Feature-file naming + triple-tag convention: epics-mobile-app.md §DoD #2–#4

## Pre-Mortem Risk Analysis

Imagine 15.1 shipped and broke `main`. Failure modes + mitigations:

- **A — `pnpm install` churns the lockfile / hoists differently and breaks the web build.** Converting a single-package workspace to multi-package can re-hoist deps. _Mitigation:_ Task 1.3/1.4 verify a minimal lockfile diff and that `--frozen-lockfile` stays consistent; Task 3 re-runs the full web gate (`build`/`test`/`lint`). If hoisting changes break Next.js, pin `node-linker` / `shamefully-hoist` in `.npmrc` only as a documented fallback.
- **B — Empty globs error on some pnpm version.** _Mitigation:_ verified pnpm tolerates zero-match globs; if the installed version errors, commit a minimal `packages/.gitkeep` is NOT enough — instead create `packages/types/package.json` stub early (pull forward a slice of 15.2). Document the deviation if forced.
- **C — `@shared/*` alias breaks editor/tsc because target dir is missing.** _Mitigation:_ TS only errors when code actually imports the alias; no web code does yet (Task 2.2 confirms `tsc --noEmit` stays green).
- **D — CI uses `--frozen-lockfile` and fails because the committed lockfile wasn't regenerated.** _Mitigation:_ Task 1.4 runs the exact CI command locally before commit.

## Decisions and Rationale (ADRs)

- **ADR-15.1-A — Declare workspace globs before the directories exist.** _Decision:_ add `mobile` and `packages/*` to `pnpm-workspace.yaml` in 15.1 even though those dirs arrive in 15.2/15.3. _Alternatives:_ bundle workspace config into each downstream story. _Rationale:_ pnpm tolerates empty globs; landing plumbing first lets downstream packages be independent PRs with no flag-day. _Consequences:_ `pnpm install` is green at every commit between 15.1 and 15.3.
- **ADR-15.1-B — No `baseUrl` added.** _Decision:_ keep relative path arrays under `moduleResolution: "bundler"`. _Rationale:_ matches the working `@/*` pattern; adding `baseUrl` changes resolution for the whole web app. _Consequences:_ mobile tsconfig (15.3) must follow the same no-`baseUrl` pattern.

## Dev Agent Guardrails

- **Do NOT touch any web application source** (`app/`, `src/`) — this story is workspace config only.
- **Do NOT delete or reorder** the `ignoredBuiltDependencies` / `onlyBuiltDependencies` blocks in `pnpm-workspace.yaml`.
- **Do NOT add a `baseUrl`** to `tsconfig.json`.
- **Do NOT create `mobile/` or `packages/` contents** — those are Stories 15.3 and 15.2.
- **Do NOT add new runtime dependencies.** This is config-only.
- **Do NOT commit acceptance scenarios as `@wip`/`@skip`.** Every scenario must run.
- **Do NOT mock the `pnpm install` exit-code scenario** — run the real command.

## Previous Story Intelligence

This is the first story of Epic 15 and the first mobile-track story overall — there is no prior mobile story to learn from. The most recent web work (Epic 14, frontend-design migration) established the canonical `:root` tokens in `app/globals.css` that Story 15.2 will extract into `packages/design-tokens/`. Story 15.1 itself touches none of that.

## Git Intelligence Summary

Recent commits on `django-main`:
- `964d392 sprint status updated`
- `2caa167 pushing epic 14 and mobile app initial plan` — added the mobile epics doc this story implements.
- `3834df3 / 714c255` — AI/test-infra, unrelated.

No recent commit touches `pnpm-workspace.yaml` or `tsconfig.json`, so no merge-conflict risk on the files this story edits.

## Latest Tech Information

- **pnpm** — current stable supports `packages:` globs in `pnpm-workspace.yaml`; zero-match globs are non-fatal. `--frozen-lockfile` is the canonical CI install flag.
- **TypeScript** — `moduleResolution: "bundler"` (TS 5.x) resolves `paths` arrays relative to the tsconfig dir without a `baseUrl`. This is the modern recommended setup for bundler-driven projects (Next.js, Expo/Metro).

## Project Context Reference

- BMAD gate: `_bmad-output/project-context.md` §Story Definition of Done
- Trello: server `trello-axovia`, board `SvVRLeS5`
- Tagging: triple-tag rule (`@FR-*` + `@story-*` + `@E-*-S-*`) — epics-mobile-app.md §DoD
- File-header standard: `~/.claude/CLAUDE.md` §File Header Standard (note: YAML/JSON files do NOT get inline headers)

## Definition of Done

> Full gate definition: `_bmad-output/project-context.md` → _Story Definition of Done_; mobile-specific items in `epics-mobile-app.md` §DoD.

- [ ] All tasks/subtasks `[x]`; every AC satisfied; no `any` in production code
- [ ] `make lint` passes — zero ESLint errors
- [ ] `make build` passes — strict TypeScript, web workspace unaffected
- [ ] `make test` passes — all tests green, zero regressions; coverage thresholds met
- [ ] `pnpm install --frozen-lockfile` exits 0
- [ ] Every AC has a test at the correct level (filesystem/exit-code BDD scenarios for these infra ACs)
- [ ] `make test-ac STORY=15.1` passes green
- [ ] Acceptance scenarios in `test/acceptance/features/E-015-mobile-foundation.feature`, each tagged `@FR-MOBILE-FOUNDATION-0X` `@story-15-1` `@E-015-S-<N>`
- [ ] RTM updated
- [ ] Story `Status` → `review`; `sprint-status.yaml` → `review`
- [ ] `File List` updated
- [ ] Trello card moved to Done (board `SvVRLeS5`, trello-axovia)

## Story Completion Status

- Ultimate context engine analysis completed — comprehensive developer guide created.
- Foundation story for the entire mobile track (Epics 15–29); unblocks 15.2 (packages) and 15.3 (mobile workspace).
- Config-only; zero web application logic changes.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
