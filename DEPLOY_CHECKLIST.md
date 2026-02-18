# 🚀 Flipper.ai Deployment Checklist

**Status:** ✅ Ready to Deploy to Vercel!

---

## ✅ Pre-Deploy Verification

- ✅ **Build succeeds** (npm run build passes)
- ✅ **Vercel Analytics installed**
- ✅ **Landing page ready** (with auth CTAs)
- ✅ **Auth pages created** (/auth/login, /auth/signup)
- ✅ **Go-to-market strategy documented**
- ✅ **Latest changes pushed to main**

---

## 🔥 Deploy to Vercel (2 Methods)

### Method 1: Vercel Dashboard (Recommended)

1. **Go to:** https://vercel.com/new
2. **Click:** Import Git Repository
3. **Select:** AXOVIA-ASPEN/flipper-ai
4. **Configure:**
   - Framework Preset: Next.js ✅ (auto-detected)
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. **Environment Variables:** Skip for now (add later)
6. **Click:** Deploy

**Deploy will start immediately!** ⏱️ Takes ~2-3 minutes

---

### Method 2: Vercel CLI (Faster)

```bash
cd projects/flipper-ai

# Install CLI (if not already installed)
npm i -g vercel

# Login
vercel login

# Deploy to production
vercel --prod
```

---

## 📦 Post-Deploy Steps

### 1. Verify Deployment

Visit your deployment URL (e.g., `flipper-ai-xyz.vercel.app`):

**Test Checklist:**
- [ ] Landing page loads
- [ ] Click "Get Started" → redirects to /auth/signup
- [ ] Click "Log In" → redirects to /auth/login
- [ ] Theme switcher works (/settings)
- [ ] No console errors (F12 → Console)

---

### 2. Set Up Vercel Postgres Database

**Important:** Do this AFTER first deploy!

1. Go to your project dashboard
2. Click **Storage** tab
3. Click **Create Database** → **Postgres**
4. Name: `flipper-ai-db`
5. Region: US East (or closest to you)
6. Click **Create**

**Vercel will automatically:**
- Create `DATABASE_URL` env var
- Add connection pooling
- Set up SSL

---

### 3. Run Database Migrations

**Option A: Local (Recommended)**

```bash
cd projects/flipper-ai

# Copy DATABASE_URL from Vercel dashboard
# Add to .env file

# Reset migrations for PostgreSQL
rm -rf prisma/migrations
npx prisma migrate dev --name init

# Or deploy existing migrations
npx prisma migrate deploy
```

**Option B: Vercel Dashboard**

1. Go to **Settings** → **Environment Variables**
2. Add `DATABASE_URL` (already added by Postgres)
3. Redeploy from **Deployments** tab

---

### 4. Add Firebase Environment Variables

**Required for Auth to Work:**

Go to **Settings** → **Environment Variables**, add:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**Where to get these:**
- Go to https://console.firebase.google.com
- Select your project (or create new)
- Click ⚙️ → Project Settings
- Scroll to "Your apps" → Web app
- Copy values from config object

---

### 5. Optional: Add Custom Domain

1. Go to **Settings** → **Domains**
2. Click **Add Domain**
3. Enter: `flipper.yourdomain.com` (or any subdomain)
4. Follow DNS instructions (add CNAME record)
5. Wait 5-10 minutes for SSL certificate

---

## 🎉 Your Live URLs

After deploy, you'll have:

- **Production:** `https://flipper-ai-[random].vercel.app`
- **Landing Page:** `/`
- **Sign Up:** `/auth/signup`
- **Log In:** `/auth/login`
- **Settings:** `/settings`
- **Dashboard:** `/dashboard` (after auth)

---

## 📊 Vercel Analytics

**View Analytics:**
1. Go to project dashboard
2. Click **Analytics** tab
3. See real-time visitors, page views, top pages

**Analytics will start tracking immediately!** 🎯

---

## 🐛 Troubleshooting

### Build Fails
```bash
# Check logs
vercel logs [deployment-url]

# Local debug
npm run build
```

### Database Connection Fails
- Verify `DATABASE_URL` env var exists
- Check Vercel Postgres dashboard for errors
- Try running `npx prisma migrate deploy` locally

### 404 on Auth Pages
- Ensure `/auth/login` and `/auth/signup` files exist
- Check build logs for TypeScript errors
- Redeploy from Vercel dashboard

### Analytics Not Showing
- Wait 30 seconds after first visit
- Disable ad blockers
- Navigate between pages

---

## 🚀 Next Steps After Deploy

### Immediate (Today)
1. **Test the product yourself** - Find your first flip!
2. **Share with 5 friends** - Get initial feedback
3. **Join r/Flipping** - Start engaging in community

### This Week
1. **Record demo video** (2-3 minutes with Loom)
2. **Prepare Product Hunt launch**
3. **Create Twitter account** - Start building in public
4. **Write first blog post** - "How to Make $1k/Month Flipping"

### Next Week
1. **Product Hunt launch** (Tuesday 12:01 AM PST)
2. **Reddit launch** (r/Flipping, r/sidehustle)
3. **First 10 paying customers** - Goal!

---

## 📈 Success Metrics to Track

**Week 1:**
- 500+ visitors
- 100+ signups
- 20+ trial starts
- 5+ paying customers

**Month 1:**
- 10,000+ visitors
- 500+ signups  
- 100+ trial starts
- 20+ paying customers → **$580 MRR**

---

## 💡 Pro Tips

1. **Auto-deploy on push** - Vercel watches `main` branch (already set up)
2. **Preview deploys** - Every PR gets its own URL
3. **Instant rollbacks** - Click "Redeploy" on any previous deployment
4. **Edge caching** - Static pages cached globally (fast!)
5. **Free SSL** - Automatic HTTPS everywhere

---

## ✅ Final Check

Before launching publicly:

- [ ] Landing page loads fast
- [ ] All links work
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Analytics tracking
- [ ] Database connected
- [ ] Auth pages work (even if not fully functional yet)

**If all checked → GO LIVE! 🎉**

---

**Good luck with the launch! 🐧💰**
