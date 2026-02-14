# Changelog

## [1.0.0] - 2026-02-14

### 🎉 Initial Release

Flipper AI is an AI-powered marketplace flipping tool that automatically finds underpriced items across multiple marketplaces and identifies profitable flip opportunities.

### Features

- **Multi-Marketplace Scraping** — Craigslist, eBay, Facebook Marketplace, OfferUp, Mercari
- **AI-Powered Analysis** — LLM-based item identification, value estimation, and pricing analysis
- **Smart Value Scoring** — 0-100 scoring with category multipliers, brand detection, and condition analysis
- **Opportunity Dashboard** — Browse, filter, and manage flip opportunities
- **Seller Communication** — AI-assisted negotiation and messaging
- **Search Configurations** — Save and manage marketplace search criteria
- **User Authentication** — NextAuth v5 with credential-based auth
- **Scraper Job Tracking** — Monitor scraper runs and results

### Technical

- **Frontend:** Next.js 16, React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes with Prisma ORM (SQLite/libSQL)
- **Testing:** 660+ unit tests (95% coverage), 70 BDD scenarios (Cucumber), Playwright E2E
- **CI/CD:** GitHub Actions (lint → test → build)
- **Deployment:** Vercel (vercel.json), Docker (Dockerfile)
- **Code Quality:** ESLint, Prettier, Husky pre-commit hooks
