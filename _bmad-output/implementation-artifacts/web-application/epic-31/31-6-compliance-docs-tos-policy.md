# Story 31.6: Compliance Documentation, Terms of Service & Acquisition Policy

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID: 6a2bb71af0509962290c2107

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As **Stephen (the founder)**,
I want Flipper.ai to publish a Terms of Service with an arbitration clause and class-action waiver, maintain a per-platform data-acquisition compliance policy/register, and add the `FR-LEGAL-*` requirements to the PRD,
so that the compliance posture established by Epic 31 is documented, enforceable, requirement-backed, and marketable as a "compliant by design" differentiator against scraping-reliant competitors.

## Context

The research recommends defensive/positioning mitigations: a Flipper.ai ToS with arbitration + class-action waiver (limits subscriber-side disputes), a documented per-platform acquisition policy, and an explicit record that the AI layer performs **inference on transient data, not training** (the 2026 AI-scraping suits target training corpora). It also notes a positioning opportunity: incumbent Swoopa markets itself as "ethical… without the risk of scraping" — a clean compliance story neutralizes that attack line and becomes a marketing asset.

This story is the documentation + requirements capstone of Epic 31: it adds the `FR-LEGAL-01..07` family to the PRD (so the prior stories are requirement-backed), authors/updates the ToS and the compliance policy/register, and records the per-platform acquisition posture produced by Stories 31.1–31.5.

## Acceptance Criteria

1. **FR-LEGAL family in PRD** — `FR-LEGAL-01` through `FR-LEGAL-07` are added to the PRD Requirements Inventory (text per the epics.md Requirements Inventory for Epic 31). Source-inspection scenario asserts all seven FRs are present in the PRD. `FR-LEGAL-07`
2. **Terms of Service published** — Flipper.ai's ToS (`app/terms/`) includes a binding arbitration clause and a class-action waiver for subscribers, and is linked from the appropriate surfaces. E2E/source-inspection scenario asserts the Terms page renders the arbitration + class-waiver language. `FR-LEGAL-07`
3. **Per-platform acquisition policy/register** — A compliance policy documents, per platform (Craigslist, Facebook, OfferUp, Mercari, eBay): acquisition method, logged-in vs logged-out, rate-limit posture, stop-on-notice owner, and data retained. Source-inspection scenario asserts the register covers all five platforms with the Epic 31 posture. `FR-LEGAL-07`
4. **AI = inference not training, recorded** — Documentation explicitly records that Flipper.ai's AI layer performs inference on transient listing data and does not build training datasets from platform content. Source-inspection scenario asserts the statement exists. `FR-LEGAL-07`
5. **Compliant-by-design positioning artifact** — A short positioning note captures the marketable compliance differentiators (official eBay API, user-session-only Facebook, no evasion, stop-on-notice, no photo/PII retention) for use in GTM. Source-inspection scenario asserts the artifact exists. `FR-LEGAL-07`
6. **RTM updated** — RTM gains rows mapping FR-LEGAL-07 → this story's ACs → scenario tags → epic feature file; the RTM reflects the full FR-LEGAL-01..07 coverage across Epic 31. `FR-LEGAL-07`

## Requirement Traceability

> **NOTE:** This story adds `FR-LEGAL-01..07` to the PRD (AC #1). The full family is defined in the epics.md Requirements Inventory for Epic 31. Stories 31.1–31.5 reference these FRs; this story makes them canonical in the PRD.

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-LEGAL-07 | AC #1, #2, #3, #4, #5, #6 | @FR-LEGAL-07 @story-31-6 |

## Tasks / Subtasks

- [ ] Add FR-LEGAL-01..07 to the PRD Requirements Inventory (AC #1)
- [ ] Author/update ToS with arbitration clause + class-action waiver; wire `app/terms/` (AC #2)
- [ ] Author the per-platform acquisition policy/register (AC #3)
- [ ] Record "AI = inference, not training" statement (AC #4)
- [ ] Write the compliant-by-design positioning note (AC #5)
- [ ] Write Gherkin scenarios in the epic feature file, tagged `@FR-LEGAL-07`, `@story-31-6`, `@E-031-S-<NNN>` (ACs #1–#6)
- [ ] Update RTM; update `sprint-status.yaml`; create/move Trello card

## Definition of Done

- [ ] All ACs implemented and passing at the named test level
- [ ] FR-LEGAL-01..07 present in PRD; ToS published with arbitration + class waiver; per-platform register complete
- [ ] All FR/AC dual-tag coverage: `@FR-LEGAL-07` + `@story-31-6` + `@E-031-S-<NNN>`
- [ ] `make lint` / `make build` / `make test` pass, zero regressions
- [ ] `make test-ac STORY=31.6` passes with zero failures, zero skipped scenarios
- [ ] `make test-ac FEATURE=F31` passes cleanly
- [ ] RTM reflects full FR-LEGAL-01..07 coverage across Epic 31
- [ ] `sprint-status.yaml` updated
- [ ] Trello card moved per status (trello-axovia, board SvVRLeS5)
- [ ] No `Blocked: true` remaining in story frontmatter

## File List

_Files to create/modify:_
- `_bmad-output/planning-artifacts/PRD.md` (add FR-LEGAL-01..07)
- `app/terms/` (ToS with arbitration + class waiver)
- `docs/compliance/data-acquisition-policy.md` (per-platform register — new)
- `docs/compliance/ai-inference-not-training.md` (new)
- `docs/compliance/compliant-by-design-positioning.md` (new, GTM)
- Scenarios in `test/acceptance/features/E-031-legal-compliance-data-acquisition-hardening.feature`
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` (rows)

## References

- Research § Legal "Mitigation Checklist" (defensive items 9–13) and § Competitive Landscape (Swoopa "ethical alternative" positioning)
- ZwillGen / Ropes & Gray 2026 AI-scraping litigation overviews (training-corpus focus)
- Related stories: 31.1–31.5 (this story documents their combined posture)
- ⚠️ ToS arbitration/class-waiver language should be reviewed by licensed counsel before publication.
