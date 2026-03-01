# 🐧 Flipper AI - Developer Setup Guide

**Author:** Stephen Boyett  
**Company:** Axovia AI  
**Last Updated:** February 15, 2026

---

## Prerequisites

- **Node.js** 20+ (recommended: use `nvm`)
- **pnpm** 9+ (`npm install -g pnpm`)
- **Git**
- **Docker** (optional, for production-like setup)

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/AXOVIA-ASPEN/flipper-ai.git
cd flipper-ai

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.production.example .env.local
# Edit .env.local — at minimum set:
#   AUTH_SECRET (run: openssl rand -base64 32)
#   ENCRYPTION_SECRET (run: openssl rand -base64 32)

# 4. Set up the database
npx prisma generate
npx prisma db push    # Creates SQLite dev DB

# 5. Start the dev server
pnpm dev
# → http://localhost:3000
```

---

## Environment Variables

See `.env.production.example` for all variables. Key ones:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | `file:./dev.db` for local SQLite |
| `AUTH_SECRET` | Yes | NextAuth session secret |
| `ENCRYPTION_SECRET` | Yes | Data encryption key |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` for dev |
| `OPENAI_API_KEY` | Optional | For AI analysis features |
| `GOOGLE_CLIENT_ID` | Optional | OAuth login |
| `GITHUB_CLIENT_ID` | Optional | OAuth login |

---

## Running Tests

```bash
# Unit tests (fast, no coverage)
pnpm test

# Unit tests with coverage report
pnpm test:coverage

# Integration tests
pnpm test:integration

# E2E tests (Playwright)
pnpm test:e2e

# E2E with browser visible
pnpm test:e2e:headed

# BDD tests (Cucumber/Gherkin)
pnpm test:bdd

# All tests
pnpm test:all
```

**Note:** When running the full test suite, use `--forceExit --maxWorkers=2` to avoid Jest worker hangs with 74 test files:
```bash
npx jest --forceExit --maxWorkers=2
```

### Test Coverage Targets

| Metric | Target | Current |
|--------|--------|---------|
| Statements | 90% | 99.26% |
| Branches | 85% | 93.82% |
| Functions | 90% | 98.62% |
| Lines | 90% | 99.33% |

---

## Project Structure

```
flipper-ai/
├── src/
│   ├── app/           # Next.js App Router pages & API routes
│   ├── components/    # React components
│   ├── contexts/      # React context providers
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Core business logic
│   │   ├── claude-analyzer.ts    # AI analysis engine
│   │   ├── image-service.ts      # Image processing
│   │   ├── price-history-service.ts  # Market pricing
│   │   └── env.ts               # Environment validation
│   ├── scrapers/      # Marketplace scrapers
│   ├── generated/     # Prisma client
│   └── __tests__/     # Test files (mirrors src/)
├── features/          # BDD Cucumber feature files
├── e2e/               # Playwright E2E tests
├── prisma/            # Database schema & migrations
├── docs/              # Project documentation
├── public/            # Static assets
└── docker-compose.yml # Production Docker setup
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start dev server (hot reload) |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Fix lint issues |
| `pnpm format` | Format with Prettier |
| `pnpm test` | Run unit tests |
| `pnpm test:coverage` | Tests with coverage |
| `pnpm test:e2e` | Playwright E2E |
| `pnpm test:bdd` | Cucumber BDD |

---

## Database

### Local Development (SQLite)
```bash
npx prisma generate    # Generate client
npx prisma db push     # Sync schema
npx prisma studio      # Visual DB browser → http://localhost:5555
```

### Production (PostgreSQL)
```bash
DATABASE_URL="postgresql://user:pass@host:5432/flipper"
npx prisma migrate deploy
```

---

## Docker

```bash
# Build and run with Docker Compose
docker compose up --build

# Just build the image
docker build -t flipper-ai .
```

---

## CI/CD

GitHub Actions runs on every push/PR:
1. **Lint** — ESLint checks
2. **Test** — Jest unit + integration (coverage enforced)
3. **Build** — Next.js production build
4. **BDD** — Cucumber acceptance tests
5. **Docker** — Image build verification

See `.github/workflows/ci.yml` for the full pipeline.

---

## Troubleshooting

### Jest hangs when running all tests
```bash
# Use forceExit and limit workers
npx jest --forceExit --maxWorkers=2
```

### Prisma client out of date
```bash
npx prisma generate
```

### Port 3000 already in use
```bash
lsof -i :3000  # Find the process
kill -9 <PID>  # Kill it
```

---

## Contributing

1. Create a feature branch from `main`
2. Write tests first (TDD encouraged)
3. Ensure all tests pass: `pnpm test:all`
4. Keep coverage above 90%
5. Submit a PR with clear description
