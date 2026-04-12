# Codebase Discrepancies Report

> **Generated:** 2026-04-12
> **Branch:** django-main
> **Audit scope:** Full codebase — documentation vs implementation alignment

This document lists discrepancies between Flipper.ai's documentation and actual
implementation that require human decision-making to resolve.

---

## HIGH Severity

### 1. project-context.md claims NextAuth 5 — codebase uses Firebase Auth only

- **File:** `_bmad-output/project-context.md` (line ~139)
- **Doc claims:** "Auth: NextAuth 5 (beta) for session-based auth; Firebase Auth for some API consumers"
- **Reality:** NextAuth is **not installed** (not in package.json). The codebase uses Firebase Auth exclusively (`src/lib/firebase/session.ts`). CLAUDE.md correctly states this. Prisma schema still has deprecated NextAuth models (`Account`, `Session`, `VerificationToken`) marked for future cleanup.
- **Action needed:** Update project-context.md auth section to match reality. Decide if deprecated NextAuth models should be removed from Prisma schema.

---

## MEDIUM Severity

### 2. README.md claims SQLite for local development — codebase is PostgreSQL only

- **File:** `README.md` (lines ~62–74, ~133–134)
- **Doc claims:** "Database (SQLite — works out of the box)" and "SQLite (libSQL) + Prisma ORM"
- **Reality:** `prisma/schema.prisma` specifies `provider = "postgresql"`. `src/lib/db.ts` uses the `PrismaPg` adapter. The `@prisma/adapter-libsql` package is installed but **never imported anywhere in source code**.
- **Action needed:** Update README.md database section. Remove `@prisma/adapter-libsql` from dependencies if SQLite support is not planned.

### 3. .env.example documents services that are only partially implemented

- **File:** `.env.example`
- **Partially implemented services:**
  - `SHIPPO_API_TOKEN` — `shippo` is in package.json but Story 5.5 (Logistics) is incomplete per sprint-status
  - `GEOAPIFY_API_KEY` — not in package.json at all, referenced in env only
  - `GOOGLE_MAPS_API_KEY` — Story 12.2 partially implemented (tests excluded in jest.config.js)
- **Action needed:** Decide whether to complete these integrations or remove their env var documentation to avoid confusion.

### 4. Epic 12 marked done/review but tests are excluded as failing

- **Files:** `_bmad-output/implementation-artifacts/sprint-status.yaml`, `jest.config.js` (lines 13–22)
- **sprint-status.yaml says:** Stories 12-1 and 12-2 are `done` / `review`
- **jest.config.js says:** Epic 12 test files are explicitly excluded with comment: "Epic 12 work that have failing tests due to mismatched implementation/test expectations. They will be fixed and re-enabled in Epic 12 stories."
- **Action needed:** Either fix the failing tests and re-enable them, or revert story statuses to `in-progress`. Stories cannot meet Definition of Done with excluded tests.

---

## LOW-MEDIUM Severity

### 5. README.md BDD feature list uses legacy naming convention

- **File:** `README.md` (lines ~115–125)
- **Doc claims:** Features named `01-marketplace-scanning`, `02-ai-analysis`, etc.
- **Reality:** Active tests use epic-based naming: `E-001-*.feature`, `E-002-*.feature` in `test/acceptance/features/`. The legacy `test/features/` directory still exists and is used by `make test-acceptance`, but the newer epic-organized tests are in `test/acceptance/` and used by `make test-ac`.
- **Action needed:** Update README.md BDD section. Consider migrating legacy `test/features/` scenarios into the `test/acceptance/` structure and updating the `make test-acceptance` target.

### 6. CLAUDE.md app layout lists 5 directories — actually ~16 exist

- **File:** `CLAUDE.md` (lines ~90–97)
- **Doc lists:** `(auth)/`, `dashboard/`, `opportunities/`, `settings/`, `onboarding/`
- **Missing from docs:** `analytics/`, `docs/`, `health/`, `listings/`, `messages/`, `posting-queue/`, `privacy/`, `scraper/`, `terms/`
- **Action needed:** Expand the project layout section in CLAUDE.md to include all app directories, or add a note that the list is not exhaustive.

---

## LOW Severity

### 7. Jest coverage thresholds set higher than achieved coverage

- **Files:** `jest.config.js` (lines 78–82), CLAUDE.md
- **Thresholds:** branches ≥96%, functions ≥98%, lines ≥99%, statements ≥99%
- **Actual (per jest.config.js comment):** statements 98.21%, branches 92.37%, functions 98.66%, lines 98.48%
- **Note:** These are aspirational DoD thresholds. Not a bug, but the gap is worth tracking — especially branches at 92% vs 96% target.

### 8. Deprecated NextAuth models still in Prisma schema

- **File:** `prisma/schema.prisma` (lines ~220–261)
- **Models:** `Account`, `Session`, `VerificationToken` — each marked with "Deprecated: NextAuth — kept for backward compatibility during migration. Removal planned in future cleanup story."
- **Action needed:** Schedule a cleanup story to drop these models and their associated migration, or decide they're acceptable tech debt for now.

---

## What Was Cleaned Up (This Commit)

For reference, the following stale/orphaned files were removed in this cleanup:

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

---

**Backup layout:**
- `app/layout-backup.tsx` (duplicate of current `app/layout.tsx`)
