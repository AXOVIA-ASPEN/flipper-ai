# Visual Regression Testing

## Overview

Visual regression tests use Playwright's `toHaveScreenshot()` API to capture and compare screenshots of key UI components and pages. This helps catch unintended visual changes automatically.

## Running Visual Tests

```bash
# Run all visual tests
npx playwright test e2e/visual/

# Run on specific browser
npx playwright test e2e/visual/ --project=chromium

# Run with UI (shows screenshots side-by-side)
npx playwright test e2e/visual/ --ui

# Run in headed mode (see browser)
npx playwright test e2e/visual/ --headed
```

## Updating Baselines

When you intentionally change the UI, update the baseline screenshots:

```bash
# Update all baselines
npx playwright test e2e/visual/ --update-snapshots

# Update specific test
npx playwright test e2e/visual/homepage.visual.spec.ts --update-snapshots

# Update only failed tests
npx playwright test e2e/visual/ --update-snapshots --only-changed
```

## Test Coverage

### ✅ Pages Covered

- **Homepage** (`homepage.visual.spec.ts`)
  - Full page (desktop)
  - Hero section
  - Mobile view
  
- **Authentication** (`auth.visual.spec.ts`)
  - Login page
  - Signup page
  - Login form component

- **Dashboard** (`dashboard.visual.spec.ts`)
  - Empty state
  - Sidebar navigation

- **Opportunities** (`opportunities.visual.spec.ts`)
  - Empty state
  - Opportunity card
  - Filters section

- **Settings** (`settings.visual.spec.ts`)
  - Account settings
  - API keys page
  - Notifications page
  - Settings tabs

### 🎯 Critical User Flows

1. **New User Journey** - Login → Dashboard → First Opportunity
2. **Marketplace Scan** - Dashboard → Start Scan → View Results
3. **Opportunity Analysis** - View Opportunity → AI Analysis → Take Action

## Configuration

Visual tests are configured in `playwright.config.ts`:

```typescript
use: {
  screenshot: 'only-on-failure', // For regular tests
  // Visual tests explicitly call toHaveScreenshot()
}
```

## Screenshot Storage

- **Baselines:** Stored in `e2e/visual/**/__screenshots__/` (committed to Git)
- **Actual:** Generated during test runs (not committed)
- **Diff:** Created when tests fail (not committed)

## CI/CD Integration

Visual tests run in GitHub Actions on every PR:

```yaml
- name: Run Visual Regression Tests
  run: npx playwright test e2e/visual/ --project=chromium
```

**Note:** Only Chromium screenshots are used in CI to reduce noise from browser rendering differences.

## Best Practices

### ✅ Do

- Disable animations: `animations: 'disabled'`
- Wait for network idle: `page.waitForLoadState('networkidle')`
- Use full page for layout tests: `fullPage: true`
- Test component-level for focused checks
- Cover both desktop and mobile viewports
- Commit baseline screenshots to Git

### ❌ Don't

- Screenshot dynamic content (timestamps, random data)
- Compare across different browsers (rendering differs)
- Test loading states (flaky)
- Include hover states (use separate interaction tests)

## Troubleshooting

### Test fails but screenshot looks identical

- Slight font rendering differences can cause failures
- Try: `--ignore-snapshots` to regenerate
- Check pixel tolerance in config if needed

### Screenshots differ between local and CI

- Ensure same OS (Linux in CI, may differ locally on macOS/Windows)
- Use Docker to match CI environment:
  ```bash
  npx playwright test --docker
  ```

### Baseline not found error

- Run with `--update-snapshots` to create initial baselines
- Make sure `e2e/visual/**/__screenshots__/` is committed

## Resources

- [Playwright Visual Comparisons Docs](https://playwright.dev/docs/test-snapshots)
- [Best Practices for Visual Testing](https://playwright.dev/docs/test-snapshots#best-practices)
- [Chromium vs WebKit vs Firefox Rendering Differences](https://caniuse.com/)

---

**Author:** Stephen Boyett  
**Company:** Axovia AI  
**Last Updated:** February 18, 2026
