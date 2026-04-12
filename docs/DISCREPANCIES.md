# Codebase Discrepancies Report

> **Generated:** 2026-04-12
> **Branch:** django-main
> **Audit scope:** Full codebase — documentation vs implementation alignment
> **Last updated:** 2026-04-12

This document tracks discrepancies between Flipper.ai's documentation and
implementation. Items are resolved or kept open as noted.

---

## ALL RESOLVED

### ~~1. project-context.md claims NextAuth 5~~ — FIXED
Updated `_bmad-output/project-context.md` to reflect Firebase Auth as the sole auth system.

### ~~2. README.md claims SQLite~~ — FIXED
Updated all README.md database references to PostgreSQL.

### ~~3. .env.example documents partially-implemented services~~ — KEPT INTENTIONALLY
Env vars for Shippo, Geoapify, and Google Maps kept as-is — stories are on the roadmap.

### ~~4. Epic 12 tests excluded in jest.config.js~~ — FIXED
Re-enabled Epic 12 test files. User further refined coverage exclusion patterns in jest.config.js.

### ~~5. README.md BDD feature list uses legacy naming~~ — FIXED
Updated README.md from `01-marketplace-scanning` naming to `E-001` through `E-012` epic-based naming matching `test/acceptance/features/`.

### ~~6. CLAUDE.md app layout incomplete~~ — FIXED
Expanded `app/` directory listing from 5 to 15 directories.

### ~~7. Jest coverage thresholds~~ — RESOLVED
User updated jest.config.js with accurate thresholds (96/98/99/99) matching actual achieved coverage. CLAUDE.md DoD section already aligned.

### ~~8. Deprecated NextAuth models in Prisma schema~~ — REMOVED
Deleted `Account`, `Session`, `VerificationToken` models from `prisma/schema.prisma` and created migration `20260412000000_remove_deprecated_nextauth_models`.

### ~~9. Unused @prisma/adapter-libsql dependency~~ — REMOVED
Uninstalled from package.json. Codebase uses `@prisma/adapter-pg` exclusively.

---

## What Was Cleaned Up (this session)

### Stale File Removal (commit `1238395`)
- 6 orphaned components + tests, 1 orphaned hook + test
- 2 stale API routes + tests (`route.v2.ts`, duplicate `scrape/facebook`)
- `prisma.config.ts`, `dev.db`, `scripts/refactor-error-handling.ts`
- 5 boilerplate SVGs, `app/layout-backup.tsx`
- `.kilocode/` + `.kilocodemodes`
- `docs/archive/`, `docs/stories/`
- Duplicate/orphaned BMAD artifacts
- 10 story files organized into proper `epic-10/`, `epic-11/`, `epic-12/` dirs

### Vercel Removal (commits `d65fd68` through `9a71cab`)
- Removed `@vercel/analytics` from source + package.json
- Deleted `vercel.json`, `.github/workflows/vercel-deploy.yml`
- Updated ~60 files: CLAUDE.md, README.md, privacy page, Sentry configs, CSP headers, OpenAPI specs, scripts, planning artifacts, deployment docs
- Deleted `docs/dev/ADMIN_RUNBOOK.md` (entirely Vercel-centric)
- All references updated to Firebase Hosting + Cloud Run

### Schema & Dependency Cleanup
- Removed deprecated NextAuth models (`Account`, `Session`, `VerificationToken`) from Prisma schema
- Removed unused `@prisma/adapter-libsql` dependency
- Updated README BDD feature list to epic-based naming
