import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  // Selectors
  readonly searchInput: Locator;
  readonly filterSelect: Locator;
  readonly refreshButton: Locator;
  readonly filtersButton: Locator;
  readonly listingsTable: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder('Search listings...');
    this.filterSelect = page.locator('select').first();
    this.refreshButton = page.getByRole('button', { name: /Refresh/i });
    this.filtersButton = page.getByRole('button', { name: /Filters/i });
    this.listingsTable = page.locator('table');
  }

  async navigate() {
    await this.goto('/');
    await this.waitForLoad();
  }

  // Stats
  async getStatValue(label: string) {
    return this.page.getByText(label).first().textContent();
  }

  async expectStatsVisible() {
    await expect(this.page.getByText('Total Listings').first()).toBeVisible();
    await expect(this.page.getByText('Opportunities').first()).toBeVisible();
    await expect(this.page.getByText('Potential Profit')).toBeVisible();
    await expect(this.page.getByText('Avg Value Score')).toBeVisible();
  }

  // Search & Filter
  async search(term: string) {
    await this.searchInput.fill(term);
  }

  async filterByStatus(status: string) {
    await this.filterSelect.selectOption(status);
  }

  // Advanced Filters
  async openAdvancedFilters() {
    await this.filtersButton.click();
  }

  async setMinPrice(value: string) {
    await this.page.getByPlaceholder('Min $').fill(value);
  }

  async setMaxPrice(value: string) {
    await this.page.getByPlaceholder('Max $').fill(value);
  }

  async clearAllFilters() {
    await this.page.getByRole('button', { name: /Clear All Filters/i }).click();
  }

  // Actions
  async clickRefresh() {
    await this.refreshButton.click();
  }

  async openImageModal(index = 0) {
    const thumbnail = this.page
      .locator('button')
      .filter({ has: this.page.locator('img') })
      .nth(index);
    await thumbnail.click();
    await expect(this.page.locator('.fixed.inset-0')).toBeVisible();
  }

  async closeImageModal() {
    const closeButton = this.page
      .locator('.fixed.inset-0 button')
      .filter({ has: this.page.locator('svg') })
      .first();
    await closeButton.click();
    await expect(this.page.locator('.fixed.inset-0')).not.toBeVisible();
  }

  // Navigation
  async navigateToScraper() {
    await this.page.getByText('Scrape Craigslist').click();
    await expect(this.page).toHaveURL('/scraper');
  }

  async navigateToOpportunities() {
    await this.page.getByRole('link', { name: /View Opportunities/i }).click();
    await expect(this.page).toHaveURL('/opportunities');
  }

  async markAsOpportunity(index = 0) {
    await this.page.locator("button[title='Mark as opportunity']").nth(index).click();
  }

  // Assertions
  async expectEmptyState() {
    await expect(
      this.page.getByText('No listings found. Run a scraper to find deals!')
    ).toBeVisible();
  }

  async expectLoadingState() {
    await expect(this.page.getByText('Loading listings...')).toBeVisible();
  }

  async expectListingVisible(title: string) {
    await expect(this.page.getByText(title)).toBeVisible();
  }

  async expectListingNotVisible(title: string) {
    await expect(this.page.getByText(title)).not.toBeVisible();
  }
}
