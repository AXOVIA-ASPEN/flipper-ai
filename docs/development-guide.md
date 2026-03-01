# Development Guide - Flipper.ai

> Generated: 2026-02-27 | Scan Level: Deep

## Prerequisites

- **Node.js** v20+ (for Next.js 16 compatibility)
- **pnpm** (primary package manager)
- **PostgreSQL** (or SQLite for local dev via `dev.db`)
- **Playwright browsers** (installed via `npx playwright install`)

### Optional
- **OpenAI API key** — Enables LLM-powered item identification and analysis
- **Anthropic API key** — Enables Claude-based item analysis
- **Stripe keys** — Enables subscription billing
- **Sentry DSN** — Enables error tracking
- **eBay OAuth token** — Enables eBay scraping
- **Facebook OAuth** — Enables Facebook Marketplace scraping

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd flipper-ai
pnpm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your database URL and API keys

# 3. Set up database
npx prisma generate
npx prisma migrate dev

# 4. Start development server
pnpm dev
# Or use the Makefile:
make preview  # install + migrate + dev
```

Open http://localhost:3000

---

## Makefile Commands

The `Makefile` is the primary developer command interface:

```bash
# Development
make install          # Install dependencies + generate Prisma client
make dev              # Start Next.js dev server
make preview          # Full setup: install → migrate → dev

# Build & Quality
make build            # Production build
make lint             # Run ESLint
make start            # Start production server

# Database
make migrate          # Run Prisma migrations (interactive)
make db-sync          # Non-interactive schema sync
make studio           # Open Prisma Studio (database GUI)
make db-reset         # Reset database (WARNING: deletes all data)

# Testing
make test             # Jest unit tests
make test-e2e         # Playwright E2E tests
make test-e2e-ui      # E2E tests with interactive UI
make test-acceptance  # Cucumber BDD tests
make test-all         # Run all test suites
```

---

## npm Scripts

```bash
pnpm dev              # Next.js dev server
pnpm build            # prisma generate + db push + next build
pnpm test             # Jest tests (no coverage)
pnpm test:coverage    # Jest with coverage report
pnpm test:integration # Integration tests (separate config)
pnpm test:e2e         # Playwright E2E tests
pnpm test:bdd         # Cucumber BDD tests (starts server first)
pnpm test:perf        # Performance benchmarks
pnpm test:load        # Load testing (autocannon)
pnpm lint             # ESLint
pnpm format           # Prettier formatting
```

---

## Environment Variables

### Required
```bash
DATABASE_URL=          # PostgreSQL connection string (or file:./dev.db for SQLite)
NEXTAUTH_SECRET=       # NextAuth session encryption key
NEXTAUTH_URL=          # App base URL (http://localhost:3000 for dev)
```

### AI Integration (Optional)
```bash
OPENAI_API_KEY=        # Enables GPT-4o-mini analysis, descriptions, titles
ANTHROPIC_API_KEY=     # Enables Claude Sonnet item analysis
CLAUDE_MODEL=          # Override Claude model (default: claude-sonnet-4-5-20250929)
GOOGLE_API_KEY=        # Enables Stagehand (Gemini) for Facebook scraping
```

### External Services (Optional)
```bash
STRIPE_SECRET_KEY=     # Stripe billing
STRIPE_WEBHOOK_SECRET= # Stripe webhook verification
SENTRY_DSN=            # Error tracking
SENTRY_ORG=            # Sentry organization
SENTRY_PROJECT=        # Sentry project name
SENTRY_AUTH_TOKEN=     # Source map uploads
EBAY_OAUTH_TOKEN=      # eBay Browse API access
RESEND_API_KEY=        # Email sending (Resend)
HCAPTCHA_SECRET_KEY=   # Login CAPTCHA verification
```

See `.env.example` for the complete template.

---

## Database

### Schema Location
`prisma/schema.prisma` — 13 models (Listing, Opportunity, User, etc.)

### Common Operations
```bash
npx prisma generate    # Regenerate Prisma client after schema changes
npx prisma migrate dev # Create and apply migration
npx prisma db push     # Push schema to DB without migration (dev only)
npx prisma studio      # GUI database browser
npx prisma db seed     # Run seed script (prisma/seed.ts)
```

### Prisma Client
Generated to `src/generated/prisma/`. Singleton instance at `src/lib/db.ts`.

---

## Testing

### Test Pyramid

| Level | Tool | Command | Location |
|-------|------|---------|----------|
| Unit | Jest | `make test` | `src/__tests__/lib/`, `src/__tests__/api/` |
| Component | Jest + Testing Library | `make test` | `src/__tests__/components/` |
| Integration | Jest + Prisma | `pnpm test:integration` | `src/__tests__/integration/` |
| Security | Jest | `make test` | `src/__tests__/security/` |
| Performance | Jest + Autocannon | `pnpm test:perf` | `src/__tests__/performance/` |
| E2E | Playwright | `make test-e2e` | `e2e/` |
| Visual | Playwright | `make test-e2e` | `e2e/visual/` |
| BDD | Cucumber | `make test-acceptance` | `features/` |

### Test Configuration
- `jest.config.js` — Main Jest config (SWC transform, jsdom environment)
- `jest.integration.config.js` — Integration test config
- `playwright.config.ts` — Playwright E2E config
- `cucumber.js` — Cucumber BDD config

---

## Code Quality

### Linting & Formatting
- **ESLint** — `eslint.config.mjs` (flat config)
- **Prettier** — `.prettierrc.js`
- **Pre-commit hooks** — Husky + lint-staged (auto-lint on commit)

### TypeScript
- **Strict mode** enabled
- **Path aliases**: `@/*` → `./src/*`
- **Target**: ES2017

---

## Project Structure Conventions

### API Routes
All API routes follow Next.js App Router pattern:
- `app/api/<resource>/route.ts` — Collection endpoints (GET list, POST create)
- `app/api/<resource>/[id]/route.ts` — Single resource (GET, PATCH, DELETE)
- Export named HTTP methods: `export async function GET(request) { ... }`
- Return `NextResponse.json({ success, data/message })`

### Components
- Located in `src/components/`
- Custom hooks in `src/hooks/`
- Contexts in `src/contexts/`
- No external component library — all custom-built with Tailwind

### Business Logic
- All services in `src/lib/`
- Database access through Prisma singleton (`src/lib/db.ts`)
- Error handling via custom `AppError` class (`src/lib/errors.ts`)

---

## Deployment

### Vercel (Primary)
```bash
vercel deploy          # Deploy to Vercel
vercel deploy --prod   # Production deployment
```
See `vercel.json` for configuration.

### Docker
```bash
docker build -t flipper-ai .
docker compose -f config/docker/docker-compose.yml up      # Local Docker dev
docker compose -f config/docker/docker-compose.prod.yml up  # Production
```

### CI/CD
GitHub Actions workflows in `.github/workflows/`:
- `ci.yml` — Lint, test, build on every PR
- `vercel-deploy.yml` — Vercel deployment
- `deploy-firebase.yml` — Firebase Cloud Functions
- `playwright-tests.yml` — E2E test pipeline
- `health-check.yml` — Scheduled health monitoring

---

## Common Development Tasks

### Adding a New API Endpoint
1. Create route file: `app/api/<resource>/route.ts`
2. Export HTTP method handlers
3. Add Zod validation schema in `src/lib/validations.ts`
4. Add tests in `src/__tests__/api/`

### Adding a New Component
1. Create component in `src/components/`
2. Add tests in `src/__tests__/components/`
3. Use `useThemeClasses()` hook for theme-aware styling

### Adding a New Scraper
1. Create route in `app/api/scraper/<platform>/route.ts`
2. Implement scraping logic (Playwright or API)
3. Use `marketplace-scanner.ts` for centralized viability analysis
4. Add platform to `SearchConfig` validation
5. Add tests in `src/__tests__/api/`
