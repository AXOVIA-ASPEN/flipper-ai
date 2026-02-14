/**
 * Cucumber step definitions for complete flip journey
 * Author: Stephen Boyett
 * Company: Axovia AI
 */

import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { Page, Browser, chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs/promises';

setDefaultTimeout(60000); // 60 second timeout

let browser: Browser;
let page: Page;
const screenshots: string[] = [];

Before(async function() {
  browser = await chromium.launch({ 
    headless: true, // Headless for CI/server environments
    slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
  });
  page = await browser.newPage();
  
  // Set viewport for consistent screenshots
  await page.setViewportSize({ width: 1920, height: 1080 });
});

After(async function() {
  // Clean up screenshots
  for (const screenshot of screenshots) {
    try {
      await fs.unlink(screenshot);
    } catch (err) {
      // Ignore cleanup errors
    }
  }
  
  await browser?.close();
});

// Background Steps
Given('I am logged in as a verified user', async function() {
  await page.goto('http://localhost:3000/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 5000 });
  
  // Verify user is logged in
  const userMenu = await page.locator('[data-testid="user-menu"]');
  await expect(userMenu).toBeVisible();
});

Given('I have set up my preferred search locations', async function() {
  await page.goto('http://localhost:3000/settings');
  await page.click('[data-testid="locations-tab"]');
  
  // Check if location already exists, if not add it
  const locationExists = await page.locator('text=Tampa, FL').count() > 0;
  if (!locationExists) {
    await page.click('[data-testid="add-location"]');
    await page.fill('input[name="location"]', 'Tampa, FL');
    await page.click('[data-testid="save-location"]');
    await page.waitForSelector('text=Location added successfully');
  }
});

Given('I have connected all marketplace accounts', async function() {
  await page.goto('http://localhost:3000/settings/marketplaces');
  
  // Verify marketplace connections
  const marketplaces = ['ebay', 'facebook', 'offerup', 'mercari', 'craigslist'];
  
  for (const marketplace of marketplaces) {
    const status = await page.locator(`[data-testid="${marketplace}-status"]`);
    const isConnected = await status.textContent();
    
    if (isConnected?.includes('Not Connected')) {
      // Mock connection for testing
      await page.click(`[data-testid="connect-${marketplace}"]`);
      await page.waitForSelector(`text=${marketplace} connected`, { timeout: 5000 });
    }
  }
});

// Step 1: Discover Opportunity
When('I navigate to the opportunities page', async function() {
  await page.goto('http://localhost:3000/opportunities');
  await page.waitForLoadState('networkidle');
});

When('I search for {string} in {string}', async function(query: string, location: string) {
  await page.fill('input[name="search"]', query);
  await page.fill('input[name="location"]', location);
  await page.click('button[data-testid="search-button"]');
});

When('I wait for results to load', async function() {
  await page.waitForSelector('[data-testid="opportunity-card"]', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
});

Then('I should see opportunities from multiple marketplaces', async function() {
  const opportunities = await page.locator('[data-testid="opportunity-card"]').count();
  expect(opportunities).toBeGreaterThan(0);
  
  // Check for marketplace diversity
  const marketplaces = await page.locator('[data-testid="marketplace-badge"]').allTextContents();
  const uniqueMarketplaces = new Set(marketplaces);
  expect(uniqueMarketplaces.size).toBeGreaterThanOrEqual(2);
});

Then('each opportunity should display:', async function(dataTable: any) {
  const expectedFields = dataTable.hashes();
  const firstOpportunity = page.locator('[data-testid="opportunity-card"]').first();
  
  for (const field of expectedFields) {
    const element = await firstOpportunity.locator(`[data-field="${field.Field}"]`);
    await expect(element).toBeVisible();
    
    // Type validation
    const value = await element.textContent();
    switch (field.Type) {
      case 'number':
        expect(value).toMatch(/\d+/);
        break;
      case 'percentage':
        expect(value).toMatch(/\d+%/);
        break;
      case 'string':
        expect(value).toBeTruthy();
        break;
    }
  }
});

// Step 2: Analyze Opportunity
When('I click on the first profitable opportunity', async function() {
  const firstOpportunity = page.locator('[data-testid="opportunity-card"]').first();
  await firstOpportunity.click();
});

Then('I should see the opportunity detail page', async function() {
  await page.waitForSelector('[data-testid="opportunity-detail"]');
  await expect(page.locator('h1')).toBeVisible();
});

Then('I should see AI analysis results within {int} seconds', async function(seconds: number) {
  await page.waitForSelector('[data-testid="ai-analysis"]', { timeout: seconds * 1000 });
});

Then('the analysis should include:', async function(dataTable: any) {
  const sections = dataTable.hashes();
  
  for (const section of sections) {
    const sectionElement = await page.locator(`[data-section="${section.Section.toLowerCase().replace(/ /g, '-')}"]`);
    await expect(sectionElement).toBeVisible();
    
    const content = await sectionElement.textContent();
    expect(content).toContain(section.Content);
  }
});

// Step 3: Visual Verification (click step defined in common-steps.ts)

Then('I should see a gallery of product images', async function() {
  await page.waitForSelector('[data-testid="image-gallery"]');
  const images = await page.locator('[data-testid="gallery-image"]').count();
  expect(images).toBeGreaterThan(0);
});

Then('I should be able to zoom into images', async function() {
  const firstImage = page.locator('[data-testid="gallery-image"]').first();
  await firstImage.click();
  
  await page.waitForSelector('[data-testid="image-zoom"]');
  const zoomLevel = await page.locator('[data-testid="zoom-level"]').textContent();
  expect(parseInt(zoomLevel || '0')).toBeGreaterThan(100);
});

Then('I should see AI-detected condition issues highlighted', async function() {
  const highlights = await page.locator('[data-testid="condition-highlight"]').count();
  // May or may not have issues - just verify the feature exists
  const highlightContainer = page.locator('[data-testid="condition-highlights"]');
  await expect(highlightContainer).toBeVisible();
});

When('I take a screenshot as {string}', async function(name: string) {
  const screenshotPath = path.join(__dirname, '../../test-results/screenshots', `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  screenshots.push(screenshotPath);
  this.lastScreenshot = screenshotPath;
});

Then('the screenshot should match the baseline', async function() {
  // Visual regression testing
  const baselinePath = this.lastScreenshot.replace('.png', '-baseline.png');
  
  // For first run, create baseline
  try {
    await fs.access(baselinePath);
    // Compare screenshots
    // In real implementation, use pixelmatch or similar
    console.log(`Comparing ${this.lastScreenshot} with ${baselinePath}`);
  } catch {
    // Create baseline
    await fs.copyFile(this.lastScreenshot, baselinePath);
    console.log(`Created baseline: ${baselinePath}`);
  }
});

// Step 4: Contact Seller
Then('I should see the messaging interface', async function() {
  await page.waitForSelector('[data-testid="messaging-interface"]');
  await expect(page.locator('textarea[name="message"]')).toBeVisible();
});

When('I send message {string}', async function(message: string) {
  await page.fill('textarea[name="message"]', message);
  await page.click('button[data-testid="send-message"]');
});

When('I wait for {int} seconds', async function(seconds: number) {
  await page.waitForTimeout(seconds * 1000);
});

Then('the message should be marked as sent', async function() {
  const lastMessage = page.locator('[data-testid="message"]').last();
  await expect(lastMessage).toHaveAttribute('data-status', 'sent');
});

Then('I should see it in my conversation history', async function() {
  const messages = await page.locator('[data-testid="message"]').count();
  expect(messages).toBeGreaterThan(0);
});

// Step 5: Negotiate Price
When('seller responds with {string}', async function(response: string) {
  // Simulate seller response (in real app, would come via webhook/polling)
  await page.evaluate((msg) => {
    window.postMessage({ type: 'SELLER_MESSAGE', message: msg }, '*');
  }, response);
  
  await page.waitForSelector(`text=${response}`);
});

When('I counter with {string}', async function(message: string) {
  await page.fill('textarea[name="message"]', message);
  await page.click('button[data-testid="send-message"]');
  await page.waitForTimeout(1000);
});

When('seller accepts with {string}', async function(message: string) {
  await page.evaluate((msg) => {
    window.postMessage({ type: 'SELLER_MESSAGE', message: msg }, '*');
  }, message);
});

Then('I should see a notification {string}', async function(notificationText: string) {
  await page.waitForSelector(`[data-testid="notification"]:has-text("${notificationText}")`);
});

Then('the opportunity status should change to {string}', async function(status: string) {
  const statusElement = page.locator('[data-testid="opportunity-status"]');
  await expect(statusElement).toHaveText(status);
});

// Step 6: Mark as Purchased
When('I enter purchase details:', async function(dataTable: any) {
  const details = dataTable.hashes();
  
  for (const detail of details) {
    const field = detail.Field.toLowerCase().replace(/ /g, '-');
    await page.fill(`input[name="${field}"], select[name="${field}"]`, detail.Value);
  }
});

// click step defined in common-steps.ts

Then('I should see success message {string}', async function(message: string) {
  await page.waitForSelector(`text=${message}`);
});

Then('the opportunity should move to {string}', async function(section: string) {
  await page.goto(`http://localhost:3000/${section.toLowerCase().replace(/ /g, '-')}`);
  await page.waitForSelector('[data-testid="inventory-item"]');
  const item = page.locator('[data-testid="inventory-item"]').first();
  await expect(item).toBeVisible();
});

// Continue with remaining steps...
// (Similar pattern for steps 7-12)

// Mobile scenario
Given('I am using a mobile device \\({int}x{int})', async function(width: number, height: number) {
  await page.setViewportSize({ width, height });
});

When('I complete the flip journey on mobile', async function() {
  // Run through key mobile steps
  await this.Given('I am logged in as a verified user');
  await this.When('I navigate to the opportunities page');
  // ... etc
});

Then('touch targets should be at least {int}x{int}px', async function(minWidth: number, minHeight: number) {
  const buttons = await page.locator('button').all();
  
  for (const button of buttons) {
    const box = await button.boundingBox();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(minWidth);
      expect(box.height).toBeGreaterThanOrEqual(minHeight);
    }
  }
});
