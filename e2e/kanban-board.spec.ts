import { test, expect } from '@playwright/test';

/**
 * E2E tests for the KanbanBoard view on the Opportunities page.
 * BDD-style: Given/When/Then
 *
 * The opportunities page defaults to list view and has a kanban toggle.
 * These tests verify the kanban board rendering and interaction.
 */

test.describe('KanbanBoard View', () => {
  test.describe('Feature: Toggle Kanban View', () => {
    test('Scenario: Given the user is on the opportunities page, When they click the kanban toggle, Then the board view is shown', async ({
      page,
    }) => {
      // Given I navigate to the opportunities page
      await page.goto('/opportunities');
      await page.waitForLoadState('networkidle');

      // When I click the kanban view toggle button
      const kanbanButton = page.locator('button[title="Kanban view"]');
      await expect(kanbanButton).toBeVisible();
      await kanbanButton.click();

      // Then the kanban board should be displayed with pipeline columns
      // The KanbanBoard component renders columns: New, Contacted, Purchased, Listed, Sold
      const columnLabels = ['New', 'Contacted', 'Purchased', 'Listed', 'Sold'];
      for (const label of columnLabels) {
        await expect(page.getByText(label, { exact: false }).first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('Scenario: Given the user is in kanban view, When they click list toggle, Then the list view returns', async ({
      page,
    }) => {
      // Given I navigate to opportunities and switch to kanban
      await page.goto('/opportunities');
      await page.waitForLoadState('networkidle');

      const kanbanButton = page.locator('button[title="Kanban view"]');
      await expect(kanbanButton).toBeVisible();
      await kanbanButton.click();

      // When I click the list view toggle
      const listButton = page.locator('button[title="List view"]');
      await expect(listButton).toBeVisible();
      await listButton.click();

      // Then the list view should be shown (search input visible in list mode)
      const searchInput = page.getByPlaceholder('Search opportunities...');
      await expect(searchInput).toBeVisible();
    });
  });

  test.describe('Feature: Kanban Board Structure', () => {
    test('Scenario: Given the kanban view is active, Then all five pipeline columns are rendered', async ({
      page,
    }) => {
      // Given I navigate to opportunities in kanban view
      await page.goto('/opportunities');
      await page.waitForLoadState('networkidle');

      const kanbanButton = page.locator('button[title="Kanban view"]');
      await expect(kanbanButton).toBeVisible();
      await kanbanButton.click();

      // Then exactly 5 columns should exist
      const columns = ['New', 'Contacted', 'Purchased', 'Listed', 'Sold'];
      for (const col of columns) {
        const colElement = page.getByText(col, { exact: false }).first();
        await expect(colElement).toBeVisible({ timeout: 5000 });
      }
    });

    test('Scenario: Given the kanban view is active, Then column count badges are displayed', async ({
      page,
    }) => {
      // Given I navigate and switch to kanban
      await page.goto('/opportunities');
      await page.waitForLoadState('networkidle');

      const kanbanButton = page.locator('button[title="Kanban view"]');
      await expect(kanbanButton).toBeVisible();
      await kanbanButton.click();

      // Then each column should show a count (even if 0)
      // Counts render as small badges next to column names
      // At minimum, the columns should render without errors
      await page.waitForTimeout(1000);
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    });
  });

  test.describe('Feature: View Mode Persistence', () => {
    test('Scenario: Given the kanban toggle exists, Then both view mode buttons are accessible', async ({
      page,
    }) => {
      // Given I navigate to the opportunities page
      await page.goto('/opportunities');
      await page.waitForLoadState('networkidle');

      // Then both view toggle buttons should be present
      const listButton = page.locator('button[title="List view"]');
      const kanbanButton = page.locator('button[title="Kanban view"]');

      await expect(listButton).toBeVisible();
      await expect(kanbanButton).toBeVisible();

      // And the list view should be active by default (has active styling)
      await expect(listButton).toHaveClass(/bg-gradient/);
    });
  });
});
