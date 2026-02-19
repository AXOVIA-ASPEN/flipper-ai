# 🛠️ Flipper AI - Admin Runbook

**For:** DevOps, SRE, System Administrators
**Updated:** 2026-02-19 02:30 UTC

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Deployment](#deployment)
3. [Database Management](#database-management)
4. [Monitoring & Alerts](#monitoring--alerts)
5. [Troubleshooting](#troubleshooting)
6. [Rollback Procedures](#rollback-procedures)
7. [Security](#security)
8. [Incident Response](#incident-response)

---

## 🏗️ Architecture Overview

### Stack
- **Frontend:** Next.js 14 (React, TypeScript)
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (PrismaPostgres)
- **ORM:** Prisma
- **Auth:** NextAuth.js
- **Hosting:** Vercel
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry, Vercel Analytics
- **Testing:** Jest (unit), Playwright (E2E)

### Infrastructure

```
GitHub (main branch)
    ↓ (push)
GitHub Actions CI/CD
    ├─ Lint + TypeCheck
    ├─ Unit Tests (Jest)
    ├─ Integration Tests
    ├─ Build
    ├─ E2E Tests (Playwright)
    └─ Deploy → Vercel
         ↓
    Production (flipper-ai-ten.vercel.app)
         ↓
    PrismaPostgres (PostgreSQL)
```

### Environment Variables

**Production (Vercel):**
```bash
DATABASE_URL=postgresql://...  # PrismaPostgres connection string
AUTH_SECRET=***                # NextAuth secret (32+ chars)
NEXTAUTH_URL=https://...       # Production domain
ANTHROPIC_API_KEY=***          # Claude API key
OPENAI_API_KEY=***             # OpenAI API key (optional)
STRIPE_SECRET_KEY=***          # Stripe payment key
SENTRY_DSN=***                 # Sentry error tracking
NODE_ENV=production
```

**Development (Local):**
```bash
DATABASE_URL=file:./dev.db     # SQLite for local dev
AUTH_SECRET=dev-secret-key
NEXTAUTH_URL=http://localhost:3000
# API keys same as production
```

---

## 🚀 Deployment

### Standard Deployment (Automatic)

**Trigger:** Push to `main` branch

```bash
git checkout main
git pull origin main
# Make changes...
git add .
git commit -m "feat: description"
git push origin main
```

GitHub Actions automatically:
1. Runs linters (ESLint, Prettier)
2. Runs unit tests (Jest)
3. Runs integration tests
4. Builds Next.js production bundle
5. Runs E2E tests (Playwright)
6. Deploys to Vercel
7. Reports status to GitHub

**Success:** ✅ Green checkmark on GitHub commit
**Failure:** ❌ Red X on GitHub commit (check Actions tab)

**Deployment Time:** ~8-12 minutes
**Zero Downtime:** Vercel atomic deployments

---

### Manual Deployment (Emergency)

**When to use:** Bypass CI/CD for critical hotfixes

```bash
# 1. Clone repo
git clone https://github.com/AXOVIA-ASPEN/flipper-ai.git
cd flipper-ai

# 2. Install dependencies
pnpm install

# 3. Build locally
pnpm build

# 4. Deploy via Vercel CLI
npx vercel --prod

# 5. Verify deployment
curl https://flipper-ai-ten.vercel.app/health
```

**Risks:**
- ⚠️ Skips automated tests (you're on your own)
- ⚠️ No CI/CD audit trail
- ⚠️ Potential for human error

**Only use for P0 incidents!**

---

### Vercel Dashboard

**URL:** https://vercel.com/dashboard

**Key Actions:**
- View deployments
- Check build logs
- Monitor performance
- Manage environment variables
- Roll back to previous deployment
- Promote preview deployment

**Access:** Requires Vercel account with project permissions

---

## 🗄️ Database Management

### Connection

**Production Database:**
```bash
# Via Prisma Studio (GUI)
npx prisma studio --browser none

# Via psql (CLI)
psql $DATABASE_URL

# Via Node.js script
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.$connect().then(() => console.log('Connected'));"
```

**⚠️ WARNING:** Never run destructive commands on production without backup!

---

### Migrations

**Apply New Migration (Production):**
```bash
# 1. Test locally first
npx prisma migrate dev --name descriptive_name

# 2. Commit migration files
git add prisma/migrations/
git commit -m "db: add new migration"

# 3. Push to trigger deployment
git push origin main

# 4. Vercel build automatically runs:
npx prisma migrate deploy
```

**Migration fails?** Check Vercel deployment logs for errors.

---

### Database Backups

**Automated Backups:** PrismaPostgres handles this automatically
- Frequency: Continuous (WAL streaming)
- Retention: 30 days
- Recovery Point Objective (RPO): <1 minute

**Manual Backup:**
```bash
# Export schema + data to SQL file
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql $DATABASE_URL < backup_20260219_023000.sql
```

**Store backups in:**
- S3 bucket (encrypted)
- GitHub private repo (encrypted)
- Local secure storage (encrypted)

---

### Database Health Checks

```bash
# Check connection
npx prisma db execute --stdin <<< "SELECT 1"

# Check table count
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'"

# Check row counts
npx prisma db execute --stdin <<< "
SELECT 
  schemaname, 
  tablename, 
  n_live_tup AS row_count 
FROM pg_stat_user_tables 
ORDER BY n_live_tup DESC;
"

# Check database size
npx prisma db execute --stdin <<< "SELECT pg_size_pretty(pg_database_size(current_database()))"
```

---

## 📊 Monitoring & Alerts

### Health Check Endpoint

**URL:** `https://flipper-ai-ten.vercel.app/health`

**Response (Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-19T02:30:00.000Z",
  "uptime": 1234567,
  "database": "connected",
  "version": "1.0.0"
}
```

**Response (Unhealthy):**
```json
{
  "status": "unhealthy",
  "timestamp": "2026-02-19T02:30:00.000Z",
  "database": "disconnected",
  "error": "Connection timeout"
}
```

**Setup External Monitoring:**
- UptimeRobot: Ping `/health` every 5 minutes
- Pingdom: HTTP check with <2s threshold
- StatusCake: Multi-location checks

---

### Sentry Error Tracking

**Dashboard:** https://sentry.io/organizations/axovia-ai/projects/flipper-ai/

**Key Metrics:**
- Error rate (errors/minute)
- Crash-free sessions
- Affected users
- Top errors by volume

**Alert Thresholds:**
- 🔴 **P0:** >10 errors/min → Page on-call engineer
- 🟠 **P1:** >5 errors/min → Slack notification
- 🟡 **P2:** >1 error/min → Email notification

**Common Alerts:**
- `TypeError: Cannot read property 'X' of undefined`
- `NetworkError: Failed to fetch`
- `PrismaClientKnownRequestError: P2002 Unique constraint`

---

### Vercel Analytics

**Dashboard:** Vercel → Analytics tab

**Metrics:**
- Page views
- Unique visitors
- Bounce rate
- Top pages
- Geographic distribution
- Device breakdown (desktop/mobile)

**Performance:**
- First Contentful Paint (FCP) <1.8s
- Largest Contentful Paint (LCP) <2.5s
- Time to Interactive (TTI) <3.8s
- Cumulative Layout Shift (CLS) <0.1

---

## 🔧 Troubleshooting

### Issue: Deployment Failed

**Symptoms:** Red X on GitHub commit, Vercel shows "Failed"

**Diagnosis:**
1. Check GitHub Actions logs: `https://github.com/AXOVIA-ASPEN/flipper-ai/actions`
2. Identify failing step (Lint, Test, Build, E2E)

**Common Causes:**
- ❌ ESLint errors → Fix linting issues locally, push again
- ❌ TypeScript errors → Fix type errors, push again
- ❌ Test failures → Fix failing tests, push again
- ❌ Build errors → Check for missing dependencies, environment variables

**Resolution:**
```bash
# Run locally to reproduce
pnpm lint
pnpm typecheck
pnpm test
pnpm build

# Fix errors, then redeploy
git add .
git commit -m "fix: resolve deployment errors"
git push origin main
```

---

### Issue: Database Connection Failed

**Symptoms:** 500 errors, Sentry alert "PrismaClient failed to connect"

**Diagnosis:**
```bash
# Test connection manually
npx prisma db execute --stdin <<< "SELECT 1"
```

**Common Causes:**
- ❌ DATABASE_URL incorrect → Verify in Vercel dashboard
- ❌ Connection pool exhausted → Restart Vercel deployment
- ❌ Database down → Check PrismaPostgres status page
- ❌ Firewall rules → Verify Vercel IPs whitelisted

**Resolution:**
1. Check DATABASE_URL in Vercel → Settings → Environment Variables
2. Redeploy to refresh connections: `vercel --prod`
3. Contact PrismaPostgres support if database is down

---

### Issue: High Error Rate

**Symptoms:** Sentry alerts, user complaints

**Diagnosis:**
1. Check Sentry dashboard for top errors
2. Identify error pattern (specific route, user action, browser)

**Common Errors:**

**"Registration API returning 500"** _(KNOWN ISSUE)_
- **Cause:** Database adapter mismatch (LibSQL → PostgreSQL)
- **Workaround:** Use OAuth login (Google, GitHub) instead of email/password
- **ETA:** Under investigation, fix pending

**"NextAuth CSRF Error"**
- **Cause:** Cookie mismatch, browser blocking third-party cookies
- **Resolution:** Clear cookies, try incognito mode, whitelist domain

**"API Rate Limit Exceeded"**
- **Cause:** Too many requests to Claude/OpenAI API
- **Resolution:** Implement request throttling, increase API quota

---

### Issue: Slow Performance

**Symptoms:** Page load >5s, timeout errors

**Diagnosis:**
1. Check Vercel Analytics → Performance tab
2. Identify slow routes/components

**Common Causes:**
- ❌ Unoptimized database queries → Add indexes
- ❌ Missing image optimization → Use Next.js Image component
- ❌ Large bundle size → Code splitting, dynamic imports
- ❌ API calls blocking render → Implement SSR/ISR

**Resolution:**
```bash
# Analyze bundle size
pnpm build --analyze

# Check slow queries
# (Requires database query logging enabled)

# Optimize images
# Replace <img> with <Image> from 'next/image'
```

---

## ⏪ Rollback Procedures

### Instant Rollback (Vercel Dashboard)

**When to use:** Recent deployment caused critical issues

1. Go to Vercel dashboard
2. Click **Deployments** tab
3. Find previous stable deployment (green ✅)
4. Click **⋯** → **Promote to Production**
5. Confirm rollback

**Rollback Time:** <30 seconds
**Impact:** Zero downtime

---

### Git Rollback (Code-Level)

**When to use:** Need to revert specific commits

```bash
# Find commit hash to revert to
git log --oneline

# Revert to specific commit
git revert <commit-hash>

# Or reset to previous commit (destructive)
git reset --hard HEAD~1

# Force push (use with caution!)
git push origin main --force
```

**Warning:** Force push triggers full redeployment!

---

### Database Rollback

**When to use:** Migration caused data corruption

```bash
# List migrations
npx prisma migrate status

# Rollback last migration (not recommended in prod!)
# Instead, create a new migration to undo changes
npx prisma migrate dev --name rollback_previous_change

# Apply rollback migration
npx prisma migrate deploy
```

**Best Practice:** Forward-only migrations (additive changes)

---

## 🔒 Security

### Environment Secrets

**Never commit secrets to Git!**

**Storage:**
- ✅ Vercel dashboard → Settings → Environment Variables
- ✅ GitHub Actions secrets → Settings → Secrets and variables
- ❌ `.env` files in repo (use `.env.example` instead)

**Rotation Schedule:**
- AUTH_SECRET: Every 90 days
- API keys: Every 180 days
- Database credentials: Managed by PrismaPostgres

---

### Access Control

**GitHub Repository:**
- Admin: Stephen Boyett, ASPEN
- Write: Trusted contributors
- Read: Open source (if public repo)

**Vercel Project:**
- Owner: Stephen Boyett
- Admin: ASPEN
- Viewer: Team members

**Database:**
- Admin: Stephen Boyett (via PrismaPostgres dashboard)
- App access: Via DATABASE_URL (read/write)

---

### Security Audits

**Automated:**
- Dependabot: Scans for vulnerable dependencies (GitHub)
- Snyk: Monitors for security issues
- `pnpm audit`: Run in CI/CD pipeline

**Manual:**
- Quarterly penetration testing
- Annual third-party security audit
- Regular code reviews for security issues

---

## 🚨 Incident Response

### P0 (Critical) - Production Down

**Symptoms:** Site unreachable, 100% error rate

**Response Time:** <15 minutes

**Actions:**
1. **Acknowledge:** Post in Slack: "#incident P0: Production down"
2. **Investigate:** Check Vercel status, Sentry errors, health check
3. **Mitigate:** Rollback to last stable deployment if recent change
4. **Communicate:** Update status page, notify users
5. **Resolve:** Fix root cause, redeploy
6. **Post-Mortem:** Document incident, implement safeguards

---

### P1 (High) - Degraded Performance

**Symptoms:** Slow page loads, intermittent errors

**Response Time:** <1 hour

**Actions:**
1. **Investigate:** Check Vercel analytics, database performance
2. **Mitigate:** Scale database, optimize slow queries
3. **Monitor:** Watch error rates, performance metrics
4. **Resolve:** Deploy performance improvements

---

### P2 (Medium) - Non-Critical Bug

**Symptoms:** Minor UI glitch, single feature broken

**Response Time:** <1 day

**Actions:**
1. **Create ticket:** GitHub issue with repro steps
2. **Prioritize:** Add to next sprint
3. **Fix:** Implement fix, add tests
4. **Deploy:** Standard deployment pipeline

---

### On-Call Rotation

**Schedule:** 24/7 coverage (1-week rotations)

**Contact:**
- Primary: Stephen Boyett (stephen.boyett@silverlinesoftware.co)
- Secondary: ASPEN (OpenClaw Discord)

**Escalation Path:**
1. On-call engineer (15 min)
2. Senior engineer (30 min)
3. CTO (1 hour)

---

## 📞 Support Contacts

**Vercel Support:** support@vercel.com (Enterprise plan)
**PrismaPostgres:** support@prisma.io
**Sentry:** support@sentry.io
**GitHub:** support@github.com

**Internal:**
- DevOps Lead: Stephen Boyett
- Database Admin: ASPEN
- Security Lead: Stephen Boyett

---

## 📚 Additional Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Playwright Docs](https://playwright.dev/)

**Internal Docs:**
- [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md)
- [USER_GUIDE.md](./USER_GUIDE.md)
- [CONTRIBUTING.md](../CONTRIBUTING.md)

---

**Last Updated:** 2026-02-19 02:30 UTC
**Next Review:** Before production domain launch
**Maintainer:** ASPEN (Axovia AI)
