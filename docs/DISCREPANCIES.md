# Codebase Discrepancies Report — Deep Audit

> **Generated:** 2026-04-12 | **Branch:** django-main
> **Audit scope:** 6 parallel agents — CLAUDE.md, README, configs, docs, Makefile/scripts, RTM/tests
> **Total checks:** 80+ | **Findings:** 28
>
> Review each item and mark your decision. I'll execute the fixes.

---

## 1 — CRITICAL: Broken Paths (test/features deleted but still referenced)

The legacy `test/features/` directory was deleted but 4 config files still point to it.

| # | File | Line | Reference | Fix |
|---|------|------|-----------|-----|
| 1a | `Makefile` | ~134 | `test-acceptance` target runs `cucumber-js test/features` | Change to `test/acceptance` |
| 1b | `package.json` | ~27 | `test:bdd:watch` watches `test/features` | Change to `test/acceptance` |
| 1c | `CLAUDE.md` | ~190 | "Two test directories — `test/features/` (legacy) and `test/acceptance/features/`" | Remove legacy reference |
| 1d | `tsconfig.json` | ~42 | `exclude` array lists `test/features` | Change to `test/acceptance` |


**Response:** Please remove all stale deleted file references from everywhere you find them including these!

---

## 2 — CRITICAL: Scripts still reference NEXTAUTH env vars

5 shell scripts in `scripts/` still use `NEXTAUTH_URL` and `NEXTAUTH_SECRET` which no longer exist.

| # | File | Lines | Issue |
|---|------|-------|-------|
| 2a | `scripts/deploy/deploy-production.sh` | 108, 294 | Checks/sets `NEXTAUTH_SECRET`, `NEXTAUTH_URL` |
| 2b | `scripts/deploy/validate-deployment.sh` | 99-100 | Validates `NEXTAUTH_SECRET`, `NEXTAUTH_URL` |
| 2c | `scripts/secrets/pull-from-gcp.sh` | 17 | Lists `NEXTAUTH_URL` as a secret to pull |
| 2d | `scripts/setup/setup-acceptance-tests.sh` | 78-79 | Creates `.env.test` with `NEXTAUTH_SECRET`, `NEXTAUTH_URL` |
| 2e | `scripts/setup/migrate-env-to-firebase.sh` | 62, 90 | References `NEXTAUTH_SECRET`, `NEXTAUTH_URL` |

**Fix:** Replace `NEXTAUTH_URL` with `APP_URL`, `NEXTAUTH_SECRET` with `ENCRYPTION_SECRET` or remove entirely where Firebase Auth makes them unnecessary.
**Response:**  2a -> Definitely remove these secrets from any deployment scripts... since we do not use NEXT AUTH at all in deployment
2b -> Remove any reference of next auth
2c -> Remove the reference of next auth and make sure the script is up to date with all secrets available.  Maybe add a header comment that is maintained describing all of the secrets stored in the secret manager?  
2d -> Remove next auth references.
2e -> Remove next auth secret.  Honestly, we should remove this entire script since we have already migrated to firebase right? 


---

## 3 — CRITICAL: RTM misrepresents test coverage

| # | Issue | Details |
|---|-------|---------|
| 3a | FR-BILLING-03 marked "Covered" but all 8 scenarios are `@wip` | RTM says covered, but scenarios @E-007-S-1 through S-10 all have `@wip` tag — they don't execute in test runs |
| 3b | FR-SCAN-01 marked "Pending" but has 7 written scenarios | RTM understates coverage |
| 3c | FR-SCAN-10 marked "Pending" but has 10 written scenarios | RTM understates coverage |
| 3d | FR-DASH-09 marked "Pending" but has 2 written scenarios | RTM understates coverage |

**Fix:** Update RTM: reclassify 3b-3d as "Covered". For 3a, either remove `@wip` if scenarios work, or reclassify as "Pending" in RTM.

---

## 4 — HIGH: README badges and counts are stale

| # | Claim | Actual | Fix |
|---|-------|--------|-----|
| 4a | Badge: "tests-4824" / "test suites-218" | **4,545 tests / 193 suites** (verified via `make test`) | Update badges |
| 4b | "70 scenarios / 572 steps" | **477 scenarios** across 12 feature files | Update count |
| 4c | Stagehand + Gemini described as primary AI | Claude (`@anthropic-ai/sdk`) is primary AI; Stagehand/Gemini only used for Facebook scraping | Clarify description |
| 4d | API endpoint table lists ~16 of 81 routes | 81 `route.ts` files exist in `app/api/` | Add note or expand table |

---

## 5 — HIGH: docs/data-models.md missing 7 Prisma models

Schema has 18 models but docs only describe 11 active ones. These 7 are undocumented:

| Model | Purpose | Added by Story |
|-------|---------|----------------|
| `DeviceToken` | FCM push notification device tokens | 11.1 |
| `GoogleCalendarToken` | Google Calendar OAuth tokens | 12.1 |
| `ListingImage` | Image storage management | 3.x |
| `UsageRecord` | Subscription usage tracking | 7.x |
| `PasswordResetToken` | Password reset flow | 2.x |
| `MonitoringJob` | Background monitoring job tracking | 10.1 |
| `NotificationEvent` | Notification events queue | 10.1 |

**Fix:** Add these 7 models to `docs/data-models.md`.

---

## 6 — HIGH: .env.example out of sync with code

### 6a. Used in code but NOT documented (13 vars)

| Variable | Used in |
|----------|---------|
| `ANTHROPIC_API_KEY` | `src/lib/claude-analyzer.ts` |
| `CLAUDE_API_KEY` | `src/lib/claude-analyzer.ts` (fallback) |
| `CLAUDE_MODEL` | `src/lib/claude-analyzer.ts` |
| `APP_VERSION` | `src/lib/version.ts` |
| `DB_MAX_CONNECTIONS` | database config |
| `EBAY_INVENTORY_API_BASE_URL` | `src/scrapers/ebay/` |
| `NEXT_PUBLIC_AI_PROVIDER` | `app/health/page.tsx` |
| `NEXT_PUBLIC_APP_URL` | components |
| `COMM_NOTIFICATION_CIRCUIT_BREAKER_THRESHOLD` | `src/lib/communication-notification.ts` |
| `NEGOTIATION_STRATEGY_CACHE_TTL_HOURS` | messaging |
| `LOAD_TEST_URL` | performance tests |
| `METRICS_TOKEN` | monitoring |

### 6b. Documented in .env.example but NOT used in code (notable)

| Variable | Notes |
|----------|-------|
| `SENTRY_AUTH_TOKEN` | Only used at build time for source maps, not in app code |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Same — build-time only |
| `ENABLE_OAUTH_FACEBOOK` | Feature flag documented but never checked in code |
| Most `MONITORING_*` vars (13 of 15) | Documented but hardcoded or unused in actual monitoring code |

**Fix:** Add the 13 undocumented vars to `.env.example`. For the unused ones, either implement them or add a comment explaining they're reserved for future use.

---

## 7 — MEDIUM: CLAUDE.md inaccuracies

| # | Section | Claim | Actual | Fix |
|---|---------|-------|--------|-----|
| 7a | Testing Architecture (line ~190) | "Two test directories" — references `test/features/` | Only `test/acceptance/features/` exists | Remove legacy reference |
| 7b | Testing Architecture (line ~191) | "Runs against production build via `start-server-and-test`" | Actually runs against dev server (`pnpm dev`) | Update description |
| 7c | Provider Stack | Lists `SessionProvider` | Actual component is `FirebaseAuthProvider` (SessionProvider is a compat wrapper) | Update to FirebaseAuthProvider |

---

## 8 — MEDIUM: 64 @wip scenarios across 3 epics

These scenarios exist but are excluded from test runs:

| Feature File | @wip Count | FRs Affected |
|---|---|---|
| E-002-user-registration-auth-onboarding.feature | 38 | Auth/onboarding FRs |
| E-003-multi-marketplace-scanning.feature | 11 | FR-SCAN-08, FR-SCAN-09 |
| E-007-subscription-billing.feature | 15 | FR-BILLING-01 through FR-BILLING-11 |
| **Total** | **64** | |

**Not a bug** — these are intentionally WIP. But the RTM should accurately reflect that these are not yet executing (see item 3a).

---

## 9 — LOW: docs/development-guide.md mentions SQLite

Lines 9 and 101 reference SQLite as a local dev option (`DATABASE_URL=file:./dev.db`), but `prisma/schema.prisma` hardcodes `provider = "postgresql"`. SQLite is not actually supported.

**Fix:** Remove SQLite references or add a note that PostgreSQL is required even for local dev.

---

## 10 — LOW: Duplicate Makefile test targets

`make test-acceptance` (line 134) and `make test-ac` (line 152) do similar things with different configs. `test-acceptance` is broken (wrong path), `test-ac` works correctly.

**Fix:** After fixing `test-acceptance` path (item 1a), consider whether both targets are needed or if one should be an alias.

---

## Verification Passes (no issues found)

These areas were audited and found clean:

| Area | Status |
|------|--------|
| CLAUDE.md tech stack versions | PASS — all match package.json |
| CLAUDE.md project layout | PASS — all directories exist |
| CLAUDE.md error hierarchy | PASS — all 8 error classes verified |
| CLAUDE.md auth flow | PASS — Firebase Auth accurate |
| CLAUDE.md database section | PASS — PrismaPg, dedup key verified |
| CLAUDE.md scraper architecture | PASS — all 5 platforms verified |
| CLAUDE.md scoring pipeline | PASS — formula, cache, thresholds verified |
| CLAUDE.md coverage thresholds | PASS — 96/98/99/99 matches jest.config.js |
| README version (1.0.1) | PASS — matches package.json and VERSION.md |
| README tech stack (Firebase, Cloud Run) | PASS — no NextAuth/Vercel refs |
| project-context.md | PASS — tech stack, Board ID, conventions correct |
| Prisma schema models | PASS — all 18 models used in code |
| package.json versions | PASS — matches VERSION.md |
| docs/api-contracts.md | PASS — 10 endpoints verified |
| docs/deployment/DEPLOYMENT.md | PASS — Cloud Run + Firebase accurate |
| docs/api/openapi.yaml | PASS — 5 endpoints verified, auth scheme correct |
| Feature file triple-tags | PASS — 477/477 (100%) properly tagged |
| Step definition organization | PASS — 56 files, well-organized by epic |
| CI workflows (.github/) | PASS — correct env vars, no legacy refs |
| Legacy tech refs in docs/ | PASS — only historical context remains |

---

## Summary

| Severity | Count | Items |
|----------|-------|-------|
| CRITICAL | 4 issues (17+ files) | Broken paths, NEXTAUTH in scripts, RTM misrepresentation, functions/ schema divergence |
| HIGH | 6 issues | README badges, missing data models, env var gaps, missing API endpoint, OpenAPI mismatches, functions/ unused deps |
| MEDIUM | 4 issues | CLAUDE.md inaccuracies, @wip scenarios, console.log in prod code, .env.production.example stale |
| LOW | 3 issues | SQLite mention, duplicate Makefile targets, orphaned Dockerfile |
| PASS | 24 areas | Verified clean |

---

## ADDENDUM: Deep Dive Pass 2 (additional findings)

> 4 additional agents scanned: components, API routes vs OpenAPI, functions/ directory, stale code patterns

---

## 11 — CRITICAL: functions/ has diverged Prisma schema with NextAuth models

- **File:** `functions/prisma/schema.prisma`
- **Issue:** Separate Prisma schema from the main app. Still contains deprecated NextAuth models (`Account`, `Session`, `VerificationToken`) with comments like "NextAuth.js User model". Main app schema had these removed.
- **Impact:** Functions use a different, outdated schema. Separate migrations directory risks schema divergence.
- **Fix:** Either consolidate to a single shared schema, or update functions schema to match main app.

---

## 12 — HIGH: WebVitals component calls non-existent API endpoint

- **File:** `src/components/WebVitals.tsx` (lines 36, 38)
- **Issue:** Calls `POST /api/health/vitals` via `sendBeacon()` and `fetch()`. This endpoint does NOT exist.
- **Impact:** Web Vitals data silently dropped — all calls return 404.
- **Fix:** Create `app/api/health/vitals/route.ts` or update component to use `/api/health/metrics`.

---

## 13 — HIGH: OpenAPI spec claims methods that don't exist in code

| Endpoint | OpenAPI Claims | Code Has | Mismatch |
|----------|---------------|----------|----------|
| `/api/opportunities` | GET, POST | GET only | POST missing from code |
| `/api/analyze/{listingId}` | GET, POST | GET, DELETE | POST missing, DELETE undocumented |
| `/api/search-configs/{id}` | GET, PUT | GET, PATCH, DELETE | PUT should be PATCH, DELETE undocumented |

Response shape mismatches: several routes return `{ success, data, pagination }` but OpenAPI documents flat `{ listings, total, limit, offset }`.

---

## 14 — HIGH: 14 API routes undocumented in OpenAPI spec

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/diagnostics` | GET | System diagnostics |
| `/api/monitoring/run` | POST | Internal monitoring cron |
| `/api/meeting-reminders/run` | POST | Internal reminder cron |
| `/api/notifications/process` | POST | Internal notification processor |
| `/api/posting-queue/process` | POST | Internal queue processor |
| `/api/reports/generate` | GET, POST | Report generation |
| `/api/analytics/export` | GET | Analytics data export |
| `/api/analytics/profit-loss` | GET | Profit/loss analytics |
| `/api/inventory/roi` | GET | ROI calculations |
| `/api/checkout/portal` | POST | Stripe billing portal |
| `/api/webhooks/stripe` | POST | Stripe webhook receiver |
| `/api/descriptions` | POST | Batch description generation |
| `/api/usage` | GET | User API usage stats |
| `/api/test/seed-user` | POST | Test-only user seeding |

---

## 15 — HIGH: 4 unused dependencies in functions/package.json

| Package | Status |
|---------|--------|
| `@anthropic-ai/sdk` | Not imported anywhere in functions/src/ |
| `openai` | Not imported anywhere in functions/src/ |
| `zod` | Not imported anywhere in functions/src/ |
| `firebase-admin` | Not imported (only `firebase-functions` is used) |

---

## 16 — MEDIUM: .env.production.example still has NextAuth

- **File:** `.env.production.example` (lines 16, 19)
- **Issue:** Section header `# ---- Auth (NextAuth.js) ----` and `NEXTAUTH_URL`
- **Fix:** Replace with `APP_URL` and Firebase Auth header.

---

## 17 — MEDIUM: ~40+ console.log statements in production code

Hotspots: `app/api/webhooks/stripe/route.ts` (5), `src/scrapers/facebook/scraper.ts` (10), `src/scrapers/craigslist/scraper.ts` (5), `src/lib/price-history-service.ts` (5), scraper API routes (8+). Should use `logger` from `src/lib/logger.ts`.

---

## 18 — MEDIUM: scripts/test/test-all-flows.sh references NextAuth

- **File:** `scripts/test/test-all-flows.sh` (line 97)
- **Content:** `"Testing Login Flow (TODO - requires NextAuth session)"`
- **Fix:** Update to reference Firebase Auth.

---

## 19 — LOW: Orphaned Dockerfile in functions/

- **File:** `functions/src/craigslist/Dockerfile`
- **Issue:** Orphaned after `functions/src/craigslist/index.ts` was deleted. Active Dockerfile is `functions/Dockerfile.playwright`.
- **Fix:** Delete file and empty directory.

---

## 20 — LOW: Placeholder Cloud Functions (Facebook, Mercari)

- **Files:** `functions/src/scrapers/facebook.ts`, `functions/src/scrapers/mercari.ts`
- **Issue:** Deployed but return empty results with TODO comments. Main app has real implementations.
- **Fix:** Either implement or stop deploying. Not urgent.

---

## Additional Passes (no new issues)

| Area | Status |
|------|--------|
| All src/components/ files | PASS — 0 orphaned, all imported and used |
| All context providers | PASS — wired into app/layout.tsx |
| Component lib imports | PASS — all reference existing modules |
| No stale next-auth imports in code | PASS — zero `from 'next-auth'` |
| API route module imports | PASS — all resolve correctly |
| helpers/ directory | PASS — Python scripts for GCP, properly referenced |
| config/ directory | PASS — Docker, Cloud Run, Firebase configs current |
