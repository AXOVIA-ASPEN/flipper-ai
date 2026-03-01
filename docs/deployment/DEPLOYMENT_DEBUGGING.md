# Flipper AI Deployment Debugging Log

**Date:** 2026-02-18  
**Issue:** User registration failing with HTTP 500 error  
**Error:** `{"success":false,"error":"Failed to create account"}`

---

## Timeline of Fixes

### Fix #1: Database Adapter Mismatch (11:11 UTC)
**Commit:** `45c0e17`

**Problem:**  
- `src/lib/db.ts` was using `@prisma/adapter-libsql` for SQLite
- Production uses PostgreSQL (PrismaPostgres from Vercel)
- Adapter mismatch caused database client to fail

**Solution:**
```diff
- import { PrismaLibSql } from '@prisma/adapter-libsql';
- const adapter = new PrismaLibSql({ url });
- return new PrismaClient({ adapter });
+ return new PrismaClient({
+   log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
+ });
```

**Dependencies Removed:**
- `@libsql/client@^0.15.15`
- `@prisma/adapter-libsql@^7.2.0`

---

### Fix #2: Better Error Handling + Split User/Settings Creation (11:14 UTC)
**Commit:** `d8272a0`

**Problems:**
1. Generic error message hiding actual issue
2. Nested Prisma create might be failing

**Solutions:**
1. Added detailed error logging (dev mode):
```typescript
const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
...(process.env.NODE_ENV === 'development' && { details: errorMessage })
```

2. Split user and settings creation:
```diff
- const user = await prisma.user.create({
-   data: {
-     ...
-     settings: { create: { ... } }
-   }
- });
+ const user = await prisma.user.create({ ... });
+ await prisma.userSettings.create({ data: { userId: user.id, ... } });
```

**Files Created:**
- `scripts/test-all-flows.sh` - Automated testing script
- `TESTING_RESULTS.md` - Testing documentation

---

### Fix #3: Prisma Client Generation (11:15 UTC)
**Commit:** `a6b5e9f`

**Problem:**  
- Vercel might not be generating Prisma client during build
- Missing `postinstall` script is a common Prisma deployment issue

**Solution:**
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

This ensures `prisma generate` runs automatically during:
- Local `npm install`
- Vercel build process
- Any CI/CD pipeline

---

## Test Results

### ✅ Working Components

| Component | URL | Status |
|-----------|-----|--------|
| Landing Page | `/` | ✅ 200 |
| Login Page | `/login` | ✅ 200 |
| Register Page | `/register` | ✅ 200 |
| Health API | `/api/health` | ✅ 200 |
| Docs | `/docs` | ✅ 200 |

### ❌ Broken Components (Under Investigation)

| Component | URL | Status | Current Hypothesis |
|-----------|-----|--------|-------------------|
| Registration API | `/api/auth/register` | ❌ 500 | Prisma client generation issue |

---

## Technical Architecture

### Database Setup

**Production (Vercel):**
- Provider: PrismaPostgres
- Type: PostgreSQL 16.x
- Connection: Direct (no adapter needed)
- URL: `DATABASE_URL` env var

**Prisma Schema:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-ts"
  output   = "../src/generated/prisma"
}
```

**Import Resolution:**
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

// Import in API routes
import prisma from '@/lib/db';  // Resolves to src/lib/db.ts
```

---

## Potential Root Causes (Ranked by Likelihood)

### 1. 🔴 Prisma Client Not Generated in Vercel Build
**Likelihood:** HIGH  
**Evidence:**
- No `postinstall` script until Fix #3
- Vercel may skip `prisma generate` by default
- Error is generic (would happen if Prisma client doesn't exist)

**Fix Applied:** Added `postinstall` script (Commit `a6b5e9f`)  
**Status:** ⏳ Testing

### 2. 🟡 Database Connection Issue
**Likelihood:** MEDIUM  
**Evidence:**
- Fixed adapter mismatch (LibSQL → PostgreSQL)
- `DATABASE_URL` environment variable must be set in Vercel

**Fix Applied:** Removed adapter (Commit `45c0e17`)  
**Status:** ⏳ Awaiting test results

### 3. 🟢 Nested Prisma Create Failing
**Likelihood:** LOW  
**Evidence:**
- Nested creates usually work fine
- Split into separate creates as precaution

**Fix Applied:** Split user/settings creation (Commit `d8272a0`)  
**Status:** ⏳ Testing

### 4. 🟢 Email Service Failure
**Likelihood:** VERY LOW  
**Evidence:**
- Email sending is non-blocking (`.catch()` handler)
- Would log error but not fail registration

**Status:** Unlikely to be the issue

---

## Environment Variables (Vercel)

**Required for Registration:**
- ✅ `DATABASE_URL` - PostgreSQL connection string (from PrismaPostgres)
- ✅ `NEXTAUTH_URL` - https://flipper-ai-ten.vercel.app
- ✅ `NEXTAUTH_SECRET` - `/MR1+0tqDxOh4yHCekeWiAYKRIspt2IjzP8IWnzHSsQ=`

**Optional (for OAuth):**
- ⏸️ `GOOGLE_CLIENT_ID`
- ⏸️ `GOOGLE_CLIENT_SECRET`
- ⏸️ `GITHUB_CLIENT_ID`
- ⏸️ `GITHUB_CLIENT_SECRET`

---

## Next Steps

1. ✅ Wait for deployment with `postinstall` script (Commit `a6b5e9f`)
2. ⏳ Test registration endpoint
3. ⏳ If still failing, check Vercel build logs for Prisma generation
4. ⏳ If needed, add `prisma db push` to build process
5. ⏳ Verify database schema in production
6. ⏳ Test full signup → login → dashboard flow

---

## Useful Commands

### Test Registration Locally
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","name":"Test User"}'
```

### Test Registration in Production
```bash
curl -X POST https://flipper-ai-ten.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","name":"Test User"}'
```

### Run Full Test Suite
```bash
bash scripts/test-all-flows.sh
```

### Check Vercel Deployment Status
```bash
# Visit: https://vercel.com/axovia-aspen/flipper-ai/deployments
# Or check auto-deploy status on GitHub commits
```

### Verify Prisma Client Generation
```bash
npx prisma generate
ls -la src/generated/prisma/
```

---

**Last Updated:** 2026-02-18 11:16 UTC  
**Current Status:** Awaiting deployment test results for Fix #3 (postinstall script)
