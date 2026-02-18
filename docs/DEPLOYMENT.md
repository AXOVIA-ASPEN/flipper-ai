# Flipper AI - Deployment Guide

## Quick Start

```bash
# Deploy to staging
./scripts/deploy-production.sh staging

# Deploy to production
./scripts/deploy-production.sh production

# Rollback if something goes wrong
./scripts/deploy-production.sh rollback
```

## Prerequisites

### Required Tools
- **Node.js 18+**: `node -v` should show v18 or higher
- **Docker**: For containerization
- **gcloud CLI**: For Google Cloud deployments
- **jq**: For JSON processing (`brew install jq` or `apt install jq`)

### Environment Files

Create environment-specific files:

**`.env.staging`** - Staging environment
```bash
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_URL="https://staging.flipper.axovia.ai"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# AI
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Email
RESEND_API_KEY="re_..."
```

**`.env.production`** - Production environment
```bash
# Same structure as staging, but with production keys
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="https://flipper.axovia.ai"
# ... etc
```

## Deployment Process

The deployment script performs these steps automatically:

### 1. Pre-flight Checks ✓
- Verifies Node.js version (18+)
- Checks environment file exists
- Validates all required environment variables are set
- Checks Git status (warns if uncommitted changes)
- Records current commit and branch

### 2. Tests & Quality ✓
- Installs dependencies (`npm ci`)
- Runs ESLint linting
- Runs TypeScript type checking
- Runs unit tests with coverage
- Verifies ≥95% code coverage (lines & branches)
- Runs integration tests
- Runs E2E tests (Playwright)

### 3. Build ✓
- Cleans previous builds
- Builds Next.js application for production
- Verifies build artifacts created successfully

### 4. Database Migration ✓
- Tests database connectivity
- Runs Prisma migrations (`migrate deploy`)
- Verifies database schema matches code

### 5. Docker Image ✓
- Builds Docker image with production optimizations
- Tags with: `{env}-{commit}-{timestamp}` and `{env}-latest`
- Tests image locally (spins up container, health check, tears down)
- Pushes to Google Container Registry (production only)

### 6. Cloud Run Deployment ✓
- Deploys to Google Cloud Run
- Configuration:
  - **Memory**: 2GB
  - **CPU**: 2 vCPUs
  - **Max instances**: 10
  - **Min instances**: 1 (production), 0 (staging)
  - **Timeout**: 300s
- Retrieves and saves service URL

### 7. Post-Deployment Verification ✓
- Health check (`/api/health`)
- Smoke tests:
  - User registration
  - eBay scraper endpoint
  - Other critical APIs
- Verifies all services responding correctly

### 8. Manifest & Logging ✓
- Creates deployment manifest JSON with:
  - Timestamp
  - Git commit & branch
  - Docker image
  - Test coverage
  - Deployer info
- Saves detailed log file
- Sends notifications (Slack/email if configured)

## Rollback

If something goes wrong:

```bash
./scripts/deploy-production.sh rollback
```

This:
1. Reads the previous Docker image tag
2. Re-deploys that image to Cloud Run
3. Verifies health checks pass
4. Notifies team of rollback

## Notifications

### Slack Notifications

Set webhook URL to get deployment notifications in Slack:

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
./scripts/deploy-production.sh production
```

You'll receive:
- ✅ Success: "Deployment succeeded (production) - Commit: abc123"
- ❌ Failure: "Deployment failed - rolled back to image:tag"

### Email Notifications

```bash
export EMAIL_NOTIFICATION="devops@axovia.ai"
./scripts/deploy-production.sh production
```

You'll receive email with:
- Subject: "Flipper AI: Deployment Success: production"
- Body: Deployment summary + log file path

## Manual Deployment Steps

If you need to deploy manually (not recommended):

### 1. Build & Test Locally
```bash
npm ci
npm run lint
npm run test:coverage
npm run build
```

### 2. Database Migration
```bash
npx prisma migrate deploy
```

### 3. Build Docker Image
```bash
docker build -t gcr.io/axovia-flipper/flipper-web:v1.0.0 .
```

### 4. Test Locally
```bash
docker run -p 3000:3000 --env-file .env.production gcr.io/axovia-flipper/flipper-web:v1.0.0
curl http://localhost:3000/api/health
```

### 5. Push to Registry
```bash
docker push gcr.io/axovia-flipper/flipper-web:v1.0.0
```

### 6. Deploy to Cloud Run
```bash
gcloud run deploy flipper-production \
  --image gcr.io/axovia-flipper/flipper-web:v1.0.0 \
  --platform managed \
  --region us-east1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2
```

### 7. Verify
```bash
SERVICE_URL=$(gcloud run services describe flipper-production --region us-east1 --format='value(status.url)')
curl $SERVICE_URL/api/health
```

## Environments

### Staging
- **URL**: https://staging.flipper.axovia.ai
- **Purpose**: Pre-production testing
- **Database**: Separate staging DB
- **Min instances**: 0 (scales to zero when idle)
- **Deploy frequency**: On every PR merge to `main`

### Production
- **URL**: https://flipper.axovia.ai
- **Purpose**: Live user traffic
- **Database**: Production DB with backups
- **Min instances**: 1 (always warm)
- **Deploy frequency**: Weekly releases (Fridays)

## Monitoring

After deployment, monitor:

### Cloud Run Metrics (GCP Console)
- Request count
- Request latency (p50, p95, p99)
- Error rate
- Instance count
- Memory/CPU usage

### Application Logs
```bash
# View Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=flipper-production" --limit 50

# Stream logs in real-time
gcloud alpha logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=flipper-production"
```

### Sentry (Error Tracking)
- Dashboard: https://sentry.io/organizations/axovia/projects/flipper/
- Real-time errors, performance, releases

### Database Health
```bash
# Check connection pool
npx prisma db execute --file=<(echo "SELECT count(*) FROM pg_stat_activity;")

# Check slow queries
npx prisma db execute --file=<(echo "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;")
```

## Troubleshooting

### Deployment Failed: "Tests failed"
```bash
# Run tests locally to see failure
npm run test:coverage
npm run test:e2e

# Fix issues, commit, re-deploy
git add -A && git commit -m "fix: resolved test failures"
./scripts/deploy-production.sh staging
```

### Deployment Failed: "Docker build failed"
```bash
# Check Dockerfile syntax
docker build -t test-image .

# Check for missing dependencies
npm install
```

### Deployment Failed: "Database migration failed"
```bash
# Check database connectivity
npx prisma db execute --file=<(echo "SELECT 1;")

# Check migration status
npx prisma migrate status

# Force reset (⚠️ STAGING ONLY!)
npx prisma migrate reset --force
```

### Health Check Failing After Deploy
```bash
# Check Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# Check environment variables
gcloud run services describe flipper-production --region us-east1 --format=json | jq '.spec.template.spec.containers[0].env'

# Verify database connection
# (SSH into Cloud Run container and test)
```

### Rollback Not Working
```bash
# Manually rollback to specific revision
gcloud run services update-traffic flipper-production --to-revisions=flipper-production-00042-abc=100

# Or deploy specific image manually
gcloud run deploy flipper-production --image=gcr.io/axovia-flipper/flipper-web:production-abc123-20260215_120000
```

## CI/CD Integration (GitHub Actions)

**`.github/workflows/deploy-staging.yml`**
```yaml
name: Deploy to Staging

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Setup gcloud
        uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: axovia-flipper
      
      - name: Deploy to Staging
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
        run: |
          ./scripts/deploy-production.sh staging
```

## Best Practices

1. **Always deploy to staging first**
   ```bash
   ./scripts/deploy-production.sh staging
   # Test thoroughly
   ./scripts/deploy-production.sh production
   ```

2. **Run migrations in off-peak hours**
   - Schedule production deploys for low-traffic windows
   - Monitor query performance after migrations

3. **Keep deployment logs**
   - All logs saved to `deployments/` directory
   - Review before and after each deploy

4. **Test rollback process regularly**
   - Deploy to staging, rollback, verify
   - Ensures rollback works when you need it

5. **Monitor for 30 minutes post-deploy**
   - Watch error rates in Sentry
   - Check Cloud Run metrics
   - Verify critical user flows work

## Security

- **Never commit** `.env.staging` or `.env.production`
- Use **Secret Manager** for sensitive values in Cloud Run
- Rotate **API keys** quarterly
- Enable **VPC connector** for database security (production)
- Configure **IAM roles** with least privilege

## Cost Optimization

Current production costs: **~$30-50/month**

- Cloud Run: ~$15/mo (with min instances: 1)
- Cloud SQL: ~$20/mo (db-f1-micro)
- Cloud Functions: ~$5/mo (scrapers)
- Storage: <$5/mo

To reduce costs:
- Set `min-instances: 0` in staging (scales to zero)
- Use **Cloud Scheduler** to warm up instances before peak hours
- Enable **auto-pause** for Cloud SQL in staging
- Optimize scraper functions (reduce timeout/memory)

---

**Questions?** Open an issue or contact DevOps team.

**Last Updated**: February 18, 2026
