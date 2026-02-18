# Vercel Environment Variables Checklist

**Status:** Required for deployment  
**Priority:** Complete before production launch

---

## ✅ Required Environment Variables

These MUST be set in Vercel for the app to work:

### 1. Database
```bash
DATABASE_URL="postgres://..."  # From Prisma Postgres integration
```
✅ **Auto-configured** by Vercel Marketplace integration

---

### 2. NextAuth (Authentication)
```bash
NEXTAUTH_SECRET="your-secret-here"  # Generate: openssl rand -base64 32
NEXTAUTH_URL="https://your-app.vercel.app"  # Your production URL
```

**How to set:**
```bash
# Generate secret
openssl rand -base64 32

# Add to Vercel
vercel env add NEXTAUTH_SECRET production
# Paste the generated secret

vercel env add NEXTAUTH_URL production
# Enter: https://your-app.vercel.app
```

---

## 🔑 Optional (OAuth Providers)

### Google OAuth
```bash
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

**How to get:**
1. Go to: https://console.developers.google.com
2. Create OAuth credentials
3. Add redirect URI: `https://your-app.vercel.app/api/auth/callback/google`

**How to set:**
```bash
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production
```

---

### GitHub OAuth
```bash
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

**How to get:**
1. Go to: https://github.com/settings/developers
2. Create OAuth App
3. Callback URL: `https://your-app.vercel.app/api/auth/callback/github`

**How to set:**
```bash
vercel env add GITHUB_CLIENT_ID production
vercel env add GITHUB_CLIENT_SECRET production
```

---

## 📊 Optional (Monitoring & Analytics)

### Sentry (Error Tracking)
```bash
SENTRY_DSN="your-sentry-dsn"
NEXT_PUBLIC_SENTRY_DSN="your-sentry-dsn"  # Same as above
SENTRY_ORG="your-org-slug"
SENTRY_PROJECT="your-project-slug"
SENTRY_AUTH_TOKEN="your-auth-token"  # For source maps
```

**Skip for now** - Can add later

---

### Email (Resend)
```bash
RESEND_API_KEY="your-resend-api-key"
EMAIL_FROM="Flipper AI <noreply@your-domain.com>"
```

**Skip for now** - Can add later

---

## 🚀 Quick Setup (Minimum Viable)

**To deploy NOW with minimal setup:**

```bash
# 1. Generate NextAuth secret
openssl rand -base64 32

# 2. Add to Vercel (via dashboard)
# Go to: https://vercel.com/your-project/settings/environment-variables

# Add these:
NEXTAUTH_SECRET=<paste-generated-secret>
NEXTAUTH_URL=https://your-app.vercel.app

# DATABASE_URL should already be there from Prisma integration
```

**That's it!** Email/password auth will work. OAuth can be added later.

---

## 📋 Environment Variable Priority

**Production (Required):**
1. ✅ `DATABASE_URL` - Auto-configured by Prisma Postgres integration
2. ⚠️ `NEXTAUTH_SECRET` - **YOU MUST SET THIS**
3. ⚠️ `NEXTAUTH_URL` - **YOU MUST SET THIS** (your Vercel URL)

**Production (Optional):**
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` - GitHub OAuth
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` - Error tracking
- `RESEND_API_KEY` - Email notifications

---

## 🔍 Verify Environment Variables

**Via Vercel Dashboard:**
1. Go to: https://vercel.com/your-project/settings/environment-variables
2. Check that these are set for **Production**:
   - ✅ DATABASE_URL
   - ✅ NEXTAUTH_SECRET
   - ✅ NEXTAUTH_URL

**Via CLI:**
```bash
vercel env ls
```

---

## 🐛 Troubleshooting

### "Missing NEXTAUTH_SECRET"
**Error:** Auth doesn't work, console shows missing secret

**Fix:**
```bash
openssl rand -base64 32
vercel env add NEXTAUTH_SECRET production
# Paste generated secret
vercel --prod  # Redeploy
```

---

### "OAuth redirect mismatch"
**Error:** Google/GitHub login fails

**Fix:**
1. Update redirect URI in Google/GitHub console
2. Must exactly match: `https://your-app.vercel.app/api/auth/callback/google`
3. Add both dev and prod URLs

---

### "Database connection failed"
**Error:** Can't connect to database

**Fix:**
1. Check Vercel → Integrations → Prisma Postgres
2. Verify `DATABASE_URL` is set
3. Re-add integration if needed

---

## ✅ Post-Deployment Checklist

After setting env vars and deploying:

- [ ] Visit your Vercel URL
- [ ] Try creating an account (signup)
- [ ] Try logging in
- [ ] Check for console errors
- [ ] (Optional) Test Google OAuth
- [ ] (Optional) Test GitHub OAuth

---

## 🎯 Current Status

**As of 2026-02-18:**

**Set in Vercel:**
- ✅ `DATABASE_URL` (Prisma Postgres integration)

**Need to Set:**
- ⚠️ `NEXTAUTH_SECRET` (generate and add)
- ⚠️ `NEXTAUTH_URL` (get from Vercel dashboard)

**Optional (Can Add Later):**
- Google OAuth credentials
- GitHub OAuth credentials
- Sentry DSN
- Resend API key

---

## 📚 Related Docs

- **OAuth Setup:** `docs/OAUTH_SETUP.md`
- **Deployment Guide:** `DEPLOYMENT_READY.md`
- **Vercel Env Vars:** https://vercel.com/docs/environment-variables

---

**Next Step:** Add `NEXTAUTH_SECRET` and `NEXTAUTH_URL` to Vercel, then deploy! 🚀
