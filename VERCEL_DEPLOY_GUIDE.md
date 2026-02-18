# 🚀 Flipper.ai Vercel Deployment Guide

**Auth System:** NextAuth.js v5 (Google, GitHub, Email/Password)  
**Database:** Vercel Postgres  
**Hosting:** Vercel Edge Network

---

## 📋 Prerequisites

- GitHub account with `AXOVIA-ASPEN/flipper-ai` repo
- Vercel account (free tier works!)
- 10 minutes ⏱️

---

## 🎯 Step-by-Step Deployment

### Step 1: Generate NextAuth Secret

Run this command locally to generate a secure secret:

```bash
openssl rand -base64 32
```

**Copy the output** - you'll need it in Step 3.

---

### Step 2: Deploy to Vercel

1. **Go to:** https://vercel.com/new
2. **Click:** Import Git Repository
3. **Select:** AXOVIA-ASPEN/flipper-ai
4. **Click:** Import

**Vercel auto-detects Next.js config** ✅ No configuration needed!

---

### Step 3: Add Environment Variables

**Before clicking Deploy**, add these environment variables:

#### Required Variables

Click **Environment Variables** section:

```bash
# Name: NEXTAUTH_SECRET
# Value: [paste the secret from Step 1]

# Name: NEXTAUTH_URL
# Value: https://flipper-ai-[will-be-generated].vercel.app
# (Use your actual deployment URL - you can update this after first deploy)
```

**Note:** You can skip `NEXTAUTH_URL` for now and add it after seeing your deployment URL.

4. **Click:** Deploy ✨

**Deploy time:** ~2-3 minutes ⏱️

---

### Step 4: Create Vercel Postgres Database

**IMPORTANT:** Do this AFTER the first deploy!

1. Go to your project dashboard
2. Click **Storage** tab
3. Click **Create Database**
4. Select **Postgres**
5. Name: `flipper-ai-db`
6. Region: **US East** (or closest to you)
7. Click **Create**

**Vercel automatically adds:**
- ✅ `DATABASE_URL` environment variable
- ✅ `POSTGRES_URL` (with connection pooling)
- ✅ SSL certificates

---

### Step 5: Update NEXTAUTH_URL (If Needed)

After first deploy, you'll have a URL like: `https://flipper-ai-abc123.vercel.app`

1. Go to **Settings** → **Environment Variables**
2. Find `NEXTAUTH_URL`
3. Update to your actual deployment URL
4. Click **Save**

**No need to redeploy** - environment variables update automatically!

---

### Step 6: Run Database Migrations

Now that Vercel Postgres is created, we need to create the tables:

**Option A: Using Vercel Dashboard (Easiest)**

1. Go to **Storage** → `flipper-ai-db`
2. Click **Query** tab
3. You'll manually run SQL later, but for now, use Option B:

**Option B: Using Local Terminal (Recommended)**

```bash
cd projects/flipper-ai

# Copy DATABASE_URL from Vercel dashboard
# Settings → Environment Variables → DATABASE_URL (click to reveal)

# Add to your local .env file
echo "DATABASE_URL=postgresql://..." >> .env.local

# Reset migrations for PostgreSQL
rm -rf prisma/migrations

# Create new migration
npx prisma migrate dev --name init

# Or deploy to production
npx prisma migrate deploy
```

**This creates all tables:** User, Listing, ScraperJob, UserSettings, etc.

---

### Step 7: Verify Deployment ✅

Visit your deployment URL and test:

**Landing Page:**
- ✅ Visit root URL → Landing page loads
- ✅ Click "Get Started" → Redirects to /auth/signup
- ✅ Click "Log In" → Redirects to /auth/login

**Test Signup (Once Database is Set Up):**
- ✅ Go to /auth/signup
- ✅ Enter email, password
- ✅ Click "Create Account"
- ✅ Should redirect to /dashboard

**Check Analytics:**
- ✅ Vercel Dashboard → Analytics tab
- ✅ Should show page views after 30 seconds

---

## 🔐 Optional: Enable Social Login

### Google OAuth Setup

1. **Go to:** https://console.developers.google.com
2. **Create Project** → "Flipper AI"
3. **OAuth consent screen:**
   - User Type: External
   - App name: Flipper.ai
   - Authorized domains: `vercel.app` (and your custom domain if you have one)
4. **Credentials:**
   - Create OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs:
     ```
     https://your-app.vercel.app/api/auth/callback/google
     ```
5. **Copy:**
   - Client ID
   - Client Secret

6. **Add to Vercel:**
   - Settings → Environment Variables
   - Add `GOOGLE_CLIENT_ID`
   - Add `GOOGLE_CLIENT_SECRET`

---

### GitHub OAuth Setup

1. **Go to:** https://github.com/settings/developers
2. **New OAuth App:**
   - Application name: Flipper.ai
   - Homepage URL: `https://your-app.vercel.app`
   - Authorization callback URL:
     ```
     https://your-app.vercel.app/api/auth/callback/github
     ```
3. **Copy:**
   - Client ID
   - Client Secret (Generate new client secret)

4. **Add to Vercel:**
   - Settings → Environment Variables
   - Add `GITHUB_CLIENT_ID`
   - Add `GITHUB_CLIENT_SECRET`

---

## 🎨 Optional: Add Custom Domain

1. **Go to:** Settings → Domains
2. **Add Domain:** `flipper.yourdomain.com` (or any subdomain)
3. **Add DNS Record:**
   - Type: CNAME
   - Name: flipper
   - Value: cname.vercel-dns.com
4. **Wait:** 5-10 minutes for SSL certificate

**Vercel handles SSL automatically!** 🔒

---

## 🔄 Auto-Deploy on Push

**Already configured!** ✅

Every push to `main` branch → Auto-deploys to production

**Preview Deployments:**
- Every PR gets its own preview URL
- Test changes before merging

---

## 📊 Monitor Your App

### Vercel Dashboard
- **Analytics:** Page views, visitors, top pages
- **Logs:** Real-time function logs, errors
- **Speed Insights:** Core Web Vitals, performance

### Database
- **Storage → flipper-ai-db:** Query data, view tables
- **Postgres Dashboard:** Connections, queries, performance

---

## 🐛 Troubleshooting

### "Sign in failed" Error

**Cause:** `NEXTAUTH_SECRET` or `NEXTAUTH_URL` not set

**Fix:**
1. Check Environment Variables in Vercel
2. Ensure `NEXTAUTH_URL` matches your deployment URL exactly
3. Redeploy from Deployments tab

---

### "Database connection failed"

**Cause:** Migrations not run or `DATABASE_URL` incorrect

**Fix:**
```bash
# Check DATABASE_URL in Vercel env vars
# Copy it to local .env.local
# Run migrations
npx prisma migrate deploy
```

---

### "404 Not Found" on Auth Pages

**Cause:** Build failed or files missing

**Fix:**
1. Check Deployments → Build Logs
2. Ensure `/auth/login/page.tsx` exists in repo
3. Redeploy

---

### Analytics Not Showing

**Cause:** Ad blockers or need to wait longer

**Fix:**
- Wait 60 seconds after first visit
- Disable ad blockers
- Navigate between pages

---

## ✅ Post-Deploy Checklist

After deploying, verify:

- [ ] Landing page loads (`/`)
- [ ] Can click "Get Started" → `/auth/signup`
- [ ] Can click "Log In" → `/auth/login`
- [ ] Database created (Storage tab shows `flipper-ai-db`)
- [ ] `DATABASE_URL` env var exists
- [ ] `NEXTAUTH_SECRET` env var exists
- [ ] `NEXTAUTH_URL` matches deployment URL
- [ ] Analytics tracking (see visitor count in dashboard)

---

## 🚀 You're Live!

**Your URLs:**
- **Production:** `https://flipper-ai-[random].vercel.app`
- **Landing:** `/`
- **Sign Up:** `/auth/signup`
- **Login:** `/auth/login`
- **Dashboard:** `/dashboard`
- **Settings:** `/settings`

**Next Steps:**
1. Test signup flow end-to-end
2. Use the product yourself (find your first flip!)
3. Share with 5 friends for feedback
4. Prepare Product Hunt launch

---

**Need help?** Check deployment logs in Vercel dashboard or ask! 🐧
