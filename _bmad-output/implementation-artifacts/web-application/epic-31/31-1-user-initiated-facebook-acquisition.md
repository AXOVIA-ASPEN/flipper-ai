# Story 31.1: User-Initiated Facebook Marketplace Acquisition (Remove Centralized Logged-In Scraping)

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID: 6a2bb704e96c930ff07c226f

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As **Stephen (the founder)**,
I want Facebook Marketplace listings acquired inside each user's own authenticated browser session via a user-initiated client (browser extension / local agent) instead of a centralized server that logs in with stored Facebook credentials,
so that Flipper.ai exits the highest-risk legal fact pattern (centralized, logged-in, evasive scraping — the pattern that ended hiQ, Voyager Labs, and Proxycurl) while preserving full Facebook Marketplace coverage, the platform with the highest local deal volume.

## Context

The legality + competitive market research (`_bmad-output/planning-artifacts/research/market-flipper-ai-legality-and-competitive-landscape-research-2026-06-12.md`) identified **logged-in Facebook scraping via the central token store as the single highest-risk component of the product** — existential-grade. Meta's Automated Data Collection Terms now prohibit automated collection "regardless of whether such automated access or collection is undertaken while logged in," and Meta is the most aggressive scraping enforcer (Voyager Labs settlement; the Proxycurl shutdown shows a small SaaS cannot outspend it).

The chosen remediation (confirmed by Stephen on 2026-06-12) is the **user-initiated / decentralized model**: scraping runs in the user's own logged-in session via a browser extension or local agent, scoped to that user's own use. This shifts the contract relationship to the end user, eliminates the "centralized commercial scraper" framing, removes the central token store, and distributes rate-limiting naturally. A competitor (CarSnipe) already operates this model, proving it viable.

This story replaces the centralized Facebook acquisition path (`src/scrapers/facebook/` — Stagehand + Gemini automation, `auth.ts`, `token-store.ts`) with a user-initiated client + a thin backend ingestion endpoint that receives listings the user's own client collected. It is the load-bearing story of Epic 31.

## Acceptance Criteria

1. **Central Facebook token store removed** — `src/scrapers/facebook/token-store.ts` and centralized Facebook credential/session storage are removed; no Facebook account credentials or long-lived session tokens are stored server-side. Service-level + source-inspection scenario asserts no centralized Facebook token/credential persistence remains (no `token-store` import, no Facebook session secrets in `config/secretmanager.yaml`). `FR-LEGAL-01`
2. **No server-side logged-in Facebook automation** — The server-side Stagehand/Gemini logged-in Facebook browser automation path is removed or disabled; the codebase contains no server-initiated authenticated Facebook Marketplace session. Source-inspection scenario asserts `src/scrapers/facebook/scraper.ts` no longer performs centralized authenticated login. `FR-LEGAL-01`
3. **User-initiated acquisition client** — A user-initiated client (browser extension or local agent) collects Marketplace listings within the user's own authenticated Facebook session and submits them to Flipper.ai. The client runs only on explicit user action/configuration and uses the user's own session — never shared/centralized credentials. `FR-LEGAL-01`
4. **Backend ingestion endpoint** — A new authenticated API route (e.g. `POST /api/scraper/facebook/ingest`) accepts listings submitted by the user's own client, validates them with Zod, attributes them to the authenticated `userId`, and feeds them into the existing listing-processing/dedup pipeline (Epic 3) and scoring pipeline (Epic 4) unchanged. Service-level scenario asserts ingestion produces normally-scored listings. `FR-LEGAL-01`
5. **Feature parity preserved** — Facebook Marketplace search configuration, listing fields (title, price, condition, location, source URL), dedup, and scoring behave identically to the prior path from the user's perspective. Service-level scenario asserts an ingested Facebook listing flows end-to-end to an OPPORTUNITY/NEW status equivalently to other platforms. `FR-LEGAL-01`
6. **No anti-detection in the user's own session** — The user-initiated client does not employ webdriver-property spoofing or detection-evasion against Facebook (the user is legitimately logged in as themselves). Coordinated with Story 31.2. Source-inspection scenario asserts no evasion flags in the client acquisition path. `FR-LEGAL-01` `FR-LEGAL-02`
7. **RTM + docs updated** — RTM gains rows mapping FR-LEGAL-01 → this story's ACs → scenario tags → `E-031-legal-compliance-data-acquisition-hardening.feature`; the per-platform acquisition policy (Story 31.6) records Facebook as "user-initiated, user-session only." `FR-LEGAL-01`

## Requirement Traceability

> **NOTE:** FR-LEGAL-01 through FR-LEGAL-07 are NEW functional requirements added to the PRD as part of Epic 31 (see Story 31.6 / epics.md Requirements Inventory). The `FR-LEGAL-*` namespace was verified unused as of 2026-06-12.

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-LEGAL-01 | AC #1, #2, #3, #4, #5, #6, #7 | @FR-LEGAL-01 @story-31-1 |
| FR-LEGAL-02 | AC #6 | @FR-LEGAL-02 @story-31-1 |

## Tasks / Subtasks

- [ ] Remove `src/scrapers/facebook/token-store.ts` and all centralized Facebook credential/session storage; remove Facebook session secrets from `config/secretmanager.yaml` + `.env.example` (AC #1)
- [ ] Remove/disable server-side authenticated Stagehand/Gemini Facebook login in `src/scrapers/facebook/` (AC #2)
- [ ] Build the user-initiated acquisition client (browser extension or local agent) that scrapes within the user's own session (AC #3, #6)
- [ ] Add `POST /api/scraper/facebook/ingest` authenticated route with Zod validation, userId attribution, feeding the existing dedup + scoring pipeline (AC #4, #5)
- [ ] Write Gherkin scenarios in `test/acceptance/features/E-031-legal-compliance-data-acquisition-hardening.feature`, tagged `@FR-LEGAL-01`/`@FR-LEGAL-02`, `@story-31-1`, `@E-031-S-<NNN>` (sequential from `@E-031-S-001`) (ACs #1–#7)
- [ ] Update RTM and the per-platform acquisition policy doc (AC #7)
- [ ] Update `sprint-status.yaml`; create/move Trello card per workflow

## Definition of Done

- [ ] All ACs implemented and passing at the named test level
- [ ] No centralized Facebook credentials/session tokens stored anywhere server-side
- [ ] Facebook feature parity verified (ingested listings score identically)
- [ ] All FR/AC dual-tag coverage: `@FR-LEGAL-01`/`@FR-LEGAL-02` + `@story-31-1` + `@E-031-S-<NNN>`
- [ ] Never-mock-AI policy honored — scoring of ingested listings exercises the real provider chain
- [ ] `make lint` — zero ESLint errors
- [ ] `make build` — strict TypeScript passes
- [ ] `make test` — all unit tests green, zero regressions
- [ ] `make test-ac STORY=31.1` passes with zero failures, zero skipped scenarios
- [ ] `make test-ac FEATURE=F31` passes cleanly
- [ ] RTM updated; per-platform acquisition policy records Facebook posture
- [ ] `sprint-status.yaml` updated
- [ ] Trello card moved per status (trello-axovia, board SvVRLeS5)
- [ ] No `Blocked: true` remaining in story frontmatter

## File List

_Files to remove/modify:_
- `src/scrapers/facebook/token-store.ts` (remove)
- `src/scrapers/facebook/auth.ts`, `src/scrapers/facebook/scraper.ts`, `src/scrapers/facebook/index.ts` (rework to user-initiated/ingestion model)
- `config/secretmanager.yaml`, `.env.example` (remove Facebook session secrets)

_Files to create:_
- User-initiated acquisition client (new package/extension surface — directory TBD during design)
- `app/api/scraper/facebook/ingest/route.ts`
- `test/acceptance/features/E-031-legal-compliance-data-acquisition-hardening.feature`
- `test/acceptance/step_definitions/E-031-legal-compliance.steps.ts`
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` (rows)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## References

- Research: `_bmad-output/planning-artifacts/research/market-flipper-ai-legality-and-competitive-landscape-research-2026-06-12.md` (§ Legal and Regulatory Landscape; mitigation item 1)
- Case law: Meta v. Bright Data (2024, logged-out protected), hiQ final judgment (2022), Meta v. Voyager Labs, LinkedIn v. Proxycurl (2025)
- Meta Automated Data Collection Terms: https://www.facebook.com/legal/automated_data_collection_terms
- Related stories: 31.2 (anti-detection rollback), 31.3 (stop-on-notice), 31.6 (compliance docs/ToS); Epic 3 Story 3.3 (the Facebook scraper being replaced)
- ⚠️ Legal note: research, not legal advice — confirm the user-initiated architecture with licensed counsel before launch.
