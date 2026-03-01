# Story {{epic_num}}.{{story_num}}: {{story_title}}

Status: ready-for-dev
Blocked: false
Blocked-Reason:

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As a {{role}},
I want {{action}},
so that {{benefit}}.

## Acceptance Criteria

<!-- Each criterion MUST reference the FR-* requirement(s) it validates from the PRD -->

1. [Criterion description] `FR-___`
2. [Criterion description] `FR-___`
3. [Criterion description] `FR-___`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-___ | AC #1 | @FR-___ @story-{{epic_num}}-{{story_num}} |
| FR-___ | AC #2 | @FR-___ @story-{{epic_num}}-{{story_num}} |

## Definition of Done

- [ ] All acceptance criteria are met and verified
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing
- [ ] Acceptance test scenarios created with dual tags (@FR-* and @story-{{epic_num}}-{{story_num}})
- [ ] user_flows.feature updated (if story affects user flows)
- [ ] No regressions -- existing tests still pass
- [ ] Dev notes and references are complete
- [ ] Story-specific documentation updated (if applicable)
- [ ] Trello card moved to Verified
- [ ] Feature card checklist item marked complete

## Tasks / Subtasks

- [ ] Task 1 (AC: #, FR: FR-___)
  - [ ] Subtask 1.1
- [ ] Task 2 (AC: #, FR: FR-___)
  - [ ] Subtask 2.1

## Dev Notes

- Relevant architecture patterns and constraints
- Source tree components to touch
- Testing standards summary

### Test Requirements

- Acceptance test feature files: `test/acceptance/features/`
- Every scenario tagged: `@FR-<num> @story-{{epic_num}}-{{story_num}}`
- If this story affects user flows, update `test/acceptance/features/user_flows.feature`

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
- Detected conflicts or variances (with rationale)

### References

- [Source: _bmad-output/planning-artifacts/PRD.md#FR-___]

## Dev Agent Record

### Agent Model Used
{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
