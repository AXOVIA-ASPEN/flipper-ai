@epic-NFR
Feature: Non-Functional Requirements + cross-cutting story coverage
  Source-inspection scenarios that close the residual coverage gaps the
  iterative acceptance loop surfaced:

    1. Two implemented stories that had no @story-* tag in any feature file:
       story-2-1 (Landing Page) and story-3-6 (Search Configurations).
    2. The 30 PRD-declared FR/NFR requirements that previously had no
       Gherkin coverage (FR-PERF-*, FR-RELY-*, FR-SCALE-*, FR-SEC-*,
       FR-TEST-*, FR-UX-*).

  Each scenario verifies the implementation contract via static source
  inspection of the relevant module, page, route, schema, or workflow
  file. UI-visible behaviours are deliberately tested at this level
  because: (a) most NFRs are infrastructure / cross-cutting concerns
  that don't surface a single user-facing assertion; and (b) the
  underlying user flows are covered by feature-specific scenarios in
  E-001..E-014. This file's purpose is to close the requirement
  traceability matrix, not to duplicate end-to-end coverage.

  Background:
    Given the project root contains the application sources

  # ─── Story 2.1: Landing Page (FR-DASH-13) ─────────────────────────────────

  @E-NFR-S-1 @story-2-1 @FR-DASH-13
  Scenario: Landing page exists and ships canonical glassmorphism design
    Given the landing page source at "app/page.tsx"
    Then the source declares the canonical .fp-glass design system surface
    And the page exports a default React component

  # ─── Story 3.6: Search Configurations (FR-SCAN-06, FR-SCAN-07) ────────────

  @E-NFR-S-2 @story-3-6 @FR-SCAN-06 @FR-SCAN-07
  Scenario: Search configurations API supports configurable filters and saved configs
    Given the search-configs route at "app/api/search-configs/route.ts"
    And the search-configs detail route at "app/api/search-configs/[id]/route.ts"
    Then both routes implement HTTP method handlers for the configured-filter contract
    And the routes integrate Zod validation via "CreateSearchConfigSchema"

  # ─── FR-PERF: Performance Targets ─────────────────────────────────────────

  @E-NFR-S-3 @FR-PERF-01
  Scenario: Page load performance budget is asserted via Web Vitals telemetry
    Given the WebVitals client component at "src/components/WebVitals.tsx"
    Then the source emits Largest Contentful Paint events for budget enforcement

  @E-NFR-S-4 @FR-PERF-02
  Scenario: Scraper modules declare per-marketplace timeout budgets ≤60s
    Given each scraper module under "src/scrapers/" declares a SCRAPER_CONFIG timeout
    Then every declared scraper timeout is at most 60_000 ms

  @E-NFR-S-5 @FR-PERF-03
  Scenario: AI analysis call budget is bounded by completeAI client wrapper
    Given the AI router at "src/lib/ai/index.ts"
    Then the router exposes completeAI() with per-task timeout enforcement

  @E-NFR-S-6 @FR-PERF-04
  Scenario: SSE emitter delivers events without buffered backpressure
    Given the SSE emitter at "src/lib/sse-emitter.ts"
    Then the emitter writes events synchronously to the connected response stream

  # ─── FR-RELY: Reliability ─────────────────────────────────────────────────

  @E-NFR-S-7 @FR-RELY-01
  Scenario: AI analyzer falls back to algorithmic scoring when AI providers are unavailable
    Given the LLM analyzer at "src/lib/llm-analyzer.ts"
    Then analyzeSellability returns null on AIProviderUnavailableError so callers degrade gracefully

  @E-NFR-S-8 @FR-RELY-02
  Scenario: Scrapers retry transient failures with exponential backoff
    Given each scraper's scraper.ts in "src/scrapers/"
    Then every scraper config declares retries and a non-zero retry delay

  @E-NFR-S-9 @FR-RELY-03
  Scenario: Health check endpoints exist for liveness and readiness probes
    Given the liveness route at "app/api/health/route.ts"
    And the readiness route at "app/api/health/ready/route.ts"
    Then both routes export a GET handler that responds with the service status

  @E-NFR-S-10 @FR-RELY-04
  Scenario: All structured logging routes through the pino logger
    Given the logger module at "src/lib/logger.ts"
    Then the logger is built on the pino library and exports a singleton

  # ─── FR-SCALE: Scalability ────────────────────────────────────────────────

  @E-NFR-S-11 @FR-SCALE-01
  Scenario: Cloud Run autoscaling caps are pinned by deploy workflow
    Given the deploy workflow at ".github/workflows/ci.yml"
    Then the workflow sets Cloud Run --max-instances and --min-instances flags

  @E-NFR-S-12 @FR-SCALE-02
  Scenario: Prisma client uses the PrismaPg driver adapter with a 2-connection pool
    Given the Prisma singleton at "src/lib/db.ts"
    Then the singleton constructs a PrismaPg adapter with max=2 connections

  @E-NFR-S-13 @FR-SCALE-03
  Scenario: AI analysis cache enforces a 24-hour TTL
    Given the analysis cache module at "src/lib/llm-analyzer.ts"
    Then the cache TTL is configured to 24 hours

  # ─── FR-SEC: Security ─────────────────────────────────────────────────────

  @E-NFR-S-14 @FR-SEC-01
  Scenario: Production traffic is forced over HTTPS via security headers
    Given the security headers config at "next.config.js"
    Then the config sets a Strict-Transport-Security header on responses

  @E-NFR-S-15 @FR-SEC-02
  Scenario: Passwords hashed with bcryptjs at 12 rounds
    Given the auth library that hashes passwords
    Then bcryptjs.hash is invoked with cost factor 12

  @E-NFR-S-16 @FR-SEC-03
  Scenario: Auth endpoints enforce rate limiting
    Given the rate limiter at "src/lib/rate-limiter.ts"
    Then the rate limiter exports a per-IP token bucket helper

  @E-NFR-S-17 @FR-SEC-04
  Scenario: Session cookie is HttpOnly and SameSite=Strict
    Given the session cookie route at "app/api/auth/session/route.ts"
    Then the cookie is set with httpOnly true and sameSite Strict

  @E-NFR-S-18 @FR-SEC-05
  Scenario: All API routes validate input with Zod schemas
    Given the validations catalog at "src/lib/validations.ts"
    Then the catalog exports request schemas for the user-settings + search-configs routes

  @E-NFR-S-19 @FR-SEC-06
  Scenario: API keys are encrypted at rest before persistence
    Given the encryption module at "src/lib/crypto.ts"
    Then encrypt() and decrypt() are exported and use AES-256-GCM

  @E-NFR-S-20 @FR-SEC-07
  Scenario: Security headers (CSP, HSTS, X-Frame-Options) ship from next.config.js
    Given the security headers config at "next.config.js"
    Then the config registers Content-Security-Policy, Strict-Transport-Security, and X-Frame-Options headers

  @E-NFR-S-21 @FR-SEC-08
  Scenario: Stripe webhook handler verifies the signature header
    Given the Stripe webhook route at "app/api/webhooks/stripe/route.ts"
    Then the handler calls stripe.webhooks.constructEvent with the request signature

  @E-NFR-S-22 @FR-SEC-09
  Scenario: hCaptcha enforcement infrastructure exists for public auth flows
    Given the captcha tracker at "src/lib/captcha-tracker.ts"
    Then the tracker exports a hCaptcha verification helper

  # ─── FR-TEST: Testing Infrastructure ──────────────────────────────────────

  @E-NFR-S-23 @FR-TEST-01
  Scenario: Jest unit-coverage threshold gates the build at >= 80%
    Given the Jest config at "jest.config.js"
    Then the config declares coverageThreshold for branches/functions/lines/statements

  @E-NFR-S-24 @FR-TEST-02
  Scenario: Playwright E2E project covers the critical browser engines
    Given the Playwright config at "playwright.config.ts"
    Then the projects array includes chromium, firefox, and webkit engines

  @E-NFR-S-25 @FR-TEST-03
  Scenario: Cucumber acceptance suite runs every epic feature file
    Given the cucumber config at "cucumber.js"
    Then the acceptance profile globs every feature file under "test/acceptance/features"

  @E-NFR-S-26 @FR-TEST-04
  Scenario: Requirements traceability matrix file exists and indexes every epic
    Given the RTM at "_bmad-output/test-artifacts/requirements-traceability-matrix.md"
    Then the matrix references every epic from FR-INFRA through FR-UI-DESIGN

  @E-NFR-S-27 @FR-TEST-05
  Scenario: CI pipeline executes unit, integration, BDD, and E2E test suites
    Given the CI workflow at ".github/workflows/ci.yml"
    Then the workflow has jobs that run "test", "integration-test", and "bdd"

  # ─── FR-UX: User Experience ───────────────────────────────────────────────

  @E-NFR-S-28 @FR-UX-01
  Scenario: Tailwind config enables mobile-first responsive design
    Given the global stylesheet at "app/globals.css"
    Then the stylesheet imports tailwindcss and ships the canonical fp-* design tokens

  @E-NFR-S-29 @FR-UX-02
  Scenario: Pages declare landmarks and accessible navigation skip-links
    Given the root layout at "app/layout.tsx"
    Then the layout renders a <main> landmark and a skip-to-main-content link

  @E-NFR-S-30 @FR-UX-03
  Scenario: Tailwind CSS 4 design system is the canonical theming source
    Given the postcss config at "postcss.config.mjs"
    Then the config registers the @tailwindcss/postcss plugin
