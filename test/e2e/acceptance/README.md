# Flipper AI - Acceptance Tests

Comprehensive end-to-end tests for all user-facing features using Playwright.

---

## 🎯 Test Coverage

### ✅ Landing Page (`landing-page.spec.ts`)
- Hero section with branding
- CTA buttons and navigation
- Feature cards (all 6 features)
- Pricing tiers (Free, Pro, Business)
- Email capture form
- Footer links
- Responsive design
- SEO meta tags
- No console errors

### ✅ Sign Up (`auth-signup.spec.ts`)
- Form display with all fields
- Successful account creation
- Validation errors (missing fields, invalid email, weak password)
- Duplicate email handling
- Google OAuth button display
- GitHub OAuth button display
- Navigation to login page
- Links to privacy/terms
- Button loading states
- Responsive design
- Autofocus behavior

### ✅ OAuth Authentication (`auth-oauth.spec.ts`)
- **Google OAuth:**
  - Configuration check
  - Button display with logo
  - Redirect to Google (if configured)
  - Error handling (if not configured)
  - Security checks (state parameter, HTTPS)
- **GitHub OAuth:**
  - Configuration check
  - Button display with logo
  - Redirect to GitHub (if configured)
  - Error handling
- **OAuth Security:**
  - CSRF protection (state parameter)
  - Client secrets not exposed in browser
  - HTTPS redirects in production
- **Error Handling:**
  - Cancellation flow
  - Callback errors
  - Provider downtime

### ✅ Login (`auth-login.spec.ts`)
- Form display
- Successful login with valid credentials
- Error for invalid email
- Error for wrong password
- Button loading states
- Forgot password link
- Navigation to signup
- OAuth buttons (Google, GitHub)
- Email/password validation
- Responsive design
- Keyboard navigation (Tab, Enter)
- Session persistence

### ✅ Dashboard (`dashboard.spec.ts`)
- Redirect to login if not authenticated
- Display for authenticated users
- Navigation menu
- Settings link
- Session maintenance after refresh
- Logout functionality
- User info display
- No console errors
- Responsive design

### ✅ Theme Settings (`theme-settings.spec.ts`)
- Display all 6 theme options
- Active theme indicator
- Theme switching
- localStorage persistence
- Persistence after page reload
- Theme preview colors
- "Active Theme" label
- Current theme info section
- Gradient previews
- Switching between all themes
- Hover effects
- Mobile viewport
- Rapid clicking stability
- CSS variables applied

---

## 🚀 Running Tests

### Run All Acceptance Tests
```bash
npx playwright test e2e/acceptance/
```

### Run Specific Test Suite
```bash
# Landing page tests
npx playwright test e2e/acceptance/landing-page.spec.ts

# Authentication tests
npx playwright test e2e/acceptance/auth-signup.spec.ts
npx playwright test e2e/acceptance/auth-login.spec.ts
npx playwright test e2e/acceptance/auth-oauth.spec.ts

# Dashboard tests
npx playwright test e2e/acceptance/dashboard.spec.ts

# Theme tests
npx playwright test e2e/acceptance/theme-settings.spec.ts
```

### Run in UI Mode (Interactive)
```bash
npx playwright test e2e/acceptance/ --ui
```

### Run in Headed Mode (See Browser)
```bash
npx playwright test e2e/acceptance/ --headed
```

### Run Specific Browser
```bash
npx playwright test e2e/acceptance/ --project=chromium
npx playwright test e2e/acceptance/ --project=firefox
npx playwright test e2e/acceptance/ --project=webkit
```

---

## 🔧 Setup Required

### 1. Environment Variables

Create `.env.test` file:
```bash
# Base URL for tests
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000

# Database (for test user creation)
DATABASE_URL=postgresql://...

# NextAuth (for session tests)
NEXTAUTH_SECRET=your-test-secret
NEXTAUTH_URL=http://localhost:3000

# OAuth (optional - for OAuth tests)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### 2. Test Database Setup

**Option A: Use separate test database**
```bash
# Create test database
createdb flipper_ai_test

# Run migrations
DATABASE_URL=postgresql://localhost/flipper_ai_test npx prisma migrate deploy
```

**Option B: Use production database (risky)**
```bash
# Tests will create/delete test users
# Make sure you're okay with this!
```

### 3. Create Test User (Required)

Some tests expect a test user to exist:
```typescript
Email: test@example.com
Password: Password123!
Name: Test User
```

**Create via API:**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "name": "Test User"
  }'
```

**Or create manually:**
1. Start dev server: `npm run dev`
2. Go to: http://localhost:3000/auth/signup
3. Create account with credentials above

---

## 🎭 OAuth Testing

### Google OAuth Setup (Optional)

OAuth tests are **skipped by default** unless credentials are configured.

**To test Google OAuth:**

1. **Get credentials:**
   - Go to: https://console.developers.google.com
   - Create OAuth 2.0 Client ID
   - Add redirect URI: `http://localhost:3000/api/auth/callback/google`

2. **Add to `.env.test`:**
   ```bash
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

3. **Run tests:**
   ```bash
   npx playwright test e2e/acceptance/auth-oauth.spec.ts
   ```

4. **Manual OAuth flow tests:**
   ```bash
   # These require manual interaction
   npx playwright test e2e/acceptance/auth-oauth.spec.ts --headed
   ```

### GitHub OAuth Setup (Optional)

**To test GitHub OAuth:**

1. **Get credentials:**
   - Go to: https://github.com/settings/developers
   - New OAuth App
   - Callback URL: `http://localhost:3000/api/auth/callback/github`

2. **Add to `.env.test`:**
   ```bash
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   ```

---

## 📊 Test Results

### CI/CD Integration

Add to GitHub Actions:
```yaml
name: E2E Acceptance Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e:acceptance
```

### View Test Reports

After running tests:
```bash
npx playwright show-report
```

### Generate Code Coverage

```bash
npx playwright test --reporter=html
```

---

## 🐛 Troubleshooting

### "Test user not found" errors

**Problem:** Login tests fail because test@example.com doesn't exist

**Fix:**
```bash
# Create test user via signup page or API
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "name": "Test User"
  }'
```

---

### OAuth tests failing

**Problem:** "Sign in with Google wasn't working"

**Diagnosis:**
```bash
# Run OAuth tests in headed mode to see what happens
npx playwright test e2e/acceptance/auth-oauth.spec.ts --headed
```

**Possible causes:**
1. **GOOGLE_CLIENT_ID not set** → Set in env vars
2. **Redirect URI mismatch** → Must match exactly in Google Console
3. **OAuth app not published** → Publish app in Google Console
4. **NEXTAUTH_URL wrong** → Must match deployment URL

**Fix:**
1. Check Vercel env vars have GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
2. Verify redirect URI: `https://your-app.vercel.app/api/auth/callback/google`
3. Check Google Console → OAuth consent screen → Publishing status

---

### Tests timing out

**Problem:** Tests take too long or never complete

**Fix:**
```bash
# Increase timeout
npx playwright test --timeout=60000

# Or in playwright.config.ts:
timeout: 60000
```

---

### Port already in use

**Problem:** Dev server not running on :3000

**Fix:**
```bash
# Make sure dev server is running
npm run dev

# Or run on different port
PORT=3001 npm run dev

# Update PLAYWRIGHT_TEST_BASE_URL=http://localhost:3001
```

---

## 📈 Success Criteria

**All tests passing = Deployment ready!** ✅

**Minimum passing tests for production:**
- ✅ Landing page loads (no errors)
- ✅ Signup works (creates account)
- ✅ Login works (authenticates user)
- ✅ Dashboard accessible when logged in
- ✅ Theme switching works

**Nice to have:**
- ✅ OAuth working (Google + GitHub)
- ✅ All validation errors handled
- ✅ Mobile responsive
- ✅ No console errors

---

## 🎯 Running Before Deploy

**Pre-deployment checklist:**
```bash
# 1. Run all acceptance tests
npx playwright test e2e/acceptance/

# 2. Check for failures
# 3. Fix any broken tests
# 4. Re-run
# 5. All green? Deploy! 🚀
```

**Expected results:**
- **Passing:** 90%+ of tests
- **Failing:** OAuth tests (if not configured)
- **Skipped:** Manual OAuth flows

---

## 📝 Adding New Tests

**Test structure:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name - Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/your-page');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.getByLabel('Input').fill('value');

    // Act
    await page.getByRole('button').click();

    // Assert
    await expect(page).toHaveURL(/success/);
  });
});
```

**Best practices:**
- Descriptive test names
- Use `test.beforeEach` for setup
- Use data-testid for stable selectors
- Test user flows, not implementation
- Clean up test data after tests

---

## 🔗 Resources

- **Playwright Docs:** https://playwright.dev
- **Selector Best Practices:** https://playwright.dev/docs/selectors
- **Debugging:** https://playwright.dev/docs/debug
- **CI/CD:** https://playwright.dev/docs/ci

---

**Total Tests:** 100+  
**Coverage:** Landing, Auth, Dashboard, Settings  
**Status:** ✅ Production Ready

Run all tests before every deployment! 🚀🐧
