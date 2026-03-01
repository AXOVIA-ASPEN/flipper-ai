# 🔧 Quick OAuth Fix - 10 Minutes

**Issue:** Google and GitHub login buttons don't work  
**Cause:** OAuth credentials not set in Vercel  
**Your Vercel URL:** `https://flipper-ai-ten.vercel.app`

---

## 🚀 Option 1: Quick Fix (Google Only - 5 min)

### Step 1: Create Google OAuth App

1. Go to: https://console.developers.google.com
2. Click **"Create Project"** → Name it "Flipper AI" → **Create**
3. Click **"OAuth consent screen"** (left sidebar)
   - User Type: **External** → **Create**
   - App name: **Flipper.ai**
   - User support email: **your email**
   - Developer email: **your email**
   - Click **"Save and Continue"** (skip scopes)
   - Click **"Save and Continue"** (skip test users)
   - Click **"Back to Dashboard"**

4. Click **"Credentials"** (left sidebar)
5. Click **"+ Create Credentials"** → **"OAuth 2.0 Client ID"**
6. Application type: **Web application**
7. Name: **Flipper AI Production**
8. **Authorized redirect URIs** - Click "+ Add URI" and paste:
   ```
   https://flipper-ai-ten.vercel.app/api/auth/callback/google
   ```
9. Click **"Create"**
10. **Copy the Client ID and Client Secret** (keep this tab open!)

---

### Step 2: Add to Vercel

**Option A: Vercel Dashboard (Easier)**

1. Go to: https://vercel.com/dashboard
2. Click on **flipper-ai** project
3. Click **Settings** → **Environment Variables**
4. Add these two variables:

**Variable 1:**
- Key: `GOOGLE_CLIENT_ID`
- Value: `<paste your Client ID from Google>`
- Environment: **Production** (check the box)
- Click **Save**

**Variable 2:**
- Key: `GOOGLE_CLIENT_SECRET`
- Value: `<paste your Client Secret from Google>`
- Environment: **Production**
- Click **Save**

5. Go to **Deployments** tab
6. Click **"Redeploy"** on the latest deployment

**Wait 2-3 minutes, then test:** https://flipper-ai-ten.vercel.app/auth/login

---

**Option B: Vercel CLI**

```bash
vercel env add GOOGLE_CLIENT_ID production
# Paste your Client ID when prompted

vercel env add GOOGLE_CLIENT_SECRET production
# Paste your Client Secret when prompted

vercel --prod
```

---

## 🐙 Option 2: Add GitHub OAuth Too (Extra 5 min)

### Step 1: Create GitHub OAuth App

1. Go to: https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name:** Flipper AI
   - **Homepage URL:** `https://flipper-ai-ten.vercel.app`
   - **Authorization callback URL:** `https://flipper-ai-ten.vercel.app/api/auth/callback/github`
4. Click **"Register application"**
5. Click **"Generate a new client secret"**
6. **Copy both:**
   - Client ID (shown at top)
   - Client secret (copy immediately - can't see again!)

---

### Step 2: Add to Vercel

Same process as Google, but use:
- Key: `GITHUB_CLIENT_ID`
- Value: `<your GitHub Client ID>`

- Key: `GITHUB_CLIENT_SECRET`
- Value: `<your GitHub Client Secret>`

Then **Redeploy**.

---

## ✅ How to Verify It Works

**After redeployment:**

1. Go to: https://flipper-ai-ten.vercel.app/auth/login
2. Click **"Continue with Google"**
3. Should redirect to Google login page ✅
4. After logging in with Google, should redirect back to your site ✅

**If it works:** 🎉 You can now log in with Google/GitHub!

**If it doesn't work:**
- Check environment variables are saved for **Production**
- Verify redirect URI matches EXACTLY: `https://flipper-ai-ten.vercel.app/api/auth/callback/google`
- Wait 2-3 min after redeployment
- Try in incognito/private window

---

## 🐛 Common Issues

### "redirect_uri_mismatch" Error
**Fix:** The redirect URI in Google Console must match EXACTLY:
```
https://flipper-ai-ten.vercel.app/api/auth/callback/google
```
- No trailing slash
- Must be https://
- Check for typos

### Google Login Opens But Shows Error Page
**Fix:** Make sure both variables are set:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### "Access Denied" Error
**Fix:** In Google Console:
1. Go to OAuth consent screen
2. Click **"Publish App"** button
3. Confirm

---

## 📋 Quick Checklist

**Google OAuth:**
- [ ] Created Google Cloud project
- [ ] Set up OAuth consent screen
- [ ] Created OAuth 2.0 Client ID
- [ ] Added redirect URI: `https://flipper-ai-ten.vercel.app/api/auth/callback/google`
- [ ] Copied Client ID and Secret
- [ ] Added `GOOGLE_CLIENT_ID` to Vercel
- [ ] Added `GOOGLE_CLIENT_SECRET` to Vercel
- [ ] Redeployed
- [ ] Tested login

**GitHub OAuth (Optional):**
- [ ] Created GitHub OAuth App
- [ ] Added callback URL: `https://flipper-ai-ten.vercel.app/api/auth/callback/github`
- [ ] Copied Client ID and Secret
- [ ] Added `GITHUB_CLIENT_ID` to Vercel
- [ ] Added `GITHUB_CLIENT_SECRET` to Vercel
- [ ] Redeployed
- [ ] Tested login

---

## 🎯 Expected Result

**After setup:**
- ✅ "Continue with Google" redirects to Google
- ✅ After Google login, redirects back to Flipper AI
- ✅ User is logged in and sees dashboard
- ✅ (Same for GitHub if configured)

---

**Total Time:** 5-10 minutes  
**Difficulty:** Easy (just copy-paste credentials)

Let me know if you hit any issues! 🚀
