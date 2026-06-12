# Story 1.10: Versioning & Release Pipeline — Plan Integration & Acceptance Coverage

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID: 6a2b91e100a075c6858d9ea4

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As **Stephen (the founder / release manager)**,
I want the already-implemented versioning & release pipeline (semver + `VERSION.md` + `CHANGELOG.md` + tag-triggered GitHub Release workflow) formally integrated into the BMAD plan with PRD requirements, acceptance scenarios, and RTM traceability,
so that the release machinery is a tracked, regression-protected part of the product instead of orphaned shadow work that no test or requirement guards.

## Context

The design spec `docs/superpowers/specs/2026-04-11-versioning-release-pipeline-design.md` (Status: Approved) was **fully implemented on 2026-04-11 outside BMAD tracking**. A plan-integration audit on 2026-06-12 confirmed the findings below, after which the spec doc was **removed from the repo (2026-06-12)** — this story and the BMAD plan are now the canonical record; the spec remains recoverable via git history.

- ✅ Implemented: `VERSION.md` (currently `1.0.1` — the pipeline has been exercised at least once), `CHANGELOG.md` (Keep a Changelog format), `.github/workflows/release.yml` (matches the spec verbatim), `_bmad-output/project-context.md` § *Versioning & Release Pipeline*, `CLAUDE.md` § *Versioning & Releases*
- ❌ Missing: any story in the plan, any PRD FR, any acceptance scenario for `release.yml` (the CI workflow `ci.yml` has scenarios `@E-001-S-17..21`; the release workflow has **zero**), any RTM row

This story closes the traceability and verification gaps. It is **not** a re-implementation story — code changes are only expected if verification uncovers drift.

## Acceptance Criteria

1. **PRD requirement added** — `FR-INFRA-15` is added to the PRD (`_bmad-output/planning-artifacts/PRD.md`) under the infrastructure requirements: *"The system shall maintain a versioned release pipeline: Semantic Versioning recorded in `VERSION.md`, a Keep-a-Changelog `CHANGELOG.md` with an `[Unreleased]` section, and a tag-triggered GitHub Actions workflow that creates a GitHub Release whose body is the tagged version's changelog section."* `FR-INFRA-15`
2. **Version file integrity** — Acceptance scenario asserts `VERSION.md` exists, contains exactly one line, and that line matches strict semver (`MAJOR.MINOR.PATCH`). `FR-INFRA-15`
3. **Changelog integrity** — Acceptance scenarios assert `CHANGELOG.md` exists, declares the Keep-a-Changelog format, has `## [Unreleased]` as the first version heading, and contains a `## [X.Y.Z]` heading matching the current `VERSION.md` value (version/changelog consistency). `FR-INFRA-15`
4. **Release workflow contract** — Acceptance scenarios assert `.github/workflows/release.yml`: triggers on tags matching `v*.*.*`, declares `permissions: contents: write`, extracts the tagged version's section from `CHANGELOG.md`, and creates a GitHub Release via `softprops/action-gh-release@v2` named `Flipper.ai vX.Y.Z` with the extracted notes as body. `FR-INFRA-15`
5. **Docs are current** — `_bmad-output/project-context.md` and `CLAUDE.md` release sections are verified against the actual workflow behavior (5-step release process, semver bump rules); any drift found is corrected. `FR-INFRA-15`
6. **RTM updated** — `_bmad-output/test-artifacts/requirements-traceability-matrix.md` gains a row mapping FR-INFRA-15 → this story's ACs → the new scenario tags → `E-001-production-infrastructure.feature`. `FR-INFRA-15`

## Requirement Traceability

> **NOTE:** FR-INFRA-15 is a NEW functional requirement to be added to the PRD as part of this story (AC #1) — precedent: Story 13.7 / FR-SCORE-29. Highest existing infra requirement is FR-INFRA-14.

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-INFRA-15 | AC #1–#6 | @FR-INFRA-15 @story-1-10 |

## Tasks / Subtasks

- [ ] Add FR-INFRA-15 to PRD Requirements Inventory (AC #1)
- [ ] Write Gherkin scenarios in `test/acceptance/features/E-001-production-infrastructure.feature` covering ACs #2–#4, continuing the epic's sequential numbering from `@E-001-S-53` (current max is `@E-001-S-52`) (ACs #2, #3, #4)
- [ ] Tag every scenario with ALL THREE: `@FR-INFRA-15`, `@story-1-10`, `@E-001-S-<N>` (ACs #2–#4)
- [ ] Implement step definitions in `test/acceptance/step_definitions/` (source-inspection level — these ACs describe repository/workflow contracts, not UI) (ACs #2–#4)
- [ ] Cross-check `project-context.md` + `CLAUDE.md` release sections against `release.yml`; fix drift if found (AC #5)
- [ ] Update RTM (AC #6)
- [ ] Update `sprint-status.yaml`; move Trello card per workflow

## Definition of Done

- [ ] All ACs implemented and passing at the named test level
- [ ] All FR/AC dual-tag coverage in test files: `@FR-INFRA-15 @story-1-10` + `@E-001-S-<N>`
- [ ] `make lint` — zero ESLint errors
- [ ] `make build` — strict TypeScript passes
- [ ] `make test` — all unit tests green, zero regressions
- [ ] `make test-ac STORY=1.10` passes with zero failures, zero skipped scenarios
- [ ] `make test-ac FEATURE=F1` passes cleanly (no regressions in Epic 1)
- [ ] RTM updated to map FR-INFRA-15 → ACs → scenarios
- [ ] `sprint-status.yaml` updated to reflect story completion
- [ ] Trello card moved per status (trello-axovia, board SvVRLeS5)
- [ ] No `Blocked: true` remaining in story frontmatter

## File List

_Existing files under verification (no changes expected unless drift found):_
- `VERSION.md`
- `CHANGELOG.md`
- `.github/workflows/release.yml`
- `_bmad-output/project-context.md`
- `CLAUDE.md`

_Files to create/modify:_
- `_bmad-output/planning-artifacts/PRD.md` (add FR-INFRA-15)
- `test/acceptance/features/E-001-production-infrastructure.feature` (new scenarios)
- `test/acceptance/step_definitions/E-001-release-pipeline.steps.ts` (new)
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## References

- Design spec: `docs/superpowers/specs/2026-04-11-versioning-release-pipeline-design.md` (removed 2026-06-12 — BMAD plan is canonical; recoverable via git history)
- Plan-integration audit: party-mode session 2026-06-12
