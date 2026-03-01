import { type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class SettingsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigate() {
    await this.goto('/settings');
    await this.waitForLoad();
  }

  async setLlmModel(model: string) {
    await this.page.getByLabel(/LLM Model/i).selectOption(model);
  }

  async setDiscountThreshold(value: string) {
    await this.page.getByLabel(/Discount Threshold/i).fill(value);
  }

  async toggleAutoAnalyze() {
    await this.page.getByLabel(/Auto.?Analyze/i).click();
  }

  async saveSettings() {
    await this.page.getByRole('button', { name: /Save/i }).click();
  }
}
