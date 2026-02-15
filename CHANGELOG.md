# Changelog

All notable changes to Flipper AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-02-15

### Added

- **Marketplace Scanning** — Multi-platform scraping (eBay, Facebook, Craigslist, OfferUp, Mercari) with normalized listing data
- **AI-Powered Analysis** — Claude integration for brand/model extraction, condition assessment, and flip scoring
- **Market Value Estimation** — eBay sold-listing price comparison, price history aggregation, weighted scoring algorithm
- **Seller Communication** — AI message template generator, negotiation strategies, message inbox/outbox with approval workflow
- **Resale Listing Creation** — AI-optimized titles/descriptions, pricing calculator, eBay listing API integration
- **Dashboard & Tracking** — Kanban-style opportunity board, deal pipeline visualization
- **User Auth & Billing** — Login/register, user settings, API key management
- **Scraper Job System** — Background processing queue, rate limiting, job scheduling
- **WebSocket Real-time Updates** — Live notifications for new opportunities and price changes
- **React Frontend** — Next.js app with responsive components for all features

### Infrastructure

- **CI/CD** — GitHub Actions pipeline with test, lint, and deploy stages
- **Vercel Deployment** — Production deployment configuration
- **Environment Management** — Zod-validated environment configuration
- **Rate Limiting & Security** — API rate limiting, input validation (Zod), security hardening
- **Monitoring & Observability** — Logging, error tracking, health checks
- **Docker Support** — Docker & Docker Compose setup for local development

### Testing

- **1,204 unit/integration tests** passing (Jest)
- **99%+ code coverage** across all modules
- **BDD/Cucumber** feature specs for all user journeys
- **Playwright E2E** tests with visual regression
- **API contract testing** (77 tests covering all endpoints)
- **React component tests** (Testing Library)

### Documentation

- Developer Setup Guide
- API Documentation (OpenAPI/Swagger)
- Operations Runbook
- Deployment guide
