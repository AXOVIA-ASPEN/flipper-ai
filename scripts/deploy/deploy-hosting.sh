#!/usr/bin/env bash
set -euo pipefail

# Deploy static export to Firebase Hosting
# Builds the out/ directory and deploys to Firebase Hosting CDN

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
PROJECT="axovia-flipper"

cd "$ROOT_DIR"

# Verify Firebase CLI is available
command -v firebase >/dev/null 2>&1 || { echo "❌ Firebase CLI not found. Install with: npm install -g firebase-tools"; exit 1; }

echo "🔨 Building static export for Firebase Hosting..."
bash scripts/build-hosting.sh

echo ""
echo "🚀 Deploying to Firebase Hosting..."

# Support preview channel deployment via CHANNEL env var
CHANNEL="${CHANNEL:-}"

if [ -n "$CHANNEL" ]; then
  echo "   Deploying to preview channel: $CHANNEL"
  firebase hosting:channel:deploy "$CHANNEL" --project "$PROJECT"
else
  echo "   Deploying to production"
  firebase deploy --only hosting --project "$PROJECT"
fi

echo ""
echo "✅ Firebase Hosting deployment complete"

# Verify deployment
HOSTING_URL="https://${PROJECT}.web.app"
echo "🔍 Verifying deployment at ${HOSTING_URL}..."

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HOSTING_URL" || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Deployment verified — ${HOSTING_URL} returned HTTP ${HTTP_STATUS}"
else
  echo "⚠️  Deployment verification returned HTTP ${HTTP_STATUS} — check Firebase Console"
fi
