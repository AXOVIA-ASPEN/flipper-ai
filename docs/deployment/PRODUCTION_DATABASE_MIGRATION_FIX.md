# 🔧 Production Database Migration Fix

**Issue:** Registration API returning HTTP 500  
**Root Cause:** Database migrations not applied to production PostgreSQL  
**Status:** 🔴 BLOCKING PRODUCTION  
**Created:** February 19, 2026 - 4:00 AM UTC

---

## Problem Analysis

### Symptoms
- ✅ Frontend loads correctly
- ✅ `/api/health` returns 200
- ❌ Registration API returns 500 error
- ❌ Error: "Failed to create account"

### Root Cause
The Vercel production database (PrismaPostgres) was **provisioned but not migrated**.

**Migration Status:**
- Local: `20260218064426_init` migration exists
- Production: Migration likely NOT applied (tables don't exist)

### Why This Happened
1. Prisma migrations require explicit `prisma migrate deploy` in production
2. Vercel builds don't automatically run migrations (by design - safety)
3. `postinstall` only runs `prisma generate` (client), not migrations
4. No CI/CD step to verify migration status

---

## Solution: Apply Production Migrations

### Option 1: Manual Migration (Recommended First Time)

**Prerequisites:**
- Vercel CLI installed: `npm i -g vercel`
- Logged into Vercel: `vercel login`
- Have production `DATABASE_URL`

**Steps:**

1. **Get production database URL from Vercel:**
   ```bash
   vercel env pull .env.production
   # This downloads all production environment variables
   ```

2. **Apply migrations:**
   ```bash
   # Set production DATABASE_URL temporarily
   export DATABASE_URL="postgresql://..."  # From .env.production
   
   # Apply all pending migrations
   npx prisma migrate deploy
   
   # Verify migration status
   npx prisma migrate status
   ```

3. **Verify tables exist:**
   ```bash
   # Run diagnostics endpoint
   curl https://flipper-ai-ten.vercel.app/api/diagnostics
   
   # Should show:
   # ✅ userTable: "Accessible (0 users)"
   ```

4. **Test registration:**
   ```bash
   curl -X POST https://flipper-ai-ten.vercel.app/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test1234!","name":"Test User"}'
   
   # Expected: HTTP 200 with success=true
   ```

---

### Option 2: Add to CI/CD Pipeline (Automated)

**File:** `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run database migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          npx prisma migrate deploy
          npx prisma migrate status
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
      
      - name: Verify deployment
        run: |
          sleep 10
          curl -f https://flipper-ai-ten.vercel.app/api/health
          curl -f https://flipper-ai-ten.vercel.app/api/diagnostics
```

**Required Secrets (in GitHub repo settings):**
- `DATABASE_URL` - Production PostgreSQL connection string
- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID

---

### Option 3: Vercel Build Command (Quick Fix)

**File:** `vercel.json`

```json
{
  "buildCommand": "npm run build && npx prisma migrate deploy",
  "installCommand": "npm ci && npx prisma generate"
}
```

⚠️ **Warning:** This runs migrations on EVERY build. Not ideal for prod (migrations should be reviewed).

---

## Verification Checklist

After applying migrations, verify:

- [ ] `/api/diagnostics` shows:
  - ✅ databaseConnection: Connected
  - ✅ userTable: Accessible (X users)
  - ✅ bcrypt: Working

- [ ] Registration succeeds:
  ```bash
  curl -X POST /api/auth/register -d '{"email":"test@example.com","password":"Test1234!","name":"Test"}'
  # Expected: {"success":true,"message":"Account created successfully"}
  ```

- [ ] Database has both tables:
  - `User` table with columns: id, email, password, name, etc.
  - `UserSettings` table with columns: id, userId, llmModel, etc.

- [ ] Foreign key relationship exists:
  ```sql
  -- Check constraint
  SELECT constraint_name, table_name 
  FROM information_schema.table_constraints 
  WHERE table_name IN ('User', 'UserSettings');
  ```

---

## Prevention: Add Migration Check to Health Endpoint

**File:** `app/api/health/route.ts`

```typescript
export async function GET() {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    
    // Add migration status check
    migrations: {
      status: 'unknown',
      applied: 0,
      pending: 0,
    },
  };

  try {
    // Check if all migrations are applied
    const migrations = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM "_prisma_migrations" 
      WHERE finished_at IS NOT NULL
    `;
    checks.migrations.status = 'ok';
    checks.migrations.applied = migrations[0].count;
  } catch (error) {
    checks.migrations.status = 'error';
    checks.migrations.error = error.message;
  }

  return NextResponse.json(checks);
}
```

---

## Rollback Plan

If migrations cause issues:

1. **Reset production database:**
   ```bash
   npx prisma migrate reset --force
   # ⚠️ DELETES ALL DATA - only for fresh deployments
   ```

2. **Restore from backup:**
   ```bash
   # If backups configured (see PRODUCTION_READINESS.md)
   pg_restore -d $DATABASE_URL backup.dump
   ```

3. **Roll back to previous migration:**
   ```bash
   # Prisma doesn't support rollback natively
   # Must manually revert migration SQL or restore from backup
   ```

---

## Next Steps

1. **Stephen: Apply migrations using Option 1 (manual)**
2. **ASPEN: Implement Option 2 (CI/CD automation)**
3. **ASPEN: Add migration status to health endpoint**
4. **ASPEN: Update deployment checklist**
5. **Team: Test registration thoroughly**

---

## Related Files
- `prisma/schema.prisma` - Database schema
- `prisma/migrations/20260218064426_init/migration.sql` - Initial migration
- `app/api/auth/register/route.ts` - Registration endpoint
- `app/api/diagnostics/route.ts` - Database diagnostics

---

**Author:** ASPEN 🌲  
**Company:** Axovia AI / Silverline Software  
**Priority:** 🔴 P0 - BLOCKING PRODUCTION LAUNCH
