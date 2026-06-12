# Story 31.3: Stop-on-Notice — Cease-and-Desist / Block Compliance Controls

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID: 6a2bb70cafbb363b206ea63a

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As **Stephen (the founder)**,
I want a per-platform "stop-on-notice" control that immediately and durably halts all acquisition from a platform when we receive a cease-and-desist or an access block, with no automated circumvention,
so that Flipper.ai never crosses the line that converts a Terms-of-Service dispute into CFAA "without authorization" liability (the Craigslist v. 3Taps holding) and preserves a documented good-faith posture.

## Context

The research's single clearest criminal-exposure trigger is **continuing to access a platform after a cease-and-desist and/or IP block, via circumvention** — exactly the 3Taps fact pattern. The mitigation is operational: an immediate, durable kill switch per platform plus a documented process so a C&D is honored within hours, not debated.

This story adds (a) a per-platform acquisition enable/disable flag that the system checks before every acquisition run, (b) a documented stop-on-notice runbook, and (c) detection-and-halt behavior when a platform signals a block (e.g. sustained 403/429/CAPTCHA challenge), so the system backs off and disables rather than evading. It complements Story 31.2 — once we don't evade, honoring blocks is coherent.

## Acceptance Criteria

1. **Per-platform kill switch** — A durable per-platform acquisition flag (config/DB-backed) is checked before every scraper/ingestion run; when a platform is disabled, no acquisition occurs for it. Service-level scenario asserts a disabled platform performs zero acquisition. `FR-LEGAL-03`
2. **Immediate + durable halt** — Disabling a platform takes effect immediately for in-flight and scheduled jobs and persists across restarts/deploys (not an in-memory-only toggle). Service-level scenario asserts the flag is honored after a simulated restart and cancels scheduled jobs. `FR-LEGAL-03`
3. **No circumvention on block signals** — When a platform returns sustained block signals (403/429/CAPTCHA/challenge), the scraper backs off and surfaces the condition (and may auto-disable per policy) — it never rotates IPs/identities to push through. Service-level scenario asserts block signals lead to halt/backoff, not retry-through-evasion. `FR-LEGAL-03`
4. **Stop-on-notice runbook** — A documented runbook exists (who can trigger, how to flip the switch per platform, expected time-to-halt, how to record the notice) referenced from the compliance policy (Story 31.6). Source-inspection scenario asserts the runbook exists and lists all five platforms. `FR-LEGAL-03`
5. **Audit trail** — Each enable/disable action records actor, platform, timestamp, and reason (e.g. "C&D received 2026-..."), retained for the compliance record. Service-level scenario asserts an audit entry is written on toggle. `FR-LEGAL-03`
6. **RTM updated** — RTM gains rows mapping FR-LEGAL-03 → this story's ACs → scenario tags → epic feature file. `FR-LEGAL-03`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-LEGAL-03 | AC #1, #2, #3, #4, #5, #6 | @FR-LEGAL-03 @story-31-3 |

## Tasks / Subtasks

- [ ] Add durable per-platform acquisition flag (DB-backed) + pre-run check in scraper job management (Epic 3 Story 3.7 integration) (AC #1, #2)
- [ ] Make disable cancel in-flight + scheduled jobs and persist across restarts (AC #2)
- [ ] Add block-signal detection → halt/backoff (no IP/identity rotation) (AC #3)
- [ ] Write the stop-on-notice runbook (AC #4)
- [ ] Add audit-trail writes on toggle (AC #5)
- [ ] Write Gherkin scenarios in the epic feature file, tagged `@FR-LEGAL-03`, `@story-31-3`, `@E-031-S-<NNN>` (ACs #1–#6)
- [ ] Update RTM; update `sprint-status.yaml`; create/move Trello card

## Definition of Done

- [ ] All ACs implemented and passing at the named test level
- [ ] Disabling any platform durably halts all acquisition; block signals never trigger circumvention
- [ ] All FR/AC dual-tag coverage: `@FR-LEGAL-03` + `@story-31-3` + `@E-031-S-<NNN>`
- [ ] `make lint` / `make build` / `make test` pass, zero regressions
- [ ] `make test-ac STORY=31.3` passes with zero failures, zero skipped scenarios
- [ ] `make test-ac FEATURE=F31` passes cleanly
- [ ] RTM updated; runbook committed and referenced from compliance policy
- [ ] `sprint-status.yaml` updated
- [ ] Trello card moved per status (trello-axovia, board SvVRLeS5)
- [ ] No `Blocked: true` remaining in story frontmatter

## File List

_Files to create/modify:_
- Per-platform acquisition flag model (Prisma schema) + pre-run check in `src/scrapers/` job management
- Block-signal detection in `src/scrapers/*/scraper.ts` and the Facebook ingestion path
- `docs/compliance/stop-on-notice-runbook.md` (new)
- `app/api/scraper/*` (guard checks)
- Scenarios in `test/acceptance/features/E-031-legal-compliance-data-acquisition-hardening.feature`
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` (rows)

## References

- Research § Legal; "stop-on-notice" mitigation item 2; Craigslist v. 3Taps (post-C&D circumvention = CFAA)
- Related stories: 31.1, 31.2, 31.6; Epic 3 Story 3.7 (scraper job management)
