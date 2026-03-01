# Architecture (Deep Scan) - Flipper.ai

> Generated: 2026-02-27 | Scan Level: Deep | Version: 1.0.0

## Executive Summary

Flipper.ai is an AI-powered marketplace arbitrage platform that scrapes underpriced items from 5 marketplaces (Craigslist, eBay, Facebook Marketplace, Mercari, OfferUp), analyzes flip potential using a hybrid algorithmic + LLM pipeline, and tracks opportunities through the full resale lifecycle.

Built as a Next.js 16 full-stack monolith with React 19, Prisma ORM (PostgreSQL), and dual AI integration (Anthropic Claude + OpenAI GPT-4o-mini).

---

## System Overview

```
┌─────────────────────────────────────────────────────┐
│       Frontend (React 19 + Tailwind CSS 4)          │
│  13 Pages - 15+ Components - 3 Hooks - 2 Contexts  │
│  SSE Real-Time Events - Theme System - Kanban Board │
├─────────────────────────────────────────────────────┤
│        API Layer (Next.js App Router)                │
│  80+ Endpoints - NextAuth - Rate Limiting           │
│  SSE Streaming - Stripe Webhooks - Image Proxy      │
├─────────────────────────────────────────────────────┤
│        Business Logic (src/lib/ - 40+ files)         │
│  Value Estimator - AI Analyzers - Marketplace       │
│  Scanner - Description Generator - Analytics        │
├─────────────────────────────────────────────────────┤
│        Scraping Layer (Playwright + APIs)            │
│  Craigslist - eBay - Facebook - Mercari - OfferUp   │
├─────────────────────────────────────────────────────┤
│        Data Layer (Prisma ORM v7.4)                  │
│  13 Models - PostgreSQL - Migrations - Seeding      │
├─────────────────────────────────────────────────────┤
│        External Services                             │
│  OpenAI - Anthropic - Stripe - Sentry - Resend     │
│  eBay Browse API - Facebook Graph API               │
└─────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Framework | Next.js | 16.1.6 | Full-stack web framework (App Router) |
| UI | React | 19.2.3 | Component-based UI |
| Language | TypeScript | ^5 | Type safety |
| Styling | Tailwind CSS | ^4 | Utility-first CSS |
| ORM | Prisma | ^7.4.0 | Database access layer |
| Database | PostgreSQL | - | Primary data store |
| Auth | NextAuth | ^5.0.0-beta.30 | Authentication (credentials + OAuth) |
| Payments | Stripe | ^20.3.1 | Subscription billing |
| AI (Primary) | OpenAI SDK | ^4.73.0 | GPT-4o-mini for identification, analysis, descriptions |
| AI (Secondary) | Anthropic SDK | ^0.74.0 | Claude Sonnet for item analysis |
| AI (Browser) | Stagehand | ^3.0.6 | AI-powered browser automation (Gemini) |
| Scraping | Playwright | ^1.57.0 | Headless browser automation |
| Monitoring | Sentry | ^10.39.0 | Error tracking & performance |
| Email | Resend | ^6.9.2 | Transactional email |
| Validation | Zod | ^4.2.1 | Schema validation |
| Drag & Drop | @hello-pangea/dnd | ^18.0.1 | Kanban board interactions |
| Testing | Jest + Playwright + Cucumber | Various | Full test pyramid |
| Package Manager | pnpm | - | Dependency management |

---

## Core Data Flow

### Scraping > Analysis > Storage Pipeline

```
1. SCRAPING
   Playwright/API extracts raw listings from marketplace
   |
2. ALGORITHMIC ANALYSIS (always runs)
   detectCategory() > estimateValue() > valueScore (0-100)
   |
3. LLM ANALYSIS (optional, if OPENAI_API_KEY set)
   identifyItem() [GPT-4o-mini] > fetchMarketPrice() [Playwright/eBay]
   > quickDiscountCheck() > analyzeSellability() [GPT-4o-mini]
   |
4. FILTERING
   LLM mode: Save if 50%+ undervalued (meetsThreshold)
   Algo mode: Save if valueScore >= 70
   |
5. STORAGE
   Prisma > Listing table (with full analysis data)
   PriceHistory table (sold listings for reference)
   ScraperJob table (run metadata)
   |
6. REAL-TIME NOTIFICATION
   SSE events > listing.found, opportunity.created
```

### Opportunity Lifecycle

```
IDENTIFIED > CONTACTED > PURCHASED > LISTED > SOLD
    |            |           |          |        |
  Found by    Seller     Bought      Posted    Sold +
  scraper    contacted   item       on other   profit
                                   platforms  calculated
```

---

## AI Integration Architecture

### Three-Tier AI Pipeline

| Tier | Model | Provider | Purpose | Fallback |
|------|-------|----------|---------|----------|
| 1. Item Identification | gpt-4o-mini | OpenAI | Extract brand, model, condition | Skip |
| 2. Item Analysis | claude-sonnet-4-5 | Anthropic | Structural analysis, flippability | Algorithmic scoring |
| 3. Sellability Analysis | gpt-4o-mini | OpenAI | Market verification, pricing | Algorithmic scoring |

### Content Generation

| Feature | Model | Fallback |
|---------|-------|----------|
| Resale Descriptions | gpt-4o-mini | Algorithmic templates |
| Listing Titles | gpt-4o-mini | Algorithmic construction |
| Purchase Messages | Algorithmic | Always algorithmic |

### AI Analysis Caching
- Results cached in `AiAnalysisCache` table with 24-hour TTL
- Batch processing with rate limiting (200ms-1s delays)

### Key AI Files
| File | Model | Purpose |
|------|-------|---------|
| `src/lib/claude-analyzer.ts` | Claude Sonnet 4.5 | Structural listing analysis, flippability scoring |
| `src/lib/llm-identifier.ts` | GPT-4o-mini | Product identification (brand, model, variant) |
| `src/lib/llm-analyzer.ts` | GPT-4o-mini | Sellability analysis with market data |
| `src/lib/description-generator.ts` | GPT-4o-mini | Platform-specific resale descriptions |
| `src/lib/title-generator.ts` | GPT-4o-mini | SEO-optimized listing titles |
| `src/lib/market-price.ts` | None (Playwright) | eBay sold price data extraction |
| `src/lib/value-estimator.ts` | None (algorithmic) | Core flip scoring (0-100) |

---

## Scraper Architecture

| Platform | Method | Anti-Detection | Rate Limiting |
|----------|--------|----------------|---------------|
| Craigslist | Playwright (Chromium) | Custom UA, selector fallbacks | 1s between LLM calls |
| eBay | Browse API v1 (OAuth) | Official API | Token-based |
| Facebook | Graph API + Stagehand (Gemini) | OAuth, AI browser automation | API rate limits |
| Mercari | Internal API + Playwright | Browser-like headers | Detects 429, 1s delays |
| OfferUp | Playwright (Chromium) | Anti-automation flags, resource blocking | 2s delay, exponential backoff |

---

## Authentication & Authorization

- **NextAuth v5** with credential provider (email/password)
- **bcryptjs** (12 rounds) for password hashing
- **Facebook OAuth** for marketplace token acquisition
- **Subscription tiers**: FREE > FLIPPER > PRO
- **hCaptcha** for login protection
- **API Key Encryption** for user-supplied OpenAI keys

---

## Data Architecture

### PostgreSQL via Prisma ORM - 13 Models

**Core Business:** Listing, Opportunity, ScraperJob, SearchConfig, PriceHistory
**User & Auth:** User, Account, Session, VerificationToken, UserSettings, FacebookToken
**Features:** Message, AiAnalysisCache, PostingQueueItem

### Key Relationships
```
User 1--* Listing 1--1 Opportunity
  |          |--* Message
  |          +--* PostingQueueItem
  |--1 UserSettings
  |--* Account (OAuth)
  |--* ScraperJob
  +--* SearchConfig
```

---

## Deployment Architecture

| Platform | Purpose | Config |
|----------|---------|--------|
| Vercel | Primary hosting (Next.js edge) | `vercel.json` |
| Docker | Containerized deployment | `Dockerfile`, `docker-compose.prod.yml` |
| Firebase/GCP | Cloud Functions (scrapers) | `functions/`, `firebase.json` |
| GitHub Actions | CI/CD (5 workflows) | `.github/workflows/` |

### Planned Infrastructure (Epic 1)

| Platform | Purpose |
|----------|---------|
| Cloud Run | Containerized Next.js (auto-scaling) |
| Cloud SQL | Managed PostgreSQL |
| Firebase Auth | Social login, JWT tokens |
| Firebase Hosting | Static assets, CDN |

---

## Monitoring & Observability

| Tool | Purpose |
|------|---------|
| Sentry | Error tracking, performance, source maps |
| Vercel Analytics | Web analytics, Core Web Vitals |
| Custom Metrics | `/api/health/metrics` |
| Health Probes | `/api/health`, `/api/health/ready` |
| Structured Logging | pino via `logger.ts` |

---

## Testing Strategy

| Level | Tool | Count |
|-------|------|-------|
| Unit | Jest | ~70 files |
| Component | Jest + Testing Library | ~14 files |
| Integration | Jest + Prisma | ~8 files |
| Security | Jest | 3 files |
| E2E | Playwright | ~60 specs |
| BDD | Cucumber | 9 features |

---

## Security Measures

- Security Headers (CSP, HSTS, X-Frame-Options)
- Rate Limiting (`rate-limiter.ts`)
- hCaptcha on login
- API Key Encryption at rest
- Zod input validation on all endpoints
- Stripe webhook signature verification
- bcryptjs password hashing (12 rounds)
