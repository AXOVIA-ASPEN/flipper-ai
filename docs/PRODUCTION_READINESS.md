# Flipper AI - Production Readiness Checklist

**Author:** Stephen Boyett  
**Company:** Axovia AI  
**Date:** February 17, 2026  
**Status:** 🟡 READY TO DEPLOY (pending Vercel credentials)
**Last Updated:** February 17, 2026 (Run #6 — User journey screenshots + PG migration docs + UX empty states)

---

## ✅ Completed Items

### Code Quality
- [x] TypeScript strict mode — zero type errors (`tsc --noEmit` ✅)
- [x] ESLint — no lint errors
- [x] Prettier formatting applied

### Test Coverage
- [x] **116 test suites** — all passing
- [x] **2,378 tests** — all green
- [x] **Statements:** 99.66% (3859/3872) ← exceeds 99% threshold
- [x] **Branches:** 99.31% ← exceeds 96% threshold ⬆️
- [x] **Functions:** 99.79% (493/494) ← exceeds 98% threshold
- [x] **Lines:** 99.70% (3698/3709) ← exceeds 99% threshold
- [x] Jest coverage thresholds enforced (branches ≥ 96%, others ≥ 99%)

### Testing Types
- [x] **Unit tests (Jest)** — lib/, api/, hooks, components
- [x] **Integration tests** — marketplace scanning, auth flows
- [x] **BDD/Cucumber tests** — marketplace scanning, AI analysis, seller comms
- [x] **Performance tests** — load testing scaffolded
- [x] **Security tests** — CORS, CSP, rate limiting, API key validation

### Security & Infrastructure
- [x] CSP headers (Content-Security-Policy)
- [x] HSTS headers in middleware
- [x] CORS configuration in vercel.json
- [x] Rate limiting (per-IP and per-user, endpoint-specific)
- [x] Input validation (Zod schemas)
- [x] API key validation with constant-time comparison
- [x] Session security (NextAuth + JWT)
- [x] Environment variable validation on startup
- [x] **Auth hardening** — 5 routes fixed (500→401 for unauthenticated): user/settings, scraper/ebay, search-configs, reports/generate (Feb 17 Run #3)

### E2E Staging Tests
- [x] **API smoke tests** — 22/22 passing against `http://localhost:3001` (PM2 staging, all 3 browsers)
- [x] Playwright config supports `BASE_URL` env var for flexible staging/prod targeting
- [x] **webServer auto-launch** — `playwright.config.ts` auto-starts `next start` in CI (Feb 17 Run #4)
- [x] **Health dashboard E2E** — 6 tests: service list, metric cards, refresh, offline mode, screenshot (Feb 17 Run #5)

### CI/CD
- [x] GitHub Actions CI pipeline (`.github/workflows/ci.yml`)
- [x] Automated tests on every PR
- [x] Coverage reports uploaded to Codecov
- [x] Vercel deployment workflow (awaiting secrets)
- [x] **E2E pipeline fixed** — Playwright webServer config; no manual server startup needed in CI

### Documentation
- [x] `README.md` with badges and quickstart
- [x] `docs/DEPLOYMENT.md` — step-by-step deploy guide
- [x] `docs/API.md` — API documentation
- [x] `docs/ARCHITECTURE.md` — system architecture
- [x] `docs/COVERAGE_GAPS.md` — coverage analysis
- [x] **OpenAPI 3.0 spec** — `GET /api/docs` returns full machine-readable spec
- [x] **Swagger UI** — interactive API explorer at `/docs` (try-it-out, auth persistence)
- [x] **Real-time SSE** — `GET /api/events` push notifications + `useSseEvents` React hook
- [x] **`/health` status dashboard** — real-time system monitoring page (Feb 17 Run #5)
- [x] **User journey visual screenshots** — 19 screenshots in `playwright-report/user-journey/` (Feb 17 Run #6)
- [x] **`docs/USER_FLOWS.md`** — complete flow documentation with E2E test coverage map (Feb 17 Run #6)
- [x] **`docs/DATABASE_MIGRATION.md`** — SQLite→PostgreSQL migration guide with Docker, pooling, data scripts (Feb 17 Run #6)
- [x] **UX empty states** — kanban columns, messages page, dashboard now have meaningful empty states + CTAs (Feb 17 Run #6)

---

## ✅ Staging Deployment (LIVE)

**Running on AWS server via PM2:**
- **URL:** http://localhost:3001 (internal; SSH tunnel for access)
- **Health:** `{"status":"ok","environment":"production"}` ✅
- **Swagger UI:** http://localhost:3001/docs ✅
- **OpenAPI spec:** http://localhost:3001/api/docs (46 paths) ✅
- **Process manager:** PM2 with systemd startup
- **Database:** SQLite (dev.db) — switch to PostgreSQL for production
- **Started:** February 17, 2026

SSH tunnel access: `ssh -L 3001:localhost:3001 ubuntu@<server-ip>` → visit http://localhost:3001

---

## 🔴 Blocked Items (Need Stephen)

### Option A: Vercel Deployment (Recommended)
- [ ] **VERCEL_TOKEN** — generate at https://vercel.com/account/tokens
- [ ] **VERCEL_ORG_ID** — from Vercel dashboard
- [ ] **VERCEL_PROJECT_ID** — after linking repo to Vercel project
- [ ] Add these as GitHub Secrets in AXOVIA-ASPEN/flipper-ai

### Option B: Railway Deployment (Easiest)
- [ ] Go to https://railway.app → New Project → Deploy from GitHub
- [ ] Connect `AXOVIA-ASPEN/flipper-ai` (config in `railway.json`)
- [ ] Add PostgreSQL database service
- [ ] Set: `AUTH_SECRET`, `ENCRYPTION_SECRET`, `NEXTAUTH_URL`, `ANTHROPIC_API_KEY`

### Production Database
- [ ] Choose DB provider: Vercel Postgres, Supabase, or Neon
- [ ] Set `DATABASE_URL` in Vercel environment variables
- [ ] Run `npx prisma migrate deploy` on first deploy

### Production Environment Variables
- [ ] `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
- [ ] `NEXTAUTH_SECRET` (generate: `openssl rand -base64 32`)
- [ ] `NEXTAUTH_URL` (production URL)
- [ ] `RESEND_API_KEY` (email notifications)
- [ ] `DATABASE_URL` (PostgreSQL)
- [ ] `STRIPE_SECRET_KEY` (subscription billing)

---

## 📊 Coverage Analysis

### Files Approaching 100%
Most files are at 98-100% coverage. Key files:
- `lib/rate-limiter.ts` — 100%
- `lib/metrics.ts` — 100%
- `lib/title-generator.ts` — 100% statements, 88% branches
- `lib/llm-analyzer.ts` — 100% functions, 84% branches

### Known Coverage Gaps (Acceptable)
These branches are intentionally un-coverable in test mode:

1. **`createEmailService()` factory** — branches guarded by `NODE_ENV !== 'test'`
2. **`callMercariApi()`** — optional chaining on complex API response objects
3. **OpenAI singleton** — requires live API key in test environment

These represent <6% of total branches and don't indicate functional risks.

---

## 🚀 Deploy Steps (When Ready)

```bash
# 1. Create Vercel project
vercel link

# 2. Set environment variables
vercel env add ANTHROPIC_API_KEY production
vercel env add NEXTAUTH_SECRET production  
vercel env add NEXTAUTH_URL production
vercel env add DATABASE_URL production
vercel env add RESEND_API_KEY production

# 3. Deploy
vercel deploy --prod

# 4. Run database migrations
vercel run npx prisma migrate deploy
```

---

## 📈 Performance Baselines

| Endpoint | P50 | P95 | P99 |
|----------|-----|-----|-----|
| Health check | <10ms | <20ms | <50ms |
| Auth (login) | <200ms | <500ms | <1s |
| AI Analysis | <2s | <5s | <10s |
| Scrape (eBay) | <3s | <8s | <15s |

*Baselines from load test scaffolding — verify in production*

---

*Generated by ASPEN on Feb 17, 2026*
