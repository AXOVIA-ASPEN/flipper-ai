# Flipper AI — Deployment Guide

## Deployment Options

| Method                   | Best For                                  | Cost                |
| ------------------------ | ----------------------------------------- | ------------------- |
| **Vercel** (recommended) | Production, auto-scaling, preview deploys | Free tier available |
| **Railway** (easiest)    | One-click deploy, PostgreSQL included     | Free tier available |
| **Docker**               | Self-hosted, full control                 | Your infra costs    |

---

## Quick Start (Railway) — Easiest Option

Railway auto-detects Next.js, provides PostgreSQL, and deploys in minutes.

### 1. One-Click Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/AXOVIA-ASPEN/flipper-ai)

Or manually:

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Connect `AXOVIA-ASPEN/flipper-ai` repository
3. Railway auto-detects Next.js from `railway.json`

### 2. Add PostgreSQL Database

In Railway dashboard → New → Database → Add PostgreSQL
Railway automatically sets `DATABASE_URL` in your environment.

### 3. Set Environment Variables

In Railway dashboard → Your service → Variables:

| Variable            | Value                          | How to Generate             |
| ------------------- | ------------------------------ | --------------------------- |
| `AUTH_SECRET`       | Random string                  | `openssl rand -base64 32`   |
| `ENCRYPTION_SECRET` | Random string (≥16 chars)      | `openssl rand -base64 32`   |
| `NEXTAUTH_URL`      | Your Railway URL               | From Railway dashboard      |
| `ANTHROPIC_API_KEY` | Your Anthropic key             | From Anthropic console      |

### 4. Deploy

Railway deploys automatically when you push to `main`. First deploy runs:
```bash
npx prisma migrate deploy && pnpm start
```

### 5. Custom Domain (Optional)

In Railway → Settings → Custom Domain → Add domain `flipper-ai.axovia.ai`

---

## Quick Start (Vercel) — Recommended

### 1. Prerequisites

- [Vercel account](https://vercel.com)
- GitHub repo connected to Vercel
- PostgreSQL database (Neon, Supabase, or PlanetScale recommended)

### 2. Initial Setup

```bash
# Install Vercel CLI
pnpm add -g vercel

# Link project
vercel link

# Note your org and project IDs from .vercel/project.json
```

### 3. Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

| Variable            | Required | Description                  |
| ------------------- | -------- | ---------------------------- |
| `DATABASE_URL`      | ✅       | PostgreSQL connection string |
| `AUTH_SECRET`       | ✅       | `openssl rand -base64 32`    |
| `ENCRYPTION_SECRET` | ✅       | `openssl rand -base64 32`    |
| `NEXTAUTH_URL`      | ✅       | Your production URL          |
| `ANTHROPIC_API_KEY` | ✅       | For AI analysis features     |
| `EBAY_APP_ID`       | ⬚        | eBay marketplace integration |
| `EBAY_CERT_ID`      | ⬚        | eBay marketplace integration |

### 4. GitHub Actions Secrets

Add to repo Settings → Secrets → Actions:

- `VERCEL_TOKEN` — From [Vercel Tokens](https://vercel.com/account/tokens)
- `VERCEL_ORG_ID` — From `.vercel/project.json`
- `VERCEL_PROJECT_ID` — From `.vercel/project.json`

### 5. Deploy

```bash
# Preview deploy
vercel

# Production deploy
vercel --prod
```

### 6. Custom Domain

```bash
vercel domains add flipper-ai.com
```

Then update DNS records as shown in Vercel dashboard.

### Automatic Deployments

- **Push to `main`** → Production deploy
- **Pull Request** → Preview deploy with unique URL (commented on PR)

### Vercel Configuration

See `vercel.json` for:

- Security headers (HSTS, CSP, X-Frame-Options)
- API route caching policies
- Serverless function timeouts (30s max)
- Health check rewrite (`/health` → `/api/health`)

---

## Error Tracking & Performance Monitoring (Sentry)

Flipper AI uses Sentry for production error tracking and performance monitoring.

### 1. Create Sentry Project

1. Go to [sentry.io](https://sentry.io) and create an account (or log in)
2. Create a new project → Select "Next.js" as the platform
3. Choose your organization (or create one)
4. Name the project `flipper-ai` (or your preferred name)
5. Copy the **DSN** (Data Source Name) — looks like `https://abc123@o123456.ingest.sentry.io/123456`

### 2. Generate Auth Token

1. Go to **Settings** → **Account** → **API** → **Auth Tokens**
2. Click **Create New Token**
3. Name: `flipper-ai-source-maps`
4. Scopes: Select **project:releases** and **project:write**
5. Copy the token (you'll only see it once!)

### 3. Configure Environment Variables

Add these to your deployment platform (Vercel/Railway/Docker):

| Variable                 | Value                          | Where to Get It                    |
| ------------------------ | ------------------------------ | ---------------------------------- |
| `SENTRY_DSN`             | Server-side DSN                | Sentry project settings            |
| `NEXT_PUBLIC_SENTRY_DSN` | Client-side DSN (same as above)| Sentry project settings            |
| `SENTRY_ORG`             | Your org slug (e.g. `axovia`)  | Sentry organization settings       |
| `SENTRY_PROJECT`         | Your project slug              | Sentry project settings            |
| `SENTRY_AUTH_TOKEN`      | Auth token for source maps     | Created in step 2                  |

### 4. Verify Setup

After deploying with Sentry enabled:

1. Visit your app and trigger a test error (optional: create `/api/sentry-test` endpoint)
2. Check Sentry dashboard → **Issues** — you should see the error appear within seconds
3. Click the error → verify source maps are working (you should see original code, not minified)

### 5. Configure Alerts (Optional)

In Sentry dashboard:

1. Go to **Alerts** → **Create Alert Rule**
2. Example rule: Email me when error count > 10 in 1 minute
3. Add team members or Slack integration for notifications

### Features Enabled

- **Error Tracking**: Automatic capture of unhandled exceptions (client + server + edge)
- **Performance Monitoring**: 10% sampling in production (configurable in `sentry.*.config.ts`)
- **Session Replay**: 1% of normal sessions, 100% of sessions with errors
- **Source Maps**: Uploaded automatically during production builds
- **Security**: Sensitive data (tokens, IPs, database URLs) filtered via `beforeSend` hooks

### Development Mode

Sentry is **disabled by default** in development to avoid noise. To enable locally:

```bash
# .env.local
SENTRY_ENABLED="true"
SENTRY_DSN="your-dsn-here"
NEXT_PUBLIC_SENTRY_DSN="your-dsn-here"
```

---

## Quick Start (Docker)

```bash
# 1. Copy and configure environment
cp .env.production.example .env.production
# Edit .env.production with real values

# 2. Build and run
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# 3. Run database migrations
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# 4. Verify
curl http://localhost:3000/api/health
```

## Architecture

```
[Client] → [Next.js App :3000] → [PostgreSQL :5432]
                                    └── pgdata volume
```

## Environment Variables

See `.env.production.example` for all required variables.

### Required Secrets

| Variable            | Description                  | How to Generate             |
| ------------------- | ---------------------------- | --------------------------- |
| `AUTH_SECRET`       | NextAuth session signing     | `openssl rand -base64 32`   |
| `ENCRYPTION_SECRET` | Data encryption key          | `openssl rand -base64 32`   |
| `POSTGRES_PASSWORD` | Database password            | `openssl rand -hex 16`      |
| `DATABASE_URL`      | PostgreSQL connection string | Use Postgres password above |

### GitHub Actions Secrets

Add these in Settings → Secrets → Actions:

- `AUTH_SECRET`
- `ENCRYPTION_SECRET`
- `DATABASE_URL` (for CI with real DB)
- `DOCKER_REGISTRY_TOKEN` (if pushing images)

## Docker Build

Multi-stage build (3 stages):

1. **deps** — Install node_modules
2. **builder** — Build Next.js (standalone output)
3. **runner** — Minimal Alpine image (~150MB)

```bash
# Build only
docker build -t flipper-ai:latest .

# Build with cache
docker buildx build --cache-from type=gha --cache-to type=gha,mode=max -t flipper-ai:latest .
```

## Health Check

The container includes a health check at `/api/health`:

```bash
curl http://localhost:3000/api/health
# → {"status":"ok","timestamp":"..."}
```

## Database

### Migrations

```bash
# Apply pending migrations
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# Check migration status
docker compose -f docker-compose.prod.yml exec app npx prisma migrate status
```

### Backups

```bash
# Backup
docker compose -f docker-compose.prod.yml exec db pg_dump -U flipper flipper_ai > backup_$(date +%Y%m%d).sql

# Restore
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U flipper flipper_ai
```

## Scaling

For production traffic, consider:

- **Reverse proxy:** nginx/Caddy in front for SSL termination
- **Horizontal scaling:** Multiple app containers behind load balancer
- **Database:** Managed PostgreSQL (AWS RDS, Supabase, Neon)
- **CDN:** Cloudflare/Vercel Edge for static assets

## Monitoring

- Container health: `docker compose ps`
- Logs: `docker compose logs -f app`
- Metrics: Add Prometheus endpoint at `/api/metrics` (future)
