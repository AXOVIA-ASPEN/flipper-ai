#!/usr/bin/env bash
#
# scripts/deploy/check-secrets.sh
#
# Pre-deploy gate: verifies that every required secret exists in GCP Secret
# Manager before allowing a production Cloud Run deploy. Call this from CI
# (e.g. .github/workflows/deploy-firebase.yml) and from local pre-deploy.
#
# Usage:
#   ./scripts/deploy/check-secrets.sh                 # check production
#   ENV=staging ./scripts/deploy/check-secrets.sh     # check staging
#   PROJECT=my-other-project ./scripts/deploy/check-secrets.sh
#
# Exits 0 if all required secrets are present, non-zero otherwise.
# Does NOT print secret values — just presence.

set -euo pipefail

# ---- Configuration --------------------------------------------------------

PROJECT="${PROJECT:-axovia-flipper}"
ENV="${ENV:-prod}"
PREFIX="$(echo "$ENV" | tr '[:lower:]' '[:upper:]')"

# Required secrets — fail closed if any are missing
REQUIRED_SECRETS=(
  # Database
  "${PREFIX}_DB_URL"
  "${PREFIX}_DB_DIRECT_URL"

  # Auth & sessions
  "${PREFIX}_ENCRYPTION_SECRET"
  "${PREFIX}_FIREBASE_CLIENT_EMAIL"
  "${PREFIX}_FIREBASE_PRIVATE_KEY"
  "${PREFIX}_HCAPTCHA_SECRET"
  "${PREFIX}_HCAPTCHA_SITE_KEY"

  # AI providers — at least one is required, but we list all and check separately below
  # (skipped here; checked in the AI section)

  # Stripe billing
  "${PREFIX}_STRIPE_SECRET_KEY"
  "${PREFIX}_STRIPE_PUBLISHABLE_KEY"
  "${PREFIX}_STRIPE_WEBHOOK_SECRET"
  "${PREFIX}_STRIPE_PRICE_ID_FLIPPER"
  "${PREFIX}_STRIPE_PRICE_ID_PRO"

  # Email
  "${PREFIX}_RESEND_API_KEY"
  "${PREFIX}_RESEND_FROM_DOMAIN"

  # Observability
  "${PREFIX}_SENTRY_DSN"

  # App-level config
  "${PREFIX}_APP_URL"
  "${PREFIX}_ALLOWED_ORIGINS"
)

# At least one AI provider must be configured
AI_PROVIDER_SECRETS=(
  "${PREFIX}_GOOGLE_API_KEY"
  "${PREFIX}_GROQ_API_KEY"
  "${PREFIX}_OPENAI_API_KEY"
  "${PREFIX}_ANTHROPIC_API_KEY"
)

# Optional secrets — warn if missing but don't fail
OPTIONAL_SECRETS=(
  "${PREFIX}_GOOGLE_CLIENT_ID"
  "${PREFIX}_GOOGLE_CLIENT_SECRET"
  "${PREFIX}_GITHUB_CLIENT_ID"
  "${PREFIX}_GITHUB_CLIENT_SECRET"
  "${PREFIX}_FACEBOOK_APP_ID"
  "${PREFIX}_FACEBOOK_APP_SECRET"
  "${PREFIX}_TWILIO_ACCOUNT_SID"
  "${PREFIX}_TWILIO_AUTH_TOKEN"
  "${PREFIX}_TWILIO_PHONE_NUMBER"
  "${PREFIX}_FCM_SERVER_KEY"
  "${PREFIX}_EBAY_CLIENT_ID"
  "${PREFIX}_EBAY_CLIENT_SECRET"
  "${PREFIX}_EBAY_OAUTH_TOKEN"
  "${PREFIX}_GOOGLE_MAPS_API_KEY"
  "${PREFIX}_STRIPE_PRICE_ID_LIFETIME_FOUNDER"
  "${PREFIX}_STRIPE_PRICE_ID_FLIPPER_ANNUAL"
  "${PREFIX}_STRIPE_PRICE_ID_PRO_ANNUAL"
)

# ---- Helpers --------------------------------------------------------------

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

secret_exists() {
  gcloud secrets describe "$1" --project="$PROJECT" &>/dev/null
}

# ---- Pre-flight -----------------------------------------------------------

if ! command -v gcloud &>/dev/null; then
  echo -e "${RED}❌ gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install${NC}"
  exit 2
fi

if ! gcloud auth print-access-token &>/dev/null; then
  echo -e "${RED}❌ Not authenticated to gcloud. Run: gcloud auth login${NC}"
  exit 2
fi

CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT" ]; then
  echo -e "${YELLOW}⚠️  Active gcloud project is '$CURRENT_PROJECT', this script targets '$PROJECT'.${NC}"
  echo "   Continuing with --project=$PROJECT, but consider: gcloud config set project $PROJECT"
fi

echo "─────────────────────────────────────────────────────────────"
echo "  Secret Manager pre-deploy check"
echo "  Project: $PROJECT"
echo "  Environment: $ENV (prefix: ${PREFIX}_)"
echo "─────────────────────────────────────────────────────────────"
echo

# ---- Required secrets -----------------------------------------------------

echo "Required secrets:"
MISSING_REQUIRED=0
for s in "${REQUIRED_SECRETS[@]}"; do
  if secret_exists "$s"; then
    echo -e "  ${GREEN}✓${NC} $s"
  else
    echo -e "  ${RED}✗ $s${NC}"
    MISSING_REQUIRED=$((MISSING_REQUIRED + 1))
  fi
done
echo

# ---- AI provider secrets (at least one) -----------------------------------

echo "AI providers (at least one required):"
PRESENT_AI=0
for s in "${AI_PROVIDER_SECRETS[@]}"; do
  if secret_exists "$s"; then
    echo -e "  ${GREEN}✓${NC} $s"
    PRESENT_AI=$((PRESENT_AI + 1))
  else
    echo -e "  ${YELLOW}-${NC} $s (not configured)"
  fi
done
echo

# ---- Optional secrets -----------------------------------------------------

echo "Optional secrets:"
MISSING_OPTIONAL=0
for s in "${OPTIONAL_SECRETS[@]}"; do
  if secret_exists "$s"; then
    echo -e "  ${GREEN}✓${NC} $s"
  else
    echo -e "  ${YELLOW}-${NC} $s (not configured — feature may be disabled)"
    MISSING_OPTIONAL=$((MISSING_OPTIONAL + 1))
  fi
done
echo

# ---- Stripe live-mode sanity check ----------------------------------------

if [ "$ENV" = "prod" ] && secret_exists "${PREFIX}_STRIPE_SECRET_KEY"; then
  STRIPE_KEY_PREFIX=$(gcloud secrets versions access latest \
    --secret="${PREFIX}_STRIPE_SECRET_KEY" \
    --project="$PROJECT" 2>/dev/null | head -c 8)

  if [[ "$STRIPE_KEY_PREFIX" == "sk_test_" ]]; then
    echo -e "${RED}❌ DANGER: ${PREFIX}_STRIPE_SECRET_KEY starts with 'sk_test_' but ENV=prod.${NC}"
    echo -e "${RED}   You're about to deploy production with a Stripe TEST key.${NC}"
    echo -e "${RED}   Rotate to a live key (sk_live_…) before continuing.${NC}"
    MISSING_REQUIRED=$((MISSING_REQUIRED + 1))
  elif [[ "$STRIPE_KEY_PREFIX" == "sk_live_" ]]; then
    echo -e "${GREEN}✓ Stripe key is live mode (sk_live_…)${NC}"
  else
    echo -e "${YELLOW}⚠️  Stripe key prefix is unexpected: '$STRIPE_KEY_PREFIX'${NC}"
  fi
  echo
fi

# ---- Summary --------------------------------------------------------------

echo "─────────────────────────────────────────────────────────────"
if [ $MISSING_REQUIRED -gt 0 ]; then
  echo -e "${RED}❌ FAIL: $MISSING_REQUIRED required secrets missing.${NC}"
  echo -e "${RED}   DO NOT DEPLOY until resolved.${NC}"
  echo "   See docs/launch/gcp-secret-manager-checklist.md for full list."
  exit 1
fi

if [ $PRESENT_AI -eq 0 ]; then
  echo -e "${RED}❌ FAIL: No AI provider configured. Set at least one:${NC}"
  printf '   - %s\n' "${AI_PROVIDER_SECRETS[@]}"
  exit 1
fi

if [ $MISSING_OPTIONAL -gt 0 ]; then
  echo -e "${YELLOW}⚠️  $MISSING_OPTIONAL optional secrets missing — affected features will be disabled.${NC}"
fi

echo -e "${GREEN}✅ All required secrets present. Safe to deploy.${NC}"
echo "─────────────────────────────────────────────────────────────"
exit 0
