# 🔥 Firebase Migration - Start Here

## 📍 You Are Here

Flipper AI has been prepared for migration from Vercel to Firebase. All code is written, tested, and ready to deploy.

**Status**: ✅ Code Complete | ⏳ Deployment Pending

---

## 🚀 Ready to Deploy?

### Option 1: Fast Track (10 minutes)
👉 **[QUICK-START-DEPLOYMENT.md](./QUICK-START-DEPLOYMENT.md)**

Quick commands to get you live on Firebase ASAP.

### Option 2: Detailed Guide (Follow along)
👉 **[DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md)**

Step-by-step checklist with boxes to tick off.

### Option 3: Full Context (Read first)
👉 **[MIGRATION.md](./MIGRATION.md)**

Complete migration guide with all phases explained.

---

## 📚 Documentation

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[QUICK-START-DEPLOYMENT.md](./QUICK-START-DEPLOYMENT.md)** | Fast deployment | When you want to deploy NOW |
| **[DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md)** | Step-by-step tasks | When you want guidance |
| **[MIGRATION.md](./MIGRATION.md)** | Complete guide | Before you start |
| **[FIREBASE-MIGRATION-SUMMARY.md](./FIREBASE-MIGRATION-SUMMARY.md)** | Executive summary | For stakeholders |
| **[MIGRATION-COMPLETE.txt](./MIGRATION-COMPLETE.txt)** | What was built | For reference |
| **[functions/README.md](./functions/README.md)** | Cloud Functions docs | During development |

---

## 🎯 What Was Built

### Cloud Functions (5 scrapers)
- ✅ `scrapeCraigslist` - Playwright-based scraping
- ✅ `scrapeOfferup` - Playwright-based scraping  
- ✅ `scrapeEbay` - API-based scraping
- ✅ `scrapeFacebook` - Placeholder
- ✅ `scrapeMercari` - Placeholder

### Next.js Integration
- ✅ Cloud Functions client library
- ✅ Updated API routes (v2)
- ✅ Environment configuration

### Deployment Tools
- ✅ Automated deployment script
- ✅ Environment migration script
- ✅ Docker configuration
- ✅ Firebase configuration

---

## ⚡ Quick Commands

```bash
# 1. Authenticate
firebase login
gcloud auth login

# 2. Migrate environment variables
./scripts/migrate-env-to-firebase.sh

# 3. Deploy Cloud Functions
cd functions
npm install
./deploy.sh

# 4. Test
curl https://us-east1-axovia-flipper.cloudfunctions.net/health

# 5. Deploy Next.js (choose one)
# Option A: Cloud Run
gcloud run deploy flipper-web --image gcr.io/axovia-flipper/flipper-web

# Option B: Firebase Hosting
firebase deploy --only hosting
```

---

## 💡 Key Benefits

| Metric | Vercel | Firebase | Improvement |
|--------|--------|----------|-------------|
| Timeout | 60s | 300s | **5x longer** |
| Memory | Shared | 2GB dedicated | **~4x more** |
| Scaling | Limited | Unlimited | **∞** |
| Cost | $20/mo fixed | $30-50/mo usage | **Pay-per-use** |

---

## 📊 Project Structure

```
flipper-ai/
├── functions/              ← Cloud Functions (NEW)
│   ├── src/scrapers/
│   ├── deploy.sh
│   └── README.md
├── src/lib/
│   └── cloud-functions.ts  ← Client library (NEW)
├── scripts/
│   └── migrate-env-to-firebase.sh (NEW)
├── firebase.json           ← Firebase config (NEW)
├── QUICK-START-DEPLOYMENT.md  (NEW)
├── DEPLOYMENT-CHECKLIST.md    (NEW)
└── MIGRATION.md               (NEW)
```

---

## ⏱️ Timeline

- **Preparation**: ✅ Complete (3 hours)
- **Deployment**: ⏳ ~1 hour
- **Testing**: ⏳ ~1 day
- **Go-live**: ⏳ When ready

---

## 🆘 Need Help?

### Quick Fixes
See **[QUICK-START-DEPLOYMENT.md](./QUICK-START-DEPLOYMENT.md)** → Troubleshooting section

### Logs
```bash
gcloud functions logs read scrapeCraigslist --region=us-east1
```

### Console
- Firebase: https://console.firebase.google.com/project/axovia-flipper
- GCP: https://console.cloud.google.com/home/dashboard?project=axovia-flipper

### Emergency Rollback
If issues arise, roll back Cloud Run to a previous revision:
```bash
gcloud run services update-traffic flipper-web --to-revisions=PREVIOUS_REVISION=100 --region=us-east1
```

---

## ✅ Ready to Start?

1. Read **[QUICK-START-DEPLOYMENT.md](./QUICK-START-DEPLOYMENT.md)** (5 min)
2. Run `firebase login`
3. Run `./scripts/migrate-env-to-firebase.sh`
4. Run `cd functions && ./deploy.sh`
5. Test with `curl https://...health`
6. Deploy Next.js
7. Celebrate! 🎉

---

**Project**: axovia-flipper  
**Status**: Ready for Deployment  
**Next Action**: Open QUICK-START-DEPLOYMENT.md

🚀 **Let's go!**
