# Flipper AI - BDD Test Suite

This directory contains all Behavior-Driven Development (BDD) tests for Flipper AI using Cucumber and Gherkin syntax.

## 📁 Structure

```
features/
├── README.md                           # This file
├── *.feature                           # Gherkin feature files
├── step_definitions/                   # Step implementations
│   ├── common-steps.ts                 # Shared steps (login, navigation)
│   ├── scanning-steps.ts               # TODO: Marketplace scanning
│   ├── analysis-steps.ts               # TODO: AI scoring
│   ├── communication-steps.ts          # TODO: Seller messaging
│   ├── listing-steps.ts                # TODO: Resale listing
│   ├── dashboard-steps.ts              # TODO: Dashboard interactions
│   ├── auth-steps.ts                   # TODO: Authentication
│   └── notification-steps.ts           # TODO: Notifications
└── support/                            # Test infrastructure
    ├── world.ts                        # Cucumber World (shared context)
    ├── hooks.ts                        # Before/After hooks
    └── fixtures/                       # Test data
        ├── users.json                  # Test user accounts
        ├── listings.json               # Sample listings
        └── opportunities.json          # TODO: Sample opportunities
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

This installs:

- `@cucumber/cucumber` - BDD test runner
- `@playwright/test` - Browser automation
- `chai` - Assertions

### 2. Run BDD Tests

```bash
# Run all BDD tests
npm run test:bdd

# Run with detailed output (development)
npm run test:bdd:dev

# Run in CI mode (for GitHub Actions)
npm run test:bdd:ci

# Run all tests (unit + BDD + E2E)
npm run test:all
```

### 3. Watch Mode (Auto-rerun on file changes)

```bash
npm run test:bdd:watch
```

## 📝 Writing Tests

### Feature Files (Gherkin)

Feature files use Gherkin syntax and describe behavior in plain English:

```gherkin
Feature: Multi-Marketplace Scanning
  As a flipper
  I want to scan multiple marketplaces
  So I can find flip opportunities

  Scenario: Scan eBay for electronics
    Given I am logged in as a free user
    When I navigate to the scanner page
    And I select "eBay" as the marketplace
    And I select "Electronics" as the category
    And I click "Start Scan"
    Then I should see scan results within 10 seconds
```

### Step Definitions (TypeScript)

Implement steps in `step_definitions/*.ts`:

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

When(
  'I select {string} as the marketplace',
  async function (this: CustomWorld, marketplace: string) {
    await this.page.selectOption('select[name="marketplace"]', marketplace);
    await this.screenshot(`selected-${marketplace}`);
  }
);
```

## 📸 Screenshots

Every significant interaction should capture a screenshot:

```typescript
// Automatically saved to screenshots/{scenario-name}/{step-name}.png
await this.screenshot('step-description');
```

Screenshots are organized by scenario and automatically captured on test failure.

## 🧪 Test Data

Use fixtures from `support/fixtures/*.json`:

```typescript
// Load test user
const user = this.loadFixture('users').free_user;

// Load listing
const listing = this.loadFixture('listings').underpriced_iphone;

// Seed database
await this.seedDatabase({
  listings: Object.values(this.loadFixture('listings')),
});
```

## 🏷️ Tags

Use tags to organize and filter tests:

```gherkin
@auth @critical
Scenario: Login with valid credentials
  # ...

@slow @integration
Scenario: Full flip workflow end-to-end
  # ...
```

Run specific tags:

```bash
# Run only @critical scenarios
npm run test:bdd -- --tags "@critical"

# Run everything except @slow
npm run test:bdd -- --tags "not @slow"
```

## 🔧 Debugging

### Run in Headed Mode

```bash
# See browser while tests run
HEADLESS=false npm run test:bdd:dev
```

### Enable Slow Motion

```bash
# Slow down interactions for debugging
SLOW_MO=100 npm run test:bdd:dev
```

### Record Videos

```bash
# Record videos of test runs
RECORD_VIDEO=true npm run test:bdd
```

Videos saved to `videos/` directory.

## 📊 Reports

After running tests, reports are generated:

- **HTML Report:** `reports/cucumber-report.html` (open in browser)
- **JSON Report:** `reports/cucumber-report.json` (for CI tools)
- **JUnit Report:** `reports/cucumber-report.xml` (for CI/CD)

## ✅ Current Status

| Feature              | Scenarios | Steps Implemented | Status      |
| -------------------- | --------- | ----------------- | ----------- |
| Marketplace Scanning | 5         | 🟡 Partial        | In Progress |
| AI Analysis          | 7         | ❌ None           | TODO        |
| Seller Communication | 7         | ❌ None           | TODO        |
| Resale Listing       | 6         | ❌ None           | TODO        |
| Dashboard & Tracking | 8         | ❌ None           | TODO        |
| User Auth & Billing  | 9         | ❌ None           | TODO        |
| Notifications        | 10        | ❌ None           | TODO        |

**Total:** 52 scenarios, ~200+ steps to implement

## 🎯 Next Steps

1. **Implement remaining step definitions** (see `TODO` above)
2. **Add more test fixtures** (opportunities, conversations)
3. **Set up visual regression testing** with Playwright screenshots
4. **Configure CI/CD pipeline** (GitHub Actions)
5. **Achieve 100% scenario pass rate**

## 📚 Resources

- [Cucumber.js Docs](https://github.com/cucumber/cucumber-js)
- [Playwright Test](https://playwright.dev)
- [Gherkin Reference](https://cucumber.io/docs/gherkin/reference/)
- [BDD Best Practices](https://cucumber.io/docs/bdd/)

---

**Questions?** See `docs/testing/BDD_TEST_PLAN.md` for the full testing strategy.
