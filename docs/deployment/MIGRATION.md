# Flipper AI - Vercel to Firebase Migration Guide

## Overview

This guide covers the migration of Flipper AI from Vercel to Firebase, using:
- **Firebase App Hosting** for Next.js frontend
- **Cloud Functions (2nd gen)** for Playwright-based scrapers
- **Firestore** or **Cloud SQL** for database (TBD)

## Prerequisites

1. **Firebase CLI**: `npm install -g firebase-tools`
2. **gcloud CLI**: [Install](https://cloud.google.com/sdk/docs/install)
3. **Firebase project**: `axovia-flipper` (already created)
4. **Authentication**: 
   ```bash
   firebase login
   gcloud auth login
   gcloud config set project axovia-flipper
   ```

## Phase 1: Cloud Functions Setup

### 1.1 Install Dependencies

```bash
cd functions
npm install
```

### 1.2 Configure Environment Variables

Copy environment variables from Vercel to Firebase:

```bash
# Get Vercel env vars
cd ..
vercel env pull .env.vercel

# Set Firebase env vars (example)
firebase functions:config:set \
  openai.api_key="sk-..." \
  ebay.oauth_token="v^1.1#..." \
  database.url="postgresql://..."
```

Or use Secret Manager (recommended for production):

```bash
# Create secrets
echo -n "sk-..." | gcloud secrets create OPENAI_API_KEY --data-file=-
echo -n "v^1.1#..." | gcloud secrets create EBAY_OAUTH_TOKEN --data-file=-

# Grant access to Cloud Functions
gcloud secrets add-iam-policy-binding OPENAI_API_KEY \
  --member="serviceAccount:axovia-flipper@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 1.3 Deploy Cloud Functions

```bash
cd functions
chmod +x deploy.sh
./deploy.sh
```

This deploys:
- ✅ `scrapeCraigslist` (Docker, 2GB RAM)
- ✅ `scrapeOfferup` (Docker, 2GB RAM)
- ✅ `scrapeEbay` (Standard)
- ✅ `scrapeFacebook` (Standard)
- ✅ `scrapeMercari` (Standard)
- ✅ `health` (Health check)

### 1.4 Test Functions

```bash
# Test health endpoint
curl https://us-east1-axovia-flipper.cloudfunctions.net/health

# Test Craigslist scraper
curl -X POST https://us-east1-axovia-flipper.cloudfunctions.net/scrapeCraigslist \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "location": "sarasota",
    "category": "electronics",
    "keywords": "macbook"
  }'
```

## Phase 2: Update Next.js API Routes

### 2.1 Update Environment Variables

Add to `.env.production`:

```env
NEXT_PUBLIC_FUNCTIONS_URL=https://us-east1-axovia-flipper.cloudfunctions.net
NEXT_PUBLIC_FIREBASE_PROJECT_ID=axovia-flipper
```

### 2.2 Replace API Routes

The new routes delegate scraping to Cloud Functions:

```typescript
// Before: Direct Playwright execution in API route
import { chromium } from 'playwright';
const browser = await chromium.launch();
// ... scraping logic

// After: Call Cloud Function
import { scrapeCraigslist } from '@/lib/cloud-functions';
const result = await scrapeCraigslist({ userId, location, category });
```

### 2.3 Migrate Routes

Replace old routes with new cloud-function-based routes:

```bash
# Backup old routes
cd src/app/api/scraper
for dir in */; do
  mv "$dir/route.ts" "$dir/route.old.ts"
  mv "$dir/route.v2.ts" "$dir/route.ts"
done
```

## Phase 3: Database Migration

### Option A: Keep Prisma + Cloud SQL (Recommended)

1. Create Cloud SQL instance:
```bash
gcloud sql instances create flipper-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-east1
```

2. Create database:
```bash
gcloud sql databases create flipper --instance=flipper-db
```

3. Update DATABASE_URL:
```env
DATABASE_URL="postgresql://user:pass@/flipper?host=/cloudsql/axovia-flipper:us-east1:flipper-db"
```

4. Run migrations:
```bash
npx prisma migrate deploy
```

### Option B: Migrate to Firestore

**Note**: This requires significant refactoring. Keep Prisma for now.

## Phase 4: Firebase App Hosting

### 4.1 Build for Production

```bash
npm run build
```

### 4.2 Deploy to App Hosting

```bash
firebase deploy --only hosting
```

**Note**: Firebase App Hosting for Next.js is in beta. You may need to use Cloud Run instead:

```bash
# Build Docker image
docker build -t gcr.io/axovia-flipper/flipper-web .

# Push to Container Registry
docker push gcr.io/axovia-flipper/flipper-web

# Deploy to Cloud Run
gcloud run deploy flipper-web \
  --image gcr.io/axovia-flipper/flipper-web \
  --platform managed \
  --region us-east1 \
  --allow-unauthenticated
```

## Phase 5: Testing & Verification

### 5.1 Smoke Tests

Run the test suite:

```bash
npm run test
npm run test:e2e
```

### 5.2 Manual Testing

1. ✅ Login/Authentication
2. ✅ Run Craigslist scraper
3. ✅ Run eBay scraper
4. ✅ View saved listings
5. ✅ Value estimation works
6. ✅ Image display

### 5.3 Performance Testing

```bash
# Load test Cloud Functions
npm run test:load
```

## Phase 6: DNS & Domain Configuration

### 6.1 Custom Domain (if needed)

```bash
firebase hosting:channel:deploy production --add-domain flipper.axovia.ai
```

### 6.2 Update DNS

Point your domain to Firebase Hosting or Cloud Run.

## Phase 7: Deactivate Vercel

Once Firebase is stable:

1. ✅ Archive Vercel project
2. ✅ Cancel Vercel subscription (if applicable)
3. ✅ Update documentation
4. ✅ Update CI/CD pipelines

## Rollback Plan

If issues arise:

1. Re-enable Vercel deployment
2. Point DNS back to Vercel
3. Debug Firebase issues
4. Retry migration

## Cost Comparison

### Vercel
- **Hobby**: $20/mo (limit: 100GB bandwidth)
- **Pro**: $20/mo per member
- **Function duration**: 10s max (Hobby), 60s (Pro)

### Firebase/GCP
- **Cloud Functions**: ~$0.40/million invocations
- **Cloud Run**: ~$0.24/million requests
- **Cloud SQL**: $7/mo (db-f1-micro)
- **Storage**: $0.026/GB/mo
- **Bandwidth**: $0.12/GB (first 1GB free)

**Estimated cost**: ~$30-50/mo depending on usage

## Monitoring

### Cloud Functions Logs

```bash
# All functions
gcloud functions logs read --region=us-east1

# Specific function
gcloud functions logs read scrapeCraigslist --region=us-east1
```

### Firebase Console

Monitor at: https://console.firebase.google.com/project/axovia-flipper

### Alerts

Set up alerts for:
- Function errors
- High latency
- Resource limits

## Troubleshooting

### Issue: Cloud Function timeout

**Solution**: Increase timeout (max 540s for 2nd gen):

```bash
gcloud functions deploy scrapeCraigslist --timeout=540s
```

### Issue: Playwright browser launch fails

**Solution**: Verify Dockerfile includes all dependencies:

```dockerfile
RUN apt-get install -y libnss3 libatk-bridge2.0-0 ...
```

### Issue: Database connection fails

**Solution**: Check Cloud SQL proxy or connection string:

```bash
gcloud sql connect flipper-db --user=postgres
```

### Issue: CORS errors

**Solution**: Check Cloud Functions CORS headers in `lib/cors.ts`

## Next Steps

- [ ] Set up CI/CD with GitHub Actions
- [ ] Enable Firebase Authentication
- [ ] Configure CDN for static assets
- [ ] Set up monitoring alerts
- [ ] Optimize Cloud Function cold starts
- [ ] Implement request caching

## Support

- **Firebase Docs**: https://firebase.google.com/docs
- **Cloud Functions Docs**: https://cloud.google.com/functions/docs
- **Prisma + Cloud SQL**: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-gcp

---

**Migration Status**: 🚧 In Progress  
**Last Updated**: 2026-02-18  
**Owner**: Axovia AI Team
