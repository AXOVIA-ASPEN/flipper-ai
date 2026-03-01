# 🚀 Quick Deploy - Flipper AI

**All code fixes are done. Just need to add 2 environment variables!**

---

## ✅ Step 1: Add Environment Variables to Vercel

### Via Vercel Dashboard (FASTEST):

1. **Go to:** https://vercel.com/dashboard

2. **Find your project:** "flipper-ai" (or similar)

3. **Click:** Settings → Environment Variables

4. **Add these 2 variables for "Production":**

**Variable 1: NEXTAUTH_SECRET**
```
Key: NEXTAUTH_SECRET
Value: /MR1+0tqDxOh4yHCekeWiAYKRIspt2IjzP8IWnzHSsQ=
Environment: Production
```

**Variable 2: NEXTAUTH_URL**
```
Key: NEXTAUTH_URL
Value: https://your-app.vercel.app
Environment: Production
```
*(Replace `your-app.vercel.app` with your actual Vercel URL - check Deployments tab)*

5. **Save both variables**

---

## ✅ Step 2: Redeploy

**Option A: Automatic (push to GitHub)**
```bash
cd projects/flipper-ai
git commit --allow-empty -m "Trigger deployment"
git push origin main
```

**Option B: Manual (Vercel dashboard)**
- Go to Deployments tab
- Click "..." on latest deployment
- Click "Redeploy"

---

## ✅ Step 3: Get Your URL

While deploying:
1. Go to Vercel dashboard → Deployments
2. Wait for build to complete (2-3 minutes)
3. Copy the deployment URL (e.g., `https://flipper-ai-abc123.vercel.app`)

---

## ✅ Step 4: Verify Deployment

```bash
cd projects/flipper-ai
./scripts/deploy/verify-deployment.sh https://your-url-here.vercel.app
```

---

## ✅ Step 5: Test It!

1. **Visit your URL** - Should see landing page with penguin 🐧
2. **Go to `/auth/signup`** - Create an account
3. **Go to `/auth/login`** - Log in
4. **Should redirect to dashboard** ✅

---

## 🐛 If Deployment Fails

**Check Vercel build logs:**
1. Go to Deployments tab
2. Click on the failed deployment
3. Look for error messages

**Common issues:**
- Missing env vars → Add NEXTAUTH_SECRET and NEXTAUTH_URL
- Database connection → Check Prisma Postgres integration is connected
- Build errors → Check the logs, likely a dependency issue

**Get help:**
- Share the error message
- Share Vercel URL
- Check browser console (F12)

---

## 🎯 Expected Result

**Successful deployment:**
- ✅ Build completes in ~2-3 minutes
- ✅ Site loads at your Vercel URL
- ✅ Landing page shows "Flipper.ai" with penguin
- ✅ Signup works
- ✅ Login works
- ✅ Dashboard accessible

---

**DATABASE_URL is already set** (from Prisma Postgres integration) ✅

**All you need:** NEXTAUTH_SECRET + NEXTAUTH_URL

**Let's deploy!** 🚀🐧
