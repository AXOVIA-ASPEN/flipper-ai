# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This monorepo contains **Flipper.ai**, an AI-powered marketplace scraper that finds underpriced items for resale profit. The main application is in the `flipper-ai/` directory.

## Commands

All commands should be run from the `flipper-ai/` directory:

```bash
cd flipper-ai

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
- **Scraping**: Stagehand with Google Gemini AI (requires `GOOGLE_API_KEY`)
- **Testing**: Jest (unit), Playwright (E2E)

### Key Directories
```
flipper-ai/
├── src/app/                    # Next.js App Router
│   ├── api/                    # API routes
│   │   ├── listings/           # Listings CRUD
│   │   ├── opportunities/      # Opportunities CRUD
│   │   └── scraper/craigslist/ # Craigslist scraper endpoint
│   ├── page.tsx                # Dashboard (listings view)
│   ├── opportunities/page.tsx  # Opportunities management
│   └── scraper/page.tsx        # Scraper control UI
├── src/lib/
│   ├── db.ts                   # Prisma client instance
│   └── value-estimator.ts      # Profit calculation & scoring logic
├── src/__tests__/              # Jest unit tests
├── e2e/                        # Playwright E2E tests
└── prisma/
    └── schema.prisma           # Database schema
```

### Data Flow
1. **Scraping**: `/api/scraper/craigslist` uses Stagehand to extract listings
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

## Stagehand Usage

When working with the scraper, use Stagehand's methods:
- `page.act(instruction)` - Perform actions
- `page.observe(instruction)` - Plan before executing
- `page.extract({instruction, schema})` - Extract structured data with Zod schemas

Always close Stagehand instances in finally blocks.
