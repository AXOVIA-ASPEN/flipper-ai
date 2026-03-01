#!/usr/bin/env bash
# pull-from-gcp.sh — Fetch Flipper AI secrets from GCP Secret Manager and merge into .env.
# Requires: gcloud CLI, GCP_PROJECT_ID (env or first argument).
# See docs/secrets/secretmanager.md for secret names.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="${ROOT}/.env"
PROJECT_ID="${GCP_PROJECT_ID:-$1}"

# Ordered list of secret names (must match docs/secrets/secretmanager.md)
SECRET_NAMES=(
  DATABASE_URL
  AUTH_SECRET
  NEXTAUTH_URL
  ENCRYPTION_SECRET
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
  FLIPPER_API_KEYS
  NEXT_PUBLIC_HCAPTCHA_SITE_KEY
  HCAPTCHA_SECRET_KEY
  RESEND_API_KEY
  EMAIL_FROM
  APP_URL
  SENTRY_DSN
  NEXT_PUBLIC_SENTRY_DSN
  SENTRY_ORG
  SENTRY_PROJECT
  SENTRY_AUTH_TOKEN
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
