# Prisma Integration Guide

This document explains how Prisma is integrated into Flipper.ai for database management.

## What is Prisma?

Prisma is a modern, type-safe ORM (Object-Relational Mapping) for Node.js and TypeScript. It provides:

- **Type-safe database queries** - Auto-generated TypeScript types from your schema
- **Database migrations** - Version control for your database schema
- **Prisma Studio** - Visual database browser and editor

## Why Prisma is Free

Prisma's core tools are **100% free and open-source**:

| Component | Cost | Description |
|-----------|------|-------------|
| Prisma Client | Free | Query builder/ORM |
| Prisma Migrate | Free | Database migrations |
| Prisma Studio | Free | Visual database GUI |

Prisma has paid cloud services (Accelerate, Pulse) but we don't use them. Everything in Flipper.ai uses only the free, self-hosted components.

## Project Setup

### Database Configuration

We use **SQLite** for simplicity - a file-based database with zero configuration:

```
flipper-ai/
├── prisma/
│   ├── schema.prisma      # Database schema definition
│   ├── migrations/        # Migration history
│   └── dev.db             # SQLite database file (auto-generated)
├── prisma.config.ts       # Prisma configuration
└── src/
    ├── generated/prisma/  # Auto-generated Prisma Client
    └── lib/db.ts          # Database client singleton
```

### Environment Variables

The database URL is configured in `.env`:

```env
DATABASE_URL="file:./dev.db"
```

## Schema Overview

Our schema in `prisma/schema.prisma` defines these models:

### Listing
Scraped marketplace listings with flip analysis:
```prisma
model Listing {
  id              String    @id @default(cuid())
  platform        String    // CRAIGSLIST, FACEBOOK_MARKETPLACE, EBAY, OFFERUP
  title           String
  askingPrice     Float
  estimatedValue  Float?    // Calculated market value
  profitPotential Float?    // Estimated profit
  valueScore      Float?    // 0-100 flip score
  status          String    // NEW, OPPORTUNITY, PURCHASED, SOLD, etc.
  // ... more fields
}
```

### Opportunity
Flip opportunities being actively pursued:
```prisma
model Opportunity {
  id              String    @id @default(cuid())
  listingId       String    @unique
  listing         Listing   @relation(...)
  purchasePrice   Float?
  resalePrice     Float?
  actualProfit    Float?
  status          String    // IDENTIFIED, CONTACTED, PURCHASED, SOLD
  // ... more fields
}
```

### ScraperJob
Tracks scraper runs:
```prisma
model ScraperJob {
  id              String    @id @default(cuid())
  platform        String
  status          String    // PENDING, RUNNING, COMPLETED, FAILED
  listingsFound   Int
  // ... more fields
}
```

### SearchConfig
Saved search configurations for automated scraping:
```prisma
model SearchConfig {
  id              String    @id @default(cuid())
  name            String
  platform        String
  location        String
  category        String?
  enabled         Boolean
  // ... more fields
}
```

## Common Commands

### Install Dependencies & Generate Client
```bash
pnpm install
npx prisma generate
```

### Run Migrations
```bash
# Development - creates migration and applies it
npx prisma migrate dev

# Production - applies pending migrations
npx prisma migrate deploy
```

### Open Prisma Studio (Database GUI)
```bash
npx prisma studio
# Opens at http://localhost:5555
```

### Reset Database
```bash
npx prisma migrate reset
# WARNING: Deletes all data!
```

### Using the Makefile
```bash
make db-migrate   # Run migrations
make db-studio    # Open Prisma Studio
make db-reset     # Reset database
```

## Using Prisma in Code

### Import the Client
```typescript
import prisma from "@/lib/db";
```

### Query Examples

**Find all listings:**
```typescript
const listings = await prisma.listing.findMany({
  orderBy: { scrapedAt: "desc" },
  take: 50,
});
```

**Find opportunities with high scores:**
```typescript
const opportunities = await prisma.listing.findMany({
  where: {
    valueScore: { gte: 70 },
    status: "NEW",
  },
});
```

**Create a listing:**
```typescript
const listing = await prisma.listing.create({
  data: {
    externalId: "12345",
    platform: "CRAIGSLIST",
    title: "iPhone 13 Pro",
    askingPrice: 500,
    url: "https://...",
  },
});
```

**Update listing status:**
```typescript
await prisma.listing.update({
  where: { id: listingId },
  data: { status: "OPPORTUNITY" },
});
```

**Upsert (create or update):**
```typescript
await prisma.listing.upsert({
  where: {
    platform_externalId: { platform: "CRAIGSLIST", externalId: "12345" },
  },
  create: { /* new listing data */ },
  update: { /* updated fields */ },
});
```

## Schema Changes

When you modify `schema.prisma`:

1. **Create a migration:**
   ```bash
   npx prisma migrate dev --name describe_your_change
   ```

2. **Regenerate the client:**
   ```bash
   npx prisma generate
   ```

The migration will be saved in `prisma/migrations/` for version control.

## Troubleshooting

### "Table does not exist"
Run migrations:
```bash
npx prisma migrate dev
```

### "Prisma Client not generated"
Generate the client:
```bash
npx prisma generate
```

### "Cannot find module '@/generated/prisma'"
Make sure you've run:
```bash
pnpm install
npx prisma generate
```

### Database locked errors
Close Prisma Studio and any other connections, then retry.

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [SQLite with Prisma](https://www.prisma.io/docs/concepts/database-connectors/sqlite)
