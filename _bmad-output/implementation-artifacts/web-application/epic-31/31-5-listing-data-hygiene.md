# Story 31.5: Listing Data Hygiene — No Photo Storage, No Seller PII

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID: 6a2bb7168a6be1d459db7dad

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As **Stephen (the founder)**,
I want Flipper.ai to store only factual listing metadata (title, price, condition, location, source URL) and link back to source listings instead of persisting scraped photographs, and to avoid retaining seller personal information or ever contacting scraped sellers,
so that we remove the copyright-infringement vector that drove Craigslist's $20.4M judgment and minimize CCPA/privacy exposure on seller data — while keeping image-based AI analysis working on transient data.

## Context

The research's data-hygiene mitigations address two exposures: **copyright** (storing/redisplaying listing photos is the infringement vector — Craigslist v. RadPad's $20.4M copyright component came from copied listing content) and **privacy/CAN-SPAM** (seller names/locations are personal info under CCPA; emailing scraped contacts triggered damages in RadPad/Instamotor).

The product currently captures and stores listing images in Firebase Storage (`FR-SCAN-14/15/16`, Epic 3 Story 3.9) and reuses them for cross-posting (Epic 9 Story 9.4). This story changes the posture: store facts + source links, not photographs; run vision-AI analysis (`itemCompleteness`) on **transient** images fetched at analysis time without persistence; never store seller PII beyond what's necessary; never email/contact scraped sellers. This revises `FR-SCAN-14/15/16` and interacts with Epic 9's image-reuse feature (which must switch to user-supplied photos for the user's own resale listings rather than reusing the seller's scraped photos).

## Acceptance Criteria

1. **No scraped-photo persistence** — The system does not store scraped listing photographs; it persists only factual metadata (title, price, condition, location, source URL) plus a link back to the source listing. Service-level scenario asserts an acquired listing stores metadata + source URL and no image binary/Storage object. `FR-LEGAL-05`
2. **Transient image AI analysis** — Image-based AI analysis (`itemCompleteness` vision path) operates on images fetched transiently at analysis time and not persisted afterward. Service-level scenario asserts the vision path runs against the real provider chain on a transient image and leaves no stored copy. (Never-mock-AI honored.) `FR-LEGAL-05`
3. **Source link-back in UI** — Listing detail surfaces link to the source listing for the photo rather than displaying a stored copy. Service-level/source-inspection scenario asserts the UI references the source URL, not a stored image object. `FR-LEGAL-05`
4. **Epic 9 image-reuse revised** — Cross-platform resale posting uses the user's own supplied photos for their own resale listing, not the seller's scraped photographs. Service-level scenario asserts the posting queue does not source images from scraped-listing storage. `FR-LEGAL-05`
5. **No seller PII retention** — Seller personal information (name, profile, contact) is not retained beyond transient processing needs; stored records carry no seller PII fields. Service-level scenario asserts persisted listing records contain no seller PII. `FR-LEGAL-06`
6. **Never contact scraped sellers** — The system has no path that emails/SMSs/auto-messages scraped seller contacts; outbound seller communication (Epic 8) operates only through the user's own authenticated marketplace session, initiated by the user. Source-inspection scenario asserts no scraped-contact outbound channel exists. `FR-LEGAL-06`
7. **US-only data scope + CCPA posture** — Data scope is US-only (avoiding GDPR), with a CCPA-aligned data-minimization/deletion posture documented. Source-inspection scenario asserts the documented scope/posture. `FR-LEGAL-06`
8. **FR-SCAN-14/15/16 revised + RTM** — PRD/epics Requirements Inventory revises `FR-SCAN-14/15/16` (image capture/storage/serving) to the link-back + transient-analysis posture; CHANGELOG records the change; RTM gains rows mapping FR-LEGAL-05/06 → ACs → scenario tags → epic feature file. `FR-LEGAL-05` `FR-LEGAL-06`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-LEGAL-05 | AC #1, #2, #3, #4, #8 | @FR-LEGAL-05 @story-31-5 |
| FR-LEGAL-06 | AC #5, #6, #7, #8 | @FR-LEGAL-06 @story-31-5 |

## Tasks / Subtasks

- [ ] Remove scraped-image persistence; store metadata + source URL only (AC #1)
- [ ] Convert `itemCompleteness` vision path to transient fetch (no persistence) (AC #2)
- [ ] Update listing detail UI to link back to source for photos (AC #3)
- [ ] Revise Epic 9 image-reuse to use user-supplied resale photos (AC #4)
- [ ] Remove seller-PII fields from persisted models; transient-only handling (AC #5)
- [ ] Audit and confirm no scraped-contact outbound channel exists (AC #6)
- [ ] Document US-only scope + CCPA data-minimization/deletion posture (AC #7)
- [ ] Revise FR-SCAN-14/15/16 in PRD/epics; CHANGELOG entry (AC #8)
- [ ] Write Gherkin scenarios in the epic feature file, tagged `@FR-LEGAL-05`/`@FR-LEGAL-06`, `@story-31-5`, `@E-031-S-<NNN>` (ACs #1–#8)
- [ ] Update RTM; update `sprint-status.yaml`; create/move Trello card

## Definition of Done

- [ ] All ACs implemented and passing at the named test level
- [ ] No scraped photos or seller PII persisted; image AI analysis runs transiently against the real provider chain
- [ ] All FR/AC dual-tag coverage: `@FR-LEGAL-05`/`@FR-LEGAL-06` + `@story-31-5` + `@E-031-S-<NNN>`
- [ ] Never-mock-AI policy honored (vision path uses real providers)
- [ ] `make lint` / `make build` / `make test` pass, zero regressions
- [ ] `make test-ac STORY=31.5` passes with zero failures, zero skipped scenarios
- [ ] `make test-ac FEATURE=F31` passes cleanly
- [ ] RTM updated; FR-SCAN-14/15/16 revision recorded in PRD/epics + CHANGELOG
- [ ] `sprint-status.yaml` updated
- [ ] Trello card moved per status (trello-axovia, board SvVRLeS5)
- [ ] No `Blocked: true` remaining in story frontmatter

## File List

_Files to create/modify:_
- `prisma/schema.prisma` (drop image-binary/seller-PII persistence; keep source URL)
- Image capture path (Epic 3 Story 3.9 code), `itemCompleteness` vision consumer in `src/lib/ai/`
- Listing detail UI components (link-back)
- Epic 9 posting-queue image handling (`app/posting-queue/`, related lib)
- `docs/compliance/data-scope-and-privacy.md` (new)
- `_bmad-output/planning-artifacts/PRD.md`, `epics.md` (FR-SCAN-14/15/16 revision); `CHANGELOG.md`
- Scenarios in `test/acceptance/features/E-031-legal-compliance-data-acquisition-hardening.feature`
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` (rows)

## References

- Research § Legal; "Statute Snapshot" (copyright, CCPA, CAN-SPAM); mitigations items 6 & 8
- Case law: Craigslist v. RadPad ($20.4M copyright), Craigslist v. Instamotor (emails)
- CCPA scraping guidance: https://www.fbm.com/publications/data-scraping-under-the-revised-ccpa-regulations/
- Related: Epic 3 Story 3.9 (image capture), Epic 9 Story 9.4 (image reuse), Epic 8 (seller comms)
