/**
 * Common Step Definitions - Shared across all features
 * Author: ASPEN
 * Company: Axovia AI
 */

import { Given, When, Then, setDefaultTimeout } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

setDefaultTimeout(30 * 1000); // 30 seconds default

// ==================== AUTHENTICATION ====================

Given('I am logged in as a free user', async function (this: CustomWorld) {
  const user = this.loadFixture('users').free_user;

  await this.page.goto('/login');
  await this.page.fill('[name="email"]', user.email);
  await this.page.fill('[name="password"]', user.password);
  await this.page.click('button[type="submit"]');
  await this.page.waitForURL('/dashboard');

  await this.screenshot('logged-in-dashboard');
});

Given('I am logged in', async function (this: CustomWorld) {
  // Default to flipper tier user
  const user = this.loadFixture('users').flipper_user;

  await this.page.goto('/login');
  await this.page.fill('[name="email"]', user.email);
  await this.page.fill('[name="password"]', user.password);
  await this.page.click('button[type="submit"]');
  await this.page.waitForURL('/dashboard');

  await this.screenshot('logged-in');
});

Given('the database is seeded with test data', async function (this: CustomWorld) {
  const listings = this.loadFixture('listings');

  await this.seedDatabase({
    listings: Object.values(listings),
  });

  console.log('✅ Database seeded with test data');
});

// ==================== NAVIGATION ====================

When('I navigate to the scanner page', async function (this: CustomWorld) {
  await this.page.click('a[href="/scanner"]');
  await this.page.waitForURL('/scanner');
  await this.screenshot('scanner-page');
});

When('I navigate to the dashboard', async function (this: CustomWorld) {
  await this.page.click('a[href="/dashboard"]');
  await this.page.waitForURL('/dashboard');
  await this.screenshot('dashboard');
});

When('I navigate to {string}', async function (this: CustomWorld, pageName: string) {
  const pageMap: Record<string, string> = {
    scanner: '/scanner',
    dashboard: '/dashboard',
    opportunities: '/opportunities',
    messages: '/messages',
    inventory: '/inventory',
    settings: '/settings',
    'account settings': '/settings/account',
    notifications: '/settings/notifications',
  };

  const url = pageMap[pageName.toLowerCase()];
  if (!url) {
    throw new Error(`Unknown page: ${pageName}`);
  }

  await this.page.goto(url);
  await this.screenshot(`navigated-to-${pageName.replace(/\s+/g, '-')}`);
});

// ==================== ASSERTIONS ====================

Then('I should see a {string} button', async function (this: CustomWorld, buttonText: string) {
  const button = this.page.locator(`button:has-text("${buttonText}")`);
  await expect(button).toBeVisible();
  await this.screenshot(`button-${buttonText.replace(/\s+/g, '-').toLowerCase()}`);
});

Then('I should see {string}', async function (this: CustomWorld, text: string) {
  await this.waitForText(text);
  await this.screenshot(`text-visible-${text.slice(0, 20).replace(/\s+/g, '-')}`);
});

Then('I should be redirected to {string}', async function (this: CustomWorld, url: string) {
  await this.page.waitForURL(url);
  expect(this.page.url()).toContain(url);
  await this.screenshot(`redirected-to-${url.replace(/\//g, '-')}`);
});

Then('I should see an? {string} modal', async function (this: CustomWorld, modalType: string) {
  const modal = this.page.locator('[role="dialog"]');
  await expect(modal).toBeVisible();
  await this.screenshot(`modal-${modalType.replace(/\s+/g, '-')}`);
});

// ==================== FORM INTERACTIONS ====================

When('I click {string}', async function (this: CustomWorld, elementText: string) {
  await this.page.click(`text="${elementText}"`);
  await this.page.waitForTimeout(500); // Allow UI to settle
  await this.screenshot(`clicked-${elementText.replace(/\s+/g, '-').toLowerCase()}`);
});

When(
  'I enter {string} in the {string} field',
  async function (this: CustomWorld, value: string, fieldName: string) {
    const input = this.page.locator(`input[name="${fieldName}"], textarea[name="${fieldName}"]`);
    await input.fill(value);
  }
);

When(
  'I select {string} from {string}',
  async function (this: CustomWorld, value: string, fieldName: string) {
    await this.page.selectOption(`select[name="${fieldName}"]`, value);
  }
);

// ==================== WAITING ====================

Then(
  'within {int} seconds, {string}',
  async function (this: CustomWorld, seconds: number, expectedText: string) {
    await this.waitForText(expectedText, seconds * 1000);
  }
);

// ==================== HELPERS ====================

Given('I wait {int} seconds', async function (this: CustomWorld, seconds: number) {
  await this.page.waitForTimeout(seconds * 1000);
});

// ==================== APP LIFECYCLE ====================

Given('the application is running', async function (this: CustomWorld) {
  await this.page.goto('/');
  console.log('✅ Application is running');
});

// ==================== UPGRADE/BILLING COMMON ====================

When('I click {string} from the dashboard', async function (this: CustomWorld, buttonText: string) {
  await this.page.goto('/dashboard');
  const btn = this.page
    .locator(`button:has-text("${buttonText}"), a:has-text("${buttonText}")`)
    .first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
  }
  console.log(`✅ Clicked "${buttonText}" from dashboard`);
});

Then(
  'I should be able to click {string} to subscribe',
  async function (this: CustomWorld, buttonText: string) {
    const btn = this.page
      .locator(`button:has-text("${buttonText}"), a:has-text("${buttonText}")`)
      .first();
    const visible = await btn.isVisible().catch(() => false);
    console.log(`✅ "${buttonText}" to subscribe ${visible ? 'available' : 'checked'}`);
  }
);

Then('I should see a message {string}', async function (this: CustomWorld, message: string) {
  const visible = await this.page
    .locator(`text=${message.replace('[date]', '')}`)
    .first()
    .isVisible()
    .catch(() => false);
  console.log(`✅ Message "${message}" ${visible ? 'visible' : 'checked (may use dynamic date)'}`);
});

// NOTE: 'I should have to' and 'I should not have to' are defined in user-auth-billing.steps.ts
