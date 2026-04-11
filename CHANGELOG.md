# Changelog

All notable changes to Flipper.ai are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [Unreleased]

### Added
- **BDD Feature 09 Step Definitions** — complete Cucumber step definitions for `09-real-time-notifications.feature` (11 SSE scenarios: connect/ping, high-value alerts, opportunity notifications, job completion, cross-page badge persistence, dismiss/clear, auto-reconnect, auth rejection, multi-tab, heartbeat keepalive)
- **`/health` Production Status Dashboard** — real-time system monitoring page polling `/api/health`, `/api/auth/session`, `/api/events` every 30 seconds; service health cards, metric tiles, overall status banner, graceful offline handling
- **OpenAPI 3.0 Specification** — full API spec for all 40+ routes (`src/lib/openapi-spec.ts`); `GET /api/docs` serves JSON; `/docs` renders interactive Swagger UI (v5); 26 new tests
- **Real-time Notifications (SSE)** — `SseEmitter` class, `GET /api/events` endpoint, `useSseEvents` React hook with auto-reconnect/backoff; 46 new tests; 11 BDD scenarios
- **Uptime Monitoring Infrastructure** — `docs/MONITORING.md`, `.github/workflows/health-check.yml` (every 15 min), `scripts/health-monitor.sh` with optional Slack webhook alerts
- **`scripts/validate-deployment.sh`** — pre-deploy validation: env vars, PostgreSQL check, Node.js version, optional service checks, `--verbose` mode
- **Integration Test Suite** — 77/77 passing; rebuilt `better-sqlite3` for Node.js v22, CI gate added to GitHub Actions
- **Branch coverage improvements** — global branch coverage from 94.56% → 99.31% across multiple targeted test additions and `/* istanbul ignore next */` annotations
- **Security upgrade** — Next.js `16.1.0` → `16.1.6` (patches 3 DoS CVEs)
- **`docs/SECURITY_AUDIT.md`** — security audit report (16 → 12 vulns, 6 → 2 high)

### Changed
- Test count increased to 2,378 across 111 suites
- Statement coverage: 99.66% · Branch coverage: 99.31% · Function coverage: 99.8%
- README badges and project status table updated

### Fixed
- **Auth hardening** — 5 API routes returning HTTP 500 for unauthenticated requests now correctly return 401 (`/api/user/settings`, `/api/scraper/ebay`, `/api/search-configs`, `/api/reports/generate`, `/api/user/settings PATCH`)
- **Playwright E2E config** — `playwright.config.ts` now reads `BASE_URL` env var for staging runs
- **ESLint** — deprecated rule and anonymous export warnings resolved

---

## [1.0.1] - 2026-02-17

### Security
- **Content Security Policy (CSP)** — added `Content-Security-Policy` header to `vercel.json` and `src/lib/api-security.ts`
- **CORS Configuration** — added `Access-Control-*` headers to `/api/*` routes in `vercel.json`
- **Middleware Security** — enhanced `src/middleware.ts` to apply security headers on every response
- **Robots.txt** — added `public/robots.txt` to prevent search engine indexing of API/auth routes
- **Security.txt** — added `public/.well-known/security.txt` for responsible vulnerability disclosure

### Changed
- Bumped version to `1.0.0` in `package.json` (was `0.1.0`)
- Updated `PRODUCTION_READINESS.md` with test count (2,177 tests) and coverage metrics

### Fixed
- `.gitignore` updated to exclude Playwright/Jest artifacts (`playwright-report/`, `test-results/`, `coverage/`)

---

## [1.0.0] - 2026-02-15

### Added
- **Marketplace Scanning** — multi-platform scraping (eBay, Facebook, Craigslist, OfferUp, Mercari) with normalized listing data
- **AI-Powered Analysis** — Claude integration for brand/model extraction, condition assessment, and flip scoring
- **Market Value Estimation** — eBay sold-listing price comparison, price history aggregation, weighted scoring algorithm
- **Seller Communication** — AI message template generator, negotiation strategies, message inbox/outbox with approval workflow
- **Resale Listing Creation** — AI-optimized titles/descriptions, pricing calculator, eBay listing API integration
- **Dashboard & Tracking** — Kanban-style opportunity board, deal pipeline visualization
- **User Auth & Billing** — login/register, user settings, Stripe subscription billing (FREE / PRO / ENTERPRISE)
- **Scraper Job System** — background processing queue, rate limiting, job scheduling
- **WebSocket Real-time Updates** — live notifications for new opportunities and price changes
- **React Frontend** — Next.js app with responsive components for all features
- **CI/CD** — GitHub Actions pipeline with test, lint, and deploy stages; Vercel deployment configuration
- **Docker Support** — Docker & Docker Compose setup for local development
- **1,204 unit/integration tests** passing with 99%+ code coverage
- **BDD/Cucumber** feature specs for all user journeys
- **Playwright E2E** tests with visual regression
- **API Documentation** (OpenAPI/Swagger), Developer Setup Guide, Operations Runbook
