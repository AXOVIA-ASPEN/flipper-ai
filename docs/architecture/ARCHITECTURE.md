# 🏗️ Flipper AI — Architecture

**Author:** Stephen Boyett
**Company:** Axovia AI
**Version:** 1.0.0

---

## System Overview

```mermaid
graph TB
    subgraph Client["Frontend (Next.js App Router)"]
        UI[React Components]
        Pages[App Pages]
        Hooks[Custom Hooks]
    end

    subgraph API["API Layer (Next.js Route Handlers)"]
        Auth["/api/auth/*"]
        Opportunities["/api/opportunities/*"]
        Scraper["/api/scraper/*"]
        Analysis["/api/analysis/*"]
        Settings["/api/settings/*"]
        Health["/api/health"]
    end

    subgraph Services["Service Layer"]
        ScraperSvc["Scraper Service"]
        AnalysisSvc["Claude Analyzer"]
        ImageSvc["Image Service"]
        PriceSvc["Price History Service"]
        MarketSvc["Market Value Calculator"]
    end

    subgraph External["External Services"]
        Claude["Claude API (Anthropic)"]
        eBay["eBay API"]
        FB["Facebook Marketplace"]
        CL["Craigslist"]
        OfferUp["OfferUp"]
        Mercari["Mercari"]
    end

    subgraph Data["Data Layer"]
        Prisma["Prisma ORM"]
        DB[(PostgreSQL)]
    end

    UI --> Pages
    Pages --> Hooks
    Hooks --> API
    API --> Services
    Services --> External
    Services --> Prisma
    Prisma --> DB
    Auth --> Prisma
```

## Component Details

### Frontend
- **Framework:** Next.js 16 with App Router & Turbopack
- **Styling:** Tailwind CSS + shadcn/ui components
- **State:** React hooks + server components
- **Auth UI:** NextAuth.js with credential provider

### API Layer
- **Pattern:** Next.js Route Handlers (`app/api/`)
- **Auth:** NextAuth.js session-based authentication
- **Validation:** Zod schemas for input validation

### Service Layer
- **Claude Analyzer:** AI-powered listing analysis (brand, condition, market value)
- **Image Service:** Image processing and analysis
- **Price History:** Historical price tracking and trend analysis
- **Market Value Calculator:** Weighted scoring for flip opportunities
- **Scraper Service:** Multi-platform listing scraper

### Data Layer
- **ORM:** Prisma with PostgreSQL adapter
- **Migrations:** Prisma Migrate for schema management
- **Models:** User, Listing, Opportunity, PriceHistory, Settings

## Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as API Routes
    participant Scraper as Scraper Service
    participant AI as Claude Analyzer
    participant DB as Database

    U->>FE: Configure scan parameters
    FE->>API: POST /api/scraper/scan
    API->>Scraper: Start marketplace scan
    Scraper->>DB: Store raw listings
    Scraper->>AI: Analyze listings
    AI->>DB: Store analysis results
    API->>FE: Return opportunities
    FE->>U: Display scored opportunities
```

## Deployment

```mermaid
graph LR
    Dev["Local Dev"] -->|git push| GH["GitHub"]
    GH -->|CI/CD| Actions["GitHub Actions"]
    Actions -->|Build| Docker["Docker Image"]
    Actions -->|Test| Tests["Jest + Playwright"]
    Docker -->|Deploy| Prod["Production"]
    Prod --> PG[(PostgreSQL)]
```

- **CI/CD:** GitHub Actions (lint, test, build, deploy)
- **Container:** Docker multi-stage build
- **Database:** PostgreSQL (Cloud SQL or managed)
- **Hosting:** Vercel / Docker deployment
