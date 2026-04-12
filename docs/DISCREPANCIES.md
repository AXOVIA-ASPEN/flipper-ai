# Codebase Discrepancies Report

> **Generated:** 2026-04-12
> **Branch:** django-main
> **Audit scope:** Full codebase — documentation vs implementation alignment
> **Last updated:** 2026-04-12

This document lists discrepancies between Flipper.ai's documentation and actual
implementation that require human decision-making to resolve.

---

## RESOLVED (this session)

### ~~1. project-context.md claims NextAuth 5~~ — FIXED
Updated `_bmad-output/project-context.md` to reflect Firebase Auth as the sole auth system.

### ~~2. README.md claims SQLite~~ — FIXED
Updated all README.md database references to PostgreSQL. Removed SQLite env example, updated tech stack table, removed migration-pending note.

### ~~4. Epic 12 tests excluded in jest.config.js~~ — FIXED
Removed all Epic 12 test exclusion patterns from `jest.config.js`. All 4 Google Calendar test files + maps-service test are now included in the default test run.

### ~~6. CLAUDE.md app layout incomplete~~ — FIXED
Expanded the `app/` directory listing from 5 to 15 directories including analytics, listings, messages, posting-queue, scraper, and more.

---

## OPEN — Requires Decision

### ~~3. .env.example documents services that are only partially implemented~~ — KEPT INTENTIONALLY
Env vars for Shippo, Geoapify, and Google Maps kept as-is. These stories are on the roadmap and the vars serve as documentation of what services to configure.

### 5. README.md BDD feature list uses legacy naming convention

- **File:** `README.md` (lines ~115–125)
- **Doc claims:** Features named `01-marketplace-scanning`, `02-ai-analysis`, etc.
- **Reality:** Active tests use epic-based naming: `E-001-*.feature`, `E-002-*.feature` in `test/acceptance/features/`. The legacy `test/features/` directory still exists and is used by `make test-acceptance`, but the newer epic-organized tests are in `test/acceptance/` and used by `make test-ac`.
- **Decision needed:** Migrate legacy `test/features/` scenarios into `test/acceptance/` and update `make test-acceptance` target? Or keep both test directories?

### 7. Jest coverage thresholds set higher than achieved coverage

- **Files:** `jest.config.js` (lines 78–82), CLAUDE.md
- **Thresholds:** branches ≥96%, functions ≥98%, lines ≥99%, statements ≥99%
- **Actual (per jest.config.js comment):** statements 98.21%, branches 92.37%, functions 98.66%, lines 98.48%
- **Note:** These are aspirational DoD thresholds. Not a bug, but the gap is worth tracking — especially branches at 92% vs 96% target. Re-enabling Epic 12 tests may further affect these numbers.

### 8. Deprecated NextAuth models still in Prisma schema

- **File:** `prisma/schema.prisma` (lines ~220–261)
- **Models:** `Account`, `Session`, `VerificationToken` — each marked with "Deprecated: NextAuth — kept for backward compatibility during migration. Removal planned in future cleanup story."
- **Decision needed:** Schedule a cleanup story to drop these models and create a migration to remove the tables, or accept as tech debt for now?

### 9. Unused `@prisma/adapter-libsql` dependency

- **File:** `package.json`
- **Reality:** `@prisma/adapter-libsql` is installed but never imported in any source file. The codebase uses `@prisma/adapter-pg` exclusively.
- **Decision needed:** Remove `@prisma/adapter-libsql` from dependencies?

---

## What Was Cleaned Up (previous commit)

For reference, the following stale/orphaned files were removed in the cleanup commit:

**Orphaned components (never imported by any page):**
- `src/components/AIPreferencesSettings.tsx` + test
- `src/components/APIKeySettings.tsx` + test
- `src/components/ProfileSettings.tsx` + test
- `src/components/ScanningPreferencesSettings.tsx`
- `src/components/ErrorBoundary.tsx` + test
- `src/components/OnboardingGuard.tsx` + test

**Orphaned hook:**
- `src/hooks/useThemeClasses.ts` + test

**Stale API routes:**
- `app/api/scraper/craigslist/route.v2.ts` + test (abandoned Cloud Functions refactor)
- `app/api/scrape/facebook/route.ts` + test (duplicate of `/api/scraper/facebook`)

**Stale config/assets:**
- `prisma.config.ts` (unused by Prisma v7)
- `dev.db` (SQLite database tracked in git — should never have been committed)
- `scripts/refactor-error-handling.ts` (one-time migration utility)
- `public/vercel.svg`, `next.svg`, `file.svg`, `globe.svg`, `window.svg` (Next.js boilerplate)
- `.kilocodemodes` + `.kilocode/` (discontinued editor config)

**Stale docs:**
- `docs/archive/` (legacy reports, old BDD tests, old deployment logs)
- `docs/stories/` (empty placeholder — stories live in `_bmad-output/`)

**Stale BMAD artifacts:**
- `_bmad-output/implementation-artifacts/2-5-onboarding-wizard.md` (duplicate — canonical copy in `epic-2/`)
- `_bmad-output/implementation-artifacts/story-dev-prompt.md` (orphaned template)

**Organized (moved, not deleted):**
- 10 story files for epics 10, 11, 12 moved from root `implementation-artifacts/` into proper `epic-10/`, `epic-11/`, `epic-12/` subdirectories

**Backup layout:**
- `app/layout-backup.tsx` (duplicate of current `app/layout.tsx`)
