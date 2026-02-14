import { type Page, expect } from '@playwright/test';

export async function expectStatsCard(page: Page, label: string, value: string) {
  const card = page.getByText(label).first().locator('..');
  await expect(card).toContainText(value);
}

export async function expectListingCount(page: Page, count: number) {
  const rows = page.locator('table tbody tr');
  await expect(rows).toHaveCount(count);
}

export async function expectProfit(page: Page, amount: string) {
  await expect(page.getByText(amount)).toBeVisible();
}

export async function expectOpportunityStatus(page: Page, title: string, status: string) {
  const card = page.getByText(title).first().locator('..').locator('..');
  await expect(card).toContainText(status);
}

export async function expectPageTitle(page: Page, title: string) {
  await expect(page.locator('h1')).toContainText(title);
}

export async function expectNoErrors(page: Page) {
  const errorElements = page.locator('[role="alert"], .error, .text-red-500');
  await expect(errorElements).toHaveCount(0);
}
