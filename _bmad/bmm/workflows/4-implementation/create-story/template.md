# Story {{epic_num}}.{{story_num}}: {{story_title}}

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a {{role}},
I want {{action}},
so that {{benefit}}.

## Acceptance Criteria

1. [Add acceptance criteria from epics/PRD]

## Tasks / Subtasks

- [ ] Task 1 (AC: #)
  - [ ] Subtask 1.1
- [ ] Task 2 (AC: #)
  - [ ] Subtask 2.1

## Dev Notes

- Relevant architecture patterns and constraints
- Source tree components to touch
- Testing standards summary

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
- Detected conflicts or variances (with rationale)

### References

- Cite all technical details with source paths and sections, e.g. [Source: docs/<file>.md#Section]

## Definition of Done

> Full gate definition: `_bmad-output/project-context.md` → _Story Definition of Done_

- [ ] All tasks/subtasks `[x]`; every AC satisfied; no `any` in production code
- [ ] `make lint` passes — zero ESLint errors
- [ ] `make build` passes — strict TypeScript
- [ ] `make test` passes — all tests green, zero regressions; coverage ≥96% branches, ≥98% functions, ≥99% lines/statements
- [ ] Unit tests added/updated for all new/changed logic
- [ ] Every AC has a test at the correct level (service-level Jest for logic ACs; full E2E Playwright for UI ACs — no mocked service calls for UI ACs)
- [ ] `make test-ac STORY=<epic>.<story>` passes green
- [ ] Acceptance scenarios in `test/acceptance/features/E-<epic_padded>-*.feature` — genuine Playwright E2E journeys, each tagged `@FR-<name>` `@story-<epic>-<story>` `@E-<epic_padded>-S-<sequential>`
- [ ] RTM updated (`_bmad-output/test-artifacts/requirements-traceability-matrix.md`)
- [ ] Story `Status` → `review`; `sprint-status.yaml` → `review`
- [ ] `File List` updated with every new/modified/deleted file
- [ ] Trello card moved to Done (trello-axovia)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
