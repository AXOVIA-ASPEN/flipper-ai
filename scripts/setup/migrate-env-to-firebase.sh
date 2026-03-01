#!/bin/bash
# Migrate environment variables from Vercel to Firebase

set -e

echo "🔐 Migrating Environment Variables from Vercel to Firebase"
echo "=========================================================="

PROJECT_ID="axovia-flipper"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    echo "   Run: vercel env pull .env"
    exit 1
fi

# Source the .env file
set -a
source .env
set +a

echo "📦 Project: $PROJECT_ID"
echo ""

# Function to create secret in Secret Manager
create_secret() {
    local name=$1
    local value=$2
    
    if [ -z "$value" ]; then
        echo "  ⚠️  Skipping $name (empty value)"
        return
    fi
    
    echo "  → Creating secret: $name"
    
    # Delete existing secret if it exists
    gcloud secrets delete "$name" --project="$PROJECT_ID" --quiet 2>/dev/null || true
    
    # Create new secret
    echo -n "$value" | gcloud secrets create "$name" \
        --data-file=- \
        --project="$PROJECT_ID" \
        --replication-policy="automatic"
    
    # Grant access to App Engine default service account
    gcloud secrets add-iam-policy-binding "$name" \
        --project="$PROJECT_ID" \
        --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" \
        --role="roles/secretmanager.secretAccessor" \
        --quiet
}

# Migrate critical secrets to Secret Manager
echo "📝 Migrating secrets to Google Secret Manager..."
echo ""

create_secret "OPENAI_API_KEY" "$OPENAI_API_KEY"
create_secret "ANTHROPIC_API_KEY" "$ANTHROPIC_API_KEY"
create_secret "EBAY_OAUTH_TOKEN" "$EBAY_OAUTH_TOKEN"
create_secret "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"
create_secret "DATABASE_URL" "$DATABASE_URL"
create_secret "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY"
create_secret "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"

echo ""
echo "📋 Creating .env.firebase for deployment..."

cat > .env.firebase << EOF
# Firebase Environment Variables
# Generated: $(date)

# Firebase Config (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

# GCP Project
GCP_PROJECT_ID=$PROJECT_ID

# Cloud Functions URL
NEXT_PUBLIC_FUNCTIONS_URL=https://us-east1-${PROJECT_ID}.cloudfunctions.net

# Auth (NextAuth)
NEXTAUTH_URL=https://${PROJECT_ID}.web.app

# Secrets (reference Secret Manager)
# These are accessed via Secret Manager, not environment variables
# OPENAI_API_KEY - stored in Secret Manager
# ANTHROPIC_API_KEY - stored in Secret Manager
# EBAY_OAUTH_TOKEN - stored in Secret Manager
# NEXTAUTH_SECRET - stored in Secret Manager
# DATABASE_URL - stored in Secret Manager
# STRIPE_SECRET_KEY - stored in Secret Manager
# STRIPE_WEBHOOK_SECRET - stored in Secret Manager

# Public API Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# eBay Config
EBAY_BROWSE_API_BASE_URL=$EBAY_BROWSE_API_BASE_URL
EBAY_MARKETPLACE_ID=$EBAY_MARKETPLACE_ID

# Email (Resend)
RESEND_API_KEY=$RESEND_API_KEY
RESEND_FROM_EMAIL=$RESEND_FROM_EMAIL
EOF

echo ""
echo "✅ Migration complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Review .env.firebase"
echo "   2. Set up Cloud Functions to use Secret Manager:"
echo "      firebase functions:secrets:set OPENAI_API_KEY"
echo "   3. Deploy functions: cd functions && ./deploy.sh"
echo ""
echo "🔗 View secrets: https://console.cloud.google.com/security/secret-manager?project=$PROJECT_ID"
echo ""
