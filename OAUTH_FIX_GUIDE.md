# Fixing "Sign in with Google" Issue

**Problem:** Google OAuth button clicks but nothing happens (or shows error)

**Root Cause:** Google OAuth credentials not configured in Vercel environment variables

---

## 🔍 Diagnosis

The acceptance tests I created will automatically detect if OAuth is configured:

```bash
npm run test:acceptance -- e2e/acceptance/auth-oauth.spec.ts --headed
```

**Expected results:**

### If OAuth IS configured:
- ✅ Clicking "Google" button redirects to `accounts.google.com`
- ✅ OAuth flow starts

### If OAuth NOT configured:
- ❌ Clicking "Google" button shows error page
- ⚠️ Test shows warning: "OAuth not configured"
- ❌ Or button clicks but nothing happens

---

## ✅ Fix (5 Minutes)

### Step 1: Get Google OAuth Credentials

1. Go to: https://console.developers.google.com
2. Create a new project (or select existing): **"Flipper AI"**
3. Click **"OAuth consent screen"**
   - User Type: **External**
   - App name: **Flipper.ai**
   - User support email: your email
   - Authorized domains: `vercel.app` (and your custom domain if you have one)
   - Save

4. Click **"Credentials"** (left sidebar)
5. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
6. Application type: **Web application**
7. Name: **Flipper AI Production**
8. Authorized redirect URIs - Add:
   ```
   https://your-app.vercel.app/api/auth/callback/google
   ```
   (Replace `your-app.vercel.app` with your actual Vercel URL!)

9. Click **"Create"**
10. **Copy the Client ID and Client Secret**

---

### Step 2: Add to Vercel Environment Variables

1. Go to your Vercel dashboard
2. Click your project: **flipper-ai**
3. Click **"Settings"** → **"Environment Variables"**
4. Add these variables:

**Variable 1:**
```
Name: GOOGLE_CLIENT_ID
Value: [paste your Client ID]
Environment: Production, Preview, Development (select all)
```

**Variable 2:**
```
Name: GOOGLE_CLIENT_SECRET
Value: [paste your Client Secret]
Environment: Production, Preview, Development (select all)
```

5. Click **"Save"**

---

### Step 3: Redeploy

1. Go to **"Deployments"** tab
2. Click **"Redeploy"** on the latest deployment

**Wait ~2 minutes for deployment to complete.**

---

### Step 4: Test

1. Visit your live site
2. Go to `/auth/signup` or `/auth/login`
3. Click **"Sign in with Google"**
4. **Should redirect to Google OAuth page!** ✅

**If it works:**
- Google login screen appears
- You can sign in with your Google account
- Redirects back to your app
- You're logged in!

---

## 🔧 Common Issues

### Issue: Redirect URI mismatch

**Error:** "redirect_uri_mismatch"

**Fix:** 
1. Go to Google Console → Credentials → Your OAuth Client
2. Verify redirect URI **exactly matches**:
   ```
   https://your-actual-vercel-url.vercel.app/api/auth/callback/google
   ```
3. No trailing slash!
4. Must be HTTPS (not HTTP)

---

### Issue: App not verified

**Warning:** "This app isn't verified"

**This is normal for development!** You can:

**Option A: Click "Advanced" → "Go to Flipper.ai (unsafe)"**
- Only you can see this warning
- Users won't see it after you verify the app

**Option B: Publish the app (for production)**
1. Google Console → OAuth consent screen
2. Click **"Publish App"**
3. Google will review (can take a few days)

For MVP testing, Option A is fine!

---

### Issue: Callback URL wrong

**Problem:** Google redirects but shows 404

**Fix:**
1. Check `NEXTAUTH_URL` in Vercel env vars
2. Must match your deployment URL exactly
3. Example: `https://flipper-ai-abc123.vercel.app`
4. No trailing slash!

---

### Issue: Still not working

**Debug checklist:**

```bash
# 1. Verify env vars are set in Vercel
Go to Settings → Environment Variables

# 2. Check they're not empty
GOOGLE_CLIENT_ID should be ~70 characters
GOOGLE_CLIENT_SECRET should be ~35 characters

# 3. Verify deployment has the env vars
Click Deployments → Latest → Environment Variables
(They should show up here)

# 4. Check browser console for errors
Open DevTools (F12) → Console tab
Click "Google" button, look for errors

# 5. Run acceptance tests locally
npm run dev
npm run test:acceptance -- e2e/acceptance/auth-oauth.spec.ts --headed
```

---

## 🔐 GitHub OAuth (Bonus)

Want GitHub login too? Same process:

### Step 1: Get credentials

1. Go to: https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Application name: **Flipper.ai**
4. Homepage URL: `https://your-app.vercel.app`
5. Authorization callback URL:
   ```
   https://your-app.vercel.app/api/auth/callback/github
   ```
6. Click **"Register application"**
7. Click **"Generate a new client secret"**
8. **Copy Client ID and Client Secret**

### Step 2: Add to Vercel

**Variable 1:**
```
GITHUB_CLIENT_ID=[paste your Client ID]
```

**Variable 2:**
```
GITHUB_CLIENT_SECRET=[paste your Client Secret]
```

### Step 3: Redeploy

Done! GitHub login should work now.

---

## ✅ Verification

After setup, run the acceptance tests:

```bash
npm run test:acceptance -- e2e/acceptance/auth-oauth.spec.ts
```

**Expected output:**
```
✓ should check if Google OAuth is configured (passed)
✓ should display Google logo in button (passed)
✓ should check if GitHub OAuth is configured (passed)
...
```

**If tests pass:** OAuth is working! 🎉

---

## 📊 Test Coverage

The acceptance tests I created cover:

- ✅ OAuth button display
- ✅ Configuration detection
- ✅ Redirect to Google/GitHub
- ✅ Error handling (not configured)
- ✅ Security checks (CSRF, HTTPS)
- ✅ Client secret not exposed in browser

**Total OAuth tests:** 25

**Run them with:**
```bash
npm run test:acceptance:ui
```

---

## 🎯 Quick Fix Summary

1. Get Google credentials from console.developers.google.com
2. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to Vercel env vars
3. Redeploy
4. Test: Click "Google" button → Should redirect to Google ✅

**Time:** 5 minutes  
**Difficulty:** Easy  
**Cost:** Free

---

**After setup, OAuth will work for all users!** 🚀🐧
