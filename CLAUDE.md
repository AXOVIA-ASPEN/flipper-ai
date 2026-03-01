# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> When contributing here, operate as a professional, world-class software engineer with extensive front-end design expertise, great object-oriented architecture instincts, 10+ years of successful frontend/backend SaaS delivery, and the business savvy required to implement Flipper.ai thoughtfully.

## Repository Overview

**Flipper.ai** is an AI-powered marketplace scraper that finds underpriced items for resale profit. It scrapes Craigslist, Facebook Marketplace, eBay, OfferUp, and Mercari, analyzes flip potential with AI, and tracks opportunities through the full resale lifecycle (discovery → purchase → listing → sale → profit).

## Commands

```bash
# First-time setup: install deps, create .env, migrate DB, start dev server
make preview

# Development
make dev                    # Start dev server at http://localhost:3000

# Testing
make test                   # Jest unit tests (src/**/__tests__/)
pnpm test -- --testPathPattern="value-estimator"  # Run a single test file
pnpm test:coverage          # Jest with coverage report
make test-acceptance        # BDD tests (Cucumber/Gherkin, starts prod server)
make test-acceptance TAGS=@smoke  # BDD with tag filter
make test-e2e               # Playwright E2E tests
make test-e2e-ui            # E2E tests with interactive UI
make test-all               # All test suites

# Database
make migrate                # Run migrations (prisma migrate dev, interactive)
make db-sync                # Non-interactive schema sync (deploy + push)
make studio                 # Prisma Studio (database GUI)
make db-reset               # Reset database (WARNING: deletes all data)

# Build & quality
make build                  # Production build (strict TS, no ignoreBuildErrors)
make lint                   # ESLint
pnpm lint:fix               # Auto-fix lint issues
pnpm format                 # Prettier format
pnpm format:check           # Check formatting
```

Run `make help` for the full list of targets.

## Architecture

### Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL with Prisma ORM (SQLite/libSQL for local dev)
- **Auth**: NextAuth.js v5 (JWT strategy) with Google, GitHub, and credentials providers
- **AI**: Google Gemini via Stagehand, OpenAI, Anthropic Claude
- **Payments**: Stripe (checkout, subscriptions, webhooks)
- **Email**: Resend
- **Error Tracking**: Sentry
- **Scraping**: Playwright for browser automation
- **Testing**: Jest (unit), Cucumber/Gherkin (BDD), Playwright (E2E)
- **CI/CD**: GitHub Actions → Vercel

### Project Layout

The project uses a **split directory structure** — pages live in `app/` at the project root while source code lives in `src/`:

```
app/                            # Next.js App Router (pages + API routes)
├── api/                        # ~50 API route files
├── (auth)/login|register/      # Auth pages (route group, no /auth prefix in URL)
├── dashboard/                  # Main dashboard
├── opportunities/              # Opportunity tracking
├── scraper/                    # Scraper control UI
├── settings/                   # User settings
├── messages/                   # Seller communication
├── analytics/                  # Profit/loss analytics
└── onboarding/                 # New user wizard

src/
├── components/                 # React components (Navigation, KanbanBoard, Onboarding/*, etc.)
├── contexts/ThemeContext.tsx    # Theme provider (light/dark)
├── lib/                        # Core business logic (~40 modules)
│   ├── db.ts                   # Prisma client singleton
│   ├── auth.ts                 # NextAuth config (exports { auth, signIn, signOut })
│   ├── errors.ts               # AppError classes + errorResponse() + handleError()
│   ├── value-estimator.ts      # Profit scoring engine (0-100)
│   ├── llm-analyzer.ts         # LLM-based listing analysis
│   ├── stripe.ts               # Stripe integration
│   ├── subscription-tiers.ts   # FREE/PRO/ENTERPRISE tier logic
│   └── ...                     # See src/lib/ for full list
├── generated/prisma/           # Generated Prisma client (DO NOT EDIT)
└── __tests__/                  # Jest unit tests

prisma/schema.prisma            # Database schema (14 models)
test/features/                  # Cucumber BDD feature files + step definitions
config/                         # Docker, PM2 configs
```

### Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`). Pages in `app/` import from `src/` using `@/lib/...`, `@/components/...`, etc.

### Key Architectural Patterns

**API Routes**: All routes in `app/api/` export named HTTP method handlers (GET, POST, PATCH, DELETE). They use the standardized error system from `src/lib/errors.ts`:
- Throw `AppError` subclasses (`NotFoundError`, `ValidationError`, `UnauthorizedError`, etc.)
- Catch with `handleError(error)` which returns RFC 7807 compliant `NextResponse`
- Response shape: `{ success: true, data: ... }` or `{ success: false, error: { code, detail, ... } }`

**Auth**: `src/lib/auth.ts` configures NextAuth v5 with PrismaAdapter. API routes call `getCurrentUserId()` or `requireAuth()` to get the authenticated user. Auth pages use the `(auth)` route group.

**Provider Stack**: Root layout wraps the app in `SessionProvider` → `ThemeProvider` → `ToastProvider`.

**Database**: `src/lib/db.ts` exports a Prisma singleton. The schema uses `cuid()` IDs, `@updatedAt` timestamps, and extensive indexing. Prisma client is generated to `src/generated/prisma/` (runs via `postinstall` hook).

**Prisma Config**: Uses `prisma.config.ts` at the project root with `dotenv/config` for env loading. The datasource URL comes from `DATABASE_URL`.

### Data Flow

1. **Scraping**: Platform scrapers (`app/api/scraper/`) use Playwright to extract listings
2. **Analysis**: `value-estimator.ts` scores items 0-100 based on category, brand, condition, and risk factors. Items scoring 70+ become opportunities.
3. **AI Enhancement**: `llm-analyzer.ts` enriches listings with market value, demand analysis, and resale strategy via LLM
4. **Storage**: All data persisted via Prisma ORM with user-scoped queries
5. **Lifecycle**: Users track opportunities through IDENTIFIED → PURCHASED → LISTED → SOLD statuses

### Testing Architecture

- **Jest** (`jest.config.js`): Tests in `src/__tests__/`. Uses `ts-jest` transform, `maxWorkers: 1`. Module aliases match tsconfig paths. Coverage thresholds: 96% branches, 98% functions, 99% lines/statements. Integration tests excluded by default (run via `pnpm test:integration`).
- **Cucumber BDD** (`test/features/`): 9 feature files with step definitions. Runs against a production build via `start-server-and-test`.
- **Playwright** (`playwright.config.ts`): Tests in `e2e/`. 5 browser projects (chromium, firefox, webkit, mobile-chrome, mobile-safari). Locally defaults to port 3001 (PM2 staging), CI uses port 3000.

### Coverage Enforcement

Jest enforces coverage thresholds in CI — branches 96%, functions 98%, lines 99%, statements 99%. Adding new code to `src/lib/`, `app/api/`, or `src/scrapers/` requires maintaining these thresholds.
