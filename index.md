# Flipper.ai — Codebase Index

> Single entry point for repository layout. Updated after root reorganization.

## Root layout

```
flipper-ai/
├── app/                    # Next.js App Router (pages, API routes, layouts)
├── src/                    # Shared lib, hooks, components, generated Prisma
├── prisma/                 # Schema, migrations, seed
├── public/                 # Static assets
├── docs/                   # All project documentation (see docs/README.md)
├── scripts/                # Executable scripts by purpose (see scripts/README.md)
├── config/                 # Docker, PM2, Railway configs (see config/README.md)
├── test/                   # E2E and BDD tests (Playwright, Cucumber)
├── e2e/                    # Playwright E2E specs (primary)
├── features/               # Cucumber BDD features
├── reports/                # Generated reports (gitignored)
├── _bmad/                  # BMAD workflow assets
├── _bmad-output/           # BMAD outputs (e.g. project-context)
├── functions/              # Firebase Cloud Functions (production scraping)
│
├── README.md               # Project readme
├── AGENTS.md               # Agent guidelines
├── CLAUDE.md               # Claude/dev guidelines
├── CONTRIBUTING.md         # Contribution guide
├── CHANGELOG.md            # Changelog
├── LICENSE
├── Makefile                # make preview, dev, test, lint, build, migrate, studio
├── package.json
├── tsconfig.json           # TypeScript (Next.js)
├── next.config.js
├── eslint.config.mjs
├── playwright.config.ts    # E2E (testDir: ./e2e)
├── jest.config.js
├── vercel.json             # Vercel (kept at root for CLI)
├── firebase.json           # Firebase (kept at root for CLI)
└── .firebaserc
```

## Docs (`docs/`)

| Path | Purpose |
|------|--------|
| [docs/README.md](docs/README.md) | Doc index and structure |
| [docs/index.md](docs/index.md) | Full documentation map |
| **Root** | project-overview, architecture-deep-scan, api-contracts, data-models, component-inventory, development-guide, PRD, GO_TO_MARKET_STRATEGY, LISTING-DECISION-LOGIC |
| [docs/api/](docs/api/) | API_REFERENCE.md, openapi.yaml |
| [docs/architecture/](docs/architecture/) | ARCHITECTURE.md, technical specs |
| [docs/dev/](docs/dev/) | DEVELOPER_SETUP, TROUBLESHOOTING, runbooks |
| [docs/deployment/](docs/deployment/) | DEPLOYMENT, migrations, OAuth, Sentry, monitoring, checklists |
| [docs/planning/](docs/planning/) | IMPLEMENTATION-PLAN, HYBRID_ARCHITECTURE_PLAN, DJANGO_MIGRATION_PLAN |
| [docs/security/](docs/security/) | SECURITY_AUDIT, SECURITY_HEADERS, cleanup |
| [docs/testing/](docs/testing/) | BDD_TEST_PLAN, coverage, test-plan |
| [docs/guides/](docs/guides/) | USER_GUIDE, traceability example |
| [docs/prd/](docs/prd/) | user-flows.md |
| [docs/archive/](docs/archive/) | Sprint notes, CI/test reports, investigations |
| [docs/reports/](docs/reports/) | VALUE-REPORT-001.json and other artifacts |
| [docs/tools/](docs/tools/) | PRISMA.md |
| [docs/bmad/](docs/bmad/) | BMAD workflow |
| [docs/stories/](docs/stories/) | User stories |

## Scripts (`scripts/`)

| Path | Purpose |
|------|--------|
| [scripts/README.md](scripts/README.md) | Script index |
| [scripts/deploy/](scripts/deploy/) | deploy-production.sh, verify-deployment.sh, validate-deployment.sh |
| [scripts/db/](scripts/db/) | db-backup.sh, db-restore.sh |
| [scripts/setup/](scripts/setup/) | setup-oauth.sh, setup-acceptance-tests.sh, migrate-env-to-firebase.sh |
| [scripts/test/](scripts/test/) | test-production.sh, test-oauth.sh, test-all-flows.sh |
| [scripts/health/](scripts/health/) | health-monitor.sh |
| Root | refactor-error-handling.ts |

**Run from repo root**, e.g. `./scripts/setup/setup-oauth.sh`, `./scripts/deploy/verify-deployment.sh <url>`.

## Config (`config/`)

| Path | Purpose |
|------|--------|
| [config/README.md](config/README.md) | Config index |
| [config/docker/](config/docker/) | Dockerfile, docker-compose.yml, docker-compose.prod.yml |
| [config/pm2/](config/pm2/) | ecosystem.config.js |
| [config/railway/](config/railway/) | railway.json |

**Vercel** and **Firebase** configs stay at repo root for CLI. Use from root: `docker compose -f config/docker/docker-compose.prod.yml up`, `pm2 start config/pm2/ecosystem.config.js`.

## App & source

| Path | Purpose |
|------|--------|
| `app/` | Next.js routes: page.tsx, layout.tsx, api/*, (auth), (dashboard), etc. |
| `src/lib/` | Shared code: db, errors, value-estimator, auth, firebase, etc. |
| `src/hooks/`, `src/components/` | Shared UI and hooks |
| `src/generated/prisma/` | Generated Prisma client (if custom output) |
| `prisma/schema.prisma` | Database schema |

## Tests

| Path | Purpose |
|------|--------|
| `e2e/` | Playwright E2E (primary; see playwright.config.ts testDir) |
| `test/e2e/` | Additional E2E/visual specs |
| `test/features/` | Cucumber BDD features and step defs |
| `src/__tests__/` | Jest unit tests |

## Commands (from root)

```bash
make preview    # Install, migrate, dev server
make dev        # Dev server
make test       # Jest
make test-e2e   # Playwright
make lint       # ESLint
make build      # Production build
make migrate    # Prisma migrate dev
make studio     # Prisma Studio
```

See [docs/development-guide.md](docs/development-guide.md) and [Makefile](Makefile) for full command list.
