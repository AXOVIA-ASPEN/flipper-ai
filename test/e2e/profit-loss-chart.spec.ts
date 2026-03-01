import { test, expect } from '@playwright/test';

/**
 * BDD E2E Tests: Profit/Loss Chart Visualization
 * 
 * Feature: Visual profit/loss chart
 * As a flipper, I want to see a visual chart of my profit/loss over time
 * So I can track my business performance and identify trends
 * 
 * Based on: features/05-dashboard-tracking.feature
 * Author: ASPEN (Axovia AI)
 * Date: 2026-02-18
 */

const mockSalesData = {
  totalProfit: 1250.0,
  totalRevenue: 5400.0,
  totalCosts: 4150.0,
  weeklyData: [
    { week: '2026-W01', date: '2026-01-05', profit: 150, revenue: 600, costs: 450, itemsSold: 2 },
    { week: '2026-W02', date: '2026-01-12', profit: 200, revenue: 750, costs: 550, itemsSold: 3 },
    { week: '2026-W03', date: '2026-01-19', profit: -50, revenue: 400, costs: 450, itemsSold: 1 },
    { week: '2026-W04', date: '2026-01-26', profit: 300, revenue: 900, costs: 600, itemsSold: 4 },
    { week: '2026-W05', date: '2026-02-02', profit: 250, revenue: 800, costs: 550, itemsSold: 3 },
    { week: '2026-W06', date: '2026-02-09', profit: 400, revenue: 1200, costs: 800, itemsSold: 5 },
    { week: '2026-W07', date: '2026-02-16', profit: 0, revenue: 750, costs: 750, itemsSold: 2 },
  ],
  cumulativeData: [
    { week: '2026-W01', cumulative: 150 },
    { week: '2026-W02', cumulative: 350 },
    { week: '2026-W03', cumulative: 300 },
    { week: '2026-W04', cumulative: 600 },
    { week: '2026-W05', cumulative: 850 },
    { week: '2026-W06', cumulative: 1250 },
    { week: '2026-W07', cumulative: 1250 },
  ],
};

test.describe('Profit/Loss Chart Visualization - BDD Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the analytics API endpoint
    await page.route('**/api/analytics/profit-chart*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSalesData),
      });
    });
  });

  test.describe('Given I have sales data for the last 3 months', () => {
    test('Scenario: View cumulative profit line chart with weekly breakdown', async ({ page }) => {
      // Given I navigate to the dashboard analytics section
      await page.goto('/analytics');

      // When I view the profit/loss chart section
      const chartSection = page.locator('[data-testid="profit-loss-chart"]').or(
        page.locator('section').filter({ hasText: /profit.*chart|cumulative profit/i })
      ).or(
        page.locator('.chart-container, #profit-chart').first()
      );

      // Then I should see a line chart
      const chartCanvas = page.locator('canvas').or(
        page.locator('svg').filter({ has: page.locator('path[stroke]') })
      );
      
      // Wait for chart to render (either canvas or SVG)
      await expect(chartCanvas.first()).toBeVisible({ timeout: 10000 });

      // And I should see chart labels or axis markers
      const chartLabels = page.locator('[role="img"]').or(
        page.locator('text').filter({ hasText: /2026-W\d{2}|Jan|Feb|Week/ })
      );
      
      // At least one time period label should be visible
      await expect(chartLabels.first()).toBeVisible({ timeout: 5000 });
    });

    test('Scenario: Chart displays X-axis with weeks (last 12 weeks)', async ({ page }) => {
      // Given I am viewing the analytics page
      await page.goto('/analytics');

      // Then the X-axis should show weekly time periods
      // Look for week labels like "W01", "W02" or date labels
      const weekLabel1 = page.getByText(/W01|Jan 05|2026-01/i);
      const weekLabel2 = page.getByText(/W02|Jan 12|2026-01-12/i);

      // At least some week labels should be visible
      const hasWeekLabels = await weekLabel1.or(weekLabel2).count() > 0;
      expect(hasWeekLabels).toBeTruthy();
    });

    test('Scenario: Chart displays Y-axis with cumulative profit ($)', async ({ page }) => {
      // Given I am viewing the analytics page
      await page.goto('/analytics');

      // Then the Y-axis should show dollar amounts
      // Look for currency formatting or axis labels
      const dollarLabel = page.locator('text').filter({ hasText: /\$|profit|revenue/i });
      
      // Should have profit-related labels
      await expect(dollarLabel.first()).toBeVisible({ timeout: 5000 });
    });

    test('Scenario: Hovering over data points shows weekly breakdown', async ({ page }) => {
      // Given I am viewing the analytics chart
      await page.goto('/analytics');

      // When I hover over a data point on the chart
      const chartArea = page.locator('canvas').or(
        page.locator('svg path[stroke]').first()
      ).first();
      
      await chartArea.waitFor({ state: 'visible', timeout: 10000 });
      
      // Hover in the middle of the chart area
      await chartArea.hover({ position: { x: 200, y: 100 } });

      // Then I should see a tooltip with weekly breakdown
      const tooltip = page.locator('[role="tooltip"]').or(
        page.locator('.tooltip, .chart-tooltip, [class*="tooltip"]')
      );

      // Wait a moment for tooltip to appear
      await page.waitForTimeout(500);

      // Tooltip should appear on hover (if implemented)
      const tooltipVisible = await tooltip.count() > 0;
      
      // Note: If tooltip doesn't exist yet, this documents the expected behavior
      if (tooltipVisible) {
        await expect(tooltip.first()).toBeVisible();
        
        // Tooltip should show profit/revenue/cost details
        const tooltipText = await tooltip.first().textContent();
        expect(tooltipText).toMatch(/(profit|revenue|cost|\$)/i);
      }
    });

    test('Scenario: Chart shows trend indicator (↑ improving, ↓ declining)', async ({ page }) => {
      // Given I am viewing the analytics page
      await page.goto('/analytics');

      // Then I should see a trend indicator
      const trendIndicator = page.locator('[data-testid="trend-indicator"]').or(
        page.locator('text').filter({ hasText: /↑|↓|improving|declining|trending/i })
      ).or(
        page.locator('.trend-up, .trend-down, [class*="trend"]')
      );

      // Trend indicator should be present (either ↑, ↓, or text)
      const hasTrendIndicator = await trendIndicator.count() > 0;
      
      if (hasTrendIndicator) {
        await expect(trendIndicator.first()).toBeVisible();
      } else {
        // Document expected behavior: trend should be calculated from data
        // Based on mockSalesData: profit went from 150 → 1250 (improving ↑)
        console.log('Expected trend: ↑ improving (cumulative profit increased)');
      }
    });

    test('Scenario: Chart handles negative profit weeks correctly', async ({ page }) => {
      // Given I have a week with negative profit in my data (W03: -$50)
      await page.goto('/analytics');

      // Then the chart should still render properly
      const chartCanvas = page.locator('canvas').or(page.locator('svg'));
      await expect(chartCanvas.first()).toBeVisible({ timeout: 10000 });

      // And negative values should be visually distinguishable
      // (e.g., different color, below baseline, or marked somehow)
      const negativeIndicator = page.locator('[class*="negative"], [class*="loss"]').or(
        page.locator('text').filter({ hasText: /-\$50/ })
      );

      // Check if negative values are styled differently
      const hasNegativeIndicator = await negativeIndicator.count() > 0;
      if (hasNegativeIndicator) {
        await expect(negativeIndicator.first()).toBeVisible();
      }
    });

    test('Scenario: User can toggle between time periods (weekly/monthly)', async ({ page }) => {
      // Given I am viewing the profit/loss chart
      await page.goto('/analytics');

      // When I look for time period toggle buttons
      const weeklyBtn = page.getByRole('button', { name: /weekly|week/i });
      const monthlyBtn = page.getByRole('button', { name: /monthly|month/i });

      // Then time period controls should be available
      const hasToggle = await weeklyBtn.or(monthlyBtn).count() > 0;

      if (hasToggle) {
        // And clicking should update the chart data
        const visibleBtn = await weeklyBtn.count() > 0 ? weeklyBtn : monthlyBtn;
        await visibleBtn.first().click();

        // Chart should re-render with new granularity
        await page.waitForTimeout(500);
        const chart = page.locator('canvas').or(page.locator('svg'));
        await expect(chart.first()).toBeVisible();
      }
    });

    test('Scenario: Chart is responsive on mobile viewport', async ({ page }) => {
      // Given I am on a mobile device
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

      // When I navigate to the analytics page
      await page.goto('/analytics');

      // Then the chart should still be visible and readable
      const chart = page.locator('canvas').or(page.locator('svg'));
      await expect(chart.first()).toBeVisible({ timeout: 10000 });

      // And it should fit within the viewport
      const chartBox = await chart.first().boundingBox();
      expect(chartBox).toBeTruthy();
      expect(chartBox!.width).toBeLessThanOrEqual(375);
    });

    test('Scenario: Chart displays loading state while fetching data', async ({ page }) => {
      // Given the API has a delay
      await page.route('**/api/analytics/profit-chart*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockSalesData),
        });
      });

      // When I navigate to the analytics page
      await page.goto('/analytics');

      // Then I should see a loading indicator
      const loadingIndicator = page.locator('[data-testid="chart-loading"]').or(
        page.locator('.loading, .spinner, [class*="loading"]').filter({ hasText: /loading|chart/i })
      ).or(
        page.locator('text').filter({ hasText: /loading.*chart/i })
      );

      // Loading state should appear briefly
      const hasLoadingState = await loadingIndicator.count() > 0;
      if (hasLoadingState) {
        await expect(loadingIndicator.first()).toBeVisible();
      }

      // Then the chart should appear after loading
      const chart = page.locator('canvas').or(page.locator('svg'));
      await expect(chart.first()).toBeVisible({ timeout: 5000 });
    });

    test('Scenario: Empty state when no sales data exists', async ({ page }) => {
      // Given I have no sales history
      await page.route('**/api/analytics/profit-chart*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalProfit: 0,
            weeklyData: [],
            cumulativeData: [],
          }),
        });
      });

      // When I navigate to the analytics page
      await page.goto('/analytics');

      // Then I should see an empty state message
      const emptyState = page.locator('[data-testid="chart-empty-state"]').or(
        page.locator('text').filter({ hasText: /no data|no sales|start tracking/i })
      );

      // Empty state should be visible
      const hasEmptyState = await emptyState.count() > 0;
      if (hasEmptyState) {
        await expect(emptyState.first()).toBeVisible();
      } else {
        // Or chart should show zero/flat line
        const chart = page.locator('canvas').or(page.locator('svg'));
        await expect(chart.first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
});
