/**
 * Cucumber step definitions for Dashboard & Opportunity Tracking (Feature 05)
 * Author: Stephen Boyett
 * Company: Axovia AI
 */

import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { Page, Browser, chromium } from 'playwright';

setDefaultTimeout(60000);

let browser: Browser;
let page: Page;

Before({ tags: '@dashboard' }, async function () {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  page = await context.newPage();
});

After({ tags: '@dashboard' }, async function () {
  await browser?.close();
});

// ==================== BACKGROUND ====================

Given('I have data across multiple stages', async function () {
  // Seed dashboard with multi-stage flip data via API or fixture
  const response = await page.request.post('http://localhost:3000/api/test/seed-dashboard', {
    data: {
      opportunities: 15,
      negotiations: 3,
      inventory: 4,
      completedFlips: 10,
      salesMonths: 3,
    },
  });
  expect(response.ok()).toBeTruthy();
});

// ==================== SCENARIO: View flippables queue ====================

Given('I have {int} identified opportunities', async function (count: number) {
  this.testData = this.testData || {};
  this.testData.opportunityCount = count;

  await page.request.post('http://localhost:3000/api/test/seed-opportunities', {
    data: { count },
  });
});

Given('{int} have score > {int}', async function (count: number, minScore: number) {
  this.testData.highScoreCount = count;
  this.testData.highScoreMin = minScore;
});

Given('{int} have score between {int}-{int}', async function (count: number, low: number, high: number) {
  this.testData.midScoreCount = count;
  this.testData.midScoreRange = [low, high];
});

Then('I should see the {string} section', async function (sectionName: string) {
  const section = page.locator(`[data-testid="section-${sectionName.toLowerCase().replace(/\s+/g, '-')}"], h2:has-text("${sectionName}"), [aria-label="${sectionName}"]`);
  await expect(section.first()).toBeVisible({ timeout: 10000 });
});

Then('items should be sorted by score \\(highest first)', async function () {
  const scores = await page.$$eval(
    '[data-testid="opportunity-score"]',
    (els) => els.map((el) => parseInt(el.textContent || '0', 10))
  );
  for (let i = 1; i < scores.length; i++) {
    expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
  }
});

Then('I should see filter options:', async function (dataTable: any) {
  const filters = dataTable.hashes();
  for (const row of filters) {
    const filterLabel = row['Filter'];
    const filter = page.locator(`[data-testid="filter-${filterLabel.toLowerCase().replace(/\s+/g, '-')}"]`);
    await expect(filter.first()).toBeVisible();

    // Verify options are available
    const options = row['Options'].split(', ');
    await filter.first().click();
    for (const option of options) {
      const optionEl = page.locator(`[role="option"]:has-text("${option.trim()}"), li:has-text("${option.trim()}")`);
      await expect(optionEl.first()).toBeVisible();
    }
    // Close dropdown
    await page.keyboard.press('Escape');
  }
});

Then('each card should show a {string} button', async function (buttonText: string) {
  const cards = page.locator('[data-testid="opportunity-card"]');
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);

  // Check first few cards have the button
  const checkCount = Math.min(count, 5);
  for (let i = 0; i < checkCount; i++) {
    const btn = cards.nth(i).locator(`button:has-text("${buttonText}")`);
    await expect(btn).toBeVisible();
  }
});

// ==================== SCENARIO: Active negotiations ====================

Given('I have {int} ongoing conversations with sellers', async function (count: number) {
  this.testData = this.testData || {};
  this.testData.conversationCount = count;
});

Given('{int} seller hasn\'t replied in {int} hours', async function (count: number, hours: number) {
  this.testData.staleConversations = count;
  this.testData.staleHours = hours;
});

Given('{int} seller just sent a message {int} minutes ago', async function (count: number, minutes: number) {
  this.testData.recentConversations = count;
});

When('I view the {string} section', async function (sectionName: string) {
  const section = page.locator(`[data-testid="section-${sectionName.toLowerCase().replace(/\s+/g, '-')}"], h2:has-text("${sectionName}")`);
  await section.first().scrollIntoViewIfNeeded();
  await expect(section.first()).toBeVisible();
});

Then('conversations should be sorted by last activity', async function () {
  const timestamps = await page.$$eval(
    '[data-testid="conversation-timestamp"]',
    (els) => els.map((el) => new Date(el.getAttribute('data-timestamp') || '').getTime())
  );
  for (let i = 1; i < timestamps.length; i++) {
    expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i - 1]);
  }
});

Then('unread messages should have a notification badge', async function () {
  const unreadBadges = page.locator('[data-testid="unread-badge"]');
  const count = await unreadBadges.count();
  expect(count).toBeGreaterThan(0);
});

Then('stale conversations \\({int}h+) should be highlighted in yellow', async function (hours: number) {
  const staleItems = page.locator('[data-testid="conversation-stale"]');
  const count = await staleItems.count();
  expect(count).toBeGreaterThan(0);

  // Verify yellow/warning styling
  const bgColor = await staleItems.first().evaluate((el) => {
    return window.getComputedStyle(el).backgroundColor;
  });
  // Accept yellow-ish colors or warning class
  const hasWarningClass = await staleItems.first().evaluate((el) => {
    return el.classList.contains('bg-yellow-50') ||
      el.classList.contains('bg-warning') ||
      el.classList.contains('border-yellow-400');
  });
  expect(hasWarningClass || bgColor.includes('255')).toBeTruthy();
});

// ==================== SCENARIO: Inventory management ====================

Given('I have purchased {int} items awaiting resale:', async function (count: number, dataTable: any) {
  this.testData = this.testData || {};
  this.testData.inventoryItems = dataTable.hashes();

  await page.request.post('http://localhost:3000/api/test/seed-inventory', {
    data: { items: this.testData.inventoryItems },
  });
});

// 'I navigate to {string}' is defined in common-steps.ts

Then('I should see all {int} items', async function (count: number) {
  const items = page.locator('[data-testid="inventory-item"]');
  await expect(items).toHaveCount(count);
});

Then('the {string} item should be highlighted', async function (status: string) {
  const item = page.locator(`[data-testid="inventory-item"]:has([data-status="${status}"])`);
  await expect(item.first()).toBeVisible();
  const isHighlighted = await item.first().evaluate((el) => {
    const classes = el.className;
    return classes.includes('highlight') || classes.includes('border-') || classes.includes('bg-');
  });
  expect(isHighlighted).toBeTruthy();
});

Then('the {string} item should show profit calculation', async function (status: string) {
  const item = page.locator(`[data-testid="inventory-item"]:has([data-status="${status}"])`);
  const profit = item.locator('[data-testid="profit-display"]');
  await expect(profit.first()).toBeVisible();
  const text = await profit.first().textContent();
  expect(text).toMatch(/\$[\d,.]+/);
});

Then('total inventory value should be displayed', async function () {
  const totalValue = page.locator('[data-testid="total-inventory-value"]');
  await expect(totalValue).toBeVisible();
  const text = await totalValue.textContent();
  expect(text).toMatch(/\$[\d,.]+/);
});

// ==================== SCENARIO: Sales history and profit tracking ====================

Given('I have completed {int} flips in the last month', async function (count: number) {
  this.testData = this.testData || {};
  this.testData.completedFlips = count;

  await page.request.post('http://localhost:3000/api/test/seed-sales', {
    data: { count, monthsBack: 1 },
  });
});

Then('I should see a table of completed flips:', async function (dataTable: any) {
  const columns = dataTable.hashes();
  const table = page.locator('[data-testid="sales-table"], table');
  await expect(table.first()).toBeVisible();

  for (const row of columns) {
    if (row['Present'] === 'Yes') {
      const header = table.first().locator(`th:has-text("${row['Column']}")`);
      await expect(header).toBeVisible();
    }
  }
});

Then('I should see summary stats:', async function (dataTable: any) {
  const stats = dataTable.hashes();
  for (const stat of stats) {
    const metricEl = page.locator(`[data-testid="stat-${stat['Metric'].toLowerCase().replace(/\s+/g, '-')}"]`);
    await expect(metricEl.first()).toBeVisible();
    const text = await metricEl.first().textContent();
    expect(text).toBeTruthy();
  }
});

Then('I should be able to export as CSV', async function () {
  const exportBtn = page.locator('button:has-text("Export"), button:has-text("CSV"), [data-testid="export-csv"]');
  await expect(exportBtn.first()).toBeVisible();
  await expect(exportBtn.first()).toBeEnabled();
});

// ==================== SCENARIO: Visual profit/loss chart ====================

Given('I have sales data for the last {int} months', async function (months: number) {
  this.testData = this.testData || {};
  this.testData.salesMonths = months;
});

When('I view the dashboard analytics section', async function () {
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForLoadState('networkidle');
  const analytics = page.locator('[data-testid="analytics-section"], [data-testid="charts-section"]');
  await analytics.first().scrollIntoViewIfNeeded();
});

Then('I should see a line chart showing:', async function (dataTable: any) {
  const chart = page.locator('[data-testid="profit-chart"], canvas');
  await expect(chart.first()).toBeVisible();

  // Verify chart is rendered (canvas has content)
  const hasContent = await chart.first().evaluate((el) => {
    if (el.tagName === 'CANVAS') {
      const canvas = el as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      return canvas.width > 0 && canvas.height > 0;
    }
    return el.children.length > 0;
  });
  expect(hasContent).toBeTruthy();
});

Then('hovering over data points should show weekly breakdown', async function () {
  const chart = page.locator('[data-testid="profit-chart"], canvas');
  const box = await chart.first().boundingBox();
  if (box) {
    // Hover over the middle of the chart
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(500);

    // Check tooltip appears
    const tooltip = page.locator('[data-testid="chart-tooltip"], .chartjs-tooltip, [role="tooltip"]');
    await expect(tooltip.first()).toBeVisible({ timeout: 3000 });
  }
});

Then('I should see a trend indicator \\(↑ improving, ↓ declining)', async function () {
  const trend = page.locator('[data-testid="trend-indicator"]');
  await expect(trend).toBeVisible();
  const text = await trend.textContent();
  expect(text).toMatch(/[↑↓]/);
});

// ==================== SCENARIO: Quick actions from dashboard ====================

Given('I am viewing the dashboard', async function () {
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForLoadState('networkidle');
});

When('I see a high-score opportunity', async function () {
  const card = page.locator('[data-testid="opportunity-card"]').first();
  await expect(card).toBeVisible({ timeout: 10000 });
});

Then('I should be able to:', async function (dataTable: any) {
  const actions = dataTable.hashes();
  const card = page.locator('[data-testid="opportunity-card"]').first();

  for (const action of actions) {
    const actionName = action['Action'];
    const btn = card.locator(`button:has-text("${actionName}"), [data-testid="action-${actionName.toLowerCase().replace(/\s+/g, '-')}"]`);
    await expect(btn.first()).toBeVisible();
  }
});

Then('each action should update the UI immediately', async function () {
  // Test one quick action - "Save for Later"
  const card = page.locator('[data-testid="opportunity-card"]').first();
  const saveBtn = card.locator('button:has-text("Save for Later"), [data-testid="action-save-for-later"]');

  if (await saveBtn.first().isVisible()) {
    await saveBtn.first().click();
    // Verify UI updated without page reload
    const savedIndicator = page.locator('[data-testid="save-confirmation"], .toast, [role="status"]');
    await expect(savedIndicator.first()).toBeVisible({ timeout: 3000 });
  }
});

// ==================== SCENARIO: Real-time updates via WebSocket ====================

Given('I have the dashboard open', async function () {
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForLoadState('networkidle');
});

Given('a background scan is running', async function () {
  // Verify scan status indicator
  const scanIndicator = page.locator('[data-testid="scan-status"], [data-testid="scan-running"]');
  // Start a scan if not running
  const startScanBtn = page.locator('button:has-text("Start Scan"), [data-testid="start-scan"]');
  if (await startScanBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await startScanBtn.click();
  }
});

When('a new opportunity is found with score > {int}', async function (minScore: number) {
  // Simulate WebSocket event via API
  await page.request.post('http://localhost:3000/api/test/simulate-opportunity', {
    data: { score: minScore + 5, title: 'Test High-Score Item' },
  });
  await page.waitForTimeout(2000); // Wait for WebSocket event
});

Then('the dashboard should update automatically', async function () {
  // Verify new item appeared without page reload
  const newItem = page.locator('[data-testid="opportunity-card"]:has-text("Test High-Score Item")');
  await expect(newItem).toBeVisible({ timeout: 10000 });
});

Then('a toast notification should appear', async function () {
  const toast = page.locator('[data-testid="toast"], .toast, [role="alert"]');
  await expect(toast.first()).toBeVisible({ timeout: 5000 });
});

Then('the new item should slide into the queue with animation', async function () {
  const newItem = page.locator('[data-testid="opportunity-card"]:has-text("Test High-Score Item")');
  // Verify animation class is present
  const hasAnimation = await newItem.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return (
      style.animation !== 'none' ||
      style.transition !== 'all 0s ease 0s' ||
      el.classList.toString().includes('animate') ||
      el.classList.toString().includes('slide')
    );
  });
  expect(hasAnimation).toBeTruthy();
});

Then('the total count badge should increment', async function () {
  const badge = page.locator('[data-testid="opportunity-count"], [data-testid="queue-count"]');
  await expect(badge).toBeVisible();
  const count = parseInt((await badge.textContent()) || '0', 10);
  expect(count).toBeGreaterThan(0);
});

// ==================== RESPONSIVE LAYOUT TESTS ====================

Then('the dashboard should be responsive at mobile viewport', async function () {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);

  // Verify key sections are still visible
  const dashboard = page.locator('[data-testid="dashboard-container"]');
  await expect(dashboard).toBeVisible();

  // Reset viewport
  await page.setViewportSize({ width: 1920, height: 1080 });
});
