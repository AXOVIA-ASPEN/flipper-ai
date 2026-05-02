# 🐧 Flipper AI - Deployment & Operations Runbook

**Author:** Stephen Boyett  
**Company:** Axovia AI  
**Last Updated:** February 15, 2026

---

## 1. Deployment Options

### Option A: Firebase Hosting + Cloud Run (Production)

```bash
# Deploy frontend
firebase deploy --only hosting

# Deploy backend
gcloud run deploy flipper-web \
  --image gcr.io/axovia-flipper/flipper-web \
  --region us-east1 \
  --allow-unauthenticated
```

**Pros:** Full GCP integration, auto-scaling, 300s+ timeout for scrapers, GCP Secret Manager  
**Cons:** Slightly more setup than PaaS

### Option B: Docker (Self-Hosted / Railway / Fly.io)

```bash
# Build
docker compose -f config/docker/docker-compose.prod.yml build

# Run
docker compose -f config/docker/docker-compose.prod.yml --env-file .env.production up -d

# Migrate DB
docker compose -f config/docker/docker-compose.prod.yml exec app npx prisma migrate deploy

# Health check
curl http://localhost:3200/api/health
```

---

## 2. Environment Setup

### Required Variables

```bash
# Generate secrets
ENCRYPTION_SECRET=$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)

# Database (use your hosted DB URL)
DATABASE_URL="postgresql://flipper:${POSTGRES_PASSWORD}@host:5432/flipper_ai"

# App
NODE_ENV=production
APP_URL=https://your-domain.com
```

### Database Options

| Provider | Free Tier | Notes               |
| -------- | --------- | ------------------- |
| Supabase | 500MB     | Built-in auth, easy |
| Neon     | 512MB     | Serverless Postgres |
| Railway  | $5/mo     | Simple, good DX     |
| AWS RDS  | 750h free | Production-grade    |

---

## 3. Monitoring

### Health Check

```bash
# Basic health
curl https://your-domain.com/api/health

# Automated (cron every 5 min)
*/5 * * * * curl -sf https://your-domain.com/api/health || alert
```

### Error Tracking (Sentry)

```bash
pnpm add @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### Uptime Monitoring

- UptimeRobot (free, 5-min intervals)
- Better Uptime (free tier available)

---

## 4. Database Operations

### Migrations

```bash
# Create migration
npx prisma migrate dev --name description

# Deploy to production
npx prisma migrate deploy

# Reset (DESTRUCTIVE - dev only!)
npx prisma migrate reset
```

### Backups

```bash
# Dump
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20260215.sql
```

---

## 5. Troubleshooting

| Issue          | Check                     | Fix                                                  |
| -------------- | ------------------------- | ---------------------------------------------------- |
| 500 errors     | Logs, Sentry              | Check env vars, DB connection                        |
| Slow responses | Network tab, DB queries   | Add indexes, optimize queries                        |
| Auth failures  | ENCRYPTION_SECRET, APP_URL | Regenerate secret, check URL                         |
| Build failures | CI logs                   | `pnpm install --frozen-lockfile`, check Node version |
| DB connection  | `prisma db pull`          | Check DATABASE_URL, firewall rules                   |

### Common Commands

```bash
# Check logs (Docker)
docker compose -f config/docker/docker-compose.prod.yml logs -f app

# Check logs (Cloud Run)
gcloud run services logs read flipper-web --region us-east1 --limit=100

# DB status
npx prisma migrate status

# Force rebuild
docker compose -f config/docker/docker-compose.prod.yml build --no-cache
```

---

## 6. Scaling

### Cloud Run

- Automatic (container-based auto-scaling)
- Configurable min/max instances
- ISR for static pages via Firebase Hosting CDN

### Docker

- Horizontal: `docker compose up --scale app=3`
- Add nginx load balancer
- Redis for session storage (multi-instance)

---

## 7. Security Checklist

- [x] Security headers (next.config.js / middleware)
- [x] Rate limiting on API routes
- [x] Input validation (Zod)
- [x] CSRF protection (Firebase Auth)
- [x] SQL injection prevention (Prisma parameterized queries)
- [x] Content Security Policy (CSP) header (next.config.js / middleware)
- [x] CORS configuration for API (next.config.js / middleware)
- [ ] WAF (if self-hosted)
