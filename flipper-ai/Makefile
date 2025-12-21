# Flipper.ai Makefile
# ====================

.PHONY: help install dev preview build start db-migrate db-studio db-reset clean

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
	@echo "  make db-migrate - Run database migrations"
	@echo "  make db-studio  - Open Prisma Studio (database GUI)"
	@echo "  make db-reset   - Reset database (WARNING: deletes all data)"
	@echo "  make clean      - Remove build artifacts"

# Install dependencies
install:
	pnpm install
	npx prisma generate

# Development server
dev:
	pnpm dev

# Preview (alias for dev)
preview: install db-migrate
	@echo "Starting Flipper.ai preview server..."
	@echo "Open http://localhost:3000 in your browser"
	pnpm dev

# Production build
build:
	pnpm build

# Start production server
start:
	pnpm start

# Database migrations
db-migrate:
	npx prisma migrate dev

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
