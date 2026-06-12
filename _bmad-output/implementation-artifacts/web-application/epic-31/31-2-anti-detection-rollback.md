# Story 31.2: Anti-Detection Rollback & Respectful Access Controls

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID: 6a2bb708a1645c3098942919

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As **Stephen (the founder)**,
I want the scrapers' anti-bot evasion measures (webdriver-property override, randomized user-agent/viewport intended to defeat detection) removed in favor of identified, rate-limited, robots-aware access,
so that Flipper.ai stops feeding the legal theories that the anti-detection stack uniquely strengthens — CFAA "without authorization" after a block, the emerging DMCA §1201 anti-circumvention theory, trespass-to-chattels via "sophisticated evasion," and willfulness/punitive enhancements.

## Context

The research identified the anti-detection stack as **the through-line risk multiplier** across nearly every legal theory, and the easiest high-impact thing to dial back. Current scrapers (`src/scrapers/*/scraper.ts`) apply per-platform anti-detection per `FR-SCAN-10`: randomized UA, viewport randomization, and webdriver override — measures whose purpose is to evade anti-bot systems.

Removing evasion does not mean removing all resilience — selector fallbacks and reasonable error handling stay. What changes: the system no longer *disguises* automated access. This pairs with Story 31.3 (stop-on-notice) — once we don't evade, honoring blocks becomes coherent. It also revises `FR-SCAN-10` (which currently mandates anti-detection) to a respectful-access posture; the revision is recorded in the PRD/epics Requirements Inventory.

Note: Story 31.1 already removes evasion from the Facebook user-initiated client. This story covers the remaining server-side scrapers: Craigslist, OfferUp, Mercari. (eBay uses the official API — no scraping/evasion.)

## Acceptance Criteria

1. **Webdriver override removed** — No scraper sets `navigator.webdriver` overrides or equivalent properties to hide automation. Source-inspection scenario asserts no webdriver-spoofing code remains in `src/scrapers/craigslist|offerup|mercari/`. `FR-LEGAL-02`
2. **No detection-evasion randomization** — UA/viewport randomization whose purpose is detection evasion is removed; if a UA is sent, it is a stable, honest identifier (optionally identifying Flipper.ai), not a rotating disguise. Source-inspection + service-level scenario asserts the UA strategy is fixed/honest, not randomized-per-request to evade. `FR-LEGAL-02`
3. **Per-source rate limiting & throttling** — Each scraper enforces a conservative, configurable request rate and delay per source (also reduces Craigslist per-page liquidated-damages exposure and trespass "server harm" framing). Service-level scenario asserts a rate limiter gates requests and respects the configured ceiling. `FR-LEGAL-02`
4. **robots.txt awareness** — Where a platform publishes robots.txt, the scraper records/respects it (at minimum logs and honors a configured allow/deny posture per source). Service-level scenario asserts robots posture is evaluated before acquisition. `FR-LEGAL-02`
5. **FR-SCAN-10 revised** — The PRD/epics Requirements Inventory revises `FR-SCAN-10` from an "anti-detection measures" mandate to a "respectful, identified, rate-limited, robots-aware access" mandate; CHANGELOG records the behavioral change. Source-inspection scenario asserts the revised FR text is present. `FR-LEGAL-02`
6. **Selector resilience retained** — Removing evasion does not remove selector fallbacks/error handling; scrapers still degrade gracefully on layout changes. Service-level scenario asserts selector-fallback behavior is intact. `FR-LEGAL-02`
7. **RTM updated** — RTM gains rows mapping FR-LEGAL-02 → this story's ACs → scenario tags → epic feature file. `FR-LEGAL-02`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-LEGAL-02 | AC #1, #2, #3, #4, #5, #6, #7 | @FR-LEGAL-02 @story-31-2 |

## Tasks / Subtasks

- [ ] Remove webdriver-override / detection-evasion code from `src/scrapers/craigslist|offerup|mercari/scraper.ts` (AC #1, #2)
- [ ] Replace per-request UA/viewport randomization with a fixed honest UA (AC #2)
- [ ] Add/confirm per-source rate limiter + configurable delay; expose config in `SCRAPER_CONFIG` (AC #3)
- [ ] Add robots.txt evaluation/posture per source (AC #4)
- [ ] Revise `FR-SCAN-10` text in PRD + epics Requirements Inventory; add CHANGELOG entry (AC #5)
- [ ] Verify selector fallbacks/error handling intact (AC #6)
- [ ] Write Gherkin scenarios in the epic feature file, tagged `@FR-LEGAL-02`, `@story-31-2`, `@E-031-S-<NNN>` (ACs #1–#7)
- [ ] Update RTM; update `sprint-status.yaml`; create/move Trello card

## Definition of Done

- [ ] All ACs implemented and passing at the named test level
- [ ] No webdriver-spoofing or detection-evasion randomization remains in any server-side scraper
- [ ] All FR/AC dual-tag coverage: `@FR-LEGAL-02` + `@story-31-2` + `@E-031-S-<NNN>`
- [ ] `make lint` — zero ESLint errors
- [ ] `make build` — strict TypeScript passes
- [ ] `make test` — all unit tests green, zero regressions
- [ ] `make test-ac STORY=31.2` passes with zero failures, zero skipped scenarios
- [ ] `make test-ac FEATURE=F31` passes cleanly
- [ ] RTM updated; FR-SCAN-10 revision recorded in PRD/epics + CHANGELOG
- [ ] `sprint-status.yaml` updated
- [ ] Trello card moved per status (trello-axovia, board SvVRLeS5)
- [ ] No `Blocked: true` remaining in story frontmatter

## File List

_Files to modify:_
- `src/scrapers/craigslist/scraper.ts`, `src/scrapers/craigslist/types.ts`
- `src/scrapers/offerup/scraper.ts`, `src/scrapers/offerup/types.ts`
- `src/scrapers/mercari/scraper.ts`, `src/scrapers/mercari/types.ts`
- `_bmad-output/planning-artifacts/PRD.md`, `_bmad-output/planning-artifacts/epics.md` (FR-SCAN-10 revision)
- `CHANGELOG.md`

_Files to create:_
- Shared rate-limit / robots utility under `src/scrapers/` (if not already present)
- Scenarios in `test/acceptance/features/E-031-legal-compliance-data-acquisition-hardening.feature`
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` (rows)

## References

- Research § Legal and Regulatory Landscape; "The Anti-Detection Stack Is the Through-Line Risk"; mitigation item 3
- Case law: Craigslist v. 3Taps (circumventing blocks = CFAA), Reddit v. Perplexity (DMCA §1201 anti-circumvention), X Corp v. Bright Data (trespass on "sophisticated evasion")
- Related stories: 31.1 (FB user-initiated), 31.3 (stop-on-notice); existing FR-SCAN-10
