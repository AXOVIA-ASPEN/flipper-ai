# 🧪 Deployment Test Checklist

**Your Live URL:** `https://flipper-ai-[xxx].vercel.app` (get from Vercel dashboard)

---

## ✅ Test 1: Landing Page

- [ ] Visit root URL
- [ ] See "Find Hidden Profits" hero text
- [ ] See pricing cards (Free, Pro $29, Business $99)
- [ ] Click "Get Started" → redirects to `/auth/signup`
- [ ] Click "Log In" → redirects to `/auth/login`

**Expected:** All links work, no console errors

---

## ✅ Test 2: Sign Up Flow

1. Go to `/auth/signup`
2. Fill in:
   - **Name:** Test User
   - **Email:** test@example.com
   - **Password:** Password123!
3. Click "Create Account"

**Expected:** 
- Redirects to `/dashboard`
- Shows "Welcome to Flipper.ai" or dashboard UI
- No errors in console

**If it fails:**
- Check Vercel → Function Logs for errors
- Verify DATABASE_URL is in Environment Variables
- Check NEXTAUTH_SECRET and NEXTAUTH_URL are set

---

## ✅ Test 3: Database Verification

1. Go to Vercel Dashboard → Integrations → Prisma Postgres
2. Click "View Database" or "Open Database"
3. Click "Query" tab
4. Run SQL:
   ```sql
   SELECT * FROM "User";
   ```

**Expected:** 
- See your test user in the results
- Email: test@example.com
- Name: Test User
- Created timestamp

---

## ✅ Test 4: Log In

1. Go to `/auth/login`
2. Enter same credentials:
   - Email: test@example.com
   - Password: Password123!
3. Click "Log In"

**Expected:**
- Successfully logs in
- Redirects to `/dashboard`
- Shows your user name in UI

---

## ✅ Test 5: Analytics

1. Go to Vercel Dashboard → Analytics tab
2. Wait 30-60 seconds
3. Refresh

**Expected:**
- See page views
- See visitor count (1+)
- Top pages: `/`, `/auth/signup`, `/auth/login`

---

## ✅ Test 6: Theme Settings

1. While logged in, go to `/settings`
2. Click different theme options:
   - Purple Dream
   - Ocean Breeze
   - Sunset Glow
   - Forest Green
   - Midnight Blue
   - Rose Garden

**Expected:**
- Colors change instantly
- Active theme has green indicator dot
- Theme persists on page refresh

---

## 🐛 Common Issues & Fixes

### Issue: "Sign in failed" error

**Cause:** NextAuth not configured properly

**Fix:**
1. Check Vercel → Settings → Environment Variables
2. Ensure these exist:
   - `NEXTAUTH_SECRET` (should be long random string)
   - `NEXTAUTH_URL` (should match your deployment URL)
3. If missing, add them and redeploy

---

### Issue: "Database connection failed"

**Cause:** DATABASE_URL not set or migrations not run

**Fix:**
1. Check Vercel → Settings → Environment Variables
2. Verify `DATABASE_URL` exists (should start with `postgres://`)
3. Verify migrations ran (we already did this!)
4. Redeploy from Deployments tab

---

### Issue: 404 on /auth/signup

**Cause:** Build failed or route doesn't exist

**Fix:**
1. Check Vercel → Deployments → Build Logs
2. Look for TypeScript errors
3. Verify `/src/app/auth/signup/page.tsx` exists in repo
4. Redeploy

---

### Issue: Blank dashboard after login

**Cause:** Dashboard page not implemented yet

**Fix:**
This is expected! Dashboard UI isn't fully built yet. The fact that you:
- ✅ Created an account
- ✅ Logged in
- ✅ User saved to database

...means auth is working perfectly! 🎉

---

## 🎯 Success Criteria

**Your deployment is successful if:**

- ✅ Landing page loads
- ✅ Can create account (signup works)
- ✅ User appears in database
- ✅ Can log in with credentials
- ✅ Theme settings work
- ✅ Analytics tracking page views

**If all 6 ✅ pass → YOU'RE LIVE!** 🎉🐧

---

## 📊 Database Tables Created

Run this in Prisma Postgres query tab to verify all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected tables:**
- AIAnalysisCache
- Account
- Alert
- Authenticator
- Listing
- Notification
- PriceHistory
- ScraperJob
- SearchQuery
- Session
- User
- UserSettings
- VerificationToken
- _prisma_migrations

**Total:** 14 tables ✅

---

## 🚀 Next Steps After Testing

Once everything passes:

1. **Share with friends** - Get 5 people to test
2. **Use it yourself** - Find your first profitable flip!
3. **Record demo video** - 2-3 minute walkthrough
4. **Plan Product Hunt launch** - Tuesday next week

---

**Good luck!** Let me know which tests pass/fail! 🐧
