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

**Response:** 
- *3a* -> Modify the RTM so that it mentions that the tests are still @wip and not fully tested yet.  Make a high priority action item to get these tests / functionality fully implemented ASAP.
- *3b* -> Update RTM to match real coverage
- *3c* -> Update RTM to match real coverage
- *3d* -> Update RTM to match real coverage

---

## 4 — HIGH: README badges and counts are stale

| # | Claim | Actual | Fix |
|---|-------|--------|-----|
| 4a | Badge: "tests-4824" / "test suites-218" | **4,545 tests / 193 suites** (verified via `make test`) | Update badges |
| 4b | "70 scenarios / 572 steps" | **477 scenarios** across 12 feature files | Update count |
| 4c | Stagehand + Gemini described as primary AI | Claude (`@anthropic-ai/sdk`) is primary AI; Stagehand/Gemini only used for Facebook scraping | Clarify description |
| 4d | API endpoint table lists ~16 of 81 routes | 81 `route.ts` files exist in `app/api/` | Add note or expand table |

**Response:**
- *4a* -> Update badges approved.
- *4b* -> Update count approved.
- *4c* -> Clarify description approved - align everything everywhere.  Maybe we need a docs/AI-Agents/ directory as the single source of truth for design decisions around AI agents.  Let's get that created and referenced in the `project-context.md` file and the `CLAUDE.md` file.
- *4d* -> Expand table to completely list all routes please.

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

**Response:** Fix approved. Make sure all documentation is up to date!

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

**Response:** Add them to documentation including any secretmanager documentation and .env files.

### 6b. Documented in .env.example but NOT used in code (notable)

| Variable | Notes |
|----------|-------|
| `SENTRY_AUTH_TOKEN` | Only used at build time for source maps, not in app code |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Same — build-time only |
| `ENABLE_OAUTH_FACEBOOK` | Feature flag documented but never checked in code |
| Most `MONITORING_*` vars (13 of 15) | Documented but hardcoded or unused in actual monitoring code |

**Fix:** Add the 13 undocumented vars to `.env.example`. For the unused ones, either implement them or add a comment explaining they're reserved for future use.
**Response:** Add comment explaining they are not implemented in code and stored to remind us of future implementation use cases.

---

## 7 — MEDIUM: CLAUDE.md inaccuracies

| # | Section | Claim | Actual | Fix |
|---|---------|-------|--------|-----|
| 7a | Testing Architecture (line ~190) | "Two test directories" — references `test/features/` | Only `test/acceptance/features/` exists | Remove legacy reference |
| 7b | Testing Architecture (line ~191) | "Runs against production build via `start-server-and-test`" | Actually runs against dev server (`pnpm dev`) | Update description |
| 7c | Provider Stack | Lists `SessionProvider` | Actual component is `FirebaseAuthProvider` (SessionProvider is a compat wrapper) | Update to FirebaseAuthProvider |

**Response:** Approve all suggested fixes for *7a*, *7b*, & *7c*.

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

**Response:** Update RTM to accurately capture @wip scenarios.  Scan for more and make sure everything is aligned and updated in the RTM please.

---

## 9 — LOW: docs/development-guide.md mentions SQLite

Lines 9 and 101 reference SQLite as a local dev option (`DATABASE_URL=file:./dev.db`), but `prisma/schema.prisma` hardcodes `provider = "postgresql"`. SQLite is not actually supported.

**Fix:** Remove SQLite references or add a note that PostgreSQL is required even for local dev.

**Response:** Fix approved.  Make sure the entire project is aligned please.

---

## 10 — LOW: Duplicate Makefile test targets

`make test-acceptance` (line 134) and `make test-ac` (line 152) do similar things with different configs. `test-acceptance` is broken (wrong path), `test-ac` works correctly.

**Fix:** After fixing `test-acceptance` path (item 1a), consider whether both targets are needed or if one should be an alias.

**Response:** Make `make test-acceptance` work please.  `make test-ac` should be an alias for `make test-acceptance` which should run the full BDD acceptance test framework that uses playwright and other tools to test the full application e2e functionality and covers all FR's and AC's and test scenario traceability are captured in the RTM.

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
| CRITICAL | 3 issues (12 files) | Broken paths, NEXTAUTH in scripts, RTM misrepresentation |
| HIGH | 3 issues | README badges, missing data models, env var gaps |
| MEDIUM | 2 issues | CLAUDE.md inaccuracies, @wip scenario awareness |
| LOW | 2 issues | SQLite mention, duplicate Makefile targets |
| PASS | 20 areas | Verified clean |
