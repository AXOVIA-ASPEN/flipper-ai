import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class OpportunitiesPage extends BasePage {
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder('Search opportunities...');
  }

  async navigate() {
    await this.goto('/opportunities');
    await this.waitForLoad();
  }

  // Filters
  async filterByStatus(status: 'All Statuses' | 'Identified' | 'Contacted' | 'Purchased' | 'Listed' | 'Sold') {
    await this.page.getByRole('button', { name: new RegExp(status, 'i') }).click();
  }

  async search(term: string) {
    await this.searchInput.fill(term);
  }

  // Cards
  getOpportunityCards() {
    return this.page.locator('[data-testid="opportunity-card"]');
  }

  async getCardCount() {
    return this.getOpportunityCards().count();
  }

  // Edit
  async clickEdit(index = 0) {
    await this.page.getByRole('button', { name: /Edit/i }).nth(index).click();
  }

  async fillEditForm(data: {
    status?: string;
    purchasePrice?: string;
    resalePrice?: string;
    fees?: string;
    resalePlatform?: string;
    notes?: string;
  }) {
    if (data.status) await this.page.getByLabel(/Status/i).selectOption(data.status);
    if (data.purchasePrice) await this.page.getByLabel(/Purchase Price/i).fill(data.purchasePrice);
    if (data.resalePrice) await this.page.getByLabel(/Resale Price/i).fill(data.resalePrice);
    if (data.fees) await this.page.getByLabel(/Fees/i).fill(data.fees);
    if (data.resalePlatform) await this.page.getByLabel(/Resale Platform/i).fill(data.resalePlatform);
    if (data.notes) await this.page.getByLabel(/Notes/i).fill(data.notes);
  }

  async saveEdit() {
    await this.page.getByRole('button', { name: /Save Changes/i }).click();
  }

  async cancelEdit() {
    await this.page.getByRole('button', { name: /Cancel/i }).click();
  }

  // Delete
  async clickDelete(index = 0) {
    await this.page.getByRole('button', { name: /Delete/i }).nth(index).click();
  }

  async confirmDeleteDialog(accept: boolean) {
    this.page.once('dialog', async (dialog) => {
      accept ? await dialog.accept() : await dialog.dismiss();
    });
  }

  // Stats
  async expectStatsVisible() {
    await expect(this.page.getByText('Total Opportunities')).toBeVisible();
    await expect(this.page.getByText('Total Invested')).toBeVisible();
    await expect(this.page.getByText('Total Revenue')).toBeVisible();
    await expect(this.page.getByText('Total Profit')).toBeVisible();
  }

  async expectEmptyState() {
    await expect(this.page.getByText('No opportunities found')).toBeVisible();
  }

  async expectOpportunityVisible(title: string) {
    await expect(this.page.getByText(title)).toBeVisible();
  }

  async expectOpportunityNotVisible(title: string) {
    await expect(this.page.getByText(title)).not.toBeVisible();
  }
}
