# 🐧 Flipper.ai

[![CI/CD Pipeline](https://github.com/AXOVIA-ASPEN/flipper-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/AXOVIA-ASPEN/flipper-ai/actions/workflows/ci.yml)
[![Health Check](https://github.com/AXOVIA-ASPEN/flipper-ai/actions/workflows/health-check.yml/badge.svg)](https://github.com/AXOVIA-ASPEN/flipper-ai/actions/workflows/health-check.yml)
[![Tests](https://img.shields.io/badge/tests-4545-brightgreen)](.)
[![Test Suites](https://img.shields.io/badge/test%20suites-193-brightgreen)](.)
[![Coverage](https://img.shields.io/badge/coverage-99.41%25-brightgreen)](.)
[![Branches](https://img.shields.io/badge/branches-96.01%25-brightgreen)](.)
[![Functions](https://img.shields.io/badge/functions-99.42%25-brightgreen)](.)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](.)
[![Version](https://img.shields.io/badge/version-1.0.1-blue)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

AI-powered marketplace flipping tool. Automatically scans Craigslist, Facebook Marketplace, eBay, OfferUp, and Mercari to find underpriced items, analyze profit potential with AI, and manage your flipping workflow from discovery to sale.

## ✨ Features

- **Multi-Platform Scanning** — Scrapes 5 marketplaces simultaneously
- **AI-Powered Analysis** — Uses Claude (Anthropic) for listing analysis, negotiation, and message generation; Stagehand + Gemini for Facebook Marketplace browser automation
- **Value Scoring** — Automatic 0-100 scoring with brand detection, category multipliers, and condition analysis
- **Seller Communication** — In-app messaging with AI-suggested negotiation templates
- **Resale Listing Generator** — Auto-generates optimized listings with AI-enhanced descriptions
- **Dashboard & Tracking** — Track items from discovery → purchase → listing → sale → profit
- **Notifications** — Real-time alerts for high-value opportunities and price drops

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- **pnpm** 9+ (`npm install -g pnpm`)
- **Anthropic API Key** (for Claude AI analysis — primary AI engine)
- **Google API Key** (for Gemini via Stagehand — Facebook Marketplace scraping only, optional)

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
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/flipper_dev"

# Anthropic Claude API (primary AI — listing analysis, negotiation, messages)
ANTHROPIC_API_KEY="your-anthropic-api-key"

# OpenAI API (secondary AI — LLM analysis with caching)
OPENAI_API_KEY="your-openai-api-key"

# Google Gemini API (Facebook Marketplace browser automation via Stagehand)
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
make test              # Run 4545 tests (193 suites)
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
| Unit           | Jest               | 4545 tests (193 suites) | 99.41% stmts / 96.01% branches / 99.42% funcs |
| BDD Acceptance | Cucumber + Gherkin | 477 scenarios across 12 feature files | Core flows     |
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

### BDD Feature Coverage (`test/acceptance/features/`)

- `E-001` — Production Infrastructure
- `E-002` — User Registration, Auth & Onboarding
- `E-003` — Marketplace Scanning (Multi-platform)
- `E-004` — Scoring & Deal Evaluation
- `E-005` — Advanced Market Intelligence
- `E-006` — Flip Lifecycle Management & Analytics
- `E-007` — Subscription & Billing
- `E-008` — Seller Communication & Negotiation
- `E-009` — Cross-Platform Resale Listing
- `E-010` — Monitoring & Email Notifications
- `E-011` — Push & SMS Notifications
- `E-012` — Meeting Logistics

## 🏗 Tech Stack

| Layer         | Technology                   |
| ------------- | ---------------------------- |
| **Framework** | Next.js 16 (App Router)      |
| **Language**  | TypeScript (strict mode)     |
| **UI**        | React, Tailwind CSS          |
| **Database**  | PostgreSQL + Prisma ORM      |
| **AI**        | Claude (Anthropic), OpenAI GPT-4o-mini, Gemini via Stagehand ([details](docs/AI-Agents/README.md)) |
| **Testing**   | Jest, Cucumber, Playwright   |
| **CI/CD**     | GitHub Actions               |
| **Hosting**   | Firebase Hosting + Cloud Run |
| **Linting**   | ESLint, Prettier, Husky      |

## 📁 Project Structure

```
flipper-ai/
├── app/                        # Next.js App Router (pages, API routes, layouts)
│   ├── api/                    # API routes
│   │   ├── listings/           # Listings CRUD
│   │   ├── opportunities/      # Opportunities management
│   │   ├── scraper/            # Platform scrapers
│   │   └── search-configs/     # Saved searches
│   ├── dashboard/              # Dashboard pages
│   ├── (auth)/                 # Auth pages (login, register)
│   └── settings/               # User settings
├── src/
│   ├── components/             # React components
│   ├── lib/
│   │   ├── db.ts               # Database client
│   │   ├── value-estimator.ts  # Profit scoring engine
│   │   └── scrapers/           # Scraper implementations
│   └── generated/prisma/       # Generated Prisma client
├── functions/                  # Firebase Cloud Functions (production scraping)
├── prisma/
│   └── schema.prisma           # Database schema
├── test/                       # E2E and BDD tests (Playwright, Cucumber)
├── scripts/                    # Scripts by purpose (deploy/, setup/, test/, health/, db/)
├── config/                     # Docker, PM2, Firebase configs
├── .github/workflows/ci.yml    # CI/CD pipeline (deploys to Cloud Run)
├── Makefile                    # Build commands
└── docs/                       # Documentation (see docs/README.md)
```

**Full layout:** [index.md](index.md)

## 🔌 API Endpoints (81 routes)

> **Interactive Docs:** Visit `/docs` for the full Swagger UI (OpenAPI 3.0).
> The machine-readable spec is available at `GET /api/docs`.

### Health

| Method | Endpoint              | Description                  |
| ------ | --------------------- | ---------------------------- |
| `GET`  | `/api/health`         | Health check                 |
| `GET`  | `/api/health/ready`   | Readiness probe              |
| `GET`  | `/api/health/metrics` | Runtime metrics              |
| `GET`  | `/api/diagnostics`    | System diagnostics           |

### Auth

| Method | Endpoint                          | Description                        |
| ------ | --------------------------------- | ---------------------------------- |
| `POST` | `/api/auth/session`               | Create session cookie from Firebase ID token |
| `POST` | `/api/auth/register`              | Register new user                  |
| `POST` | `/api/auth/signout`               | Sign out (clear session)           |
| `POST` | `/api/auth/forgot-password`       | Send password reset email          |
| `POST` | `/api/auth/reset-password`        | Reset password with token          |
| `POST` | `/api/auth/captcha-required`      | Check if CAPTCHA is required       |
| `GET`  | `/api/auth/facebook/authorize`    | Start Facebook OAuth flow          |
| `GET`  | `/api/auth/facebook/callback`     | Facebook OAuth callback            |
| `GET`  | `/api/auth/facebook/status`       | Facebook connection status         |
| `POST` | `/api/auth/facebook/token`        | Exchange Facebook token            |
| `POST` | `/api/auth/facebook/disconnect`   | Disconnect Facebook account        |

### Listings

| Method   | Endpoint                                    | Description                                  |
| -------- | ------------------------------------------- | -------------------------------------------- |
| `GET`    | `/api/listings`                             | List all (supports `?status=`, `?minScore=`) |
| `POST`   | `/api/listings`                             | Create from scraper data                     |
| `GET`    | `/api/listings/[id]`                        | Get single listing                           |
| `PATCH`  | `/api/listings/[id]`                        | Update listing                               |
| `DELETE` | `/api/listings/[id]`                        | Delete listing                               |
| `POST`   | `/api/listings/[id]/market-value`           | AI market analysis                           |
| `GET`    | `/api/listings/[id]/conversation-status`    | Conversation status for listing              |
| `POST`   | `/api/listings/[id]/counter-offer-analysis` | Analyze a counter-offer                      |
| `POST`   | `/api/listings/[id]/negotiation-strategy`   | Generate negotiation strategy (Claude AI)    |
| `POST`   | `/api/listings/[id]/description`            | Generate listing description (Claude AI)     |
| `POST`   | `/api/listings/[id]/generate-resale-content`| Generate resale listing content              |
| `GET`    | `/api/listings/[id]/optimal-price`          | Get optimal resale price                     |
| `POST`   | `/api/listings/[id]/optimal-price`          | Calculate optimal resale price               |
| `GET`    | `/api/listings/ebay`                        | List eBay listings                           |
| `POST`   | `/api/listings/ebay`                        | Import eBay listings                         |
| `GET`    | `/api/listings/track`                       | Get tracked listings                         |
| `POST`   | `/api/listings/track`                       | Track a listing                              |
| `GET`    | `/api/analyze/[listingId]`                  | Get AI analysis for listing                  |
| `DELETE` | `/api/analyze/[listingId]`                  | Clear cached AI analysis                     |
| `POST`   | `/api/descriptions`                         | Generate description (standalone)            |

### Opportunities

| Method   | Endpoint                              | Description                        |
| -------- | ------------------------------------- | ---------------------------------- |
| `GET`    | `/api/opportunities`                  | List opportunities                 |
| `GET`    | `/api/opportunities/[id]`             | Get opportunity detail             |
| `PATCH`  | `/api/opportunities/[id]`             | Update opportunity                 |
| `DELETE` | `/api/opportunities/[id]`             | Delete opportunity                 |
| `POST`   | `/api/opportunities/[id]/meeting`     | Schedule meeting for opportunity   |
| `DELETE` | `/api/opportunities/[id]/meeting`     | Cancel meeting                     |
| `GET`    | `/api/opportunities/[id]/maps-route`  | Get Google Maps route to seller    |

### Messages

| Method   | Endpoint                             | Description                        |
| -------- | ------------------------------------ | ---------------------------------- |
| `GET`    | `/api/messages`                      | List messages                      |
| `POST`   | `/api/messages`                      | Send a message                     |
| `GET`    | `/api/messages/[id]`                 | Get single message                 |
| `PATCH`  | `/api/messages/[id]`                 | Update message                     |
| `DELETE` | `/api/messages/[id]`                 | Delete message                     |
| `POST`   | `/api/messages/generate`             | AI-generate message draft          |
| `GET`    | `/api/messages/threads`              | List message threads               |
| `GET`    | `/api/messages/threads/[listingId]`  | Get thread for a listing           |
| `POST`   | `/api/messages/check-replies`        | Check for new replies              |

### Search Configs

| Method   | Endpoint                  | Description                |
| -------- | ------------------------- | -------------------------- |
| `GET`    | `/api/search-configs`     | List saved searches        |
| `POST`   | `/api/search-configs`     | Create saved search        |
| `GET`    | `/api/search-configs/[id]`| Get single search config   |
| `PATCH`  | `/api/search-configs/[id]`| Update search config       |
| `DELETE` | `/api/search-configs/[id]`| Delete search config       |

### Scraper Jobs

| Method   | Endpoint                | Description                 |
| -------- | ----------------------- | --------------------------- |
| `GET`    | `/api/scraper-jobs`     | List scraper run history    |
| `POST`   | `/api/scraper-jobs`     | Create scraper job          |
| `GET`    | `/api/scraper-jobs/[id]`| Get single job              |
| `PATCH`  | `/api/scraper-jobs/[id]`| Update job                  |
| `DELETE` | `/api/scraper-jobs/[id]`| Delete job                  |

### Scrapers

| Method | Endpoint                  | Description                        |
| ------ | ------------------------- | ---------------------------------- |
| `GET`  | `/api/scraper/craigslist` | Craigslist scraper status          |
| `POST` | `/api/scraper/craigslist` | Run Craigslist scrape              |
| `GET`  | `/api/scraper/ebay`       | eBay scraper status                |
| `POST` | `/api/scraper/ebay`       | Run eBay Browse API search         |
| `GET`  | `/api/scraper/facebook`   | Facebook scraper status            |
| `POST` | `/api/scraper/facebook`   | Run Facebook Marketplace scrape (Stagehand + Gemini) |
| `GET`  | `/api/scraper/mercari`    | Mercari scraper status             |
| `POST` | `/api/scraper/mercari`    | Run Mercari scrape                 |
| `GET`  | `/api/scraper/offerup`    | OfferUp scraper status             |
| `POST` | `/api/scraper/offerup`    | Run OfferUp scrape                 |

### Posting Queue

| Method   | Endpoint                        | Description                  |
| -------- | ------------------------------- | ---------------------------- |
| `GET`    | `/api/posting-queue`            | List queued postings         |
| `POST`   | `/api/posting-queue`            | Add item to posting queue    |
| `GET`    | `/api/posting-queue/[id]`       | Get single queued item       |
| `PATCH`  | `/api/posting-queue/[id]`       | Update queued item           |
| `DELETE` | `/api/posting-queue/[id]`       | Remove from queue            |
| `POST`   | `/api/posting-queue/[id]/retry` | Retry failed posting         |
| `POST`   | `/api/posting-queue/process`    | Process queued postings      |
| `GET`    | `/api/posting-queue/stats`      | Queue statistics             |

### Analytics

| Method | Endpoint                    | Description                   |
| ------ | --------------------------- | ----------------------------- |
| `GET`  | `/api/analytics/profit-loss`| Profit/loss analytics         |
| `GET`  | `/api/analytics/export`     | Export analytics data         |
| `GET`  | `/api/inventory/roi`        | Inventory ROI report          |
| `GET`  | `/api/price-history`        | Get price history             |
| `POST` | `/api/price-history`        | Record price data point       |
| `GET`  | `/api/reports/generate`     | Get generated report          |
| `POST` | `/api/reports/generate`     | Generate analytics report     |
| `GET`  | `/api/usage`                | API usage statistics          |

### User & Settings

| Method   | Endpoint                            | Description                   |
| -------- | ----------------------------------- | ----------------------------- |
| `GET`    | `/api/user/settings`                | Get user settings             |
| `PATCH`  | `/api/user/settings`                | Update user settings          |
| `POST`   | `/api/user/settings/validate-key`   | Validate API key              |
| `GET`    | `/api/user/tier`                    | Get subscription tier         |
| `GET`    | `/api/user/onboarding`              | Get onboarding status         |
| `POST`   | `/api/user/onboarding`              | Update onboarding progress    |
| `POST`   | `/api/user/device-token`            | Register push notification token |
| `DELETE` | `/api/user/device-token`            | Remove device token           |
| `POST`   | `/api/user/phone/send-code`         | Send phone verification code  |
| `POST`   | `/api/user/phone/verify`            | Verify phone number           |
| `GET`    | `/api/user/unsubscribe`             | Unsubscribe page (token-based)|
| `POST`   | `/api/user/unsubscribe`             | Process unsubscribe           |

### Notifications

| Method  | Endpoint                      | Description                   |
| ------- | ----------------------------- | ----------------------------- |
| `GET`   | `/api/notifications`          | List notifications            |
| `PATCH` | `/api/notifications/[id]`     | Mark notification read/unread |
| `POST`  | `/api/notifications/process`  | Process pending notifications |

### Integrations

| Method   | Endpoint                                         | Description                     |
| -------- | ------------------------------------------------ | ------------------------------- |
| `GET`    | `/api/integrations/google-calendar`              | Get calendar connection status  |
| `DELETE` | `/api/integrations/google-calendar`              | Disconnect Google Calendar      |
| `GET`    | `/api/integrations/google-calendar/connect`      | Start Google Calendar OAuth     |
| `GET`    | `/api/integrations/google-calendar/callback`     | Google Calendar OAuth callback  |

### Webhooks

| Method | Endpoint                | Description               |
| ------ | ----------------------- | ------------------------- |
| `POST` | `/api/webhooks/stripe`  | Stripe webhook handler    |

### Checkout (Stripe)

| Method | Endpoint                | Description                   |
| ------ | ----------------------- | ----------------------------- |
| `POST` | `/api/checkout`         | Create Stripe checkout session|
| `POST` | `/api/checkout/portal`  | Create Stripe billing portal  |

### Internal / Cron

| Method | Endpoint                    | Description                     |
| ------ | --------------------------- | ------------------------------- |
| `POST` | `/api/meeting-reminders/run`| Process meeting reminders       |
| `POST` | `/api/monitoring/run`       | Run monitoring checks           |
| `GET`  | `/api/events`               | Server-sent events stream       |
| `GET`  | `/api/images/proxy`         | Proxy external images           |
| `GET`  | `/api/docs`                 | OpenAPI spec (JSON)             |
| `POST` | `/api/test/seed-user`       | Seed test user (dev/test only)  |

## 📊 Value Scoring Algorithm

Items are scored 0-100 based on multiple signals:

- **Category multipliers** — Electronics, furniture, collectibles, vintage
- **Brand detection** — Premium brands (Apple, Sony, Dyson) score higher
- **Condition analysis** — New > Like New > Good > Fair > Poor
- **Risk factors** — "broken", "parts only", "needs repair" reduce score
- **Demand signals** — Recent sold comparables and market velocity

Items scoring **70+** are automatically flagged as opportunities.

## 🚢 Deployment

### Firebase Hosting + Cloud Run (Production)

**Automated CI/CD (GitHub Actions):**

The CI pipeline automatically deploys to Cloud Run on every push to `main` (after tests pass). Firebase Hosting serves the frontend at `axovia-flipper.web.app`.

**Required GitHub Secrets** (Settings → Secrets → Actions):
- GCP service account credentials for Cloud Run deployment
- Firebase project configuration

**Manual deploy:**
```bash
gcloud run deploy flipper-ai --source .
firebase deploy --only hosting
```

### Docker

```bash
docker build -f config/docker/Dockerfile -t flipper-ai .
docker run -p 3000:3000 flipper-ai
```

## 🔧 Code Quality

- **ESLint** — Strict TypeScript rules
- **Prettier** — Consistent formatting
- **Husky** — Pre-commit hooks prevent bad commits
- **CI/CD** — GitHub Actions: lint → typecheck → test (coverage gated) → build → E2E → deploy to Cloud Run
- **TypeScript** — Strict mode, `ignoreBuildErrors: false`

```bash
pnpm lint          # Check for issues
pnpm lint:fix      # Auto-fix
pnpm format        # Format with Prettier
pnpm format:check  # Check formatting
```

## 🏥 Monitoring & Uptime

Flipper AI exposes a health endpoint for external monitoring:

```
GET /api/health
→ { "status": "ok", "environment": "production", "timestamp": "...", "version": "1.0.1" }
```

### Setting Up Uptime Monitoring

See **[docs/deployment/MONITORING.md](docs/deployment/MONITORING.md)** for full setup guide. Quick options:

| Provider | Free Tier | Check Interval | Setup |
|----------|-----------|----------------|-------|
| [UptimeRobot](https://uptimerobot.com) | ✅ 50 monitors | 5 min | Easiest |
| [BetterStack](https://betterstack.com) | ✅ 10 monitors | 30 sec | Best quality |
| GitHub Actions | ✅ Unlimited | 15 min | Zero signup |

**GitHub Actions health check** is already configured at `.github/workflows/health-check.yml`. Add `PRODUCTION_URL` to repo secrets to activate it.

**Local staging monitor:**
```bash
./scripts/health/health-monitor.sh          # Check staging (localhost:3001)
HEALTH_URL=https://prod.app/api/health ./scripts/health/health-monitor.sh
```

---

## 📊 Project Status

**Current State: Production Ready**

| Milestone                      | Status |
| ------------------------------ | ------ |
| Core feature implementation    | ✅ Complete |
| Unit tests (Jest)              | ✅ 4545 tests, 193 suites |
| Statement coverage             | ✅ 99.41% |
| Branch coverage                | ✅ 96.01% |
| Function coverage              | ✅ 99.42% |
| BDD acceptance tests           | ✅ 477 scenarios across 12 feature files |
| E2E Playwright tests           | ✅ Critical paths + user journeys |
| GitHub Actions CI/CD           | ✅ lint → typecheck → test → build |
| GitHub Actions health check    | ✅ Configured (needs PRODUCTION_URL secret) |
| Uptime monitoring (external)   | ⏳ Awaiting provider signup (see docs/deployment/MONITORING.md) |
| TypeScript strict mode         | ✅ Zero `any` types |
| ESLint / Prettier              | ✅ Clean |
| API documentation              | ✅ Full endpoint coverage |
| Sentry error tracking          | ✅ Configured |
| Production deployment          | ✅ Firebase Hosting + Cloud Run |
| PostgreSQL                     | ✅ Primary database (local + production) |

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

Built with 🐧 by [Axovia AI](https://github.com/AXOVIA-ASPEN)
