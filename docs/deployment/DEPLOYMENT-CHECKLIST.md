# Flipper AI - Firebase Deployment Checklist

## Pre-Deployment

- [ ] **Backup Vercel Database**
  ```bash
  vercel env pull .env.vercel
  pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
  ```

- [ ] **Install Tools**
  - [ ] Firebase CLI: `npm install -g firebase-tools`
  - [ ] gcloud CLI: https://cloud.google.com/sdk/docs/install
  - [ ] Docker (for local testing)

- [ ] **Authenticate**
  ```bash
  firebase login
  gcloud auth login
  gcloud config set project axovia-flipper
  ```

## Phase 1: Cloud Functions (Week 1)

### Day 1-2: Setup
- [ ] **Install function dependencies**
  ```bash
  cd functions
  npm install
  ```

- [ ] **Generate Prisma client**
  ```bash
  npm run prisma:generate
  ```

- [ ] **Test build**
  ```bash
  npm run build
  ```

### Day 2-3: Environment Variables
- [ ] **Migrate secrets to Secret Manager**
  ```bash
  cd ..
  ./scripts/migrate-env-to-firebase.sh
  ```

- [ ] **Verify secrets created**
  ```bash
  gcloud secrets list --project=axovia-flipper
  ```

- [ ] **Set Firebase config**
  ```bash
  firebase functions:config:set \
    ebay.api_url="https://api.ebay.com/buy/browse/v1" \
    ebay.marketplace="EBAY_US"
  ```

### Day 3-4: Deploy Functions
- [ ] **Deploy standard functions first (eBay)**
  ```bash
  cd functions
  firebase deploy --only functions:scrapeEbay,functions:health
  ```

- [ ] **Test eBay function**
  ```bash
  curl https://us-east1-axovia-flipper.cloudfunctions.net/health
  ```

- [ ] **Deploy Docker functions (Craigslist)**
  ```bash
  gcloud functions deploy scrapeCraigslist \
    --gen2 --runtime=nodejs20 --region=us-east1 \
    --source=. --entry-point=scrapeCraigslist \
    --trigger-http --allow-unauthenticated \
    --memory=2GB --timeout=300s
  ```

- [ ] **Test Craigslist function**
  ```bash
  curl -X POST https://us-east1-axovia-flipper.cloudfunctions.net/scrapeCraigslist \
    -H "Content-Type: application/json" \
    -d '{"userId":"test","location":"sarasota","category":"electronics"}'
  ```

- [ ] **Deploy all remaining functions**
  ```bash
  ./deploy.sh
  ```

### Day 4-5: Integration
- [ ] **Update Next.js environment**
  ```bash
  # Add to .env.production
  NEXT_PUBLIC_FUNCTIONS_URL=https://us-east1-axovia-flipper.cloudfunctions.net
  ```

- [ ] **Test locally with Cloud Functions**
  ```bash
  npm run dev
  # Test scraper from UI
  ```

- [ ] **Verify scraper job creation**
  ```bash
  # Check database for scraperJob records
  ```

## Phase 2: Database Migration (Week 1-2)

### Option A: Cloud SQL (Recommended)
- [ ] **Create Cloud SQL instance**
  ```bash
  gcloud sql instances create flipper-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-east1
  ```

- [ ] **Create database**
  ```bash
  gcloud sql databases create flipper --instance=flipper-db
  ```

- [ ] **Set password**
  ```bash
  gcloud sql users set-password postgres \
    --instance=flipper-db \
    --password=SECURE_PASSWORD
  ```

- [ ] **Update DATABASE_URL**
  ```bash
  # Update in Secret Manager
  echo -n "postgresql://user:pass@/flipper?host=/cloudsql/axovia-flipper:us-east1:flipper-db" | \
    gcloud secrets versions add DATABASE_URL --data-file=-
  ```

- [ ] **Run migrations**
  ```bash
  npx prisma migrate deploy
  ```

- [ ] **Verify data migrated**
  ```bash
  gcloud sql connect flipper-db --user=postgres
  \c flipper
  SELECT COUNT(*) FROM "Listing";
  ```

## Phase 3: Next.js Deployment (Week 2)

### Option A: Cloud Run (Recommended)
- [ ] **Build Docker image**
  ```bash
  docker build -t gcr.io/axovia-flipper/flipper-web .
  ```

- [ ] **Test locally**
  ```bash
  docker run -p 3000:3000 \
    --env-file .env.production \
    gcr.io/axovia-flipper/flipper-web
  ```

- [ ] **Push to Container Registry**
  ```bash
  docker push gcr.io/axovia-flipper/flipper-web
  ```

- [ ] **Deploy to Cloud Run**
  ```bash
  gcloud run deploy flipper-web \
    --image gcr.io/axovia-flipper/flipper-web \
    --platform managed \
    --region us-east1 \
    --allow-unauthenticated \
    --memory 2Gi \
    --cpu 2 \
    --max-instances 10 \
    --set-env-vars="NEXT_PUBLIC_FUNCTIONS_URL=https://us-east1-axovia-flipper.cloudfunctions.net"
  ```

- [ ] **Get Cloud Run URL**
  ```bash
  gcloud run services describe flipper-web --region us-east1 --format='value(status.url)'
  ```

### Option B: Firebase Hosting (Alternative)
- [ ] **Build production**
  ```bash
  npm run build
  ```

- [ ] **Deploy hosting**
  ```bash
  firebase deploy --only hosting
  ```

## Phase 4: Testing (Week 2-3)

### Smoke Tests
- [ ] **User authentication**
  - [ ] Login works
  - [ ] Session persists
  - [ ] Logout works

- [ ] **Scraper functionality**
  - [ ] Craigslist scraper runs
  - [ ] eBay scraper runs
  - [ ] OfferUp scraper runs
  - [ ] Results save to database
  - [ ] Job status updates

- [ ] **Value estimation**
  - [ ] Algorithm runs
  - [ ] Scores calculated
  - [ ] Comparables generated

- [ ] **UI functionality**
  - [ ] Listings display
  - [ ] Filters work
  - [ ] Images load
  - [ ] Navigation works

### Load Tests
- [ ] **Run load tests**
  ```bash
  npm run test:load
  ```

- [ ] **Monitor performance**
  - [ ] Check Cloud Functions logs
  - [ ] Review error rates
  - [ ] Verify latency acceptable

### E2E Tests
- [ ] **Run Playwright tests**
  ```bash
  npm run test:e2e
  ```

- [ ] **Fix any failures**

## Phase 5: DNS & Domain (Week 3)

- [ ] **Point domain to Cloud Run**
  ```bash
  gcloud run domain-mappings create \
    --service flipper-web \
    --domain flipper.axovia.ai \
    --region us-east1
  ```

- [ ] **Update DNS records**
  - [ ] Add CNAME or A records
  - [ ] Verify SSL certificate issued

- [ ] **Test production URL**
  ```bash
  curl https://flipper.axovia.ai/api/health
  ```

## Phase 6: Monitoring & Alerts (Week 3)

- [ ] **Set up Cloud Monitoring alerts**
  - [ ] Function error rate > 5%
  - [ ] Function latency > 30s
  - [ ] Cloud Run crashes

- [ ] **Set up logging**
  ```bash
  gcloud logging sinks create flipper-errors \
    bigquery.googleapis.com/projects/axovia-flipper/datasets/logs \
    --log-filter='severity>=ERROR'
  ```

- [ ] **Create dashboard**
  - [ ] Function invocations
  - [ ] Error rates
  - [ ] Database connections
  - [ ] Response times

## Phase 7: Cutover (Week 3-4)

- [ ] **Final data sync**
  ```bash
  # Export from Vercel DB
  pg_dump $VERCEL_DATABASE_URL > final-sync.sql
  
  # Import to Cloud SQL
  gcloud sql import sql flipper-db gs://backup-bucket/final-sync.sql
  ```

- [ ] **Update all DNS to point to Firebase/Cloud Run**

- [ ] **Monitor for 24 hours**
  - [ ] Check error logs
  - [ ] Verify functionality
  - [ ] Monitor performance

- [ ] **Archive Vercel project**
  ```bash
  vercel projects remove flipper-ai
  ```

## Post-Migration

- [ ] **Update documentation**
  - [ ] README.md
  - [ ] CONTRIBUTING.md
  - [ ] API docs

- [ ] **Update CI/CD**
  - [ ] GitHub Actions for Cloud Functions
  - [ ] GitHub Actions for Cloud Run

- [ ] **Team training**
  - [ ] Firebase Console walkthrough
  - [ ] Cloud Functions debugging
  - [ ] gcloud CLI basics

- [ ] **Cost review**
  - [ ] Compare actual vs estimated costs
  - [ ] Optimize resource allocation
  - [ ] Set up budget alerts

## Rollback Plan

If critical issues occur:

1. [ ] **Re-point DNS to Vercel**
2. [ ] **Investigate Firebase issues**
3. [ ] **Fix and re-test**
4. [ ] **Retry cutover**

## Success Criteria

- ✅ All scrapers functional
- ✅ < 1% error rate
- ✅ Response time < 5s (p95)
- ✅ Zero downtime during cutover
- ✅ Cost within budget ($30-50/mo)

## Timeline

- **Week 1**: Cloud Functions + Database
- **Week 2**: Next.js deployment + Testing
- **Week 3**: DNS + Monitoring + Cutover
- **Week 4**: Optimization + Documentation

**Total Duration**: 3-4 weeks  
**Go-Live Target**: [Set date]

---

**Status**: 🚧 In Progress  
**Last Updated**: 2026-02-18  
**Owner**: [Your name]
