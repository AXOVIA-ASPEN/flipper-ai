#!/bin/bash
# scripts/validate-deployment.sh
# Pre-deployment validation script for Flipper AI
# Run before deploying to catch missing env vars, DB issues, and config problems
#
# Usage:
#   ./scripts/validate-deployment.sh                # Check current environment
#   ./scripts/validate-deployment.sh --verbose      # Show all checks with values
#   DOTENV_FILE=.env.production ./scripts/validate-deployment.sh

set -euo pipefail

VERBOSE="${1:-}"
DOTENV_FILE="${DOTENV_FILE:-.env}"
ERRORS=()
WARNINGS=()
PASSED=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}🐧 Flipper AI — Pre-Deployment Validation${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Load .env if it exists
if [ -f "$DOTENV_FILE" ]; then
  echo -e "📂 Loading environment from ${DOTENV_FILE}..."
  set -o allexport
  source "$DOTENV_FILE" 2>/dev/null || true
  set +o allexport
fi

# ─────────────────────────────────────────────────────────────
# Helper functions
# ─────────────────────────────────────────────────────────────

check_required() {
  local name="$1"
  local value="${!name:-}"
  if [ -z "$value" ]; then
    ERRORS+=("❌ $name is missing or empty")
    if [ "$VERBOSE" = "--verbose" ]; then
      echo -e "  ${RED}❌ $name — MISSING${NC}"
    fi
  else
    PASSED=$((PASSED + 1))
    if [ "$VERBOSE" = "--verbose" ]; then
      local masked="${value:0:4}****${value: -4}"
      echo -e "  ${GREEN}✅ $name — ${masked}${NC}"
    fi
  fi
}

check_optional() {
  local name="$1"
  local value="${!name:-}"
  if [ -z "$value" ]; then
    WARNINGS+=("⚠️  $name not set (optional but recommended)")
    if [ "$VERBOSE" = "--verbose" ]; then
      echo -e "  ${YELLOW}⚠️  $name — not set (optional)${NC}"
    fi
  else
    PASSED=$((PASSED + 1))
    if [ "$VERBOSE" = "--verbose" ]; then
      local masked="${value:0:4}****"
      echo -e "  ${GREEN}✅ $name — ${masked}${NC}"
    fi
  fi
}

check_url() {
  local name="$1"
  local value="${!name:-}"
  if [ -z "$value" ]; then
    ERRORS+=("❌ $name is missing")
    return
  fi
  if ! echo "$value" | grep -qE '^https?://'; then
    ERRORS+=("❌ $name must start with http:// or https:// (got: $value)")
  else
    PASSED=$((PASSED + 1))
    if [ "$VERBOSE" = "--verbose" ]; then
      echo -e "  ${GREEN}✅ $name — ${value}${NC}"
    fi
  fi
}

# ─────────────────────────────────────────────────────────────
# Section 1: Required Auth
# ─────────────────────────────────────────────────────────────

echo -e "${BLUE}🔐 Auth Configuration${NC}"
check_required "NEXTAUTH_SECRET"
check_url "NEXTAUTH_URL"
check_required "AUTH_SECRET"

# ─────────────────────────────────────────────────────────────
# Section 2: Database
# ─────────────────────────────────────────────────────────────

echo -e "${BLUE}🗄️  Database${NC}"
DB_URL="${DATABASE_URL:-}"
if [ -z "$DB_URL" ]; then
  ERRORS+=("❌ DATABASE_URL is missing — required for production (PostgreSQL)")
elif echo "$DB_URL" | grep -q "sqlite\|file:"; then
  WARNINGS+=("⚠️  DATABASE_URL points to SQLite — switch to PostgreSQL for production")
  if [ "$VERBOSE" = "--verbose" ]; then
    echo -e "  ${YELLOW}⚠️  DATABASE_URL — SQLite (not production-ready)${NC}"
  fi
else
  PASSED=$((PASSED + 1))
  if [ "$VERBOSE" = "--verbose" ]; then
    echo -e "  ${GREEN}✅ DATABASE_URL — PostgreSQL${NC}"
  fi
fi

# Check if Prisma can connect (if DATABASE_URL is set and psql available)
if [ -n "$DB_URL" ] && command -v psql > /dev/null 2>&1; then
  if psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    PASSED=$((PASSED + 1))
    if [ "$VERBOSE" = "--verbose" ]; then
      echo -e "  ${GREEN}✅ DB connection — OK${NC}"
    fi
  else
    ERRORS+=("❌ DB connection failed — cannot reach $DB_URL")
  fi
fi

# ─────────────────────────────────────────────────────────────
# Section 3: AI / LLM
# ─────────────────────────────────────────────────────────────

echo -e "${BLUE}🤖 AI / LLM Keys${NC}"
ANTHROPIC_KEY="${ANTHROPIC_API_KEY:-}"
OPENAI_KEY="${OPENAI_API_KEY:-}"
GOOGLE_KEY="${GOOGLE_API_KEY:-}"

if [ -z "$ANTHROPIC_KEY" ] && [ -z "$OPENAI_KEY" ] && [ -z "$GOOGLE_KEY" ]; then
  ERRORS+=("❌ At least one AI key required: ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_API_KEY")
else
  PASSED=$((PASSED + 1))
  if [ "$VERBOSE" = "--verbose" ]; then
    [ -n "$ANTHROPIC_KEY" ] && echo -e "  ${GREEN}✅ ANTHROPIC_API_KEY — set${NC}"
    [ -n "$OPENAI_KEY" ] && echo -e "  ${GREEN}✅ OPENAI_API_KEY — set${NC}"
    [ -n "$GOOGLE_KEY" ] && echo -e "  ${GREEN}✅ GOOGLE_API_KEY — set${NC}"
  fi
fi

# ─────────────────────────────────────────────────────────────
# Section 4: Optional but recommended
# ─────────────────────────────────────────────────────────────

echo -e "${BLUE}📧 Optional Services${NC}"
check_optional "RESEND_API_KEY"
check_optional "SENTRY_DSN"
check_optional "EBAY_APP_ID"
check_optional "EBAY_CERT_ID"

# ─────────────────────────────────────────────────────────────
# Section 5: Build check
# ─────────────────────────────────────────────────────────────

echo -e "${BLUE}🔨 Build & TypeScript${NC}"
if command -v node > /dev/null 2>&1; then
  NODE_VER=$(node --version)
  MAJOR=$(echo "$NODE_VER" | grep -oE '[0-9]+' | head -1)
  if [ "$MAJOR" -ge 20 ]; then
    PASSED=$((PASSED + 1))
    if [ "$VERBOSE" = "--verbose" ]; then
      echo -e "  ${GREEN}✅ Node.js — $NODE_VER${NC}"
    fi
  else
    ERRORS+=("❌ Node.js $NODE_VER is too old — need 20+")
  fi
fi

if command -v pnpm > /dev/null 2>&1; then
  PASSED=$((PASSED + 1))
  if [ "$VERBOSE" = "--verbose" ]; then
    echo -e "  ${GREEN}✅ pnpm — $(pnpm --version)${NC}"
  fi
else
  WARNINGS+=("⚠️  pnpm not found — install with: npm install -g pnpm")
fi

# ─────────────────────────────────────────────────────────────
# Section 6: File checks
# ─────────────────────────────────────────────────────────────

echo -e "${BLUE}📁 Required Files${NC}"
REQUIRED_FILES=(
  "package.json"
  "next.config.ts"
  "prisma/schema.prisma"
  ".env.example"
)
for f in "${REQUIRED_FILES[@]}"; do
  if [ -f "$f" ]; then
    PASSED=$((PASSED + 1))
    if [ "$VERBOSE" = "--verbose" ]; then
      echo -e "  ${GREEN}✅ $f${NC}"
    fi
  else
    ERRORS+=("❌ Missing required file: $f")
  fi
done

# ─────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 Validation Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

if [ ${#ERRORS[@]} -eq 0 ] && [ ${#WARNINGS[@]} -eq 0 ]; then
  echo -e "${GREEN}✅ ALL CHECKS PASSED — Ready to deploy!${NC}"
  echo -e "   ${PASSED} checks passed, 0 errors, 0 warnings"
elif [ ${#ERRORS[@]} -eq 0 ]; then
  echo -e "${YELLOW}⚠️  READY WITH WARNINGS (${PASSED} passed, ${#WARNINGS[@]} warnings)${NC}"
  echo ""
  for w in "${WARNINGS[@]}"; do
    echo -e "  ${YELLOW}${w}${NC}"
  done
else
  echo -e "${RED}❌ NOT READY — ${#ERRORS[@]} error(s) found${NC}"
  echo ""
  echo -e "${RED}Errors:${NC}"
  for e in "${ERRORS[@]}"; do
    echo -e "  ${RED}${e}${NC}"
  done
  if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}Warnings:${NC}"
    for w in "${WARNINGS[@]}"; do
      echo -e "  ${YELLOW}${w}${NC}"
    done
  fi
  echo ""
  echo -e "  See docs/DEPLOYMENT.md for setup instructions."
  echo -e "  See docs/PRODUCTION_READINESS.md for the full checklist."
  echo ""
  exit 1
fi

echo ""
