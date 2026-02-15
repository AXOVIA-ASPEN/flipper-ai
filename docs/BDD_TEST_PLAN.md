# Flipper AI - BDD Test Plan

**Author:** ASPEN  
**Company:** Axovia AI  
**Created:** February 13, 2026  
**Status:** Ready for Implementation

---

## 📋 Overview

This document outlines the Behavior-Driven Development (BDD) testing strategy for Flipper AI using **Cucumber/Gherkin** feature files and **Playwright** for visual verification.

### Goals

1. **100% User Flow Coverage** — Every PRD feature has BDD scenarios
2. **Visual Verification** — Playwright screenshots for all UI interactions
3. **Production Readiness** — Comprehensive acceptance criteria before launch

---

## 🗂️ Feature Files

All feature files are located in `/features/` and follow Gherkin syntax:

| File                                  | Feature                            | Scenarios | Priority    |
| ------------------------------------- | ---------------------------------- | --------- | ----------- |
| `01-marketplace-scanning.feature`     | Multi-Marketplace Scanning         | 5         | 🔴 Critical |
| `02-ai-analysis.feature`              | AI Flippability Scoring            | 7         | 🔴 Critical |
| `03-seller-communication.feature`     | Automated Seller Communication     | 7         | 🟡 High     |
| `04-resale-listing.feature`           | Resale Listing Generator           | 6         | 🟡 High     |
| `05-dashboard-tracking.feature`       | Dashboard & Opportunity Tracking   | 8         | 🟡 High     |
| `06-user-auth-billing.feature`        | User Authentication & Billing      | 9         | 🟡 High     |
| `07-notifications-monitoring.feature` | Notifications & Listing Monitoring | 10        | 🟢 Medium   |

**Total Scenarios:** 52

---

## 🛠️ Tech Stack

### BDD Framework

- **Cucumber.js** — Gherkin parser and step runner
- **@cucumber/cucumber** — Official Node.js implementation
- **chai** — Assertion library

### E2E Testing

- **Playwright** — Browser automation
- **@playwright/test** — Test runner with visual regression
- **playwright-expect** — Built-in assertions

### CI/CD

- **GitHub Actions** — Automated test runs on PRs
- **Playwright Test Report** — HTML test results
- **Screenshot Artifacts** — Visual diff storage

---

## 📁 Project Structure

```
flipper-ai/
├── features/                          # Gherkin feature files
│   ├── 01-marketplace-scanning.feature
│   ├── 02-ai-analysis.feature
│   ├── 03-seller-communication.feature
│   ├── 04-resale-listing.feature
│   ├── 05-dashboard-tracking.feature
│   ├── 06-user-auth-billing.feature
│   └── 07-notifications-monitoring.feature
├── features/step_definitions/         # Step implementations
│   ├── common-steps.ts                # Shared steps (login, navigation)
│   ├── scanning-steps.ts              # Marketplace scanning steps
│   ├── analysis-steps.ts              # AI scoring steps
│   ├── communication-steps.ts         # Seller messaging steps
│   ├── listing-steps.ts               # Resale listing steps
│   ├── dashboard-steps.ts             # Dashboard interaction steps
│   ├── auth-steps.ts                  # Authentication steps
│   └── notification-steps.ts          # Notification steps
├── features/support/                  # Test helpers
│   ├── world.ts                       # Cucumber World (shared context)
│   ├── hooks.ts                       # Before/After hooks
│   ├── screenshots.ts                 # Screenshot utilities
│   └── fixtures/                      # Test data
│       ├── users.json
│       ├── listings.json
│       └── opportunities.json
├── e2e/                               # Playwright-only tests (existing)
│   ├── dashboard.spec.ts
│   ├── opportunities.spec.ts
│   └── scraper.spec.ts
├── tests/                             # Unit & integration tests
│   └── unit/
│       └── scrapers/
└── docs/
    └── BDD_TEST_PLAN.md               # This file
```

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install --save-dev @cucumber/cucumber @playwright/test
npm install --save-dev chai @types/chai
```

### 2. Configure Cucumber

Create `cucumber.js`:

```javascript
module.exports = {
  default: {
    require: ['features/step_definitions/**/*.ts'],
    requireModule: ['ts-node/register'],
    format: [
      'progress-bar',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json',
    ],
    formatOptions: { snippetInterface: 'async-await' },
    publishQuiet: true,
  },
};
```

### 3. Update `package.json`

```json
{
  "scripts": {
    "test:bdd": "cucumber-js",
    "test:bdd:watch": "cucumber-js --watch",
    "test:e2e": "playwright test",
    "test:all": "npm run test && npm run test:bdd && npm run test:e2e"
  }
}
```

### 4. Run Tests

```bash
# Run BDD tests
npm run test:bdd

# Run Playwright E2E tests
npm run test:e2e

# Run all tests (unit + BDD + E2E)
npm run test:all
```

---

## 📝 Writing Step Definitions

Example: `features/step_definitions/common-steps.ts`

```typescript
import { Given, When, Then, setDefaultTimeout } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

setDefaultTimeout(30 * 1000); // 30 seconds

Given('I am logged in as a free user', async function () {
  await this.page.goto('/login');
  await this.page.fill('[name="email"]', 'testuser@example.com');
  await this.page.fill('[name="password"]', 'TestPass123!');
  await this.page.click('button[type="submit"]');
  await this.page.waitForURL('/dashboard');

  // Take screenshot for visual verification
  await this.screenshot('logged-in-dashboard');
});

When('I navigate to the scanner page', async function () {
  await this.page.click('a[href="/scanner"]');
  await this.page.waitForURL('/scanner');
  await this.screenshot('scanner-page');
});

Then('I should see a {string} button', async function (buttonText: string) {
  const button = this.page.locator(`button:has-text("${buttonText}")`);
  await expect(button).toBeVisible();
  await this.screenshot(`button-${buttonText.replace(/\s+/g, '-').toLowerCase()}`);
});
```

---

## 📸 Visual Verification

Every significant UI interaction should capture a screenshot:

```typescript
// In features/support/world.ts
export class CustomWorld extends World {
  page!: Page;
  screenshots: string[] = [];

  async screenshot(name: string) {
    const path = `screenshots/${this.scenario.name}/${name}.png`;
    await this.page.screenshot({ path, fullPage: true });
    this.screenshots.push(path);
  }
}
```

---

## 🧪 Test Data Management

Use fixtures for consistent test data:

**`features/support/fixtures/listings.json`**

```json
{
  "underpriced_electronics": {
    "title": "iPhone 14 Pro - Like New",
    "price": 400,
    "category": "Electronics",
    "condition": "Excellent",
    "marketplace": "eBay",
    "expectedScore": 90
  },
  "risky_item": {
    "title": "MacBook Pro - needs battery replacement",
    "price": 200,
    "category": "Electronics",
    "condition": "For Parts",
    "marketplace": "Craigslist",
    "expectedScore": 55
  }
}
```

Load in step definitions:

```typescript
import listings from '../support/fixtures/listings.json';

Given('an eBay listing for an underpriced item', async function () {
  const listing = listings.underpriced_electronics;
  await this.db.listing.create({ data: listing });
});
```

---

## ⚙️ CI/CD Integration

**`.github/workflows/bdd-tests.yml`**

```yaml
name: BDD Tests

on: [push, pull_request]

jobs:
  bdd:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run BDD tests
        run: npm run test:bdd

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: cucumber-report
          path: reports/

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-screenshots
          path: screenshots/
```

---

## 📊 Coverage Goals

| Category           | Target | Status                  |
| ------------------ | ------ | ----------------------- |
| Feature Coverage   | 100%   | ⏳ 52 scenarios defined |
| Step Definitions   | 100%   | ⏳ To implement         |
| Visual Screenshots | 100%   | ⏳ To capture           |
| E2E Flows          | 100%   | ⏳ To automate          |

---

## 🎯 Next Steps

### Phase 1: Step Definitions (Week 1)

- [ ] Implement `common-steps.ts` (login, navigation)
- [ ] Implement `scanning-steps.ts`
- [ ] Implement `analysis-steps.ts`
- [ ] Set up screenshot utilities

### Phase 2: Core Flows (Week 2)

- [ ] Implement `communication-steps.ts`
- [ ] Implement `dashboard-steps.ts`
- [ ] Create test fixtures (users, listings)
- [ ] Wire up database seeding

### Phase 3: Advanced Features (Week 3)

- [ ] Implement `listing-steps.ts`
- [ ] Implement `auth-steps.ts`
- [ ] Implement `notification-steps.ts`
- [ ] Set up CI/CD pipeline

### Phase 4: Visual Regression (Week 4)

- [ ] Capture baseline screenshots for all scenarios
- [ ] Set up Playwright visual comparison
- [ ] Document screenshot library
- [ ] Final review & sign-off

---

## 📚 Resources

- [Cucumber.js Docs](https://github.com/cucumber/cucumber-js)
- [Playwright Test Docs](https://playwright.dev)
- [Gherkin Reference](https://cucumber.io/docs/gherkin/reference/)
- [BDD Best Practices](https://cucumber.io/docs/bdd/)

---

_Created by ASPEN — Driving Flipper AI to production readiness_
