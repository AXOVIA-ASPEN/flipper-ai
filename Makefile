# Flipper.ai Makefile
# ====================

.PHONY: help install dev preview build build-hosting start lint claude-code ensure-env db-up db-down db-setup db-migrate migrate migrate-dev db-sync db-studio studio db-reset clean test test-acceptance test-e2e test-e2e-ui test-all secrets-pull deploy-hosting

# Default target
help:
	@echo "Flipper.ai - Marketplace Flipping Tool"
	@echo ""
	@echo "Usage:"
	@echo "  make install    - Install dependencies"
	@echo "  make preview    - Install, ensure env & DB, start dev server"
	@echo "  make dev        - Start development server"
	@echo "  make build      - Production build"
	@echo "  make start      - Start production server"
	@echo "  make lint       - Run ESLint"
	@echo "  make db-migrate - Run database migrations (interactive)"
	@echo "  make migrate    - Alias for db-migrate"
	@echo "  make db-sync    - Sync schema to database (non-interactive)"
	@echo "  make db-studio  - Open Prisma Studio (database GUI)"
	@echo "  make studio     - Alias for db-studio"
	@echo "  make db-reset   - Reset database (WARNING: deletes all data)"
	@echo "  make build-hosting - Build static export for Firebase Hosting"
	@echo "  make deploy-hosting - Deploy to Firebase Hosting (CHANNEL=preview for preview)"
	@echo "  make clean      - Remove build artifacts"
	@echo "  make claude-code - Run Claude Code (claude --allow-dangerously-skip-permissions)"
	@echo ""
	@echo "Testing:"
	@echo "  make test       - Run unit tests (Jest)"
	@echo "  make test-e2e   - Run E2E tests (Playwright)"
	@echo "  make test-e2e-ui - Run E2E tests with UI (Playwright)"
	@echo "  make test-acceptance - Run BDD acceptance tests (Cucumber, Gherkin in real time)"
	@echo "                       - Optional: make test-acceptance TAGS=@smoke"
	@echo "  make test-ac    - Run epic-organized acceptance tests (test/acceptance/features/)"
	@echo "                       - Filter by story:   make test-ac STORY=9.2"
	@echo "                       - Filter by feature: make test-ac FEATURE=F012"
	@echo "                       - Filter by tags:    make test-ac TAGS=@FR-RELIST-01"
	@echo "  make test-all   - Run all tests (unit + BDD + E2E)"
	@echo ""
	@echo "Database:"
	@echo "  make db-up      - Start local PostgreSQL (Docker, port 5433)"
	@echo "  make db-down    - Stop local PostgreSQL"
	@echo ""
	@echo "Setup:"
	@echo "  make ensure-env - Create .env from .env.example if missing; set default DATABASE_URL"
	@echo "  make db-setup   - ensure-env + run migrations (deploy + push)"
	@echo "  make secrets-pull - Pull secrets from GCP Secret Manager into .env (requires gcloud)"

# Install dependencies
install:
	pnpm install
	npx prisma generate

# Development server
dev:
	pnpm dev

# Ensure .env exists and DATABASE_URL is set for local dev (creates .env from .env.example if missing)
ensure-env:
	@node scripts/setup/ensure-dev-env.js

# Start local PostgreSQL via Docker Compose
db-up:
	docker compose -f docker-compose.dev.yml up -d
	@echo "PostgreSQL running on localhost:5433"

# Stop local PostgreSQL
db-down:
	docker compose -f docker-compose.dev.yml down

# Database setup: ensure env, then run migrations so DB schema is ready
db-setup: ensure-env
	@echo "Running database migrations..."
	@npx prisma migrate deploy || npx prisma db push
	@npx prisma generate

# Preview: install deps, set up DB if needed, start dev server
preview: install db-setup
	@echo "Starting Flipper.ai preview server..."
	@echo "Open http://localhost:3000 in your browser"
	pnpm dev

# Production build
build:
	pnpm build

# Lint
lint:
	pnpm lint

# Start production server
start:
	pnpm start

# Claude Code (requires claude CLI)
claude-code:
	claude --allow-dangerously-skip-permissions

# Database migrations (interactive - prompts for migration name)
db-migrate:
	npx prisma migrate dev

# Alias for db-migrate
migrate: db-migrate

# Sync schema to database (non-interactive - for development)
db-sync:
	npx prisma migrate deploy
	npx prisma db push

# Open Prisma Studio
db-studio:
	npx prisma studio

# Alias for db-studio
studio: db-studio

# Reset database
db-reset:
	npx prisma migrate reset --force

# Clean build artifacts
clean:
	rm -rf .next
	rm -rf node_modules/.cache
	rm -rf test-results/
	rm -rf playwright-report/

# Unit tests (Jest)
test:
	pnpm test

# E2E tests (Playwright)
test-e2e:
	pnpm test:e2e

# E2E tests with UI (Playwright)
test-e2e-ui:
	pnpm test:e2e:ui

# BDD acceptance tests (Cucumber + Playwright). Gherkin printed in real time (green=pass, red=fail).
# Uses dev server because output: 'standalone' in next.config.js breaks `next start`.
# Filter by story:  make test-acceptance STORY=9.2      (converts to --tags "@story-9-2")
# Filter by feature: make test-acceptance FEATURE=F012  (runs all scenarios in E-012-*.feature)
# Filter by tags:   make test-acceptance TAGS=@FR-RELIST-01  or  TAGS="@story-9-2 and @FR-RELIST-03"
test-acceptance:
	@if [ -n "$(STORY)" ]; then \
		pnpm exec start-server-and-test 'pnpm dev' http://localhost:3000 'pnpm exec cucumber-js --profile acceptance --tags "@story-$(subst .,-,$(STORY))"'; \
	elif [ -n "$(FEATURE)" ]; then \
		EPIC_NUM=$$(echo "$(FEATURE)" | tr -d 'Ff' | sed 's/^0*//'); \
		pnpm exec start-server-and-test 'pnpm dev' http://localhost:3000 "pnpm exec cucumber-js --profile acceptance --tags \"@epic-$$EPIC_NUM\""; \
	elif [ -n "$(TAGS)" ]; then \
		pnpm exec start-server-and-test 'pnpm dev' http://localhost:3000 'pnpm exec cucumber-js --profile acceptance --tags "$(TAGS)"'; \
	else \
		pnpm exec start-server-and-test 'pnpm dev' http://localhost:3000 'pnpm exec cucumber-js --profile acceptance'; \
	fi

# Alias for test-acceptance.
test-ac: test-acceptance

# All tests (unit + BDD + E2E)
test-all:
	pnpm test:all

# Build static export for Firebase Hosting
build-hosting:
	bash scripts/build-hosting.sh

# Deploy to Firebase Hosting (set CHANNEL=preview for preview channel)
deploy-hosting:
	bash scripts/deploy/deploy-hosting.sh

# Pull secrets from GCP Secret Manager into .env (requires gcloud, GCP_PROJECT_ID)
# Usage: make secrets-pull GCP_PROJECT_ID=my-project
secrets-pull:
	@GCP_PROJECT_ID="$(GCP_PROJECT_ID)" bash scripts/secrets/pull-from-gcp.sh
