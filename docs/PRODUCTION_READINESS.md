# Flipper AI - Production Readiness Plan

**Author:** ASPEN (Axovia AI)  
**Created:** February 13, 2026 1:56 AM UTC  
**Goal:** 100% Test Coverage + Visual Verification + Production Deploy

---

## 🎯 Current Status

**Overall Completion:** ~25%

### What's Working ✅
- ✅ Core marketplace scrapers (eBay, Craigslist, Facebook, OfferUp, Mercari)
- ✅ Claude AI integration for flippability analysis
- ✅ Database schema (Prisma + SQLite dev)
- ✅ 17 unit test files created
- ✅ 7 comprehensive BDD feature files written
- ✅ Playwright configured
- ✅ Next.js frontend scaffold
- ✅ API routes structure

### What's Broken/Missing 🚨

#### 1. Test Failures
- **Claude Analyzer:** 10/10 tests failing (mock response structure mismatch)
- **Auth Dependency:** Fixed ✅ (next-auth installed)
- **Coverage:** No coverage report generated yet

#### 2. BDD Test Infrastructure
- **Step Definitions:** Only `common-steps.ts` (~10% complete)
- **Missing Steps:** Need 6 more step definition files for:
  - Marketplace scanning flows
  - AI analysis verification
  - Seller communication
  - Resale listing creation
  - Dashboard tracking
  - Notifications

#### 3. Playwright E2E Tests
- **Current:** Zero tests in `/e2e` directory
- **Needed:** Full user journey tests with visual verification
  - Login → Scan → Analyze → Contact Seller → Create Listing → Track
  - Screenshot comparison for UI regression
  - Cross-browser testing (Chrome, Firefox, Safari)

#### 4. Production Infrastructure
- **CI/CD:** No GitHub Actions workflow
- **Deployment:** No production config (Vercel/Firebase/Railway)
- **Environment:** No production .env setup
- **Database:** Still using SQLite (need PostgreSQL for prod)
- **Monitoring:** No error tracking (Sentry?) or analytics

---

## 📋 Production Checklist (Prioritized)

### Phase 1: Fix Existing Tests (Priority: CRITICAL)
- [ ] **Fix Claude analyzer test mocks** - Update response structure to match real API
- [ ] **Generate test coverage report** - Identify gaps
- [ ] **Fix any remaining test failures** - All tests must pass

### Phase 2: Complete BDD Infrastructure (Priority: HIGH)
- [ ] **Implement step definitions for all 7 features:**
  - [ ] `01-marketplace-scanning.feature` → `marketplace-steps.ts`
  - [ ] `02-ai-analysis.feature` → `ai-analysis-steps.ts`
  - [ ] `03-seller-communication.feature` → `communication-steps.ts`
  - [ ] `04-resale-listing.feature` → `listing-steps.ts`
  - [ ] `05-dashboard-tracking.feature` → `dashboard-steps.ts`
  - [ ] `06-user-auth-billing.feature` → `auth-steps.ts`
  - [ ] `07-notifications-monitoring.feature` → `notifications-steps.ts`
- [ ] **Run Cucumber tests** - All scenarios must pass
- [ ] **Add visual verification** - Screenshot assertions in step defs

### Phase 3: Playwright E2E Visual Tests (Priority: HIGH)
- [ ] **Create E2E test structure:**
  ```
  e2e/
  ├── auth/
  │   ├── login.spec.ts
  │   └── signup.spec.ts
  ├── scanning/
  │   ├── marketplace-search.spec.ts
  │   └── filter-results.spec.ts
  ├── opportunities/
  │   ├── view-listing.spec.ts
  │   └── analyze-flippability.spec.ts
  ├── communication/
  │   ├── draft-message.spec.ts
  │   └── send-message.spec.ts
  └── dashboard/
      ├── track-items.spec.ts
      └── manage-listings.spec.ts
  ```
- [ ] **Implement visual regression tests** - Screenshot comparison
- [ ] **Test all user flows** - End-to-end scenarios
- [ ] **Cross-browser testing** - Chrome, Firefox, Safari

### Phase 4: CI/CD Pipeline (Priority: MEDIUM)
- [ ] **Create GitHub Actions workflow:**
  ```yaml
  .github/workflows/ci.yml
  - Run unit tests (Jest)
  - Run BDD tests (Cucumber)
  - Run E2E tests (Playwright)
  - Generate coverage report
  - Upload to Codecov/Coveralls
  - Deploy to staging (on PR)
  - Deploy to production (on merge to main)
  ```
- [ ] **Set up test badges** - Coverage, build status, deployment status
- [ ] **Configure automated deployments** - CD pipeline

### Phase 5: Production Deployment (Priority: MEDIUM)
- [ ] **Choose deployment platform** - Vercel/Netlify/Railway/GCP
- [ ] **Set up PostgreSQL database** - Replace SQLite
- [ ] **Configure environment variables** - Production secrets
- [ ] **Set up domain** - DNS configuration
- [ ] **SSL/TLS certificates** - HTTPS
- [ ] **Database migration strategy** - Prisma migrations
- [ ] **Backup strategy** - Automated DB backups

### Phase 6: Monitoring & Observability (Priority: LOW)
- [ ] **Error tracking** - Sentry integration
- [ ] **Analytics** - PostHog/Mixpanel
- [ ] **Logging** - Structured logging (Winston/Pino)
- [ ] **Performance monitoring** - Lighthouse CI
- [ ] **Uptime monitoring** - UptimeRobot/Pingdom

---

## 🎬 Next Steps (Immediate Actions)

### Task 1: Fix Claude Analyzer Tests
**Priority:** P0 - CRITICAL  
**Estimated Time:** 30 minutes

**Problem:** Test mocks don't match Claude API response structure.

**Fix:**
```typescript
// Current (broken):
const mockResponse = {
  content: [{ type: "text", text: JSON.stringify(...) }]
};

// Need to fix src/__tests__/lib/claude-analyzer.test.ts
// Update all mocks to match real Anthropic SDK response format
```

**Steps:**
1. Review Anthropic SDK documentation for correct response structure
2. Update all 10 test cases with correct mock format
3. Re-run tests: `npm test src/__tests__/lib/claude-analyzer.test.ts`
4. Verify all pass ✅
5. Commit: `git commit -m "🧪 Fix Claude analyzer test mocks (10/10 passing)"`

### Task 2: Generate Coverage Report
**Priority:** P0 - CRITICAL  
**Estimated Time:** 10 minutes

**Steps:**
1. Run: `npm test -- --coverage`
2. Review coverage report (target: 90%+)
3. Identify untested files/functions
4. Create tasks for missing coverage

### Task 3: Complete BDD Step Definitions
**Priority:** P1 - HIGH  
**Estimated Time:** 4-6 hours

**Approach:**
- Implement one feature file at a time
- Start with `01-marketplace-scanning.feature` (most critical user flow)
- Use Playwright for browser automation in step defs
- Add visual assertions (screenshots)

**Example structure:**
```typescript
// features/step_definitions/marketplace-steps.ts
import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";

Given("I am logged in", async function() {
  await this.page.goto("/login");
  // ... login logic
});

When("I select {string} as the marketplace", async function(marketplace) {
  await this.page.selectOption("#marketplace-select", marketplace);
  await this.page.screenshot({ path: `screenshots/select-${marketplace}.png` });
});

Then("I should see a {string} progress indicator", async function(text) {
  const indicator = this.page.locator(`text=${text}`);
  await expect(indicator).toBeVisible();
});
```

---

## 📊 Success Metrics

**Production Ready Definition:**
- ✅ 100% of existing tests passing
- ✅ 90%+ code coverage (Jest)
- ✅ All BDD scenarios passing (Cucumber)
- ✅ All E2E flows tested (Playwright)
- ✅ Visual regression tests in place
- ✅ CI/CD pipeline running
- ✅ Deployed to production environment
- ✅ Zero critical bugs
- ✅ Performance benchmarks met (LCP < 2.5s, FID < 100ms)

---

## 🚀 Timeline Estimate

**Optimistic:** 3-4 days  
**Realistic:** 5-7 days  
**Conservative:** 10-14 days

**Breakdown:**
- Phase 1 (Fix Tests): 2-4 hours
- Phase 2 (BDD Steps): 6-8 hours
- Phase 3 (E2E Tests): 8-12 hours
- Phase 4 (CI/CD): 2-4 hours
- Phase 5 (Deploy): 4-8 hours
- Phase 6 (Monitoring): 2-4 hours

**Total:** 24-40 hours of focused work

---

## 📝 Notes

- **Playwright vs Cucumber:** Consider using Playwright Test exclusively instead of Cucumber if step definitions become too complex
- **Database:** SQLite is fine for MVP, but production needs PostgreSQL (or PlanetScale for serverless)
- **API Keys:** Need production Claude API key with higher rate limits
- **Marketplace APIs:** Some scrapers may need official APIs for production use (legal compliance)
- **User Auth:** Consider Clerk or Auth.js (NextAuth v5) for better DX

---

**Last Updated:** February 13, 2026 1:56 AM UTC  
**Next Review:** After Phase 1 completion
