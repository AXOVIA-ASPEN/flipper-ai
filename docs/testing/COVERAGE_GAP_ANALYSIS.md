# Test Coverage Gap Analysis

**Generated:** 2026-05-06
**Source of truth:** `origin/django-main` (the active development trunk)
**Authors:** Stephen Boyett (founder) + this audit
**Companion docs:**
- `PROPOSED_FR_ADDITIONS.md` — new FRs to fill the gaps identified here
- `PROPOSED_BDD_SCENARIOS.md` — Gherkin stubs for the new FRs and still-pending NFRs

> **Note on branch:** This audit examines the actual code state on `origin/django-main`. The roadmap document repository is on `claude/create-release-roadmap-NCkB5`, which forked from the older `main` branch. The recommendations in this doc target django-main; merge or backport accordingly.

---

## TL;DR

| Layer                                     | Status                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------- |
| **Unit tests (Jest)**                     | 218 test files, 99%+ coverage on covered modules. **Strong.**                         |
| **BDD acceptance (Cucumber)**             | 14 epic-level feature files exist. **150 of 174 requirement rows covered (86%).**      |
| **E2E (Playwright)**                      | 84 spec files. **Strong, but few `@smoke` tags for fast prod-monitoring runs.**       |
| **NFR coverage in BDD**                   | **Weak — 16 NFRs marked Pending.** Performance, security, scalability, accessibility, UX. |
| **FR catalog completeness**               | **17 functional surfaces in code lack any FR mapping.** Multi-provider AI, background jobs, in-app notification inbox, several APIs. |
| **Test types missing entirely**           | Performance regression, security regression (DAST/SAST in CI), visual diff per-PR, contract tests for external APIs (eBay, Stripe webhook events) |

**Bottom line:** Code-level coverage is excellent. **Behavioral and operational coverage has documented holes** that are mostly in the requirements catalog itself, not the test suite. The fix is dual: close the FR gaps (make sure every functional surface has at least one FR), then close the BDD gaps (every FR/NFR has at least one Gherkin scenario).

---

## §1 — What We Audited

### Source artifacts examined

- `_bmad-output/planning-artifacts/epics.md` — 119 FRs across 11 categories + 30 NFRs across 7 categories
- `_bmad-output/test-artifacts/requirements-traceability-matrix.md` — 174 requirement rows; 125 Covered, 25 Pending, 24 partial
- `app/api/**/route.ts` — 80 API route files
- `src/lib/**/*.ts` — 90+ business-logic modules
- `src/scrapers/**/*.ts` — 5 marketplace scrapers, fully refactored
- `src/components/**/*.tsx` — 40+ React components
- `src/__tests__/**/*.test.ts(x)` — 218 test files
- `test/acceptance/features/E-NNN-*.feature` — 14 epic feature files
- `test/e2e/*.spec.ts` — 84 Playwright specs

### Methodology

1. **Inventoried every functional surface** in code (API routes, lib modules, scrapers, AI providers, components).
2. **Mapped each surface to existing FRs** in `epics.md`.
3. **Surfaces with no FR mapping** → enumerated as "Functionality without FR".
4. **FRs without Covered status in the matrix** → enumerated as "FR without acceptance test".
5. **NFRs without Covered status** → enumerated as "NFR without verification".
6. **Cross-checked unit test files** against lib modules to find any module without a corresponding test.

---

## §2 — Functionality In Code That Has No FR Mapping

These are surfaces present in the codebase that no current FR explicitly describes. Either the FR was missed during planning, or it was implicit in another FR but never extracted. Each is a candidate for a new FR — see `PROPOSED_FR_ADDITIONS.md`.

### 2.1 Multi-provider AI architecture (entire `src/lib/ai/` tree)

**Code surface:**
- `src/lib/ai/index.ts` — `completeAI()` public API
- `src/lib/ai/providers/` — Gemini, Groq, OpenAI, Anthropic adapters with auto-fallback
- `src/lib/ai/prompts/` — 12 centralized prompt configs across flip-analysis, identification, listing, messaging, negotiation
- `src/lib/ai/providers/error-mapping.ts` — consistent error classification across providers

**FR coverage today:** Zero. FR-SCORE references "GPT-4o-mini" and "Claude Sonnet" by name but doesn't formalize the abstraction.

**Why this matters:**
- Provider routing logic, fallback order, rate-limit handling, and prompt registry are all production-critical.
- No acceptance test today verifies "if provider A fails, fall back to B → C → D".
- A regression here silently degrades the product (slower responses, higher cost, lower accuracy).

**Recommendation:** New **FR-AI** category (10 requirements). See `PROPOSED_FR_ADDITIONS.md` §1.

---

### 2.2 Background job scheduler / processors

**Code surface:**
- `app/api/posting-queue/process/route.ts` — drains the posting queue
- `app/api/notifications/process/route.ts` — sends queued notifications
- `app/api/monitoring/run/route.ts` — runs monitoring sweep
- `app/api/meeting-reminders/run/route.ts` — sends meeting-time reminders
- `app/api/messages/check-replies/route.ts` — polls for inbound replies
- `src/lib/posting-queue-processor.ts`
- `src/lib/monitoring-job.ts`
- `src/lib/meeting-reminder-scheduler.ts`
- `src/lib/inbound-message-checker.ts`
- `src/lib/flip-notification-processor.ts`
- `src/lib/smart-alert-notification-processor.ts`

**FR coverage today:** Implicit. FR-NOTIFY-* describe what to notify *about*, but **no FR formalizes the scheduler itself** — invocation, idempotency, retry semantics, backpressure, observability.

**Why this matters:**
- Background jobs are the most failure-prone class of code in any SaaS. Without explicit FRs, regressions are hard to spot.
- Cron schedule + idempotency + dead-letter handling are unspecified. Today's code may silently double-send notifications if a job retries.

**Recommendation:** New **FR-JOBS** category (8 requirements). See `PROPOSED_FR_ADDITIONS.md` §2.

---

### 2.3 In-app notification feed / inbox

**Code surface:**
- `app/api/notifications/route.ts` — list notifications
- `app/api/notifications/[id]/route.ts` — read/dismiss
- `src/lib/notification-events.ts` — event taxonomy

**FR coverage today:** FR-NOTIFY-01 through FR-NOTIFY-13 describe *triggering* notifications via push/email/SMS, but **none describes the in-app notification feed** that users see at e.g. `/notifications`.

**Recommendation:** Add **FR-NOTIFY-14, 15, 16** for the in-app feed, mark-read behavior, and pagination. See `PROPOSED_FR_ADDITIONS.md` §3.

---

### 2.4 Phone verification (SMS opt-in)

**Code surface:**
- `app/api/user/phone/send-code/route.ts`
- `app/api/user/phone/verify/route.ts`

**FR coverage today:** FR-NOTIFY-13 references SMS but there's no FR for the **double-opt-in phone verification** flow that's required by Twilio compliance.

**Recommendation:** Add **FR-NOTIFY-17, 18** for phone verification. See `PROPOSED_FR_ADDITIONS.md` §3.

---

### 2.5 Push notification device registration

**Code surface:**
- `app/api/user/device-token/route.ts`
- `src/lib/firebase/messaging.ts`
- `src/lib/firebase/messaging-admin.ts`
- `src/lib/firebase/register-sw.ts`

**FR coverage today:** FR-NOTIFY-01 to 11 fire push notifications but **no FR describes registering a device token** in the first place.

**Recommendation:** Add **FR-NOTIFY-19** for FCM device-token registration. See `PROPOSED_FR_ADDITIONS.md` §3.

---

### 2.6 Image proxy

**Code surface:**
- `app/api/images/proxy/route.ts`
- `src/lib/image-helpers.ts`

**FR coverage today:** None. FR-INFRA-13 covers Firebase Storage *as a backend*, but the **authenticated image-proxy** that resolves storage paths to user-scoped URLs is not in the FR catalog.

**Recommendation:** Add **FR-INFRA-15** for the image proxy. See `PROPOSED_FR_ADDITIONS.md` §4.

---

### 2.7 Diagnostics endpoint

**Code surface:**
- `app/api/diagnostics/route.ts`

**FR coverage today:** None. Used heavily during the Feb 2026 LibSQL → PG migration; **production debugging utility** with no acceptance criteria today.

**Recommendation:** Add **FR-INFRA-16** for diagnostics with explicit auth-gating and rate-limiting requirements. See `PROPOSED_FR_ADDITIONS.md` §4.

---

### 2.8 Test seed endpoint

**Code surface:**
- `app/api/test/seed-user/route.ts`

**FR coverage today:** None. **Should not exist in production.** This is a test utility that, if reachable in prod, allows arbitrary user creation.

**Recommendation:** Add **NFR-SEC-11** for production exclusion of test endpoints with build-time gating. See `PROPOSED_FR_ADDITIONS.md` §7.

---

### 2.9 Counter-offer analysis

**Code surface:**
- `app/api/listings/[id]/counter-offer-analysis/route.ts`
- `src/lib/negotiation-strategy.ts`

**FR coverage today:** FR-COMM-03 mentions "negotiation strategy" but **counter-offer evaluation** (the seller's response to your initial offer) is a distinct workflow.

**Recommendation:** Add **FR-COMM-09** for counter-offer analysis. See `PROPOSED_FR_ADDITIONS.md` §5.

---

### 2.10 Cold/hot flip detection

**Code surface:**
- `src/lib/cold-hot-detector.ts`

**FR coverage today:** FR-NOTIFY-09 (cold) and FR-NOTIFY-10 (hot) describe the **notification** but not the **detection logic** (thresholds, configurability, edge cases).

**Recommendation:** Add **FR-COMM-10** for cold/hot detection. See `PROPOSED_FR_ADDITIONS.md` §5.

---

### 2.11 Listing expiry monitoring

**Code surface:**
- `src/lib/listing-expiry.ts`
- `src/lib/listing-tracker.ts`

**FR coverage today:** FR-MONITOR-03 mentions "warn before listings expire" but **expiry detection** logic (per-platform expiration rules, missed-poll handling) lacks specification.

**Recommendation:** Expand FR-MONITOR-03 + add **FR-MONITOR-05** for the expiry detection algorithm. See `PROPOSED_FR_ADDITIONS.md` §5.

---

### 2.12 Holding cost calculation

**Code surface:**
- `src/lib/holding-cost.ts`

**FR coverage today:** FR-DASH-09 mentions "estimated carrying cost" but doesn't specify **carrying-cost rate, currency, or formula**.

**Recommendation:** Add **FR-DASH-14** to formalize holding cost. See `PROPOSED_FR_ADDITIONS.md` §6.

---

### 2.13 Cross-platform price intelligence

**Code surface:**
- `src/lib/cross-platform-price.ts`

**FR coverage today:** Story 13.8 mentions cross-platform price intelligence but **no explicit FR**.

**Recommendation:** Add **FR-SCORE-23** for cross-platform price aggregation. See `PROPOSED_FR_ADDITIONS.md` §8.

---

### 2.14 IQR outlier filtering for sold prices

**Code surface:**
- `src/lib/market-price.ts` (with IQR-related logic)
- `src/__tests__/lib/iqr-backtest.test.ts`

**FR coverage today:** Story 13.1 implements it but **no explicit FR**.

**Recommendation:** Add **FR-SCORE-24** for IQR outlier filtering. See `PROPOSED_FR_ADDITIONS.md` §8.

---

### 2.15 Demand velocity tier integration

**Code surface:**
- `src/lib/demand-analyzer.ts`

**FR coverage today:** FR-SCORE-18 mentions "demand trend" abstractly. Story 13.6 introduced **velocity tiers** (HOT, WARM, COLD, DEAD) but no formal FR.

**Recommendation:** Add **FR-SCORE-25** for demand velocity tiers. See `PROPOSED_FR_ADDITIONS.md` §8.

---

### 2.16 Conversation status auto-transitions

**Code surface:**
- `src/lib/conversation-status.ts`
- `app/api/listings/[id]/conversation-status/route.ts`

**FR coverage today:** FR-COMM-06 covers status enum (pending, responded, purchased) but **transitions are manual today** — no FR describes auto-transition rules (e.g., "when seller replies, status → RESPONDED").

**Recommendation:** Expand FR-COMM-06 with explicit auto-transition rules. See `PROPOSED_FR_ADDITIONS.md` §5.

---

### 2.17 Distance / ETA calculation for meetings

**Code surface:**
- `src/lib/distance-calculator.ts`
- `src/lib/maps-service.ts`
- `app/api/opportunities/[id]/maps-route/route.ts`

**FR coverage today:** FR-MEET-02 covers "route generation" but doesn't specify **driving time, alternate routes, or traffic-aware ETA**.

**Recommendation:** Expand FR-MEET-02 + add **FR-MEET-03** for meeting reminders. See `PROPOSED_FR_ADDITIONS.md` §10.

---

## §3 — FRs Without Acceptance Test Scenarios

These FRs exist in the catalog but the traceability matrix marks them **Pending** — i.e., no Gherkin scenario references them.

| FR / NFR              | Description                                       | Why this is dangerous                                                              |
| --------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **FR-SCAN-06**        | Configurable search filters                       | Users can submit invalid filter combos that crash the scanner                      |
| **FR-SCAN-07**        | Saved search configurations                       | Saved-search persistence + retrieval is core to repeat usage; untested             |
| **FR-DASH-13**        | Landing page                                      | Implementation exists but conversion-critical UI has no acceptance test            |
| **NFR-PERF-01..04**   | Page load <2s, scraper <60s, AI <10s, SSE <1s     | These are SLA promises with no automated verification; they will silently regress  |
| **NFR-SEC-01**        | All traffic over HTTPS                            | Easy to verify via header check; absence is a P1 ops gap                           |
| **NFR-SEC-07**        | Security headers (CSP, HSTS, X-Frame-Options)     | Trivially testable; no test today                                                  |
| **NFR-SEC-10**        | No critical/high vulns in deps                    | Should be a CI gate (`npm audit --production --audit-level=high`)                  |
| **NFR-SCALE-01**      | Cloud Run auto-scaling 0-N                        | Hard to acceptance-test; needs synthetic load test                                 |
| **NFR-SCALE-03**      | AI analysis caching 24h TTL                       | Cache hit/miss behavior unverified                                                 |
| **NFR-RELY-01**       | Graceful degradation when AI APIs unavailable     | Fallback path is critical — no test ensures it works                              |
| **NFR-RELY-02**       | Scraper retry + exponential backoff               | Retry math is unverified; could be too aggressive (infinite loop) or too timid    |
| **NFR-TEST-01..04**   | Coverage thresholds and traceability discipline   | Self-referential; should be CI gates                                              |
| **NFR-UX-01**         | Mobile-responsive (mobile-first)                  | Visual regression tests don't currently fail on viewport-specific bugs            |
| **NFR-UX-02**         | WCAG AA accessibility                             | Axe runs in some specs but no global WCAG-AA gate                                  |
| **NFR-UX-03**         | Consistent design system (Tailwind 4)             | Subjective, but Story 14.1's design tokens make automated checking possible       |
| **NFR-UX-04**         | Toast notification system                         | Toast helpers are tested; the *user-visible* behavior is not                       |
| **NFR-UX-05**         | Global error boundary + retry                     | Error boundaries fire silently — easy to break without anyone noticing             |

**Verdict:** All NFRs marked Pending need at least one verifying scenario each. Concrete BDD stubs for every Pending NFR are in `PROPOSED_BDD_SCENARIOS.md` §3.

---

## §4 — Code Modules Without Unit Tests

Cross-referenced every `.ts` file in `src/lib/` and `src/scrapers/` against `src/__tests__/`. Modules that **don't have a corresponding `*.test.ts`**:

| Module                                     | Status                                                                     | Action                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/lib/ai/index.ts` (`completeAI()`)     | **No direct test for completeAI**; provider tests exist                    | Add `src/__tests__/lib/ai/index.test.ts` for fallback chain logic        |
| `src/lib/ai/prompts/index.ts`              | No test for `getPrompt()` registry                                         | Add `src/__tests__/lib/ai/prompts.test.ts`                                |
| `src/lib/billing-events.ts`                | No test                                                                    | Add — billing event taxonomy needs validation                             |
| `src/lib/cache.ts`                         | No test                                                                    | Add — cache behavior is critical for AI cost                              |
| `src/lib/cold-hot-detector.ts`             | No test                                                                    | Add                                                                       |
| `src/lib/communication-email-templates.ts` | No test                                                                    | Add                                                                       |
| `src/lib/communication-notification.ts`    | No test                                                                    | Add                                                                       |
| `src/lib/comp-matcher.ts`                  | No direct test (covered indirectly via market-price)                       | Add — comp-matching is FR-SCORE-17 logic                                  |
| `src/lib/conversation-status.ts`           | No test                                                                    | Add                                                                       |
| `src/lib/cross-platform-price.ts`          | No test                                                                    | Add — Epic 13.8                                                           |
| `src/lib/demand-analyzer.ts`               | No test                                                                    | Add — Epic 13.6                                                           |
| `src/lib/distance-calculator.ts`           | No test                                                                    | Add                                                                       |
| `src/lib/firebase/admin.ts`                | No test                                                                    | Add — server-side Firebase admin init is brittle                         |
| `src/lib/firebase/auth-middleware.ts`      | Indirect via auth-middleware                                               | Add explicit                                                              |
| `src/lib/firebase/auth.ts`                 | Indirect                                                                   | Add explicit                                                              |
| `src/lib/firebase/config.ts`               | Trivial; OK to skip                                                        | Skip                                                                      |
| `src/lib/firebase/ensure-user.ts`          | No test                                                                    | Add — user-creation idempotency is critical                              |
| `src/lib/firebase/session.ts`              | No test                                                                    | Add                                                                       |
| `src/lib/maps-service.ts`                  | No test                                                                    | Add                                                                       |
| `src/lib/meeting-reminder-scheduler.ts`    | No test                                                                    | Add                                                                       |
| `src/lib/message-generator.ts`             | One test exists at `src/__tests__/message-generator.test.ts`                | Verify it covers all message types; FR-COMM-02                            |
| `src/lib/seller-reputation-analyzer.ts`    | Test exists but limited                                                    | Expand                                                                    |
| `src/lib/sms-service.ts`                   | Test exists                                                                | Verify error path coverage                                               |
| `src/lib/usage-tracker.ts`                 | Test exists                                                                | Verify month-rollover and tier-change coverage                            |

**Recommendation:** Add ~18 new unit test files. Each is small (~100-200 LOC). Estimated total effort: 2-3 working days.

---

## §5 — Test Types Missing Entirely

These categories of tests aren't represented in the codebase at all:

### 5.1 Performance regression tests

**What's missing:** Automated assertions that pages load <2s, scrapers complete <60s, AI analyses <10s, SSE delivers <1s (NFR-PERF-01..04).

**What exists:** `test/e2e/performance-vitals.spec.ts` measures Web Vitals but doesn't *fail* on regression.

**Recommendation:** Add `@perf` Playwright tests with explicit thresholds. See `PROPOSED_BDD_SCENARIOS.md` §3.1.

---

### 5.2 Security regression tests in CI

**What's missing:**
- DAST scan (e.g., OWASP ZAP) against production-like build
- SAST scan (e.g., Semgrep, GitGuardian) for newly introduced patterns
- Dependency vulnerability check as a CI *gate*, not just a notification (NFR-SEC-10)
- Header-presence assertions (NFR-SEC-07)
- HTTPS-only enforcement assertions (NFR-SEC-01)

**What exists:** `src/__tests__/security/` has ~3 unit tests for hCaptcha and auth security, plus `docs/security/SECURITY_AUDIT.md` (manual).

**Recommendation:**
1. Add `pnpm audit --audit-level=high` as a CI gate
2. Add Semgrep workflow with the OWASP ruleset
3. Add a single Playwright spec that asserts every required security header is present on `/`, `/dashboard`, `/api/health`

---

### 5.3 Visual regression per-PR

**What's missing:** Most Playwright specs take screenshots but the CI doesn't *fail* on pixel diff against a baseline.

**What exists:** `test/e2e/visual-regression.spec.ts` exists but historically has been allowed to fail soft.

**Recommendation:** Tighten to fail the CI on >1% pixel diff with a manual review override label. Run on chromium + firefox + webkit + mobile viewport.

---

### 5.4 Contract tests for external APIs

**What's missing:** Tests that detect **breaking changes in external APIs we depend on**:
- eBay Browse API response shape changes
- Stripe webhook event payload changes
- Firebase Auth response format changes
- Resend transactional email API
- Google Maps API response shape

**Why it matters:** Today, an upstream API breaking change shows up as a runtime error in production. Contract tests catch it earlier.

**Recommendation:** Add Pact-style contract tests or a simpler "snapshot a real API response, fail if shape changes" approach. Out of scope for v1; track for v1.1.

---

### 5.5 Load / soak tests

**What's missing:** A repeatable "1,000 concurrent scans" or "100 simultaneous SSE connections" test.

**What exists:** `src/__tests__/performance/load-test.ts` exists but is a single file; isn't run on a schedule.

**Recommendation:** Run `autocannon` against staging weekly via GitHub Actions schedule; alert on regression.

---

### 5.6 Smoke-tag suite for production monitoring

**What's missing:** A `@smoke` tag on the ~20 most critical Playwright specs so a "is production working?" run takes 5 minutes, not 60.

**Recommendation:** Tag now. Run hourly against production via GitHub Actions schedule.

---

## §6 — BDD Step Definitions: Missing

The `test/acceptance/step_definitions/` directory has files for Epics 1, 2, 3, but **gaps for Epics 4-14**. The feature files exist but lack step definitions in many places — meaning the scenarios are essentially stubbed but don't *run*.

Quick check: features that exist but step-defs may be incomplete:

- E-004 (scoring) — partial step defs
- E-005 (advanced market intelligence) — limited step defs
- E-006 (lifecycle/analytics) — limited
- E-007 (subscription/billing) — limited
- E-008 (communication) — partial
- E-009 (cross-platform listing) — limited
- E-010 (monitoring/email) — limited
- E-011 (push/SMS) — limited
- E-012 (meeting/logistics) — limited
- E-013 (scoring improvements) — limited
- E-014 (frontend design) — partial (recently added)

**Recommendation:** A step-definition completion sprint could close most BDD gaps without writing any new scenarios. Estimated 3-5 working days to bring Epic 4-14 step defs to full passing state.

---

## §7 — Quick Wins (Highest ROI)

If you have one week to improve coverage, prioritize these:

1. **Add NFR-SEC-07 header presence test** (1 hour) — catches security regressions instantly
2. **Add `@smoke` tag to 20 critical specs** (2 hours) — enables fast prod monitoring
3. **Add `pnpm audit --audit-level=high` as CI gate** (30 min) — validates NFR-SEC-10
4. **Add NFR-PERF-01 page-load test** (1 hour per page, 5 pages = 5 hours)
5. **Add unit tests for the 18 modules without coverage** (2-3 days)
6. **Add 5 contract tests for Stripe webhook events** (4 hours)
7. **Add fallback-chain test for `completeAI()`** (3 hours) — verifies NFR-RELY-01

**Total:** 1 working week buys you full NFR-SEC + NFR-PERF + NFR-RELY-01 coverage, smoke-tag suite, and unit tests for every module.

---

## §8 — Long Tail (post-launch v1.1)

- Contract tests for external APIs (eBay, Stripe, Firebase, Resend, Maps)
- Visual regression with per-PR baseline updates
- Soak / load tests with weekly schedule
- Synthetic prod monitoring via the smoke-tag suite
- Mutation testing (Stryker) on critical scoring logic
- Property-based tests (fast-check) on the scoring math
- SAST in CI (Semgrep with OWASP ruleset)
- DAST in staging (OWASP ZAP via GitHub Action)

---

## §9 — Recommended Order of Operations

```
Week 1  ─┐
         │  Quick Wins §7 (NFR-SEC + NFR-PERF + smoke tag + missing units)
Week 2  ─┘
Week 3  ─┐
         │  Add new FRs from PROPOSED_FR_ADDITIONS.md to epics.md
Week 4  ─┤  Update traceability matrix
         │  Add BDD scenarios from PROPOSED_BDD_SCENARIOS.md
Week 5  ─┘
Week 6+ ─┐
         │  Long tail: contract tests, mutation testing, DAST/SAST, soak tests
         ─
```

This sequence keeps the test pyramid healthy: unit foundation → acceptance behavior → operational verification → exploratory/property/security.

---

## §10 — Files To Create

This audit produces three companion documents. They live in `docs/testing/` and should be merged into `_bmad-output/test-artifacts/` as the source of truth once you've reviewed.

| File                                                  | Purpose                                                                |
| ----------------------------------------------------- | ---------------------------------------------------------------------- |
| `docs/testing/COVERAGE_GAP_ANALYSIS.md` (this file)   | The audit itself                                                       |
| `docs/testing/PROPOSED_FR_ADDITIONS.md`               | New FRs to fill the gaps (ready to merge into `epics.md`)              |
| `docs/testing/PROPOSED_BDD_SCENARIOS.md`              | Gherkin scenario stubs for new FRs and Pending NFRs                     |

After review, the FR additions get merged into `_bmad-output/planning-artifacts/epics.md`, the scenarios into the appropriate `test/acceptance/features/E-NNN-*.feature` files, and the traceability matrix gets updated.

---

## §11 — One-page summary

| Surface                                                       | Coverage status                                          |
| ------------------------------------------------------------- | -------------------------------------------------------- |
| **Unit tests**                                                | 99%+ on covered modules; 18 modules need new test files  |
| **Functional behavior (FR catalog)**                          | 119 FRs; 17 functional surfaces in code lack any FR      |
| **BDD acceptance**                                            | 86% of requirement rows covered; 25 Pending             |
| **Non-functional (NFR catalog)**                              | 30 NFRs; 16 marked Pending                               |
| **Security testing**                                          | Audit doc exists; no automated security regression in CI |
| **Performance testing**                                       | Web Vitals measured but not gated                        |
| **Visual regression**                                         | Specs exist; CI doesn't fail on pixel diff                |
| **Contract tests for external APIs**                          | None                                                     |
| **Smoke-tag suite for prod monitoring**                       | Not implemented                                          |
| **Production deploy verification**                            | `scripts/deploy/verify-deployment.sh` exists, manual      |
| **Mutation testing**                                          | Not implemented                                          |
| **Property-based tests**                                      | Not implemented                                          |
| **Load / soak tests**                                         | Single script; not scheduled                              |

**Net assessment:** **Code-level coverage is excellent. Behavioral and operational coverage has gaps that map cleanly to a 4-week tightening plan.** Nothing here blocks launch — but every gap left open is a future regression you'll have to debug under pressure.
