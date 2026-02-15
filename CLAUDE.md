# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> When contributing here, operate as a professional, world-class software engineer with extensive front-end design expertise, great object-oriented architecture instincts, 10+ years of successful frontend/backend SaaS delivery, and the business savvy required to implement Flipper.ai thoughtfully.

## Repository Overview

**Flipper.ai** is an AI-powered marketplace scraper that finds underpriced items for resale profit. It scrapes Craigslist (with plans for Facebook Marketplace, eBay, and OfferUp), analyzes flip potential, and tracks opportunities through the resale lifecycle.

## Commands

```bash
# Install dependencies and run migrations
make preview

# Development
pnpm dev                    # Start dev server at http://localhost:3000

# Testing
pnpm test                   # Run Jest unit tests
pnpm test -- path/to/test   # Run a single test file
pnpm test:e2e               # Run Playwright E2E tests
pnpm test:e2e:ui            # Run E2E tests with interactive UI
pnpm test:e2e:headed        # Run E2E tests in headed browser

# Database
npx prisma migrate dev      # Run migrations
npx prisma studio           # Open database GUI
npx prisma generate         # Regenerate Prisma client

# Build
pnpm build                  # Production build
pnpm lint                   # Run ESLint
```

## Architecture

### Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM (client generated to `src/generated/prisma/`)
- **Scraping**: Playwright for browser automation
- **Testing**: Jest (unit), Playwright (E2E)

### Key Directories

```
src/app/                        # Next.js App Router
├── api/                        # API routes (REST endpoints)
│   ├── listings/[id]/          # Single listing CRUD
│   ├── opportunities/[id]/     # Single opportunity CRUD
│   ├── scraper/craigslist/     # Craigslist scraper endpoint
│   ├── scraper-jobs/[id]/      # Scraper job management
│   └── search-configs/[id]/    # Saved search configs
├── page.tsx                    # Dashboard (listings view)
├── opportunities/page.tsx      # Opportunities management
├── scraper/page.tsx            # Scraper control UI
└── settings/page.tsx           # Settings page

src/lib/
├── db.ts                       # Prisma client singleton
└── value-estimator.ts          # Profit calculation & scoring logic

src/__tests__/                  # Jest unit tests
e2e/                            # Playwright E2E tests
prisma/schema.prisma            # Database schema
```

### Data Flow

1. **Scraping**: `/api/scraper/craigslist` uses Playwright to extract listings from search results
2. **Analysis**: `value-estimator.ts` scores items 0-100 based on category, brand, condition, and risk factors
3. **Storage**: Prisma stores listings in SQLite with status tracking
4. **Opportunities**: Listings with score 70+ become opportunities for tracking through purchase/resale

### Database Models

- `Listing`: Scraped items with value analysis, comparable URLs, AI-generated purchase messages
- `Opportunity`: Active flips linked to listings, tracks purchase/resale/profit
- `ScraperJob`: Run history and status
- `SearchConfig`: Saved search configurations
- `PriceHistory`: Market value reference data

### Value Scoring System

Items scored 0-100 in `value-estimator.ts` using:

- Category multipliers (electronics, furniture, collectibles)
- Brand detection (Apple, Sony, Dyson, vintage items)
- Condition analysis (new, like new, good, fair, poor)
- Risk factors (broken, parts only, needs repair)

### API Route Pattern

All API routes follow Next.js App Router conventions:

- `route.ts` exports HTTP method handlers (GET, POST, PATCH, DELETE)
- Dynamic routes use `[id]` folder pattern
- Returns `NextResponse.json()` with consistent `{ success, data/message }` shape

## Scraper Implementation

The Craigslist scraper (`src/app/api/scraper/craigslist/route.ts`) uses Playwright:

- Launches headless Chromium with custom user agent
- Navigates to Craigslist search URL with filters
- Extracts listings via `page.evaluate()` with multiple selector fallbacks
- Runs value estimation on each listing before storage
- Always closes browser in finally block
