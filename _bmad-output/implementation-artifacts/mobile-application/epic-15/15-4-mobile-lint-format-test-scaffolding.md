# Story 15.4: Mobile Lint, Format & Test Scaffolding

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID: 6a16b8959f65834dc52b811f

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **developer**,
I want ESLint, Prettier, and Jest configured in the mobile workspace consistent with the project root,
so that mobile code meets the same quality bar as web code and runs through the same gates — `make lint` lints both workspaces, Prettier formats both, and `pnpm --filter mobile test` runs jest-expo with Testing Library.

## Problem Statement

Story 15.3 bootstrapped the Expo app but left it without first-class quality tooling. The web workspace already has:
- `eslint.config.mjs` — ESLint v9 flat config (`eslint-config-next/core-web-vitals` + `/typescript`), with test/config files relaxing `@typescript-eslint/no-explicit-any`.
- Prettier (`pnpm format` / `pnpm format:check`).
- Jest (`jest.config.js`, `testEnvironment: 'node'`, `maxWorkers: 1`).

The mobile workspace needs equivalents that **inherit** these where possible and add the React Native / Expo specifics. Two gaps in the epics spec must be reconciled with reality:
1. `make lint` today runs `eslint .` from the root, which already walks `mobile/**` — but without RN-aware rules it will mis-lint native code. The mobile ESLint config must add `eslint-plugin-react-native` + the Expo/RN config and `make lint` must surface mobile results.
2. `make check-headers` **does not exist** in the Makefile. The epics AC references it. This story must either add a `check-headers` make target (lightweight header validator) or wire header checking into mobile lint. **Decision (ADR-15.4-A):** add a minimal `make check-headers` target backed by a small script, scoped to include `mobile/`, since the global standard expects `make check-headers` and no project validator exists yet.

## Solution

1. **`mobile/eslint.config.js`** — flat config extending the root config plus `eslint-plugin-react-native` and `@react-native/eslint-config` (flat-compatible). Ensure `make lint` lints BOTH workspaces and exits 0 on clean code.
2. **Prettier** — mobile inherits the root Prettier config; `pnpm format` / `pnpm format:check` cover `mobile/**`.
3. **`mobile/jest.config.js`** — `jest-expo` preset + `@testing-library/react-native`; `@shared/*` moduleNameMapper; a sample unit test on a pure util passes via `pnpm --filter mobile test`.
4. **`make check-headers`** — new target validating the canonical file header on `.ts`/`.tsx` (+ other languages per the standard), with `mobile/` in scope; passes on the headers added in 15.3.

## Acceptance Criteria

1. **`make lint` lints both workspaces** — Given the project root ESLint flat config (`eslint.config.mjs`), when `mobile/eslint.config.js` extends the root config plus `eslint-plugin-react-native` and `@react-native/eslint-config`, then `make lint` lints BOTH the web and mobile workspaces in a single command and exits 0 on clean code. `FR-MOBILE-FOUNDATION-08`

2. **Prettier covers mobile** — Given the existing Prettier configuration, when Prettier runs against `mobile/**`, then formatting matches the rest of the codebase, and `pnpm format:check` passes for mobile sources. `FR-MOBILE-FOUNDATION-09`

3. **jest-expo runs and a sample test passes** — Given Jest setup in the root workspace, when `mobile/jest.config.js` is added using the `jest-expo` preset with `@testing-library/react-native`, then `pnpm --filter mobile test` runs and a sample unit test (e.g. testing the pure `mobile/src/lib/greeting.ts` util from Story 15.3) passes. `@shared/*` resolves in the mobile Jest config. `FR-MOBILE-FOUNDATION-08`

4. **`make check-headers` passes with mobile in scope** — Given the project's file-header standard, when `make check-headers` is run with mobile included in scope, then all mobile `.ts`/`.tsx` files pass the header check (i.e. each begins with the canonical JSDoc header: `@file`, `@author Stephen Boyett`, `@description`, `@Copyright © 2026 Axovia LLC. All Rights Reserved.`). `FR-MOBILE-FOUNDATION-09`

## Requirement Traceability

| FR | Acceptance Criteria | Test Tag |
|----|---------------------|----------|
| FR-MOBILE-FOUNDATION-08 | AC #1, #3 | `@FR-MOBILE-FOUNDATION-08` `@story-15-4` `@E-015-S-11` `@E-015-S-13` |
| FR-MOBILE-FOUNDATION-09 | AC #2, #4 | `@FR-MOBILE-FOUNDATION-09` `@story-15-4` `@E-015-S-12` `@E-015-S-14` |

## Tasks / Subtasks

- [ ] **Task 1: Mobile ESLint config** (AC #1)
  - [ ] 1.1 Create `mobile/eslint.config.js` (flat config). Import and spread the root `eslint.config.mjs` (or its shared base) so web rules apply, then add `eslint-plugin-react-native` rules and `@react-native/eslint-config` (use FlatCompat if the RN config is still eslintrc-format).
  - [ ] 1.2 Install `eslint-plugin-react-native` and `@react-native/eslint-config` in the `mobile` workspace.
  - [ ] 1.3 Ensure `make lint` (currently `eslint .` from root via `pnpm lint`) picks up the mobile config. ESLint v9 flat config uses the nearest `eslint.config.*`; confirm the root run descends into `mobile/` and applies the mobile config (or update the root `lint` script / Makefile to run both `pnpm lint` and `pnpm --filter mobile lint`). Document which mechanism is used.
  - [ ] 1.4 Add a `lint` script to `mobile/package.json`. Confirm `make lint` exits 0 on the clean 15.3 codebase.

- [ ] **Task 2: Prettier for mobile** (AC #2)
  - [ ] 2.1 Confirm the root Prettier config (`.prettierrc*` / `prettier` key) applies to `mobile/**` (it should by default unless `.prettierignore` excludes it). Adjust `.prettierignore` if needed so mobile is covered, excluding generated/`.expo`/`ios`/`android` build dirs.
  - [ ] 2.2 Run `pnpm format` then `pnpm format:check`; confirm mobile sources are clean.

- [ ] **Task 3: jest-expo harness** (AC #3)
  - [ ] 3.1 Install `jest-expo`, `@testing-library/react-native`, `jest`, `react-test-renderer` in the `mobile` workspace (versions matching the Expo SDK).
  - [ ] 3.2 Create `mobile/jest.config.js` — `preset: 'jest-expo'`, `setupFilesAfterEnv` for Testing Library, `transformIgnorePatterns` per jest-expo guidance, and `moduleNameMapper` for `@/*` → `mobile/src/*` and `@shared/*` → `packages/*/src/*` (mirror the web Jest mapping pattern from Story 15.2).
  - [ ] 3.3 Add `test` script to `mobile/package.json`. Write `mobile/src/__tests__/greeting.test.ts` exercising the pure util from 15.3; `pnpm --filter mobile test` passes. Keep/promote the NativeWind token render test from 15.3 here.
  - [ ] 3.4 Set coverage expectations per mobile DoD (≥80% statements / 70% branches on new modules) — configure thresholds in `mobile/jest.config.js`.

- [ ] **Task 4: `make check-headers` target** (AC #4)
  - [ ] 4.1 Add a `check-headers` target to the root `Makefile`. Back it with a small validator script (`scripts/check-headers.js` or `.py`) that scans `.ts`/`.tsx` (and other languages per the standard) for the required header fields (`@file`/`file`, `@author Stephen Boyett`, `@description`, the `Copyright © <YEAR> <COMPANY>` line with the current year), supporting `FILE=path` for single-file checks per the global standard.
  - [ ] 4.2 Scope it to include `mobile/` (and web `src/`/`app/` if cheap), excluding generated dirs (`src/generated`, `.expo`, `mobile/ios`, `mobile/android`, `node_modules`).
  - [ ] 4.3 Add `check-headers` to the Makefile `help` output and `.PHONY`.
  - [ ] 4.4 Run `make check-headers`; confirm all mobile `.ts`/`.tsx` from 15.3 pass.

- [ ] **Task 5: Acceptance scenarios** (AC #1–#4)
  - [ ] 5.1 In `test/acceptance/features/E-015-mobile-foundation.feature`:
    - `@E-015-S-11 @story-15-4 @FR-MOBILE-FOUNDATION-08` — run `make lint`; assert exit 0 and that mobile files were included (e.g. config presence + a deliberate RN lint rule fires on a temp fixture, or assert `mobile/eslint.config.js` extends root + RN plugin).
    - `@E-015-S-12 @story-15-4 @FR-MOBILE-FOUNDATION-09` — run `pnpm format:check`; assert exit 0 covering mobile.
    - `@E-015-S-13 @story-15-4 @FR-MOBILE-FOUNDATION-08` — run `pnpm --filter mobile test`; assert exit 0 and the sample test passed.
    - `@E-015-S-14 @story-15-4 @FR-MOBILE-FOUNDATION-09` — run `make check-headers`; assert exit 0 with mobile in scope.
  - [ ] 5.2 Steps in `E-015-mobile-foundation.steps.ts` — all exit-code / command scenarios (correct level for tooling ACs). Tag the install-dependent ones `@serial @slow` and lift timeouts.

- [ ] **Task 6: RTM + administrivia**
  - [ ] 6.1 RTM rows for FR-MOBILE-FOUNDATION-08 (→ `@E-015-S-11, @E-015-S-13`) and -09 (→ `@E-015-S-12, @E-015-S-14`).
  - [ ] 6.2 `make test-ac STORY=15.4` green; web `make test`/`make build` still green.
  - [ ] 6.3 `Status: review`; `sprint-status.yaml`: `15-4-mobile-lint-format-test-scaffolding: review`.
  - [ ] 6.4 File List; Trello → Done (`SvVRLeS5`).

## Dev Notes

### Current ground truth (verified)

- Root ESLint: `eslint.config.mjs` (flat). Spreads `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`. `globalIgnores` includes `src/generated/**`, `functions/**`, `docs/archive/**`, etc. Test/config file globs relax `@typescript-eslint/no-explicit-any`.
- Root `lint` = `eslint .`; `make lint` calls `pnpm lint`. ESLint v9 flat config: a nested `mobile/eslint.config.js` is NOT automatically merged by a root `eslint .` run — flat config uses the single nearest config file. **Verify the mechanism:** either (a) the root config adds RN-specific overrides scoped to `mobile/**`, or (b) `make lint` runs both `pnpm lint` and `pnpm --filter mobile lint`. Pick one and document it (ADR-15.4-B).
- Root Jest: `jest.config.js`, `testEnvironment: 'node'`, `maxWorkers: 1`, coverage from `src/lib`/`app/api`/`src/scrapers` only. Mobile needs its OWN `jest-expo` config (jsdom-ish RN environment) — do not try to fold RN tests into the node-env root Jest.
- **`make check-headers` does NOT exist.** This story adds it. The global standard (`~/.claude/CLAUDE.md`) expects `make check-headers` / `make check-headers FILE=...`.
- Story 15.3 created `mobile/src/lib/greeting.ts` (pure util) as the sample-test anchor.

### ESLint flat-config merge caveat

ESLint v9 does not "extend" across directories the way eslintrc did. Running `eslint .` from root applies the root `eslint.config.mjs` to everything (including `mobile/**`) and ignores nested `eslint.config.js` files unless you use the project-service / multiple-config patterns. The clean, predictable approach in a pnpm monorepo: give mobile its own config and have the orchestrator (`make lint`) invoke both. Confirm RN rules actually fire on mobile code.

### Project Structure Notes

New: `mobile/eslint.config.js`, `mobile/jest.config.js`, `mobile/jest.setup.ts`, `mobile/src/__tests__/greeting.test.ts`, `scripts/check-headers.{js,py}`. Modified: root `Makefile` (+`check-headers`, possibly `lint`), `mobile/package.json` (lint/test scripts + devDeps), `.prettierignore` (maybe), `pnpm-lock.yaml`, RTM, sprint-status. Plus E-015 feature/steps.

### Files to Read Before Starting

1. `eslint.config.mjs` — the root config to extend.
2. `jest.config.js` — root Jest (understand why mobile needs a separate jest-expo config).
3. `Makefile` — `lint`, `test`, `help` targets; where to add `check-headers`.
4. `~/.claude/CLAUDE.md` §File Header Standard — exact required fields + the `make check-headers` expectation.
5. Story 15.3 file — confirms `mobile/src/lib/greeting.ts` and the NativeWind render test.
6. jest-expo + Testing Library RN docs (latest).

### References

- Epic + story spec: `epics-mobile-app.md` §Story 15.4; FRs -08, -09
- jest-expo: https://docs.expo.dev/develop/unit-testing/
- ESLint flat config: https://eslint.org/docs/latest/use/configure/configuration-files
- Trello `SvVRLeS5` (trello-axovia)

## Pre-Mortem Risk Analysis

- **A — `make lint` silently doesn't apply RN rules to mobile** (flat-config merge caveat). _Mitigation:_ ADR-15.4-B; AC #1 scenario proves RN rules fire (temp fixture or config assertion).
- **B — jest-expo `transformIgnorePatterns` misconfig** → "unexpected token" on RN node_modules. _Mitigation:_ copy jest-expo's documented `transformIgnorePatterns`; smoke the sample test early.
- **C — `make check-headers` false-negatives** on generated Expo files. _Mitigation:_ exclude `.expo`, `ios`, `android`, `src/generated`; only enforce on authored sources (which 15.3 retro-fitted).
- **D — Prettier reformats generated/native dirs** causing churn. _Mitigation:_ `.prettierignore` excludes build/native dirs.
- **E — Root Jest accidentally picks up mobile RN tests** and fails (node env). _Mitigation:_ keep mobile tests under `mobile/` and ensure root `jest.config.js` `testPathIgnorePatterns`/roots exclude `mobile/`.

## Decisions and Rationale (ADRs)

- **ADR-15.4-A — Add a real `make check-headers` target.** _Decision:_ create the missing target + a small validator script. _Alternatives:_ fold header checks into ESLint via a plugin. _Rationale:_ the global standard explicitly expects `make check-headers` / `FILE=`; a dedicated script also covers non-TS languages uniformly. _Consequences:_ web sources may surface header gaps when scoped in — scope conservatively (mobile + cheap web dirs) to avoid a giant remediation in this story.
- **ADR-15.4-B — `make lint` orchestrates two ESLint runs.** _Decision:_ `make lint` runs root `pnpm lint` AND `pnpm --filter mobile lint`. _Alternatives:_ single root flat config with `mobile/**` overrides. _Rationale:_ predictable RN-rule application; avoids flat-config cross-dir merge ambiguity. _Consequences:_ two ESLint invocations; both must exit 0.
- **ADR-15.4-C — Separate `jest-expo` config, not folded into root Jest.** _Decision:_ `mobile/jest.config.js` is standalone. _Rationale:_ RN test env ≠ node env; `maxWorkers`/coverage scopes differ. _Consequences:_ `make test` (web) and `pnpm --filter mobile test` are distinct; a combined `make test-all`-style target can run both later.

## Dev Agent Guardrails

- **Do NOT fold mobile RN tests into the root node-env Jest.** Separate `jest-expo` config.
- **Do NOT let `make check-headers` enforce headers on generated/native dirs.**
- **Do NOT weaken the root ESLint config** to make mobile pass — add RN rules in the mobile config.
- **Do NOT use `any`** in production mobile code (test/config files may, per the relaxed glob).
- **Do NOT skip headers** on the new script/config files you create (`.js` config files use the shell/JS comment header form).
- **Do NOT commit acceptance scenarios as `@wip`/`@skip`.**
- **Do NOT mock the lint/test/format/check-headers exit-code scenarios** — run the real commands.

## Previous Story Intelligence

Story 15.2 added `@shared/*` to the web Jest `moduleNameMapper` — mirror that exact mapping in `mobile/jest.config.js`. Story 15.3 created the sample util (`greeting.ts`), the NativeWind render test, and retro-fitted file headers on all mobile sources — those headers must pass the new `make check-headers`. If headers fail, the gap is in 15.3's output, not this story's validator.

## Git Intelligence Summary

`3834df3` and `714c255` are recent test-infra commits (message-generator assertions, AI never-mock). They confirm the project's test discipline (real AI, no mocks) but don't touch lint/jest/Makefile config this story edits. No conflict risk on `eslint.config.mjs`, `jest.config.js`, or `Makefile`.

## Latest Tech Information

- **jest-expo** — the canonical preset for Expo unit tests; ships the correct `transformIgnorePatterns` and RN env. Pair with `@testing-library/react-native`.
- **ESLint v9 flat config** — no cross-directory `extends` inheritance; nested configs aren't auto-merged by a parent `eslint .` run. Orchestrate explicitly.
- **Prettier** — single root config applies repo-wide unless `.prettierignore` excludes paths.

## Project Context Reference

- BMAD gate + Trello (`SvVRLeS5`, trello-axovia): `_bmad-output/project-context.md`
- Triple-tag rule: epics-mobile-app.md §DoD
- File-header standard + `make check-headers` expectation: `~/.claude/CLAUDE.md`

## Definition of Done

> Full gate: `_bmad-output/project-context.md` + `epics-mobile-app.md` §DoD.

- [ ] All tasks `[x]`; every AC satisfied; no `any` in production mobile code
- [ ] `make lint` lints BOTH workspaces and exits 0 (RN rules applied to mobile)
- [ ] `pnpm format:check` passes covering mobile
- [ ] `pnpm --filter mobile test` runs (jest-expo + Testing Library); sample test passes; `@shared/*` resolves
- [ ] `make check-headers` exists, includes mobile in scope, and passes
- [ ] Web `make build`/`make test` still green (zero regression)
- [ ] Every AC tested at the correct level (exit-code/command scenarios for these tooling ACs)
- [ ] `make test-ac STORY=15.4` passes green
- [ ] Scenarios in `E-015-mobile-foundation.feature` triple-tagged
- [ ] RTM updated; `Status` → `review`; `sprint-status.yaml` → `review`; File List updated
- [ ] Trello card → Done (`SvVRLeS5`, trello-axovia)

## Story Completion Status

- Comprehensive developer guide created.
- Brings the mobile workspace under the same lint/format/test/header gates as web; introduces the project-wide `make check-headers` target. Unblocks Story 15.5 (Makefile targets) and Epic 16 CI quality gates.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
