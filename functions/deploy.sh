#!/bin/bash
# Deploy script for Flipper AI Cloud Functions

set -e

echo "🚀 Deploying Flipper AI Cloud Functions to Firebase"
echo "=================================================="

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if gcloud is installed (for Docker functions)
if ! command -v gcloud &> /dev/null; then
    echo "⚠️  gcloud CLI not found. Docker functions will not be deployed."
    echo "   Install it from: https://cloud.google.com/sdk/docs/install"
    SKIP_DOCKER=true
fi

# Set project
export GCP_PROJECT_ID=axovia-flipper
echo "📦 Using project: $GCP_PROJECT_ID"

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npm run prisma:generate

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Deploy standard Cloud Functions (eBay, Facebook, Mercari)
echo "☁️  Deploying standard Cloud Functions..."
firebase deploy --only functions:scrapeEbay,functions:scrapeFacebook,functions:scrapeMercari,functions:health --project=$GCP_PROJECT_ID

# Deploy Docker-based Cloud Functions (Craigslist, OfferUp)
if [ "$SKIP_DOCKER" != "true" ]; then
    echo "🐳 Deploying Docker-based Cloud Functions..."
    
    echo "  → Deploying scrapeCraigslist..."
    gcloud functions deploy scrapeCraigslist \
        --gen2 \
        --runtime=nodejs20 \
        --region=us-east1 \
        --source=. \
        --entry-point=scrapeCraigslist \
        --trigger-http \
        --allow-unauthenticated \
        --memory=2GB \
        --timeout=300s \
        --set-env-vars="DATABASE_URL=${DATABASE_URL}" \
        --docker-registry=artifact-registry \
        --project=$GCP_PROJECT_ID
    
    echo "  → Deploying scrapeOfferup..."
    gcloud functions deploy scrapeOfferup \
        --gen2 \
        --runtime=nodejs20 \
        --region=us-east1 \
        --source=. \
        --entry-point=scrapeOfferup \
        --trigger-http \
        --allow-unauthenticated \
        --memory=2GB \
        --timeout=300s \
        --set-env-vars="DATABASE_URL=${DATABASE_URL}" \
        --docker-registry=artifact-registry \
        --project=$GCP_PROJECT_ID
else
    echo "⚠️  Skipping Docker functions deployment (gcloud not installed)"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Function URLs:"
echo "  Health: https://us-east1-$GCP_PROJECT_ID.cloudfunctions.net/health"
echo "  Craigslist: https://us-east1-$GCP_PROJECT_ID.cloudfunctions.net/scrapeCraigslist"
echo "  OfferUp: https://us-east1-$GCP_PROJECT_ID.cloudfunctions.net/scrapeOfferup"
echo "  eBay: https://us-east1-$GCP_PROJECT_ID.cloudfunctions.net/scrapeEbay"
echo "  Facebook: https://us-east1-$GCP_PROJECT_ID.cloudfunctions.net/scrapeFacebook"
echo "  Mercari: https://us-east1-$GCP_PROJECT_ID.cloudfunctions.net/scrapeMercari"
echo ""
