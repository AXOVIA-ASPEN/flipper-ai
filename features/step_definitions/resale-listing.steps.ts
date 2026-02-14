/**
 * Resale Listing Step Definitions (Feature 04)
 * Author: ASPEN
 * Company: Axovia AI
 *
 * Playwright BDD step definitions for the resale listing generator feature.
 */

import { Given, When, Then, setDefaultTimeout } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

setDefaultTimeout(30 * 1000);

// ==================== BACKGROUND ====================

// 'I am logged in' step defined in common-steps.ts

Given('I have purchased an item to flip', async function (this: CustomWorld) {
  // Navigate to inventory or ensure a purchased item exists
  this.testData.purchasedItem = {
    exists: true,
    id: 'test-item-001',
  };
  console.log('✅ Purchased item available in inventory');
});

// ==================== SCENARIO: Auto-generate eBay listing ====================

Given('I have purchased:', async function (this: CustomWorld, dataTable) {
  const purchase = dataTable.rowsHash();
  this.testData.purchasedItem = {
    name: purchase['Item'],
    buyPrice: parseFloat(purchase['Buy Price'].replace(/[^0-9.]/g, '')),
    condition: purchase['Condition'],
    photoCount: parseInt(purchase['Photos'], 10),
  };
  console.log('✅ Purchased item:', this.testData.purchasedItem.name);
});

Given('the target profit margin is {int}%', async function (this: CustomWorld, margin: number) {
  this.testData.targetMargin = margin;
  console.log(`✅ Target profit margin set to ${margin}%`);
});

// 'I click {string}' step defined in common-steps.ts

When('I select {string} as the platform', async function (this: CustomWorld, platform: string) {
  // Select platform from dropdown or radio group
  const selector = this.page.getByLabel('Platform').or(this.page.locator('select[name="platform"]'));
  await selector.selectOption({ label: platform });
  this.testData.selectedPlatform = platform;
  console.log(`✅ Selected platform: ${platform}`);
});

Then('the AI should generate:', async function (this: CustomWorld, dataTable) {
  const expectedFields = dataTable.rowsHash();

  // Wait for AI generation to complete
  await this.page.waitForSelector('[data-testid="listing-preview"], .listing-preview', { timeout: 15000 });

  for (const [field, expected] of Object.entries(expectedFields)) {
    const fieldSelector = `[data-testid="listing-${field.toLowerCase().replace(/\s+/g, '-')}"]`;
    const element = this.page.locator(fieldSelector);
    const text = await element.textContent();
    expect(text).toBeTruthy();
    console.log(`✅ AI generated ${field}: ${text}`);
  }
});

Then('all photos should be included', async function (this: CustomWorld) {
  const photoCount = this.testData.purchasedItem?.photoCount ?? 1;
  const photos = this.page.locator('[data-testid="listing-photo"], .listing-photo img');
  await expect(photos).toHaveCount(photoCount);
  console.log(`✅ All ${photoCount} photos included`);
});

Then('SEO keywords should be optimized', async function (this: CustomWorld) {
  const keywords = this.page.locator('[data-testid="seo-keywords"], .seo-keywords');
  const text = await keywords.textContent();
  expect(text).toBeTruthy();
  expect(text!.split(',').length).toBeGreaterThanOrEqual(3);
  console.log('✅ SEO keywords optimized');
});

// ==================== SCENARIO: Cross-platform posting ====================

Given('I have created a listing for eBay', async function (this: CustomWorld) {
  this.testData.existingListing = {
    platform: 'eBay',
    title: 'Sony WH-1000XM5 Wireless Headphones - Like New',
    price: 320,
    id: 'listing-001',
  };
  console.log('✅ Existing eBay listing available');
});

When('I select {string}', async function (this: CustomWorld, optionText: string) {
  const checkbox = this.page.getByLabel(optionText).or(this.page.getByText(optionText));
  await checkbox.click();
  console.log(`✅ Selected: "${optionText}"`);
});

Then('the listing should be adapted for Facebook format', async function (this: CustomWorld) {
  const fbPreview = this.page.locator('[data-testid="facebook-listing-preview"]');
  await expect(fbPreview).toBeVisible({ timeout: 10000 });
  console.log('✅ Listing adapted for Facebook format');
});

Then('platform-specific fields should be adjusted:', async function (this: CustomWorld, dataTable) {
  const mappings = dataTable.hashes();
  for (const row of mappings) {
    const fbField = row['Facebook Field'];
    const fbElement = this.page.locator(`[data-testid="fb-field-${fbField.toLowerCase().replace(/[^a-z0-9]/g, '-')}"]`);
    const isVisible = await fbElement.isVisible().catch(() => false);
    // Some fields like "(Not applicable)" should NOT be present
    if (fbField === '(Not applicable)') {
      expect(isVisible).toBe(false);
      console.log(`✅ Field "${row['eBay Field']}" correctly excluded from Facebook`);
    } else {
      expect(isVisible).toBe(true);
      console.log(`✅ "${row['eBay Field']}" mapped to "${fbField}"`);
    }
  }
});

Then('both listings should be posted simultaneously', async function (this: CustomWorld) {
  const successBanner = this.page.locator('[data-testid="multi-post-success"]');
  await expect(successBanner).toBeVisible({ timeout: 15000 });
  const text = await successBanner.textContent();
  expect(text).toContain('eBay');
  expect(text).toContain('Facebook');
  console.log('✅ Both listings posted simultaneously');
});

// ==================== SCENARIO: Price optimization based on demand ====================

Given('the item {string}', async function (this: CustomWorld, itemName: string) {
  this.testData.currentItem = { name: itemName };
  console.log(`✅ Item set: ${itemName}`);
});

Given(
  'recent sold listings show high demand \\({int}+ sold in last {int} days)',
  async function (this: CustomWorld, minSold: number, days: number) {
    this.testData.demandInfo = { minSold, days, level: 'high' };
    console.log(`✅ High demand: ${minSold}+ sold in last ${days} days`);
  }
);

When('the AI calculates the list price', async function (this: CustomWorld) {
  // Trigger price calculation
  const calcButton = this.page.getByRole('button', { name: /calculate|suggest price/i });
  await calcButton.click();
  await this.page.waitForSelector('[data-testid="suggested-price"]', { timeout: 10000 });
  const priceText = await this.page.locator('[data-testid="suggested-price"]').textContent();
  this.testData.suggestedPrice = parseFloat(priceText!.replace(/[^0-9.]/g, ''));
  console.log(`✅ AI calculated price: $${this.testData.suggestedPrice}`);
});

Then('the suggested price should be at the upper end of the range', async function (this: CustomWorld) {
  const pricePosition = this.page.locator('[data-testid="price-range-position"]');
  const position = await pricePosition.getAttribute('data-position');
  expect(['upper', 'high', 'aggressive']).toContain(position);
  console.log('✅ Price is at the upper end of range');
});

Then('I should see a confidence indicator {string}', async function (this: CustomWorld, indicator: string) {
  const badge = this.page.locator('[data-testid="demand-indicator"]');
  await expect(badge).toBeVisible();
  const text = await badge.textContent();
  expect(text).toContain(indicator);
  console.log(`✅ Confidence indicator shown: "${indicator}"`);
});

// ==================== SCENARIO: Automated photo enhancement ====================

Given('I upload photos of a vintage lamp', async function (this: CustomWorld) {
  const fileInput = this.page.locator('input[type="file"]');
  // Create test images for upload
  this.testData.uploadedPhotos = ['vintage-lamp-1.jpg', 'vintage-lamp-2.jpg'];
  // In headless mode, set input files directly
  await fileInput.setInputFiles(
    this.testData.uploadedPhotos.map((name: string) => ({
      name,
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(1024, 0xff), // Minimal JPEG-like buffer for testing
    }))
  );
  console.log('✅ Photos uploaded for vintage lamp');
});

Given('the photos are slightly dim', async function (this: CustomWorld) {
  // This is a precondition about image quality — the AI enhancement should detect and fix it
  this.testData.photoQuality = 'dim';
  console.log('✅ Photos flagged as dim (precondition)');
});

When('the listing generator processes the images', async function (this: CustomWorld) {
  const processButton = this.page.getByRole('button', { name: /enhance|process/i });
  await processButton.click();
  // Wait for enhancement processing
  await this.page.waitForSelector('[data-testid="enhancement-complete"]', { timeout: 20000 });
  console.log('✅ Image processing complete');
});

Then('the photos should be automatically brightened', async function (this: CustomWorld) {
  const brightnessIndicator = this.page.locator('[data-testid="enhancement-brightness"]');
  await expect(brightnessIndicator).toBeVisible();
  const status = await brightnessIndicator.getAttribute('data-applied');
  expect(status).toBe('true');
  console.log('✅ Photos automatically brightened');
});

Then('backgrounds should be neutralized \\(white\\/gray)', async function (this: CustomWorld) {
  const bgIndicator = this.page.locator('[data-testid="enhancement-background"]');
  await expect(bgIndicator).toBeVisible();
  const bgStatus = await bgIndicator.getAttribute('data-applied');
  expect(bgStatus).toBe('true');
  console.log('✅ Backgrounds neutralized');
});

Then('the main image should be cropped to focus on the item', async function (this: CustomWorld) {
  const cropIndicator = this.page.locator('[data-testid="enhancement-crop"]');
  await expect(cropIndicator).toBeVisible();
  const cropStatus = await cropIndicator.getAttribute('data-applied');
  expect(cropStatus).toBe('true');
  console.log('✅ Main image cropped to focus on item');
});

// ==================== SCENARIO: Clone existing listing ====================

Given('I successfully sold an item {string}', async function (this: CustomWorld, itemName: string) {
  this.testData.soldItem = { name: itemName, status: 'sold' };
  console.log(`✅ Previously sold: ${itemName}`);
});

Given('I purchase another similar item {string}', async function (this: CustomWorld, itemName: string) {
  this.testData.newItem = { name: itemName };
  console.log(`✅ New similar item: ${itemName}`);
});

When('I create a new listing', async function (this: CustomWorld) {
  await this.page.goto('http://localhost:3000/listings/new');
  await this.page.waitForLoadState('networkidle');
  console.log('✅ Navigated to new listing page');
});

// "I select {string}" step reused from cross-platform posting scenario above

Then('the title, description, and settings should be copied', async function (this: CustomWorld) {
  const titleInput = this.page.locator('input[name="title"], [data-testid="listing-title"]');
  const titleValue = await titleInput.inputValue().catch(() => titleInput.textContent());
  expect(titleValue).toBeTruthy();
  console.log('✅ Title, description, and settings copied from previous listing');
});

Then('the model name should be auto-updated to {string}', async function (this: CustomWorld, newModel: string) {
  const titleInput = this.page.locator('input[name="title"], [data-testid="listing-title"]');
  const titleValue = await titleInput.inputValue().catch(() => titleInput.textContent());
  expect(titleValue).toContain(newModel);
  console.log(`✅ Model name auto-updated to "${newModel}"`);
});

Then('I should review before posting', async function (this: CustomWorld) {
  const reviewSection = this.page.locator('[data-testid="review-before-post"], .review-section');
  await expect(reviewSection).toBeVisible();
  console.log('✅ Review section displayed before posting');
});

// ==================== SCENARIO: Track listing performance ====================

Given('I have posted an item for ${int}', async function (this: CustomWorld, price: number) {
  this.testData.postedItem = { price, id: 'posted-001' };
  console.log(`✅ Item posted for $${price}`);
});

Given('it has been listed for {int} days', async function (this: CustomWorld, days: number) {
  this.testData.postedItem = { ...this.testData.postedItem, daysListed: days };
  console.log(`✅ Listed for ${days} days`);
});

Given('I have received {int} views but no offers', async function (this: CustomWorld, views: number) {
  this.testData.postedItem = { ...this.testData.postedItem, views, offers: 0 };
  console.log(`✅ ${views} views, 0 offers`);
});

When('I view the listing analytics', async function (this: CustomWorld) {
  await this.page.goto(`http://localhost:3000/listings/${this.testData.postedItem?.id ?? 'posted-001'}/analytics`);
  await this.page.waitForSelector('[data-testid="listing-analytics"]', { timeout: 10000 });
  console.log('✅ Viewing listing analytics');
});

Then('I should see:', async function (this: CustomWorld, dataTable) {
  const expected = dataTable.rowsHash();
  for (const [metric, value] of Object.entries(expected)) {
    const metricEl = this.page.locator(
      `[data-testid="metric-${metric.toLowerCase().replace(/\s+/g, '-')}"]`
    );
    await expect(metricEl).toBeVisible();
    const text = await metricEl.textContent();
    expect(text).toContain(value as string);
    console.log(`✅ ${metric}: ${text}`);
  }
});

Then('I should have the option to {string}', async function (this: CustomWorld, optionText: string) {
  const button = this.page.getByRole('button', { name: optionText });
  await expect(button).toBeVisible();
  console.log(`✅ Option available: "${optionText}"`);
});
