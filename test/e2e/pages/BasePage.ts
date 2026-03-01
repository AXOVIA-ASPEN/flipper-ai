import { type Page, type Locator, expect } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path: string) {
    await this.page.goto(path);
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async getTitle() {
    return this.page.locator('h1').textContent();
  }

  async isLoaded(headerText: string) {
    await expect(this.page.locator('h1')).toContainText(headerText);
  }

  async hasError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible();
  }

  async screenshot(name: string) {
    await this.page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
  }

  get header(): Locator {
    return this.page.locator('h1');
  }

  get backButton(): Locator {
    return this.page.locator('a[href="/"]').first();
  }

  async navigateBack() {
    await this.backButton.click();
    await expect(this.page).toHaveURL('/');
  }
}
