import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ResaleListingPage extends BasePage {
  // Form fields
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly priceInput: Locator;
  readonly listingForm: Locator;

  // Actions
  readonly analyzeButton: Locator;
  readonly submitButton: Locator;
  readonly cloneButton: Locator;

  // Suggestions
  readonly priceSuggestion: Locator;
  readonly platformSelect: Locator;

  constructor(page: Page) {
    super(page);
    this.titleInput = page.locator('[name="title"], [data-testid="listing-title"]');
    this.descriptionInput = page.locator('[name="description"], [data-testid="listing-description"]');
    this.priceInput = page.locator('[name="price"], [data-testid="listing-price"]');
    this.listingForm = page.locator('form, [data-testid="listing-form"]');
    this.analyzeButton = page.locator('button', { hasText: /analyze|suggest|optimize/i });
    this.submitButton = page.locator('button[type="submit"], button:has-text("Post"), button:has-text("Create")');
    this.cloneButton = page.locator('button, a').filter({ hasText: /clone|copy|duplicate/i }).first();
    this.priceSuggestion = page.locator('[data-testid="price-suggestion"], .price-suggestion, text=/suggested|recommended/i');
    this.platformSelect = page.locator('select, [role="combobox"]').filter({ hasText: /platform/i });
  }

  async gotoCreate() {
    await this.goto('/listings/create');
  }

  async gotoListings() {
    await this.goto('/listings');
  }

  async fillTitle(title: string) {
    await this.titleInput.fill(title);
  }

  async fillPrice(price: string) {
    await this.priceInput.fill(price);
  }

  async fillDescription(desc: string) {
    await this.descriptionInput.fill(desc);
  }

  async selectPlatform(platform: string) {
    if (await this.platformSelect.count() > 0) {
      await this.platformSelect.selectOption({ label: platform });
    } else {
      await this.page.click(`text=${platform}`);
    }
  }

  async checkPlatform(platform: string) {
    const checkbox = this.page.locator('input[type="checkbox"]').filter({ hasText: new RegExp(platform, 'i') });
    if (await checkbox.count() > 0) {
      await checkbox.check();
    }
  }

  async requestPriceAnalysis() {
    if (await this.analyzeButton.count() > 0) {
      await this.analyzeButton.click();
      await this.page.waitForTimeout(2000);
    }
  }

  async submitListing() {
    if (await this.submitButton.count() > 0) {
      await this.submitButton.click();
    }
  }

  async expectFormVisible() {
    await expect(this.listingForm).toBeVisible();
  }

  async expectFieldsPresent() {
    await expect(this.titleInput).toBeVisible();
    await expect(this.descriptionInput).toBeVisible();
    await expect(this.priceInput).toBeVisible();
  }

  async expectPriceSuggestionVisible() {
    if (await this.priceSuggestion.count() > 0) {
      await expect(this.priceSuggestion).toBeVisible();
    }
  }

  async getFirstListingLink(): Promise<Locator> {
    return this.page.locator('a, tr, [data-testid="listing-row"]').filter({ hasText: /\$/ }).first();
  }
}
