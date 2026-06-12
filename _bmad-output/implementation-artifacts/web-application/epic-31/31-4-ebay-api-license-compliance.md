# Story 31.4: eBay Browse API License Compliance (AI-Ingestion, Comparison & Retention)

Status: ready-for-dev
Blocked: false
Blocked-Reason:
Trello-Card-ID: 6a2bb710d1cafdb5eeda731d

<!-- Valid statuses: backlog | ready-for-dev | in-progress | blocked | review | done -->

## Story

As **Stephen (the founder)**,
I want our use of eBay Browse API data to comply with the eBay API License Agreement — no ingestion into generative-AI models/tools without written consent, no raw/aggregated redistribution, comparison-clause compliance, and deletion within the licensed retention window,
so that Flipper.ai keeps its cleanest, lowest-risk data source (the official API) without breaching the license in a way that could terminate access or create contractual liability.

## Context

eBay is the one platform Flipper.ai accesses the *right* way — via the official Browse API (`FR-SCAN-02`) — making it low legal risk. But the research flagged the API License as **compliance-sensitive**: it (i) prohibits ingesting eBay data into generative-AI models/tools without prior written consent, (ii) bans distributing eBay data in raw or aggregated/bulk form, (iii) restricts comparing eBay-user utilization with third-party services/marketplaces — directly relevant because Flipper.ai's premise is cross-marketplace arbitrage comparison, (iv) requires data deletion within the licensed window (≈30 days when no longer needed). eBay's December 2025 Robot & Agent Policy also bans scraping and buy-for-me agents — reinforcing that the API is the only sanctioned path.

Two concrete exposure points in the current product: feeding eBay listing/sold data into the AI layer (Groq/Gemini/OpenAI/Anthropic via `completeAI()`), and displaying eBay comps side-by-side with other marketplaces (Epic 5 comparable-sold matching; Epic 13 cross-platform price intelligence). This story makes our usage demonstrably compliant or gates the non-compliant paths pending written consent. **A legal-counsel review of the current eBay license text is a prerequisite task** — engineering enforces whatever the review concludes.

## Acceptance Criteria

1. **License review captured** — A counsel/founder review of the current eBay API License is recorded (decision log: what is permitted, what needs consent, what must change) and referenced from the compliance policy (Story 31.6). Source-inspection scenario asserts the decision log exists and covers AI-ingestion, redistribution, comparison, and retention. `FR-LEGAL-04`
2. **AI-ingestion gated** — eBay data is not sent into the generative-AI provider chain unless the review confirms permission or written consent is obtained; until then, eBay-derived valuation uses the non-LLM algorithmic path. Service-level scenario asserts eBay data does not reach `completeAI()` callers when the consent flag is unset. `FR-LEGAL-04`
3. **No raw/bulk redistribution** — The system exposes no endpoint that returns raw or bulk-aggregated eBay datasets; eBay data appears only as per-listing valuation context to the owning user. Source-inspection + service-level scenario asserts no bulk eBay export endpoint exists. `FR-LEGAL-04`
4. **Comparison-clause compliance** — The cross-marketplace comparison features (Epic 5/13) are reviewed against the comparison clause; displays show eBay *sold-price comps as permitted market reference*, not prohibited cross-service utilization comparisons. Service-level/source-inspection scenario asserts the comparison surface conforms to the review's conclusion. `FR-LEGAL-04`
5. **Retention window enforced** — Cached/stored eBay-derived data carries a TTL within the licensed retention window and is purged on expiry (align `AiAnalysisCache` / comps cache TTLs to the licensed window). Service-level scenario asserts eBay-derived records expire/purge within the configured window. `FR-LEGAL-04`
6. **RTM updated** — RTM gains rows mapping FR-LEGAL-04 → this story's ACs → scenario tags → epic feature file. `FR-LEGAL-04`

## Requirement Traceability

| PRD Requirement | Acceptance Criteria | Test Tag |
|----------------|-------------------|----------|
| FR-LEGAL-04 | AC #1, #2, #3, #4, #5, #6 | @FR-LEGAL-04 @story-31-4 |

## Tasks / Subtasks

- [ ] Record the eBay API License review decision log (counsel/founder) (AC #1)
- [ ] Add a consent gate so eBay data reaches `completeAI()` only when permission is confirmed; otherwise route eBay valuation through the algorithmic path (AC #2)
- [ ] Audit/remove any raw/bulk eBay export surface (AC #3)
- [ ] Review comparison displays (Epic 5/13) against the comparison clause; adjust per conclusion (AC #4)
- [ ] Align eBay-derived cache TTLs to the licensed retention window + purge job (AC #5)
- [ ] Write Gherkin scenarios in the epic feature file, tagged `@FR-LEGAL-04`, `@story-31-4`, `@E-031-S-<NNN>` (ACs #1–#6)
- [ ] Update RTM; update `sprint-status.yaml`; create/move Trello card

## Definition of Done

- [ ] All ACs implemented and passing at the named test level
- [ ] eBay data usage conforms to the recorded license review (AI-ingestion, redistribution, comparison, retention)
- [ ] Never-mock-AI policy honored — the AI-ingestion gate is verified against the real router, not a stub
- [ ] All FR/AC dual-tag coverage: `@FR-LEGAL-04` + `@story-31-4` + `@E-031-S-<NNN>`
- [ ] `make lint` / `make build` / `make test` pass, zero regressions
- [ ] `make test-ac STORY=31.4` passes with zero failures, zero skipped scenarios
- [ ] `make test-ac FEATURE=F31` passes cleanly
- [ ] RTM updated; decision log referenced from compliance policy
- [ ] `sprint-status.yaml` updated
- [ ] Trello card moved per status (trello-axovia, board SvVRLeS5)
- [ ] No `Blocked: true` remaining in story frontmatter

## File List

_Files to create/modify:_
- `src/scrapers/ebay/*` (consent gate on AI-ingestion path)
- `src/lib/ai/*` consumers that receive eBay data (gate)
- Comps/cache TTL config (`AiAnalysisCache`, Epic 5/13 caches)
- `docs/compliance/ebay-api-license-review.md` (new decision log)
- Scenarios in `test/acceptance/features/E-031-legal-compliance-data-acquisition-hardening.feature`
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` (rows)

## References

- Research § Legal; "eBay (Browse API) — LOW but compliance-sensitive"; mitigation item 5
- eBay API License Agreement: https://developer.ebay.com/join/api-license-agreement
- eBay AI-data restriction: https://www.ecommercebytes.com/2025/07/18/ebay-restricts-developers-from-using-its-data-to-train-ai/
- eBay Robot & Agent Policy (Dec 2025): https://www.cxnetwork.com/artificial-intelligence/news/ebay-prohibits-agentic-commerce-bots
- Related: Epic 3 Story 3.2 (eBay Browse API), Epic 5 Story 5.2 (comps), Epic 13 Story 13.8 (cross-platform price intelligence)
- ⚠️ AC #1 depends on a real eBay-license counsel review — engineering enforces the conclusion.
