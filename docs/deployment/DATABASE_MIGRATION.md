# Database Migration: SQLite → PostgreSQL

**Author:** Stephen Boyett  
**Company:** Axovia AI  
**Project:** Flipper AI  
**Date:** February 17, 2026  
**Status:** 📋 Ready to Execute (pending production environment)

---

## Overview

Flipper AI currently uses **SQLite** for local development and staging. The production deployment requires **PostgreSQL** for:
- Concurrent user support (SQLite has write locking)
- Cloud-native hosting (Vercel Postgres, Supabase, Neon)
- Connection pooling via PgBouncer/Prisma Accelerate
- Point-in-time recovery and automated backups

---

## Architecture

```
Development:  SQLite (file:./dev.db)  ← current
Staging:      SQLite (PM2, localhost:3001)  ← current  
Production:   PostgreSQL (cloud provider)  ← target
```

---

## Step 1: Update Prisma Schema for PostgreSQL

The existing `prisma/schema.prisma` uses SQLite-specific syntax. For PostgreSQL:

### 1a. Switch the datasource provider

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Note:** The schema already uses `String` for JSON fields (imageUrls, tags, etc.) due to SQLite limitations. With PostgreSQL, you CAN upgrade these to native `Json` type — but it requires a data migration step. The current schema is **PostgreSQL-compatible as-is** (SQLite strings work in PG).

### 1b. Optional: Upgrade JSON fields to native `Json` type

After initial migration, consider upgrading these fields in a follow-up migration:
```prisma
imageUrls  Json?    // was: String?
tags       Json?    // was: String?  
comparableUrls Json? // was: String?
```

### 1c. Multi-provider setup (recommended pattern)

Keep `DATABASE_URL` in the environment:
```env
# .env (local dev — SQLite)
DATABASE_URL="file:./dev.db"

# Production (PostgreSQL)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/flipper_ai?sslmode=require&pgbouncer=true&connection_limit=1"
```

Prisma auto-detects the provider from the URL when using:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // For migrations (bypass PgBouncer)
}
```

---

## Step 2: Create PostgreSQL Migration

### 2a. Generate the initial migration

```bash
# Set DATABASE_URL to your PostgreSQL instance
export DATABASE_URL="postgresql://postgres:password@localhost:5432/flipper_ai"

# Generate migration from current schema
npx prisma migrate dev --name init_postgresql

# Or for production (no dev workflow):
npx prisma migrate deploy
```

### 2b. Local PostgreSQL via Docker (for testing)

```bash
# Start a local PostgreSQL container
docker run -d \
  --name flipper-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=flipper_ai \
  -p 5432:5432 \
  postgres:16-alpine

# Verify connection
docker exec -it flipper-pg psql -U postgres -d flipper_ai -c '\dt'

# Run Prisma migrations against it
DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/flipper_ai" \
  npx prisma migrate deploy

# Verify tables created
DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/flipper_ai" \
  npx prisma db pull
```

### 2c. Docker Compose setup (for full local dev stack)

Add to `docker-compose.yml`:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: devpassword
      POSTGRES_DB: flipper_ai
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

---

## Step 3: Data Migration (SQLite → PostgreSQL)

If you need to migrate existing data from SQLite:

```bash
# 1. Export from SQLite
npx prisma db pull  # ensure schema is synced
node scripts/export-sqlite.js  # see script below

# 2. Import to PostgreSQL
DATABASE_URL="postgresql://..." node scripts/import-postgres.js
```

### Export Script

```javascript
// scripts/export-sqlite.js
const { PrismaClient: SQLiteClient } = require('./src/generated/prisma');
const fs = require('fs');

const sqlite = new SQLiteClient({ datasourceUrl: 'file:./dev.db' });

async function exportAll() {
  const users = await sqlite.user.findMany({ include: { accounts: true, sessions: true } });
  const listings = await sqlite.listing.findMany();
  const opportunities = await sqlite.opportunity.findMany();
  const messages = await sqlite.message.findMany();
  const scraperJobs = await sqlite.scraperJob.findMany();

  const data = { users, listings, opportunities, messages, scraperJobs };
  fs.writeFileSync('migration-data.json', JSON.stringify(data, null, 2));
  console.log(`✅ Exported: ${listings.length} listings, ${opportunities.length} opportunities`);
  await sqlite.$disconnect();
}

exportAll().catch(console.error);
```

### Import Script

```javascript
// scripts/import-postgres.js
const { PrismaClient: PGClient } = require('./src/generated/prisma');
const data = require('./migration-data.json');

const pg = new PGClient({ datasourceUrl: process.env.DATABASE_URL });

async function importAll() {
  // Import in dependency order
  for (const user of data.users) {
    await pg.user.upsert({ where: { id: user.id }, create: user, update: user });
  }
  for (const listing of data.listings) {
    await pg.listing.upsert({ where: { id: listing.id }, create: listing, update: listing });
  }
  for (const opp of data.opportunities) {
    await pg.opportunity.upsert({ where: { id: opp.id }, create: opp, update: opp });
  }
  for (const msg of data.messages) {
    await pg.message.upsert({ where: { id: msg.id }, create: msg, update: msg });
  }
  console.log('✅ Migration complete');
  await pg.$disconnect();
}

importAll().catch(console.error);
```

---

## Step 4: Connection Pooling

### Why PgBouncer / Prisma Accelerate?

Serverless environments (Vercel, Railway) create a new database connection per request. PostgreSQL has a hard connection limit (~100 by default). Without pooling, you'll get `ECONNREFUSED` under load.

### Option A: Prisma Accelerate (Recommended for Vercel)

1. Sign up at https://www.prisma.io/accelerate
2. Create a project and connect your PostgreSQL
3. Get the `prisma://` connection URL
4. Update your environment:

```env
DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=YOUR_KEY"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/flipper_ai"  # for migrations
```

5. Update schema:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // pooled via Accelerate
  directUrl = env("DIRECT_URL")        // direct for migrations
}
```

6. Install: `npm install @prisma/extension-accelerate`
7. Update client initialization:
```typescript
// src/lib/prisma.ts
import { PrismaClient } from './generated/prisma';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());
```

### Option B: Supabase Connection Pooling

Supabase provides built-in PgBouncer:
```env
# Transaction mode (Serverless) - port 6543
DATABASE_URL="postgresql://postgres.PROJECT:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Session mode (migrations) - port 5432
DIRECT_URL="postgresql://postgres.PROJECT:PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

### Option C: Railway with PgBouncer

Railway includes PostgreSQL + PgBouncer in their managed database offering. Set the `DATABASE_URL` from Railway dashboard.

---

## Step 5: Production Checklist

```bash
# Before deploying to production:

# 1. Test connection
DATABASE_URL="postgresql://..." npx prisma db pull

# 2. Run migrations
DATABASE_URL="postgresql://..." npx prisma migrate deploy

# 3. Verify schema
DATABASE_URL="postgresql://..." npx prisma studio

# 4. Run all tests against PostgreSQL
DATABASE_URL="postgresql://..." npm test

# 5. Verify app starts
DATABASE_URL="postgresql://..." npm start
```

---

## Cloud Provider Comparison

| Provider | Free Tier | Connection Pooling | Best For |
|----------|-----------|-------------------|---------|
| **Vercel Postgres** (Neon) | 256MB / 60hr | Serverless-native | Vercel deploy |
| **Supabase** | 500MB / 2 projects | Built-in PgBouncer | Full-stack |
| **Neon** | 0.5GB / 3 projects | Serverless branches | Dev/test isolation |
| **Railway** | $5 credit/mo | PgBouncer included | Simple deploy |
| **PlanetScale** | MySQL only | N/A | Not recommended |

**Recommendation:** Use **Supabase** for full production (free tier generous, PgBouncer built in, great DX).

---

## Rollback Plan

If PostgreSQL migration fails:
1. `git revert` the schema change
2. Restore `DATABASE_URL="file:./dev.db"` in environment
3. App will continue running on SQLite
4. No data loss (SQLite file untouched)

---

## Environment Variables Reference

```env
# Development (SQLite)
DATABASE_URL="file:./dev.db"

# Staging (SQLite)
DATABASE_URL="file:./dev.db"

# Production (PostgreSQL — choose one)
DATABASE_URL="postgresql://user:pass@host:5432/flipper_ai?sslmode=require"
# OR with Prisma Accelerate:
DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=KEY"
DIRECT_URL="postgresql://user:pass@host:5432/flipper_ai"
# OR Supabase:
DATABASE_URL="postgresql://postgres.[project]:[pass]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[project]:[pass]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

---

*Generated by ASPEN for Axovia AI — February 17, 2026*
