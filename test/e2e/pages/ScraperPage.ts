import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ScraperPage extends BasePage {
  readonly platformSelect: Locator;
  readonly locationSelect: Locator;
  readonly categorySelect: Locator;
  readonly keywordsInput: Locator;
  readonly minPriceInput: Locator;
  readonly maxPriceInput: Locator;
  readonly startButton: Locator;

  constructor(page: Page) {
    super(page);
    this.platformSelect = page.locator('select').first();
    this.locationSelect = page.locator('select').nth(1);
    this.categorySelect = page.locator('select').nth(2);
    this.keywordsInput = page.getByPlaceholder('e.g., iPhone, Nintendo, Dyson');
    this.minPriceInput = page.getByLabel('Min Price');
    this.maxPriceInput = page.getByLabel('Max Price');
    this.startButton = page.getByRole('button', { name: /Start Scraping/i });
  }

  async navigate() {
    await this.goto('/scraper');
    await this.waitForLoad();
  }

  async setPlatform(value: string) {
    await this.platformSelect.selectOption(value);
  }

  async setLocation(value: string) {
    await this.locationSelect.selectOption(value);
  }

  async setCategory(value: string) {
    await this.categorySelect.selectOption(value);
  }

  async setKeywords(value: string) {
    await this.keywordsInput.fill(value);
  }

  async setPriceRange(min: string, max: string) {
    await this.minPriceInput.fill(min);
    await this.maxPriceInput.fill(max);
  }

  async startScraping() {
    await this.startButton.click();
  }

  async waitForResults() {
    await expect(this.page.getByText(/Scrape complete|Found \d+ Listings/i)).toBeVisible({
      timeout: 10000,
    });
  }

  async getResultCount() {
    const text = await this.page.getByText(/Found \d+ Listings/).textContent();
    const match = text?.match(/Found (\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async expectJobHistory() {
    await expect(this.page.getByText('Recent Scraper Jobs')).toBeVisible();
  }

  async expectScrapingInProgress() {
    await expect(this.page.getByText(/Scraping listings/i)).toBeVisible({ timeout: 5000 });
  }

  async expectError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible();
  }
}
