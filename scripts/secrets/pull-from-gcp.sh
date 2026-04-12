#!/usr/bin/env bash
# pull-from-gcp.sh — Fetch Flipper AI secrets from GCP Secret Manager and merge into .env.
# Requires: gcloud CLI, GCP_PROJECT_ID (env or first argument).
# See docs/secrets/secretmanager.md for secret names.
#
# ── Secrets stored in GCP Secret Manager ──────────────────────────────────────
#   DATABASE_URL               PostgreSQL connection string (Cloud SQL)
#   AUTH_SECRET                Session encryption secret
#   ENCRYPTION_SECRET          General-purpose encryption key
#   APP_URL                    Canonical app URL (emails, redirects, etc.)
#   FIREBASE_CLIENT_EMAIL      Firebase Admin SDK service account email
#   FIREBASE_PRIVATE_KEY       Firebase Admin SDK private key (PEM)
#   GOOGLE_CLIENT_ID           OAuth — Google
#   GOOGLE_CLIENT_SECRET       OAuth — Google
#   GITHUB_CLIENT_ID           OAuth — GitHub
#   GITHUB_CLIENT_SECRET       OAuth — GitHub
#   FACEBOOK_APP_ID            OAuth — Facebook
#   FACEBOOK_APP_SECRET        OAuth — Facebook
#   FACEBOOK_REDIRECT_URI      OAuth — Facebook callback URL
#   OPENAI_API_KEY             OpenAI LLM API key
#   GOOGLE_API_KEY             Google AI (Gemini) API key
#   GOOGLE_MAPS_API_KEY        Google Maps Directions API key
#   FLIPPER_API_KEYS           Internal API keys (comma-separated)
#   STRIPE_SECRET_KEY          Stripe secret key
#   STRIPE_WEBHOOK_SECRET      Stripe webhook signing secret
#   NEXT_PUBLIC_FIREBASE_API_KEY              Firebase client config
#   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN          Firebase client config
#   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID  Firebase client config
#   NEXT_PUBLIC_FIREBASE_APP_ID               Firebase client config
#   NEXT_PUBLIC_HCAPTCHA_SITE_KEY             hCaptcha site key (public)
#   HCAPTCHA_SECRET_KEY                       hCaptcha server secret
#   RESEND_API_KEY             Resend email API key
#   EMAIL_FROM                 Default From address for outbound email
#   SENTRY_DSN                 Sentry error tracking DSN (server)
#   NEXT_PUBLIC_SENTRY_DSN     Sentry DSN (client bundle)
#   SENTRY_ORG                 Sentry org slug (source map uploads)
#   SENTRY_PROJECT             Sentry project slug
#   SENTRY_AUTH_TOKEN          Sentry auth token (source map uploads)
#   MONITORING_API_KEY         Cloud Scheduler → monitoring endpoint
#   NOTIFICATION_PROCESSOR_API_KEY  Cloud Scheduler → notification endpoint
#   TWILIO_ACCOUNT_SID         Twilio SMS account SID
#   TWILIO_AUTH_TOKEN          Twilio SMS auth token
#   TWILIO_FROM_NUMBER         Twilio sender phone number (E.164)
#   GOOGLE_CALENDAR_CLIENT_ID       Google Calendar OAuth client ID
#   GOOGLE_CALENDAR_CLIENT_SECRET   Google Calendar OAuth client secret
# ──────────────────────────────────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="${ROOT}/.env"
PROJECT_ID="${GCP_PROJECT_ID:-$1}"

# Ordered list of secret names (must match docs/secrets/secretmanager.md)
SECRET_NAMES=(
  DATABASE_URL
  AUTH_SECRET
  ENCRYPTION_SECRET
  APP_URL
  FIREBASE_CLIENT_EMAIL
  FIREBASE_PRIVATE_KEY
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  ENABLE_OAUTH_GOOGLE
  GITHUB_CLIENT_ID
  GITHUB_CLIENT_SECRET
  ENABLE_OAUTH_GITHUB
  FACEBOOK_APP_ID
  FACEBOOK_APP_SECRET
  FACEBOOK_REDIRECT_URI
  ENABLE_OAUTH_FACEBOOK
  OPENAI_API_KEY
  GOOGLE_API_KEY
  GOOGLE_MAPS_API_KEY
  FLIPPER_API_KEYS
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  NEXT_PUBLIC_FIREBASE_API_KEY
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  NEXT_PUBLIC_FIREBASE_APP_ID
  NEXT_PUBLIC_HCAPTCHA_SITE_KEY
  HCAPTCHA_SECRET_KEY
  RESEND_API_KEY
  EMAIL_FROM
  SENTRY_DSN
  NEXT_PUBLIC_SENTRY_DSN
  SENTRY_ORG
  SENTRY_PROJECT
  SENTRY_AUTH_TOKEN
  MONITORING_API_KEY
  NOTIFICATION_PROCESSOR_API_KEY
  TWILIO_ACCOUNT_SID
  TWILIO_AUTH_TOKEN
  TWILIO_FROM_NUMBER
  GOOGLE_CALENDAR_CLIENT_ID
  GOOGLE_CALENDAR_CLIENT_SECRET
)

if [ -z "$PROJECT_ID" ]; then
  echo "Usage: GCP_PROJECT_ID=my-project $0   OR   $0 my-project"
  echo "See docs/secrets/secretmanager.md for secret names."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  if [ -f "${ROOT}/.env.example" ]; then
    cp "${ROOT}/.env.example" "$ENV_FILE"
    echo "Created .env from .env.example"
  else
    touch "$ENV_FILE"
  fi
fi

# Keys already present in .env (simple grep for KEY=)
existing_keys() {
  grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE" 2>/dev/null | cut -d= -f1 || true
}

EXISTING="$(existing_keys)"
added=0

for name in "${SECRET_NAMES[@]}"; do
  if echo "$EXISTING" | grep -qFx "$name"; then
    continue
  fi
  if ! value="$(gcloud secrets versions access latest --project="$PROJECT_ID" --secret="$name" 2>/dev/null)"; then
    continue
  fi
  # Escape for .env: quote if value contains space, #, or newline
  if echo "$value" | grep -qE '[ #"\n]'; then
    value="\"$(echo "$value" | sed 's/\\/\\\\/g; s/"/\\"/g')\""
  fi
  echo "${name}=${value}" >> "$ENV_FILE"
  echo "Added ${name}"
  added=$((added + 1))
  EXISTING="$EXISTING"$'\n'"$name"
done

if [ "$added" -eq 0 ]; then
  echo "No new secrets added (all already in .env or missing in GCP)."
else
  echo "Added $added secret(s) to .env"
fi
