# Flipper.ai — Project Documentation Index

> Generated: 2026-02-27 | Scan Level: Deep | Workflow: document-project v1.2.0

## Project Overview

- **Type:** Monolith (single cohesive full-stack application)
- **Primary Language:** TypeScript
- **Framework:** Next.js 16 (App Router) + React 19
- **Database:** PostgreSQL via Prisma ORM (13 models)
- **Architecture:** Layered monolith (UI → API → Business Logic → Data)

## Quick Reference

- **Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Prisma 7.4, PostgreSQL
- **AI:** OpenAI GPT-4o-mini + Anthropic Claude Sonnet 4.5
- **Entry Point:** `app/layout.tsx` (root layout), `Makefile` (developer commands)
- **Architecture Pattern:** Full-stack monolith with App Router API routes
- **Scraping:** Playwright + Stagehand (5 marketplaces)
- **Auth:** NextAuth v5 (credentials + Facebook OAuth)
- **Billing:** Stripe (FREE/FLIPPER/PRO tiers)
- **Monitoring:** Sentry + Vercel Analytics

---

## Generated Documentation

### Core Architecture
- [Project Overview](./project-overview.md) — Executive summary, features, tech stack
- [Architecture (Deep Scan)](./architecture-deep-scan.md) — System architecture, data flow, AI pipeline
- [Source Tree Analysis](./source-tree-analysis.md) — Annotated directory structure with critical folders

### API & Data
- [API Contracts](./api-contracts.md) — 80+ API endpoints documented
- [Data Models](./data-models.md) — 13 database models with relationships

### UI & Components
- [Component Inventory](./component-inventory.md) — 15+ components, 3 hooks, contexts, pages

### Development
- [Development Guide](./development-guide.md) — Setup, commands, testing, deployment

---

## Existing Documentation

### Architecture & Design
- [Architecture (Original)](./architecture/ARCHITECTURE.md) — Original system architecture with Mermaid diagrams
- [PRD](./PRD.md) — Product Requirements Document
- [Go-to-Market Strategy](./GO_TO_MARKET_STRATEGY.md) — Launch strategy

### API & Technical
- [API Reference](./api/API_REFERENCE.md) — Detailed API reference
- [OpenAPI Spec](./api/openapi.yaml) — OpenAPI 3.0 specification
- [Prisma Guide](./tools/PRISMA.md) — Prisma ORM documentation
- [Listing Decision Logic](./LISTING-DECISION-LOGIC.md) — Business rules for listing/opportunity decisions

### Development & Operations
- [Developer Setup](./dev/DEVELOPER_SETUP.md) — Local development environment setup
- [Troubleshooting](./dev/TROUBLESHOOTING.md) — Common issues and solutions
- [Admin Runbook](./dev/ADMIN_RUNBOOK.md) — Administrative procedures
- [Operations Runbook](./dev/OPERATIONS_RUNBOOK.md) — Operational procedures

### Security & Secrets
- [GCP Secret Manager](./secrets/secretmanager.md) — Secret names and usage for GCP Secret Manager
- [Security Audit](./security/SECURITY_AUDIT.md) — Security findings and recommendations
- [Security Headers](./security/SECURITY_HEADERS.md) — HTTP security header configuration
- [Security Cleanup](./security/SECURITY_CLEANUP_2026-02-18.md) — Security cleanup tasks

### Deployment
- [Deployment Guide](./deployment/DEPLOYMENT.md) — Deployment procedures
- [Production Readiness](./deployment/PRODUCTION_READINESS.md) — Production readiness checklist
- [Production Readiness Report](./deployment/PRODUCTION_READINESS_REPORT.md) — Assessment report
- [Database Migration](./deployment/DATABASE_MIGRATION.md) — Migration procedures
- [Database Migration Guide](./deployment/DATABASE_MIGRATION_GUIDE.md) — Step-by-step guide
- [OAuth Setup](./deployment/OAUTH_SETUP.md) — OAuth configuration
- [Sentry Setup](./deployment/SENTRY_SETUP.md) — Error tracking setup
- [Monitoring](./deployment/MONITORING.md) — Monitoring & alerting
- [Production Database Migration Fix](./deployment/PRODUCTION_DATABASE_MIGRATION_FIX.md) — One-off migration fix notes
- Deployment checklists & history: [DEPLOYMENT_READY](./deployment/DEPLOYMENT_READY.md), [DEPLOYMENT_STATUS](./deployment/DEPLOYMENT_STATUS.md), [QUICK-START-DEPLOYMENT](./deployment/QUICK-START-DEPLOYMENT.md), [Firebase](./deployment/FIREBASE-README.md), [MIGRATION](./deployment/MIGRATION.md)

### Planning
- [Implementation Plan](./planning/IMPLEMENTATION-PLAN.md) — High-level implementation roadmap
- [Hybrid Architecture Plan](./planning/HYBRID_ARCHITECTURE_PLAN.md) — Hybrid architecture design
- [Django Migration Plan](./planning/DJANGO_MIGRATION_PLAN.md) — Django migration notes

### Testing
- [BDD Test Plan](./testing/BDD_TEST_PLAN.md) — Behavior-driven test plan
- [Coverage Gaps](./testing/COVERAGE_GAPS.md) — Test coverage analysis
- [Integration Test Results](./testing/INTEGRATION-TEST-RESULTS.md) — Integration test results
- [Implementation Plan](./testing/IMPLEMENTATION_PLAN.md) — Implementation roadmap
- [Coverage Verification](./testing/COVERAGE_VERIFICATION.md) — Coverage verification notes
- [Test Plan](./testing/test-plan.md) — Test planning notes

### User Documentation
- [User Guide](./guides/USER_GUIDE.md) — End-user documentation
- [User Flows](./prd/user-flows.md) — User interaction flows

### Archive
- [Worker Sprint 2026-02-13](./archive/WORKER_SPRINT_2026-02-13.md) — Sprint notes
- [SSE Investigation 2026-02-19](./archive/sse-investigation-2026-02-19.md) — Investigation notes
- [CI Fix Summary](./archive/CI_FIX_SUMMARY.md), [Testing Reports](./archive/TESTING_REPORT.md), [Worker Report](./archive/WORKER_REPORT_2026-02-19_04-00.md), [Theme Test Manual](./archive/THEME_TEST_MANUAL.md)

### Reports
- [VALUE-REPORT-001](./reports/VALUE-REPORT-001.json) — Sample value report

---

## Getting Started

### For Development
```bash
make preview    # Install deps, migrate DB, start dev server
```
See [Development Guide](./development-guide.md) for full setup instructions.

### For AI-Assisted Development
When creating a brownfield PRD or planning new features, reference:
1. This `index.md` as the entry point
2. [Architecture](./architecture-deep-scan.md) for system design context
3. [API Contracts](./api-contracts.md) for existing endpoint inventory
4. [Data Models](./data-models.md) for database schema
5. [Component Inventory](./component-inventory.md) for reusable UI elements

### Key Commands
```bash
make dev          # Start dev server
make test         # Run unit tests
make test-e2e     # Run E2E tests
make build        # Production build
make studio       # Database GUI
```
