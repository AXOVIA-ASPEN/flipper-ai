# Requirements Traceability Matrix

**Project:** Flipper AI
**Last Updated:** 2026-04-17 (Story 14.4)
**Purpose:** Maps every Functional Requirement (FR) and Non-Functional Requirement (NFR) to its corresponding Gherkin acceptance test scenarios, ensuring 100% coverage.

**Convention:** Each scenario is tagged with:
- `@E-<NNN>-S-<YYY>` — Epic-scoped scenario ID (sequential within epic)
- `@story-<X>-<Y>` — Story reference
- `@FR-<CATEGORY>-<NN>` or `@NFR-<CATEGORY>-<NN>` — Requirement reference

**Feature File Location:** `test/acceptance/features/E-<NNN>-<epic-slug>.feature`

---

## FR-INFRA: GCP Infrastructure

| Requirement | Description | Epic | Story | Scenario ID(s) | Feature File | Status |
|---|---|---|---|---|---|---|
| FR-INFRA-01 | Cloud Run containerized deployment | 1 | 1.3 | @E-001-S-1, @E-001-S-2, @E-001-S-6 | E-001-production-infrastructure.feature | Covered |
| FR-INFRA-02 | Cloud SQL PostgreSQL | 1 | 1.2 | @E-001-S-48, @E-001-S-49 | E-001-production-infrastructure.feature | Covered |
| FR-INFRA-03 | Firebase Auth migration | 1 | 1.4 | @E-001-S-11, @E-001-S-12, @E-001-S-13, @E-001-S-14, @E-001-S-15, @E-001-S-16 | E-001-production-infrastructure.feature | Covered |
| FR-INFRA-04 | Firebase Hosting CDN | 1 | 1.5 | @E-001-S-7, @E-001-S-10 | E-001-production-infrastructure.feature | Covered |
| FR-INFRA-05 | Cloud Run auto-scaling | 1 | 1.3 | @E-001-S-3, @E-001-S-4 | E-001-production-infrastructure.feature | Covered |
| FR-INFRA-06 | GitHub Actions CI/CD | 1 | 1.8 | @E-001-S-17, @E-001-S-18, @E-001-S-19, @E-001-S-20, @E-001-S-21 | E-001-production-infrastructure.feature | Covered |
| FR-INFRA-07 | Cloud SQL connection config | 1 | 1.2 | @E-001-S-50, @E-001-S-51 | E-001-production-infrastructure.feature | Covered |
| FR-INFRA-08 | Non-secret env config | 1 | 1.3 | @E-001-S-5 | E-001-production-infrastructure.feature | Covered |
| FR-INFRA-09 | CORS configuration | 1 | 1.5 | @E-001-S-8, @E-001-S-9 | E-001-production-infrastructure.feature | Covered |
| FR-INFRA-10 | Health check endpoints | 1 | 1.9 | @E-001-S-29, @E-001-S-30, @E-001-S-31, @E-001-S-32 | E-001-production-infrastructure.feature | Covered |
| FR-INFRA-11 | GCP Secret Manager | 1 | 1.1 | @E-001-S-22, @E-001-S-26 | E-001-production-infrastructure.feature | Covered |
| FR-INFRA-12 | helpers/secrets.py module | 1 | 1.1 | @E-001-S-23, @E-001-S-24, @E-001-S-25, @E-001-S-27 | E-001-production-infrastructure.feature | Covered |
| FR-INFRA-13 | Firebase Storage for images | 1 | 1.6 | @E-001-S-41, @E-001-S-42, @E-001-S-43, @E-001-S-44, @E-001-S-45, @E-001-S-46, @E-001-S-47 | E-001-production-infrastructure.feature | Covered |
| FR-INFRA-14 | Firebase Cloud Messaging | 1 | 1.7 | @E-001-S-36, @E-001-S-37, @E-001-S-38, @E-001-S-39, @E-001-S-40 | E-001-production-infrastructure.feature | Covered |

## FR-AUTH-ACCESS: Authenticated Access Control

| Requirement | Description | Epic | Story | Scenario ID(s) | Feature File | Status |
|---|---|---|---|---|---|---|
| FR-AUTH-ACCESS-01 | Protected routes redirect unauthenticated users to /login with callbackUrl | 2 | 2-auth-access | @E-002-S-49 | E-002-user-registration-auth-onboarding.feature | Covered |
| FR-AUTH-ACCESS-02 | Authenticated nav bar never renders for unauthenticated users or on public routes | 2 | 2-auth-access | @E-002-S-50, @E-002-S-51 | E-002-user-registration-auth-onboarding.feature | Covered (S-50) + WIP (S-51 — see note) |
| FR-AUTH-ACCESS-03 | Expired session cookies cleared and user redirected to /login | 2 | 2-auth-access | @E-002-S-52 | E-002-user-registration-auth-onboarding.feature | Covered |
| FR-AUTH-ACCESS-04 | Authenticated users on landing page redirected to /dashboard | 2 | 2-auth-access | @E-002-S-53 | E-002-user-registration-auth-onboarding.feature | WIP — client-side redirect needs real Firebase session |
| FR-AUTH-ACCESS-05 | Only whitelisted public routes reachable without auth | 2 | 2-auth-access | @E-002-S-54 | E-002-user-registration-auth-onboarding.feature | Covered |
| FR-AUTH-ACCESS-06 | Public pages must not link to protected routes | 2 | 2-auth-access | @E-002-S-55, @E-002-S-56 | E-002-user-registration-auth-onboarding.feature | Covered |

**Note on S-51:** The "Navigation visible for authenticated users" scenario is
tagged `@wip` because it requires a real Firebase Auth session (the client-side
`useAuthContext` cannot be satisfied by a synthesized JWT cookie). Client-side
rendering behavior is fully covered by the Jest unit test at
`src/__tests__/components/Navigation.test.tsx` (23 tests, all passing), which
exhaustively verifies the Navigation component's auth-gated render logic across
every public and protected route combination.

## FR-SCAN: Multi-Marketplace Scanner

| Requirement | Description | Epic | Story | Scenario ID(s) | Feature File | Status |
|---|---|---|---|---|---|---|
| FR-SCAN-01 | Craigslist Playwright scraper | 3 | 3.1 | @E-003-S-001, @E-003-S-002, @E-003-S-004, @E-003-S-006, @E-003-S-007, @E-003-S-008, @E-003-S-009 | E-003-multi-marketplace-scanning.feature | Covered |
| FR-SCAN-02 | eBay Browse API v1 | 3 | 3.2 | @E-003-S-010, @E-003-S-011, @E-003-S-012, @E-003-S-013, @E-003-S-014, @E-003-S-015 | E-003-multi-marketplace-scanning.feature | Covered |
| FR-SCAN-03 | Facebook Graph API + Stagehand | 3 | 3.3 | @E-003-S-016, @E-003-S-017, @E-003-S-018, @E-003-S-019, @E-003-S-023, @E-003-S-024 | E-003-multi-marketplace-scanning.feature | Covered |
| FR-SCAN-04 | Mercari reverse-engineered API | 3 | 3.4 | @E-003-S-026, @E-003-S-027, @E-003-S-028, @E-003-S-031, @E-003-S-032, @E-003-S-033 | E-003-multi-marketplace-scanning.feature | Covered |
| FR-SCAN-05 | OfferUp Playwright scraper | 3 | 3.5 | @E-003-S-034, @E-003-S-035, @E-003-S-036, @E-003-S-039, @E-003-S-040, @E-003-S-041, @E-003-S-043 | E-003-multi-marketplace-scanning.feature | Covered |
| FR-SCAN-06 | Configurable search filters | 3 | 3.6 | | E-003-multi-marketplace-scanning.feature | Pending |
| FR-SCAN-07 | Saved search configurations | 3 | 3.6 | | E-003-multi-marketplace-scanning.feature | Pending |
| FR-SCAN-08 | ScraperJob status tracking | 3 | 3.7 | @E-003-S-061, @E-003-S-062, @E-003-S-065, @E-003-S-066, @E-003-S-067, @E-003-S-069, @E-003-S-070, @E-003-S-071 | E-003-multi-marketplace-scanning.feature / E-003-S37-scraper-jobs-sse.steps.ts | Covered |
| FR-SCAN-09 | SSE real-time events | 3 | 3.7 | @E-003-S-063, @E-003-S-064, @E-003-S-068 | E-003-multi-marketplace-scanning.feature / E-003-S37-scraper-jobs-sse.steps.ts | Covered |
| FR-SCAN-10 | Anti-detection measures | 3 | 3.1, 3.3, 3.4, 3.5 | @E-003-S-005, @E-003-S-020, @E-003-S-021, @E-003-S-022, @E-003-S-025, @E-003-S-029, @E-003-S-030, @E-003-S-037, @E-003-S-038, @E-003-S-042 | E-003-multi-marketplace-scanning.feature | Covered |
| FR-SCAN-11 | Listing data extraction | 3 | 3.1 | @E-003-S-003 | E-003-multi-marketplace-scanning.feature | Covered |
| FR-SCAN-12 | Deduplication | 3 | 3.8 | @E-003-S-072, @E-003-S-073 | E-003-multi-marketplace-scanning.feature | Covered |
| FR-SCAN-13 | Pre-filtering + free item handling | 3 | 3.8 | @E-003-S-074, @E-003-S-075, @E-003-S-076, @E-003-S-077, @E-003-S-078 | E-003-multi-marketplace-scanning.feature | Covered |
| FR-SCAN-14 | Image download to Firebase Storage | 3 | 3.9 | @E-003-S-056, @E-003-S-059, @E-003-S-060 | E-003-multi-marketplace-scanning.feature | Covered |
| FR-SCAN-15 | Image metadata in Cloud SQL | 3 | 3.9 | @E-003-S-057 | E-003-multi-marketplace-scanning.feature | Covered |
| FR-SCAN-16 | Serve images in UI | 3 | 3.9 | @E-003-S-058 | E-003-multi-marketplace-scanning.feature | Covered |

## FR-SCORE: AI Flippability Score Engine

| Requirement | Description | Epic | Story | Scenario ID(s) | Feature File | Step Definition File | Status |
|---|---|---|---|---|---|---|---|
| FR-SCORE-01 | Algorithmic value score (0-100) | 4 | 4.1 | @E-004-S-001, @E-004-S-007 | E-004-scoring-and-deal-evaluation.feature | E-004-algorithmic-value-score.steps.ts | Covered |
| FR-SCORE-02 | Category detection | 4 | 4.1 | @E-004-S-002, @E-004-S-003 | E-004-scoring-and-deal-evaluation.feature | E-004-algorithmic-value-score.steps.ts | Covered |
| FR-SCORE-03 | Brand boost keywords | 4 | 4.1 | @E-004-S-004 | E-004-scoring-and-deal-evaluation.feature | E-004-algorithmic-value-score.steps.ts | Covered |
| FR-SCORE-04 | Risk penalty keywords | 4 | 4.1 | @E-004-S-005 | E-004-scoring-and-deal-evaluation.feature | E-004-algorithmic-value-score.steps.ts | Covered |
| FR-SCORE-05 | Estimated market value calculation | 4 | 4.1 | @E-004-S-006 | E-004-scoring-and-deal-evaluation.feature | E-004-algorithmic-value-score.steps.ts | Covered |
| FR-SCORE-06 | Platform-specific fee rates | 4 | 4.2 | @E-004-S-008, @E-004-S-009, @E-004-S-011 | E-004-scoring-and-deal-evaluation.feature | E-004-platform-fees-threshold.steps.ts | Covered |
| FR-SCORE-07 | Configurable opportunity threshold | 4 | 4.2 | @E-004-S-010, @E-004-S-011, @E-004-S-012 | E-004-scoring-and-deal-evaluation.feature | E-004-platform-fees-threshold.steps.ts | Covered |
| FR-SCORE-08 | LLM item identification | 4 | 4.3 | @E-004-S-013, @E-004-S-014, @E-004-S-015 | E-004-scoring-and-deal-evaluation.feature | E-004-llm-item-identification.steps.ts | Covered |
| FR-SCORE-09 | Verified market prices from eBay sold | 4 | 4.4 | @E-004-S-016, @E-004-S-017, @E-004-S-018, @E-004-S-020, @E-004-S-021 | E-004-scoring-and-deal-evaluation.feature | E-004-verified-market-price.steps.ts | Covered |
| FR-SCORE-10 | True discount percentage | 4 | 4.4 | @E-004-S-019, @E-004-S-022, @E-004-S-023 | E-004-scoring-and-deal-evaluation.feature | E-004-verified-market-price.steps.ts | Covered |
| FR-SCORE-11 | LLM sellability assessment | 4 | 4.5 | @E-004-S-024, @E-004-S-026, @E-004-S-027, @E-004-S-028 | E-004-scoring-and-deal-evaluation.feature | E-004-llm-sellability.steps.ts | Covered |
| FR-SCORE-12 | Offer/listing price recommendations | 4 | 4.5 | @E-004-S-024, @E-004-S-025, @E-004-S-027 | E-004-scoring-and-deal-evaluation.feature | E-004-llm-sellability.steps.ts | Covered |
| FR-SCORE-13 | Undervalue threshold filtering | 4 | 4.5 | @E-004-S-025, @E-004-S-026, @E-004-S-028 | E-004-scoring-and-deal-evaluation.feature | E-004-llm-sellability.steps.ts | Covered |
| FR-SCORE-14 | AI analysis caching (24h TTL) | 4 | 4.6 | @E-004-S-029, @E-004-S-030, @E-004-S-031, @E-004-S-032 | E-004-scoring-and-deal-evaluation.feature | E-004-ai-caching.steps.ts | Covered |
| FR-SCORE-15 | Algorithmic fallback | 4 | 4.6 | @E-004-S-030, @E-004-S-033 | E-004-scoring-and-deal-evaluation.feature | E-004-ai-caching.steps.ts | Covered |
| FR-SCORE-16 | Claude Sonnet structural analysis | 5 | 5.1 | @E-005-S-1, @E-005-S-2, @E-005-S-3 | E-005-advanced-market-intelligence.feature | E-005-claude-analyzer.steps.ts | Covered |
| FR-SCORE-17 | Comparable sold item matching | 5 | 5.2 | @E-005-S-9, @E-005-S-10, @E-005-S-11, @E-005-S-12 | E-005-advanced-market-intelligence.feature | E-005-comparable-sold-items.steps.ts | Covered |
| FR-SCORE-18 | Sold volume / demand trend analysis | 5 | 5.3 | @E-005-S-13, @E-005-S-14, @E-005-S-15, @E-005-S-16, @E-005-S-17 | E-005-advanced-market-intelligence.feature | E-005-sold-volume-demand.steps.ts | Covered |
| FR-SCORE-19 | Item completeness / physical state | 5 | 5.4 | @E-005-S-4, @E-005-S-5 | E-005-advanced-market-intelligence.feature | E-005-completeness-reputation.steps.ts | Covered |
| FR-SCORE-20 | Seller reputation analysis | 5 | 5.4 | @E-005-S-6, @E-005-S-7, @E-005-S-8 | E-005-advanced-market-intelligence.feature | E-005-completeness-reputation.steps.ts | Covered |
| FR-SCORE-21 | Logistics difficulty analysis | 5 | 5.5 | @E-005-S-18, @E-005-S-20, @E-005-S-21, @E-005-S-22, @E-005-S-23 | E-005-advanced-market-intelligence.feature | E-005-logistics-shipping.steps.ts | Covered |
| FR-SCORE-22 | Shipping cost impact on profit | 5 | 5.5 | @E-005-S-19, @E-005-S-21, @E-005-S-23 | E-005-advanced-market-intelligence.feature | E-005-logistics-shipping.steps.ts | Covered |
| FR-SCORE-23 | IQR outlier filtering on eBay sold prices | 13 | 13.1 | @E-013-S-001, @E-013-S-002, @E-013-S-003, @E-013-S-004, @E-013-S-005, @E-013-S-006, @E-013-S-007, @E-013-S-008 | E-013-scoring-algorithm-improvements.feature | E-013-iqr-outlier-filtering.steps.ts | Covered |
| FR-SCORE-24 | Structured JSON LLM response format | 13 | 13.2 | @E-013-S-009, @E-013-S-010, @E-013-S-011, @E-013-S-012, @E-013-S-013 | E-013-scoring-algorithm-improvements.feature | E-013-structured-json.steps.ts | Covered |
| FR-SCORE-25 | Cache invalidation on price changes | 13 | 13.3 | @E-013-S-039, @E-013-S-040, @E-013-S-041, @E-013-S-042, @E-013-S-043, @E-013-S-044, @E-013-S-045 | E-013-scoring-algorithm-improvements.feature | E-013-cache-invalidation.steps.ts | Covered |
| FR-SCORE-26 | Weighted scoring (margin + absolute profit) | 13 | 13.4 | @E-013-S-030, @E-013-S-031, @E-013-S-032, @E-013-S-033, @E-013-S-034, @E-013-S-035, @E-013-S-036, @E-013-S-037, @E-013-S-038 | E-013-scoring-algorithm-improvements.feature | E-013-weighted-scoring.steps.ts | Covered |
| FR-SCORE-27 | Brand regex refinement — title-only + negative patterns | 13 | 13.5 | @E-013-S-014, @E-013-S-015, @E-013-S-016, @E-013-S-017, @E-013-S-018 | E-013-scoring-algorithm-improvements.feature | E-013-brand-regex.steps.ts | Covered |
| FR-SCORE-28 | Demand velocity integration into Tier 1 score | 13 | 13.6 | @E-013-S-019, @E-013-S-020, @E-013-S-021, @E-013-S-022, @E-013-S-023, @E-013-S-024, @E-013-S-025, @E-013-S-026, @E-013-S-027, @E-013-S-028, @E-013-S-029 | E-013-scoring-algorithm-improvements.feature | E-013-demand-velocity.steps.ts | Covered |
| FR-SCORE-29 | Collaborative scoring algorithm calibration — refined category multipliers, brand boosts, formula weights, opportunity-profit floor, decision log | 13 | 13.7 | @E-013-S-059, @E-013-S-060, @E-013-S-061, @E-013-S-062, @E-013-S-063, @E-013-S-064, @E-013-S-065, @E-013-S-066, @E-013-S-067, @E-013-S-068, @E-013-S-069, @E-013-S-070, @E-013-S-071 | E-013-scoring-algorithm-improvements.feature | E-013-scoring-refinement.steps.ts | Covered |
| FR-SCORE-30 | Cross-platform price intelligence — verified market values from multiple platforms | 13 | 13.8 | @E-013-S-046, @E-013-S-047, @E-013-S-048, @E-013-S-049, @E-013-S-050, @E-013-S-051, @E-013-S-052, @E-013-S-053, @E-013-S-054, @E-013-S-055, @E-013-S-056, @E-013-S-057, @E-013-S-058 | E-013-scoring-algorithm-improvements.feature | E-013-cross-platform-price.steps.ts | Covered |

## FR-COMM: Seller Communication

| Requirement | Description | Epic | Story | Scenario ID(s) | Feature File | Status |
|---|---|---|---|---|---|---|
| FR-COMM-01 | AI purchase message generation | 8 | 8.1 | @E-008-S-1, @E-008-S-2, @E-008-S-3, @E-008-S-4, @E-008-S-5, @E-008-S-6, @E-008-S-11, @E-008-S-12, @E-008-S-13, @E-008-S-14, @E-008-S-15, @E-008-S-16 | E-008-seller-communication-negotiation.feature | Covered |
| FR-COMM-02 | Multiple message types | 8 | 8.1 | @E-008-S-7, @E-008-S-8, @E-008-S-9, @E-008-S-10 | E-008-seller-communication-negotiation.feature | Covered |
| FR-COMM-03 | AI negotiation strategy | 8 | 8.2 | @E-008-S-17, @E-008-S-18, @E-008-S-19, @E-008-S-20, @E-008-S-21, @E-008-S-22, @E-008-S-23, @E-008-S-24, @E-008-S-25, @E-008-S-26, @E-008-S-27, @E-008-S-28, @E-008-S-29 | E-008-seller-communication-negotiation.feature | Covered |
| FR-COMM-04 | Message inbox with threads | 8 | 8.3 | @E-008-S-30, @E-008-S-31, @E-008-S-32, @E-008-S-33, @E-008-S-34, @E-008-S-35, @E-008-S-36, @E-008-S-39, @E-008-S-40, @E-008-S-41 | E-008-seller-communication-negotiation.feature | Covered |
| FR-COMM-05 | Message approval workflow | 8 | 8.4 | @E-008-S-56, @E-008-S-57, @E-008-S-58, @E-008-S-59, @E-008-S-60, @E-008-S-61, @E-008-S-62, @E-008-S-63, @E-008-S-64, @E-008-S-65, @E-008-S-66 | E-008-seller-communication-negotiation.feature | Covered |
| FR-COMM-06 | Conversation status tracking | 8 | 8.5 | @E-008-S-42, @E-008-S-43, @E-008-S-44, @E-008-S-45, @E-008-S-49, @E-008-S-50, @E-008-S-51, @E-008-S-52, @E-008-S-53, @E-008-S-55b | E-008-seller-communication-negotiation.feature | Covered |
| FR-COMM-07 | Inbound message tracking | 8 | 8.5 | @E-008-S-46, @E-008-S-47, @E-008-S-48, @E-008-S-54, @E-008-S-55, @E-008-S-55a | E-008-seller-communication-negotiation.feature | Covered |
| FR-COMM-08 | Message storage model | 8 | 8.3 | @E-008-S-37, @E-008-S-38 | E-008-seller-communication-negotiation.feature | Covered |

## FR-RELIST: Resale Listing Generator

| Requirement | Description | Epic | Story | Scenario ID(s) | Feature File | Status |
|---|---|---|---|---|---|---|
| FR-RELIST-01 | AI resale title generation | 9 | 9.1 | @E-009-S-1, @E-009-S-2, @E-009-S-3, @E-009-S-9, @E-009-S-10, @E-009-S-11 | E-009-cross-platform-resale-listing.feature | Covered |
| FR-RELIST-02 | AI resale description generation | 9 | 9.1 | @E-009-S-4, @E-009-S-5, @E-009-S-6, @E-009-S-9, @E-009-S-10 | E-009-cross-platform-resale-listing.feature | Covered |
| FR-RELIST-03 | Optimal listing price calculation | 9 | 9.2 | @E-009-S-12, @E-009-S-13, @E-009-S-14, @E-009-S-15, @E-009-S-16, @E-009-S-17, @E-009-S-18, @E-009-S-19, @E-009-S-20 | E-009-cross-platform-resale-listing.feature, PriceCalculator.test.tsx (36 component-level UI tests: AC-1 hero display, AC-2 full hierarchy, AC-3 slider recalc, AC-4 edge states, AC-5 projected UI) | Covered |
| FR-RELIST-04 | Cross-platform posting queue | 9 | 9.3 | @E-009-S-21, @E-009-S-27 | E-009-cross-platform-resale-listing.feature | Covered |
| FR-RELIST-05 | Posting status workflow + retry | 9 | 9.3 | @E-009-S-22, @E-009-S-23, @E-009-S-25, @E-009-S-26 | E-009-cross-platform-resale-listing.feature | Covered |
| FR-RELIST-06 | Duplicate posting prevention | 9 | 9.3 | @E-009-S-24 | E-009-cross-platform-resale-listing.feature | Covered |
| FR-RELIST-07 | Algorithmic fallback templates | 9 | 9.1 | @E-009-S-7, @E-009-S-8, @E-009-S-10 | E-009-cross-platform-resale-listing.feature | Covered |
| FR-RELIST-08 | Firebase image reuse for cross-posting | 9 | 9.4 | @E-009-S-28, @E-009-S-29, @E-009-S-30, @E-009-S-31, @E-009-S-32, @E-009-S-33, @E-009-S-34 | E-009-cross-platform-resale-listing.feature | Covered |

## FR-DASH: Dashboard & Tracking

| Requirement | Description | Epic | Story | Scenario ID(s) | Feature File | Status |
|---|---|---|---|---|---|---|
| FR-DASH-01 | Dashboard with inventory, stats, filters | 6 | 6.1 | @E-006-S-1, @E-006-S-2, @E-006-S-3, @E-006-S-4, @E-006-S-5, @E-006-S-6, @E-006-S-7, @E-006-S-8, @E-006-S-9 | E-006-flip-lifecycle-management-analytics.feature | Covered |
| FR-DASH-02 | Kanban board drag-and-drop | 6 | 6.2 | @E-006-S-10, @E-006-S-11, @E-006-S-15, @E-006-S-21, @E-006-S-22 | E-006-flip-lifecycle-management-analytics.feature, user_flows.feature | Covered |
| FR-DASH-03 | Capture purchase price | 6 | 6.2 | @E-006-S-12 | E-006-flip-lifecycle-management-analytics.feature | Covered |
| FR-DASH-04 | Capture resale URL | 6 | 6.2 | @E-006-S-13 | E-006-flip-lifecycle-management-analytics.feature | Covered |
| FR-DASH-05 | Capture sale price, calculate profit | 6 | 6.2 | @E-006-S-14 | E-006-flip-lifecycle-management-analytics.feature | Covered |
| FR-DASH-06 | Advanced filtering | 6 | 6.3 | @E-006-S-16, @E-006-S-17, @E-006-S-18, @E-006-S-19, @E-006-S-20 | E-006-flip-lifecycle-management-analytics.feature | Covered |
| FR-DASH-07 | Analytics display | 6 | 6.4 | @E-006-S-21, @E-006-S-22, @E-006-S-23, @E-006-S-24 | E-006-flip-lifecycle-management-analytics.feature | Covered |
| FR-DASH-08 | CSV/PDF export | 6 | 6.5 | @E-006-S-25, @E-006-S-26, @E-006-S-27, @E-006-S-28, @E-006-S-29 | E-006-flip-lifecycle-management-analytics.feature | Covered |
| FR-DASH-09 | Inventory view with holding costs | 6 | 6.6 | @E-006-S-30, @E-006-S-31 | E-006-flip-lifecycle-management-analytics.feature | Covered |
| FR-DASH-10 | Real-time SSE dashboard updates | 6 | 6.6 | @E-006-S-32, @E-006-S-33 | E-006-flip-lifecycle-management-analytics.feature | Covered |
| FR-DASH-11 | Onboarding wizard | 2 | 2.5 | @E-002-S-31, @E-002-S-32, @E-002-S-35, @E-002-S-36, @E-002-S-37, @E-002-S-38, @E-002-S-39 | E-002-user-registration-auth-onboarding.feature | WIP — 7 scenarios written but all tagged @wip, not yet executing in test runs |
| FR-DASH-12 | Persist onboarding progress | 2 | 2.5 | @E-002-S-33, @E-002-S-34 | E-002-user-registration-auth-onboarding.feature | WIP — 2 scenarios written but all tagged @wip, not yet executing in test runs |
| FR-DASH-13 | Landing page | 2 | 2.1 | | E-002-user-registration-auth-onboarding.feature | Pending |

## FR-MONITOR: Listing Monitoring

| Requirement | Description | Epic | Story | Scenario ID(s) | Feature File | Status |
|---|---|---|---|---|---|---|
| FR-MONITOR-01 | Detect listing sold | 10 | 10.2 | @E-010-S-18 | E-010-monitoring-email-notifications.feature | Covered |
| FR-MONITOR-02 | Track price changes | 10 | 10.2 | @E-010-S-19, @E-010-S-20, @E-010-S-21 | E-010-monitoring-email-notifications.feature | Covered |
| FR-MONITOR-03 | Listing expiration warning | 10 | 10.2 | @E-010-S-22, @E-010-S-23, @E-010-S-24 | E-010-monitoring-email-notifications.feature | Covered |
| FR-MONITOR-04 | Listing unavailable alert | 10 | 10.2 | @E-010-S-25, @E-010-S-26, @E-010-S-27 | E-010-monitoring-email-notifications.feature | Covered |

> **Story 10.1 — Infrastructure Foundation (no direct FR tags)**
> Story 10.1 implements the background job scheduler, MonitoringJobService, NotificationEvent queue,
> and monitoring API endpoint that _enable_ FR-MONITOR-* and FR-NOTIFY-* in subsequent stories.
> All 7 ACs are covered by structural + pure-function acceptance test scenarios tagged `@story-10-1`:
>
> | AC | Scenario(s) | Type |
> |---|---|---|
> | AC-1: Scheduled Monitoring Trigger | @E-010-S-8, @E-010-S-9 | structural (route file + source) |
> | AC-2: Batch Listing Checks | @E-010-S-10 | structural (listing-tracker.ts source) |
> | AC-3: Notification Event Creation | @E-010-S-11, @E-010-S-12 | pure-function + structural |
> | AC-4: Retry with Exponential Backoff | @E-010-S-13 | structural (monitoring-job.ts source) |
> | AC-5: Concurrent Run Prevention | @E-010-S-14 | structural (P2002 → MONITORING_CONCURRENT) |
> | AC-6: Stale Job Recovery | @E-010-S-15 | structural (reapStaleJobs → FAILED) |
> | AC-7: Monitoring Effectiveness Canary | @E-010-S-16, @E-010-S-17 | pure-function (isAnomalyThresholdExceeded) |
>
> Step definitions: `test/acceptance/step_definitions/E-010-background-job-scheduler.steps.ts`

> **Story 10.2 — Listing Monitoring Events**
> Story 10.2 adds sold/price-change/expiry/unavailable detection with payload enrichment,
> the notification events API (GET /api/notifications, PATCH /api/notifications/[id]),
> and extends the SSE emitter union with the four new monitoring event types.
> Scenarios tagged `@story-10-2` (E-010-S-18 through E-010-S-31):
>
> | AC | Scenario(s) | Type |
> |---|---|---|
> | AC-1: Sold Detection | @E-010-S-18 | structural (listing-tracker.ts exports detectSoldStatus + soldIndicator in StateChange) |
> | AC-2: Price Change Detection | @E-010-S-19, @E-010-S-20, @E-010-S-21 | structural + pure-function (direction field, isPriceChangeMeaningful) |
> | AC-3: Expiry Warning | @E-010-S-22, @E-010-S-23, @E-010-S-24 | pure-function (computeEstimatedExpiry per platform, null for Mercari) |
> | AC-4: Unavailable Detection | @E-010-S-25, @E-010-S-26, @E-010-S-27 | pure-function (classifyHttpResponse: 404→removed, 403/429→rate_limited) |
> | AC-5: Notifications API (GET) | @E-010-S-28, @E-010-S-29 | structural (GET handler, auth, pagination) |
> | AC-6: Mark Events Read (PATCH) | @E-010-S-30 | structural (PATCH handler + ownership check) |
> | AC-7: SSE Real-Time Events | @E-010-S-31 | structural (SseEventType union extension) |
>
> Step definitions: `test/acceptance/step_definitions/E-010-monitoring-events.steps.ts`

## FR-NOTIFY: Push Notifications & Email Alerts

| Requirement | Description | Epic | Story | Scenario ID(s) | Feature File | Status |
|---|---|---|---|---|---|---|
| FR-NOTIFY-01 | New flippable item alert | 10 | 10.3 | @E-010-S-32, @E-010-S-36, @E-010-S-37, @E-010-S-38, @E-010-S-39 | E-010-monitoring-email-notifications.feature | Covered |
| FR-NOTIFY-02 | Inbound message alert | 10 | 10.4 | @E-010-S-1, @E-010-S-2, @E-010-S-3 | E-010-monitoring-email-notifications.feature | Covered |
| FR-NOTIFY-03 | Draft message ready alert | 10 | 10.4 | @E-010-S-4, @E-010-S-5 | E-010-monitoring-email-notifications.feature | Covered |
| FR-NOTIFY-04 | Message sent alert | 10 | 10.4 | @E-010-S-6, @E-010-S-7 | E-010-monitoring-email-notifications.feature | Covered |
| FR-NOTIFY-05 | Flip sold alert | 10 | 10.3 | @E-010-S-35, @E-010-S-36, @E-010-S-37, @E-010-S-38 | E-010-monitoring-email-notifications.feature | Covered |
| FR-NOTIFY-06 | Flip purchased alert | 10 | 10.3 | @E-010-S-33, @E-010-S-36 | E-010-monitoring-email-notifications.feature | Covered |
| FR-NOTIFY-07 | Item listed alert | 10 | 10.3 | @E-010-S-34, @E-010-S-36 | E-010-monitoring-email-notifications.feature | Covered |
| FR-NOTIFY-08 | Review left alert | 10 | 10.5 | @E-010-S-40 @story-10-5 | E-010-monitoring-email-notifications.feature | Covered |
| FR-NOTIFY-09 | Flip gone cold alert | 10 | 10.5, 10.6 | @E-010-S-41, @E-010-S-42, @E-010-S-45, @E-010-S-47, @E-010-S-56, @E-010-S-57 | E-010-monitoring-email-notifications.feature | Covered |
| FR-NOTIFY-10 | Flip hot alert | 10 | 10.5, 10.6 | @E-010-S-43, @E-010-S-46, @E-010-S-48, @E-010-S-56, @E-010-S-57 | E-010-monitoring-email-notifications.feature | Covered |
| FR-NOTIFY-11 | Price change alert | 10 | 10.5 | @E-010-S-44 @story-10-5 | E-010-monitoring-email-notifications.feature | Covered |
| FR-NOTIFY-12 | Configurable preferences | 10, 11 | 10.6, 11.1, 11.3 | @E-010-S-50..57 (story-10-6); @E-011-S-1..5 (story-11-1); @E-011-S-14, @E-011-S-15, @E-011-S-16, @E-011-S-17, @E-011-S-18, @E-011-S-19, @E-011-S-20, @E-011-S-21 (story-11-3) | E-010-monitoring-email-notifications.feature, E-011-push-sms-notifications.feature | Covered |
| FR-NOTIFY-13 | Twilio SMS integration | 11 | 11.2 | @E-011-S-7, @E-011-S-8, @E-011-S-9, @E-011-S-10, @E-011-S-11, @E-011-S-12, @E-011-S-13 | E-011-push-sms-notifications.feature | Covered |

## FR-BILLING: User Management & Billing

| Requirement | Description | Epic | Story | Scenario ID(s) | Feature File | Status |
|---|---|---|---|---|---|---|
| FR-BILLING-01 | NextAuth email/password auth | 2 | 2.2 | @E-002-S-10 | E-002-user-registration-auth-onboarding.feature | WIP — 1 scenario written but tagged @wip, not yet executing in test runs |
| FR-BILLING-02 | OAuth login (Google, GitHub, Facebook) | 2 | 2.3 | @E-002-S-16, @E-002-S-17, @E-002-S-18, @E-002-S-19 | E-002-user-registration-auth-onboarding.feature | WIP — 4 scenarios written but all tagged @wip, not yet executing in test runs |
| FR-BILLING-03 | Subscription tier enforcement | 7 | 7.1 | @E-007-S-1, @E-007-S-2, @E-007-S-3, @E-007-S-4, @E-007-S-5, @E-007-S-6, @E-007-S-9, @E-007-S-10 | E-007-subscription-billing.feature | WIP — 8 scenarios written but all tagged @wip, not yet executing in test runs. HIGH PRIORITY: implement and remove @wip tags ASAP |
| FR-BILLING-04 | Stripe Checkout | 7 | 7.2 | @E-007-S-11, @E-007-S-12, @E-007-S-13, @E-007-S-16, @E-007-S-17 | E-007-subscription-billing.feature | Covered |
| FR-BILLING-05 | Stripe Customer Portal | 7 | 7.2 | @E-007-S-14, @E-007-S-15, @E-007-S-18 | E-007-subscription-billing.feature | Covered |
| FR-BILLING-06 | Stripe webhooks | 7 | 7.3 | @E-007-S-19, @E-007-S-20, @E-007-S-21, @E-007-S-22, @E-007-S-23, @E-007-S-27 | E-007-subscription-billing.feature | Covered |
| FR-BILLING-07 | Feature gating by tier | 7 | 7.1 | @E-007-S-7, @E-007-S-8 | E-007-subscription-billing.feature | WIP — 2 scenarios written but all tagged @wip, not yet executing in test runs |
| FR-BILLING-08 | API usage tracking | 7 | 7.4 | @E-007-S-28, @E-007-S-29, @E-007-S-30, @E-007-S-31, @E-007-S-32 | E-007-subscription-billing.feature | WIP — 5 scenarios written but all tagged @wip, not yet executing in test runs |
| FR-BILLING-09 | User settings management | 2 | 2.6 | @E-002-S-40, @E-002-S-41, @E-002-S-42, @E-002-S-44, @E-002-S-45 | E-002-user-registration-auth-onboarding.feature | WIP — 5 scenarios written but all tagged @wip, not yet executing in test runs |
| FR-BILLING-10 | hCaptcha login protection | 2 | 2.2 | @E-002-S-12 | E-002-user-registration-auth-onboarding.feature | WIP — 1 scenario written but tagged @wip, not yet executing in test runs |
| FR-BILLING-11 | Password reset via Resend | 2 | 2.4 | @E-002-S-21, @E-002-S-22, @E-002-S-23, @E-002-S-24, @E-002-S-25, @E-002-S-26, @E-002-S-27, @E-002-S-28, @E-002-S-29, @E-002-S-30 | E-002-user-registration-auth-onboarding.feature | WIP — 10 scenarios written but all tagged @wip, not yet executing in test runs |

## FR-MEET: Meeting & Logistics

| Requirement | Description | Epic | Story | Scenario ID(s) | Feature File | Status |
|---|---|---|---|---|---|---|
| FR-MEET-01 | Google Calendar integration | 12 | 12.1 | @E-012-S-1, @E-012-S-2, @E-012-S-3, @E-012-S-4, @E-012-S-5, @E-012-S-6, @E-012-S-7, @E-012-S-8 | E-012-meeting-logistics.feature | Covered |
| FR-MEET-02 | Google Maps route generation | 12 | 12.2 | @E-012-S-9, @E-012-S-10, @E-012-S-11, @E-012-S-12, @E-012-S-13, @E-012-S-14, @E-012-S-15 | E-012-meeting-logistics.feature | Covered |

## FR-UI-DESIGN: Frontend Design System Migration

| Requirement | Description | Epic | Story | Scenario ID(s) | Feature File | Status |
|---|---|---|---|---|---|---|
| FR-UI-DESIGN-01 | Canonical dark-first design tokens (root palette, fp-* animations, hot card, range slider) | 14 | 14.1 | @E-014-S-1, @E-014-S-2, @E-014-S-3, @E-014-S-4, @E-014-S-5, @E-014-S-15, @E-014-S-16, @E-014-S-17, @E-014-S-18, @E-014-S-19 | E-014-frontend-design-migration.feature | Covered |
| FR-UI-DESIGN-02 | Canonical fp-* design-system classes on landing and auth pages (no raw palette, no orbs, fp-glass/btn/input/alert/grad/hot-card) | 14 | 14.4, 14.6 | @E-014-S-37, @E-014-S-38, @E-014-S-39, @E-014-S-40, @E-014-S-41, @E-014-S-42, @E-014-S-43, @E-014-S-44, @E-014-S-45, @E-014-S-47, @E-014-S-48, @E-014-S-49, @E-014-S-29, @E-014-S-30, @E-014-S-31, @E-014-S-32, @E-014-S-33, @E-014-S-35, @E-014-S-36 | E-014-frontend-design-migration.feature | Covered — E-014-landing-auth-rebuild.steps.ts, E-014-price-calculator.steps.ts |
| FR-UI-DESIGN-03 | Remove competing multi-theme system (bg-theme-*, var(--theme-*), FLIPPER-14-2 interim placeholders) | 14 | 14.2, 14.4 | @E-014-S-6, @E-014-S-7, @E-014-S-8, @E-014-S-9, @E-014-S-10, @E-014-S-11, @E-014-S-12, @E-014-S-13, @E-014-S-14, @E-014-S-45, @E-014-S-46 | E-014-frontend-design-migration.feature | Covered |
| FR-UI-DESIGN-04 | Zero non-purple palette matches on rebuilt pages (green reserved for profit, pink/fuchsia/rose banned) | 14 | 14.4, 14.6 | @E-014-S-44, @E-014-S-30 | E-014-frontend-design-migration.feature | Covered — E-014-landing-auth-rebuild.steps.ts, E-014-price-calculator.steps.ts |
| FR-UI-DESIGN-05 | No competing ambient background systems (no animate-blob orbs, no page-level bg-gradient override) | 14 | 14.4 | @E-014-S-37, @E-014-S-41, @E-014-S-47 | E-014-frontend-design-migration.feature | Covered — E-014-landing-auth-rebuild.steps.ts |
| FR-UI-DESIGN-06 | Shared UI state components (LoadingSkeleton, ErrorBanner, EmptyState, ScoreRing) | 14 | 14.3 | @E-014-S-20, @E-014-S-21, @E-014-S-22, @E-014-S-23, @E-014-S-24, @E-014-S-25, @E-014-S-26, @E-014-S-27, @E-014-S-28 | E-014-frontend-design-migration.feature | Covered — E-014-shared-ui-state.steps.ts |
| FR-UI-DESIGN-07 | Accessibility not regressed on rebuilt pages (axe-core zero critical/serious, aria-labels on icon-only buttons) | 14 | 14.4, 14.6 | @E-014-S-49, @E-014-S-50, @E-014-S-34, @E-014-S-35 | E-014-frontend-design-migration.feature | Covered — E-014-landing-auth-rebuild.steps.ts, E-014-price-calculator.steps.ts |

---

## Non-Functional Requirements

| Requirement | Description | Epic(s) | Scenario ID(s) | Feature File | Status |
|---|---|---|---|---|---|
| NFR-PERF-01 | Page loads < 2 seconds | 6 | | | Pending |
| NFR-PERF-02 | Scraper < 60s per marketplace | 3 | | | Pending |
| NFR-PERF-03 | AI analysis < 10s per listing | 4 | | | Pending |
| NFR-PERF-04 | SSE events < 1s delivery | 3 | | | Pending |
| NFR-SEC-01 | All traffic HTTPS | 1 | | | Pending |
| NFR-SEC-02 | Passwords hashed bcryptjs (12 rounds) | 2 | @E-002-S-13, @E-002-S-14 | E-002-user-registration-auth-onboarding.feature | WIP — 2 scenarios written but all tagged @wip |
| NFR-SEC-03 | Rate limiting on auth endpoints | 2 | @E-002-S-15 | E-002-user-registration-auth-onboarding.feature | WIP — 1 scenario written but tagged @wip |
| NFR-SEC-04 | Secure session management (JWT HttpOnly) | 2 | @E-002-S-20 | E-002-user-registration-auth-onboarding.feature | WIP — 1 scenario written but tagged @wip |
| NFR-SEC-05 | Input validation (Zod) all endpoints | 2 | @E-002-S-43, @E-002-S-46, @E-002-S-47 | E-002-user-registration-auth-onboarding.feature | Partial (@wip) — 3 scenarios written; S-47 is live, S-43 and S-46 tagged @wip |
| NFR-SEC-06 | API key encryption at rest | 2 | @E-002-S-42, @E-002-S-43, @E-002-S-48 | E-002-user-registration-auth-onboarding.feature | WIP — 3 scenarios written but all tagged @wip |
| NFR-SEC-07 | Security headers (CSP, HSTS, etc.) | 2 | | | Pending |
| NFR-SEC-08 | Stripe webhook signature verification | 7 | @E-007-S-24, @E-007-S-25, @E-007-S-26 | E-007-subscription-billing.feature | Covered |
| NFR-SEC-09 | hCaptcha on login | 2 | @E-002-S-11 | E-002-user-registration-auth-onboarding.feature | WIP — 1 scenario written but tagged @wip |
| NFR-SEC-10 | No critical/high vulns in deps | All | | | Pending |
| NFR-SCALE-01 | Cloud Run auto-scaling (0-N) | 1 | | | Pending |
| NFR-SCALE-02 | Database connection pooling | 1 | @E-001-S-52 | E-001-production-infrastructure.feature | Covered |
| NFR-SCALE-03 | AI analysis caching (24h TTL) | 4 | | | Pending |
| NFR-RELY-01 | Graceful degradation (AI fallback) | 4 | | | Pending |
| NFR-RELY-02 | Scraper retry + exponential backoff | 3 | | | Pending |
| NFR-RELY-03 | Health check endpoints | 1 | @E-001-S-33 | E-001-production-infrastructure.feature | Covered |
| NFR-RELY-04 | Structured logging via pino | 1 | @E-001-S-34, @E-001-S-35 | E-001-production-infrastructure.feature | Covered |
| NFR-TEST-01 | 80%+ unit test coverage | All | | | Pending |
| NFR-TEST-02 | E2E tests for critical flows | All | | | Pending |
| NFR-TEST-03 | BDD acceptance tests for all FRs | All | | | Pending |
| NFR-TEST-04 | Requirements traceability 100% coverage | All | | | Pending |
| NFR-TEST-05 | CI/CD runs all test levels | 1 | @E-001-S-17, @E-001-S-18 | E-001-production-infrastructure.feature | Covered |
| NFR-UX-01 | Mobile-responsive (mobile-first) | 2, 6 | | | Pending |
| NFR-UX-02 | WCAG AA accessibility | 6 | | | Pending |
| NFR-UX-03 | Consistent design system (Tailwind 4) | 6 | | | Pending |
| NFR-UX-04 | Toast notification system | 6 | | | Pending |
| NFR-UX-05 | Global error boundary + retry | 6 | | | Pending |

---

## Coverage Summary

> **Status key:** Covered = scenarios executing in test runs. WIP = scenarios written but tagged @wip (not yet executing). Partial = mix of live and @wip scenarios. Pending = no scenarios written.

| Category | Total Requirements | Covered | WIP | Pending | Coverage % (Covered only) |
|---|---|---|---|---|---|
| FR-INFRA | 14 | 14 | 0 | 0 | 100% |
| FR-SCAN | 16 | 12 | 2 | 2 | 75% |
| FR-SCORE | 26 | 18 | 0 | 8 | 69% |
| FR-COMM | 8 | 7 | 0 | 1 | 88% |
| FR-RELIST | 8 | 3 | 0 | 5 | 38% |
| FR-DASH | 13 | 10 | 2 | 1 | 77% |
| FR-MONITOR | 4 | 4 | 0 | 0 | 100% |
| FR-NOTIFY | 13 | 12 | 0 | 1 | 92% |
| FR-BILLING | 11 | 3 | 8 | 0 | 27% |
| FR-MEET | 2 | 2 | 0 | 0 | 100% |
| FR-UI-DESIGN | 1 | 1 | 0 | 0 | 100% |
| **Total FR** | **113** | **83** | **12** | **18** | **73%** |
| NFR | 30 | 6 | 5 | 19 | 20% |
| **Grand Total** | **143** | **89** | **17** | **37** | **62%** |

---

*This matrix is updated as stories are completed and acceptance test scenarios are written. The "Scenario ID(s)" column is populated when the Gherkin scenarios are created in the corresponding `.feature` file. Requirements marked "WIP" have scenarios written but tagged `@wip` -- they are excluded from test runs until step definitions are implemented and the `@wip` tag is removed.*
