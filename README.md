# 🐧 Flipper.ai

[![CI/CD Pipeline](https://github.com/AXOVIA-ASPEN/flipper-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/AXOVIA-ASPEN/flipper-ai/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-2291-brightgreen)](.)
[![Test Suites](https://img.shields.io/badge/test%20suites-111-brightgreen)](.)
[![Coverage](https://img.shields.io/badge/coverage-99.46%25-brightgreen)](.)
[![Branches](https://img.shields.io/badge/branches-98.09%25-brightgreen)](.)
[![Functions](https://img.shields.io/badge/functions-98.79%25-brightgreen)](.)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](.)
[![Version](https://img.shields.io/badge/version-1.0.1-blue)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

AI-powered marketplace flipping tool. Automatically scans Craigslist, Facebook Marketplace, eBay, OfferUp, and Mercari to find underpriced items, analyze profit potential with AI, and manage your flipping workflow from discovery to sale.

## ✨ Features

- **Multi-Platform Scanning** — Scrapes 5 marketplaces simultaneously
- **AI-Powered Analysis** — Uses Stagehand + Google Gemini for intelligent pricing and demand analysis
- **Value Scoring** — Automatic 0-100 scoring with brand detection, category multipliers, and condition analysis
- **Seller Communication** — In-app messaging with AI-suggested negotiation templates
- **Resale Listing Generator** — Auto-generates optimized listings with AI-enhanced descriptions
- **Dashboard & Tracking** — Track items from discovery → purchase → listing → sale → profit
- **Notifications** — Real-time alerts for high-value opportunities and price drops

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- **pnpm** 9+ (`npm install -g pnpm`)
- **Google API Key** (for Gemini AI analysis — optional but recommended)

### Setup

```bash
# Clone the repository
git clone https://github.com/AXOVIA-ASPEN/flipper-ai.git
cd flipper-ai

# Install dependencies and start
make preview
```

Or step by step:

```bash
pnpm install              # Install dependencies
npx prisma generate       # Generate Prisma client
npx prisma db push        # Create/sync database
pnpm dev                  # Start development server
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Environment Variables

Create a `.env` file in the project root:

```env
# Database (SQLite — works out of the box)
DATABASE_URL="file:./dev.db"

# Google Gemini API (for AI analysis)
GOOGLE_API_KEY="your-google-api-key"

# eBay Browse API (for eBay scraping)
EBAY_OAUTH_TOKEN="your-oauth-token"

# Optional
EBAY_MARKETPLACE_ID="EBAY_US"
```

## 📋 Available Commands

```bash
make help              # Show all commands
make dev               # Start dev server
make build             # Production build (strict TypeScript)
make test              # Run 2291 unit tests (Jest)
make test-acceptance   # Run BDD acceptance tests (Cucumber/Gherkin)
make test-e2e          # Run E2E tests (Playwright)
make test-all          # Run all test suites
make db-migrate        # Run database migrations
make db-studio         # Open Prisma Studio GUI
make db-reset          # Reset database
make clean             # Remove build artifacts
```

## 🧪 Testing

| Suite          | Tool               | Count                    | Coverage       |
| -------------- | ------------------ | ------------------------ | -------------- |
| Unit           | Jest               | 2291 (111 suites)        | 99.46% stmts / 98.09% branches / 98.79% funcs |
| BDD Acceptance | Cucumber + Gherkin | 70 scenarios / 572 steps | Core flows     |
| E2E            | Playwright         | Browser automation       | Critical paths |

```bash
# Run all tests
make test-all

# Unit tests with coverage report
pnpm test:coverage

# BDD tests (requires Playwright browsers)
npx playwright install chromium
make test-acceptance

# Watch mode
pnpm test -- --watch
```

### BDD Feature Coverage

- `01-marketplace-scanning` — Multi-platform search and filtering
- `02-ai-analysis` — AI pricing analysis and demand scoring
- `03-seller-communication` — Messaging and negotiation flows
- `04-resale-listing` — Listing generation and optimization
- `05-dashboard-tracking` — Portfolio and profit tracking
- `06-user-auth-billing` — Authentication and subscription management
- `07-notifications-monitoring` — Alerts and monitoring
- `08-complete-flip-journey` — End-to-end user journey

## 🏗 Tech Stack

| Layer         | Technology                   |
| ------------- | ---------------------------- |
| **Framework** | Next.js 16 (App Router)      |
| **Language**  | TypeScript (strict mode)     |
| **UI**        | React, Tailwind CSS          |
| **Database**  | SQLite (libSQL) + Prisma ORM |
| **AI**        | Google Gemini via Stagehand  |
| **Testing**   | Jest, Cucumber, Playwright   |
| **CI/CD**     | GitHub Actions               |
| **Hosting**   | Vercel                       |
| **Linting**   | ESLint, Prettier, Husky      |

## 📁 Project Structure

```
flipper-ai/
├── src/
│   ├── app/
│   │   ├── api/                # API routes
│   │   │   ├── listings/       # Listings CRUD
│   │   │   ├── opportunities/  # Opportunities management
│   │   │   ├── scraper/        # Platform scrapers
│   │   │   └── search-configs/ # Saved searches
│   │   ├── dashboard/          # Dashboard pages
│   │   ├── login/              # Auth pages
│   │   └── settings/           # User settings
│   ├── components/             # React components
│   ├── lib/
│   │   ├── db.ts               # Database client
│   │   ├── value-estimator.ts  # Profit scoring engine
│   │   └── scrapers/           # Scraper implementations
│   └── generated/prisma/       # Generated Prisma client
├── features/                   # BDD feature files (Gherkin)
│   ├── step_definitions/       # Step implementations
│   └── support/                # Test hooks and world
├── prisma/
│   └── schema.prisma           # Database schema
├── .github/workflows/ci.yml    # CI/CD pipeline
├── vercel.json                 # Vercel deployment config
├── Makefile                    # Build commands
└── docs/                       # Documentation
```

## 🔌 API Endpoints

### Listings

| Method   | Endpoint                          | Description                                  |
| -------- | --------------------------------- | -------------------------------------------- |
| `GET`    | `/api/listings`                   | List all (supports `?status=`, `?minScore=`) |
| `POST`   | `/api/listings`                   | Create from scraper data                     |
| `GET`    | `/api/listings/[id]`              | Get single listing                           |
| `PATCH`  | `/api/listings/[id]`              | Update listing                               |
| `DELETE` | `/api/listings/[id]`              | Delete listing                               |
| `GET`    | `/api/listings/[id]/market-value` | Get AI market analysis                       |

### Opportunities

| Method | Endpoint                  | Description            |
| ------ | ------------------------- | ---------------------- |
| `GET`  | `/api/opportunities`      | List opportunities     |
| `POST` | `/api/opportunities`      | Create from listing    |
| `GET`  | `/api/opportunities/[id]` | Get opportunity detail |

### Scrapers

| Method | Endpoint                  | Description                 |
| ------ | ------------------------- | --------------------------- |
| `POST` | `/api/scraper/craigslist` | Scrape Craigslist listings  |
| `POST` | `/api/scraper/ebay`       | Search eBay Browse API      |
| `POST` | `/api/scraper/facebook`   | Scrape Facebook Marketplace |
| `POST` | `/api/scraper/offerup`    | Scrape OfferUp              |
| `POST` | `/api/scraper/mercari`    | Scrape Mercari              |

### Search & Jobs

| Method     | Endpoint              | Description              |
| ---------- | --------------------- | ------------------------ |
| `GET/POST` | `/api/search-configs` | Manage saved searches    |
| `GET`      | `/api/scraper-jobs`   | View scraper run history |

## 📊 Value Scoring Algorithm

Items are scored 0-100 based on multiple signals:

- **Category multipliers** — Electronics, furniture, collectibles, vintage
- **Brand detection** — Premium brands (Apple, Sony, Dyson) score higher
- **Condition analysis** — New > Like New > Good > Fair > Poor
- **Risk factors** — "broken", "parts only", "needs repair" reduce score
- **Demand signals** — Recent sold comparables and market velocity

Items scoring **70+** are automatically flagged as opportunities.

## 🚢 Deployment

### Vercel (Recommended)

**Automated CI/CD (GitHub Actions):**

The CI pipeline automatically deploys to Vercel on every push to `main` (after tests pass).

**Required GitHub Secrets** (Settings → Secrets → Actions):
- `VERCEL_TOKEN` — from https://vercel.com/account/tokens
- `VERCEL_ORG_ID` — from `.vercel/project.json` after first `vercel link`
- `VERCEL_PROJECT_ID` — from `.vercel/project.json` after first `vercel link`

**Manual deploy:**
```bash
npm i -g vercel
vercel link        # Links to Vercel project (generates .vercel/project.json)
vercel --prod      # Deploy to production
```

Set environment variables in the [Vercel Dashboard](https://vercel.com/dashboard). Configuration is in `vercel.json` (security headers, API function timeouts, health endpoint rewrite).

### Docker

```bash
docker build -t flipper-ai .
docker run -p 3000:3000 flipper-ai
```

## 🔧 Code Quality

- **ESLint** — Strict TypeScript rules
- **Prettier** — Consistent formatting
- **Husky** — Pre-commit hooks prevent bad commits
- **CI/CD** — GitHub Actions: lint → typecheck → test (coverage gated) → build → E2E → deploy to Vercel
- **TypeScript** — Strict mode, `ignoreBuildErrors: false`

```bash
pnpm lint          # Check for issues
pnpm lint:fix      # Auto-fix
pnpm format        # Format with Prettier
pnpm format:check  # Check formatting
```

## 📊 Project Status

**Current State: Production Ready (Pending Deployment Credentials)**

| Milestone                      | Status |
| ------------------------------ | ------ |
| Core feature implementation    | ✅ Complete |
| Unit tests (Jest)              | ✅ 2291 tests, 111 suites |
| Statement coverage             | ✅ 99.46% |
| Branch coverage                | ✅ 98.09% |
| Function coverage              | ✅ 98.79% |
| BDD acceptance tests           | ✅ 70 scenarios / 572 steps |
| E2E Playwright tests           | ✅ Critical paths covered |
| GitHub Actions CI/CD           | ✅ lint → typecheck → test → build |
| TypeScript strict mode         | ✅ Zero `any` types |
| ESLint / Prettier              | ✅ Clean |
| API documentation              | ✅ Full endpoint coverage |
| Production deployment (Vercel) | ⏳ Awaiting Vercel credentials |
| PostgreSQL migration           | ⏳ Awaiting production DB setup |

> **Note:** The app runs fully on SQLite (libSQL) for local and dev environments. Vercel + PostgreSQL credentials are required for production deployment. See [BLOCKED cards on Trello](https://trello.com/b/SvVRLeS5/flipper-ai) for details.

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

Built with 🐧 by [Axovia AI](https://github.com/AXOVIA-ASPEN)  
*Last updated: February 17, 2026 — 2291 tests passing, 99.46% coverage*
