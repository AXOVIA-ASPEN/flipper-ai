# Project Overview - Flipper.ai

> Generated: 2026-02-27 | Scan Level: Deep

## What is Flipper.ai?

Flipper.ai is an AI-powered marketplace arbitrage platform that helps users find underpriced items for resale profit. It scrapes listings from 5 major marketplaces, analyzes flip potential using AI, and tracks opportunities through the full purchase-to-resale lifecycle.

**Author:** Stephen Boyett | **Company:** Axovia AI | **Version:** 1.0.0

---

## Core Value Proposition

1. **Multi-Platform Scraping** — Automated scanning of Craigslist, eBay, Facebook Marketplace, Mercari, and OfferUp
2. **AI-Powered Analysis** — Dual AI pipeline (Anthropic Claude + OpenAI GPT-4o-mini) identifies underpriced items with 50%+ discount potential
3. **Smart Filtering** — Only surfaces opportunities verified against actual eBay sold data
4. **Lifecycle Tracking** — Kanban board workflow from discovery through purchase to resale and profit calculation
5. **Cross-Platform Posting** — Queue system to list acquired items on multiple marketplaces simultaneously

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Next.js API Routes (80+ endpoints) |
| Database | PostgreSQL via Prisma ORM (13 models) |
| AI | OpenAI GPT-4o-mini + Anthropic Claude Sonnet |
| Scraping | Playwright + Stagehand (AI browser automation) |
| Auth | NextAuth v5 (credentials + Facebook OAuth) |
| Payments | Stripe (FREE/FLIPPER/PRO tiers) |
| Monitoring | Sentry + Vercel Analytics |
| Testing | Jest + Playwright + Cucumber (full pyramid) |
| Deployment | Vercel + Docker + Firebase Cloud Functions |

---

## Architecture Type

**Monolithic Full-Stack Application** — Single Next.js codebase handling both frontend rendering and API backend. App Router pattern with `app/` for pages/routes and `src/` for shared business logic.

---

## Repository Structure

```
flipper-ai/
├── app/              # Next.js pages (13 routes) + API routes (80+ endpoints)
├── src/
│   ├── components/   # React UI components (15+)
│   ├── hooks/        # Custom hooks (3)
│   ├── contexts/     # React contexts (1 - Theme)
│   ├── lib/          # Business logic (40+ files) - core of the application
│   ├── scrapers/     # Platform-specific scraper code
│   └── __tests__/    # Jest test suite (100+ files)
├── prisma/           # Database schema & migrations
├── e2e/              # Playwright E2E tests (60+ specs)
├── features/         # Cucumber BDD features (9 scenarios)
├── functions/        # Cloud Functions (Firebase/GCP deployment)
├── scripts/          # DevOps automation (13 scripts)
├── docs/             # Project documentation
└── .github/          # CI/CD workflows (5 pipelines)
```

---

## Key Features

### Marketplace Scraping
- 5 platform integrations (Craigslist, eBay, Facebook, Mercari, OfferUp)
- Playwright-based browser automation with anti-detection measures
- Saved search configurations for recurring scans
- Real-time SSE notifications during scraping

### AI Analysis Pipeline
- **Algorithmic scoring** (always runs) — Category/brand/condition-based value estimation
- **LLM identification** (optional) — GPT-4o-mini extracts brand, model, variant
- **Market verification** — Playwright scrapes actual eBay sold prices
- **Sellability analysis** (optional) — GPT-4o-mini assesses demand, recommends pricing
- Only saves items verified as 50%+ undervalued

### Opportunity Management
- Kanban board with drag-and-drop status tracking
- 5-stage lifecycle: IDENTIFIED → CONTACTED → PURCHASED → LISTED → SOLD
- Auto-calculated profit with fee tracking
- Cross-platform posting queue

### Analytics & Reporting
- Profit/loss tracking (weekly/monthly)
- ROI calculation per item
- Category breakdown and trend analysis
- CSV/JSON report export

### User Management
- Subscription tiers (FREE/FLIPPER/PRO) with feature gating
- 6-step onboarding wizard
- Configurable notification preferences
- User-supplied API key management (encrypted at rest)

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [Architecture](./architecture-deep-scan.md) | System architecture, tech stack, data flow |
| [API Contracts](./api-contracts.md) | 80+ API endpoint documentation |
| [Data Models](./data-models.md) | 13 database models with relationships |
| [Component Inventory](./component-inventory.md) | 15+ UI components, hooks, contexts |
| [Source Tree](./source-tree-analysis.md) | Annotated directory structure |
| [Development Guide](./development-guide.md) | Setup, build, test commands |
| [Existing: API Reference](./api/API_REFERENCE.md) | Detailed API reference |
| [Existing: PRD](./PRD.md) | Product requirements document |
| [Existing: Deployment](./deployment/DEPLOYMENT.md) | Deployment procedures |
| [Existing: User Guide](./guides/USER_GUIDE.md) | End-user documentation |
