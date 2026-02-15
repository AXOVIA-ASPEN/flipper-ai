# Changelog

All notable changes to Flipper AI will be documented in this file.

## [1.0.0] - 2026-02-15

### 🎉 Initial Release — Production Ready

#### Features
- **Multi-marketplace scanning** — eBay, Craigslist, Facebook, OfferUp, Mercari
- **AI-powered item analysis** — Claude/LLM profit estimation, condition grading
- **Market price lookup** — eBay sold-listings scraping with median/avg/range stats
- **Price history tracking** — Historical price trends per item
- **Market value calculator** — Automated ROI and flip-score computation
- **Authentication** — NextAuth with Prisma adapter, secure session management
- **Dashboard** — Real-time opportunities, portfolio tracking
- **Seller communication** — Negotiation templates and tracking
- **Theme system** — Configurable dark/light themes

#### Testing
- 692 unit tests (Jest) — **97.5% statement coverage**
- BDD acceptance tests (Cucumber + Playwright)
- 8 feature files covering full user journeys
- Integration tests for API routes and services

#### Infrastructure
- Next.js 16 with Turbopack
- Docker production setup (multi-stage Dockerfile, docker-compose.prod.yml)
- GitHub Actions CI/CD pipeline
- Environment configuration & secrets management
- Production logging & error tracking
- ESLint + Prettier + Husky pre-commit hooks
