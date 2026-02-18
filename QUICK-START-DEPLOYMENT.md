# Flipper AI - Quick Start Deployment Guide

**Ready to deploy?** Follow these steps to go from zero to production.

---

## ⚡ Fast Track (10 minutes)

### 1. Prerequisites Check

```bash
# Check tools installed
firebase --version  # Should be 13.0.0+
gcloud --version    # Should show SDK 400.0.0+
node --version      # Should be 20.x
docker --version    # Should be 20.x+ (optional, for local testing)

# If missing, install:
npm install -g firebase-tools
# gcloud: https://cloud.google.com/sdk/docs/install
```

### 2. Authenticate

```bash
# Login to Firebase
firebase login

# Login to Google Cloud
gcloud auth login

# Set project
gcloud config set project axovia-flipper
```

### 3. Migrate Environment Variables

```bash
# Pull from Vercel (if still connected)
vercel env pull .env

# OR manually edit .env with your variables

# Migrate to Firebase
chmod +x scripts/migrate-env-to-firebase.sh
./scripts/migrate-env-to-firebase.sh
```

### 4. Deploy Cloud Functions

```bash
cd functions

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Build
npm run build

# Deploy everything
chmod +x deploy.sh
./deploy.sh
```

**Wait ~5-10 minutes for deployment...**

### 5. Verify Deployment

```bash
# Test health endpoint
curl https://us-east1-axovia-flipper.cloudfunctions.net/health

# Test Craigslist scraper
curl -X POST https://us-east1-axovia-flipper.cloudfunctions.net/scrapeCraigslist \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "location": "sarasota",
    "category": "electronics",
    "keywords": "macbook"
  }'
```

✅ **If you get JSON responses, you're good!**

### 6. Update Next.js

```bash
cd ..  # Back to root

# Add to .env.production
echo "NEXT_PUBLIC_FUNCTIONS_URL=https://us-east1-axovia-flipper.cloudfunctions.net" >> .env.production

# Replace old API routes (creates backups)
for dir in src/app/api/scraper/*/; do
  [ -f "$dir/route.v2.ts" ] && mv "$dir/route.ts" "$dir/route.old.ts" && mv "$dir/route.v2.ts" "$dir/route.ts"
done
```

### 7. Deploy Next.js (Choose One)

#### Option A: Cloud Run (Recommended)

```bash
# Build Docker image
docker build -t gcr.io/axovia-flipper/flipper-web .

# Push to GCR
docker push gcr.io/axovia-flipper/flipper-web

# Deploy
gcloud run deploy flipper-web \
  --image gcr.io/axovia-flipper/flipper-web \
  --platform managed \
  --region us-east1 \
  --allow-unauthenticated
```

#### Option B: Firebase Hosting

```bash
# Build
npm run build

# Deploy
firebase deploy --only hosting
```

### 8. Test Everything

```bash
# Get your deployment URL
gcloud run services describe flipper-web --region us-east1 --format='value(status.url)'
# OR: https://axovia-flipper.web.app (if using Hosting)

# Visit in browser and test:
# - Login
# - Run a scraper
# - View results
```

✅ **Done! You're live on Firebase!**

---

## 🔧 Troubleshooting Quick Fixes

### "Firebase login failed"
```bash
firebase logout
firebase login --reauth
```

### "gcloud not authenticated"
```bash
gcloud auth application-default login
```

### "Function deployment timeout"
```bash
# Increase timeout
gcloud functions deploy scrapeCraigslist --timeout=540s
```

### "Prisma client not found"
```bash
cd functions
npm run prisma:generate
npm run build
```

### "Database connection failed"
```bash
# Check DATABASE_URL secret
gcloud secrets versions access latest --secret=DATABASE_URL

# Verify Cloud SQL is running
gcloud sql instances list
```

### "CORS errors in browser"
```bash
# Check function logs
gcloud functions logs read scrapeCraigslist --region=us-east1 --limit=50
```

---

## 📊 Post-Deployment Checklist

- [ ] Health endpoint returns 200 OK
- [ ] At least one scraper successfully returns data
- [ ] Database receives scraper jobs
- [ ] Next.js site loads
- [ ] Can login and see listings
- [ ] No errors in Cloud Logs

---

## 🚨 Emergency Rollback

If something breaks:

```bash
# Re-point DNS to Vercel (if you changed it)
# OR: Revert Next.js routes
for dir in src/app/api/scraper/*/; do
  [ -f "$dir/route.old.ts" ] && mv "$dir/route.ts" "$dir/route.v2.ts" && mv "$dir/route.old.ts" "$dir/route.ts"
done

# Redeploy to Vercel
vercel --prod
```

---

## 📈 Monitoring

### View Logs
```bash
# All functions
gcloud functions logs read --region=us-east1 --limit=100

# Specific function
gcloud functions logs read scrapeCraigslist --region=us-east1

# Follow live
gcloud functions logs read scrapeCraigslist --region=us-east1 --follow
```

### Performance Dashboard
1. Go to https://console.cloud.google.com/functions?project=axovia-flipper
2. Click on each function
3. View: Metrics, Logs, Testing

### Set Up Alerts (Optional but recommended)
```bash
# Error rate alert
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="Flipper Functions Errors" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=60s
```

---

## 💡 Tips for Success

1. **Test locally first**: Use Firebase emulators before deploying
   ```bash
   cd functions
   npm run serve
   ```

2. **Deploy incrementally**: Start with one function, verify, then deploy all

3. **Monitor closely**: Check logs every hour for first day

4. **Keep Vercel alive**: Don't delete Vercel project for 1 week (safety net)

5. **Budget alerts**: Set up billing alerts at $25, $50, $100
   ```bash
   gcloud billing budgets create --billing-account=YOUR_ACCOUNT \
     --display-name="Flipper Budget" --budget-amount=50USD
   ```

---

## 🎯 Success Criteria

✅ **You're successful when:**
- All scrapers work via Cloud Functions
- Response times < 5s (p95)
- Error rate < 1%
- Cost stays under $50/mo
- Team can deploy updates independently

---

## 📞 Get Help

- **Firebase Support**: https://firebase.google.com/support
- **GCP Console**: https://console.cloud.google.com
- **Stack Overflow**: Tag with `firebase`, `google-cloud-functions`

**Stuck?** Check:
1. Cloud Logs: https://console.cloud.google.com/logs?project=axovia-flipper
2. Function details: https://console.cloud.google.com/functions?project=axovia-flipper
3. Billing: https://console.cloud.google.com/billing?project=axovia-flipper

---

## ⏱️ Estimated Timeline

- **Setup & Auth**: 5 minutes
- **Environment Migration**: 10 minutes
- **Function Deployment**: 15 minutes
- **Testing**: 10 minutes
- **Next.js Deployment**: 10 minutes
- **Verification**: 10 minutes

**Total**: ~1 hour first time, ~15 minutes for updates

---

**Let's go! 🚀**

Start with step 1 and work your way down. You got this!
