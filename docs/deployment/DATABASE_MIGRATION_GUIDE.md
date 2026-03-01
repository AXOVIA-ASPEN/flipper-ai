# Database Migration Guide

## Production Registration Bug Fix

**Problem:** Registration API returns HTTP 500 due to missing UserSettings table in production PostgreSQL database.

**Root Cause:** Database migration from LibSQL (Turso) to PostgreSQL (PrismaPostgres) was incomplete - migration SQL was created but not deployed to production.

## Fix Steps

### 1. Verify Current Database State

```bash
# Check if migrations have been run
npx prisma migrate status

# Connect to production database
# (requires DATABASE_URL env var with production credentials)
```

### 2. Deploy Migrations to Production

```bash
# Set production DATABASE_URL
export DATABASE_URL="postgresql://..."

# Deploy all pending migrations (idempotent - safe to run multiple times)
npx prisma migrate deploy

# Verify tables exist
npx prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
```

### 3. Verify UserSettings Table

```bash
# Check UserSettings table structure
npx prisma db execute --stdin <<< "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='UserSettings';"
```

### 4. Test Registration API

```bash
# Test locally first
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123","name":"Test User"}'

# Expected: HTTP 200 with success:true

# Then test production
curl -X POST https://flipper-ai-ten.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123","name":"Test User"}'
```

## Code Changes Made

### 1. Fixed Test Mocks (`src/__tests__/api/register.test.ts`)

**Before:**
```typescript
jest.mock('@/lib/db', () => ({
  user: {
    findUnique: mockFindUnique,
    create: mockCreate,
  },
}));
```

**After:**
```typescript
jest.mock('@/lib/db', () => ({
  user: {
    findUnique: mockFindUnique,
    create: mockUserCreate,
  },
  userSettings: {
    create: mockUserSettingsCreate,  // ✅ Now mocked!
  },
}));
```

### 2. Added Error Handling (`app/api/auth/register/route.ts`)

**Before:**
```typescript
await prisma.userSettings.create({
  data: { userId: user.id, ... },
});
```

**After:**
```typescript
try {
  await prisma.userSettings.create({
    data: { userId: user.id, ... },
  });
} catch (settingsError) {
  console.error('Failed to create UserSettings:', settingsError);
  // Rollback user creation
  await prisma.user.delete({ where: { id: user.id } });
  throw new Error('Failed to initialize user settings - database migration may be required');
}
```

**Benefits:**
- Clear error message indicating migration issue
- Prevents orphaned user records
- Detailed logging for debugging

### 3. Added Test Coverage

New test case:
```typescript
it('returns 500 when UserSettings creation fails', async () => {
  mockUserCreate.mockResolvedValue({ id: 'user-4', ... });
  mockUserSettingsCreate.mockRejectedValue(
    new Error('relation "UserSettings" does not exist')
  );
  
  const res = await POST(createRequest({ ... }));
  expect(res.status).toBe(500);
  expect(data.error).toContain('Failed to create account');
});
```

## Deployment Checklist

- [x] Fix test mocks to include userSettings.create
- [x] Add error handling with rollback
- [x] Add test case for UserSettings failure
- [x] All tests passing (10/10)
- [ ] **CRITICAL:** Run `npx prisma migrate deploy` on production database
- [ ] Verify UserSettings table exists in production
- [ ] Test registration API in production
- [ ] Monitor Sentry/logs for errors

## Vercel Deployment Notes

If using Vercel Postgres (Neon/PlanetScale):

1. Go to Vercel project settings → Environment Variables
2. Verify `DATABASE_URL` is set correctly
3. Trigger new deployment to run migrations:
   ```bash
   git push origin main
   ```
4. Or manually run migrations via Vercel CLI:
   ```bash
   vercel env pull .env.production
   npx prisma migrate deploy --env-file .env.production
   ```

## Rollback Plan

If migrations cause issues:

```bash
# Revert to previous migration (if needed)
npx prisma migrate resolve --rolled-back 20260218064426_init

# Or restore database from backup
# (requires backup strategy in place)
```

## Prevention

**Going Forward:**
1. Always run `npx prisma migrate deploy` in CI/CD pipeline
2. Add database migration step to deployment scripts
3. Run integration tests against production-like database
4. Monitor Sentry for database-related errors

## Related Files

- Migration SQL: `prisma/migrations/20260218064426_init/migration.sql`
- Schema: `prisma/schema.prisma`
- API Route: `app/api/auth/register/route.ts`
- Tests: `src/__tests__/api/register.test.ts`

---

**Author:** ASPEN  
**Date:** February 18, 2026  
**Status:** Ready for Production Deployment
