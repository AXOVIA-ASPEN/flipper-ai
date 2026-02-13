/**
 * Marketplace Scanning Step Definitions
 * Author: ASPEN
 * Company: Axovia AI
 */

import { Given, When, Then, setDefaultTimeout } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

setDefaultTimeout(30 * 1000);

// ==================== MARKETPLACE SELECTION ====================

When('I select {string} as the marketplace', async function (this: CustomWorld, marketplace: string) {
  // Click marketplace dropdown/selector
  const marketplaceSelector = this.page.locator('[data-testid="marketplace-selector"]');
  await marketplaceSelector.click();
  
  // Select the specific marketplace
  const option = this.page.locator(`[data-testid="marketplace-option-${marketplace.toLowerCase()}"]`);
  await option.click();
  
  // Wait for selection to register
  await this.page.waitForTimeout(500);
  await this.screenshot(`marketplace-selected-${marketplace.toLowerCase()}`);
});

When('I select {string} as the category', async function (this: CustomWorld, category: string) {
  const categorySelector = this.page.locator('[data-testid="category-selector"]');
  await categorySelector.click();
  
  const option = this.page.locator(`[data-testid="category-option-${category.toLowerCase()}"]`);
  await option.click();
  
  await this.screenshot(`category-selected-${category.toLowerCase()}`);
});

// ==================== SEARCH CONFIGURATION ====================

When('I set price range to {string}', async function (this: CustomWorld, priceRange: string) {
  // Parse price range (e.g., "$50-$500")
  const match = priceRange.match(/\$(\d+)-\$(\d+)/);
  if (!match) {
    throw new Error(`Invalid price range format: ${priceRange}`);
  }
  
  const [, minPrice, maxPrice] = match;
  
  await this.page.fill('[data-testid="price-min"]', minPrice);
  await this.page.fill('[data-testid="price-max"]', maxPrice);
  
  await this.screenshot('price-range-set');
});

When('I configure:', async function (this: CustomWorld, dataTable) {
  const config = dataTable.rowsHash();
  
  // Marketplace
  if (config.Marketplace) {
    const marketplaceSelector = this.page.locator('[data-testid="marketplace-selector"]');
    await marketplaceSelector.click();
    await this.page.locator(`[data-testid="marketplace-option-${config.Marketplace.toLowerCase()}"]`).click();
  }
  
  // Category
  if (config.Category) {
    const categorySelector = this.page.locator('[data-testid="category-selector"]');
    await categorySelector.click();
    await this.page.locator(`[data-testid="category-option-${config.Category.toLowerCase()}"]`).click();
  }
  
  // Price Range
  if (config['Price Range']) {
    const match = config['Price Range'].match(/\$(\d+)-\$(\d+)/);
    if (match) {
      const [, minPrice, maxPrice] = match;
      await this.page.fill('[data-testid="price-min"]', minPrice);
      await this.page.fill('[data-testid="price-max"]', maxPrice);
    }
  }
  
  // Keywords
  if (config.Keywords) {
    await this.page.fill('[data-testid="keywords-input"]', config.Keywords);
  }
  
  await this.screenshot('scan-configuration-complete');
});

When('I click {string}', async function (this: CustomWorld, buttonText: string) {
  const button = this.page.locator(`button:has-text("${buttonText}")`);
  await button.click();
  await this.page.waitForTimeout(500);
  await this.screenshot(`clicked-${buttonText.replace(/\s+/g, '-').toLowerCase()}`);
});

// ==================== SEARCH EXECUTION ====================

Then('I should see a {string} progress indicator', async function (this: CustomWorld, indicatorText: string) {
  const progressIndicator = this.page.locator(`text="${indicatorText}"`);
  await expect(progressIndicator).toBeVisible({ timeout: 5000 });
  await this.screenshot('scanning-progress-visible');
});

Then('within {int} seconds, results should be displayed', async function (this: CustomWorld, seconds: number) {
  const resultsContainer = this.page.locator('[data-testid="scan-results"]');
  await expect(resultsContainer).toBeVisible({ timeout: seconds * 1000 });
  await this.screenshot('results-displayed');
});

Then('each result should show:', async function (this: CustomWorld, dataTable) {
  const fields = dataTable.raw().slice(1); // Skip header row
  
  // Get all result cards
  const resultCards = this.page.locator('[data-testid="result-card"]');
  const count = await resultCards.count();
  
  expect(count).toBeGreaterThan(0);
  
  // Verify first result has all required fields
  const firstCard = resultCards.first();
  
  for (const [field, shouldBePresent] of fields) {
    const selector = `[data-testid="${field.toLowerCase()}"]`;
    const element = firstCard.locator(selector);
    
    if (shouldBePresent === 'Yes') {
      await expect(element).toBeVisible();
    }
  }
  
  await this.screenshot('result-fields-verified');
});

Then('results should be sorted by flippability score descending', async function (this: CustomWorld) {
  const scores = await this.page.locator('[data-testid="flippability-score"]').allTextContents();
  const numericScores = scores.map(s => parseInt(s.replace(/\D/g, '')));
  
  // Verify descending order
  for (let i = 0; i < numericScores.length - 1; i++) {
    expect(numericScores[i]).toBeGreaterThanOrEqual(numericScores[i + 1]);
  }
  
  await this.screenshot('results-sorted-by-flippability');
});

// ==================== FILTERING ====================

When('I set the flippability filter to {string}', async function (this: CustomWorld, filterValue: string) {
  const filterSelector = this.page.locator('[data-testid="flippability-filter"]');
  await filterSelector.click();
  
  const option = this.page.locator(`[data-value="${filterValue}"]`);
  await option.click();
  
  await this.page.waitForTimeout(1000); // Wait for filter to apply
  await this.screenshot('flippability-filter-applied');
});

Then('only items with score >= {int} should be visible', async function (this: CustomWorld, minScore: number) {
  const scores = await this.page.locator('[data-testid="flippability-score"]').allTextContents();
  const numericScores = scores.map(s => parseInt(s.replace(/\D/g, '')));
  
  for (const score of numericScores) {
    expect(score).toBeGreaterThanOrEqual(minScore);
  }
  
  await this.screenshot('filtered-results-verified');
});

Then('the count badge should update to show filtered count', async function (this: CustomWorld) {
  const countBadge = this.page.locator('[data-testid="results-count"]');
  await expect(countBadge).toBeVisible();
  
  const countText = await countBadge.textContent();
  const count = parseInt(countText?.replace(/\D/g, '') || '0');
  
  expect(count).toBeGreaterThan(0);
  await this.screenshot('count-badge-updated');
});

// ==================== SAVED SEARCHES ====================

When('I enter search name {string}', async function (this: CustomWorld, searchName: string) {
  const input = this.page.locator('[data-testid="search-name-input"]');
  await input.fill(searchName);
  await this.screenshot('search-name-entered');
});

Then('the search should be saved to my configurations', async function (this: CustomWorld) {
  // Wait for save confirmation
  const successMessage = this.page.locator('text="Search saved successfully"');
  await expect(successMessage).toBeVisible({ timeout: 5000 });
  
  await this.screenshot('search-saved-confirmation');
});

Then('I should be able to re-run it from the dashboard', async function (this: CustomWorld) {
  // Navigate to dashboard
  await this.page.goto('/dashboard');
  
  // Look for saved search in list
  const savedSearch = this.page.locator('[data-testid="saved-search"]').first();
  await expect(savedSearch).toBeVisible();
  
  await this.screenshot('saved-search-visible-on-dashboard');
});

// ==================== NOTIFICATIONS ====================

Given('I have an active scan running for {string}', async function (this: CustomWorld, marketplace: string) {
  // Navigate to scanner and start a scan
  await this.page.goto('/scanner');
  
  const marketplaceSelector = this.page.locator('[data-testid="marketplace-selector"]');
  await marketplaceSelector.click();
  await this.page.locator(`[data-testid="marketplace-option-${marketplace.toLowerCase()}"]`).click();
  
  const startButton = this.page.locator('button:has-text("Start Scan")');
  await startButton.click();
  
  await this.screenshot('active-scan-running');
});

Given('I have notifications enabled', async function (this: CustomWorld) {
  // Grant notification permissions in browser context
  await this.page.context().grantPermissions(['notifications']);
  
  console.log('✅ Browser notifications enabled');
});

When('a new listing appears with flippability score > {int}', async function (this: CustomWorld, minScore: number) {
  // Simulate a high-value listing appearing
  // This would be triggered by the real-time scan in production
  await this.page.evaluate((score) => {
    // Trigger custom event that the app listens for
    const event = new CustomEvent('newHighValueListing', {
      detail: {
        title: 'Vintage MacBook Pro',
        score: score + 5,
        price: '$150',
        marketplace: 'Craigslist'
      }
    });
    window.dispatchEvent(event);
  }, minScore);
  
  await this.page.waitForTimeout(1000);
});

Then('I should receive a browser notification', async function (this: CustomWorld) {
  // Check for notification element (app shows in-app notification as well)
  const notification = this.page.locator('[data-testid="notification-toast"]');
  await expect(notification).toBeVisible({ timeout: 5000 });
  
  await this.screenshot('notification-received');
});

Then('the notification should show the item title and score', async function (this: CustomWorld) {
  const notification = this.page.locator('[data-testid="notification-toast"]');
  
  const notificationText = await notification.textContent();
  expect(notificationText).toContain('MacBook');
  expect(notificationText).toMatch(/\d{2,3}/); // Score number
  
  await this.screenshot('notification-content-verified');
});

Then('clicking the notification should navigate to the item detail page', async function (this: CustomWorld) {
  const notification = this.page.locator('[data-testid="notification-toast"]');
  await notification.click();
  
  await this.page.waitForURL(/\/opportunities\/\w+/);
  await this.screenshot('navigated-to-item-detail');
});

// ==================== TIER LIMITS ====================

Given('I am on the free tier', async function (this: CustomWorld) {
  // Already logged in as free user from Background
  const tierBadge = this.page.locator('[data-testid="tier-badge"]');
  await expect(tierBadge).toHaveText('Free');
});

Given('I have used {int} scans today', async function (this: CustomWorld, scanCount: number) {
  // Set scan count in database or local storage
  await this.page.evaluate((count) => {
    localStorage.setItem('scansUsedToday', count.toString());
  }, scanCount);
  
  console.log(`✅ Set scan count to ${scanCount}`);
});

When('I try to start another scan', async function (this: CustomWorld) {
  const startButton = this.page.locator('button:has-text("Start Scan")');
  await startButton.click();
  
  await this.page.waitForTimeout(500);
  await this.screenshot('attempted-scan-over-limit');
});

Then('I should see an upgrade modal', async function (this: CustomWorld) {
  const modal = this.page.locator('[data-testid="upgrade-modal"]');
  await expect(modal).toBeVisible({ timeout: 5000 });
  
  await this.screenshot('upgrade-modal-visible');
});

Then('the scan should not execute', async function (this: CustomWorld) {
  const progressIndicator = this.page.locator('text="Scanning"');
  await expect(progressIndicator).not.toBeVisible();
});

Then('the modal should show pricing tiers', async function (this: CustomWorld) {
  const pricingTable = this.page.locator('[data-testid="pricing-tiers"]');
  await expect(pricingTable).toBeVisible();
  
  await this.screenshot('pricing-tiers-displayed');
});

// ==================== SCAN RESULTS ====================

Given('I have scan results displayed', async function (this: CustomWorld) {
  // Run a quick scan to get results
  await this.page.goto('/scanner');
  
  // Use test data fixture
  const listings = this.loadFixture('listings');
  await this.seedDatabase({ listings: Object.values(listings) });
  
  // Refresh page to load results
  await this.page.reload();
  
  const resultsContainer = this.page.locator('[data-testid="scan-results"]');
  await expect(resultsContainer).toBeVisible();
  
  await this.screenshot('scan-results-ready');
});
