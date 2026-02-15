# Flipper AI — Deployment Guide

## Deployment Options

| Method | Best For | Cost |
|--------|----------|------|
| **Vercel** (recommended) | Production, auto-scaling, preview deploys | Free tier available |
| **Docker** | Self-hosted, full control | Your infra costs |

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

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `ENCRYPTION_SECRET` | ✅ | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | Your production URL |
| `ANTHROPIC_API_KEY` | ✅ | For AI analysis features |
| `EBAY_APP_ID` | ⬚ | eBay marketplace integration |
| `EBAY_CERT_ID` | ⬚ | eBay marketplace integration |

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
| Variable | Description | How to Generate |
|----------|-------------|-----------------|
| `AUTH_SECRET` | NextAuth session signing | `openssl rand -base64 32` |
| `ENCRYPTION_SECRET` | Data encryption key | `openssl rand -base64 32` |
| `POSTGRES_PASSWORD` | Database password | `openssl rand -hex 16` |
| `DATABASE_URL` | PostgreSQL connection string | Use Postgres password above |

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
