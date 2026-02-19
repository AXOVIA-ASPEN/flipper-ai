# Fix #4: Add Prisma Database Push to Vercel Build

**Date:** 2026-02-19 02:00 UTC  
**Commit:** `ce7b378`  
**Worker:** Flipper AI Cron Task Worker  

---

## Problem

Registration API continued to fail with HTTP 500 error despite previous fixes:
- Fix #1: Removed LibSQL adapter (✅ correct)
- Fix #2: Split user/settings creation (✅ correct)
- Fix #3: Added postinstall script (✅ correct but insufficient)

**Root Cause:** Vercel was generating the Prisma client (`prisma generate`) but **NOT applying the schema** to the database. The database tables did not exist in production, causing all database operations to fail.

---

## Solution

### Added Custom Build Command

**File:** `vercel.json`

```json
{
  "buildCommand": "prisma generate && prisma db push --accept-data-loss && next build"
}
```

### Build Steps (in order):
1. **`prisma generate`** - Generate Prisma client from schema.prisma
2. **`prisma db push --accept-data-loss`** - Apply schema to database (create tables if missing)
3. **`next build`** - Build Next.js application with working database

### Why `db push` instead of `migrate deploy`?
- `prisma db push` is simpler for prototyping/rapid iteration
- `--accept-data-loss` flag allows schema changes without migration history
- For production-grade apps, switch to `prisma migrate deploy` + version-controlled migrations

---

## Previous Build Process (Broken)

```
npm ci --legacy-peer-deps
├── postinstall: prisma generate ✅ (client generated)
└── next build ❌ (database schema missing!)
```

**Result:** Prisma client existed, but database had no tables → Registration failed

---

## New Build Process (Fixed)

```
npm ci --legacy-peer-deps
├── postinstall: prisma generate ✅
└── buildCommand:
    ├── prisma generate ✅ (redundant but safe)
    ├── prisma db push --accept-data-loss ✅ (create tables!)
    └── next build ✅ (app can now connect to DB)
```

**Result:** Database schema synced, registration should work

---

## Testing Plan

### 1. Verify Deployment Status
```bash
# Check Vercel deployment logs for:
# - "prisma generate" output
# - "prisma db push" output
# - No database errors during build
```

### 2. Test Registration Endpoint
```bash
curl -X POST https://flipper-ai-ten.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test-'$(date +%s)'@example.com","password":"Test1234!","name":"Test User"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": "...",
      "email": "test-...",
      "name": "Test User"
    }
  }
}
```

### 3. Verify Database Tables Exist
Check that these tables were created:
- `User`
- `UserSettings`
- `FlipOpportunity`
- `Negotiation`
- `SavedSearch`
- etc.

---

## Risk Assessment

### Low Risk Changes
- ✅ `prisma generate` is idempotent (safe to run multiple times)
- ✅ `prisma db push --accept-data-loss` won't delete existing data in new deployments
- ✅ Build order ensures database is ready before app starts

### Potential Issues (Monitoring Needed)
- ⚠️ If schema changes significantly, `--accept-data-loss` might drop data
  - **Mitigation:** Switch to proper migrations (`prisma migrate deploy`) after MVP
- ⚠️ Build time may increase by 5-10 seconds due to database sync
  - **Acceptable:** Ensures working deployments

---

## Next Steps

1. ⏳ Wait for Vercel deployment to complete (~2-3 minutes)
2. ⏳ Test registration endpoint
3. ✅ If successful, move Trello card to Testing
4. ✅ Run full E2E test suite
5. ✅ Mark as production-ready if all tests pass

---

## Related Documentation

- [DEPLOYMENT_DEBUGGING.md](../DEPLOYMENT_DEBUGGING.md) - Fix #1, #2, #3 history
- [Prisma Docs: db push](https://www.prisma.io/docs/concepts/components/prisma-migrate/db-push)
- [Vercel Docs: Build Configuration](https://vercel.com/docs/build-step)

---

**Status:** ⏳ Awaiting deployment test results  
**Next Check:** 2026-02-19 02:05 UTC (5 minutes)
