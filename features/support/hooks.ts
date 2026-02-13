/**
 * Cucumber Hooks - Before/After test setup and teardown
 * Author: ASPEN
 * Company: Axovia AI
 */

import { Before, After, BeforeAll, AfterAll, Status } from '@cucumber/cucumber';
import { chromium, Browser } from '@playwright/test';
import { CustomWorld } from './world';

let browser: Browser;

BeforeAll(async function () {
  // Launch browser once for all tests
  browser = await chromium.launch({
    headless: process.env.CI === 'true', // Headless in CI, headed locally
    slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
  });
  console.log('🚀 Browser launched');
});

AfterAll(async function () {
  // Close browser after all tests
  if (browser) {
    await browser.close();
    console.log('🛑 Browser closed');
  }
});

Before(async function (this: CustomWorld, { pickle }) {
  // Create a new browser context for each scenario (isolation)
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: process.env.RECORD_VIDEO
      ? { dir: 'videos/' }
      : undefined,
  });

  // Create a new page
  this.page = await context.newPage();
  this.browser = browser;

  console.log(`\n📋 Starting scenario: ${pickle.name}`);

  // Optional: Set up auth state if needed
  // await context.addCookies([...]); // Load saved auth cookies
});

After(async function (this: CustomWorld, { result, pickle }) {
  const scenarioName = pickle.name;
  const status = result?.status || Status.UNKNOWN;

  console.log(`\n✅ Scenario "${scenarioName}" ${status}`);

  // Take a failure screenshot if the test failed
  if (status === Status.FAILED) {
    await this.screenshot('FAILURE');
    console.error(`❌ Test failed: ${scenarioName}`);
  }

  // Log all screenshots taken during the scenario
  if (this.screenshots.length > 0) {
    console.log(`📸 Screenshots (${this.screenshots.length}):`);
    this.screenshots.forEach((path) => console.log(`   - ${path}`));
  }

  // Close the page and context
  if (this.page) {
    await this.page.context().close();
  }

  // Disconnect from database
  await this.db.$disconnect();
});

// Optional: Tag-based hooks
Before({ tags: '@auth' }, async function (this: CustomWorld) {
  // Auto-login for scenarios tagged with @auth
  console.log('🔐 Auto-login enabled for @auth scenario');
  
  await this.page.goto('/login');
  await this.page.fill('[name="email"]', 'testuser@example.com');
  await this.page.fill('[name="password"]', 'TestPass123!');
  await this.page.click('button[type="submit"]');
  await this.page.waitForURL('/dashboard');
  
  await this.screenshot('auto-login');
});

Before({ tags: '@slow' }, function () {
  // Increase timeout for scenarios tagged with @slow
  this.setDefaultTimeout(60 * 1000); // 60 seconds
});
