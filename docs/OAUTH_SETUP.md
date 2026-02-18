# OAuth Setup Guide - Flipper AI

Complete guide to setting up Google and GitHub OAuth authentication.

---

## 🚀 Quick Start

Run the interactive setup script:

```bash
chmod +x scripts/setup-oauth.sh
./scripts/setup-oauth.sh
```

Or follow the manual steps below.

---

## 📋 Prerequisites

1. **Vercel deployment** (or know your production URL)
2. **Google Cloud account** (for Google OAuth)
3. **GitHub account** (for GitHub OAuth)

---

## 1️⃣ Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to: https://console.developers.google.com
2. Click **"Create Project"** (or select existing)
3. Enter project name: **"Flipper AI"**
4. Click **"Create"**

### Step 2: Enable Google+ API

1. In your project dashboard, click **"Enable APIs and Services"**
2. Search for **"Google+ API"**
3. Click **"Enable"**

### Step 3: Create OAuth 2.0 Credentials

1. Go to **"Credentials"** (left sidebar)
2. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
3. If prompted, configure the OAuth consent screen:
   - User Type: **External**
   - App name: **Flipper AI**
   - User support email: your email
   - Developer contact: your email
   - Click **"Save and Continue"** through all steps

4. **Application type:** Web application
5. **Name:** Flipper AI Web
6. **Authorized JavaScript origins:**
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```

7. **Authorized redirect URIs:**
   ```
   http://localhost:3000/api/auth/callback/google
   https://your-app.vercel.app/api/auth/callback/google
   ```

8. Click **"Create"**
9. **Copy the Client ID and Client Secret** (you'll need these!)

### Step 4: Add to Environment Variables

**Local development (`.env.local`):**
```bash
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

**Vercel production:**
```bash
# Option A: CLI
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET

# Option B: Dashboard
# Go to: https://vercel.com/your-project/settings/environment-variables
# Add both variables for "Production" environment
```

---

## 2️⃣ GitHub OAuth Setup

### Step 1: Create GitHub OAuth App

1. Go to: https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name:** Flipper AI
   - **Homepage URL:** 
     - Dev: `http://localhost:3000`
     - Prod: `https://your-app.vercel.app`
   - **Application description:** AI-powered marketplace flipping tool
   - **Authorization callback URL:**
     - Dev: `http://localhost:3000/api/auth/callback/github`
     - Prod: `https://your-app.vercel.app/api/auth/callback/github`

4. Click **"Register application"**

### Step 2: Generate Client Secret

1. On the OAuth app page, copy the **Client ID**
2. Click **"Generate a new client secret"**
3. **Copy the client secret immediately** (you can't see it again!)

### Step 3: Add to Environment Variables

**Local development (`.env.local`):**
```bash
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
```

**Vercel production:**
```bash
# Option A: CLI
vercel env add GITHUB_CLIENT_ID
vercel env add GITHUB_CLIENT_SECRET

# Option B: Dashboard
# Add both variables for "Production" environment
```

---

## 3️⃣ Update Production URLs

After deploying to Vercel, update your OAuth callback URLs:

### Google Console
1. Go to: https://console.developers.google.com
2. Navigate to **Credentials** → your OAuth client
3. Add your Vercel URL to **Authorized redirect URIs**:
   ```
   https://flipper-ai-abc123.vercel.app/api/auth/callback/google
   ```

### GitHub Settings
1. Go to: https://github.com/settings/developers
2. Click on your OAuth app
3. Update **Authorization callback URL**:
   ```
   https://flipper-ai-abc123.vercel.app/api/auth/callback/github
   ```

---

## 4️⃣ Testing OAuth

### Local Testing

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Open: http://localhost:3000/auth/login

3. Click **"Continue with Google"** or **"Continue with GitHub"**

4. You should be redirected to Google/GitHub, then back to Flipper AI

### Production Testing

1. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

2. Open your Vercel URL: `https://your-app.vercel.app/auth/login`

3. Test both OAuth providers

---

## 🧪 Testing with Playwright

Run acceptance tests to verify OAuth configuration:

```bash
# All acceptance tests (includes OAuth detection)
npm run test:acceptance

# Just OAuth tests
npx playwright test e2e/acceptance/auth-oauth.spec.ts

# Watch OAuth tests in browser
npx playwright test e2e/acceptance/auth-oauth.spec.ts --headed
```

**Expected results:**
- ✅ OAuth buttons display correctly
- ✅ OAuth configuration detected
- ✅ Security checks pass (CSRF, HTTPS)
- ⚠️ Full OAuth flow requires credentials

---

## 🐛 Troubleshooting

### "Sign in with Google wasn't working"

**Possible causes:**

1. **Missing credentials**
   ```bash
   # Check .env.local
   cat .env.local | grep GOOGLE
   
   # Should show:
   # GOOGLE_CLIENT_ID=...
   # GOOGLE_CLIENT_SECRET=...
   ```

2. **Wrong redirect URI**
   - Verify in Google Console that redirect URI **exactly matches** your URL
   - Include `/api/auth/callback/google` path

3. **OAuth app not published**
   - Go to Google Console → OAuth consent screen
   - Click **"Publish App"** (for external users)

4. **NEXTAUTH_URL mismatch**
   ```bash
   # In .env.local (dev)
   NEXTAUTH_URL=http://localhost:3000
   
   # In Vercel (production)
   NEXTAUTH_URL=https://your-app.vercel.app
   ```

### "redirect_uri_mismatch" Error

**Fix:** The redirect URI in Google Console doesn't match the callback URL.

1. Check the error message for the actual redirect URI being used
2. Add that **exact** URI to Google Console:
   - Go to Credentials → OAuth 2.0 Client → Authorized redirect URIs
   - Add: `http://localhost:3000/api/auth/callback/google`

### GitHub OAuth Error

**Fix:** Check the callback URL:

1. Go to: https://github.com/settings/developers
2. Select your OAuth app
3. Verify **Authorization callback URL** matches:
   ```
   http://localhost:3000/api/auth/callback/github
   ```

### Tests Failing

**OAuth tests are skipped by default** unless credentials are configured.

**To run OAuth tests:**
1. Set up credentials (see steps above)
2. Run tests in headed mode to manually complete OAuth flow:
   ```bash
   npx playwright test e2e/acceptance/auth-oauth.spec.ts --headed
   ```

---

## 📝 Environment Variables Checklist

**Required for OAuth:**

```bash
# NextAuth
✅ NEXTAUTH_SECRET=your-secret-here
✅ NEXTAUTH_URL=http://localhost:3000  # or production URL

# Google OAuth (optional)
✅ GOOGLE_CLIENT_ID=your_google_client_id
✅ GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth (optional)
✅ GITHUB_CLIENT_ID=your_github_client_id
✅ GITHUB_CLIENT_SECRET=your_github_client_secret
```

**Verify Vercel env vars:**
```bash
vercel env ls
```

---

## 🔒 Security Notes

1. **Never commit `.env.local` to git** (already in `.gitignore`)
2. **Use different credentials for dev vs production**
3. **Rotate secrets if exposed**
4. **Enable 2FA** on Google/GitHub accounts
5. **Review OAuth permissions regularly**

---

## 🎯 Success Criteria

OAuth is working correctly when:

- ✅ "Continue with Google" button redirects to Google
- ✅ After Google login, redirects back to Flipper AI
- ✅ User is logged in and sees dashboard
- ✅ Same flow works for GitHub
- ✅ OAuth tests pass in Playwright
- ✅ No console errors during auth flow

---

## 📚 Additional Resources

- [NextAuth.js Docs](https://next-auth.js.org)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Apps](https://docs.github.com/en/apps/oauth-apps)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)

---

**Need help?** Check `OAUTH_FIX_GUIDE.md` or run the interactive setup:

```bash
./scripts/setup-oauth.sh
```

🐧 Happy authenticating!
