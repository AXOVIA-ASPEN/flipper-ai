# Story 15.5: Top-Level Mobile Makefile Targets

Status: blocked
Blocked: true
Blocked-Reason: HUMAN REVIEW GATE — Stephen must review and approve the mobile architecture overview (docs/architecture/mobile-architecture-overview.html) before ANY Epic 15+ mobile development starts. Do not begin implementation while this gate is in place. To lift: after approval, set Blocked: false, clear this reason, set Status: ready-for-dev (all five Epic 15 stories carry this same gate).
Trello-Card-ID: 6a16b89a15efdbcddd908143

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a **developer**,
I want top-level `make` targets for every common mobile development workflow,
so that mobile development follows the same operator UX as the web app — one memorable command per task, all discoverable via `make help`.

## Problem Statement

The web app exposes a clean Makefile vocabulary (`make dev`, `make build`, `make test`, `make lint`, `make test-ac`, …). The mobile workspace currently has none — developers would have to remember raw `pnpm --filter mobile …` / `eas …` / `maestro …` invocations. This story adds the mobile target vocabulary so the operator experience is symmetric, and surfaces every target in a dedicated "Mobile" section of `make help`.

The current `Makefile` `help` target is a hand-maintained `@echo` block (verified) — there is no auto-generated help. So the mobile targets must be added to both the `.PHONY` list and the `help` echo block explicitly, in a clearly delineated "Mobile" section.

## Solution

Add nine top-level mobile targets that delegate to the mobile workspace tooling established in Stories 15.3/15.4 and to EAS (EAS Build/Submit/Update are wired in Epic 16; this story defines the targets and makes the local-capable ones work, with the EAS-dependent ones invoking the correct `eas` commands so they're ready the moment Epic 16 provisions credentials):

| Target | Delegates to |
|---|---|
| `make mobile-dev` | `pnpm --filter mobile dev` (expo start / Metro) |
| `make mobile-test` | `pnpm --filter mobile test` (jest-expo) |
| `make mobile-test-e2e` | `maestro test mobile/.maestro/` |
| `make mobile-typecheck` | `pnpm --filter mobile typecheck` (`tsc --noEmit`) |
| `make mobile-build-ios` | `eas build --platform ios` |
| `make mobile-build-android` | `eas build --platform android` |
| `make mobile-submit-ios` | `eas submit --platform ios` |
| `make mobile-submit-android` | `eas submit --platform android` |
| `make mobile-rollback` | `eas update:rollback` (or `eas channel:rollout`/`eas update --branch … --rollback` per the EAS Update rollback flow) |

Bar: each target exists and is invocable; the locally-runnable ones (`mobile-dev`, `mobile-test`, `mobile-typecheck`) actually work; the EAS ones invoke the correct command (provable via a dry-run / `--help` / arg-echo without real credentials); all nine appear under a "Mobile" section in `make help`.

## Acceptance Criteria

1. **All nine mobile targets exist and work** — Given the existing project `Makefile`, when mobile targets are added, then the following targets exist and invoke the correct underlying command: `make mobile-dev`, `make mobile-test`, `make mobile-test-e2e`, `make mobile-typecheck`, `make mobile-build-ios`, `make mobile-build-android`, `make mobile-submit-ios`, `make mobile-submit-android`, `make mobile-rollback`. The locally-runnable targets (`mobile-typecheck`, `mobile-test`) exit 0 against the clean codebase; the EAS-dependent targets resolve to the correct `eas …` invocation (verified via dry-run / argument inspection, since live builds require Epic 16 credentials). `FR-MOBILE-FOUNDATION-10`

2. **Mobile targets appear in `make help`** — Given the developer runs `make help`, when help output is rendered, then all nine mobile targets appear in a dedicated "Mobile" section with one-line descriptions. `FR-MOBILE-FOUNDATION-10`

## Requirement Traceability

| FR | Acceptance Criteria | Test Tag |
|----|---------------------|----------|
| FR-MOBILE-FOUNDATION-10 | AC #1 | `@FR-MOBILE-FOUNDATION-10` `@story-15-5` `@E-015-S-15` |
| FR-MOBILE-FOUNDATION-10 | AC #2 | `@FR-MOBILE-FOUNDATION-10` `@story-15-5` `@E-015-S-16` |

## Tasks / Subtasks

- [ ] **Task 1: Add the nine mobile targets** (AC #1)
  - [ ] 1.1 In the root `Makefile`, add all nine targets, each delegating per the table in Solution. Use the project's existing recipe style (tab-indented, `@`-prefixed where appropriate).
  - [ ] 1.2 `mobile-dev` → `pnpm --filter mobile dev`. `mobile-test` → `pnpm --filter mobile test`. `mobile-typecheck` → `pnpm --filter mobile typecheck`.
  - [ ] 1.3 `mobile-test-e2e` → `maestro test mobile/.maestro/` (the smoke flow added in 15.3; gracefully message if `maestro` isn't installed).
  - [ ] 1.4 `mobile-build-ios`/`mobile-build-android` → `eas build --platform ios|android` (allow a `PROFILE=` override defaulting to `preview`). `mobile-submit-ios`/`mobile-submit-android` → `eas submit --platform ios|android`.
  - [ ] 1.5 `mobile-rollback` → the canonical EAS Update rollback command (confirm exact syntax from current EAS docs — likely `eas update:rollback` or `eas channel:rollout`/branch rollback). Document the chosen command.
  - [ ] 1.6 Add all nine to the `.PHONY` declaration at the top of the Makefile.

- [ ] **Task 2: Add the "Mobile" help section** (AC #2)
  - [ ] 2.1 In the `help:` target, add a dedicated `@echo` block titled "Mobile:" listing all nine targets with concise one-line descriptions, placed after the existing "Testing:" / "Database:" / "Setup:" sections.
  - [ ] 2.2 Keep descriptions consistent in tone/format with the existing help lines.

- [ ] **Task 3: Acceptance scenarios** (AC #1, #2)
  - [ ] 3.1 In `test/acceptance/features/E-015-mobile-foundation.feature`:
    - `@E-015-S-15 @story-15-5 @FR-MOBILE-FOUNDATION-10` — assert each of the nine targets exists (e.g. `make -n <target>` / `make -p` lists it; a dry-run resolves to the expected command). Verify `make mobile-typecheck` actually exits 0.
    - `@E-015-S-16 @story-15-5 @FR-MOBILE-FOUNDATION-10` — run `make help`; assert the output contains a "Mobile" section and every one of the nine target names.
  - [ ] 3.2 Steps in `E-015-mobile-foundation.steps.ts` — command/exit-code + output-grep assertions (correct level for Makefile-vocabulary ACs). Use `make -n` (dry-run) for the EAS targets so no real build is triggered.

- [ ] **Task 4: RTM + administrivia**
  - [ ] 4.1 RTM row for FR-MOBILE-FOUNDATION-10 → Story 15.5 → `@E-015-S-15, @E-015-S-16`.
  - [ ] 4.2 `make test-ac STORY=15.5` green; full `make test-ac FEATURE=F015` green (all of Epic 15's stories — final epic gate); web `make build`/`make test` still green.
  - [ ] 4.3 `Status: review`; `sprint-status.yaml`: `15-5-top-level-mobile-makefile-targets: review`.
  - [ ] 4.4 File List; Trello → Done (`SvVRLeS5`). As the last story in Epic 15, verify the Epic-15 Feature card checklist is complete and the epic can move toward `done`.

## Dev Notes

### Current ground truth (verified)

- The `Makefile` `help` target is a hand-maintained `@echo` block (NOT auto-generated). Sections today: usage, Testing, Database, Setup. Mobile targets + a "Mobile:" echo section must be added by hand.
- `.PHONY` is explicitly maintained at the top of the Makefile — add the nine targets there.
- Mobile workspace scripts (`dev`, `test`, `typecheck`) are established in Stories 15.3/15.4; these targets delegate to them via `pnpm --filter mobile …`.
- EAS (`eas build`/`submit`/`update`) credentials + config (`eas.json`) are provisioned in **Epic 16** — so the EAS targets are defined here but their live execution is an Epic-16 concern. Verify command *correctness* via dry-run, not live builds. This is the documented seam (ADR-15.5-A).
- Maestro flow lives at `mobile/.maestro/` (Story 15.3).

### Why define EAS targets now if Epic 16 wires EAS?

FR-MOBILE-FOUNDATION-10 enumerates the full target set, and operator-vocabulary completeness is the deliverable. Defining them now means Epic 16 only has to provision credentials/`eas.json` — not also touch the Makefile. The targets invoke the correct `eas` commands; AC #1 proves command resolution (dry-run) rather than a successful cloud build.

### Project Structure Notes

Modified: root `Makefile` only (targets + `.PHONY` + help echo). Plus E-015 feature/steps additions, RTM, sprint-status. No mobile source changes. No new dependencies (assumes `eas-cli`/`maestro` are dev prerequisites documented in Epic 16 / README — message gracefully if absent).

### Files to Read Before Starting

1. `Makefile` — full file; study the recipe style, `.PHONY`, and the `help:` echo block structure.
2. Story 15.3 + 15.4 files — confirm `mobile` workspace scripts (`dev`/`test`/`typecheck`) and the Maestro flow path exist.
3. epics-mobile-app.md §Story 15.5 (target list) + Epic 16 (EAS provisioning seam).
4. EAS CLI docs (current `build`/`submit`/`update`/rollback syntax).

### References

- Epic + story spec: `epics-mobile-app.md` §Story 15.5; FR-MOBILE-FOUNDATION-10
- EAS Build/Submit/Update: https://docs.expo.dev/eas/
- Maestro: https://maestro.mobile.dev/
- Trello `SvVRLeS5` (trello-axovia)

## Pre-Mortem Risk Analysis

- **A — EAS targets fail loudly in CI/local because no credentials/`eas.json`.** _Mitigation:_ AC #1 verifies via `make -n` dry-run, not live execution; document that live builds depend on Epic 16. Targets should fail with a clear "run Epic 16 setup first" message if invoked live without config.
- **B — `make help` drifts from actual targets.** Hand-maintained help can rot. _Mitigation:_ AC #2 scenario greps `make help` for all nine names — fails if a target is added without a help line.
- **C — Tab vs spaces in Makefile recipes** (classic Make footgun). _Mitigation:_ match the existing file's tab indentation exactly; lint with `make -n`.
- **D — `make mobile-rollback` wrong EAS syntax.** EAS Update rollback has evolved. _Mitigation:_ Task 1.5 confirms current syntax from live docs and documents the chosen command.

## Decisions and Rationale (ADRs)

- **ADR-15.5-A — Define EAS targets in 15.5; provision EAS in Epic 16.** _Decision:_ the Makefile vocabulary is complete in 15.5 even though `eas.json`/credentials land in Epic 16. _Rationale:_ FR-MOBILE-FOUNDATION-10 requires the full target set; separating vocabulary from credentials keeps each story tight. _Consequences:_ EAS targets are proven by dry-run in 15.5 and by real builds in Epic 16.
- **ADR-15.5-B — Hand-maintained "Mobile" help section.** _Decision:_ extend the existing `@echo` help block rather than introduce auto-generated help. _Rationale:_ consistency with the current Makefile; auto-help is a larger, out-of-scope change. _Consequences:_ the AC #2 grep test guards against drift.

## Dev Agent Guardrails

- **Do NOT trigger real EAS cloud builds** in tests — use `make -n` / dry-run.
- **Do NOT use spaces** in Makefile recipe indentation — tabs only, matching the existing file.
- **Do NOT modify mobile source** — this is Makefile-only.
- **Do NOT add new runtime dependencies.** `eas-cli`/`maestro` are dev prerequisites (documented elsewhere).
- **Do NOT omit any of the nine targets from `.PHONY` or from `make help`.**
- **Do NOT commit acceptance scenarios as `@wip`/`@skip`.**
- **Do NOT mock the `make`/exit-code scenarios** — run real `make -n` / `make mobile-typecheck`.

## Previous Story Intelligence

Stories 15.3/15.4 created the `mobile` workspace `dev`/`test`/`typecheck` scripts these targets delegate to, and the Maestro flow at `mobile/.maestro/`. If `make mobile-typecheck` fails, the issue is likely in 15.3's tsconfig, not this story's target. This is the final Epic-15 story — Task 4.2 runs the full `make test-ac FEATURE=F015` epic gate.

## Git Intelligence Summary

`964d392 sprint status updated` and `2caa167 pushing epic 14 and mobile app initial plan` are the most recent commits; neither touches the `Makefile` mobile section (it doesn't exist yet). No conflict risk on the Makefile.

## Latest Tech Information

- **EAS CLI** — `eas build --platform ios|android --profile <profile>`; `eas submit --platform …`; EAS Update rollback via `eas update:rollback` / channel rollout (confirm current syntax). `eas.json` defines build profiles (provisioned in Epic 16).
- **GNU Make** — `make -n <target>` prints the recipe without executing — the safe way to assert an EAS target resolves to the correct command in tests.
- **Maestro** — `maestro test <dir-or-flow>` runs all flows in a directory.

## Project Context Reference

- BMAD gate + Trello (`SvVRLeS5`, trello-axovia): `_bmad-output/project-context.md`
- Triple-tag rule: epics-mobile-app.md §DoD
- File-header standard: `~/.claude/CLAUDE.md` (Makefile uses the shell/`#` comment header form if a header is added; existing Makefile has none — do not retro-fit unless the project requires it)

## Definition of Done

> Full gate: `_bmad-output/project-context.md` + `epics-mobile-app.md` §DoD.

- [ ] All tasks `[x]`; every AC satisfied
- [ ] All nine mobile targets exist, are in `.PHONY`, and resolve to the correct command; `make mobile-typecheck` / `make mobile-test` exit 0
- [ ] `make help` shows a "Mobile" section listing all nine targets
- [ ] Web `make build`/`make test`/`make lint` still green (zero regression)
- [ ] Every AC tested at the correct level (command/dry-run + help-grep scenarios)
- [ ] `make test-ac STORY=15.5` passes green; `make test-ac FEATURE=F015` passes (full Epic 15)
- [ ] Scenarios in `E-015-mobile-foundation.feature` triple-tagged
- [ ] RTM updated; `Status` → `review`; `sprint-status.yaml` → `review`; File List updated
- [ ] Trello card → Done (`SvVRLeS5`, trello-axovia); Epic-15 Feature card checklist complete

## Story Completion Status

- Comprehensive developer guide created.
- Completes Epic 15 (Mobile Foundation): the operator vocabulary is symmetric with web. Unblocks Epic 16 (CI/CD), which provisions EAS credentials behind these targets.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
