# Requirements Traceability Matrix

**Project:** Flipper AI
**Generated:** 2026-03-01
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

## FR-SCAN: Multi-Marketplace Scanner

| Requirement | Description | Epic | Story | Scenario ID(s) | Feature File | Status |
|---|---|---|---|---|---|---|
| FR-SCAN-01 | Craigslist Playwright scraper | 3 | 3.1 | | E-003-multi-marketplace-scanning.feature | Pending |
| FR-SCAN-02 | eBay Browse API v1 | 3 | 3.2 | | E-003-multi-marketplace-scanning.feature | Pending |
| FR-SCAN-03 | Facebook Graph API + Stagehand | 3 | 3.3 | | E-003-multi-marketplace-scanning.feature | Pending |
| FR-SCAN-04 | Mercari reverse-engineered API | 3 | 3.4 | | E-003-multi-marketplace-scanning.feature | Pending |
| FR-SCAN-05 | OfferUp Playwright scraper | 3 | 3.5 | | E-003-multi-marketplace-scanning.feature | Pending |
| FR-SCAN-06 | Configurable search filters | 3 | 3.6 | | E-003-multi-marketplace-scanning.feature | Pending |
| FR-SCAN-07 | Saved search configurations | 3 | 3.6 | | E-003-multi-marketplace-scanning.feature | Pending |
| FR-SCAN-08 | ScraperJob status tracking | 3 | 3.7 | | E-003-multi-marketplace-scanning.feature | Pending |
| FR-SCAN-09 | SSE real-time events | 3 | 3.7 | | E-003-multi-marketplace-scanning.feature | Pending |
| FR-SCAN-10 | Anti-detection measures | 3 | 3.1, 3.3, 3.4, 3.5 | | E-003-multi-marketplace-scanning.feature | Pending |
| FR-SCAN-11 | Listing data extraction | 3 | 3.1 | | E-003-multi-marketplace-scanning.feature | Pending |
| FR-SCAN-12 | Deduplication | 3 | 3.8 | | E-003-multi-marketplace-scanning.feature | Pending |
| FR-SCAN-13 | Pre-filtering + free item handling | 3 | 3.8 | | E-003-multi-marketplace-scanning.feature | Pending |
| FR-SCAN-14 | Image download to Firebase Storage | 3 | 3.9 | | E-003-multi-marketplace-scanning.feature | Pending |
| FR-SCAN-15 | Image metadata in Cloud SQL | 3 | 3.9 | | E-003-multi-marketplace-scanning.feature | Pending |
| FR-SCAN-16 | Serve images in UI | 3 | 3.9 | | E-003-multi-marketplace-scanning.feature | Pending |

## FR-SCORE: AI Flippability Score Engine

| Requirement | Description | Epic | Story | Scenario ID(s) | Feature File | Status |
|---|---|---|---|---|---|---|
| FR-SCORE-01 | Algorithmic value score (0-100) | 4 | 4.1 | | E-004-core-scoring-deal-evaluation.feature | Pending |
| FR-SCORE-02 | Category detection | 4 | 4.1 | | E-004-core-scoring-deal-evaluation.feature | Pending |
| FR-SCORE-03 | Brand boost keywords | 4 | 4.1 | | E-004-core-scoring-deal-evaluation.feature | Pending |
| FR-SCORE-04 | Risk penalty keywords | 4 | 4.1 | | E-004-core-scoring-deal-evaluation.feature | Pending |
| FR-SCORE-05 | Estimated market value calculation | 4 | 4.1 | | E-004-core-scoring-deal-evaluation.feature | Pending |
| FR-SCORE-06 | Platform-specific fee rates | 4 | 4.2 | | E-004-core-scoring-deal-evaluation.feature | Pending |
| FR-SCORE-07 | Configurable opportunity threshold | 4 | 4.2 | | E-004-core-scoring-deal-evaluation.feature | Pending |
| FR-SCORE-08 | LLM item identification | 4 | 4.3 | | E-004-core-scoring-deal-evaluation.feature | Pending |
| FR-SCORE-09 | Verified market prices from eBay sold | 4 | 4.4 | | E-004-core-scoring-deal-evaluation.feature | Pending |
| FR-SCORE-10 | True discount percentage | 4 | 4.4 | | E-004-core-scoring-deal-evaluation.feature | Pending |
| FR-SCORE-11 | LLM sellability assessment | 4 | 4.5 | | E-004-core-scoring-deal-evaluation.feature | Pending |
| FR-SCORE-12 | Offer/listing price recommendations | 4 | 4.5 | | E-004-core-scoring-deal-evaluation.feature | Pending |
| FR-SCORE-13 | Undervalue threshold filtering | 4 | 4.5 | | E-004-core-scoring-deal-evaluation.feature | Pending |
| FR-SCORE-14 | AI analysis caching (24h TTL) | 4 | 4.6 | | E-004-core-scoring-deal-evaluation.feature | Pending |
| FR-SCORE-15 | Algorithmic fallback | 4 | 4.6 | | E-004-core-scoring-deal-evaluation.feature | Pending |
| FR-SCORE-16 | Claude Sonnet structural analysis | 5 | 5.1 | | E-005-advanced-market-intelligence.feature | Pending |
| FR-SCORE-17 | Comparable sold item matching | 5 | 5.2 | | E-005-advanced-market-intelligence.feature | Pending |
| FR-SCORE-18 | Sold volume / demand trend analysis | 5 | 5.3 | | E-005-advanced-market-intelligence.feature | Pending |
| FR-SCORE-19 | Item completeness / physical state | 5 | 5.4 | | E-005-advanced-market-intelligence.feature | Pending |
| FR-SCORE-20 | Seller reputation analysis | 5 | 5.4 | | E-005-advanced-market-intelligence.feature | Pending |
| FR-SCORE-21 | Logistics difficulty analysis | 5 | 5.5 | | E-005-advanced-market-intelligence.feature | Pending |
| FR-SCORE-22 | Shipping cost impact on profit | 5 | 5.5 | | E-005-advanced-market-intelligence.feature | Pending |

## FR-COMM: Seller Communication

| Requirement | Description | Epic | Story | Scenario ID(s) | Feature File | Status |
|---|---|---|---|---|---|---|
| FR-COMM-01 | AI purchase message generation | 8 | 8.1 | | E-008-seller-communication-negotiation.feature | Pending |
| FR-COMM-02 | Multiple message types | 8 | 8.1 | | E-008-seller-communication-negotiation.feature | Pending |
| FR-COMM-03 | AI negotiation strategy | 8 | 8.2 | | E-008-seller-communication-negotiation.feature | Pending |
| FR-COMM-04 | Message inbox with threads | 8 | 8.3 | | E-008-seller-communication-negotiation.feature | Pending |
| FR-COMM-05 | Message approval workflow | 8 | 8.4 | | E-008-seller-communication-negotiation.feature | Pending |
| FR-COMM-06 | Conversation status tracking | 8 | 8.5 | | E-008-seller-communication-negotiation.feature | Pending |
| FR-COMM-07 | Inbound message tracking | 8 | 8.5 | | E-008-seller-communication-negotiation.feature | Pending |
| FR-COMM-08 | Message storage model | 8 | 8.3 | | E-008-seller-communication-negotiation.feature | Pending |

## FR-RELIST: Resale Listing Generator

| Requirement | Description | Epic | Story | Scenario ID(s) | Feature File | Status |
|---|---|---|---|---|---|---|
| FR-RELIST-01 | AI resale title generation | 9 | 9.1 | | E-009-cross-platform-resale-listing.feature | Pending |
| FR-RELIST-02 | AI resale description generation | 9 | 9.1 | | E-009-cross-platform-resale-listing.feature | Pending |
| FR-RELIST-03 | Optimal listing price calculation | 9 | 9.2 | | E-009-cross-platform-resale-listing.feature | Pending |
| FR-RELIST-04 | Cross-platform posting queue | 9 | 9.3 | | E-009-cross-platform-resale-listing.feature | Pending |
| FR-RELIST-05 | Posting status workflow + retry | 9 | 9.3 | | E-009-cross-platform-resale-listing.feature | Pending |
| FR-RELIST-06 | Duplicate posting prevention | 9 | 9.3 | | E-009-cross-platform-resale-listing.feature | Pending |
| FR-RELIST-07 | Algorithmic fallback templates | 9 | 9.1 | | E-009-cross-platform-resale-listing.feature | Pending |
| FR-RELIST-08 | Firebase image reuse for cross-posting | 9 | 9.4 | | E-009-cross-platform-resale-listing.feature | Pending |

## FR-DASH: Dashboard & Tracking

| Requirement | Description | Epic | Story | Scenario ID(s) | Feature File | Status |
|---|---|---|---|---|---|---|
| FR-DASH-01 | Dashboard with inventory, stats, filters | 6 | 6.1 | | E-006-flip-lifecycle-management-analytics.feature | Pending |
| FR-DASH-02 | Kanban board drag-and-drop | 6 | 6.2 | | E-006-flip-lifecycle-management-analytics.feature | Pending |
| FR-DASH-03 | Capture purchase price | 6 | 6.2 | | E-006-flip-lifecycle-management-analytics.feature | Pending |
| FR-DASH-04 | Capture resale URL | 6 | 6.2 | | E-006-flip-lifecycle-management-analytics.feature | Pending |
| FR-DASH-05 | Capture sale price, calculate profit | 6 | 6.2 | | E-006-flip-lifecycle-management-analytics.feature | Pending |
| FR-DASH-06 | Advanced filtering | 6 | 6.3 | | E-006-flip-lifecycle-management-analytics.feature | Pending |
| FR-DASH-07 | Analytics display | 6 | 6.4 | | E-006-flip-lifecycle-management-analytics.feature | Pending |
| FR-DASH-08 | CSV/PDF export | 6 | 6.5 | | E-006-flip-lifecycle-management-analytics.feature | Pending |
| FR-DASH-09 | Inventory view with holding costs | 6 | 6.6 | | E-006-flip-lifecycle-management-analytics.feature | Pending |
| FR-DASH-10 | Real-time SSE dashboard updates | 6 | 6.6 | | E-006-flip-lifecycle-management-analytics.feature | Pending |
| FR-DASH-11 | Onboarding wizard | 2 | 2.5 | | E-002-user-registration-auth-onboarding.feature | Pending |
| FR-DASH-12 | Persist onboarding progress | 2 | 2.5 | | E-002-user-registration-auth-onboarding.feature | Pending |
| FR-DASH-13 | Landing page | 2 | 2.1 | | E-002-user-registration-auth-onboarding.feature | Pending |

## FR-MONITOR: Listing Monitoring

| Requirement | Description | Epic | Story | Scenario ID(s) | Feature File | Status |
|---|---|---|---|---|---|---|
| FR-MONITOR-01 | Detect listing sold | 10 | 10.2 | | E-010-monitoring-email-notifications.feature | Pending |
| FR-MONITOR-02 | Track price changes | 10 | 10.2 | | E-010-monitoring-email-notifications.feature | Pending |
| FR-MONITOR-03 | Listing expiration warning | 10 | 10.2 | | E-010-monitoring-email-notifications.feature | Pending |
| FR-MONITOR-04 | Listing unavailable alert | 10 | 10.2 | | E-010-monitoring-email-notifications.feature | Pending |

## FR-NOTIFY: Push Notifications & Email Alerts

| Requirement | Description | Epic | Story | Scenario ID(s) | Feature File | Status |
|---|---|---|---|---|---|---|
| FR-NOTIFY-01 | New flippable item alert | 10 | 10.3 | | E-010-monitoring-email-notifications.feature | Pending |
| FR-NOTIFY-02 | Inbound message alert | 10 | 10.4 | | E-010-monitoring-email-notifications.feature | Pending |
| FR-NOTIFY-03 | Draft message ready alert | 10 | 10.4 | | E-010-monitoring-email-notifications.feature | Pending |
| FR-NOTIFY-04 | Message sent alert | 10 | 10.4 | | E-010-monitoring-email-notifications.feature | Pending |
| FR-NOTIFY-05 | Flip sold alert | 10 | 10.3 | | E-010-monitoring-email-notifications.feature | Pending |
| FR-NOTIFY-06 | Flip purchased alert | 10 | 10.3 | | E-010-monitoring-email-notifications.feature | Pending |
| FR-NOTIFY-07 | Item shipped alert | 10 | 10.3 | | E-010-monitoring-email-notifications.feature | Pending |
| FR-NOTIFY-08 | Review left alert | 10 | 10.5 | | E-010-monitoring-email-notifications.feature | Pending |
| FR-NOTIFY-09 | Flip gone cold alert | 10 | 10.5 | | E-010-monitoring-email-notifications.feature | Pending |
| FR-NOTIFY-10 | Flip hot alert | 10 | 10.5 | | E-010-monitoring-email-notifications.feature | Pending |
| FR-NOTIFY-11 | Price change alert | 10 | 10.5 | | E-010-monitoring-email-notifications.feature | Pending |
| FR-NOTIFY-12 | Configurable preferences | 10, 11 | 10.6, 11.1, 11.3 | | E-010/E-011 | Pending |
| FR-NOTIFY-13 | Twilio SMS integration | 11 | 11.2 | | E-011-push-sms-notifications.feature | Pending |

## FR-BILLING: User Management & Billing

| Requirement | Description | Epic | Story | Scenario ID(s) | Feature File | Status |
|---|---|---|---|---|---|---|
| FR-BILLING-01 | NextAuth email/password auth | 2 | 2.2 | | E-002-user-registration-auth-onboarding.feature | Pending |
| FR-BILLING-02 | OAuth login (Google, GitHub, Facebook) | 2 | 2.3 | | E-002-user-registration-auth-onboarding.feature | Pending |
| FR-BILLING-03 | Subscription tier enforcement | 7 | 7.1 | | E-007-subscription-billing.feature | Pending |
| FR-BILLING-04 | Stripe Checkout | 7 | 7.2 | | E-007-subscription-billing.feature | Pending |
| FR-BILLING-05 | Stripe Customer Portal | 7 | 7.2 | | E-007-subscription-billing.feature | Pending |
| FR-BILLING-06 | Stripe webhooks | 7 | 7.3 | | E-007-subscription-billing.feature | Pending |
| FR-BILLING-07 | Feature gating by tier | 7 | 7.1 | | E-007-subscription-billing.feature | Pending |
| FR-BILLING-08 | API usage tracking | 7 | 7.4 | | E-007-subscription-billing.feature | Pending |
| FR-BILLING-09 | User settings management | 2 | 2.6 | | E-002-user-registration-auth-onboarding.feature | Pending |
| FR-BILLING-10 | hCaptcha login protection | 2 | 2.2 | | E-002-user-registration-auth-onboarding.feature | Pending |
| FR-BILLING-11 | Password reset via Resend | 2 | 2.4 | | E-002-user-registration-auth-onboarding.feature | Pending |

## FR-MEET: Meeting & Logistics

| Requirement | Description | Epic | Story | Scenario ID(s) | Feature File | Status |
|---|---|---|---|---|---|---|
| FR-MEET-01 | Google Calendar integration | 12 | 12.1 | | E-012-meeting-logistics.feature | Pending |
| FR-MEET-02 | Google Maps route generation | 12 | 12.2 | | E-012-meeting-logistics.feature | Pending |

---

## Non-Functional Requirements

| Requirement | Description | Epic(s) | Scenario ID(s) | Feature File | Status |
|---|---|---|---|---|---|
| NFR-PERF-01 | Page loads < 2 seconds | 6 | | | Pending |
| NFR-PERF-02 | Scraper < 60s per marketplace | 3 | | | Pending |
| NFR-PERF-03 | AI analysis < 10s per listing | 4 | | | Pending |
| NFR-PERF-04 | SSE events < 1s delivery | 3 | | | Pending |
| NFR-SEC-01 | All traffic HTTPS | 1 | | | Pending |
| NFR-SEC-02 | Passwords hashed bcryptjs (12 rounds) | 2 | | | Pending |
| NFR-SEC-03 | Rate limiting on auth endpoints | 2 | | | Pending |
| NFR-SEC-04 | Secure session management (JWT HttpOnly) | 2 | | | Pending |
| NFR-SEC-05 | Input validation (Zod) all endpoints | 2 | | | Pending |
| NFR-SEC-06 | API key encryption at rest | 2 | | | Pending |
| NFR-SEC-07 | Security headers (CSP, HSTS, etc.) | 2 | | | Pending |
| NFR-SEC-08 | Stripe webhook signature verification | 7 | | | Pending |
| NFR-SEC-09 | hCaptcha on login | 2 | | | Pending |
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

| Category | Total Requirements | Covered | Pending | Coverage % |
|---|---|---|---|---|
| FR-INFRA | 14 | 13 | 1 | 93% |
| FR-SCAN | 16 | 0 | 16 | 0% |
| FR-SCORE | 22 | 0 | 22 | 0% |
| FR-COMM | 8 | 0 | 8 | 0% |
| FR-RELIST | 8 | 0 | 8 | 0% |
| FR-DASH | 13 | 0 | 13 | 0% |
| FR-MONITOR | 4 | 0 | 4 | 0% |
| FR-NOTIFY | 13 | 0 | 13 | 0% |
| FR-BILLING | 11 | 0 | 11 | 0% |
| FR-MEET | 2 | 0 | 2 | 0% |
| **Total FR** | **111** | **13** | **98** | **12%** |
| NFR | 30 | 4 | 26 | 13% |
| **Grand Total** | **141** | **17** | **124** | **12%** |

---

*This matrix is updated as stories are completed and acceptance test scenarios are written. The "Scenario ID(s)" column is populated when the Gherkin scenarios are created in the corresponding `.feature` file.*
