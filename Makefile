# Flipper.ai Makefile
# ====================

.PHONY: help install dev preview build start db-migrate db-sync db-studio db-reset clean test test-acceptance test-e2e test-e2e-ui test-all

# Default target
help:
	@echo "Flipper.ai - Marketplace Flipping Tool"
	@echo ""
	@echo "Usage:"
	@echo "  make install    - Install dependencies"
	@echo "  make preview    - Start development server (alias for dev)"
	@echo "  make dev        - Start development server"
	@echo "  make build      - Build for production"
	@echo "  make start      - Start production server"
	@echo "  make db-migrate - Run database migrations (interactive)"
	@echo "  make db-sync    - Sync schema to database (non-interactive)"
	@echo "  make db-studio  - Open Prisma Studio (database GUI)"
	@echo "  make db-reset   - Reset database (WARNING: deletes all data)"
	@echo "  make clean      - Remove build artifacts"
	@echo ""
	@echo "Testing:"
	@echo "  make test       - Run unit tests (Jest)"
	@echo "  make test-acceptance - Run BDD acceptance tests (Cucumber)"
	@echo "  make test-e2e   - Run E2E tests (Playwright)"
	@echo "  make test-e2e-ui - Run E2E tests with UI (Playwright)"
	@echo "  make test-all   - Run all tests (unit + BDD + E2E)"

# Install dependencies
install:
	pnpm install
	npx prisma generate

# Development server
dev:
	pnpm dev

# Preview (alias for dev)
preview: install db-sync
	@echo "Starting Flipper.ai preview server..."
	@echo "Open http://localhost:3000 in your browser"
	pnpm dev

# Production build
build:
	pnpm build

# Start production server
start:
	pnpm start

# Database migrations (interactive - prompts for migration name)
db-migrate:
	npx prisma migrate dev

# Sync schema to database (non-interactive - for development)
db-sync:
	npx prisma migrate deploy
	npx prisma db push

# Open Prisma Studio
db-studio:
	npx prisma studio

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

# BDD acceptance tests (Cucumber)
test-acceptance:
	pnpm test:bdd

# All tests (unit + BDD + E2E)
test-all:
	pnpm test:all
