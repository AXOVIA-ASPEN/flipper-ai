# Source Tree Analysis - Flipper.ai

> Generated: 2026-02-27 | Scan Level: Deep | Repository Type: Monolith

## Directory Tree

```
flipper-ai/
├── app/                                    # [ENTRY] Next.js App Router (pages + API routes)
│   ├── layout.tsx                          #   Root layout (providers, global nav)
│   ├── page.tsx                            #   Landing / home page
│   ├── globals.css                         #   Global Tailwind CSS styles
│   ├── sitemap.ts                          #   Dynamic sitemap generator
│   ├── (auth)/                             #   Auth route group
│   │   ├── login/page.tsx                  #     Login page
│   │   └── register/page.tsx               #     Registration page
│   ├── dashboard/page.tsx                  #   Main listing inventory view
│   ├── analytics/page.tsx                  #   Profit/loss analytics
│   ├── messages/page.tsx                   #   Seller message management
│   ├── onboarding/page.tsx                 #   New user onboarding wizard
│   ├── opportunities/page.tsx              #   Flip opportunities (Kanban board)
│   ├── scraper/page.tsx                    #   Scraper control panel
│   ├── settings/page.tsx                   #   User preferences
│   ├── privacy/page.tsx                    #   Privacy policy
│   ├── terms/page.tsx                      #   Terms of service
│   ├── docs/page.tsx                       #   Documentation viewer
│   ├── health/page.tsx                     #   System health
│   └── api/                                #   REST API (~80+ endpoints)
│       ├── auth/                            #     Authentication (NextAuth, Facebook OAuth)
│       ├── checkout/                        #     Stripe billing
│       ├── descriptions/                    #     AI description generator
│       ├── events/                          #     SSE real-time stream
│       ├── health/                          #     Health probes (liveness, readiness, metrics)
│       ├── images/                          #     Image proxy
│       ├── listings/                        #     Listing CRUD + market-value + descriptions
│       ├── messages/                        #     Seller messaging
│       ├── opportunities/                   #     Opportunity CRUD
│       ├── posting-queue/                   #     Cross-platform posting
│       ├── scraper/                         #     [CORE] 5 platform scrapers
│       │   ├── craigslist/route.ts          #       Playwright-based Craigslist scraper
│       │   ├── ebay/route.ts                #       eBay Browse API scraper
│       │   ├── facebook/route.ts            #       Facebook Graph API scraper
│       │   ├── mercari/route.ts             #       Mercari internal API scraper
│       │   └── offerup/route.ts             #       Playwright-based OfferUp scraper
│       ├── search-configs/                  #     Saved search configurations
│       ├── scraper-jobs/                    #     Job tracking
│       ├── user/                            #     Settings, onboarding, unsubscribe
│       └── webhooks/                        #     Stripe webhooks
│
├── src/                                    # Shared source code
│   ├── components/                         #   React UI components (15+)
│   │   ├── Navigation.tsx                  #     Main nav bar
│   │   ├── KanbanBoard.tsx                 #     Drag-and-drop opportunity board
│   │   ├── ErrorBoundary.tsx               #     Global error boundary
│   │   ├── Toast.tsx / ToastContainer.tsx   #     Notification system
│   │   ├── ThemeSettings.tsx               #     Theme configuration
│   │   ├── NotificationSettings.tsx        #     Email notification prefs
│   │   ├── WebVitals.tsx                   #     Core Web Vitals reporter
│   │   ├── Onboarding/                     #     6-step onboarding wizard
│   │   └── providers/SessionProvider.tsx    #     NextAuth session wrapper
│   │
│   ├── contexts/ThemeContext.tsx            #   Theme state management
│   ├── hooks/                              #   Custom React hooks (3)
│   │   ├── useFilterParams.ts              #     URL filter state sync
│   │   ├── useSseEvents.ts                 #     Real-time SSE events
│   │   └── useThemeClasses.ts              #     Theme-aware CSS classes
│   │
│   ├── lib/                                #   [CORE] Business logic & services (40+ files)
│   │   ├── value-estimator.ts              #     [CORE] Flip score calculator (0-100)
│   │   ├── claude-analyzer.ts              #     Claude AI item analysis
│   │   ├── llm-identifier.ts               #     GPT-4o-mini item identification
│   │   ├── llm-analyzer.ts                 #     GPT-4o-mini sellability analysis
│   │   ├── description-generator.ts        #     AI resale description creator
│   │   ├── title-generator.ts              #     AI listing title creator
│   │   ├── market-price.ts                 #     eBay sold price fetcher (Playwright)
│   │   ├── market-value-calculator.ts      #     Statistical market value calculator
│   │   ├── marketplace-scanner.ts          #     Multi-platform scan orchestrator
│   │   ├── db.ts                           #     Prisma client singleton
│   │   ├── auth.ts                         #     NextAuth configuration
│   │   ├── stripe.ts                       #     Stripe SDK setup
│   │   ├── rate-limiter.ts                 #     Request rate limiting
│   │   ├── sse-emitter.ts                  #     Server-Sent Events emitter
│   │   ├── errors.ts                       #     Custom error classes
│   │   ├── logger.ts                       #     Structured logging
│   │   └── ...                             #     (email, analytics, reports, etc.)
│   │
│   ├── scrapers/facebook/                  #   Facebook Stagehand scraper
│   └── __tests__/                          #   Jest test suites (~100+ files)
│       ├── api/                            #     API route tests
│       ├── components/                     #     Component tests
│       ├── lib/                            #     Service tests
│       ├── hooks/                          #     Hook tests
│       ├── integration/                    #     Database integration tests
│       ├── security/                       #     Security tests
│       └── performance/                    #     Performance benchmarks
│
├── prisma/                                 # Database schema & migrations
│   ├── schema.prisma                       #   13 models (PostgreSQL)
│   ├── seed.ts                             #   Database seeding
│   └── migrations/                         #   Schema migrations
│
├── e2e/                                    # Playwright E2E tests (~60+ specs)
│   ├── acceptance/                         #   BDD acceptance tests
│   ├── visual/                             #   Visual regression tests
│   ├── fixtures/                           #   Test data & mocks
│   ├── helpers/                            #   Test utilities
│   └── pages/                              #   Page Object Models
│
├── features/                               # Cucumber BDD features (9 scenarios)
│   ├── step_definitions/                   #   Step implementations
│   └── support/                            #   Cucumber support files
│
├── functions/                              # Cloud Functions (Firebase/GCP)
│   ├── src/                                #   Cloud function source
│   │   ├── scrapers/                       #   Cloud-deployed scraper variants
│   │   └── craigslist/Dockerfile           #   Playwright Docker image
│   └── prisma/schema.prisma               #   PostgreSQL schema for cloud
│
├── scripts/                                # DevOps & automation (~13 scripts)
├── public/                                 # Static assets
├── .github/workflows/                      # CI/CD (5 pipelines)
├── docs/                                   # Project documentation (30+ files)
└── Configuration files                     # next.config.js, tsconfig.json, etc.
```

## Critical Folders

| Folder | Purpose | Key Files |
|--------|---------|-----------|
| `app/api/scraper/` | Core scraping endpoints for 5 marketplaces | craigslist/route.ts, ebay/route.ts |
| `src/lib/` | All business logic: AI analysis, value estimation, services | value-estimator.ts, claude-analyzer.ts, llm-*.ts |
| `src/components/` | All React UI components | KanbanBoard.tsx, Navigation.tsx |
| `prisma/` | Database schema and migrations | schema.prisma (13 models) |
| `src/__tests__/` | Complete test suite (100+ files) | api/, lib/, integration/, security/ |
| `e2e/` | Playwright E2E tests (60+ specs) | acceptance/, visual/, pages/ |

## Entry Points

1. **`app/layout.tsx`** — Root layout, provider hierarchy
2. **`app/page.tsx`** — Landing page
3. **`Makefile`** — Developer command interface
4. **`package.json`** — npm scripts, dependencies
5. **`prisma/schema.prisma`** — Database schema
6. **`next.config.js`** — Next.js + Sentry configuration

## Architecture Notes

- `app/` sits at project root (Next.js 16 convention), NOT inside `src/`
- `src/` holds shared code: components, hooks, lib, scrapers, tests
- `functions/` is a separate deployable package for cloud functions with its own Prisma schema
- Test pyramid: Unit (Jest) → Integration (Jest + DB) → E2E (Playwright) → BDD (Cucumber)
- Python prototypes exist in `marketplace_integrations/` for Mercari
