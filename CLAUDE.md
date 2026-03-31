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
make test-ac                # Epic-organized acceptance tests (test/acceptance/features/)
make test-ac TAGS=@story-1-3     # Epic acceptance with tag filter
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
- **Database**: PostgreSQL with Prisma ORM + `PrismaPg` driver adapter (pool: 2 connections per Cloud Run instance)
- **Auth**: Firebase Auth (client-side sign-in → server session cookie). Legacy NextAuth models exist in schema but are deprecated.
- **AI**: OpenAI (LLM analysis), Google Gemini via Stagehand (browser automation), Anthropic Claude
- **Payments**: Stripe (checkout, subscriptions, webhooks)
- **Email**: Resend
- **CAPTCHA**: hCaptcha
- **Error Tracking**: Sentry
- **Scraping**: Playwright for browser automation, eBay Browse API (REST, not scraped)
- **Testing**: Jest (unit), Cucumber/Gherkin (BDD), Playwright (E2E)
- **CI/CD**: GitHub Actions → Vercel
- **Infrastructure**: Cloud Run (backend), Firebase Hosting, GCP Secret Manager (production secrets)

### Project Layout

The project uses a **split directory structure** — pages live in `app/` at the project root while source code lives in `src/`:

```
app/                            # Next.js App Router (pages + API routes)
├── api/                        # API route handlers (thin controllers)
├── (auth)/login|register/      # Auth pages (route group, no /auth prefix in URL)
├── dashboard/                  # Main dashboard
├── opportunities/              # Opportunity tracking
├── settings/                   # User settings
└── onboarding/                 # New user wizard

src/
├── components/                 # React components
├── contexts/ThemeContext.tsx    # Theme provider (light/dark)
├── lib/                        # Core business logic (~40 modules)
│   ├── db.ts                   # Prisma client singleton (PrismaPg adapter)
│   ├── auth.ts                 # Re-exports from firebase/session
│   ├── firebase/session.ts     # Firebase session cookie auth
│   ├── errors.ts               # AppError hierarchy + handleError()
│   ├── value-estimator.ts      # Algorithmic scoring engine (0-100)
│   ├── llm-analyzer.ts         # OpenAI-based listing analysis (two-layer cache)
│   ├── stripe.ts               # Stripe integration
│   └── subscription-tiers.ts   # FREE/PRO/ENTERPRISE tier logic
├── scrapers/                   # Platform scraper modules
│   ├── craigslist/             # Each has: index.ts, scraper.ts, types.ts
│   ├── ebay/
│   ├── facebook/               # Also has auth.ts + token-store.ts
│   ├── mercari/
│   └── offerup/
├── generated/prisma/           # Generated Prisma client (DO NOT EDIT)
└── __tests__/                  # Jest unit tests

prisma/schema.prisma            # Database schema
test/acceptance/features/       # Epic-organized Cucumber BDD features
test/acceptance/step_definitions/ # BDD step definitions (E-{epic}-{name}.steps.ts)
```

### Path Aliases

- `@/*` maps to `./src/*` — e.g., `@/lib/errors`, `@/components/KanbanBoard`
- `@/app/*` maps to `./app/*` in Jest config (needed for importing from `app/` in tests)

### Key Architectural Patterns

**API Routes**: All routes in `app/api/` export named HTTP method handlers (GET, POST, PATCH, DELETE). Standard pattern:
```typescript
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new UnauthorizedError('Unauthorized');
    // ... business logic ...
    return NextResponse.json({ success: true, data: ... });
  } catch (error) {
    return handleError(error);
  }
}
```
- Response shape: `{ success: true, data: ... }` or `{ success: false, error: { code, detail, ... } }` (RFC 7807)
- `handleError()` auto-maps error messages: "blocked"/"captcha" → RATE_LIMITED, "not found" → NOT_FOUND
- Retryable errors (`RATE_LIMITED`, `SERVICE_UNAVAILABLE`, `EXTERNAL_SERVICE_ERROR`) include `retryable: true` in response

**Error Hierarchy**: `src/lib/errors.ts` provides typed errors — `NotFoundError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `RateLimitError`, `ExternalServiceError`, `ConfigurationError`, `ConflictError`. Always throw specific subclasses, not generic `AppError`.

**Auth**: Firebase Auth with session cookies. `src/lib/auth.ts` re-exports from `src/lib/firebase/session.ts`:
- `getCurrentUserId()` → returns Prisma user `id` (cuid) or `null` if unauthenticated
- `requireAuth()` → throws `UnauthorizedError` if unauthenticated (use in routes that must be protected)
- Flow: client Firebase sign-in → POST `/api/auth/session` with Firebase ID token → server creates `__session` cookie (5-day TTL)
- User lookup: Firebase UID → `User.firebaseUid` → returns Prisma `id`

**Database**: `src/lib/db.ts` exports a Prisma singleton on `globalThis` (standard Next.js hot-reload pattern). Uses `PrismaPg` driver adapter with 2-connection pool per instance. Schema uses `cuid()` IDs, `@updatedAt` timestamps. Deduplication key: `@@unique([platform, externalId, userId])`.

**Provider Stack**: Root layout wraps the app in `SessionProvider` → `ThemeProvider` → `ToastProvider`.

### Scraper Architecture

Each platform scraper in `src/scrapers/{platform}/` follows the same structure:
- `types.ts` — interfaces, config constants (`SCRAPER_CONFIG`), timeouts/delays/retries
- `scraper.ts` — Playwright scraping logic with anti-detection (randomized UA, viewport, webdriver override)
- `index.ts` — public barrel re-export

API routes in `app/api/scraper/` are thin controllers that call into `src/scrapers/`. eBay is the exception — it uses the Browse API (REST) rather than browser scraping.

Key patterns: `hasRunningJob()` check prevents duplicate concurrent jobs, `Promise.race()` with session timeout wraps scrape operations, rate limit detection returns 403 with exponential backoff.

### Scoring & Analysis Pipeline

1. **Algorithmic scoring** (`value-estimator.ts`): Category multipliers, brand detection (regex), condition analysis, risk keyword penalties. Score formula: `(profitPotential / askingPrice) * 100 + 50`, clamped 0–100. Items scoring 70+ become opportunities. Default fee rate: 13%.
2. **LLM analysis** (`llm-analyzer.ts`): OpenAI with `temperature: 0.3`. Two-layer cache — L1 in-memory LRU keyed `openai:{listingId}`, L2 database `AiAnalysisCache` model with 24h TTL via `expiresAt`. Has `quickDiscountCheck()` that skips expensive API calls for items below a 40% algorithmic threshold.
3. **Lifecycle**: IDENTIFIED → PURCHASED → LISTED → SOLD → PASSED

### Testing Architecture

- **Jest** (`jest.config.js`): Tests in `src/__tests__/`. `testEnvironment: 'node'` (not jsdom), `maxWorkers: 1` (prevents resource conflicts), `forceExit: true`. Coverage collected from `src/lib/`, `app/api/`, `src/scrapers/` only. `src/lib/db.ts` and `src/generated/` excluded from coverage. Integration tests excluded by default (run via `pnpm test:integration`).
- **Cucumber BDD**: Two test directories — `test/features/` (legacy) and `test/acceptance/features/` (epic-organized). Step definitions follow `E-{epic}-{descriptor}.steps.ts` naming. Runs against production build via `start-server-and-test`.
- **Playwright** (`playwright.config.ts`): Tests in `e2e/`. 5 browser projects. Locally defaults to port 3001, CI uses port 3000.

### Coverage Enforcement

Jest enforces coverage thresholds — branches 96%, functions 98%, lines 99%, statements 99%. Adding new code to `src/lib/`, `app/api/`, or `src/scrapers/` requires maintaining these thresholds.

### Linting Rules

ESLint v9 flat config. `@typescript-eslint/no-explicit-any` is **off for test/config files only** — production code must avoid `any`. Test files may use `_`-prefixed unused vars. `docs/archive/**` is globally ignored.
